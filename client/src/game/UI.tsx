import { useEffect, useState } from "react";
import { useFighting } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";

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
  
  const { toggleMute, isMuted, playSuccess } = useAudio();
  
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
  
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {/* Health bars */}
      <div className="flex justify-between p-4">
        <div className="w-2/5">
          <div className="text-white font-bold text-lg mb-1">Player</div>
          <div className="w-full bg-gray-700 h-5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-500 h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.max(0, player.health)}%` }}
            ></div>
          </div>
        </div>
        
        <div className="bg-black bg-opacity-50 text-white font-bold text-lg px-4 py-1 rounded-full">
          {formatTime(roundTime)}
        </div>
        
        <div className="w-2/5 text-right">
          <div className="text-white font-bold text-lg mb-1">CPU</div>
          <div className="w-full bg-gray-700 h-5 rounded-full overflow-hidden">
            <div 
              className="bg-red-500 h-full transition-all duration-300 ease-out ml-auto"
              style={{ width: `${Math.max(0, cpu.health)}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Score display */}
      <div className="absolute top-20 left-0 w-full text-center">
        <div className="bg-black bg-opacity-50 text-white font-bold text-xl px-6 py-1 rounded-full inline-block">
          {playerScore} - {cpuScore}
        </div>
      </div>
      
      {/* Round end overlay */}
      {gamePhase === 'round_end' && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center pointer-events-auto">
          <div className="text-4xl font-bold text-white mb-6">
            {determineWinner()}
          </div>
          
          <div className="text-xl text-white mb-8">
            Score: {playerScore} - {cpuScore}
          </div>
          
          <div className="flex gap-4">
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition-colors"
              onClick={resetRound}
            >
              Next Round
            </button>
            
            <button 
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-full transition-colors"
              onClick={returnToMenu}
            >
              Main Menu
            </button>
          </div>
        </div>
      )}
      
      {/* Controls indicator */}
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded text-sm">
        <div className="font-bold mb-1">Controls:</div>
        <div>Move: Arrow Keys / WASD</div>
        <div>Jump: W / ↑</div>
        <div>Punch: J</div>
        <div>Kick: K</div>
        <div>Block: L</div>
      </div>
      
      {/* Sound toggle button */}
      <button 
        onClick={toggleMute}
        className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-2 rounded pointer-events-auto"
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
    </div>
  );
};

export default UI;
