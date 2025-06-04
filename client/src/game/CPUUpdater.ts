import { CPUController, CPUDifficulty } from "./CPU";
import { CharacterState } from "../lib/stores/useFighting";

export class CPUUpdater {
  private controller: CPUController;

  constructor(difficulty: CPUDifficulty = CPUDifficulty.MEDIUM) {
    this.controller = new CPUController(difficulty);
  }

  update(
    cpu: CharacterState,
    player: CharacterState,
    moveCPU: (x: number, y: number, z: number) => void,
    updateCPUVelocity: (vx: number, vy: number, vz: number) => void,
    setCPUDirection: (direction: 1 | -1) => void,
    setCPUJumping: (jumping: boolean) => void,
    setCPUAttacking: (attacking: boolean) => void,
    setCPUBlocking: (blocking: boolean) => void,
    setCPUDodging?: (dodging: boolean) => void,
    setCPUGrabbing?: (grabbing: boolean) => void,
    setCPUTaunting?: (taunting: boolean) => void,
    setCPUAirAttacking?: (airAttacking: boolean) => void,
    resetCPUAirJumps?: () => void,
    useCPUAirJump?: () => boolean,
    delta: number = 1
  ) {
    this.controller.update(
      cpu,
      player,
      moveCPU,
      updateCPUVelocity,
      setCPUDirection,
      setCPUJumping,
      setCPUAttacking,
      setCPUBlocking,
      setCPUDodging,
      setCPUGrabbing,
      setCPUTaunting,
      setCPUAirAttacking,
      resetCPUAirJumps,
      useCPUAirJump,
      delta
    );
  }
}
