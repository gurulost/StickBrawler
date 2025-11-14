import { WebSocketServer, WebSocket } from "ws";
import type { OnlineMatchMessage, RuntimeKeyboardState } from "@shared/match/types";
import { MatchCoordinator } from "./matchCoordinator";

type SocketMeta = {
  profileId: string;
  matchId?: string;
};

export class OnlineSocketServer<TControl extends string> {
  private wss: WebSocketServer | null = null;
  private coordinator = new MatchCoordinator<TControl>();
  private sockets = new Map<WebSocket, SocketMeta>();

  constructor(private port: number) {}

  start() {
    this.wss = new WebSocketServer({ port: this.port });
    this.wss.on("connection", (socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: WebSocket) {
    socket.on("message", (data) => {
      const meta = this.sockets.get(socket);
      const message = JSON.parse(data.toString()) as OnlineMatchMessage<TControl>;
      this.handleMessage(socket, meta, message);
    });
    socket.on("close", () => {
      const meta = this.sockets.get(socket);
      if (meta?.matchId) {
        this.coordinator.leaveMatch(meta.matchId, meta.profileId, "disconnect");
      }
      this.sockets.delete(socket);
    });
  }

  private handleMessage(socket: WebSocket, meta: SocketMeta | undefined, msg: OnlineMatchMessage<TControl>) {
    switch (msg.type) {
      case "join": {
        const descriptor = this.coordinator.joinMatch(msg.matchId, {
          profileId: msg.profileId,
          send: (payload) => socket.send(JSON.stringify(payload)),
        });
        if (descriptor) {
          this.sockets.set(socket, { profileId: msg.profileId, matchId: descriptor.id });
        } else {
          socket.send(JSON.stringify({ type: "leave", reason: "match_full" }));
        }
        break;
      }
      case "inputs": {
        if (!meta?.matchId) return;
        this.coordinator.submitInputs(meta.matchId, meta.profileId, msg.frame, msg.inputs as RuntimeKeyboardState<TControl>);
        this.coordinator.broadcast(meta.matchId);
        break;
      }
    }
  }
}
