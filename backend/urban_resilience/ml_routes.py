# backend/urban_resilience/ml_routes.py
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import osmnx as ox
import shap

from .ml_features import compute_city_features

# --------------------------------------------------------
# Load model + metadata at startup
# --------------------------------------------------------

MODEL_PATH = "models/resilience_rf.pkl"
META_PATH = "models/resilience_rf_meta.joblib"

router = APIRouter(prefix="/ml", tags=["ml"])

try:
    model = joblib.load(MODEL_PATH)
    meta = joblib.load(META_PATH)

    FEATURE_NAMES = meta["feature_names"]               # ordered, exactly as trained
    SCENARIO_ONEHOT_COLS = meta["scenario_onehot_cols"]  # ["scenario_Bridge Collapse", ...]

    # Create SHAP explainer
    explainer = shap.TreeExplainer(model)

    print("✅ Loaded model and metadata.")
    print("   Feature count:", len(FEATURE_NAMES))
    print("   Scenarios:", SCENARIO_ONEHOT_COLS)

except Exception as e:
    print("❌ Error loading model/meta:", e)
    raise e


# --------------------------------------------------------
# Request Schema
# --------------------------------------------------------

class PredictCityRequest(BaseModel):
    city: str            # "Boston, MA" or full "Boston, Massachusetts, USA"
    failure_type: str    # "Bridge Collapse", "Random failures", etc.
    intensity: float     # 0–100 slider from UI


# --------------------------------------------------------
# Main Prediction Endpoint
# --------------------------------------------------------

@router.post("/predict-city")
async def predict_city(req: PredictCityRequest):
    """
    Predict resilience for ANY U.S. city:
    1. Download OSM road graph
    2. Compute structural features
    3. Build ML input vector (including scenario one-hot)
    4. Predict with Random Forest
    5. Produce SHAP explanation:
       - scenario effect (aggregated)
       - top structural contributors
    """

    print("\n========================================")
    print("⚙️ /ml/predict-city called:", req.dict())
    print("========================================\n")

    try:
        # --------------------------------------------------------
        # (1) Load OSM graph
        # --------------------------------------------------------
        print(f"📍 Downloading graph for: {req.city}")
        G = ox.graph_from_place(req.city, network_type="drive")

        # --------------------------------------------------------
        # (2) Compute city structural features
        # --------------------------------------------------------
        print("🔧 Computing structural features...")
        raw_feats = compute_city_features(G)

        # Prefix with feat_ to match training dataset
        feat_inputs = {f"feat_{k}": float(v) for k, v in raw_feats.items()}

        # --------------------------------------------------------
        # (3) Map scenario names to training labels
        # --------------------------------------------------------
        scenario_map = {
            "Bridge Collapse": "Bridge Collapse",
            "Tunnel Closure": "Tunnel Closure",
            "Highway Flood": "Highway Flood",
            "Targeted Attack": "Targeted Attack",
            "Random failures": "Random Failure",
            "Random failure": "Random Failure",
            "Random Failure": "Random Failure",
        }

        scenario = scenario_map.get(req.failure_type, "Random Failure")
        scenario_col = f"scenario_{scenario}"
        print("Scenario selected:", scenario_col)

        # --------------------------------------------------------
        # (4) Build full feature row for the ML model
        # --------------------------------------------------------
        row = {}

        # Structural features
        row.update(feat_inputs)

        # Severity (intensity)
        row["severity"] = float(req.intensity) / 100.0

        # Scenario one-hot encoding
        for s in SCENARIO_ONEHOT_COLS:
            row[s] = 1.0 if s == scenario_col else 0.0

        # Ensure all features included (missing → 0)
        X = [row.get(name, 0.0) for name in FEATURE_NAMES]

        print("Feature vector length:", len(X))
        print("First 10 features:", X[:10])

        # --------------------------------------------------------
        # (5) Predict resilience
        # --------------------------------------------------------
        pred = model.predict([X])[0]
        print(f"🎯 Predicted resilience = {pred:.4f}")

        # --------------------------------------------------------
        # (6) SHAP explanation
        # --------------------------------------------------------
        shap_vals = explainer.shap_values(np.array([X]))[0]

        # Pair names with values
        shap_pairs = list(zip(FEATURE_NAMES, shap_vals))

        # Scenario effect = sum of shap values of all scenario_* columns
        scenario_effect = 0.0
        for feat, val in shap_pairs:
            if feat.startswith("scenario_"):
                scenario_effect += val

        # Structural SHAP values (exclude scenario_ features)
        structural_pairs = [
            (feat, val) for feat, val in shap_pairs if not feat.startswith("scenario_")
        ]

        # Top 6 contributors by absolute magnitude
        structural_top = sorted(
            structural_pairs, key=lambda x: abs(x[1]), reverse=True
        )[:6]

        structural_explanations = [
            {"feature": feat, "effect": float(val)} for feat, val in structural_top
        ]

        # --------------------------------------------------------
        # (7) Return final structured response
        # --------------------------------------------------------
        return {
            "resilience": float(pred),
            "explanation": {
                "scenario": {
                    "name": scenario,
                    "effect": float(scenario_effect),
                },
                "structural": structural_explanations,
            },
        }

    except Exception as e:
        print(" Prediction error:", e)
        raise HTTPException(status_code=500, detail=str(e))
