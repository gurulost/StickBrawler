import { colorThemes, figureStyles } from "../../lib/stores/useCustomization";
import type { FC } from "react";
import { useInkMaterial, useOutlineMaterial } from "./inkMaterial";

export type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
export type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];

interface TorsoProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
  lean: number;
}

const Torso: FC<TorsoProps> = ({ colors, style, lean }) => {
  const inkMaterial = useInkMaterial({
    baseColor: colors.primary,
    rimColor: colors.tertiary ?? colors.secondary,
    shadeBands: 3,
  });
  const outlineMaterial = useOutlineMaterial();
  const scale = style.bodyScale;
  const outlineScale = 1 + (style.outlineWidth ?? 0.04);

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
