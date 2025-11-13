# backend/urban_resilience/graph_loader.py

from __future__ import annotations
import os
import osmnx as ox
import networkx as nx


def load_city_graph(city: str, cache_dir: str = "graphs") -> nx.MultiDiGraph:
    """
    Load a city's drivable road network from OSMnx, with on-disk GraphML caching.
    """
    os.makedirs(cache_dir, exist_ok=True)
    safe_name = city.replace(",", "").replace(" ", "_")
    cache_path = os.path.join(cache_dir, f"{safe_name}.graphml")

    if os.path.exists(cache_path):
        G = ox.load_graphml(cache_path)
    else:
        G = ox.graph_from_place(city, network_type="drive")
        G = ox.add_edge_speeds(G)
        G = ox.add_edge_travel_times(G)
        ox.save_graphml(G, cache_path)

    return G