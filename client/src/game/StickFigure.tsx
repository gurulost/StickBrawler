import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react"; // Added useState back for lastPunch, lastKick
import { CharacterState } from "../lib/stores/useFighting";
import { Controls } from "../lib/stores/useControls";
import { Group, Mesh, DoubleSide } from "three"; // Mesh, DoubleSide might not be directly used here but kept if Stickfigure/* needs it
import * as THREE from "three";
import {
  stayInArena,
  JUMP_FORCE,
  PLAYER_SPEED,
  DRAG,
  applyDrag,
} from "./Physics";
import { useAudio } from "../lib/stores/useAudio";
import { useCustomization } from "../lib/stores/useCustomization";
import type { PlayerInputSnapshot } from "../hooks/use-player-controls";

import { Head, Torso, Limbs } from "./stickfigure";
interface StickFigureProps {
  isPlayer: boolean;
  characterState: CharacterState;
  onPositionChange: (x: number, y: number, z: number) => void;
  onVelocityChange: (vx: number, vy: number, vz: number) => void;
  onDirectionChange: (direction: 1 | -1) => void;
  onJumpingChange: (isJumping: boolean) => void;
  onAttackingChange: (isAttacking: boolean) => void;
  onBlockingChange: (isBlocking: boolean) => void;
  inputSnapshot?: PlayerInputSnapshot;
  isHumanControlled?: boolean;
}

type DustBurst = {
  id: number;
  age: number;
  offsetX: number;
  offsetZ: number;
  intensity: number;
  rotation: number;
  life: number;
};

type SpeedTrail = {
  id: number;
  age: number;
  direction: number;
  offsetZ: number;
  length: number;
  height: number;
  intensity: number;
};

const readInput = (snapshot: PlayerInputSnapshot | undefined, control: Controls) =>
  snapshot?.[control] ?? false;

type AttackAnimation = "punch" | "kick" | "special" | "air_attack" | "grab" | "dodge" | "taunt" | null;
const MOVE_TO_ANIMATION: Record<string, Exclude<AttackAnimation, null>> = {
  lightJab: "punch",
  guardBreak: "kick",
  launcher: "special",
  diveKick: "air_attack",
  parry: "grab",
};

const StickFigure = ({
  isPlayer,
  characterState,
  onPositionChange,
  onVelocityChange,
  onDirectionChange,
  onJumpingChange,
  onAttackingChange,
  onBlockingChange,
  inputSnapshot,
  isHumanControlled = false,
}: StickFigureProps) => {
  const groupRef = useRef<Group>(null);
  const [lastPunch, setLastPunch] = useState(0); // Kept useState for these as they weren't part of the conflict's focus
  const [lastKick, setLastKick] = useState(0); // Kept useState for these

  // Resolved Conflict 1: Kept from 'main' branch
  // animationPhase and attackType use refs to avoid triggering React state updates
  const attackType = useRef<AttackAnimation>(null);
  const animationPhase = useRef(0);
  const phaseTimer = useRef(0); // Added by 'main'

  const { playHit } = useAudio();
  
  const {
    getPlayerColors,
    getPlayerStyle,
    getPlayerAccessory,
    getCPUColors,
    getCPUStyle,
    getCPUAccessory
  } = useCustomization();
  
  const characterColors = isPlayer ? getPlayerColors() : getCPUColors();
  const characterStyle = isPlayer ? getPlayerStyle() : getCPUStyle();
  const characterAccessory = isPlayer ? getPlayerAccessory() : getCPUAccessory();
  
  const {
    position, 
    direction, 
    isJumping, 
    isAttacking, 
    isBlocking,
    isDodging,
    isGrabbing,
    isTaunting,
    isAirAttacking,
    airJumpsLeft,
    velocity, 
    attackCooldown,
    comboCount
  } = characterState;
  const [x, y, z] = position;
  const attack1Pressed = readInput(inputSnapshot, Controls.attack1);
  const attack2Pressed = readInput(inputSnapshot, Controls.attack2);
  const specialPressed = readInput(inputSnapshot, Controls.special);
  const dodgePressed = readInput(inputSnapshot, Controls.dodge);
  const airAttackPressed = readInput(inputSnapshot, Controls.airAttack);
  const grabPressed = readInput(inputSnapshot, Controls.grab);
  const tauntPressed = readInput(inputSnapshot, Controls.taunt);
  const inferAttackAnimation = (): AttackAnimation => {
    if (characterState.isAirAttacking || airAttackPressed) return "air_attack";
    if (characterState.isDodging || dodgePressed) return "dodge";
    if (characterState.isGrabbing || grabPressed) return "grab";
    if (characterState.isTaunting || tauntPressed) return "taunt";
    if (specialPressed) return "special";
    if (attack2Pressed) return "kick";
    if (attack1Pressed) return "punch";
    if (characterState.lastMoveType) {
      return MOVE_TO_ANIMATION[characterState.lastMoveType] ?? null;
    }
    return null;
  };
  // const [vx, vy, vz] = velocity; // vx, vy, vz are read but not directly used in this component's render logic after destructuring.

  // Resolved Conflict 2: Kept the new useFrame from 'main' and the modified subsequent one

  // Enhanced animation system for fluid, realistic martial arts movements (from main branch)
  useFrame((_, delta) => {
    phaseTimer.current += delta;
    if (phaseTimer.current < 0.06) return;
    phaseTimer.current = 0;

    if (isAttacking) {
      if (isHumanControlled) {
        const inferred = inferAttackAnimation();
        if (inferred) {
          attackType.current = inferred;
        } else if (!attackType.current && characterState.lastMoveType) {
          attackType.current = MOVE_TO_ANIMATION[characterState.lastMoveType] ?? "punch";
        }
      } else if (!attackType.current) {
        attackType.current =
          MOVE_TO_ANIMATION[characterState.lastMoveType] ??
          (Math.random() < 0.5 ? "punch" : "kick");
      }

      animationPhase.current = (animationPhase.current + 1) % 6;
      if (!isPlayer && Math.random() < 0.1) { // Slightly different animation update for CPU from main
        animationPhase.current = (animationPhase.current + 1) % 6;
      }
    } else {
      if (attackType.current !== null) {
        attackType.current = null;
      }

      if (animationPhase.current > 0) {
        animationPhase.current = Math.max(0, animationPhase.current - 1);
      }
    }
  });
  
  const horizontalSpeed = Math.hypot(characterState.velocity[0], characterState.velocity[2]);
  const speedRatio = Math.min(1, horizontalSpeed / (PLAYER_SPEED * 1.4));
  const targetLean = Math.max(-0.45, Math.min(0.45, characterState.velocity[0] * (8 + speedRatio * 2)));
  const leanRef = useRef(targetLean);
  const timeRef = useRef(0);
  const landingScaleRef = useRef(1);
  const prevJumpRef = useRef(characterState.isJumping);
  const [dustBursts, setDustBursts] = useState<DustBurst[]>([]);
  const [speedTrails, setSpeedTrails] = useState<SpeedTrail[]>([]);
  const dustIdRef = useRef(0);
  const trailIdRef = useRef(0);
  const trailCooldownRef = useRef(0);
  const lastAirVelocityRef = useRef<[number, number, number]>([...characterState.velocity]);
  const groundedIdle = !characterState.isJumping && speedRatio < 0.2;
  const plantedFoot = groundedIdle ? (Math.floor(timeRef.current * 0.8) % 2 === 0 ? "left" : "right") : null;

  useFrame((_, delta) => {
    timeRef.current += delta;
    leanRef.current += (targetLean - leanRef.current) * Math.min(1, delta * 10);
    landingScaleRef.current += (1 - landingScaleRef.current) * Math.min(1, delta * 12);
    trailCooldownRef.current = Math.max(0, trailCooldownRef.current - delta);

    setDustBursts((bursts) => {
      if (!bursts.length) return bursts;
      let changed = false;
      const next: DustBurst[] = [];
      for (const burst of bursts) {
        const age = burst.age + delta;
        const life = burst.life ?? 0.6;
        if (age < life) {
          if (age !== burst.age || burst.life !== life) {
            changed = true;
            next.push({ ...burst, age, life });
          } else {
            next.push(burst);
          }
        } else {
          changed = true;
        }
      }
      return changed ? next : bursts;
    });

    setSpeedTrails((trails) => {
      if (!trails.length) return trails;
      let changed = false;
      const next: SpeedTrail[] = [];
      for (const trail of trails) {
        const age = trail.age + delta;
        const life = 0.35 + trail.intensity * 0.2;
        if (age < life) {
          if (age !== trail.age) {
            changed = true;
            next.push({ ...trail, age });
          } else {
            next.push(trail);
          }
        } else {
          changed = true;
        }
      }
      return changed ? next : trails;
    });

    const horizontalSpeed = Math.hypot(characterState.velocity[0], characterState.velocity[2]);
    const speedRatio = Math.min(1, horizontalSpeed / (PLAYER_SPEED * 1.4));
    if (!characterState.isJumping && speedRatio > 0.25 && trailCooldownRef.current <= 0) {
      const intensity = Math.min(1, (speedRatio - 0.25) / 0.75);
      trailCooldownRef.current = Math.max(0.03, 0.09 - intensity * 0.04);
      const directionSign = Math.sign(characterState.velocity[0]) || direction || 1;
      setSpeedTrails((trails) => [
        ...trails,
        {
          id: trailIdRef.current++,
          age: 0,
          direction: directionSign,
          offsetZ: (Math.random() - 0.5) * 0.25,
          length: 0.35 + intensity * 1,
          height: 0.32 + intensity * 0.25,
          intensity: 0.2 + intensity * 0.8,
        },
      ]);
    }
  });

  useEffect(() => {
    if (characterState.isJumping) {
      lastAirVelocityRef.current = [...characterState.velocity];
    }
  }, [characterState.isJumping, characterState.velocity]);

  useEffect(() => {
    if (!characterState.isJumping && prevJumpRef.current) {
      const lastAirVelocity = lastAirVelocityRef.current;
      const normalizedVertical = Math.min(1, Math.abs(lastAirVelocity[1]) / (JUMP_FORCE * 1.5));
      const normalizedHorizontal = Math.min(
        1,
        Math.hypot(lastAirVelocity[0], lastAirVelocity[2]) / (PLAYER_SPEED * 1.8),
      );
      const landingIntensity = Math.min(1, normalizedVertical * 0.7 + normalizedHorizontal * 0.5);
      landingScaleRef.current = 1.05 + landingIntensity * 0.2;
      triggerLandingBurst(0.4 + landingIntensity * 0.6);
      const burstCount = 2 + Math.round(landingIntensity * 2);
      const newBursts = Array.from({ length: burstCount }, () => ({
        id: dustIdRef.current++,
        age: 0,
        offsetX: (Math.random() - 0.5) * (0.2 + landingIntensity * 0.5),
        offsetZ: (Math.random() - 0.5) * 0.3,
        intensity: landingIntensity,
        rotation: Math.random() * Math.PI * 2,
        life: 0.35 + landingIntensity * 0.3,
      }));
      setDustBursts((bursts) => [...bursts, ...newBursts]);
    }
    prevJumpRef.current = characterState.isJumping;
  }, [characterState.isJumping, triggerLandingBurst]);

  const lean = leanRef.current;

  const landingScale = landingScaleRef.current;
  const widthScale = 1 - (landingScale - 1) * 0.35;

  return (
    <group 
      ref={groupRef} 
      position={[x, y, z]} 
      scale={[direction * widthScale, landingScale, widthScale]} 
      rotation={[0, direction < 0 ? Math.PI : 0, 0]}
    >
      <Head
        colors={characterColors}
        style={characterStyle}
        accessory={characterAccessory}
        isAttacking={isAttacking}
        lean={lean}
        isPlayer={isPlayer}
      />
      <Torso colors={characterColors} style={characterStyle} lean={lean} isPlayer={isPlayer} />
      <Limbs
        colors={characterColors}
        style={characterStyle}
        attackType={attackType.current}
        animationPhase={animationPhase.current}
        isBlocking={isBlocking}
        isAttacking={isAttacking}
        isJumping={isJumping}
        direction={direction}
        time={timeRef.current}
        speedRatio={speedRatio}
        plantedFoot={plantedFoot}
        isPlayer={isPlayer}
      />

      {/* In-scene landing dust */}
      {dustBursts.map((burst) => {
        const life = burst.life ?? 0.6;
        const t = Math.min(1, burst.age / life);
        const baseScale = 0.4 + burst.intensity * 0.8;
        return (
          <mesh
            key={`dust-${burst.id}`}
            position={[burst.offsetX, -0.02, burst.offsetZ]}
            rotation={[-Math.PI / 2, 0, burst.rotation]}
            scale={baseScale + burst.age * 1.5}
          >
            <circleGeometry args={[0.5 + burst.intensity * 0.4, 24]} />
            <meshStandardMaterial
              color="#f7e3c4"
              transparent
              opacity={Math.max(0, (0.25 + burst.intensity * 0.35) * (1 - t))}
            />
          </mesh>
        );
      })}

      {/* Speed trails */}
      {speedTrails.map((trail) => {
        const life = 0.35 + trail.intensity * 0.2;
        const t = Math.min(1, trail.age / life);
        const fade = Math.max(0, (0.25 + trail.intensity * 0.3) * (1 - t));
        const lateral = -trail.direction * (0.25 + trail.length * 0.4) * (1 - t * 0.2);
        return (
          <mesh
            key={`trail-${trail.id}`}
            position={[lateral, trail.height, trail.offsetZ]}
            rotation={[0, 0, trail.direction * Math.PI / 10]}
            scale={[trail.length, 0.04 + trail.intensity * 0.08, 0.04]}
          >
            <boxGeometry args={[1, 0.2, 0.1]} />
            <meshStandardMaterial
              color={trail.intensity > 0.6 ? "#f0fdff" : "#c9f0ff"}
              transparent
              opacity={fade}
            />
          </mesh>
        );
      })}

      
      {/* Visual indicators for different actions */}
      
      {isBlocking && (
        <mesh position={[0, 1.2, 0.2]}>
          <torusGeometry args={[0.4, 0.08, 24, 48]} />
          <meshStandardMaterial 
            color={"#32cd32"} 
            transparent={true}
            opacity={0.8}
            emissive={"#32cd32"}
            emissiveIntensity={0.3 + Math.sin(timeRef.current * 10) * 0.2}
          />
        </mesh>
      )}
      
      {isDodging && (
        <group>
          <mesh position={[direction * -0.4, 0.8, 0]}>
            <sphereGeometry args={[0.3, 12, 12]} />
            <meshStandardMaterial 
              color={"#1e90ff"} 
              transparent={true}
              opacity={0.6 - animationPhase.current * 0.1}
              emissive={"#1e90ff"}
              emissiveIntensity={0.6}
            />
          </mesh>
          
          <mesh position={[direction * -0.7, 0.8, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial 
              color={"#87cefa"} 
              transparent={true}
              opacity={0.3 - animationPhase.current * 0.1}
              emissive={"#87cefa"}
              emissiveIntensity={0.4}
            />
          </mesh>
        </group>
      )}
      
      {isAirAttacking && isJumping && (
        <group>
          <mesh position={[0, -0.4, 0]}>
            <coneGeometry args={[0.3, 0.6, 24]} />
            <meshStandardMaterial 
              color={"#ff4500"} 
              transparent={true}
              opacity={0.7}
              emissive={"#ff4500"}
              emissiveIntensity={0.5 + animationPhase.current * 0.2}
            />
          </mesh>
          
          {Array.from({ length: 5 }).map((_, i) => {
            const wobble = timeRef.current + i * 0.4;
            return (
            <mesh 
              key={i} 
              position={[
                Math.sin(wobble) * 0.2, 
                -0.5 - (i * 0.1), 
                Math.cos(wobble) * 0.2
              ]}
            >
              <sphereGeometry args={[0.05 + Math.random() * 0.05, 8, 8]} />
              <meshStandardMaterial 
                color={"#ffcc00"} 
                transparent={true}
                opacity={0.5 - (i * 0.1)}
                emissive={"#ffcc00"}
                emissiveIntensity={0.7}
              />
            </mesh>
          );
          })}
        </group>
      )}
      
      {isGrabbing && (
        <group>
          <mesh position={[direction * 0.5, 1.0, 0.2]} rotation={[0, 0, direction * Math.PI / 4]}>
            <torusGeometry args={[0.2, 0.05, 16, 24, Math.PI]} />
            <meshStandardMaterial 
              color={"#ffd700"} 
              transparent={true}
              opacity={0.8}
              emissive={"#ffd700"}
              emissiveIntensity={0.6}
            />
          </mesh>
          
          <mesh 
            position={[direction * 0.7, 1.0, 0.1]} 
            rotation={[0, 0, direction * Math.PI / 2]}
          >
            <coneGeometry args={[0.1, 0.2, 8]} />
            <meshStandardMaterial 
              color={"#f5deb3"} 
              transparent={true}
              opacity={0.6}
              emissive={"#f5deb3"}
            emissiveIntensity={0.4 + Math.sin(timeRef.current * 8) * 0.2}
            />
          </mesh>
        </group>
      )}
      
      {isTaunting && (
        <group>
          <mesh position={[0, 2.2, 0]}>
            <sphereGeometry args={[0.15, 12, 12]} />
            <meshStandardMaterial 
              color={"#ff69b4"} 
              transparent={true}
              opacity={0.7 + Math.sin(timeRef.current * 10) * 0.3}
              emissive={"#ff69b4"}
              emissiveIntensity={0.8}
            />
          </mesh>
          
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh 
              key={i} 
              position={[
                Math.sin(timeRef.current * 2 + i * Math.PI / 2) * 0.3, 
                2.0 + Math.sin(timeRef.current * 3 + i) * 0.2, 
                Math.cos(timeRef.current * 2 + i * Math.PI / 2) * 0.3
              ]}
            >
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial 
                color={"#ff1493"} 
                transparent={true}
                opacity={0.5}
                emissive={"#ff1493"}
                emissiveIntensity={0.6 + Math.sin(timeRef.current * 12 + i) * 0.4}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {comboCount > 1 && (
        <group position={[0, 2.5, 0]}>
          <mesh position={[0, 0, -0.15]}>
            <planeGeometry args={[0.8, 0.4]} />
            <meshStandardMaterial 
              color={"#000000"} 
              transparent={true}
              opacity={0.7}
              emissive={
                comboCount >= 20 ? "#880000" :
                comboCount >= 10 ? "#884400" :
                comboCount >= 5 ? "#888800" :
                "#000000"
              }
              emissiveIntensity={0.2 + Math.min(comboCount / 50, 0.5)}
            />
          </mesh>
          
          <mesh position={[0, 0, -0.12]} rotation={[0, 0, timeRef.current * 1.5]}>
            <ringGeometry args={[0.35, 0.4, 32]} />
            <meshStandardMaterial 
              color={
                comboCount >= 20 ? "#ff0000" :
                comboCount >= 10 ? "#ff9900" :
                comboCount >= 5 ? "#ffff00" :
                "#ffffff"
              }
              transparent={true}
              opacity={0.4 + 0.3 * Math.sin(timeRef.current * 3)}
              emissive={
                comboCount >= 20 ? "#ff0000" :
                comboCount >= 10 ? "#ff9900" :
                comboCount >= 5 ? "#ffff00" :
                "#ffffff"
              }
              emissiveIntensity={0.5}
            />
          </mesh>
          
          {Array.from({ length: Math.min(5, comboCount) }).map((_, i) => (
            <group key={i}>
              <mesh position={[(i - 2) * 0.15, 0, 0]}>
                <sphereGeometry args={[0.06, 12, 12]} />
                <meshStandardMaterial 
                  color={
                    comboCount >= 20 ? "#ff0000" :   
                    comboCount >= 10 ? "#ff9900" :    
                    comboCount >= 5 ? "#ffff00" :     
                    "#ffffff"                         
                  } 
                  emissive={
                    comboCount >= 20 ? "#ff0000" :
                    comboCount >= 10 ? "#ff9900" :
                    comboCount >= 5 ? "#ffff00" :
                    "#ffffff"
                  }
                emissiveIntensity={0.6 + 0.4 * Math.sin(timeRef.current * 5 * comboCount + i)}
                />
              </mesh>
              
              {comboCount >= 10 && (
                <mesh 
                  position={[
                    (i - 2) * 0.15, 
                    0.1 * Math.sin(timeRef.current * 3 + i), 
                    0.05
                  ]}
                >
                  <sphereGeometry args={[0.02, 8, 8]} />
                  <meshStandardMaterial 
                    color={
                      comboCount >= 20 ? "#ffcc00" :
                      comboCount >= 10 ? "#ffff00" :
                      "#ffffff"
                    }
                    transparent={true}
                    opacity={0.7}
                    emissive={
                      comboCount >= 20 ? "#ffcc00" :
                      comboCount >= 10 ? "#ffff00" :
                      "#ffffff"
                    }
                    emissiveIntensity={0.8}
                  />
                </mesh>
              )}
            </group>
          ))}
        </group>
      )}
    </group>
  );
};

export default StickFigure;
