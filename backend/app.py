# backend/app.py

from __future__ import annotations
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from urban_resilience import (
    DEFAULT_CITIES,
    SCENARIOS,
    run_single_scenario_for_city,
    run_progressive_damage_experiment,
    download_usgs_flood_features_for_city,
)


app = FastAPI(
    title="Urban Mobility Resilience API",
    description="Backend for 'Can Cities Survive Traffic Shocks?' project.",
    version="0.1.0",
)

# Allow frontend access (fine for class/demo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


class ProgressiveRequest(BaseModel):
    city: str
    scenario: str
    severities: List[float]
    n_pairs: int = 40
    runs_per_severity: int = 3
    use_usgs_flood: bool = False


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
    if req.scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {req.scenario}")

    flood_polys = None
    if req.use_usgs_flood and req.scenario == "Highway Flood":
        flood_polys = download_usgs_flood_features_for_city(req.city)

    result = run_single_scenario_for_city(
        city=req.city,
        scenario=req.scenario,
        severity=req.severity,
        n_pairs=req.n_pairs,
        usgs_flood_polygons=flood_polys,
    )

    return SimResponse(
        city=result.city,
        scenario=result.scenario,
        severity=result.severity,
        avg_ratio=result.avg_ratio,
        median_ratio=result.median_ratio,
        pct_disconnected=result.pct_disconnected,
        n_removed_edges=result.n_removed_edges,
        n_pairs=result.n_pairs,
    )


@app.post("/progressive")
def progressive(req: ProgressiveRequest):
    """
    Optional advanced endpoint; useful for plotting severity curves later.
    """
    if req.scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {req.scenario}")

    flood_polys = None
    if req.use_usgs_flood and req.scenario == "Highway Flood":
        flood_polys = download_usgs_flood_features_for_city(req.city)

    df = run_progressive_damage_experiment(
        city=req.city,
        scenario=req.scenario,
        severities=req.severities,
        n_pairs=req.n_pairs,
        runs_per_severity=req.runs_per_severity,
        usgs_flood_polygons=flood_polys,
    )
    return {"results": df.to_dict(orient="records")}
