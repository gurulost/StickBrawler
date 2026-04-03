# roster and stage identity pass Checklist

Source of truth checklist for a large/intense task.

## Metadata
- Created: 2026-04-03T00:32:53
- Last Updated: 2026-04-03T00:42:17
- Workspace: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler
- Checklist Doc: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler/docs/roster-and-stage-identity-pass-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Make stage choice mechanically meaningful before adding more roster breadth.
  - Success criteria: arena themes expose authored layout IDs, runtime and rendering read the active layout, at least two new stage identities are added, Arcade uses the new stage roster, and automated tests prove layouts differ at specific coordinates.

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
- [x] F-001 [status:resolved] [P1] [confidence:0.96] Arena choice was still mostly presentation-only because both rendering and gameplay grounding read a shared global platform layout instead of the selected arena.
  - Evidence: audit confirmed `client/src/game/Arena.tsx`, `client/src/game/matchRuntime.ts`, and `client/src/game/Physics.ts` all depended on the shared `PLATFORMS` path before the fix.
  - Owner: Codex
  - Linked Fix: P-001

## Fix Log
- [x] P-001 [status:verified] Added authored arena layout IDs, routed the active arena through runtime and rendering, added `Crosswind Vault` and `Longwatch`, and updated Arcade to use the expanded stage roster.
  - Addresses: F-001
  - Evidence: `client/src/game/Physics.ts`, `client/src/game/arenas/index.ts`, `client/src/game/Arena.tsx`, `client/src/game/matchRuntime.ts`, `client/src/game/GameManager.tsx`, `server/matchRuntime.ts`, `client/src/game/arcadeRun.ts`, `tests/client/arena-layouts.test.ts`, `tests/client/presentation-polish.test.ts`.

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-04-03 00:40 EDT passed.
- [x] V-002 [status:verified] `npm test`
  - Evidence: 2026-04-03 00:40 EDT passed with `53/53` tests green, including new arena layout coverage.
- [x] V-003 [status:verified] `npm run build`
  - Evidence: 2026-04-03 00:41 EDT passed.
- [x] V-004 [status:verified] No separate browser smoke command was required for this pass because the change is covered by runtime/layout assertions plus a clean production build.
  - Evidence: `tests/client/arena-layouts.test.ts` proves layout-specific heights and `tests/client/presentation-polish.test.ts` locks arena metadata/tuning differences.

## Residual Risks
- [x] R-001 [status:accepted_risk] Existing build notes remain unchanged after the stage pass.
  - Rationale: `vite build` still reports the pre-existing `/textures/ink-noise.png` runtime asset note, the `client/src/components/ui/dialog.tsx` sourcemap warning, and the large JS chunk warning. None were introduced by this change set.
  - Owner: backlog
  - Follow-up trigger/date: revisit during performance/pipeline cleanup or before a public release candidate.

## Change Log
- 2026-04-03T00:32:53: Checklist initialized.
- 2026-04-03T00:36:08: Audited stage seams and confirmed arena selection was still cosmetic because runtime/rendering used a shared global platform layout.
- 2026-04-03T00:39:27: Implemented authored platform layouts, threaded active arena layouts through runtime and rendering, and added two new stage themes plus Arcade usage.
- 2026-04-03T00:42:17: Final validation passed with `npm run check`, `npm test`, and `npm run build`; checklist signed off with existing build warnings carried as accepted risk.
