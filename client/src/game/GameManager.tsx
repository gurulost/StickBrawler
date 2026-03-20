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
import type { CombatTelemetryEvent } from "./combatTelemetry";
import { useEffects } from "../lib/stores/useEffects";
import { ARENA_THEMES } from "./arenas";
import type { CharacterState } from "../lib/stores/useFighting";
import type { IntentContext } from "../input/intentTypes";
import { resolveCombatDebugReviewRecord, useCombatDebug } from "../lib/stores/useCombatDebug";
import {
  describeCombatTrainingRun,
  injectCombatTrainingFrame,
  injectCombatTrainingIntentFrame,
  type CombatTrainingPresetId,
  type CombatTrainingStep,
} from "../lib/combatTraining";
import {
  CAMERA_LOOK_HEIGHT_BASE,
  CAMERA_TRACK_SMOOTHING,
  resolveCombatCameraRig,
} from "./combatReadability";

const TELEMETRY_FLUSH_INTERVAL_MS = 250;
const TELEMETRY_IMMEDIATE_FLUSH_SIZE = 48;

const blendToward = (from: number, to: number, factor: number) =>
  from + (to - from) * factor;

const GameManager = () => {
  const fighting = useFighting();
  const audio = useAudio();
  const getInputState = usePlayerControls();
  const resolveIntents = usePlayerIntents();
  const combatPlaybackPaused = useControls((state) => state.combatPlaybackPaused);
  const combatPlaybackRate = useControls((state) => state.combatPlaybackRate);
  const resetCombatPlayback = useControls((state) => state.resetCombatPlayback);
  const clearCombatTraining = useControls((state) => state.clearCombatTraining);
  const debugHistory = useCombatDebug((state) => state.history);
  const reviewFrameId = useCombatDebug((state) => state.reviewFrameId);

  const fightingActions = useMemo(
    () => ({
      applyRuntimeFrame: fighting.applyRuntimeFrame,
      applyCombatEvents: fighting.applyCombatEvents,
    }),
    [
      fighting.applyRuntimeFrame,
      fighting.applyCombatEvents,
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
  const prevRuntimeResetNonceRef = useRef(fighting.runtimeResetNonce);
  const playerSnapshotRef = useRef(fighting.player);
  const cpuSnapshotRef = useRef(fighting.cpu);
  const reviewRecord = useMemo(
    () => resolveCombatDebugReviewRecord(debugHistory, reviewFrameId),
    [debugHistory, reviewFrameId],
  );
  const presentedPlayer = reviewRecord?.player ?? fighting.player;
  const presentedCpu = reviewRecord?.cpu ?? fighting.cpu;
  const presentedPlayerEvents = reviewRecord?.playerEvents ?? fighting.playerEvents;
  const presentedCpuEvents = reviewRecord?.cpuEvents ?? fighting.cpuEvents;

  useEffect(() => {
    playerSnapshotRef.current = fighting.player;
    cpuSnapshotRef.current = fighting.cpu;
  }, [fighting.player, fighting.cpu]);

  const buildRuntimeFrame = useCallback(
    (delta: number) => {
      const latest = useFighting.getState();
      if (latest.gamePhase !== "fighting" || latest.paused) return null;
      const controlsState = useControls.getState();
      const injectedTrainingFrame = controlsState.consumeCombatTrainingFrame();
      const inputs = injectCombatTrainingFrame(getInputState(), injectedTrainingFrame);
      const intents = injectCombatTrainingIntentFrame(
        resolveIntents(
          inputs,
          {
            player1: buildIntentContext(latest.player),
            player2: buildIntentContext(latest.cpu),
          },
          delta,
        ),
        injectedTrainingFrame,
      );
      return {
        delta,
        inputs,
        intents,
        gamePhase: latest.gamePhase,
        trainingOverrideSlots: injectedTrainingFrame ? [injectedTrainingFrame.slot] : undefined,
      };
    },
    [getInputState, resolveIntents],
  );

  const advanceRuntimeFrames = useCallback(
    (frames: number) => {
      if (!runtimeRef.current || frames <= 0) return;
      for (let index = 0; index < frames; index += 1) {
        const frame = buildRuntimeFrame(1 / 60);
        if (!frame) return;
        runtimeRef.current.update(frame);
      }
    },
    [buildRuntimeFrame],
  );

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
    const enteredFighting = fighting.gamePhase === "fighting" && prevPhaseRef.current !== "fighting";
    const requestedRuntimeReset =
      fighting.gamePhase === "fighting" &&
      fighting.runtimeResetNonce !== prevRuntimeResetNonceRef.current;
    if (enteredFighting || requestedRuntimeReset) {
      runtimeRef.current.reset({
        player: playerSnapshotRef.current,
        cpu: cpuSnapshotRef.current,
      });
    }
    if (fighting.gamePhase !== "fighting" && prevPhaseRef.current === "fighting") {
      resetCombatPlayback();
      clearCombatTraining();
    }
    prevPhaseRef.current = fighting.gamePhase;
    prevRuntimeResetNonceRef.current = fighting.runtimeResetNonce;
  }, [clearCombatTraining, fighting.gamePhase, fighting.runtimeResetNonce, resetCombatPlayback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" && fighting.gamePhase === "fighting") {
        fighting.togglePause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fighting]);

  useEffect(() => {
    const win = window as Window & {
      advanceTime?: (ms: number) => void;
      render_game_to_text?: () => string;
      runCombatTrainingPreset?: (presetId: CombatTrainingPresetId, slot?: "player1" | "player2") => void;
      queueCombatTrainingSequence?: (input: {
        label: string;
        description?: string;
        slot?: "player1" | "player2";
        fighter?: "any" | "hero" | "villain";
        presetId?: string;
        steps: CombatTrainingStep[];
      }) => void;
      clearCombatTraining?: () => void;
    };
    win.advanceTime = (ms: number) => {
      useCombatDebug.getState().clearReviewFrame();
      const frames = Math.max(1, Math.round(ms / (1000 / 60)));
      advanceRuntimeFrames(frames);
    };
    win.runCombatTrainingPreset = (presetId, slot = "player1") => {
      useCombatDebug.getState().clearReviewFrame();
      useControls.getState().queueCombatTrainingPreset(presetId, slot);
    };
    win.queueCombatTrainingSequence = (input) => {
      useCombatDebug.getState().clearReviewFrame();
      useControls.getState().queueCombatTrainingSequence(input);
    };
    win.clearCombatTraining = () => {
      useControls.getState().clearCombatTraining();
    };
    win.render_game_to_text = () =>
      JSON.stringify({
        mode: fighting.gamePhase,
        debug: {
          reviewFrameId,
          historyFrames: debugHistory.length,
          combatPlaybackPaused,
          combatPlaybackRate,
          training: describeCombatTrainingRun(useControls.getState().combatTrainingActiveRun),
        },
        player: {
          x: presentedPlayer.position[0],
          y: presentedPlayer.position[1],
          z: presentedPlayer.position[2],
          moveId: presentedPlayer.moveId ?? null,
          moveFrame: presentedPlayer.moveFrame ?? 0,
          movePhase: presentedPlayer.movePhase ?? "none",
        },
        cpu: {
          x: presentedCpu.position[0],
          y: presentedCpu.position[1],
          z: presentedCpu.position[2],
          moveId: presentedCpu.moveId ?? null,
          moveFrame: presentedCpu.moveFrame ?? 0,
          movePhase: presentedCpu.movePhase ?? "none",
        },
      });
    return () => {
      delete win.advanceTime;
      delete win.render_game_to_text;
      delete win.runCombatTrainingPreset;
      delete win.queueCombatTrainingSequence;
      delete win.clearCombatTraining;
    };
  }, [
    advanceRuntimeFrames,
    combatPlaybackPaused,
    combatPlaybackRate,
    debugHistory.length,
    fighting.gamePhase,
    presentedCpu,
    presentedPlayer,
    reviewFrameId,
  ]);

  useFrame((state, delta) => {
    if (!runtimeRef.current) return;
    const activeCombat = fighting.gamePhase === "fighting" && !fighting.paused;
    const queuedStepFrames = activeCombat
      ? useControls.getState().consumeCombatFrameSteps()
      : 0;
    const simulatedDeltaSeconds =
      activeCombat && (queuedStepFrames > 0 || !combatPlaybackPaused)
        ? queuedStepFrames > 0
          ? queuedStepFrames / 60
          : delta * combatPlaybackRate
        : 0;
    const presentationActive =
      fighting.gamePhase === "fighting" ||
      fighting.gamePhase === "round_end" ||
      fighting.gamePhase === "match_end";
    if (activeCombat) {
      if (queuedStepFrames > 0) {
        for (let index = 0; index < queuedStepFrames; index += 1) {
          const frame = buildRuntimeFrame(1 / 60);
          if (!frame) break;
          runtimeRef.current.update(frame);
        }
      } else if (!combatPlaybackPaused) {
        const frame = buildRuntimeFrame(simulatedDeltaSeconds);
        if (frame) {
          runtimeRef.current.update(frame);
        }
      }
    }

    decayEffects(simulatedDeltaSeconds);

    const playerPos = presentedPlayer.position;
    const cpuPos = presentedCpu.position;
    const { position: desiredCameraPosition, target: desiredCameraTarget } =
      resolveCombatCameraRig(playerPos, cpuPos);

    const effectsState = useEffects.getState();
    if (!cameraBaseRef.current) {
      cameraBaseRef.current = desiredCameraPosition;
      cameraTargetRef.current = desiredCameraTarget;
    } else if (presentationActive) {
      const blend = 1 - Math.exp(-simulatedDeltaSeconds * CAMERA_TRACK_SMOOTHING);
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
        characterState={presentedPlayer}
        events={presentedPlayerEvents}
      />
      <StickFigure
        isPlayer={false}
        characterState={presentedCpu}
        events={presentedCpuEvents}
      />
      <CombatDebugOverlay
        characterState={presentedPlayer}
        accent="#60a5fa"
      />
      <CombatDebugOverlay
        characterState={presentedCpu}
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
