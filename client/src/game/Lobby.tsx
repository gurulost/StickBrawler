import { useEffect, useState } from "react";
import { useFighting, type MatchMode, type PlayerSlot } from "../lib/stores/useFighting";
import type { FighterId } from "../combat/moveTable";
import { getLobbyControlHint } from "../input/controlGuide";

const fighterOptions: Array<{ value: FighterId; label: string }> = [
  { value: "stick_hero", label: "Hero" },
  { value: "stick_villain", label: "Villain" },
];

const SlotCard = ({
  slot,
  matchMode,
  label,
  type,
  ready,
  controllerConnected,
  onToggleType,
  onToggleReady,
  fighterId,
  onSelectFighter,
  accentColor,
  glowColor,
}: {
  slot: PlayerSlot;
  matchMode: MatchMode;
  label: string;
  type: "human" | "cpu";
  ready: boolean;
  controllerConnected: boolean;
  onToggleType?: () => void;
  onToggleReady?: () => void;
  fighterId: FighterId;
  onSelectFighter?: (fighter: FighterId) => void;
  accentColor: string;
  glowColor: string;
}) => {
  const isPlayerTwo = slot === "player2";
  const isHuman = type === "human";
  const hint = isHuman
    ? getLobbyControlHint(slot, matchMode, controllerConnected)
    : "CPU will use the adaptive AI brain.";

  return (
    <div
      className="relative overflow-hidden space-y-4"
      style={{
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.6), rgba(10, 10, 15, 0.9))',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))',
        padding: '1.5rem',
      }}
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-0 right-4 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
      />

      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[9px] font-tech tracking-[0.3em] uppercase" style={{ color: `${accentColor}cc` }}>
            {slot === "player1" ? "Slot A" : "Slot B"}
          </p>
          <h3 className="text-2xl font-display text-white">{label}</h3>
        </div>
        <span
          className="clip-angular-sm px-3 py-1 text-[9px] font-tech font-bold uppercase tracking-widest"
          style={{
            background: isHuman ? 'rgba(57, 255, 20, 0.08)' : 'rgba(255, 230, 0, 0.08)',
            border: isHuman ? '1px solid rgba(57, 255, 20, 0.2)' : '1px solid rgba(255, 230, 0, 0.2)',
            color: isHuman ? '#39ff14' : '#ffe600',
          }}
        >
          {isHuman ? "Human" : "CPU"}
        </span>
      </div>

      <p className="text-xs font-tech text-white/55 relative z-10">{hint}</p>

      <div className="space-y-2 relative z-10">
        <p className="text-[9px] font-tech font-bold tracking-[0.3em] uppercase" style={{ color: `${accentColor}b3` }}>Fighter</p>
        <div className="flex gap-2">
          {fighterOptions.map((option) => (
            <button
              key={option.value}
              className={`flex-1 clip-angular-sm py-2 text-xs font-tech font-bold uppercase tracking-wider transition ${
                fighterId === option.value
                  ? "text-black"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/85 border border-white/10"
              }`}
              style={fighterId === option.value ? {
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                boxShadow: `0 0 16px ${glowColor}`,
              } : undefined}
              onClick={() => onSelectFighter?.(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {isPlayerTwo && onToggleType && (
        <button
          className="relative z-10 w-full mt-2 clip-angular py-2 font-tech font-bold uppercase tracking-wider text-xs text-white transition hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #ff2d7b, #b347ff)',
            boxShadow: '0 0 16px rgba(255, 45, 123, 0.2)',
          }}
          onClick={onToggleType}
        >
          {isHuman ? "Switch to CPU" : "Switch to Local Player"}
        </button>
      )}

      <div className="pt-4 border-t border-white/[0.08] relative z-10">
        {isHuman ? (
          <button
            className={`w-full py-3 clip-angular font-tech font-bold uppercase tracking-wider text-sm transition ${
              ready
                ? "text-black"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/85 border border-white/10"
            }`}
            style={ready ? {
              background: 'linear-gradient(135deg, #39ff14, #00f0ff)',
              boxShadow: '0 0 20px rgba(57, 255, 20, 0.3)',
            } : undefined}
            onClick={onToggleReady}
          >
            {ready ? "Ready!" : "Ready Up"}
          </button>
        ) : (
          <div className="text-xs font-tech text-center text-[#ffe600]/80 uppercase tracking-wider">CPU ready</div>
        )}
      </div>
    </div>
  );
};

const Lobby = () => {
  const { matchMode, slots, setSlotType, setSlotReady, setSlotFighter, beginMatch, returnToMenu } = useFighting();
  const [controllerConnected, setControllerConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    const detectControllers = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      setControllerConnected(Array.from(pads).some((pad) => !!pad?.connected));
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
  const lobbyModeLabel = playerTwoHuman ? "Local Versus" : "Solo vs CPU";
  const lobbyDescription = playerTwoHuman
    ? "Player 1 stays on the arrow-key layout, and the first controller joins Player 2 for Local Versus."
    : "Player 1 can use the arrow-key layout or the first connected controller before the CPU sparring round.";

  return (
    <div
      className="w-full h-full text-white flex flex-col items-center justify-center px-6 py-10 gap-10"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f, #12121a, #0a0a0f)',
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_rgba(0,240,255,0.04),_transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,_rgba(255,45,123,0.04),_transparent_40%)]" />
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="text-center space-y-2 relative z-10">
        <p className="tracking-[0.4em] text-[10px] font-tech text-[#00f0ff]/75 uppercase">{lobbyModeLabel}</p>
        <h1 className="font-display text-4xl md:text-5xl">Battle Lobby</h1>
        <p className="text-white/55 text-xs font-tech max-w-xl">
          {lobbyDescription}
        </p>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
          <SlotCard
            slot="player1"
            matchMode={matchMode}
            label={slots.player1.label}
            type="human"
            ready={slots.player1.ready}
            controllerConnected={controllerConnected}
            onToggleReady={() => setSlotReady("player1", !slots.player1.ready)}
            fighterId={slots.player1.fighterId}
            onSelectFighter={(fighter) => setSlotFighter("player1", fighter)}
            accentColor="#00f0ff"
            glowColor="rgba(0, 240, 255, 0.3)"
          />

          {/* VS Divider */}
          <div className="hidden md:flex flex-col items-center gap-3">
            <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <div
              className="relative font-display text-3xl text-white/80"
              style={{
                textShadow: '0 0 20px rgba(255,45,123,0.4), 0 0 40px rgba(0,240,255,0.3)',
              }}
            >
              VS
            </div>
            <div className="w-[1px] h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          </div>
          <div className="md:hidden flex items-center gap-4 justify-center py-2">
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="font-display text-2xl text-white/60" style={{ textShadow: '0 0 16px rgba(255,45,123,0.3)' }}>VS</span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <SlotCard
            slot="player2"
            matchMode={matchMode}
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
            fighterId={slots.player2.fighterId}
            onSelectFighter={(fighter) => setSlotFighter("player2", fighter)}
            accentColor="#ff2d7b"
            glowColor="rgba(255, 45, 123, 0.3)"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 relative z-10">
        <button
          className={`px-10 py-3 clip-angular font-tech font-bold uppercase tracking-wider text-sm transition ${
            canStart
              ? "text-black hover:scale-105"
              : "bg-white/5 text-white/40 cursor-not-allowed border border-white/10"
          }`}
          style={canStart ? {
            background: 'linear-gradient(135deg, #39ff14, #00f0ff)',
            boxShadow: '0 0 24px rgba(57, 255, 20, 0.3)',
          } : undefined}
          disabled={!canStart}
          onClick={beginMatch}
        >
          Enter Arena
        </button>
        <button
          className="px-10 py-3 clip-angular font-tech font-bold uppercase tracking-wider text-sm bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white/80"
          onClick={returnToMenu}
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
};

export default Lobby;
