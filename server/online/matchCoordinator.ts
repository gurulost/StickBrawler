import { randomUUID } from "node:crypto";
import type { OnlineMatchDescriptor, OnlineMatchMessage, RuntimeKeyboardState } from "@shared/match/types";
import { MatchRuntime } from "../matchRuntime";

type PlayerConnection = {
  profileId: string;
  send: (msg: OnlineMatchMessage<string>) => void;
};

type MatchState<TControl extends string> = {
  descriptor: OnlineMatchDescriptor;
  runtime: MatchRuntime<TControl>;
  connections: {
    host?: PlayerConnection;
    guest?: PlayerConnection;
  };
  frame: number;
};

export class MatchCoordinator<TControl extends string> {
  private matches = new Map<string, MatchState<TControl>>();

  createMatch(hostProfileId: string, seed: number): OnlineMatchDescriptor {
    const matchId = randomUUID();
    const descriptor: OnlineMatchDescriptor = {
      id: matchId,
      createdAt: new Date().toISOString(),
      hostProfileId,
      seed,
      mode: "online",
      maxPlayers: 2,
    };
    const runtime = new MatchRuntime<TControl>({ seed });
    this.matches.set(matchId, {
      descriptor,
      runtime,
      connections: {},
      frame: 0,
    });
    return descriptor;
  }

  joinMatch(matchId: string, conn: PlayerConnection): OnlineMatchDescriptor | null {
    const state = this.matches.get(matchId);
    if (!state) return null;
    if (!state.connections.host) {
      state.connections.host = conn;
      return state.descriptor;
    }
    if (!state.connections.guest) {
      state.connections.guest = conn;
      state.descriptor.guestProfileId = conn.profileId;
      return state.descriptor;
    }
    return null;
  }

  submitInputs(matchId: string, profileId: string, frame: number, inputs: RuntimeKeyboardState<TControl>) {
    const state = this.matches.get(matchId);
    if (!state) return;

    state.runtime.applyInputs(profileId, inputs, frame);
    state.frame = Math.max(state.frame, frame);
  }

  broadcast(matchId: string) {
    const state = this.matches.get(matchId);
    if (!state) return;
    const snapshot = state.runtime.toOnlineSnapshot(state.frame);
    const message: OnlineMatchMessage<TControl> = { type: "state", snapshot };
    for (const conn of Object.values(state.connections)) {
      conn?.send(message);
    }
  }

  leaveMatch(matchId: string, profileId: string, reason?: string) {
    const state = this.matches.get(matchId);
    if (!state) return;
    const payload: OnlineMatchMessage<TControl> = { type: "leave", reason };
    for (const conn of Object.values(state.connections)) {
      if (conn && conn.profileId !== profileId) {
        conn.send(payload);
      }
    }
    this.matches.delete(matchId);
  }
}
