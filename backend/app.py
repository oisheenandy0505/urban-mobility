# backend/app.py

from __future__ import annotations

from typing import List, Tuple, Optional, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from shapely.geometry import mapping

from urban_resilience.config import DEFAULT_CITIES, SCENARIOS
from urban_resilience.graph_loader import load_city_graph
from urban_resilience.edge_selection import (
    select_edges_for_scenario,
    graph_to_edges_gdf,
)
from urban_resilience.simulation import simulate_single_shock
from urban_resilience.usgs_flood import download_usgs_flood_features_for_city

EdgeId = Tuple[int, int, int]

app = FastAPI(
    title="Urban Mobility Resilience API",
    description="Backend for 'Can Cities Survive Traffic Shocks?' project.",
    version="0.2.0",
)

# Allow frontend (any origin) – fine for class project
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Pydantic models ----------


class SimRequest(BaseModel):
    city: str
    scenario: str
    severity: float
    n_pairs: int = 40
    use_usgs_flood: bool = False


class SimResponse(BaseModel):
    city: str
    scenario: str
    severity: float
    avg_ratio: float
    median_ratio: float
    pct_disconnected: float
    n_removed_edges: int
    n_pairs: int
    edges_geojson: Dict[str, Any]
    removed_edges_geojson: Dict[str, Any]


class ProgressiveRequest(BaseModel):
    city: str
    scenario: str
    severities: List[float]
    n_pairs: int = 40
    runs_per_severity: int = 3
    use_usgs_flood: bool = False


# ---------- Helper for GeoJSON building ----------


def build_edges_geojson(
    city_graph, removed_edges: List[EdgeId]
) -> tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Build two GeoJSON FeatureCollections:

    - edges_geojson: all road segments in the graph
    - removed_edges_geojson: subset corresponding to removed_edges

    Each feature has properties:
        - u, v, key
        - bridge (bool)
        - tunnel (bool)
        - highway (string or None)
    """
    gdf_edges = graph_to_edges_gdf(city_graph)
    removed_set = {(int(u), int(v), int(k)) for (u, v, k) in removed_edges}

    all_features: List[Dict[str, Any]] = []
    removed_features: List[Dict[str, Any]] = []

    for _, row in gdf_edges.iterrows():
        geom = row.get("geometry")
        if geom is None:
            continue

        u = int(row["u"])
        v = int(row["v"])
        k = int(row.get("key", 0))

        props = {
            "u": u,
            "v": v,
            "key": k,
            "bridge": bool(row.get("bridge", False)),
            "tunnel": bool(row.get("tunnel", False)),
            "highway": row.get("highway", None),
        }

        feature = {
            "type": "Feature",
            "geometry": mapping(geom),
            "properties": props,
        }
        all_features.append(feature)

        if (u, v, k) in removed_set:
            removed_features.append(feature)

    edges_geojson = {"type": "FeatureCollection", "features": all_features}
    removed_geojson = {"type": "FeatureCollection", "features": removed_features}
    return edges_geojson, removed_geojson


# ---------- Routes ----------


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/cities")
def list_default_cities():
    return {"default_cities": DEFAULT_CITIES}


@app.get("/scenarios")
def list_scenarios():
    return {"scenarios": SCENARIOS}


@app.post("/simulate", response_model=SimResponse)
def simulate(req: SimRequest):
    """
    Main endpoint for interactive website.

    1. Load OSMnx road graph for the city.
    2. Pick edges to remove according to scenario + severity.
    3. Run A* based OD sampling to compute travel-time ratios.
    4. Build GeoJSON of all edges + removed edges for Leaflet visualization.
    """
    if req.scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {req.scenario}")

    # --- Load graph ---
    G = load_city_graph(req.city, cache_dir="graphs")

    # --- Optional USGS flood polygons for Highway Flood ---
    flood_polys = None
    if req.use_usgs_flood and req.scenario == "Highway Flood":
        flood_polys = download_usgs_flood_features_for_city(req.city)

    # --- Select edges to remove ---
    edge_ids: List[EdgeId] = select_edges_for_scenario(
        G,
        scenario=req.scenario,
        severity=req.severity,
        usgs_flood_polygons=flood_polys,
        seed=42,
    )

    # --- Run simulation metrics ---
    metrics = simulate_single_shock(
        G,
        edge_ids_to_remove=edge_ids,
        n_pairs=req.n_pairs,
        seed=123,
    )

    # --- Build GeoJSON for Leaflet ---
    edges_geojson, removed_geojson = build_edges_geojson(G, edge_ids)

    return SimResponse(
        city=req.city,
        scenario=req.scenario,
        severity=req.severity,
        avg_ratio=metrics["avg_ratio"],
        median_ratio=metrics["median_ratio"],
        pct_disconnected=metrics["pct_disconnected"],
        n_removed_edges=metrics["n_removed_edges"],
        n_pairs=metrics["n_pairs"],
        edges_geojson=edges_geojson,
        removed_edges_geojson=removed_geojson,
    )