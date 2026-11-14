import { StatusPill } from "./StatusPill";
import { Sparkline } from "./Sparkline";

export type MonitorData = {
  slug: string;
  host: string;
  status: "up" | "down" | "stale";
  latency: number | null;
  uptime24h: number | null;
  recent: number[];
};

export function MonitorRow({
  m,
  selected,
  onClick,
}: {
  m: MonitorData;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-wrap items-center gap-3 rounded-xl bg-card px-3.5 py-3 text-left transition-colors ${
        selected ? "border-2 border-mint" : "border border-line hover:border-edge"
      }`}
    >
      <StatusPill status={m.status} />
      
      <div className="min-w-30 flex-1">
        <div className="font-semibold">{m.host}</div>
        <div className="text-[13px] text-muted">
          {m.status === "down" ? (
            <span className="text-downfg">Timeout · down for 4 min</span>
          ) : (
            <>
              {m.latency ? `${m.latency} ms` : "—"} · {m.uptime24h ? `${m.uptime24h}%` : "—"} (24h)
            </>
          )}
        </div>
      </div>
      
      <Sparkline values={m.recent} down={m.status === "down"} />
    </button>
  );
}