import type { CSSProperties, FC } from "react";
import type { CharacterState } from "../lib/stores/useFighting";
import type { CombatDebugRecord } from "../lib/stores/useCombatDebug";
import type { FighterRuntimeSlot } from "./combatPresentation";
import {
  resolveCombatDebugData,
  resolveTimelineMarkers,
  windowPercent,
} from "./combatDebug";

interface CombatTimelineOverlayProps {
  fighter: CharacterState;
  slot: FighterRuntimeSlot;
  label: string;
  accent: string;
  history?: CombatDebugRecord[];
  reviewLabel?: string;
}

const laneOrder = ["phase", "cancel", "armor", "invuln"] as const;

const lanePalette: Record<(typeof laneOrder)[number], { fill: string; border: string; text: string }> = {
  phase: { fill: "rgba(59, 130, 246, 0.24)", border: "rgba(147, 197, 253, 0.55)", text: "#dbeafe" },
  cancel: { fill: "rgba(14, 165, 233, 0.22)", border: "rgba(103, 232, 249, 0.55)", text: "#cffafe" },
  armor: { fill: "rgba(245, 158, 11, 0.2)", border: "rgba(253, 224, 71, 0.5)", text: "#fef3c7" },
  invuln: { fill: "rgba(167, 139, 250, 0.24)", border: "rgba(221, 214, 254, 0.5)", text: "#ede9fe" },
};

const tagStyle = (accent: string): CSSProperties => ({
  border: `1px solid ${accent}55`,
  background: `${accent}22`,
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
});

export const CombatTimelineOverlay: FC<CombatTimelineOverlayProps> = ({
  fighter,
  slot,
  label,
  accent,
  history = [],
  reviewLabel,
}) => {
  const debugData = resolveCombatDebugData(fighter);
  const markers = resolveTimelineMarkers(slot, fighter, history);
  const hasTimeline = Boolean(debugData.move && debugData.totalFrames > 0);
  const framePercent =
    hasTimeline && debugData.totalFrames > 0
      ? Math.min(100, (debugData.frame / debugData.totalFrames) * 100)
      : 0;
  const tags = [
    fighter.justHit ? "hit confirm" : null,
    fighter.justBlocked ? "block confirm" : null,
    fighter.justParried ? "parry" : null,
    fighter.justGuardBroke ? "guard break" : null,
    fighter.invulnerable ? "invuln" : null,
    fighter.armored ? "armor" : null,
  ].filter((tag): tag is string => tag !== null);

  return (
    <div
      style={{
        width: 276,
        border: `1px solid ${accent}55`,
        background: "rgba(9, 14, 24, 0.76)",
        color: "#f8fafc",
        borderRadius: 12,
        padding: 10,
        boxShadow: "0 14px 34px rgba(0, 0, 0, 0.22)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
        <div>
          <div style={{ color: accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            {label}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {debugData.move?.name ?? fighter.action ?? "Idle"}
          </div>
        </div>
        <div style={{ textAlign: "right", fontFamily: "monospace", fontSize: 11, color: "#cbd5e1" }}>
          {reviewLabel && <div style={{ color: "#fef08a" }}>{reviewLabel}</div>}
          <div>{fighter.movePhase ?? "none"}</div>
          <div>
            {debugData.frame}
            {debugData.totalFrames > 0 ? ` / ${debugData.totalFrames}` : ""}
          </div>
        </div>
      </div>

      {hasTimeline ? (
        <div style={{ position: "relative", display: "grid", gap: 5 }}>
          {laneOrder.map((lane) => (
            <div key={lane} style={{ position: "relative", height: 16, borderRadius: 999, background: "rgba(15, 23, 42, 0.82)", overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute",
                  inset: "0 auto 0 0",
                  width: `${framePercent}%`,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.18))",
                }}
              />
              {debugData.segments
                .filter((segment) => segment.lane === lane)
                .map((segment) => {
                  const palette = lanePalette[lane];
                  const geometry = windowPercent(segment.window, debugData.totalFrames);
                  return (
                    <div
                      key={segment.key}
                      title={`${segment.label}: ${segment.window.start}-${segment.window.end}`}
                      style={{
                        position: "absolute",
                        left: `${geometry.left}%`,
                        width: `${geometry.width}%`,
                        top: 2,
                        bottom: 2,
                        borderRadius: 999,
                        background: palette.fill,
                        border: `1px solid ${palette.border}`,
                        color: palette.text,
                        fontSize: 8,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {segment.label}
                    </div>
                  );
                })}
              <div
                style={{
                  position: "absolute",
                  left: `calc(${framePercent}% - 1px)`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: "#ffffff",
                  boxShadow: "0 0 10px rgba(255,255,255,0.45)",
                }}
              />
              {lane === "phase" &&
                markers.map((marker) => {
                  const left = `${Math.min(100, Math.max(0, (marker.frame / Math.max(1, debugData.totalFrames)) * 100))}%`;
                  const color =
                    marker.tone === "hit"
                      ? "#fca5a5"
                      : marker.tone === "block"
                        ? "#bfdbfe"
                        : marker.tone === "parry"
                          ? "#fef3c7"
                          : "#e2e8f0";
                  return (
                    <div
                      key={marker.key}
                      title={`${marker.label} @ ${marker.frame}`}
                      style={{
                        position: "absolute",
                        left: `calc(${left} - 4px)`,
                        top: -1,
                        bottom: -1,
                        width: 8,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 3,
                          top: 0,
                          bottom: 0,
                          width: 2,
                          background: color,
                          opacity: 0.92,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 1,
                          left: 0,
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          border: `1px solid ${color}`,
                          background: "rgba(15, 23, 42, 0.96)",
                          boxShadow: `0 0 12px ${color}55`,
                        }}
                      />
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ borderRadius: 10, background: "rgba(15, 23, 42, 0.76)", padding: "9px 10px", fontSize: 11, color: "#cbd5e1" }}>
          <div>state: {fighter.action ?? "idle"}</div>
          <div>hitstun: {Math.round(fighter.hitstunFrames ?? 0)}f</div>
          <div>blockstun: {Math.round(fighter.blockstunFrames ?? 0)}f</div>
          <div>landing lag: {Math.round(fighter.landingLagFrames ?? 0)}f</div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontFamily: "monospace", fontSize: 10, color: "#cbd5e1" }}>
        <span>instance {fighter.moveInstanceId ?? "—"}</span>
        <span>active {debugData.activeHitboxes.length ? debugData.activeHitboxes.join(", ") : "—"}</span>
      </div>

      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
          {tags.map((tag) => (
            <span key={tag} style={tagStyle(accent)}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CombatTimelineOverlay;
