# StickBrawler Delivery Roadmap

## Vision
Build a polished, replayable stick-figure arena fighter that keeps HP bars but borrows the depth, responsiveness, and spectacle of Smash-style games. The experience should support deterministic simulation, rich audio/visual polish, multiple modes, persistent progression, and a secure backend.

## Guiding Pillars
- **Combat Fidelity:** Startup/active/recovery frames, hit-stun, DI-like knockback, combos, and guard mechanics make every exchange intentional.
- **Deterministic Engine:** A fixed-step simulation, ECS-style state, and command/event bus keep gameplay authoritative, testable, and multiplayer-ready.
- **Expressive Presentation:** Synced animation/VFX/audio layers (smears, camera shake, threshold SFX) ensure satisfying feedback.
- **Content & Modes:** Distinct fighters/AI personalities, unlocks, and multiple modes (best-of-X, local 2P, training, challenge tower) drive replayability.
- **Operational Maturity:** Persistent storage via Drizzle/Postgres, CI/tests/analytics, and performance instrumentation keep the game stable in production.

## Execution Order (prioritized for high-quality combat)
1. **Combat Systems & Move Data**
   - Authoritative move definitions (startup/active/recovery, cancel rules, hitbox groups).
   - Frame-accurate combo graph (light → medium → finisher, air vs ground chains).
   - Hit-stun, juggle gravity, DI-like directional influence, and knockback scaling tied to HP remaining.
2. **Movement & Physics Fidelity**
   - Capsule collisions, platform drop-through, wall bounce, tech rolls, and fast-fall.
   - Consistent jump arcs, gravity tuning, hit-lag, and camera smoothing tied to impulses.
3. **Defensive & Resource Systems**
   - Guard meter with regen/guard-break, perfect block/parry windows, dodge i-frames + cooldowns.
   - Stamina hooks for specials, revenge/super meter, and risk/reward tuning for grapples.
4. **Presentation & Feedback**
   - Tweened stick poses, smear frames, shader trails, screen shake, crowd callouts.
   - Per-move SFX layering (whoosh/impact/crowd) and damage-threshold VFX.
5. **AI, Content, and Modes**
   - CPU archetypes with behavior trees, unlockable palettes/moves, training room & challenge tower.
6. **Backend/Engine Foundation**
   - Deterministic simulation core, match validation, persistent services, instrumentation.
7. **Stability, Tooling, and CI**
   - Automated tests (combat + physics), lint/format, GitHub Actions, runtime perf dashboards.

## Combat Systems Tasks (highest priority)
- [x] Define `MoveDef` schema (frames, hitboxes, cancel windows, knockback curves, on-hit effects).
- [x] Build combat state machine (per-fighter action states, buffers, combo routing, priority rules).
- [x] Implement hit resolution pipeline (hurtbox queries, hit-stun timers, DI, juggle decay).
- [x] Add resource meters (stamina/guard/special) with gain/spend hooks and HUD exposure.
- [x] Tie guard/stamina costs into block/dodge/guard-break behaviour with chip damage + recovery windows.
- [ ] Extend CPU combat logic to respect the same resource gates/state machine.
- [ ] Surface combo buffers, cancels, and DI to deterministic replay/back-end validation.

## Movement & Physics Tasks
- [ ] Replace X/Z clamping with capsule collision + arena bounds + wall bounce.
- [ ] Implement platform drop-through, fast-fall, and ledge/tech states.
- [ ] Add hit-lag and impulse-based camera smoothing tied to knockback.

## Defensive Systems Tasks
- [ ] Guard meter with regen, guard-break stun, and UI feedback.
- [ ] Perfect block/parry windows that refund stamina or open counter windows.
- [ ] Dodge/roll with i-frames, cooldown, and punishable recovery frames.

## Presentation & Feedback Tasks
- [ ] Animation rig data (idle/run/jump/attack) with tween helpers + smear frames.
- [ ] VFX manager triggered by combat events (hit sparks, trails, screen shake).
- [ ] Layered audio cues (movement, swings, impacts, crowd).

## AI, Content, and Modes Tasks
- [ ] CPU archetypes with modular behavior trees (rushdown, zoner, grappler).
- [ ] Unlock progression (palettes, move variants) plus training room + challenge tower.
- [ ] Local 2P/shared input bindings and tutorials/onboarding.

## Backend & Engine Tasks (supporting combat work)
- [x] Replace `MemStorage` with Drizzle-powered repository (Neon/Postgres via `@neondatabase/serverless`).
- [x] Add `.env.example` + runtime validation for `DATABASE_URL` and future secrets.
- [x] Introduce `services/engine` package with fixed-step loop + command bus scaffold.
- [x] Refactor Express routes to use new storage + validation (Zod).
- [ ] Add score signing/anti-cheat hook (server recomputes based on submitted match events once engine side is ready).
- [x] Create smoke tests for API + storage (blocked until npm/esbuild mismatch is resolved).
- [ ] Feed combat telemetry (hits, combo counts, DI) into backend match summaries for validation/leaderboards.

## Combat & Physics Backlog (queued)
- [ ] Build ECS components for `Transform`, `FighterState`, `Hitbox`, `Hurtbox`, `InputBuffer`.
- [ ] Integrate guard meter + parry windows with visual/audio feedback.
- [x] Implement capsule collision bounds + hit-lag timers to prep deterministic replays.
- [ ] Add tech rolls, fast-fall, and DI visualizers.

## Presentation Backlog
- [ ] Animation rig data (JSON) for idle/run/jump/attack, with tween helpers.
- [ ] VFX manager triggered by combat events.

## Modes & Content Backlog
- [ ] Shared-input/local 2P binding map + menu UX.
- [ ] Training room HUD (frame data, hitbox overlay).
- [ ] Challenge tower progression + cosmetic unlock tables.

## Economy & Cosmetics
- [ ] Coin economy that rewards damage output, combos, and match performance.
- [ ] Cosmetic catalog (themes, styles, accessories) with clear rarity/cost tiers.
- [ ] Unlock/purchase flow tied to persistent storage and customization UI.

## Stability & Tooling Backlog
- [ ] Vitest suites for physics/combat math.
- [ ] GitHub Actions pipeline (lint, test, build).
- [ ] Runtime perf logging (frame time, draw calls).

## Status Log
- **2025-11-10** – Initial roadmap created: documented pillars, execution order, and backend tasks. _Next: implement persistent storage + command bus scaffolding._
- **2025-11-10** – Backend groundwork: env template/validation added, Neon/Drizzle DB connector wired, storage now persists scores with graceful in-memory fallback, and score routes validate input via Zod. _Next: design engine/command bus scaffold + API smoke tests._
- **2025-11-10** – Engine scaffolding: added shared deterministic engine package, server runtime wrapper, and first Node test to validate command/event flow. _Next: introduce API smoke tests + anti-cheat signing hook._
- **2025-11-10** – API smoke tests authored (engine + HTTP), added `storage.reset()` helper, and introduced `supertest`. Running `npm test` still fails because tsx/esbuild need reinstall (host 0.23.1 vs binary 0.25.0); unblock by rerunning `npm ci` once npm CLI issue (“Exit handler never called”) is resolved.
- **2025-11-10** – Combat architecture scaffolding shipped: canonical move schema, authored move set, state machine, hit resolver, and docs describing integration path. _Next: connect CombatStateMachine + resolveHits into GameManager and surface meters in HUD._
- **2025-11-10** – Combat loop now driven by the state machine: GameManager consumes authored moves, frame-accurate hits, and updates guard/stamina/special meters surfaced to the HUD/store. npm/esbuild install issues remain, so automated tests still cannot run until `npm ci` succeeds.
- **2025-11-10** – Defensive depth pass: guard/stamina costs now fuel blocking/dodging, chip damage drains guard with guard-break punish windows, and meters sync bi-directionally between the state machine and HUD. Next up: teach the CPU to obey the same resource gates and push combo/DI data into the backend.
- **2025-11-10** – CPU combat now runs through the same state machine/move data, including guard-drain, dodge stamina costs, and authored hitboxes. Remaining work: emit combo/DI telemetry to the backend and unblock npm/esbuild so regression tests can run.
- **2025-11-10** – Ground physics upgrade: capsule bounds, friction, and hit-lag timers now drive spacing and knockback. TODO: extend capsule constraints to CPU AI inputs and feed telemetry into backend validation once npm/esbuild testing is restored.
- **2025-11-10** – Ground physics upgrade: player movement now uses capsule bounds, bounce friction, and hit-lag timers so spacing/knockback feel intentional. TODO: extend the same collision logic to CPU movement and feed telemetry into score signing once npm/esbuild is fixed.
