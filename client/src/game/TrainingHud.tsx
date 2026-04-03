import { useEffect } from "react";

import { PLAYER_KEYBOARD_HINTS } from "../input/controlGuide";
import { useControls } from "../lib/stores/useControls";
import { useFighting } from "../lib/stores/useFighting";
import { useTrainingMode } from "../lib/stores/useTrainingMode";
import { useCombatDebug } from "../lib/stores/useCombatDebug";
import {
  TRAINING_DRILLS,
  resolveTrainingDrillComplete,
} from "./trainingDrills";

const drillButtonClass = (active: boolean, complete: boolean) =>
  `clip-angular-sm border px-2.5 py-1.5 text-[10px] font-tech font-bold uppercase tracking-[0.16em] transition ${
    active
      ? "border-[#00f0ff]/40 bg-[#00f0ff]/12 text-[#00f0ff] shadow-[0_0_12px_rgba(0,240,255,0.18)]"
      : complete
        ? "border-[#39ff14]/25 bg-[#39ff14]/8 text-[#39ff14]"
        : "border-white/10 bg-white/[0.04] text-white/58 hover:bg-white/[0.08] hover:text-white/78"
  }`;

const actionButtonClass =
  "clip-angular-sm border border-white/12 bg-white/[0.05] px-3 py-2 text-[10px] font-tech font-bold uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/[0.09] hover:text-white";

const TrainingHud = () => {
  const gamePhase = useFighting((state) => state.gamePhase);
  const paused = useFighting((state) => state.paused);
  const player = useFighting((state) => state.player);
  const cpu = useFighting((state) => state.cpu);
  const resetRound = useFighting((state) => state.resetRound);
  const returnToMenu = useFighting((state) => state.returnToMenu);

  const combatTrainingActiveRun = useControls((state) => state.combatTrainingActiveRun);
  const queueCombatTrainingSequence = useControls((state) => state.queueCombatTrainingSequence);
  const clearCombatTraining = useControls((state) => state.clearCombatTraining);
  const resetCombatPlayback = useControls((state) => state.resetCombatPlayback);

  const fighterId = useTrainingMode((state) => state.fighterId);
  const currentDrillIndex = useTrainingMode((state) => state.currentDrillIndex);
  const completedDrillIds = useTrainingMode((state) => state.completedDrillIds);
  const advancedMode = useTrainingMode((state) => state.advancedMode);
  const drillResetNonce = useTrainingMode((state) => state.drillResetNonce);
  const completionNonce = useTrainingMode((state) => state.completionNonce);
  const lastCompletedDrillId = useTrainingMode((state) => state.lastCompletedDrillId);
  const selectDrill = useTrainingMode((state) => state.selectDrill);
  const completeCurrentDrill = useTrainingMode((state) => state.completeCurrentDrill);
  const resetCurrentDrill = useTrainingMode((state) => state.resetCurrentDrill);
  const toggleAdvancedMode = useTrainingMode((state) => state.toggleAdvancedMode);

  const clearReviewFrame = useCombatDebug((state) => state.clearReviewFrame);

  const currentDrill = TRAINING_DRILLS[currentDrillIndex] ?? TRAINING_DRILLS[0];
  const currentDrillComplete = completedDrillIds.includes(currentDrill.id);
  const allDrillsComplete = completedDrillIds.length === TRAINING_DRILLS.length;

  const prepareDrillSurface = () => {
    clearReviewFrame();
    clearCombatTraining();
    resetCombatPlayback();
  };

  const moveToDrillIndex = (index: number) => {
    const targetIndex = Math.max(0, Math.min(TRAINING_DRILLS.length - 1, index));
    const targetDrill = TRAINING_DRILLS[targetIndex];
    prepareDrillSurface();
    if (targetIndex === currentDrillIndex) {
      resetCurrentDrill();
    } else {
      selectDrill(targetDrill.id);
    }
    if (!targetDrill.dummySequence) {
      resetRound();
    }
  };

  const resetCurrentDrillFlow = () => {
    prepareDrillSurface();
    resetCurrentDrill();
    if (!currentDrill.dummySequence) {
      resetRound();
    }
  };

  useEffect(() => {
    if (gamePhase !== "training" || currentDrillComplete) return;
    if (!resolveTrainingDrillComplete(currentDrill.id, fighterId, player)) return;
    completeCurrentDrill();
  }, [
    completeCurrentDrill,
    currentDrill.id,
    currentDrillComplete,
    fighterId,
    gamePhase,
    player,
  ]);

  useEffect(() => {
    if (gamePhase !== "training" || paused || !currentDrill.dummySequence || currentDrillComplete) {
      return;
    }
    if (combatTrainingActiveRun) return;
    const dummySequence = currentDrill.dummySequence;
    const timeout = window.setTimeout(() => {
      clearReviewFrame();
      clearCombatTraining();
      resetCombatPlayback();
      resetRound();
      queueCombatTrainingSequence({
        label: dummySequence.label,
        description: dummySequence.description,
        slot: "player2",
        fighter: dummySequence.fighter,
        presetId: `training-${currentDrill.id}-dummy`,
        steps: dummySequence.steps,
      });
    }, currentDrill.autoRepeatDummy ? 320 : 180);
    return () => window.clearTimeout(timeout);
  }, [
    clearCombatTraining,
    clearReviewFrame,
    combatTrainingActiveRun,
    currentDrill.autoRepeatDummy,
    currentDrill.dummySequence,
    currentDrill.id,
    currentDrillComplete,
    drillResetNonce,
    gamePhase,
    paused,
    queueCombatTrainingSequence,
    resetCombatPlayback,
    resetRound,
  ]);

  useEffect(() => {
    if (gamePhase !== "training" || paused || currentDrillComplete) return;
    if (player.health > 0 && cpu.health > 0) return;
    const timeout = window.setTimeout(() => {
      resetCurrentDrillFlow();
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [
    cpu.health,
    currentDrillComplete,
    gamePhase,
    paused,
    player.health,
  ]);

  useEffect(() => {
    if (gamePhase !== "training" || paused) return;
    if (lastCompletedDrillId !== currentDrill.id || allDrillsComplete) return;
    const timeout = window.setTimeout(() => {
      moveToDrillIndex(currentDrillIndex + 1);
    }, 1400);
    return () => window.clearTimeout(timeout);
  }, [
    allDrillsComplete,
    completionNonce,
    currentDrill.id,
    currentDrillIndex,
    gamePhase,
    lastCompletedDrillId,
    paused,
  ]);

  if (gamePhase !== "training") return null;

  return (
    <div className="absolute left-4 bottom-20 z-20 max-w-[min(440px,calc(100vw-2rem))] pointer-events-auto">
      <div
        className="overflow-hidden border border-white/10 bg-[linear-gradient(145deg,rgba(9,13,22,0.96),rgba(15,20,34,0.92))] shadow-[0_22px_44px_rgba(0,0,0,0.44)] backdrop-blur-md"
        style={{
          clipPath:
            "polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 18px 100%, 0 calc(100% - 18px))",
        }}
      >
        <div className="h-[2px] bg-gradient-to-r from-[#39ff14] via-[#00f0ff] to-[#b347ff]" />
        <div className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-tech text-[10px] font-bold uppercase tracking-[0.3em] text-[#39ff14]">
                Training Mode
              </div>
              <div className="mt-1 font-display text-2xl text-white">
                Drill {currentDrillIndex + 1}: {currentDrill.title}
              </div>
              <div className="mt-1 text-[11px] leading-5 text-white/62">
                {currentDrill.summary}
              </div>
            </div>
            <button
              onClick={toggleAdvancedMode}
              className={`clip-angular-sm border px-3 py-1.5 text-[10px] font-tech font-bold uppercase tracking-[0.18em] transition ${
                advancedMode
                  ? "border-[#b347ff]/40 bg-[#b347ff]/14 text-[#b347ff]"
                  : "border-white/10 bg-white/[0.04] text-white/58 hover:text-white/78"
              }`}
            >
              {advancedMode ? "Advanced On" : "Advanced"}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TRAINING_DRILLS.map((drill, index) => {
              const complete = completedDrillIds.includes(drill.id);
              return (
                <button
                  key={drill.id}
                  onClick={() => moveToDrillIndex(index)}
                  className={drillButtonClass(index === currentDrillIndex, complete)}
                >
                  {complete ? "Clear" : `0${index + 1}`} {drill.title}
                </button>
              );
            })}
          </div>

          <div className="mt-4 clip-angular-sm border border-white/8 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="clip-angular-sm border border-[#00f0ff]/22 bg-[#00f0ff]/8 px-2 py-1 text-[10px] font-tech font-bold uppercase tracking-[0.14em] text-[#00f0ff]">
                {currentDrill.inputHint}
              </span>
              {currentDrill.dummySequence && (
                <span className="clip-angular-sm border border-[#ff2d7b]/18 bg-[#ff2d7b]/7 px-2 py-1 text-[10px] font-tech font-bold uppercase tracking-[0.14em] text-[#ff2d7b]">
                  Dummy loops until you land it
                </span>
              )}
            </div>
            <p className="mt-3 text-[12px] leading-5 text-white/78">{currentDrill.prompt}</p>
            <p className="mt-2 text-[11px] leading-5 text-white/48">{currentDrill.coachingNote}</p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
            <div className="clip-angular-sm border border-white/8 bg-black/18 p-3">
              <div className="text-[10px] font-tech font-bold uppercase tracking-[0.22em] text-white/42">
                Core Grammar
              </div>
              <div className="mt-3 space-y-2 text-[11px] text-white/68">
                <div>
                  <span className="text-white/88">Tap Attack</span> opens with jab.
                </div>
                <div>
                  <span className="text-white/88">Forward + Attack</span> changes the move into launcher.
                </div>
                <div>
                  <span className="text-white/88">Tap Defend</span> is parry timing.
                </div>
                <div>
                  <span className="text-white/88">Defend + Left/Right</span> rolls.
                </div>
                <div>
                  <span className="text-white/88">Attack + Defend</span> grabs.
                </div>
              </div>
            </div>

            <div className="clip-angular-sm border border-white/8 bg-black/18 p-3">
              <div className="text-[10px] font-tech font-bold uppercase tracking-[0.22em] text-white/42">
                Bindings
              </div>
              <div className="mt-3 text-[11px] leading-5 text-white/68">
                {PLAYER_KEYBOARD_HINTS.player1}
              </div>
              <div className="mt-3 text-[11px] leading-5 text-white/48">
                Advanced mode opens hitboxes, frame stepping, and the live move timeline for deeper practice.
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => moveToDrillIndex(currentDrillIndex - 1)} className={actionButtonClass}>
              Prev Drill
            </button>
            <button onClick={resetCurrentDrillFlow} className={actionButtonClass}>
              Reset Drill
            </button>
            <button onClick={() => moveToDrillIndex(currentDrillIndex + 1)} className={actionButtonClass}>
              Next Drill
            </button>
            <button
              onClick={() => {
                prepareDrillSurface();
                returnToMenu();
              }}
              className={actionButtonClass}
            >
              Exit Training
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
            <div className="text-[10px] font-tech uppercase tracking-[0.22em] text-white/45">
              {completedDrillIds.length}/{TRAINING_DRILLS.length} drills clear
            </div>
            <div
              className={`clip-angular-sm border px-3 py-1 text-[10px] font-tech font-bold uppercase tracking-[0.18em] ${
                allDrillsComplete
                  ? "border-[#39ff14]/35 bg-[#39ff14]/10 text-[#39ff14]"
                  : currentDrillComplete
                    ? "border-[#00f0ff]/30 bg-[#00f0ff]/10 text-[#00f0ff]"
                    : "border-white/10 bg-white/[0.04] text-white/58"
              }`}
            >
              {allDrillsComplete
                ? "Core Loop Clear"
                : currentDrillComplete
                  ? currentDrill.successLabel
                  : "Live Drill"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingHud;
