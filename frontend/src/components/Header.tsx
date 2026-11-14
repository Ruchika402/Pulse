export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-chrome px-8 py-4">
      <div className="flex items-center gap-3">
        <svg width="40" height="30" viewBox="0 0 40 30" aria-hidden="true">
          <path d="M1 16h8l4-11 6 22 5-15 3 4h12" fill="none" stroke="#5EE6A8"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-2xl font-semibold">Pulse</span>
      </div>
      <nav className="flex gap-5.5 text-sm text-soft">
        <a href="#" className="hover:text-mint transition-colors">How it works</a>
        <a href="#" className="hover:text-mint transition-colors">Live demo</a>
        <a href="#" className="hover:text-mint transition-colors">About</a>
        <a href="https://github.com/Ruchika402/Pulse" target="_blank" rel="noreferrer" className="hover:text-mint transition-colors">GitHub</a>
      </nav>
    </header>
  );
}