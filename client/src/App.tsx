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

// Define control keys for the game
const keyboardMap = [
  { name: Controls.forward, keys: ["KeyW", "ArrowUp"] },
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },
  { name: Controls.punch, keys: ["KeyJ"] },
  { name: Controls.kick, keys: ["KeyK"] },
  { name: Controls.block, keys: ["KeyL"] },
  { name: Controls.special, keys: ["Space"] },
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
                  position: [0, 2, 8],
                  fov: 45,
                  near: 0.1,
                  far: 1000
                }}
                gl={{
                  antialias: true,
                  powerPreference: "default"
                }}
              >
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
