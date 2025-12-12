const TimeOfDayImpact = ({ simResult }) => {
  if (!simResult) {
    return (
      <div style={{ padding: "1.75rem 1.75rem 1.25rem 1.75rem" }}>
        <h2 style={{ margin: 0, marginBottom: "0.4rem" }}>
          How this would feel at different times of day
        </h2>
        <p style={{ color: "#6b7280", margin: 0 }}>
          Run a simulation to see how commute times stretch under this shock.
        </p>
      </div>
    );
  }

  const { avg_ratio } = simResult;
  const delayFactor = avg_ratio || 1;

  const baseDurations = {
    offPeak: 16,
    midday: 20,
    rush: 26,
  };

  const rows = [
    {
      key: "offPeak",
      label: "Off-peak (early morning)",
      before: baseDurations.offPeak,
    },
    {
      key: "midday",
      label: "Midday",
      before: baseDurations.midday,
    },
    {
      key: "rush",
      label: "Evening rush hour",
      before: baseDurations.rush,
    },
  ].map((row) => {
    const after = row.before * delayFactor;
    const delta = after - row.before;
    return { ...row, after, delta };
  });

  const rushRow = rows.find((r) => r.key === "rush");
  const rushExtra = rushRow ? Math.round(rushRow.delta) : 0;

  const formatMinutes = (m) => `${Math.round(m)} min`;

  const impactLevel = (delta) => {
    const d = delta || 0;
    if (d <= 1) return "minor";
    if (d <= 8) return "noticeable";
    return "severe";
  };

  const impactLabel = {
    minor: "Minor impact",
    noticeable: "Noticeable impact",
    severe: "Severe impact",
  };

  const impactStyle = (level) => {
    const base = {
      padding: "0.25rem 0.6rem",
      borderRadius: "999px",
      fontSize: "0.78rem",
      fontWeight: 500,
      display: "inline-block",
    };
    if (level === "minor") {
      return {
        ...base,
        background: "#ecfdf5",
        color: "#166534",
        border: "1px solid #bbf7d0",
      };
    }
    if (level === "noticeable") {
      return {
        ...base,
        background: "#fffbeb",
        color: "#92400e",
        border: "1px solid #fed7aa",
      };
    }
    return {
      ...base,
      background: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    };
  };

  return (
    <div style={{ padding: "1.75rem 1.75rem 1.5rem 1.75rem" }}>
      <h2 style={{ margin: 0, marginBottom: "0.4rem" }}>
        How this would feel at different times of day
      </h2>
      <p
        style={{
          color: "#6b7280",
          margin: 0,
          marginBottom: "1rem",
          fontSize: "0.95rem",
        }}
      >
        Example for a typical 20-minute cross-town trip. We scale by the same
        delay factor from this simulation.
      </p>

      {/* Top summary strip */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            padding: "0.45rem 0.75rem",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontSize: "0.8rem",
          }}
        >
          <span style={{ color: "#6b7280", marginRight: 4 }}>Baseline trip (Midday reference):</span>
          <strong>20 min</strong>
        </div>

        <div
          style={{
            padding: "0.45rem 0.75rem",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontSize: "0.8rem",
          }}
        >
          <span style={{ color: "#6b7280", marginRight: 4 }}>Delay factor:</span>
          <strong>{delayFactor.toFixed(2)}×</strong>
        </div>

        <div
          style={{
            padding: "0.45rem 0.75rem",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontSize: "0.8rem",
          }}
        >
          <span style={{ color: "#6b7280", marginRight: 4 }}>
            Extra at rush hour:
          </span>
          <strong>
            {rushExtra >= 1 ? `+${rushExtra} min` : "about the same"}
          </strong>
        </div>
      </div>

      {/* Table with impact pills */}
      <div
        style={{
          borderRadius: "0.9rem",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.92rem",
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f9fafb",
                textAlign: "left",
              }}
            >
              <th style={{ padding: "0.6rem 0.9rem" }}>Time of day</th>
              <th style={{ padding: "0.6rem 0.9rem" }}>Before</th>
              <th style={{ padding: "0.6rem 0.9rem" }}>After</th>
              <th style={{ padding: "0.6rem 0.9rem" }}>Change</th>
              <th style={{ padding: "0.6rem 0.9rem" }}>Impact</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const showDelta =
                row.delta >= 1
                  ? `+${Math.round(row.delta)} min`
                  : row.delta <= -1
                  ? `${Math.round(row.delta)} min`
                  : "about the same";

              const level = impactLevel(row.delta);

              return (
                <tr
                  key={row.key}
                  style={{
                    background: idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                  }}
                >
                  <td style={{ padding: "0.6rem 0.9rem" }}>{row.label}</td>
                  <td style={{ padding: "0.6rem 0.9rem" }}>
                    {formatMinutes(row.before)}
                  </td>
                  <td style={{ padding: "0.6rem 0.9rem" }}>
                    {formatMinutes(row.after)}
                  </td>
                  <td style={{ padding: "0.6rem 0.9rem" }}>{showDelta}</td>
                  <td style={{ padding: "0.6rem 0.9rem" }}>
                    <span style={impactStyle(level)}>
                      {impactLabel[level]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p
        style={{
          marginTop: "0.75rem",
          color: "#6b7280",
          fontSize: "0.9rem",
        }}
      >
        The impact badges summarize how painful typical trips feel at each time
        of day — from minor slowdowns to severe delays.
      </p>
    </div>
  );
};

export default TimeOfDayImpact;
