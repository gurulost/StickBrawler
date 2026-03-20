import { useEffect } from "react";
import type { FC, ReactNode } from "react";
import * as THREE from "three";
import { useInkMaterial, useOutlineMaterial } from "./inkMaterial";

interface InkPartProps {
  baseColor: string;
  rimColor: string;
  renderGeometry: () => ReactNode;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  shadeBands?: number;
  glow?: number;
  opacity?: number;
  outlineColor?: string;
  outlineOpacity?: number;
  outlineScale?: number | [number, number, number];
  doubleSided?: boolean;
  castShadow?: boolean;
}

const toVec3 = (value?: number | [number, number, number]) => {
  if (Array.isArray(value)) return value;
  const scalar = value ?? 1;
  return [scalar, scalar, scalar] as [number, number, number];
};

const InkPart: FC<InkPartProps> = ({
  baseColor,
  rimColor,
  renderGeometry,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  shadeBands = 3,
  glow = 0,
  opacity = 1,
  outlineColor = "#050505",
  outlineOpacity,
  outlineScale = 1.04,
  doubleSided = false,
  castShadow = true,
}) => {
  const material = useInkMaterial({
    baseColor,
    rimColor,
    shadeBands,
    glow,
    opacity,
  });
  const outline = useOutlineMaterial(outlineColor, outlineOpacity ?? Math.min(0.95, opacity));
  const scaleVec = toVec3(scale);
  const outlineVec = toVec3(outlineScale);

  useEffect(() => {
    if (material instanceof THREE.ShaderMaterial || material instanceof THREE.MeshToonMaterial) {
      material.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
      material.needsUpdate = true;
    }
    outline.side = doubleSided ? THREE.DoubleSide : THREE.BackSide;
    outline.needsUpdate = true;
  }, [doubleSided, material, outline]);

  return (
    <group position={position} rotation={rotation} scale={scaleVec}>
      <mesh castShadow={castShadow} material={material}>
        {renderGeometry()}
      </mesh>
      <mesh castShadow={castShadow} material={outline} scale={outlineVec}>
        {renderGeometry()}
      </mesh>
    </group>
  );
};

export default InkPart;
