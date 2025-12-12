import { useState } from "react";
import axios from "axios";

export default function MLDashboard() {
  const [city, setCity] = useState("");
  const [failureType, setFailureType] = useState("Bridge Collapse");
  const [intensity, setIntensity] = useState(40);

  const [result, setResult] = useState(null);
  const [scenarioExp, setScenarioExp] = useState(null);
  const [structuralExp, setStructuralExp] = useState([]);
  const [loading, setLoading] = useState(false);

  const FAILURE_OPTIONS = [
    "Bridge Collapse",
    "Tunnel Closure",
    "Highway Flood",
    "Targeted Attack",
    "Random failures",
  ];

  const predict = async () => {
    if (!city.trim()) {
      alert("Please enter a city name.");
      return;
    }

    setLoading(true);
    setResult(null);
    setScenarioExp(null);
    setStructuralExp([]);

    try {
      const res = await axios.post("http://127.0.0.1:8000/ml/predict-city", {
        city: city.trim(),
        failure_type: failureType,
        intensity: Number(intensity),
      });

      const data = res.data;
      console.log("Backend:", data);

      setResult(data.resilience);
      setScenarioExp(data.explanation.scenario);
      setStructuralExp(data.explanation.structural);
    } catch (err) {
      console.error("Prediction error:", err);
      alert("Prediction failed. Check backend logs.");
    }

    setLoading(false);
  };

  // ------------------ STYLES ------------------
  const card = {
    padding: "1.4rem",
    background: "#ffffff",
    borderRadius: 12,
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
    marginTop: "1.4rem",
  };

  const labelStyle = {
    fontWeight: 600,
    marginBottom: 6,
    display: "block",
  };

  const input = {
    width: "260px",
    padding: "10px",
    fontSize: "1rem",
    borderRadius: 8,
    outline: "none",
    border: "1px solid #d1d1d1",
  };

  const selectStyle = {
    padding: "10px",
    fontSize: "1rem",
    borderRadius: 8,
    outline: "none",
    border: "1px solid #d1d1d1",
  };

  const button = {
    marginTop: "1rem",
    padding: "12px 22px",
    background: "linear-gradient(135deg, #4c8bfd, #376bdb)",
    color: "white",
    borderRadius: 8,
    border: "none",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(76, 139, 253, 0.3)",
  };

  const buttonDisabled = {
    ...button,
    background: "#aac7ff",
    cursor: "not-allowed",
  };

  // ------------------------------------------------------

  return (
    <div style={{ padding: "2rem", maxWidth: "700px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: 10 }}>Urban Network Resilience Simulator</h2>
      <p style={{ color: "#555", marginBottom: 30 }}>
        Analyze how real US city road networks respond to disruptions.
      </p>

      {/* --- Input Card --- */}
      <div style={card}>
        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>City</label>
          <input
            type="text"
            value={city}
            placeholder="Boston, MA"
            onChange={(e) => setCity(e.target.value)}
            style={input}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Failure Type</label>
          <select
            value={failureType}
            onChange={(e) => setFailureType(e.target.value)}
            style={selectStyle}
          >
            {FAILURE_OPTIONS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={labelStyle}>Intensity (0–100)</label>
          <input
            type="number"
            min={0}
            max={100}
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            style={{ ...input, width: "100px" }}
          />
        </div>

        <button
          onClick={predict}
          disabled={loading}
          style={loading ? buttonDisabled : button}
        >
          {loading ? "Predicting…" : "Run Prediction"}
        </button>
      </div>

      {/* Result Card */}
      {result !== null && (
        <div style={{ ...card, background: "#eefbf0" }}>
          <h3>Predicted Resilience</h3>
          <p style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: 10 }}>
            {result.toFixed(4)}
          </p>
        </div>
      )}

      {/* Explanation Card */}
      {scenarioExp && (
        <div style={{ ...card, background: "#f4f4ff" }}>
          <h3>Why this score?</h3>

          <p style={{ marginTop: 12 }}>
            Under the <strong>{scenarioExp.name}</strong> scenario, resilience
            changed by <strong>{scenarioExp.effect.toFixed(4)}</strong> relative
            to a typical city.
          </p>

          <h4 style={{ marginTop: 16 }}>Key Structural Factors</h4>
          <ul style={{ marginTop: 6 }}>
            {structuralExp.map((item, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                <strong>{item.feature.replace("feat_", "")}</strong>:{" "}
                {item.effect > 0 ? "+" : ""}
                {item.effect.toFixed(4)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
