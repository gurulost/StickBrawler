import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useFighting } from "../lib/stores/useFighting";
import StickFigure from "./StickFigure";
import Arena from "./Arena";
import { CPUDifficulty } from "./CPU";
import { CPUUpdater } from "./CPUUpdater";
import { 
  checkAttackHit, 
  PUNCH_DAMAGE, 
  KICK_DAMAGE, 
  SPECIAL_DAMAGE, 
  applyGravity, 
  stayInArena,
  stayInArenaZ,
  PLAYER_SPEED,
  JUMP_FORCE,
  ATTACK_RANGE,
  GRAVITY,
  getPlatformHeight,
  isOnPlatform
} from "./Physics";
import { useControls } from "../lib/stores/useControls";
import { usePlayerControls } from "../hooks/use-player-controls";
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
    // New Super Smash Bros style actions
    setPlayerDodging,
    setPlayerGrabbing,
    setPlayerTaunting,
    setPlayerAirAttacking,
    resetPlayerAirJumps,
    usePlayerAirJump,
    setCPUDodging,
    setCPUGrabbing,
    setCPUTaunting,
    setCPUAirAttacking,
    resetCPUAirJumps,
    useCPUAirJump,
    // Original actions
    damagePlayer,
    damageCPU,
    updateRoundTime,
    updatePlayerCooldowns,
    updateCPUCooldowns
  } = useFighting();
  
  const { 
    playHit, 
    playPunch, 
    playKick, 
    playSpecial, 
    playBlock, 
    playJump,
    playLand,
    playDodge,
    playGrab,
    playThrow,
    playTaunt,
    playComboHit,
    playSuccess
  } = useAudio();

  // Initialize CPU updater
  const [cpuUpdater] = useState(() => new CPUUpdater(CPUDifficulty.MEDIUM));
  
  // Refs for timing
  const lastFrameTime = useRef(Date.now()); // Initialized ref
  
  // Get keyboard state through custom hook
  const getKeyboardState = usePlayerControls();
  
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
        const { attack1, attack2, special } = getKeyboardState();
        
        let damage = PUNCH_DAMAGE;
        let attackName = "QUICK ATTACK";
        
        if (attack2) {
          damage = KICK_DAMAGE;
          attackName = "STRONG ATTACK";
        }
        if (special) {
          damage = SPECIAL_DAMAGE;
          attackName = "SPECIAL ATTACK";
        }
        
        if (useControls.getState().debugMode) {
          console.log(`Player hit CPU with a ${attackName} for ${damage} damage!`);
        }
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
          if (useControls.getState().debugMode) {
            console.log("CPU hit player with a PUNCH for", damageAmount, "damage!");
          }
        } else if (attackType < 0.9) {
          // Kick - medium chance
          damageAmount = KICK_DAMAGE;
          if (useControls.getState().debugMode) {
            console.log("CPU hit player with a KICK for", damageAmount, "damage!");
          }
        } else {
          // Special - rare but powerful
          damageAmount = SPECIAL_DAMAGE;
          if (useControls.getState().debugMode) {
            console.log("CPU hit player with a SPECIAL ATTACK for", damageAmount, "damage!");
          }
        }
        
        damagePlayer(damageAmount);
        playHit();
      }
    }
  }, [player.isAttacking, cpu.isAttacking, player.position, cpu.position, player.direction, cpu.direction, damagePlayer, damageCPU, playHit, getKeyboardState]);
  
  // Handle player keyboard controls directly with 3D Smash Bros style movement
  useFrame((state, frameDelta) => { // Renamed useFrame's delta to frameDelta to avoid confusion
    if (gamePhase !== 'fighting') return;

    // Calculate time delta in seconds at the start of the frame using the ref
    const now = Date.now();
    const delta = (now - lastFrameTime.current) / 1000; // This is the delta used for game logic
    lastFrameTime.current = now;
    
    // Get current keyboard state with the new control scheme
    const { 
      jump, forward, backward, leftward, rightward, 
      attack1, attack2, shield, special,
      dodge, airAttack, grab, taunt
    } = getKeyboardState();
    
    // Log keyboard state periodically for debugging
    if (Math.random() < 0.01 && useControls.getState().debugMode) {
      console.log("Current keyboard state:", {
        jump, forward, backward, leftward, rightward,
        attack1, attack2, shield, special,
        dodge, airAttack, grab, taunt
      });
    }
    
    // Handle player movement directly here
    const [playerX, playerY, playerZ] = player.position;
    const [playerVX, playerVY, playerVZ] = player.velocity;
    
    // Check if player is in actionable state (not in the middle of an attack, etc.)
    const canAct = !player.isAttacking && !player.isBlocking && !player.isDodging && 
                   !player.isGrabbing && !player.isTaunting && !player.isAirAttacking;
    
    // Movement
    let newVX = playerVX;
    let newVY = playerVY;
    let newVZ = playerVZ; // New Z-axis velocity for forward/backward movement
    let newDirection = player.direction;
    
    if (canAct || player.isJumping) { // Allow air control while jumping
      // Left/Right movement (X-axis)
      if (leftward) {
        if (useControls.getState().debugMode) {
          console.log("Moving player LEFT");
        }
        newVX = player.isJumping ? Math.max(-PLAYER_SPEED * 0.7, playerVX - 0.01) : -PLAYER_SPEED;
        newDirection = -1;
      } else if (rightward) {
        if (useControls.getState().debugMode) {
          console.log("Moving player RIGHT");
        }
        newVX = player.isJumping ? Math.min(PLAYER_SPEED * 0.7, playerVX + 0.01) : PLAYER_SPEED;
        newDirection = 1;
      } else {
        newVX = newVX * (player.isJumping ? 0.98 : 0.95); 
      }
      
      // Forward/Backward movement (Z-axis) - NEW 3D MOVEMENT
      if (forward) {
        if (useControls.getState().debugMode) {
          console.log("Moving player FORWARD"); 
        }
        newVZ = player.isJumping ? Math.max(-PLAYER_SPEED * 0.7, playerVZ - 0.01) : -PLAYER_SPEED;
      } else if (backward) {
        if (useControls.getState().debugMode) {
          console.log("Moving player BACKWARD"); 
        }
        newVZ = player.isJumping ? Math.min(PLAYER_SPEED * 0.7, playerVZ + 0.01) : PLAYER_SPEED;
      } else {
        newVZ = newVZ * (player.isJumping ? 0.98 : 0.95); 
      }
    }
    
    if (newDirection !== player.direction) {
      setPlayerDirection(newDirection);
    }
    
    if (jump && !player.isJumping && playerY <= 0.01 && canAct) {
      if (useControls.getState().debugMode) {
        console.log("Player JUMPING - JUMP_FORCE:", JUMP_FORCE);
      }
      newVY = JUMP_FORCE;
      setPlayerJumping(true);
      playJump(); 
      resetPlayerAirJumps();
    }
    else if (jump && player.isJumping && player.airJumpsLeft > 0) {
      if (Math.random() < 0.2) { 
        if (useControls.getState().debugMode) {
          console.log("Player AIR JUMP! Remaining:", player.airJumpsLeft - 1);
        }
        newVY = JUMP_FORCE * 0.8;
        usePlayerAirJump();
        playJump(); 
      }
    }
    
    if (jump && Math.random() < 0.05 && useControls.getState().debugMode) {
      console.log("Jump key pressed, playerY:", playerY, "isJumping:", player.isJumping, "airJumpsLeft:", player.airJumpsLeft);
    }
    
    const platformHeight = getPlatformHeight(playerX, playerZ);
    const dropThrough = backward && platformHeight > 0 && Math.abs(playerY - platformHeight) < 0.1;
    
    if (dropThrough && useControls.getState().debugMode) {
      console.log("Player dropping through platform at height:", platformHeight);
    }
    
    const [newY, gravityVY] = applyGravity(playerY, newVY, playerX, playerZ, dropThrough, delta);
    newVY = gravityVY; 
    
    if (player.isJumping && (Math.abs(newY - platformHeight) < 0.1 || newY <= 0.01)) {
      setPlayerJumping(false);
      resetPlayerAirJumps();
      playLand();
      if (useControls.getState().debugMode) {
        console.log("Player landed on platform at height:", platformHeight);
      }
    }
    
    if (!player.isJumping && canAct) {
      if (attack1 && player.attackCooldown <= 0) {
        if (useControls.getState().debugMode) {
          console.log("Player QUICK ATTACK");
        }
        setPlayerAttacking(true);
        playPunch(); 
        setTimeout(() => {
          setPlayerAttacking(false);
        }, 400);
      }
      else if (attack2 && player.attackCooldown <= 0) {
        if (useControls.getState().debugMode) {
          console.log("Player STRONG ATTACK");
        }
        setPlayerAttacking(true);
        playKick(); 
        setTimeout(() => {
          setPlayerAttacking(false);
        }, 500);
      }
      else if (special && player.attackCooldown <= 0) {
        if (useControls.getState().debugMode) {
          console.log("Player SPECIAL");
        }
        setPlayerAttacking(true);
        playSpecial(); 
        setTimeout(() => {
          setPlayerAttacking(false);
        }, 600);
      }
      else if (grab && player.grabCooldown <= 0) {
        if (useControls.getState().debugMode) {
          console.log("Player GRAB");
        }
        setPlayerGrabbing(true);
        playGrab(); 
        setTimeout(() => {
          setPlayerGrabbing(false);
          const distanceToCPU = Math.abs(player.position[0] - cpu.position[0]);
          if (distanceToCPU < ATTACK_RANGE * 0.6) { 
            if (useControls.getState().debugMode) {
              console.log("Player GRAB CONNECTED!");
            }
            damageCPU(20);
            playThrow(); 
            const throwDirection = player.direction * 0.4; 
            const throwUpForce = 0.4; 
            updateCPUVelocity(throwDirection, throwUpForce, 0);
            setCPUJumping(true);
          }
        }, 400);
      }
      else if (taunt && !player.isTaunting) {
        if (useControls.getState().debugMode) {
          console.log("Player TAUNT");
        }
        setPlayerTaunting(true);
        playTaunt(); 
        setTimeout(() => {
          setPlayerTaunting(false);
        }, 1200); 
      }
    }
    else if (player.isJumping && !player.isAirAttacking && player.attackCooldown <= 0) {
      if (airAttack || attack1 || attack2) {
        if (useControls.getState().debugMode) {
          console.log("Player AIR ATTACK");
        }
        setPlayerAirAttacking(true);
        playPunch(); 
        setTimeout(() => {
          setPlayerAirAttacking(false);
        }, 500);
      }
      else if (special) {
        if (useControls.getState().debugMode) {
          console.log("Player AIR SPECIAL");
        }
        setPlayerAirAttacking(true);
        playSpecial(); 
        setTimeout(() => {
          setPlayerAirAttacking(false);
        }, 600);
      }
    }
    
    if (shield && canAct) {
      if (!player.isBlocking) {
        playBlock(); 
      }
      setPlayerBlocking(true);
    } else if (player.isBlocking) {
      setPlayerBlocking(false);
    }
    
    if (dodge && canAct && player.dodgeCooldown <= 0) {
      if (useControls.getState().debugMode) {
        console.log("Player DODGE");
      }
      setPlayerDodging(true);
      playDodge(); 
      if (leftward) {
        newVX = -PLAYER_SPEED * 2; 
      } else if (rightward) {
        newVX = PLAYER_SPEED * 2; 
      }
      setTimeout(() => {
        setPlayerDodging(false);
      }, 300); 
    }
    
    const newX = stayInArena(playerX + newVX * delta);
    const newZ = stayInArenaZ(playerZ + newVZ * delta);
    
    movePlayer(newX, newY, newZ);
    updatePlayerVelocity(newVX, newVY, newVZ);
    
    // Main game update loop
    // updateRoundTime, updatePlayerCooldowns, and updateCPUCooldowns are called with the locally calculated 'delta'
    updateRoundTime(delta);
    updatePlayerCooldowns(delta);
    updateCPUCooldowns(delta);
    
    if (Math.random() < 0.01 && useControls.getState().debugMode) {
      console.log("Player attack cooldown:", player.attackCooldown);
      console.log("CPU attack cooldown:", cpu.attackCooldown);
      const [px] = player.position; // Renamed to avoid conflict
      const [cx] = cpu.position;    // Renamed to avoid conflict
      const dist = Math.abs(px - cx); // Renamed to avoid conflict
      console.log("Distance between player and CPU:", dist.toFixed(2), "Attack range:", ATTACK_RANGE);
    }
    
    cpuUpdater.update(
      cpu,
      player,
      moveCPU,
      updateCPUVelocity,
      setCPUDirection,
      setCPUJumping,
      setCPUAttacking,
      setCPUBlocking,
      setCPUDodging,
      setCPUGrabbing,
      setCPUTaunting,
      setCPUAirAttacking,
      resetCPUAirJumps,
      useCPUAirJump,
      delta // Pass the locally calculated delta here
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