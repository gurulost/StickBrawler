import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useFighting } from "../lib/stores/useFighting";
import StickFigure from "./StickFigure";
import Arena from "./Arena";
import { CPUController, CPUDifficulty } from "./CPU";
import { 
  checkAttackHit, 
  PUNCH_DAMAGE, 
  KICK_DAMAGE, 
  SPECIAL_DAMAGE, 
  applyGravity, 
  stayInArena, 
  PLAYER_SPEED,
  JUMP_FORCE,
  ATTACK_RANGE
} from "./Physics";
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
    updateRoundTime,
    updatePlayerCooldowns,
    updateCPUCooldowns
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
        let attackName = "PUNCH";
        
        if (kick) {
          damage = KICK_DAMAGE;
          attackName = "KICK";
        }
        if (special) {
          damage = SPECIAL_DAMAGE;
          attackName = "SPECIAL ATTACK";
        }
        
        console.log(`Player hit CPU with a ${attackName} for ${damage} damage!`);
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
        // Randomly determine CPU attack damage based on attack type
        const attackType = Math.random();
        let damageAmount = PUNCH_DAMAGE;
        
        if (attackType < 0.7) {
          // Punch - most common
          damageAmount = PUNCH_DAMAGE;
          console.log("CPU hit player with a PUNCH for", damageAmount, "damage!");
        } else if (attackType < 0.9) {
          // Kick - medium chance
          damageAmount = KICK_DAMAGE;
          console.log("CPU hit player with a KICK for", damageAmount, "damage!");
        } else {
          // Special - rare but powerful
          damageAmount = SPECIAL_DAMAGE;
          console.log("CPU hit player with a SPECIAL ATTACK for", damageAmount, "damage!");
        }
        
        damagePlayer(damageAmount);
        playHit();
      }
    }
  }, [player.isAttacking, cpu.isAttacking, player.position, cpu.position, player.direction, cpu.direction, damagePlayer, damageCPU, playHit, getKeyboardState]);
  
  // Handle player keyboard controls directly
  useFrame(() => {
    if (gamePhase !== 'fighting') return;
    
    // Get current keyboard state
    const { 
      forward, backward, leftward, rightward, 
      punch, kick, block, special 
    } = getKeyboardState();
    
    // Log keyboard state periodically for debugging
    if (Math.random() < 0.01) {
      console.log("Current keyboard state:", { 
        forward, backward, leftward, rightward, 
        punch, kick, block, special
      });
    }
    
    // Handle player movement directly here
    const [playerX, playerY, playerZ] = player.position;
    const [playerVX, playerVY, playerVZ] = player.velocity;
    
    // Movement
    let newVX = playerVX;
    let newDirection = player.direction;
    
    if (leftward) {
      console.log("Moving player LEFT");
      newVX = -PLAYER_SPEED;
      newDirection = -1;
    } else if (rightward) {
      console.log("Moving player RIGHT");
      newVX = PLAYER_SPEED;
      newDirection = 1;
    } else {
      // Apply drag when not pressing movement keys
      newVX = newVX * 0.95; // Apply drag - simplified version
    }
    
    // Update player state
    if (newDirection !== player.direction) {
      setPlayerDirection(newDirection);
    }
    
    // Handle jumping
    if (forward && !player.isJumping && playerY <= 0.01) {
      console.log("Player JUMPING");
      updatePlayerVelocity(newVX, JUMP_FORCE, playerVZ);
      setPlayerJumping(true);
    }
    
    // Debug message - should help us understand jump state
    if (forward) {
      console.log("Forward key pressed, playerY:", playerY, "isJumping:", player.isJumping);
    }
    
    // Apply gravity to player
    const [newY, newVY] = applyGravity(playerY, playerVY);
    
    // Update jumping state
    if (player.isJumping && newY <= 0.01) {
      setPlayerJumping(false);
    }
    
    // Handle attacks and blocking
    if (punch && !player.isAttacking && !player.isBlocking && player.attackCooldown <= 0) {
      console.log("Player PUNCH");
      setPlayerAttacking(true);
      playHit();
      
      // Reset attack after delay
      setTimeout(() => {
        setPlayerAttacking(false);
      }, 400);
    }
    
    if (kick && !player.isAttacking && !player.isBlocking && player.attackCooldown <= 0) {
      console.log("Player KICK");
      setPlayerAttacking(true);
      playHit();
      
      // Reset attack after delay
      setTimeout(() => {
        setPlayerAttacking(false);
      }, 500);
    }
    
    if (special && !player.isAttacking && !player.isBlocking && player.attackCooldown <= 0) {
      console.log("Player SPECIAL");
      setPlayerAttacking(true);
      playHit();
      
      // Reset attack after delay
      setTimeout(() => {
        setPlayerAttacking(false);
      }, 600);
    }
    
    // Handle blocking
    setPlayerBlocking(block && !player.isAttacking);
    
    // Calculate the new X position, staying within arena bounds
    const newX = stayInArena(playerX + newVX);
    
    // Update player position and velocity
    movePlayer(newX, newY, playerZ);
    updatePlayerVelocity(newVX, newVY, playerVZ);
    
    // Main game update loop
    // Calculate time delta in seconds
    const now = Date.now();
    const delta = (now - lastFrameTime.current) / 1000;
    lastFrameTime.current = now;
    
    // Update game time
    updateRoundTime(delta);
    
    // Update attack cooldowns
    updatePlayerCooldowns(delta);
    updateCPUCooldowns(delta);
    
    // Log cooldown values for debugging
    if (Math.random() < 0.01) {
      console.log("Player attack cooldown:", player.attackCooldown);
      console.log("CPU attack cooldown:", cpu.attackCooldown);
      
      // Debug the distance between characters to help with attack range tuning
      const [playerX] = player.position;
      const [cpuX] = cpu.position;
      const distance = Math.abs(playerX - cpuX);
      console.log("Distance between player and CPU:", distance.toFixed(2), "Attack range:", ATTACK_RANGE);
    }
    
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
