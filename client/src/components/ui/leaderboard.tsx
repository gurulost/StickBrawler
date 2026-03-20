import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { Trophy, Medal, Award, RefreshCw, User } from 'lucide-react';

interface ScoreEntry {
  id: number;
  userId: number | null;
  score: number;
  timestamp: string;
}

interface LeaderboardProps {
  className?: string;
}

export function Leaderboard({ className = "" }: LeaderboardProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/scores');
      if (!response.ok) {
        throw new Error('Failed to fetch scores');
      }

      const data = await response.json();
      setScores(data);
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, []);

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-[#ffe600]" />;
      case 2:
        return <Medal className="w-5 h-5 text-white/50" />;
      case 3:
        return <Award className="w-5 h-5 text-[#ff6a00]" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-white/20 font-tech font-bold text-xs">#{rank}</span>;
    }
  };

  const getRankAccent = (rank: number) => {
    switch (rank) {
      case 1: return { border: 'rgba(255, 230, 0, 0.2)', bg: 'rgba(255, 230, 0, 0.03)' };
      case 2: return { border: 'rgba(255, 255, 255, 0.1)', bg: 'rgba(255, 255, 255, 0.02)' };
      case 3: return { border: 'rgba(255, 106, 0, 0.15)', bg: 'rgba(255, 106, 0, 0.02)' };
      default: return { border: 'rgba(255, 255, 255, 0.04)', bg: 'transparent' };
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-[#00f0ff]" />
          <span className="ml-3 text-white/30 font-tech text-sm">Loading scores...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-center py-12">
          <p className="text-[#ff2d7b] mb-4 font-tech text-sm">{error}</p>
          <button
            onClick={fetchScores}
            className="clip-angular-sm border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-tech font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#ffe600]" />
          <span className="font-tech text-sm font-bold text-white uppercase tracking-wider">Global Rankings</span>
        </div>
        <button
          onClick={fetchScores}
          className="p-2 text-white/20 hover:text-white/50 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {scores.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-10 h-10 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 font-tech text-sm">No scores yet!</p>
          <p className="text-xs font-tech text-white/15 mt-2">Be the first to set a high score</p>
        </div>
      ) : (
        <div className="space-y-2">
          {scores.map((score, index) => {
            const rank = index + 1;
            const accent = getRankAccent(rank);
            return (
              <div
                key={score.id}
                className="flex items-center gap-4 p-3 transition-all hover:bg-white/[0.02]"
                style={{
                  border: `1px solid ${accent.border}`,
                  background: accent.bg,
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                }}
              >
                <div className="flex-shrink-0">
                  {getRankIcon(rank)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-white/20" />
                    <span className="text-white/40 text-xs font-tech">
                      Player {score.userId || 'Anonymous'}
                    </span>
                  </div>
                  <div className="text-[10px] font-tech text-white/15 mt-0.5">
                    {formatDate(score.timestamp)}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`font-tech font-bold text-sm px-3 py-1 clip-angular-sm ${
                      rank === 1 ? 'bg-[#ffe600]/10 text-[#ffe600] border border-[#ffe600]/20' :
                      rank === 2 ? 'bg-white/5 text-white/70 border border-white/10' :
                      rank === 3 ? 'bg-[#ff6a00]/10 text-[#ff6a00] border border-[#ff6a00]/20' :
                      'bg-white/3 text-white/40 border border-white/5'
                    }`}
                  >
                    {formatScore(score.score)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {scores.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-[10px] font-tech text-white/15 uppercase tracking-wider">
            Showing top {scores.length} scores
          </p>
        </div>
      )}
    </div>
  );
}
