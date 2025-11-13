# backend/urban_resilience/simulation.py

from __future__ import annotations
from dataclasses import dataclass
from typing import Iterable, List, Tuple, Optional

import numpy as np
import networkx as nx

EdgeId = Tuple[int, int, int]


@dataclass
class SimulationResult:
    city: str
    scenario: str
    severity: float
    avg_ratio: float
    median_ratio: float
    pct_disconnected: float
    n_removed_edges: int
    n_pairs: int


def _largest_component(G: nx.Graph) -> nx.Graph:
    """
    Keep the largest connected component (weak for directed graphs).
    """
    if isinstance(G, (nx.DiGraph, nx.MultiDiGraph)):
        comp = max(nx.weakly_connected_components(G), key=len)
        return G.subgraph(comp).copy()
    comp = max(nx.connected_components(G), key=len)
    return G.subgraph(comp).copy()


def sample_od_pairs(
    G: nx.MultiDiGraph,
    n_pairs: int,
    seed: Optional[int] = None,
):
    """
    Sample origin–destination node pairs that are connected in the largest component.
    """
    rng = np.random.default_rng(seed)
    H = _largest_component(G)
    nodes = list(H.nodes())
    pairs: List[Tuple[int, int]] = []
    attempts = 0
    max_attempts = n_pairs * 20

    while len(pairs) < n_pairs and attempts < max_attempts:
        u, v = rng.choice(nodes, size=2, replace=False)
        attempts += 1
        if nx.has_path(H, u, v):
            pairs.append((u, v))

    if not pairs:
        raise RuntimeError("Could not sample any connected OD pairs.")
    return pairs


def _weight_attr(G: nx.MultiDiGraph) -> str:
    """
    Decide whether to use 'travel_time' or 'length' as edge weight.
    """
    for _, _, data in G.edges(data=True):
        if "travel_time" in data:
            return "travel_time"
        if "length" in data:
            return "length"
        break
    return "length"


def simulate_single_shock(
    G: nx.MultiDiGraph,
    edge_ids_to_remove: Iterable[EdgeId],
    n_pairs: int = 40,
    penalty_ratio: float = 5.0,
    seed: Optional[int] = None,
):
    """
    Remove specified edges, then compare A* travel times before vs after on OD pairs.
    """
    G_before = G
    G_after = G.copy()

    n_removed = 0
    for u, v, k in edge_ids_to_remove:
        if G_after.has_edge(u, v, k):
            G_after.remove_edge(u, v, k)
            n_removed += 1

    if n_removed == 0:
        return {
            "avg_ratio": 1.0,
            "median_ratio": 1.0,
            "pct_disconnected": 0.0,
            "n_removed_edges": 0,
            "n_pairs": 0,
        }

    pairs = sample_od_pairs(G_before, n_pairs=n_pairs, seed=seed)
    weight = _weight_attr(G_before)

    ratios: List[float] = []
    disconnected = 0

    for u, v in pairs:
        try:
            baseline = nx.astar_path_length(G_before, u, v, weight=weight)
        except nx.NetworkXNoPath:
            continue

        try:
            damaged = nx.astar_path_length(G_after, u, v, weight=weight)
            ratios.append(damaged / baseline)
        except nx.NetworkXNoPath:
            disconnected += 1
            ratios.append(penalty_ratio)

    if not ratios:
        return {
            "avg_ratio": penalty_ratio,
            "median_ratio": penalty_ratio,
            "pct_disconnected": 100.0,
            "n_removed_edges": n_removed,
            "n_pairs": len(pairs),
        }

    return {
        "avg_ratio": float(np.mean(ratios)),
        "median_ratio": float(np.median(ratios)),
        "pct_disconnected": 100.0 * disconnected / len(pairs),
        "n_removed_edges": n_removed,
        "n_pairs": len(pairs),
    }
