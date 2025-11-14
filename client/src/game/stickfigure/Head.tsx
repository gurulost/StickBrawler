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
          {(Array.isArray(accessory.geometry)
            ? accessory.geometry
            : [accessory.geometry]
          ).map((geom, idx) => {
            if (!geom) return null;
            const g: any = geom;
            if (g.type === "cone" || g.type === "coneGeometry") {
              return (
                <mesh key={idx} position={g.position as [number, number, number]} rotation={g.rotation as [number, number, number]} castShadow>
                  <coneGeometry args={g.args as any} />
                  <meshStandardMaterial
                    color={accessory.color}
                    metalness={style.metalness}
                    roughness={style.roughness}
                  />
                </mesh>
              );
            }
            if (g.type === "torusGeometry") {
              return (
                <mesh key={idx} position={g.position as [number, number, number]} rotation={g.rotation as [number, number, number]} castShadow>
                  <torusGeometry args={g.args as any} />
                  <meshStandardMaterial
                    color={accessory.color}
                    metalness={style.metalness}
                    roughness={style.roughness}
                  />
                </mesh>
              );
            }
            if (g.type === "planeGeometry") {
              return (
                <mesh key={idx} position={g.position as [number, number, number]} rotation={g.rotation as [number, number, number]} castShadow>
                  <planeGeometry args={g.args as any} />
                  <meshStandardMaterial
                    color={accessory.color}
                    metalness={style.metalness}
                    roughness={style.roughness}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              );
            }
            if (g.type === "boxGeometry") {
              return (
                <mesh key={idx} position={g.position as [number, number, number]} rotation={g.rotation as [number, number, number]} castShadow>
                  <boxGeometry args={g.args as any} />
                  <meshStandardMaterial
                    color={accessory.color}
                    metalness={style.metalness}
                    roughness={style.roughness}
                  />
                </mesh>
              );
            }
            if (g.type === "circleGeometry") {
              return (
                <mesh key={idx} position={g.position as [number, number, number]} rotation={g.rotation as [number, number, number]} castShadow>
                  <circleGeometry args={g.args as any} />
                  <meshStandardMaterial
                    color={accessory.color}
                    metalness={style.metalness}
                    roughness={style.roughness}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              );
            }
            if (g.type === "sphereGeometry") {
              return (
                <mesh key={idx} position={g.position as [number, number, number]} rotation={g.rotation as [number, number, number]} castShadow>
                  <sphereGeometry args={g.args as any} />
                  <meshStandardMaterial
                    color={accessory.color}
                    metalness={style.metalness}
                    roughness={style.roughness}
                  />
                </mesh>
              );
            }
            if (g.type === "cylinderGeometry") {
              return (
                <mesh key={idx} position={g.position as [number, number, number]} rotation={g.rotation as [number, number, number]} castShadow>
                  <cylinderGeometry args={g.args as any} />
                  <meshStandardMaterial
                    color={accessory.color}
                    metalness={style.metalness}
                    roughness={style.roughness}
                  />
                </mesh>
              );
            }
            if (g.type === "octahedronGeometry") {
              return (
                <mesh key={idx} position={g.position as [number, number, number]} rotation={g.rotation as [number, number, number]} castShadow>
                  <octahedronGeometry args={g.args as any} />
                  <meshStandardMaterial
                    color={accessory.color}
                    metalness={style.metalness}
                    roughness={style.roughness}
                  />
                </mesh>
              );
            }
            return null;
          })}
        </group>
      )}
    </>
  );
};

export default Head;
