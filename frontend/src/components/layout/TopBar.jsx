function TopBar() {
  return (
    <header
      style={{
        padding: "1.25rem 2.5rem 0.75rem",
        background: "#f3f4f6",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 18,
            background: "linear-gradient(135deg, #f1e1c2 0%, #fcbc98 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 22,
          }}
        >
          <span role="img" aria-label="network">
            🕸
          </span>
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "1.25rem",
              color: "#111827",
              marginBottom: 2,
            }}
          >
            Urban Network Resilience Simulator
          </div>
          <div
            style={{
              fontSize: "0.9rem",
              color: "#6b7280",
            }}
          >
            Analyze how real US city road networks respond to disruptions.
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
