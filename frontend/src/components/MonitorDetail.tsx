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

  /*const { data: history } = useQuery<{ buckets: { date: string; uptime: number }[] }>({
    queryKey: ["history-chart", m?.slug, range],
    queryFn: () => apiFetch(`/monitors/${m?.slug}/history/?range=${range}`),
    enabled: !!m,
  });*/
  const { data: checksData } = useQuery<{ checks: { time: string; latency_ms: number; ok: boolean }[] }>({
    queryKey: ["checks", m?.slug, range],
    queryFn: () => apiFetch(`/monitors/${m?.slug}/checks/?range=${range}`),
    enabled: !!m,
  });

  const { data: history90d } = useQuery<{ buckets: { date: string; uptime: number }[] }>({
    queryKey: ["history-90d", m?.slug],
    queryFn: () => apiFetch(`/monitors/${m?.slug}/history/?range=90d`),
    enabled: !!m,
  });

  const recentData = m?.recent;

  const points: [number, number][] = useMemo(() => {
    if (checksData?.checks && checksData.checks.length > 0) {
      return checksData.checks
        .filter((c) => c.latency_ms !== null)
        .map((c, i) => [i, c.latency_ms as number]);
    }
    if (!recentData || recentData.length === 0) return [];
    return recentData.map((latency, i) => [i, latency]);
  }, [checksData, recentData]);

  if (!m) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied!");
  };

  // Calculate days below 100% for the caption
  const daysBelow100 = history90d?.buckets.filter(b => b.uptime !== null && b.uptime < 100).length || 0;

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
                tab === range ? "bg-mint font-semibold text-onmint" : "text-muted hover:text-ink"
              }`}
              aria-pressed={tab === range}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 4-Stat Row */}
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
          <div className="text-[13px] text-muted">p95 latency</div>
          <div className="text-[24px] font-bold tabular-nums">
             {statsCurrent?.avg_latency_ms != null ? `${statsCurrent.avg_latency_ms} ms` : "—"}
          </div>
        </div>
      </div>

      <div className="rounded-[10px] bg-field">
        <LatencyChart points={points} failures={[]} />
      </div>

      <div>
        <div className="mb-2 flex justify-between text-[13px] text-muted">
          <span>Last 90 days</span>
          <span>{daysBelow100} days below 100%</span>
        </div>
        <UptimeBar slug={m.slug} range="90d" />
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