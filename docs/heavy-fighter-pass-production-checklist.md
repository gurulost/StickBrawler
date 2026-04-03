# heavy fighter pass Checklist

Source of truth checklist for the heavyweight/bruiser production pass.

## Metadata
- Created: 2026-04-03T00:57:47 EDT
- Last Updated: 2026-04-03T01:06:00 EDT
- Workspace: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler
- Checklist Doc: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler/docs/heavy-fighter-pass-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Add a second sharply distinct non-skin archetype end to end by shipping the `Anvil` heavyweight/bruiser kit across authored moves, presentation, training/debug presets, Arcade, and automated coverage.
  - Success criteria: `stick_anvil` is selectable anywhere the roster is surfaced, has a complete authored move table and move definitions, exposes bespoke presentation clips for the bruiser kit, participates in training/debug scripts, appears in Arcade, and the final code state passes validation.

## Sign-off Gate
- [x] G-001 [status:verified] All queued work, findings, fixes, and validations are complete.
- [x] G-002 [status:verified] All findings are resolved or marked `accepted_risk` with rationale and owner.
- [x] G-003 [status:verified] Required validation suite has been rerun on the final code state.
- [x] G-004 [status:verified] Residual risks and follow-ups are documented.

## Rerun Matrix
- [x] G-010 [status:verified] Validation happened after the final authored fighter integrations and test updates landed.
- [x] G-011 [status:verified] Final sign-off happened only after `npm run check`, `npm test`, and `npm run build` passed on the last code state.

## Audit Queue
- [x] Q-001 [status:verified] Create checklist and baseline scope.
- [x] Q-002 [status:verified] Complete discovery/audit of remaining roster seams after the `Kite` pass.
- [x] Q-003 [status:verified] Implement the heavyweight/bruiser fighter, authored clips, training presets, and Arcade encounter integration.
- [x] Q-004 [status:verified] Expand automated coverage for roster, training, presentation, and Arcade composition.
- [x] Q-005 [status:verified] Run full validation suite.
- [x] Q-006 [status:verified] Final code-quality pass and sign-off review.

## Findings Log
- [x] F-001 [status:verified] [P1] [confidence:0.97] The roster had improved from two fighters to three, but it still lacked a heavyweight/bruiser identity, which left matchup texture and solo encounter variety too narrow.
  - Evidence: after the `Kite` pass, `client/src/combat/fighterRoster.ts` and `tests/client/fighter-roster.test.ts` still modeled only `stick_hero`, `stick_villain`, and `stick_kite`, while `client/src/game/arcadeRun.ts` had no bruiser-style encounter in the authored ladder.
  - Owner: Codex
  - Linked Fix: P-001
- [x] F-002 [status:verified] [P1] [confidence:0.95] Adding a fourth fighter would still have felt incomplete if the bruiser kit was not represented in the presentation language and deterministic training/debug tooling.
  - Evidence: the integration surfaces for authored move clips and scripted preset coverage live in `client/src/game/stickfigure/movePresentation.ts` and `client/src/lib/combatTraining.ts`; without updates there, the fighter would be playable but not production-grade.
  - Owner: Codex
  - Linked Fix: P-002

## Fix Log
- [x] P-001 [status:verified] Added the `Anvil` heavyweight/bruiser archetype with a full authored move table and move definitions, then surfaced that archetype in the roster and Arcade ladder.
  - Addresses: F-001
  - Evidence: `client/src/combat/fighterRoster.ts`, `client/src/combat/moveTable.ts`, `client/src/combat/moves.ts`, `client/src/game/arcadeRun.ts`, `tests/client/fighter-roster.test.ts`, `tests/client/arcade-mode.test.ts`
- [x] P-002 [status:verified] Added bespoke presentation clips, slice profiles, and deterministic training presets so the new bruiser reads correctly in the ink language and in debug/training workflows.
  - Addresses: F-002
  - Evidence: `client/src/game/stickfigure/movePresentation.ts`, `client/src/lib/combatTraining.ts`, `tests/client/combat-training.test.ts`, `tests/client/training-mode.test.ts`, `tests/client/presentation-polish.test.ts`

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-04-03 01:06 EDT passed.
- [x] V-002 [status:verified] `npm test`
  - Evidence: 2026-04-03 01:06 EDT passed with `58/58` tests green, including new Anvil roster, training, Arcade, and presentation assertions.
- [x] V-003 [status:verified] `npm run build`
  - Evidence: 2026-04-03 01:06 EDT passed.
- [x] V-004 [status:verified] No separate browser smoke command was required for this pass because the main risk was authored content/state integration rather than a brand-new interaction flow.
  - Evidence: 2026-04-03 01:06 EDT skipped as intentional; roster/training/presentation assertions cover the new bruiser routing directly and the final production build passed.

## Residual Risks
- [x] R-001 [status:accepted_risk] Existing build notes remain unchanged after the heavyweight pass.
  - Rationale: `vite build` still reports the pre-existing `/textures/ink-noise.png` runtime asset note, the `client/src/components/ui/dialog.tsx` sourcemap warning, the stale `baseline-browser-mapping` note, and the large JS chunk warning. None were introduced by the Anvil integration.
  - Owner: backlog
  - Follow-up trigger/date: revisit during performance/pipeline cleanup or before a public release candidate.

## Change Log
- 2026-04-03T00:57:47 EDT: Checklist initialized.
- 2026-04-03T01:01:00 EDT: Audited post-Kite seams and confirmed the remaining work was authored fighter integration rather than another roster abstraction rewrite.
- 2026-04-03T01:05:00 EDT: Added the `Anvil` bruiser kit, authored presentation/training coverage, and Arcade ladder integration.
- 2026-04-03T01:06:00 EDT: Final validation passed with `npm run check`, `npm test`, and `npm run build`; checklist signed off with existing build notes carried as accepted risk.
