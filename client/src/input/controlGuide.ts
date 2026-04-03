import { Controls } from "./controls";
import type { MatchMode } from "../lib/stores/useFighting";

export type ControlGuideSlot = "player1" | "player2";

export type ControlBindingRow = {
  control: Controls;
  codes: readonly string[];
  keys: readonly string[];
  description: string;
};

export type ControlCardData = {
  slot?: ControlGuideSlot;
  title: string;
  subtitle: string;
  bindings: readonly ControlBindingRow[];
};

export type IntentLesson = {
  title: string;
  description: string;
};

export type CombatPrimerStep = {
  id: "move" | "attack" | "defend" | "grab";
  title: string;
  description: string;
  prompt: string;
};

export type CombatHudLegendLine = {
  slot: ControlGuideSlot;
  title: string;
  summary: string;
};

const createBindingMap = (bindings: readonly ControlBindingRow[]) =>
  bindings.reduce<Record<Controls, string[]>>(
    (map, binding) => {
      map[binding.control] = [...binding.codes];
      return map;
    },
    {
      [Controls.jump]: [],
      [Controls.forward]: [],
      [Controls.backward]: [],
      [Controls.leftward]: [],
      [Controls.rightward]: [],
      [Controls.attack]: [],
      [Controls.special]: [],
      [Controls.defend]: [],
    },
  );

const playerOneBindings = [
  { control: Controls.forward, codes: ["ArrowUp"], keys: ["Arrow Up"], description: "Forward" },
  { control: Controls.backward, codes: ["ArrowDown"], keys: ["Arrow Down"], description: "Backward" },
  { control: Controls.leftward, codes: ["ArrowLeft"], keys: ["Arrow Left"], description: "Step left" },
  { control: Controls.rightward, codes: ["ArrowRight"], keys: ["Arrow Right"], description: "Step right" },
  { control: Controls.jump, codes: ["ShiftRight"], keys: ["Right Shift"], description: "Jump" },
  { control: Controls.attack, codes: ["KeyJ"], keys: ["J"], description: "Attack" },
  { control: Controls.special, codes: ["KeyK"], keys: ["K"], description: "Special" },
  { control: Controls.defend, codes: ["KeyL"], keys: ["L"], description: "Defend" },
] as const satisfies readonly ControlBindingRow[];

const playerTwoBindings = [
  { control: Controls.forward, codes: ["KeyW"], keys: ["W"], description: "Forward" },
  { control: Controls.backward, codes: ["KeyS"], keys: ["S"], description: "Backward" },
  { control: Controls.leftward, codes: ["KeyA"], keys: ["A"], description: "Step left" },
  { control: Controls.rightward, codes: ["KeyD"], keys: ["D"], description: "Step right" },
  { control: Controls.jump, codes: ["Space"], keys: ["Space"], description: "Jump" },
  { control: Controls.attack, codes: ["KeyF"], keys: ["F"], description: "Attack" },
  { control: Controls.special, codes: ["KeyG"], keys: ["G"], description: "Special" },
  { control: Controls.defend, codes: ["KeyH"], keys: ["H"], description: "Defend" },
] as const satisfies readonly ControlBindingRow[];

export const KEYBOARD_CONTROL_CARDS = [
  {
    slot: "player1",
    title: "Player 1",
    subtitle: "Arrow keys move, Right Shift jumps, J/K/L handle combat.",
    bindings: playerOneBindings,
  },
  {
    slot: "player2",
    title: "Player 2",
    subtitle: "WASD moves, Space jumps, F/G/H handle combat.",
    bindings: playerTwoBindings,
  },
] as const satisfies readonly ControlCardData[];

export const KEYBOARD_CONTROL_CARD_BY_SLOT = {
  player1: KEYBOARD_CONTROL_CARDS[0],
  player2: KEYBOARD_CONTROL_CARDS[1],
} as const;

export const KEYBOARD_BINDING_CODES: Record<ControlGuideSlot, Record<Controls, string[]>> = {
  player1: createBindingMap(playerOneBindings),
  player2: createBindingMap(playerTwoBindings),
};

export const PLAYER_KEYBOARD_HINTS: Record<ControlGuideSlot, string> = {
  player1: "Keyboard: Arrow Keys + Right Shift + J / K / L.",
  player2: "Keyboard: WASD + Space + F / G / H.",
};

export const CONTROLLER_CONTROL_CARD: ControlCardData = {
  title: "Controller",
  subtitle: "Solo maps the first controller to Player 1. Local Versus maps the first controller to Player 2.",
  bindings: [
    { control: Controls.forward, codes: [], keys: ["Left Stick", "D-Pad"], description: "Move" },
    { control: Controls.jump, codes: [], keys: ["A / Cross"], description: "Jump" },
    { control: Controls.attack, codes: [], keys: ["X / Square"], description: "Attack" },
    { control: Controls.special, codes: [], keys: ["B / Circle"], description: "Special" },
    { control: Controls.defend, codes: [], keys: ["LB / RB"], description: "Defend" },
  ],
};

export const CONTROLLER_READY_HINT =
  "Gamepad ready: Left Stick or D-Pad moves, A jumps, X attacks, B special, LB or RB defends.";

const isSoloMode = (matchMode: MatchMode) => matchMode === "single";

export const getControllerStatusLabel = (matchMode: MatchMode, controllerConnected: boolean) => {
  if (!controllerConnected) return "Keyboard active";
  return isSoloMode(matchMode) ? "Controller ready for Player 1" : "Controller ready for Player 2";
};

export const getControllerStatusDetail = (matchMode: MatchMode, controllerConnected: boolean) => {
  if (!controllerConnected) {
    return "Arrow keys + Right Shift + J / K / L are active by default.";
  }
  return isSoloMode(matchMode)
    ? "In Solo, the first controller drives Player 1."
    : "In Local Versus, the first controller joins Player 2.";
};

export const getControllerPrompt = (matchMode: MatchMode, controllerConnected: boolean) => {
  if (!controllerConnected) return null;
  return isSoloMode(matchMode)
    ? "Controller mapped to Player 1 for Solo."
    : "First controller will join Player 2 in Local Versus.";
};

export const INTENT_GUIDE: readonly IntentLesson[] = [
  {
    title: "Attack tap, hold, or charge",
    description: "Tap Attack for fast pokes, hold it for heavier versions, and keep holding for the charged swing.",
  },
  {
    title: "Defend tap becomes parry",
    description: "Tap Defend on contact to parry instead of sitting in guard.",
  },
  {
    title: "Defend hold becomes guard",
    description: "Hold Defend to block and manage guard meter.",
  },
  {
    title: "Defend plus direction rolls",
    description: "Hold Defend and lean in a direction to dodge or roll through pressure.",
  },
  {
    title: "Attack plus Defend grabs",
    description: "Chord Attack and Defend together to grab instead of striking.",
  },
  {
    title: "Direction changes the move",
    description: "Mix a direction with Attack or Special to swap between neutral, angled, and movement-based options.",
  },
] as const;

export const COMBAT_PRIMER_STEPS: readonly CombatPrimerStep[] = [
  {
    id: "move",
    title: "Move into range",
    description: "Walk or jump first so the lane and spacing make sense before you start swinging.",
    prompt: "Move with the stick or direction keys, then jump once to feel the lane.",
  },
  {
    id: "attack",
    title: "Attack has strength tiers",
    description: "Tap Attack for the fast opener, hold it for heavier swings, and keep a direction held to change the move.",
    prompt: "Press Attack once for jab, then try holding it or adding a direction.",
  },
  {
    id: "defend",
    title: "Defend covers parry, guard, and roll",
    description: "Tap Defend on contact to parry, hold it to guard, and add a direction while holding to roll.",
    prompt: "Tap Defend for parry timing, or hold Defend plus a direction to roll.",
  },
  {
    id: "grab",
    title: "Grab is a chord",
    description: "Attack plus Defend together turns your offense into a grab instead of a strike.",
    prompt: "Press Attack + Defend together when you want to break a stand-off.",
  },
] as const;

export const COMBAT_PRIMER_TITLE = "Combat Primer";
export const COMBAT_PRIMER_SUBTITLE =
  "The move list is intent-driven. Learn these four verbs and the rest of the kit opens up fast.";

const getPrimaryBindingKey = (slot: ControlGuideSlot, control: Controls) =>
  KEYBOARD_CONTROL_CARD_BY_SLOT[slot].bindings.find((binding) => binding.control === control)?.keys[0] ?? "—";

export const COMBAT_HUD_GRAMMAR_HINT =
  "Attack: tap / hold / +dir. Defend: tap parry / hold guard / +dir roll.";

export const getCombatHudLegendLine = (slot: ControlGuideSlot): CombatHudLegendLine => {
  const jump = getPrimaryBindingKey(slot, Controls.jump);
  const attack = getPrimaryBindingKey(slot, Controls.attack);
  const special = getPrimaryBindingKey(slot, Controls.special);
  const defend = getPrimaryBindingKey(slot, Controls.defend);

  return {
    slot,
    title: slot === "player1" ? "P1" : "P2",
    summary: `${jump} jump · ${attack} attack · ${special} special · ${defend} defend · ${attack}+${defend} grab`,
  };
};

export const getLobbyControlHint = (
  slot: ControlGuideSlot,
  matchMode: MatchMode,
  controllerConnected = false,
) => {
  if (slot === "player1" && controllerConnected && isSoloMode(matchMode)) {
    return `${CONTROLLER_READY_HINT} This controller drives Player 1 in Solo.`;
  }

  if (slot === "player2" && controllerConnected && !isSoloMode(matchMode)) {
    return `Controller joins Player 2 in Local Versus. ${PLAYER_KEYBOARD_HINTS.player2}`;
  }

  return PLAYER_KEYBOARD_HINTS[slot];
};
