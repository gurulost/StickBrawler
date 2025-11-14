import { create } from "zustand";

/**
 * Advanced audio system for an immersive fighting game experience
 * Includes dynamic sound effects with pitch variation and 3D positional audio
 */
interface AudioState {
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
    const { isMuted, backgroundMusic } = get();
    const newMutedState = !isMuted;
    
    set({ isMuted: newMutedState });
    
    // Also update background music if it's playing
    if (backgroundMusic) {
      backgroundMusic.muted = newMutedState;
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
