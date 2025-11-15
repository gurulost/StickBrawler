import { useEffect, useRef } from 'react';
import { useAudio } from '../lib/stores/useAudio';

/**
 * Hook to automatically start music on first user interaction (backup for autoplay blocking)
 * This is a safety net - autoplay is attempted first, but if blocked, 
 * this catches the first user gesture and starts music then.
 */
export function useAutoStartMusic() {
  const { ensureMusicPlaying } = useAudio();
  const hasStartedRef = useRef(false);

  useEffect(() => {
    const handleFirstInteraction = () => {
      // Only run once
      if (hasStartedRef.current) return;
      hasStartedRef.current = true;
      
      // Try to start music on first user interaction (backup for autoplay)
      ensureMusicPlaying();
      
      // Remove listeners after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    // Always set up listeners as backup (autoplay is attempted separately in App.tsx)
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [ensureMusicPlaying]);
}
