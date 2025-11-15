import { useEffect, useMemo } from "react";
import { ARENA_WIDTH, FLOOR_Y, PLATFORMS, ARENA_DEPTH } from "./Physics";
import * as THREE from "three";

const createGradientTexture = (top: string, bottom: string) => {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

const Arena = () => {
  const gradientTexture = useMemo(
    () => createGradientTexture("#fef6fb", "#f0f7ff"),
    [],
  );
  const skylineTexture = useMemo(
    () => createGradientTexture("#d2efff", "#fef6ff"),
    [],
  );
  useEffect(() => {
    return () => {
      gradientTexture?.dispose();
      skylineTexture?.dispose();
    };
  }, [gradientTexture, skylineTexture]);
  
  // Calculate enhanced dimensions for the bigger arena
  const wallHeight = ARENA_WIDTH / 3;
  const decorationCount = Math.floor(ARENA_WIDTH / 3);
  
  const gridHelper = useMemo(() => {
    const helper = new THREE.GridHelper(ARENA_WIDTH, 30, "#f9a8d4", "#bae6fd");
    (helper.material as THREE.Material).transparent = true;
    (helper.material as THREE.Material).opacity = 0.35;
    helper.position.y = FLOOR_Y + 0.01;
    return helper;
  }, []);
  useEffect(() => {
    return () => {
      gridHelper.geometry.dispose();
    };
  }, [gridHelper]);
  
  return (
    <group>
      {/* Ground plane - much larger for expanded arena with cool tan color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[ARENA_WIDTH, ARENA_DEPTH]} />
        <meshStandardMaterial
          map={gradientTexture ?? undefined}
          color="#fff9f2"
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>
      {gridHelper && <primitive object={gridHelper} />}
      
      {/* Platforms for multi-level combat */}
      {PLATFORMS.map((platform, index) => {
        // Calculate dimensions and center position
        const width = platform.x2 - platform.x1;
        const depth = platform.z2 - platform.z1;
        const centerX = (platform.x1 + platform.x2) / 2;
        const centerZ = (platform.z1 + platform.z2) / 2;
        
        return (
          <group key={`platform-${index}`}>
            {/* Platform surface */}
            <mesh 
              position={[centerX, platform.y, centerZ]} 
              castShadow 
              receiveShadow
            >
              <boxGeometry args={[width, 0.3, depth]} />
              <meshStandardMaterial color="#fee2f8" roughness={0.4} />
            </mesh>
            
            {/* Support columns for platforms */}
            <mesh 
              position={[platform.x1 + 0.5, platform.y/2, platform.z1 + 0.5]} 
              castShadow
            >
              <boxGeometry args={[0.5, platform.y, 0.5]} />
              <meshStandardMaterial color="#f0abfc" />
            </mesh>
            
            <mesh 
              position={[platform.x2 - 0.5, platform.y/2, platform.z1 + 0.5]} 
              castShadow
            >
              <boxGeometry args={[0.5, platform.y, 0.5]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            
            <mesh 
              position={[platform.x1 + 0.5, platform.y/2, platform.z2 - 0.5]} 
              castShadow
            >
              <boxGeometry args={[0.5, platform.y, 0.5]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            
            <mesh 
              position={[platform.x2 - 0.5, platform.y/2, platform.z2 - 0.5]} 
              castShadow
            >
              <boxGeometry args={[0.5, platform.y, 0.5]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          </group>
        );
      })}
      
      {/* Enhanced background sky - larger and higher quality */}
      <mesh position={[0, ARENA_WIDTH/2, -ARENA_WIDTH/2]}>
        <planeGeometry args={[ARENA_WIDTH * 3, ARENA_WIDTH * 1.5]} />
        <meshBasicMaterial map={skylineTexture ?? undefined} color="#e0f2ff" />
      </mesh>
      
      {/* Left boundary - taller and more detailed */}
      <mesh position={[-ARENA_WIDTH/2, wallHeight/2, 0]} castShadow>
        <boxGeometry args={[1.2, wallHeight, ARENA_WIDTH/2]} />
        <meshStandardMaterial color="#fde68a" roughness={0.4} />
      </mesh>
      
      {/* Right boundary - taller and more detailed */}
      <mesh position={[ARENA_WIDTH/2, wallHeight/2, 0]} castShadow>
        <boxGeometry args={[1.2, wallHeight, ARENA_WIDTH/2]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      
      {/* Decorative elements along the edges */}
      {Array.from({ length: decorationCount }).map((_, i) => (
        <group
          key={`decor-arch-${i}`}
          position={[
            -ARENA_WIDTH / 2 + 0.5,
            0,
            -ARENA_WIDTH / 4 + (i * ARENA_WIDTH) / decorationCount,
          ]}
        >
          <mesh castShadow position={[0, 2, 0]}>
            <torusGeometry args={[1, 0.08, 16, 64, Math.PI]} />
            <meshStandardMaterial emissive="#f0abfc" color="#fef3ff" />
          </mesh>
          <mesh castShadow position={[ARENA_WIDTH - 1, 2, 0]}>
            <torusGeometry args={[1, 0.08, 16, 64, Math.PI]} />
            <meshStandardMaterial emissive="#bae6fd" color="#ecfeff" />
          </mesh>
        </group>
      ))}
      
      {/* Enhanced lighting setup for the larger arena */}
      <hemisphereLight skyColor="#f5f3ff" groundColor="#f0fdf4" intensity={0.8} />
      <directionalLight 
        intensity={0.75} 
        position={[ARENA_WIDTH/2, ARENA_WIDTH/1.8, ARENA_WIDTH/2]} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-camera-left={-ARENA_WIDTH/2}
        shadow-camera-right={ARENA_WIDTH/2}
        shadow-camera-top={ARENA_WIDTH/2}
        shadow-camera-bottom={-ARENA_WIDTH/2}
      />
      
      {/* Secondary lighting for better atmosphere */}
      <pointLight 
        intensity={0.7} 
        position={[-ARENA_WIDTH/3, ARENA_WIDTH/5, ARENA_WIDTH/4]} 
        color="#fcd34d" 
      />
      <pointLight 
        intensity={0.5}
        position={[ARENA_WIDTH/4, ARENA_WIDTH/3, -ARENA_WIDTH/4]}
        color="#c4b5fd"
      />
    </group>
  );
};

export default Arena;
