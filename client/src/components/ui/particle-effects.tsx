import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Particle effect component for character themes
export const ParticleEffect = ({ 
  theme, 
  count = 50, 
  position = [0, 0, 0],
  intensity = 1.0 
}: {
  theme: string;
  count?: number;
  position?: [number, number, number];
  intensity?: number;
}) => {
  const meshRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Position
      positions[i3] = (Math.random() - 0.5) * 4;
      positions[i3 + 1] = Math.random() * 3;
      positions[i3 + 2] = (Math.random() - 0.5) * 4;
      
      // Velocity
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = Math.random() * 0.01 + 0.005;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
      
      // Size
      sizes[i] = Math.random() * 0.05 + 0.02;
      
      // Colors based on theme
      let color = new THREE.Color();
      switch (theme) {
        case 'fire':
          color = new THREE.Color().setHSL(Math.random() * 0.1, 0.8, 0.6);
          break;
        case 'water':
          color = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.7, 0.6);
          break;
        case 'nature':
          color = new THREE.Color().setHSL(0.3 + Math.random() * 0.2, 0.8, 0.5);
          break;
        case 'magic':
          color = new THREE.Color().setHSL(0.75 + Math.random() * 0.15, 0.9, 0.7);
          break;
        case 'solar':
          color = new THREE.Color().setHSL(0.15 + Math.random() * 0.1, 0.9, 0.7);
          break;
        case 'sakura':
          color = new THREE.Color().setHSL(0.9 + Math.random() * 0.1, 0.6, 0.8);
          break;
        case 'shadow':
          color = new THREE.Color().setHSL(0, 0, Math.random() * 0.3);
          break;
        case 'light':
          color = new THREE.Color().setHSL(0, 0, 0.8 + Math.random() * 0.2);
          break;
        case 'rainbow':
          color = new THREE.Color().setHSL(Math.random(), 0.8, 0.6);
          break;
        case 'cyber':
          color = new THREE.Color().setHSL(0.5 + Math.random() * 0.2, 1, 0.5);
          break;
        default:
          color = new THREE.Color().setHSL(Math.random(), 0.5, 0.5);
      }
      
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    
    return { positions, colors, sizes, velocities };
  }, [count, theme]);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const colors = meshRef.current.geometry.attributes.color.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      // Update positions
      positions[i3] += particles.velocities[i3];
      positions[i3 + 1] += particles.velocities[i3 + 1];
      positions[i3 + 2] += particles.velocities[i3 + 2];
      
      // Reset particles that go too high
      if (positions[i3 + 1] > 4) {
        positions[i3 + 1] = 0;
        positions[i3] = (Math.random() - 0.5) * 4;
        positions[i3 + 2] = (Math.random() - 0.5) * 4;
      }
      
      // Add some animation effects based on theme
      const time = state.clock.elapsedTime;
      if (theme === 'fire') {
        colors[i3] = Math.sin(time * 3 + i * 0.1) * 0.3 + 0.7;
        colors[i3 + 1] = Math.sin(time * 2 + i * 0.1) * 0.2 + 0.3;
      } else if (theme === 'magic') {
        const pulse = Math.sin(time * 4 + i * 0.2) * 0.5 + 0.5;
        colors[i3] = pulse * 0.8;
        colors[i3 + 1] = pulse * 0.6;
        colors[i3 + 2] = pulse;
      }
    }
    
    meshRef.current.geometry.attributes.position.needsUpdate = true;
    meshRef.current.geometry.attributes.color.needsUpdate = true;
  });
  
  return (
    <points ref={meshRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={particles.positions}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          array={particles.colors}
          count={count}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          array={particles.sizes}
          count={count}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8 * intensity}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Aura effect component
export const AuraEffect = ({ 
  color, 
  intensity = 1.0, 
  radius = 1.5,
  position = [0, 1, 0] 
}: {
  color: string;
  intensity?: number;
  radius?: number;
  position?: [number, number, number];
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    const material = meshRef.current.material as THREE.MeshBasicMaterial;
    
    // Pulsing effect
    const pulse = Math.sin(time * 2) * 0.3 + 0.7;
    material.opacity = pulse * intensity * 0.3;
    
    // Rotation
    meshRef.current.rotation.y = time * 0.5;
  });
  
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.2 * intensity}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// Energy trail effect
export const EnergyTrail = ({
  start = [0, 0, 0],
  end = [0, 2, 0],
  color = '#ffffff',
  segments = 20
}: {
  start?: [number, number, number];
  end?: [number, number, number];
  color?: string;
  segments?: number;
}) => {
  const lineRef = useRef<THREE.Line>(null);
  
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = start[0] + (end[0] - start[0]) * t;
      const y = start[1] + (end[1] - start[1]) * t;
      const z = start[2] + (end[2] - start[2]) * t;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, [start, end, segments]);
  
  useFrame((state) => {
    if (!lineRef.current) return;
    
    const time = state.clock.elapsedTime;
    const material = lineRef.current.material as THREE.LineBasicMaterial;
    
    // Animated opacity
    material.opacity = Math.sin(time * 3) * 0.3 + 0.7;
  });
  
  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
          count={points.length}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.8}
        linewidth={3}
      />
    </line>
  );
};

// Floating runes effect
export const FloatingRunes = ({
  count = 8,
  radius = 2,
  position = [0, 1, 0]
}: {
  count?: number;
  radius?: number;
  position?: [number, number, number];
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    groupRef.current.rotation.y = time * 0.3;
    
    // Animate individual runes
    groupRef.current.children.forEach((child, index) => {
      child.rotation.z = time * 0.5 + index;
      child.position.y = Math.sin(time * 2 + index) * 0.2;
    });
  });
  
  const runes = useMemo(() => {
    const runeArray = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      runeArray.push({ x, z, rotation: angle });
    }
    return runeArray;
  }, [count, radius]);
  
  return (
    <group ref={groupRef} position={position}>
      {runes.map((rune, index) => (
        <mesh key={index} position={[rune.x, 0, rune.z]}>
          <ringGeometry args={[0.1, 0.15, 6]} />
          <meshBasicMaterial
            color="#aa88ff"
            transparent
            opacity={0.6}
            emissive="#4444aa"
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
};