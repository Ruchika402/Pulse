import { StatusPill } from "./StatusPill";
import { Sparkline } from "./Sparkline";
import type { MonitorData } from "./MonitorRow";

export function MonitorTable({ monitors, selectedSlug, onSelect }: {
  monitors: MonitorData[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Your Monitors</h2>
        <button className="text-sm font-medium text-mint hover:text-mint/80">View All →</button>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-sm text-ink">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              <th className="pb-3 pr-4 font-medium">Website</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Uptime</th>
              <th className="pb-3 pr-4 font-medium">Response Time</th>
              <th className="pb-3 font-medium">Last Checked</th>
            </tr>
          </thead>
          <tbody>
            {monitors.map((m) => (
              <tr 
                key={m.slug} 
                onClick={() => onSelect(m.slug)}
                className={`cursor-pointer border-b border-line/50 transition-colors hover:bg-field ${
                  m.slug === selectedSlug ? "bg-field/50" : ""
                }`}
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-line text-xs text-ink">
                      {m.host.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{m.host}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <StatusPill status={m.status as "up" | "down" | "stale"} />
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Sparkline values={m.recent} down={m.status === "down"} />
                    <span className="tabular-nums">{m.uptime24h}%</span>
                  </div>
                </td>
                <td className="py-3 pr-4 tabular-nums">
                  {m.latency ? `${m.latency} ms` : "—"}
                </td>
                <td className="py-3 text-muted">
                  {m.status === "down" ? "Just now" : "2m ago"} {/* Will be real timestamp later */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 text-xs text-muted">{monitors.length} of 5 monitors used.</div>
    </div>
  );
}