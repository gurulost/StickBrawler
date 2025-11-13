### Combat Architecture Primer

- `types.ts` defines the canonical `MoveDefinition`, `HitboxDefinition`, `FighterCombatState`, and resource meters. Every mechanic (combo routing, DI, juggle decay) references these shared types so we can simulate fighters in the deterministic engine or inside React.
- `moves.ts` ships the first authored move set (`coreMoves`). Each move lists frame windows, hitboxes, meter hooks, cancel branches, and optional armor/air constraints. These values were tuned to feel Smash-like (fast startup lights, punishable heavies, aerial-only dive kick).
- `stateMachine.ts` contains `CombatStateMachine`, a frame-accurate controller that:
  1. Advances active moves and enforces cancel windows.
  2. Handles dodge invulnerability and hitstun/blockstun transitions.
  3. Clamps guard/stamina/special meters so HUD + backend can trust them.
- `hitResolver.ts` applies hitboxes to hurtboxes, computing damage, guard damage, knockback vectors, and hit-lag payloads. It’s deterministic and independent of React/Three so the backend can reuse it for anti-cheat.

Next integration steps:
1. Wire `CombatStateMachine` into `GameManager` in place of direct Zustand toggles.
2. Use `resolveHits` instead of `checkAttackHit` to calculate knockback and juggle decay.
3. Mirror combat state into the new deterministic engine so backend + replay share the same logic.
