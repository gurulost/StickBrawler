# Agent Execution Plan

## Guiding Priorities
- Preserve the health-based win condition while injecting Smash-inspired depth (frame data, mobility, guard/stamina mind games).
- Ship production-ready combat first; presentation, content, and tooling follow once mechanics feel crisp.
- Every change must be tracked here so future sessions can resume without re-discovery.

## Current Milestone — Coin Economy & Cosmetic Unlocks
Goal: Reward skillful play with coins, gate cosmetics by cost, and surface the loop in UI and backend so progression feels real.

### Task Board
| Status | Task | Notes |
| --- | --- | --- |
| ✅ | P1: Define earning/spending model (damage → coins, combo/round bonuses, sinks) and document API hooks. | Spec locked 2025-11-10. |
| ✅ | P2: Extend `useCustomization` (or new store) with coin balance, unlock lists, purchase/earn actions, and persistence guards (caps, validation). | Store now tracks coins, unlock lists, ledger events, and clamps to 999 999. |
| ✅ | P3: Hook combat runtime to coin awards (per-hit, per-combo, round-completion) via `useFighting`/telemetry bridge; ensure deterministic updates and anti-cheese safeguards. | Combat store now pays out on hits/combos/KOs/timeouts. |
| ✅ | P4: Surface economy in UI (HUD + Fighter Customizer purchase panels) with lock states, price tags, and purchase confirmations/errors. | HUD + customizer now show balances, lock pills, toasts, and activity feed. |
| 🟡 | P5: Persist & validate coin data server-side (extend `/api/telemetry` or new endpoint) and add smoke tests. | `/api/economy` + DB schema landed; node:test suite added but `npm test` still blocked by esbuild mismatch (host 0.23.1 vs bin 0.25.0). |
| ⚪️ | P6: QA pass: regression tests (unit + smoke), docs update, backlog grooming. | Pending. |

### Implementation Order (User-directed: "2 then 1")
1. Polish UI/UX first (P4) — responsive toasts, unlock flows, coin history, HUD signaling.
2. Then tackle backend persistence & tests (P5) once the front-end experience feels right.
3. QA/documentation sweep (P6) to close the loop after backend work.

### Session Notes — 2025-11-10
- `useCustomization` now persists coin balance, lifetime earnings, unlock arrays, and exposes earn/spend/purchase helpers plus guard-rails (caps, error codes).
- `useFighting` awards coins per hit/combo/KO/timeout, sharing metadata with the ledger and showing round bonuses; Game UI now surfaces balance + recent gains.
- Fighter Customizer now doubles as the progression hub: balance card, lock badges with prices, animated toasts, and a recent-coin activity feed (powered by the store’s new ledger queue).
- Curated preset skins now include rarity filters, randomize/copy actions, and lock-aware equip flows for both Player/CPU, so experimenting with outfits is a two-click experience instead of hand-tuning every dropdown.
- Backend persistence is live via `/api/economy` with upserted snapshots (profileId, unlocks, ledger). Client auto-syncs every ~1.5s after state changes. Tests were added but cannot run locally yet because esbuild host/binary versions mismatch (needs toolchain fix).
- Outstanding for P4+: share balances with backend/telemetry, add error toasts in HUD, and consider exposing earn events in debug overlay.

## Preset Collections Initiative

### Goals
- Deliver a “Collections” experience worthy of a flagship fighter: searchable gallery, rarity filters, ownership breakdown, and cinematic previews that make every skin feel collectible.
- Empower players to curate and share their own looks via duplication/edit/export, while teaching new players how coins/rarities work.

### Phases
1. **Collections UI Foundations**
   - Dedicated screen state (tabs or routes) separating “Customize” vs “Collections”.
   - Large preset cards with inline 3D preview toggles (mini StickFigure) and quick equip/favorite buttons.
   - Filters/pills (All/Owned/Locked + rarity + tags like Rushdown/Air) and text search.
   - Favorite tagging stored in Zustand for quick access.
2. **Bundle Details & Ownership Breakdown**
   - Expand each card (accordion/modal) listing the color theme, figure style, accessory, animation set, and accessory color.
   - Show owned vs missing status with quick-purchase buttons per cosmetic (calls `purchaseCosmetic` directly).
   - Display cumulative unlock cost vs already-spent coins.
3. **Preset Management & Sharing**
   - “Duplicate to My Styles” button that copies a preset into saved characters for further editing.
   - Export/import JSON for a selected style (shareable preset code).
   - “Favorite” and “Pin to quick-select” actions surfaced in the main customizer.
4. **Onboarding & Tips**
   - Guided tooltip/walkthrough when entering Collections for the first time (coins explained, rarity legend, filter tips).
   - Tooltips on lock icons showing exact cost or unlock requirements.
   - HUD toast when a preset becomes affordable (e.g., after a round).

### Deliverables
- Zustand additions: favorite IDs, tag metadata, preset catalog definitions, export/import utilities.
- React components: CollectionsPage, PresetCard (expanded), OwnershipAccordion, PreviewModal, FavoritesGrid, OnboardingTour.
- Hooks: usePresetFilters (handles search/pills), usePresetPreview (manages 3D snapshots), useOnboardingFlags (stores walkthrough completion).
- Tests: snapshot tests for filters, API tests for future preset endpoints (if backend stores favorites), unit tests for export/import validation.

### Risks / Dependencies
- 3D preview per card increases render cost; need lazy loading or low-poly silhouettes.
- Export/import must sanitize user-provided JSON to avoid invalid combos.
- Favorites persistence may later sync server-side; plan for future API by keeping IDs stable.

## Coin Economy Spec (P1)
### Earning Events
- **Hit Confirm**: award `base = max(1, floor(actualDamage * 1.1))` coins per landed strike after all scaling (guards, dodges, combo mult). Encourages damaging moves without counting whiffs.
- **Combo Momentum**: if combo counter ≥2 before the hit, add `comboBonus = (comboCount - 1) * 2` coins. Resets when combo breaks.
- **Finisher / KO**: when CPU HP hits 0, grant `finisherBonus = 35` coins plus `Math.round(remainingHealth * 0.4)` as a "clean win" bonus.
- **Round Resolution**: On `endRound` evaluate winner: `+40` coins for win, `+15` for loss, `+25` for timeout draw. Perfect rounds (took <10 damage) add extra `+25`.
- **Style Bonuses (future)**: hook parries/perfect blocks to extra awards once defensive depth lands.

### Spending & Unlocks
- All cosmetics carry the costs already defined in `useCustomization`. Player starts with the `DEFAULT_UNLOCKED_*` arrays and 0 coins, hard-capped at 999 999.
- Store exposes `earnCoins(event)`, `purchaseCosmetic({slot, id})`, `unlockCosmetic(slot, id)`, and derived helpers (`isUnlocked`, `getCost`).
- Purchases fail with structured errors (insufficient funds, already unlocked, unknown item) so UI can present friendly toasts.
- Unlock lists persist via `zustand/persist`; we also track `lifetimeCoinsEarned` for telemetry and potential backend reconciliation later.
- Future backend sync: POST `/api/economy` with `{ coins, lifetimeCoins, unlocks }` bundled with telemetry for anti-cheat once auth exists.

### Open Questions / Risks
- Need to confirm whether coin persistence must sync with future account system or remain local-only short term.
- Combat loop currently posts telemetry; decide if coin awards piggyback on same payload or stay client-side until auth exists.
- NPM/esbuild mismatch still blocks CI/tests; once economy lands, prioritize toolchain fix.

_Last updated: 2025-11-10T15:50:46Z_
