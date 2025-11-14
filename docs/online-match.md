## Online Multiplayer Architecture

### Goals
- Support remote 1v1 matches with deterministic lockstep mirroring the existing MatchRuntime.
- Preserve ink customization/loadout data for both players and feed telemetry/anti-cheat.
- Allow predictive client runtime with correction/resync when authoritative frames arrive.
- Keep local (single/local) behavior untouched.

### Components

1. **Shared Schema**
   - `shared/match/types.ts` gains:
     - `MatchMode = "single" | "local" | "online"`
     - `OnlineInputFrame`, `OnlineMatchSnapshot`, `OnlineMatchMessage`
     - `OnlineMatchDescriptor` (metadata for lobby/coordination)

2. **Server**
   - `server/online/matchCoordinator.ts`: in-memory registry of matches, seeds, joined players, frame counters.
   - `server/online/socketServer.ts`: WebSocket listener (using `ws`) that authenticates players, routes `OnlineMatchMessage`s, and steps the authoritative runtime.
   - `server/routes.ts` gains REST endpoints to create/list matches (optional convenience).
   - Tests in `tests/server/online.test.ts` simulate two players exchanging frames.

3. **Client**
   - `client/src/hooks/use-online-match.ts`: manages WebSocket lifecycle, ping/latency, input queue, prediction, and reconciliation.
   - `client/src/lib/stores/useFighting.tsx`: `MatchMode` now includes `"online"`, slot metadata reflects remote players, and runtime dispatch is aware of the network pipeline.
   - UI updates: hero/lobby exposes “Online” mode, match browser, connection status toasts.

4. **Telemetry/Economy**
   - Online matches include match IDs and loadout hashes in telemetry payloads and coin awards.

### Messages
```ts
type OnlineMatchMessage<TControl extends string> =
  | { type: "join"; matchId: string; profileId: string }
  | { type: "state"; snapshot: OnlineMatchSnapshot<TControl> }
  | { type: "inputs"; frame: number; inputs: RuntimeKeyboardState<TControl> }
  | { type: "resync"; snapshot: OnlineMatchSnapshot<TControl> }
  | { type: "leave"; reason?: string };
```

### Flow
1. Host creates match -> coordinator assigns `matchId` and seed.
2. Guest joins via WebSocket -> coordinator sends `state` snapshot with seed and current frame.
3. Both clients send `inputs` each tick; server advances runtime and broadcasts authoritative `state`.
4. Clients predict locally between snapshots and reconcile when a new `state` arrives.
5. On disconnect/leave, coordinator informs the remaining player (`leave` message) and closes match.

### Deployment Notes
See "Deployment Tasks" at the bottom of this doc (updated as coding progresses).
