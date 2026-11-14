import { create } from "zustand";

export type CheckMessage = {
  type: "check";
  slug: string;
  seq: number;
  time: string;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  error_kind: string | null;
};

export type StatusChangeMessage = {
  type: "status_change";
  slug: string;
  seq: number;
  from: string;
  to: string;
  since: string;
};

type LiveData = {
  status?: string;
  latency?: number;
  lastSeq: number;
  recent: number[];
};

interface LiveState {
  monitors: Record<string, LiveData>;
  updateCheck: (slug: string, data: CheckMessage) => void;
  updateStatus: (slug: string, data: StatusChangeMessage) => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  monitors: {},
  
  updateCheck: (slug, data) => set((state) => {
    const current = state.monitors[slug] || { lastSeq: 0, recent: [] };
    if (data.seq && data.seq <= current.lastSeq) return state;

    const newRecent = [...current.recent, data.latency_ms]
      .filter((v): v is number => v !== null)
      .slice(-20);

    return {
      monitors: {
        ...state.monitors,
        [slug]: {
          ...current,
          lastSeq: data.seq,
          latency: data.latency_ms ?? undefined,
          recent: newRecent,
        }
      }
    };
  }),

  updateStatus: (slug, data) => set((state) => {
    const current = state.monitors[slug] || { lastSeq: 0, recent: [] };
    if (data.seq && data.seq <= current.lastSeq) return state;

    return {
      monitors: {
        ...state.monitors,
        [slug]: {
          ...current,
          lastSeq: data.seq,
          status: data.to,
        }
      }
    };
  })
}));