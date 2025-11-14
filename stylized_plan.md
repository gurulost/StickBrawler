## Objective
Transition stick figures + accessories to the ink/toon system and leverage customization presets fully.

## Completed
- Ink shader/outline pipeline, silhouette presets, and low-graphics fallback (MeshToon) in `useInkMaterial`.
- Limbs/head/torso use ink shading; dust, trails, combat indicators, and combo HUD now render via ink billboards/brush strokes.
- Procedural brush strokes fire on move changes, guard hits, taunts, plus lobby/pause/telemetry upgrades are in place.
- Customization store now exposes blend targets + silhouette/ink overrides; `fighter-customizer.tsx` ships sliders, blend controls, and JSON share/import tools that feed the runtime.
- Loadout snapshots (ink + silhouette overrides) are synced through the economy API/shared schema; server storage + schema keep hashes for backend validation, and the dev UI now exposes spline debug overlays + ink-quality toggles for authoring/perf.

## Next
1. Extend ink treatment to head/body accessories (update `useCustomization` entries with rim/outline params).
2. Layer unlock/progression hooks: hook accessory ink presets into unlock UI, add spline export/authoring overlay for presets, and capture marketing stills of the ink look.
3. Prep backend leaderboard sync for custom fighters using the new loadout hashes (blocked on auth wires).
