import type { FighterId } from "../combat/moveTable";
import {
  CpuDifficulty,
  CpuStyle,
  type CpuConfig,
} from "./cpuBrain";

export type ArcadeRunStatus =
  | "setup"
  | "in_progress"
  | "between_fights"
  | "won"
  | "lost";

export interface ArcadeEncounter {
  id: string;
  label: string;
  title: string;
  tagline: string;
  fighterId: FighterId;
  arenaId: string;
  cpuConfig: CpuConfig;
  clearCoins: number;
}

export interface ArcadeRunState {
  encounters: ArcadeEncounter[];
  currentEncounterIndex: number;
  status: ArcadeRunStatus;
  selectedFighterId: FighterId;
  clearedEncounterIds: string[];
  flawlessMatches: number;
  lastMatchScore: number;
  lastResult?: "won" | "lost";
}

const ARCADE_ENCOUNTERS: ArcadeEncounter[] = [
  {
    id: "dojowake",
    label: "Dojo Wake",
    title: "Dojo Wake",
    tagline: "A forgiving opener that teaches the pace before the pressure ramps.",
    fighterId: "stick_villain",
    arenaId: "sunsetBloom",
    cpuConfig: {
      style: CpuStyle.BEGINNER,
      difficulty: CpuDifficulty.EASY,
    },
    clearCoins: 35,
  },
  {
    id: "pressureline",
    label: "Pressure Line",
    title: "Pressure Line",
    tagline: "An aerial rushdown opponent that turns stacked routes into constant launcher threats.",
    fighterId: "stick_kite",
    arenaId: "crosswindVault",
    cpuConfig: {
      style: CpuStyle.RUSHDOWN,
      difficulty: CpuDifficulty.NORMAL,
    },
    clearCoins: 45,
  },
  {
    id: "counterdraft",
    label: "Counter Draft",
    title: "Counter Draft",
    tagline: "A bait-heavy opponent that punishes autopilot strings and loose spacing.",
    fighterId: "stick_villain",
    arenaId: "containment",
    cpuConfig: {
      style: CpuStyle.TRICKSTER,
      difficulty: CpuDifficulty.HARD,
    },
    clearCoins: 60,
  },
  {
    id: "ironmarch",
    label: "Iron March",
    title: "Iron March",
    tagline: "Long lanes expose every bulldoze startup. If the bruiser gets in once, the whole match turns into corner carry.",
    fighterId: "stick_anvil",
    arenaId: "longwatch",
    cpuConfig: {
      style: CpuStyle.RUSHDOWN,
      difficulty: CpuDifficulty.HARD,
    },
    clearCoins: 75,
  },
  {
    id: "finalink",
    label: "Final Ink",
    title: "Final Ink",
    tagline: "The closer combines pressure, discipline, and enough speed to force mastery.",
    fighterId: "stick_villain",
    arenaId: "containment",
    cpuConfig: {
      style: CpuStyle.RUSHDOWN,
      difficulty: CpuDifficulty.BRUTAL,
    },
    clearCoins: 120,
  },
];

const cloneEncounter = (encounter: ArcadeEncounter): ArcadeEncounter => ({
  ...encounter,
  cpuConfig: { ...encounter.cpuConfig },
});

export const createArcadeRun = (selectedFighterId: FighterId): ArcadeRunState => ({
  encounters: ARCADE_ENCOUNTERS.map(cloneEncounter),
  currentEncounterIndex: 0,
  status: "setup",
  selectedFighterId,
  clearedEncounterIds: [],
  flawlessMatches: 0,
  lastMatchScore: 0,
  lastResult: undefined,
});

export const getArcadeEncounter = (run?: ArcadeRunState | null) =>
  run?.encounters[run.currentEncounterIndex];

export const getNextArcadeEncounter = (run?: ArcadeRunState | null) =>
  run && run.currentEncounterIndex < run.encounters.length - 1
    ? run.encounters[run.currentEncounterIndex + 1]
    : undefined;

export const hasNextArcadeEncounter = (run?: ArcadeRunState | null) =>
  Boolean(getNextArcadeEncounter(run));

const DIFFICULTY_SCORE_BONUS: Record<CpuDifficulty, number> = {
  [CpuDifficulty.EASY]: 160,
  [CpuDifficulty.NORMAL]: 280,
  [CpuDifficulty.HARD]: 450,
  [CpuDifficulty.BRUTAL]: 700,
};

export const calculateArcadeMatchScore = (context: {
  encounter: ArcadeEncounter;
  encounterIndex: number;
  cpuRoundsWon: number;
  playerHealth: number;
  roundTimeRemaining: number;
}) => {
  const base = 900 + context.encounterIndex * 220;
  const difficultyBonus = DIFFICULTY_SCORE_BONUS[context.encounter.cpuConfig.difficulty];
  const survivalBonus = Math.round(context.playerHealth * 6);
  const paceBonus = Math.round(context.roundTimeRemaining * 12);
  const flawlessBonus = context.cpuRoundsWon === 0 ? 260 : 0;
  return base + difficultyBonus + survivalBonus + paceBonus + flawlessBonus;
};

export const resolveArcadeGrade = (
  score: number,
  clearedCount: number,
  totalEncounters: number,
) => {
  const completionRatio = totalEncounters > 0 ? clearedCount / totalEncounters : 0;
  if (completionRatio === 1 && score >= 9000) return "S";
  if (completionRatio >= 0.8 || score >= 6500) return "A";
  if (completionRatio >= 0.6 || score >= 4200) return "B";
  if (completionRatio >= 0.4 || score >= 2200) return "C";
  return "D";
};
