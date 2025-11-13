// frontend/src/App.jsx

import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = "http://127.0.0.1:8000";

// Helper: fit map to GeoJSON bounds
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

    if (coords.length === 0) return;

    const latMin = Math.min(...coords.map((c) => c[0]));
    const latMax = Math.max(...coords.map((c) => c[0]));
    const lngMin = Math.min(...coords.map((c) => c[1]));
    const lngMax = Math.max(...coords.map((c) => c[1]));

    map.fitBounds(
      [
        [latMin, lngMin],
        [latMax, lngMax],
      ],
      { padding: [20, 20] }
    );
  }, [data, map]);

  return null;
}

function App() {
  const [scenarios, setScenarios] = useState([]);
  const [city, setCity] = useState("Pittsburgh, Pennsylvania, USA");
  const [scenario, setScenario] = useState("");
  const [severity, setSeverity] = useState(0.05);
  const [nPairs, setNPairs] = useState(40);
  const [useUSGS, setUseUSGS] = useState(false);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [edgesGeoJSON, setEdgesGeoJSON] = useState(null);
  const [removedGeoJSON, setRemovedGeoJSON] = useState(null);

  // Load scenarios from backend
  useEffect(() => {
    fetch(`${API_BASE}/scenarios`)
      .then((res) => res.json())
      .then((data) => {
        setScenarios(data.scenarios || []);
        if (data.scenarios && data.scenarios.length > 0) {
          setScenario(data.scenarios[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to load scenarios", err);
      });
  }, []);

  const handleRun = async () => {
    if (!city.trim()) {
      alert("Please enter a city.");
      return;
    }
    if (!scenario) {
      alert("Please select a scenario.");
      return;
    }

    setLoading(true);
    setStatus("Running...");
    setResult(null);
    setEdgesGeoJSON(null);
    setRemovedGeoJSON(null);

    try {
      const res = await fetch(`${API_BASE}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          scenario,
          severity: Number(severity),
          n_pairs: Number(nPairs),
          use_usgs_flood: useUSGS,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      const data = await res.json();
      setResult(data);
      setEdgesGeoJSON(data.edges_geojson);
      setRemovedGeoJSON(data.removed_edges_geojson);
      setStatus("Done.");
    } catch (err) {
      console.error(err);
      setStatus("Error. See console.");
      alert("Simulation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Style for baseline edges (before & after maps)
  const baseEdgeStyle = useMemo(
    () =>
      function baseEdgeStyle(feature) {
        const props = feature.properties || {};
        const isBridge = !!props.bridge;
        const isTunnel = !!props.tunnel;

        // Bridges = blue dashed, tunnels = purple dashed, others grey
        if (isBridge) {
          return {
            color: "#1d4ed8",
            weight: 2,
            dashArray: "4 4",
          };
        }
        if (isTunnel) {
          return {
            color: "#6b21a8",
            weight: 2,
            dashArray: "4 4",
          };
        }
        return {
          color: "#9ca3af",
          weight: 1,
        };
      },
    []
  );

  // Style for removed edges overlay on "after" map
  const removedEdgeStyle = useMemo(
    () =>
      function removedEdgeStyle(feature) {
        const props = feature.properties || {};
        const isBridge = !!props.bridge;
        const isTunnel = !!props.tunnel;

        // Color by scenario + structural type
        if (isBridge) {
          // Bridge collapse case
          return {
            color: "#ef4444", // red
            weight: 3,
          };
        }
        if (isTunnel) {
          return {
            color: "#a855f7", // violet
            weight: 3,
          };
        }

        if (scenario === "Highway Flood") {
          return {
            color: "#f97316", // orange
            weight: 3,
          };
        }
        if (scenario.startsWith("Targeted")) {
          return {
            color: "#dc2626", // strong red
            weight: 3,
          };
        }
        if (scenario === "Random Failure") {
          return {
            color: "#111827", // almost black
            weight: 3,
          };
        }

        // Fallback
        return {
          color: "#dc2626",
          weight: 3,
        };
      },
    [scenario]
  );

  return (
    <div
      style={{
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        background: "#f5f5f5",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "1.5rem",
            borderRadius: "0.75rem",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            marginBottom: "1.5rem",
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: "0.5rem" }}>
            Urban Mobility Resilience Simulator
          </h1>
          <p style={{ marginTop: 0, marginBottom: "1rem" }}>
            Pick a city, shock type, and intensity, then hit{" "}
            <strong>“Run Simulation”</strong>. Below, you’ll see metrics and a
            before/after map of the road network.
          </p>

          <div style={{ display: "grid", gap: "0.75rem" }}>
            <div>
              <label
                htmlFor="city"
                style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
              >
                City
              </label>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="scenario"
                style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
              >
                Shock scenario
              </label>
              <select
                id="scenario"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                }}
              >
                {scenarios.map((sc) => (
                  <option key={sc} value={sc}>
                    {sc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="severity"
                style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
              >
                Severity (fraction of edges removed)
              </label>
              <input
                id="severity"
                type="number"
                step="0.01"
                min="0.01"
                max="0.5"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label
                htmlFor="pairs"
                style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
              >
                Number of OD pairs to sample
              </label>
              <input
                id="pairs"
                type="number"
                min="10"
                max="200"
                value={nPairs}
                onChange={(e) => setNPairs(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  border: "1px solid #d1d5db",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={useUSGS}
                onChange={(e) => setUseUSGS(e.target.checked)}
              />
              <span>Use USGS flood data for Highway Flood (if available)</span>
            </label>
          </div>

          <div style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleRun}
              disabled={loading}
              style={{
                padding: "0.6rem 1.2rem",
                borderRadius: "999px",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 600,
                background: "#111827",
                color: "#fff",
              }}
            >
              {loading ? "Running..." : "Run Simulation"}
            </button>
            <span>{status}</span>
          </div>
        </div>

        {result && (
          <div
            style={{
              background: "#ffffff",
              padding: "1.5rem",
              borderRadius: "0.75rem",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Results</h2>
            <div style={{ marginBottom: "0.75rem" }}>
              <div>
                City: <strong>{result.city}</strong>
              </div>
              <div>
                Scenario: <strong>{result.scenario}</strong>
              </div>
              <div>
                Severity: <strong>{result.severity}</strong>
              </div>
              <div>
                Average travel-time ratio:{" "}
                <strong>{result.avg_ratio.toFixed(2)}</strong>
              </div>
              <div>
                Median travel-time ratio:{" "}
                <strong>{result.median_ratio.toFixed(2)}</strong>
              </div>
              <div>
                Disconnected OD pairs:{" "}
                <strong>{result.pct_disconnected.toFixed(1)}%</strong>
              </div>
              <div>
                Edges removed: <strong>{result.n_removed_edges}</strong>
              </div>
              <div>
                OD pairs sampled: <strong>{result.n_pairs}</strong>
              </div>
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
              }}
            >
              <LegendItem color="#9ca3af" label="Normal road" />
              <LegendItem color="#1d4ed8" label="Bridge (before)" dashed />
              <LegendItem color="#6b21a8" label="Tunnel (before)" dashed />
              <LegendItem color="#ef4444" label="Removed bridge" />
              <LegendItem color="#a855f7" label="Removed tunnel" />
              <LegendItem color="#f97316" label="Flooded highway" />
              <LegendItem color="#dc2626" label="Targeted edge" />
              <LegendItem color="#111827" label="Random failure edge" />
            </div>

            {/* Maps */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div>
                <h3 style={{ marginTop: 0 }}>Before shock</h3>
                <div
                  style={{
                    height: "400px",
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {edgesGeoJSON && (
                    <MapContainer
                      style={{ height: "100%", width: "100%" }}
                      center={[40.44, -79.99]} // dummy, will be overridden by FitBounds
                      zoom={12}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                      <GeoJSON data={edgesGeoJSON} style={baseEdgeStyle} />
                      <FitBoundsToGeoJSON data={edgesGeoJSON} />
                    </MapContainer>
                  )}
                </div>
              </div>

              <div>
                <h3 style={{ marginTop: 0 }}>After shock</h3>
                <div
                  style={{
                    height: "400px",
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  {edgesGeoJSON && (
                    <MapContainer
                      style={{ height: "100%", width: "100%" }}
                      center={[40.44, -79.99]}
                      zoom={12}
                      scrollWheelZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap contributors"
                      />
                      {/* Base network */}
                      <GeoJSON data={edgesGeoJSON} style={baseEdgeStyle} />
                      {/* Removed edges overlay */}
                      {removedGeoJSON && (
                        <GeoJSON
                          data={removedGeoJSON}
                          style={removedEdgeStyle}
                        />
                      )}
                      <FitBoundsToGeoJSON data={edgesGeoJSON} />
                    </MapContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label, dashed = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 28,
          height: 0,
          borderTop: dashed
            ? `3px dashed ${color}`
            : `3px solid ${color}`,
          display: "inline-block",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

export default App;