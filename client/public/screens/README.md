# Feature Card Screenshots

## Required Files

All screenshots should be high-quality captures of the actual running game showcasing each feature.

### 1. customizer.png
- **Description**: Fighter customization interface showing ink shader options
- **Location**: `client/public/screens/customizer.png`
- **Requirements**:
  - Format: PNG
  - Resolution: 1200x800 or similar aspect ratio
  - Content: Screenshot of the Fighter Customizer panel with ink style selector visible
  - Feature highlight: Procedural ink fighters with silhouette blending

### 2. local-coop.png
- **Description**: Two players in combat during a local co-op match
- **Location**: `client/public/screens/local-coop.png`
- **Requirements**:
  - Format: PNG
  - Resolution: 1200x800 or similar aspect ratio
  - Content: Mid-combat screenshot showing both fighters with health bars and UI
  - Feature highlight: Shared deterministic runtime in action

### 3. economy.png
- **Description**: Economy system showing coins, unlocks, and loadouts
- **Location**: `client/public/screens/economy.png`
- **Requirements**:
  - Format: PNG
  - Resolution: 1200x800 or similar aspect ratio
  - Content: Screenshot of customization panel showing coin balance and unlockable cosmetics
  - Feature highlight: Loadout hashing and economy persistence

### 4. telemetry.png
- **Description**: Combat data or score submission interface
- **Location**: `client/public/screens/telemetry.png`
- **Requirements**:
  - Format: PNG
  - Resolution: 1200x800 or similar aspect ratio
  - Content: Screenshot of post-match results or leaderboard
  - Feature highlight: Hit data tracking and anti-cheat telemetry

## How to Capture

1. Run the game: `npm run dev`
2. Navigate to each feature section:
   - Customizer: Click "Open Ink Customizer" or navigate to `#customize`
   - Local Co-op: Start a 2-player match
   - Economy: Open customizer, highlight coin balance and unlocks
   - Telemetry: Complete a match, capture results screen or leaderboard
3. Use browser screenshot tools or OS screenshot utility
4. Crop and optimize images for web
5. Save as PNG files with the names listed above

## Usage

Referenced in: `client/src/data/landingContent.ts`

```typescript
export const landingFeatureCards = [
  { title: "Procedural Ink Fighters", image: "/screens/customizer.png" },
  { title: "Local Co‑Op & Shared Runtime", image: "/screens/local-coop.png" },
  { title: "Economy & Loadouts", image: "/screens/economy.png" },
  { title: "Telemetry + Anti‑Cheat", image: "/screens/telemetry.png" },
];
```
