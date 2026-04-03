# Arcade Gauntlet Mode Checklist

Source of truth checklist for the Arcade/Gauntlet production pass.

## Metadata
- Created: 2026-04-03T00:21:02 EDT
- Last Updated: 2026-04-03T00:31:19 EDT
- Workspace: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler
- Checklist Doc: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler/docs/arcade-gauntlet-mode-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Ship a lightweight Arcade/Gauntlet loop on top of the live combat runtime: main-menu entry, curated ladder, in-run progression, run scoring, end-of-run branching, and automated progression coverage.

## Sign-off Gate
- [x] G-001 [status:verified] All queued work, findings, fixes, and validations are complete.
- [x] G-002 [status:verified] All findings are resolved or marked `accepted_risk` with rationale and owner.
- [x] G-003 [status:verified] Required validation suite has been rerun on the final code state.
- [x] G-004 [status:verified] Residual risks and follow-ups are documented.

## Rerun Matrix
- [x] G-010 [status:verified] Code changed after the first green type/test pass, so validations were rerun on the final state.
- [x] G-011 [status:verified] Final sign-off happened only after `npm run check`, `npm test`, and `npm run build` passed after the last edit.

## Audit Queue
- [x] Q-001 [status:verified] Create checklist and baseline scope.
- [x] Q-002 [status:verified] Complete discovery/audit of menu, lobby, store, match-end UI, and scoring seams.
- [x] Q-003 [status:verified] Implement the arcade ladder model, progression state, and UI flow.
- [x] Q-004 [status:verified] Expand automated coverage for run setup, advancement, and loss handling.
- [x] Q-005 [status:verified] Run full validation suite.
- [x] Q-006 [status:verified] Final code-quality pass and sign-off review.

## Findings Log
- [x] F-001 [status:verified] [P1] [confidence:0.98] The game still had no session loop between menu and single isolated matches, so solo play lacked structure after the Training/CPU passes.
  - Evidence: `client/src/lib/stores/useFighting.tsx` only modeled menu/lobby/training/fighting/round_end/match_end without a run-level state; `client/src/game/UI.tsx` only offered `Run It Back` or `Main Menu` at `match_end`.
  - Owner: Codex
  - Linked Fix: P-001
- [x] F-002 [status:verified] [P1] [confidence:0.95] Menu and lobby flow could not express a curated solo ladder because CPU selection, arena choice, and progression were all treated as one-off match setup.
  - Evidence: `client/src/game/Menu.tsx`, `client/src/components/landing/LandingHero.tsx`, and `client/src/game/Lobby.tsx` exposed versus/training entry points only and no run preview or locked curated opponent state.
  - Owner: Codex
  - Linked Fix: P-002

## Fix Log
- [x] P-001 [status:verified] Added a dedicated arcade ladder model with five curated encounters, run status, score progression, clear bonuses, and grade calculation in `client/src/game/arcadeRun.ts`, then wired it through `client/src/lib/stores/useFighting.tsx`.
  - Addresses: F-001
  - Evidence: `client/src/game/arcadeRun.ts`, `client/src/lib/stores/useFighting.tsx`
- [x] P-002 [status:verified] Added an Arcade Gauntlet menu entry and lobby presentation, including run ladder preview, locked curated CPU slot behavior, and fighter selection for the player slot.
  - Addresses: F-002
  - Evidence: `client/src/game/Menu.tsx`, `client/src/components/landing/LandingHero.tsx`, `client/src/game/Lobby.tsx`
- [x] P-003 [status:verified] Reworked combat overlay/end-of-match flow so arcade sessions show run score, run status, next-fight continuation, and terminal restart behavior instead of only `Run It Back`.
  - Addresses: F-001, F-002
  - Evidence: `client/src/game/UI.tsx`, `client/src/lib/stores/useFighting.tsx`
- [x] P-004 [status:verified] Added automated progression coverage for arcade setup, advancing to the next fight, and preserving run score across a later loss.
  - Addresses: F-001
  - Evidence: `tests/client/arcade-mode.test.ts`

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-04-03 00:29 EDT - pass
- [x] V-002 [status:verified] `node --test --import tsx tests/client/arcade-mode.test.ts`
  - Evidence: 2026-04-03 00:29 EDT - pass
- [x] V-003 [status:verified] `npm test`
  - Evidence: 2026-04-03 00:30 EDT - pass (51/51)
- [x] V-004 [status:verified] `npm run build`
  - Evidence: 2026-04-03 00:31 EDT - pass; existing runtime asset note for `/textures/ink-noise.png`, existing dialog sourcemap warning, and existing chunk-size warning remained

## Residual Risks
- [x] R-001 [status:accepted_risk] The ladder is structurally sticky now, but it still relies on the current two-fighter roster and a fixed authored encounter list rather than unlocks, branching routes, or richer fighter/stage variety.
  - Rationale: That is the right next-level tradeoff for this pass; the point here was to create a real session loop without another systems rewrite.
  - Owner: Codex
  - Follow-up trigger/date: Revisit when adding the next two archetypes or when challenge-board/progression work starts.

## Change Log
- 2026-04-03T00:21:02 EDT: Checklist initialized.
- 2026-04-03T00:31:19 EDT: Discovery, implementation, tests, validation, and sign-off recorded.
