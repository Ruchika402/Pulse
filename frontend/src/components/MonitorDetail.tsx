import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LatencyChart } from "./LatencyChart";
import { StatusPill } from "./StatusPill";
import { UptimeBar } from "./UptimeBar";
import type { MonitorData } from "./MonitorRow";
import { apiFetch } from "../lib/api";

type UptimeResponse = {
  uptime_percent: number | null;
  coverage_percent: number;
  avg_latency_ms: number | null;
};

export function MonitorDetail({ m }: { m: MonitorData | undefined }) {
  const [range, setRange] = useState("24h");
  
  // Real Uptime Stats
  const { data: stats24h } = useQuery<UptimeResponse>({
    queryKey: ["uptime", m?.slug, "24h"],
    queryFn: () => apiFetch(`/monitors/${m?.slug}/uptime/?range=24h`),
    enabled: !!m,
  });

  const { data: stats30d } = useQuery<UptimeResponse>({
    queryKey: ["uptime", m?.slug, "30d"],
    queryFn: () => apiFetch(`/monitors/${m?.slug}/uptime/?range=30d`),
    enabled: !!m,
  });

  const { data: statsCurrent } = useQuery<UptimeResponse>({
    queryKey: ["uptime", m?.slug, range],
    queryFn: () => apiFetch(`/monitors/${m?.slug}/uptime/?range=${range}`),
    enabled: !!m,
  });

  // Real Chart Data (from the new /checks/ endpoint)
  const { data: checksData } = useQuery<{ checks: { time: string; latency_ms: number; ok: boolean }[] }>({
    queryKey: ["checks", m?.slug, range],
    queryFn: () => apiFetch(`/monitors/${m?.slug}/checks/?range=${range}`),
    enabled: !!m,
  });

  // Real 90-day Bar Data
  const { data: history90d } = useQuery<{ buckets: { date: string; uptime: number }[] }>({
    queryKey: ["history-90d", m?.slug],
    queryFn: () => apiFetch(`/monitors/${m?.slug}/history/?range=90d`),
    enabled: !!m,
  });

  // Merge live data with historical data for the chart
  const points: [number, number][] = useMemo(() => {
    if (checksData?.checks && checksData.checks.length > 0) {
      return checksData.checks
        .filter((c) => c.latency_ms !== null)
        .map((c, i) => [i, c.latency_ms as number]);
    }
    // Fallback to live WebSocket data if history is empty
    if (!m?.recent || m.recent.length === 0) return [];
    return m.recent.map((latency, i) => [i, latency]);
  }, [checksData, m?.recent]);

  if (!m) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  const daysBelow100 = history90d?.buckets.filter(b => b.uptime !== null && b.uptime < 100).length || 0;

  // If the monitor hasn't run its first check yet, show a clean pending state
  if (m.status === "unknown") {
    return (
      <div className="flex flex-col gap-4.5 rounded-card border border-line bg-card p-5.5">
        <div className="flex items-center gap-3">
          <StatusPill status="unknown" />
          <h2 className="text-[20px] font-semibold">{m.host}</h2>
        </div>
        <div className="flex h-48 items-center justify-center rounded-[10px] bg-field text-sm text-muted italic">
          Waiting for the first check to complete...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4.5 rounded-card border border-line bg-card p-5.5">
      {/* Title Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3">
          <StatusPill status={m.status} />
          <h2 className="text-[20px] font-semibold">{m.host}</h2>
        </div>
        
        <div className="flex rounded-[10px] bg-field p-0.75">
          {["1h", "24h", "30d", "90d"].map((tab) => (
            <button
              key={tab}
              onClick={() => setRange(tab)}
              className={`min-h-8 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                tab === range ? "bg-mint font-semibold text-onmint" : "text-muted hover:text-ink"
              }`}
              aria-pressed={tab === range}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-7">
        <div>
          <div className="text-[13px] text-muted">Uptime 24h</div>
          <div className="text-[24px] font-bold tabular-nums">
            {stats24h?.uptime_percent != null ? `${stats24h.uptime_percent}%` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[13px] text-muted">Uptime 30d</div>
          <div className="text-[24px] font-bold tabular-nums">
            {stats30d?.uptime_percent != null ? `${stats30d.uptime_percent}%` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[13px] text-muted">Coverage</div>
          <div className="text-[24px] font-bold tabular-nums">
             {statsCurrent?.coverage_percent != null ? `${statsCurrent.coverage_percent}%` : "—"}
          </div>
        </div>
        <div>
          <div className="text-[13px] text-muted">Avg latency</div>
          <div className="text-[24px] font-bold tabular-nums">
             {statsCurrent?.avg_latency_ms != null ? `${statsCurrent.avg_latency_ms} ms` : "—"}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-[10px] bg-field">
        <LatencyChart points={points} failures={[]} />
      </div>

      {/* 90-Day Bar */}
      <div>
        <div className="mb-2 flex justify-between text-[13px] text-muted">
          <span>Last 90 days</span>
          <span>{daysBelow100} days below 100%</span>
        </div>
        <UptimeBar slug={m.slug} range="90d" />
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleCopy(`http://localhost:5173/m/${m.slug}`)}
          className="min-h-11 rounded-xl border border-edge bg-field px-4 text-sm font-semibold text-ink hover:border-mint transition-colors"
        >
          Copy share link
        </button>
        {/* We are hiding the badge button because the badge endpoint is not built yet */}
        {/* <button ...>Copy README badge</button> */}
      </div>
    </div>
  );
}