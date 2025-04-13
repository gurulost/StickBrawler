import { useFrame } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { useKeyboardControls } from "@react-three/drei";
import { CharacterState } from "../lib/stores/useFighting";
import { Controls } from "../lib/stores/useControls";
import { Group, Mesh } from "three";
import { applyGravity, stayInArena, JUMP_FORCE, PLAYER_SPEED, applyDrag } from "./Physics";
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
  
  // Destructure character state
  const { position, direction, isJumping, isAttacking, isBlocking, velocity, attackCooldown } = characterState;
  const [x, y, z] = position;
  const [vx, vy, vz] = velocity;

  // For debugging key presses only
  useEffect(() => {
    if (isPlayer) {
      // Only log state changes to avoid spamming
      if (forward) console.log("Forward key detected in StickFigure");
      if (leftward) console.log("Left key detected in StickFigure");
      if (rightward) console.log("Right key detected in StickFigure");
      if (punch) console.log("Punch key detected in StickFigure");
      if (kick) console.log("Kick key detected in StickFigure");
      if (block) console.log("Block key detected in StickFigure");
      if (special) console.log("Special key detected in StickFigure");
    }
  }, [isPlayer, forward, backward, leftward, rightward, punch, kick, block, special]);

  // Handle CPU character physics (player is now handled in GameManager)
  useFrame((state, delta) => {
    // Skip this frame control for the player character - now handled in GameManager
    if (isPlayer) return;
    
    // Handle CPU character physics
    // Apply gravity
    const [newY, newVY] = applyGravity(y, vy);
    
    // Update jumping state
    if (isJumping && newY <= 0.01) {
      onJumpingChange(false);
    }
    
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

      {/* Arms - positioned differently based on action */}
      <group position={[0, 1.2, 0]} rotation={[0, 0, isBlocking ? -Math.PI / 2 : isAttacking ? -Math.PI / 4 : -Math.PI / 8]}>
        {/* Left Arm */}
        <mesh position={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={isPlayer ? "#2980b9" : "#c0392b"} />
        </mesh>
      </group>

      <group position={[0, 1.2, 0]} rotation={[0, 0, isAttacking ? Math.PI / 2 : isBlocking ? Math.PI / 2 : Math.PI / 8]}>
        {/* Right Arm */}
        <mesh position={[-0.25, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={isPlayer ? "#2980b9" : "#c0392b"} />
        </mesh>
      </group>

      {/* Legs - different position when jumping */}
      <group position={[0, 0.5, 0]} rotation={[isJumping ? -Math.PI / 6 : 0, 0, isJumping ? Math.PI / 8 : 0]}>
        {/* Left Leg */}
        <mesh position={[0.1, -0.25, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={isPlayer ? "#2980b9" : "#c0392b"} />
        </mesh>
      </group>

      <group position={[0, 0.5, 0]} rotation={[isJumping ? Math.PI / 6 : 0, 0, isJumping ? -Math.PI / 8 : 0]}>
        {/* Right Leg */}
        <mesh position={[-0.1, -0.25, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.5, 8]} />
          <meshStandardMaterial color={isPlayer ? "#2980b9" : "#c0392b"} />
        </mesh>
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
