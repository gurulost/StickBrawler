import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useFighting } from "../lib/stores/useFighting";
import StickFigure from "./StickFigure";
import Arena from "./Arena";
import { CPUController, CPUDifficulty } from "./CPU";
import { checkAttackHit, PUNCH_DAMAGE, KICK_DAMAGE, SPECIAL_DAMAGE } from "./Physics";
import { useControls } from "../lib/stores/useControls";
import { useKeyboardControls } from "@react-three/drei";
import { Controls } from "../lib/stores/useControls";
import { useAudio } from "../lib/stores/useAudio";

const GameManager = () => {
  const {
    player,
    cpu,
    gamePhase,
    movePlayer,
    moveCPU,
    updatePlayerVelocity,
    updateCPUVelocity,
    setPlayerDirection,
    setCPUDirection,
    setPlayerJumping,
    setCPUJumping,
    setPlayerAttacking,
    setCPUAttacking,
    setPlayerBlocking,
    setCPUBlocking,
    damagePlayer,
    damageCPU,
    updateRoundTime
  } = useFighting();
  
  const { debugMode } = useControls();
  const { playHit } = useAudio();

  // Initialize CPU controller
  const [cpuController] = useState(() => new CPUController(CPUDifficulty.MEDIUM));
  
  // Refs for timing
  const lastFrameTime = useRef(Date.now());
  
  // Get keyboard state
  const [, getKeyboardState] = useKeyboardControls<Controls>();
  
  // Combat system
  useEffect(() => {
    // Check for hits when player is attacking
    if (player.isAttacking && !cpu.isAttacking) {
      const hit = checkAttackHit(
        player.position,
        player.direction,
        cpu.position
      );
      
      if (hit) {
        // Check which attack is being used
        const { punch, kick, special } = getKeyboardState();
        
        let damage = PUNCH_DAMAGE;
        if (kick) damage = KICK_DAMAGE;
        if (special) damage = SPECIAL_DAMAGE;
        
        damageCPU(damage);
        playHit();
      }
    }
    
    // Check for hits when CPU is attacking
    if (cpu.isAttacking && !player.isAttacking) {
      const hit = checkAttackHit(
        cpu.position,
        cpu.direction,
        player.position
      );
      
      if (hit) {
        // CPU always does basic punch damage for now
        damagePlayer(PUNCH_DAMAGE);
        playHit();
      }
    }
  }, [player.isAttacking, cpu.isAttacking, player.position, cpu.position, player.direction, cpu.direction, damagePlayer, damageCPU, playHit, getKeyboardState]);
  
  // Main game update loop
  useFrame(() => {
    if (gamePhase !== 'fighting') return;
    
    // Calculate time delta in seconds
    const now = Date.now();
    const delta = (now - lastFrameTime.current) / 1000;
    lastFrameTime.current = now;
    
    // Update game time
    updateRoundTime(delta);
    
    // Update CPU behavior
    cpuController.update(
      cpu,
      player,
      moveCPU,
      updateCPUVelocity,
      setCPUDirection,
      setCPUJumping,
      setCPUAttacking,
      setCPUBlocking
    );
  });
  
  return (
    <>
      <Arena />
      
      {/* Player character */}
      <StickFigure
        isPlayer={true}
        characterState={player}
        onPositionChange={movePlayer}
        onVelocityChange={updatePlayerVelocity}
        onDirectionChange={setPlayerDirection}
        onJumpingChange={setPlayerJumping}
        onAttackingChange={setPlayerAttacking}
        onBlockingChange={setPlayerBlocking}
      />
      
      {/* CPU character */}
      <StickFigure
        isPlayer={false}
        characterState={cpu}
        onPositionChange={moveCPU}
        onVelocityChange={updateCPUVelocity}
        onDirectionChange={setCPUDirection}
        onJumpingChange={setCPUJumping}
        onAttackingChange={setCPUAttacking}
        onBlockingChange={setCPUBlocking}
      />
    </>
  );
};

export default GameManager;
