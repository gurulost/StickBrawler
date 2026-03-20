import { Html, Line } from "@react-three/drei";
import type { FC } from "react";
import { useMemo } from "react";
import { coreMoves, sampleCombatSpatialFrame } from "../combat";
import type { CharacterState } from "../lib/stores/useFighting";
import { useControls } from "../lib/stores/useControls";
import { toCombatState } from "./combatBridge";
import { resolveCombatDebugData } from "./combatDebug";

interface CombatDebugOverlayProps {
  characterState: CharacterState;
  accent: string;
}

const SOCKET_RADIUS = 0.055;

const CombatDebugOverlay: FC<CombatDebugOverlayProps> = ({
  characterState,
  accent,
}) => {
  const debugMode = useControls((state) => state.debugMode);
  const showHurtboxes = useControls((state) => state.combatDebugShowHurtboxes);
  const showHitboxes = useControls((state) => state.combatDebugShowHitboxes);
  const showSockets = useControls((state) => state.combatDebugShowSockets);
  const showActiveHitbox = useControls((state) => state.combatDebugShowActiveHitbox);
  const showFrameData = useControls((state) => state.combatDebugShowFrameData);
  const showPhaseData = useControls((state) => state.combatDebugShowPhaseData);
  const showInstanceData = useControls((state) => state.combatDebugShowInstanceData);
  const debugData = useMemo(
    () => resolveCombatDebugData(characterState),
    [characterState],
  );

  const layout = useMemo(() => {
    const move = characterState.moveId ? coreMoves[characterState.moveId] : undefined;
    return sampleCombatSpatialFrame({
      fighter: toCombatState(characterState),
      move,
      hurtboxes: move?.hurtboxes,
    });
  }, [characterState]);

  const socketLookup = useMemo(
    () =>
      Object.fromEntries(
        layout.sockets.map((socket) => [socket.id, socket.world]),
      ) as Record<string, [number, number, number]>,
    [layout.sockets],
  );
  const activeSockets = useMemo(
    () => new Set(layout.hitboxes.filter((hitbox) => hitbox.active).map((hitbox) => hitbox.socket)),
    [layout.hitboxes],
  );
  const labelOffset = characterState.direction >= 0 ? -0.7 : 0.7;
  const showHeaderLabel =
    showFrameData || showPhaseData || showInstanceData || showActiveHitbox;

  if (!debugMode) return null;
  if (!showHurtboxes && !showHitboxes && !showSockets && !showHeaderLabel) return null;

  return (
    <group>
      {showHeaderLabel && (
        <Html
          position={[
            characterState.position[0] + labelOffset,
            characterState.position[1] + 2.3,
            characterState.position[2],
          ]}
          center
          transform={false}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              minWidth: 168,
              border: `1px solid ${accent}66`,
              background: "rgba(10, 14, 24, 0.72)",
              color: "#f8fafc",
              borderRadius: 10,
              padding: "7px 9px",
              fontFamily: "monospace",
              fontSize: 10,
              lineHeight: 1.4,
              boxShadow: "0 10px 24px rgba(0, 0, 0, 0.22)",
            }}
          >
            <div style={{ color: accent, fontWeight: 700, marginBottom: 4 }}>
              {debugData.move?.id ?? characterState.action ?? "idle"}
            </div>
            {(showPhaseData || showFrameData) && (
              <div>
                {showPhaseData ? `phase ${characterState.movePhase ?? "none"}` : null}
                {showPhaseData && showFrameData ? " · " : null}
                {showFrameData ? `frame ${debugData.frame}${debugData.totalFrames > 0 ? ` / ${debugData.totalFrames}` : ""}` : null}
              </div>
            )}
            {showInstanceData && <div>instance {characterState.moveInstanceId ?? "—"}</div>}
            {showActiveHitbox && (
              <div>
                active {debugData.activeHitboxes.length ? debugData.activeHitboxes.join(", ") : "—"}
              </div>
            )}
          </div>
        </Html>
      )}

      {showHurtboxes &&
        layout.hurtboxes.map((hurtbox) => (
        <group key={`hurt-${hurtbox.id}`} position={hurtbox.world}>
          <mesh renderOrder={10}>
            <cylinderGeometry args={[hurtbox.radius, hurtbox.radius, Math.max(0.08, hurtbox.height * 2), 16, 1, true]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.14} depthWrite={false} />
          </mesh>
          <mesh renderOrder={11}>
            <sphereGeometry args={[hurtbox.radius * 0.55, 10, 10]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={0.55} depthWrite={false} />
          </mesh>
        </group>
        ))}

      {showHitboxes && layout.hitboxes.map((hitbox) => {
        const socketWorld = socketLookup[hitbox.socket] ?? hitbox.world;
        const active = hitbox.active;
        const emphasizeActive = showActiveHitbox && active;
        const color = emphasizeActive ? "#fb7185" : "#f59e0b";

        return (
          <group key={`hit-${hitbox.id}`}>
            <Line
              points={[socketWorld, hitbox.world]}
              color={emphasizeActive ? "#ffffff" : accent}
              transparent
              opacity={emphasizeActive ? 0.95 : 0.45}
              lineWidth={emphasizeActive ? 2.4 : 1.2}
              depthWrite={false}
            />
            <group position={hitbox.world}>
              <mesh renderOrder={12}>
                <cylinderGeometry args={[hitbox.radius, hitbox.radius, Math.max(0.08, hitbox.height * 2), 16, 1, true]} />
                <meshBasicMaterial color={color} transparent opacity={emphasizeActive ? 0.22 : 0.09} depthWrite={false} />
              </mesh>
              <mesh renderOrder={13}>
                <sphereGeometry args={[Math.max(0.06, hitbox.radius * 0.45), 10, 10]} />
                <meshBasicMaterial color={color} transparent opacity={emphasizeActive ? 0.9 : 0.45} depthWrite={false} />
              </mesh>
              {emphasizeActive && (
                <Html center transform={false} style={{ pointerEvents: "none" }}>
                  <div
                    style={{
                      border: "1px solid rgba(255,255,255,0.45)",
                      background: "rgba(15, 23, 42, 0.9)",
                      color: "#fef2f2",
                      borderRadius: 999,
                      padding: "2px 7px",
                      fontFamily: "monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {hitbox.id}
                  </div>
                </Html>
              )}
            </group>
          </group>
        );
      })}

      {showSockets && layout.sockets.map((socket) => (
        <mesh key={`socket-${socket.id}`} position={socket.world} renderOrder={14}>
          <sphereGeometry args={[SOCKET_RADIUS, 10, 10]} />
          <meshBasicMaterial
            color={activeSockets.has(socket.id) ? "#fef08a" : accent}
            transparent
            opacity={activeSockets.has(socket.id) ? 0.9 : 0.48}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

export default CombatDebugOverlay;
