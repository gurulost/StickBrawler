import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { FC } from "react";
import { CharacterState } from "../lib/stores/useFighting";
import { Controls, useControls } from "../lib/stores/useControls";
import { Group } from "three";
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
import { useEffects } from "../lib/stores/useEffects";
import type { PlayerInputSnapshot } from "../hooks/use-player-controls";

import { Head, Torso, Limbs } from "./stickfigure";
import { useInkMaterial, useOutlineMaterial } from "./stickfigure/inkMaterial";
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

type BrushStroke = {
  id: number;
  age: number;
  life: number;
  offset: [number, number, number];
  rotation: number;
  width: number;
  height: number;
  color: string;
  rimColor: string;
  glow: number;
  opacity: number;
  doubleSided?: boolean;
};

const readInput = (snapshot: PlayerInputSnapshot | undefined, control: Controls) =>
  snapshot?.[control] ?? false;

const SPLINE_SEGMENTS = 18;
const createSplineBuffer = (
  baseX: number,
  baseY: number,
  length: number,
  curvature: number,
) => {
  const buffer = new Float32Array((SPLINE_SEGMENTS + 1) * 3);
  for (let i = 0; i <= SPLINE_SEGMENTS; i++) {
    const t = i / SPLINE_SEGMENTS;
    const y = baseY - length * t;
    const bend = Math.sin(Math.PI * t) * curvature;
    const x = baseX + bend;
    buffer[i * 3] = x;
    buffer[i * 3 + 1] = y;
    buffer[i * 3 + 2] = 0.015;
  }
  return buffer;
};

interface InkBillboardProps {
  width: number;
  height: number;
  color: string;
  rimColor?: string;
  opacity?: number;
  glow?: number;
  doubleSided?: boolean;
  outlineColor?: string;
  outlineOpacity?: number;
}

const InkBillboard: FC<InkBillboardProps> = ({
  width,
  height,
  color,
  rimColor,
  opacity = 1,
  glow = 0,
  doubleSided = true,
  outlineColor = "#050505",
  outlineOpacity,
}) => {
  const material = useInkMaterial({
    baseColor: color,
    rimColor: rimColor ?? color,
    opacity,
    glow,
  });
  const outline = useOutlineMaterial(outlineColor, outlineOpacity ?? opacity);
  useEffect(() => {
    if (material) {
      material.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
      material.needsUpdate = true;
    }
    if (outline) {
      outline.side = doubleSided ? THREE.DoubleSide : THREE.BackSide;
      outline.needsUpdate = true;
    }
  }, [material, outline, doubleSided]);
  return (
    <>
      <mesh material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh material={outline} scale={[1.03, 1.03, 1]}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </>
  );
};

const BrushStrokeMesh: FC<{ stroke: BrushStroke; qualityFactor: number }> = ({ stroke, qualityFactor }) => {
  const lifeT = Math.min(1, stroke.age / stroke.life);
  const opacity = Math.max(0, stroke.opacity * (1 - lifeT) * qualityFactor);
  if (opacity <= 0.01) return null;
  return (
    <group position={stroke.offset} rotation={[0, 0, stroke.rotation]}>
      <InkBillboard
        width={stroke.width}
        height={stroke.height}
        color={stroke.color}
        rimColor={stroke.rimColor}
        opacity={opacity}
        glow={stroke.glow}
        doubleSided={stroke.doubleSided ?? true}
        outlineOpacity={opacity * 0.8}
      />
    </group>
  );
};

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
  // Note: These use Math.random() for visual variety - this is intentional per determinism policy
  // (gameplay state is deterministic in MatchRuntime, visual animations can vary)
  const attackType = useRef<AttackAnimation>(null);
  const animationPhase = useRef(0);
  const phaseTimer = useRef(0); // Added by 'main'

  const { playHit } = useAudio();
  const { triggerLandingBurst } = useEffects();
  
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
  const showSilhouetteDebug = useControls((state) => state.showSilhouetteDebug);
  const inkQualitySetting = useControls((state) => state.inkQuality);
  const inkPerfFactor = inkQualitySetting === "cinematic" ? 1 : inkQualitySetting === "balanced" ? 0.8 : 0.55;
  const brushSpawnChance = inkQualitySetting === "cinematic" ? 1 : inkQualitySetting === "balanced" ? 0.85 : 0.55;
  const maxBrushCount = inkQualitySetting === "performance" ? 6 : inkQualitySetting === "balanced" ? 10 : 16;
  
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
  const prevMoveRef = useRef(characterState.lastMoveType);
  const prevGuardRef = useRef(characterState.guardMeter);
  const prevTauntRef = useRef(characterState.isTaunting);
  const spawnBrushStroke = useCallback(
    (stroke: Omit<BrushStroke, "id" | "age">) => {
      if (Math.random() > brushSpawnChance) return;
      setBrushStrokes((current) => {
        if (current.length >= maxBrushCount) {
          return current;
        }
        return [...current, { ...stroke, id: brushIdRef.current++, age: 0 }];
      });
    },
    [brushSpawnChance, maxBrushCount],
  );
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
  const [brushStrokes, setBrushStrokes] = useState<BrushStroke[]>([]);
  const dustIdRef = useRef(0);
  const trailIdRef = useRef(0);
  const brushIdRef = useRef(0);
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

    setBrushStrokes((strokes) => {
      if (!strokes.length) return strokes;
      let changed = false;
      const next: BrushStroke[] = [];
      for (const stroke of strokes) {
        const age = stroke.age + delta;
        if (age < stroke.life) {
          if (age !== stroke.age) {
            changed = true;
            next.push({ ...stroke, age });
          } else {
            next.push(stroke);
          }
        } else {
          changed = true;
        }
      }
      return changed ? next : strokes;
    });

    const horizontalSpeed = Math.hypot(characterState.velocity[0], characterState.velocity[2]);
    const speedRatio = Math.min(1, horizontalSpeed / (PLAYER_SPEED * 1.4));
    if (!characterState.isJumping && speedRatio > 0.25 && trailCooldownRef.current <= 0) {
      const intensity = Math.min(1, (speedRatio - 0.25) / 0.75) * inkPerfFactor;
      trailCooldownRef.current = Math.max(0.03, 0.09 - intensity * 0.04);
      const directionSign = Math.sign(characterState.velocity[0]) || direction || 1;
      setSpeedTrails((trails) => [
        ...trails,
        {
          id: trailIdRef.current++,
          age: 0,
          direction: directionSign,
          offsetZ: (Math.random() - 0.5) * 0.25,
          length: (0.35 + intensity * 1) * inkPerfFactor,
          height: (0.32 + intensity * 0.25) * inkPerfFactor,
          intensity: (0.2 + intensity * 0.8) * inkPerfFactor,
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
      const landingIntensity = Math.min(1, (normalizedVertical * 0.7 + normalizedHorizontal * 0.5) * inkPerfFactor);
      landingScaleRef.current = 1.05 + landingIntensity * 0.2;
      triggerLandingBurst((0.4 + landingIntensity * 0.6) * inkPerfFactor);
      const burstCount = Math.max(1, Math.round((2 + landingIntensity * 2) * inkPerfFactor + 0.2));
      const newBursts = Array.from({ length: burstCount }, () => ({
        id: dustIdRef.current++,
        age: 0,
        offsetX: (Math.random() - 0.5) * (0.2 + landingIntensity * 0.5),
        offsetZ: (Math.random() - 0.5) * 0.3,
        intensity: landingIntensity * inkPerfFactor,
        rotation: Math.random() * Math.PI * 2,
        life: 0.35 + landingIntensity * 0.3,
      }));
      setDustBursts((bursts) => [...bursts, ...newBursts]);
    }
    prevJumpRef.current = characterState.isJumping;
  }, [characterState.isJumping, triggerLandingBurst]);

  useEffect(() => {
    if (
      !characterState.lastMoveType ||
      characterState.lastMoveType === prevMoveRef.current
    ) {
      prevMoveRef.current = characterState.lastMoveType;
      return;
    }
    const power = Math.min(1, Math.max(0.2, comboCount / 10));
    spawnBrushStroke({
      life: 0.35,
      offset: [direction * 0.55, 1.15, 0],
      rotation: (direction > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.4,
      width: 0.65 + power * 0.2,
      height: 0.18 + power * 0.1,
      color: characterColors.glow ?? characterColors.primary,
      rimColor: characterColors.secondary ?? characterColors.primary,
      glow: 0.3,
      opacity: 0.75,
    });
    prevMoveRef.current = characterState.lastMoveType;
  }, [characterState.lastMoveType, characterColors, comboCount, direction, spawnBrushStroke]);

  useEffect(() => {
    const previous = prevGuardRef.current;
    const current = characterState.guardMeter;
    const drop = previous - current;
    if (drop > 8) {
      spawnBrushStroke({
        life: 0.45,
        offset: [0, 1.3, 0],
        rotation: Math.random() * Math.PI * 2,
        width: 1.0,
        height: 0.35,
        color: characterColors.secondary ?? "#66ccff",
        rimColor: characterColors.glow ?? "#ffffff",
        glow: 0.25,
        opacity: 0.65,
        doubleSided: true,
      });
    }
    prevGuardRef.current = current;
  }, [characterState.guardMeter, characterColors, spawnBrushStroke]);

  useEffect(() => {
    if (characterState.isTaunting && !prevTauntRef.current) {
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        spawnBrushStroke({
          life: 0.6,
          offset: [
            Math.cos(angle) * 0.4,
            2 + Math.sin(angle) * 0.2,
            Math.sin(angle) * 0.25,
          ],
          rotation: angle,
          width: 0.35,
          height: 0.12,
          color: characterColors.emissive ?? "#ff69b4",
          rimColor: characterColors.glow ?? "#ffffff",
          glow: 0.4,
          opacity: 0.7,
        });
      }
    }
    prevTauntRef.current = characterState.isTaunting;
  }, [characterState.isTaunting, characterColors, spawnBrushStroke]);

  const lean = leanRef.current;

  const landingScale = landingScaleRef.current;
  const widthScale = 1 - (landingScale - 1) * 0.35;
  const silhouetteLines = useMemo(() => {
    if (!showSilhouetteDebug) return [];
    const armConfig = characterStyle.silhouette?.arms ?? {
      length: 0.7,
      curvature: 0,
    };
    const legConfig = characterStyle.silhouette?.legs ?? {
      length: 0.85,
      curvature: 0,
    };
    const facing = direction >= 0 ? 1 : -1;
    return [
      createSplineBuffer(-0.35 * facing, 1.35, armConfig.length, armConfig.curvature ?? 0),
      createSplineBuffer(0.35 * facing, 1.35, armConfig.length, -(armConfig.curvature ?? 0)),
      createSplineBuffer(-0.2 * facing, 0.7, legConfig.length, legConfig.curvature ?? 0),
      createSplineBuffer(0.2 * facing, 0.7, legConfig.length, -(legConfig.curvature ?? 0)),
    ];
  }, [showSilhouetteDebug, characterStyle, direction]);

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
        const opacity = Math.max(0, (0.25 + burst.intensity * 0.35) * (1 - t));
        const scale = 0.8 + burst.age * 1.2;
        return (
          <group
            key={`dust-${burst.id}`}
            position={[burst.offsetX, -0.02, burst.offsetZ]}
            rotation={[-Math.PI / 2, 0, burst.rotation]}
            scale={[scale, scale, scale]}
          >
            <InkBillboard
              width={0.6}
              height={0.6}
              color={characterColors.tertiary ?? "#f7e3c4"}
              rimColor={characterColors.primary}
              opacity={opacity}
              glow={0.05 + burst.intensity * 0.2}
            />
          </group>
        );
      })}

      {/* Speed trails */}
      {speedTrails.map((trail) => {
        const life = 0.35 + trail.intensity * 0.2;
        const t = Math.min(1, trail.age / life);
        const fade = Math.max(0, (0.25 + trail.intensity * 0.3) * (1 - t));
        const lateral = -trail.direction * (0.25 + trail.length * 0.4) * (1 - t * 0.2);
        const width = trail.length;
        const height = 0.12 + trail.intensity * 0.1;
        return (
          <group
            key={`trail-${trail.id}`}
            position={[lateral, trail.height, trail.offsetZ]}
            rotation={[0, 0, trail.direction * Math.PI / 12]}
          >
            <InkBillboard
              width={width}
              height={height}
              color={characterColors.secondary ?? "#c9f0ff"}
              rimColor={characterColors.glow ?? "#f0fdff"}
              opacity={fade}
              glow={0.1 + trail.intensity * 0.25}
              doubleSided={false}
              outlineOpacity={fade * 0.7}
            />
          </group>
        );
      })}

      {brushStrokes.map((stroke) => (
        <BrushStrokeMesh key={`brush-${stroke.id}`} stroke={stroke} qualityFactor={inkPerfFactor} />
      ))}

      
      {/* Visual indicators for different actions */}
      
      {isBlocking && (
        <group position={[0, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <InkBillboard
            width={0.8}
            height={0.22}
            color={characterColors.secondary ?? "#32cd32"}
            rimColor={characterColors.glow ?? "#a8ffbf"}
            opacity={0.65 + 0.25 * Math.sin(timeRef.current * 6)}
            glow={0.2}
            doubleSided
          />
        </group>
      )}
      
      {isDodging && (
        <group>
          {[0, 1].map((index) => (
            <group
              key={index}
              position={[direction * (-0.35 - index * 0.2), 0.8, 0]}
              rotation={[0, 0, direction * (Math.PI / 4 + index * 0.2)]}
            >
              <InkBillboard
                width={0.5 - index * 0.1}
                height={0.18 - index * 0.04}
                color={characterColors.secondary ?? "#1e90ff"}
                rimColor={characterColors.glow ?? "#87cefa"}
                opacity={0.6 - index * 0.2 - animationPhase.current * 0.05}
                glow={0.35}
                doubleSided={false}
              />
            </group>
          ))}
        </group>
      )}
      
      {isAirAttacking && isJumping && (
        <group>
          <group position={[0, -0.3, 0]} rotation={[0, 0, Math.sin(timeRef.current * 4) * 0.2]}>
            <InkBillboard
              width={0.4}
              height={0.8}
              color={characterColors.secondary ?? "#ff4500"}
              rimColor={characterColors.glow ?? "#ffcc88"}
              opacity={0.8}
              glow={0.35}
            />
          </group>
          {Array.from({ length: 4 }).map((_, i) => {
            const wobble = timeRef.current + i * 0.45;
            return (
              <group
                key={i}
                position={[
                  Math.sin(wobble) * 0.22,
                  -0.45 - i * 0.12,
                  Math.cos(wobble) * 0.18,
                ]}
                rotation={[0, 0, Math.sin(wobble * 1.5) * 0.3]}
              >
                <InkBillboard
                  width={0.18 - i * 0.02}
                  height={0.08 - i * 0.01}
                  color={characterColors.glow ?? "#ffcc00"}
                  rimColor={characterColors.primary}
                  opacity={0.55 - i * 0.12}
                  glow={0.25}
                />
              </group>
            );
          })}
        </group>
      )}
      
      {isGrabbing && (
        <group>
          <group position={[direction * 0.5, 1.0, 0.2]} rotation={[0, 0, direction * Math.PI / 4]}>
            <InkBillboard
              width={0.5}
              height={0.18}
              color={characterColors.glow ?? "#ffd700"}
              rimColor={characterColors.secondary}
              opacity={0.75}
              glow={0.3}
              doubleSided
            />
          </group>
          <group position={[direction * 0.7, 1.0, 0.12]} rotation={[0, 0, direction * Math.PI / 2]}>
            <InkBillboard
              width={0.14}
              height={0.28}
              color={characterColors.secondary ?? "#f5deb3"}
              rimColor={characterColors.primary}
              opacity={0.6}
              glow={0.2}
            />
          </group>
        </group>
      )}
      
      {isTaunting && (
        <group>
          <group position={[0, 2.2, 0]}>
            <InkBillboard
              width={0.3}
              height={0.3}
              color={characterColors.secondary ?? "#ff69b4"}
              rimColor={characterColors.glow ?? "#ff9ff3"}
              opacity={0.75 + 0.2 * Math.sin(timeRef.current * 8)}
              glow={0.4}
            />
          </group>
          {Array.from({ length: 4 }).map((_, i) => (
            <group
              key={i}
              position={[
                Math.sin(timeRef.current * 2 + i * Math.PI / 2) * 0.35,
                2.0 + Math.sin(timeRef.current * 3 + i) * 0.2,
                Math.cos(timeRef.current * 2 + i * Math.PI / 2) * 0.25,
              ]}
              rotation={[0, 0, timeRef.current * 3 + i]}
            >
              <InkBillboard
                width={0.12}
                height={0.12}
                color={characterColors.glow ?? "#ff1493"}
                rimColor={characterColors.secondary ?? "#ffffff"}
                opacity={0.6}
                glow={0.5}
              />
            </group>
          ))}
        </group>
      )}
      
      {comboCount > 1 && (
        <group position={[0, 2.5, 0]}>
          <InkBillboard
            width={1}
            height={0.45}
            color="#050505"
            rimColor={
              comboCount >= 20 ? "#ff0000" :
              comboCount >= 10 ? "#ff9900" :
              comboCount >= 5 ? "#ffff00" :
              "#ffffff"
            }
            opacity={0.65}
            glow={0.15 + Math.min(comboCount / 40, 0.3)}
          />
          <group rotation={[0, 0, timeRef.current * 1.5]}>
            <InkBillboard
              width={0.9}
              height={0.2}
              color={
                comboCount >= 20 ? "#ff0000" :
                comboCount >= 10 ? "#ff9900" :
                comboCount >= 5 ? "#ffff00" :
                "#ffffff"
              }
              rimColor="#ffffff"
              opacity={0.4 + 0.3 * Math.sin(timeRef.current * 3)}
              glow={0.25}
              doubleSided
            />
          </group>
        </group>
      )}
      {showSilhouetteDebug &&
        silhouetteLines.map((positions, index) => (
          <line key={`silhouette-${index}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                array={positions}
                count={positions.length / 3}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={index < 2 ? "#7efcff" : "#ff9de6"}
              transparent
              opacity={0.75}
            />
          </line>
        ))}
    </group>
  );
};

export default StickFigure;
