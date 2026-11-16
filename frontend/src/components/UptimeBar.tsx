import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

type HistoryResponse = {
  buckets: { date: string; uptime: number | null }[];
};

const colour = (u: number | null) => {
  if (u === null) return "#17382E"; // No data
  if (u < 95) return "#FF6B6B";     // Red
  if (u < 99) return "#E3A63A";     // Amber
  if (u < 99.9) return "#8ADFB9";   // Light green
  return "#3FBF8C";                 // Green
};

export function UptimeBar({ slug, range = "90d" }: { slug: string; range?: string }) {
  const { data } = useQuery<HistoryResponse>({
    queryKey: ["history", slug, range],
    queryFn: () => apiFetch(`/monitors/${slug}/history/?range=${range}`),
    enabled: !!slug,
  });

  if (!data || data.buckets.length === 0) {
    return (
      <div className="flex h-7.5 gap-0.5 overflow-hidden rounded bg-field">
        {Array.from({ length: 90 }).map((_, i) => (
          <div key={i} className="flex-1 bg-line" />
        ))}
      </div>
    );
  }

  return (
    <div 
      role="img" 
      aria-label={`Uptime for the last ${data.buckets.length} buckets`}
      className="flex h-7.5 gap-0.5 overflow-hidden rounded bg-field"
    >
      {data.buckets.map((b) => (
        <div
          key={b.date}
          title={`${b.date}: ${b.uptime !== null ? b.uptime.toFixed(2) + "%" : "No data"}`}
          className="flex-1 rounded-[1px]"
          style={{ background: colour(b.uptime) }}
        />
      ))}
    </div>
  );
}