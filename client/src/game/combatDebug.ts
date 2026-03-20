import { coreMoves, type FrameWindow, type MoveDefinition } from "../combat";
import type { CombatEvent, FighterRuntimeSlot } from "./combatPresentation";
import type { CharacterState } from "../lib/stores/useFighting";
import type { CombatDebugRecord } from "../lib/stores/useCombatDebug";

export type CombatTimelineLane = "phase" | "cancel" | "armor" | "invuln";

export interface CombatTimelineSegment {
  key: string;
  label: string;
  lane: CombatTimelineLane;
  window: FrameWindow;
}

export interface CombatDebugData {
  frame: number;
  move?: MoveDefinition;
  totalFrames: number;
  activeHitboxes: string[];
  activeSockets: string[];
  segments: CombatTimelineSegment[];
}

export interface CombatTimelineMarker {
  key: string;
  frame: number;
  label: string;
  tone: "hit" | "block" | "parry" | "system";
}

export interface CombatEventLogEntry {
  key: string;
  label: string;
  detail: string;
  ageLabel: string;
  tone: "hit" | "block" | "parry" | "system";
}

const makeSegment = (
  key: string,
  label: string,
  lane: CombatTimelineLane,
  window: FrameWindow,
): CombatTimelineSegment => ({
  key,
  label,
  lane,
  window,
});

export const windowPercent = (
  window: FrameWindow,
  totalFrames: number,
): { left: number; width: number } => {
  const safeTotal = Math.max(1, totalFrames);
  const left = ((window.start - 1) / safeTotal) * 100;
  const width = (Math.max(1, window.end - window.start + 1) / safeTotal) * 100;
  return { left, width };
};

export function resolveCombatDebugData(characterState: CharacterState): CombatDebugData {
  const move = characterState.moveId ? coreMoves[characterState.moveId] : undefined;
  const totalFrames = move?.totalFrames ?? 0;
  const frame = Math.max(0, Math.round(characterState.moveFrame ?? 0));
  const activeHitboxes = move
    ? move.hitboxes
        .filter((hitbox) => frame >= hitbox.frames.start && frame <= hitbox.frames.end)
        .map((hitbox) => hitbox.id)
    : [];
  const activeSockets = move
    ? move.hitboxes
        .filter((hitbox) => frame >= hitbox.frames.start && frame <= hitbox.frames.end)
        .map((hitbox) => hitbox.socket ?? "rightHand")
    : [];
  const segments: CombatTimelineSegment[] = move
    ? [
        makeSegment("startup", "Startup", "phase", move.windows.startup),
        makeSegment("active", "Active", "phase", move.windows.active),
        makeSegment("recovery", "Recovery", "phase", move.windows.recovery),
        ...(move.cancelBranches ?? []).map((branch, index) =>
          makeSegment(`cancel-${index}`, `Cancel → ${branch.to}`, "cancel", branch.window),
        ),
        ...(move.armorFrames ?? []).map((window, index) =>
          makeSegment(`armor-${index}`, "Armor", "armor", window),
        ),
        ...(move.invulnerableFrames ?? []).map((window, index) =>
          makeSegment(`invuln-${index}`, "Invuln", "invuln", window),
        ),
      ]
    : [];

  return {
    frame,
    move,
    totalFrames,
    activeHitboxes,
    activeSockets,
    segments,
  };
}

const scoreFocusedFighter = (fighter: CharacterState) => {
  const moveFrame = fighter.moveFrame ?? 0;
  return (
    (fighter.justParried ? 9 : 0) +
    (fighter.justHit ? 8 : 0) +
    (fighter.justBlocked ? 7 : 0) +
    (fighter.justGuardBroke ? 6 : 0) +
    (fighter.moveId ? 5 : 0) +
    ((fighter.hitstunFrames ?? 0) > 0 ? 4 : 0) +
    ((fighter.blockstunFrames ?? 0) > 0 ? 3 : 0) +
    ((fighter.landingLagFrames ?? 0) > 0 ? 2 : 0) +
    Math.min(1, moveFrame / 1000)
  );
};

export const resolveFocusedCombatSlot = (
  player: CharacterState,
  cpu: CharacterState,
  focus: "auto" | "player" | "cpu",
): FighterRuntimeSlot => {
  if (focus !== "auto") return focus;
  return scoreFocusedFighter(player) >= scoreFocusedFighter(cpu) ? "player" : "cpu";
};

const formatAgeLabel = (ageFrames: number) => {
  if (ageFrames <= 0) return "now";
  const ageMs = (ageFrames / 60) * 1000;
  if (ageMs < 1000) {
    return `-${Math.round(ageMs)}ms`;
  }
  return `-${(ageMs / 1000).toFixed(2)}s`;
};

const buildMoveOutcomeMap = (
  slot: FighterRuntimeSlot,
  history: CombatDebugRecord[],
) => {
  const outcome = new Map<number, { hit: boolean; block: boolean }>();
  history.forEach((record) => {
    record.events.forEach((event) => {
      if (event.type !== "hit" || event.attacker !== slot || event.moveInstanceId == null) return;
      const current = outcome.get(event.moveInstanceId) ?? { hit: false, block: false };
      if (event.blocked) {
        current.block = true;
      } else {
        current.hit = true;
      }
      outcome.set(event.moveInstanceId, current);
    });
  });
  return outcome;
};

const recordFighter = (
  record: CombatDebugRecord,
  slot: FighterRuntimeSlot,
) => (slot === "player" ? record.player : record.cpu);

const moveEventDetail = (
  event: Extract<CombatEvent, { type: "moveEnd" }>,
  outcome: { hit: boolean; block: boolean } | undefined,
) => {
  if (!outcome?.hit && !outcome?.block) return "Whiff";
  if (!outcome.hit && outcome.block) return "Blocked";
  if (outcome.hit) return "Hit Confirmed";
  return event.reason;
};

export const resolveTimelineMarkers = (
  slot: FighterRuntimeSlot,
  fighter: CharacterState,
  history: CombatDebugRecord[],
): CombatTimelineMarker[] => {
  if (!fighter.moveId || fighter.moveInstanceId == null || !history.length) return [];
  const markers: CombatTimelineMarker[] = [];
  history.forEach((record) => {
    const snapshot = recordFighter(record, slot);
    if (snapshot.moveInstanceId !== fighter.moveInstanceId) return;
    if (snapshot.justStartedMove) {
      markers.push({
        key: `${record.id}-start`,
        frame: Math.max(1, snapshot.moveFrame ?? 1),
        label: "Start",
        tone: "system",
      });
    }
    if (snapshot.justHit) {
      markers.push({
        key: `${record.id}-hit`,
        frame: Math.max(1, snapshot.moveFrame ?? 1),
        label: "Hit Confirm",
        tone: "hit",
      });
    }
    if (snapshot.justBlocked) {
      markers.push({
        key: `${record.id}-${snapshot.justParried ? "parry" : "block"}`,
        frame: Math.max(1, snapshot.moveFrame ?? 1),
        label: snapshot.justParried ? "Parry" : "Block Confirm",
        tone: snapshot.justParried ? "parry" : "block",
      });
    }
    if (snapshot.justGuardBroke) {
      markers.push({
        key: `${record.id}-guard-break`,
        frame: Math.max(1, snapshot.moveFrame ?? 1),
        label: "Guard Break",
        tone: "system",
      });
    }
  });
  return markers;
};

export const resolveRecentCombatEvents = (
  slot: FighterRuntimeSlot,
  history: CombatDebugRecord[],
  limit = 6,
): CombatEventLogEntry[] => {
  if (!history.length) return [];
  const moveOutcomeMap = buildMoveOutcomeMap(slot, history);
  const entries: CombatEventLogEntry[] = [];

  for (let index = history.length - 1; index >= 0 && entries.length < limit; index -= 1) {
    const record = history[index];
    const ageLabel = formatAgeLabel(history.length - 1 - index);
    record.events.forEach((event) => {
      if (entries.length >= limit) return;
      if (event.type === "moveStart" && event.slot === slot) {
        entries.push({
          key: `${record.id}-${event.id}`,
          label: "Move Start",
          detail: `${event.moveId} #${event.moveInstanceId}`,
          ageLabel,
          tone: "system",
        });
        return;
      }
      if (event.type === "moveEnd" && event.slot === slot) {
        entries.push({
          key: `${record.id}-${event.id}`,
          label: "Move End",
          detail: `${event.moveId} · ${moveEventDetail(event, event.moveInstanceId == null ? undefined : moveOutcomeMap.get(event.moveInstanceId))}`,
          ageLabel,
          tone: "system",
        });
        return;
      }
      if (event.type === "hit") {
        if (event.attacker === slot) {
          entries.push({
            key: `${record.id}-${event.id}`,
            label: event.blocked ? "Block Confirm" : "Hit Confirm",
            detail: `${event.moveId} · ${event.hitboxId}`,
            ageLabel,
            tone: event.blocked ? "block" : "hit",
          });
        } else if (event.defender === slot) {
          entries.push({
            key: `${record.id}-${event.id}`,
            label: event.blocked ? "Blocked" : "Got Hit",
            detail: `${event.moveId} · ${event.hitboxId}`,
            ageLabel,
            tone: event.blocked ? "block" : "hit",
          });
        }
        return;
      }
      if ("slot" in event && event.slot === slot) {
        entries.push({
          key: `${record.id}-${event.id}`,
          label:
            event.type === "guardBreak"
              ? "Guard Break"
              : event.type === "land"
                ? "Land"
                : "Tech",
          detail:
            event.type === "land"
              ? `impact ${event.intensity.toFixed(2)}`
              : event.type === "tech"
                ? event.result
                : "staggered",
          ageLabel,
          tone: event.type === "tech" && event.result === "success" ? "parry" : "system",
        });
      }
    });
  }

  return entries.slice(0, limit);
};
