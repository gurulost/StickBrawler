# CPU Personality And Difficulty Checklist

Source of truth checklist for the CPU personality/difficulty production pass.

## Metadata
- Created: 2026-04-03T00:03:50 EDT
- Last Updated: 2026-04-03T00:19:08 EDT
- Workspace: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler
- Checklist Doc: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler/docs/cpu-personality-and-difficulty-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Ship a first-class CPU personality/difficulty slice across store state, runtime wiring, lobby controls, deterministic AI behavior, and automated tests.

## Sign-off Gate
- [x] G-001 [status:verified] All queued work, findings, fixes, and validations are complete.
- [x] G-002 [status:verified] All findings are resolved or marked `accepted_risk` with rationale and owner.
- [x] G-003 [status:verified] Required validation suite has been rerun on the final code state.
- [x] G-004 [status:verified] Residual risks and follow-ups are documented.

## Rerun Matrix
- [x] G-010 [status:verified] Code changed after the initial type/test pass, so validations were rerun on the final state.
- [x] G-011 [status:verified] Final sign-off happened only after `npm run check`, `npm test`, and `npm run build` passed after the last edit.

## Audit Queue
- [x] Q-001 [status:verified] Create checklist and baseline scope.
- [x] Q-002 [status:verified] Complete discovery/audit of CPU seams in `cpuBrain.ts`, `matchRuntime.ts`, `Lobby.tsx`, `useFighting.tsx`, and `server/matchRuntime.ts`.
- [x] Q-003 [status:verified] Implement configurable CPU personalities, difficulty tuning, and deterministic runtime wiring.
- [x] Q-004 [status:verified] Expand automated coverage for store config persistence and profile-specific AI behavior.
- [x] Q-005 [status:verified] Run full validation suite.
- [x] Q-006 [status:verified] Final code-quality pass and sign-off review.

## Findings Log
- [x] F-001 [status:verified] [P1] [confidence:0.98] Solo play had no real player-facing opponent identity because the runtime hardcoded a single balanced CPU brain and the lobby/store had nowhere to carry CPU configuration.
  - Evidence: `client/src/game/matchRuntime.ts` instantiated `new CpuBrain({ style: CpuStyle.BALANCED })`; `client/src/lib/stores/useFighting.tsx` slot state lacked CPU config; `client/src/game/Lobby.tsx` exposed no CPU personality/difficulty controls.
  - Owner: Codex
  - Linked Fix: P-001
- [x] F-002 [status:verified] [P1] [confidence:0.95] Gameplay-affecting CPU randomness bypassed the deterministic runtime PRNG because `CpuBrain` defaulted to `Math.random()`.
  - Evidence: pre-fix `client/src/game/cpuBrain.ts` constructor defaulted `rng ?? Math.random`; pre-fix `client/src/game/matchRuntime.ts` created the brain without the seeded `DeterministicRandom`.
  - Owner: Codex
  - Linked Fix: P-002
- [x] F-003 [status:verified] [P2] [confidence:0.89] During implementation, proximity aggression could still override defensive decisions under direct pressure, collapsing Trickster/Beginner defensive reads into blind close-range attacks.
  - Evidence: repro during `tests/client/cpu-brain.test.ts` authoring where both profiles emitted `attack2` instead of block/parry under an attacking player at 0.8 range.
  - Owner: Codex
  - Linked Fix: P-003

## Fix Log
- [x] P-001 [status:verified] Added CPU config as slot state, live runtime input, and lobby UI so solo matches can select profile/difficulty instead of a single opaque AI.
  - Addresses: F-001
  - Evidence: `client/src/lib/stores/useFighting.tsx`, `client/src/game/Lobby.tsx`, `client/src/game/GameManager.tsx`, `client/src/game/matchRuntime.ts`, `server/matchRuntime.ts`
- [x] P-002 [status:verified] Rebuilt `client/src/game/cpuBrain.ts` around four personalities and four difficulty tiers, and wired the brain to the deterministic match RNG.
  - Addresses: F-001, F-002
  - Evidence: `client/src/game/cpuBrain.ts`, `client/src/game/matchRuntime.ts`
- [x] P-003 [status:verified] Tightened aggression gating so defensive reads are not overwritten while the player is actively threatening, then covered the behavior with focused CPU brain tests.
  - Addresses: F-003
  - Evidence: `client/src/game/cpuBrain.ts`, `tests/client/cpu-brain.test.ts`
- [x] P-004 [status:verified] Added automated coverage for slot config persistence and profile-specific behavior.
  - Addresses: F-001, F-003
  - Evidence: `tests/client/cpu-brain.test.ts`, `tests/client/fighting-store.test.ts`

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-04-03 00:17 EDT - pass
- [x] V-002 [status:verified] `node --test --import tsx tests/client/cpu-brain.test.ts`
  - Evidence: 2026-04-03 00:18 EDT - pass
- [x] V-003 [status:verified] `npm test`
  - Evidence: 2026-04-03 00:18 EDT - pass (48/48)
- [x] V-004 [status:verified] `npm run build`
  - Evidence: 2026-04-03 00:19 EDT - pass; existing runtime asset note for `/textures/ink-noise.png` and existing chunk-size warning remained

## Residual Risks
- [x] R-001 [status:accepted_risk] CPU personalities are behavior profiles layered over the existing shared move-selection grammar, not fighter-specific matchup scripts.
  - Rationale: This is the right scope for the current solo-play pass; the next leverage point is Arcade/Gauntlet plus roster/stage identity, not bespoke per-fighter AI trees yet.
  - Owner: Codex
  - Follow-up trigger/date: Revisit when adding the next two roster archetypes or the first Arcade ladder tuning pass.

## Change Log
- 2026-04-03T00:03:50 EDT: Checklist initialized.
- 2026-04-03T00:19:08 EDT: Discovery, implementation, tests, validation, and sign-off recorded.
