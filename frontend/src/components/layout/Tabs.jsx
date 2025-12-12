function Tabs({ active, onChange }) {
  const items = [
    { id: "visual", label: "Network Visualization" },
    { id: "comparison", label: "Before/After Comparison" },
    // { id: "resilience", label: "Resilience Analysis" },
    { id: "ml", label: "ML Insights" },
  ];

  return (
    <div
      style={{
        display: "flex",
        background: "#eef2ff",
        borderRadius: "999px",
        padding: 4,
        marginBottom: "1rem",
      }}
    >
      {items.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              borderRadius: "999px",
              border: "none",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              background: isActive ? "#ffffff" : "transparent",
              color: isActive ? "#111827" : "#6b7280",
              fontWeight: isActive ? 600 : 500,
              fontSize: "0.95rem",
              boxShadow: isActive ? "0 1px 3px rgba(15,23,42,0.1)" : "none",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
