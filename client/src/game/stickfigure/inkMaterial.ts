import { useMemo, useEffect } from "react";
import * as THREE from "three";

interface InkParams {
  baseColor: string;
  rimColor: string;
  shadeBands?: number;
  lightDirection?: [number, number, number];
  opacity?: number;
  glow?: number;
}

const vertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vViewDir = normalize(-mvPosition.xyz);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uBaseColor;
uniform vec3 uRimColor;
uniform vec3 uLightDir;
uniform float uShadeBands;
uniform float uGlow;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vWorldPos;

void main() {
  vec3 normal = normalize(vNormal);
  float light = max(dot(normalize(uLightDir), normal), 0.0);
  float band = floor(light * uShadeBands) / uShadeBands;
  float rim = pow(1.0 - max(dot(normalize(vViewDir), normal), 0.0), 2.2);
  vec3 color = uBaseColor * (0.35 + 0.65 * band) + uRimColor * rim + uBaseColor * uGlow;
  gl_FragColor = vec4(color, uOpacity);
}
`;

export function useInkMaterial({
  baseColor,
  rimColor,
  shadeBands = 3,
  lightDirection = [0.35, 1.0, 0.2],
  opacity = 1,
  glow = 0,
}: InkParams) {
  const lightKey = lightDirection.join(",");
  const material = useMemo(() => {
    const shader = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uBaseColor: { value: new THREE.Color(baseColor) },
        uRimColor: { value: new THREE.Color(rimColor) },
        uLightDir: { value: new THREE.Vector3().fromArray(lightDirection).normalize() },
        uShadeBands: { value: shadeBands },
        uGlow: { value: glow },
        uOpacity: { value: opacity },
      },
      transparent: opacity < 1,
    });
    shader.depthWrite = true;
    shader.side = THREE.FrontSide;
    return shader;
  }, [baseColor, rimColor, shadeBands, lightKey, opacity]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    material.uniforms.uGlow.value = glow;
  }, [material, glow]);

  useEffect(() => {
    material.uniforms.uBaseColor.value.set(baseColor);
  }, [material, baseColor]);

  useEffect(() => {
    material.uniforms.uRimColor.value.set(rimColor);
  }, [material, rimColor]);

  return material;
}

export function useOutlineMaterial(color = "#050505", opacity = 0.85) {
  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
      transparent: true,
      opacity,
      depthWrite: false,
    });
  }, [color, opacity]);

  useEffect(() => () => material.dispose(), [material]);

  return material;
}
