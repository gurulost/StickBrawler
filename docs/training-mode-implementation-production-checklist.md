# training mode implementation Checklist

Source of truth checklist for a large/intense task.

## Metadata
- Created: 2026-04-02T23:26:19
- Last Updated: 2026-04-02T23:26:19
- Workspace: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler
- Checklist Doc: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler/docs/training-mode-implementation-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Capture explicit scope, constraints, and success criteria.
  - Scope: implement a first-class Training Mode that is reachable from the main menu, runs on the live runtime/canvas path, teaches the core combat verbs through guided drills, and surfaces an optional advanced panel without depending on debug-only workflows.
  - Constraints: reuse existing runtime/store/training seams; avoid a separate sandbox path; preserve current versus flow; keep UI aligned with the existing menu/HUD language.
  - Success criteria: Training is menu-visible, uses live gameplay, supports guided drills for jab/launcher/parry/roll/grab, allows reset/next navigation, and has automated coverage for the new store/session behavior.

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
  - Evidence: audited `client/src/App.tsx`, `client/src/game/GameManager.tsx`, `client/src/game/Menu.tsx`, `client/src/game/Lobby.tsx`, `client/src/game/UI.tsx`, `client/src/lib/stores/useFighting.tsx`, `client/src/lib/stores/useControls.tsx`, `client/src/lib/combatTraining.ts`, `client/src/game/CombatDebugPanel.tsx`, and `client/src/game/matchRuntime.ts`.
- [x] Q-003 [status:verified] Implement required changes.
  - Evidence: added first-class training flow in `client/src/lib/stores/useFighting.tsx`, `client/src/App.tsx`, `client/src/game/Menu.tsx`, and `client/src/components/landing/LandingHero.tsx`; added player-facing drill HUD in `client/src/game/TrainingHud.tsx`; added drill definitions in `client/src/game/trainingDrills.ts`; added dedicated training session store in `client/src/lib/stores/useTrainingMode.ts`; broadened runtime/inspector support in `client/src/game/GameManager.tsx`, `client/src/game/matchRuntime.ts`, `client/src/game/UI.tsx`, `client/src/game/CombatDebugOverlay.tsx`, and `client/src/game/CombatDebugPanel.tsx`.
- [x] Q-004 [status:verified] Expand or update automated tests.
  - Evidence: added `tests/client/training-mode.test.ts` and expanded `tests/client/fighting-store.test.ts` with training session assertions.
- [x] Q-005 [status:verified] Run full validation suite.
- [x] Q-006 [status:verified] Final code-quality pass and sign-off review.

## Findings Log
- [x] F-001 [status:verified] [P2] [confidence:0.95] Training infrastructure exists, but it is only exposed as debug/injector tooling rather than a player-facing mode.
  - Evidence: `client/src/lib/combatTraining.ts` already defines deterministic presets; `client/src/game/CombatDebugPanel.tsx` exposes them under "Training Injector"; `client/src/lib/stores/useFighting.tsx` still only supports `menu/lobby/fighting/round_end/match_end`.
  - Owner: Codex
  - Linked Fix: P-001
- [x] F-002 [status:verified] [P2] [confidence:0.92] The runtime currently ignores any non-`fighting` gameplay phase, so training cannot be added cleanly without broadening the live simulation path.
  - Evidence: `client/src/game/matchRuntime.ts` short-circuits `update()` when `payload.gamePhase !== "fighting"`.
  - Owner: Codex
  - Linked Fix: P-002
- [x] F-003 [status:verified] [P2] [confidence:0.91] The main menu and app shell do not currently have a first-class path for training, only versus-oriented flow.
  - Evidence: `client/src/App.tsx` routes only `menu`, `lobby`, and combat phases; `client/src/game/Menu.tsx` exposes play/customize/leaderboard/controls, with `startGame()` always targeting the versus lobby.
  - Owner: Codex
  - Linked Fix: P-003

## Fix Log
- [x] P-001 [status:verified] Add a first-class training session flow and curriculum state on top of the existing runtime/store seams.
  - Addresses: F-001
  - Evidence: `client/src/lib/stores/useTrainingMode.ts`, `client/src/game/trainingDrills.ts`, `client/src/game/TrainingHud.tsx`, `client/src/lib/stores/useFighting.tsx`, `tests/client/training-mode.test.ts`
- [x] P-002 [status:verified] Broaden the runtime/app-shell flow so training uses the live simulation without competitive round resolution.
  - Addresses: F-002
  - Evidence: `client/src/App.tsx`, `client/src/game/GameManager.tsx`, `client/src/game/matchRuntime.ts`, `tests/client/fighting-store.test.ts`
- [x] P-003 [status:verified] Add a menu-visible Training Mode entry and a player-facing training HUD with drill progress and advanced toggle.
  - Addresses: F-003
  - Evidence: `client/src/game/Menu.tsx`, `client/src/components/landing/LandingHero.tsx`, `client/src/game/UI.tsx`, `client/src/game/CombatDebugOverlay.tsx`, `client/src/game/CombatDebugPanel.tsx`

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-04-02 23:42 EDT + pass
- [x] V-002 [status:verified] `npm test`
  - Evidence: 2026-04-02 23:45 EDT + pass (`43/43`)
- [x] V-003 [status:verified] `npm run build`
  - Evidence: 2026-04-02 23:45 EDT + pass
- [x] V-004 [status:verified] `npm ci`
  - Evidence: 2026-04-02 23:41 EDT + pass; local dependency restore was required because the worktree had no `node_modules`, which previously blocked validation entirely.

## Residual Risks
- [x] R-001 [status:accepted_risk] Initial Training Mode ships with a focused core-drill curriculum before a full move-list browser for every fighter.
  - Rationale: the highest-leverage win is teaching jab, launcher, parry, roll, and grab through live drills; exhaustive fighter-by-fighter move-list browsing can land after the first training loop proves out.
  - Owner: Codex
  - Follow-up trigger/date: revisit when roster expansion begins.

## Change Log
- 2026-04-02T23:26:19: Checklist initialized.
- 2026-04-02T23:31:00: Scope locked around a first-class Training Mode built on existing runtime/training seams; discovery completed and findings logged.
- 2026-04-02T23:45:00: Training Mode implementation shipped with guided drills, advanced practice toggle, menu entry, training-safe runtime flow, updated tests, and clean `check` / `test` / `build` validation.
