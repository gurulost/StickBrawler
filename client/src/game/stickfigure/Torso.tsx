import { colorThemes, figureStyles, useCustomization } from "../../lib/stores/useCustomization";
import type { FC } from "react";
import InkPart from "./InkPart";

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
  const scale = style.bodyScale;
  const outlineScale = 1 + inkParams.lineWidth;
  const rimColor = colors.glow ?? inkParams.rimColor;
  const accentColor = colors.tertiary ?? colors.secondary;
  const shoulderWidth = Math.max(0.34, style.shoulderWidth);
  const shoulderY = style.bodyLength * 0.22;
  const bodyGlow = inkParams.glow + style.glowIntensity * 0.08;

  return (
    <group position={[lean * 0.1, 1.0, 0]} rotation={[0, 0, lean * 0.2]} scale={[scale, scale, scale]}>
      {style.specialGeometry === "mechanical" ? (
        <>
          <InkPart
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={3}
            glow={bodyGlow + 0.08}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[shoulderWidth * 0.82, style.bodyLength * 0.82, style.limbThickness * 1.8]} />}
          />
          <InkPart
            position={[0, 0.04, style.limbThickness * 0.62]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={2}
            glow={bodyGlow + 0.2}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[shoulderWidth * 0.38, style.bodyLength * 0.34, style.limbThickness * 0.4]} />}
          />
          <InkPart
            position={[0, -style.bodyLength * 0.16, 0]}
            baseColor={colors.secondary}
            rimColor={rimColor}
            shadeBands={3}
            glow={bodyGlow}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[shoulderWidth * 0.5, style.bodyLength * 0.14, style.limbThickness * 1.4]} />}
          />
        </>
      ) : style.specialGeometry === "crystalline" ? (
        <>
          <InkPart
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={4}
            glow={bodyGlow + 0.1}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <octahedronGeometry args={[style.bodyLength * 0.38, 0]} />}
          />
          <InkPart
            position={[-shoulderWidth * 0.38, shoulderY, 0]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={bodyGlow + 0.18}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <octahedronGeometry args={[style.bodyLength * 0.12, 0]} />}
          />
          <InkPart
            position={[shoulderWidth * 0.38, shoulderY, 0]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={bodyGlow + 0.18}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <octahedronGeometry args={[style.bodyLength * 0.12, 0]} />}
          />
        </>
      ) : style.specialGeometry === "translucent" ? (
        <>
          <InkPart
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={inkParams.shadeBands + 1}
            glow={bodyGlow + 0.14}
            opacity={0.66}
            outlineColor={inkParams.outlineColor}
            outlineOpacity={0.45}
            outlineScale={outlineScale}
            renderGeometry={() => <cylinderGeometry args={[style.limbThickness * 0.82, style.limbThickness * 0.56, style.bodyLength, 24]} />}
          />
          <InkPart
            scale={[0.72, 0.78, 0.72]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={bodyGlow + 0.22}
            opacity={0.88}
            outlineColor={inkParams.outlineColor}
            outlineOpacity={0.35}
            outlineScale={outlineScale}
            renderGeometry={() => <cylinderGeometry args={[style.limbThickness * 0.8, style.limbThickness * 0.46, style.bodyLength, 20]} />}
          />
        </>
      ) : style.specialGeometry === "angular" ? (
        <>
          <InkPart
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={3}
            glow={bodyGlow}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[shoulderWidth * 0.86, style.bodyLength * 0.82, style.limbThickness * 1.6]} />}
          />
          <InkPart
            position={[0, -style.bodyLength * 0.22, 0]}
            baseColor={accentColor}
            rimColor={rimColor}
            shadeBands={3}
            glow={bodyGlow + 0.04}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[shoulderWidth * 0.52, style.bodyLength * 0.16, style.limbThickness * 1.45]} />}
          />
        </>
      ) : style.specialGeometry === "streamlined" ? (
        <>
          <InkPart
            scale={[0.84, 1.04, 0.84]}
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={inkParams.shadeBands}
            glow={bodyGlow + 0.08}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <cylinderGeometry args={[style.limbThickness * 0.82, style.limbThickness * 0.52, style.bodyLength, 24]} />}
          />
          <InkPart
            position={[0, style.bodyLength * 0.08, style.limbThickness * 0.44]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={3}
            glow={bodyGlow + 0.12}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <boxGeometry args={[shoulderWidth * 0.28, style.bodyLength * 0.46, style.limbThickness * 0.2]} />}
          />
        </>
      ) : style.specialGeometry === "rounded" ? (
        <>
          <InkPart
            scale={[1.02, 0.86, 1]}
            baseColor={colors.primary}
            rimColor={rimColor}
            shadeBands={inkParams.shadeBands}
            glow={bodyGlow + 0.08}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <sphereGeometry args={[style.bodyLength * 0.38, 28, 28]} />}
          />
          <InkPart
            position={[0, -style.bodyLength * 0.18, style.limbThickness * 0.26]}
            baseColor={accentColor}
            rimColor={rimColor}
            shadeBands={4}
            glow={bodyGlow + 0.1}
            outlineColor={inkParams.outlineColor}
            outlineScale={outlineScale}
            renderGeometry={() => <sphereGeometry args={[style.bodyLength * 0.16, 20, 20]} />}
          />
        </>
      ) : (
        <InkPart
          baseColor={colors.primary}
          rimColor={rimColor}
          shadeBands={inkParams.shadeBands}
          glow={bodyGlow}
          outlineColor={inkParams.outlineColor}
          outlineScale={outlineScale}
          renderGeometry={() => <cylinderGeometry args={[style.limbThickness * 0.9, style.limbThickness, style.bodyLength, 24]} />}
        />
      )}

      <InkPart
        position={[0, shoulderY, 0]}
        baseColor={accentColor}
        rimColor={rimColor}
        shadeBands={Math.max(2, inkParams.shadeBands)}
        glow={bodyGlow + 0.04}
        outlineColor={inkParams.outlineColor}
        outlineScale={outlineScale}
        renderGeometry={() => <boxGeometry args={[shoulderWidth, style.limbThickness * 0.95, style.limbThickness * 1.1]} />}
      />
    </group>
  );
};

export default Torso;
