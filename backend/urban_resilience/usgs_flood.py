# backend/urban_resilience/usgs_flood.py

from __future__ import annotations
import os
from typing import List, Optional

import requests
import osmnx as ox
from shapely.geometry import shape
from shapely.geometry.base import BaseGeometry


def download_usgs_flood_features_for_city(
    city: str,
    cache_dir: str = "usgs_cache",
    collection_id: str = "flood_inundation",
) -> Optional[List[BaseGeometry]]:
    """
    Download flood-related features from USGS OGC API for the city's bounding box
    and cache the result as GeoJSON.

    If anything fails, returns None and the simulation will fall back to
    OSMnx-based highway flooding.
    """
    os.makedirs(cache_dir, exist_ok=True)
    safe_name = city.replace(",", "").replace(" ", "_")
    cache_path = os.path.join(cache_dir, f"{safe_name}.geojson")

    # Load cached
    if os.path.exists(cache_path):
        try:
            import json
            with open(cache_path, "r", encoding="utf-8") as f:
                geo = json.load(f)
            return [shape(feat["geometry"]) for feat in geo.get("features", [])]
        except Exception:
            return None

    # Get bbox via OSMnx
    gdf_place = ox.geocode_to_gdf(city)
    minx, miny, maxx, maxy = gdf_place.total_bounds

    base_url = (
        f"https://api.waterdata.usgs.gov/ogcapi/features/collections/"
        f"{collection_id}/items"
    )
    params = {
        "bbox": f"{minx},{miny},{maxx},{maxy}",
        "f": "geojson",
        "limit": 10000,
    }

    try:
        r = requests.get(base_url, params=params, timeout=30)
        r.raise_for_status()
        geo = r.json()
    except Exception:
        return None

    # Cache
    try:
        import json
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(geo, f)
    except Exception:
        pass

    polygons: List[BaseGeometry] = []
    for feat in geo.get("features", []):
        try:
            polygons.append(shape(feat["geometry"]))
        except Exception:
            continue

    if not polygons:
        return None
    return polygons