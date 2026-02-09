"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, TrendingUp, Clock, BarChart3, Activity } from "lucide-react";

interface Market {
  question: string;
  outcomePrices: string;
  volume: string;
  liquidity: string;
  outcomes: string;
}

interface PolyEvent {
  id: string;
  title: string;
  slug: string;
  volume: number;
  liquidity: number;
  startDate: string;
  markets: Market[];
}

type SortMode = "volume" | "newest" | "trending";

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function parseOutcomePrices(market: Market): { label: string; price: number }[] {
  try {
    const prices: number[] = JSON.parse(market.outcomePrices || "[]");
    const labels: string[] = JSON.parse(market.outcomes || '["Yes","No"]');
    return labels.map((label, i) => ({
      label,
      price: prices[i] ?? 0,
    }));
  } catch {
    return [];
  }
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: "#080808",
        border: "1px solid rgba(255,255,255,0.03)",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div className="skeleton" style={{ height: 20, width: "80%", marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 14, width: "60%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 28, width: "100%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 28, width: "100%", marginBottom: 16 }} />
      <div style={{ display: "flex", gap: 16 }}>
        <div className="skeleton" style={{ height: 14, width: 80 }} />
        <div className="skeleton" style={{ height: 14, width: 80 }} />
      </div>
    </div>
  );
}

function EventCard({ event }: { event: PolyEvent }) {
  const market = event.markets?.[0];
  const outcomes = market ? parseOutcomePrices(market) : [];
  const totalVolume = event.markets?.reduce((s, m) => s + Number(m.volume || 0), 0) ?? event.volume;

  return (
    <a
      href={`https://polymarket.com/event/${event.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        background: "#080808",
        border: "1px solid rgba(255,255,255,0.03)",
        borderRadius: 12,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        transition: "border-color 0.2s, transform 0.2s",
        textDecoration: "none",
        color: "inherit",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(0,208,132,0.3)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.03)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <h3
        style={{
          fontSize: 15,
          fontWeight: 600,
          lineHeight: 1.4,
          margin: 0,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {event.title}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {outcomes.slice(0, 4).map((o) => {
          const pct = Math.round(o.price * 100);
          const isYes = o.label.toLowerCase() === "yes";
          const isNo = o.label.toLowerCase() === "no";
          const color = isYes ? "#00d084" : isNo ? "#ff4757" : "#6c7ae0";
          return (
            <div key={o.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  fontSize: 12,
                  color: "#888",
                  width: 60,
                  flexShrink: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {o.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 24,
                  background: "#111",
                  borderRadius: 6,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: color,
                    opacity: 0.25,
                    borderRadius: 6,
                    transition: "width 0.5s ease",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color,
                  width: 42,
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 12,
          color: "#666",
          marginTop: "auto",
          paddingTop: 4,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <BarChart3 size={12} />
          Vol {formatVolume(totalVolume)}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Activity size={12} />
          Liq {formatVolume(event.liquidity || 0)}
        </span>
      </div>
    </a>
  );
}

export default function Home() {
  const [events, setEvents] = useState<PolyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sort, setSort] = useState<SortMode>("volume");

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(
        "https://gamma-api.polymarket.com/events?closed=false&order=volume24hr&ascending=false&limit=20"
      );
      const data: PolyEvent[] = await res.json();
      setEvents(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 30_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const sorted = [...events].sort((a, b) => {
    if (sort === "newest") return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    if (sort === "trending") {
      const aV = a.markets?.reduce((s, m) => s + Number(m.volume || 0), 0) ?? 0;
      const bV = b.markets?.reduce((s, m) => s + Number(m.volume || 0), 0) ?? 0;
      const aL = a.liquidity || 1;
      const bL = b.liquidity || 1;
      return bV / bL - aV / aL;
    }
    return (b.volume || 0) - (a.volume || 0);
  });

  const sortButtons: { key: SortMode; label: string; icon: React.ReactNode }[] = [
    { key: "volume", label: "Volume", icon: <BarChart3 size={13} /> },
    { key: "newest", label: "Newest", icon: <Clock size={13} /> },
    { key: "trending", label: "Trending", icon: <TrendingUp size={13} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", padding: "0 16px" }}>
      {/* Header */}
      <header
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Polymarket
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              background: "rgba(0,208,132,0.12)",
              color: "#00d084",
              padding: "3px 10px",
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              gap: 5,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00d084",
                animation: "pulse-dot 2s infinite",
              }}
            />
            Live
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#555" }}>
          {lastUpdated && (
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <button
            onClick={() => {
              setLoading(true);
              fetchEvents();
            }}
            style={{
              background: "none",
              border: "1px solid #222",
              borderRadius: 8,
              color: "#888",
              padding: "6px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Sort */}
      <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {sortButtons.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: sort === s.key ? "rgba(0,208,132,0.12)" : "#0a0a0a",
                color: sort === s.key ? "#00d084" : "#666",
              }}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340, 1fr))",
          gap: 12,
          paddingBottom: 40,
        }}
      >
        {loading
          ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
          : sorted.map((event) => <EventCard key={event.id} event={event} />)}
      </main>

      <style>{`
        @media (max-width: 768px) {
          main { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          main { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (min-width: 1025px) {
          main { grid-template-columns: repeat(3, 1fr) !important; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
