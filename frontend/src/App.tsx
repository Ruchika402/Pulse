import { useState, useMemo } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Footer } from "./components/Footer";
import { MonitorList } from "./components/MonitorList";
import { MonitorDetail } from "./components/MonitorDetail";
import { FeaturedRow } from "./components/FeaturedRow";
import { apiFetch } from "./lib/api";
import { useStatusSocket } from "./hooks/useStatusSocket";
import { useLiveStore } from "./store/useLiveStore";
import type { MonitorData } from "./components/MonitorRow";

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

  const mergedMonitors: MonitorData[] = useMemo(() => {
    return monitors.map((m) => {
      const live = liveData[m.slug] || {};
      return {
        ...m,
        status: (live.status || m.status || "unknown") as "up" | "down" | "stale",
        latency: live.latency !== undefined ? live.latency : null,
        uptime24h: 100,
        recent: live.recent || [],
      };
    });
  }, [monitors, liveData]);

  const selectedMonitor = mergedMonitors.find((m) => m.slug === selectedSlug) || mergedMonitors[0];

  return (
    // 1. Reverted to simple flex column. The background is now handled by the page color.
    <div className="flex min-h-screen flex-col bg-page font-sans text-ink">
      <Header />
      
      {/* 2. Hero renders its own background internally */}
      <Hero />
      
      {/* 3. The main content has a solid background so it covers any stray SVG below */}
      <main className="relative z-10 mx-auto flex w-full max-w-300 flex-1 flex-col gap-7 bg-page px-8 pb-12 pt-7">
        <section className="flex flex-wrap items-start gap-6">
          <MonitorList 
            monitors={mergedMonitors} 
            selectedSlug={selectedMonitor?.slug || ""} 
            onSelect={setSelectedSlug} 
          />
          <div className="flex-[2_1_520px]">
            <MonitorDetail m={selectedMonitor} />
          </div>
        </section>

        <FeaturedRow />
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