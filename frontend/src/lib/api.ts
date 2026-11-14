export function getVisitorId(): string {
  let vid = localStorage.getItem("pulse_visitor_id");
  if (!vid) {
    vid = crypto.randomUUID();
    localStorage.setItem("pulse_visitor_id", vid);
  }
  return vid;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("X-Visitor-Id", getVisitorId());
  
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`/api/v1${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || error.detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}