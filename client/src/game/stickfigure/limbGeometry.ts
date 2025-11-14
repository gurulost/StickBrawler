import * as THREE from "three";

export interface LimbProfile {
  length: number;
  baseRadius: number;
  midRadius?: number;
  tipRadius?: number;
  curvature?: number;
  segments?: number;
}

export function createTaperedLimbGeometry(options: LimbProfile) {
  const { length, baseRadius, midRadius = baseRadius * 0.85, tipRadius = baseRadius * 0.6, curvature = 0, segments = 32 } =
    options;
  const half = length / 2;

  const profile = [
    new THREE.Vector3(0, -half, 0),
    new THREE.Vector3(0, -half * 0.45, curvature * 0.1),
    new THREE.Vector3(0, half * 0.35, curvature * -0.05),
    new THREE.Vector3(0, half, curvature * -0.15),
  ];

  const radii = [baseRadius, midRadius, midRadius * 0.9, tipRadius];
  const curve = new THREE.CatmullRomCurve3(profile);
  const frames = curve.computeFrenetFrames(segments, false);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = curve.getPoint(t);
    const radius = radii[0] * (1 - t) + radii[radii.length - 1] * t;
    const normal = frames.normals[i % frames.normals.length];
    const binormal = frames.binormals[i % frames.binormals.length];
    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);
      const pos = new THREE.Vector3()
        .copy(point)
        .add(normal.clone().multiplyScalar(cos * radius))
        .add(binormal.clone().multiplyScalar(sin * radius));
      positions.push(pos.x, pos.y, pos.z);
      normals.push(normal.x * cos + binormal.x * sin, normal.y * cos + binormal.y * sin, normal.z * cos + binormal.z * sin);
      uvs.push(j / segments, t);
    }
  }

  for (let y = 0; y < segments; y++) {
    for (let x = 0; x < segments; x++) {
      const a = y * (segments + 1) + x;
      const b = y * (segments + 1) + x + 1;
      const c = (y + 1) * (segments + 1) + x;
      const d = (y + 1) * (segments + 1) + x + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
