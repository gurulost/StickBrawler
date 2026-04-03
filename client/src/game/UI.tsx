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
import TrainingHud from "./TrainingHud";
import {
  getArcadeEncounter,
  getNextArcadeEncounter,
  resolveArcadeGrade,
} from "./arcadeRun";
import {
  COMBAT_HUD_GRAMMAR_HINT,
  COMBAT_PRIMER_STEPS,
  COMBAT_PRIMER_SUBTITLE,
  COMBAT_PRIMER_TITLE,
  CONTROLLER_CONTROL_CARD,
  getCombatHudLegendLine,
  INTENT_GUIDE,
  KEYBOARD_CONTROL_CARDS,
} from "../input/controlGuide";
import { TRAINING_DRILLS } from "./trainingDrills";
import { useTrainingMode } from "../lib/stores/useTrainingMode";
import { isLiveCombatPhase } from "../lib/stores/useFighting";

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

type PrimerProgress = Record<(typeof COMBAT_PRIMER_STEPS)[number]["id"], boolean>;

const createPrimerProgress = (): PrimerProgress => ({
  move: false,
  attack: false,
  defend: false,
  grab: false,
});

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
    continueArcade,
    returnToMenu,
    calculateFinalScore,
    submitScore,
    playerStatus,
    cpuStatus,
    slots,
    sessionMode,
    arcadeRun,
    currentGameScore,
    paused,
    togglePause,
    runtimeResetNonce,
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
    combatPrimerDismissed,
    dismissCombatPrimer,
  } = useControls();
  const clearReviewFrame = useCombatDebug((state) => state.clearReviewFrame);
  const trainingAdvancedMode = useTrainingMode((state) => state.advancedMode);
  const trainingCurrentDrillIndex = useTrainingMode((state) => state.currentDrillIndex);
  const trainingCompletedDrillIds = useTrainingMode((state) => state.completedDrillIds);
  const { coins, lastCoinEvent } = useCustomization();
  const landingBurst = useEffects((state) => state.landingBurst);
  const impactFlash = useEffects((state) => state.impactFlash);
  const isTrainingMode = gamePhase === "training";
  const isActiveCombat = isLiveCombatPhase(gamePhase);
  const showCombatInspector = debugMode || (isTrainingMode && trainingAdvancedMode);
  const isLocalMultiplayer = slots.player2.type === "human";
  const isArcadeMode = sessionMode === "arcade";
  const currentArcadeEncounter = getArcadeEncounter(arcadeRun);
  const nextArcadeEncounter = getNextArcadeEncounter(arcadeRun);
  const arcadeClearedCount = arcadeRun?.clearedEncounterIds.length ?? 0;
  const arcadeTotalEncounters = arcadeRun?.encounters.length ?? 0;
  const arcadeGrade = resolveArcadeGrade(
    currentGameScore,
    arcadeClearedCount,
    arcadeTotalEncounters,
  );
  const playerOneLabel = slots.player1.label;
  const opponentLabel = slots.player2.label;
  const playerOneBadge = slots.player1.type === "human" ? "Human" : "CPU";
  const opponentBadge = slots.player2.type === "human" ? "Human" : "CPU";
  const timerSubtitle = isTrainingMode
    ? `Training Dojo · ${trainingCompletedDrillIds.length}/${TRAINING_DRILLS.length} Clear`
    : isArcadeMode && currentArcadeEncounter
      ? `Arcade · Fight ${arcadeRun!.currentEncounterIndex + 1}/${arcadeRun!.encounters.length} · ${currentArcadeEncounter.title}`
    : isLocalMultiplayer
      ? "Local Versus"
      : "Solo vs CPU";
  const playerSpecialReady = player.specialMeter >= 100;
  const cpuSpecialReady = cpu.specialMeter >= 100;
  const playerGuardCritical = player.guardMeter > 0 && player.guardMeter <= 20;
  const cpuGuardCritical = cpu.guardMeter > 0 && cpu.guardMeter <= 20;
  const primerCards = isLocalMultiplayer ? KEYBOARD_CONTROL_CARDS : [KEYBOARD_CONTROL_CARDS[0]];
  const showCombatPrimer = gamePhase === "fighting" && !paused && !combatPrimerDismissed;
  const combatHudLegendLines = isLocalMultiplayer
    ? [getCombatHudLegendLine("player1"), getCombatHudLegendLine("player2")]
    : [getCombatHudLegendLine("player1")];

  // Animation states for UI elements
  const [showControls, setShowControls] = useState(false);
  const [pulseHealth, setPulseHealth] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [coinFlash, setCoinFlash] = useState<string | null>(null);
  const [playerGuardFlash, setPlayerGuardFlash] = useState(false);
  const [cpuGuardFlash, setCpuGuardFlash] = useState(false);
  const [telemetrySummary, setTelemetrySummary] = useState<TelemetryDigest>({});
  const [primerProgress, setPrimerProgress] = useState<PrimerProgress>(createPrimerProgress);
  const primerCoreComplete =
    primerProgress.move && primerProgress.attack && primerProgress.defend;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timerValue = isTrainingMode
    ? `${trainingCurrentDrillIndex + 1}/${TRAINING_DRILLS.length}`
    : formatTime(roundTime);
  const shouldSubmitScore =
    gamePhase === "match_end" &&
    !scoreSubmitted &&
    (!isArcadeMode ||
      arcadeRun?.status === "won" ||
      arcadeRun?.status === "lost");

  const resolveBindingLabel = (
    card: (typeof KEYBOARD_CONTROL_CARDS)[number],
    description: string,
  ) => card.bindings.find((binding) => binding.description === description)?.keys.join(" / ") ?? "—";

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
  const arcadeCanAdvance =
    isArcadeMode && gamePhase === "match_end" && arcadeRun?.status === "between_fights";
  const arcadeRunResolved =
    isArcadeMode &&
    gamePhase === "match_end" &&
    (arcadeRun?.status === "won" || arcadeRun?.status === "lost");
  const matchOverlayLabel = isArcadeMode
    ? arcadeRun?.status === "between_fights"
      ? "Fight Cleared"
      : arcadeRun?.status === "won"
        ? "Gauntlet Cleared"
        : arcadeRun?.status === "lost"
          ? "Run Over"
          : "Match Complete"
    : "Match Complete";

  // Play win sound effect and submit score
  useEffect(() => {
    if (shouldSubmitScore) {
      if (player.health > cpu.health) {
        playSuccess();
      }

      const finalScore = calculateFinalScore();
      if (finalScore > 0) {
        submitScore(finalScore);
        setScoreSubmitted(true);
      }
    }
  }, [
    shouldSubmitScore,
    player.health,
    cpu.health,
    playSuccess,
    calculateFinalScore,
    submitScore,
  ]);

  // Reset score submission flag when starting new game
  useEffect(() => {
    if (isActiveCombat) {
      setScoreSubmitted(false);
    }
  }, [isActiveCombat]);

  useEffect(() => {
    if (!lastCoinEvent || lastCoinEvent.direction !== "credit") return;
    setCoinFlash(`+${lastCoinEvent.amount}`);
    const timeout = setTimeout(() => setCoinFlash(null), 1500);
    return () => clearTimeout(timeout);
  }, [lastCoinEvent]);
  useEffect(() => {
    if (!showCombatInspector) return;
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
  }, [showCombatInspector]);

  useEffect(() => {
    if (showCombatInspector) return;
    clearReviewFrame();
  }, [clearReviewFrame, showCombatInspector]);

  useEffect(() => {
    setPrimerProgress(createPrimerProgress());
  }, [gamePhase, runtimeResetNonce]);

  useEffect(() => {
    if (!isActiveCombat) return;
    setPrimerProgress((current) => ({
      move:
        current.move ||
        Math.abs(player.velocity[0]) > 0.24 ||
        Math.abs(player.velocity[2]) > 0.05 ||
        Boolean(player.isJumping || player.inAir),
      attack:
        current.attack ||
        Boolean(player.isAttacking || player.isAirAttacking || player.justStartedMove),
      defend:
        current.defend ||
        Boolean(player.isBlocking || player.justParried || player.isDodging),
      grab: current.grab || Boolean(player.isGrabbing),
    }));
  }, [
    gamePhase,
    player.inAir,
    player.isAirAttacking,
    player.isAttacking,
    player.isBlocking,
    player.isDodging,
    player.isGrabbing,
    player.isJumping,
    player.justParried,
    player.justStartedMove,
    player.velocity,
    isActiveCombat,
  ]);

  useEffect(() => {
    if (!showCombatPrimer || !primerCoreComplete) return;
    const timeout = setTimeout(() => dismissCombatPrimer(), 7000);
    return () => clearTimeout(timeout);
  }, [dismissCombatPrimer, primerCoreComplete, showCombatPrimer]);

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

  const topHudButtonBase =
    "clip-angular-sm border border-white/15 bg-black/60 text-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur-md";
  const topHudButtonInteractive =
    `${topHudButtonBase} hover:bg-black/80 hover:text-white`;

  const renderMeter = (label: string, value: number, colorClass: string, glowColor: string) => (
    <div className="mt-1.5">
      <div className="flex justify-between text-[10px] font-tech uppercase tracking-wider">
        <span className="text-white/60">{label}</span>
        <span className="text-white/70 font-semibold">{Math.round(value)}</span>
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
      <div
        className="absolute top-3 left-3 pointer-events-auto z-20 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-start gap-1.5 rounded-sm p-1.5"
        style={{
          background: "linear-gradient(135deg, rgba(6, 10, 20, 0.84), rgba(16, 20, 34, 0.72))",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.28)",
        }}
      >
        {isActiveCombat && (
          <button
            onClick={() => togglePause()}
            className={`px-3 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider transition ${
              paused
                ? "clip-angular-sm border border-[#39ff14]/40 bg-[#39ff14] text-black shadow-[0_0_12px_rgba(57,255,20,0.4)]"
                : topHudButtonInteractive
            }`}
          >
            {paused ? "Resume" : "Pause"}
          </button>
        )}
        <MusicToggle className={topHudButtonInteractive} />
        <button
          onClick={toggleSilhouetteDebug}
          className={`px-2.5 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider transition ${
            showSilhouetteDebug
              ? "clip-angular-sm border border-[#b347ff]/50 bg-[#b347ff]/28 text-white shadow-[0_0_18px_rgba(179,71,255,0.25)]"
              : topHudButtonInteractive
          }`}
          title="Toggle spline/outline debug overlay"
        >
          {showSilhouetteDebug ? "Spline" : "Spline"}
        </button>
        <button
          onClick={cycleInkQuality}
          className={`px-2.5 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider transition ${topHudButtonInteractive}`}
          title="Cycle ink material quality/perf profile"
        >
          Ink: {inkQuality === "cinematic" ? "Cine" : inkQuality === "balanced" ? "Bal" : "Perf"}
        </button>
        <button
          onClick={toggleControls}
          className={`px-2.5 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider transition ${topHudButtonInteractive}`}
        >
          Controls
        </button>
        {process.env.NODE_ENV === 'development' && (
          <>
            <button
              onClick={toggleDebugMode}
              className="clip-angular-sm border border-[#ff2d7b]/35 bg-[#ff2d7b]/75 px-2.5 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider text-white shadow-lg hover:bg-[#ff2d7b]/90"
            >
              {debugMode ? "Debug On" : "Debug Off"}
            </button>
            <button
              onClick={toggleLowGraphicsMode}
              className="clip-angular-sm border border-[#b347ff]/35 bg-[#b347ff]/70 px-2.5 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider text-white shadow-lg hover:bg-[#b347ff]/85"
            >
              {lowGraphicsMode ? "Low Gfx" : "Full Gfx"}
            </button>
          </>
        )}
        {showCombatInspector && isActiveCombat && (
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
              className={`px-2.5 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider transition ${topHudButtonInteractive}`}
            >
              {combatPlaybackPaused ? "Sim Play" : "Sim Pause"}
            </button>
            <button
              onClick={() => setCombatPlaybackRate(combatPlaybackRate === 1 ? 0.25 : 1)}
              className={`px-2.5 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider transition ${topHudButtonInteractive}`}
            >
              {combatPlaybackRate === 1 ? "1x" : "0.25x"}
            </button>
            <button
              onClick={() => {
                setCombatPlaybackPaused(true);
                clearReviewFrame();
                queueCombatFrameStep();
              }}
              className={`px-2.5 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider transition ${topHudButtonInteractive}`}
            >
              Step
            </button>
          </>
        )}
        {isActiveCombat && (
          <>
            {combatHudLegendLines.map((line) => (
              <div
                key={line.slot}
                className="clip-angular-sm border border-white/8 bg-black/24 px-2.5 py-1 text-[9px] font-tech uppercase tracking-[0.16em] text-white/72"
              >
                <span className="text-white/42">{line.title}</span>{" "}
                <span>{line.summary}</span>
              </div>
            ))}
            <div className="clip-angular-sm border border-white/8 bg-black/18 px-2.5 py-1 text-[9px] font-tech text-white/48">
              {COMBAT_HUD_GRAMMAR_HINT}
            </div>
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
      {showCombatInspector && (
        <CombatDebugPanel
          player={player}
          cpu={cpu}
          playerLabel={playerOneLabel}
          cpuLabel={opponentLabel}
          gamePhase={gamePhase}
        />
      )}
      {isTrainingMode && <TrainingHud />}

      {/* ═══════════════════════════════════════════
          ─── HEALTH BARS & STATUS PANELS ───
          ═══════════════════════════════════════════ */}
      <div className="flex justify-between items-start gap-3 px-4 pt-12">
        {/* Player 1 Health Panel */}
        <div
          className={`flex-1 max-w-[39%] relative overflow-hidden transition-all duration-300 ${
            playerSpecialReady
              ? "neon-glow-cyan"
              : ""
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.08), rgba(10, 10, 15, 0.9))',
            border: playerSpecialReady ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
            clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
            padding: '10px 12px',
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
          className="flex flex-col items-center px-4 py-1.5 relative"
          style={{
            background: 'linear-gradient(180deg, rgba(10, 10, 15, 0.9), rgba(26, 26, 46, 0.7))',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, calc(100% - 12px) 100%, 12px 100%, 0 100%, 0 12px)',
          }}
        >
          <div className="absolute top-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <span className="font-tech text-xl font-bold text-white tracking-wider tabular-nums">{timerValue}</span>
          <span className="text-[9px] font-tech tracking-[0.3em] text-white/80 uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">{timerSubtitle}</span>
          {isArcadeMode && currentGameScore > 0 && (
            <span className="mt-0.5 text-[9px] font-tech tracking-[0.25em] text-[#ffe600]/85 uppercase">
              Score {currentGameScore.toLocaleString()}
            </span>
          )}
        </div>

        {/* Player 2 / CPU Health Panel */}
        <div
          className={`flex-1 max-w-[39%] relative overflow-hidden transition-all duration-300 ${
            cpuSpecialReady
              ? "neon-glow-magenta"
              : ""
          }`}
          style={{
            background: 'linear-gradient(225deg, rgba(255, 45, 123, 0.08), rgba(10, 10, 15, 0.9))',
            border: cpuSpecialReady ? '1px solid rgba(255, 45, 123, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
            clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
            padding: '10px 12px',
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
      {!isTrainingMode && (
        <div className="absolute top-[102px] left-0 w-full text-center">
          <div
            className="inline-flex items-center gap-2.5 px-5 py-1"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(10, 10, 15, 0.8), transparent)',
            }}
          >
            <span className="text-[10px] font-tech uppercase tracking-widest text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">{playerOneLabel}</span>
            <span className={`font-tech text-lg font-bold ${playerScore > cpuScore ? 'text-[#00f0ff] neon-text-cyan' : 'text-white/60'}`}>{playerScore}</span>
            <span className="text-white/15 font-tech">|</span>
            <span className={`font-tech text-lg font-bold ${cpuScore > playerScore ? 'text-[#ff2d7b] neon-text-magenta' : 'text-white/60'}`}>{cpuScore}</span>
            <span className="text-[10px] font-tech uppercase tracking-widest text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">{opponentLabel}</span>
          </div>
        </div>
      )}

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

      {showCombatPrimer && (
        <div className="absolute left-4 bottom-20 z-20 max-w-[360px] pointer-events-auto">
          <div
            className="overflow-hidden border border-white/10 bg-[linear-gradient(145deg,rgba(9,13,22,0.96),rgba(15,20,34,0.9))] shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur-md"
            style={{
              clipPath:
                "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 16px 100%, 0 calc(100% - 16px))",
            }}
          >
            <div className="h-[2px] bg-gradient-to-r from-[#00f0ff] via-[#b347ff] to-[#ff2d7b]" />
            <div className="px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-tech text-[10px] font-bold uppercase tracking-[0.28em] text-[#00f0ff]">
                    {COMBAT_PRIMER_TITLE}
                  </div>
                  <div className="mt-1 max-w-[280px] text-[10px] leading-4 text-white/68">
                    {COMBAT_PRIMER_SUBTITLE}
                  </div>
                </div>
                <button
                  onClick={dismissCombatPrimer}
                  className="clip-angular-sm border border-white/12 bg-white/6 px-2 py-1 text-[10px] font-tech uppercase tracking-[0.2em] text-white/70 transition hover:bg-white/12 hover:text-white"
                >
                  Hide
                </button>
              </div>

              <div className="mt-3 space-y-1.5">
                {primerCards.map((card) => (
                  <div
                    key={`primer-${card.title}`}
                    className="rounded-sm border border-white/8 bg-black/20 px-2.5 py-2"
                  >
                    <div className="font-tech text-[10px] font-bold uppercase tracking-[0.22em] text-white/88">
                      {card.title}
                    </div>
                    <div className="mt-1 text-[10px] leading-4 text-white/62">
                      {card.subtitle}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/74">
                      <span>
                        <span className="text-white/42">Jump</span>: {resolveBindingLabel(card, "Jump")}
                      </span>
                      <span>
                        <span className="text-white/42">Attack</span>: {resolveBindingLabel(card, "Attack")}
                      </span>
                      <span>
                        <span className="text-white/42">Defend</span>: {resolveBindingLabel(card, "Defend")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 space-y-1.5">
                {COMBAT_PRIMER_STEPS.map((step) => {
                  const complete = primerProgress[step.id];
                  return (
                    <div
                      key={step.id}
                      className={`rounded-sm border px-2.5 py-2 transition ${
                        complete
                          ? "border-[#39ff14]/30 bg-[#39ff14]/8"
                          : "border-white/8 bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-tech text-[10px] font-bold uppercase tracking-[0.22em] text-white/88">
                          {step.title}
                        </div>
                        <span
                          className={`font-tech text-[9px] uppercase tracking-[0.18em] ${
                            complete ? "text-[#39ff14]" : "text-white/36"
                          }`}
                        >
                          {complete ? "Done" : step.id === "grab" ? "Bonus" : "Try it"}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] leading-4 text-white/76">
                        {step.prompt}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-white/8 pt-2.5">
                <div className="text-[10px] text-white/56">
                  {primerCoreComplete
                    ? "Basics covered. The primer will clear after a few seconds."
                    : "Land the first three steps and the primer will get out of the way."}
                </div>
                <button
                  onClick={() => setShowControls(true)}
                  className="clip-angular-sm border border-[#00f0ff]/20 bg-[#00f0ff]/10 px-3 py-1.5 text-[10px] font-tech uppercase tracking-[0.2em] text-[#c8fbff] transition hover:bg-[#00f0ff]/18"
                >
                  Full Controls
                </button>
              </div>
            </div>
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
            <div className="mb-3 text-[10px] font-tech uppercase tracking-[0.5em] text-white/50">
              {matchOverlayLabel}
            </div>
            <div className="text-5xl font-display mb-6 animate-slide-up">
              {playerWon ? (
                <span className="neon-text-cyan">{winnerMessage}</span>
              ) : (
                <span className="neon-text-magenta">{winnerMessage}</span>
              )}
            </div>

            <div className="font-tech text-2xl text-white/80 mb-3 tracking-wider">
              <span className="text-[#00f0ff]">{playerScore}</span>
              <span className="text-white/30 mx-3">|</span>
              <span className="text-[#ff2d7b]">{cpuScore}</span>
            </div>
            <div className="font-tech text-xs uppercase tracking-[0.4em] text-[#ffe600] mb-10">
              Score {calculateFinalScore().toLocaleString()}
            </div>
            {isArcadeMode && arcadeRun && (
              <div className="mb-8 max-w-xl text-center space-y-2">
                <div className="text-[10px] font-tech uppercase tracking-[0.32em] text-white/55">
                  Cleared {arcadeClearedCount}/{arcadeTotalEncounters} fights · Grade {arcadeGrade}
                </div>
                {arcadeRun.lastMatchScore > 0 && (
                  <div className="text-sm font-tech text-[#ffe600]/85">
                    Last clear +{arcadeRun.lastMatchScore.toLocaleString()}
                  </div>
                )}
                {arcadeCanAdvance && nextArcadeEncounter && (
                  <div className="text-xs text-white/60">
                    Next fight: <span className="text-white">{nextArcadeEncounter.title}</span> on{" "}
                    <span className="text-white">{nextArcadeEncounter.arenaId}</span>.
                  </div>
                )}
                {arcadeRunResolved && currentArcadeEncounter && (
                  <div className="text-xs text-white/60">
                    {arcadeRun.status === "won"
                      ? "The gauntlet is clear. Restart the run or head back to the menu."
                      : `You were stopped on ${currentArcadeEncounter.title}. Restart the run to take another shot.`}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              {arcadeCanAdvance ? (
                <button
                  className="font-tech font-bold uppercase tracking-wider text-sm px-8 py-3 clip-angular text-black transition-all hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #39ff14, #00f0ff)",
                    boxShadow: "0 0 20px rgba(57, 255, 20, 0.3)",
                  }}
                  onClick={continueArcade}
                >
                  Next Fight
                </button>
              ) : (
                <button
                  className="font-tech font-bold uppercase tracking-wider text-sm px-8 py-3 clip-angular text-black transition-all hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #39ff14, #00f0ff)",
                    boxShadow: "0 0 20px rgba(57, 255, 20, 0.3)",
                  }}
                  onClick={restartMatch}
                >
                  {isArcadeMode ? "Restart Gauntlet" : "Run It Back"}
                </button>
              )}

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
            maxWidth: "360px",
            maxHeight: "calc(100vh - 9rem)",
            overflowY: "auto",
            background: 'linear-gradient(135deg, rgba(18, 18, 26, 0.95), rgba(10, 10, 15, 0.98))',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
          }}
        >
          <div className="absolute top-0 left-0 right-3 h-[1px] bg-gradient-to-r from-[#00f0ff]/40 to-transparent" />
          <div className="font-bold text-sm mb-3 border-b border-white/5 pb-2 text-white uppercase tracking-wider">Controls</div>
          <div className="space-y-4">
            {KEYBOARD_CONTROL_CARDS.map((card) => (
              <div key={card.title}>
                <div className="font-semibold text-[#00f0ff] text-[10px] uppercase tracking-widest mb-1">{card.title}</div>
                <div className="mb-2 text-[10px] text-white/45">{card.subtitle}</div>
                <div className="space-y-1.5">
                  {card.bindings.map((binding) => (
                    <div key={`${card.title}-${binding.description}`} className="flex items-center gap-2 text-xs text-white/70">
                      <span className="min-w-[132px] text-white/40">{binding.description}</span>
                      <span>{binding.keys.join(" / ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div>
              <div className="font-semibold text-[#ff2d7b] text-[10px] uppercase tracking-widest mb-1">{CONTROLLER_CONTROL_CARD.title}</div>
              <div className="mb-2 text-[10px] text-white/45">{CONTROLLER_CONTROL_CARD.subtitle}</div>
              <div className="space-y-1.5">
                {CONTROLLER_CONTROL_CARD.bindings.map((binding) => (
                  <div key={`controller-${binding.description}`} className="flex items-center gap-2 text-xs text-white/70">
                    <span className="min-w-[132px] text-white/40">{binding.description}</span>
                    <span>{binding.keys.join(" / ")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="font-semibold text-[#b347ff] text-[10px] uppercase tracking-widest mb-1">How to Fight</div>
              <div className="space-y-2">
                {INTENT_GUIDE.map((lesson) => (
                  <div key={lesson.title}>
                    <div className="text-[10px] font-semibold text-white/75">{lesson.title}</div>
                    <div className="text-[10px] text-white/55">{lesson.description}</div>
                  </div>
                ))}
              </div>
            </div>
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
      {paused && isActiveCombat && (
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
              {isTrainingMode ? "Reset Drill" : "Restart Round"}
            </button>
            <button
              className="px-8 py-3 clip-angular font-tech font-bold uppercase tracking-wider text-sm bg-white/5 text-white/60 border border-white/10 transition-all hover:bg-white/10 hover:text-white/80"
              onClick={() => {
                togglePause();
                returnToMenu();
              }}
            >
              Exit to Menu
            </button>
          </div>
          <p className="text-[10px] font-tech text-white/40 uppercase tracking-[0.4em]">Press Esc to resume</p>
        </div>
      )}
    </div>
  );
};

export default UI;
