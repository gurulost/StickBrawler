import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { useAudio } from "./lib/stores/useAudio";
import { useAuth } from "./lib/stores/useAuth";
import "@fontsource/inter";
import GameManager from "./game/GameManager";
import Menu from "./game/Menu";
import Lobby from "./game/Lobby";
import UI from "./game/UI";
import { useFighting } from "./lib/stores/useFighting";
import { useEconomySync } from "./hooks/use-economy-sync";

// Main App component
function App() {
  const { gamePhase } = useFighting();
  const { fetchMe } = useAuth();
  useEconomySync();
  const [showCanvas, setShowCanvas] = useState(false);
  
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);
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
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {showCanvas && (
        <>
          {gamePhase === 'menu' && <Menu />}
          {gamePhase === 'lobby' && <Lobby />}

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
        </>
      )}
    </div>
  );
}

export default App;
