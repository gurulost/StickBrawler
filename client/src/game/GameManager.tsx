import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { useFighting } from "../lib/stores/useFighting";
import StickFigure from "./StickFigure";
import Arena from "./Arena";
import { CpuBrain, CpuStyle } from "./cpuBrain";
import {
  applyGravity,
  PLAYER_SPEED,
  JUMP_FORCE,
  getPlatformHeight,
  isOnPlatform,
  applyHorizontalFriction,
  resolveCapsuleBounds,
  computeHitLagSeconds,
  applyHitLagTimer,
} from "./Physics";
import { useControls } from "../lib/stores/useControls";
import { usePlayerControls } from "../hooks/use-player-controls";
import { useAudio } from "../lib/stores/useAudio";
import {
  CombatStateMachine,
  coreMoves,
  resolveHits,
  type FighterCombatState,
  type MoveDefinition,
} from "../combat";
import {
  applyKnockbackToVelocity,
  comboScale,
  selectMoveFromInputs,
  toCombatState,
  type PlayerInputState,
} from "./combatBridge";
import { recordTelemetry, drainTelemetry } from "./combatTelemetry";

const PLAYER_MOVE_ORDER: Array<keyof PlayerInputState> = [
  "special",
  "attack2",
  "attack1",
  "airAttack",
  "grab",
];
const DEFAULT_GUARD_VALUE = 80;
const GUARD_BREAK_THRESHOLD = 5;
const GUARD_BREAK_RECOVERY_RATIO = 0.35;

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
    setCPUAirAttacking,
    resetCPUAirJumps,
    useCPUAirJump,
    // Original actions
    damagePlayer,
    damageCPU,
    updateRoundTime,
    updatePlayerCooldowns,
    updateCPUCooldowns,
    updatePlayerMeters,
    updateCPUMeters,
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
    playSuccess
  } = useAudio();

  // Refs for timing and combat state
  const lastFrameTime = useRef(Date.now()); // Initialized ref
  const playerMachineRef = useRef(new CombatStateMachine());
  const playerCombatStateRef = useRef<FighterCombatState>(toCombatState(player));
  const playerHitRegistryRef = useRef(new Set<string>());
  const playerPrevMoveIdRef = useRef<string | undefined>(undefined);
  const playerHitLagRef = useRef(0);
  const cpuMachineRef = useRef(new CombatStateMachine());
  const cpuCombatStateRef = useRef<FighterCombatState>(toCombatState(cpu));
  const cpuHitRegistryRef = useRef(new Set<string>());
  const cpuPrevMoveIdRef = useRef<string | undefined>(undefined);
  const cpuHitLagRef = useRef(0);
  const cpuBrainRef = useRef(new CpuBrain({ style: CpuStyle.BALANCED }));
  
  // Get keyboard state through custom hook
  const getKeyboardState = usePlayerControls();
  
  // Handle player keyboard controls directly with 3D Smash Bros style movement
  useFrame((state, frameDelta) => { // Renamed useFrame's delta to frameDelta to avoid confusion
    if (gamePhase !== 'fighting') return;

    // Calculate time delta in seconds at the start of the frame using the ref
    const now = Date.now();
    const delta = (now - lastFrameTime.current) / 1000; // This is the delta used for game logic
    lastFrameTime.current = now;
    playerHitLagRef.current = applyHitLagTimer(playerHitLagRef.current, delta);
    cpuHitLagRef.current = applyHitLagTimer(cpuHitLagRef.current, delta);
    const playerInHitLag = playerHitLagRef.current > 0;
    const cpuInHitLag = cpuHitLagRef.current > 0;
    
    // Get current keyboard state with the new control scheme
    const keyboardState = getKeyboardState();
    const { 
      jump, forward, backward, leftward, rightward, 
      attack1, attack2, shield, special,
      dodge, airAttack, grab, taunt
    } = keyboardState;

    const cpuControlState = cpuBrainRef.current.tick(
      cpuCombatStateRef.current,
      playerCombatStateRef.current,
      delta,
    );
    
    const playerInputs: PlayerInputState & Record<string, boolean> = {
      attack1,
      attack2,
      special,
      airAttack,
      grab,
      dodge,
      ...keyboardState,
    };
    if (playerInHitLag) {
      playerInputs.attack1 = false;
      playerInputs.attack2 = false;
      playerInputs.special = false;
      playerInputs.airAttack = false;
      playerInputs.grab = false;
    }
    
    const applyGuardDamageToPlayer = (amount: number) => {
      if (amount <= 0) return;
      const current = playerCombatStateRef.current.guardMeter;
      const next = Math.max(0, current - amount);
      const guardBroken = current > GUARD_BREAK_THRESHOLD && next <= GUARD_BREAK_THRESHOLD;
      playerCombatStateRef.current.guardMeter = guardBroken
        ? DEFAULT_GUARD_VALUE * GUARD_BREAK_RECOVERY_RATIO
        : next;
      if (guardBroken) {
        setPlayerBlocking(false);
        setPlayerDodging(false);
        setPlayerAttacking(false);
        damagePlayer(5);
        updatePlayerVelocity(
          player.velocity[0] - player.direction * 0.35,
          Math.max(player.velocity[1], 0.2),
          player.velocity[2],
        );
        playHit();
      }
    };
    
    const applyGuardDamageToCpu = (amount: number) => {
      if (amount <= 0) return;
      const current = cpuCombatStateRef.current.guardMeter;
      const next = Math.max(0, current - amount);
      const guardBroken = current > GUARD_BREAK_THRESHOLD && next <= GUARD_BREAK_THRESHOLD;
      cpuCombatStateRef.current.guardMeter = guardBroken
        ? DEFAULT_GUARD_VALUE * GUARD_BREAK_RECOVERY_RATIO
        : next;
      if (guardBroken) {
        setCPUBlocking(false);
        setCPUDodging(false);
        setCPUAttacking(false);
        damageCPU(5);
        updateCPUVelocity(
          cpu.velocity[0] + cpu.direction * 0.35,
          Math.max(cpu.velocity[1], 0.2),
          cpu.velocity[2],
        );
        playHit();
      }
    };
    
    const playerIsAirborne = player.position[1] > 0.15 || player.isJumping;
    const requestedMove = selectMoveFromInputs(
      playerInputs,
      PLAYER_MOVE_ORDER,
      coreMoves,
      playerIsAirborne,
    );
    
    const machineInputs = {
      ...playerInputs,
      ...(requestedMove ? { [requestedMove.id]: true } : {}),
    };
    
    const cpuStateSnapshot: FighterCombatState = {
      ...cpuCombatStateRef.current,
      position: cpu.position,
      velocity: cpu.velocity,
      inAir: cpu.position[1] > 0.15 || cpu.isJumping,
      facing: cpu.direction,
    };
    const updatedCombatState = playerMachineRef.current.update({
      state: {
        ...playerCombatStateRef.current,
        position: player.position,
        velocity: player.velocity,
        inAir: playerIsAirborne,
        facing: player.direction,
      },
      opponent: cpuStateSnapshot,
      inputs: machineInputs,
      delta: (playerInHitLag ? 0 : delta) * 60,
      availableMoves: coreMoves,
    });
    
    const prevMoveId = playerPrevMoveIdRef.current;
    if (updatedCombatState.moveId !== prevMoveId) {
      playerHitRegistryRef.current.clear();
      if (updatedCombatState.moveId) {
        playMoveStartAudio(coreMoves[updatedCombatState.moveId], {
          playPunch,
          playKick,
          playSpecial,
        });
      }
      playerPrevMoveIdRef.current = updatedCombatState.moveId;
    }
    
    playerCombatStateRef.current = updatedCombatState;
    const playerAction = updatedCombatState.action;
    setPlayerAttacking(playerAction === "attack");
    setPlayerDodging(playerAction === "dodge");
    setPlayerAirAttacking(updatedCombatState.inAir && playerAction === "attack");
    
    if (updatedCombatState.moveId) {
      const moveDef = coreMoves[updatedCombatState.moveId];
      const hits = resolveHits({
        attacker: updatedCombatState,
        defender: cpuStateSnapshot,
        move: moveDef,
        scaledDamage: comboScale(player.comboCount),
      });
      
      const newHits = hits.filter(
        (hit) => !playerHitRegistryRef.current.has(`${hit.moveId}:${hit.hitboxId}`),
      );
      
      if (newHits.length) {
        newHits.forEach((hit) => {
          const blocking = cpu.isBlocking;
          const baseDamage = Math.round(hit.damage);
          if (blocking) {
            const chip = Math.max(1, Math.round(baseDamage * 0.25));
            damageCPU(chip);
            applyGuardDamageToCpu(hit.guardDamage);
          } else {
            damageCPU(baseDamage);
          }
          const [vx, vy, vz] = applyKnockbackToVelocity(cpu, hit);
          updateCPUVelocity(vx, vy, vz);
          setCPUDirection(hit.knockbackVector[0] < 0 ? -1 : 1);
          playerHitRegistryRef.current.add(`${hit.moveId}:${hit.hitboxId}`);
          recordTelemetry({
            source: "player",
            hit,
            timestamp: performance.now(),
            comboCount: player.comboCount,
          });
          playerHitLagRef.current = Math.max(
            playerHitLagRef.current,
            computeHitLagSeconds(hit.hitLag),
          );
          cpuHitLagRef.current = Math.max(
            cpuHitLagRef.current,
            computeHitLagSeconds(hit.hitLag),
          );
        });
        playHit();
      }
    } else {
      playerHitRegistryRef.current.clear();
    }

    const cpuIsAirborne = cpu.position[1] > 0.15 || cpu.isJumping;
    const cpuDx = player.position[0] - cpu.position[0];
    const cpuDz = player.position[2] - cpu.position[2];
    const planarDistance = Math.hypot(cpuDx, cpuDz);
    const cpuInputs: PlayerInputState = {
      attack1: cpuControlState.attack1,
      attack2: cpuControlState.attack2,
      special: cpuControlState.special,
      airAttack: cpuControlState.airAttack,
      dodge: cpuControlState.dodge,
      grab: cpuControlState.grab,
    };
    const cpuRequestedMove = selectMoveFromInputs(
      { ...cpuInputs, grab: false },
      PLAYER_MOVE_ORDER,
      coreMoves,
      cpuIsAirborne,
    );
    const cpuMachineInputs = {
      ...cpuInputs,
      ...(cpuRequestedMove ? { [cpuRequestedMove.id]: true } : {}),
    };
    const cpuUpdatedState = cpuMachineRef.current.update({
      state: {
        ...cpuCombatStateRef.current,
        position: cpu.position,
        velocity: cpu.velocity,
        inAir: cpuIsAirborne,
        facing: cpu.direction,
      },
      opponent: playerCombatStateRef.current,
      inputs: cpuMachineInputs,
      delta: (cpuInHitLag ? 0 : delta) * 60,
      availableMoves: coreMoves,
    });
    if (cpuUpdatedState.moveId !== cpuPrevMoveIdRef.current) {
      cpuHitRegistryRef.current.clear();
      if (cpuUpdatedState.moveId) {
        playMoveStartAudio(coreMoves[cpuUpdatedState.moveId], {
          playPunch,
          playKick,
          playSpecial,
        });
      }
      cpuPrevMoveIdRef.current = cpuUpdatedState.moveId;
    }
    cpuCombatStateRef.current = cpuUpdatedState;
    const cpuAction = cpuUpdatedState.action;
    setCPUAttacking(cpuAction === "attack");
    setCPUDodging(cpuAction === "dodge");
    setCPUAirAttacking(cpuUpdatedState.inAir && cpuAction === "attack");
    const cpuBlocking = cpuControlState.shield && cpuCombatStateRef.current.guardMeter > 0;
    setCPUBlocking(cpuBlocking);
    if (cpuBlocking) {
      cpuCombatStateRef.current.guardMeter = Math.max(
        0,
        cpuCombatStateRef.current.guardMeter - 15 * delta,
      );
    }
    if (cpuUpdatedState.moveId) {
      const moveDef = coreMoves[cpuUpdatedState.moveId];
      const hits = resolveHits({
        attacker: cpuUpdatedState,
        defender: playerCombatStateRef.current,
        move: moveDef,
        scaledDamage: comboScale(cpu.comboCount),
      });
      const cpuNewHits = hits.filter(
        (hit) => !cpuHitRegistryRef.current.has(`${hit.moveId}:${hit.hitboxId}`),
      );
      if (cpuNewHits.length) {
        cpuNewHits.forEach((hit) => {
          const blocking = player.isBlocking;
          const baseDamage = Math.round(hit.damage);
          if (blocking) {
            const chip = Math.max(1, Math.round(baseDamage * 0.25));
            damagePlayer(chip);
            applyGuardDamageToPlayer(hit.guardDamage);
            playBlock();
          } else {
            damagePlayer(baseDamage);
          }
          const [vx, vy, vz] = applyKnockbackToVelocity(player, hit);
          updatePlayerVelocity(vx, vy, vz);
          setPlayerDirection(hit.knockbackVector[0] < 0 ? -1 : 1);
          cpuHitRegistryRef.current.add(`${hit.moveId}:${hit.hitboxId}`);
          recordTelemetry({
            source: "cpu",
            hit,
            timestamp: performance.now(),
            comboCount: cpu.comboCount,
          });
          playerHitLagRef.current = Math.max(
            playerHitLagRef.current,
            computeHitLagSeconds(hit.hitLag),
          );
          cpuHitLagRef.current = Math.max(
            cpuHitLagRef.current,
            computeHitLagSeconds(hit.hitLag),
          );
        });
        playHit();
      }
    } else {
      cpuHitRegistryRef.current.clear();
    }
    
    const {
      jump: cpuJump,
      forward: cpuForward,
      backward: cpuBackward,
      leftward: cpuLeftward,
      rightward: cpuRightward,
      dropThrough: cpuDropThrough,
      shield: cpuShield,
    } = cpuControlState;
    
    const cpuCanAct =
      !cpu.isAttacking &&
      !cpu.isBlocking &&
      !cpu.isDodging &&
      !cpu.isGrabbing &&
      !cpu.isTaunting &&
      !cpu.isAirAttacking;
    const cpuControlScale = cpuInHitLag ? 0 : 1;
    
    let cpuVX = cpu.velocity[0];
    let cpuVY = cpu.velocity[1];
    let cpuVZ = cpu.velocity[2];
    let cpuDirection = cpu.direction;
    
    if (cpuControlScale > 0 && (cpuCanAct || cpu.isJumping)) {
      if (cpuLeftward) {
        cpuVX = cpu.isJumping
          ? Math.max(-PLAYER_SPEED * 0.7, cpuVX - 0.01) * cpuControlScale
          : -PLAYER_SPEED * cpuControlScale;
        cpuDirection = -1;
      } else if (cpuRightward) {
        cpuVX = cpu.isJumping
          ? Math.min(PLAYER_SPEED * 0.7, cpuVX + 0.01) * cpuControlScale
          : PLAYER_SPEED * cpuControlScale;
        cpuDirection = 1;
      } else {
        cpuVX *= cpu.isJumping ? 0.98 : 0.95;
      }

      if (cpuForward) {
        cpuVZ = cpu.isJumping
          ? Math.max(-PLAYER_SPEED * 0.7, cpuVZ - 0.01) * cpuControlScale
          : -PLAYER_SPEED * cpuControlScale;
      } else if (cpuBackward) {
        cpuVZ = cpu.isJumping
          ? Math.min(PLAYER_SPEED * 0.7, cpuVZ + 0.01) * cpuControlScale
          : PLAYER_SPEED * cpuControlScale;
      } else {
        cpuVZ *= cpu.isJumping ? 0.98 : 0.95;
      }
    }
    
    if (cpuJump && !cpu.isJumping && cpu.position[1] <= 0.01 && cpuCanAct) {
      cpuVY = JUMP_FORCE;
      setCPUJumping(true);
    } else if (cpuJump && cpu.isJumping && cpu.airJumpsLeft > 0 && Math.random() < 0.15) {
      cpuVY = JUMP_FORCE * 0.8;
      if (useCPUAirJump) {
        useCPUAirJump();
      }
    }
    
    if (cpuShield && cpuCanAct && cpuCombatStateRef.current.guardMeter > 0) {
      setCPUBlocking(true);
      cpuCombatStateRef.current.guardMeter = Math.max(
        0,
        cpuCombatStateRef.current.guardMeter - 12 * delta,
      );
    } else if (cpu.isBlocking) {
      setCPUBlocking(false);
    }
    
    if (cpuControlState.dodge && cpuCanAct && cpu.dodgeCooldown <= 0) {
      setCPUDodging(true);
      cpuVX += cpuDirection * PLAYER_SPEED * 1.5;
      setTimeout(() => setCPUDodging(false), 300);
    }
    
    if (cpuControlState.grab && cpu.grabCooldown <= 0 && planarDistance < 1.4) {
      if (useControls.getState().debugMode) {
        console.log("CPU attempts grab");
      }
      setCPUGrabbing(true);
      playGrab();
      setTimeout(() => setCPUGrabbing(false), 300);
      damagePlayer(8);
      updatePlayerVelocity(
        player.velocity[0] + cpuDirection * 0.4,
        Math.max(player.velocity[1], 0.3),
        player.velocity[2],
      );
    }
    
    const cpuDrop =
      cpuDropThrough &&
      cpu.position[1] > 0.5 &&
      cpu.position[1] > player.position[1];
    const [cpuNewY, cpuNewVY] = applyGravity(
      cpu.position[1],
      cpuVY,
      cpu.position[0],
      cpu.position[2],
      cpuDrop,
      delta,
    );
    cpuVY = cpuNewVY;
    if (cpu.isJumping && (Math.abs(cpuNewY - getPlatformHeight(cpu.position[0], cpu.position[2])) < 0.1 || cpuNewY <= 0.01)) {
      setCPUJumping(false);
      if (resetCPUAirJumps) {
        resetCPUAirJumps();
      }
    }
    
    cpuVX = applyHorizontalFriction(cpuVX, cpu.isJumping, delta);
    cpuVZ = applyHorizontalFriction(cpuVZ, cpu.isJumping, delta);
    const cpuBounds = resolveCapsuleBounds(
      [cpu.position[0] + cpuVX * delta, cpuNewY, cpu.position[2] + cpuVZ * delta],
      [cpuVX, cpuVY, cpuVZ],
    );
    moveCPU(...cpuBounds.position);
    updateCPUVelocity(...cpuBounds.velocity);
    setCPUDirection(cpuDirection);
    
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
    
    const controlScale = playerInHitLag ? 0 : 1;
    if (canAct || player.isJumping) { // Allow air control while jumping
      // Left/Right movement (X-axis)
      if (leftward) {
        if (useControls.getState().debugMode) {
          console.log("Moving player LEFT");
        }
        newVX =
          controlScale *
          (player.isJumping ? Math.max(-PLAYER_SPEED * 0.7, playerVX - 0.01) : -PLAYER_SPEED);
        newDirection = -1;
      } else if (rightward) {
        if (useControls.getState().debugMode) {
          console.log("Moving player RIGHT");
        }
        newVX =
          controlScale *
          (player.isJumping ? Math.min(PLAYER_SPEED * 0.7, playerVX + 0.01) : PLAYER_SPEED);
        newDirection = 1;
      } else {
        newVX = newVX * (player.isJumping ? 0.98 : 0.95); 
      }
      
      // Forward/Backward movement (Z-axis) - NEW 3D MOVEMENT
      if (forward) {
        if (useControls.getState().debugMode) {
          console.log("Moving player FORWARD"); 
        }
        newVZ =
          controlScale *
          (player.isJumping ? Math.max(-PLAYER_SPEED * 0.7, playerVZ - 0.01) : -PLAYER_SPEED);
      } else if (backward) {
        if (useControls.getState().debugMode) {
          console.log("Moving player BACKWARD"); 
        }
        newVZ =
          controlScale *
          (player.isJumping ? Math.min(PLAYER_SPEED * 0.7, playerVZ + 0.01) : PLAYER_SPEED);
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
      if (grab && player.grabCooldown <= 0) {
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
    
    if (shield && canAct && playerCombatStateRef.current.guardMeter > 0) {
      if (!player.isBlocking) {
        playBlock(); 
      }
      setPlayerBlocking(true);
      playerCombatStateRef.current.guardMeter = Math.max(
        0,
        playerCombatStateRef.current.guardMeter - 15 * delta,
      );
    } else if (player.isBlocking) {
      setPlayerBlocking(false);
    }
    
    if (dodge && canAct && player.dodgeCooldown <= 0 && playerCombatStateRef.current.staminaMeter > 20) {
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
      playerCombatStateRef.current.staminaMeter = Math.max(
        0,
        playerCombatStateRef.current.staminaMeter - 25,
      );
    }
    
    newVX = applyHorizontalFriction(newVX, player.isJumping, delta);
    newVZ = applyHorizontalFriction(newVZ, player.isJumping, delta);
    
    const proposedX = playerX + newVX * delta;
    const proposedZ = playerZ + newVZ * delta;
    const bounds = resolveCapsuleBounds(
      [proposedX, newY, proposedZ],
      [newVX, newVY, newVZ],
    );
    const [boundedX, boundedY, boundedZ] = bounds.position;
    const [boundedVX, boundedVY, boundedVZ] = bounds.velocity;
    
    movePlayer(boundedX, boundedY, boundedZ);
    updatePlayerVelocity(boundedVX, boundedVY, boundedVZ);
    
    // Main game update loop
    // updateRoundTime, updatePlayerCooldowns, and updateCPUCooldowns are called with the locally calculated 'delta'
    updateRoundTime(delta);
    updatePlayerCooldowns(delta);
    updateCPUCooldowns(delta);
    updatePlayerMeters({
      guard: playerCombatStateRef.current.guardMeter,
      stamina: playerCombatStateRef.current.staminaMeter,
      special: playerCombatStateRef.current.specialMeter,
    });
    updateCPUMeters({
      guard: cpuCombatStateRef.current.guardMeter,
      stamina: cpuCombatStateRef.current.staminaMeter,
      special: cpuCombatStateRef.current.specialMeter,
    });

    const telemetry = drainTelemetry();
    if (telemetry.length) {
      void fetch("/api/telemetry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries: telemetry }),
        keepalive: true,
      }).catch((error) => {
        if (useControls.getState().debugMode) {
          console.warn("Failed to send telemetry", error);
        }
      });
    }
    
    if (Math.random() < 0.01 && useControls.getState().debugMode) {
      console.log("Player attack cooldown:", player.attackCooldown);
      console.log("CPU attack cooldown:", cpu.attackCooldown);
      const [px] = player.position; // Renamed to avoid conflict
      const [cx] = cpu.position;    // Renamed to avoid conflict
      const dist = Math.abs(px - cx); // Renamed to avoid conflict
      console.log("Distance between player and CPU:", dist.toFixed(2), "Attack range:", ATTACK_RANGE);
    }
    
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

function playMoveStartAudio(
  move: MoveDefinition,
  audio: {
    playPunch: () => void;
    playKick: () => void;
    playSpecial: () => void;
  },
) {
  switch (move.category) {
    case "light":
      audio.playPunch();
      break;
    case "medium":
    case "heavy":
    case "grab":
      audio.playKick();
      break;
    case "special":
    case "aerial":
    default:
      audio.playSpecial();
      break;
  }
}
