import { useEffect, useRef, useState, useCallback } from "react";
import type { OnlineMatchMessage, RuntimeKeyboardState } from "@shared/match/types";

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "failed";

type UseOnlineMatchOptions<TControl extends string> = {
  matchId?: string;
  profileId?: string;
  controls: TControl[];
  onState: (snapshot: any) => void;
  onDisconnect?: (reason?: string) => void;
};

const RECONNECT_CONFIG = {
  initialDelay: 1000,
  maxDelay: 30000,
  factor: 2,
  maxRetries: 10,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
};

export function useOnlineMatch<TControl extends string>({
  matchId,
  profileId,
  controls,
  onState,
  onDisconnect,
}: UseOnlineMatchOptions<TControl>) {
  const wsRef = useRef<WebSocket | null>(null);
  const [latency, setLatency] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const retryCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();
  const intentionalCloseRef = useRef(false);
  const lastPingTimeRef = useRef(0);
  const connectionIdRef = useRef<string | null>(null);

  const calculateBackoff = useCallback(() => {
    let delay = RECONNECT_CONFIG.initialDelay * Math.pow(RECONNECT_CONFIG.factor, retryCountRef.current);
    delay = Math.min(delay, RECONNECT_CONFIG.maxDelay);
    
    // Add jitter (±30%)
    const jitterRange = delay * 0.3;
    delay = delay - jitterRange + (Math.random() * jitterRange * 2);
    
    return Math.floor(delay);
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = undefined;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        lastPingTimeRef.current = Date.now();
        wsRef.current.send(JSON.stringify({ type: "ping" }));
        
        // Expect pong within timeout
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn("[useOnlineMatch] Heartbeat timeout, reconnecting");
          wsRef.current?.close();
        }, RECONNECT_CONFIG.heartbeatTimeout);
      }
    }, RECONNECT_CONFIG.heartbeatInterval);
  }, [clearHeartbeat]);

  const connect = useCallback(() => {
    if (!matchId || !profileId) return;

    try {
      setStatus(retryCountRef.current > 0 ? "reconnecting" : "connecting");
      const wsUrl = import.meta.env.VITE_ONLINE_MATCH_URL || "ws://localhost:3001";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        console.log("[useOnlineMatch] Connected");
        setStatus("connected");
        retryCountRef.current = 0;
        
        // Clear stale connectionId before joining
        connectionIdRef.current = null;
        
        ws.send(JSON.stringify({ type: "join", matchId, profileId }));
        startHeartbeat();
      });

      ws.addEventListener("message", (event) => {
        const msg: OnlineMatchMessage<TControl> = JSON.parse(event.data);
        
        if (msg.type === "joined") {
          // Store connectionId for future input submissions
          connectionIdRef.current = msg.connectionId;
          console.log("[useOnlineMatch] Joined with connectionId:", msg.connectionId);
          return;
        }
        
        if (msg.type === "pong") {
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
            heartbeatTimeoutRef.current = undefined;
          }
          const pingTime = Date.now() - lastPingTimeRef.current;
          setLatency(pingTime);
          return;
        }
        
        if (msg.type === "state") {
          onState(msg.snapshot);
        }
        
        if (msg.type === "leave") {
          console.log("[useOnlineMatch] Received leave message:", msg.reason);
          onDisconnect?.(msg.reason);
        }
      });

      ws.addEventListener("close", (event) => {
        console.log("[useOnlineMatch] Connection closed", event.code, event.reason);
        clearHeartbeat();
        setStatus("disconnected");
        
        // Clear connectionId on disconnect to prevent using stale ID
        connectionIdRef.current = null;
        
        // Don't reconnect if intentional close (code 1000) or max retries reached
        if (intentionalCloseRef.current || event.code === 1000) {
          return;
        }
        
        if (retryCountRef.current >= RECONNECT_CONFIG.maxRetries) {
          console.error("[useOnlineMatch] Max retries reached");
          setStatus("failed");
          onDisconnect?.("max_retries");
          return;
        }
        
        retryCountRef.current++;
        const delay = calculateBackoff();
        console.log(`[useOnlineMatch] Reconnecting in ${delay}ms (attempt ${retryCountRef.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      });

      ws.addEventListener("error", (error) => {
        console.error("[useOnlineMatch] WebSocket error", error);
      });

    } catch (error) {
      console.error("[useOnlineMatch] Connection failed", error);
      setStatus("disconnected");
    }
  }, [matchId, profileId, onState, onDisconnect, calculateBackoff, startHeartbeat, clearHeartbeat]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearHeartbeat();
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, [clearHeartbeat]);

  useEffect(() => {
    intentionalCloseRef.current = false;
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const sendInputs = useCallback((frame: number, inputs: RuntimeKeyboardState<TControl>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && connectionIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: "inputs", frame, inputs, connectionId: connectionIdRef.current }));
    } else {
      console.warn("[useOnlineMatch] Cannot send inputs, socket not open or no connectionId");
    }
  }, []);

  return { latency, status, sendInputs, disconnect };
}
