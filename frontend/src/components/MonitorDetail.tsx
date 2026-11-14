import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LatencyChart } from "./LatencyChart";
import { StatusPill } from "./StatusPill";
import type { MonitorData } from "./MonitorRow";
import { apiFetch } from "../lib/api";

type UptimeResponse = {
  uptime_percent: number | null;
  coverage_percent: number;
  avg_latency_ms: number | null;
};

export function MonitorDetail({ m }: { m: MonitorData | undefined }) {
  const [range, setRange] = useState("24h");
  
  const { data: stats } = useQuery<UptimeResponse>({
    queryKey: ["uptime", m?.slug, range],
    queryFn: () => apiFetch(`/monitors/${m?.slug}/uptime/?range=${range}`),
    enabled: !!m,
  });

  const recentData = m?.recent;

  const points: [number, number][] = useMemo(() => {
    if (!recentData || recentData.length === 0) return [];
    return recentData.map((latency, i) => [i, latency]);
  }, [recentData]);

  if (!m) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  return (
    <div className="flex flex-col gap-4.5 rounded-card border border-line bg-card p-5.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <StatusPill status={m.status as "up" | "down" | "stale"} />
          <h2 className="text-[20px] font-semibold">{m.host}</h2>
        </div>
        
        <div className="flex rounded-[10px] bg-field p-0.75">
          {["1h", "24h", "30d", "90d"].map((tab) => (
            <button
              key={tab}
              onClick={() => setRange(tab)}
              className={`min-h-8 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                tab === range
                  ? "bg-mint font-semibold text-onmint"
                  : "text-muted hover:text-ink"
              }`}
              aria-pressed={tab === range}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-7">
        <div>
          <div className="text-[13px] text-muted">Uptime {range}</div>
          <div className="text-[24px] font-bold tabular-nums">
            {stats?.uptime_percent != null ? `${stats.uptime_percent}%` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[13px] text-muted">Coverage</div>
          <div className="text-[24px] font-bold tabular-nums">
             {stats?.coverage_percent != null ? `${stats.coverage_percent}%` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[13px] text-muted">Avg latency</div>
          <div className="text-[24px] font-bold tabular-nums">
             {stats?.avg_latency_ms != null ? `${stats.avg_latency_ms} ms` : "—"}
          </div>
        </div>
      </div>

      <div className="rounded-[10px] bg-field">
        <LatencyChart points={points} failures={[]} />
      </div>

      <div>
        <div className="mb-2 text-[13px] text-muted">Last 90 days</div>
        <div className="flex h-7.5 gap-0.5 overflow-hidden rounded bg-field">
          {Array.from({ length: 90 }).map((_, i) => (
            <div key={i} className="flex-1 bg-cell" />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleCopy(`http://localhost:5173/m/${m.slug}`)}
          className="min-h-11 rounded-xl border border-edge bg-field px-4 text-sm font-semibold text-ink hover:border-mint transition-colors"
        >
          Copy share link
        </button>
        <button
          onClick={() => handleCopy(`![status](http://localhost:8000/badge/${m.slug}.svg)`)}
          className="min-h-11 rounded-xl border border-edge bg-field px-4 text-sm font-semibold text-ink hover:border-mint transition-colors"
        >
          Copy README badge
        </button>
      </div>
    </div>
  );
}