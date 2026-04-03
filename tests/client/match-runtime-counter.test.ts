import test from "node:test";
import assert from "node:assert/strict";

import { MatchRuntime, createEmptyInputs } from "../../client/src/game/matchRuntime";
import { CpuDifficulty, CpuStyle } from "../../client/src/game/cpuBrain";
import type { RuntimeFrameSnapshot } from "../../client/src/game/combatPresentation";
import type { PlayerIntentFrame } from "../../client/src/input/intentTypes";
import type { CharacterState } from "../../client/src/lib/stores/useFighting";
import type { FighterId } from "../../client/src/combat/moveTable";

const createCharacterState = (
  position: [number, number, number],
  direction: 1 | -1,
  fighterId: FighterId,
): CharacterState => ({
  health: 100,
  position,
  direction,
  fighterId,
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
});

const createBaseIntent = (): PlayerIntentFrame => ({
  attack: undefined,
  special: undefined,
  defend: [],
  jump: undefined,
  dash: undefined,
  direction: "neutral",
});

const createNeutralAttackIntent = (): PlayerIntentFrame => ({
  ...createBaseIntent(),
  attack: {
    kind: "attack",
    dir: "neutral",
    airborne: false,
    press: {
      heldMs: 90,
      tapped: true,
      heavy: false,
      charged: false,
      flickedDir: undefined,
      justPressed: true,
    },
  },
});

const createBackSpecialIntent = (): PlayerIntentFrame => ({
  ...createBaseIntent(),
  special: {
    kind: "special",
    dir: "back",
    airborne: false,
    press: {
      heldMs: 120,
      tapped: true,
      heavy: false,
      charged: false,
      flickedDir: undefined,
      justPressed: true,
    },
  },
});

const noopAudio = {
  playHit: () => {},
  playPunch: () => {},
  playKick: () => {},
  playSpecial: () => {},
  playBlock: () => {},
  playJump: () => {},
  playLand: () => {},
  playDodge: () => {},
  playGrab: () => {},
  playThrow: () => {},
  playTaunt: () => {},
};

test("anvil brace counter turns a blocked hit into the hammer fall follow-up", () => {
  let latestFrame: RuntimeFrameSnapshot | undefined;
  const runtime = new MatchRuntime(
    {
      fighting: {
        applyRuntimeFrame: (frame) => {
          latestFrame = frame;
        },
        applyCombatEvents: () => {},
      },
      audio: noopAudio,
      getDebugMode: () => false,
      getMatchMode: () => "local",
      getArenaStyle: () => "open",
      getArenaId: () => "sunsetBloom",
      getCpuConfig: () => ({
        style: CpuStyle.BEGINNER,
        difficulty: CpuDifficulty.EASY,
      }),
    },
    {
      player: createCharacterState([-0.25, 0, 0], 1, "stick_anvil"),
      cpu: createCharacterState([0.25, 0, 0], -1, "stick_hero"),
    },
  );

  const emptyInputs = createEmptyInputs();
  const advanceFrame = (player1?: PlayerIntentFrame, player2?: PlayerIntentFrame) => {
    runtime.update({
      delta: 1 / 60,
      inputs: emptyInputs,
      intents: {
        player1: player1 ?? createBaseIntent(),
        player2: player2 ?? createBaseIntent(),
      },
      gamePhase: "fighting",
    });
  };

  advanceFrame(createBackSpecialIntent());
  advanceFrame();
  advanceFrame();
  advanceFrame(undefined, createNeutralAttackIntent());

  let converted = false;
  for (let frame = 0; frame < 20; frame += 1) {
    advanceFrame();
    if (latestFrame?.player.moveId === "anvil_hammer_fall") {
      converted = true;
      break;
    }
  }

  assert.equal(converted, true);
  assert.equal(latestFrame?.player.lastStartedMoveId, "anvil_hammer_fall");
  assert.equal(latestFrame?.player.health, 100);
});
