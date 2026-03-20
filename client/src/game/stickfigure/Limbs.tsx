import type { FC } from "react";
import { useEffect, useMemo } from "react";
import { colorThemes, figureStyles, useCustomization } from "../../lib/stores/useCustomization";
import { useInkMaterial, useOutlineMaterial } from "./inkMaterial";
import { createTaperedLimbGeometry } from "./limbGeometry";
import type { SampledStickPose } from "./movePresentation";

export type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
export type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];

interface LimbsProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
  pose: SampledStickPose;
  isPlayer: boolean;
}

const Limbs: FC<LimbsProps> = ({
  colors,
  style,
  pose,
  isPlayer,
}) => {
  const { getPlayerInkParams, getCPUInkParams } = useCustomization();
  const inkParams = isPlayer ? getPlayerInkParams() : getCPUInkParams();
  const glowBoost = Math.max(pose.emphasis * 0.14, Math.max(0, pose.lineWeight - 1) * 0.38);
  const limbMaterial = useInkMaterial({
    baseColor: colors.secondary ?? colors.primary,
    rimColor: colors.glow ?? inkParams.rimColor,
    shadeBands: inkParams.shadeBands,
    glow: inkParams.glow + glowBoost,
  });
  const outlineMaterial = useOutlineMaterial(inkParams.outlineColor);
  const outlineScale =
    1 + inkParams.lineWidth + Math.max(0, pose.lineWeight - 1) * 0.12 + pose.emphasis * 0.02;

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
    [armConfig.base, armConfig.curvature, armConfig.length, armConfig.mid, armConfig.tip, style.limbThickness],
  );
  const legGeometry = useMemo(
    () =>
      createTaperedLimbGeometry({
        length: legConfig.length,
        baseRadius: style.limbThickness * (legConfig.base ?? 1.15),
        midRadius: style.limbThickness * (legConfig.mid ?? 0.95),
        tipRadius: style.limbThickness * (legConfig.tip ?? 0.65),
        curvature: legConfig.curvature ?? 0,
      }),
    [legConfig.base, legConfig.curvature, legConfig.length, legConfig.mid, legConfig.tip, style.limbThickness],
  );

  useEffect(() => () => armGeometry.dispose(), [armGeometry]);
  useEffect(() => () => legGeometry.dispose(), [legGeometry]);

  const shoulderOffset = 0.12 + style.shoulderWidth * 0.32;
  const armRootY = 0.95 + style.bodyLength * 0.32;
  const hipOffset = 0.06 + style.shoulderWidth * 0.16;
  const legRootY = 0.18 + style.bodyLength * 0.4;
  const legMeshY = -legConfig.length * 0.44;

  return (
    <>
      <group position={[0, armRootY, 0]} rotation={pose.leftArm.rotation}>
        <mesh position={[shoulderOffset, 0, pose.leftArm.reach]} castShadow material={limbMaterial}>
          <primitive object={armGeometry} attach="geometry" />
        </mesh>
        <mesh
          position={[shoulderOffset, 0, pose.leftArm.reach]}
          castShadow
          material={outlineMaterial}
          scale={[outlineScale, outlineScale, outlineScale]}
        >
          <primitive object={armGeometry} attach="geometry" />
        </mesh>
      </group>

      <group position={[0, armRootY, 0]} rotation={pose.rightArm.rotation}>
        <mesh position={[-shoulderOffset, 0, pose.rightArm.reach]} castShadow material={limbMaterial}>
          <primitive object={armGeometry} attach="geometry" />
        </mesh>
        <mesh
          position={[-shoulderOffset, 0, pose.rightArm.reach]}
          castShadow
          material={outlineMaterial}
          scale={[outlineScale, outlineScale, outlineScale]}
        >
          <primitive object={armGeometry} attach="geometry" />
        </mesh>
      </group>

      <group position={[0, legRootY, 0]} rotation={pose.leftLeg.rotation}>
        <mesh position={[hipOffset, legMeshY, pose.leftLeg.reach]} castShadow material={limbMaterial}>
          <primitive object={legGeometry} attach="geometry" />
        </mesh>
        <mesh
          position={[hipOffset, legMeshY, pose.leftLeg.reach]}
          castShadow
          material={outlineMaterial}
          scale={[outlineScale, outlineScale, outlineScale]}
        >
          <primitive object={legGeometry} attach="geometry" />
        </mesh>
      </group>

      <group position={[0, legRootY, 0]} rotation={pose.rightLeg.rotation}>
        <mesh position={[-hipOffset, legMeshY, pose.rightLeg.reach]} castShadow material={limbMaterial}>
          <primitive object={legGeometry} attach="geometry" />
        </mesh>
        <mesh
          position={[-hipOffset, legMeshY, pose.rightLeg.reach]}
          castShadow
          material={outlineMaterial}
          scale={[outlineScale, outlineScale, outlineScale]}
        >
          <primitive object={legGeometry} attach="geometry" />
        </mesh>
      </group>
    </>
  );
};

export default Limbs;
