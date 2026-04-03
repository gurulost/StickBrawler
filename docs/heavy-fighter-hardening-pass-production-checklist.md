# heavy fighter hardening pass Checklist

Source of truth checklist for the post-Anvil regression-hardening pass.

## Metadata
- Created: 2026-04-03T01:08:47 EDT
- Last Updated: 2026-04-03T01:23:00 EDT
- Workspace: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler
- Checklist Doc: /Users/davedixon/.codex/worktrees/4aa0/StickBrawler/docs/heavy-fighter-hardening-pass-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Audit the heavyweight/bruiser pass for functional regressions, fix any real behavior gaps, strengthen automated coverage around the discovered edge case, and rerun validation on the final code state.
  - Success criteria: any regression found during the audit is fixed in code, covered by an automated repro, and the final state passes `npm run check`, `npm test`, and `npm run build`.

## Sign-off Gate
- [x] G-001 [status:verified] All queued work, findings, fixes, and validations are complete.
- [x] G-002 [status:verified] All findings are resolved or marked `accepted_risk` with rationale and owner.
- [x] G-003 [status:verified] Required validation suite has been rerun on the final code state.
- [x] G-004 [status:verified] Residual risks and follow-ups are documented.

## Rerun Matrix
- [x] G-010 [status:verified] Code changed after discovery, so validations were rerun on the final state.
- [x] G-011 [status:verified] Final sign-off happened only after a full validation pass completed after the last code edit.

## Audit Queue
- [x] Q-001 [status:verified] Create checklist and baseline scope.
- [x] Q-002 [status:verified] Complete discovery/audit of impacted systems.
- [x] Q-003 [status:verified] Implement required changes.
- [x] Q-004 [status:verified] Expand or update automated tests.
- [x] Q-005 [status:verified] Run full validation suite.
- [x] Q-006 [status:verified] Final code-quality pass and sign-off review.

## Findings Log
- [x] F-001 [status:verified] [P1] [confidence:0.98] Counter-stance follow-ups were authored but not reachable in the live runtime: when a defender blocked during `parry`, `hero_counter_light`, or `anvil_brace_counter`, the runtime marked the attacker’s block confirm only, then forced the defender into generic blockstun and cleared the active move before the authored `onBlock` branch could ever fire.
  - Evidence: audit covered `client/src/game/matchRuntime.ts` block-resolution paths; the new integration repro in `tests/client/match-runtime-counter.test.ts` failed until the runtime preserved the defender’s reactive stance and block confirm.
  - Owner: Codex
  - Linked Fix: P-001

## Fix Log
- [x] P-001 [status:verified] Added explicit `counterGuardFrames` move metadata for counter-stance specials, taught the runtime to treat reactive counter/parry guards as blocks without collapsing them into generic blockstun, mirrored block confirms onto the defending stance, and added a live runtime test proving `anvil_brace_counter` converts a blocked jab into `anvil_hammer_fall`.
  - Addresses: F-001
  - Evidence: `client/src/combat/types.ts`, `client/src/combat/moves.ts`, `client/src/game/matchRuntime.ts`, `tests/client/match-runtime-counter.test.ts`

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-04-03 01:22 EDT passed.
- [x] V-002 [status:verified] `npm test`
  - Evidence: 2026-04-03 01:22 EDT passed with `59/59` tests green, including the new counter-runtime integration repro.
- [x] V-003 [status:verified] `npm run build`
  - Evidence: 2026-04-03 01:22 EDT passed.
- [x] V-004 [status:accepted_risk] Browser smoke via the shared web-game Playwright client could not be completed in this workspace because the client script depends on the `playwright` package and it is not installed here.
  - Evidence: 2026-04-03 01:21 EDT skipped as environment-blocked; running `/Users/davedixon/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js` failed with `ERR_MODULE_NOT_FOUND: Cannot find package 'playwright'`.

## Residual Risks
- [x] R-001 [status:accepted_risk] Existing build notes remain unchanged after the hardening pass.
  - Rationale: `vite build` still reports the pre-existing `/textures/ink-noise.png` runtime asset note, the `client/src/components/ui/dialog.tsx` sourcemap warning, the stale `baseline-browser-mapping` note, and the large JS chunk warning. None were introduced by this hardening work.
  - Owner: backlog
  - Follow-up trigger/date: revisit during performance/pipeline cleanup or before a public release candidate.
- [x] R-002 [status:accepted_risk] A true browser smoke for this pass is still pending a local Playwright install in the workspace or an alternate browser QA tool path.
  - Rationale: runtime coverage now proves the discovered regression is fixed, but visual/browser-level confirmation of menu-to-match flow was blocked by environment setup rather than app logic.
  - Owner: Codex
  - Follow-up trigger/date: rerun browser smoke the next time Playwright is available in the workspace.

## Change Log
- 2026-04-03T01:08:47 EDT: Checklist initialized.
- 2026-04-03T01:12:00 EDT: Audit isolated a real regression in the runtime `onBlock` path for counter-style moves; created a failing live runtime repro instead of relying on code inspection alone.
- 2026-04-03T01:20:00 EDT: Fixed reactive counter/parry guard handling in the runtime and added the Anvil conversion test.
- 2026-04-03T01:23:00 EDT: Final validation passed with `npm run check`, `npm test`, and `npm run build`; browser smoke blocker recorded as an accepted environment risk.
