import { useCallback, useEffect } from "react";
import { Controls } from "../lib/stores/useControls";

export type PlayerSlot = "player1" | "player2";
export type PlayerInputSnapshot = Record<Controls, boolean>;
export type DualInputSnapshot = Record<PlayerSlot, PlayerInputSnapshot>;

const CONTROL_ACTIONS = Object.values(Controls);

const createSnapshot = (): PlayerInputSnapshot =>
  CONTROL_ACTIONS.reduce(
    (state, control) => {
      state[control] = false;
      return state;
    },
    {} as PlayerInputSnapshot,
  );

const inputState: DualInputSnapshot = {
  player1: createSnapshot(),
  player2: createSnapshot(),
};

type InputSources = {
  keyboard: PlayerInputSnapshot;
  gamepad: PlayerInputSnapshot;
};

const slotSources: Record<PlayerSlot, InputSources> = {
  player1: { keyboard: createSnapshot(), gamepad: createSnapshot() },
  player2: { keyboard: createSnapshot(), gamepad: createSnapshot() },
};

const hasActiveInputs = (snapshot: PlayerInputSnapshot) =>
  CONTROL_ACTIONS.some((action) => snapshot[action]);

const mergeSlotSnapshot = (slot: PlayerSlot) => {
  const merged = createSnapshot();
  const sources = slotSources[slot];
  CONTROL_ACTIONS.forEach((action) => {
    merged[action] = sources.keyboard[action] || sources.gamepad[action];
  });
  inputState[slot] = merged;
};

const updateSource = (
  slot: PlayerSlot,
  source: keyof InputSources,
  mutate: (snapshot: PlayerInputSnapshot) => void,
) => {
  const snapshot = slotSources[slot][source];
  mutate(snapshot);
  mergeSlotSnapshot(slot);
};

const clearSource = (slot: PlayerSlot, source: keyof InputSources) => {
  updateSource(slot, source, (state) => {
    CONTROL_ACTIONS.forEach((action) => {
      state[action] = false;
    });
  });
};

const defaultBindings: Record<PlayerSlot, Record<Controls, string[]>> = {
  player1: {
    [Controls.jump]: ["KeyW"],
    [Controls.forward]: ["ArrowUp"],
    [Controls.backward]: ["KeyS", "ArrowDown"],
    [Controls.leftward]: ["KeyA", "ArrowLeft"],
    [Controls.rightward]: ["KeyD", "ArrowRight"],
    [Controls.attack1]: ["KeyJ"],
    [Controls.attack2]: ["KeyK"],
    [Controls.shield]: ["KeyL"],
    [Controls.special]: ["Space"],
    [Controls.dodge]: ["ShiftLeft", "ShiftRight"],
    [Controls.airAttack]: ["KeyE"],
    [Controls.grab]: ["KeyG"],
    [Controls.taunt]: ["KeyT"],
  },
  player2: {
    [Controls.jump]: ["KeyI", "Numpad8"],
    [Controls.forward]: ["KeyK", "Numpad5"],
    [Controls.backward]: ["KeyM", "Numpad2"],
    [Controls.leftward]: ["KeyJ", "Numpad4"],
    [Controls.rightward]: ["KeyL", "Numpad6"],
    [Controls.attack1]: ["KeyU", "Numpad1"],
    [Controls.attack2]: ["KeyO", "Numpad3"],
    [Controls.shield]: ["Enter", "NumpadEnter"],
    [Controls.special]: ["KeyP", "Numpad0"],
    [Controls.dodge]: ["Slash", "Numpad7"],
    [Controls.airAttack]: ["BracketLeft", "Numpad9"],
    [Controls.grab]: ["BracketRight", "NumpadPlus"],
    [Controls.taunt]: ["Backslash", "NumpadDecimal"],
  },
};

type BindingLookupEntry = { slot: PlayerSlot; action: Controls };
const bindingLookup = new Map<string, BindingLookupEntry[]>();
let listenersAttached = false;
let listenerCount = 0;

const registerBindings = () => {
  if (bindingLookup.size > 0) return;
  (Object.keys(defaultBindings) as PlayerSlot[]).forEach((slot) => {
    const slotBindings = defaultBindings[slot];
    CONTROL_ACTIONS.forEach((action) => {
      slotBindings[action]?.forEach((code) => {
        if (!bindingLookup.has(code)) {
          bindingLookup.set(code, []);
        }
        bindingLookup.get(code)!.push({ slot, action });
      });
    });
  });
};

const resetAllSources = () => {
  clearSource("player1", "keyboard");
  clearSource("player2", "keyboard");
  clearSource("player1", "gamepad");
  clearSource("player2", "gamepad");
};

const setKeyboardAction = (slot: PlayerSlot, action: Controls, pressed: boolean) => {
  updateSource(slot, "keyboard", (snapshot) => {
    snapshot[action] = pressed;
  });
};

const createHandler =
  (pressed: boolean) =>
  (event: KeyboardEvent) => {
    const entries = bindingLookup.get(event.code);
    if (!entries?.length) return;
    entries.forEach(({ slot, action }) => setKeyboardAction(slot, action, pressed));
  };

const keyDownHandler = createHandler(true);
const keyUpHandler = createHandler(false);

const gamepadAssignments = new Map<number, PlayerSlot>();
let gamepadLoopId: number | null = null;

const assignGamepadToSlot = (index: number) => {
  if (gamepadAssignments.has(index)) return;
  const preferredOrder: PlayerSlot[] = ["player2", "player1"];
  for (const slot of preferredOrder) {
    if (![...gamepadAssignments.values()].includes(slot)) {
      gamepadAssignments.set(index, slot);
      clearSource(slot, "gamepad");
      return;
    }
  }
};

const releaseGamepad = (index: number) => {
  const slot = gamepadAssignments.get(index);
  if (!slot) return;
  gamepadAssignments.delete(index);
  clearSource(slot, "gamepad");
};

const gamepadThreshold = 0.35;
const buttonPressed = (button?: GamepadButton) => !!button && (button.pressed || button.value > 0.5);

const mapGamepadSnapshot = (pad: Gamepad): PlayerInputSnapshot => {
  const snapshot = createSnapshot();
  const horizontal = pad.axes[0] ?? 0;
  const vertical = pad.axes[1] ?? 0;
  if (horizontal < -gamepadThreshold || buttonPressed(pad.buttons[14])) {
    snapshot.leftward = true;
  }
  if (horizontal > gamepadThreshold || buttonPressed(pad.buttons[15])) {
    snapshot.rightward = true;
  }
  if (vertical < -gamepadThreshold || buttonPressed(pad.buttons[12])) {
    snapshot.forward = true;
  }
  if (vertical > gamepadThreshold || buttonPressed(pad.buttons[13])) {
    snapshot.backward = true;
  }

  snapshot.jump = buttonPressed(pad.buttons[0]);
  snapshot.special = buttonPressed(pad.buttons[1]);
  snapshot.attack1 = buttonPressed(pad.buttons[2]);
  snapshot.attack2 = buttonPressed(pad.buttons[3]);
  snapshot.shield = buttonPressed(pad.buttons[4]);
  snapshot.dodge = buttonPressed(pad.buttons[5]);
  snapshot.grab = buttonPressed(pad.buttons[6]);
  snapshot.taunt = buttonPressed(pad.buttons[9]);
  snapshot.airAttack = buttonPressed(pad.buttons[8]);
  return snapshot;
};

const updateGamepadStates = () => {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
    return;
  }
  const pads = navigator.getGamepads() || [];
  const activeSlots = new Set<PlayerSlot>();
  for (let index = 0; index < pads.length; index++) {
    const pad = pads[index];
    if (!pad || !pad.connected) continue;
    if (!gamepadAssignments.has(index)) {
      assignGamepadToSlot(index);
    }
    const slot = gamepadAssignments.get(index);
    if (!slot) continue;
    activeSlots.add(slot);
    updateSource(slot, "gamepad", (state) => {
      const snapshot = mapGamepadSnapshot(pad);
      CONTROL_ACTIONS.forEach((action) => {
        state[action] = snapshot[action];
      });
    });
  }

  (["player1", "player2"] as PlayerSlot[]).forEach((slot) => {
    if (!activeSlots.has(slot)) {
      if (hasActiveInputs(slotSources[slot].gamepad)) {
        clearSource(slot, "gamepad");
      }
    }
  });
};

const startGamepadLoop = () => {
  if (gamepadLoopId !== null || typeof window === "undefined") return;
  const step = () => {
    updateGamepadStates();
    gamepadLoopId = window.requestAnimationFrame(step);
  };
  gamepadLoopId = window.requestAnimationFrame(step);
};

const stopGamepadLoop = () => {
  if (gamepadLoopId !== null && typeof window !== "undefined") {
    window.cancelAnimationFrame(gamepadLoopId);
  }
  gamepadLoopId = null;
};

const handleGamepadConnected = (event: GamepadEvent) => {
  assignGamepadToSlot(event.gamepad.index);
};

const handleGamepadDisconnected = (event: GamepadEvent) => {
  releaseGamepad(event.gamepad.index);
};

const attachListeners = () => {
  registerBindings();
  if (listenersAttached) {
    listenerCount += 1;
    return;
  }
  if (typeof window === "undefined") return;
  listenersAttached = true;
  listenerCount = 1;
  window.addEventListener("keydown", keyDownHandler);
  window.addEventListener("keyup", keyUpHandler);
  window.addEventListener("blur", resetAllSources);
  window.addEventListener("gamepadconnected", handleGamepadConnected);
  window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);
  startGamepadLoop();
};

const detachListeners = () => {
  if (!listenersAttached) return;
  listenerCount -= 1;
  if (listenerCount > 0) return;
  listenersAttached = false;
  if (typeof window === "undefined") return;
  window.removeEventListener("keydown", keyDownHandler);
  window.removeEventListener("keyup", keyUpHandler);
  window.removeEventListener("blur", resetAllSources);
  window.removeEventListener("gamepadconnected", handleGamepadConnected);
  window.removeEventListener("gamepaddisconnected", handleGamepadDisconnected);
  stopGamepadLoop();
  resetAllSources();
};

export function usePlayerControls() {
  useEffect(() => {
    attachListeners();
    return () => {
      detachListeners();
    };
  }, []);

  return useCallback(() => inputState, []);
}
