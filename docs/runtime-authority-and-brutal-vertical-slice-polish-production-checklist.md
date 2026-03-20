# Runtime authority and brutal vertical slice polish Checklist

Source of truth checklist for a large/intense task.

## Metadata
- Created: 2026-03-20T02:59:47
- Last Updated: 2026-03-20T05:39:07-0400
- Workspace: /Users/davedixon/Documents/GitHub/StickBrawler
- Checklist Doc: /Users/davedixon/Documents/GitHub/StickBrawler/docs/runtime-authority-and-brutal-vertical-slice-polish-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Capture explicit scope, constraints, and success criteria.

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
- [x] F-001 [status:verified] [P1] [confidence:0.95] Runtime/store combat authority was still split between `client/src/game/matchRuntime.ts` and `client/src/lib/stores/useFighting.tsx`.
  - Evidence: audit found authoritative mutators such as `damagePlayer`, `damageCPU`, cooldown setters, and meter setters still exposed in the store and still invoked by runtime.
  - Owner: Codex
  - Linked Fix: P-001
- [x] F-002 [status:verified] [P2] [confidence:0.82] The first live slice pass still framed combat too wide and let open-arena geometry compete with fighter silhouettes.
  - Evidence: Playwright screenshots on 2026-03-20 showed the center platform and side props occupying too much of the frame relative to the fighters.
  - Owner: Codex
  - Linked Fix: P-002
- [x] F-003 [status:verified] [P3] [confidence:0.84] Debug overlays were surfacing neutral/no-signal state, which kept dead panels on top of the fight.
  - Evidence: Playwright smoke showed `InputOverlay` remaining visible with no actionable input data.
  - Owner: Codex
  - Linked Fix: P-003
- [x] F-004 [status:verified] [P1] [confidence:0.9] The first slice still had a visual-contact drift: hit resolution sampled a partial pose transform stack while `StickFigure` rendered trails/impact accents from torso-relative placeholders.
  - Evidence: `client/src/combat/hitResolver.ts` ignored authored `rootOffset` and `bodyScale` when deriving sockets, while `client/src/game/StickFigure.tsx` placed trails, hit sparks, block pulses, and parry cuts at static torso offsets instead of live socket/hitbox positions.
  - Owner: Codex
  - Linked Fix: P-004
- [x] F-005 [status:verified] [P1] [confidence:0.92] The initial debug stack still made long tuning passes slower than necessary because overlay layers were all-or-nothing, confirm markers were not derived from move history, and there was no integrated review buffer for stepping back through the last exchange.
  - Evidence: pre-pass UI only exposed coarse overlay/timeline primitives, so answering "why did that hit / whiff / get blocked?" required mentally stitching multiple panels together and could not scrub into recent runtime frames.
  - Owner: Codex
  - Linked Fix: P-005
- [x] F-006 [status:verified] [P1] [confidence:0.91] The arena still read like a shallow 3D space instead of a committed 2.5D combat lane because depth drift, camera tracking, and stage dressing were not yet using the same readability rules.
  - Evidence: pre-pass camera logic still tracked raw midpoint `z`, runtime allowed comparatively loose depth drift, and open/contained arenas left too much prop weight inside the silhouette layer.
  - Owner: Codex
  - Linked Fix: P-006
- [x] F-007 [status:verified] [P1] [confidence:0.89] The first vertical slice still moved like polished interpolation rather than a distinctive ink-calligraphy fighter language because anticipation/compression, release, defensive silhouettes, and line-weight response were not yet exaggerated enough across the shared move timeline.
  - Evidence: authored clips and procedural locomotion already exposed `bodyScale`, `rootOffset`, `bodyRotation`, `smear`, `trailIntensity`, and `lineWeight`, but the browser slice still read as smooth generic motion instead of deliberate brush-stroke timing, especially in `hero_jab_1`, `hero_tilt_side`, `hero_launcher`, `landing`, `block`, and `parry`.
  - Owner: Codex
  - Linked Fix: P-007
- [x] F-008 [status:verified] [P1] [confidence:0.93] The remaining tuning workflow gap was still real: there was no deterministic way to force exact slice actions in-engine, and the raw input path still misrouted key authored directions badly enough that CPU-heavy preset attempts collapsed into the wrong moves.
  - Evidence: Playwright keyboard synthesis remained unreliable for balance loops, `use-player-intents.ts` still overloaded one direction model across movement and move selection, and early training-injector smoke showed `vill_guard_break_big` collapsing into `vill_low_stab` until per-step intent overrides and CPU-slot override routing were added.
  - Owner: Codex
  - Linked Fix: P-008

## Fix Log
- [x] P-001 [status:verified] Runtime now owns combat truth; store mirrors runtime snapshots/events instead of authoring health, damage, cooldown, meter, guard-break, and KO state.
  - Addresses: F-001
  - Evidence: `client/src/game/matchRuntime.ts`, `client/src/lib/stores/useFighting.tsx`, `tests/client/fighting-store.test.ts`
- [x] P-002 [status:verified] Tightened the gameplay camera and reduced open-arena visual weight so the combat plane reads closer and cleaner.
  - Addresses: F-002
  - Evidence: `client/src/game/GameManager.tsx`, `client/src/game/arenas/index.ts`, Playwright viewport smoke on 2026-03-20
- [x] P-003 [status:verified] Added timeline/cards/playback tooling and filtered neutral debug overlays so tuning UI stays high-signal.
  - Addresses: F-003
  - Evidence: `client/src/game/CombatTimelineOverlay.tsx`, `client/src/game/CombatDebugOverlay.tsx`, `client/src/game/InputOverlay.tsx`, `client/src/lib/stores/useControls.tsx`, `client/src/game/UI.tsx`
- [x] P-004 [status:verified] Aligned the first slice’s presentation and collision around the same socket timeline by sampling authored pose transforms in the resolver layer and driving `StickFigure` accents from live sockets/active hitboxes plus explicit slice metadata.
  - Addresses: F-004
  - Evidence: `client/src/combat/hitResolver.ts`, `client/src/game/StickFigure.tsx`, `client/src/game/stickfigure/movePresentation.ts`, `tests/client/hit-resolver.test.ts`, `tests/client/presentation-polish.test.ts`
- [x] P-005 [status:verified] Built a real combat-inspection workflow with granular overlay toggles, focused-fighter frame-data markers, rolling review history, and deterministic browser hooks so tuning can answer hit/whiff/block questions directly from runtime truth.
  - Addresses: F-005
  - Evidence: `client/src/lib/stores/useCombatDebug.ts`, `client/src/game/CombatDebugPanel.tsx`, `client/src/game/combatDebug.ts`, `client/src/game/CombatTimelineOverlay.tsx`, `client/src/game/CombatDebugOverlay.tsx`, `client/src/game/GameManager.tsx`, `tests/client/combat-debug.test.ts`, `artifacts/combat-debug-panel-final.png`
- [x] P-006 [status:verified] Finished the combat-plane readability pass by flattening depth movement in runtime, moving the camera to a lane-first rig, and pulling stage dressing behind the silhouette layer in both open and contained arenas.
  - Addresses: F-006
  - Evidence: `client/src/game/combatReadability.ts`, `client/src/game/matchRuntime.ts`, `client/src/game/GameManager.tsx`, `client/src/game/Arena.tsx`, `client/src/game/arenas/index.ts`, `client/src/App.tsx`, `tests/client/combat-readability.test.ts`, `tests/server/runtime.test.ts`, `artifacts/combat-plane-readability-final.png`
- [x] P-007 [status:verified] Re-authored the first slice around an ink-calligraphy timing language and amplified the render response so motion beats now communicate through compression/release, compact defensive shells, slash-shaped trails, parry cuts, landing rebound, and whole-figure line-weight spikes.
  - Addresses: F-007
  - Evidence: `client/src/game/stickfigure/movePresentation.ts`, `client/src/game/StickFigure.tsx`, `client/src/game/stickfigure/Limbs.tsx`, `client/src/game/stickfigure/Torso.tsx`, `client/src/game/stickfigure/Head.tsx`, `tests/client/presentation-polish.test.ts`
- [x] P-008 [status:verified] Finished the deterministic tuning seam with a combat training injector, split movement-direction vs. action-direction routing cleanly, and taught solo-mode runtime to honor scripted CPU-slot overrides so exact hero/villain slice moves can be forced and stepped without fake move IDs.
  - Addresses: F-008
  - Evidence: `client/src/lib/combatTraining.ts`, `client/src/lib/stores/useControls.tsx`, `client/src/game/GameManager.tsx`, `client/src/game/CombatDebugPanel.tsx`, `client/src/input/intentDirection.ts`, `client/src/hooks/use-player-intents.ts`, `client/src/game/matchRuntime.ts`, `tests/client/combat-training.test.ts`

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-03-20 05:00 -0400 `tsc` passed on the final code state after the motion-language authoring/render pass.
- [x] V-002 [status:verified] `npm run lint`
  - Evidence: 2026-03-20 04:03 -0400 skipped; `package.json` has no lint script, so there is no configured lint validation to run for this repo.
- [x] V-003 [status:verified] `npm test -- --runInBand`
  - Evidence: 2026-03-20 05:37 -0400 passed with 37/37 tests green, including the new deterministic training coverage in `tests/client/combat-training.test.ts` alongside the existing motion-language, combat-readability, combat-debug, authority, resolver, and runtime coverage.
- [x] V-004 [status:verified] Playwright live smoke on `http://127.0.0.1:3000`
  - Evidence: 2026-03-20 05:39 -0400 fresh browser pass on paused solo matches verified the new injector end-to-end: `Hero Launcher` produced `player.moveId = "hero_launcher"` after one stepped frame, and `Vill Guard Break` produced `cpu.moveId = "vill_guard_break_big"` after one stepped frame in solo mode through the training panel/browser hooks; no new browser failures appeared beyond the known guest-mode `401 /api/auth/me` noise.
- [x] V-005 [status:verified] Checklist sign-off validator
  - Evidence: 2026-03-20 05:39 -0400 `python3 "$HOME/.codex/skills/intense-job-checklist/scripts/validate_checklist.py" "/Users/davedixon/Documents/GitHub/StickBrawler/docs/runtime-authority-and-brutal-vertical-slice-polish-production-checklist.md" --require-signoff` passed with 0 warnings and 0 errors after the deterministic training-injector pass was logged.

## Residual Risks
- [x] R-001 [status:accepted_risk] Guest-mode console noise remains from unauthenticated `401 /api/auth/me`, `404 /api/economy/:profileId`, and scene-swap `THREE.WebGLRenderer: Context Lost.` logs.
  - Rationale: These predate the combat transition work and did not block the architecture handoff or slice validation.
  - Owner: Codex
  - Follow-up trigger/date: Address when doing a broader menu/auth polish pass.
- [x] R-002 [status:verified] Deterministic training injection now covers the former browser-input gap, including exact solo CPU-slot forcing for authored slice moves.
  - Rationale: This follow-up risk was closed by `P-008`; stepped tuning no longer depends on flaky browser key synthesis for the core hero/villain slice.
  - Owner: Codex
  - Follow-up trigger/date: Reopen only if a later balance workflow needs richer macro recording than the current preset/sequence hooks provide.

## Change Log
- 2026-03-20T02:59:47: Checklist initialized.
- 2026-03-20T03:35:20-0400: Completed runtime authority handoff, debug/timeline/playback tooling, slice-presentation tuning, automated validation, and Playwright smoke review.
- 2026-03-20T04:03:52-0400: Tightened the first combat slice by aligning resolver sockets with authored pose transforms and moving StickFigure trails/impact accents onto live socket/hitbox anchors; reran validation (`npm run check`, `npm test -- --runInBand`) and browser smoke.
- 2026-03-20T04:26:15-0400: Finished the debug-tooling stack with a rolling combat history store, focused inspector panel, confirm/whiff event synthesis, review-mode rendering, and deterministic `window.advanceTime` / `window.render_game_to_text` hooks; captured final browser artifacts for the live tuning workflow.
- 2026-03-20T04:27:21-0400: Reran `npm run check`, `npm test -- --runInBand`, and the checklist validator on the final debug-tooling state; all checks passed cleanly, with 29/29 automated tests green and sign-off validation at 0 warnings / 0 errors.
- 2026-03-20T04:40:02-0400: Finished the combat-plane/camera readability pass with a shared combat readability contract, flatter runtime depth motion, a lane-first camera rig, stage retuning for silhouette clarity, new readability regression tests, and final browser artifacts proving the flatter 2.5D read.
- 2026-03-20T04:41:24-0400: Reran the checklist validator after logging the combat-plane pass; sign-off remains clean with 0 warnings and 0 errors.
- 2026-03-20T05:07:20-0400: Logged the motion-language pass: re-authored the first slice toward an ink-calligraphy timing style, strengthened whole-figure line-weight/trail/parry rendering, expanded presentation-polish regression coverage, and reran `npm run check`, `npm test -- --runInBand`, plus live browser smoke on the updated slice.
- 2026-03-20T05:08:27-0400: Reran the checklist validator after logging the motion-language pass; sign-off remains clean with 0 warnings and 0 errors.
- 2026-03-20T05:39:07-0400: Logged the deterministic training-injector pass: added a combat training queue with browser hooks and inspector controls, split movement-direction vs. action-direction routing, enabled solo CPU-slot scripted override in runtime, expanded automated coverage with `tests/client/combat-training.test.ts`, reran `npm run check` and `npm test -- --runInBand`, and verified both `hero_launcher` and `vill_guard_break_big` in fresh Playwright solo-match smoke.
