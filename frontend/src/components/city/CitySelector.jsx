import { useEffect, useMemo, useState } from "react";
import { POPULAR_CITIES } from "../../constants/cities";

function CitySelector({ currentCity, onSelect }) {
  const [query, setQuery] = useState("");
  const [auto, setAuto] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔍 Local matches from POPULAR_CITIES
  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return POPULAR_CITIES.filter((c) => c.label.toLowerCase().includes(q));
  }, [query]);

  // 🌐 Real autocomplete (Nominatim)
  useEffect(() => {
    if (!query.trim()) {
      setAuto([]);
      return;
    }

    const controller = new AbortController();

    async function searchCities() {
      setLoading(true);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&limit=5&city=${encodeURIComponent(
          query
        )}`;

        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();

        const cleaned = data
          .filter((d) => d.display_name)
          .map((d) => ({
            label: d.display_name,
            query: d.display_name,
          }));

        setAuto(cleaned);
      } catch (err) {
        // ignore abort or network errors for now
      } finally {
        setLoading(false);
      }
    }

    const t = setTimeout(searchCities, 250);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  const results =
    matches.length > 0 || auto.length > 0 ? [...matches, ...auto] : [];

  // Handle pressing Enter in the search input
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (results[0]) {
      onSelect(results[0]);
      setQuery(results[0].label);
    }
  };

  return (
    <section
      style={{
        background: "white",
        borderRadius: "1.5rem",
        padding: "1.5rem 1.75rem",
        boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "0.6rem",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "999px",
            background: "radial-gradient(circle at 30% 20%, #f1e1c2, #fcbc98)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "1rem",
          }}
        >
          📍
        </div>
        <div>
          <div
            style={{
              fontWeight: 600,
              fontSize: "1.05rem",
            }}
          >
            Select a US City
          </div>
          <div
            style={{
              fontSize: "0.9rem",
              color: "#6b7280",
              marginTop: 2,
            }}
          >
            Search any city or choose from popular options.
          </div>
        </div>
      </div>

      {/* Search bar */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          marginTop: "1.25rem",
          display: "flex",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: 1,
          }}
        >
          <span
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "1rem",
              color: "#9ca3af",
            }}
          ></span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="e.g., Houston, TX"
            style={{
              width: "100%",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              padding: "0.65rem 1rem 0.65rem 2.4rem",
              outline: "none",
              fontSize: "0.95rem",
              background: "#f9fafb",
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            borderRadius: "999px",
            border: "none",
            padding: "0.65rem 1.4rem",
            background: "#4f46e5",
            color: "white",
            fontWeight: 600,
            fontSize: "0.95rem",
            cursor: "pointer",
            boxShadow: "0 10px 25px rgba(79, 70, 229, 0.35)",
          }}
        >
          Search
        </button>
      </form>

      {/* Search results */}
      {query.trim() && (
        <div style={{ marginBottom: "0.9rem", marginTop: "0.9rem" }}>
          <div
            style={{
              fontSize: "0.82rem",
              color: "#6b7280",
              marginBottom: "0.25rem",
            }}
          >
            Search Results:
          </div>

          {loading && (
            <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
              Searching…
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
              No matches found. Try a full city name like:
              <br />
              <em>"Denver, Colorado"</em> or <em>"New York City"</em>.
            </div>
          )}

          {!loading &&
            results.map((c) => (
              <button
                key={c.label}
                onClick={() => {
                  onSelect(c);
                  setQuery(c.label);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.75rem",
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  cursor: "pointer",
                  marginBottom: "0.25rem",
                  fontSize: "0.9rem",
                  color: "#111827",
                }}
              >
                <span style={{ marginRight: "0.4rem" }}>📍</span>
                {c.label}
              </button>
            ))}
        </div>
      )}

      {/* Popular cities */}
      {!query.trim() && (
        <>
          <div
            style={{
              fontSize: "0.85rem",
              color: "#6b7280",
              marginBottom: 4,
              marginTop: "0.9rem",
            }}
          >
            Popular Cities:
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginBottom: currentCity ? "0.9rem" : 0,
            }}
          >
            {POPULAR_CITIES.map((c) => (
              <button
                key={c.label}
                onClick={() => {
                  onSelect(c);
                  setQuery(c.label);
                }}
                style={{
                  borderRadius: "999px",
                  padding: "0.4rem 0.9rem",
                  border:
                    currentCity?.label === c.label
                      ? "1px solid #4f46e5"
                      : "1px solid #e5e7eb",
                  background:
                    currentCity?.label === c.label ? "#eef2ff" : "#ffffff",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  color: "#111827",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Current banner */}
      {currentCity && (
        <div
          style={{
            marginTop: "0.25rem",
            padding: "0.75rem 1rem",
            borderRadius: "0.9rem",
            background:
              "linear-gradient(135deg, rgba(129,140,248,0.12), rgba(196,181,253,0.12))",
            border: "1px solid rgba(129,140,248,0.35)",
            fontSize: "0.9rem",
          }}
        >
          <span style={{ color: "#4f46e5", marginRight: 6 }}>●</span>
          <strong>Currently analyzing:</strong> {currentCity.label}
        </div>
      )}
    </section>
  );
}

export default CitySelector;
