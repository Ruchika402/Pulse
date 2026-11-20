import { useEffect, useRef } from "react";
import { getVisitorId } from "../lib/api";
import { useLiveStore } from "../store/useLiveStore";

export function useStatusSocket(slugs: string[]) {
  const wsRef = useRef<WebSocket | null>(null);
  const updateCheck = useLiveStore((s) => s.updateCheck);
  const updateStatus = useLiveStore((s) => s.updateStatus);
  const setSnapshot = useLiveStore((s) => s.setSnapshot);
  
  // Extract the string dependency to satisfy eslint
  const slugsKey = slugs.join(",");
  
  useEffect(() => {
    if (slugs.length === 0) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/v1/status/`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "subscribe",
        visitor_id: getVisitorId(),
        slugs: slugs,
      }));
    };

      ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "check") {
          updateCheck(msg.slug, msg);
        } else if (msg.type === "status_change") {
          updateStatus(msg.slug, msg);
        } else if (msg.type === "snapshot") {
          setSnapshot(msg.slug, msg); 
        }
      } catch (err) {
        console.warn("Invalid WebSocket message", err);
      }
    };

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugsKey, updateCheck, updateStatus, setSnapshot]);
}