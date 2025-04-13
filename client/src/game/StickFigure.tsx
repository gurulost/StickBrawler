import { useFrame } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { CharacterState } from "../lib/stores/useFighting";
import { Controls } from "../lib/stores/useControls";
import { Group, Mesh, DoubleSide } from "three";
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
  const [lastPunch, setLastPunch] = useState(0);
  const [lastKick, setLastKick] = useState(0);
  const [attackType, setAttackType] = useState<'punch' | 'kick' | 'special' | 'air_attack' | 'grab' | 'dodge' | 'taunt' | null>(null);
  const [animationPhase, setAnimationPhase] = useState(0);
  const { playHit } = useAudio();
  
  // Get customization settings
  const {
    getPlayerColors,
    getPlayerStyle,
    getPlayerAccessory,
    getCPUColors,
    getCPUStyle,
    getCPUAccessory
  } = useCustomization();
  
  // Get the appropriate customization for this character
  const characterColors = isPlayer ? getPlayerColors() : getCPUColors();
  const characterStyle = isPlayer ? getPlayerStyle() : getCPUStyle();
  const characterAccessory = isPlayer ? getPlayerAccessory() : getCPUAccessory();
  
  // Get keyboard controls - only used for player character with new control scheme
  const jump = useKeyboardControls<Controls>(state => state.jump);
  const backward = useKeyboardControls<Controls>(state => state.backward);
  const leftward = useKeyboardControls<Controls>(state => state.leftward);
  const rightward = useKeyboardControls<Controls>(state => state.rightward);
  const attack1 = useKeyboardControls<Controls>(state => state.attack1);
  const attack2 = useKeyboardControls<Controls>(state => state.attack2);
  const shield = useKeyboardControls<Controls>(state => state.shield);
  const special = useKeyboardControls<Controls>(state => state.special);
  // Advanced techniques
  const dodge = useKeyboardControls<Controls>(state => state.dodge);
  const airAttack = useKeyboardControls<Controls>(state => state.airAttack);
  const grab = useKeyboardControls<Controls>(state => state.grab);
  const taunt = useKeyboardControls<Controls>(state => state.taunt);
  
  // Destructure character state for more complete access
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
  const [vx, vy, vz] = velocity;

  // For debugging key presses only - removing dependency array to avoid blocking controls
  useEffect(() => {
    // Just debugging and logging - don't need to track key state changes
    const keyDebugInterval = setInterval(() => {
      if (isPlayer) {
        // Just occasional logging to avoid spamming
        if (Math.random() < 0.05) {
          // Log basic movement controls
          if (jump) console.log("Jump key pressed, playerY:", y, "isJumping:", isJumping, "airJumpsLeft:", airJumpsLeft);
          if (leftward) console.log("Left key detected in StickFigure");
          if (rightward) console.log("Right key detected in StickFigure");
          
          // Log attack controls with new scheme
          if (attack1) console.log("Quick attack key detected in StickFigure");
          if (attack2) console.log("Strong attack key detected in StickFigure");
          if (shield) console.log("Shield key detected in StickFigure");
          if (special) console.log("Special key detected in StickFigure");
          
          // Log Smash Bros style controls
          if (dodge) console.log("Dodge key detected in StickFigure");
          if (airAttack) console.log("Air attack key detected in StickFigure");
          if (grab) console.log("Grab key detected in StickFigure");
          if (taunt) console.log("Taunt key detected in StickFigure");
          
          // Log jumping state
          if (isJumping && y > 0.1) {
            console.log("Player in air at height:", y.toFixed(2), "Air jumps left:", airJumpsLeft);
          }
        }
      }
    }, 500);
    
    return () => clearInterval(keyDebugInterval);
  }, []);

  // Enhanced animation system for fluid, realistic martial arts movements
  useEffect(() => {
    // Set up a consistent animation interval that won't block controls
    // Using smaller interval (60ms) for smoother animations
    const animationInterval = setInterval(() => {
      // Attacking animations - dynamic based on attack type
      if (isAttacking) {
        // Determine which attack type is being performed
        if (isPlayer) {
          // Check current key states with prioritization for better control feel
          // Smash Bros style advanced techniques have highest priority
          if (isAirAttacking || (airAttack && isJumping)) {
            setAttackType('air_attack');
          } 
          else if (isDodging || dodge) {
            setAttackType('dodge');
          }
          else if (isGrabbing || grab) {
            setAttackType('grab');
          }
          else if (isTaunting || taunt) {
            setAttackType('taunt');
          }
          // Basic attack controls follow in priority
          else if (attack1) {
            setAttackType('punch'); // Quick attack -> punch animation
          }
          else if (attack2) {
            setAttackType('kick');  // Strong attack -> kick animation
          }
          else if (special) {
            setAttackType('special');
          }
          else {
            // Default - use punch as fallback for consistent animation
            setAttackType('punch'); 
          }
        } else {
          // For CPU, randomly choose attack type if not already set
          // This makes CPU animations match their actual attacks
          if (!attackType) {
            const attackRandom = Math.random();
            // Distribute CPU attacks with varied probabilities for more realistic combat
            if (attackRandom < 0.45) {
              setAttackType('punch'); // Most common
            }
            else if (attackRandom < 0.75) {
              setAttackType('kick');  // Medium probability
            }
            else if (attackRandom < 0.9) {
              setAttackType('special'); // Rare but powerful
            }
            else if (attackRandom < 0.95) {
              setAttackType('grab'); // Occasional grab attempt
            }
            else {
              setAttackType('air_attack'); // Rare air attack
            }
          }
        }
        
        // Update animation phase with non-linear progression for more natural movement
        // Use 6 phases instead of 4 for smoother transitions
        setAnimationPhase(phase => {
          // Wind-up, execution, follow-through pattern for martial arts moves
          const nextPhase = (phase + 1) % 6;
          
          // Add some randomization to make CPU movements less predictable
          if (!isPlayer && Math.random() < 0.1) {
            // Occasionally skip a frame for CPU to create variation
            return (phase + 2) % 6;
          }
          
          return nextPhase;
        });
      } 
      // Non-attacking animations (idle, walking, jumping)
      else {
        // Gradual reset for more natural transition out of attacks
        if (attackType !== null) {
          setAttackType(null);
        }
        
        // Smoothly reset animation phase rather than jumping to 0
        if (animationPhase > 0) {
          setAnimationPhase(phase => Math.max(0, phase - 1));
        }
      }
    }, 60); // Faster interval for smoother animations
    
    return () => clearInterval(animationInterval);
  }, [isAttacking, isPlayer, attackType, animationPhase, 
      isAirAttacking, isDodging, isGrabbing, isTaunting, 
      airAttack, dodge, grab, taunt, attack1, attack2, special, isJumping]);
  
  // Process attack type changes independently
  useFrame(() => {
    // Game frame-specific logic that doesn't block controls
    if (isAttacking && !attackType) {
      // Set a default attack type if none was detected
      if (isPlayer) {
        // First check Smash Bros style attacks
        if (isAirAttacking || (airAttack && isJumping)) setAttackType('air_attack');
        else if (isDodging || dodge) setAttackType('dodge');
        else if (isGrabbing || grab) setAttackType('grab');
        else if (isTaunting || taunt) setAttackType('taunt');
        // Then check the basic attacks with new control scheme
        else if (attack1) setAttackType('punch'); // Quick attack -> punch animation
        else if (attack2) setAttackType('kick');  // Strong attack -> kick animation
        else if (special) setAttackType('special');
        else setAttackType('punch'); // Default fallback
      }
    }
  });

  // Handle CPU character physics (player is now handled in GameManager)
  useFrame((state, delta) => {
    // Update animation phase for natural movement
    if (isAttacking) {
      // Animation is handled in useEffect
    }
    
    // Skip CPU physics control for the player character - now handled in GameManager
    if (isPlayer) return;
    
    // Handle CPU character physics
    // Apply gravity
    const [newY, newVY] = applyGravity(y, vy);
    
    // Update jumping state
    if (isJumping && newY <= 0.01) {
      onJumpingChange(false);
    }
    
    // Calculate the new X position, staying within arena bounds
    const newX = stayInArena(x + vx);
    
    // Update positions and velocities
    onPositionChange(newX, newY, z);
    onVelocityChange(vx, newVY, vz);
    
    // All other CPU logic is handled in the CPU controller
  });

  // Main stick figure elements
  return (
    <group 
      ref={groupRef} 
      position={[x, y, z]} 
      scale={[direction, 1, 1]} 
      rotation={[0, direction < 0 ? Math.PI : 0, 0]}
    >
      {/* Head - enhanced size for the bigger arena */}
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[characterStyle.headSize, 24, 24]} />
        <meshStandardMaterial 
          color={characterColors.primary} 
          emissive={isAttacking ? characterColors.emissive : "#000000"}
          emissiveIntensity={isAttacking ? 0.5 : 0}
          metalness={characterStyle.metalness}
          roughness={characterStyle.roughness}
        />
      </mesh>
      
      {/* Render accessory if any */}
      {characterAccessory.geometry && (
        <group position={[0, 1.8 + characterStyle.headSize * 0.5, 0]}>
          {characterAccessory.geometry.type === 'cone' && (
            <mesh 
              position={characterAccessory.geometry.position} 
              castShadow
            >
              <coneGeometry args={characterAccessory.geometry.args} />
              <meshStandardMaterial 
                color={characterAccessory.color} 
                metalness={characterStyle.metalness}
                roughness={characterStyle.roughness}
              />
            </mesh>
          )}
          {characterAccessory.geometry.type === 'torusGeometry' && (
            <mesh 
              position={characterAccessory.geometry.position} 
              rotation={characterAccessory.geometry.rotation}
              castShadow
            >
              <torusGeometry args={characterAccessory.geometry.args} />
              <meshStandardMaterial 
                color={characterAccessory.color} 
                metalness={characterStyle.metalness}
                roughness={characterStyle.roughness}
              />
            </mesh>
          )}
          {characterAccessory.geometry.type === 'planeGeometry' && (
            <mesh 
              position={characterAccessory.geometry.position} 
              rotation={characterAccessory.geometry.rotation}
              castShadow
            >
              <planeGeometry args={characterAccessory.geometry.args} />
              <meshStandardMaterial 
                color={characterAccessory.color} 
                metalness={characterStyle.metalness}
                roughness={characterStyle.roughness}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
          {characterAccessory.geometry.type === 'boxGeometry' && (
            <mesh 
              position={characterAccessory.geometry.position} 
              rotation={characterAccessory.geometry.rotation}
              castShadow
            >
              <boxGeometry args={characterAccessory.geometry.args} />
              <meshStandardMaterial 
                color={characterAccessory.color} 
                metalness={characterStyle.metalness}
                roughness={characterStyle.roughness}
              />
            </mesh>
          )}
          {characterAccessory.geometry.type === 'circleGeometry' && (
            <mesh 
              position={characterAccessory.geometry.position} 
              rotation={characterAccessory.geometry.rotation}
              castShadow
            >
              <circleGeometry args={characterAccessory.geometry.args} />
              <meshStandardMaterial 
                color={characterAccessory.color} 
                metalness={characterStyle.metalness}
                roughness={characterStyle.roughness}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Body - enhanced size and improved materials for better visuals */}
      <mesh position={[0, 1.0, 0]} castShadow scale={[characterStyle.bodyScale, characterStyle.bodyScale, characterStyle.bodyScale]}>
        <cylinderGeometry args={[characterStyle.limbThickness, characterStyle.limbThickness, characterStyle.bodyLength, 12]} />
        <meshStandardMaterial 
          color={characterColors.primary}
          metalness={characterStyle.metalness}
          roughness={characterStyle.roughness}
        />
      </mesh>

      {/* Arms - martial arts poses with specific attack type animations */}
      <group position={[0, 1.2, 0]} 
        rotation={[
          // Left arm X rotation
          isBlocking ? Math.PI / 4 : 
          attackType === 'punch' ? -Math.PI / 4 - animationPhase * 0.3 : // Punch wind-up
          attackType === 'kick' ? Math.PI / 4 : // Support arm for kick
          attackType === 'special' ? Math.PI / 2 - animationPhase * 0.2 : // Spinning attack
          attackType === 'air_attack' ? -Math.PI / 2 + animationPhase * 0.2 : // Downward air attack
          attackType === 'grab' ? Math.PI / 4 - animationPhase * 0.3 : // Grab animation
          attackType === 'dodge' ? -Math.PI / 6 - animationPhase * 0.1 : // Dodge animation
          attackType === 'taunt' ? Math.PI / 2 + Math.sin(Date.now() * 0.05) * 0.3 : // Taunt animation
          isJumping ? -Math.PI / 6 : 
          0, 
          // Left arm Y rotation - side twisting
          attackType === 'special' ? animationPhase * Math.PI / 4 : 
          attackType === 'air_attack' ? animationPhase * Math.PI / 5 : // Air attack twist
          attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * Math.PI / 3 : // Taunt animation
          0,
          // Left arm Z rotation - extension
          isBlocking ? -Math.PI / 2 : 
          attackType === 'punch' ? -Math.PI / 3 - animationPhase * 0.3 :
          attackType === 'kick' ? -Math.PI / 2 + Math.sin(Date.now() * 0.03) * 0.1 : // Balance arm
          attackType === 'special' ? -Math.PI + animationPhase * Math.PI / 2 : // Spinning move
          attackType === 'air_attack' ? -Math.PI / 2 - animationPhase * 0.4 : // Downward slam
          attackType === 'grab' ? -Math.PI / 2 - animationPhase * 0.2 : // Grabbing motion
          attackType === 'dodge' ? -Math.PI / 4 + animationPhase * 0.1 : // Dodge motion
          attackType === 'taunt' ? -Math.PI / 2 + Math.sin(Date.now() * 0.05) * 0.7 : // Taunt wave
          isAttacking ? -Math.PI / 3 - Math.sin(Date.now() * 0.02) * 0.5 : 
          isJumping ? -Math.PI / 6 : 
          -Math.PI / 8 + Math.sin(Date.now() * 0.003) * 0.05 // Slight idle breathing movement
        ]}>
        {/* Left Arm - enhanced for larger arena */}
        <mesh position={[
          0.3, 
          0, 
          // Move arm forward based on attack type
          attackType === 'punch' ? animationPhase * 0.15 : 
          attackType === 'grab' ? 0.3 + animationPhase * 0.15 : // Extended grab
          attackType === 'air_attack' ? -0.15 - animationPhase * 0.15 : // Downward position
          0
        ]} castShadow>
          <cylinderGeometry args={[characterStyle.limbThickness, characterStyle.limbThickness, 0.7, 12]} />
          <meshStandardMaterial 
            color={characterColors.secondary} 
            metalness={characterStyle.metalness}
            roughness={characterStyle.roughness}
          />
        </mesh>
      </group>

      <group position={[0, 1.2, 0]} 
        rotation={[
          // Right arm X rotation
          isBlocking ? -Math.PI / 4 :
          attackType === 'punch' ? Math.PI / 3 + animationPhase * 0.2 : // Support arm during punch
          attackType === 'kick' ? -Math.PI / 6 : // Balance during kick
          attackType === 'special' ? Math.PI / 2 + animationPhase * 0.2 : // Spinning attack
          attackType === 'air_attack' ? -Math.PI / 2 - animationPhase * 0.1 : // Downward air attack
          attackType === 'grab' ? Math.PI / 4 + animationPhase * 0.2 : // Grab animation
          attackType === 'dodge' ? -Math.PI / 6 + animationPhase * 0.1 : // Dodge animation
          attackType === 'taunt' ? Math.PI / 2 - Math.sin(Date.now() * 0.05) * 0.3 : // Taunt animation
          isJumping ? Math.PI / 6 :
          0,
          // Right arm Y rotation - side twisting
          attackType === 'special' ? -animationPhase * Math.PI / 4 : 
          attackType === 'air_attack' ? -animationPhase * Math.PI / 5 : // Air attack twist
          attackType === 'taunt' ? -Math.sin(Date.now() * 0.05) * Math.PI / 3 : // Taunt animation
          0,
          // Right arm Z rotation - extension
          isBlocking ? Math.PI / 2 :
          attackType === 'punch' ? Math.PI / 4 : // Support position
          attackType === 'kick' ? Math.PI / 3 + Math.sin(Date.now() * 0.03) * 0.15 : // Dynamic balance
          attackType === 'special' ? Math.PI - animationPhase * Math.PI / 2 : // Spinning move
          attackType === 'air_attack' ? Math.PI / 2 + animationPhase * 0.4 : // Downward slam
          attackType === 'grab' ? Math.PI / 2 + animationPhase * 0.2 : // Grabbing motion
          attackType === 'dodge' ? Math.PI / 4 - animationPhase * 0.1 : // Dodge motion
          attackType === 'taunt' ? Math.PI / 2 - Math.sin(Date.now() * 0.05) * 0.7 : // Taunt wave 
          isAttacking ? Math.PI / 2 + Math.sin(Date.now() * 0.02) * 0.8 : 
          isBlocking ? Math.PI / 2 : 
          isJumping ? Math.PI / 6 : 
          Math.PI / 8 + Math.sin(Date.now() * 0.003) * 0.05 // Subtle breathing
        ]}>
        {/* Right Arm - enhanced for larger arena */}
        <mesh position={[
          -0.3, 
          0,
          // Move arm forward based on attack type
          attackType === 'special' ? animationPhase * 0.15 : 
          attackType === 'grab' ? 0.3 + animationPhase * 0.15 : // Extended grab
          attackType === 'air_attack' ? -0.15 - animationPhase * 0.15 : // Downward position
          0
        ]} castShadow>
          <cylinderGeometry args={[characterStyle.limbThickness, characterStyle.limbThickness, 0.7, 12]} />
          <meshStandardMaterial 
            color={characterColors.secondary} 
            metalness={characterStyle.metalness}
            roughness={characterStyle.roughness}
          />
        </mesh>
      </group>

      {/* Legs - martial arts stances and dynamic jumping/kicking */}
      <group position={[0, 0.5, 0]} 
        rotation={[
          // Left leg X rotation (forward/backward)
          isJumping ? -Math.PI / 3 : 
          attackType === 'kick' ? -Math.PI / 2 - animationPhase * 0.3 : // High kick animation
          attackType === 'special' ? -Math.PI / 6 - animationPhase * 0.1 : // Spinning kick preparation
          attackType === 'air_attack' ? -Math.PI / 3 - animationPhase * 0.2 : // Air attack downward kick
          attackType === 'grab' ? -Math.PI / 10 - animationPhase * 0.05 : // Grab stance (stable)
          attackType === 'dodge' ? -Math.PI / 4 - animationPhase * 0.2 : // Quick dodge movement
          attackType === 'taunt' ? -Math.PI / 6 + Math.sin(Date.now() * 0.05) * 0.2 : // Playful taunt
          isAttacking ? -Math.PI / 8 : 
          0, 
          // Left leg Y rotation (side to side)
          attackType === 'special' ? animationPhase * Math.PI / 6 : 
          attackType === 'dodge' ? -animationPhase * Math.PI / 8 : // Dodge sidestep
          attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * Math.PI / 4 : // Taunt dance
          0,
          // Left leg Z rotation (twisting)
          isJumping ? Math.PI / 6 : 
          attackType === 'kick' ? Math.PI / 5 + animationPhase * 0.2 : // Kick extension
          attackType === 'punch' ? Math.PI / 10 + Math.sin(Date.now() * 0.03) * 0.1 : // Stable stance 
          attackType === 'special' ? Math.PI / 4 + animationPhase * 0.2 : // Spinning position
          attackType === 'air_attack' ? Math.PI / 3 + animationPhase * 0.15 : // Air attack leg extension
          attackType === 'grab' ? Math.PI / 6 + animationPhase * 0.1 : // Grab stance
          attackType === 'dodge' ? Math.PI / 3 - animationPhase * 0.2 : // Dodge twist
          attackType === 'taunt' ? Math.PI / 6 + Math.sin(Date.now() * 0.05) * 0.4 : // Taunt swagger
          isAttacking ? Math.PI / 10 : 
          Math.sin(Date.now() * 0.003) * 0.04 // Subtle weight shifting
        ]}>
        {/* Left Leg - enhanced for larger arena */}
        <mesh position={[
          0.15, 
          -0.35, 
          // Extend leg forward based on the move type
          attackType === 'kick' ? 0.2 + animationPhase * 0.2 : 
          attackType === 'air_attack' ? -0.15 - animationPhase * 0.2 : // Downward air attack
          attackType === 'dodge' ? 0.15 - animationPhase * 0.25 : // Dodge movement
          0
        ]} castShadow>
          <cylinderGeometry args={[characterStyle.limbThickness, characterStyle.limbThickness, 0.7, 12]} />
          <meshStandardMaterial 
            color={characterColors.secondary} 
            metalness={characterStyle.metalness}
            roughness={characterStyle.roughness}
          />
        </mesh>
      </group>

      <group position={[0, 0.5, 0]} 
        rotation={[
          // Right leg X rotation (forward/backward)
          isJumping ? Math.PI / 3 : 
          attackType === 'kick' ? Math.PI / 6 : // Support leg during kick
          attackType === 'punch' ? Math.PI / 10 : // Solid base for punch
          attackType === 'special' ? Math.PI / 4 - animationPhase * 0.1 : // Spinning support
          attackType === 'air_attack' ? Math.PI / 3 - animationPhase * 0.1 : // Air attack support
          attackType === 'grab' ? Math.PI / 8 + animationPhase * 0.05 : // Grab stance (pushing forward)
          attackType === 'dodge' ? Math.PI / 4 + animationPhase * 0.2 : // Quick dodge support leg
          attackType === 'taunt' ? Math.PI / 6 - Math.sin(Date.now() * 0.05) * 0.2 : // Taunt dance movement
          isAttacking ? Math.PI / 8 : 
          0, 
          // Right leg Y rotation (side to side)
          attackType === 'special' ? -animationPhase * Math.PI / 6 : 
          attackType === 'dodge' ? animationPhase * Math.PI / 8 : // Dodge sidestep
          attackType === 'taunt' ? -Math.sin(Date.now() * 0.05) * Math.PI / 4 : // Taunt dance
          0,
          // Right leg Z rotation (twisting)
          isJumping ? -Math.PI / 6 : 
          attackType === 'kick' ? -Math.PI / 4 : // Support stance
          attackType === 'punch' ? -Math.PI / 8 - Math.sin(Date.now() * 0.03) * 0.08 : // Subtle shifting
          attackType === 'special' ? -Math.PI / 4 - animationPhase * 0.2 : // Spinning position
          attackType === 'air_attack' ? -Math.PI / 3 - animationPhase * 0.1 : // Air attack leg support
          attackType === 'grab' ? -Math.PI / 6 - animationPhase * 0.1 : // Grab stance
          attackType === 'dodge' ? -Math.PI / 3 + animationPhase * 0.2 : // Dodge twist
          attackType === 'taunt' ? -Math.PI / 6 - Math.sin(Date.now() * 0.05) * 0.4 : // Taunt swagger
          isAttacking ? -Math.PI / 10 : 
          -Math.sin(Date.now() * 0.003) * 0.04 // Subtle weight shifting opposite to other leg
        ]}>
        {/* Right Leg - enhanced for larger arena */}
        <mesh position={[
          -0.15, 
          -0.35, 
          // Position adjustment based on attack type
          attackType === 'air_attack' ? -0.15 - animationPhase * 0.15 : // Air attack support
          attackType === 'dodge' ? -0.15 + animationPhase * 0.25 : // Dodge movement
          0
        ]} castShadow>
          <cylinderGeometry args={[characterStyle.limbThickness, characterStyle.limbThickness, 0.7, 12]} />
          <meshStandardMaterial 
            color={characterColors.secondary} 
            metalness={characterStyle.metalness}
            roughness={characterStyle.roughness}
          />
        </mesh>
      </group>
      
      {/* Torso rotation for martial arts movements */}
      <group position={[0, 0.9, 0]} 
        rotation={[
          // Torso X rotation (forward/backward bend)
          attackType === 'punch' ? 0.1 + animationPhase * 0.05 : // Slight lean into punch
          attackType === 'kick' ? -0.2 - animationPhase * 0.05 : // Lean back for high kick
          attackType === 'special' ? Math.sin(Date.now() * 0.03) * 0.3 : // Dynamic spinning movement
          attackType === 'air_attack' ? 0.3 + animationPhase * 0.1 : // Leaning forward for downward air attack
          attackType === 'grab' ? 0.2 + animationPhase * 0.1 : // Leaning forward for grab
          attackType === 'dodge' ? (Math.random() > 0.5 ? 0.2 : -0.2) * animationPhase : // Random dodge direction
          attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * 0.3 : // Playful taunt motion
          isAttacking ? Math.sin(Date.now() * 0.02) * 0.1 : 
          0,
          // Torso Y rotation (twisting)
          attackType === 'special' ? animationPhase * Math.PI / 2 : // Full spinning motion
          attackType === 'punch' ? animationPhase * 0.2 : // Slight twist for punch
          attackType === 'kick' ? -animationPhase * 0.15 : // Counter-rotation for kick balance
          attackType === 'air_attack' ? animationPhase * Math.PI / 5 : // Air attack twist
          attackType === 'grab' ? animationPhase * 0.25 : // Grab twist
          attackType === 'dodge' ? (Math.random() > 0.5 ? 0.4 : -0.4) * animationPhase : // Random dodge direction
          attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * Math.PI / 3 : // Exaggerated taunt motion
          0,
          // Torso Z rotation (side bending)
          attackType === 'punch' ? Math.sin(Date.now() * 0.03) * 0.15 : // Dynamic punch motion
          attackType === 'kick' ? Math.sin(Date.now() * 0.03) * 0.2 : // Balance for kick
          attackType === 'special' ? Math.sin(Date.now() * 0.04) * 0.25 : // Spinning attack
          attackType === 'air_attack' ? -0.1 - animationPhase * 0.1 : // Air attack lean
          attackType === 'grab' ? Math.sin(Date.now() * 0.04) * 0.2 : // Dynamic grab movement
          attackType === 'dodge' ? (Math.random() > 0.5 ? 0.3 : -0.3) * animationPhase : // Random dodge twist
          attackType === 'taunt' ? Math.sin(Date.now() * 0.05) * 0.4 : // Exaggerated taunt swagger
          isAttacking ? Math.sin(Date.now() * 0.02) * 0.1 : 
          Math.sin(Date.now() * 0.003) * 0.03 // Subtle breathing/movement
        ]}>
      </group>
      
      {/* Visual indicators for different actions */}
      
      {/* Blocking shield - enhanced for larger arena */}
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
      
      {/* Dodge dash effect - enhanced for larger arena */}
      {isDodging && (
        <group>
          <mesh position={[direction * -0.4, 0.8, 0]}>
            <sphereGeometry args={[0.3, 12, 12]} />
            <meshStandardMaterial 
              color={"#1e90ff"} 
              transparent={true}
              opacity={0.6 - animationPhase * 0.1}
              emissive={"#1e90ff"}
              emissiveIntensity={0.6}
            />
          </mesh>
          
          {/* Additional motion trail for dodge */}
          <mesh position={[direction * -0.7, 0.8, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial 
              color={"#87cefa"} 
              transparent={true}
              opacity={0.3 - animationPhase * 0.1}
              emissive={"#87cefa"}
              emissiveIntensity={0.4}
            />
          </mesh>
        </group>
      )}
      
      {/* Air attack effect - enhanced for larger arena */}
      {isAirAttacking && isJumping && (
        <group>
          {/* Main air attack effect */}
          <mesh position={[0, -0.4, 0]}>
            <coneGeometry args={[0.3, 0.6, 24]} />
            <meshStandardMaterial 
              color={"#ff4500"} 
              transparent={true}
              opacity={0.7}
              emissive={"#ff4500"}
              emissiveIntensity={0.5 + animationPhase * 0.2}
            />
          </mesh>
          
          {/* Additional flame particles for air attack */}
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
      
      {/* Grab effect - enhanced for larger arena */}
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
          
          {/* Additional visual cue for grab direction */}
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
      
      {/* Taunt effect - enhanced for larger arena */}
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
          
          {/* Multiple particles for taunt effect */}
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
      
      {/* Enhanced combo counter indicator for bigger arena */}
      {comboCount > 1 && (
        <group position={[0, 2.5, 0]}>
          {/* Larger combo background with glow effect */}
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
          
          {/* Animated border for the combo counter */}
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
          
          {/* Combo text visualization - enhanced colored indicator dots */}
          {Array.from({ length: Math.min(5, comboCount) }).map((_, i) => (
            <group key={i}>
              <mesh position={[(i - 2) * 0.15, 0, 0]}>
                <sphereGeometry args={[0.06, 12, 12]} />
                <meshStandardMaterial 
                  color={
                    comboCount >= 20 ? "#ff0000" :   // Red for combos ≥ 20
                    comboCount >= 10 ? "#ff9900" :    // Orange for combos ≥ 10
                    comboCount >= 5 ? "#ffff00" :     // Yellow for combos ≥ 5
                    "#ffffff"                         // White for smaller combos
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
              
              {/* Additional particle effect for high combos */}
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
