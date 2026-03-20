import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import StickFigure from "../../game/StickFigure";
import { useCustomization } from "../../lib/stores/useCustomization";
import { ParticleEffect, AuraEffect } from "../ui/particle-effects";
import type { FighterId } from "../../combat/moveTable";

const basePreviewState = {
  health: 100,
  position: [0, 0, 0] as [number, number, number],
  direction: 1 as 1 | -1,
  fighterId: "stick_hero" as const,
  isJumping: false,
  isAttacking: false,
  isBlocking: false,
  isDodging: false,
  isGrabbing: false,
  isTaunting: false,
  isAirAttacking: false,
  airJumpsLeft: 2,
  attackCooldown: 0,
  dodgeCooldown: 0,
  grabCooldown: 0,
  moveCooldown: 0,
  comboCount: 0,
  comboTimer: 0,
  lastMoveType: "",
  velocity: [0, 0, 0] as [number, number, number],
  guardMeter: 100,
  staminaMeter: 100,
  specialMeter: 0,
};

interface CharacterPreviewProps {
  isPlayer: boolean;
  className?: string;
  animate?: boolean;
}

function PreviewStage({ accentColor, glowColor }: { accentColor: string; glowColor: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <circleGeometry args={[1.65, 64]} />
        <meshStandardMaterial
          color="#10233d"
          emissive={accentColor}
          emissiveIntensity={0.16}
          roughness={0.55}
          metalness={0.2}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.055, 0]}>
        <torusGeometry args={[1.18, 0.045, 16, 56]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.42} />
      </mesh>
      <mesh position={[0, 1.1, -1.2]}>
        <torusGeometry args={[1.2, 0.03, 16, 56]} />
        <meshBasicMaterial color={glowColor} transparent opacity={0.28} />
      </mesh>
      <mesh position={[0, 0.95, -1.24]}>
        <circleGeometry args={[1.02, 64]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.12} />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.78, 0.92, 0.12, 48]} />
        <meshStandardMaterial
          color="#162b49"
          emissive={glowColor}
          emissiveIntensity={0.08}
          roughness={0.35}
          metalness={0.42}
        />
      </mesh>
    </group>
  );
}

export function CharacterPreview({ isPlayer, className = "", animate = false }: CharacterPreviewProps) {
  const {
    getPlayerColors,
    getPlayerStyle,
    getPlayerLoadout,
    getCPUColors,
    getCPUStyle,
    getCPULoadout,
  } = useCustomization();
  const colors = isPlayer ? getPlayerColors() : getCPUColors();
  const style = isPlayer ? getPlayerStyle() : getCPUStyle();
  const loadout = isPlayer ? getPlayerLoadout() : getCPULoadout();
  const [pose, setPose] = useState(() => ({ ...basePreviewState }));
  const fighterId: FighterId = isPlayer ? "stick_hero" : "stick_villain";
  const previewRenderKey = useMemo(
    () =>
      [
        loadout.colorTheme,
        loadout.figureStyle,
        loadout.figureBlendTargetStyle ?? "base",
        loadout.figureBlendAmount,
        loadout.accessory,
        loadout.accessoryColor,
        loadout.animationStyle,
        loadout.inkStyle,
        JSON.stringify(loadout.figureStyleOverrides ?? {}),
        JSON.stringify(loadout.inkOverrides ?? {}),
      ].join("|"),
    [loadout],
  );
  const particleKey = `${colors?.specialEffect ?? "none"}:${style?.particleCount ?? 0}`;
  const auraKey = `${colors?.glow ?? "none"}:${style?.glowIntensity ?? 0}`;

  useEffect(() => {
    if (!animate) return;
    let mounted = true;
    const sequence = () => {
      if (!mounted) return;
      setPose((prev) => ({
        ...prev,
        isAttacking: true,
        lastMoveType: "lightJab",
      }));
      setTimeout(() => {
        if (!mounted) return;
        setPose((prev) => ({
          ...prev,
          isAttacking: false,
          isJumping: true,
        }));
      }, 900);
      setTimeout(() => {
        if (!mounted) return;
        setPose((prev) => ({
          ...prev,
          isJumping: false,
          isTaunting: true,
        }));
      }, 1550);
      setTimeout(() => {
        if (!mounted) return;
        setPose((prev) => ({
          ...prev,
          isTaunting: false,
        }));
      }, 2300);
    };
    sequence();
    const interval = setInterval(sequence, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [animate]);

  const characterState = useMemo(
    () => ({
      ...basePreviewState,
      ...pose,
      fighterId,
    }),
    [fighterId, pose],
  );

  return (
    <div
      className={`h-64 w-full rounded-lg overflow-hidden ${className} relative bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.26),_rgba(15,23,42,0.95)_58%)]`}
    >
      <Canvas
        camera={{ position: [0, 1.08, 3.2], fov: 48 }}
        style={{ width: "100%", height: "100%" }}
        shadows
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <directionalLight position={[2.5, 4.5, 3]} intensity={1.25} castShadow />
          <directionalLight position={[-3, 2.5, -2]} intensity={0.5} />
          <pointLight position={[0, 2.4, 2.1]} intensity={0.9} color={colors?.glow ?? "#ffffff"} />
          <pointLight position={[0, 1.1, -2]} intensity={0.45} color={colors?.secondary ?? "#93c5fd"} />
          <PreviewStage
            accentColor={colors?.secondary ?? "#2563eb"}
            glowColor={colors?.glow ?? "#93c5fd"}
          />
          {colors?.specialEffect && (
            <ParticleEffect
              key={particleKey}
              theme={colors.specialEffect}
              count={style?.particleCount || 5}
              intensity={style?.glowIntensity || 0.5}
            />
          )}
          {colors?.glow && (
            <AuraEffect
              key={auraKey}
              color={colors.glow}
              intensity={style?.glowIntensity || 0.5}
              radius={1.2}
            />
          )}
          <StickFigure
            key={previewRenderKey}
            isPlayer={isPlayer}
            characterState={characterState}
            onPositionChange={() => {}}
            onVelocityChange={() => {}}
            onDirectionChange={() => {}}
            onJumpingChange={() => {}}
            onAttackingChange={() => {}}
            onBlockingChange={() => {}}
          />
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={2.2}
            maxDistance={5.4}
            target={[0, 1.05, 0]}
            maxPolarAngle={Math.PI / 1.8}
            minPolarAngle={Math.PI / 4}
          />
          <Environment preset="studio" />
        </Suspense>
      </Canvas>
      {colors?.name && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-60 rounded px-2 py-1">
          <span className="text-xs text-white font-medium">{colors.name}</span>
        </div>
      )}
      {style?.name && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-60 rounded px-2 py-1">
          <span className="text-xs text-white font-medium">{style.name}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-4 bottom-3 h-10 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.18),_rgba(15,23,42,0)_72%)] blur-md" />
    </div>
  );
}
