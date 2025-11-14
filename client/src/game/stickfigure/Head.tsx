import { colorThemes, figureStyles, accessories, useCustomization } from "../../lib/stores/useCustomization";
import type { FC } from "react";
import * as THREE from "three";
import { useInkMaterial, useOutlineMaterial } from "./inkMaterial";

export type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
export type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];
export type AccessoryValues = (typeof accessories)[keyof typeof accessories] & { color: string };

interface HeadProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
  accessory: AccessoryValues;
  isAttacking: boolean;
  lean: number;
  isPlayer: boolean;
}

const Head: FC<HeadProps> = ({ colors, style, accessory, isAttacking, lean, isPlayer }) => {
  const { getPlayerInkParams, getCPUInkParams } = useCustomization();
  const inkParams = isPlayer ? getPlayerInkParams() : getCPUInkParams();
  
  const inkMaterial = useInkMaterial({
    baseColor: colors.primary,
    rimColor: inkParams.rimColor,
    shadeBands: inkParams.shadeBands,
    glow: isAttacking ? inkParams.glow + 0.15 : inkParams.glow,
  });
  const outlineMaterial = useOutlineMaterial(inkParams.outlineColor);
  const headScale = style.headSize;
  const outlineScale = 1 + inkParams.lineWidth;

  return (
    <>
      <group position={[lean * 0.12, 1.8, 0]} rotation={[0, 0, lean * 0.25]}>
        <mesh castShadow material={inkMaterial}>
          <sphereGeometry args={[headScale, 32, 32]} />
        </mesh>
        <mesh castShadow scale={[outlineScale, outlineScale, outlineScale]} material={outlineMaterial}>
          <sphereGeometry args={[headScale, 32, 32]} />
        </mesh>
      </group>

      {accessory.geometry && (
        <group position={[lean * 0.12, 1.8 + style.headSize * 0.5, 0]} rotation={[0, 0, lean * 0.25]}>
          {(Array.isArray(accessory.geometry) ? accessory.geometry : [accessory.geometry]).map((geom: any, idx) => {
            if (!geom) return null;
            const geoBuilder = () => {
              switch (geom.type) {
                case "cone":
                case "coneGeometry":
                  return <coneGeometry args={geom.args as any} />;
                case "torusGeometry":
                  return <torusGeometry args={geom.args as any} />;
                case "planeGeometry":
                  return <planeGeometry args={geom.args as any} />;
                case "boxGeometry":
                  return <boxGeometry args={geom.args as any} />;
                case "circleGeometry":
                  return <circleGeometry args={geom.args as any} />;
                case "sphereGeometry":
                  return <sphereGeometry args={geom.args as any} />;
                case "cylinderGeometry":
                  return <cylinderGeometry args={geom.args as any} />;
                case "octahedronGeometry":
                  return <octahedronGeometry args={geom.args as any} />;
                default:
                  return <boxGeometry args={[0.1, 0.1, 0.1]} />;
              }
            };
            const strokeWidth = inkParams.lineWidth;
            const accessoryMaterial = useInkMaterial({
              baseColor: accessory.color ?? colors.secondary,
              rimColor: accessory.rimColor ?? inkParams.rimColor,
              shadeBands: accessory.shadeBands ?? inkParams.shadeBands,
              glow: accessory.emissive ? Math.max(0.3, inkParams.glow + 0.2) : inkParams.glow,
            });
            const outlineMat = useOutlineMaterial(accessory.outlineColor ?? inkParams.outlineColor, accessory.emissive ? 0.95 : 0.8);
            return (
              <group key={idx} position={geom.position as [number, number, number]} rotation={geom.rotation as [number, number, number]}>
                <mesh castShadow material={accessoryMaterial}>{geoBuilder()}</mesh>
                <mesh castShadow material={outlineMat} scale={[1 + strokeWidth, 1 + strokeWidth, 1 + strokeWidth]}>
                  {geoBuilder()}
                </mesh>
              </group>
            );
          })}
        </group>
      )}
    </>
  );
};

export default Head;
