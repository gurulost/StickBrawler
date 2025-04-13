import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { KeyboardControls } from "@react-three/drei";
import { useAudio } from "./lib/stores/useAudio";
import "@fontsource/inter";
import { Controls } from "./lib/stores/useControls";
import GameManager from "./game/GameManager";
import Menu from "./game/Menu";
import UI from "./game/UI";
import { useFighting } from "./lib/stores/useFighting";

// Define control keys for the game - Super Smash Bros style controls
const keyboardMap = [
  // Movement
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  
  // Basic attacks
  { name: Controls.punch, keys: ["KeyJ"] },
  { name: Controls.kick, keys: ["KeyK"] },
  { name: Controls.block, keys: ["KeyL"] },
  { name: Controls.special, keys: ["Space"] },
  
  // Advanced moves (Super Smash Bros style)
  { name: Controls.dodge, keys: ["ShiftLeft", "ShiftRight"] },
  { name: Controls.airAttack, keys: ["KeyI"] },  // Air attack (while jumping)
  { name: Controls.grab, keys: ["KeyG"] },       // Grab opponent 
  { name: Controls.taunt, keys: ["KeyT"] },      // Taunt move
];

// Log the key mapping configuration to help with debugging
console.log("Keyboard controls configuration:", keyboardMap);

// Main App component
function App() {
  const { gamePhase } = useFighting();
  const [showCanvas, setShowCanvas] = useState(false);
  const { setBackgroundMusic, setHitSound, setSuccessSound } = useAudio();

  // Initialize audio elements
  useEffect(() => {
    // Load sound effects
    const backgroundMusic = new Audio("/sounds/background.mp3");
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.4;
    setBackgroundMusic(backgroundMusic);

    const hitSound = new Audio("/sounds/hit.mp3");
    hitSound.volume = 0.5;
    setHitSound(hitSound);

    const successSound = new Audio("/sounds/success.mp3");
    successSound.volume = 0.6;
    setSuccessSound(successSound);

    // Show the canvas once everything is loaded
    setShowCanvas(true);
  }, [setBackgroundMusic, setHitSound, setSuccessSound]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showCanvas && (
        <KeyboardControls map={keyboardMap}>
          {gamePhase === 'menu' && <Menu />}

          {(gamePhase === 'fighting' || gamePhase === 'round_end' || gamePhase === 'match_end') && (
            <>
              <Canvas
                shadows
                camera={{
                  position: [0, 10, 20], // Higher and further back position for larger arena view
                  fov: 60,               // Wider field of view
                  near: 0.1,
                  far: 1000              // Increased far plane for larger environment
                }}
                gl={{
                  antialias: true,      // Better graphics quality
                  alpha: true,          // Transparent background
                  powerPreference: "high-performance" // Better performance for enhanced graphics
                }}
              >
                <fog attach="fog" color="#E6F0FF" near={30} far={60} /> {/* Atmospheric fog effect */}
                <color attach="background" args={["#87CEEB"]} />

                {/* Game Manager handles all game elements */}
                <Suspense fallback={null}>
                  <GameManager />
                </Suspense>
              </Canvas>

              {/* UI is rendered outside of Canvas as an HTML overlay */}
              <UI />
            </>
          )}
        </KeyboardControls>
      )}
    </div>
  );
}

export default App;
