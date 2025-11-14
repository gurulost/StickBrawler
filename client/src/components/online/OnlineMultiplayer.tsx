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
      <div className="rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur text-center">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-200">Online Multiplayer</p>
          <h2 className="text-2xl font-bold text-white mt-2">Sign In Required</h2>
        </div>
        <p className="text-white/70 mb-4">
          You need to sign in to play online matches with other players.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur">
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-indigo-200">Online Multiplayer</p>
        <h2 className="text-3xl font-bold text-white mt-2">Battle Online</h2>
        <p className="text-white/70 mt-2">Create a match or join an existing one</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Match */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-emerald-950/20 p-6">
          <h3 className="text-xl font-bold text-white mb-3">Create Match</h3>
          <p className="text-sm text-white/70 mb-6">
            Start a new match and share the match ID with your friend
          </p>
          
          {!createdMatchId ? (
            <button
              onClick={handleCreateMatch}
              disabled={isCreating}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-lg font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create New Match"}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/50 bg-emerald-900/30 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-300 mb-2">Match ID</p>
                <div className="flex items-center gap-2">
                  <code className="text-2xl font-bold text-white tracking-wider">{createdMatchId}</code>
                  <button
                    onClick={copyMatchId}
                    className="ml-auto rounded-lg border border-white/20 px-3 py-1 text-xs text-white/70 hover:text-white hover:border-white/40 transition"
                    title="Copy to clipboard"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <p className="text-sm text-emerald-200">
                Share this ID with your friend so they can join!
              </p>
              <button
                onClick={handleStartCreatedMatch}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-semibold text-white hover:opacity-90 transition"
              >
                Start Match
              </button>
              <button
                onClick={() => setCreatedMatchId(null)}
                className="w-full rounded-xl border border-white/20 px-6 py-2 text-sm text-white/70 hover:text-white hover:border-white/40 transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Join Match */}
        <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-purple-950/20 p-6">
          <h3 className="text-xl font-bold text-white mb-3">Join Match</h3>
          <p className="text-sm text-white/70 mb-6">
            Enter a match ID to join your friend's game
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-purple-300 mb-2">
                Match ID
              </label>
              <input
                type="text"
                value={matchId}
                onChange={(e) => setMatchId(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-lg font-mono tracking-wider text-white placeholder-white/30 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
            <button
              onClick={handleJoinMatch}
              disabled={matchId.length !== 6}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Match
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
        <h4 className="text-sm font-semibold text-white mb-2">How it works</h4>
        <ul className="space-y-1 text-sm text-white/70">
          <li>• Create a match to get a unique 6-character ID</li>
          <li>• Share the ID with your friend (via chat, email, etc.)</li>
          <li>• Your friend enters the ID and clicks "Join Match"</li>
          <li>• Both players will be connected and the match begins!</li>
        </ul>
      </div>
    </div>
  );
};
