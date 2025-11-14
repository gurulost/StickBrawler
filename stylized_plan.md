## Objective
Transition stick figures + accessories to the ink/toon system and leverage customization presets fully.

## Completed
- Ink shader/outline pipeline and silhouette presets wired into limbs/head/torso.
- Limb geometries are Catmull-Rom based with per-style parameters.
- Lobby/pause/telemetry updates already merged.

## Next
1. Apply ink materials to accessory meshes (in `Head.tsx`, future body accessories) and expose rim/outline params in `accessories` definitions.
2. Provide fallback (MeshStandard) material path for performance-critical builds.
3. QA pass (performance, determinism) and document customization controls.
