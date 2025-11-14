import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import type { OnlineMatchMessage, RuntimeKeyboardState } from "@shared/match/types";
import { MatchCoordinator } from "./matchCoordinator";

type SocketMeta = {
  profileId: string;
  connectionId: string;
  matchId?: string;
};

export class OnlineSocketServer<TControl extends string> {
  private wss: WebSocketServer | null = null;
  private coordinator = new MatchCoordinator<TControl>();
  private sockets = new Map<WebSocket, SocketMeta>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  private readonly HEARTBEAT_TIMEOUT_MS = 35000; // 35 seconds

  constructor(private port: number) {}

  start() {
    this.wss = new WebSocketServer({ port: this.port });
    this.wss.on("connection", (socket) => this.handleConnection(socket));
    this.startHeartbeat();
    console.log(`[OnlineSocketServer] WebSocket server started on port ${this.port}`);
  }

  private handleConnection(socket: WebSocket) {
    const connectionId = randomUUID();
    console.log(`[OnlineSocketServer] New connection ${connectionId}`);
    
    // Track last heartbeat
    (socket as any).isAlive = true;
    (socket as any).lastHeartbeat = Date.now();
    
    socket.on("pong", () => {
      (socket as any).isAlive = true;
      (socket as any).lastHeartbeat = Date.now();
    });
    
    socket.on("message", (data) => {
      const meta = this.sockets.get(socket);
      const message = JSON.parse(data.toString()) as OnlineMatchMessage<TControl>;
      this.handleMessage(socket, meta, message);
    });
    
    socket.on("close", () => {
      const meta = this.sockets.get(socket);
      if (meta?.matchId) {
        console.log(`[OnlineSocketServer] Connection ${meta.connectionId} closed, leaving match ${meta.matchId}`);
        this.coordinator.leaveMatch(meta.matchId, meta.profileId, meta.connectionId, "disconnect");
      }
      this.sockets.delete(socket);
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      
      this.wss.clients.forEach((socket) => {
        const ws = socket as any;
        const meta = this.sockets.get(socket as WebSocket);
        
        // Check if connection is stale
        const timeSinceLastHeartbeat = Date.now() - (ws.lastHeartbeat || 0);
        if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT_MS) {
          console.log(`[OnlineSocketServer] Connection ${meta?.connectionId} timed out, terminating`);
          if (meta?.matchId) {
            this.coordinator.leaveMatch(meta.matchId, meta.profileId, meta.connectionId, "timeout");
          }
          socket.terminate();
          return;
        }
        
        // Send ping
        socket.ping();
      });
    }, this.HEARTBEAT_INTERVAL_MS);
  }

  private handleMessage(socket: WebSocket, meta: SocketMeta | undefined, msg: OnlineMatchMessage<TControl>) {
    switch (msg.type) {
      case "join": {
        const connectionId = randomUUID();
        const descriptor = this.coordinator.joinMatch(msg.matchId, {
          profileId: msg.profileId,
          connectionId,
          send: (payload) => socket.send(JSON.stringify(payload)),
          close: () => socket.close(),
        });
        if (descriptor) {
          this.sockets.set(socket, { profileId: msg.profileId, connectionId, matchId: descriptor.id });
          console.log(`[OnlineSocketServer] Player ${msg.profileId} joined match ${descriptor.id} with connection ${connectionId}`);
        } else {
          socket.send(JSON.stringify({ type: "leave", reason: "match_full" }));
          console.log(`[OnlineSocketServer] Player ${msg.profileId} rejected from match ${msg.matchId} (match full or hijack attempt)`);
        }
        break;
      }
      case "inputs": {
        if (!meta?.matchId || !meta?.connectionId) return;
        this.coordinator.submitInputs(meta.matchId, meta.profileId, meta.connectionId, msg.frame, msg.inputs as RuntimeKeyboardState<TControl>);
        this.coordinator.broadcast(meta.matchId);
        break;
      }
    }
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    console.log(`[OnlineSocketServer] Server stopped`);
  }
}
