const style = {
  up: "bg-upbg text-mint",
  down: "bg-downbg text-downfg",
  stale: "bg-line text-muted",
  unknown: "bg-line text-muted",
};

const label = {
  up: "Up",
  down: "Down",
  stale: "Stale",
  unknown: "Pending",
};

export function StatusPill({ status }: { status: keyof typeof style }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${style[status] || style.unknown}`}>
      {label[status] || label.unknown}
    </span>
  );
}