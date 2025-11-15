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


  const handleStartGame = () => {
    startGame(matchMode);
  };

  const handleStartOnlineMatch = (matchId: string) => {
    console.log("Starting online match:", matchId);
    // Store matchId in sessionStorage for the game to pick up
    sessionStorage.setItem("onlineMatchId", matchId);
    sessionStorage.setItem("matchMode", "online");
    
    // Start the game in online mode
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

  const renderPanel = () => {
    switch (activePanel) {
      case "customization":
        return (
          <section className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur">
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Ink Customizer</p>
                <h2 className="text-2xl font-bold text-white">Craft your silhouette</h2>
              </div>
              <button
                onClick={() => setActivePanel("main")}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white"
              >
                Back to Hero
              </button>
            </header>
            <FighterCustomizer />
          </section>
        );
      case "leaderboard":
        return (
          <section className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur">
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Scores</p>
                <h2 className="text-2xl font-bold text-white">World leaderboard</h2>
              </div>
              <button
                onClick={() => setActivePanel("main")}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white"
              >
                Back to Hero
              </button>
            </header>
            <Leaderboard />
          </section>
        );
      case "online":
        return (
          <>
            <div className="mb-4">
              <button
                onClick={() => setActivePanel("main")}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white"
              >
                ← Back to Menu
              </button>
            </div>
            <OnlineMultiplayer onStartMatch={handleStartOnlineMatch} />
          </>
        );
      case "controls":
        return (
          <section className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur">
            <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-emerald-200">Moveset</p>
                <h2 className="text-2xl font-bold text-white">Control layout</h2>
              </div>
              <button
                onClick={() => setActivePanel("main")}
                className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white"
              >
                Back to Hero
              </button>
            </header>
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-6">
                <h3 className="text-lg font-semibold text-white">Keyboard</h3>
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
                    <p className="text-sm text-white/70">Use HUD buttons to toggle Silhouette Overlay & cycle Ink Quality.</p>
                  </ControlCard>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 p-6">
                <h3 className="text-lg font-semibold text-white">Controller</h3>
                <p className="text-sm text-white/70">Press any button to join Player 2.</p>
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
        return (
          <>
            <LandingHero
              onPlay={handleStartGame}
              onCustomize={() => setActivePanel("customization")}
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
            />
            <FeatureGrid />
          </>
        );
    }
  };

  return (
    <div className="relative min-h-screen overflow-y-auto bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(5,150,105,0.25),_transparent_45%)]" />
      <div className="absolute inset-0 opacity-40 mix-blend-screen" style={{ backgroundImage: "url('/textures/ink-noise.png')" }} />
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.6em] text-emerald-200">StickBrawler</p>
            <h1 className="text-2xl font-bold text-white">Ink-fueled arena</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            <NavButton active={activePanel === "main"} onClick={() => setActivePanel("main")} label="Hero" />
            <NavButton
              active={activePanel === "online"}
              onClick={() => setActivePanel("online")}
              label="Online"
            />
            <NavButton
              active={activePanel === "customization"}
              onClick={() => setActivePanel("customization")}
              label="Customize"
            />
            <NavButton
              active={activePanel === "leaderboard"}
              onClick={() => setActivePanel("leaderboard")}
              label="Leaderboard"
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
                <span className="text-sm text-white/70">Signed in as {user.username}</span>
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white"
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
    className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
      active ? "bg-white text-slate-900" : "border border-white/20 text-white/70 hover:text-white"
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
  <details className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80" open>
    <summary className="cursor-pointer list-none">
      <p className="text-base font-semibold text-white">{title}</p>
      {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
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
          className={`rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold text-white ${
            compact ? "min-w-[48px] text-center" : ""
          }`}
        >
          {key}
        </span>
      ))}
    </div>
    <p className="text-xs text-white/70">{description}</p>
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
