import { useTexture } from "@react-three/drei";
import { ARENA_WIDTH, FLOOR_Y } from "./Physics";

const Arena = () => {
  // Load the grass texture for the ground
  const grassTexture = useTexture("/textures/grass.png");
  grassTexture.wrapS = grassTexture.wrapT = 1000; // Repeat texture
  
  // Load the sky texture for the background
  const skyTexture = useTexture("/textures/sky.png");
  
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]}>
        <planeGeometry args={[ARENA_WIDTH, ARENA_WIDTH]} />
        <meshStandardMaterial map={grassTexture} />
      </mesh>
      
      {/* Background sky */}
      <mesh position={[0, ARENA_WIDTH/2, -ARENA_WIDTH/2]}>
        <planeGeometry args={[ARENA_WIDTH * 2, ARENA_WIDTH]} />
        <meshBasicMaterial map={skyTexture} />
      </mesh>
      
      {/* Left boundary */}
      <mesh position={[-ARENA_WIDTH/2, ARENA_WIDTH/4, 0]}>
        <boxGeometry args={[0.5, ARENA_WIDTH/2, ARENA_WIDTH/2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Right boundary */}
      <mesh position={[ARENA_WIDTH/2, ARENA_WIDTH/4, 0]}>
        <boxGeometry args={[0.5, ARENA_WIDTH/2, ARENA_WIDTH/2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Basic lighting setup */}
      <ambientLight intensity={0.6} />
      <directionalLight 
        intensity={0.8} 
        position={[10, 10, 10]} 
        castShadow 
        shadow-mapSize={[1024, 1024]} 
      />
    </group>
  );
};

export default Arena;
