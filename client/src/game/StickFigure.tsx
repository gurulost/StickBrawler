import { useFrame } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { CharacterState } from "../lib/stores/useFighting";
import { Controls } from "../lib/stores/useControls";
import { Group, Mesh } from "three";
import { 
  applyGravity, 
  stayInArena, 
  JUMP_FORCE, 
  PLAYER_SPEED, 
  DRAG, 
  applyDrag 
} from "./Physics";
import { useAudio } from "../lib/stores/useAudio";

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
  
  // Get keyboard controls - only used for player character
  const forward = useKeyboardControls<Controls>(state => state.forward);
  const backward = useKeyboardControls<Controls>(state => state.backward);
  const leftward = useKeyboardControls<Controls>(state => state.leftward);
  const rightward = useKeyboardControls<Controls>(state => state.rightward);
  const punch = useKeyboardControls<Controls>(state => state.punch);
  const kick = useKeyboardControls<Controls>(state => state.kick);
  const block = useKeyboardControls<Controls>(state => state.block);
  const special = useKeyboardControls<Controls>(state => state.special);
  // New Smash Bros style controls
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
          if (forward) console.log("Forward key pressed, playerY:", y, "isJumping:", isJumping, "airJumpsLeft:", airJumpsLeft);
          if (leftward) console.log("Left key detected in StickFigure");
          if (rightward) console.log("Right key detected in StickFigure");
          
          // Log basic attack controls
          if (punch) console.log("Punch key detected in StickFigure");
          if (kick) console.log("Kick key detected in StickFigure");
          if (block) console.log("Block key detected in StickFigure");
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

  // Handle animation phases for more natural martial arts moves - using a simpler approach to avoid control blocking
  useEffect(() => {
    // Set up a consistent animation interval that won't block controls
    const animationInterval = setInterval(() => {
      if (isAttacking) {
        // Determine which attack type is being performed
        if (isPlayer) {
          // Check current key states - don't make this a dependency
          // First check the Smash Bros style attacks that have priority
          if (isAirAttacking || (airAttack && isJumping)) setAttackType('air_attack');
          else if (isDodging || dodge) setAttackType('dodge');
          else if (isGrabbing || grab) setAttackType('grab');
          else if (isTaunting || taunt) setAttackType('taunt');
          // Then check the basic attacks
          else if (punch) setAttackType('punch');
          else if (kick) setAttackType('kick');
          else if (special) setAttackType('special');
          else setAttackType('punch'); // Default if no key detected
        } else {
          // For CPU, randomly choose attack type if not already set
          if (!attackType) {
            const attackRandom = Math.random();
            if (attackRandom < 0.5) setAttackType('punch');
            else if (attackRandom < 0.8) setAttackType('kick');
            else setAttackType('special');
          }
        }
        
        // Update animation phase
        setAnimationPhase(phase => (phase + 1) % 4); // 4 phases for attack animations
      } else {
        // Reset attack type when not attacking
        if (attackType !== null) setAttackType(null);
        if (animationPhase !== 0) setAnimationPhase(0);
      }
    }, 100);
    
    return () => clearInterval(animationInterval);
  }, [isAttacking, isPlayer, attackType, animationPhase]);
  
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
        // Then check the basic attacks
        else if (punch) setAttackType('punch');
        else if (kick) setAttackType('kick');
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
      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color={isPlayer ? "#3498db" : "#e74c3c"} 
          emissive={isAttacking ? "#ffff00" : "#000000"}
          emissiveIntensity={isAttacking ? 0.5 : 0}
        />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
        <meshStandardMaterial 
          color={isPlayer ? "#3498db" : "#e74c3c"} 
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
        {/* Left Arm */}
        <mesh position={[
          0.25, 
          0, 
          // Move arm forward based on attack type
          attackType === 'punch' ? animationPhase * 0.1 : 
          attackType === 'grab' ? 0.2 + animationPhase * 0.1 : // Extended grab
          attackType === 'air_attack' ? -0.1 - animationPhase * 0.1 : // Downward position
          0
        ]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={isPlayer ? "#2980b9" : "#c0392b"} />
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
        {/* Right Arm */}
        <mesh position={[
          -0.25, 
          0,
          // Move arm forward based on attack type
          attackType === 'special' ? animationPhase * 0.1 : 
          attackType === 'grab' ? 0.2 + animationPhase * 0.1 : // Extended grab
          attackType === 'air_attack' ? -0.1 - animationPhase * 0.1 : // Downward position
          0
        ]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={isPlayer ? "#2980b9" : "#c0392b"} />
        </mesh>
      </group>

      {/* Legs - martial arts stances and dynamic jumping/kicking */}
      <group position={[0, 0.5, 0]} 
        rotation={[
          // Left leg X rotation (forward/backward)
          isJumping ? -Math.PI / 3 : 
          attackType === 'kick' ? -Math.PI / 2 - animationPhase * 0.3 : // High kick animation
          attackType === 'special' ? -Math.PI / 6 - animationPhase * 0.1 : // Spinning kick preparation
          isAttacking ? -Math.PI / 8 : 
          0, 
          // Left leg Y rotation (side to side)
          attackType === 'special' ? animationPhase * Math.PI / 6 : 0,
          // Left leg Z rotation (twisting)
          isJumping ? Math.PI / 6 : 
          attackType === 'kick' ? Math.PI / 5 + animationPhase * 0.2 : // Kick extension
          attackType === 'punch' ? Math.PI / 10 + Math.sin(Date.now() * 0.03) * 0.1 : // Stable stance 
          attackType === 'special' ? Math.PI / 4 + animationPhase * 0.2 : // Spinning position
          isAttacking ? Math.PI / 10 : 
          Math.sin(Date.now() * 0.003) * 0.04 // Subtle weight shifting
        ]}>
        {/* Left Leg */}
        <mesh position={[
          0.1, 
          -0.25, 
          // Extend leg forward during kick
          attackType === 'kick' ? 0.1 + animationPhase * 0.15 : 0
        ]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={isPlayer ? "#2980b9" : "#c0392b"} />
        </mesh>
      </group>

      <group position={[0, 0.5, 0]} 
        rotation={[
          // Right leg X rotation (forward/backward)
          isJumping ? Math.PI / 3 : 
          attackType === 'kick' ? Math.PI / 6 : // Support leg during kick
          attackType === 'punch' ? Math.PI / 10 : // Solid base for punch
          attackType === 'special' ? Math.PI / 4 - animationPhase * 0.1 : // Spinning support
          isAttacking ? Math.PI / 8 : 
          0, 
          // Right leg Y rotation (side to side)
          attackType === 'special' ? -animationPhase * Math.PI / 6 : 0,
          // Right leg Z rotation (twisting)
          isJumping ? -Math.PI / 6 : 
          attackType === 'kick' ? -Math.PI / 4 : // Support stance
          attackType === 'punch' ? -Math.PI / 8 - Math.sin(Date.now() * 0.03) * 0.08 : // Subtle shifting
          attackType === 'special' ? -Math.PI / 4 - animationPhase * 0.2 : // Spinning position
          isAttacking ? -Math.PI / 10 : 
          -Math.sin(Date.now() * 0.003) * 0.04 // Subtle weight shifting opposite to other leg
        ]}>
        {/* Right Leg */}
        <mesh position={[-0.1, -0.25, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={isPlayer ? "#2980b9" : "#c0392b"} />
        </mesh>
      </group>
      
      {/* Torso rotation for martial arts movements */}
      <group position={[0, 0.9, 0]} 
        rotation={[
          // Torso X rotation (forward/backward bend)
          attackType === 'punch' ? 0.1 + animationPhase * 0.05 : // Slight lean into punch
          attackType === 'kick' ? -0.2 - animationPhase * 0.05 : // Lean back for high kick
          attackType === 'special' ? Math.sin(Date.now() * 0.03) * 0.3 : // Dynamic spinning movement
          isAttacking ? Math.sin(Date.now() * 0.02) * 0.1 : 
          0,
          // Torso Y rotation (twisting)
          attackType === 'special' ? animationPhase * Math.PI / 2 : // Full spinning motion
          attackType === 'punch' ? animationPhase * 0.2 : // Slight twist for punch
          attackType === 'kick' ? -animationPhase * 0.15 : // Counter-rotation for kick balance
          0,
          // Torso Z rotation (side bending)
          attackType === 'punch' ? Math.sin(Date.now() * 0.03) * 0.15 : // Dynamic punch motion
          attackType === 'kick' ? Math.sin(Date.now() * 0.03) * 0.2 : // Balance for kick
          attackType === 'special' ? Math.sin(Date.now() * 0.04) * 0.25 : // Spinning attack
          isAttacking ? Math.sin(Date.now() * 0.02) * 0.1 : 
          Math.sin(Date.now() * 0.003) * 0.03 // Subtle breathing/movement
        ]}>
      </group>
      
      {/* Visual indicator for blocking */}
      {isBlocking && (
        <mesh position={[0, 1, 0.2]}>
          <torusGeometry args={[0.3, 0.05, 16, 32]} />
          <meshStandardMaterial 
            color={"#32cd32"} 
            transparent={true}
            opacity={0.7}
          />
        </mesh>
      )}
    </group>
  );
};

export default StickFigure;
