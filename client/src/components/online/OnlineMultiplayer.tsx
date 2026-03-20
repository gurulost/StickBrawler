import { useState } from "react";
import { useAuth } from "../../lib/stores/useAuth";

interface OnlineMultiplayerProps {
  onStartMatch: (matchId: string) => void;
}

export const OnlineMultiplayer = ({ onStartMatch }: OnlineMultiplayerProps) => {
  const { user, status } = useAuth();
  const [matchId, setMatchId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);

  const handleCreateMatch = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/online/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: user.username }),
      });

      if (!response.ok) {
        throw new Error("Failed to create match");
      }

      const data = await response.json();
      const newMatchId = data.matchId;
      setCreatedMatchId(newMatchId);
      setMatchId(newMatchId);
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create match:", error);
      alert("Failed to create match. Please try again.");
      setIsCreating(false);
    }
  };

  const handleJoinMatch = () => {
    if (matchId.trim()) {
      onStartMatch(matchId.trim().toUpperCase());
    }
  };

  const handleStartCreatedMatch = () => {
    if (createdMatchId) {
      onStartMatch(createdMatchId);
    }
  };

  const copyMatchId = () => {
    if (createdMatchId) {
      navigator.clipboard.writeText(createdMatchId);
    }
  };

  if (status !== "authenticated" || !user) {
    return (
      <div
        className="relative overflow-hidden p-8 text-center noise-overlay"
        style={{
          background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.6), rgba(10, 10, 15, 0.9))',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        }}
      >
        <div className="absolute top-0 left-0 right-5 h-[2px] bg-gradient-to-r from-[#ff2d7b] via-[#ff2d7b]/40 to-transparent" />
        <div className="relative z-10">
          <p className="text-[10px] font-tech uppercase tracking-[0.4em] text-[#ff2d7b]">Online Multiplayer</p>
          <h2 className="text-2xl font-display text-white mt-2">Sign In Required</h2>
          <p className="text-white/30 font-tech text-xs mb-6 mt-2">
            You need to sign in to play online matches with other players.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="clip-angular px-6 py-3 text-sm font-tech font-bold uppercase tracking-wider text-black transition hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #ff2d7b, #b347ff)',
              boxShadow: '0 0 16px rgba(255, 45, 123, 0.2)',
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden p-8 noise-overlay"
      style={{
        background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.6), rgba(10, 10, 15, 0.9))',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
      }}
    >
      <div className="absolute top-0 left-0 right-5 h-[2px] bg-gradient-to-r from-[#b347ff] via-[#b347ff]/40 to-transparent" />

      <div className="relative z-10">
        <div className="mb-8 text-center">
          <p className="text-[10px] font-tech uppercase tracking-[0.4em] text-[#b347ff]">Online Multiplayer</p>
          <h2 className="text-3xl font-display text-white mt-2">Battle Online</h2>
          <p className="text-white/30 font-tech text-xs mt-2">Create a match or join an existing one</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Match */}
          <div
            className="relative overflow-hidden p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(57, 255, 20, 0.03), rgba(10, 10, 15, 0.6))',
              border: '1px solid rgba(57, 255, 20, 0.1)',
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
            }}
          >
            <div className="absolute top-0 left-0 right-3 h-[1px] bg-gradient-to-r from-[#39ff14]/40 to-transparent" />
            <h3 className="text-lg font-tech font-bold text-white uppercase tracking-wider mb-3">Create Match</h3>
            <p className="text-xs font-tech text-white/30 mb-6">
              Start a new match and share the match ID with your friend
            </p>

            {!createdMatchId ? (
              <button
                onClick={handleCreateMatch}
                disabled={isCreating}
                className="w-full clip-angular py-4 font-tech font-bold uppercase tracking-wider text-sm text-black transition hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #39ff14, #00f0ff)',
                  boxShadow: '0 0 16px rgba(57, 255, 20, 0.2)',
                }}
              >
                {isCreating ? "Creating..." : "Create New Match"}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 border border-[#39ff14]/20 bg-[#39ff14]/5 clip-angular-sm">
                  <p className="text-[9px] font-tech uppercase tracking-[0.3em] text-[#39ff14]/60 mb-2">Match ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-2xl font-tech font-bold text-white tracking-[0.2em]">{createdMatchId}</code>
                    <button
                      onClick={copyMatchId}
                      className="ml-auto clip-angular-sm border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-tech text-white/50 hover:text-white"
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <p className="text-xs font-tech text-[#39ff14]/60">
                  Share this ID with your friend so they can join!
                </p>
                <button
                  onClick={handleStartCreatedMatch}
                  className="w-full clip-angular py-3 font-tech font-bold uppercase tracking-wider text-sm text-black transition hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, #39ff14, #00f0ff)',
                    boxShadow: '0 0 16px rgba(57, 255, 20, 0.2)',
                  }}
                >
                  Start Match
                </button>
                <button
                  onClick={() => setCreatedMatchId(null)}
                  className="w-full clip-angular-sm border border-white/5 bg-white/3 py-2 text-xs font-tech text-white/30 hover:text-white/50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Join Match */}
          <div
            className="relative overflow-hidden p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(179, 71, 255, 0.03), rgba(10, 10, 15, 0.6))',
              border: '1px solid rgba(179, 71, 255, 0.1)',
              clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
            }}
          >
            <div className="absolute top-0 left-0 right-3 h-[1px] bg-gradient-to-r from-[#b347ff]/40 to-transparent" />
            <h3 className="text-lg font-tech font-bold text-white uppercase tracking-wider mb-3">Join Match</h3>
            <p className="text-xs font-tech text-white/30 mb-6">
              Enter a match ID to join your friend's game
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-tech uppercase tracking-[0.3em] text-[#b347ff]/60 mb-2">
                  Match ID
                </label>
                <input
                  type="text"
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  className="w-full clip-angular-sm border border-white/8 bg-white/3 px-4 py-3 text-lg font-tech tracking-[0.2em] text-white placeholder-white/15 focus:border-[#b347ff]/30 focus:outline-none"
                />
              </div>
              <button
                onClick={handleJoinMatch}
                disabled={matchId.length !== 6}
                className="w-full clip-angular py-3 font-tech font-bold uppercase tracking-wider text-sm text-white transition hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, #b347ff, #ff2d7b)',
                  boxShadow: '0 0 16px rgba(179, 71, 255, 0.2)',
                }}
              >
                Join Match
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4" style={{
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        }}>
          <h4 className="text-xs font-tech font-bold text-white uppercase tracking-wider mb-2">How it works</h4>
          <ul className="space-y-1 text-[10px] font-tech text-white/25">
            <li>Create a match to get a unique 6-character ID</li>
            <li>Share the ID with your friend (via chat, email, etc.)</li>
            <li>Your friend enters the ID and clicks "Join Match"</li>
            <li>Both players will be connected and the match begins!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
