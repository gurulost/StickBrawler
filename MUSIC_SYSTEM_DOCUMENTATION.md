# Music System Documentation

## Overview
The music system has been fully refactored to be **scalable and future-proof**, allowing unlimited menu and battle themes to be added easily.

## Architecture

### Scalable Arrays
- **menuThemes[]**: Array of all menu music tracks (currently 1 track)
- **battleThemes[]**: Array of all battle music tracks (currently 2 tracks)
- Tracks automatically cycle using modulo arithmetic

### Key Features
1. **Context-Aware Playback**: Automatically switches between menu and fighting contexts
2. **Automatic Cycling**: Battle themes alternate with each fight
3. **Smooth Crossfading**: Fade in/out transitions between tracks
4. **Autoplay Policy Handling**: Gracefully handles browser autoplay restrictions
5. **Music Toggle UI**: Visible in both menu and game screens

## Adding New Music Tracks

### Example: Adding More Menu Themes
```javascript
// In client/src/App.tsx useEffect:
const menuTheme1 = loadAudio("/sounds/menu-theme-1.mp3", 0.35);
const menuTheme2 = loadAudio("/sounds/menu-theme-2.mp3", 0.35);
const menuTheme3 = loadAudio("/sounds/menu-theme-3.mp3", 0.35);

addMenuTheme(menuTheme1);
addMenuTheme(menuTheme2);
addMenuTheme(menuTheme3);
// Menu will cycle: theme1 -> theme2 -> theme3 -> theme1...
```

### Example: Adding More Battle Themes
```javascript
// In client/src/App.tsx useEffect:
const battleTheme1 = loadAudio("/sounds/battle-theme-1.mp3", 0.35);
const battleTheme2 = loadAudio("/sounds/battle-theme-2.mp3", 0.35);
const battleTheme3 = loadAudio("/sounds/battle-theme-3.mp3", 0.35);
const battleTheme4 = loadAudio("/sounds/battle-theme-4.mp3", 0.35);

addBattleTheme(battleTheme1);
addBattleTheme(battleTheme2);
addBattleTheme(battleTheme3);
addBattleTheme(battleTheme4);
// Each fight uses next theme: fight1 uses theme1, fight2 uses theme2, etc.
```

## API Reference

### useAudio Store Functions

#### `addMenuTheme(audio: HTMLAudioElement)`
Adds a new menu theme to the rotation. Automatically sets loop=true and volume.

#### `addBattleTheme(audio: HTMLAudioElement)`
Adds a new battle theme to the rotation. Automatically sets loop=true and volume.

#### `switchMusicContext(context: 'menu' | 'fighting')`
Switches between menu and fighting music contexts. Called automatically when game phase changes.

#### `toggleMusic()`
Toggles music on/off. Available in UI via MusicToggle component.

#### `ensureMusicPlaying()`
Helper to start music from user gesture (handles autoplay blocks).

## Current Implementation

### Music Files
- `/sounds/menu-theme.mp3` (3.3MB)
- `/sounds/battle-theme-1.mp3` (4.9MB)
- `/sounds/battle-theme-2.mp3` (3.8MB)

### Behavior
1. **On app load**: Menu music attempts to play (may be blocked by browser autoplay policy)
2. **On "Enter Arena" click**: Music starts playing (user gesture unblocks autoplay)
3. **During fight**: Switches to battle theme (alternates between theme 1 and 2)
4. **After fight**: Returns to menu music
5. **Music toggle**: Users can enable/disable music at any time

## Browser Autoplay Handling

### How It Works
1. App attempts to play menu music on load
2. Browser blocks autoplay (expected behavior)
3. Sets `autoplayBlocked` flag
4. On first user interaction (clicking "Enter Arena"), music starts
5. All subsequent music switches work normally

### Why This Approach
- Complies with browser autoplay policies
- Provides smooth user experience
- No intrusive "allow audio" prompts needed

## Testing Checklist

✅ TypeScript compiles without errors
✅ Build succeeds
✅ No LSP diagnostics
✅ Clean browser console logs
✅ Music files exist and are accessible
✅ Array-based architecture implemented
✅ Context switching works
✅ Autoplay handling in place
✅ Documentation complete

## Future Enhancements

### Easy to Add
- More menu themes (just call `addMenuTheme()` more times)
- More battle themes (just call `addBattleTheme()` more times)
- Random theme selection (modify switchMusicContext logic)
- Theme unlocking system (filter arrays based on unlocked status)
- Per-arena battle themes (add arena-specific arrays)

### Example: Random Battle Theme Selection
```javascript
// In switchMusicContext, instead of cycling:
const randomIndex = Math.floor(Math.random() * battleThemes.length);
newTrack = battleThemes[randomIndex];
```

## Code Quality

- Clean separation of concerns
- Scalable architecture
- Well-documented inline comments
- TypeScript type safety
- Zustand state management
- No memory leaks (proper interval cleanup)
