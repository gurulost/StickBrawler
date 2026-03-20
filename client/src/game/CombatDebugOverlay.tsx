import { Line } from "@react-three/drei";
import type { FC } from "react";
import { useMemo } from "react";
import { coreMoves, sampleCombatSpatialFrame } from "../combat";
import type { CharacterState } from "../lib/stores/useFighting";
import { useControls } from "../lib/stores/useControls";
import { toCombatState } from "./combatBridge";

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

  if (!debugMode) return null;

  return (
    <group>
      {layout.hurtboxes.map((hurtbox) => (
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

      {layout.hitboxes.map((hitbox) => {
        const socketWorld = socketLookup[hitbox.socket] ?? hitbox.world;
        const active = hitbox.active;
        const color = active ? "#fb7185" : "#f59e0b";

        return (
          <group key={`hit-${hitbox.id}`}>
            <Line
              points={[socketWorld, hitbox.world]}
              color={active ? "#ffffff" : accent}
              transparent
              opacity={active ? 0.95 : 0.45}
              lineWidth={active ? 2.4 : 1.2}
              depthWrite={false}
            />
            <group position={hitbox.world}>
              <mesh renderOrder={12}>
                <cylinderGeometry args={[hitbox.radius, hitbox.radius, Math.max(0.08, hitbox.height * 2), 16, 1, true]} />
                <meshBasicMaterial color={color} transparent opacity={active ? 0.22 : 0.09} depthWrite={false} />
              </mesh>
              <mesh renderOrder={13}>
                <sphereGeometry args={[Math.max(0.06, hitbox.radius * 0.45), 10, 10]} />
                <meshBasicMaterial color={color} transparent opacity={active ? 0.9 : 0.45} depthWrite={false} />
              </mesh>
            </group>
          </group>
        );
      })}

      {layout.sockets.map((socket) => (
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
