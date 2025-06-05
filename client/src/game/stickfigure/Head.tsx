import { colorThemes, figureStyles, accessories } from "../../lib/stores/useCustomization";
import type { FC } from "react";
import * as THREE from "three";

export type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
export type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];
export type AccessoryValues = (typeof accessories)[keyof typeof accessories] & { color: string };

interface HeadProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
  accessory: AccessoryValues;
  isAttacking: boolean;
}

const Head: FC<HeadProps> = ({ colors, style, accessory, isAttacking }) => {
  return (
    <>
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[style.headSize, 24, 24]} />
        <meshStandardMaterial
          color={colors.primary}
          emissive={isAttacking ? colors.emissive : "#000000"}
          emissiveIntensity={isAttacking ? 0.5 : 0}
          metalness={style.metalness}
          roughness={style.roughness}
        />
      </mesh>

      {accessory.geometry && (
        <group position={[0, 1.8 + style.headSize * 0.5, 0]}>
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
