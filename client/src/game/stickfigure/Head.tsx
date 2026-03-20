import { colorThemes, figureStyles, useCustomization } from "../../lib/stores/useCustomization";
import type { FC } from "react";
import InkPart from "./InkPart";

export type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
export type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];
interface HeadProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
  isAttacking: boolean;
  lean: number;
  inkWeight: number;
  isPlayer: boolean;
}

const Head: FC<HeadProps> = ({ colors, style, isAttacking, lean, inkWeight, isPlayer }) => {
  const { getPlayerInkParams, getCPUInkParams } = useCustomization();
  const inkParams = isPlayer ? getPlayerInkParams() : getCPUInkParams();

  const headScale = style.headSize;
  const styleVariant = style.specialGeometry;
  const inkPulse = Math.max(0, inkWeight - 1);
  const glow = (isAttacking ? inkParams.glow + 0.15 : inkParams.glow) + inkPulse * 0.22;
  const outlineScale = 1 + inkParams.lineWidth + inkPulse * 0.08;
  const accentColor = colors.emissive ?? colors.secondary;
  const rimColor = colors.glow ?? inkParams.rimColor;

  return (
    <group position={[lean * 0.12, 1.8, 0]} rotation={[0, 0, lean * 0.25]}>
      {styleVariant === "mechanical" ? (
        <>
          <InkPart
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={inkParams.shadeBands}
            glow={glow + 0.06}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[headScale * 1.7, headScale * 1.48, headScale * 1.35]} />}
          />
          <InkPart
            position={[0, -0.03, headScale * 0.48]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={2}
            glow={glow + 0.22}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[headScale * 1.32, headScale * 0.28, headScale * 0.14]} />}
          />
          <InkPart
            position={[headScale * 0.68, headScale * 0.3, 0]}
            rotation={[0, 0, Math.PI / 8]}
            baseColor={accentColor}
            rimColor={rimColor}
            shadeBands={2}
            glow={glow + 0.08}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <cylinderGeometry args={[headScale * 0.06, headScale * 0.06, headScale * 0.5, 12]} />}
          />
        </>
      ) : styleVariant === "translucent" ? (
        <>
          <InkPart
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={inkParams.shadeBands + 1}
            glow={glow + 0.16}
            opacity={0.68}
            outlineColor={inkParams.outlineColor}
            outlineOpacity={0.45}
            outlineScale={outlineScale}
            renderGeometry={() => <sphereGeometry args={[headScale, 32, 32]} />}
          />
          <InkPart
            scale={0.62}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={glow + 0.28}
            opacity={0.88}
            outlineColor={inkParams.outlineColor}
            outlineOpacity={0.4}
            outlineScale={outlineScale}
            renderGeometry={() => <sphereGeometry args={[headScale, 28, 28]} />}
          />
        </>
      ) : styleVariant === "crystalline" ? (
        <>
          <InkPart
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={4}
            glow={glow + 0.1}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <octahedronGeometry args={[headScale * 1.18, 0]} />}
          />
          <InkPart
            position={[-headScale * 0.55, headScale * 0.1, 0]}
            rotation={[0, 0, -0.22]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={glow + 0.18}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <octahedronGeometry args={[headScale * 0.32, 0]} />}
          />
          <InkPart
            position={[headScale * 0.55, headScale * 0.1, 0]}
            rotation={[0, 0, 0.22]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={glow + 0.18}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <octahedronGeometry args={[headScale * 0.32, 0]} />}
          />
        </>
      ) : styleVariant === "angular" ? (
        <>
          <InkPart
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={inkParams.shadeBands}
            glow={glow + 0.04}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <octahedronGeometry args={[headScale * 1.14, 0]} />}
          />
          <InkPart
            position={[0, headScale * 0.18, headScale * 0.05]}
            baseColor={accentColor}
            rimColor={rimColor}
            shadeBands={3}
            glow={glow + 0.08}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[headScale * 0.9, headScale * 0.18, headScale * 0.28]} />}
          />
        </>
      ) : styleVariant === "streamlined" ? (
        <>
          <InkPart
            scale={[0.88, 1.04, 1.14]}
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={inkParams.shadeBands}
            glow={glow + 0.1}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <sphereGeometry args={[headScale, 32, 32]} />}
          />
          <InkPart
            position={[0, -headScale * 0.06, headScale * 0.42]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={3}
            glow={glow + 0.18}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[headScale * 0.74, headScale * 0.12, headScale * 0.08]} />}
          />
        </>
      ) : styleVariant === "rounded" ? (
        <>
          <InkPart
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={inkParams.shadeBands}
            glow={glow + 0.08}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <sphereGeometry args={[headScale, 32, 32]} />}
          />
          <InkPart
            position={[-headScale * 0.55, -headScale * 0.08, headScale * 0.06]}
            baseColor={accentColor}
            rimColor={rimColor}
            shadeBands={4}
            glow={glow + 0.12}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <sphereGeometry args={[headScale * 0.24, 18, 18]} />}
          />
          <InkPart
            position={[headScale * 0.55, -headScale * 0.08, headScale * 0.06]}
            baseColor={accentColor}
            rimColor={rimColor}
            shadeBands={4}
            glow={glow + 0.12}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <sphereGeometry args={[headScale * 0.24, 18, 18]} />}
          />
        </>
      ) : (
        <InkPart
          baseColor={colors.primary}
          rimColor={rimColor}
          shadeBands={inkParams.shadeBands}
          glow={glow}
          outlineColor={inkParams.outlineColor}
          outlineScale={outlineScale}
          renderGeometry={() => <sphereGeometry args={[headScale, 32, 32]} />}
        />
      )}
    </group>
  );
};

export default Head;
