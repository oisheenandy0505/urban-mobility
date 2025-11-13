# backend/urban_resilience/edge_selection.py

from __future__ import annotations
from typing import Iterable, List, Tuple, Optional

import numpy as np
import networkx as nx
import osmnx as ox
from shapely.geometry.base import BaseGeometry

from .config import SCENARIOS

EdgeId = Tuple[int, int, int]


def graph_to_edges_gdf(G: nx.MultiDiGraph):
    """
    Convert graph edges to a GeoDataFrame with (u, v, key, geometry, tags).

    Compatible with both older and newer osmnx versions.
    Ensures 'u', 'v', 'key' are actual columns (not just index levels).
    """
    # Newer osmnx API
    if hasattr(ox, "graph_to_gdfs"):
        gdf_nodes, gdf_edges = ox.graph_to_gdfs(G, nodes=True, edges=True)
    # Older osmnx API
    elif hasattr(ox, "utils_graph") and hasattr(ox.utils_graph, "graph_to_gdfs"):
        gdf_nodes, gdf_edges = ox.utils_graph.graph_to_gdfs(
            G, nodes=True, edges=True
        )
    else:
        raise RuntimeError(
            "Your osmnx version does not expose graph_to_gdfs in a known place. "
            "Try upgrading: pip install --upgrade osmnx"
        )

    # In many osmnx versions, u/v/key are in the index; make them columns.
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
    Select major highway edges based on the 'highway' tag (motorway/trunk/primary/secondary).
    """
    edges = graph_to_edges_gdf(G)

    def is_major(val) -> bool:
        major = {"motorway", "trunk", "primary", "secondary"}
        if isinstance(val, (list, tuple, set)):
            return any(v in major for v in val)
        return val in major

    mask = edges["highway"].apply(is_major)
    sub = edges[mask]
    return list(map(tuple, sub[["u", "v", "key"]].values.tolist()))


def select_edges_for_scenario(
    G: nx.MultiDiGraph,
    scenario: str,
    severity: float,
    usgs_flood_polygons: Optional[Iterable[BaseGeometry]] = None,
    seed: Optional[int] = None,
) -> List[EdgeId]:
    """
    Central dispatcher: scenario name → list of (u, v, key) edges to remove.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario}")

    edges_gdf = graph_to_edges_gdf(G)
    rng = np.random.default_rng(seed)

    if scenario == "Bridge Collapse":
        candidates = select_bridge_edges(G)

    elif scenario == "Tunnel Closure":
        candidates = select_tunnel_edges(G)

    elif scenario == "Highway Flood":
        # If we have USGS polygons, intersect them with edges.
        if usgs_flood_polygons:
            polys = list(usgs_flood_polygons)
            if polys:
                mask = edges_gdf.geometry.apply(
                    lambda geom: any(geom.intersects(p) for p in polys)
                )
                flooded = edges_gdf[mask]
                candidates = list(
                    map(tuple, flooded[["u", "v", "key"]].values.tolist())
                )
            else:
                candidates = select_highway_edges(G)
        else:
            candidates = select_highway_edges(G)

    elif scenario == "Targeted Attack (Top k%)":
        undirected = nx.Graph(G)
        bet = nx.edge_betweenness_centrality(undirected)
        sorted_edges = sorted(bet.items(), key=lambda kv: kv[1], reverse=True)
        n_top = max(1, int(len(sorted_edges) * severity))
        top_pairs = {tuple(sorted((u, v))) for (u, v), _ in sorted_edges[:n_top]}
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