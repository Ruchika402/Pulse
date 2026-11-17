export function RecentAlerts() {
  // Mock data for the UI
  const alerts = [
    { id: 1, type: "critical", text: "api.example.com is DOWN", desc: "HTTP 503 Service Unavailable", time: "2m ago" },
    { id: 2, type: "resolved", text: "github.com is back online", desc: "Response time: 167ms", time: "5m ago" },
  ];

  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Recent Alerts</h2>
        <button className="text-sm font-medium text-mint hover:text-mint/80">View All →</button>
      </div>

      <div className="flex flex-col gap-4">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${a.type === 'critical' ? 'bg-downfg text-onmint' : 'bg-cell text-onmint'}`}>
              {a.type === 'critical' ? '!' : '✓'}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{a.text}</span>
                <span className="text-xs text-muted">{a.time}</span>
              </div>
              <div className="text-xs text-muted">{a.desc}</div>
            </div>
            <div className={`rounded px-2 py-0.5 text-xs font-semibold ${a.type === 'critical' ? 'bg-downbg text-downfg' : 'bg-upbg text-mint'}`}>
              {a.type === 'critical' ? 'Critical' : 'Resolved'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}