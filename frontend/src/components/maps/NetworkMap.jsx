import React, { useMemo, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FitBoundsToGeoJSON({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data || !data.features || data.features.length === 0) return;

    const coords = [];

    data.features.forEach((feat) => {
      const geom = feat.geometry;
      if (!geom) return;

      if (geom.type === "LineString") {
        geom.coordinates.forEach(([lng, lat]) => coords.push([lat, lng]));
      } else if (geom.type === "MultiLineString") {
        geom.coordinates.forEach((line) =>
          line.forEach(([lng, lat]) => coords.push([lat, lng]))
        );
      }
    });

    if (!coords.length) return;

    const bounds = coords.reduce(
      (acc, [lat, lng]) => {
        return [
          [Math.min(acc[0][0], lat), Math.min(acc[0][1], lng)],
          [Math.max(acc[1][0], lat), Math.max(acc[1][1], lng)],
        ];
      },
      [
        [coords[0][0], coords[0][1]],
        [coords[0][0], coords[0][1]],
      ]
    );

    map.fitBounds(bounds, { padding: [20, 20] });
  }, [data, map]);

  return null;
}

function NetworkMap({ edges, removedEdges, mapVersion }) {
  const hasData = edges && edges.features && edges.features.length > 0;

  const defaultCenter = [40.44, -79.99];

  const styleEdges = useMemo(
    () => ({
      color: (feature) => {
        const hw = feature?.properties?.highway;
        const major = ["motorway", "trunk", "primary", "secondary"];
        const isMajor =
          Array.isArray(hw) ? hw.some((h) => major.includes(h)) : major.includes(hw);
        return isMajor ? "#2563eb" : "#9ca3af";
      },
      weight: (feature) => {
        const hw = feature?.properties?.highway;
        const major = ["motorway", "trunk", "primary", "secondary"];
        const isMajor =
          Array.isArray(hw) ? hw.some((h) => major.includes(h)) : major.includes(hw);
        return isMajor ? 3 : 1.4;
      },
      opacity: 0.9,
    }),
    []
  );

  const styleRemoved = useMemo(
    () => ({
      color: "#dc2626",
      weight: 3.2,
      opacity: 0.95,
    }),
    []
  );

  const edgeStyleFn = (feature) => ({
    color: styleEdges.color(feature),
    weight: styleEdges.weight(feature),
    opacity: styleEdges.opacity,
  });

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "1rem",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <MapContainer
        key={mapVersion}
        center={defaultCenter}
        zoom={11}
        style={{ height: "520px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hasData && (
          <>
            <GeoJSON data={edges} style={edgeStyleFn} />

            {removedEdges &&
              removedEdges.features &&
              removedEdges.features.length > 0 && (
                <GeoJSON data={removedEdges} style={styleRemoved} />
              )}

            <FitBoundsToGeoJSON data={edges} />
          </>
        )}
      </MapContainer>
    </div>
  );
}

export default NetworkMap;
