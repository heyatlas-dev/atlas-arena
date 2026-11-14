import React, { useState, useEffect } from 'react';
import { X, Radio, Clock, RefreshCw, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { FPLFixtureInfo, fetchGameweekFixtures } from '../services/fplService';
import { LeagueMember } from '../types';
import { ClubCrest } from './ClubCrest';
import { triggerHaptic } from '../services/haptics';

interface LiveFixturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gwId: number;
  members: LeagueMember[];
}

export const LiveFixturesModal: React.FC<LiveFixturesModalProps> = ({
  isOpen,
  onClose,
  gwId,
  members,
}) => {
  const [selectedGw, setSelectedGw] = useState<number>(gwId);
  const [fixtures, setFixtures] = useState<FPLFixtureInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');

  // Update selectedGw whenever gwId prop changes
  useEffect(() => {
    setSelectedGw(gwId);
  }, [gwId]);

  const loadFixtures = (targetGw: number) => {
    setLoading(true);
    fetchGameweekFixtures(targetGw).then((res) => {
      setFixtures(res);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadFixtures(selectedGw);
    }
  }, [isOpen, selectedGw]);

  if (!isOpen) return null;

  const filteredFixtures = fixtures.filter((f) => {
    if (filter === 'live') return f.started && !f.finished;
    if (filter === 'upcoming') return !f.started;
    return true;
  });

  const handlePrevGw = () => {
    if (selectedGw > 1) {
      triggerHaptic('light');
      setSelectedGw((prev) => prev - 1);
    }
  };

  const handleNextGw = () => {
    if (selectedGw < 38) {
      triggerHaptic('light');
      setSelectedGw((prev) => prev + 1);
    }
  };

  // Helper to find which managers in our mini-league have players in this fixture
  const getActiveManagersInFixture = (homeTeam: string, awayTeam: string) => {
    const managersWithAssets: { managerName: string; isCaptain: boolean }[] = [];
    const hLower = homeTeam.toLowerCase();
    const aLower = awayTeam.toLowerCase();

    members.forEach((m) => {
      const captainInMatch = Boolean(
        m.captain_name && (hLower.includes(m.captain_name.toLowerCase()) || aLower.includes(m.captain_name.toLowerCase()))
      );

      const matchedAssets = (m.assets || []).filter(
        (asset) => hLower.includes(asset.toLowerCase()) || aLower.includes(asset.toLowerCase())
      );

      if (matchedAssets.length > 0 || captainInMatch) {
        managersWithAssets.push({
          managerName: m.manager_name,
          isCaptain: captainInMatch,
        });
      }
    });

    return managersWithAssets;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-discord-darkest rounded-2xl border border-discord-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header with Gameweek Stepper */}
        <div className="px-4 py-3 bg-gradient-to-r from-discord-card via-discord-darker to-discord-darkest flex items-center justify-between border-b border-discord-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <div className="flex items-center gap-1.5 bg-discord-darkest rounded-lg px-2 py-0.5 border border-discord-border/60">
              <button
                type="button"
                onClick={handlePrevGw}
                disabled={selectedGw <= 1}
                className="p-0.5 text-discord-muted hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-extrabold text-xs text-white tracking-wide">
                Gameweek {selectedGw}
              </span>
              <button
                type="button"
                onClick={handleNextGw}
                disabled={selectedGw >= 38}
                className="p-0.5 text-discord-muted hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                loadFixtures(selectedGw);
              }}
              title="Refresh Fixtures"
              className="p-1.5 text-discord-muted hover:text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-discord-blurple' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-1.5 text-discord-muted hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 px-4 py-2 bg-discord-darker border-b border-discord-border/30 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-discord-blurple text-white'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            All Matches ({fixtures.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('live')}
            className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
              filter === 'live'
                ? 'bg-rose-600 text-white'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            <span>Live Now</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              filter === 'upcoming'
                ? 'bg-discord-blurple text-white'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            Upcoming
          </button>
        </div>

        {/* Fixtures List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredFixtures.length === 0 ? (
            <div className="p-8 text-center text-xs text-discord-muted">
              {loading ? 'Loading official Premier League fixtures...' : 'No fixtures found for the selected filter.'}
            </div>
          ) : (
            filteredFixtures.map((fix) => {
              const activeManagers = getActiveManagersInFixture(fix.home_team_name, fix.away_team_name);
              const isLive = fix.started && !fix.finished;
              const formattedTime = new Date(fix.kickoff_time).toLocaleDateString(undefined, {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={fix.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isLive
                      ? 'bg-gradient-to-r from-rose-950/20 via-discord-darker to-discord-darkest border-rose-500/40 shadow-sm'
                      : 'bg-discord-darker border-discord-border/50 hover:border-discord-border'
                  }`}
                >
                  {/* Match Header */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-1 font-bold">
                      {isLive ? (
                        <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px] bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          {fix.minutes}' LIVE
                        </span>
                      ) : fix.finished ? (
                        <span className="text-discord-muted font-mono text-[10px] bg-discord-card px-2 py-0.5 rounded-full">
                          FULL TIME
                        </span>
                      ) : (
                        <span className="text-amber-300 font-mono text-[10px] bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formattedTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scoreline */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1">
                    {/* Home Team */}
                    <div className="flex items-center justify-end gap-2 text-right">
                      <span className="font-bold text-xs text-white truncate">{fix.home_team_name}</span>
                      <ClubCrest teamName={fix.home_team_name} size="sm" />
                    </div>

                    {/* Score / VS Badge */}
                    <div className="px-3 py-1 rounded-lg bg-discord-darkest border border-discord-border/60 text-center font-mono font-black text-sm text-white shrink-0 shadow-inner">
                      {fix.started ? (
                        <span>
                          {fix.team_h_score ?? 0} - {fix.team_a_score ?? 0}
                        </span>
                      ) : (
                        <span className="text-xs text-discord-muted">VS</span>
                      )}
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-start gap-2 text-left">
                      <ClubCrest teamName={fix.away_team_name} size="sm" />
                      <span className="font-bold text-xs text-white truncate">{fix.away_team_name}</span>
                    </div>
                  </div>

                  {/* "On Pitch" Radar for Mini-League Managers */}
                  <div className="mt-2.5 pt-2 border-t border-discord-border/40 text-[11px]">
                    <div className="flex items-center gap-1 text-discord-muted text-[10px] uppercase font-bold tracking-wider mb-1">
                      <Users className="w-3 h-3 text-discord-blurple" />
                      <span>League Assets in this match</span>
                    </div>
                    {activeManagers.length === 0 ? (
                      <span className="text-discord-muted text-[10px] italic">
                        No managers have active Starting XI assets in this clash
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {activeManagers.map((am, i) => (
                          <span
                            key={i}
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${
                              am.isCaptain
                                ? 'bg-amber-400/15 text-amber-300 border-amber-400/40'
                                : 'bg-discord-card text-discord-light border-discord-border/40'
                            }`}
                          >
                            @{am.managerName}
                            {am.isCaptain && ' 👑(C)'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
