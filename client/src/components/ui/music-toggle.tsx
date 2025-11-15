import { useAudio } from "@/lib/stores/useAudio";
import { Button } from "./button";
import { Music, Music2, Volume, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

interface MusicToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: "default" | "ghost" | "outline";
}

export function MusicToggle({ className, showLabel = false, variant = "ghost" }: MusicToggleProps) {
  const musicEnabled = useAudio((state) => state.musicEnabled);
  const toggleMusic = useAudio((state) => state.toggleMusic);
  const musicContext = useAudio((state) => state.musicContext);

  const Icon = musicEnabled ? (musicContext === 'fighting' ? Music2 : Music) : VolumeX;

  return (
    <Button
      variant={variant}
      size={showLabel ? "default" : "icon"}
      onClick={toggleMusic}
      className={cn(
        "transition-all duration-200",
        musicEnabled && "text-primary",
        className
      )}
      title={musicEnabled ? "Music On (Click to turn off)" : "Music Off (Click to turn on)"}
      aria-label={musicEnabled ? "Turn music off" : "Turn music on"}
    >
      <Icon className={cn(
        "transition-transform duration-200",
        musicEnabled && "animate-pulse"
      )} />
      {showLabel && (
        <span className="ml-2">
          {musicEnabled ? "Music On" : "Music Off"}
        </span>
      )}
    </Button>
  );
}
