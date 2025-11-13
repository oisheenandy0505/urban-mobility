# backend/urban_resilience/run_multi_city.py

from __future__ import annotations
import os
from typing import List

import pandas as pd

from .config import DEFAULT_CITIES, SCENARIOS
from .experiments import run_single_scenario_for_city


def run_experiments(
    cities: List[str] | None = None,
    scenarios: List[str] | None = None,
    severities: List[float] | None = None,
    n_pairs: int = 40,
    random_reps_for_random_failure: int = 5,
    output_csv: str = "outputs/multi_city_results.csv",
):
    """
    Phase 2: run experiments for your 5 static cities.

    - For deterministic scenarios (bridge/tunnel/highway/targeted): 1 run per (city, scenario, severity).
    - For 'Random Failure': `random_reps_for_random_failure` runs, then averaged later in analysis.
    """
    if cities is None:
        cities = DEFAULT_CITIES
    if scenarios is None:
        scenarios = SCENARIOS
    if severities is None:
        severities = [0.02, 0.05, 0.1]

    os.makedirs(os.path.dirname(output_csv), exist_ok=True)

    rows = []
    for city in cities:
        for scenario in scenarios:
            for sev in severities:
                if scenario == "Random Failure":
                    reps = random_reps_for_random_failure
                else:
                    reps = 1

                for rep in range(reps):
                    print(f"Running: {city} | {scenario} | severity={sev} | rep={rep}")
                    result = run_single_scenario_for_city(
                        city=city,
                        scenario=scenario,
                        severity=sev,
                        n_pairs=n_pairs,
                    )
                    rows.append(
                        {
                            "city": result.city,
                            "scenario": result.scenario,
                            "severity": result.severity,
                            "rep": rep,
                            "avg_ratio": result.avg_ratio,
                            "median_ratio": result.median_ratio,
                            "pct_disconnected": result.pct_disconnected,
                            "n_removed_edges": result.n_removed_edges,
                            "n_pairs": result.n_pairs,
                        }
                    )

    df = pd.DataFrame(rows)
    df.to_csv(output_csv, index=False)
    print(f"Saved results to {output_csv}")


if __name__ == "__main__":
    run_experiments()