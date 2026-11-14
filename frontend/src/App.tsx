import { useState, useMemo } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Footer } from "./components/Footer";
import { MonitorRow } from "./components/MonitorRow";
import { MonitorDetail } from "./components/MonitorDetail";
import { apiFetch } from "./lib/api";
import { useStatusSocket } from "./hooks/useStatusSocket";
import { useLiveStore } from "./store/useLiveStore";

type MonitorResponse = {
  slug: string;
  url: string;
  host: string;
  status: string;
  interval_seconds: number;
  status_since: string;
  created_at: string;
};

const queryClient = new QueryClient();

function PulseApp() {
  const [selectedSlug, setSelectedSlug] = useState("");
  
  const { data: monitors = [] } = useQuery<MonitorResponse[]>({
    queryKey: ["monitors"],
    queryFn: () => apiFetch("/monitors/"),
    refetchInterval: 30000,
  });

  const liveData = useLiveStore((s) => s.monitors);
  const slugs = useMemo(() => monitors.map((m) => m.slug), [monitors]);
  useStatusSocket(slugs);

  const mergedMonitors = useMemo(() => {
    return monitors.map((m) => {
      const live = liveData[m.slug] || {};
      return {
        ...m,
        // Add the type assertion here 👇
        status: (live.status || m.status || "unknown") as "up" | "down" | "stale", 
        latency: live.latency !== undefined ? live.latency : null,
        uptime24h: 100,
        recent: live.recent || [],
      };
    });
  }, [monitors, liveData]);

  const selectedMonitor = mergedMonitors.find((m) => m.slug === selectedSlug) || mergedMonitors[0];

  return (
    <div className="flex min-h-screen flex-col bg-page font-sans text-ink">
      <Header />
      <main className="mx-auto flex w-full max-w-300 flex-1 flex-col gap-7 px-8 pb-12 pt-7">
        <Hero />
        
        <section className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-[320px] flex-[1_1_380px] flex-col gap-3">
            <h2 className="text-lg font-semibold">Your monitors</h2>
            {mergedMonitors.map((m) => (
              <MonitorRow
                key={m.slug}
                m={m}
                selected={m.slug === selectedMonitor?.slug}
                onClick={() => setSelectedSlug(m.slug)}
              />
            ))}
            <div className="text-[13px] text-muted">{mergedMonitors.length} of 5 monitors used.</div>
          </div>

          <div className="flex-[2_1_520px]">
            <MonitorDetail m={selectedMonitor} />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Live demo: popular services</h2>
          <div className="flex flex-wrap gap-3">
             {/* Live demo placeholder */}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PulseApp />
    </QueryClientProvider>
  );
}