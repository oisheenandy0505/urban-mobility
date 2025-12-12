from __future__ import annotations
from typing import Iterable, List, Tuple, Optional, Dict

import numpy as np
import networkx as nx
import osmnx as ox
from shapely.geometry.base import BaseGeometry

from .config import SCENARIOS

EdgeId = Tuple[int, int, int]

# In-memory cache: id(G) -> list of ((u, v), betweenness)
_EDGE_BETWEENNESS_CACHE: Dict[int, List[Tuple[Tuple[int, int], float]]] = {}


def graph_to_edges_gdf(G: nx.MultiDiGraph):
    if hasattr(ox, "graph_to_gdfs"):
        gdf_nodes, gdf_edges = ox.graph_to_gdfs(G, nodes=True, edges=True)
    elif hasattr(ox, "utils_graph") and hasattr(ox.utils_graph, "graph_to_gdfs"):
        gdf_nodes, gdf_edges = ox.utils_graph.graph_to_gdfs(
            G, nodes=True, edges=True
        )
    else:
        raise RuntimeError(
            "Your osmnx version does not expose graph_to_gdfs in a known place. "
            "Try upgrading: pip install --upgrade osmnx"
        )

    for col in ("u", "v", "key"):
        if col not in gdf_edges.columns and col in gdf_edges.index.names:
            gdf_edges = gdf_edges.reset_index(level=col)

    if not {"u", "v", "key"}.issubset(gdf_edges.columns):
        gdf_edges = gdf_edges.reset_index()

    return gdf_edges


def select_bridge_edges(G: nx.MultiDiGraph) -> List[EdgeId]:
    """
    Select edges tagged as bridges in OSM.
    """
    edges = graph_to_edges_gdf(G)
    if "bridge" not in edges.columns:
        return []
    mask = edges["bridge"].notna()
    sub = edges[mask]
    if sub.empty:
        return []
    return list(map(tuple, sub[["u", "v", "key"]].values.tolist()))


def select_tunnel_edges(G: nx.MultiDiGraph) -> List[EdgeId]:
    """
    Select edges tagged as tunnels in OSM.
    """
    edges = graph_to_edges_gdf(G)
    if "tunnel" not in edges.columns:
        return []
    mask = edges["tunnel"].notna()
    sub = edges[mask]
    if sub.empty:
        return []
    return list(map(tuple, sub[["u", "v", "key"]].values.tolist()))


def select_highway_edges(G: nx.MultiDiGraph) -> List[EdgeId]:
    """
    Select major highway-type edges (motorway, trunk, primary, etc.)
    as generic 'important' road segments.
    """
    edges = graph_to_edges_gdf(G)
    if "highway" not in edges.columns:
        return []
    hw = edges["highway"]

    def is_major(val) -> bool:
        if isinstance(val, (list, tuple, set)):
            vals = val
        else:
            vals = [val]
        majors = {
            "motorway",
            "motorway_link",
            "trunk",
            "trunk_link",
            "primary",
            "primary_link",
        }
        return any(x in majors for x in vals if isinstance(x, str))

    mask = hw.apply(is_major)
    sub = edges[mask]
    if sub.empty:
        return []
    return list(map(tuple, sub[["u", "v", "key"]].values.tolist()))


def _get_edge_betweenness_ranking(
    G: nx.MultiDiGraph,
    approx_k: int = 300,
) -> List[Tuple[Tuple[int, int], float]]:
    """
    Compute (or retrieve cached) edge betweenness centrality ranking
    on an undirected projection of G.

    To keep things fast, we use *approximate* betweenness by sampling
    up to `approx_k` source nodes. For large graphs (like Chicago),
    this is dramatically faster than exact betweenness while still
    correctly surfacing the main "backbone" corridors.

    Returns:
        list of ((u, v), score) sorted by descending score.
    """
    gid = id(G)
    if gid in _EDGE_BETWEENNESS_CACHE:
        return _EDGE_BETWEENNESS_CACHE[gid]

    undirected = nx.Graph(G)
    n_nodes = undirected.number_of_nodes()

    if approx_k is not None:
        k = min(approx_k, n_nodes)
        print(
            f"[Targeted Attack] Computing *approximate* edge betweenness "
            f"with k={k} sampled nodes (n_nodes={n_nodes})..."
        )
        bet = nx.edge_betweenness_centrality(
            undirected,
            k=k,
            seed=0,
        )
    else:
        print(
            "[Targeted Attack] Computing *exact* edge betweenness "
            "(this may be slow for large cities)..."
        )
        bet = nx.edge_betweenness_centrality(undirected)

    ranked = sorted(bet.items(), key=lambda kv: kv[1], reverse=True)
    _EDGE_BETWEENNESS_CACHE[gid] = ranked
    print(
        f"[Targeted Attack] Betweenness computed and cached for {len(ranked)} edges."
    )
    return ranked


def select_edges_for_scenario(
    G: nx.MultiDiGraph,
    scenario: str,
    severity: float,
    usgs_flood_polygons: Optional[Iterable[BaseGeometry]] = None,
    seed: Optional[int] = None,
) -> List[EdgeId]:
    """
    Central dispatcher: scenario name → list of (u, v, key) edges to remove.

    IMPORTANT:
    - For all scenarios, `severity` is a *fraction* in [0, 1].
      We use it to scale how many candidate edges we actually remove.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario}")

    edges_gdf = graph_to_edges_gdf(G)
    rng = np.random.default_rng(seed)

    def take_fraction(candidates: List[EdgeId]) -> List[EdgeId]:
        """Helper: take roughly `severity` fraction of candidate edges."""
        if not candidates:
            return []
        n_remove = max(1, int(len(candidates) * severity))
        # randomise order so we don't always drop the same subset
        cand = candidates[:]  # copy
        rng.shuffle(cand)
        return cand[:n_remove]

    # ---- Scenario-specific logic ----

    if scenario == "Bridge Collapse":
        all_bridge_edges = select_bridge_edges(G)
        candidates = take_fraction(all_bridge_edges)

    elif scenario == "Tunnel Closure":
        all_tunnel_edges = select_tunnel_edges(G)
        candidates = take_fraction(all_tunnel_edges)

    elif scenario == "Highway Flood":
        # If we had flood polygons, we'd intersect; for now just use highways.
        if usgs_flood_polygons:
            polys = list(usgs_flood_polygons)
            if polys:
                mask = edges_gdf.geometry.apply(
                    lambda geom: any(geom.intersects(p) for p in polys)
                )
                flooded = edges_gdf[mask]
                all_flooded_edges = list(
                    map(tuple, flooded[["u", "v", "key"]].values.tolist())
                )
            else:
                all_flooded_edges = select_highway_edges(G)
        else:
            all_flooded_edges = select_highway_edges(G)

        candidates = take_fraction(all_flooded_edges)

    elif scenario == "Targeted Attack (Top k%)":
        # Use cached approximate edge-betweenness ranking for this graph.
        # This preserves the "hit the main backbone first" behavior while
        # not freezing your laptop on the first call.
        ranked = _get_edge_betweenness_ranking(G)

        n_top = max(1, int(len(ranked) * severity))

        # Take the top n_top undirected edge pairs (u, v), ignoring the score.
        top_pairs = {
            tuple(sorted((u, v)))
            for (u, v), _ in ranked[:n_top]
        }

        candidates: List[EdgeId] = []
        for u, v, k in G.edges(keys=True):
            if tuple(sorted((u, v))) in top_pairs:
                candidates.append((u, v, k))

    elif scenario == "Random Failure":
        all_edges = list(G.edges(keys=True))
        n_remove = max(1, int(len(all_edges) * severity))
        rng.shuffle(all_edges)
        candidates = all_edges[:n_remove]

    else:
        candidates = []

    return candidates
