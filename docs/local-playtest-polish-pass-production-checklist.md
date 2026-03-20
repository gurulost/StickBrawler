# Local Playtest Polish Pass Checklist

Source of truth checklist for a large/intense task.

## Metadata
- Created: 2026-03-20T13:21:07
- Last Updated: 2026-03-20T13:41:30
- Workspace: /Users/davedixon/Documents/GitHub/StickBrawler
- Checklist Doc: /Users/davedixon/Documents/GitHub/StickBrawler/docs/local-playtest-polish-pass-production-checklist.md

## Scope
- [x] Q-000 [status:verified] Improve local-play readability, add first-fight onboarding for the intent system, and tune the first move slice without reopening online scope.
  - Success criteria: fighters read larger in frame, stage/HUD compete less with silhouettes, a new player sees the intent grammar in-fight, and the opener moves/reactions feel sharper on first contact.

## Sign-off Gate
- [x] G-001 [status:verified] All queued work, findings, fixes, and validations are complete.
- [x] G-002 [status:verified] All findings are resolved or marked `accepted_risk` with rationale and owner.
- [x] G-003 [status:verified] Required validation suite has been rerun on the final code state.
- [x] G-004 [status:verified] Residual risks and follow-ups are documented.

## Rerun Matrix
- [x] G-010 [status:verified] Code edits after the first smoke pass triggered a rerun of affected validation items.
- [x] G-011 [status:verified] Final sign-off happened only after rerunning `npm run check`, `npm test`, `npm run build`, and browser smoke after the last UI edit.

## Audit Queue
- [x] Q-001 [status:verified] Create checklist and baseline scope.
- [x] Q-002 [status:verified] Audited camera framing, arena presentation tuning, HUD footprint, onboarding surfaces, and first-slice move/presentation timing.
- [x] Q-003 [status:verified] Implemented readability, onboarding, and feel-tuning changes for the local slice.
- [x] Q-004 [status:verified] Expanded automated coverage for tighter camera framing, updated arena tuning, primer state, and retimed hit windows.
- [x] Q-005 [status:verified] Ran full validation suite plus in-browser smoke for menu -> lobby -> fight.
- [x] Q-006 [status:verified] Completed final pass after the post-smoke primer footprint adjustment.

## Findings Log
- [x] F-001 [status:fixed] [P2] [confidence:0.90] The local playtest slice still had three polish gaps: the combat frame sat too far back, the arena/HUD still competed with the stick-figure silhouettes, and the intent system was only taught inside optional help panels.
  - Evidence: audit of `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/combatReadability.ts`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/Arena.tsx`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/UI.tsx`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/arenas/index.ts`, and browser smoke on 2026-03-20.
  - Owner: Codex
  - Linked Fix: P-001

## Fix Log
- [x] P-001 [status:fixed] Tightened the combat camera and arena readability, added an in-fight combat primer backed by the shared control guide, and retimed the opener move slice plus landing/parry/dodge presentation beats for stronger first-contact feel.
  - Addresses: F-001
  - Evidence: `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/App.tsx`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/combatReadability.ts`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/Arena.tsx`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/arenas/index.ts`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/input/controlGuide.ts`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/lib/stores/useControls.tsx`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/UI.tsx`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/combat/moves.ts`, `/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/movePresentation.ts`, and green validation in `V-001` through `V-004`.

## Validation Log
- [x] V-001 [status:verified] `npm run check`
  - Evidence: 2026-03-20 13:39 ET pass, rerun 2026-03-20 13:40 ET pass after the final primer layout edit.
- [x] V-002 [status:verified] `npm test`
  - Evidence: 2026-03-20 13:37 ET pass (40 tests), rerun 2026-03-20 13:40 ET pass (40 tests) after the final primer layout edit.
- [x] V-003 [status:verified] `npm run build`
  - Evidence: 2026-03-20 13:37 ET pass, rerun 2026-03-20 13:41 ET pass after the final primer layout edit.
- [x] V-004 [status:verified] Playwright smoke on `http://127.0.0.1:3000`
  - Evidence: 2026-03-20 13:38 ET menu -> lobby -> fight verified the primer appears in-fight, controls remain truthful, and local-only flow is intact; 2026-03-20 13:40 ET follow-up confirmed the slimmer primer layout and live primer progress state.

## Residual Risks
- [x] R-001 [status:accepted_risk] The primer uses runtime state heuristics to infer “move / attack / defend / grab” progress, so edge-case inputs could occasionally fail to mark a step complete even when the player understands the action.
  - Rationale: Good enough for the local playtest slice, and much better than static hidden-only help. Refine only if playtesters report confusion or stalled primer completion.
  - Owner: Gameplay polish backlog
  - Follow-up trigger/date: Revisit after the first external local playtest session.
- [x] R-002 [status:accepted_risk] Existing non-blocking dev/build noise remains outside this pass: `401 /api/auth/me`, `404 /api/economy/...` in guest mode, baseline-browser-mapping staleness, unresolved runtime texture warning, and the pre-existing sourcemap warning in `client/src/components/ui/dialog.tsx`.
  - Rationale: None of these issues block the local combat/readability/onboarding slice targeted here.
  - Owner: Platform cleanup backlog
  - Follow-up trigger/date: Triage alongside the next platform cleanup pass.

## Change Log
- 2026-03-20T13:21:07: Checklist initialized.
- 2026-03-20T13:28:00: Audited readability, onboarding, and first-slice feel targets.
- 2026-03-20T13:36:00: Implemented tighter combat framing, lower-noise arena tuning, in-fight combat primer, and opener move/presentation tuning.
- 2026-03-20T13:40:00: Trimmed the primer footprint after browser smoke and reran validation on the final code state.
