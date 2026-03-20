# Combat presentation rebuild Checklist

Source of truth checklist for a large/intense task.

## Metadata
- Created: 2026-03-19T22:52:28
- Last Updated: 2026-03-20T02:25:00
- Workspace: /Users/davedixon/Documents/GitHub/StickBrawler
- Checklist Doc: /Users/davedixon/Documents/GitHub/StickBrawler/docs/combat-presentation-rebuild-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Rebuild the combat runtime/store/render boundary around authoritative `moveId` + `moveFrame`, add active-frame/body-region hit resolution, tighten the fight to a 2.5D presentation band, and ship a pose-driven vertical slice for locomotion plus core authored moves without restarting the whole game.

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

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-03-20 02:24 EDT final pass after the final telemetry sampling adjustment
- [x] V-002 [status:verified] No dedicated lint script exists in `package.json`; typecheck is the repository’s static-analysis gate.
  - Evidence: 2026-03-19 23:20 EDT pass; verified by `package.json` audit that no lint script exists, so no runnable lint command was skipped
- [x] V-003 [status:verified] `npm test -- --runInBand`
  - Evidence: 2026-03-20 02:24 EDT final pass, 17/17 tests green including socket-anchor coverage and mixed telemetry-route coverage
- [x] V-004 [status:verified] Added focused smoke coverage for the rebuilt seam instead of a browser e2e harness that does not exist in the repo.
  - Evidence: 2026-03-20 02:19 EDT pass; `tests/client/fighting-store.test.ts`, `tests/client/hit-resolver.test.ts`, and `tests/server/telemetry-routes.test.ts` cover runtime snapshot ingest, raw mirror-store helpers, slot-scoped tech events, active-frame gating, explicit socket anchors, spatial sampling, and mixed telemetry payload validation in the final `npm test -- --runInBand` run
- [x] V-005 [status:verified] Playwright smoke on the local dev server validated the open-arena readability pass and live debug overlay after the final telemetry fixes.
  - Evidence: 2026-03-20 02:23-02:24 EDT browser pass on `http://127.0.0.1:3000` showed the debug HUD active with no new console errors beyond the pre-existing unsigned-in `401 /api/auth/me` and guest `404 /api/economy/:profileId`, telemetry summary updating without `422 /api/telemetry`, and the dev server reduced to coarse `204 /api/telemetry` sampling instead of the prior frame-by-frame failure flood while the viewport remained readable with lighter supports and visible combat-box markers.

## Residual Risks
- [x] R-001 [status:accepted_risk] The pose-driven presentation layer currently covers a strong vertical slice plus aliases, not a fully bespoke clip for every authored move in the roster.
  - Rationale: The rebuild intentionally prioritized the runtime/store/render seam and the 8-12 core verbs path first. Additional authored clips can now land on a stable contract instead of a broken one.
  - Owner: Dave/Codex follow-up
  - Follow-up trigger/date: When expanding roster polish beyond the current hero/villain core verbs
- [x] R-002 [status:accepted_risk] The open arena has now had a dedicated readability pass, but arena art still is not bespoke per stage and the contained arena has not had the same composition tuning depth.
  - Rationale: The biggest live readability problem was the open-platform clutter around the 2.5D lane, and that has been materially reduced. Further arena work is now diminishing returns rather than a blocker.
  - Owner: Dave/Codex follow-up
  - Follow-up trigger/date: Next per-arena art/presentation sprint if the team wants stage-specific polish beyond the current gameplay readability baseline

## Change Log
- 2026-03-19T22:52:28: Checklist initialized.
- 2026-03-19T23:20:00: Discovery completed; runtime/store boundary rebuilt, pose-driven presentation added, client validation expanded, and final type/test passes recorded.
- 2026-03-20T01:55:00: Reopened the seam audit; finished socket-driven collision, surfaced runtime tech events to presentation, simplified legacy store helper behavior, and reran the full validation suite.
- 2026-03-20T02:20:00: Completed the requested polish/readability sprint: authored explicit hitbox sockets, added live combat box overlays, cleaned up the open arena composition, repaired the mixed-event telemetry API, throttled debug input telemetry, and reran static, test, and Playwright validation.
- 2026-03-20T02:25:00: Finalized the telemetry polish by making input telemetry change-driven plus rate-limited, reran static/tests, and reran the live browser smoke on the true final code state.
