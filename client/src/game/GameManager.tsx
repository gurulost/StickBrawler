import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useCallback } from "react";
import Arena from "./Arena";
import StickFigure from "./StickFigure";
import { useFighting, type GamePhase } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";
import { usePlayerControls } from "../hooks/use-player-controls";
import { useControls } from "../lib/stores/useControls";
import { MatchRuntime } from "./matchRuntime";
import type { CombatTelemetryEvent } from "./combatTelemetry";
import { useEffects } from "../lib/stores/useEffects";
import { ARENA_THEMES } from "./arenas";

const GameManager = () => {
  const fighting = useFighting();
  const audio = useAudio();
  const getInputState = usePlayerControls();

  const fightingActions = useMemo(
    () => ({
      movePlayer: fighting.movePlayer,
      moveCPU: fighting.moveCPU,
      updatePlayerVelocity: fighting.updatePlayerVelocity,
      updateCPUVelocity: fighting.updateCPUVelocity,
      setPlayerDirection: fighting.setPlayerDirection,
      setCPUDirection: fighting.setCPUDirection,
      setPlayerJumping: fighting.setPlayerJumping,
      setCPUJumping: fighting.setCPUJumping,
      setPlayerAttacking: fighting.setPlayerAttacking,
      setCPUAttacking: fighting.setCPUAttacking,
      setPlayerBlocking: fighting.setPlayerBlocking,
      setCPUBlocking: fighting.setCPUBlocking,
      setPlayerDodging: fighting.setPlayerDodging,
      setPlayerGrabbing: fighting.setPlayerGrabbing,
      setPlayerTaunting: fighting.setPlayerTaunting,
      setPlayerAirAttacking: fighting.setPlayerAirAttacking,
      resetPlayerAirJumps: fighting.resetPlayerAirJumps,
      usePlayerAirJump: fighting.usePlayerAirJump,
      setCPUDodging: fighting.setCPUDodging,
      setCPUGrabbing: fighting.setCPUGrabbing,
      setCPUAirAttacking: fighting.setCPUAirAttacking,
      resetCPUAirJumps: fighting.resetCPUAirJumps,
      useCPUAirJump: fighting.useCPUAirJump,
      damagePlayer: fighting.damagePlayer,
      damageCPU: fighting.damageCPU,
      updateRoundTime: fighting.updateRoundTime,
      updatePlayerCooldowns: fighting.updatePlayerCooldowns,
      updateCPUCooldowns: fighting.updateCPUCooldowns,
      updatePlayerMeters: fighting.updatePlayerMeters,
      updateCPUMeters: fighting.updateCPUMeters,
      updatePlayerGuardBreak: fighting.updatePlayerGuardBreak,
      updateCPUGuardBreak: fighting.updateCPUGuardBreak,
    }),
    [
      fighting.movePlayer,
      fighting.moveCPU,
      fighting.updatePlayerVelocity,
      fighting.updateCPUVelocity,
      fighting.setPlayerDirection,
      fighting.setCPUDirection,
      fighting.setPlayerJumping,
      fighting.setCPUJumping,
      fighting.setPlayerAttacking,
      fighting.setCPUAttacking,
      fighting.setPlayerBlocking,
      fighting.setCPUBlocking,
      fighting.setPlayerDodging,
      fighting.setPlayerGrabbing,
      fighting.setPlayerTaunting,
      fighting.setPlayerAirAttacking,
      fighting.resetPlayerAirJumps,
      fighting.usePlayerAirJump,
      fighting.setCPUDodging,
      fighting.setCPUGrabbing,
      fighting.setCPUAirAttacking,
      fighting.resetCPUAirJumps,
      fighting.useCPUAirJump,
      fighting.damagePlayer,
      fighting.damageCPU,
      fighting.updateRoundTime,
      fighting.updatePlayerCooldowns,
      fighting.updateCPUCooldowns,
      fighting.updatePlayerMeters,
      fighting.updateCPUMeters,
      fighting.updatePlayerGuardBreak,
      fighting.updateCPUGuardBreak,
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
  const sendTelemetry = useCallback((entries: CombatTelemetryEvent[]) => {
    void fetch("/api/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ entries }),
      keepalive: true,
    }).catch((error) => {
      console.error("[telemetry] Failed to send telemetry to server:", error);
    });
  }, []);

  const runtimeRef = useRef<MatchRuntime>();
  const arenaStyleRef = useRef<'open' | 'contained'>(
    ARENA_THEMES[fighting.arenaId]?.style || 'open'
  );
  const cameraBaseRef = useRef<[number, number, number] | null>(null);
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
    const activeCombat = fighting.gamePhase === "fighting" && !fighting.paused;
    if (activeCombat) {
      runtimeRef.current.update({
        delta,
        inputs,
        player: fighting.player,
        cpu: fighting.cpu,
        gamePhase: fighting.gamePhase,
      });
    }

    decayEffects(delta);

    if (!cameraBaseRef.current) {
      cameraBaseRef.current = [
        state.camera.position.x,
        state.camera.position.y,
        state.camera.position.z,
      ];
    }

    const effectsState = useEffects.getState();
    if (cameraBaseRef.current) {
      if (effectsState.cameraShake > 0 && activeCombat) {
        state.camera.position.x = cameraBaseRef.current[0] + effectsState.cameraShakeOffset[0];
        state.camera.position.y = cameraBaseRef.current[1] + effectsState.cameraShakeOffset[1];
        state.camera.position.z = cameraBaseRef.current[2] + effectsState.cameraShakeOffset[2];
      } else {
        state.camera.position.set(...cameraBaseRef.current);
      }
    }
  });

  const currentInputs = getInputState();
  const isLocalMultiplayer = fighting.slots.player2.type === "human";

  return (
    <>
      <Arena variant={fighting.arenaId} />
      <StickFigure
        isPlayer={true}
        characterState={fighting.player}
        onPositionChange={fighting.movePlayer}
        onVelocityChange={fighting.updatePlayerVelocity}
        onDirectionChange={fighting.setPlayerDirection}
        onJumpingChange={fighting.setPlayerJumping}
        onAttackingChange={fighting.setPlayerAttacking}
        onBlockingChange={fighting.setPlayerBlocking}
        inputSnapshot={currentInputs.player1}
        isHumanControlled={true}
      />
      <StickFigure
        isPlayer={false}
        characterState={fighting.cpu}
        onPositionChange={fighting.moveCPU}
        onVelocityChange={fighting.updateCPUVelocity}
        onDirectionChange={fighting.setCPUDirection}
        onJumpingChange={fighting.setCPUJumping}
        onAttackingChange={fighting.setCPUAttacking}
        onBlockingChange={fighting.setCPUBlocking}
        inputSnapshot={isLocalMultiplayer ? currentInputs.player2 : undefined}
        isHumanControlled={isLocalMultiplayer}
      />
    </>
  );
};

export default GameManager;
