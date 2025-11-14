## Objective
Transition existing stick figure components to stylized ink look & unlock customization potential.

## Steps Completed
- Toon/ink shader + outline system in `client/src/game/stickfigure/inkMaterial.ts`.
- Head/Torso/Limbs now use ink shading; limb geometry respects silhouette presets from `figureStyles`.
- Multiplayer lobby/pause telemetry intact.

## Next Steps
1. Convert accessories/effects to ink materials (useInkMaterial + outline) so they merge with the new look.
2. Expand customization UI to expose silhouette presets & accessory styles, plus fallback material toggle.
3. QA performance/determinism & add docs/screenshots.

## Notes
Actual file path for `useCustomization.tsx` needs confirmation; once accessible, hook accessory definitions into new silhouette/material parameters.
