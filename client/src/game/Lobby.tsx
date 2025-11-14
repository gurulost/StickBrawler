import { useEffect, useState } from "react";
import { useFighting, type PlayerSlot } from "../lib/stores/useFighting";

const keyboardMapping = {
  player1: "Keyboard: WASD + J/K/L + Space",
  player2: "Keyboard: IJKL + U/O/P + Enter",
};

const SlotCard = ({
  slot,
  label,
  type,
  ready,
  controllerConnected,
  onToggleType,
  onToggleReady,
}: {
  slot: PlayerSlot;
  label: string;
  type: "human" | "cpu";
  ready: boolean;
  controllerConnected: boolean;
  onToggleType?: () => void;
  onToggleReady?: () => void;
}) => {
  const isPlayerTwo = slot === "player2";
  const isHuman = type === "human";
  const hint = isHuman
    ? isPlayerTwo && controllerConnected
      ? "Controller detected – press any button to move."
      : keyboardMapping[slot]
    : "CPU will use the adaptive AI brain.";

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm tracking-wide text-indigo-300 uppercase">{slot === "player1" ? "Slot A" : "Slot B"}</p>
          <h3 className="text-2xl font-bold text-white">{label}</h3>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isHuman ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-100"}`}>
          {isHuman ? "Human" : "CPU"}
        </span>
      </div>

      <p className="text-sm text-gray-200">{hint}</p>

      {isPlayerTwo && onToggleType && (
        <button
          className="w-full mt-2 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-semibold py-2 rounded-xl hover:opacity-90 transition"
          onClick={onToggleType}
        >
          {isHuman ? "Switch to CPU" : "Switch to Local Player"}
        </button>
      )}

      <div className="pt-4 border-t border-white/5">
        {isHuman ? (
          <button
            className={`w-full py-3 rounded-xl font-semibold transition ${
              ready
                ? "bg-emerald-600 text-white"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            onClick={onToggleReady}
          >
            {ready ? "Ready!" : "Ready Up"}
          </button>
        ) : (
          <div className="text-sm text-amber-200 text-center">CPU ready</div>
        )}
      </div>
    </div>
  );
};

const Lobby = () => {
  const { slots, setSlotType, setSlotReady, beginMatch, returnToMenu } = useFighting();
  const [controllerConnected, setControllerConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    const detectControllers = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      setControllerConnected(pads.some((pad) => pad && pad.connected));
    };
    window.addEventListener("gamepadconnected", detectControllers);
    window.addEventListener("gamepaddisconnected", detectControllers);
    detectControllers();
    return () => {
      window.removeEventListener("gamepadconnected", detectControllers);
      window.removeEventListener("gamepaddisconnected", detectControllers);
    };
  }, []);

  const playerOneReady = slots.player1.ready;
  const playerTwoHuman = slots.player2.type === "human";
  const playerTwoReady = playerTwoHuman ? slots.player2.ready : true;
  const canStart = playerOneReady && playerTwoReady;

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center px-6 py-10 gap-10">
      <div className="text-center space-y-2">
        <p className="tracking-[0.3em] text-sm text-indigo-300 uppercase">Local Co-op</p>
        <h1 className="text-4xl md:text-5xl font-extrabold">Battle Lobby</h1>
        <p className="text-gray-300 text-sm max-w-xl">
          Claim your slot, ready up, and sync your controllers before stepping into the arena.
        </p>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <SlotCard
          slot="player1"
          label={slots.player1.label}
          type="human"
          ready={slots.player1.ready}
          controllerConnected={false}
          onToggleReady={() => setSlotReady("player1", !slots.player1.ready)}
        />
        <SlotCard
          slot="player2"
          label={slots.player2.label}
          type={slots.player2.type}
          ready={slots.player2.ready}
          controllerConnected={controllerConnected}
          onToggleType={() =>
            setSlotType("player2", slots.player2.type === "human" ? "cpu" : "human")
          }
          onToggleReady={
            slots.player2.type === "human"
              ? () => setSlotReady("player2", !slots.player2.ready)
              : undefined
          }
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <button
          className={`px-10 py-3 rounded-full font-semibold transition ${
            canStart
              ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              : "bg-white/10 text-white cursor-not-allowed"
          }`}
          disabled={!canStart}
          onClick={beginMatch}
        >
          Enter Arena
        </button>
        <button
          className="px-10 py-3 rounded-full font-semibold bg-white/10 hover:bg-white/20 transition"
          onClick={returnToMenu}
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
};

export default Lobby;
