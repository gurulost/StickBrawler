import { useEffect, useState } from "react";
import { useFighting } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";
import { useControls } from "../lib/stores/useControls";

const UI = () => {
  const {
    player,
    cpu,
    playerScore,
    cpuScore,
    roundTime,
    maxRoundTime,
    gamePhase,
    resetRound,
    returnToMenu
  } = useFighting();
  
  const { toggleMute, isMuted, playSuccess, setMasterVolume, masterVolume } = useAudio();
  const { debugMode, toggleDebugMode } = useControls();
  
  // Animation states for UI elements
  const [showControls, setShowControls] = useState(false);
  const [pulseHealth, setPulseHealth] = useState(false);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Determine round winner
  const determineWinner = () => {
    if (player.health <= 0) return "CPU Wins!";
    if (cpu.health <= 0) return "You Win!";
    if (player.health > cpu.health) return "You Win!";
    if (cpu.health > player.health) return "CPU Wins!";
    return "Draw!";
  };
  
  // Play win sound effect
  useEffect(() => {
    if (gamePhase === 'round_end') {
      if (player.health > cpu.health) {
        playSuccess();
      }
    }
  }, [gamePhase, player.health, cpu.health, playSuccess]);
  
  // Pulse health bar when low health
  useEffect(() => {
    if (player.health < 25 || cpu.health < 25) {
      // Create a pulsing animation effect for low health
      const interval = setInterval(() => {
        setPulseHealth(prev => !prev);
      }, 500);
      
      return () => clearInterval(interval);
    } else {
      setPulseHealth(false);
    }
  }, [player.health, cpu.health]);
  
  // Toggle controls visibility
  const toggleControls = () => {
    setShowControls(prev => !prev);
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMasterVolume(newVolume);
  };
  
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {/* Health bars with improved styling */}
      <div className="flex justify-between p-4">
        <div className="w-2/5">
          <div className="text-white font-bold text-lg mb-1 drop-shadow-md">Player</div>
          <div className="w-full bg-gray-800 h-6 rounded-lg overflow-hidden shadow-lg">
            <div 
              className={`bg-gradient-to-r from-blue-700 to-blue-400 h-full transition-all duration-300 ease-out 
                ${player.health < 25 ? (pulseHealth ? 'animate-pulse' : '') : ''}`}
              style={{ width: `${Math.max(0, player.health)}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-black bg-opacity-70 text-white font-bold text-xl px-5 py-2 rounded-full shadow-lg">
          {formatTime(roundTime)}
        </div>
        
        <div className="w-2/5 text-right">
          <div className="text-white font-bold text-lg mb-1 drop-shadow-md">CPU</div>
          <div className="w-full bg-gray-800 h-6 rounded-lg overflow-hidden shadow-lg">
            <div 
              className={`bg-gradient-to-r from-red-400 to-red-700 h-full transition-all duration-300 ease-out ml-auto
                ${cpu.health < 25 ? (pulseHealth ? 'animate-pulse' : '') : ''}`}
              style={{ width: `${Math.max(0, cpu.health)}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Score display with animation */}
      <div className="absolute top-20 left-0 w-full text-center">
        <div className="bg-black bg-opacity-70 text-white font-bold text-2xl px-8 py-2 rounded-full inline-block shadow-lg">
          <span className={`${playerScore > cpuScore ? 'text-blue-400' : ''}`}>{playerScore}</span>
          {" - "}
          <span className={`${cpuScore > playerScore ? 'text-red-400' : ''}`}>{cpuScore}</span>
        </div>
      </div>
      
      {/* Round end overlay with improved animation and effects */}
      {gamePhase === 'round_end' && (
        <div className="absolute inset-0 bg-gradient-to-b from-black to-gray-900 bg-opacity-90 flex flex-col items-center justify-center pointer-events-auto animate-fadeIn">
          <div className="text-5xl font-bold text-white mb-8 animate-bounce">
            {determineWinner() === "You Win!" 
              ? <span className="text-blue-400">{determineWinner()}</span>
              : <span className="text-red-400">{determineWinner()}</span>}
          </div>
          
          <div className="text-2xl text-white mb-10">
            Score: <span className="text-blue-400">{playerScore}</span> - <span className="text-red-400">{cpuScore}</span>
          </div>
          
          <div className="flex gap-6">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-colors shadow-lg transform hover:scale-105"
              onClick={resetRound}
            >
              Next Round
            </button>
            
            <button 
              className="bg-gray-700 hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-full transition-colors shadow-lg transform hover:scale-105"
              onClick={returnToMenu}
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
      
      {/* Controls panel button */}
      <button 
        onClick={toggleControls}
        className="absolute top-24 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full pointer-events-auto shadow-lg hover:bg-opacity-90 transition-colors"
      >
        {showControls ? "Hide Controls" : "Show Controls"}
      </button>
      
      {/* Enhanced controls panel */}
      {showControls && (
        <div className="absolute top-36 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg pointer-events-auto shadow-lg animate-fadeIn" style={{ maxWidth: "280px" }}>
          <div className="font-bold text-lg mb-3 border-b border-gray-600 pb-2">Game Controls</div>
          
          <div className="mb-4">
            <div className="font-semibold text-blue-300 mb-1">Movement</div>
            <div><span className="text-gray-400">Move:</span> Arrow Keys / WASD</div>
            <div><span className="text-gray-400">Jump:</span> W</div>
          </div>
          
          <div className="mb-4">
            <div className="font-semibold text-blue-300 mb-1">Combat</div>
            <div><span className="text-gray-400">Quick Attack:</span> J</div>
            <div><span className="text-gray-400">Strong Attack:</span> K</div>
            <div><span className="text-gray-400">Special:</span> Space</div>
            <div><span className="text-gray-400">Block:</span> L</div>
          </div>
          
          <div className="mb-4">
            <div className="font-semibold text-blue-300 mb-1">Advanced</div>
            <div><span className="text-gray-400">Air Attack:</span> E</div>
            <div><span className="text-gray-400">Dodge:</span> Shift</div>
            <div><span className="text-gray-400">Grab:</span> G</div>
            <div><span className="text-gray-400">Taunt:</span> T</div>
          </div>
        </div>
      )}
      
      {/* Audio controls */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white p-3 rounded-lg pointer-events-auto shadow-lg flex items-center gap-3">
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
          className="w-24"
        />
      </div>
      
      {/* Debug button - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          onClick={toggleDebugMode}
          className="absolute top-4 right-4 bg-pink-600 text-white px-2 py-1 rounded pointer-events-auto text-xs shadow-lg"
        >
          {debugMode ? "Debug: ON" : "Debug: OFF"}
        </button>
      )}
    </div>
  );
};

export default UI;
