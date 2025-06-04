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
          {accessory.geometry.type === "cone" && (
            <mesh position={accessory.geometry.position} castShadow>
              <coneGeometry args={accessory.geometry.args} />
              <meshStandardMaterial
                color={accessory.color}
                metalness={style.metalness}
                roughness={style.roughness}
              />
            </mesh>
          )}
          {accessory.geometry.type === "torusGeometry" && (
            <mesh
              position={accessory.geometry.position}
              rotation={accessory.geometry.rotation}
              castShadow
            >
              <torusGeometry args={accessory.geometry.args} />
              <meshStandardMaterial
                color={accessory.color}
                metalness={style.metalness}
                roughness={style.roughness}
              />
            </mesh>
          )}
          {accessory.geometry.type === "planeGeometry" && (
            <mesh
              position={accessory.geometry.position}
              rotation={accessory.geometry.rotation}
              castShadow
            >
              <planeGeometry args={accessory.geometry.args} />
              <meshStandardMaterial
                color={accessory.color}
                metalness={style.metalness}
                roughness={style.roughness}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          {accessory.geometry.type === "boxGeometry" && (
            <mesh
              position={accessory.geometry.position}
              rotation={accessory.geometry.rotation}
              castShadow
            >
              <boxGeometry args={accessory.geometry.args} />
              <meshStandardMaterial
                color={accessory.color}
                metalness={style.metalness}
                roughness={style.roughness}
              />
            </mesh>
          )}
          {accessory.geometry.type === "circleGeometry" && (
            <mesh
              position={accessory.geometry.position}
              rotation={accessory.geometry.rotation}
              castShadow
            >
              <circleGeometry args={accessory.geometry.args} />
              <meshStandardMaterial
                color={accessory.color}
                metalness={style.metalness}
                roughness={style.roughness}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      )}
    </>
  );
};

export default Head;
