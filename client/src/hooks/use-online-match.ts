import { useEffect, useRef, useState } from "react";
import type { OnlineMatchMessage, RuntimeKeyboardState } from "@shared/match/types";

type UseOnlineMatchOptions<TControl extends string> = {
  matchId?: string;
  profileId?: string;
  controls: TControl[];
  onState: (snapshot: any) => void;
};

export function useOnlineMatch<TControl extends string>({
  matchId,
  profileId,
  controls,
  onState,
}: UseOnlineMatchOptions<TControl>) {
  const wsRef = useRef<WebSocket | null>(null);
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    if (!matchId || !profileId) return;
    const ws = new WebSocket(import.meta.env.VITE_ONLINE_MATCH_URL);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "join", matchId, profileId }));
    });
    ws.addEventListener("message", (event) => {
      const msg: OnlineMatchMessage<TControl> = JSON.parse(event.data);
      if (msg.type === "state") {
        onState(msg.snapshot);
      }
      if (msg.type === "leave") {
        // handle disconnect
      }
    });
    return () => {
      ws.close();
    };
  }, [matchId, profileId, onState]);

  const sendInputs = (frame: number, inputs: RuntimeKeyboardState<TControl>) => {
    wsRef.current?.send(JSON.stringify({ type: "inputs", frame, inputs }));
  };

  return { latency, sendInputs };
}
