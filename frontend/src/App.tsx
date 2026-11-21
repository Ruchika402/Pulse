import { useState, useMemo } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Footer } from "./components/Footer";
import { MonitorTable } from "./components/MonitorTable"; // <-- New import
import { RecentAlerts } from "./components/RecentAlerts"; // <-- New import
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
  last_check_time: string | null;
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
      
      let finalStatus = (live.status || m.status || "unknown") as "up" | "down" | "stale" | "unknown";
      const lastCheck = m.last_check_time ? new Date(m.last_check_time).getTime() : null;
      
      // If we have a last check time, and it's older than 3 intervals, it's stale
      if (lastCheck && m.interval_seconds) {
        const staleThreshold = m.interval_seconds * 1000 * 3;
        // eslint-disable-next-line react-hooks/purity
        if (Date.now() - lastCheck > staleThreshold) {
          finalStatus = "stale";
        }
      }

      return {
        ...m,
        status: finalStatus,
        latency: live.latency !== undefined ? live.latency : null,
        uptime24h: null,
        recent: live.recent || [],
      };
    });
  }, [monitors, liveData]);

  const selectedMonitor = mergedMonitors.find((m) => m.slug === selectedSlug) || mergedMonitors[0];

  return (
    <div className="flex min-h-screen flex-col bg-page font-sans text-ink">
      <Header />
      
      <Hero />
      
      <main className="relative z-10 mx-auto flex w-full max-w-300 flex-1 flex-col gap-7 bg-page px-8 pb-12 pt-7">
        
        <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[minmax(380px,1fr)_minmax(500px,1.5fr)]">
          
          {/* Left Column */}
          <div className="flex flex-col">
            <MonitorTable 
              monitors={mergedMonitors} 
              selectedSlug={selectedMonitor?.slug || ""} 
              onSelect={setSelectedSlug} 
            />
          </div>
          
          {/* Right Column */}
          <div className="flex flex-col">
            <MonitorDetail m={selectedMonitor} />
          </div>
          
        </section>

        
        <section className="w-full">
          <RecentAlerts />
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