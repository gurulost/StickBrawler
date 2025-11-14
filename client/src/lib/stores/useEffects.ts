import { create } from "zustand";

interface EffectsState {
  impactFlash: number;
  cameraShake: number;
  cameraShakeOffset: [number, number, number];
  landingBurst: number;
  triggerImpactFlash: (intensity: number) => void;
  triggerCameraShake: (intensity: number, direction?: [number, number, number]) => void;
  triggerLandingBurst: (intensity?: number) => void;
  decayEffects: (delta: number) => void;
}

const impactDecayRate = 1.5;
const shakeDecayRate = 2.3;
const landingDecayRate = 3.5;
const shakeBlendRate = 14;

const randomShakeVector = (magnitude: number): [number, number, number] => [
  (Math.random() * 2 - 1) * magnitude,
  (Math.random() * 2 - 1) * magnitude * 0.6,
  (Math.random() * 2 - 1) * magnitude,
];

const normalizeVector = (vector: [number, number, number]) => {
  const length = Math.hypot(vector[0], vector[1], vector[2]);
  if (!length) return [0, 0, 0] as [number, number, number];
  return [vector[0] / length, vector[1] / length, vector[2] / length] as [number, number, number];
};

const mixVector = (
  from: [number, number, number],
  to: [number, number, number],
  factor: number,
): [number, number, number] => [
  from[0] + (to[0] - from[0]) * factor,
  from[1] + (to[1] - from[1]) * factor,
  from[2] + (to[2] - from[2]) * factor,
];

export const useEffects = create<EffectsState>((set) => ({
  impactFlash: 0,
  cameraShake: 0,
  cameraShakeOffset: [0, 0, 0],
  landingBurst: 0,
  triggerImpactFlash: (intensity) =>
    set(() => ({
      impactFlash: Math.min(1, intensity),
    })),
  triggerCameraShake: (intensity, direction) =>
    set((state) => {
      const nextShake = Math.min(0.8, state.cameraShake + intensity);
      if (!nextShake) {
        return {
          cameraShake: 0,
          cameraShakeOffset: [0, 0, 0],
        };
      }
      const targetDirection = direction ?? randomShakeVector(1);
      const normalized = normalizeVector(targetDirection);
      const scaled: [number, number, number] = [
        normalized[0] * nextShake,
        normalized[1] * nextShake,
        normalized[2] * nextShake,
      ];
      return {
        cameraShake: nextShake,
        cameraShakeOffset: scaled,
      };
    }),
  triggerLandingBurst: (intensity = 1) =>
    set(() => ({
      landingBurst: Math.min(1, intensity),
    })),
  decayEffects: (delta) =>
    set((state) => {
      const nextFlash = Math.max(0, state.impactFlash - delta * impactDecayRate);
      const nextShake = Math.max(0, state.cameraShake - delta * shakeDecayRate);
      const nextLanding = Math.max(0, state.landingBurst - delta * landingDecayRate);
      let nextOffset = state.cameraShakeOffset;
      if (nextShake > 0) {
        const shakeTarget = randomShakeVector(nextShake);
        const blend = Math.min(1, delta * shakeBlendRate);
        nextOffset = mixVector(state.cameraShakeOffset, shakeTarget, blend);
      } else if (state.cameraShakeOffset.some((value) => Math.abs(value) > 0.0001)) {
        const decayFactor = Math.max(0, 1 - delta * shakeBlendRate);
        nextOffset = [
          state.cameraShakeOffset[0] * decayFactor,
          state.cameraShakeOffset[1] * decayFactor,
          state.cameraShakeOffset[2] * decayFactor,
        ];
      }

      if (
        nextFlash === state.impactFlash &&
        nextShake === state.cameraShake &&
        nextLanding === state.landingBurst &&
        nextOffset === state.cameraShakeOffset
      ) {
        return state;
      }
      return {
        impactFlash: nextFlash,
        cameraShake: nextShake,
        cameraShakeOffset: nextOffset,
        landingBurst: nextLanding,
      };
    }),
}));
