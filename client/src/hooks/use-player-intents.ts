import { useCallback, useRef } from "react";
import type { PlayerInputSnapshot, DualInputSnapshot, PlayerSlot } from "./use-player-controls";
import { Controls } from "../lib/stores/useControls";
import type {
  AttackIntent,
  DashIntent,
  DefendIntent,
  Direction,
  DualPlayerIntentFrame,
  IntentContext,
  PlayerIntentFrame,
  PressStyle,
  SpecialIntent,
  JumpIntent,
} from "../input/intentTypes";
import {
  resolveActionIntentDirection,
  resolveMovementIntentDirection,
} from "../input/intentDirection";

const TAP_MS = 160;
const HOLD_MS = 220;
const CHARGE_MS = 300;
const FLICK_MS = 140;
const DASH_MS = 180;
const GRAB_CHORD_MS = 150;
const SHORT_HOP_MS = 90;

class ButtonTracker {
  private isDown = false;
  private held = 0;
  justPressed = false;
  justReleased = false;
  lastPressAt = -Infinity;
  lastReleaseAt = -Infinity;

  update(pressed: boolean, deltaMs: number, now: number) {
    this.justPressed = !this.isDown && pressed;
    this.justReleased = this.isDown && !pressed;
    if (this.justPressed) {
      this.lastPressAt = now;
      this.held = 0;
    }
    if (this.isDown) {
      this.held += deltaMs;
    }
    if (this.justReleased) {
      this.lastReleaseAt = now;
    }
    this.isDown = pressed;
    if (!pressed && !this.justReleased) {
      this.held = 0;
    }
  }

  get heldMs() {
    return this.held;
  }

  get down() {
    return this.isDown;
  }
}

class IntentAnalyzer {
  private timeMs = 0;
  private attackBtn = new ButtonTracker();
  private specialBtn = new ButtonTracker();
  private defendBtn = new ButtonTracker();
  private jumpBtn = new ButtonTracker();
  private lastDir: Direction = "neutral";
  private lastDirChange = -Infinity;
  private lastNeutralTime = -Infinity;
  private lastDashTap: Record<"left" | "right", number> = { left: -Infinity, right: -Infinity };
  private lastAttackPress = -Infinity;

  constructor(private readonly slot: PlayerSlot) {}

  update(
    snapshot: PlayerInputSnapshot,
    context: IntentContext,
    delta: number,
  ): PlayerIntentFrame {
    const deltaMs = delta * 1000;
    this.timeMs += deltaMs;
    const now = this.timeMs;

    this.attackBtn.update(!!snapshot[Controls.attack], deltaMs, now);
    this.specialBtn.update(!!snapshot[Controls.special], deltaMs, now);
    this.defendBtn.update(!!snapshot[Controls.defend], deltaMs, now);
    this.jumpBtn.update(!!snapshot[Controls.jump], deltaMs, now);
    if (this.attackBtn.justPressed) {
      this.lastAttackPress = now;
    }

    const movementDirection = this.resolveMovementDirection(snapshot);
    const actionDirection = this.resolveActionDirection(snapshot, context);
    const flickDir = this.trackFlick(movementDirection, now);
    const dash = this.detectDash(movementDirection, now);

    const attackIntent = this.attackBtn.down || this.attackBtn.justPressed
      ? this.buildAttackIntent(context, actionDirection, flickDir)
      : undefined;
    const specialIntent = this.specialBtn.down || this.specialBtn.justPressed
      ? this.buildSpecialIntent(context, actionDirection, flickDir)
      : undefined;

    const defendIntents = this.buildDefendIntents(context, movementDirection, flickDir, now);
    const jumpIntent = this.jumpBtn.justPressed
      ? this.buildJumpIntent()
      : undefined;

    return {
      attack: attackIntent,
      special: specialIntent,
      defend: defendIntents,
      jump: jumpIntent,
      dash,
      direction: movementDirection,
    };
  }

  private buildPressStyle(btn: ButtonTracker, flickDir?: Direction): PressStyle {
    return {
      heldMs: btn.heldMs,
      tapped: btn.heldMs <= TAP_MS,
      heavy: btn.heldMs >= HOLD_MS,
      charged: btn.heldMs >= CHARGE_MS,
      flickedDir: flickDir,
      justPressed: btn.justPressed,
    };
  }

  private buildAttackIntent(
    context: IntentContext,
    direction: Direction,
    flickDir?: Direction,
  ): AttackIntent {
    return {
      kind: "attack",
      dir: direction,
      airborne: context.airborne,
      press: this.buildPressStyle(this.attackBtn, flickDir),
    };
  }

  private buildSpecialIntent(
    context: IntentContext,
    direction: Direction,
    flickDir?: Direction,
  ): SpecialIntent {
    return {
      kind: "special",
      dir: direction,
      airborne: context.airborne,
      press: this.buildPressStyle(this.specialBtn, flickDir),
    };
  }

  private buildDefendIntents(
    context: IntentContext,
    direction: Direction,
    flickDir: Direction | undefined,
    now: number,
  ): DefendIntent[] {
    if (!this.defendBtn.down && !this.defendBtn.justPressed) {
      return [];
    }

    const intents: DefendIntent[] = [];
    const press = this.buildPressStyle(this.defendBtn, flickDir);
    const chordGrab =
      this.defendBtn.justPressed &&
      now - this.lastAttackPress <= GRAB_CHORD_MS;

    if (context.allowTech && this.defendBtn.justPressed && !context.grounded) {
      intents.push({ kind: "defend", mode: "tech", press });
      return intents;
    }

    if (chordGrab) {
      intents.push({ kind: "defend", mode: "grab", press });
      return intents;
    }

    if (press.tapped && this.defendBtn.justPressed) {
      intents.push({ kind: "defend", mode: "parry", press });
      return intents;
    }

    if (this.defendBtn.down && direction !== "neutral") {
      const rollDir =
        direction === "left" || direction === "right" || direction === "back"
          ? direction
          : undefined;
      if (rollDir) {
        intents.push({ kind: "defend", mode: "roll", dir: rollDir, press });
        return intents;
      }
    }

    intents.push({ kind: "defend", mode: "guard", press, dir: direction });
    return intents;
  }

  private buildJumpIntent(): JumpIntent {
    return {
      kind: "jump",
      shortHopCandidate: this.jumpBtn.heldMs <= SHORT_HOP_MS,
      justPressed: this.jumpBtn.justPressed,
    };
  }

  private resolveMovementDirection(snapshot: PlayerInputSnapshot): Direction {
    return resolveMovementIntentDirection(snapshot);
  }

  private resolveActionDirection(
    snapshot: PlayerInputSnapshot,
    context: IntentContext,
  ): Direction {
    return resolveActionIntentDirection(snapshot, context.facing);
  }

  private trackFlick(direction: Direction, now: number): Direction | undefined {
    if (direction !== this.lastDir) {
      if (direction === "neutral") {
        this.lastNeutralTime = now;
      } else {
        if (now - this.lastNeutralTime <= FLICK_MS) {
          this.lastDirChange = now;
          this.lastDir = direction;
          return direction;
        }
        this.lastDirChange = now;
      }
      this.lastDir = direction;
    }
    return undefined;
  }

  private detectDash(direction: Direction, now: number): DashIntent | undefined {
    if (direction !== "left" && direction !== "right") {
      return undefined;
    }
    const lastTap = this.lastDashTap[direction];
    if (this.defendBtn.down) return undefined;
    if (now - lastTap <= DASH_MS) {
      this.lastDashTap[direction] = -Infinity;
      return { kind: "dash", dir: direction };
    }
    this.lastDashTap[direction] = now;
    return undefined;
  }
}

export function usePlayerIntents() {
  const analyzersRef = useRef<{
    player1: IntentAnalyzer;
    player2: IntentAnalyzer;
  }>();

  if (!analyzersRef.current) {
    analyzersRef.current = {
      player1: new IntentAnalyzer("player1"),
      player2: new IntentAnalyzer("player2"),
    };
  }

  return useCallback(
    (
      snapshots: DualInputSnapshot,
      contexts: Record<PlayerSlot, IntentContext>,
      delta: number,
    ): DualPlayerIntentFrame => {
      return {
        player1: analyzersRef.current!.player1.update(
          snapshots.player1,
          contexts.player1,
          delta,
        ),
        player2: analyzersRef.current!.player2.update(
          snapshots.player2,
          contexts.player2,
          delta,
        ),
      };
    },
    [],
  );
}
