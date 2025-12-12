from __future__ import annotations
import os
import osmnx as ox
import networkx as nx

_GRAPH_CACHE: dict[str, nx.MultiDiGraph] = {}


def load_city_graph(city: str, cache_dir: str = "graphs") -> nx.MultiDiGraph:
    """
    Load a city's drivable road network from OSMnx, with on-disk GraphML caching,
    and an in-memory cache so repeated calls reuse the same NetworkX object.
    """
    os.makedirs(cache_dir, exist_ok=True)
    safe_name = city.replace(",", "").replace(" ", "_")
    cache_path = os.path.join(cache_dir, f"{safe_name}.graphml")

    if safe_name in _GRAPH_CACHE:
        return _GRAPH_CACHE[safe_name]

    if os.path.exists(cache_path):
        G = ox.load_graphml(cache_path)
    else:
        G = ox.graph_from_place(city, network_type="drive")
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
        ox.save_graphml(G, cache_path)

    _GRAPH_CACHE[safe_name] = G
    return G
