import { colorThemes, figureStyles } from "../../lib/stores/useCustomization";
import type { FC } from "react";
import { useMemo, useEffect } from "react";
import { useInkMaterial, useOutlineMaterial } from "./inkMaterial";
import { createTaperedLimbGeometry } from "./limbGeometry";

export type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
export type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];

interface LimbsProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
  attackType: string | null;
  animationPhase: number;
  isBlocking: boolean;
  isAttacking: boolean;
  isJumping: boolean;
  direction: 1 | -1;
  time: number;
  speedRatio: number;
  plantedFoot: "left" | "right" | null;
}

const smooth = (from: number, to: number, factor: number) => from + (to - from) * factor;

const computeArmPose = (params: {
  attackType: string | null;
  isBlocking: boolean;
  isAttacking: boolean;
  isJumping: boolean;
  animationPhase: number;
  side: "left" | "right";
  idleSwing: number;
  jumpTilt: number;
  attackPulse: number;
  stanceOffset: number;
  time: number;
}) => {
  const { attackType, isBlocking, isAttacking, isJumping, animationPhase, side, idleSwing, jumpTilt, attackPulse, stanceOffset, time } = params;
  const dir = side === "left" ? 1 : -1;
  const sinFast = Math.sin(time * 5);
  const sinIdle = Math.sin(time * 1.5);

  let rotX = idleSwing * dir;
  let rotY = stanceOffset * dir;
  let rotZ = idleSwing * 0.5 * dir;

  if (isJumping) {
    rotX += jumpTilt * dir;
    rotZ += jumpTilt * 0.5 * dir;
  }

  if (isBlocking) {
    rotX = side === "left" ? Math.PI / 4 : -Math.PI / 4;
    rotZ = side === "left" ? -Math.PI / 2 : Math.PI / 2;
  }

  if (attackType === "punch") {
    rotX = side === "left" ? -Math.PI / 4 : Math.PI / 3;
    rotZ = side === "left" ? -Math.PI / 3 : Math.PI / 4;
    rotZ += animationPhase * 0.3 * dir + attackPulse * dir;
  } else if (attackType === "kick") {
    rotX = side === "left" ? Math.PI / 4 : -Math.PI / 6;
    rotZ = side === "left" ? -Math.PI / 2 : Math.PI / 3;
  } else if (attackType === "special") {
    rotX = Math.PI / 2 * dir;
    rotY = animationPhase * Math.PI / 4 * dir;
    rotZ = -Math.PI * dir + animationPhase * Math.PI / 2 * dir;
  } else if (attackType === "air_attack") {
    rotX = -Math.PI / 2 * dir;
    rotZ = -Math.PI / 2 * dir - animationPhase * 0.4 * dir;
  } else if (attackType === "grab") {
    rotX = Math.PI / 4 * dir;
    rotZ = -Math.PI / 2 * dir - animationPhase * 0.2 * dir;
  } else if (attackType === "dodge") {
    rotX = -Math.PI / 6 * dir;
    rotZ = -Math.PI / 4 * dir + animationPhase * 0.1 * dir;
  } else if (attackType === "taunt") {
    rotX = Math.PI / 2 * dir + sinFast * 0.3;
    rotY = sinFast * Math.PI / 3 * dir;
    rotZ = -Math.PI / 2 * dir + sinFast * 0.7;
  }

  if (isAttacking && !attackType) {
    rotZ += sinFast * 0.4 * dir;
  }

  return [rotX, rotY, rotZ] as [number, number, number];
};

const computeLegPose = (params: {
  attackType: string | null;
  isAttacking: boolean;
  isJumping: boolean;
  animationPhase: number;
  side: "left" | "right";
  idleSwing: number;
  jumpTilt: number;
  time: number;
  speedRatio: number;
  groundedIdle: boolean;
  plantedFoot: "left" | "right" | null;
}) => {
  const {
    attackType,
    isAttacking,
    isJumping,
    animationPhase,
    side,
    idleSwing,
    jumpTilt,
    time,
    speedRatio,
    groundedIdle,
    plantedFoot,
  } = params;
  const dir = side === "left" ? 1 : -1;
  const sinFast = Math.sin(time * (4 + speedRatio * 4));
  const stride = Math.sin(time * (3 + speedRatio * 5)) * (0.4 + speedRatio * 0.6);

  let rotX = idleSwing * dir + stride * dir;
  let rotY = stride * 0.15;
  let rotZ = idleSwing * 0.35 * dir;

  if (isJumping) {
    rotX += dir * (Math.PI / 3 + speedRatio * 0.2);
    rotZ += jumpTilt * dir;
  } else {
    rotX += stride * dir * 0.2;
  }

  switch (attackType) {
    case "kick":
      rotX = dir * Math.PI / 6 + speedRatio * 0.3 * dir;
      rotZ = -dir * Math.PI / 4;
      break;
    case "special":
      rotX = dir * Math.PI / 4 - animationPhase * 0.1 * dir;
      rotZ = -Math.PI / 4 - animationPhase * 0.2 * dir;
      break;
    case "air_attack":
      rotX = dir * Math.PI / 3 - animationPhase * 0.1 * dir;
      rotZ = -Math.PI / 3 - animationPhase * 0.1 * dir;
      break;
    case "grab":
      rotX = dir * Math.PI / 8 + animationPhase * 0.05 * dir;
      rotZ = -Math.PI / 6 - animationPhase * 0.1 * dir;
      break;
    case "dodge":
      rotX = dir * Math.PI / 4 + animationPhase * 0.2 * dir;
      rotZ = Math.PI / 3 * dir - animationPhase * 0.2 * dir;
      break;
    case "taunt":
      rotX = Math.PI / 6 * dir + sinFast * 0.3;
      rotY = -Math.sin(time * 5) * Math.PI / 4 * dir;
      rotZ = -Math.PI / 6 * dir - Math.sin(time * 5) * 0.4;
      break;
  }

  if (groundedIdle && plantedFoot) {
    if (plantedFoot === side) {
      rotX = -0.12;
      rotY = 0;
      rotZ = 0.05 * dir;
    } else {
      rotX = 0.22;
      rotY = 0;
      rotZ = -0.08 * dir;
    }
  } else if (isAttacking && !attackType) {
    rotX += sinFast * 0.15 * dir;
  }

  return [rotX, rotY, rotZ] as [number, number, number];
};

const Limbs: FC<LimbsProps> = ({
  colors,
  style,
  attackType,
  animationPhase,
  isBlocking,
  isAttacking,
  isJumping,
  direction,
  time,
  speedRatio,
  plantedFoot,
}) => {
  const limbMaterial = useInkMaterial({
    baseColor: colors.secondary ?? colors.primary,
    rimColor: colors.glow ?? colors.tertiary ?? colors.primary,
    shadeBands: 4,
    glow: isAttacking ? 0.2 : 0.03,
  });
  const outlineMaterial = useOutlineMaterial();
  const outlineScale = 1 + (style.outlineWidth ?? 0.04);
  const armConfig = style.silhouette?.arms ?? {
    length: 0.7,
    base: 1,
    mid: 0.85,
    tip: 0.6,
    curvature: 0,
  };
  const legConfig = style.silhouette?.legs ?? {
    length: 0.8,
    base: 1.15,
    mid: 0.95,
    tip: 0.65,
    curvature: 0,
  };
  const armGeometry = useMemo(
    () =>
      createTaperedLimbGeometry({
        length: armConfig.length,
        baseRadius: style.limbThickness * (armConfig.base ?? 1),
        midRadius: style.limbThickness * (armConfig.mid ?? 0.85),
        tipRadius: style.limbThickness * (armConfig.tip ?? 0.6),
        curvature: armConfig.curvature ?? 0,
      }),
    [armConfig.length, armConfig.base, armConfig.mid, armConfig.tip, armConfig.curvature, style.limbThickness],
  );
  const legGeometry = useMemo(
    () =>
      createTaperedLimbGeometry({
        length: legConfig.length,
        baseRadius: style.limbThickness * (legConfig.base ?? 1.1),
        midRadius: style.limbThickness * (legConfig.mid ?? 0.95),
        tipRadius: style.limbThickness * (legConfig.tip ?? 0.65),
        curvature: legConfig.curvature ?? 0,
      }),
    [legConfig.length, legConfig.base, legConfig.mid, legConfig.tip, legConfig.curvature, style.limbThickness],
  );
  useEffect(() => () => armGeometry.dispose(), [armGeometry]);
  useEffect(() => () => legGeometry.dispose(), [legGeometry]);
  const groundedIdle = !isJumping && speedRatio < 0.2;
  const rhythm = time * (1.5 + speedRatio * 5);
  const idleSwing = Math.sin(rhythm) * (0.12 + speedRatio * 0.35);
  const jumpTilt = isJumping ? Math.sin(time * (4 + speedRatio * 2)) * (0.08 + speedRatio * 0.1) : 0;
  const attackPulse = isAttacking
    ? Math.sin(time * (10 + speedRatio * 4)) * (0.05 + speedRatio * 0.05)
    : 0;
  const stanceOffset = Math.sin(time * (2 + speedRatio * 3)) * (0.05 + speedRatio * 0.1);

  const leftArmRotation = computeArmPose({
    attackType,
    isBlocking,
    isAttacking,
    isJumping,
    animationPhase,
    side: "left",
    idleSwing,
    jumpTilt,
    attackPulse,
    stanceOffset,
    time,
  });

  const rightArmRotation = computeArmPose({
    attackType,
    isBlocking,
    isAttacking,
    isJumping,
    animationPhase,
    side: "right",
    idleSwing,
    jumpTilt,
    attackPulse,
    stanceOffset,
    time,
  });

  const leftLegRotation = computeLegPose({
    attackType,
    isAttacking,
    isJumping,
    animationPhase,
    side: "left",
    idleSwing,
    jumpTilt,
    time,
    speedRatio,
    groundedIdle,
    plantedFoot,
  });

  const rightLegRotation = computeLegPose({
    attackType,
    isAttacking,
    isJumping,
    animationPhase,
    side: "right",
    idleSwing,
    jumpTilt,
    time,
    speedRatio,
    groundedIdle,
    plantedFoot,
  });

  return (
    <>
      {/* Left Arm */}
      <group position={[0, 1.2, 0]} rotation={leftArmRotation}>
        <mesh
          position={[0.3, 0, attackType === "punch" ? animationPhase * 0.15 : attackType === "grab" ? 0.3 + animationPhase * 0.15 : attackType === "air_attack" ? -0.15 - animationPhase * 0.15 : 0]}
          castShadow
          material={limbMaterial}
        >
          <primitive object={armGeometry} attach="geometry" />
        </mesh>
        <mesh
          position={[0.3, 0, attackType === "punch" ? animationPhase * 0.15 : attackType === "grab" ? 0.3 + animationPhase * 0.15 : attackType === "air_attack" ? -0.15 - animationPhase * 0.15 : 0]}
          castShadow
          scale={[outlineScale, outlineScale, outlineScale]}
          material={outlineMaterial}
        >
          <primitive object={armGeometry} attach="geometry" />
        </mesh>
      </group>

      {/* Right Arm */}
      <group position={[0, 1.2, 0]} rotation={rightArmRotation}>
        <mesh
          position={[-0.3, 0, attackType === "special" ? animationPhase * 0.15 : attackType === "grab" ? 0.3 + animationPhase * 0.15 : attackType === "air_attack" ? -0.15 - animationPhase * 0.15 : 0]}
          castShadow
          material={limbMaterial}
        >
          <primitive object={armGeometry} attach="geometry" />
        </mesh>
        <mesh
          position={[-0.3, 0, attackType === "special" ? animationPhase * 0.15 : attackType === "grab" ? 0.3 + animationPhase * 0.15 : attackType === "air_attack" ? -0.15 - animationPhase * 0.15 : 0]}
          castShadow
          scale={[outlineScale, outlineScale, outlineScale]}
          material={outlineMaterial}
        >
          <primitive object={armGeometry} attach="geometry" />
        </mesh>
      </group>

      {/* Left Leg */}
      <group position={[0, 0.5, 0]} rotation={leftLegRotation}>
        <mesh
          position={[0.15, -0.35, attackType === "kick" ? 0.2 + animationPhase * 0.2 : attackType === "air_attack" ? -0.15 - animationPhase * 0.2 : attackType === "dodge" ? 0.15 - animationPhase * 0.25 : 0]}
          castShadow
          material={limbMaterial}
        >
          <primitive object={legGeometry} attach="geometry" />
        </mesh>
        <mesh
          position={[0.15, -0.35, attackType === "kick" ? 0.2 + animationPhase * 0.2 : attackType === "air_attack" ? -0.15 - animationPhase * 0.2 : attackType === "dodge" ? 0.15 - animationPhase * 0.25 : 0]}
          castShadow
          scale={[outlineScale, outlineScale, outlineScale]}
          material={outlineMaterial}
        >
          <primitive object={legGeometry} attach="geometry" />
        </mesh>
      </group>

      {/* Right Leg */}
      <group position={[0, 0.5, 0]} rotation={rightLegRotation}>
        <mesh
          position={[-0.15, -0.35, attackType === "air_attack" ? -0.15 - animationPhase * 0.15 : attackType === "dodge" ? -0.15 + animationPhase * 0.25 : 0]}
          castShadow
          material={limbMaterial}
        >
          <primitive object={legGeometry} attach="geometry" />
        </mesh>
        <mesh
          position={[-0.15, -0.35, attackType === "air_attack" ? -0.15 - animationPhase * 0.15 : attackType === "dodge" ? -0.15 + animationPhase * 0.25 : 0]}
          castShadow
          scale={[outlineScale, outlineScale, outlineScale]}
          material={outlineMaterial}
        >
          <primitive object={legGeometry} attach="geometry" />
        </mesh>
      </group>
    </>
  );
};

export default Limbs;
