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

// Define control keys for the game - Updated control scheme
const keyboardMap = [
  // Movement controls (WASD core movement + Arrow keys)
  { name: Controls.jump, keys: ["KeyW"] },                        // W for jump
  { name: Controls.forward, keys: ["ArrowUp"] },                  // Up Arrow for forward
  { name: Controls.backward, keys: ["KeyS", "ArrowDown"] },       // S or Down Arrow for backward
  { name: Controls.leftward, keys: ["KeyA", "ArrowLeft"] },       // A or Left Arrow for left
  { name: Controls.rightward, keys: ["KeyD", "ArrowRight"] },     // D or Right Arrow for right
  
  // Combat controls (separated and logical)
  { name: Controls.attack1, keys: ["KeyJ"] },          // J for quick attack
  { name: Controls.attack2, keys: ["KeyK"] },          // K for strong attack
  { name: Controls.shield, keys: ["KeyL"] },           // L for shield/block
  { name: Controls.special, keys: ["Space"] },         // Space for special move
  
  // Advanced techniques
  { name: Controls.dodge, keys: ["ShiftLeft", "ShiftRight"] }, // Shift for dodge
  { name: Controls.airAttack, keys: ["KeyE"] },        // E for air attack
  { name: Controls.grab, keys: ["KeyG"] },             // G for grab
  { name: Controls.taunt, keys: ["KeyT"] },            // T for taunt
];

// Log the key mapping configuration to help with debugging
console.log("Keyboard controls configuration:", keyboardMap);

// Main App component
function App() {
  const { gamePhase } = useFighting();
  const [showCanvas, setShowCanvas] = useState(false);
  const { 
    setBackgroundMusic, 
    setHitSound, 
    setSuccessSound, 
    setPunchSound,
    setKickSound,
    setSpecialSound,
    setBlockSound,
    setJumpSound,
    setLandSound,
    setDodgeSound,
    setGrabSound,
    setThrowSound,
    setTauntSound,
    playBackgroundMusic
  } = useAudio();

  // Initialize audio elements
  useEffect(() => {
    // Load sound effects with error handling
    const loadAudio = (path: string, volume: number = 0.5) => {
      try {
        const audio = new Audio(path);
        audio.volume = volume;
        return audio;
      } catch (error) {
        console.error(`Failed to load audio: ${path}`, error);
        // Return a silent audio as fallback
        return new Audio();
      }
    };

    // Background music
    const backgroundMusic = loadAudio("/sounds/background.mp3", 0.4);
    backgroundMusic.loop = true;
    setBackgroundMusic(backgroundMusic);

    // Combat sounds
    setHitSound(loadAudio("/sounds/hit.mp3", 0.5));
    setSuccessSound(loadAudio("/sounds/success.mp3", 0.6));
    setPunchSound(loadAudio("/sounds/punch.mp3", 0.5));
    setKickSound(loadAudio("/sounds/kick.mp3", 0.55));
    setSpecialSound(loadAudio("/sounds/special.mp3", 0.6));
    
    // Defensive sounds
    setBlockSound(loadAudio("/sounds/block.mp3", 0.45));
    setDodgeSound(loadAudio("/sounds/dodge.mp3", 0.4));
    
    // Movement sounds
    setJumpSound(loadAudio("/sounds/jump.mp3", 0.4));
    setLandSound(loadAudio("/sounds/land.mp3", 0.4));
    
    // Advanced technique sounds
    setGrabSound(loadAudio("/sounds/grab.mp3", 0.5));
    setThrowSound(loadAudio("/sounds/throw.mp3", 0.55));
    setTauntSound(loadAudio("/sounds/taunt.mp3", 0.5));

    // Start playing background music
    setTimeout(() => {
      playBackgroundMusic();
      console.log("Background music started");
    }, 1000);

    // Show the canvas once everything is loaded
    setShowCanvas(true);
  }, [
    setBackgroundMusic, setHitSound, setSuccessSound, 
    setPunchSound, setKickSound, setSpecialSound, 
    setBlockSound, setJumpSound, setLandSound, 
    setDodgeSound, setGrabSound, setThrowSound, 
    setTauntSound, playBackgroundMusic
  ]);

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
                  position: [0, 12, 24], // Even higher and further back for better view of expanded arena
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
