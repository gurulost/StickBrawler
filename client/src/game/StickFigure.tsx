import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FC } from "react";
import * as THREE from "three";
import type { Group } from "three";
import type { CharacterState } from "../lib/stores/useFighting";
import type { CombatEvent } from "./combatPresentation";
import { useCustomization } from "../lib/stores/useCustomization";
import { useEffects } from "../lib/stores/useEffects";
import Head from "./stickfigure/Head";
import Torso from "./stickfigure/Torso";
import Limbs from "./stickfigure/Limbs";
import AccessoryRig from "./stickfigure/AccessoryRig";
import { sampleStickFigurePose } from "./stickfigure/movePresentation";
import { useInkMaterial, useOutlineMaterial } from "./stickfigure/inkMaterial";

interface StickFigureProps {
  isPlayer: boolean;
  characterState: CharacterState;
  events?: CombatEvent[];
  onPositionChange?: (x: number, y: number, z: number) => void;
  onVelocityChange?: (vx: number, vy: number, vz: number) => void;
  onDirectionChange?: (direction: 1 | -1) => void;
  onJumpingChange?: (isJumping: boolean) => void;
  onAttackingChange?: (isAttacking: boolean) => void;
  onBlockingChange?: (isBlocking: boolean) => void;
}

type VisualPulse = {
  hit: number;
  land: number;
  guardBreak: number;
  tech: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const InkBillboard: FC<{
  width: number;
  height: number;
  color: string;
  rimColor: string;
  opacity: number;
  glow: number;
}> = ({ width, height, color, rimColor, opacity, glow }) => {
  const material = useInkMaterial({
    baseColor: color,
    rimColor,
    opacity,
    glow,
  });
  const outline = useOutlineMaterial("#050505", opacity * 0.8);
  useEffect(() => {
    if (material) {
      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    }
    if (outline) {
      outline.side = THREE.BackSide;
      outline.needsUpdate = true;
    }
  }, [material, outline]);

  return (
    <>
      <mesh material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh material={outline} scale={[1.04, 1.04, 1]}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </>
  );
};

const StickFigure: FC<StickFigureProps> = ({
  isPlayer,
  characterState,
  events = [],
}) => {
  const groupRef = useRef<Group>(null);
  const processedEvents = useRef<Set<number>>(new Set());
  const [visualTime, setVisualTime] = useState(0);
  const [pulse, setPulse] = useState<VisualPulse>({
    hit: 0,
    land: 0,
    guardBreak: 0,
    tech: 0,
  });

  const {
    getPlayerColors,
    getPlayerStyle,
    getPlayerAccessory,
    getCPUColors,
    getCPUStyle,
    getCPUAccessory,
  } = useCustomization();
  const triggerLandingBurst = useEffects((state) => state.triggerLandingBurst);

  const characterColors = isPlayer ? getPlayerColors() : getCPUColors();
  const characterStyle = isPlayer ? getPlayerStyle() : getCPUStyle();
  const characterAccessory = isPlayer ? getPlayerAccessory() : getCPUAccessory();

  useEffect(() => {
    events.forEach((event) => {
      if (processedEvents.current.has(event.id)) return;
      processedEvents.current.add(event.id);
      if (event.type === "hit") {
        setPulse((current) => ({
          ...current,
          hit: Math.max(current.hit, clamp01(event.impact)),
        }));
      } else if (event.type === "land") {
        setPulse((current) => ({
          ...current,
          land: Math.max(current.land, clamp01(event.intensity)),
        }));
        triggerLandingBurst(event.intensity);
      } else if (event.type === "guardBreak") {
        setPulse((current) => ({
          ...current,
          guardBreak: 1,
        }));
      } else if (event.type === "tech") {
        setPulse((current) => ({
          ...current,
          tech: Math.max(current.tech, event.result === "success" ? 1 : 0.52),
        }));
      }
    });
  }, [events, triggerLandingBurst]);

  useFrame((_, delta) => {
    setVisualTime((time) => time + delta);
    setPulse((current) => ({
      hit: Math.max(0, current.hit - delta * 3.6),
      land: Math.max(0, current.land - delta * 2.2),
      guardBreak: Math.max(0, current.guardBreak - delta * 1.6),
      tech: Math.max(0, current.tech - delta * 2.8),
    }));
  });

  const pose = useMemo(
    () => sampleStickFigurePose(characterState, visualTime),
    [characterState, visualTime],
  );

  const position = characterState.position;
  const direction = characterState.direction;
  const attackHighlight = characterState.isAttacking || pose.emphasis > 0.35 || pulse.hit > 0.15;
  const rootPosition = useMemo<[number, number, number]>(
    () => [
      position[0] + pose.rootOffset[0] * direction,
      position[1] + pose.rootOffset[1],
      position[2] + pose.rootOffset[2],
    ],
    [direction, pose.rootOffset, position],
  );

  const torsoLean = pose.lean + pose.torsoLean;
  const headLean = pose.lean + pose.headLean;
  const impactColor =
    characterColors.glow ??
    characterColors.emissive ??
    characterColors.secondary ??
    characterColors.primary;
  const burstColor =
    characterColors.emissive ??
    characterColors.tertiary ??
    characterColors.secondary ??
    characterColors.primary;

  return (
    <group ref={groupRef} position={rootPosition} scale={[direction, 1, 1]}>
      <group
        rotation={pose.bodyRotation}
        scale={pose.bodyScale}
      >
        <Torso
          colors={characterColors}
          style={characterStyle}
          lean={torsoLean}
          isPlayer={isPlayer}
        />
        <Head
          colors={characterColors}
          style={characterStyle}
          isAttacking={attackHighlight}
          lean={headLean}
          isPlayer={isPlayer}
        />
        <Limbs
          colors={characterColors}
          style={characterStyle}
          pose={pose}
          isPlayer={isPlayer}
        />
        {characterAccessory && (
          <AccessoryRig
            colors={characterColors}
            style={characterStyle}
            accessory={characterAccessory}
            lean={torsoLean}
            isPlayer={isPlayer}
            attackType={pose.attackStyle}
            animationPhase={pose.animationPhase * 5}
            isAttacking={attackHighlight}
            isJumping={Boolean(characterState.inAir ?? characterState.isJumping)}
            isBlocking={characterState.isBlocking}
            speedRatio={Math.min(1, Math.hypot(characterState.velocity[0], characterState.velocity[2]) / 6)}
            time={visualTime}
          />
        )}
      </group>

      {pose.trailIntensity > 0.08 && (
        <group position={[-0.12 * direction, 1.0, -0.12]}>
          <InkBillboard
            width={0.44 + pose.trailIntensity * 0.46}
            height={0.18 + pose.trailIntensity * 0.18}
            color={burstColor}
            rimColor={impactColor}
            opacity={0.16 + pose.trailIntensity * 0.2}
            glow={0.08 + pose.trailIntensity * 0.18}
          />
        </group>
      )}

      {pulse.hit > 0.06 && (
        <group position={[0.36 * direction, 1.06, 0.02]}>
          <InkBillboard
            width={0.22 + pulse.hit * 0.48}
            height={0.12 + pulse.hit * 0.2}
            color={impactColor}
            rimColor="#ffffff"
            opacity={0.24 + pulse.hit * 0.36}
            glow={0.18 + pulse.hit * 0.28}
          />
        </group>
      )}

      {pulse.land > 0.06 && (
        <group position={[0, 0.14, 0]}>
          <InkBillboard
            width={0.52 + pulse.land * 0.8}
            height={0.1 + pulse.land * 0.12}
            color={burstColor}
            rimColor={impactColor}
            opacity={0.18 + pulse.land * 0.24}
            glow={0.08 + pulse.land * 0.14}
          />
        </group>
      )}

      {pulse.tech > 0.06 && (
        <group position={[0, 0.5, 0]}>
          <InkBillboard
            width={0.28 + pulse.tech * 0.42}
            height={0.08 + pulse.tech * 0.12}
            color="#f5f3ff"
            rimColor={impactColor}
            opacity={0.16 + pulse.tech * 0.24}
            glow={0.12 + pulse.tech * 0.2}
          />
        </group>
      )}

      {pulse.guardBreak > 0.08 && (
        <group position={[0, 1.1, 0]}>
          <InkBillboard
            width={0.4 + pulse.guardBreak * 0.7}
            height={0.22 + pulse.guardBreak * 0.24}
            color={impactColor}
            rimColor="#ffffff"
            opacity={0.14 + pulse.guardBreak * 0.22}
            glow={0.2 + pulse.guardBreak * 0.32}
          />
        </group>
      )}
    </group>
  );
};

export default StickFigure;
