import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FC } from "react";
import * as THREE from "three";
import type { Group } from "three";
import { coreMoves, sampleCombatSpatialFrame } from "../combat";
import type { CharacterState } from "../lib/stores/useFighting";
import type { CombatEvent } from "./combatPresentation";
import { useCustomization } from "../lib/stores/useCustomization";
import { useControls } from "../lib/stores/useControls";
import { useEffects } from "../lib/stores/useEffects";
import { toCombatState } from "./combatBridge";
import Head from "./stickfigure/Head";
import Torso from "./stickfigure/Torso";
import Limbs from "./stickfigure/Limbs";
import AccessoryRig from "./stickfigure/AccessoryRig";
import {
  resolveSlicePresentationProfile,
  sampleStickFigurePose,
} from "./stickfigure/movePresentation";
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
  block: number;
  parry: number;
  land: number;
  guardBreak: number;
  tech: number;
};

type HitPulseRole = "attack" | "hurt";
type Vec3 = [number, number, number];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const midpoint = (from: Vec3, to: Vec3): Vec3 => [
  (from[0] + to[0]) / 2,
  (from[1] + to[1]) / 2,
  (from[2] + to[2]) / 2,
];
const offsetPoint = (point: Vec3, x = 0, y = 0, z = 0): Vec3 => [
  point[0] + x,
  point[1] + y,
  point[2] + z,
];
const averagePoints = (points: Vec3[], fallback: Vec3): Vec3 => {
  if (!points.length) return fallback;
  const total = points.reduce<Vec3>(
    (sum, point) => [sum[0] + point[0], sum[1] + point[1], sum[2] + point[2]],
    [0, 0, 0],
  );
  return [total[0] / points.length, total[1] / points.length, total[2] / points.length];
};
const planarDistance = (from: Vec3, to: Vec3) => Math.hypot(to[0] - from[0], to[1] - from[1]);
const planarAngle = (from: Vec3, to: Vec3) => Math.atan2(to[1] - from[1], to[0] - from[0]);

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
    block: 0,
    parry: 0,
    land: 0,
    guardBreak: 0,
    tech: 0,
  });
  const [hitPulseRole, setHitPulseRole] = useState<HitPulseRole>("attack");
  const slot = isPlayer ? "player" : "cpu";

  const {
    getPlayerColors,
    getPlayerStyle,
    getPlayerAccessory,
    getCPUColors,
    getCPUStyle,
    getCPUAccessory,
  } = useCustomization();
  const combatPlaybackPaused = useControls((state) => state.combatPlaybackPaused);
  const combatPlaybackRate = useControls((state) => state.combatPlaybackRate);
  const triggerLandingBurst = useEffects((state) => state.triggerLandingBurst);

  const characterColors = isPlayer ? getPlayerColors() : getCPUColors();
  const characterStyle = isPlayer ? getPlayerStyle() : getCPUStyle();
  const characterAccessory = isPlayer ? getPlayerAccessory() : getCPUAccessory();

  useEffect(() => {
    events.forEach((event) => {
      if (processedEvents.current.has(event.id)) return;
      processedEvents.current.add(event.id);
      if (event.type === "hit") {
        if (event.blocked) {
          if (event.attacker === slot) {
            setHitPulseRole("attack");
            setPulse((current) => ({
              ...current,
              hit: Math.max(current.hit, clamp01(event.impact * 0.58)),
            }));
          }
          if (event.defender === slot) {
            setPulse((current) => ({
              ...current,
              block: Math.max(current.block, clamp01(event.impact * 0.9)),
            }));
          }
        } else if (event.attacker === slot || event.defender === slot) {
          setHitPulseRole(event.attacker === slot ? "attack" : "hurt");
          setPulse((current) => ({
            ...current,
            hit: Math.max(current.hit, clamp01(event.impact)),
          }));
        }
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
  }, [events, slot, triggerLandingBurst]);

  useEffect(() => {
    if (!characterState.justParried) return;
    setPulse((current) => ({
      ...current,
      parry: Math.max(current.parry, 1),
      block: Math.max(current.block, 0.7),
    }));
  }, [characterState.justParried]);

  useFrame((_, delta) => {
    const playbackDelta = combatPlaybackPaused ? 0 : delta * combatPlaybackRate;
    if (playbackDelta <= 0) return;
    setVisualTime((time) => time + playbackDelta);
    setPulse((current) => ({
      hit: Math.max(0, current.hit - playbackDelta * 3.6),
      block: Math.max(0, current.block - playbackDelta * 3),
      parry: Math.max(0, current.parry - playbackDelta * 2.2),
      land: Math.max(0, current.land - playbackDelta * 2.2),
      guardBreak: Math.max(0, current.guardBreak - playbackDelta * 1.6),
      tech: Math.max(0, current.tech - playbackDelta * 2.8),
    }));
  });

  const pose = useMemo(
    () => sampleStickFigurePose(characterState, visualTime),
    [characterState, visualTime],
  );
  const move = useMemo(
    () => (characterState.moveId ? coreMoves[characterState.moveId] : undefined),
    [characterState.moveId],
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
  const sliceProfile = useMemo(
    () =>
      resolveSlicePresentationProfile(
        {
          velocity: characterState.velocity,
          moveId: characterState.moveId,
          justLanded: characterState.justLanded,
          hitstunFrames: characterState.hitstunFrames,
          blockstunFrames: characterState.blockstunFrames,
          landingLagFrames: characterState.landingLagFrames,
          isDodging: characterState.isDodging,
          isBlocking: characterState.isBlocking,
          inAir: characterState.inAir,
        },
        move,
        Boolean(characterState.justParried),
      ),
    [
      characterState.blockstunFrames,
      characterState.hitstunFrames,
      characterState.inAir,
      characterState.isBlocking,
      characterState.isDodging,
      characterState.justLanded,
      characterState.justParried,
      characterState.landingLagFrames,
      characterState.moveId,
      characterState.velocity,
      move,
    ],
  );
  const combatLayout = useMemo(
    () =>
      sampleCombatSpatialFrame({
        fighter: toCombatState(characterState),
        move,
        hurtboxes: move?.hurtboxes,
        time: visualTime,
      }),
    [characterState, move, visualTime],
  );
  const localCombatLayout = useMemo(() => {
    const toLocalPoint = (world: Vec3): Vec3 => [
      (world[0] - rootPosition[0]) * direction,
      world[1] - rootPosition[1],
      world[2] - rootPosition[2],
    ];
    return {
      sockets: combatLayout.sockets.map((socket) => ({
        ...socket,
        world: toLocalPoint(socket.world),
      })),
      hurtboxes: combatLayout.hurtboxes.map((hurtbox) => ({
        ...hurtbox,
        world: toLocalPoint(hurtbox.world),
      })),
      hitboxes: combatLayout.hitboxes.map((hitbox) => ({
        ...hitbox,
        world: toLocalPoint(hitbox.world),
      })),
    };
  }, [combatLayout, direction, rootPosition]);
  const socketLookup = useMemo(
    () =>
      Object.fromEntries(
        localCombatLayout.sockets.map((socket) => [socket.id, socket.world]),
      ) as Partial<Record<string, Vec3>>,
    [localCombatLayout.sockets],
  );
  const activeHitbox = useMemo(
    () => localCombatLayout.hitboxes.find((hitbox) => hitbox.active) ?? localCombatLayout.hitboxes[0],
    [localCombatLayout.hitboxes],
  );
  const trailSocketPoints = useMemo(
    () =>
      sliceProfile.trailSockets
        .map((socketId) => socketLookup[socketId])
        .filter((point): point is Vec3 => Boolean(point)),
    [sliceProfile.trailSockets, socketLookup],
  );
  const guardSocketPoints = useMemo(
    () =>
      sliceProfile.guardSockets
        .map((socketId) => socketLookup[socketId])
        .filter((point): point is Vec3 => Boolean(point)),
    [sliceProfile.guardSockets, socketLookup],
  );
  const landingSocketPoints = useMemo(
    () =>
      sliceProfile.landingSockets
        .map((socketId) => socketLookup[socketId])
        .filter((point): point is Vec3 => Boolean(point)),
    [sliceProfile.landingSockets, socketLookup],
  );
  const torsoPoint = socketLookup.torso ?? ([0, 1.08, 0] as Vec3);
  const hurtAnchor = socketLookup[sliceProfile.hurtSocket] ?? torsoPoint;
  const trailStart = trailSocketPoints[0] ?? torsoPoint;
  const trailEnd = activeHitbox?.world ?? trailSocketPoints[trailSocketPoints.length - 1] ?? trailStart;
  const trailMid = midpoint(trailStart, trailEnd);
  const trailAngle = planarAngle(trailStart, trailEnd);
  const trailLength = planarDistance(trailStart, trailEnd);
  const guardAnchor = averagePoints(guardSocketPoints, offsetPoint(torsoPoint, 0.18, 0.02));
  const landingAnchor = averagePoints(landingSocketPoints, [0, 0.14, 0]);
  const landingSpan =
    landingSocketPoints.length >= 2 ? planarDistance(landingSocketPoints[0], landingSocketPoints[1]) : 0.42;
  const guardBreakAnchor = averagePoints(
    [socketLookup.head, socketLookup.torso].filter((point): point is Vec3 => Boolean(point)),
    offsetPoint(torsoPoint, 0, 0.08),
  );
  const techAnchor = averagePoints(
    [...landingSocketPoints, ...guardSocketPoints],
    offsetPoint(torsoPoint, 0, -0.34),
  );
  const hitAnchor =
    hitPulseRole === "attack"
      ? activeHitbox?.world ?? trailEnd
      : offsetPoint(hurtAnchor, 0.04, hitPulseRole === "hurt" ? 0.06 : 0, 0);
  const hitRotation = hitPulseRole === "attack" ? trailAngle : sliceProfile.contactRotation;
  const strokeWeight = clamp01((pose.lineWeight - 1.02) / 0.6);
  const strokeEnergy = clamp01(pose.emphasis * 0.62 + pose.smear * 0.48 + pose.trailIntensity * 0.32);
  const strokeTrailWidth = Math.max(
    sliceProfile.trailWidth + pose.trailIntensity * 0.24 + pose.smear * 0.28 + strokeWeight * 0.18,
    trailLength + 0.14 + strokeWeight * 0.12,
  );
  const strokeTrailHeight = Math.max(
    0.08,
    sliceProfile.trailHeight + pose.trailIntensity * 0.06 + Math.max(0, pose.smear - 0.82) * 0.08,
  );
  const strokeTrailOpacity = sliceProfile.trailOpacity + pose.trailIntensity * 0.14 + strokeWeight * 0.08;
  const strokeTrailGlow = 0.08 + pose.trailIntensity * 0.18 + strokeWeight * 0.18 + pose.smear * 0.04;

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
          inkWeight={pose.lineWeight}
          emphasis={pose.emphasis}
          isPlayer={isPlayer}
        />
        <Head
          colors={characterColors}
          style={characterStyle}
          isAttacking={attackHighlight}
          lean={headLean}
          inkWeight={pose.lineWeight}
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
        <group position={trailMid} rotation={[0, 0, trailAngle]}>
          <InkBillboard
            width={strokeTrailWidth}
            height={strokeTrailHeight}
            color={burstColor}
            rimColor={impactColor}
            opacity={strokeTrailOpacity}
            glow={strokeTrailGlow}
          />
        </group>
      )}

      {pose.smear > 0.8 && trailLength > 0.18 && (
        <group position={offsetPoint(trailMid, -0.06, 0.02)} rotation={[0, 0, trailAngle]}>
          <InkBillboard
            width={Math.max(0.16, strokeTrailWidth - 0.16)}
            height={Math.max(0.06, strokeTrailHeight * 0.72)}
            color={impactColor}
            rimColor="#ffffff"
            opacity={strokeTrailOpacity * 0.58}
            glow={strokeTrailGlow * 0.76}
          />
        </group>
      )}

      {pulse.hit > 0.06 && (
        <group position={hitAnchor} rotation={[0, 0, hitRotation]}>
          <InkBillboard
            width={
              sliceProfile.contactWidth +
              pulse.hit * (hitPulseRole === "attack" ? 0.34 : 0.48) +
              strokeWeight * 0.14 +
              (hitPulseRole === "attack" ? Math.min(0.22, trailLength * 0.22) : 0)
            }
            height={
              sliceProfile.contactHeight +
              pulse.hit * (hitPulseRole === "attack" ? 0.12 : 0.22) +
              strokeWeight * 0.06
            }
            color={impactColor}
            rimColor="#ffffff"
            opacity={0.24 + pulse.hit * 0.36 + strokeEnergy * 0.06}
            glow={0.18 + pulse.hit * 0.3 + strokeWeight * 0.16}
          />
        </group>
      )}

      {pulse.block > 0.06 && (
        <group position={guardAnchor} rotation={[0, 0, sliceProfile.blockRotation]}>
          <InkBillboard
            width={0.22 + pulse.block * 0.28 + Math.min(0.18, planarDistance(guardAnchor, hurtAnchor) * 0.32)}
            height={0.06 + pulse.block * 0.1 + strokeWeight * 0.03}
            color="#e2e8f0"
            rimColor={impactColor}
            opacity={0.16 + pulse.block * 0.22}
            glow={0.08 + pulse.block * 0.16 + strokeWeight * 0.08}
          />
        </group>
      )}

      {pulse.parry > 0.06 && (
        <group
          position={offsetPoint(guardAnchor, 0.08, 0.04)}
          rotation={[0, 0, sliceProfile.parryRotation]}
        >
          <InkBillboard
            width={0.08 + pulse.parry * 0.12 + strokeWeight * 0.04}
            height={0.34 + pulse.parry * 0.28 + strokeWeight * 0.06}
            color="#ffffff"
            rimColor={impactColor}
            opacity={0.14 + pulse.parry * 0.22}
            glow={0.2 + pulse.parry * 0.28 + strokeWeight * 0.12}
          />
          <group position={[0.05, 0.01, 0]} rotation={[0, 0, -0.44]}>
            <InkBillboard
              width={0.04 + pulse.parry * 0.08}
              height={0.2 + pulse.parry * 0.14}
              color={impactColor}
              rimColor="#ffffff"
              opacity={0.08 + pulse.parry * 0.12}
              glow={0.1 + pulse.parry * 0.16}
            />
          </group>
        </group>
      )}

      {pulse.land > 0.06 && (
        <group position={landingAnchor}>
          <InkBillboard
            width={Math.max(0.46, landingSpan + 0.18) + pulse.land * 0.72}
            height={0.08 + pulse.land * 0.1 + strokeWeight * 0.04}
            color={burstColor}
            rimColor={impactColor}
            opacity={0.18 + pulse.land * 0.24}
            glow={0.08 + pulse.land * 0.14 + strokeWeight * 0.08}
          />
        </group>
      )}

      {pulse.tech > 0.06 && (
        <group position={techAnchor}>
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
        <group position={guardBreakAnchor} rotation={[0, 0, 0.12]}>
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
