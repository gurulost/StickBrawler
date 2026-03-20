import type { Direction } from "./intentTypes";

interface DirectionalSnapshot {
  forward?: boolean;
  backward?: boolean;
  leftward?: boolean;
  rightward?: boolean;
}

export const resolveMovementIntentDirection = (
  snapshot: DirectionalSnapshot,
): Direction => {
  if (snapshot.forward && !snapshot.backward) {
    return "forward";
  }
  if (snapshot.backward && !snapshot.forward) {
    return "back";
  }
  if (snapshot.leftward && !snapshot.rightward) {
    return "left";
  }
  if (snapshot.rightward && !snapshot.leftward) {
    return "right";
  }
  return "neutral";
};

export const resolveActionIntentDirection = (
  snapshot: DirectionalSnapshot,
  facing: 1 | -1,
): Direction => {
  if (snapshot.forward && !snapshot.backward) {
    return "up";
  }
  if (snapshot.backward && !snapshot.forward) {
    return "down";
  }
  if (snapshot.leftward && !snapshot.rightward) {
    return facing > 0 ? "back" : "forward";
  }
  if (snapshot.rightward && !snapshot.leftward) {
    return facing > 0 ? "forward" : "back";
  }
  return "neutral";
};
