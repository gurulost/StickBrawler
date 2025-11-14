import { randomUUID } from "node:crypto";
import type { OnlineMatchDescriptor, OnlineMatchMessage, RuntimeKeyboardState } from "@shared/match/types";
import { MatchRuntimeServerAdapter } from "./matchRuntimeAdapter";

type PlayerConnection = {
  profileId: string;
  send: (msg: OnlineMatchMessage<string>) => void;
};

type MatchState<TControl extends string> = {
  descriptor: OnlineMatchDescriptor;
  runtime: MatchRuntimeServerAdapter;
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
    const runtime = new MatchRuntimeServerAdapter(seed);
    
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
    
    // Check if this is the host (matches descriptor.hostProfileId)
    const isHost = conn.profileId === state.descriptor.hostProfileId;
    
    if (isHost) {
      // Host is joining their own match
      const existingHost = state.connections.host;
      
      if (existingHost && existingHost.profileId !== conn.profileId) {
        // Prevent slot hijacking - reject if a different profile is trying to claim host
        return null;
      }
      
      // If reconnecting, unregister the old connection first
      if (existingHost) {
        state.runtime.unregisterPlayer(existingHost.profileId);
      }
      
      state.connections.host = conn;
      state.runtime.registerPlayer(conn.profileId, 'host');
      return state.descriptor;
    }
    
    if (!isHost) {
      // Guest is joining
      const existingGuest = state.connections.guest;
      
      if (existingGuest && existingGuest.profileId !== conn.profileId) {
        // Prevent slot hijacking - only allow if slot is empty OR same profile is reconnecting
        return null;
      }
      
      // If reconnecting, unregister the old connection first
      if (existingGuest) {
        state.runtime.unregisterPlayer(existingGuest.profileId);
      }
      
      state.connections.guest = conn;
      state.descriptor.guestProfileId = conn.profileId;
      state.runtime.registerPlayer(conn.profileId, 'guest');
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
    
    // Unregister the leaving player from the runtime
    state.runtime.unregisterPlayer(profileId);
    
    // Clear the connection slot
    if (state.connections.host?.profileId === profileId) {
      state.connections.host = undefined;
    }
    if (state.connections.guest?.profileId === profileId) {
      state.connections.guest = undefined;
    }
    
    // Notify other players
    const payload: OnlineMatchMessage<TControl> = { type: "leave", reason };
    for (const conn of Object.values(state.connections)) {
      if (conn && conn.profileId !== profileId) {
        conn.send(payload);
      }
    }
    
    // Only delete the match if both players have left
    if (!state.connections.host && !state.connections.guest) {
      this.matches.delete(matchId);
    }
  }
}
