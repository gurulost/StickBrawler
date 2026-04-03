# StickBrawler Elegance & Replayability Rubric

## Purpose
This document is the filter for post-vertical-slice work.

The goal is not "more stuff." The goal is to make the current combat slice more learnable, more varied, more replayable, and more memorable without diluting its clarity.

If a feature adds scope but does not deepen mastery, matchup texture, solo variety, or session pull, defer it.

## Product Standard
StickBrawler should feel elegant when a small number of systems create a large number of readable decisions and memorable moments.

That means:

- A new player can understand the control grammar quickly.
- A returning player can feel themselves improving intentionally.
- Solo matches do not all feel the same.
- The game gives a natural "one more round" prompt after a match.
- Big combat beats feel expensive and readable, not noisy.

## Hard Rules
- Prefer upgrading an existing seam over adding a parallel system.
- Every approved task must improve one primary pillar and at least one secondary pillar.
- Features that mainly add assets, menus, cosmetics, or debug surface area are not progress by default.
- Online, auth, leaderboard polish, menu art, and extra tooling stay deferred unless they directly unblock the current priority block.
- A feature that cannot be explained in one sentence from the player point of view is probably too broad.

## Core Pillars
### 1. Accessible Mastery
Players must be able to intentionally perform the game's key verbs, not merely stumble into them.

### 2. Match Variety With Identity
Fighters, CPUs, and stages must change the decisions a player makes, not just the visuals they look at.

### 3. Session Structure
The game should answer "what do I do next?" without relying on the player inventing their own loop.

### 4. Emotional Punctuation
A round needs highlight-worthy beats: parry, launcher, spike, guard break, comeback, KO.

### 5. Readability
The game should be easier to parse after the change than before it, even when the change adds depth.

### 6. Scope Efficiency
The best work reuses the deterministic runtime, intent grammar, authored move tables, and debug/training infrastructure that already exist.

## Greenlight Gates
Before implementation, every feature proposal must answer these questions.

1. Will a player feel the benefit inside the first three minutes or first two matches?
2. Does it change decisions, not just content quantity or polish surface?
3. Does it make solo play, replayability, or learning materially better?
4. Can it be taught or understood without exposing debug knowledge first?
5. Does it reuse the current runtime/store/content seams instead of introducing a parallel path?
6. Is there a clean acceptance test that proves the feature worked?

If the answer is "no" to two or more questions, simplify or defer the feature.

## Scoring Rubric
Score each proposal from `0` to `3` in each category.

| Category | 0 | 1 | 2 | 3 |
| --- | --- | --- | --- | --- |
| Learnability | Harder to understand | Neutral | Helps a little | Teaches key verbs clearly |
| Decision Depth | Cosmetic only | Small edge-case impact | Changes some choices | Changes core choices every match |
| Solo Variety | No solo impact | Slight variation | Noticeable variation | Opponents/runs feel distinct |
| Session Pull | No new loop | Small retention bump | Encourages rematch | Creates strong "one more round" pull |
| Readability & Feel | Adds noise | Neutral | Cleaner or punchier | Cleaner and more emotionally legible |
| Scope Efficiency | New system with low leverage | Some reuse | Good reuse | Multiplies existing systems cleanly |

### Interpretation
- `15-18`: Ship now. High-leverage work.
- `11-14`: Good candidate, but simplify aggressively.
- `7-10`: Backlog only if it supports a higher-scoring task.
- `0-6`: Defer.

No feature should ship if it scores `0` in `Learnability`, `Solo Variety`, or `Scope Efficiency` during the current phase.

## Current Scorecard
These are the default scores for the next obvious candidates, based on the current repo state.

| Candidate | Learnability | Decision Depth | Solo Variety | Session Pull | Readability & Feel | Scope Efficiency | Total | Call |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Training Mode | 3 | 2 | 1 | 2 | 2 | 3 | 13 | Ship now |
| CPU personality + difficulty | 1 | 3 | 3 | 2 | 1 | 3 | 13 | Ship now |
| Arcade / Gauntlet | 1 | 2 | 2 | 3 | 1 | 3 | 12 | Ship now |
| Two new fighters right now | 1 | 3 | 2 | 1 | 1 | 2 | 10 | Defer until Phase 1 lands |
| Two new stages right now | 0 | 2 | 1 | 1 | 2 | 2 | 8 | Defer until Phase 1 lands |
| Selective combat juice pass | 0 | 1 | 0 | 1 | 3 | 2 | 7 | Only as support work |
| Online multiplayer | 0 | 1 | 0 | 1 | 0 | 0 | 2 | Hard defer |
| Leaderboard/auth polish | 0 | 0 | 0 | 1 | 0 | 1 | 2 | Hard defer |
| Cosmetics-first additions | 0 | 0 | 0 | 1 | 1 | 1 | 3 | Hard defer |
| More developer-only tooling | 0 | 0 | 0 | 0 | 0 | 1 | 1 | Hard defer |

The key point is not the exact number. The key point is that Training, CPU identity, and Arcade all multiply existing systems, while the deferred items mostly add surface area.

## Current Repo Reality
The current codebase already has a real combat spine. The bottleneck is no longer foundational combat architecture.

Relevant seams:

- `client/src/lib/stores/useFighting.tsx` still models the session as `menu -> lobby -> fighting -> round_end -> match_end`.
- `client/src/game/Menu.tsx` still exposes the game mostly as a start/customize/leaderboard/controls shell.
- `client/src/game/Lobby.tsx` still exposes only two selectable fighters.
- `client/src/combat/moveTable.ts` still defines only `stick_hero` and `stick_villain`.
- `client/src/game/matchRuntime.ts` still instantiates a default balanced CPU.
- `client/src/game/cpuBrain.ts` has style tuning, but not yet enough opponent personality or difficulty layering to sustain solo replay.
- `client/src/lib/combatTraining.ts` already contains deterministic training presets.
- `client/src/game/CombatDebugPanel.tsx` already exposes advanced runtime inspection and input injection.
- `client/src/game/arenas/index.ts` already supports visual stage identity, but not yet enough mechanical stage identity.

This means the highest-leverage work is multiplicative work, not foundational rewrite work.

## Priority Order For The Next Block
### 1. Training Mode
Why first:

- The control grammar is nonstandard and must be taught explicitly.
- The repo already has the hidden superpower required to build it.
- Learnability multiplies the value of every later combat/system/content improvement.

Required outcome:

- A new player can intentionally perform jab, launcher, parry, roll, and grab inside two to three minutes.

Primary seams:

- `client/src/lib/stores/useFighting.tsx`
- `client/src/game/Menu.tsx`
- `client/src/game/UI.tsx`
- `client/src/lib/combatTraining.ts`
- `client/src/game/CombatDebugPanel.tsx`

### 2. CPU Personality And Difficulty
Why second:

- Solo play is the easiest way to stop the game from feeling like a toy.
- Difficulty alone is not enough; opponents need style identity.
- Interesting AI immediately increases the value of Versus, Training, and Arcade.

Required outcome:

- Players can describe meaningful differences between Easy, Hard, and at least three CPU personalities.

Primary seams:

- `client/src/game/cpuBrain.ts`
- `client/src/game/matchRuntime.ts`
- `client/src/game/Lobby.tsx`
- `client/src/lib/stores/useFighting.tsx`

### 3. Arcade / Gauntlet
Why third:

- A better opponent set becomes sticky only when the game structures a run around it.
- The slice needs a reason to continue after match end.

Required outcome:

- After a match ends, the game presents a meaningful next step inside the same run.

Primary seams:

- `client/src/lib/stores/useFighting.tsx`
- `client/src/game/Menu.tsx`
- `client/src/game/Lobby.tsx`
- `client/src/game/UI.tsx`

### 4. New Fighters
Add only after the first three items are real enough that new kits multiply replayability instead of masking gaps.

Required outcome:

- Different fighters force different spacing, risk, and confirm choices.

### 5. New Stages
Add only when stage choice can affect routes, pressure, recovery, and neutral.

Required outcome:

- Players care what stage they are on for reasons beyond the backdrop.

### 6. Combat Juice Pass
Keep this selective. Stronger punctuation matters only if it lands on the right beats.

Required outcome:

- Each round produces at least one moment that feels highlight-worthy.

## Feature Template
Every proposed task should be written in this format before implementation.

### Player-Facing Goal
One sentence. Example: "Training mode teaches the five core verbs in under three minutes."

### Primary Pillar
Choose one:

- Accessible Mastery
- Match Variety With Identity
- Session Structure
- Emotional Punctuation
- Readability
- Scope Efficiency

### Secondary Pillars
Choose one or two additional pillars.

### Existing Seams Reused
List the files or systems being extended. Prefer existing runtime/store/content paths.

### Acceptance Test
Write one clear observable result. Example: "On a fresh save, a player completes five drills and can intentionally perform jab, launcher, parry, roll, and grab."

### Kill Criteria
Name the failure mode that means the feature should be cut, simplified, or deferred. Example: "If the feature only adds UI chrome around debug tools and does not teach actions faster, cut scope."

## Definition Of Elegant Progress
Work counts as elegant progress when most of these statements are true:

- The game is easier to understand after the change.
- The same combat systems now generate more recognizable situations.
- The player can feel the difference without reading patch notes.
- The change reuses existing authored/runtime/debug infrastructure.
- The change creates fewer new concepts than new outcomes.

## Definition Of Done For The Current Phase
The current phase is complete when all of the following are true:

- Training is a first-class menu option, not a debug-only workflow.
- The primer is no longer the main teaching mechanism.
- CPU opponents have both difficulty and recognizable style identity.
- Solo play supports a structured run, not just isolated matches.
- Post-match flow answers "what next?" inside the game.
- No major new surface area was added that does not support mastery, variety, or session pull.

## Ruthless Defer List
Do not prioritize these ahead of the current phase unless they directly unblock it:

- Online multiplayer
- Auth polish
- Leaderboard polish
- More cosmetics
- More menu art
- More debug tooling for developers
- Additional half-distinct fighters
- Stage gimmicks that reduce readability

## Short Version
When in doubt:

- Teach the current depth.
- Make solo play feel different.
- Give the player a reason to continue.
- Add identity only where it changes decisions.
- Cut anything that is merely larger.
