import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useCallback } from "react";
import Arena from "./Arena";
import CombatDebugOverlay from "./CombatDebugOverlay";
import StickFigure from "./StickFigure";
import { useFighting, type GamePhase } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";
import { usePlayerControls } from "../hooks/use-player-controls";
import { usePlayerIntents } from "../hooks/use-player-intents";
import { useControls } from "../lib/stores/useControls";
import { MatchRuntime } from "./matchRuntime";
import { ARENA_HALF_DEPTH, ARENA_HALF_WIDTH } from "./Physics";
import type { CombatTelemetryEvent } from "./combatTelemetry";
import { useEffects } from "../lib/stores/useEffects";
import { ARENA_THEMES } from "./arenas";
import type { CharacterState } from "../lib/stores/useFighting";
import type { IntentContext } from "../input/intentTypes";

const CAMERA_TRACK_SMOOTHING = 5.2;
const CAMERA_LOOK_HEIGHT_BASE = 2.2;
const CAMERA_MIN_HEIGHT = 5.9;
const CAMERA_MAX_HEIGHT = 8.9;
const CAMERA_MIN_DEPTH = 8.1;
const CAMERA_MAX_DEPTH = 12.8;
const CAMERA_X_TRACK_LIMIT = ARENA_HALF_WIDTH * 0.28;
const CAMERA_TARGET_Z_LIMIT = ARENA_HALF_DEPTH * 0.12;
const CAMERA_POSITION_Z_LIMIT = ARENA_HALF_DEPTH * 0.24;
const TELEMETRY_FLUSH_INTERVAL_MS = 250;
const TELEMETRY_IMMEDIATE_FLUSH_SIZE = 48;

const clampValue = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const blendToward = (from: number, to: number, factor: number) =>
  from + (to - from) * factor;

const GameManager = () => {
  const fighting = useFighting();
  const audio = useAudio();
  const getInputState = usePlayerControls();
  const resolveIntents = usePlayerIntents();

  const fightingActions = useMemo(
    () => ({
      applyRuntimeFrame: fighting.applyRuntimeFrame,
      applyCombatEvents: fighting.applyCombatEvents,
      updateRoundTime: fighting.updateRoundTime,
    }),
    [
      fighting.applyRuntimeFrame,
      fighting.applyCombatEvents,
      fighting.updateRoundTime,
    ],
  );

  const audioActions = useMemo(
    () => ({
      playHit: audio.playHit,
      playPunch: audio.playPunch,
      playKick: audio.playKick,
      playSpecial: audio.playSpecial,
      playBlock: audio.playBlock,
      playJump: audio.playJump,
      playLand: audio.playLand,
      playDodge: audio.playDodge,
      playGrab: audio.playGrab,
      playThrow: audio.playThrow,
      playTaunt: audio.playTaunt,
    }),
    [
      audio.playHit,
      audio.playPunch,
      audio.playKick,
      audio.playSpecial,
      audio.playBlock,
      audio.playJump,
      audio.playLand,
      audio.playDodge,
      audio.playGrab,
      audio.playThrow,
      audio.playTaunt,
    ],
  );

  const triggerImpactFlash = useEffects((state) => state.triggerImpactFlash);
  const triggerCameraShake = useEffects((state) => state.triggerCameraShake);
  const triggerLandingBurst = useEffects((state) => state.triggerLandingBurst);
  const decayEffects = useEffects((state) => state.decayEffects);
  const telemetryQueueRef = useRef<CombatTelemetryEvent[]>([]);
  const flushTelemetry = useCallback((keepalive = false) => {
    const entries = telemetryQueueRef.current.splice(0, telemetryQueueRef.current.length);
    if (!entries.length) return;
    void fetch("/api/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entries }),
      keepalive,
    }).catch((error) => {
      console.error("[telemetry] Failed to send telemetry to server:", error);
    });
  }, []);
  const sendTelemetry = useCallback(
    (entries: CombatTelemetryEvent[]) => {
      if (!entries.length) return;
      telemetryQueueRef.current.push(...entries);
      if (telemetryQueueRef.current.length >= TELEMETRY_IMMEDIATE_FLUSH_SIZE) {
        flushTelemetry();
      }
    },
    [flushTelemetry],
  );

  const runtimeRef = useRef<MatchRuntime>();
  const arenaStyleRef = useRef<'open' | 'contained'>(
    ARENA_THEMES[fighting.arenaId]?.style || 'open'
  );
  const cameraBaseRef = useRef<[number, number, number] | null>(null);
  const cameraTargetRef = useRef<[number, number, number]>([0, CAMERA_LOOK_HEIGHT_BASE, 0]);
  const handleImpact = useCallback(
    (intensity: number) => {
      const normalized = Math.min(1, intensity);
      triggerImpactFlash(normalized);
      triggerCameraShake(normalized * 0.15);
    },
    [triggerImpactFlash, triggerCameraShake],
  );
  const prevPhaseRef = useRef<GamePhase>(fighting.gamePhase);
  const playerSnapshotRef = useRef(fighting.player);
  const cpuSnapshotRef = useRef(fighting.cpu);

  useEffect(() => {
    playerSnapshotRef.current = fighting.player;
    cpuSnapshotRef.current = fighting.cpu;
  }, [fighting.player, fighting.cpu]);

  // Update arena style ref when arenaId changes
  useEffect(() => {
    arenaStyleRef.current = ARENA_THEMES[fighting.arenaId]?.style || 'open';
  }, [fighting.arenaId]);

  useEffect(() => {
    if (runtimeRef.current) return;
    runtimeRef.current = new MatchRuntime(
      {
        fighting: fightingActions,
        audio: audioActions,
        getDebugMode: () => useControls.getState().debugMode,
        getMatchMode: () => useFighting.getState().matchMode,
        getArenaStyle: () => arenaStyleRef.current,
        onImpact: handleImpact,
        sendTelemetry,
      },
      { player: fighting.player, cpu: fighting.cpu },
    );
  }, [audioActions, fightingActions, sendTelemetry, handleImpact]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      flushTelemetry();
    }, TELEMETRY_FLUSH_INTERVAL_MS);
    const handlePageHide = () => {
      flushTelemetry(true);
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("pagehide", handlePageHide);
      flushTelemetry(true);
    };
  }, [flushTelemetry]);

  useEffect(() => {
    if (!runtimeRef.current) return;
    if (fighting.gamePhase === "fighting" && prevPhaseRef.current !== "fighting") {
      runtimeRef.current.reset({
        player: playerSnapshotRef.current,
        cpu: cpuSnapshotRef.current,
      });
    }
    prevPhaseRef.current = fighting.gamePhase;
  }, [fighting.gamePhase]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && fighting.gamePhase === "fighting") {
        fighting.togglePause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fighting]);

  useFrame((state, delta) => {
    if (!runtimeRef.current) return;
    const inputs = getInputState();
    const intents = resolveIntents(
      inputs,
      {
        player1: buildIntentContext(fighting.player),
        player2: buildIntentContext(fighting.cpu),
      },
      delta,
    );
    const activeCombat = fighting.gamePhase === "fighting" && !fighting.paused;
    const presentationActive =
      fighting.gamePhase === "fighting" ||
      fighting.gamePhase === "round_end" ||
      fighting.gamePhase === "match_end";
    if (activeCombat) {
      runtimeRef.current.update({
        delta,
        inputs,
        intents,
        player: fighting.player,
        cpu: fighting.cpu,
        gamePhase: fighting.gamePhase,
      });
    }

    decayEffects(delta);

    const playerPos = fighting.player.position;
    const cpuPos = fighting.cpu.position;
    const midpointX = (playerPos[0] + cpuPos[0]) / 2;
    const midpointZ = (playerPos[2] + cpuPos[2]) / 2;
    const maxHeight = Math.max(playerPos[1], cpuPos[1]);
    const horizontalSpread = Math.hypot(
      playerPos[0] - cpuPos[0],
      (playerPos[2] - cpuPos[2]) * 0.9,
    );
    const verticalSpread = Math.abs(playerPos[1] - cpuPos[1]);
    const combinedSpread = horizontalSpread + verticalSpread * 0.55;

    const desiredCameraPosition: [number, number, number] = [
      clampValue(midpointX * 0.28, -CAMERA_X_TRACK_LIMIT, CAMERA_X_TRACK_LIMIT),
      clampValue(
        CAMERA_MIN_HEIGHT + combinedSpread * 0.24 + maxHeight * 0.18,
        CAMERA_MIN_HEIGHT,
        CAMERA_MAX_HEIGHT,
      ),
      clampValue(
        midpointZ + CAMERA_MIN_DEPTH + combinedSpread * 0.52,
        CAMERA_MIN_DEPTH - CAMERA_POSITION_Z_LIMIT,
        CAMERA_MAX_DEPTH + CAMERA_POSITION_Z_LIMIT,
      ),
    ];
    const desiredCameraTarget: [number, number, number] = [
      clampValue(midpointX, -CAMERA_X_TRACK_LIMIT, CAMERA_X_TRACK_LIMIT),
      clampValue(CAMERA_LOOK_HEIGHT_BASE + maxHeight * 0.4, CAMERA_LOOK_HEIGHT_BASE, 6.1),
      clampValue(midpointZ, -CAMERA_TARGET_Z_LIMIT, CAMERA_TARGET_Z_LIMIT),
    ];

    const effectsState = useEffects.getState();
    if (!cameraBaseRef.current) {
      cameraBaseRef.current = desiredCameraPosition;
      cameraTargetRef.current = desiredCameraTarget;
    } else if (presentationActive) {
      const blend = 1 - Math.exp(-delta * CAMERA_TRACK_SMOOTHING);
      cameraBaseRef.current = [
        blendToward(cameraBaseRef.current[0], desiredCameraPosition[0], blend),
        blendToward(cameraBaseRef.current[1], desiredCameraPosition[1], blend),
        blendToward(cameraBaseRef.current[2], desiredCameraPosition[2], blend),
      ];
      cameraTargetRef.current = [
        blendToward(cameraTargetRef.current[0], desiredCameraTarget[0], blend),
        blendToward(cameraTargetRef.current[1], desiredCameraTarget[1], blend),
        blendToward(cameraTargetRef.current[2], desiredCameraTarget[2], blend),
      ];
    }

    if (cameraBaseRef.current) {
      const [cameraX, cameraY, cameraZ] = cameraBaseRef.current;
      if (effectsState.cameraShake > 0 && activeCombat) {
        state.camera.position.x = cameraX + effectsState.cameraShakeOffset[0];
        state.camera.position.y = cameraY + effectsState.cameraShakeOffset[1];
        state.camera.position.z = cameraZ + effectsState.cameraShakeOffset[2];
      } else {
        state.camera.position.set(cameraX, cameraY, cameraZ);
      }
      state.camera.lookAt(...cameraTargetRef.current);
    }
  });

  return (
    <>
      <Arena variant={fighting.arenaId} />
      <StickFigure
        isPlayer={true}
        characterState={fighting.player}
        events={fighting.playerEvents}
      />
      <StickFigure
        isPlayer={false}
        characterState={fighting.cpu}
        events={fighting.cpuEvents}
      />
      <CombatDebugOverlay
        characterState={fighting.player}
        accent="#60a5fa"
      />
      <CombatDebugOverlay
        characterState={fighting.cpu}
        accent="#f97316"
      />
    </>
  );
};

export default GameManager;
const buildIntentContext = (state: CharacterState): IntentContext => {
  const grounded = state.grounded ?? state.position[1] <= 0.05;
  return {
    grounded,
    airborne: state.inAir ?? (!grounded || state.isJumping),
    facing: state.direction,
    velocity: state.velocity,
    allowTech: false,
  };
};
