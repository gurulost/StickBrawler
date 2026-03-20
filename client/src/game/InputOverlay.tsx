import { useMemo } from "react";
import { useControls } from "../lib/stores/useControls";
import { useInputDebug } from "../lib/stores/useInputDebug";
import type { DebugEntry } from "../lib/stores/useInputDebug";

const hasMeaningfulDebugSignal = (entry: DebugEntry | null) =>
  Boolean(
    entry &&
      (entry.attack ||
        entry.special ||
        entry.defendModes.length > 0 ||
        entry.moveId ||
        entry.direction !== "neutral" ||
        !entry.grounded),
  );

const containerStyle: React.CSSProperties = {
  position: "absolute",
  top: 96,
  left: 16,
  padding: "10px 12px",
  background: "rgba(5, 9, 18, 0.5)",
  color: "#fff",
  fontFamily: "monospace",
  fontSize: 11,
  borderRadius: 10,
  pointerEvents: "none",
  zIndex: 50,
  minWidth: 180,
  maxWidth: 220,
  boxShadow: "0 12px 28px rgba(0, 0, 0, 0.24)",
  backdropFilter: "blur(8px)",
};

const slotStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
  paddingBottom: 8,
  marginBottom: 8,
};

function renderEntry(slot: string, entry: DebugEntry | null) {
  if (!entry) {
    return (
      <div key={slot} style={slotStyle}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{slot}</div>
        <div>No input</div>
      </div>
    );
  }
  const attackLabel = entry.attack
    ? `${entry.attack.dir} · ${entry.attack.strength} · ${entry.attack.altitude}`
    : "—";
  const specialLabel = entry.special
    ? `${entry.special.slot} · ${entry.special.altitude}`
    : "—";
  const defendLabel = entry.defendModes.length ? entry.defendModes.join(", ") : "—";
  return (
    <div key={slot} style={slotStyle}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {slot} · {entry.grounded ? "ground" : "air"} · dir {entry.direction}
      </div>
      <div>Attack: {attackLabel}</div>
      <div>Special: {specialLabel}</div>
      <div>Defend: {defendLabel}</div>
      <div>Move: {entry.moveId ?? "—"}</div>
    </div>
  );
}

export function InputOverlay() {
  const debugMode = useControls((state) => state.debugMode);
  const slots = useInputDebug((state) => state.slots);
  const activeEntries = useMemo(
    () => Object.entries(slots).filter(([, entry]) => hasMeaningfulDebugSignal(entry)),
    [slots],
  );
  const content = useMemo(
    () => activeEntries.map(([slot, entry]) => renderEntry(slot, entry)),
    [activeEntries],
  );

  if (!debugMode || activeEntries.length === 0) return null;

  return <div style={containerStyle}>{content}</div>;
}
