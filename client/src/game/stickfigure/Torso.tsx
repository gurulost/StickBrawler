import { colorThemes, figureStyles, useCustomization } from "../../lib/stores/useCustomization";
import type { FC } from "react";
import { useInkMaterial, useOutlineMaterial } from "./inkMaterial";

export type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
export type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];

interface TorsoProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
  lean: number;
  isPlayer: boolean;
}

const Torso: FC<TorsoProps> = ({ colors, style, lean, isPlayer }) => {
  const { getPlayerInkParams, getCPUInkParams } = useCustomization();
  const inkParams = isPlayer ? getPlayerInkParams() : getCPUInkParams();
  
  const inkMaterial = useInkMaterial({
    baseColor: colors.primary,
    rimColor: inkParams.rimColor,
    shadeBands: inkParams.shadeBands,
    glow: inkParams.glow,
  });
  const outlineMaterial = useOutlineMaterial(inkParams.outlineColor);
  const scale = style.bodyScale;
  const outlineScale = 1 + inkParams.lineWidth;

  return (
    <group position={[lean * 0.1, 1.0, 0]} rotation={[0, 0, lean * 0.2]} scale={[scale, scale, scale]}>
      <mesh castShadow material={inkMaterial}>
        <cylinderGeometry args={[style.limbThickness * 0.9, style.limbThickness, style.bodyLength, 24]} />
      </mesh>
      <mesh castShadow scale={[outlineScale, outlineScale, outlineScale]} material={outlineMaterial}>
        <cylinderGeometry args={[style.limbThickness * 0.9, style.limbThickness, style.bodyLength, 24]} />
      </mesh>
    </group>
  );
};

export default Torso;
