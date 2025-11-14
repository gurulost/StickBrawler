# StickBrawler

## Overview

StickBrawler is a polished stick-figure arena fighter that combines health-based combat with Smash-style depth. The game features frame-accurate combat mechanics, a deterministic physics engine, a coin-based economy system with cosmetic unlocks, and 3D rendering using React Three Fiber. Players engage in tactical battles with combo systems, resource meters (stamina, guard, special), and customizable stick-figure appearances.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React + Three.js Rendering Stack**
- Built with React 18 and Vite for the development environment
- 3D graphics rendered using React Three Fiber (@react-three/fiber) with Drei helpers (@react-three/drei)
- Post-processing effects via @react-three/postprocessing for visual polish
- UI components built with Radix UI primitives and styled with Tailwind CSS
- Custom stick-figure rendering system with modular body parts (Head, Torso, Limbs)

**State Management**
- Zustand stores manage distinct slices of application state:
  - `useFighting`: Core combat state (player/CPU health, scores, round time, game phase)
  - `useCustomization`: Character appearance, unlocked cosmetics, coin economy
  - `useControls`: Input mappings and debug toggles
  - `useAudio`: Sound effects and music management
- State persistence through localStorage wrappers (`getLocalStorage`, `setLocalStorage`)

**Game Loop Architecture**
- Frame-based physics simulation using React Three Fiber's `useFrame` hook
- Fixed-step deterministic engine (`GameEngine`) for reproducible combat
- Separate combat state machine (`CombatStateMachine`) handling move execution, frame data, and resource meters
- Command/event pattern for game actions and telemetry

**Combat System Design**
- Frame-accurate move definitions with startup/active/recovery windows
- Hitbox/hurtbox collision detection with priority-based resolution
- Resource meters: guard (blocking/guard-break), stamina (dodges/specials), special (super meter)
- Combo scaling, juggle decay, and directional influence (DI-like knockback)
- CPU AI with behavior archetypes (Rushdown, Balanced, Zoner)

**Economy & Progression**
- Coin earning system tied to combat performance (hits, combos, KOs, round wins)
- Cosmetic unlocks gated by cost across four categories: color themes, figure styles, accessories, animation styles
- Preset collections with rarity tiers (common, rare, epic, legendary)
- Client-side ledger tracking recent coin events with debounced server sync

### Backend Architecture

**Express Server Foundation**
- Node.js/Express REST API with TypeScript
- Middleware for JSON parsing, request logging, and error handling
- Vite integration for development hot-reload and production static serving

**API Endpoints**
- `/api/scores`: Score submission and leaderboard retrieval with Zod validation
- `/api/telemetry`: Hit telemetry buffering for combat analytics
- `/api/economy`: Economy snapshot persistence (upsert by profileId, retrieval)
- Validation schemas defined with Zod for type-safe request/response handling

**Database Layer**
- Drizzle ORM with Neon serverless Postgres adapter
- Schema definitions in `shared/schema.ts`:
  - `users`: User accounts with high scores
  - `gameScores`: Match results with timestamps
  - `economySnapshots`: Player economy state (coins, unlocks, ledger)
- Connection pooling via singleton pattern in `getDb()`
- Migrations stored in `./migrations` directory

**Storage Abstraction**
- `IStorage` interface defining CRUD operations
- `DbStorage` implementation for Postgres persistence
- `MemStorage` in-memory implementation for testing
- Singleton `storage` instance exported for route handlers

**Game Runtime**
- `MatchRuntime` class wrapping deterministic `GameEngine`
- Server-side simulation capability for validation/replays
- Command queuing and event emission for authoritative combat

### External Dependencies

**Database & Hosting**
- Neon serverless Postgres (`@neondatabase/serverless`) for production database
- Drizzle ORM (`drizzle-orm`, `drizzle-kit`) for schema management and migrations
- Connection configured via `DATABASE_URL` environment variable

**3D Graphics & Physics**
- React Three Fiber for declarative 3D scene management
- Three.js for underlying WebGL rendering
- @react-three/drei for camera controls, loaders, and helpers
- @react-three/postprocessing for shader effects
- Custom physics engine (gravity, friction, collision, platforms) in `Physics.ts`

**UI Component Library**
- Radix UI for accessible, unstyled primitives (dialogs, dropdowns, tabs, etc.)
- Tailwind CSS for utility-first styling
- shadcn/ui component patterns (Button, Card, Badge, etc.)
- Lucide React for icon library

**Query & Form Management**
- TanStack Query (@tanstack/react-query) for server state synchronization
- React Hook Form for form validation (imported but usage limited)
- Custom `apiRequest` helper wrapping fetch with error handling

**Development & Build Tools**
- Vite for frontend bundling and dev server
- esbuild for server-side bundling in production
- tsx for TypeScript execution in development
- TypeScript with strict mode and path aliases (`@/*`, `@shared/*`, `@engine/*`)
- Node.js built-in test runner for backend testing

**Audio System**
- Custom audio management through `useAudio` store
- Preloaded sound effects for combat actions (punch, kick, special, block, etc.)
- Background music and UI feedback sounds

**Validation & Type Safety**
- Zod for runtime schema validation on API boundaries
- drizzle-zod for generating Zod schemas from Drizzle table definitions
- Shared TypeScript types between client and server via `shared/` directory

**Ink Customization System**
- Procedural "ink-drawn" aesthetic with 8 curated shader presets (classic, bold, sketch, glow, neon, manga, watercolor, charcoal)
- Unified toon shader pipeline via `useInkMaterial` hook (client/src/game/stickfigure/inkMaterial.ts)
- Per-fighter customization: rimColor, shadeBands, lineWidth, glow, outlineColor
- Accessory ink inheritance: global ink params with per-accessory override support
- Low-graphics fallback: `lowGraphicsMode` toggle in `useControls` forces MeshToonMaterial for performance
- Deterministic rendering: Ink shading driven by state, visual animations use Math.random() for variety
- Persistence: `SavedCharacter` includes `inkStyle` and `inkOverrides` fields for load/save workflow
- UI Components: `InkStyleSelector` with visual preview cards showing style characteristics
- Performance: Shader compilation cached per light direction, materials memoized
- Known limitations: Debug toggles for outline widths/control points not yet implemented (future work)