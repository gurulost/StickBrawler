import { useFrame } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react"; // Added useState back for lastPunch, lastKick
import { useKeyboardControls } from "@react-three/drei";
import { CharacterState } from "../lib/stores/useFighting";
import { Controls, useControls } from "../lib/stores/useControls";
import { Group, Mesh, DoubleSide } from "three"; // Mesh, DoubleSide might not be directly used here but kept if Stickfigure/* needs it
import * as THREE from "three";
import { 
  applyGravity, 
  stayInArena, 
  JUMP_FORCE, 
  PLAYER_SPEED, 
  DRAG, 
  applyDrag 
} from "./Physics";
import { useAudio } from "../lib/stores/useAudio";
import { useCustomization } from "../lib/stores/useCustomization";

import { Head, Torso, Limbs } from "./stickfigure";
interface StickFigureProps {
  isPlayer: boolean;
  characterState: CharacterState;
  onPositionChange: (x: number, y: number, z: number) => void;
  onVelocityChange: (vx: number, vy: number, vz: number) => void;
  onDirectionChange: (direction: 1 | -1) => void;
  onJumpingChange: (isJumping: boolean) => void;
  onAttackingChange: (isAttacking: boolean) => void;
  onBlockingChange: (isBlocking: boolean) => void;
}

const StickFigure = ({
  isPlayer,
  characterState,
  onPositionChange,
  onVelocityChange,
  onDirectionChange,
  onJumpingChange,
  onAttackingChange,
  onBlockingChange
}: StickFigureProps) => {
  const groupRef = useRef<Group>(null);
  const [lastPunch, setLastPunch] = useState(0); // Kept useState for these as they weren't part of the conflict's focus
  const [lastKick, setLastKick] = useState(0); // Kept useState for these

  // Resolved Conflict 1: Kept from 'main' branch
  // animationPhase and attackType use refs to avoid triggering React state updates
  const attackType = useRef<'punch' | 'kick' | 'special' | 'air_attack' | 'grab' | 'dodge' | 'taunt' | null>(null);
  const animationPhase = useRef(0);
  const phaseTimer = useRef(0); // Added by 'main'

  const { playHit } = useAudio();
  
  const {
    getPlayerColors,
    getPlayerStyle,
    getPlayerAccessory,
    getCPUColors,
    getCPUStyle,
    getCPUAccessory
  } = useCustomization();
  
  const characterColors = isPlayer ? getPlayerColors() : getCPUColors();
  const characterStyle = isPlayer ? getPlayerStyle() : getCPUStyle();
  const characterAccessory = isPlayer ? getPlayerAccessory() : getCPUAccessory();
  
  const jump = useKeyboardControls<Controls>(state => state.jump);
  const backward = useKeyboardControls<Controls>(state => state.backward);
  const leftward = useKeyboardControls<Controls>(state => state.leftward);
  const rightward = useKeyboardControls<Controls>(state => state.rightward);
  const attack1 = useKeyboardControls<Controls>(state => state.attack1);
  const attack2 = useKeyboardControls<Controls>(state => state.attack2);
  const shield = useKeyboardControls<Controls>(state => state.shield);
  const special = useKeyboardControls<Controls>(state => state.special);
  const dodge = useKeyboardControls<Controls>(state => state.dodge);
  const airAttack = useKeyboardControls<Controls>(state => state.airAttack);
  const grab = useKeyboardControls<Controls>(state => state.grab);
  const taunt = useKeyboardControls<Controls>(state => state.taunt);
  
  const { 
    position, 
    direction, 
    isJumping, 
    isAttacking, 
    isBlocking,
    isDodging,
    isGrabbing,
    isTaunting,
    isAirAttacking,
    airJumpsLeft,
    velocity, 
    attackCooldown,
    comboCount
  } = characterState;
  const [x, y, z] = position;
  // const [vx, vy, vz] = velocity; // vx, vy, vz are read but not directly used in this component's render logic after destructuring.

  useEffect(() => {
    const keyDebugInterval = setInterval(() => {
      if (isPlayer && useControls.getState().debugMode) {
        if (Math.random() < 0.05) {
          if (jump) console.log("Jump key pressed, playerY:", y, "isJumping:", isJumping, "airJumpsLeft:", airJumpsLeft);
          if (leftward) console.log("Left key detected in StickFigure");
          if (rightward) console.log("Right key detected in StickFigure");
          if (attack1) console.log("Quick attack key detected in StickFigure");
          if (attack2) console.log("Strong attack key detected in StickFigure");
          if (shield) console.log("Shield key detected in StickFigure");
          if (special) console.log("Special key detected in StickFigure");
          if (dodge) console.log("Dodge key detected in StickFigure");
          if (airAttack) console.log("Air attack key detected in StickFigure");
          if (grab) console.log("Grab key detected in StickFigure");
          if (taunt) console.log("Taunt key detected in StickFigure");
          if (isJumping && y > 0.1) {
            console.log("Player in air at height:", y.toFixed(2), "Air jumps left:", airJumpsLeft);
          }
        }
      }
    }, 500);
    
    return () => clearInterval(keyDebugInterval);
  }, [isPlayer, jump, y, isJumping, airJumpsLeft, leftward, rightward, attack1, attack2, shield, special, dodge, airAttack, grab, taunt]); // Added dependencies

  // Resolved Conflict 2: Kept the new useFrame from 'main' and the modified subsequent one

  // Enhanced animation system for fluid, realistic martial arts movements (from main branch)
  useFrame((_, delta) => {
    phaseTimer.current += delta;
    if (phaseTimer.current < 0.06) return;
    phaseTimer.current = 0;

    if (isAttacking) {
      if (isPlayer) {
        if (isAirAttacking || (airAttack && isJumping)) {
          attackType.current = 'air_attack';
        }
        else if (isDodging || dodge) {
          attackType.current = 'dodge';
        }
        else if (isGrabbing || grab) {
          attackType.current = 'grab';
        }
        else if (isTaunting || taunt) {
          attackType.current = 'taunt';
        }
        else if (attack1) {
          attackType.current = 'punch';
        }
        else if (attack2) {
          attackType.current = 'kick';
        }
        else if (special) {
          attackType.current = 'special';
        }
        else {
          attackType.current = 'punch';
        }
      } else if (!attackType.current) { // CPU attack type logic
        const attackRandom = Math.random();
        if (attackRandom < 0.45) {
          attackType.current = 'punch';
        }
        else if (attackRandom < 0.75) {
          attackType.current = 'kick';
        }
        else if (attackRandom < 0.9) {
          attackType.current = 'special';
        }
        else if (attackRandom < 0.95) {
          attackType.current = 'grab';
        }
        else {
          attackType.current = 'air_attack';
        }
      }

      animationPhase.current = (animationPhase.current + 1) % 6;
      if (!isPlayer && Math.random() < 0.1) { // Slightly different animation update for CPU from main
        animationPhase.current = (animationPhase.current + 1) % 6;
      }
    } else {
      if (attackType.current !== null) {
        attackType.current = null;
      }

      if (animationPhase.current > 0) {
        animationPhase.current = Math.max(0, animationPhase.current - 1);
      }
    }
  });
  
  // Process attack type changes independently (this is the simplified second useFrame from main)
  useFrame(() => {
    if (isAttacking && !attackType.current) { // Condition from main
      if (isPlayer) {
        if (isAirAttacking || (airAttack && isJumping)) attackType.current = 'air_attack';
        else if (isDodging || dodge) attackType.current = 'dodge';
        else if (isGrabbing || grab) attackType.current = 'grab';
        else if (isTaunting || taunt) attackType.current = 'taunt';
        else if (attack1) attackType.current = 'punch';
        else if (attack2) attackType.current = 'kick';
        else if (special) attackType.current = 'special';
        else attackType.current = 'punch'; // Default player attack type from main
      }
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={[x, y, z]} 
      scale={[direction, 1, 1]} 
      rotation={[0, direction < 0 ? Math.PI : 0, 0]}
    >
      <Head colors={characterColors} style={characterStyle} accessory={characterAccessory} isAttacking={isAttacking} />
      <Torso colors={characterColors} style={characterStyle} />
      <Limbs colors={characterColors} style={characterStyle} attackType={attackType.current} animationPhase={animationPhase.current} isBlocking={isBlocking} isAttacking={isAttacking} isJumping={isJumping} direction={direction} />

      
      {/* Visual indicators for different actions */}
      
      {isBlocking && (
        <mesh position={[0, 1.2, 0.2]}>
          <torusGeometry args={[0.4, 0.08, 24, 48]} />
          <meshStandardMaterial 
            color={"#32cd32"} 
            transparent={true}
            opacity={0.8}
            emissive={"#32cd32"}
            emissiveIntensity={0.3 + Math.sin(Date.now() * 0.01) * 0.2}
          />
        </mesh>
      )}
      
      {isDodging && (
        <group>
          <mesh position={[direction * -0.4, 0.8, 0]}>
            <sphereGeometry args={[0.3, 12, 12]} />
            <meshStandardMaterial 
              color={"#1e90ff"} 
              transparent={true}
              opacity={0.6 - animationPhase.current * 0.1}
              emissive={"#1e90ff"}
              emissiveIntensity={0.6}
            />
          </mesh>
          
          <mesh position={[direction * -0.7, 0.8, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial 
              color={"#87cefa"} 
              transparent={true}
              opacity={0.3 - animationPhase.current * 0.1}
              emissive={"#87cefa"}
              emissiveIntensity={0.4}
            />
          </mesh>
        </group>
      )}
      
      {isAirAttacking && isJumping && (
        <group>
          <mesh position={[0, -0.4, 0]}>
            <coneGeometry args={[0.3, 0.6, 24]} />
            <meshStandardMaterial 
              color={"#ff4500"} 
              transparent={true}
              opacity={0.7}
              emissive={"#ff4500"}
              emissiveIntensity={0.5 + animationPhase.current * 0.2}
            />
          </mesh>
          
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh 
              key={i} 
              position={[
                (Math.sin(Date.now() * 0.001 * (i + 1)) * 0.2), 
                -0.5 - (i * 0.1), 
                (Math.cos(Date.now() * 0.001 * (i + 1)) * 0.2)
              ]}
            >
              <sphereGeometry args={[0.05 + Math.random() * 0.05, 8, 8]} />
              <meshStandardMaterial 
                color={"#ffcc00"} 
                transparent={true}
                opacity={0.5 - (i * 0.1)}
                emissive={"#ffcc00"}
                emissiveIntensity={0.7}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {isGrabbing && (
        <group>
          <mesh position={[direction * 0.5, 1.0, 0.2]} rotation={[0, 0, direction * Math.PI / 4]}>
            <torusGeometry args={[0.2, 0.05, 16, 24, Math.PI]} />
            <meshStandardMaterial 
              color={"#ffd700"} 
              transparent={true}
              opacity={0.8}
              emissive={"#ffd700"}
              emissiveIntensity={0.6}
            />
          </mesh>
          
          <mesh 
            position={[direction * 0.7, 1.0, 0.1]} 
            rotation={[0, 0, direction * Math.PI / 2]}
          >
            <coneGeometry args={[0.1, 0.2, 8]} />
            <meshStandardMaterial 
              color={"#f5deb3"} 
              transparent={true}
              opacity={0.6}
              emissive={"#f5deb3"}
              emissiveIntensity={0.4 + Math.sin(Date.now() * 0.01) * 0.2}
            />
          </mesh>
        </group>
      )}
      
      {isTaunting && (
        <group>
          <mesh position={[0, 2.2, 0]}>
            <sphereGeometry args={[0.15, 12, 12]} />
            <meshStandardMaterial 
              color={"#ff69b4"} 
              transparent={true}
              opacity={0.7 + Math.sin(Date.now() * 0.01) * 0.3}
              emissive={"#ff69b4"}
              emissiveIntensity={0.8}
            />
          </mesh>
          
          {Array.from({ length: 4 }).map((_, i) => (
            <mesh 
              key={i} 
              position={[
                Math.sin(Date.now() * 0.001 * (i + 1) + i * Math.PI/2) * 0.3, 
                2.0 + Math.sin(Date.now() * 0.002 * (i + 1)) * 0.2, 
                Math.cos(Date.now() * 0.001 * (i + 1) + i * Math.PI/2) * 0.3
              ]}
            >
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial 
                color={"#ff1493"} 
                transparent={true}
                opacity={0.5}
                emissive={"#ff1493"}
                emissiveIntensity={0.6 + Math.sin(Date.now() * 0.01 * (i + 1)) * 0.4}
              />
            </mesh>
          ))}
        </group>
      )}
      
      {comboCount > 1 && (
        <group position={[0, 2.5, 0]}>
          <mesh position={[0, 0, -0.15]}>
            <planeGeometry args={[0.8, 0.4]} />
            <meshStandardMaterial 
              color={"#000000"} 
              transparent={true}
              opacity={0.7}
              emissive={
                comboCount >= 20 ? "#880000" :
                comboCount >= 10 ? "#884400" :
                comboCount >= 5 ? "#888800" :
                "#000000"
              }
              emissiveIntensity={0.2 + Math.min(comboCount / 50, 0.5)}
            />
          </mesh>
          
          <mesh position={[0, 0, -0.12]} rotation={[0, 0, Date.now() * 0.001]}>
            <ringGeometry args={[0.35, 0.4, 32]} />
            <meshStandardMaterial 
              color={
                comboCount >= 20 ? "#ff0000" :
                comboCount >= 10 ? "#ff9900" :
                comboCount >= 5 ? "#ffff00" :
                "#ffffff"
              }
              transparent={true}
              opacity={0.4 + 0.3 * Math.sin(Date.now() * 0.002)}
              emissive={
                comboCount >= 20 ? "#ff0000" :
                comboCount >= 10 ? "#ff9900" :
                comboCount >= 5 ? "#ffff00" :
                "#ffffff"
              }
              emissiveIntensity={0.5}
            />
          </mesh>
          
          {Array.from({ length: Math.min(5, comboCount) }).map((_, i) => (
            <group key={i}>
              <mesh position={[(i - 2) * 0.15, 0, 0]}>
                <sphereGeometry args={[0.06, 12, 12]} />
                <meshStandardMaterial 
                  color={
                    comboCount >= 20 ? "#ff0000" :   
                    comboCount >= 10 ? "#ff9900" :    
                    comboCount >= 5 ? "#ffff00" :     
                    "#ffffff"                         
                  } 
                  emissive={
                    comboCount >= 20 ? "#ff0000" :
                    comboCount >= 10 ? "#ff9900" :
                    comboCount >= 5 ? "#ffff00" :
                    "#ffffff"
                  }
                  emissiveIntensity={0.6 + 0.4 * Math.sin(Date.now() * 0.005 * comboCount + i)}
                />
              </mesh>
              
              {comboCount >= 10 && (
                <mesh 
                  position={[
                    (i - 2) * 0.15, 
                    0.1 * Math.sin(Date.now() * 0.003 * (i + 1)), 
                    0.05
                  ]}
                >
                  <sphereGeometry args={[0.02, 8, 8]} />
                  <meshStandardMaterial 
                    color={
                      comboCount >= 20 ? "#ffcc00" :
                      comboCount >= 10 ? "#ffff00" :
                      "#ffffff"
                    }
                    transparent={true}
                    opacity={0.7}
                    emissive={
                      comboCount >= 20 ? "#ffcc00" :
                      comboCount >= 10 ? "#ffff00" :
                      "#ffffff"
                    }
                    emissiveIntensity={0.8}
                  />
                </mesh>
              )}
            </group>
          ))}
        </group>
      )}
    </group>
  );
};

export default StickFigure;