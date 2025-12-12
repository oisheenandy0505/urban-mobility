import { useEffect, useState, useMemo } from "react";
import CitySelector from "../components/city/CitySelector";
import Tabs from "../components/layout/Tabs";
import Legend from "../components/Legend";
import NetworkMap from "../components/maps/NetworkMap";
import ComparisonMaps from "../components/maps/ComparisonMaps";
import { fetchScenarios, runSimulation } from "../api/client";

import MetricsHelp from "../components/metrics/MetricsHelp";
import ScenarioInsights from "../components/insights/ScenarioInsights";
import TimeOfDayImpact from "../components/insights/TimeOfDayImpact";
import MultiCitySummary from "../components/insights/MultiCitySummary";
import WhatIfPanel from "../components/insights/WhatIfPanel";

import MLDashboard from "./MLDashboard";

function mapIntensityToSeverity(intensityPercent) {
  const minSlider = 5;
  const maxSlider = 80;
  const minSeverity = 0.01;
  const maxSeverity = 0.5;

  const clamped = Math.min(maxSlider, Math.max(minSlider, intensityPercent));
  const t = (clamped - minSlider) / (maxSlider - minSlider); // 0 → 1
  const severity = minSeverity + t * (maxSeverity - minSeverity);
  return Number(severity.toFixed(3));
}

function Dashboard() {
  const [scenarios, setScenarios] = useState([]);
  const [activeTab, setActiveTab] = useState("visual");

  const [selectedCity, setSelectedCity] = useState(null);
  const [cityOverride, setCityOverride] = useState("");

  const [scenario, setScenario] = useState("");
  const [intensity, setIntensity] = useState(40);
  const [nPairs, setNPairs] = useState(40);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [simResult, setSimResult] = useState(null);

  const [edgesGeo, setEdgesGeo] = useState(null);
  const [removedGeo, setRemovedGeo] = useState(null);

  const [history, setHistory] = useState([]);

  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    fetchScenarios()
      .then((scs) => setScenarios(scs))
      .catch((e) => console.error(e));
  }, []);

  const effectiveCityString = useMemo(() => {
    if (cityOverride.trim()) return cityOverride.trim();
    if (selectedCity) return selectedCity.query;
    return "";
  }, [cityOverride, selectedCity]);

  const severity = useMemo(
    () => mapIntensityToSeverity(intensity),
    [intensity]
  );

  const handleRun = async () => {
    if (!effectiveCityString) {
      alert("Select a city first.");
      return;
    }
    if (!scenario) {
      alert("Choose a disruption type.");
      return;
    }

    console.log("Running simulation with:", {
      city: effectiveCityString,
      scenario,
      intensity,
      severity,
      nPairs,
    });

    try {
      setLoading(true);
      setStatus("Running simulation…");

      const res = await runSimulation({
        city: effectiveCityString,
        scenario,
        severity,
        nPairs,
      });

      setSimResult(res);
      setEdgesGeo(res.edges_geojson);
      setRemovedGeo(res.removed_edges_geojson);
      setStatus("Done.");
      setMapVersion((v) => v + 1);

      setHistory((prev) => [
        ...prev,
        {
          id: Date.now(),
          cityQuery: effectiveCityString,
          cityLabel: selectedCity?.label || effectiveCityString,
          scenario,
          severity,
          nPairs,
          avgRatio: res.avg_ratio,
          medianRatio: res.median_ratio,
          pctDisconnected: res.pct_disconnected,
          nRemovedEdges: res.n_removed_edges,
        },
      ]);
    } catch (err) {
      console.error(err);
      setStatus("Error running simulation.");
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalRoads = edgesGeo?.features?.length || 0;
  const disrupted = simResult?.n_removed_edges || 0;
  const remaining = totalRoads - disrupted;
  const resilienceScore =
    simResult && simResult.avg_ratio > 0
      ? (1 / simResult.avg_ratio) * 100
      : null;

  const hasCity = !!selectedCity;
  const hasBaseline = hasCity && !!edgesGeo;
  const canRun = !!effectiveCityString && !!scenario && !loading;

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "1rem 2.5rem 3rem",
      }}
    >
      <CitySelector
        currentCity={selectedCity}
        onSelect={(city) => {
          setSelectedCity(city);
          setCityOverride("");

          setSimResult(null);
          setRemovedGeo(null);
          setEdgesGeo(null);
          setStatus("Loading baseline network…");

          runSimulation({
            city: city.query,
            scenario: "Random Failure",
            severity: 0.01,
            nPairs: 10,
          })
            .then((res) => {
              setEdgesGeo(res.edges_geojson);
              setStatus("Baseline network loaded.");
              setMapVersion((v) => v + 1);
            })
            .catch((err) => {
              console.error(err);
              setStatus("Error loading baseline network.");
            });
        }}
      />

      <Tabs active={activeTab} onChange={setActiveTab} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: "1.5rem",
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: controls */}
        <section
          style={{
            background: "#ffffff",
            padding: "1.25rem",
            borderRadius: "1rem",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ marginTop: 0 }}>Apply Disruption</h3>
          <p
            style={{
              marginTop: 0,
              fontSize: "0.85rem",
              color: "#6b7280",
              marginBottom: "1rem",
            }}
          >
            {hasCity
              ? "Select a disruption type and intensity for this city."
              : "Choose a city, then set up a disruption to simulate."}
          </p>

          {/* Intensity slider */}
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Disruption Intensity
          </label>
          <input
            type="range"
            min={5}
            max={80}
            step={5}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8rem",
              color: "#6b7280",
              marginBottom: "0.75rem",
            }}
          >
            <span>Minor</span>
            <span>{intensity}%</span>
            <span>Catastrophic</span>
          </div>

          {/* Scenario buttons */}
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Disruption Type
          </label>
          <div
            style={{ display: "grid", gap: "0.4rem", marginBottom: "0.75rem" }}
          >
            {scenarios.map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setScenario(sc)}
                style={{
                  textAlign: "left",
                  borderRadius: "0.75rem",
                  border:
                    scenario === sc ? "1px solid #4f46e5" : "1px solid #e5e7eb",
                  background: scenario === sc ? "#eef2ff" : "#f9fafb",
                  padding: "0.45rem 0.75rem",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                {sc}
              </button>
            ))}
          </div>

          {/* OD pairs */}
          <label
            style={{
              display: "block",
              fontSize: "0.85rem",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Number of OD pairs
          </label>
          <input
            type="number"
            min={10}
            max={200}
            value={nPairs}
            onChange={(e) => setNPairs(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "0.4rem 0.6rem",
              borderRadius: "0.5rem",
              border: "1px solid #e5e7eb",
              fontSize: "0.9rem",
              marginBottom: "0.75rem",
            }}
          />

          {/* Run button */}
          <button
            type="button"
            onClick={handleRun}
            disabled={!canRun}
            style={{
              width: "100%",
              padding: "0.6rem 1rem",
              borderRadius: "999px",
              border: "none",
              background: canRun ? "#111827" : "#9ca3af",
              color: "#ffffff",
              fontWeight: 600,
              cursor: canRun ? "pointer" : "not-allowed",
              marginBottom: "0.35rem",
            }}
          >
            {loading ? "Running…" : "Run Simulation"}
          </button>
          <div
            style={{
              fontSize: "0.8rem",
              color: "#6b7280",
              minHeight: "1.2em",
            }}
          >
            {status}
          </div>
        </section>

        {/* RIGHT: main content */}
        <section
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          {activeTab === "visual" && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>
                    {hasCity
                      ? `${selectedCity.label} Road Network`
                      : "Road Network Visualization"}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      color: "#6b7280",
                    }}
                  >
                    {!hasCity
                      ? "Select a city to load its baseline road network."
                      : simResult
                      ? "Drivable road network after disruption."
                      : "Baseline road network before any disruption."}
                  </p>
                </div>
                {simResult && (
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <MetricPill
                      label="Active Roads"
                      primary={remaining.toLocaleString()}
                      secondary={
                        disrupted > 0
                          ? `–${disrupted.toLocaleString()} impacted`
                          : ""
                      }
                    />
                    <MetricPill
                      label="Resilience"
                      primary={
                        resilienceScore != null
                          ? `${resilienceScore.toFixed(1)}%`
                          : "—"
                      }
                      secondary={
                        simResult?.pct_disconnected != null
                          ? `${simResult.pct_disconnected.toFixed(
                              1
                            )}% OD pairs disconnected`
                          : ""
                      }
                    />
                  </div>
                )}
              </div>

              {!hasCity ? (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "1rem",
                    border: "1px solid #e5e7eb",
                    padding: "2.5rem 1.5rem",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "0.9rem",
                  }}
                >
                  Use the city search above to pick one of the study cities. The
                  map and metrics will appear here once a baseline network is
                  loaded.
                </div>
              ) : !hasBaseline ? (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "1rem",
                    border: "1px solid #e5e7eb",
                    padding: "2.5rem 1.5rem",
                    textAlign: "center",
                    color: "#6b7280",
                    fontSize: "0.9rem",
                  }}
                >
                  Loading baseline network for{" "}
                  <strong>{selectedCity.label}</strong>…
                </div>
              ) : (
                <>
                  <NetworkMap
                    edges={edgesGeo}
                    removedEdges={removedGeo}
                    mapVersion={mapVersion}
                  />
                  <Legend />
                  <ScenarioInsights
                    city={selectedCity?.label || effectiveCityString}
                    scenario={scenario}
                    simResult={simResult}
                  />
                </>
              )}
            </>
          )}

          {activeTab === "comparison" && (
            <div
              style={{
                background: "#ffffff",
                padding: "1.25rem",
                borderRadius: "1rem",
                border: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <ComparisonMaps
                edges={edgesGeo}
                removedEdges={removedGeo}
                scenario={scenario}
                metrics={simResult}
              />
              <TimeOfDayImpact simResult={simResult} />
            </div>
          )}
          {/* ✅ NEW: ML tab */}
          {activeTab === "ml" && (
            <div
              style={{
                background: "#ffffff",
                padding: "1.25rem",
                borderRadius: "1rem",
                border: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <p
                style={{
                  marginTop: 0,
                  fontSize: "0.85rem",
                  color: "#6b7280",
                  marginBottom: "0.5rem",
                }}
              >
                Explore how graph structure and disruption parameters drive
                resilience using a Random Forest model trained on the small
                simulation dataset.
              </p>

              <MLDashboard
                currentCityLabel={selectedCity?.label || effectiveCityString}
                currentScenario={scenario}
                currentSeverity={severity}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function MetricPill({ label, primary, secondary }) {
  return (
    <div
      style={{
        padding: "0.4rem 0.8rem",
        borderRadius: "999px",
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          fontSize: "0.75rem",
          textTransform: "uppercase",
          color: "#6b7280",
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{primary}</div>
      {secondary && (
        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{secondary}</div>
      )}
    </div>
  );
}

function SummaryCard({ title, value }) {
  return (
    <div
      style={{
        padding: "0.9rem 1rem",
        borderRadius: "0.9rem",
        background: "linear-gradient(135deg,#eef2ff,#f5f3ff)",
        border: "1px solid #e0e7ff",
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          textTransform: "uppercase",
          color: "#6b7280",
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{value}</div>
    </div>
  );
}

export default Dashboard;
