export function Header() {
  return (
    <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-chrome/90 px-8 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-3 cursor-pointer">
        <svg width="40" height="30" viewBox="0 0 40 30" aria-hidden="true">
          <path d="M1 16h8l4-11 6 22 5-15 3 4h12" fill="none" stroke="#5EE6A8"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-2xl font-semibold text-ink">Pulse</span>
      </div>

      <nav className="flex items-center gap-6 text-sm font-medium text-soft">
        <a href="#monitors" className="hover:text-mint transition-colors">How it works</a>
        <a href="#live-demo" className="hover:text-mint transition-colors">Live demo</a>
        
        {/* HOVER MENU CONTAINER */}
        <div className="group relative">
          <button className="flex items-center gap-1 hover:text-mint transition-colors">
            About
            {/* Tiny down arrow */}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
          
          {/* THE DROPDOWN (Hidden by default, shows on group-hover) */}
          <div className="absolute right-0 top-full mt-2 hidden w-72 flex-col gap-2 rounded-xl border border-line bg-card p-4 shadow-xl group-hover:flex">
            <h3 className="font-semibold text-ink">About Pulse</h3>
            <p className="text-xs text-muted">
              Pulse is an open-source, zero-signup uptime monitor built for developers. 
              It uses Django, Celery, Redis, and TimescaleDB, with a React frontend.
            </p>
            <a 
              href="https://github.com/Ruchika402/Pulse" 
              target="_blank" 
              rel="noreferrer"
              className="mt-2 text-xs font-semibold text-mint hover:underline"
            >
              View Source on GitHub →
            </a>
          </div>
        </div>

        <a 
          href="https://github.com/Ruchika402/Pulse" 
          target="_blank" 
          rel="noreferrer" 
          className="hover:text-mint transition-colors"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}