import React, { useState, useEffect, useRef } from 'react';
import { X, Radio, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { FPLFixtureInfo, fetchGameweekFixtures } from '../services/fplService';
import { ClubCrest } from './ClubCrest';
import { triggerHaptic } from '../services/haptics';

interface LiveFixturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gwId: number;
}

export const LiveFixturesModal: React.FC<LiveFixturesModalProps> = ({
  isOpen,
  onClose,
  gwId,
}) => {
  const [selectedGw, setSelectedGw] = useState<number>(gwId);
  const [fixtures, setFixtures] = useState<FPLFixtureInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    setSelectedGw(gwId);
  }, [gwId]);

  const loadFixtures = (targetGw: number, showFullSpinner = false) => {
    if (showFullSpinner) setLoading(true);
    setIsRefreshing(true);

    fetchGameweekFixtures(targetGw).then((res) => {
      setFixtures(res);
      setLoading(false);
      setIsRefreshing(false);
    });
  };

  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    loadFixtures(selectedGw, true);

    // Auto-update every 15 seconds during live matchdays
    timerRef.current = setInterval(() => {
      loadFixtures(selectedGw, false);
    }, 15000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, selectedGw]);

  if (!isOpen) return null;

  const filteredFixtures = fixtures.filter((f) => {
    if (filter === 'live') return f.started && !f.finished;
    if (filter === 'upcoming') return !f.started;
    return true;
  });

  const liveCount = fixtures.filter((f) => f.started && !f.finished).length;

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

  // Format kickoff day & time (e.g., Sat 15:00)
  const formatKickoff = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const day = d.toLocaleDateString(undefined, { weekday: 'short' });
      const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      return `${day} ${time}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-discord-darkest rounded-2xl border border-discord-border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Top Header */}
        <div className="px-4 py-3 bg-discord-darker border-b border-discord-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Radio className={`w-4 h-4 ${liveCount > 0 ? 'text-rose-500 animate-pulse' : 'text-discord-muted'}`} />
            <h3 className="font-extrabold text-sm text-white tracking-wide">Premier League Fixtures</h3>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                loadFixtures(selectedGw, false);
              }}
              title="Refresh Scores"
              className="p-1.5 text-discord-muted hover:text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-discord-cyan' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-1.5 text-discord-muted hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gameweek Stepper Controls */}
        <div className="px-4 py-2 bg-discord-chat flex items-center justify-between border-b border-discord-border/40 shrink-0">
          <button
            type="button"
            onClick={handlePrevGw}
            disabled={selectedGw <= 1}
            className="p-1 text-discord-muted hover:text-white disabled:opacity-25 transition-colors rounded-lg flex items-center gap-1 text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>GW {selectedGw - 1}</span>
          </button>

          <span className="font-black text-sm text-white uppercase tracking-wider bg-discord-darker px-3 py-1 rounded-full border border-discord-border/60 shadow-inner">
            Gameweek {selectedGw}
          </span>

          <button
            type="button"
            onClick={handleNextGw}
            disabled={selectedGw >= 38}
            className="p-1 text-discord-muted hover:text-white disabled:opacity-25 transition-colors rounded-lg flex items-center gap-1 text-xs font-semibold"
          >
            <span>GW {selectedGw + 1}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-discord-darkest border-b border-discord-border/30 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`flex-1 py-1 rounded-lg text-center transition-all ${
              filter === 'all'
                ? 'bg-discord-card text-white shadow-xs'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            All ({fixtures.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('live')}
            className={`flex-1 py-1 rounded-lg text-center transition-all flex items-center justify-center gap-1 ${
              filter === 'live'
                ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40 shadow-xs'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            {liveCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
            <span>Live ({liveCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('upcoming')}
            className={`flex-1 py-1 rounded-lg text-center transition-all ${
              filter === 'upcoming'
                ? 'bg-discord-card text-white shadow-xs'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            Upcoming
          </button>
        </div>

        {/* Fixtures List - Modern Scoreboard Cards */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-discord-muted text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mb-2 text-discord-cyan" />
              <span>Fetching live Premier League scores...</span>
            </div>
          ) : filteredFixtures.length === 0 ? (
            <div className="py-12 text-center text-xs text-discord-muted">
              No matches found for this filter.
            </div>
          ) : (
            filteredFixtures.map((fix) => {
              const isLive = fix.started && !fix.finished;
              const isFinished = fix.finished;
              const isUpcoming = !fix.started;

              return (
                <div
                  key={fix.id}
                  className={`rounded-xl border p-2.5 transition-all ${
                    isLive
                      ? 'bg-gradient-to-r from-rose-950/20 via-discord-darker to-discord-darkest border-rose-500/50 shadow-md'
                      : 'bg-discord-darker/90 border-discord-border/60 hover:border-discord-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Teams Column (Home & Away Stacked, Flashscore-Style) */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Home Team */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <ClubCrest teamName={fix.home_team_name} size="xs" />
                          <span
                            className={`font-bold text-xs truncate ${
                              isFinished && (fix.team_h_score ?? 0) > (fix.team_a_score ?? 0)
                                ? 'text-white'
                                : isFinished
                                ? 'text-discord-light'
                                : 'text-white'
                            }`}
                          >
                            {fix.home_team_name}
                          </span>
                        </div>
                        {fix.started && (
                          <span className="font-mono font-black text-sm text-white shrink-0">
                            {fix.team_h_score ?? 0}
                          </span>
                        )}
                      </div>

                      {/* Away Team */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <ClubCrest teamName={fix.away_team_name} size="xs" />
                          <span
                            className={`font-bold text-xs truncate ${
                              isFinished && (fix.team_a_score ?? 0) > (fix.team_h_score ?? 0)
                                ? 'text-white'
                                : isFinished
                                ? 'text-discord-light'
                                : 'text-white'
                            }`}
                          >
                            {fix.away_team_name}
                          </span>
                        </div>
                        {fix.started && (
                          <span className="font-mono font-black text-sm text-white shrink-0">
                            {fix.team_a_score ?? 0}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status Box Column */}
                    <div className="flex flex-col items-center justify-center pl-3 border-l border-discord-border/50 shrink-0 w-20">
                      {isLive ? (
                        <div className="flex flex-col items-center">
                          <span className="flex items-center gap-1 font-mono font-black text-xs text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                            {fix.minutes}'
                          </span>
                          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider mt-1">
                            LIVE
                          </span>
                        </div>
                      ) : isFinished ? (
                        <span className="text-[10px] font-mono font-bold text-discord-muted bg-discord-card px-2 py-0.5 rounded-md">
                          FT
                        </span>
                      ) : (
                        <div className="text-center font-mono text-[11px] font-bold text-amber-300">
                          {formatKickoff(fix.kickoff_time)}
                        </div>
                      )}
                    </div>
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
