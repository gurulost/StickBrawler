import { useEffect } from 'react';
import { useAudio } from '../lib/stores/useAudio';

/**
 * Hook to automatically start music on first user interaction
 * This handles browser autoplay policies by waiting for any user gesture
 */
export function useAutoStartMusic() {
  const { ensureMusicPlaying, autoplayBlocked } = useAudio();

  useEffect(() => {
    // Only set up listener if autoplay is blocked
    if (!autoplayBlocked) return;

    const handleFirstInteraction = () => {
      // Try to start music on first user interaction
      ensureMusicPlaying();
      
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    // Listen for any user interaction
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [autoplayBlocked, ensureMusicPlaying]);
}
