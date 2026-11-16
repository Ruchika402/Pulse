import { MonitorRow } from "./MonitorRow";
import type { MonitorData } from "./MonitorRow";

export function MonitorList({ 
  monitors, 
  selectedSlug, 
  onSelect 
}: { 
  monitors: MonitorData[], 
  selectedSlug: string, 
  onSelect: (slug: string) => void 
}) {
  return (
    <div className="flex min-w-[320px] flex-[1_1_380px] flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Your monitors</h2>
      {monitors.map((m) => (
        <MonitorRow
          key={m.slug}
          m={m}
          selected={m.slug === selectedSlug}
          onClick={() => onSelect(m.slug)}
        />
      ))}
      <div className="text-[13px] text-muted">{monitors.length} of 5 monitors used.</div>
    </div>
  );
}