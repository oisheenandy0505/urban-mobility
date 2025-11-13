# backend/urban_resilience/experiments.py

from __future__ import annotations
from typing import Iterable, Optional

import pandas as pd

from .graph_loader import load_city_graph
from .edge_selection import select_edges_for_scenario
from .simulation import simulate_single_shock, SimulationResult


def run_single_scenario_for_city(
    city: str,
    scenario: str,
    severity: float,
    n_pairs: int = 40,
    usgs_flood_polygons=None,
    cache_dir: str = "graphs",
    seed: Optional[int] = None,
) -> SimulationResult:
    """
    Load a city graph, select edges to remove for a scenario, and run one shock simulation.
    """
    G = load_city_graph(city, cache_dir=cache_dir)
    edge_ids = select_edges_for_scenario(
        G,
        scenario=scenario,
        severity=severity,
        usgs_flood_polygons=usgs_flood_polygons,
        seed=seed,
    )
    metrics = simulate_single_shock(
        G,
        edge_ids_to_remove=edge_ids,
        n_pairs=n_pairs,
        seed=seed,
    )
    return SimulationResult(
        city=city,
        scenario=scenario,
        severity=severity,
        avg_ratio=metrics["avg_ratio"],
        median_ratio=metrics["median_ratio"],
        pct_disconnected=metrics["pct_disconnected"],
        n_removed_edges=metrics["n_removed_edges"],
        n_pairs=metrics["n_pairs"],
    )


def run_progressive_damage_experiment(
    city: str,
    scenario: str,
    severities: Iterable[float],
    n_pairs: int = 40,
    runs_per_severity: int = 3,
    usgs_flood_polygons=None,
    cache_dir: str = "graphs",
    base_seed: int = 42,
) -> pd.DataFrame:
    """
    Advanced simulation: for each severity level, run multiple repeats and collect metrics.
    (You may or may not use this for Phase 2; it's there if you want curves later.)
    """
    G = load_city_graph(city, cache_dir=cache_dir)
    rows = []
    severities_list = list(severities)

    for i, sev in enumerate(severities_list):
        for run in range(runs_per_severity):
            seed = base_seed + i * 100 + run
            edge_ids = select_edges_for_scenario(
                G,
                scenario=scenario,
                severity=sev,
                usgs_flood_polygons=usgs_flood_polygons,
                seed=seed,
            )
            metrics = simulate_single_shock(
                G,
                edge_ids_to_remove=edge_ids,
                n_pairs=n_pairs,
                seed=seed,
            )
            row = {
                "city": city,
                "scenario": scenario,
                "severity": sev,
                "run": run,
                **metrics,
            }
            rows.append(row)

    return pd.DataFrame(rows)