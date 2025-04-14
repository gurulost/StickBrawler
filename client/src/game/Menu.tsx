import { useState, useEffect, useRef } from "react";
import { useFighting } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";
import { CharacterCustomizer } from "../components/ui/character-customizer";

const Menu = () => {
  const { startGame } = useFighting();
  const { playBackgroundMusic, toggleMute, isMuted, setMasterVolume, masterVolume } = useAudio();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [titleGlow, setTitleGlow] = useState(false);
  
  // Refs for animation
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  // Animated title effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTitleGlow(prev => !prev);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Start background music when component mounts
  useEffect(() => {
    // Short delay to ensure audio is loaded
    const timer = setTimeout(() => {
      playBackgroundMusic();
      console.log("Background music started from menu");
    }, 800);
    
    return () => {
      clearTimeout(timer);
    };
  }, [playBackgroundMusic]);

  // Handle game start with animation
  const handleStartGame = () => {
    setIsAnimating(true);
    setTimeout(() => {
      startGame();
    }, 700);
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMasterVolume(newVolume);
  };
  
  return (
    <div 
      className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-500 via-indigo-600 to-purple-800 transition-opacity duration-700 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="text-center px-4 max-w-5xl mx-auto">
        {/* Title with glow animation */}
        <h1 
          ref={titleRef}
          className={`text-7xl font-bold mb-8 transition-all duration-1000 ${
            titleGlow 
              ? 'text-yellow-300 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]' 
              : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]'
          }`}
        >
          STICK FIGHTER
        </h1>
        
        <div className="relative w-72 h-72 mx-auto mb-10">
          {/* Animated fighting stick figures */}
          <div className="absolute left-6 top-4 animate-[bounce_1.8s_ease-in-out_infinite]">
            <div className="w-6 h-6 bg-blue-500 rounded-full shadow-lg"></div>
            <div className="w-2 h-28 bg-blue-500 mx-auto shadow-md"></div>
            <div className="flex justify-center">
              <div className="w-2 h-16 bg-blue-500 transform -rotate-45 origin-top shadow-md"></div>
              <div className="w-2 h-16 bg-blue-500 transform rotate-45 origin-top shadow-md"></div>
            </div>
            <div className="flex justify-center mt-2">
              <div className="w-2 h-20 bg-blue-500 transform -rotate-15 origin-top shadow-md"></div>
              <div className="w-2 h-20 bg-blue-500 transform rotate-15 origin-top shadow-md"></div>
            </div>
          </div>
          
          <div className="absolute right-6 top-4 animate-[bounce_2s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }}>
            <div className="w-6 h-6 bg-red-500 rounded-full shadow-lg"></div>
            <div className="w-2 h-28 bg-red-500 mx-auto shadow-md"></div>
            <div className="flex justify-center">
              <div className="w-2 h-16 bg-red-500 transform -rotate-135 origin-top shadow-md"></div>
              <div className="w-2 h-16 bg-red-500 transform rotate-135 origin-top shadow-md"></div>
            </div>
            <div className="flex justify-center mt-2">
              <div className="w-2 h-20 bg-red-500 transform rotate-15 origin-top shadow-md"></div>
              <div className="w-2 h-20 bg-red-500 transform -rotate-15 origin-top shadow-md"></div>
            </div>
          </div>
          
          {/* Visual fighting effect */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl text-yellow-300 animate-pulse">
            ⚡
          </div>
        </div>
        
        {/* Main buttons section */}
        <div className="space-y-8">
          <button 
            className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-bold py-4 px-16 rounded-full text-2xl transition-all hover:scale-105 hover:shadow-xl transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            onClick={handleStartGame}
          >
            PLAY GAME
          </button>
          
          <div className="flex flex-wrap justify-center gap-4 mt-6">
            <button 
              className="bg-gradient-to-r from-purple-600 to-purple-700 text-white font-bold py-3 px-6 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              onClick={() => setShowCustomizer(!showCustomizer)}
            >
              {showCustomizer ? "HIDE CUSTOMIZER" : "CUSTOMIZE CHARACTERS"}
            </button>
            
            <button 
              className="bg-gradient-to-r from-gray-700 to-gray-800 text-white font-bold py-3 px-6 rounded-full transition-all hover:shadow-lg transform hover:scale-105"
              onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            >
              {showAdvancedControls ? "HIDE CONTROLS" : "SHOW ALL CONTROLS"}
            </button>
          </div>
          
          {/* Audio controls */}
          <div className="flex items-center justify-center gap-4 bg-black bg-opacity-40 p-3 rounded-full mx-auto max-w-xs">
            <button 
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
            
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={handleVolumeChange}
              className="w-32"
            />
          </div>
          
          {/* Character Customization Panel */}
          {showCustomizer && (
            <div className="mt-8 max-w-4xl mx-auto bg-black bg-opacity-40 p-6 rounded-xl animate-fadeIn">
              <h2 className="text-2xl font-bold text-white mb-4">Customize Your Character</h2>
              <CharacterCustomizer />
            </div>
          )}
        </div>
        
        {/* Controls section - Basic or Advanced based on state */}
        <div className="mt-10 text-white">
          <h2 className="text-2xl font-bold mb-4">Game Controls</h2>
          
          {showAdvancedControls ? (
            // Advanced controls display with categories
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto text-left bg-black bg-opacity-40 p-6 rounded-xl animate-fadeIn">
              <div>
                <h3 className="text-xl font-semibold text-blue-300 mb-2">Movement</h3>
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-gray-300">Forward:</div><div>↑ (Up Arrow)</div>
                  <div className="text-gray-300">Backward:</div><div>↓ (Down Arrow)</div>
                  <div className="text-gray-300">Left/Right:</div><div>← → (Left/Right Arrows)</div>
                  <div className="text-gray-300">Jump:</div><div>W</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-blue-300 mb-2">Basic Combat</h3>
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-gray-300">Quick Attack:</div><div>J</div>
                  <div className="text-gray-300">Strong Attack:</div><div>K</div>
                  <div className="text-gray-300">Block:</div><div>L</div>
                  <div className="text-gray-300">Special Move:</div><div>Space</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-blue-300 mb-2">Advanced Techniques</h3>
                <div className="grid grid-cols-2 gap-1">
                  <div className="text-gray-300">Air Attack:</div><div>E (while jumping)</div>
                  <div className="text-gray-300">Dodge:</div><div>Shift</div>
                  <div className="text-gray-300">Grab:</div><div>G</div>
                  <div className="text-gray-300">Taunt:</div><div>T</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold text-blue-300 mb-2">Tips</h3>
                <ul className="list-disc list-inside text-sm">
                  <li>Use platforms to gain height advantage</li>
                  <li>Combine attacks for more damage</li>
                  <li>Block to reduce incoming damage</li>
                  <li>Press Down + W to drop through platforms</li>
                  <li>Use air attacks to surprise your opponent</li>
                </ul>
              </div>
            </div>
          ) : (
            // Basic controls display
            <div className="grid grid-cols-2 gap-2 max-w-md mx-auto text-left bg-black bg-opacity-40 p-4 rounded-lg">
              <div className="text-gray-300">Move:</div><div>Arrow Keys</div>
              <div className="text-gray-300">Jump:</div><div>W</div>
              <div className="text-gray-300">Attack:</div><div>J / K</div>
              <div className="text-gray-300">Block:</div><div>L</div>
              <div className="text-gray-300">Special:</div><div>Space</div>
            </div>
          )}
        </div>
        
        {/* Version and credits */}
        <div className="mt-8 text-gray-300 text-sm">
          Version 1.0 | Stick Fighter © 2025
        </div>
      </div>
    </div>
  );
};

export default Menu;
