import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HeroArt } from "./HeroArt";
import { apiFetch } from "../lib/api";

export function Hero() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      await apiFetch("/monitors/", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      setUrl("");
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add monitor");
    } finally {
      setLoading(false);
    }
  };

  return (
    // Changed min-h-[500px] to min-h-[380px]
    <section className="relative flex min-h-95 w-full items-center overflow-hidden bg-page">
      <HeroArt />
      
      {/* Changed py-12 to py-8 to reduce vertical spacing */}
      <div className="mx-auto flex w-full max-w-300 px-8 py-8 flex-col items-start gap-4 relative z-10">
        <span className="rounded-full border border-edge bg-upbg px-2.5 py-1 text-xs font-semibold text-mint">
          Live, no sign-up
        </span>
        
        <h1 className="text-[54px] font-bold leading-[1.05] tracking-tight max-sm:text-[38px]">
          Paste a URL. <span className="font-serif font-normal italic text-mint">Get live uptime.</span>
        </h1>
        
        <p className="text-[17px] text-soft max-w-125">
          No sign-up. Status, latency and uptime update live, without a refresh.
        </p>
        
        <form className="mt-2 flex w-full max-w-150 flex-wrap gap-2.5" onSubmit={handleSubmit}>
          <input 
            aria-label="Website URL" 
            placeholder="https://your-site.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            className="min-w-55 flex-1 rounded-xl border border-edge bg-[#071410] px-4 py-3.5 text-base font-medium text-ink placeholder:text-muted focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-mint disabled:opacity-50" 
          />
          <button 
            type="submit"
            disabled={loading}
            className="min-h-12 rounded-xl bg-mint px-6 text-base font-semibold text-onmint hover:bg-mint/90 transition-colors focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
          >
            {loading ? "Adding..." : "Add monitor"}
          </button>
        </form>
        
        {error && <div className="text-sm text-downfg">{error}</div>}
        
        <div className="text-[13px] text-muted">Checks every 60 seconds. Protected by Cloudflare Turnstile.</div>
      </div>
    </section>
  );
}