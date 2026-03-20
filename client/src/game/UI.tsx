import { useEffect, useState } from "react";
import { useFighting } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";
import { useControls } from "../lib/stores/useControls";
import { useCustomization } from "../lib/stores/useCustomization";
import { Coins } from "lucide-react";
import { useEffects } from "../lib/stores/useEffects";
import { MusicToggle } from "../components/ui/music-toggle";
import CombatDebugPanel from "./CombatDebugPanel";
import { useCombatDebug } from "../lib/stores/useCombatDebug";

type TelemetryDigest = Partial<
    Record<
      "player1" | "player2" | "cpu",
      { hits: number; totalDamage: number; maxCombo: number }
    >
  >;

type CombatTag = {
  label: string;
  className: string;
};

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
    restartMatch,
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
    combatPlaybackPaused,
    setCombatPlaybackPaused,
    toggleCombatPlaybackPaused,
    combatPlaybackRate,
    setCombatPlaybackRate,
    queueCombatFrameStep,
    lowGraphicsMode,
    toggleLowGraphicsMode,
    showSilhouetteDebug,
    toggleSilhouetteDebug,
    inkQuality,
    cycleInkQuality,
  } = useControls();
  const clearReviewFrame = useCombatDebug((state) => state.clearReviewFrame);
  const { coins, lastCoinEvent } = useCustomization();
  const landingBurst = useEffects((state) => state.landingBurst);
  const impactFlash = useEffects((state) => state.impactFlash);
  const isLocalMultiplayer = slots.player2.type === "human";
  const playerOneLabel = slots.player1.label;
  const opponentLabel = slots.player2.label;
  const playerOneBadge = slots.player1.type === "human" ? "Human" : "CPU";
  const opponentBadge = slots.player2.type === "human" ? "Human" : "CPU";
  const timerSubtitle = isLocalMultiplayer ? "Local Versus" : "Solo vs CPU";
  const playerSpecialReady = player.specialMeter >= 100;
  const cpuSpecialReady = cpu.specialMeter >= 100;
  const playerGuardCritical = player.guardMeter > 0 && player.guardMeter <= 20;
  const cpuGuardCritical = cpu.guardMeter > 0 && cpu.guardMeter <= 20;

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
    if (gamePhase === 'match_end' && !scoreSubmitted) {
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

  useEffect(() => {
    if (debugMode) return;
    clearReviewFrame();
  }, [clearReviewFrame, debugMode]);

  // Pulse health bar when low health
  useEffect(() => {
    if (player.health < 25 || cpu.health < 25) {
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

  const renderMeter = (label: string, value: number, colorClass: string, glowColor: string) => (
    <div className="mt-1.5">
      <div className="flex justify-between text-[10px] font-tech uppercase tracking-wider">
        <span className="text-white/50">{label}</span>
        <span className="text-white/60 font-semibold">{Math.round(value)}</span>
      </div>
      <div className="w-full bg-white/5 h-1.5 clip-angular-sm overflow-hidden mt-0.5">
        <div
          className={`h-full ${colorClass} transition-all duration-200`}
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            boxShadow: `0 0 8px ${glowColor}`,
          }}
        />
      </div>
    </div>
  );

  const playerCombatTags: CombatTag[] = [
    playerSpecialReady
      ? {
          label: "SPECIAL READY",
          className:
            "border-neon-cyan/60 bg-neon-cyan/10 text-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.3)] animate-neon-pulse",
        }
      : null,
    playerGuardCritical
      ? {
          label: "GUARD LOW",
          className: "border-neon-yellow/50 bg-neon-yellow/10 text-[#ffe600]",
        }
      : null,
    playerStatus === "guard_break"
      ? {
          label: "GUARD BROKEN",
          className: "border-white/40 bg-white/10 text-white",
        }
      : null,
  ].filter((tag): tag is CombatTag => tag !== null);

  const cpuCombatTags: CombatTag[] = [
    cpuSpecialReady
      ? {
          label: "SPECIAL READY",
          className:
            "border-neon-magenta/60 bg-neon-magenta/10 text-[#ff2d7b] shadow-[0_0_20px_rgba(255,45,123,0.3)] animate-neon-pulse",
        }
      : null,
    cpuGuardCritical
      ? {
          label: "GUARD LOW",
          className: "border-neon-orange/50 bg-neon-orange/10 text-[#ff6a00]",
        }
      : null,
    cpuStatus === "guard_break"
      ? {
          label: "GUARD BROKEN",
          className: "border-white/40 bg-white/10 text-white",
        }
      : null,
  ].filter((tag): tag is CombatTag => tag !== null);

  const centerCallout =
    playerStatus === "guard_break"
      ? {
          label: `${playerOneLabel} GUARD SHATTERED`,
          className:
            "border-[#00f0ff]/50 bg-gradient-to-r from-[#00f0ff]/20 to-[#00c8ff]/10 text-[#00f0ff] shadow-[0_0_30px_rgba(0,240,255,0.25)]",
        }
      : cpuStatus === "guard_break"
        ? {
            label: `${opponentLabel} GUARD SHATTERED`,
            className:
              "border-[#ff2d7b]/50 bg-gradient-to-r from-[#ff2d7b]/20 to-[#ff6a00]/10 text-[#ff2d7b] shadow-[0_0_30px_rgba(255,45,123,0.25)]",
          }
        : playerSpecialReady && cpuSpecialReady
          ? {
              label: "BOTH FIGHTERS SPECIAL-READY",
              className:
                "border-[#b347ff]/50 bg-gradient-to-r from-[#b347ff]/15 via-[#ff2d7b]/15 to-[#00f0ff]/15 text-[#b347ff] shadow-[0_0_30px_rgba(179,71,255,0.25)]",
            }
          : playerSpecialReady
            ? {
                label: `${playerOneLabel} SPECIAL READY`,
                className:
                  "border-[#00f0ff]/40 bg-gradient-to-r from-[#00f0ff]/15 to-transparent text-[#00f0ff] shadow-[0_0_24px_rgba(0,240,255,0.2)]",
              }
            : cpuSpecialReady
              ? {
                  label: `${opponentLabel} SPECIAL READY`,
                  className:
                    "border-[#ff2d7b]/40 bg-gradient-to-r from-[#ff2d7b]/15 to-transparent text-[#ff2d7b] shadow-[0_0_24px_rgba(255,45,123,0.2)]",
                }
              : playerGuardCritical && cpuGuardCritical
                ? {
                    label: "BOTH GUARDS CRITICAL",
                    className:
                      "border-[#ffe600]/50 bg-gradient-to-r from-[#ffe600]/15 to-[#ff6a00]/10 text-[#ffe600] shadow-[0_0_24px_rgba(255,230,0,0.2)]",
                  }
                : playerGuardCritical
                  ? {
                      label: `${playerOneLabel} GUARD CRACKING`,
                      className:
                        "border-[#ffe600]/40 bg-[#ffe600]/10 text-[#ffe600]",
                    }
                  : cpuGuardCritical
                    ? {
                        label: `${opponentLabel} GUARD CRACKING`,
                        className:
                          "border-[#ff6a00]/40 bg-[#ff6a00]/10 text-[#ff6a00]",
                      }
                    : null;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
      {/* ─── Top Control Bar ─── */}
      <div className="absolute top-3 left-3 pointer-events-auto flex gap-1.5 flex-wrap z-20">
        {gamePhase === 'fighting' && (
          <button
            onClick={() => togglePause()}
            className={`px-3 py-1.5 clip-angular-sm text-[10px] font-tech font-bold uppercase tracking-wider transition ${
              paused
                ? "bg-[#39ff14] text-black shadow-[0_0_12px_rgba(57,255,20,0.4)]"
                : "bg-white/10 text-white/70 hover:bg-white/15 hover:text-white"
            }`}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        <MusicToggle className="bg-white/10 hover:bg-white/15 text-white/70" />
        <button
          onClick={toggleSilhouetteDebug}
          className={`px-2.5 py-1.5 clip-angular-sm text-[10px] font-tech font-bold uppercase tracking-wider transition ${
            showSilhouetteDebug ? "bg-[#b347ff]/60 text-white" : "bg-white/8 text-white/50 hover:bg-white/12"
          }`}
          title="Toggle spline/outline debug overlay"
        >
          {showSilhouetteDebug ? "Spline" : "Spline"}
        </button>
        <button
          onClick={cycleInkQuality}
          className="px-2.5 py-1.5 clip-angular-sm text-[10px] font-tech font-bold uppercase tracking-wider bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/70"
          title="Cycle ink material quality/perf profile"
        >
          Ink: {inkQuality === "cinematic" ? "Cine" : inkQuality === "balanced" ? "Bal" : "Perf"}
        </button>
        <button
          onClick={toggleControls}
          className="px-2.5 py-1.5 clip-angular-sm text-[10px] font-tech font-bold uppercase tracking-wider bg-white/8 text-white/50 hover:bg-white/12 hover:text-white/70"
        >
          Controls
        </button>
        {process.env.NODE_ENV === 'development' && (
          <>
            <button
              onClick={toggleDebugMode}
              className="px-2.5 py-1.5 clip-angular-sm text-[10px] font-tech font-bold uppercase tracking-wider bg-[#ff2d7b]/60 text-white shadow-lg hover:bg-[#ff2d7b]/80"
            >
              {debugMode ? "Debug On" : "Debug Off"}
            </button>
            <button
              onClick={toggleLowGraphicsMode}
              className="px-2.5 py-1.5 clip-angular-sm text-[10px] font-tech font-bold uppercase tracking-wider bg-[#b347ff]/50 text-white shadow-lg hover:bg-[#b347ff]/70"
            >
              {lowGraphicsMode ? "Low Gfx" : "Full Gfx"}
            </button>
            {debugMode && gamePhase === 'fighting' && (
              <>
                <button
                  onClick={() => {
                    if (combatPlaybackPaused) {
                      clearReviewFrame();
                      setCombatPlaybackPaused(false);
                      return;
                    }
                    toggleCombatPlaybackPaused();
                  }}
                  className="px-2.5 py-1.5 clip-angular-sm text-[10px] font-tech font-bold uppercase tracking-wider bg-white/8 text-white/60 hover:bg-white/15"
                >
                  {combatPlaybackPaused ? "Sim Play" : "Sim Pause"}
                </button>
                <button
                  onClick={() => setCombatPlaybackRate(combatPlaybackRate === 1 ? 0.25 : 1)}
                  className="px-2.5 py-1.5 clip-angular-sm text-[10px] font-tech font-bold uppercase tracking-wider bg-white/8 text-white/60 hover:bg-white/15"
                >
                  {combatPlaybackRate === 1 ? "1x" : "0.25x"}
                </button>
                <button
                  onClick={() => {
                    setCombatPlaybackPaused(true);
                    clearReviewFrame();
                    queueCombatFrameStep();
                  }}
                  className="px-2.5 py-1.5 clip-angular-sm text-[10px] font-tech font-bold uppercase tracking-wider bg-white/8 text-white/60 hover:bg-white/15"
                >
                  Step
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* ─── Impact & Landing Effects ─── */}
      {impactFlash > 0 && (
        <div
          className="absolute inset-0 bg-white pointer-events-none"
          style={{ opacity: impactFlash * 0.3 }}
        />
      )}
      {landingBurst > 0 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-t from-[#00f0ff]/40 via-[#00f0ff]/15 to-transparent blur-3xl"
          style={{
            opacity: landingBurst * 0.45,
            width: `${12 + landingBurst * 18}rem`,
            height: `${4 + landingBurst * 6}rem`,
          }}
        />
      )}
      {playerGuardFlash && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#00f0ff]/15 to-transparent animate-pulse" />
      )}
      {cpuGuardFlash && (
        <div className="absolute inset-0 bg-gradient-to-l from-[#ff2d7b]/15 to-transparent animate-pulse" />
      )}

      {/* ─── Coin Display ─── */}
      <div className="absolute top-3 right-3 pointer-events-none z-20">
        <div className="flex items-center gap-2 bg-ink-dark/80 border border-[#ffe600]/20 px-3 py-1.5 clip-angular-sm backdrop-blur-sm">
          <Coins className="w-3.5 h-3.5 text-[#ffe600]" />
          <span className="font-tech text-sm font-bold text-[#ffe600]">{coins.toLocaleString()}</span>
          {coinFlash && <span className="text-[#39ff14] text-xs font-tech font-bold">{coinFlash}</span>}
        </div>
      </div>

      {/* ─── Telemetry Debug ─── */}
      {debugMode && (
        <div className="absolute bottom-4 left-4 bg-ink-dark/90 border border-white/5 text-white text-xs p-3 clip-angular-sm pointer-events-auto space-y-2 font-tech">
          <p className="text-[#b347ff] uppercase tracking-widest text-[10px]">Telemetry</p>
          {(["player1", "player2", "cpu"] as const).map((slot) => {
            const summary = telemetrySummary[slot];
            return (
              <div key={slot} className="flex justify-between gap-4">
                <span className="text-white/40">{slot.toUpperCase()}</span>
                {summary ? (
                  <span className="text-white/70">
                    {summary.hits} hits · {Math.round(summary.totalDamage)} dmg · max combo {summary.maxCombo}
                  </span>
                ) : (
                  <span className="text-white/20">—</span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {debugMode && (
        <CombatDebugPanel
          player={player}
          cpu={cpu}
          playerLabel={playerOneLabel}
          cpuLabel={opponentLabel}
          gamePhase={gamePhase}
        />
      )}

      {/* ═══════════════════════════════════════════
          ─── HEALTH BARS & STATUS PANELS ───
          ═══════════════════════════════════════════ */}
      <div className="flex justify-between items-start gap-3 px-4 pt-12">
        {/* Player 1 Health Panel */}
        <div
          className={`flex-1 max-w-[42%] relative overflow-hidden transition-all duration-300 ${
            playerSpecialReady
              ? "neon-glow-cyan"
              : ""
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.08), rgba(10, 10, 15, 0.9))',
            border: playerSpecialReady ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
            padding: '12px 16px',
          }}
        >
          {/* Top edge accent line */}
          <div className="absolute top-0 left-0 right-4 h-[2px] bg-gradient-to-r from-[#00f0ff] via-[#00f0ff]/60 to-transparent" />

          <div className="flex items-center gap-2 mb-2">
            <span className="font-tech text-sm font-bold text-white tracking-wide">{playerOneLabel}</span>
            <span className="px-2 py-0.5 text-[9px] font-tech font-bold uppercase tracking-widest bg-[#00f0ff]/10 text-[#00f0ff]/80 border border-[#00f0ff]/20 clip-angular-sm">
              {playerOneBadge}
            </span>
          </div>

          {/* Main Health Bar */}
          <div className="relative w-full h-5 bg-white/5 clip-angular overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                player.health < 25 ? 'animate-pulse' : ''
              }`}
              style={{
                width: `${Math.max(0, player.health)}%`,
                background: player.health < 25
                  ? 'linear-gradient(90deg, #ff2d7b, #ff6a00)'
                  : 'linear-gradient(90deg, #00c8ff, #00f0ff)',
                boxShadow: player.health < 25
                  ? '0 0 16px rgba(255, 45, 123, 0.5), inset 0 -2px 4px rgba(0,0,0,0.3)'
                  : '0 0 16px rgba(0, 240, 255, 0.4), inset 0 -2px 4px rgba(0,0,0,0.3)',
              }}
            />
            {/* HP percentage overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-tech text-[10px] font-bold text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {Math.round(player.health)}%
              </span>
            </div>
            {/* Scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent h-1/2" />
          </div>

          {renderMeter("Guard", player.guardMeter, "bg-[#00f0ff]/70", "rgba(0, 240, 255, 0.3)")}
          {renderMeter("Stamina", player.staminaMeter, "bg-[#39ff14]/70", "rgba(57, 255, 20, 0.3)")}
          {renderMeter("Special", player.specialMeter, "bg-[#b347ff]/70", "rgba(179, 71, 255, 0.3)")}

          {playerCombatTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {playerCombatTags.map((tag) => (
                <span
                  key={tag.label}
                  className={`clip-angular-sm border px-2.5 py-0.5 text-[9px] font-tech font-bold uppercase tracking-[0.15em] ${tag.className}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Center Timer */}
        <div
          className="flex flex-col items-center px-5 py-2 relative"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.9), rgba(26, 26, 46, 0.7))',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, calc(100% - 12px) 100%, 12px 100%, 0 100%, 0 12px)',
          }}
        >
          <div className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="font-tech text-xl font-bold text-white tracking-wider tabular-nums">{formatTime(roundTime)}</span>
          <span className="text-[9px] font-tech tracking-[0.3em] text-white/30 uppercase">{timerSubtitle}</span>
        </div>

        {/* Player 2 / CPU Health Panel */}
        <div
          className={`flex-1 max-w-[42%] relative overflow-hidden transition-all duration-300 ${
            cpuSpecialReady
              ? "neon-glow-magenta"
              : ""
          }`}
          style={{
            background: 'linear-gradient(225deg, rgba(255, 45, 123, 0.08), rgba(10, 10, 15, 0.9))',
            border: cpuSpecialReady ? '1px solid rgba(255, 45, 123, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
            clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
            padding: '12px 16px',
          }}
        >
          {/* Top edge accent line */}
          <div className="absolute top-0 left-4 right-0 h-[2px] bg-gradient-to-l from-[#ff2d7b] via-[#ff2d7b]/60 to-transparent" />

          <div className="flex items-center justify-end gap-2 mb-2">
            <span className="px-2 py-0.5 text-[9px] font-tech font-bold uppercase tracking-widest bg-[#ff2d7b]/10 text-[#ff2d7b]/80 border border-[#ff2d7b]/20 clip-angular-sm">
              {opponentBadge}
            </span>
            <span className="font-tech text-sm font-bold text-white tracking-wide">{opponentLabel}</span>
          </div>

          {/* Main Health Bar */}
          <div className="relative w-full h-5 bg-white/5 clip-angular overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ml-auto ${
                cpu.health < 25 ? 'animate-pulse' : ''
              }`}
              style={{
                width: `${Math.max(0, cpu.health)}%`,
                background: cpu.health < 25
                  ? 'linear-gradient(90deg, #ff6a00, #ff2d7b)'
                  : 'linear-gradient(270deg, #ff2d7b, #ff6a85)',
                boxShadow: cpu.health < 25
                  ? '0 0 16px rgba(255, 106, 0, 0.5), inset 0 -2px 4px rgba(0,0,0,0.3)'
                  : '0 0 16px rgba(255, 45, 123, 0.4), inset 0 -2px 4px rgba(0,0,0,0.3)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-tech text-[10px] font-bold text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {Math.round(cpu.health)}%
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent h-1/2" />
          </div>

          {renderMeter("Guard", cpu.guardMeter, "bg-[#ff2d7b]/70", "rgba(255, 45, 123, 0.3)")}
          {renderMeter("Stamina", cpu.staminaMeter, "bg-[#ff6a00]/70", "rgba(255, 106, 0, 0.3)")}
          {renderMeter("Special", cpu.specialMeter, "bg-[#b347ff]/70", "rgba(179, 71, 255, 0.3)")}

          {cpuCombatTags.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-end gap-1.5">
              {cpuCombatTags.map((tag) => (
                <span
                  key={tag.label}
                  className={`clip-angular-sm border px-2.5 py-0.5 text-[9px] font-tech font-bold uppercase tracking-[0.15em] ${tag.className}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Score Display ─── */}
      <div className="absolute top-[108px] left-0 w-full text-center">
        <div
          className="inline-flex items-center gap-3 px-6 py-1.5"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(10, 10, 15, 0.8), transparent)',
          }}
        >
          <span className="text-[10px] font-tech uppercase tracking-widest text-white/30">{playerOneLabel}</span>
          <span className={`font-tech text-lg font-bold ${playerScore > cpuScore ? 'text-[#00f0ff] neon-text-cyan' : 'text-white/60'}`}>{playerScore}</span>
          <span className="text-white/15 font-tech">|</span>
          <span className={`font-tech text-lg font-bold ${cpuScore > playerScore ? 'text-[#ff2d7b] neon-text-magenta' : 'text-white/60'}`}>{cpuScore}</span>
          <span className="text-[10px] font-tech uppercase tracking-widest text-white/30">{opponentLabel}</span>
        </div>
      </div>

      {/* ─── Center Callout ─── */}
      {centerCallout && gamePhase === 'fighting' && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 text-center animate-slide-down">
          <div
            className={`clip-angular border px-5 py-2 text-[10px] font-tech font-bold uppercase tracking-[0.25em] backdrop-blur-sm ${centerCallout.className}`}
          >
            {centerCallout.label}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ─── ROUND END OVERLAY ───
          ═══════════════════════════════════════════ */}
      {gamePhase === 'round_end' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto animate-fadeIn"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.95), rgba(26, 26, 46, 0.9))',
          }}
        >
          {/* Decorative lines */}
          <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="absolute top-2/3 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="text-5xl font-display mb-8 animate-slide-up">
            {playerWon ? (
              <span className="neon-text-cyan">{winnerMessage}</span>
            ) : (
              <span className="neon-text-magenta">{winnerMessage}</span>
            )}
          </div>

          <div className="font-tech text-xl text-white/80 mb-10 tracking-wider">
            <span className="text-[#00f0ff]">{playerScore}</span>
            <span className="text-white/20 mx-3">|</span>
            <span className="text-[#ff2d7b]">{cpuScore}</span>
          </div>

          <div className="flex gap-4">
            <button
              className="font-tech font-bold uppercase tracking-wider text-sm px-8 py-3 clip-angular text-black transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00f0ff, #00c8ff)',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.3)',
              }}
              onClick={resetRound}
            >
              Next Round
            </button>

            <button
              className="font-tech font-bold uppercase tracking-wider text-sm px-8 py-3 clip-angular bg-white/5 text-white/70 border border-white/10 transition-all hover:bg-white/10 hover:text-white"
              onClick={returnToMenu}
            >
              Main Menu
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          ─── MATCH END OVERLAY ───
          ═══════════════════════════════════════════ */}
      {gamePhase === 'match_end' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-auto animate-fadeIn"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.97), rgba(18, 18, 26, 0.95))',
          }}
        >
          {/* Background accent */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: playerWon
                ? 'radial-gradient(circle at center, rgba(0, 240, 255, 0.15), transparent 60%)'
                : 'radial-gradient(circle at center, rgba(255, 45, 123, 0.15), transparent 60%)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-3 text-[10px] font-tech uppercase tracking-[0.5em] text-white/30">Match Complete</div>
            <div className="text-5xl font-display mb-6 animate-slide-up">
              {playerWon ? (
                <span className="neon-text-cyan">{winnerMessage}</span>
              ) : (
                <span className="neon-text-magenta">{winnerMessage}</span>
              )}
            </div>

            <div className="font-tech text-2xl text-white/80 mb-3 tracking-wider">
              <span className="text-[#00f0ff]">{playerScore}</span>
              <span className="text-white/15 mx-3">|</span>
              <span className="text-[#ff2d7b]">{cpuScore}</span>
            </div>
            <div className="font-tech text-xs uppercase tracking-[0.4em] text-[#ffe600] mb-10">
              Score {calculateFinalScore().toLocaleString()}
            </div>

            <div className="flex gap-4">
              <button
                className="font-tech font-bold uppercase tracking-wider text-sm px-8 py-3 clip-angular text-black transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #39ff14, #00f0ff)',
                  boxShadow: '0 0 20px rgba(57, 255, 20, 0.3)',
                }}
                onClick={restartMatch}
              >
                Run It Back
              </button>

              <button
                className="font-tech font-bold uppercase tracking-wider text-sm px-8 py-3 clip-angular bg-white/5 text-white/70 border border-white/10 transition-all hover:bg-white/10 hover:text-white"
                onClick={returnToMenu}
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Controls Panel ─── */}
      {showControls && (
        <div
          className="absolute top-28 right-4 p-4 pointer-events-auto shadow-2xl animate-slide-down font-tech"
          style={{
            maxWidth: "280px",
            background: 'linear-gradient(135deg, rgba(18, 18, 26, 0.95), rgba(10, 10, 15, 0.98))',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
          }}
        >
          <div className="absolute top-0 left-0 right-3 h-[1px] bg-gradient-to-r from-[#00f0ff]/40 to-transparent" />
          <div className="font-bold text-sm mb-3 border-b border-white/5 pb-2 text-white uppercase tracking-wider">Controls</div>

          <div className="mb-3">
            <div className="font-semibold text-[#00f0ff] text-[10px] uppercase tracking-widest mb-1">Movement</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Move:</span> Arrow Keys / WASD</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Jump:</span> W</div>
          </div>

          <div className="mb-3">
            <div className="font-semibold text-[#ff2d7b] text-[10px] uppercase tracking-widest mb-1">Combat</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Quick:</span> J</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Strong:</span> K</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Special:</span> Space</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Block:</span> L</div>
          </div>

          <div>
            <div className="font-semibold text-[#b347ff] text-[10px] uppercase tracking-widest mb-1">Advanced</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Air:</span> E</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Dodge:</span> Shift</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Grab:</span> G</div>
            <div className="text-xs text-white/70"><span className="text-white/40">Taunt:</span> T</div>
          </div>
        </div>
      )}

      {/* ─── Audio Controls ─── */}
      <div
        className="absolute bottom-3 right-3 px-3 py-2 pointer-events-auto flex items-center gap-3 backdrop-blur-sm"
        style={{
          background: 'rgba(10, 10, 15, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          clipPath: 'polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)',
        }}
      >
        <button
          onClick={toggleMute}
          className="p-1 text-white/50 hover:text-white transition-colors text-sm"
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
          className="w-20"
        />
      </div>

      {/* ═══════════════════════════════════════════
          ─── PAUSE MENU ───
          ═══════════════════════════════════════════ */}
      {paused && gamePhase === 'fighting' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-8 pointer-events-auto"
          style={{
            background: 'radial-gradient(circle at center, rgba(18, 18, 26, 0.95), rgba(10, 10, 15, 0.98))',
          }}
        >
          <h2 className="font-display text-5xl text-white tracking-wider animate-glitch">Paused</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <button
              className="px-8 py-3 clip-angular font-tech font-bold uppercase tracking-wider text-sm text-black transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #39ff14, #00f0ff)',
                boxShadow: '0 0 16px rgba(57, 255, 20, 0.3)',
              }}
              onClick={() => togglePause()}
            >
              Resume
            </button>
            <button
              className="px-8 py-3 clip-angular font-tech font-bold uppercase tracking-wider text-sm bg-white/8 text-white/70 border border-white/10 transition-all hover:bg-white/15 hover:text-white"
              onClick={() => {
                togglePause();
                resetRound();
              }}
            >
              Restart Round
            </button>
            <button
              className="px-8 py-3 clip-angular font-tech font-bold uppercase tracking-wider text-sm bg-white/5 text-white/50 border border-white/5 transition-all hover:bg-white/10 hover:text-white/70"
              onClick={() => {
                togglePause();
                returnToMenu();
              }}
            >
              Exit to Menu
            </button>
          </div>
          <p className="text-[10px] font-tech text-white/20 uppercase tracking-[0.4em]">Press Esc to resume</p>
        </div>
      )}
    </div>
  );
};

export default UI;
