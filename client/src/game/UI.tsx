import { useEffect, useState } from "react";
import { useFighting } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";
import { useControls } from "../lib/stores/useControls";
import { useCustomization } from "../lib/stores/useCustomization";
import { Coins } from "lucide-react";
import { useEffects } from "../lib/stores/useEffects";

type TelemetryDigest = Partial<
    Record<
      "player1" | "player2" | "cpu",
      { hits: number; totalDamage: number; maxCombo: number }
    >
  >;
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
    returnToMenu,
    calculateFinalScore,
    submitScore,
    playerStatus,
    cpuStatus,
    slots,
    paused,
    togglePause,
  } = useFighting();
  
  const { toggleMute, isMuted, playSuccess, setMasterVolume, masterVolume } = useAudio();
  const {
    debugMode,
    toggleDebugMode,
    lowGraphicsMode,
    toggleLowGraphicsMode,
    showSilhouetteDebug,
    toggleSilhouetteDebug,
    inkQuality,
    cycleInkQuality,
  } = useControls();
  const { coins, lastCoinEvent } = useCustomization();
  const landingBurst = useEffects((state) => state.landingBurst);
  const impactFlash = useEffects((state) => state.impactFlash);
  const isLocalMultiplayer = slots.player2.type === "human";
  const playerOneLabel = slots.player1.label;
  const opponentLabel = slots.player2.label;
  const playerOneBadge = slots.player1.type === "human" ? "Human" : "CPU";
  const opponentBadge = slots.player2.type === "human" ? "Human" : "CPU";
  const timerSubtitle = isLocalMultiplayer ? "Local Versus" : "Solo vs CPU";

  // Animation states for UI elements
  const [showControls, setShowControls] = useState(false);
  const [pulseHealth, setPulseHealth] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [coinFlash, setCoinFlash] = useState<string | null>(null);
  const [playerGuardFlash, setPlayerGuardFlash] = useState(false);
  const [cpuGuardFlash, setCpuGuardFlash] = useState(false);
  const [telemetrySummary, setTelemetrySummary] = useState<TelemetryDigest>({});
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Determine round winner
  const determineWinner = () => {
    if (player.health <= 0) return `${opponentLabel} Wins!`;
    if (cpu.health <= 0) return `${playerOneLabel} Wins!`;
    if (player.health > cpu.health) return `${playerOneLabel} Wins!`;
    if (cpu.health > player.health) return `${opponentLabel} Wins!`;
    return "Draw!";
  };

  const winnerMessage = determineWinner();
  const playerWon = winnerMessage.includes(playerOneLabel);
  
  // Play win sound effect and submit score
  useEffect(() => {
    if (gamePhase === 'round_end' && !scoreSubmitted) {
      if (player.health > cpu.health) {
        playSuccess();
      }
      
      // Submit score to leaderboard
      const finalScore = calculateFinalScore();
      if (finalScore > 0) {
        submitScore(finalScore);
        setScoreSubmitted(true);
      }
    }
  }, [gamePhase, player.health, cpu.health, playSuccess, scoreSubmitted, calculateFinalScore, submitScore]);

  // Reset score submission flag when starting new game
  useEffect(() => {
    if (gamePhase === 'fighting') {
      setScoreSubmitted(false);
    }
  }, [gamePhase]);

  useEffect(() => {
    if (!lastCoinEvent || lastCoinEvent.direction !== "credit") return;
    setCoinFlash(`+${lastCoinEvent.amount}`);
    const timeout = setTimeout(() => setCoinFlash(null), 1500);
    return () => clearTimeout(timeout);
  }, [lastCoinEvent]);
  useEffect(() => {
    if (!debugMode) return;
    let cancelled = false;
    const fetchSummary = () => {
      fetch("/api/telemetry/summary")
        .then((res) => res.json())
        .then((data: { summary?: TelemetryDigest }) => {
          if (cancelled) return;
          setTelemetrySummary(data?.summary ?? {});
        })
        .catch(() => {
          if (!cancelled) {
            setTelemetrySummary({});
          }
        });
    };
    fetchSummary();
    const id = setInterval(fetchSummary, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [debugMode]);
  
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

  useEffect(() => {
    if (playerStatus === "guard_break") {
      setPlayerGuardFlash(true);
      const timeout = setTimeout(() => setPlayerGuardFlash(false), 700);
      return () => clearTimeout(timeout);
    }
  }, [playerStatus]);

  useEffect(() => {
    if (cpuStatus === "guard_break") {
      setCpuGuardFlash(true);
      const timeout = setTimeout(() => setCpuGuardFlash(false), 700);
      return () => clearTimeout(timeout);
    }
  }, [cpuStatus]);
  
  // Toggle controls visibility
  const toggleControls = () => {
    setShowControls(prev => !prev);
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setMasterVolume(newVolume);
  };
  
  const renderMeter = (label: string, value: number, colorClass: string) => (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-gray-300">
        <span>{label}</span>
        <span>{Math.round(value)}</span>
      </div>
      <div className="w-full bg-gray-800 h-2.5 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-200`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
  
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      <div className="absolute top-4 left-4 pointer-events-auto flex gap-2 flex-wrap">
        {gamePhase === 'fighting' && (
          <button
            onClick={() => togglePause()}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
              paused ? "bg-emerald-500 text-black" : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        <button
          onClick={toggleSilhouetteDebug}
          className={`px-3 py-2 rounded-full text-xs font-semibold transition ${
            showSilhouetteDebug ? "bg-indigo-500/80 text-white" : "bg-black/40 text-indigo-100 hover:bg-black/60"
          }`}
          title="Toggle spline/outline debug overlay"
        >
          {showSilhouetteDebug ? "Spline Debug" : "Spline Off"}
        </button>
        <button
          onClick={cycleInkQuality}
          className="px-3 py-2 rounded-full text-xs font-semibold bg-white/15 text-white hover:bg-white/25"
          title="Cycle ink material quality/perf profile"
        >
          Ink: {inkQuality === "cinematic" ? "Cine" : inkQuality === "balanced" ? "Balanced" : "Perf"}
        </button>
      </div>
      {impactFlash > 0 && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ opacity: impactFlash * 0.3 }}
        />
      )}
      {landingBurst > 0 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-t from-white/60 via-white/30 to-transparent blur-3xl"
          style={{
            opacity: landingBurst * 0.45,
            width: `${12 + landingBurst * 18}rem`,
            height: `${4 + landingBurst * 6}rem`,
          }}
        />
      )}
      {playerGuardFlash && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent animate-pulse" />
      )}
      {cpuGuardFlash && (
        <div className="absolute inset-0 bg-gradient-to-l from-red-500/20 to-transparent animate-pulse" />
      )}
      <div className="absolute top-4 right-4 pointer-events-none">
        <div className="bg-black bg-opacity-70 text-amber-200 px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Coins className="w-4 h-4" />
          <span className="font-semibold">{coins.toLocaleString()}</span>
          {coinFlash && <span className="text-green-300 text-sm font-semibold">{coinFlash}</span>}
        </div>
      </div>
      {debugMode && (
        <div className="absolute bottom-4 left-4 bg-black/70 text-white text-xs p-3 rounded-xl pointer-events-auto space-y-2">
          <p className="text-indigo-200 uppercase tracking-widest text-[10px]">Telemetry</p>
          {(["player1", "player2", "cpu"] as const).map((slot) => {
            const summary = telemetrySummary[slot];
            return (
              <div key={slot} className="flex justify-between gap-4">
                <span className="text-gray-300">{slot.toUpperCase()}</span>
                {summary ? (
                  <span className="text-gray-100">
                    {summary.hits} hits · {Math.round(summary.totalDamage)} dmg · max combo {summary.maxCombo}
                  </span>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Health bars with improved styling */}
      <div className="flex justify-between p-4">
        <div className="w-2/5">
          <div className="flex items-center gap-3">
            <div className="text-white font-bold text-lg mb-1 drop-shadow-md">{playerOneLabel}</div>
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/15 text-indigo-100">{playerOneBadge}</span>
          </div>
          <div className="w-full bg-gray-800 h-6 rounded-lg overflow-hidden shadow-lg">
            <div 
              className={`bg-gradient-to-r from-blue-700 to-blue-400 h-full transition-all duration-300 ease-out 
                ${player.health < 25 ? (pulseHealth ? 'animate-pulse' : '') : ''}`}
              style={{ width: `${Math.max(0, player.health)}%` }}
            ></div>
          </div>
          {renderMeter("Guard", player.guardMeter, "bg-blue-500")}
          {renderMeter("Stamina", player.staminaMeter, "bg-cyan-400")}
          {renderMeter("Special", player.specialMeter, "bg-indigo-400")}
        </div>
        
        <div className="bg-black bg-opacity-70 text-white font-bold text-xl px-5 py-2 rounded-full shadow-lg flex flex-col items-center min-w-[150px]">
          <span>{formatTime(roundTime)}</span>
          <span className="text-xs tracking-widest text-gray-300 uppercase">{timerSubtitle}</span>
        </div>
        
        <div className="w-2/5 text-right">
          <div className="flex items-center justify-end gap-3">
            <span className="px-2 py-0.5 rounded-full text-xs bg-white/15 text-indigo-100">{opponentBadge}</span>
            <div className="text-white font-bold text-lg mb-1 drop-shadow-md">{opponentLabel}</div>
          </div>
          <div className="w-full bg-gray-800 h-6 rounded-lg overflow-hidden shadow-lg">
            <div 
              className={`bg-gradient-to-r from-red-400 to-red-700 h-full transition-all duration-300 ease-out ml-auto
                ${cpu.health < 25 ? (pulseHealth ? 'animate-pulse' : '') : ''}`}
              style={{ width: `${Math.max(0, cpu.health)}%` }}
            ></div>
          </div>
          {renderMeter("Guard", cpu.guardMeter, "bg-rose-500")}
          {renderMeter("Stamina", cpu.staminaMeter, "bg-amber-400")}
          {renderMeter("Special", cpu.specialMeter, "bg-fuchsia-500")}
        </div>
      </div>
      
      {/* Score display with animation */}
      <div className="absolute top-20 left-0 w-full text-center">
        <div className="bg-black bg-opacity-70 text-white font-bold text-2xl px-8 py-2 rounded-full inline-block shadow-lg flex items-center gap-3">
          <span className="text-sm uppercase tracking-wide text-gray-300">{playerOneLabel}</span>
          <span className={`${playerScore > cpuScore ? 'text-blue-400' : ''}`}>{playerScore}</span>
          <span className="text-gray-500">-</span>
          <span className={`${cpuScore > playerScore ? 'text-red-400' : ''}`}>{cpuScore}</span>
          <span className="text-sm uppercase tracking-wide text-gray-300">{opponentLabel}</span>
        </div>
      </div>
      
      {/* Round end overlay with improved animation and effects */}
      {gamePhase === 'round_end' && (
        <div className="absolute inset-0 bg-gradient-to-b from-black to-gray-900 bg-opacity-90 flex flex-col items-center justify-center pointer-events-auto animate-fadeIn">
          <div className="text-5xl font-bold text-white mb-8 animate-bounce">
            {playerWon ? (
              <span className="text-blue-400">{winnerMessage}</span>
            ) : (
              <span className="text-red-400">{winnerMessage}</span>
            )}
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
      
      {/* Debug and performance buttons - only visible in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto">
          <button 
            onClick={toggleDebugMode}
            className="bg-pink-600 text-white px-2 py-1 rounded text-xs shadow-lg"
          >
            {debugMode ? "Debug: ON" : "Debug: OFF"}
          </button>
          <button 
            onClick={toggleLowGraphicsMode}
            className="bg-purple-600 text-white px-2 py-1 rounded text-xs shadow-lg"
          >
            {lowGraphicsMode ? "Low Graphics: ON" : "Low Graphics: OFF"}
          </button>
        </div>
      )}
      
      {/* Pause menu */}
      {paused && gamePhase === 'fighting' && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-6 pointer-events-auto">
          <h2 className="text-4xl font-bold text-white tracking-wide">Paused</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <button
              className="px-8 py-3 rounded-full bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition"
              onClick={() => togglePause()}
            >
              Resume
            </button>
            <button
              className="px-8 py-3 rounded-full bg-white/20 text-white font-semibold hover:bg-white/30 transition"
              onClick={() => {
                togglePause();
                resetRound();
              }}
            >
              Restart Round
            </button>
            <button
              className="px-8 py-3 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition"
              onClick={() => {
                togglePause();
                returnToMenu();
              }}
            >
              Exit to Menu
            </button>
          </div>
          <p className="text-sm text-gray-300 uppercase tracking-widest">Press Esc to resume</p>
        </div>
      )}
    </div>
  );
};

export default UI;
