import { colorThemes, figureStyles } from "../../lib/stores/useCustomization";
import type { FC } from "react";

export type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
export type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];

interface LimbsProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
  attackType: string | null;
  animationPhase: number;
  isBlocking: boolean;
  isAttacking: boolean;
  isJumping: boolean;
  direction: 1 | -1;
}

const Limbs: FC<LimbsProps> = ({
  colors,
  style,
  attackType,
  animationPhase,
  isBlocking,
  isAttacking,
  isJumping,
  direction
}) => (
  <>
    {/* Arms */}
    <group
      position={[0, 1.2, 0]}
      rotation={[
        // Left arm X rotation
        isBlocking ? Math.PI / 4 :
        attackType === 'punch' ? -Math.PI / 4 - animationPhase * 0.3 :
        attackType === 'kick' ? Math.PI / 4 :
        attackType === 'special' ? Math.PI / 2 - animationPhase * 0.2 :
        attackType === 'air_attack' ? -Math.PI / 2 + animationPhase * 0.2 :
        attackType === 'grab' ? Math.PI / 4 - animationPhase * 0.3 :
        attackType === 'dodge' ? -Math.PI / 6 - animationPhase * 0.1 :
        attackType === 'taunt' ? Math.PI / 2 + Math.sin(Date.now() * 0.05) * 0.3 :
        isJumping ? -Math.PI / 6 :
        0,
        // Left arm Y rotation
        attackType === 'special' ? animationPhase * Math.PI / 4 :
        attackType === 'air_attack' ? animationPhase * Math.PI / 5 :
        attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * Math.PI / 3 :
        0,
        // Left arm Z rotation
        isBlocking ? -Math.PI / 2 :
        attackType === 'punch' ? -Math.PI / 3 - animationPhase * 0.3 :
        attackType === 'kick' ? -Math.PI / 2 + Math.sin(Date.now() * 0.03) * 0.1 :
        attackType === 'special' ? -Math.PI + animationPhase * Math.PI / 2 :
        attackType === 'air_attack' ? -Math.PI / 2 - animationPhase * 0.4 :
        attackType === 'grab' ? -Math.PI / 2 - animationPhase * 0.2 :
        attackType === 'dodge' ? -Math.PI / 4 + animationPhase * 0.1 :
        attackType === 'taunt' ? -Math.PI / 2 + Math.sin(Date.now() * 0.05) * 0.7 :
        isAttacking ? -Math.PI / 3 - Math.sin(Date.now() * 0.02) * 0.5 :
        isJumping ? -Math.PI / 6 :
        -Math.PI / 8 + Math.sin(Date.now() * 0.003) * 0.05
      ]}
    >
      {/* Left Arm */}
      <mesh
        position={[
          0.3,
          0,
          attackType === 'punch' ? animationPhase * 0.15 :
          attackType === 'grab' ? 0.3 + animationPhase * 0.15 :
          attackType === 'air_attack' ? -0.15 - animationPhase * 0.15 :
          0
        ]}
        castShadow
      >
        <cylinderGeometry args={[style.limbThickness, style.limbThickness, 0.7, 12]} />
        <meshStandardMaterial
          color={colors.secondary}
          metalness={style.metalness}
          roughness={style.roughness}
        />
      </mesh>
    </group>

    <group
      position={[0, 1.2, 0]}
      rotation={[
        // Right arm X rotation
        isBlocking ? -Math.PI / 4 :
        attackType === 'punch' ? Math.PI / 3 + animationPhase * 0.2 :
        attackType === 'kick' ? -Math.PI / 6 :
        attackType === 'special' ? Math.PI / 2 + animationPhase * 0.2 :
        attackType === 'air_attack' ? -Math.PI / 2 - animationPhase * 0.1 :
        attackType === 'grab' ? Math.PI / 4 + animationPhase * 0.2 :
        attackType === 'dodge' ? -Math.PI / 6 + animationPhase * 0.1 :
        attackType === 'taunt' ? Math.PI / 2 - Math.sin(Date.now() * 0.05) * 0.3 :
        isJumping ? Math.PI / 6 :
        0,
        // Right arm Y rotation
        attackType === 'special' ? -animationPhase * Math.PI / 4 :
        attackType === 'air_attack' ? -animationPhase * Math.PI / 5 :
        attackType === 'taunt' ? -Math.sin(Date.now() * 0.05) * Math.PI / 3 :
        0,
        // Right arm Z rotation
        isBlocking ? Math.PI / 2 :
        attackType === 'punch' ? Math.PI / 4 :
        attackType === 'kick' ? Math.PI / 3 + Math.sin(Date.now() * 0.03) * 0.15 :
        attackType === 'special' ? Math.PI - animationPhase * Math.PI / 2 :
        attackType === 'air_attack' ? Math.PI / 2 + animationPhase * 0.4 :
        attackType === 'grab' ? Math.PI / 2 + animationPhase * 0.2 :
        attackType === 'dodge' ? Math.PI / 4 - animationPhase * 0.1 :
        attackType === 'taunt' ? Math.PI / 2 - Math.sin(Date.now() * 0.05) * 0.7 :
        isAttacking ? Math.PI / 2 + Math.sin(Date.now() * 0.02) * 0.8 :
        isBlocking ? Math.PI / 2 :
        isJumping ? Math.PI / 6 :
        Math.PI / 8 + Math.sin(Date.now() * 0.003) * 0.05
      ]}
    >
      {/* Right Arm */}
      <mesh
        position={[
          -0.3,
          0,
          attackType === 'special' ? animationPhase * 0.15 :
          attackType === 'grab' ? 0.3 + animationPhase * 0.15 :
          attackType === 'air_attack' ? -0.15 - animationPhase * 0.15 :
          0
        ]}
        castShadow
      >
        <cylinderGeometry args={[style.limbThickness, style.limbThickness, 0.7, 12]} />
        <meshStandardMaterial
          color={colors.secondary}
          metalness={style.metalness}
          roughness={style.roughness}
        />
      </mesh>
    </group>

    {/* Legs */}
    <group
      position={[0, 0.5, 0]}
      rotation={[
        isJumping ? -Math.PI / 3 :
        attackType === 'kick' ? -Math.PI / 2 - animationPhase * 0.3 :
        attackType === 'special' ? -Math.PI / 6 - animationPhase * 0.1 :
        attackType === 'air_attack' ? -Math.PI / 3 - animationPhase * 0.2 :
        attackType === 'grab' ? -Math.PI / 10 - animationPhase * 0.05 :
        attackType === 'dodge' ? -Math.PI / 4 - animationPhase * 0.2 :
        attackType === 'taunt' ? -Math.PI / 6 + Math.sin(Date.now() * 0.05) * 0.2 :
        isAttacking ? -Math.PI / 8 :
        0,
        attackType === 'special' ? animationPhase * Math.PI / 6 :
        attackType === 'dodge' ? -animationPhase * Math.PI / 8 :
        attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * Math.PI / 4 :
        0,
        isJumping ? Math.PI / 6 :
        attackType === 'kick' ? Math.PI / 5 + animationPhase * 0.2 :
        attackType === 'punch' ? Math.PI / 10 + Math.sin(Date.now() * 0.03) * 0.1 :
        attackType === 'special' ? Math.PI / 4 + animationPhase * 0.2 :
        attackType === 'air_attack' ? Math.PI / 3 + animationPhase * 0.15 :
        attackType === 'grab' ? Math.PI / 6 + animationPhase * 0.1 :
        attackType === 'dodge' ? Math.PI / 3 - animationPhase * 0.2 :
        attackType === 'taunt' ? Math.PI / 6 + Math.sin(Date.now() * 0.05) * 0.4 :
        isAttacking ? Math.PI / 10 :
        Math.sin(Date.now() * 0.003) * 0.04
      ]}
    >
      {/* Left Leg */}
      <mesh
        position={[
          0.15,
          -0.35,
          attackType === 'kick' ? 0.2 + animationPhase * 0.2 :
          attackType === 'air_attack' ? -0.15 - animationPhase * 0.2 :
          attackType === 'dodge' ? 0.15 - animationPhase * 0.25 :
          0
        ]}
        castShadow
      >
        <cylinderGeometry args={[style.limbThickness, style.limbThickness, 0.7, 12]} />
        <meshStandardMaterial
          color={colors.secondary}
          metalness={style.metalness}
          roughness={style.roughness}
        />
      </mesh>
    </group>

    <group
      position={[0, 0.5, 0]}
      rotation={[
        isJumping ? Math.PI / 3 :
        attackType === 'kick' ? Math.PI / 6 :
        attackType === 'punch' ? Math.PI / 10 :
        attackType === 'special' ? Math.PI / 4 - animationPhase * 0.1 :
        attackType === 'air_attack' ? Math.PI / 3 - animationPhase * 0.1 :
        attackType === 'grab' ? Math.PI / 8 + animationPhase * 0.05 :
        attackType === 'dodge' ? Math.PI / 4 + animationPhase * 0.2 :
        attackType === 'taunt' ? Math.PI / 6 - Math.sin(Date.now() * 0.05) * 0.2 :
        isAttacking ? Math.PI / 8 :
        0,
        attackType === 'special' ? -animationPhase * Math.PI / 6 :
        attackType === 'dodge' ? animationPhase * Math.PI / 8 :
        attackType === 'taunt' ? -Math.sin(Date.now() * 0.05) * Math.PI / 4 :
        0,
        isJumping ? -Math.PI / 6 :
        attackType === 'kick' ? -Math.PI / 4 :
        attackType === 'punch' ? -Math.PI / 8 - Math.sin(Date.now() * 0.03) * 0.08 :
        attackType === 'special' ? -Math.PI / 4 - animationPhase * 0.2 :
        attackType === 'air_attack' ? -Math.PI / 3 - animationPhase * 0.1 :
        attackType === 'grab' ? -Math.PI / 6 - animationPhase * 0.1 :
        attackType === 'dodge' ? -Math.PI / 3 + animationPhase * 0.2 :
        attackType === 'taunt' ? -Math.PI / 6 - Math.sin(Date.now() * 0.05) * 0.4 :
        isAttacking ? -Math.PI / 10 :
        -Math.sin(Date.now() * 0.003) * 0.04
      ]}
    >
      {/* Right Leg */}
      <mesh
        position={[
          -0.15,
          -0.35,
          attackType === 'air_attack' ? -0.15 - animationPhase * 0.15 :
          attackType === 'dodge' ? -0.15 + animationPhase * 0.25 :
          0
        ]}
        castShadow
      >
        <cylinderGeometry args={[style.limbThickness, style.limbThickness, 0.7, 12]} />
        <meshStandardMaterial
          color={colors.secondary}
          metalness={style.metalness}
          roughness={style.roughness}
        />
      </mesh>
    </group>

    {/* Torso rotation group */}
    <group
      position={[0, 0.9, 0]}
      rotation={[
        attackType === 'punch' ? 0.1 + animationPhase * 0.05 :
        attackType === 'kick' ? -0.2 - animationPhase * 0.05 :
        attackType === 'special' ? Math.sin(Date.now() * 0.03) * 0.3 :
        attackType === 'air_attack' ? 0.3 + animationPhase * 0.1 :
        attackType === 'grab' ? 0.2 + animationPhase * 0.1 :
        attackType === 'dodge' ? (Math.random() > 0.5 ? 0.2 : -0.2) * animationPhase :
        attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * 0.3 :
        isAttacking ? Math.sin(Date.now() * 0.02) * 0.1 :
        0,
        attackType === 'special' ? animationPhase * Math.PI / 2 :
        attackType === 'punch' ? animationPhase * 0.2 :
        attackType === 'kick' ? -animationPhase * 0.15 :
        attackType === 'air_attack' ? animationPhase * Math.PI / 5 :
        attackType === 'grab' ? animationPhase * 0.25 :
        attackType === 'dodge' ? (Math.random() > 0.5 ? 0.4 : -0.4) * animationPhase :
        attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * Math.PI / 3 :
        0,
        attackType === 'punch' ? Math.sin(Date.now() * 0.03) * 0.15 :
        attackType === 'kick' ? Math.sin(Date.now() * 0.03) * 0.2 :
        attackType === 'special' ? Math.sin(Date.now() * 0.04) * 0.25 :
        attackType === 'air_attack' ? -0.1 - animationPhase * 0.1 :
        attackType === 'grab' ? Math.sin(Date.now() * 0.04) * 0.2 :
        attackType === 'dodge' ? (Math.random() > 0.5 ? 0.3 : -0.3) * animationPhase :
        attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * 0.4 :
        isAttacking ? Math.sin(Date.now() * 0.02) * 0.1 :
        Math.sin(Date.now() * 0.003) * 0.03
      ]}
    />
  </>
);

export default Limbs;
