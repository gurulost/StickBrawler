# fighter identity pass Checklist

Source of truth checklist for a large/intense task.

## Metadata
- Created: 2026-04-03T00:43:21
- Last Updated: 2026-04-03T00:58:09
- Workspace: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler
- Checklist Doc: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler/docs/fighter-identity-pass-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Add the first new fighter archetype end to end without leaving behind brittle two-fighter assumptions.
  - Success criteria: a third fighter is selectable in the lobby, has a full authored move table and move definitions, has bespoke presentation clips for its kit, participates in training/debug tooling, appears in Arcade, and validation passes on the final code state.

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
- [x] F-001 [status:verified] [P1] [confidence:0.97] The game still assumed a two-fighter roster in selection metadata, training filters, and preview/debug surfaces, which blocked a clean third fighter from becoming a real selectable archetype.
  - Evidence: audit covered `client/src/game/Lobby.tsx`, `client/src/lib/combatTraining.ts`, `client/src/game/trainingDrills.ts`, `client/src/lib/stores/useFighting.tsx`, and `client/src/components/preview/CharacterPreview.tsx`, all of which previously hardcoded `hero`/`villain` paths or defaults.
  - Owner: Codex
  - Linked Fix: P-001

## Fix Log
- [x] P-001 [status:verified] Added the `Kite` aerial archetype, centralized fighter metadata/defaults, expanded training/debug fighter filters to work on fighter IDs, and updated Arcade/lobby/presentation coverage for the new roster shape.
  - Addresses: F-001
  - Evidence: `client/src/combat/fighterRoster.ts`, `client/src/combat/moveTable.ts`, `client/src/combat/moves.ts`, `client/src/game/stickfigure/movePresentation.ts`, `client/src/game/Lobby.tsx`, `client/src/lib/combatTraining.ts`, `client/src/game/trainingDrills.ts`, `client/src/game/arcadeRun.ts`, `tests/client/fighter-roster.test.ts`, `tests/client/combat-training.test.ts`, `tests/client/training-mode.test.ts`, `tests/client/presentation-polish.test.ts`.

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-04-03 00:54 EDT passed.
- [x] V-002 [status:verified] `npm test`
  - Evidence: 2026-04-03 00:55 EDT passed with `56/56` tests green, including new fighter-roster, training, and presentation coverage.
- [x] V-003 [status:verified] `npm run build`
  - Evidence: 2026-04-03 00:56 EDT passed.
- [x] V-004 [status:verified] No separate browser smoke command was required for this pass because the risk was authored content/state wiring rather than a new interaction flow.
  - Evidence: 2026-04-03 00:58 EDT skipped as intentional; roster/training/presentation assertions exercise the new fighter routing directly and the final production build passed.

## Residual Risks
- [x] R-001 [status:accepted_risk] Existing build notes remain unchanged after the fighter pass.
  - Rationale: `vite build` still reports the pre-existing `/textures/ink-noise.png` runtime asset note, the `client/src/components/ui/dialog.tsx` sourcemap warning, the stale `baseline-browser-mapping` note, and the large JS chunk warning. None were introduced by the new fighter work.
  - Owner: backlog
  - Follow-up trigger/date: revisit during performance/pipeline cleanup or before a public release candidate.

## Change Log
- 2026-04-03T00:43:21: Checklist initialized.
- 2026-04-03T00:46:02: Audited fighter-selection, training, preview, and store seams; confirmed the main blocker was the repeated two-fighter assumption outside the raw move system.
- 2026-04-03T00:52:11: Added the `Kite` aerial fighter kit, centralized roster metadata/defaults, updated training/debug surfaces, and dropped the new fighter into Arcade.
- 2026-04-03T00:58:09: Final validation passed with `npm run check`, `npm test`, and `npm run build`; checklist signed off with existing build warnings carried as accepted risk.
