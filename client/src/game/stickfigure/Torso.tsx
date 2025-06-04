import { colorThemes, figureStyles } from "../../lib/stores/useCustomization";
import type { FC } from "react";

export type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
export type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];

interface TorsoProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
}

const Torso: FC<TorsoProps> = ({ colors, style }) => (
  <mesh
    position={[0, 1.0, 0]}
    castShadow
    scale={[style.bodyScale, style.bodyScale, style.bodyScale]}
  >
    <cylinderGeometry args={[style.limbThickness, style.limbThickness, style.bodyLength, 12]} />
    <meshStandardMaterial
      color={colors.primary}
      metalness={style.metalness}
      roughness={style.roughness}
    />
  </mesh>
);

export default Torso;
