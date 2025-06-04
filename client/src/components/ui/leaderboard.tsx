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
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-500 font-bold">#{rank}</span>;
    }
  };

  if (loading) {
    return (
      <Card className={`bg-gray-800/50 border-gray-700 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5" />
            Global Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-300">Loading scores...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`bg-gray-800/50 border-gray-700 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5" />
            Global Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <Button 
              onClick={fetchScores}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gray-800/50 border-gray-700 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="w-5 h-5" />
            Global Leaderboard
          </CardTitle>
          <Button 
            onClick={fetchScores}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {scores.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No scores yet!</p>
            <p className="text-sm text-gray-500 mt-2">Be the first to set a high score</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scores.map((score, index) => {
              const rank = index + 1;
              return (
                <div
                  key={score.id}
                  className={`flex items-center gap-4 p-3 rounded-lg border transition-all hover:bg-gray-700/50 ${
                    rank <= 3
                      ? 'border-yellow-500/30 bg-yellow-500/5'
                      : 'border-gray-600 bg-gray-800/30'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getRankIcon(rank)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">
                        Player {score.userId || 'Anonymous'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDate(score.timestamp)}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge 
                      variant={rank <= 3 ? 'default' : 'secondary'}
                      className={`text-lg font-bold px-3 py-1 ${
                        rank === 1 ? 'bg-yellow-500 text-black' :
                        rank === 2 ? 'bg-gray-400 text-black' :
                        rank === 3 ? 'bg-amber-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}
                    >
                      {formatScore(score.score)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {scores.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Showing top {scores.length} scores
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}