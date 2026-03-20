# Combat presentation rebuild Checklist

Source of truth checklist for a large/intense task.

## Metadata
- Created: 2026-03-19T22:52:28
- Last Updated: 2026-03-20T02:53:00
- Workspace: /Users/davedixon/Documents/GitHub/StickBrawler
- Checklist Doc: /Users/davedixon/Documents/GitHub/StickBrawler/docs/combat-presentation-rebuild-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Rebuild the combat runtime/store/render boundary around authoritative `moveId` + `moveFrame`, add active-frame/body-region hit resolution, tighten the fight to a 2.5D presentation band, and finish the roster/stage polish pass so the current authored move table and arena themes read clearly without restarting the whole game.

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
- [x] F-001 [status:verified] [P1] [confidence:0.96] `client/src/game/matchRuntime.ts` and `client/src/lib/stores/useFighting.tsx` were both applying combat outcomes, which let damage, combo state, cooldowns, and guard logic drift between runtime and store.
  - Evidence: discovery pass across `client/src/game/matchRuntime.ts`, `client/src/lib/stores/useFighting.tsx`, and `client/src/game/GameManager.tsx` showed runtime calling store-side `damage*`, cooldown, and guard methods every frame while the store still owned its own combo and reduction math.
  - Owner: Codex
  - Linked Fix: P-001
- [x] F-002 [status:verified] [P1] [confidence:0.94] `client/src/combat/hitResolver.ts` allowed move hitboxes to connect outside their authored active windows and only tested against defender origin instead of body regions.
  - Evidence: prior resolver ignored `attacker.moveFrame` and used a single defender-root overlap check; the new `tests/client/hit-resolver.test.ts` now guards active-frame and hurt-region behavior.
  - Owner: Codex
  - Linked Fix: P-002
- [x] F-003 [status:verified] [P2] [confidence:0.92] `client/src/game/StickFigure.tsx` and `client/src/game/stickfigure/Limbs.tsx` were inferring visuals from coarse booleans and generic attack buckets, so authored move timelines never became readable on screen.
  - Evidence: discovery showed renderer logic keyed off `isAttacking`, `lastMoveType`, and generic `attackType` buckets; move-specific authored IDs in `client/src/combat/moves.ts` were largely unmapped.
  - Owner: Codex
  - Linked Fix: P-003
- [x] F-004 [status:verified] [P2] [confidence:0.9] The first rebuild pass still left three seams open: hit contact centers were still mostly root-relative instead of following the normalized rig sockets, tech outcomes were tracked in telemetry but not surfaced to the render event stream, and `useFighting.tsx` still exposed legacy helper methods with its own block/dodge/cooldown damage behavior.
  - Evidence: 2026-03-20 audit across `client/src/combat/hitResolver.ts`, `client/src/game/matchRuntime.ts`, `client/src/game/StickFigure.tsx`, and `client/src/lib/stores/useFighting.tsx` showed no store-side authority in the live runtime path, but did show missing `tech` event publication and legacy helper methods still applying extra combat math if called directly.
  - Owner: Codex
  - Linked Fix: P-004
- [x] F-005 [status:verified] [P2] [confidence:0.91] The remaining polish/readability pass still had three concrete gaps: authored hitboxes were not explicitly socket-anchored in move data, there was no live gameplay overlay for sockets/hurtboxes/hitboxes while tuning the new rig-driven collision, and the open arena plus debug telemetry path still buried validation under visual clutter and noisy network spam.
  - Evidence: 2026-03-20 follow-up audit across `client/src/combat/moves.ts`, `client/src/combat/hitResolver.ts`, `client/src/game/Arena.tsx`, `client/src/game/GameManager.tsx`, `server/routes.ts`, and live Playwright smoke showed root/inferred hitbox anchors in authored content, no in-scene combat box overlay, cluttered open-platform supports/decor relative to fighter scale, a hit-only telemetry schema on the server, and per-frame debug input telemetry overwhelming local validation.
  - Owner: Codex
  - Linked Fix: P-005
- [x] F-006 [status:verified] [P3] [confidence:0.9] After the seam rebuild, the current move table and arena roster still had two content-level polish gaps: several authored move IDs still depended on generic/shared presentation clips, and stage readability tuning was still mostly a single baseline instead of something distinct per arena theme.
  - Evidence: 2026-03-20 follow-up audit across `client/src/game/stickfigure/movePresentation.ts`, `client/src/combat/moves.ts`, `client/src/game/Arena.tsx`, and `client/src/game/arenas/index.ts` showed a small bespoke clip set with broad aliasing, plus shared open/contained material behavior that did not yet materially differentiate Sunset Bloom, Aurora Flux, and Containment under the closer 2.5D camera.
  - Owner: Codex
  - Linked Fix: P-006

## Fix Log
- [x] P-001 [status:verified] Reworked the runtime/store boundary so `matchRuntime` now owns authoritative combat state, publishes `RuntimeFrameSnapshot` + `CombatEvent` payloads, and `useFighting` ingests them as a mirror/HUD store via `applyRuntimeFrame` and `applyCombatEvents`.
  - Addresses: F-001
  - Evidence: `client/src/game/combatPresentation.ts`, `client/src/game/matchRuntime.ts`, `client/src/lib/stores/useFighting.tsx`, `client/src/game/GameManager.tsx`, `client/src/game/combatBridge.ts`; `npm run check`; `npm test -- --runInBand`.
- [x] P-002 [status:verified] Added active-frame gating, defender hurt regions, blockstun/hitstun writes, move-instance hit identity, and a narrowed combat plane so collision now lines up with authored move timing and readable spacing.
  - Addresses: F-002
  - Evidence: `client/src/combat/hitResolver.ts`, `client/src/combat/stateMachine.ts`, `client/src/game/matchRuntime.ts`, `tests/client/hit-resolver.test.ts`; `npm run check`; `npm test -- --runInBand`.
- [x] P-003 [status:verified] Replaced the boolean/generic attack animation path with a move-presentation sampler and rig-driven renderer so `StickFigure` samples poses from `moveId` + `moveFrame` and `Limbs` only applies sampled joint state.
  - Addresses: F-003
  - Evidence: `client/src/game/stickfigure/movePresentation.ts`, `client/src/game/StickFigure.tsx`, `client/src/game/stickfigure/Limbs.tsx`, `client/src/game/GameManager.tsx`; `npm run check`.
- [x] P-004 [status:verified] Reopened the seam audit and finished the remaining high-value fixes: shared the authored pose sampler with collision so hit centers and default hurt regions follow a normalized rig, surfaced runtime `tech` results as combat events with presentation pulses, and demoted the store’s legacy damage/block/dodge helpers to raw mirror behavior instead of a second combat model.
  - Addresses: F-004
  - Evidence: `client/src/combat/hitResolver.ts`, `client/src/game/stickfigure/movePresentation.ts`, `client/src/game/matchRuntime.ts`, `client/src/game/StickFigure.tsx`, `client/src/lib/stores/useFighting.tsx`, `tests/client/fighting-store.test.ts`; `npm run check`; `npm test -- --runInBand`.
- [x] P-005 [status:verified] Finished the requested content/polish slice: all authored move hitboxes now declare explicit sockets, collision and rendering share exported combat spatial samples, a live `CombatDebugOverlay` renders sockets/hurtboxes/hitboxes in-match, the open arena was stripped back around a clearer combat lane, and debug telemetry was repaired and throttled so local validation no longer drowns in 422/flood noise.
  - Addresses: F-005
  - Evidence: `client/src/combat/types.ts`, `client/src/combat/moves.ts`, `client/src/combat/hitResolver.ts`, `client/src/game/CombatDebugOverlay.tsx`, `client/src/game/GameManager.tsx`, `client/src/game/Arena.tsx`, `client/src/game/matchRuntime.ts`, `server/telemetry.ts`, `server/routes.ts`, `tests/client/hit-resolver.test.ts`, `tests/server/telemetry-routes.test.ts`; `npm run check`; `npm test -- --runInBand`; Playwright smoke on 2026-03-20 around 02:23-02:24 EDT.
- [x] P-006 [status:verified] Finished the residual content pass by giving the remaining authored hero/villain moves bespoke presentation clips, exporting clip-resolution helpers so clip coverage is testable, and adding per-theme stage readability tuning for Sunset Bloom, Aurora Flux, and Containment instead of one shared arena baseline.
  - Addresses: F-006
  - Evidence: `client/src/game/stickfigure/movePresentation.ts`, `client/src/game/Arena.tsx`, `client/src/game/arenas/index.ts`, `tests/client/presentation-polish.test.ts`; `npm run check`; `npm test -- --runInBand`; Playwright smoke across all three arena themes on 2026-03-20 around 02:50-02:52 EDT.

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-03-20 02:49 EDT pass after the move-clip expansion and per-arena tuning additions
- [x] V-002 [status:verified] No dedicated lint script exists in `package.json`; typecheck is the repository’s static-analysis gate.
  - Evidence: 2026-03-19 23:20 EDT pass; verified by `package.json` audit that no lint script exists, so no runnable lint command was skipped
- [x] V-003 [status:verified] `npm test -- --runInBand`
  - Evidence: 2026-03-20 02:49 EDT final pass, 21/21 tests green including new authored-move clip coverage and arena-theme tuning coverage
- [x] V-004 [status:verified] Added focused smoke coverage for the rebuilt seam instead of a browser e2e harness that does not exist in the repo.
  - Evidence: 2026-03-20 02:49 EDT pass; `tests/client/fighting-store.test.ts`, `tests/client/hit-resolver.test.ts`, `tests/server/telemetry-routes.test.ts`, and `tests/client/presentation-polish.test.ts` cover runtime snapshot ingest, raw mirror-store helpers, slot-scoped tech events, active-frame gating, explicit socket anchors, full authored-move presentation mapping across the current roster, and stage-specific arena tuning in the final `npm test -- --runInBand` run
- [x] V-005 [status:verified] Playwright smoke on the local dev server validated the three arena themes and the richer move-presentation path after the content pass.
  - Evidence: 2026-03-20 02:50-02:52 EDT browser pass on `http://127.0.0.1:3000` exercised Sunset Bloom, Aurora Flux, and Containment Arena in live matches with debug HUD enabled, captured readable screenshots for each tuned stage, confirmed `hero_jab_1` still surfaced through live move state after an input burst, and showed no new console/network failures beyond the pre-existing unsigned-in `401 /api/auth/me`, guest `404 /api/economy/:profileId`, and repeated scene-swap `THREE.WebGLRenderer: Context Lost.` logs.

## Residual Risks
- [x] R-001 [status:accepted_risk] Unsigned-in browser smoke still produces the pre-existing `401 /api/auth/me` and guest `404 /api/economy/:profileId` noise.
  - Rationale: These requests are unrelated to the combat presentation/content path and did not block validation, but they still lower the signal-to-noise ratio of frontend smoke runs.
  - Owner: Dave/Codex follow-up
  - Follow-up trigger/date: Next auth/economy guest-mode cleanup sprint
- [x] R-002 [status:accepted_risk] Menu/lobby-to-match scene swaps still log repeated `THREE.WebGLRenderer: Context Lost.` messages during browser smoke.
  - Rationale: The logs appear when the menu preview renderers are torn down and replaced by the gameplay scene. They are noisy but do not break the match flow or the new combat presentation path.
  - Owner: Dave/Codex follow-up
  - Follow-up trigger/date: Next rendering lifecycle cleanup pass if scene-transition noise becomes worth the engineering cost

## Change Log
- 2026-03-19T22:52:28: Checklist initialized.
- 2026-03-19T23:20:00: Discovery completed; runtime/store boundary rebuilt, pose-driven presentation added, client validation expanded, and final type/test passes recorded.
- 2026-03-20T01:55:00: Reopened the seam audit; finished socket-driven collision, surfaced runtime tech events to presentation, simplified legacy store helper behavior, and reran the full validation suite.
- 2026-03-20T02:20:00: Completed the requested polish/readability sprint: authored explicit hitbox sockets, added live combat box overlays, cleaned up the open arena composition, repaired the mixed-event telemetry API, throttled debug input telemetry, and reran static, test, and Playwright validation.
- 2026-03-20T02:25:00: Finalized the telemetry polish by making input telemetry change-driven plus rate-limited, reran static/tests, and reran the live browser smoke on the true final code state.
- 2026-03-20T02:53:00: Closed the remaining content residuals by adding bespoke clips for the rest of the current authored move table, introducing per-theme arena tuning for Sunset Bloom/Aurora Flux/Containment, adding focused coverage in `tests/client/presentation-polish.test.ts`, and rerunning static, automated, and browser validation.
