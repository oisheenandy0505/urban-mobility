const SCENARIO_DESCRIPTIONS = {
  "Bridge Collapse":
    "Bridges fail, cutting cross-river or gap-spanning links.",
  "Tunnel Closure":
    "Key tunnels are closed, forcing traffic onto surface streets.",
  "Highway Flood":
    "Major highway segments are flooded and taken out of service.",
  "Targeted Attack (Top k%)":
    "An attack knocks out the most central backbone links in the network.",
  "Random Failure":
    "Random road segments fail across the network.",
};

function classifyShockLevel(avgRatio, pctDisconnected) {
  const r = avgRatio ?? 1;
  const d = pctDisconnected ?? 0;

  if (d >= 40 || r >= 3) return "Catastrophic";
  if (d >= 15 || r >= 2) return "Severe";
  if (d >= 5 || r >= 1.4) return "Moderate";
  return "Mild";
}

function shockStyle(level) {
  const base = {
    padding: "0.2rem 0.75rem",
    borderRadius: "999px",
    fontSize: "0.78rem",
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  if (level === "Catastrophic") {
    return {
      ...base,
      background: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    };
  }
  if (level === "Severe") {
    return {
      ...base,
      background: "#fffbeb",
      color: "#92400e",
      border: "1px solid #fed7aa",
    };
  }
  if (level === "Moderate") {
    return {
      ...base,
      background: "#eff6ff",
      color: "#1d4ed8",
      border: "1px solid #bfdbfe",
    };
  }
  return {
    ...base,
    background: "#ecfdf5",
    color: "#166534",
    border: "1px solid #bbf7d0",
  };
}

function severeTripsBucket(avgRatio, pctDisconnected) {
  const r = avgRatio ?? 1;
  const d = pctDisconnected ?? 0;

  if (d >= 40 || r >= 3) return "many";
  if (d >= 15 || r >= 2) return "some";
  if (d >= 5 || r >= 1.4) return "few";
  return null;
}

function commuterSentence(avgRatio, pctDisconnected) {
  if (avgRatio == null) return null;
  const base = 20;
  const central = base * avgRatio;
  const low = Math.round(0.9 * central);
  const high = Math.round(1.1 * central);

  const disc = pctDisconnected ?? 0;

  if (disc >= 40) {
    return `A typical 20-minute cross-town trip would feel like about ${low}–${high} minutes after this shock, and many sampled pairs can’t reach each other at all.`;
  }
  if (disc >= 5) {
    return `A typical 20-minute cross-town trip would feel like about ${low}–${high} minutes after this shock. Some sampled origin–destination pairs fail completely.`;
  }
  return `A typical 20-minute cross-town trip would feel like about ${low}–${high} minutes after this shock. Most sampled trips still complete, just slower.`;
}

const ScenarioInsights = ({ city, scenario, simResult }) => {
  if (!simResult || !scenario || !city) {
    return (
      <div style={{ padding: "1.75rem 1.75rem 1.5rem 1.75rem" }}>
        <h2 style={{ margin: 0, marginBottom: "0.25rem" }}>What happened?</h2>
        <p style={{ color: "#6b7280", margin: 0 }}>
          Run a simulation to see how this disruption changes travel in the
          selected city.
        </p>
      </div>
    );
  }

  const { avg_ratio, pct_disconnected, n_removed_edges, n_pairs } = simResult;

  const shockLevel = classifyShockLevel(avg_ratio, pct_disconnected);
  const shockBadgeStyle = shockStyle(shockLevel);

  const discPct =
    pct_disconnected == null ? null : Math.round(pct_disconnected);
  const delayFactor =
    avg_ratio == null ? null : avg_ratio.toFixed(2);

  const severeBucket = severeTripsBucket(avg_ratio, pct_disconnected);
  const commuteText = commuterSentence(avg_ratio, pct_disconnected);

  const scenarioDesc =
    SCENARIO_DESCRIPTIONS[scenario] ||
    "This disruption removes a subset of important road segments in the city network.";

  return (
    <div style={{ padding: "1.75rem 1.75rem 1.5rem 1.75rem" }}>
      {/* Header row: title + badges */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "baseline",
          marginBottom: "0.75rem",
        }}
      >
        <h2 style={{ margin: 0, marginRight: "0.5rem" }}>
          {scenario} in {city}
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={shockBadgeStyle}>Shock: {shockLevel}</span>
          {delayFactor && (
            <span
              style={{
                padding: "0.2rem 0.75rem",
                borderRadius: "999px",
                fontSize: "0.78rem",
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                color: "#374151",
              }}
            >
              Avg delay: <strong>{delayFactor}×</strong>
            </span>
          )}
        </div>
      </div>

      {/* One-line scenario description */}
      <p
        style={{
          margin: 0,
          marginBottom: "0.75rem",
          color: "#4b5563",
          fontSize: "0.97rem",
          lineHeight: 1.6,
        }}
      >
        {scenarioDesc}
      </p>

      {/* High-level connectivity sentence */}
      {discPct != null && (
        <p
          style={{
            margin: 0,
            marginBottom: "0.5rem",
            fontSize: "0.95rem",
          }}
        >
          {discPct >= 40
            ? ">40% of sampled origin–destination pairs are cut off or see at least 2× longer routes."
            : discPct >= 10
            ? "A noticeable share of sampled origin–destination pairs are either cut off or heavily delayed."
            : "Most sampled origin–destination pairs remain connected, but many trips still experience slowdown."}
        </p>
      )}

      {/* Commuter narrative */}
      {commuteText && (
        <p
          style={{
            margin: 0,
            marginBottom: "1rem",
            fontSize: "0.95rem",
            lineHeight: 1.6,
          }}
        >
          {commuteText}
        </p>
      )}

      {/* Metrics mini-card */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div
          style={{
            flex: "1 1 260px",
            borderRadius: "0.9rem",
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            padding: "0.9rem 1rem",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#6b7280",
              marginBottom: "0.4rem",
            }}
          >
            Key metrics from this run
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              fontSize: "0.93rem",
              lineHeight: 1.7,
            }}
          >
            <li>
              <strong>Average delay:</strong>{" "}
              {delayFactor
                ? `${delayFactor}× slower than normal trips`
                : "Not available"}
            </li>
            <li>
              <strong>Disconnected pairs:</strong>{" "}
              {discPct != null && n_pairs != null
                ? `${discPct}% of the ${n_pairs} sampled origin–destination pairs`
                : "Not available"}
            </li>
            <li>
              <strong>Roads affected:</strong>{" "}
              {n_removed_edges != null
                ? `${n_removed_edges.toLocaleString()} edges removed in this scenario`
                : "Not available"}
            </li>
            {severeBucket && (
              <li>
                <strong>Severely impacted trips:</strong>{" "}
                {severeBucket === "many" &&
                  "A large share of sampled trips are either more than twice as long or completely disconnected."}
                {severeBucket === "some" &&
                  "A noticeable fraction of sampled trips fall into the “severely impacted” range (2× longer or unreachable)."}
                {severeBucket === "few" &&
                  "Only a small minority of sampled trips are severely impacted; most remain usable."}
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Collapsible real-world explanation */}
      <details style={{ marginTop: "1rem", fontSize: "0.92rem" }}>
        <summary>What does this scenario represent in the real world?</summary>
        <p
          style={{
            marginTop: "0.5rem",
            color: "#4b5563",
            lineHeight: 1.6,
          }}
        >
          In practice, shocks like this force traffic onto a smaller set of
          remaining routes. That means detours, heavier congestion on surviving
          corridors, and much longer trips for parts of the city that lose their
          usual cross-river or cross-valley connections.
        </p>
      </details>
    </div>
  );
};

export default ScenarioInsights;
