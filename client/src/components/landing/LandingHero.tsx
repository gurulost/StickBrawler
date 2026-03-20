import { useEffect, useRef, useState } from "react";
import { CharacterPreview } from "../preview/CharacterPreview";
import { heroBadges } from "../../data/landingContent";
import { MatchMode } from "../../lib/stores/useFighting";
import { motion } from "framer-motion";

interface LandingHeroProps {
  onPlay: () => void;
  onCustomize: () => void;
  onLeaderboard: () => void;
  onControls: () => void;
  matchMode: MatchMode;
  setMatchMode: (mode: MatchMode) => void;
  controllerConnected: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  masterVolume: number;
  onVolumeChange: (value: number) => void;
  arenaId: string;
  arenaOptions: Array<{ id: string; name: string; description: string }>;
  onArenaSelect: (id: string) => void;
  previewsActive?: boolean;
}

export function LandingHero({
  onPlay,
  onCustomize,
  onLeaderboard,
  onControls,
  matchMode,
  setMatchMode,
  controllerConnected,
  isMuted,
  toggleMute,
  masterVolume,
  onVolumeChange,
  arenaId,
  arenaOptions,
  onArenaSelect,
  previewsActive = true,
}: LandingHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [heroInView, setHeroInView] = useState(false);
  const [secondPreviewReady, setSecondPreviewReady] = useState(false);
  const [showControllerPrompt, setShowControllerPrompt] = useState(false);
  const selectedArena = arenaOptions.find((arena) => arena.id === arenaId);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHeroInView(true);
            setTimeout(() => setSecondPreviewReady(true), 400);
          }
        });
      },
      { threshold: 0.35 },
    );
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setShowControllerPrompt(controllerConnected);
  }, [controllerConnected]);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden noise-overlay"
      style={{
        background: 'linear-gradient(135deg, rgba(10, 10, 15, 0.95), rgba(0, 240, 255, 0.03), rgba(255, 45, 123, 0.02))',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))',
        padding: '2rem',
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-6 h-[2px] bg-gradient-to-r from-[#00f0ff] via-[#b347ff]/40 to-transparent" />
      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-6 right-0 h-[1px] bg-gradient-to-l from-[#ff2d7b]/30 to-transparent" />

      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
        src="/media/ink-hero-loop.mp4"
        autoPlay
        loop
        muted
        playsInline
        onError={(e) => {
          (e.target as HTMLVideoElement).style.display = 'none';
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_70%_30%,_rgba(0,240,255,0.06),_transparent_60%)]" />
      <div className="absolute inset-y-0 left-0 w-1/3 bg-[radial-gradient(circle_at_30%_70%,_rgba(255,45,123,0.04),_transparent_50%)]" />
      {/* Scanline sweep */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.03]">
        <div className="absolute inset-0 animate-[scanline_8s_linear_infinite]" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)',
          backgroundSize: '100% 4px',
        }} />
      </div>

      <div className="relative grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Tag */}
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={heroInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center gap-2 clip-angular-sm border border-[#39ff14]/30 bg-[#39ff14]/5 px-3 py-1 text-[9px] font-tech font-bold uppercase tracking-[0.3em] text-[#39ff14]"
          >
            New Ink Era
          </motion.span>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-display text-3xl text-white md:text-4xl lg:text-5xl leading-tight"
          >
            Hand-drawn fighters.{" "}
            <span className="neon-text-cyan">Procedural ink.</span>{" "}
            Local versus chaos.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="max-w-xl text-sm text-white/50 leading-relaxed"
          >
            Shape your silhouette, layer brush-stroke VFX, and battle in a deterministic arena that mirrors the
            server runtime. Every match is a sketch come alive.
          </motion.p>

          {/* Badges */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.45 }}
            className="flex flex-wrap gap-2"
          >
            {heroBadges.map((badge) => (
              <span
                key={badge.label}
                className={`clip-angular-sm bg-gradient-to-r ${badge.color} px-3 py-1 text-[9px] font-tech font-bold uppercase tracking-wider text-white/90`}
              >
                {badge.label}
              </span>
            ))}
          </motion.div>

          {/* Arena Selection */}
          <div className="space-y-2 pt-2">
            <p className="text-[9px] font-tech font-bold uppercase tracking-[0.4em] text-white/25">
              Arena
            </p>
            <div className="flex flex-wrap gap-2">
              {arenaOptions.map((arena) => {
                const active = arena.id === arenaId;
                return (
                  <button
                    key={arena.id}
                    onClick={() => onArenaSelect(arena.id)}
                    className={`clip-angular-sm px-4 py-2 text-[10px] font-tech font-bold uppercase tracking-wider transition ${
                      active
                        ? "bg-white text-ink-black shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                        : "border border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {arena.name}
                  </button>
                );
              })}
            </div>
            {selectedArena && (
              <p className="text-[10px] font-tech text-white/25">{selectedArena.description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onPlay}
              className="clip-angular px-8 py-3 text-sm font-tech font-bold uppercase tracking-wider text-black transition hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, #00f0ff, #39ff14)',
                boxShadow: '0 0 24px rgba(0, 240, 255, 0.3), 0 0 48px rgba(57, 255, 20, 0.15)',
              }}
            >
              Enter Arena ({matchMode === "single" ? "Solo" : "Local 2P"})
            </button>
            <button
              onClick={onCustomize}
              className="clip-angular border border-[#b347ff]/30 bg-[#b347ff]/5 px-6 py-3 text-sm font-tech font-bold uppercase tracking-wider text-[#b347ff]/80 backdrop-blur hover:text-[#b347ff] hover:bg-[#b347ff]/10"
            >
              Ink Customizer
            </button>
            <button
              onClick={onLeaderboard}
              className="clip-angular-sm border border-white/8 bg-white/3 px-4 py-3 text-[10px] font-tech font-bold uppercase tracking-wider text-white/35 hover:text-white/60"
            >
              Leaderboard
            </button>
            <button
              onClick={onControls}
              className="clip-angular-sm border border-white/8 bg-white/3 px-4 py-3 text-[10px] font-tech font-bold uppercase tracking-wider text-white/35 hover:text-white/60"
            >
              Controls
            </button>
          </div>

          {/* Status bar */}
          <div className="flex flex-wrap items-center gap-4 p-4 backdrop-blur-sm" style={{
            background: 'rgba(10, 10, 15, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
          }}>
            <div className="flex items-center gap-2 text-xs font-tech text-white/40">
              <span className="text-sm">{controllerConnected ? "🕹️" : "⌨️"}</span>
              {controllerConnected ? "Gamepad ready" : "Keyboard active"}
            </div>
            <div className="flex items-center gap-2 text-xs font-tech text-white/40">
              <button
                onClick={() => setMatchMode(matchMode === "single" ? "local" : "single")}
                className="clip-angular-sm bg-white/5 px-3 py-1 text-[10px] font-tech font-bold uppercase tracking-wider text-white/50 hover:bg-white/10 hover:text-white/70"
              >
                {matchMode === "single" ? "Switch to Local 2P" : "Switch to Solo"}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-tech text-white/40">
              <button
                onClick={toggleMute}
                className="clip-angular-sm border border-white/8 px-2 py-1 text-sm hover:bg-white/5"
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={masterVolume}
                onChange={(event) => onVolumeChange(parseFloat(event.target.value))}
                className="w-28"
              />
            </div>
          </div>

          {/* Arena Selection (secondary) */}
          <div className="p-4 backdrop-blur-sm" style={{
            background: 'rgba(10, 10, 15, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
          }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#00f0ff] clip-angular-sm" />
              <span className="text-[10px] font-tech font-bold text-white/50 uppercase tracking-wider">Arena Selection</span>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {arenaOptions.map((arena) => (
                <button
                  key={arena.id}
                  onClick={() => onArenaSelect(arena.id)}
                  className={`clip-angular-sm px-4 py-2 text-[10px] font-tech font-bold uppercase tracking-wider transition ${
                    arenaId === arena.id
                      ? "bg-[#00f0ff] text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                      : "border border-white/8 text-white/35 hover:bg-white/5 hover:text-white/60"
                  }`}
                >
                  {arena.name}
                </button>
              ))}
            </div>
            <p className="text-[10px] font-tech text-white/20">
              {selectedArena?.description || "Select an arena to view details"}
            </p>
          </div>

          {showControllerPrompt && (
            <div className="clip-angular-sm border border-[#39ff14]/20 bg-[#39ff14]/5 px-3 py-2 text-[10px] font-tech font-bold uppercase tracking-wider text-[#39ff14]/80">
              Press any button on your controller to add Player 2
            </div>
          )}
        </div>

        {/* Character Previews */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid gap-6 lg:grid-rows-[1fr_auto]"
        >
          {heroInView && (
            <CharacterPreview animate={previewsActive} isPlayer className="shadow-[0_0_60px_rgba(0,240,255,0.15)]" />
          )}
          {secondPreviewReady && (
            <CharacterPreview animate={previewsActive} isPlayer={false} className="shadow-[0_0_60px_rgba(255,45,123,0.15)]" />
          )}
        </motion.div>
      </div>

      {/* Inner border accent */}
      <div className="pointer-events-none absolute inset-0 border border-white/[0.03]" style={{ clipPath: 'polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))' }} />
    </section>
  );
}
