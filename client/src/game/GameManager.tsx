import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useFighting } from "../lib/stores/useFighting";
import { log } from "../lib/logger";
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
  stayInArenaZ,
  PLAYER_SPEED,
  JUMP_FORCE,
  ATTACK_RANGE,
  GRAVITY,
  getPlatformHeight,
  isOnPlatform
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
  
  const { debugMode } = useControls();
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

  // Initialize CPU controller
  const [cpuController] = useState(() => new CPUController(CPUDifficulty.MEDIUM));
  
  // Refs for timing
  const lastFrameTime = useRef(Date.now());
  
  // Get keyboard state
  const [, getKeyboardState] = useKeyboardControls<Controls>();
  
  // Extract the forward key state directly from the keyboard controls
  const forwardKey = useKeyboardControls(state => state.forward);
  
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
        
        log(`Player hit CPU with a ${attackName} for ${damage} damage!`);
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
          log("CPU hit player with a PUNCH for", damageAmount, "damage!");
        } else if (attackType < 0.9) {
          // Kick - medium chance
          damageAmount = KICK_DAMAGE;
          log("CPU hit player with a KICK for", damageAmount, "damage!");
        } else {
          // Special - rare but powerful
          damageAmount = SPECIAL_DAMAGE;
          log("CPU hit player with a SPECIAL ATTACK for", damageAmount, "damage!");
        }
        
        damagePlayer(damageAmount);
        playHit();
      }
    }
  }, [player.isAttacking, cpu.isAttacking, player.position, cpu.position, player.direction, cpu.direction, damagePlayer, damageCPU, playHit, getKeyboardState]);
  
  // Handle player keyboard controls directly with 3D Smash Bros style movement
  useFrame(() => {
    if (gamePhase !== 'fighting') return;
    
    // Get current keyboard state with the new control scheme
    const { 
      jump, forward, backward, leftward, rightward, 
      attack1, attack2, shield, special,
      dodge, airAttack, grab, taunt
    } = getKeyboardState();
    
    // Log keyboard state periodically for debugging
    if (Math.random() < 0.01) {
      log("Current keyboard state:", { 
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
        log("Moving player LEFT");
        // Air control is more limited (Smash Bros style)
        newVX = player.isJumping ? Math.max(-PLAYER_SPEED * 0.7, playerVX - 0.01) : -PLAYER_SPEED;
        newDirection = -1;
      } else if (rightward) {
        log("Moving player RIGHT");
        // Air control is more limited (Smash Bros style)
        newVX = player.isJumping ? Math.min(PLAYER_SPEED * 0.7, playerVX + 0.01) : PLAYER_SPEED;
        newDirection = 1;
      } else {
        // Apply drag when not pressing movement keys on X-axis
        newVX = newVX * (player.isJumping ? 0.98 : 0.95); // Less drag in air (Smash Bros style)
      }
      
      // Forward/Backward movement (Z-axis) - NEW 3D MOVEMENT
      if (forward) {
        log("Moving player FORWARD"); // In 3D space, "forward" is toward camera (negative Z)
        // Air control is more limited in the air
        newVZ = player.isJumping ? Math.max(-PLAYER_SPEED * 0.7, playerVZ - 0.01) : -PLAYER_SPEED;
      } else if (backward) {
        log("Moving player BACKWARD"); // In 3D space, "backward" is away from camera (positive Z)
        // Air control is more limited in the air
        newVZ = player.isJumping ? Math.min(PLAYER_SPEED * 0.7, playerVZ + 0.01) : PLAYER_SPEED;
      } else {
        // Apply drag when not pressing movement keys on Z-axis
        newVZ = newVZ * (player.isJumping ? 0.98 : 0.95); // Less drag in air
      }
    }
    
    // Update player direction
    if (newDirection !== player.direction) {
      setPlayerDirection(newDirection);
    }
    
    // --- JUMPING SYSTEM (SMASH BROS STYLE) ---
    
    // First jump (normal jump from ground) - now using W key for jump
    if (jump && !player.isJumping && playerY <= 0.01 && canAct) {
      log("Player JUMPING - JUMP_FORCE:", JUMP_FORCE);
      // Apply a strong upward velocity
      newVY = JUMP_FORCE;
      setPlayerJumping(true);
      playJump(); // Play jump sound
      // Reset air jumps when starting a new jump
      resetPlayerAirJumps();
    }
    // Air jump (double/triple jump in midair - Smash Bros style)
    else if (jump && player.isJumping && player.airJumpsLeft > 0) {
      // Only air jump on key press, not hold
      if (Math.random() < 0.2) { // Simulate a key press check (we're running every frame)
        log("Player AIR JUMP! Remaining:", player.airJumpsLeft - 1);
        // Slightly weaker jump for air jumps
        newVY = JUMP_FORCE * 0.8;
        usePlayerAirJump();
        playJump(); // Play jump sound for air jumps too
      }
    }
    
    // Debug message for jump state
    if (jump && Math.random() < 0.05) {
      log("Jump key pressed, playerY:", playerY, "isJumping:", player.isJumping, "airJumpsLeft:", player.airJumpsLeft);
    }
    
    // Apply gravity to player with platform collision detection 
    // Allow dropping through platforms when pressing down and player is on a platform above ground level
    const platformHeight = getPlatformHeight(playerX, playerZ);
    const dropThrough = backward && platformHeight > 0 && Math.abs(playerY - platformHeight) < 0.1;
    
    if (dropThrough) {
      log("Player dropping through platform at height:", platformHeight);
    }
    
    const [newY, gravityVY] = applyGravity(playerY, newVY, playerX, playerZ, dropThrough);
    newVY = gravityVY; // Update with gravity effect
    
    // Update jumping state when landing on a platform or ground
    if (player.isJumping && (Math.abs(newY - platformHeight) < 0.1 || newY <= 0.01)) {
      setPlayerJumping(false);
      // Reset air jumps when landing
      resetPlayerAirJumps();
      // Play landing sound effect
      playLand();
      log("Player landed on platform at height:", platformHeight);
    }
    
    // --- ATTACK SYSTEM (SMASH BROS STYLE) ---
    
    // Ground attacks (only when not jumping)
    if (!player.isJumping && canAct) {
      // Quick attack (attack1)
      if (attack1 && player.attackCooldown <= 0) {
        log("Player QUICK ATTACK");
        setPlayerAttacking(true);
        playPunch(); // Use specific punch sound effect
        
        // Reset attack after delay
        setTimeout(() => {
          setPlayerAttacking(false);
        }, 400);
      }
      
      // Strong attack (attack2)
      else if (attack2 && player.attackCooldown <= 0) {
        log("Player STRONG ATTACK");
        setPlayerAttacking(true);
        playKick(); // Use specific kick sound effect
        
        // Reset attack after delay
        setTimeout(() => {
          setPlayerAttacking(false);
        }, 500);
      }
      
      // Special attack
      else if (special && player.attackCooldown <= 0) {
        log("Player SPECIAL");
        setPlayerAttacking(true);
        playSpecial(); // Use specific special attack sound effect
        
        // Reset attack after delay
        setTimeout(() => {
          setPlayerAttacking(false);
        }, 600);
      }
      
      // Grab attack (new Smash Bros style)
      else if (grab && player.grabCooldown <= 0) {
        log("Player GRAB");
        setPlayerGrabbing(true);
        playGrab(); // Play grab sound
        
        // Reset grab after delay
        setTimeout(() => {
          setPlayerGrabbing(false);
          
          // Check if grab connected at the end
          const distanceToCPU = Math.abs(player.position[0] - cpu.position[0]);
          if (distanceToCPU < ATTACK_RANGE * 0.6) { // Grab has shorter range than attacks
            log("Player GRAB CONNECTED!");
            // Apply throw damage
            damageCPU(20);
            playThrow(); // Play throw sound when successful
            
            // Throw CPU away from player
            const throwDirection = player.direction * 0.4; // Throw in facing direction
            const throwUpForce = 0.4; // Throw upward for juggle
            updateCPUVelocity(throwDirection, throwUpForce, 0);
            setCPUJumping(true);
          }
        }, 400);
      }
      
      // Taunt (just for fun, no gameplay effect)
      else if (taunt && !player.isTaunting) {
        log("Player TAUNT");
        setPlayerTaunting(true);
        playTaunt(); // Play taunt sound
        
        // End taunt after delay
        setTimeout(() => {
          setPlayerTaunting(false);
        }, 1200); // Taunts are longer
      }
    }
    // Air attacks (only when jumping - Smash Bros style)
    else if (player.isJumping && !player.isAirAttacking && player.attackCooldown <= 0) {
      // Air attack
      if (airAttack || attack1 || attack2) {
        log("Player AIR ATTACK");
        setPlayerAirAttacking(true);
        playPunch(); // Use punch sound for air attacks
        
        // Reset air attack after delay
        setTimeout(() => {
          setPlayerAirAttacking(false);
        }, 500);
      }
      // Air special
      else if (special) {
        log("Player AIR SPECIAL");
        setPlayerAirAttacking(true);
        playSpecial(); // Use special sound for air specials
        
        // Reset air attack after delay
        setTimeout(() => {
          setPlayerAirAttacking(false);
        }, 600);
      }
    }
    
    // --- DEFENSIVE ACTIONS ---
    
    // Handle blocking with shield key
    if (shield && canAct) {
      if (!player.isBlocking) {
        playBlock(); // Play block sound when starting to block
      }
      setPlayerBlocking(true);
    } else if (player.isBlocking) {
      setPlayerBlocking(false);
    }
    
    // Handle dodging (new Smash Bros style)
    if (dodge && canAct && player.dodgeCooldown <= 0) {
      log("Player DODGE");
      setPlayerDodging(true);
      playDodge(); // Play dodge sound
      
      // Give a small burst of movement when dodging in a direction
      if (leftward) {
        newVX = -PLAYER_SPEED * 2; // Dodge left quickly
      } else if (rightward) {
        newVX = PLAYER_SPEED * 2; // Dodge right quickly
      }
      
      // End dodge after short delay
      setTimeout(() => {
        setPlayerDodging(false);
      }, 300); // Short invulnerability frames
    }
    
    // Calculate the new X position, staying within arena bounds
    const newX = stayInArena(playerX + newVX);
    
    // Calculate the new Z position, staying within arena bounds - NEW 3D MOVEMENT
    const newZ = stayInArenaZ(playerZ + newVZ);
    
    // Update player position and velocity with 3D movement
    movePlayer(newX, newY, newZ);
    updatePlayerVelocity(newVX, newVY, newVZ);
    
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
      log("Player attack cooldown:", player.attackCooldown);
      log("CPU attack cooldown:", cpu.attackCooldown);
      
      // Debug the distance between characters to help with attack range tuning
      const [playerX] = player.position;
      const [cpuX] = cpu.position;
      const distance = Math.abs(playerX - cpuX);
      log("Distance between player and CPU:", distance.toFixed(2), "Attack range:", ATTACK_RANGE);
    }
    
    // Update CPU behavior with all Smash Bros style actions
    cpuController.update(
      cpu,
      player,
      moveCPU,
      updateCPUVelocity,
      setCPUDirection,
      setCPUJumping,
      setCPUAttacking,
      setCPUBlocking,
      // New Smash Bros style actions
      setCPUDodging,
      setCPUGrabbing,
      setCPUTaunting,
      setCPUAirAttacking,
      resetCPUAirJumps,
      useCPUAirJump
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
