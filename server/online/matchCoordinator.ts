import { randomUUID } from "node:crypto";
import type { OnlineMatchDescriptor, OnlineMatchMessage, RuntimeKeyboardState } from "@shared/match/types";
import { MatchRuntimeServerAdapter } from "./matchRuntimeAdapter";

export type PlayerConnection = {
  profileId: string;
  connectionId: string;
  send: (msg: OnlineMatchMessage<string>) => void;
  close: () => void;
};

type MatchState<TControl extends string> = {
  descriptor: OnlineMatchDescriptor;
  runtime: MatchRuntimeServerAdapter;
  connections: {
    host?: PlayerConnection;
    guest?: PlayerConnection;
  };
  frame: number;
  activeTokens: Set<string>; // Track active connection tokens
};

export class MatchCoordinator<TControl extends string> {
  private matches = new Map<string, MatchState<TControl>>();

  getActiveMatchCount(): number {
    return this.matches.size;
  }

  getActivePlayerCount(): number {
    let count = 0;
    this.matches.forEach((state) => {
      if (state.connections.host) count++;
      if (state.connections.guest) count++;
    });
    return count;
  }

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
      activeTokens: new Set(),
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
      
      // If reconnecting, close and cleanup the old connection
      if (existingHost) {
        console.log(`[MatchCoordinator] Host ${existingHost.profileId} reconnecting, closing old connection ${existingHost.connectionId}`);
        state.activeTokens.delete(existingHost.connectionId);
        state.runtime.unregisterPlayer(existingHost.profileId);
        existingHost.close();
      }
      
      // Register the new connection
      state.connections.host = conn;
      state.activeTokens.add(conn.connectionId);
      state.runtime.registerPlayer(conn.profileId, 'host');
      console.log(`[MatchCoordinator] Host ${conn.profileId} joined with connection ${conn.connectionId}`);
      return state.descriptor;
    }
    
    if (!isHost) {
      // Guest is joining
      const existingGuest = state.connections.guest;
      
      if (existingGuest && existingGuest.profileId !== conn.profileId) {
        // Prevent slot hijacking - only allow if slot is empty OR same profile is reconnecting
        return null;
      }
      
      // If reconnecting, close and cleanup the old connection
      if (existingGuest) {
        console.log(`[MatchCoordinator] Guest ${existingGuest.profileId} reconnecting, closing old connection ${existingGuest.connectionId}`);
        state.activeTokens.delete(existingGuest.connectionId);
        state.runtime.unregisterPlayer(existingGuest.profileId);
        existingGuest.close();
      }
      
      // Register the new connection
      state.connections.guest = conn;
      state.activeTokens.add(conn.connectionId);
      state.descriptor.guestProfileId = conn.profileId;
      state.runtime.registerPlayer(conn.profileId, 'guest');
      console.log(`[MatchCoordinator] Guest ${conn.profileId} joined with connection ${conn.connectionId}`);
      return state.descriptor;
    }
    
    return null;
  }

  submitInputs(matchId: string, profileId: string, connectionId: string, frame: number, inputs: RuntimeKeyboardState<TControl>) {
    const state = this.matches.get(matchId);
    if (!state) return;

    // Validate that this connection is active for this match
    if (!state.activeTokens.has(connectionId)) {
      console.warn(`[MatchCoordinator] Rejecting inputs from inactive connection ${connectionId} for profile ${profileId}`);
      return;
    }

    // Verify the connection matches the current slot
    const isActiveHost = state.connections.host?.connectionId === connectionId;
    const isActiveGuest = state.connections.guest?.connectionId === connectionId;
    
    if (!isActiveHost && !isActiveGuest) {
      console.warn(`[MatchCoordinator] Rejecting inputs from stale connection ${connectionId} for profile ${profileId}`);
      return;
    }

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

  leaveMatch(matchId: string, profileId: string, connectionId: string, reason?: string) {
    const state = this.matches.get(matchId);
    if (!state) return;
    
    // Validate connectionId matches current active connection to prevent stale sockets from clearing slots
    const isActiveHost = state.connections.host?.profileId === profileId && state.connections.host?.connectionId === connectionId;
    const isActiveGuest = state.connections.guest?.profileId === profileId && state.connections.guest?.connectionId === connectionId;
    
    if (!isActiveHost && !isActiveGuest) {
      // Stale connection closing - just remove from active tokens, don't touch slots
      console.log(`[MatchCoordinator] Stale connection ${connectionId} closing for ${profileId}, ignoring`);
      state.activeTokens.delete(connectionId);
      return;
    }
    
    // Remove the connection token
    state.activeTokens.delete(connectionId);
    
    // Unregister the leaving player from the runtime
    state.runtime.unregisterPlayer(profileId);
    
    // Clear the connection slot (only if it's the active connection)
    if (isActiveHost) {
      state.connections.host = undefined;
    }
    if (isActiveGuest) {
      state.connections.guest = undefined;
    }
    
    console.log(`[MatchCoordinator] Player ${profileId} left match ${matchId} (connection ${connectionId})`);
    
    // Notify other players
    const payload: OnlineMatchMessage<TControl> = { type: "leave", reason };
    for (const conn of Object.values(state.connections)) {
      if (conn && conn.profileId !== profileId) {
        conn.send(payload);
      }
    }
    
    // Only delete the match if both players have left
    if (!state.connections.host && !state.connections.guest) {
      console.log(`[MatchCoordinator] Match ${matchId} deleted (both players left)`);
      this.matches.delete(matchId);
    }
  }
}
