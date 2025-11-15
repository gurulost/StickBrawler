import { create } from "zustand";

/**
 * Advanced audio system for an immersive fighting game experience
 * Includes dynamic sound effects with pitch variation and 3D positional audio
 * Enhanced music system with context-aware playback and alternating battle themes
 */

export type MusicContext = 'menu' | 'fighting';

interface AudioState {
  // Music elements
  menuTheme: HTMLAudioElement | null;
  battleTheme1: HTMLAudioElement | null;
  battleTheme2: HTMLAudioElement | null;
  currentMusicTrack: HTMLAudioElement | null;
  
  // Music state management
  musicContext: MusicContext;
  musicEnabled: boolean;
  battleThemeIndex: number; // 0 for theme 1, 1 for theme 2
  musicVolume: number;
  fadeIntervalId: NodeJS.Timeout | null;
  autoplayBlocked: boolean;
  
  // Audio elements
  backgroundMusic: HTMLAudioElement | null;
  hitSound: HTMLAudioElement | null;
  successSound: HTMLAudioElement | null;
  punchSound: HTMLAudioElement | null;
  kickSound: HTMLAudioElement | null;
  specialSound: HTMLAudioElement | null;
  blockSound: HTMLAudioElement | null;
  jumpSound: HTMLAudioElement | null;
  landSound: HTMLAudioElement | null;
  dodgeSound: HTMLAudioElement | null;
  grabSound: HTMLAudioElement | null;
  throwSound: HTMLAudioElement | null;
  tauntSound: HTMLAudioElement | null;
  
  // Master volume and state
  isMuted: boolean;
  masterVolume: number;
  
  // Music management functions
  ensureMusicPlaying: () => void;
  setMenuTheme: (music: HTMLAudioElement) => void;
  setBattleTheme1: (music: HTMLAudioElement) => void;
  setBattleTheme2: (music: HTMLAudioElement) => void;
  switchMusicContext: (context: MusicContext) => void;
  toggleMusic: () => void;
  setMusicVolume: (volume: number) => void;
  
  // Setter functions for audio sources
  setBackgroundMusic: (music: HTMLAudioElement) => void;
  setHitSound: (sound: HTMLAudioElement) => void;
  setSuccessSound: (sound: HTMLAudioElement) => void;
  setPunchSound: (sound: HTMLAudioElement) => void;
  setKickSound: (sound: HTMLAudioElement) => void;
  setSpecialSound: (sound: HTMLAudioElement) => void;
  setBlockSound: (sound: HTMLAudioElement) => void;
  setJumpSound: (sound: HTMLAudioElement) => void;
  setLandSound: (sound: HTMLAudioElement) => void;
  setDodgeSound: (sound: HTMLAudioElement) => void;
  setGrabSound: (sound: HTMLAudioElement) => void;
  setThrowSound: (sound: HTMLAudioElement) => void;
  setTauntSound: (sound: HTMLAudioElement) => void;
  
  // Control functions
  toggleMute: () => void;
  setMasterVolume: (volume: number) => void;
  
  // Combat sound functions
  playHit: (intensity?: number) => void;    // Generic hit sound with variable intensity
  playPunch: () => void;                    // Quick attack sound
  playKick: () => void;                     // Strong attack sound
  playSpecial: () => void;                  // Special attack sound
  playBlock: () => void;                    // Blocking sound
  playSuccess: () => void;                  // Victory sound
  
  // Movement sound functions
  playJump: () => void;                     // Jump sound
  playLand: () => void;                     // Landing sound
  playDodge: () => void;                    // Dodge sound
  playGrab: () => void;                     // Grab sound
  playThrow: () => void;                    // Throw sound
  playTaunt: () => void;                    // Taunt sound
  
  // Advanced sound functions
  playComboHit: (comboCount: number) => void; // Special sound for combos
  playBackgroundMusic: () => void;           // Start background music with loop
}

export const useAudio = create<AudioState>((set, get) => ({
  // Initialize music elements
  menuTheme: null,
  battleTheme1: null,
  battleTheme2: null,
  currentMusicTrack: null,
  
  // Music state
  musicContext: 'menu',
  musicEnabled: true,
  battleThemeIndex: 0,
  musicVolume: 0.35,
  fadeIntervalId: null as NodeJS.Timeout | null,
  autoplayBlocked: false,
  
  // Initialize all audio elements as null
  backgroundMusic: null,
  hitSound: null,
  successSound: null,
  punchSound: null,
  kickSound: null,
  specialSound: null,
  blockSound: null,
  jumpSound: null,
  landSound: null,
  dodgeSound: null,
  grabSound: null,
  throwSound: null,
  tauntSound: null,
  
  // Default audio settings
  isMuted: false, // Start unmuted for better user experience
  masterVolume: 0.8, // Default volume at 80%
  
  // Helper to ensure music starts (call from user gesture)
  ensureMusicPlaying: () => {
    const { currentMusicTrack, musicEnabled, isMuted, musicVolume } = get();
    if (currentMusicTrack && musicEnabled && !isMuted && currentMusicTrack.paused) {
      currentMusicTrack.volume = musicVolume;
      currentMusicTrack.play().then(() => {
        set({ autoplayBlocked: false });
      }).catch(() => {});
    }
  },
  
  // Music management functions
  setMenuTheme: (music) => {
    music.loop = true;
    music.volume = get().musicVolume;
    set({ menuTheme: music });
  },
  
  setBattleTheme1: (music) => {
    music.loop = true;
    music.volume = get().musicVolume;
    set({ battleTheme1: music });
  },
  
  setBattleTheme2: (music) => {
    music.loop = true;
    music.volume = get().musicVolume;
    set({ battleTheme2: music });
  },
  
  switchMusicContext: (context) => {
    const { musicContext, currentMusicTrack, menuTheme, battleTheme1, battleTheme2, battleThemeIndex, musicEnabled, isMuted, musicVolume, fadeIntervalId, backgroundMusic } = get();
    
    // Short-circuit only if switching to the same context and track is actively playing
    if (musicContext === context && currentMusicTrack && !currentMusicTrack.paused) {
      return;
    }
    
    // Update context even if tracks aren't loaded yet
    set({ musicContext: context });
    
    // Clear any existing fade interval
    if (fadeIntervalId) {
      clearInterval(fadeIntervalId);
      set({ fadeIntervalId: null });
    }
    
    // Stop legacy background music if it's playing
    if (backgroundMusic && !backgroundMusic.paused) {
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
    }
    
    // Select the new track based on context
    let newTrack: HTMLAudioElement | null = null;
    
    if (context === 'menu') {
      newTrack = menuTheme;
    } else if (context === 'fighting') {
      // Alternate between battle themes
      if (battleThemeIndex === 0) {
        newTrack = battleTheme1;
        set({ battleThemeIndex: 1 }); // Next time use theme 2
      } else {
        newTrack = battleTheme2;
        set({ battleThemeIndex: 0 }); // Next time use theme 1
      }
    }
    
    // If track isn't loaded yet, just update context and return
    if (!newTrack) {
      console.log(`Music track for context '${context}' not loaded yet`);
      return;
    }
    
    // Fade out current track only if it's different from the new track
    if (currentMusicTrack && currentMusicTrack !== newTrack && !currentMusicTrack.paused) {
      const fadeOut = setInterval(() => {
        if (currentMusicTrack.volume > 0.05) {
          currentMusicTrack.volume = Math.max(0, currentMusicTrack.volume - 0.05);
        } else {
          currentMusicTrack.pause();
          currentMusicTrack.currentTime = 0;
          clearInterval(fadeOut);
        }
      }, 50);
    }
    
    // Update current track
    set({ currentMusicTrack: newTrack });
    
    // Play new track if music is enabled
    if (newTrack && musicEnabled && !isMuted) {
      // Reset track if it was paused
      if (newTrack.paused) {
        newTrack.currentTime = 0;
      }
      
      newTrack.volume = 0;
      
      // Attempt to play with autoplay policy handling
      newTrack.play().then(() => {
        // Autoplay succeeded, clear blocked flag
        set({ autoplayBlocked: false });
        
        // Fade in new track with interval tracking
        const fadeIn = setInterval(() => {
          if (newTrack && newTrack.volume < musicVolume - 0.05) {
            newTrack.volume = Math.min(musicVolume, newTrack.volume + 0.05);
          } else {
            if (newTrack) newTrack.volume = musicVolume;
            clearInterval(fadeIn);
            set({ fadeIntervalId: null });
          }
        }, 50);
        set({ fadeIntervalId: fadeIn });
      }).catch((error) => {
        // Autoplay blocked - flag it for retry on next user interaction
        set({ autoplayBlocked: true });
        console.log('Music autoplay blocked, will retry on next user interaction (e.g., clicking Play)');
      });
    } else if (get().autoplayBlocked && newTrack) {
      // If autoplay was previously blocked and we have a track, try again
      // This happens when user interacts (e.g., clicks Play button)
      newTrack.volume = 0;
      newTrack.play().then(() => {
        set({ autoplayBlocked: false });
        const fadeIn = setInterval(() => {
          if (newTrack && newTrack.volume < musicVolume - 0.05) {
            newTrack.volume = Math.min(musicVolume, newTrack.volume + 0.05);
          } else {
            if (newTrack) newTrack.volume = musicVolume;
            clearInterval(fadeIn);
            set({ fadeIntervalId: null });
          }
        }, 50);
        set({ fadeIntervalId: fadeIn });
      }).catch(() => {
        // Still blocked, will try again later
        console.log('Music still blocked');
      });
    }
  },
  
  toggleMusic: () => {
    const { musicEnabled, currentMusicTrack, isMuted, autoplayBlocked } = get();
    const newMusicEnabled = !musicEnabled;
    
    set({ musicEnabled: newMusicEnabled });
    
    if (currentMusicTrack) {
      if (newMusicEnabled && !isMuted) {
        // This is a user gesture - perfect for unblocking autoplay
        currentMusicTrack.currentTime = 0;
        currentMusicTrack.volume = get().musicVolume;
        currentMusicTrack.play().then(() => {
          set({ autoplayBlocked: false });
        }).catch(() => {
          console.log('Music toggle blocked');
        });
      } else {
        currentMusicTrack.pause();
      }
    }
  },
  
  setMusicVolume: (volume) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const { currentMusicTrack } = get();
    
    set({ musicVolume: clampedVolume });
    
    if (currentMusicTrack) {
      currentMusicTrack.volume = clampedVolume;
    }
  },
  
  // Setter functions for all audio elements
  setBackgroundMusic: (music) => {
    // Setup background music with loop
    music.loop = true;
    music.volume = 0.3; // Background music is quieter
    set({ backgroundMusic: music });
  },
  setHitSound: (sound) => set({ hitSound: sound }),
  setSuccessSound: (sound) => set({ successSound: sound }),
  setPunchSound: (sound) => set({ punchSound: sound }),
  setKickSound: (sound) => set({ kickSound: sound }),
  setSpecialSound: (sound) => set({ specialSound: sound }),
  setBlockSound: (sound) => set({ blockSound: sound }),
  setJumpSound: (sound) => set({ jumpSound: sound }),
  setLandSound: (sound) => set({ landSound: sound }),
  setDodgeSound: (sound) => set({ dodgeSound: sound }),
  setGrabSound: (sound) => set({ grabSound: sound }),
  setThrowSound: (sound) => set({ throwSound: sound }),
  setTauntSound: (sound) => set({ tauntSound: sound }),
  
  // Volume and mute controls
  toggleMute: () => {
    const { isMuted, currentMusicTrack } = get();
    const newMutedState = !isMuted;
    
    set({ isMuted: newMutedState });
    
    // Mute/unmute current music track (context-aware music only)
    if (currentMusicTrack) {
      if (newMutedState) {
        currentMusicTrack.pause();
      } else {
        const { musicEnabled } = get();
        if (musicEnabled) {
          currentMusicTrack.play().catch(() => {});
        }
      }
    }
  },
  
  setMasterVolume: (volume) => {
    // Clamp volume between 0 and 1
    const clampedVolume = Math.max(0, Math.min(1, volume));
    set({ masterVolume: clampedVolume });
    
    // Update background music volume if it exists
    const { backgroundMusic } = get();
    if (backgroundMusic) {
      backgroundMusic.volume = clampedVolume * 0.3; // Background at 30% of master
    }
  },
  
  // Advanced sound playing functions with pitch variation for more natural sound
  playHit: (intensity = 1) => {
    const { hitSound, isMuted, masterVolume } = get();
    if (hitSound && !isMuted) {
      // Clone the sound to allow overlapping playback
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      
      // Add some pitch/volume variation based on intensity (0.8-1.2 range)
      const pitchVariation = 0.9 + (Math.random() * 0.2) + (intensity * 0.1);
      soundClone.playbackRate = pitchVariation;
      
      // Scale volume by master volume and intensity
      soundClone.volume = masterVolume * 0.4 * intensity;
      
      soundClone.play().catch(() => {});
    }
  },
  
  playPunch: () => {
    const { punchSound, hitSound, isMuted, masterVolume } = get();
    // Fallback to hit sound if punch sound isn't set
    const soundToPlay = punchSound || hitSound;
    
    if (soundToPlay && !isMuted) {
      const soundClone = soundToPlay.cloneNode() as HTMLAudioElement;
      // Punches are quick and sharp
      soundClone.playbackRate = 1.1 + (Math.random() * 0.1);
      soundClone.volume = masterVolume * 0.35;
      soundClone.play().catch(() => {});
    }
  },
  
  playKick: () => {
    const { kickSound, hitSound, isMuted, masterVolume } = get();
    // Fallback to hit sound if kick sound isn't set
    const soundToPlay = kickSound || hitSound;
    
    if (soundToPlay && !isMuted) {
      const soundClone = soundToPlay.cloneNode() as HTMLAudioElement;
      // Kicks are heavier with lower pitch
      soundClone.playbackRate = 0.85 + (Math.random() * 0.15);
      soundClone.volume = masterVolume * 0.5; // Slightly louder
      soundClone.play().catch(() => {});
    }
  },
  
  playSpecial: () => {
    const { specialSound, hitSound, isMuted, masterVolume } = get();
    // Fallback to hit sound if special sound isn't set
    const soundToPlay = specialSound || hitSound;
    
    if (soundToPlay && !isMuted) {
      const soundClone = soundToPlay.cloneNode() as HTMLAudioElement;
      // Special attacks are dramatic
      soundClone.playbackRate = 0.9;
      soundClone.volume = masterVolume * 0.6; // Louder for impact
      soundClone.play().catch(() => {});
    }
  },
  
  playBlock: () => {
    const { blockSound, isMuted, masterVolume } = get();
    if (blockSound && !isMuted) {
      const soundClone = blockSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = masterVolume * 0.4;
      soundClone.play().catch(() => {});
    }
  },
  
  playJump: () => {
    const { jumpSound, isMuted, masterVolume } = get();
    if (jumpSound && !isMuted) {
      const soundClone = jumpSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = masterVolume * 0.3;
      soundClone.play().catch(() => {});
    }
  },
  
  playLand: () => {
    const { landSound, isMuted, masterVolume } = get();
    if (landSound && !isMuted) {
      const soundClone = landSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = masterVolume * 0.35;
      soundClone.play().catch(() => {});
    }
  },
  
  playDodge: () => {
    const { dodgeSound, isMuted, masterVolume } = get();
    if (dodgeSound && !isMuted) {
      const soundClone = dodgeSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = masterVolume * 0.3;
      soundClone.play().catch(() => {});
    }
  },
  
  playGrab: () => {
    const { grabSound, isMuted, masterVolume } = get();
    if (grabSound && !isMuted) {
      const soundClone = grabSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = masterVolume * 0.4;
      soundClone.play().catch(() => {});
    }
  },
  
  playThrow: () => {
    const { throwSound, isMuted, masterVolume } = get();
    if (throwSound && !isMuted) {
      const soundClone = throwSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = masterVolume * 0.45;
      soundClone.play().catch(() => {});
    }
  },
  
  playTaunt: () => {
    const { tauntSound, isMuted, masterVolume } = get();
    if (tauntSound && !isMuted) {
      const soundClone = tauntSound.cloneNode() as HTMLAudioElement;
      soundClone.volume = masterVolume * 0.5;
      soundClone.play().catch(() => {});
    }
  },
  
  playSuccess: () => {
    const { successSound, isMuted, masterVolume } = get();
    if (successSound && !isMuted) {
      // Reset to beginning of sound
      successSound.currentTime = 0;
      successSound.volume = masterVolume * 0.6; // Victory sounds are prominent
      successSound.play().catch(() => {});
    }
  },
  
  // Advanced sound effects
  playComboHit: (comboCount) => {
    // For combos, we increase the intensity based on the combo count
    const { hitSound, isMuted, masterVolume } = get();
    if (hitSound && !isMuted) {
      // Scale intensity with combo count (max out around 5-hit combos)
      const intensity = Math.min(1.0 + (comboCount * 0.15), 1.75);
      
      const soundClone = hitSound.cloneNode() as HTMLAudioElement;
      // Higher pitched and louder with higher combo count
      soundClone.playbackRate = 1.0 + (comboCount * 0.05);
      soundClone.volume = masterVolume * 0.4 * intensity;
      
      soundClone.play().catch(() => {});
    }
  },
  
  playBackgroundMusic: () => {
    const { backgroundMusic, isMuted, masterVolume } = get();
    if (backgroundMusic && !isMuted) {
      backgroundMusic.volume = masterVolume * 0.3;
      backgroundMusic.currentTime = 0;
      backgroundMusic.play().catch(() => {});
    }
  }
}));
