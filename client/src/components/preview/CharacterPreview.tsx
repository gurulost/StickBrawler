import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import StickFigure from "../../game/StickFigure";
import { useCustomization } from "../../lib/stores/useCustomization";
import { ParticleEffect, AuraEffect } from "../ui/particle-effects";

const basePreviewState = {
  health: 100,
  position: [0, 0, 0] as [number, number, number],
  direction: 1 as 1 | -1,
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

export function CharacterPreview({ isPlayer, className = "", animate = false }: CharacterPreviewProps) {
  const { getPlayerColors, getPlayerStyle, getCPUColors, getCPUStyle } = useCustomization();
  const colors = isPlayer ? getPlayerColors() : getCPUColors();
  const style = isPlayer ? getPlayerStyle() : getCPUStyle();
  const [pose, setPose] = useState(() => ({ ...basePreviewState }));

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

  const characterState = useMemo(() => ({ ...basePreviewState, ...pose }), [pose]);

  return (
    <div
      className={`h-64 w-full bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg overflow-hidden ${className} relative`}
    >
      <Canvas camera={{ position: [0, 0.8, 4], fov: 60 }} style={{ width: "100%", height: "100%" }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[-10, -10, -5]} intensity={0.5} />
          {colors?.specialEffect && (
            <ParticleEffect
              theme={colors.specialEffect}
              count={style?.particleCount || 5}
              intensity={style?.glowIntensity || 0.5}
            />
          )}
          {colors?.glow && (
            <AuraEffect color={colors.glow} intensity={style?.glowIntensity || 0.5} radius={1.2} />
          )}
          <StickFigure
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
            minDistance={2.5}
            maxDistance={6}
            target={[0, 0.9, 0]}
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
    </div>
  );
}
