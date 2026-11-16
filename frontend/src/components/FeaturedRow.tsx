import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { MonitorRow } from "./MonitorRow";
import type { MonitorData } from "./MonitorRow";

export function FeaturedRow() {
  const { data: featured = [] } = useQuery<MonitorData[]>({
    queryKey: ["featured"],
    queryFn: () => apiFetch("/monitors/featured/"),
    refetchInterval: 30000,
  });

  if (featured.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Live demo: popular services</h2>
      <div className="flex flex-wrap gap-3">
        {featured.map((m) => (
          <div key={m.slug} className="flex flex-[1_1_280px] items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-3">
             {/* We reuse MonitorRow, but remove the onClick since it's not yours to select */}
             <MonitorRow m={m} selected={false} onClick={() => {}} />
          </div>
        ))}
      </div>
    </section>
  );
}