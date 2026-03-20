import type { FC } from "react";
import { useMemo } from "react";
import type { GamePhase } from "../lib/stores/useFighting";
import type { CharacterState } from "../lib/stores/useFighting";
import { useControls } from "../lib/stores/useControls";
import {
  COMBAT_TRAINING_PRESET_ORDER,
  COMBAT_TRAINING_PRESETS,
  describeCombatTrainingRun,
  matchesCombatTrainingFighter,
} from "../lib/combatTraining";
import {
  resolveCombatDebugReviewRecord,
  useCombatDebug,
} from "../lib/stores/useCombatDebug";
import CombatTimelineOverlay from "./CombatTimelineOverlay";
import {
  resolveFocusedCombatSlot,
  resolveRecentCombatEvents,
} from "./combatDebug";

interface CombatDebugPanelProps {
  player: CharacterState;
  cpu: CharacterState;
  playerLabel: string;
  cpuLabel: string;
  gamePhase: GamePhase;
}

const buttonClass = (active: boolean) =>
  `rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
    active
      ? "border-white/45 bg-white/18 text-white"
      : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
  }`;

const toneClass: Record<"hit" | "block" | "parry" | "system", string> = {
  hit: "border-rose-200/40 bg-rose-400/12 text-rose-100",
  block: "border-sky-200/35 bg-sky-400/10 text-sky-100",
  parry: "border-amber-200/40 bg-amber-300/10 text-amber-100",
  system: "border-white/10 bg-white/5 text-slate-200",
};

const formatReviewLabel = (frameDelta: number, roundTime: number) => {
  const ageMs = Math.max(0, (frameDelta / 60) * 1000);
  const ageLabel = ageMs < 1000 ? `-${Math.round(ageMs)}ms` : `-${(ageMs / 1000).toFixed(2)}s`;
  return `Review ${ageLabel} · ${Math.floor(roundTime / 60)}:${Math.floor(roundTime % 60)
    .toString()
    .padStart(2, "0")}`;
};

const CombatDebugPanel: FC<CombatDebugPanelProps> = ({
  player,
  cpu,
  playerLabel,
  cpuLabel,
  gamePhase,
}) => {
  const focus = useControls((state) => state.combatDebugFocus);
  const setFocus = useControls((state) => state.setCombatDebugFocus);
  const showHurtboxes = useControls((state) => state.combatDebugShowHurtboxes);
  const toggleShowHurtboxes = useControls((state) => state.toggleCombatDebugShowHurtboxes);
  const showHitboxes = useControls((state) => state.combatDebugShowHitboxes);
  const toggleShowHitboxes = useControls((state) => state.toggleCombatDebugShowHitboxes);
  const showSockets = useControls((state) => state.combatDebugShowSockets);
  const toggleShowSockets = useControls((state) => state.toggleCombatDebugShowSockets);
  const showActiveHitbox = useControls((state) => state.combatDebugShowActiveHitbox);
  const toggleShowActiveHitbox = useControls((state) => state.toggleCombatDebugShowActiveHitbox);
  const showFrameData = useControls((state) => state.combatDebugShowFrameData);
  const toggleShowFrameData = useControls((state) => state.toggleCombatDebugShowFrameData);
  const showPhaseData = useControls((state) => state.combatDebugShowPhaseData);
  const toggleShowPhaseData = useControls((state) => state.toggleCombatDebugShowPhaseData);
  const showInstanceData = useControls((state) => state.combatDebugShowInstanceData);
  const toggleShowInstanceData = useControls((state) => state.toggleCombatDebugShowInstanceData);
  const setCombatPlaybackPaused = useControls((state) => state.setCombatPlaybackPaused);
  const combatTrainingTargetSlot = useControls((state) => state.combatTrainingTargetSlot);
  const setCombatTrainingTargetSlot = useControls((state) => state.setCombatTrainingTargetSlot);
  const combatTrainingActiveRun = useControls((state) => state.combatTrainingActiveRun);
  const queueCombatTrainingPreset = useControls((state) => state.queueCombatTrainingPreset);
  const clearCombatTraining = useControls((state) => state.clearCombatTraining);
  const history = useCombatDebug((state) => state.history);
  const reviewFrameId = useCombatDebug((state) => state.reviewFrameId);
  const setReviewFrameId = useCombatDebug((state) => state.setReviewFrameId);
  const stepReviewFrame = useCombatDebug((state) => state.stepReviewFrame);
  const clearReviewFrame = useCombatDebug((state) => state.clearReviewFrame);

  const reviewRecord = useMemo(
    () => resolveCombatDebugReviewRecord(history, reviewFrameId),
    [history, reviewFrameId],
  );
  const inspectedPlayer = reviewRecord?.player ?? player;
  const inspectedCpu = reviewRecord?.cpu ?? cpu;
  const reviewIndex = useMemo(
    () => (reviewFrameId == null ? history.length - 1 : history.findIndex((entry) => entry.id === reviewFrameId)),
    [history, reviewFrameId],
  );
  const focusedSlot = resolveFocusedCombatSlot(inspectedPlayer, inspectedCpu, focus);
  const focusedFighter = focusedSlot === "player" ? inspectedPlayer : inspectedCpu;
  const focusedLabel = focusedSlot === "player" ? playerLabel : cpuLabel;
  const focusedAccent = focusedSlot === "player" ? "#60a5fa" : "#fb923c";
  const reviewLabel = useMemo(() => {
    if (!reviewRecord || !history.length) return undefined;
    const reviewIndex = history.findIndex((entry) => entry.id === reviewRecord.id);
    const frameDelta = reviewIndex === -1 ? 0 : history.length - 1 - reviewIndex;
    return formatReviewLabel(frameDelta, reviewRecord.roundTimeRemaining);
  }, [history, reviewRecord]);
  const recentEvents = useMemo(
    () => resolveRecentCombatEvents(focusedSlot, history),
    [focusedSlot, history],
  );
  const trainingSummary = useMemo(
    () => describeCombatTrainingRun(combatTrainingActiveRun),
    [combatTrainingActiveRun],
  );
  const trainingTargetLabel = combatTrainingTargetSlot === "player1" ? playerLabel : cpuLabel;
  const trainingTargetFighterId = combatTrainingTargetSlot === "player1" ? player.fighterId : cpu.fighterId;
  const canReview =
    history.length > 1 && (gamePhase === "fighting" || gamePhase === "round_end" || gamePhase === "match_end");

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex max-w-[min(1100px,92vw)] flex-col gap-3 pointer-events-auto">
      <div className="rounded-2xl border border-white/10 bg-slate-950/78 p-4 shadow-[0_18px_48px_rgba(2,6,23,0.45)] backdrop-blur-md">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-200/80">
              Combat Inspector
            </div>
            <div className="mt-1 text-sm text-slate-300">
              Answer hit, whiff, and block questions from the same runtime truth the fight uses.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["auto", "player", "cpu"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFocus(value)}
                className={buttonClass(focus === value)}
              >
                Focus {value}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 grid gap-2 md:grid-cols-2">
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Overlay Layers
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={toggleShowHurtboxes} className={buttonClass(showHurtboxes)}>Hurtboxes</button>
              <button type="button" onClick={toggleShowHitboxes} className={buttonClass(showHitboxes)}>Hitboxes</button>
              <button type="button" onClick={toggleShowSockets} className={buttonClass(showSockets)}>Sockets</button>
              <button type="button" onClick={toggleShowActiveHitbox} className={buttonClass(showActiveHitbox)}>Active</button>
              <button type="button" onClick={toggleShowFrameData} className={buttonClass(showFrameData)}>Frame</button>
              <button type="button" onClick={toggleShowPhaseData} className={buttonClass(showPhaseData)}>Phase</button>
              <button type="button" onClick={toggleShowInstanceData} className={buttonClass(showInstanceData)}>Instance</button>
            </div>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Review Buffer
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearReviewFrame();
                }}
                className={buttonClass(reviewFrameId === null)}
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => {
                  setCombatPlaybackPaused(true);
                  if (reviewFrameId === null && history.length) {
                    setReviewFrameId(history[Math.max(0, history.length - 2)]?.id ?? null);
                    return;
                  }
                  stepReviewFrame(-1);
                }}
                disabled={!canReview}
                className={buttonClass(false)}
              >
                -1f
              </button>
              <button
                type="button"
                onClick={() => {
                  setCombatPlaybackPaused(true);
                  stepReviewFrame(1);
                }}
                disabled={!canReview || reviewFrameId === null}
                className={buttonClass(false)}
              >
                +1f
              </button>
              <span className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                {history.length ? `${Math.min(10, (history.length / 60)).toFixed(1)}s cached` : "warming"}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, history.length - 1)}
              step={1}
              value={Math.max(0, reviewIndex)}
              disabled={!canReview}
              onChange={(event) => {
                const nextIndex = Number(event.target.value);
                setCombatPlaybackPaused(true);
                setReviewFrameId(history[nextIndex]?.id ?? null);
              }}
              className="mt-3 w-full accent-cyan-300"
            />
          </div>
        </div>

        <div className="mb-3 rounded-2xl border border-white/8 bg-slate-900/55 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                Training Injector
              </div>
              <div className="mt-1 text-xs text-slate-300">
                Queue deterministic input scripts through the same runtime input and intent path the fight uses.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCombatTrainingTargetSlot("player1")}
                className={buttonClass(combatTrainingTargetSlot === "player1")}
              >
                Target {playerLabel}
              </button>
              <button
                type="button"
                onClick={() => setCombatTrainingTargetSlot("player2")}
                className={buttonClass(combatTrainingTargetSlot === "player2")}
              >
                Target {cpuLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearReviewFrame();
                  clearCombatTraining();
                }}
                className={buttonClass(false)}
              >
                Clear Queue
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
            {trainingSummary ? (
              <span className="font-mono text-[11px] text-white/90">
                {trainingSummary.label} · {trainingSummary.slot === "player1" ? playerLabel : cpuLabel} · {trainingSummary.stepLabel} · frame {trainingSummary.frameNumber + 1}/{trainingSummary.totalFrames}
              </span>
            ) : (
              <span>
                No script queued. Use <span className="font-semibold text-white">{trainingTargetLabel}</span> with Sim Pause + Step or <span className="font-mono text-[11px] text-white/90">window.runCombatTrainingPreset(...)</span>.
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {COMBAT_TRAINING_PRESET_ORDER.map((presetId) => {
              const preset = COMBAT_TRAINING_PRESETS[presetId];
              const allowed = matchesCombatTrainingFighter(preset.fighter, trainingTargetFighterId);
              const active = trainingSummary?.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={!allowed}
                  title={allowed ? preset.description : `${preset.label} only applies to the current ${preset.fighter} slice.`}
                  onClick={() => {
                    clearReviewFrame();
                    queueCombatTrainingPreset(preset.id, combatTrainingTargetSlot);
                  }}
                  className={`${buttonClass(active)} text-left ${allowed ? "" : "cursor-not-allowed opacity-40"}`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-white/8 bg-slate-900/55 p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Recent Events
            </div>
            <div className="space-y-2">
              {recentEvents.length > 0 ? (
                recentEvents.map((entry) => (
                  <div
                    key={entry.key}
                    className={`rounded-xl border px-3 py-2 text-xs ${toneClass[entry.tone]}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold uppercase tracking-[0.18em]">{entry.label}</span>
                      <span className="font-mono text-[10px] text-white/70">{entry.ageLabel}</span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-white/90">{entry.detail}</div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-4 text-xs text-slate-400">
                  No recent combat events yet.
                </div>
              )}
            </div>
          </div>

          <CombatTimelineOverlay
            fighter={focusedFighter}
            slot={focusedSlot}
            label={focusedLabel}
            accent={focusedAccent}
            history={history}
            reviewLabel={reviewLabel}
          />
        </div>
      </div>
    </div>
  );
};

export default CombatDebugPanel;
