import type { FC } from "react";
import { colorThemes, figureStyles, useCustomization } from "../../lib/stores/useCustomization";
import InkPart from "./InkPart";

type ColorThemeValues = (typeof colorThemes)[keyof typeof colorThemes];
type FigureStyleValues = (typeof figureStyles)[keyof typeof figureStyles];

type AccessoryValues = {
  name: string;
  geometry: unknown;
  effect?: string | null;
  emissive?: boolean;
  animated?: boolean;
  rimColor?: string;
  shadeBands?: number;
  lineWidth?: number;
  outlineColor?: string;
  glow?: number;
  color: string;
};

interface AccessoryRigProps {
  colors: ColorThemeValues;
  style: FigureStyleValues;
  accessory: AccessoryValues;
  lean: number;
  isPlayer: boolean;
  attackType: string | null;
  animationPhase: number;
  isAttacking: boolean;
  isJumping: boolean;
  isBlocking: boolean;
  speedRatio: number;
  time: number;
}

const AccessoryRig: FC<AccessoryRigProps> = ({
  colors,
  style,
  accessory,
  lean,
  isPlayer,
  attackType,
  animationPhase,
  isAttacking,
  isJumping,
  isBlocking,
  speedRatio,
  time,
}) => {
  const { getPlayerInkParams, getCPUInkParams } = useCustomization();
  const inkParams = isPlayer ? getPlayerInkParams() : getCPUInkParams();

  if (accessory.name === "None" || !accessory.geometry) {
    return null;
  }

  const baseColor = accessory.color || colors.secondary;
  const accentColor = colors.emissive ?? colors.tertiary ?? colors.secondary;
  const highlightColor = colors.glow ?? "#ffffff";
  const shadeBands = accessory.shadeBands ?? inkParams.shadeBands;
  const outlineColor = accessory.outlineColor ?? inkParams.outlineColor;
  const glow = accessory.emissive ? Math.max(accessory.glow ?? 0.2, inkParams.glow + 0.18) : inkParams.glow;
  const lineBoost = 1 + inkParams.lineWidth + (accessory.lineWidth ?? 0) * 0.25;
  const attackPulse = isAttacking ? animationPhase / 5 : 0;
  const bob = Math.sin(time * 2.1) * 0.025;
  const flare = Math.sin(time * 5.2) * 0.06;
  const drift = Math.cos(time * 1.8) * 0.04;
  const shimmer = Math.sin(time * 7.4) * 0.045;
  const jumpLift = isJumping ? 0.08 : 0;
  const sprintPull = speedRatio * 0.16;
  const blockRaise = isBlocking ? 0.1 : 0;
  const attackReach = isAttacking ? 0.08 + attackPulse * 0.16 : 0;
  const isTaunting = attackType === "taunt";
  const isSpecial = attackType === "special";
  const tauntLift = isTaunting ? 0.08 : 0;
  const tauntPulse = isTaunting ? (Math.sin(time * 8) * 0.5 + 0.5) * 0.12 : 0;
  const braceTuck = isBlocking ? 0.12 : 0;

  const headMount = [lean * 0.12, 1.8 + style.headSize * 0.52, 0] as [number, number, number];
  const torsoMount = [lean * 0.08, 1.1, 0] as [number, number, number];
  const backMount = [lean * 0.06, 1.12, -0.14] as [number, number, number];
  const rightHandMount = [-0.42, 0.92, 0.02] as [number, number, number];
  const leftHandMount = [0.42, 0.96, 0.08] as [number, number, number];

  switch (accessory.name) {
    case "Wizard Hat":
      return (
        <group
          position={[headMount[0], headMount[1] + bob * 0.5, headMount[2]]}
          rotation={[0, 0, lean * 0.25 + drift * 0.2]}
        >
          <InkPart
            position={[0, 0.02, 0]}
            baseColor={baseColor}
            rimColor={accessory.rimColor ?? highlightColor}
            shadeBands={shadeBands}
            glow={glow}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <cylinderGeometry args={[0.28, 0.34, 0.045, 28]} />}
          />
          <InkPart
            position={[0, 0.19, 0]}
            baseColor={baseColor}
            rimColor={accessory.rimColor ?? highlightColor}
            shadeBands={shadeBands}
            glow={glow + 0.06}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <coneGeometry args={[0.19, 0.46, 28]} />}
          />
          <InkPart
            position={[0, 0.06, 0.12]}
            rotation={[0.12, 0, 0]}
            baseColor={accentColor}
            rimColor={highlightColor}
            shadeBands={4}
            glow={glow + 0.1}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <torusGeometry args={[0.07, 0.018, 12, 24]} />}
          />
          <InkPart
            position={[Math.sin(time * 2.6) * 0.03, 0.28 + bob, 0.01]}
            baseColor={highlightColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={glow + 0.22}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <sphereGeometry args={[0.06, 20, 20]} />}
          />
        </group>
      );
    case "Cyber Visor":
      return (
        <group
          position={[headMount[0], headMount[1], headMount[2]]}
          rotation={[0, 0, lean * 0.16 + drift * 0.08]}
        >
          <InkPart
            position={[0, -0.08, 0.17]}
            baseColor={baseColor}
            rimColor={highlightColor}
            shadeBands={2}
            glow={glow + 0.08}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.38, 0.11, 0.16]} />}
          />
          <InkPart
            position={[0, -0.08 + Math.sin(time * 6) * 0.02, 0.24]}
            baseColor={highlightColor}
            rimColor="#ffffff"
            shadeBands={2}
            glow={glow + 0.22}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.3, 0.026, 0.04]} />}
          />
          <InkPart
            position={[-0.21, -0.06, 0.1]}
            baseColor={accentColor}
            rimColor={highlightColor}
            shadeBands={2}
            glow={glow}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.07, 0.09, 0.12]} />}
          />
          <InkPart
            position={[0.21, -0.06, 0.1]}
            baseColor={accentColor}
            rimColor={highlightColor}
            shadeBands={2}
            glow={glow}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.07, 0.09, 0.12]} />}
          />
        </group>
      );
    case "Energy Cape":
      return (
        <group
          position={[backMount[0], backMount[1] - jumpLift * 0.15 + tauntLift * 0.2, backMount[2] - sprintPull * 0.2]}
          rotation={[0.12 + sprintPull * 0.4 - braceTuck * 0.2, 0, 0]}
        >
          <InkPart
            position={[0, 0.12, -0.02]}
            baseColor={accentColor}
            rimColor={highlightColor}
            shadeBands={3}
            glow={glow + 0.08}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.16, 0.09, 0.08]} />}
          />
          {[
            { x: -0.17, width: 0.18, height: 0.72, yaw: 0.16, roll: 0.1 },
            { x: 0, width: 0.16, height: 0.8, yaw: 0, roll: 0 },
            { x: 0.17, width: 0.18, height: 0.72, yaw: -0.16, roll: -0.1 },
          ].map((panel, index) => (
            <InkPart
              key={`cape-panel-${panel.x}`}
              position={[
                panel.x,
                -0.2 + bob * 0.25 + (index === 1 ? tauntLift * 0.25 : 0),
                -0.04 - sprintPull * 0.2 - (index === 1 ? 0.02 : 0),
              ]}
              rotation={[
                0.16 + sprintPull * 0.6 + jumpLift * 0.4 + tauntPulse * 0.8 - braceTuck * 0.3,
                panel.yaw + flare * 0.35 + (isSpecial ? panel.x * 0.35 : 0),
                panel.roll + panel.x * (0.35 + tauntPulse * 2) + shimmer * (index - 1),
              ]}
              baseColor={index === 1 ? accentColor : baseColor}
              rimColor={highlightColor}
              shadeBands={shadeBands}
              glow={glow + (index === 1 ? 0.08 : 0)}
              outlineColor={outlineColor}
              outlineScale={lineBoost}
              doubleSided
              renderGeometry={() => <boxGeometry args={[panel.width, panel.height, 0.03]} />}
            />
          ))}
          {(speedRatio > 0.2 || isTaunting || isJumping) && (
            <InkPart
              position={[0, -0.54 + bob * 0.2, -0.09 - sprintPull * 0.25]}
              rotation={[0.26 + sprintPull * 0.65 + tauntPulse, 0, shimmer * 1.8]}
              baseColor={highlightColor}
              rimColor="#ffffff"
              shadeBands={4}
              glow={glow + 0.16}
              outlineColor={outlineColor}
              outlineScale={lineBoost}
              doubleSided
              renderGeometry={() => <boxGeometry args={[0.12, 0.48, 0.02]} />}
            />
          )}
        </group>
      );
    case "Flame Sword":
      return (
        <group
          position={[
            rightHandMount[0] + attackReach * 0.18,
            rightHandMount[1] + blockRaise * 0.22,
            rightHandMount[2] + attackReach * 0.14,
          ]}
          rotation={[
            isJumping ? -0.18 : 0,
            attackType === "special" ? 0.25 : 0,
            -0.42 - attackPulse * 0.5 + (isBlocking ? 0.3 : 0) + drift * 0.08,
          ]}
        >
          <InkPart
            position={[0, -0.08, 0]}
            baseColor={outlineColor}
            rimColor={accentColor}
            shadeBands={2}
            glow={0.04}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <cylinderGeometry args={[0.024, 0.024, 0.22, 12]} />}
          />
          <InkPart
            position={[0, 0.02, 0]}
            baseColor={accentColor}
            rimColor={highlightColor}
            shadeBands={3}
            glow={glow}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.22, 0.05, 0.06]} />}
          />
          <InkPart
            position={[0, 0.42 + attackReach * 0.28, 0]}
            baseColor={baseColor}
            rimColor={highlightColor}
            shadeBands={3}
            glow={glow + 0.08}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.08, 0.78, 0.04]} />}
          />
          <InkPart
            position={[0, 0.42 + attackReach * 0.28, 0.03]}
            baseColor={highlightColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={glow + 0.2}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.025, 0.68, 0.02]} />}
          />
          {(isAttacking || isSpecial) && (
            <>
              <InkPart
                position={[0.03, 0.34 + attackReach * 0.18, -0.03]}
                rotation={[0, isSpecial ? 0.2 : 0, -0.22 - attackPulse * 0.6]}
                baseColor={accentColor}
                rimColor={highlightColor}
                shadeBands={2}
                glow={glow + 0.24}
                outlineColor={outlineColor}
                outlineScale={lineBoost}
                doubleSided
                renderGeometry={() => <boxGeometry args={[0.12 + attackReach * 0.45, 0.62, 0.02]} />}
              />
              <InkPart
                position={[-0.04, 0.28 + attackReach * 0.12, -0.05]}
                rotation={[0, -0.16, 0.24 + attackPulse * 0.45]}
                baseColor={highlightColor}
                rimColor="#ffffff"
                shadeBands={2}
                glow={glow + 0.28}
                outlineColor={outlineColor}
                outlineScale={lineBoost}
                doubleSided
                renderGeometry={() => <boxGeometry args={[0.08 + attackReach * 0.35, 0.48, 0.018]} />}
              />
            </>
          )}
        </group>
      );
    case "Crystal Shield":
      return (
        <group
          position={[
            leftHandMount[0] - (isBlocking ? 0.04 : 0),
            leftHandMount[1] + blockRaise * 0.36,
            leftHandMount[2] + (isBlocking ? 0.08 : 0),
          ]}
          rotation={[0.08 + drift * 0.05, 0.26 + (isBlocking ? 0.24 : 0), 0.18 + (isBlocking ? 0.18 : 0)]}
        >
          <InkPart
            baseColor={baseColor}
            rimColor={highlightColor}
            shadeBands={4}
            glow={glow + 0.12}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <octahedronGeometry args={[0.24, 0]} />}
          />
          <InkPart
            position={[0, 0, 0.02]}
            baseColor={accentColor}
            rimColor={highlightColor}
            shadeBands={3}
            glow={glow + 0.04}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.06, 0.38, 0.05]} />}
          />
          <InkPart
            position={[0, 0, 0.02]}
            baseColor={accentColor}
            rimColor={highlightColor}
            shadeBands={3}
            glow={glow + 0.04}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.38, 0.06, 0.05]} />}
          />
          {isBlocking && (
            <>
              <InkPart
                position={[0, 0, 0.08]}
                rotation={[Math.PI / 2, 0, time * 1.6]}
                baseColor={highlightColor}
                rimColor="#ffffff"
                shadeBands={4}
                glow={glow + 0.2}
                outlineColor={outlineColor}
                outlineScale={lineBoost}
                renderGeometry={() => <torusGeometry args={[0.34, 0.02, 16, 40]} />}
              />
              {[0, 1, 2].map((index) => {
                const angle = time * 2.2 + index * (Math.PI * 2 / 3);
                return (
                  <InkPart
                    key={`shield-orbit-${index}`}
                    position={[Math.cos(angle) * 0.24, Math.sin(angle) * 0.18, 0.1]}
                    rotation={[angle * 0.4, angle, 0.22]}
                    baseColor={accentColor}
                    rimColor={highlightColor}
                    shadeBands={4}
                    glow={glow + 0.12}
                    outlineColor={outlineColor}
                    outlineScale={lineBoost}
                    renderGeometry={() => <octahedronGeometry args={[0.055, 0]} />}
                  />
                );
              })}
            </>
          )}
        </group>
      );
    case "Ninja Mask":
      return (
        <group
          position={[headMount[0], headMount[1], headMount[2]]}
          rotation={[0, 0, lean * 0.18 + drift * 0.06]}
        >
          <InkPart
            position={[0, -0.09, 0.17]}
            baseColor={baseColor}
            rimColor={accessory.rimColor ?? accentColor}
            shadeBands={2}
            glow={glow}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.34, 0.17, 0.1]} />}
          />
          <InkPart
            position={[0, -0.08, 0.23]}
            baseColor={highlightColor}
            rimColor="#ffffff"
            shadeBands={2}
            glow={glow + 0.06}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.24, 0.02, 0.02]} />}
          />
        </group>
      );
    case "Divine Halo":
      return (
        <group
          position={[headMount[0], headMount[1] + 0.04 + bob + jumpLift * 0.25 + tauntLift * 0.4, headMount[2]]}
          rotation={[Math.PI / 2, 0, time * 0.8]}
        >
          <InkPart
            position={[0, 0.24, 0]}
            baseColor={baseColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={glow + 0.22}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <torusGeometry args={[0.26, 0.026, 20, 48]} />}
          />
          {[-0.18, 0, 0.18].map((x, index) => (
            <InkPart
              key={`halo-orb-${x}`}
              position={[x, 0.24 + Math.sin(time * 2 + index) * 0.05, 0]}
              baseColor={highlightColor}
              rimColor="#ffffff"
              shadeBands={4}
              glow={glow + 0.18}
              outlineColor={outlineColor}
              outlineScale={lineBoost}
              renderGeometry={() => <sphereGeometry args={[0.03, 16, 16]} />}
            />
          ))}
          {isTaunting && (
            <>
              <InkPart
                position={[0, 0.24, 0]}
                baseColor={accentColor}
                rimColor="#ffffff"
                shadeBands={4}
                glow={glow + 0.28}
                outlineColor={outlineColor}
                outlineScale={lineBoost}
                renderGeometry={() => <torusGeometry args={[0.38, 0.018, 20, 52]} />}
              />
              {[-0.28, 0, 0.28].map((x) => (
                <InkPart
                  key={`halo-sigil-${x}`}
                  position={[x, 0.08 + Math.sin(time * 4 + x * 3) * 0.05, 0]}
                  rotation={[0, 0, x]}
                  baseColor={highlightColor}
                  rimColor="#ffffff"
                  shadeBands={4}
                  glow={glow + 0.16}
                  outlineColor={outlineColor}
                  outlineScale={lineBoost}
                  renderGeometry={() => <boxGeometry args={[0.06, 0.18, 0.018]} />}
                />
              ))}
            </>
          )}
        </group>
      );
    case "Demon Horns":
      return (
        <group
          position={[headMount[0], headMount[1], headMount[2]]}
          rotation={[0, 0, lean * 0.18 + flare * 0.05]}
        >
          <InkPart
            position={[-0.12, 0.14, 0]}
            rotation={[0, 0, -0.26]}
            baseColor={baseColor}
            rimColor={highlightColor}
            shadeBands={2}
            glow={glow}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <coneGeometry args={[0.06, 0.28, 12]} />}
          />
          <InkPart
            position={[0.12, 0.14, 0]}
            rotation={[0, 0, 0.26]}
            baseColor={baseColor}
            rimColor={highlightColor}
            shadeBands={2}
            glow={glow}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <coneGeometry args={[0.06, 0.28, 12]} />}
          />
          <InkPart
            position={[-0.11, 0.02 + Math.sin(time * 4.2) * 0.02, 0.02]}
            baseColor={accentColor}
            rimColor={highlightColor}
            shadeBands={2}
            glow={glow + 0.08}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <sphereGeometry args={[0.045, 16, 16]} />}
          />
          <InkPart
            position={[0.11, 0.02 + Math.cos(time * 4.2) * 0.02, 0.02]}
            baseColor={accentColor}
            rimColor={highlightColor}
            shadeBands={2}
            glow={glow + 0.08}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <sphereGeometry args={[0.045, 16, 16]} />}
          />
          {(isTaunting || isAttacking) && (
            <>
              <InkPart
                position={[-0.2, 0.3 + bob * 0.4, 0.02]}
                rotation={[0, 0, -0.4 + flare * 0.6]}
                baseColor={accentColor}
                rimColor={highlightColor}
                shadeBands={2}
                glow={glow + 0.16}
                outlineColor={outlineColor}
                outlineScale={lineBoost}
                renderGeometry={() => <boxGeometry args={[0.05, 0.22 + tauntPulse * 0.8, 0.018]} />}
              />
              <InkPart
                position={[0.2, 0.3 + bob * 0.4, 0.02]}
                rotation={[0, 0, 0.4 - flare * 0.6]}
                baseColor={accentColor}
                rimColor={highlightColor}
                shadeBands={2}
                glow={glow + 0.16}
                outlineColor={outlineColor}
                outlineScale={lineBoost}
                renderGeometry={() => <boxGeometry args={[0.05, 0.22 + tauntPulse * 0.8, 0.018]} />}
              />
            </>
          )}
        </group>
      );
    case "Angel Wings":
      return (
        <group position={[backMount[0], backMount[1] - jumpLift * 0.15 + tauntLift * 0.15, backMount[2] - sprintPull * 0.12]}>
          {[
            { side: -1, angle: 0.38 },
            { side: 1, angle: -0.38 },
          ].map(({ side, angle }) => (
            <group
              key={`wing-${side}`}
              position={[side * 0.16, 0.02 + bob * 0.3, -0.03]}
              rotation={[
                0.12 + jumpLift * 0.5 + tauntPulse * 0.6 - braceTuck * 0.25,
                side * (0.28 + (0.16 + speedRatio * 0.22 + (isJumping ? 0.14 : 0) + tauntPulse * 1.6 - braceTuck * 0.8) * side),
                angle + side * (0.16 + Math.sin(time * 4 + side) * 0.14 + speedRatio * 0.14 + tauntPulse * 1.8 - braceTuck * 0.6),
              ]}
            >
              {[
                { offset: 0.04, drop: -0.02, length: 0.56, width: 0.12, roll: 0.02, color: baseColor, extraGlow: 0.12 },
                { offset: 0.12, drop: -0.08, length: 0.44, width: 0.12, roll: 0.24, color: highlightColor, extraGlow: 0.18 },
                { offset: 0.19, drop: -0.15, length: 0.34, width: 0.11, roll: 0.38, color: accentColor, extraGlow: 0.12 },
                { offset: 0.24, drop: -0.21, length: 0.24, width: 0.09, roll: 0.56, color: highlightColor, extraGlow: 0.16 },
              ].map((feather, index) => (
                <InkPart
                  key={`wing-feather-${side}-${feather.offset}`}
                  position={[side * feather.offset, feather.drop + bob * 0.15 + tauntPulse * 0.05 * index, 0]}
                  rotation={[0, 0, side * (feather.roll + shimmer * 0.8 + (isSpecial ? 0.08 : 0))]}
                  baseColor={feather.color}
                  rimColor="#ffffff"
                  shadeBands={4}
                  glow={glow + feather.extraGlow + tauntPulse * 0.4}
                  outlineColor={outlineColor}
                  outlineScale={lineBoost}
                  doubleSided
                  renderGeometry={() => <boxGeometry args={[feather.width, feather.length, 0.022]} />}
                />
              ))}
            </group>
          ))}
        </group>
      );
    case "Royal Crown":
      return (
        <group
          position={[headMount[0], headMount[1] + bob * 0.4, headMount[2]]}
          rotation={[0, 0, lean * 0.18 + drift * 0.1]}
        >
          <InkPart
            position={[0, 0.08, 0]}
            baseColor={baseColor}
            rimColor={highlightColor}
            shadeBands={3}
            glow={glow + 0.08}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <cylinderGeometry args={[0.22, 0.24, 0.12, 24]} />}
          />
          {[-0.14, 0, 0.14].map((x, index) => (
            <InkPart
              key={`crown-spike-${x}`}
              position={[x, 0.24 + Math.sin(time * 3 + index) * 0.015, 0]}
              baseColor={baseColor}
              rimColor={highlightColor}
              shadeBands={3}
              glow={glow + 0.12}
              outlineColor={outlineColor}
              outlineScale={lineBoost}
              renderGeometry={() => <coneGeometry args={[0.045, 0.16, 12]} />}
            />
          ))}
          <InkPart
            position={[0, 0.18 + Math.sin(time * 3.4) * 0.03, 0.16]}
            baseColor={accentColor}
            rimColor="#ffffff"
            shadeBands={4}
            glow={glow + 0.18}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <octahedronGeometry args={[0.055, 0]} />}
          />
          {isTaunting && (
            <>
              <InkPart
                position={[0, 0.35 + bob * 0.3, 0.04]}
                baseColor={highlightColor}
                rimColor="#ffffff"
                shadeBands={4}
                glow={glow + 0.24}
                outlineColor={outlineColor}
                outlineScale={lineBoost}
                renderGeometry={() => <boxGeometry args={[0.05, 0.24, 0.018]} />}
              />
              {[-0.18, 0.18].map((x) => (
                <InkPart
                  key={`crown-flare-${x}`}
                  position={[x, 0.3 + Math.sin(time * 4 + x) * 0.03, 0.02]}
                  rotation={[0, 0, x > 0 ? 0.4 : -0.4]}
                  baseColor={accentColor}
                  rimColor={highlightColor}
                  shadeBands={4}
                  glow={glow + 0.16}
                  outlineColor={outlineColor}
                  outlineScale={lineBoost}
                  renderGeometry={() => <boxGeometry args={[0.045, 0.18, 0.016]} />}
                />
              ))}
            </>
          )}
        </group>
      );
    default:
      return (
        <group position={torsoMount}>
          <InkPart
            baseColor={baseColor}
            rimColor={highlightColor}
            shadeBands={shadeBands}
            glow={glow}
            outlineColor={outlineColor}
            outlineScale={lineBoost}
            renderGeometry={() => <boxGeometry args={[0.22, 0.22, 0.22]} />}
          />
        </group>
      );
  }
};

export default AccessoryRig;
