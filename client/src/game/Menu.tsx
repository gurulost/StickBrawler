import { useEffect, useState, type ReactNode } from "react";
import { useFighting, MatchMode } from "../lib/stores/useFighting";
import { useAudio } from "../lib/stores/useAudio";
import { useAuth } from "../lib/stores/useAuth";
import { FighterCustomizer } from "../components/ui/fighter-customizer";
import { Leaderboard } from "../components/ui/leaderboard";
import { AuthModal } from "../components/ui/auth-modal";
import { LandingHero } from "../components/landing/LandingHero";
import { FeatureGrid } from "../components/landing/FeatureGrid";
import { ARENA_OPTIONS } from "./arenas";
import { OnlineMultiplayer } from "../components/online/OnlineMultiplayer";
import { MusicToggle } from "../components/ui/music-toggle";

type Panel = "main" | "customization" | "leaderboard" | "controls" | "online";

const Menu = () => {
  const { startGame, matchMode, setMatchMode, arenaId, setArenaId } = useFighting();
  const { toggleMute, isMuted, setMasterVolume, masterVolume } = useAudio();
  const { user, status, logout } = useAuth();
  const [activePanel, setActivePanel] = useState<Panel>("main");
  const [controllerConnected, setControllerConnected] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [customizationMounted, setCustomizationMounted] = useState(false);

  useEffect(() => {
    const refreshPads = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      setControllerConnected(pads.some((pad) => pad && pad.connected));
    };
    window.addEventListener("gamepadconnected", refreshPads);
    window.addEventListener("gamepaddisconnected", refreshPads);
    refreshPads();
    return () => {
      window.removeEventListener("gamepadconnected", refreshPads);
      window.removeEventListener("gamepaddisconnected", refreshPads);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/online/health")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        setOnlineAvailable(Boolean(data?.websocketEnabled && data?.status === "running"));
      })
      .catch(() => {
        if (!cancelled) {
          setOnlineAvailable(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!onlineAvailable && activePanel === "online") {
      setActivePanel("main");
    }
  }, [activePanel, onlineAvailable]);

  const handleStartGame = () => {
    startGame(matchMode);
  };

  const handleOpenCustomization = () => {
    setCustomizationMounted(true);
    setActivePanel("customization");
  };

  const handleStartOnlineMatch = (matchId: string) => {
    console.log("Starting online match:", matchId);
    sessionStorage.setItem("onlineMatchId", matchId);
    sessionStorage.setItem("matchMode", "online");
    setMatchMode("online");
    startGame("online");
  };

  const handleVolumeChange = (value: number) => {
    setMasterVolume(value);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const renderPersistentPanels = () => {
    if (!customizationMounted && activePanel !== "main") {
      return null;
    }

    return (
      <>
        <div className={activePanel === "main" ? "" : "hidden"} aria-hidden={activePanel !== "main"}>
          <LandingHero
            onPlay={handleStartGame}
            onCustomize={handleOpenCustomization}
            onLeaderboard={() => setActivePanel("leaderboard")}
            onControls={() => setActivePanel("controls")}
            matchMode={matchMode}
            setMatchMode={(mode: MatchMode) => setMatchMode(mode)}
            controllerConnected={controllerConnected}
            isMuted={isMuted}
            toggleMute={toggleMute}
            masterVolume={masterVolume}
            onVolumeChange={handleVolumeChange}
            arenaId={arenaId}
            arenaOptions={ARENA_OPTIONS}
            onArenaSelect={setArenaId}
            previewsActive={activePanel === "main"}
          />
          <FeatureGrid />
        </div>

        {customizationMounted && (
          <div className={activePanel === "customization" ? "" : "hidden"} aria-hidden={activePanel !== "customization"}>
            <section className="ink-card noise-overlay rounded-none relative overflow-hidden p-6" style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))' }}>
              <div className="absolute top-0 left-0 right-5 h-[2px] bg-gradient-to-r from-[#b347ff] via-[#b347ff]/40 to-transparent" />
              <header className="mb-6 flex flex-wrap items-center justify-between gap-4 relative z-10">
                <div>
                  <p className="text-[10px] font-tech uppercase tracking-[0.4em] text-[#b347ff]">Ink Customizer</p>
                  <h2 className="text-2xl font-display text-white">Craft Your Silhouette</h2>
                </div>
                <button
                  onClick={() => setActivePanel("main")}
                  className="clip-angular-sm border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-tech font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10"
                >
                  Back to Menu
                </button>
              </header>
              <div className="relative z-10">
                <FighterCustomizer previewsActive={activePanel === "customization"} />
              </div>
            </section>
          </div>
        )}
      </>
    );
  };

  const renderPanel = () => {
    if (activePanel === "main" || activePanel === "customization") {
      return renderPersistentPanels();
    }

    switch (activePanel) {
      case "leaderboard":
        return (
          <section className="ink-card noise-overlay rounded-none relative overflow-hidden p-6" style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))' }}>
            <div className="absolute top-0 left-0 right-5 h-[2px] bg-gradient-to-r from-[#ffe600] via-[#ffe600]/40 to-transparent" />
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div>
                <p className="text-[10px] font-tech uppercase tracking-[0.4em] text-[#ffe600]">Rankings</p>
                <h2 className="text-2xl font-display text-white">Leaderboard</h2>
              </div>
              <button
                onClick={() => setActivePanel("main")}
                className="clip-angular-sm border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-tech font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10"
              >
                Back to Menu
              </button>
            </header>
            <div className="relative z-10">
              <Leaderboard />
            </div>
          </section>
        );
      case "online":
        return (
          <>
            <div className="mb-4">
              <button
                onClick={() => setActivePanel("main")}
                className="clip-angular-sm border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-tech font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10"
              >
                Back to Menu
              </button>
            </div>
            <OnlineMultiplayer onStartMatch={handleStartOnlineMatch} />
          </>
        );
      case "controls":
        return (
          <section className="ink-card noise-overlay rounded-none relative overflow-hidden p-6" style={{ clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))' }}>
            <div className="absolute top-0 left-0 right-5 h-[2px] bg-gradient-to-r from-[#39ff14] via-[#39ff14]/40 to-transparent" />
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4 relative z-10">
              <div>
                <p className="text-[10px] font-tech uppercase tracking-[0.4em] text-[#39ff14]">Moveset</p>
                <h2 className="text-2xl font-display text-white">Control Layout</h2>
              </div>
              <button
                onClick={() => setActivePanel("main")}
                className="clip-angular-sm border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-tech font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10"
              >
                Back to Menu
              </button>
            </header>
            <div className="relative z-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="p-5" style={{
                background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.6), rgba(10, 10, 15, 0.8))',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
              }}>
                <h3 className="text-sm font-tech font-bold text-white uppercase tracking-wider">Keyboard</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {bindingSets.map((set) => (
                    <ControlCard key={set.title} title={set.title} subtitle={set.subtitle}>
                      {set.bindings.map((binding) => (
                        <KeyRow
                          key={`${set.title}-${binding.description}`}
                          keys={binding.keys}
                          description={binding.description}
                        />
                      ))}
                    </ControlCard>
                  ))}
                  <ControlCard title="Ink Tools">
                    <p className="text-xs text-white/50">Use HUD buttons to toggle Silhouette Overlay & cycle Ink Quality.</p>
                  </ControlCard>
                </div>
              </div>
              <div className="p-5" style={{
                background: 'linear-gradient(135deg, rgba(57, 255, 20, 0.04), rgba(10, 10, 15, 0.8))',
                border: '1px solid rgba(57, 255, 20, 0.1)',
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
              }}>
                <h3 className="text-sm font-tech font-bold text-white uppercase tracking-wider">Controller</h3>
                <p className="text-xs text-white/40 mt-1">Press any button to join Player 2.</p>
                <div className="mt-5 space-y-3">
                  <KeyRow keys={["A / Cross"]} description="Light" compact />
                  <KeyRow keys={["B / Circle"]} description="Heavy" compact />
                  <KeyRow keys={["X / Square"]} description="Guard" compact />
                  <KeyRow keys={["Y / Triangle"]} description="Special" compact />
                  <KeyRow keys={["LB"]} description="Dodge" compact />
                  <KeyRow keys={["RB"]} description="Grab" compact />
                </div>
              </div>
            </div>
          </section>
        );
      default:
        return renderPersistentPanels();
    }
  };

  return (
    <div className="relative min-h-screen overflow-y-auto text-white" style={{ background: 'linear-gradient(180deg, #0a0a0f, #12121a, #0a0a0f)' }}>
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(0,240,255,0.06),_transparent_40%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_rgba(255,45,123,0.04),_transparent_40%)]" />
      <div className="absolute inset-0 opacity-[0.03] mix-blend-screen" style={{ backgroundImage: "url('/textures/ink-noise.png')" }} />

      {/* Decorative grid lines */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-6">
        {/* ─── Header ─── */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-display text-2xl text-white leading-none">StickBrawler</h1>
              <p className="text-[9px] font-tech uppercase tracking-[0.5em] text-[#00f0ff]/60 mt-1">Ink-Fueled Arena</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-1.5">
            <NavButton active={activePanel === "main"} onClick={() => setActivePanel("main")} label="Arena" />
            {onlineAvailable && (
              <NavButton
                active={activePanel === "online"}
                onClick={() => setActivePanel("online")}
                label="Online"
              />
            )}
            <NavButton
              active={activePanel === "customization"}
              onClick={handleOpenCustomization}
              label="Customize"
            />
            <NavButton
              active={activePanel === "leaderboard"}
              onClick={() => setActivePanel("leaderboard")}
              label="Ranks"
            />
            <NavButton
              active={activePanel === "controls"}
              onClick={() => setActivePanel("controls")}
              label="Controls"
            />
          </nav>

          <div className="flex items-center gap-3">
            <MusicToggle variant="outline" />
            {status === "authenticated" && user ? (
              <>
                <span className="text-xs font-tech text-white/40">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="clip-angular-sm border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider text-white/50 hover:text-white hover:bg-white/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="clip-angular-sm border border-[#00f0ff]/20 bg-[#00f0ff]/5 px-4 py-1.5 text-[10px] font-tech font-bold uppercase tracking-wider text-[#00f0ff]/80 hover:text-[#00f0ff] hover:bg-[#00f0ff]/10"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {renderPanel()}
      </div>

      {showAuthModal && <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />}
    </div>
  );
};

const NavButton = ({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
}) => (
  <button
    onClick={onClick}
    className={`clip-angular-sm px-4 py-2 text-[10px] font-tech font-bold uppercase tracking-wider transition ${
      active
        ? "bg-[#00f0ff] text-ink-black shadow-[0_0_16px_rgba(0,240,255,0.3)]"
        : "border border-white/8 bg-white/3 text-white/40 hover:text-white/70 hover:bg-white/6"
    }`}
  >
    {label}
  </button>
);

const ControlCard = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) => (
  <details className="p-4 text-sm text-white/60 border border-white/5 bg-white/[0.02]" style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }} open>
    <summary className="cursor-pointer list-none">
      <p className="text-xs font-tech font-bold text-white uppercase tracking-wider">{title}</p>
      {subtitle && <p className="text-[10px] text-white/30 font-tech mt-0.5">{subtitle}</p>}
    </summary>
    <div className="mt-3 space-y-1">{children}</div>
  </details>
);

const KeyRow = ({
  keys,
  description,
  compact = false,
}: {
  keys: string[];
  description: string;
  compact?: boolean;
}) => (
  <div className="flex items-center gap-3">
    <div className="flex flex-wrap gap-1">
      {keys.map((key) => (
        <span
          key={key}
          className={`clip-angular-sm border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-tech font-bold text-white/80 ${
            compact ? "min-w-[48px] text-center" : ""
          }`}
        >
          {key}
        </span>
      ))}
    </div>
    <p className="text-[10px] font-tech text-white/40">{description}</p>
  </div>
);

export default Menu;
const bindingSets = [
  {
    title: "Player 1",
    subtitle: "WASD for movement · 1/2/3 for attacks",
    bindings: [
      { keys: ["W / S"], description: "Forward / Backward" },
      { keys: ["A / D"], description: "Left / Right" },
      { keys: ["Space"], description: "Jump" },
      { keys: ["1 / 2 / 3"], description: "Light / Heavy / Guard" },
      { keys: ["Q"], description: "Special" },
      { keys: ["E"], description: "Air attack" },
      { keys: ["Shift"], description: "Dodge" },
      { keys: ["G"], description: "Grab" },
      { keys: ["T"], description: "Taunt" },
    ],
  },
  {
    title: "Player 2",
    subtitle: "Arrow keys for movement · J/K/L for attacks",
    bindings: [
      { keys: ["↑ / ↓"], description: "Forward / Backward" },
      { keys: ["← / →"], description: "Left / Right" },
      { keys: ["Right Ctrl"], description: "Jump" },
      { keys: ["J / K / L"], description: "Light / Heavy / Guard" },
      { keys: ["Enter"], description: "Special" },
      { keys: ["Shift (Right)"], description: "Air attack" },
      { keys: ["Slash"], description: "Dodge" },
      { keys: ["[" , "]"], description: "Taunt / Grab" },
    ],
  },
];
