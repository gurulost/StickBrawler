# Character Visual Upgrade Roadmap

Purpose: turn StickBrawler's current customization and fighter presentation into a stable, authored, premium-feeling character pipeline.

## Executive Summary

The current system has good breadth but weak finish. The store and UI expose a wide range of options, but the rendered characters still read as parameterized stick figures rather than iconic fighters. More importantly, some of the most visible customization flows are not stable:

- accessory selection currently crashes the preview
- figure-style swaps trigger repeated Three.js buffer-size errors
- animation styles exist mostly as stored metadata rather than visible fighter expression
- several style/theme fields are only partially consumed by rendering

The best path is:

1. Stabilize the renderer and preview.
2. Convert the current broad option set into fewer, stronger authored silhouettes and accessories.
3. Make style and animation choices visibly distinct in-game, not just in UI labels.
4. Upgrade the customizer UX so picking a fighter feels premium.

## Current Assessment

### Working Well

- The customization state model is richer than a typical early prototype.
- Loadout export/import is already a strong feature.
- Blend + override support gives us a path to deeper silhouette control.
- Ink style presets are a good base for a stronger look-dev system.
- Presets are a useful scaffold for curated fighter fantasies.

### Not Fully Functional

- Accessory rendering is not stable.
  - Current issue: hook-order violation in [client/src/game/stickfigure/Head.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Head.tsx#L44)
- Figure-style changes are not renderer-safe.
  - Current issue: Three.js buffer attribute resize errors after silhouette changes
- Animation style selection is mostly cosmetic.
  - Data exists in [client/src/lib/stores/useCustomization.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/lib/stores/useCustomization.tsx#L458), but those values are not meaningfully driving visible motion language
- Several style properties are underused or effectively dead:
  - `specialGeometry`
  - `metalness`
  - `roughness`
  - `animationMultiplier`
  - much of `specialEffect` beyond preview particles
- The customizer preview is too small and too passive to sell the options.

## Priority Order

### Phase 1: Stability First

Goal: make every current customization option safe to use without preview corruption or crashes.

#### 1. Accessory rendering fix

Problem:
- [client/src/game/stickfigure/Head.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Head.tsx) calls `useInkMaterial` and `useOutlineMaterial` inside a conditional `.map()`

Fix:
- Move per-accessory-piece rendering into a dedicated child component
- Ensure hook count is constant regardless of whether an accessory exists
- Key accessory groups so geometry swaps remount cleanly

Files:
- [client/src/game/stickfigure/Head.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Head.tsx)
- likely add [client/src/game/stickfigure/AccessoryMesh.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/AccessoryMesh.tsx)

Done when:
- switching between `none`, single-piece, and multi-piece accessories never crashes
- preview and in-game fighter both survive repeated accessory swaps

#### 2. Geometry swap safety

Problem:
- figure-style changes trigger repeated buffer-size errors

Likely cause:
- live geometry updates are mutating attribute sizes in-place instead of remounting cleanly when limb topology changes

Fix:
- make tapered limb geometry remount when silhouette dimensions materially change
- avoid reusing incompatible geometries across style swaps
- isolate preview mesh lifecycle from gameplay mesh lifecycle

Files:
- [client/src/game/stickfigure/Limbs.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Limbs.tsx)
- [client/src/game/stickfigure/limbGeometry.ts](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/limbGeometry.ts)
- [client/src/game/StickFigure.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/StickFigure.tsx)
- [client/src/components/preview/CharacterPreview.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/preview/CharacterPreview.tsx)

Done when:
- repeatedly switching body styles and silhouette sliders produces zero console errors

#### 3. Preview hardening

Problem:
- the live preview is fragile and too tightly coupled to full game rendering behavior

Fix:
- introduce a dedicated preview mode for `StickFigure`
- disable unnecessary combat-only transient effects in preview
- add a lightweight preview error boundary so the customizer does not collapse when one visual asset fails

Files:
- [client/src/components/preview/CharacterPreview.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/preview/CharacterPreview.tsx)
- [client/src/game/StickFigure.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/StickFigure.tsx)

Done when:
- preview is stable under rapid customization changes

### Phase 2: Make Fighters Actually Cooler

Goal: get a large visible jump in character quality without needing a brand-new asset pipeline.

#### 4. Replace “parameterized” feel with authored silhouette families

Right now:
- styles mainly alter proportions

Upgrade:
- define 6 to 8 strong silhouette families with specific identity:
  - bruiser
  - duelist
  - rogue
  - monk
  - mech
  - specter
  - paladin
  - crystal titan

What changes per family:
- head shape
- shoulder line
- torso profile
- arm/leg taper
- hand/foot exaggeration
- idle stance
- outline weight

Files:
- [client/src/lib/stores/useCustomization.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/lib/stores/useCustomization.tsx)
- [client/src/game/stickfigure/Head.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Head.tsx)
- [client/src/game/stickfigure/Torso.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Torso.tsx)
- [client/src/game/stickfigure/Limbs.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Limbs.tsx)

Best immediate win:
- stop thinking in terms of “normal/bulky/slim/cartoonish”
- think in terms of authored combat archetypes with recognizable silhouettes

#### 5. Upgrade accessories from primitives to designed attachments

Right now:
- many accessories are just basic geometries

Upgrade:
- give each hero accessory a real silhouette and motion language
- examples:
  - visor: segmented lens band with animated scan sweep
  - crown: pointed ring with jewel glow
  - halo: dual-ring orbit with soft bloom
  - demon horns: asymmetrical curved horn set
  - cape: layered ribbon planes with reactive sway
  - wings: feather-cluster planes or stylized blade-wings
  - sword: fuller, guard, handle, energy edge
  - shield: faceted plate with inset glow core

Files:
- [client/src/lib/stores/useCustomization.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/lib/stores/useCustomization.tsx)
- [client/src/game/stickfigure/Head.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Head.tsx)
- likely new dedicated attachment components under [client/src/game/stickfigure](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure)

Best immediate win:
- build 4 premium accessories properly before adding more inventory

#### 6. Turn ink styles into real visual identities

Right now:
- ink presets are mostly parameter shifts

Upgrade:
- define fewer but more dramatic render looks:
  - `comic`: heavy black contour, posterized fill, pop highlights
  - `brush`: irregular edge breakup, richer rim rolloff
  - `neon`: emissive rim, bloom-biased contour
  - `spectral`: soft opacity falloff, cool rim glow
  - `crystal`: hard spec breakups, faceted shading

Files:
- [client/src/game/stickfigure/inkMaterial.ts](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/inkMaterial.ts)
- [client/src/lib/stores/useCustomization.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/lib/stores/useCustomization.tsx)

Best immediate win:
- make each ink style read differently from mid-distance in one glance

#### 7. Make color themes less “palette swap,” more “energy identity”

Right now:
- themes are mostly colors plus preview particles

Upgrade:
- each theme should influence:
  - rim lighting behavior
  - aura tone
  - hit accent color
  - trail color
  - accessory emissive defaults
  - idle ambient particles

Files:
- [client/src/lib/stores/useCustomization.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/lib/stores/useCustomization.tsx)
- [client/src/components/ui/particle-effects.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/ui/particle-effects.tsx)
- [client/src/game/StickFigure.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/StickFigure.tsx)

### Phase 3: Make Animation Style Real

Goal: make “Fighting Style” visibly meaningful.

#### 8. Wire animation style into pose language

Right now:
- animation style values exist but barely affect what the player sees

Upgrade:
- apply style to:
  - idle sway amplitude
  - anticipation timing
  - landing compression
  - dodge posture
  - guard stance
  - taunt personality
  - attack extension/recovery pose

Examples:
- `fast`: narrow stance, sharper anticipation, faster recoil
- `powerful`: wider stance, slower windup, stronger settle
- `acrobatic`: more airborne asymmetry, springier idle
- `robotic`: stepped motion, reduced sway, rigid blocking

Files:
- [client/src/game/StickFigure.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/StickFigure.tsx)
- [client/src/game/stickfigure/Limbs.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Limbs.tsx)
- [client/src/lib/stores/useCustomization.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/lib/stores/useCustomization.tsx)

Done when:
- changing fighting style is obvious without reading a label

### Phase 4: Customizer UX Upgrade

Goal: make the customization screen feel like a premium build station, not a settings page.

#### 9. Improve the live preview presentation

Upgrade:
- larger preview canvas
- dramatic staged lighting
- quick pose buttons:
  - idle
  - attack
  - block
  - jump
  - taunt
- auto-turntable toggle
- before/after compare
- “fit check” backdrop options

Files:
- [client/src/components/preview/CharacterPreview.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/preview/CharacterPreview.tsx)
- [client/src/components/ui/fighter-customizer.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/ui/fighter-customizer.tsx)

#### 10. Split the UI into Basic and Advanced

Current problem:
- too many controls are surfaced at once

Upgrade:
- Basic tab:
  - preset
  - color theme
  - body style
  - accessory
  - fighting style
- Advanced tab:
  - silhouette lab
  - ink overrides
  - blend controls
  - import/export JSON

This will make the system feel more intentional and reduce the “toolbox” vibe.

Files:
- [client/src/components/ui/fighter-customizer.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/ui/fighter-customizer.tsx)

#### 11. Upgrade curated presets into true fantasy kits

Right now:
- presets are combinations of existing values

Upgrade:
- each preset should own:
  - silhouette
  - palette
  - ink look
  - accessory choice
  - accessory color
  - animation style
  - optional intro pose / badge / rarity framing

Files:
- [client/src/components/ui/fighter-customizer.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/ui/fighter-customizer.tsx)
- [client/src/data/presets.ts](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/data/presets.ts)

## What Is Fully Functional Today

These areas are reasonably solid:

- state persistence for customization choices
- save/load/delete character configs
- JSON import/export
- blend and override data model
- lock/unlock economy state tracking
- preset equip logic at the store level

## What Is Not Fully Functional Today

These areas should not be treated as “done”:

- accessory rendering stability
- geometry swap stability in live preview
- animation style visual impact
- full usage of style metadata
- premium-quality accessory art
- premium-quality preview presentation

## Highest-Leverage Build Order

If this work starts now, the best sequence is:

1. Fix accessory hook-order crash.
2. Fix geometry remount/buffer-size errors for style swaps.
3. Harden preview mode and add preview-specific rendering constraints.
4. Rebuild 4 hero accessories properly.
5. Redesign 4 to 6 silhouette families into strong archetypes.
6. Wire animation styles into visible idle/attack/guard motion language.
7. Rework ink styles into fewer, more dramatic visual identities.
8. Upgrade the customizer UX and preview stage.
9. Expand preset kits around strong authored fantasies.

## If We Want The Fastest Visible Win

The fastest “wow” upgrade is not a full system rewrite. It is this:

1. Fix accessory crash.
2. Fix figure-style preview stability.
3. Replace current accessories with 4 high-quality authored ones.
4. Replace current style labels with 4 high-identity silhouette archetypes.
5. Enlarge the preview and add dramatic staging.

That alone would make the game feel much more premium.

## File Map

### Stability

- [client/src/game/stickfigure/Head.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Head.tsx)
- [client/src/game/stickfigure/Limbs.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Limbs.tsx)
- [client/src/game/stickfigure/limbGeometry.ts](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/limbGeometry.ts)
- [client/src/components/preview/CharacterPreview.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/preview/CharacterPreview.tsx)

### Visual Identity

- [client/src/lib/stores/useCustomization.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/lib/stores/useCustomization.tsx)
- [client/src/game/stickfigure/Head.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Head.tsx)
- [client/src/game/stickfigure/Torso.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Torso.tsx)
- [client/src/game/stickfigure/Limbs.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/Limbs.tsx)
- [client/src/game/stickfigure/inkMaterial.ts](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/game/stickfigure/inkMaterial.ts)
- [client/src/components/ui/particle-effects.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/ui/particle-effects.tsx)

### UX

- [client/src/components/ui/fighter-customizer.tsx](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/components/ui/fighter-customizer.tsx)
- [client/src/data/presets.ts](/Users/davedixon/Documents/GitHub/StickBrawler/client/src/data/presets.ts)

## Recommendation

Do not add more customization inventory yet.

The correct move is to stabilize the rendering path and then deepen authorship:

- fewer styles
- stronger silhouettes
- better accessories
- real animation personality
- premium preview UX

That will produce a much bigger upgrade than simply adding more theme colors, more sliders, or more preset names.
