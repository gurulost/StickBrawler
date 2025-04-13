import { useState, useEffect } from "react";
import { useFighting } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";

const Menu = () => {
  const { startGame } = useFighting();
  const { backgroundMusic, toggleMute, isMuted } = useAudio();
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Start background music when component mounts
  useEffect(() => {
    if (backgroundMusic) {
      backgroundMusic.play().catch(e => {
        console.log("Music autoplay prevented:", e);
      });
    }
    
    return () => {
      if (backgroundMusic) {
        backgroundMusic.pause();
      }
    };
  }, [backgroundMusic]);

  // Handle game start with animation
  const handleStartGame = () => {
    setIsAnimating(true);
    setTimeout(() => {
      startGame();
    }, 500);
  };
  
  return (
    <div 
      className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-400 to-purple-700 transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-6 drop-shadow-lg">
          STICK FIGHTER
        </h1>
        
        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* Simple animated stick figures */}
          <div className="absolute left-4 top-0 animate-[bounce_2s_ease-in-out_infinite]">
            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
            <div className="w-1 h-24 bg-blue-500 mx-auto"></div>
            <div className="flex justify-center">
              <div className="w-1 h-16 bg-blue-500 transform -rotate-45 origin-top"></div>
              <div className="w-1 h-16 bg-blue-500 transform rotate-45 origin-top"></div>
            </div>
            <div className="flex justify-center mt-2">
              <div className="w-1 h-20 bg-blue-500 transform -rotate-15 origin-top"></div>
              <div className="w-1 h-20 bg-blue-500 transform rotate-15 origin-top"></div>
            </div>
          </div>
          
          <div className="absolute right-4 top-0 animate-[bounce_2s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }}>
            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
            <div className="w-1 h-24 bg-red-500 mx-auto"></div>
            <div className="flex justify-center">
              <div className="w-1 h-16 bg-red-500 transform -rotate-45 origin-top"></div>
              <div className="w-1 h-16 bg-red-500 transform rotate-45 origin-top"></div>
            </div>
            <div className="flex justify-center mt-2">
              <div className="w-1 h-20 bg-red-500 transform -rotate-15 origin-top"></div>
              <div className="w-1 h-20 bg-red-500 transform rotate-15 origin-top"></div>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <button 
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-12 rounded-full text-2xl transition-all hover:scale-105 hover:shadow-lg"
            onClick={handleStartGame}
          >
            PLAY GAME
          </button>
          
          <div>
            <button 
              className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-6 rounded-full transition-colors mt-4"
              onClick={toggleMute}
            >
              {isMuted ? "UNMUTE 🔇" : "MUTE 🔊"}
            </button>
          </div>
        </div>
        
        <div className="mt-12 text-white text-opacity-80">
          <h2 className="text-xl font-bold mb-2">Controls:</h2>
          <div className="grid grid-cols-2 gap-2 max-w-md mx-auto text-left">
            <div>Move:</div><div>Arrow Keys / WASD</div>
            <div>Jump:</div><div>W / ↑</div>
            <div>Punch:</div><div>J</div>
            <div>Kick:</div><div>K</div>
            <div>Block:</div><div>L</div>
            <div>Special:</div><div>Space</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
