import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveFocusedCombatSlot,
  resolveRecentCombatEvents,
  resolveTimelineMarkers,
} from "../../client/src/game/combatDebug";
import type { CombatEvent } from "../../client/src/game/combatPresentation";
import {
  resolveCombatDebugReviewRecord,
  useCombatDebug,
} from "../../client/src/lib/stores/useCombatDebug";
import type { CharacterState } from "../../client/src/lib/stores/useFighting";

const createCharacterState = (
  overrides: Partial<CharacterState> = {},
): CharacterState => ({
  health: 100,
  position: [0, 0, 0],
  direction: 1,
  fighterId: "stick_hero",
  grounded: true,
  inAir: false,
  action: "idle",
  moveId: undefined,
  moveInstanceId: undefined,
  moveFrame: 0,
  movePhase: "none",
  hitLagFrames: 0,
  hitstunFrames: 0,
  blockstunFrames: 0,
  landingLagFrames: 0,
  canAct: true,
  invulnerable: false,
  armored: false,
  guardBroken: false,
  isJumping: false,
  isAttacking: false,
  isBlocking: false,
  isDodging: false,
  isGrabbing: false,
  isTaunting: false,
  isAirAttacking: false,
  airJumpsLeft: 2,
  guardMeter: 80,
  staminaMeter: 100,
  specialMeter: 0,
  attackCooldown: 0,
  dodgeCooldown: 0,
  grabCooldown: 0,
  moveCooldown: 0,
  comboCount: 0,
  comboTimer: 0,
  lastMoveType: "",
  lastStartedMoveId: undefined,
  lastHitMoveId: undefined,
  justStartedMove: false,
  justLanded: false,
  justHit: false,
  justBlocked: false,
  justParried: false,
  justGuardBroke: false,
  velocity: [0, 0, 0],
  ...overrides,
});

const createHistoryEvent = (event: CombatEvent): CombatEvent => ({ ...event });

test.afterEach(() => {
  useCombatDebug.getState().clearHistory();
});

test("focused combat slot auto-selects the fighter with the hotter state", () => {
  const player = createCharacterState();
  const cpu = createCharacterState({
    moveId: "vill_guard_break_big",
    moveInstanceId: 44,
    moveFrame: 22,
    justBlocked: true,
  });

  assert.equal(resolveFocusedCombatSlot(player, cpu, "auto"), "cpu");
  assert.equal(resolveFocusedCombatSlot(player, cpu, "player"), "player");
});

test("timeline markers and recent events explain hit, block, and whiff outcomes", () => {
  const moveId = "hero_jab_1";
  const history = [
    {
      id: 1,
      capturedAt: 1000,
      roundTimeRemaining: 52,
      maxRoundTime: 60,
      player: createCharacterState({
        action: "attack",
        moveId,
        moveInstanceId: 12,
        moveFrame: 1,
        movePhase: "startup",
        justStartedMove: true,
      }),
      cpu: createCharacterState(),
      events: [
        createHistoryEvent({
          id: 1,
          type: "moveStart",
          slot: "player",
          moveId,
          moveInstanceId: 12,
        }),
      ],
      playerEvents: [],
      cpuEvents: [],
    },
    {
      id: 2,
      capturedAt: 1048,
      roundTimeRemaining: 52,
      maxRoundTime: 60,
      player: createCharacterState({
        action: "attack",
        moveId,
        moveInstanceId: 12,
        moveFrame: 6,
        movePhase: "active",
        justHit: true,
      }),
      cpu: createCharacterState(),
      events: [
        createHistoryEvent({
          id: 2,
          type: "hit",
          attacker: "player",
          defender: "cpu",
          moveId,
          moveInstanceId: 12,
          hitboxId: "hero-jab",
          blocked: false,
          damage: 3,
          impact: 0.6,
        }),
      ],
      playerEvents: [],
      cpuEvents: [],
    },
    {
      id: 3,
      capturedAt: 1100,
      roundTimeRemaining: 51,
      maxRoundTime: 60,
      player: createCharacterState({
        action: "idle",
      }),
      cpu: createCharacterState(),
      events: [
        createHistoryEvent({
          id: 3,
          type: "moveEnd",
          slot: "player",
          moveId: "hero_tilt_side",
          moveInstanceId: 21,
          reason: "complete",
        }),
      ],
      playerEvents: [],
      cpuEvents: [],
    },
  ];

  const markers = resolveTimelineMarkers("player", history[1].player, history);
  const eventFeed = resolveRecentCombatEvents("player", history, 4);

  assert.deepEqual(
    markers.map((marker) => marker.label),
    ["Start", "Hit Confirm"],
  );
  assert.equal(eventFeed[0]?.detail.includes("Whiff"), true);
  assert.equal(eventFeed.some((entry) => entry.label === "Hit Confirm"), true);
});

test("combat debug store records frame history and resolves review records", () => {
  const store = useCombatDebug.getState();
  store.pushPendingEvents([
    createHistoryEvent({
      id: 91,
      type: "guardBreak",
      slot: "cpu",
    }),
  ]);
  store.recordFrame({
    player: createCharacterState(),
    cpu: createCharacterState({
      guardBroken: true,
      justGuardBroke: true,
    }),
    playerEvents: [],
    cpuEvents: [],
    roundTimeRemaining: 49,
    maxRoundTime: 60,
    capturedAt: 2000,
  });

  const state = useCombatDebug.getState();
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0]?.events[0]?.type, "guardBreak");

  state.setReviewFrameId(state.history[0]?.id ?? null);
  const review = resolveCombatDebugReviewRecord(state.history, useCombatDebug.getState().reviewFrameId);
  assert.equal(review?.cpu.justGuardBroke, true);
});
