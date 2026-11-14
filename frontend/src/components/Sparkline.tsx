export function Sparkline({ values, down = false }: { values: number[]; down?: boolean }) {
  if (!values || values.length < 2) return null;

  const w = 96;
  const h = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 2 - ((v - min) / (max - min || 1)) * (h - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="shrink-0">
      <polyline points={pts} fill="none" stroke={down ? "#FF8A8A" : "#5EE6A8"} strokeWidth="2" />
    </svg>
  );
}