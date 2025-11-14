import { colorThemes, figureStyles, accessories } from "../../lib/stores/useCustomization";
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
}

const Head: FC<HeadProps> = ({ colors, style, accessory, isAttacking, lean }) => {
  const inkMaterial = useInkMaterial({
    baseColor: colors.primary,
    rimColor: colors.glow ?? colors.secondary,
    shadeBands: 3,
    glow: isAttacking ? 0.25 : 0.05,
  });
  const outlineMaterial = useOutlineMaterial();
  const headScale = style.headSize;
  const outlineScale = 1 + (style.outlineWidth ?? 0.04);

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
            const strokeWidth = accessory.lineWidth ?? (style.outlineWidth ?? 0.04);
            const accessoryMaterial = useInkMaterial({
              baseColor: accessory.color ?? colors.secondary,
              rimColor: accessory.rimColor ?? colors.glow ?? accessory.color,
              shadeBands: accessory.shadeBands ?? 3,
              glow: accessory.emissive ? 0.3 : 0.05,
            });
            const outlineMat = useOutlineMaterial(accessory.outlineColor ?? "#080808", accessory.emissive ? 0.95 : 0.8);
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
