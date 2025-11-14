# Hero Video Assets

## Required Files

### ink-hero-loop.mp4
- **Description**: Background hero video loop for landing page
- **Location**: `client/public/media/ink-hero-loop.mp4`
- **Requirements**:
  - Format: MP4 (H.264 codec)
  - Duration: 5-15 seconds (seamless loop)
  - Resolution: 1920x1080 or higher
  - File size: < 5MB (optimized for web)
  - Content: Gameplay footage showing ink-drawn fighters in action

## How to Capture

1. Run the game in development mode: `npm run dev`
2. Play a match showcasing the ink shader effects
3. Use screen recording software to capture gameplay
4. Edit the video to create a seamless loop
5. Compress/optimize for web delivery
6. Save as `ink-hero-loop.mp4` in this directory

## Usage

Referenced in: `client/src/components/landing/LandingHero.tsx` (line 37)

```tsx
<video
  src="/media/ink-hero-loop.mp4"
  autoPlay
  loop
  muted
  playsInline
/>
```
