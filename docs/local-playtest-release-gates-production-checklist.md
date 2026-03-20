# Local Playtest Release Gates Checklist

Source of truth checklist for a large/intense task.

## Metadata
- Created: 2026-03-20T12:53:09
- Last Updated: 2026-03-20T13:10:53-0400
- Workspace: /Users/davedixon/Documents/GitHub/StickBrawler
- Checklist Doc: /Users/davedixon/Documents/GitHub/StickBrawler/docs/local-playtest-release-gates-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Capture explicit scope, constraints, and success criteria.
  - Evidence: Local-only external playtest build. Required gates are (1) hide/disable online user flows and normalize mode state to local play, (2) centralize truthful controls/help copy from the actual bindings and intent grammar, and (3) add an explicit runtime reset signal so round restarts reset `MatchRuntime`, not just the mirrored Zustand store.

## Sign-off Gate
- [x] G-001 [status:verified] All queued work, findings, fixes, and validations are complete.
- [x] G-002 [status:verified] All findings are resolved or marked `accepted_risk` with rationale and owner.
- [x] G-003 [status:verified] Required validation suite has been rerun on the final code state.
- [x] G-004 [status:verified] Residual risks and follow-ups are documented.

## Rerun Matrix
- [x] G-010 [status:verified] If code changes after any checked `V-*`, reset affected validation items to unchecked.
- [x] G-011 [status:verified] Final sign-off only after a full validation pass completed after the last code edit.

## Audit Queue
- [x] Q-001 [status:verified] Create checklist and baseline scope.
- [x] Q-002 [status:verified] Complete discovery/audit of impacted systems.
- [x] Q-003 [status:verified] Implement required changes.
- [x] Q-004 [status:verified] Expand or update automated tests.
- [x] Q-005 [status:verified] Run full validation suite.
- [x] Q-006 [status:verified] Final code-quality pass and sign-off review.

## Findings Log
- [x] F-001 [status:verified] [P1] [confidence:0.94] Online multiplayer is still surfaced in the menu flow even though the gameplay/runtime path is not production-ready.
  - Evidence: `client/src/game/Menu.tsx` imports and renders `OnlineMultiplayer`, probes `/api/online/health`, and calls `startGame("online")` after storing `onlineMatchId` in `sessionStorage`; `server/online-routes.ts` still exposes create/health endpoints.
  - Owner: Codex
  - Linked Fix: P-001
- [x] F-002 [status:verified] [P1] [confidence:0.98] Controls/help copy is inconsistent with the actual bindings and intent system, which makes first-use evaluation unreliable.
  - Evidence: `client/src/game/Menu.tsx` still advertises legacy `WASD`/`1/2/3` and `J/K/L` layouts; `client/src/game/Lobby.tsx` still shows `IJKL + U/O/P + Enter`; `client/src/game/UI.tsx` still shows stale move/combat instructions while `client/src/hooks/use-player-controls.tsx` and `client/src/hooks/use-player-intents.ts` define the real bindings/verbs.
  - Owner: Codex
  - Linked Fix: P-002
- [x] F-003 [status:verified] [P1] [confidence:0.99] Pause-menu round restart resets only the mirrored store state and does not explicitly reset the live `MatchRuntime`.
  - Evidence: `client/src/lib/stores/useFighting.tsx` `resetRound()` keeps `gamePhase: "fighting"`; `client/src/game/GameManager.tsx` only calls `runtimeRef.current.reset(...)` on a non-fighting -> fighting phase transition.
  - Owner: Codex
  - Linked Fix: P-003

## Fix Log
- [x] P-001 [status:verified] Remove online play from the user-facing playtest flow and gate server exposure behind a shared product flag.
  - Addresses: F-001
  - Evidence: Added `shared/productFlags.ts`; removed the menu online panel/sessionStorage launch path; normalized `online` match requests back to local play in `client/src/lib/stores/useFighting.tsx`; server startup and `/api/online/*` routes now report the feature as disabled for this build.
- [x] P-002 [status:verified] Extract a shared controls/help schema from the actual bindings and use it in menu, lobby, and in-match help surfaces.
  - Addresses: F-002
  - Evidence: Added `client/src/input/controlGuide.ts`; `client/src/hooks/use-player-controls.tsx` now consumes the shared binding map; `client/src/game/Menu.tsx`, `client/src/game/Lobby.tsx`, and `client/src/game/UI.tsx` now render from the same bindings/help data.
- [x] P-003 [status:verified] Add a runtime reset token/nonce in the fighting store and make `GameManager` reset the live runtime when it changes.
  - Addresses: F-003
  - Evidence: Added `runtimeResetNonce` to `client/src/lib/stores/useFighting.tsx`; incremented it on `beginMatch`, `resetRound`, and `restartMatch`; `client/src/game/GameManager.tsx` now resets `MatchRuntime` whenever the nonce changes during `fighting`.

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-03-20 13:10 EDT, pass.
- [x] V-002 [status:verified] `npm run build`
  - Evidence: 2026-03-20 13:10 EDT, pass. Non-blocking existing warnings remained about `baseline-browser-mapping`, unresolved `/textures/ink-noise.png` at build time, a sourcemap lookup in `client/src/components/ui/dialog.tsx`, and large bundle chunks.
- [x] V-003 [status:verified] `npm test`
  - Evidence: 2026-03-20 13:10 EDT, pass (39 tests).
- [x] V-004 [status:verified] Playwright smoke: menu and controls screen on `http://127.0.0.1:3000`
  - Evidence: 2026-03-20 13:09 EDT, pass. Verified the menu no longer shows an Online nav button and the Controls screen renders the shared keyboard/controller bindings plus the new "How to Fight" guidance.

## Residual Risks
- [x] R-001 [status:accepted_risk] Online infrastructure remains present in the repository for later completion, but is intentionally disabled for this local-only playtest build.
  - Rationale: Keeping the unfinished code paths on disk avoids a larger deletion/refactor while still removing them from the product surface area.
  - Owner: Codex
  - Follow-up trigger/date: Revisit only when deterministic remote simulation is ready for a dedicated online milestone.

## Change Log
- 2026-03-20T12:53:09: Checklist initialized.
- 2026-03-20T13:00: discovery completed; logged release-gate findings for online exposure, stale controls/help copy, and runtime reset behavior.
- 2026-03-20T13:10:53-0400: implemented the local-only product flag, shared controls/help schema, runtime reset nonce wiring, updated tests, and completed final validation plus browser smoke.
