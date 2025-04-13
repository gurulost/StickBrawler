import { useTexture } from "@react-three/drei";
import { ARENA_WIDTH, FLOOR_Y, PLATFORMS, ARENA_DEPTH } from "./Physics";
import * as THREE from "three";

const Arena = () => {
  // Load the grass texture for the ground with enhanced repetition
  const grassTexture = useTexture("/textures/grass.png");
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(8, 8); // More detailed texture repetition for larger arena
  
  // Load the sky texture for the background
  const skyTexture = useTexture("/textures/sky.png");
  
  // Calculate enhanced dimensions for the bigger arena
  const wallHeight = ARENA_WIDTH / 3;
  const decorationCount = Math.floor(ARENA_WIDTH / 3);
  
  // Platform texture for some visual variety
  const platformTexture = useTexture("/textures/wood.jpg");
  platformTexture.wrapS = platformTexture.wrapT = THREE.RepeatWrapping;
  platformTexture.repeat.set(2, 2);
  
  return (
    <group>
      {/* Ground plane - much larger for expanded arena with lighter color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[ARENA_WIDTH, ARENA_DEPTH]} />
        <meshStandardMaterial map={grassTexture} color="#A8E4A0" /> {/* Lighter green color */}
      </mesh>
      
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
              <meshStandardMaterial map={platformTexture} color="#A97C50" />
            </mesh>
            
            {/* Support columns for platforms */}
            <mesh 
              position={[platform.x1 + 0.5, platform.y/2, platform.z1 + 0.5]} 
              castShadow
            >
              <boxGeometry args={[0.5, platform.y, 0.5]} />
              <meshStandardMaterial color="#8B4513" />
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
        <meshBasicMaterial map={skyTexture} />
      </mesh>
      
      {/* Left boundary - taller and more detailed */}
      <mesh position={[-ARENA_WIDTH/2, wallHeight/2, 0]} castShadow>
        <boxGeometry args={[1.2, wallHeight, ARENA_WIDTH/2]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      
      {/* Right boundary - taller and more detailed */}
      <mesh position={[ARENA_WIDTH/2, wallHeight/2, 0]} castShadow>
        <boxGeometry args={[1.2, wallHeight, ARENA_WIDTH/2]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      
      {/* Decorative elements along the edges */}
      {Array.from({ length: decorationCount }).map((_, i) => (
        <group key={`decor-left-${i}`} position={[-ARENA_WIDTH/2 + 0.5, 0.5, -ARENA_WIDTH/4 + (i * ARENA_WIDTH/decorationCount)]}>
          {/* Trees or rocks along the boundaries */}
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.4, 1.5, 8]} />
            <meshStandardMaterial color="#0D5A13" />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <coneGeometry args={[1.2, 3, 8]} />
            <meshStandardMaterial color="#2D7D32" />
          </mesh>
        </group>
      ))}
      
      {Array.from({ length: decorationCount }).map((_, i) => (
        <group key={`decor-right-${i}`} position={[ARENA_WIDTH/2 - 0.5, 0.5, -ARENA_WIDTH/4 + (i * ARENA_WIDTH/decorationCount)]}>
          {/* Trees or rocks along the boundaries */}
          <mesh position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.4, 1.5, 8]} />
            <meshStandardMaterial color="#0D5A13" />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <coneGeometry args={[1.2, 3, 8]} />
            <meshStandardMaterial color="#2D7D32" />
          </mesh>
        </group>
      ))}
      
      {/* Enhanced lighting setup for the larger arena */}
      <ambientLight intensity={0.7} />
      <directionalLight 
        intensity={0.9} 
        position={[ARENA_WIDTH/2, ARENA_WIDTH/2, ARENA_WIDTH/2]} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-camera-left={-ARENA_WIDTH/2}
        shadow-camera-right={ARENA_WIDTH/2}
        shadow-camera-top={ARENA_WIDTH/2}
        shadow-camera-bottom={-ARENA_WIDTH/2}
      />
      
      {/* Secondary lighting for better atmosphere */}
      <pointLight 
        intensity={0.6} 
        position={[-ARENA_WIDTH/3, ARENA_WIDTH/4, ARENA_WIDTH/4]} 
        color="#FFA726" 
      />
    </group>
  );
};

export default Arena;
