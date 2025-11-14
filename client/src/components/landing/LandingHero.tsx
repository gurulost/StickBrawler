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
}: LandingHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [heroInView, setHeroInView] = useState(false);
  const [secondPreviewReady, setSecondPreviewReady] = useState(false);
  const [showControllerPrompt, setShowControllerPrompt] = useState(false);

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
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 shadow-[0_25px_120px_rgba(45,78,255,0.25)]"
    >
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
        src="/media/ink-hero-loop.mp4"
        autoPlay
        loop
        muted
        playsInline
        onError={(e) => {
          (e.target as HTMLVideoElement).style.display = 'none';
        }}
      />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.15),_transparent_60%)]" />
      <div className="relative grid gap-10 lg:grid-cols-2">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-200">
            New Ink Era
          </span>
          <h1 className="text-4xl font-extrabold text-white md:text-5xl lg:text-6xl">
            Hand-drawn fighters. Procedural ink. Local co‑op chaos.
          </h1>
          <p className="max-w-xl text-lg text-slate-200/90">
            Shape your silhouette, layer brush-stroke VFX, and battle in a deterministic arena that mirrors the
            server runtime. Every match is a sketch come alive.
          </p>
          <div className="flex flex-wrap gap-3">
            {heroBadges.map((badge) => (
              <span
                key={badge.label}
                className={`rounded-full bg-gradient-to-r ${badge.color} px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white`}
              >
                {badge.label}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={onPlay}
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:scale-[1.02]"
            >
              Enter Arena ({matchMode === "single" ? "Single" : "Local 2P"})
            </button>
            <button
              onClick={onCustomize}
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white/80 backdrop-blur hover:text-white"
            >
              Open Ink Customizer
            </button>
            <button
              onClick={onLeaderboard}
              className="rounded-full border border-white/20 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white"
            >
              Leaderboard
            </button>
            <button
              onClick={onControls}
              className="rounded-full border border-white/20 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white"
            >
              Controls
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span className="text-lg">{controllerConnected ? "🕹️" : "⌨️"}</span>
              {controllerConnected ? "Gamepad ready" : "Keyboard active"}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span className="text-lg">{matchMode === "single" ? "👤" : "👥"}</span>
              <button
                onClick={() => setMatchMode(matchMode === "single" ? "local" : "single")}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20"
              >
                {matchMode === "single" ? "Switch to Local Co‑Op" : "Switch to Single"}
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80">
              <button
                onClick={toggleMute}
                className="rounded-full border border-white/20 px-2 py-1 text-lg hover:bg-white/10"
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
                className="w-32 accent-indigo-300"
              />
            </div>
          </div>
          {showControllerPrompt && (
            <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/90">
              Press any button on your controller to add Player 2
            </div>
          )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid gap-6 lg:grid-rows-[1fr_auto]"
        >
          {heroInView && (
            <CharacterPreview animate isPlayer className="shadow-[0_20px_80px_rgba(147,197,253,0.25)]" />
          )}
          {secondPreviewReady && (
            <CharacterPreview animate isPlayer={false} className="shadow-[0_20px_80px_rgba(248,113,113,0.25)]" />
          )}
        </motion.div>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />
    </section>
  );
}
