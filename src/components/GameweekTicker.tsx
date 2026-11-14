import React, { useState, useEffect } from 'react';
import { Clock, Calendar, AlertCircle, X, Sparkles, BarChart2, Radio } from 'lucide-react';
import { GameweekInfo } from '../services/fplService';
import { triggerHaptic } from '../services/haptics';

interface GameweekTickerProps {
  gwInfo: GameweekInfo | null;
  onOpenPoll?: () => void;
  onOpenFixtures?: () => void;
}

function calculateTimeRemaining(isoDate?: string | null): string {
  if (!isoDate) return '';
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'Passed';

  const totalSecs = Math.floor(diff / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  return `${hours}h ${minutes}m ${seconds}s`;
}

export const GameweekTicker: React.FC<GameweekTickerProps> = ({
  gwInfo,
  onOpenPoll,
  onOpenFixtures,
}) => {
  const [countdown, setCountdown] = useState<string>(() => {
    return gwInfo?.deadlineIso ? calculateTimeRemaining(gwInfo.deadlineIso) : (gwInfo?.deadlineCountdown || '');
  });
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Live 1-second interval ticker for exact precision
  useEffect(() => {
    if (!gwInfo?.deadlineIso) return;

    const timer = setInterval(() => {
      setCountdown(calculateTimeRemaining(gwInfo.deadlineIso));
    }, 1000);

    return () => clearInterval(timer);
  }, [gwInfo?.deadlineIso]);

  if (!gwInfo) return null;

  const recentShort = gwInfo.recentGwId
    ? `GW ${gwInfo.recentGwId}`
    : (gwInfo.recentGwName ? gwInfo.recentGwName.replace(/Gameweek\s*/i, 'GW ') : 'GW 10');

  const upcomingShort = gwInfo.upcomingGwId
    ? `GW ${gwInfo.upcomingGwId}`
    : (gwInfo.upcomingGwName ? gwInfo.upcomingGwName.replace(/Gameweek\s*/i, 'GW ') : 'GW 11');

  const formattedDeadlineDate = gwInfo.deadlineIso
    ? new Date(gwInfo.deadlineIso).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 bg-discord-darkest/95 border-b border-discord-border/40 text-[11px] select-none z-10 shrink-0">
        {gwInfo.isLive ? (
          <div className="flex items-center gap-1.5 text-rose-400 font-bold shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="tracking-wide">{recentShort} LIVE</span>
            <span className="text-discord-muted font-normal text-[10px] hidden xs:inline">• Matchday in progress</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="font-bold text-white text-xs">{recentShort} Concluded</span>
          </div>
        )}

        {/* Right side controls: Fixtures Radar & Countdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenFixtures && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onOpenFixtures();
              }}
              className="flex items-center gap-1 font-bold text-[10px] bg-discord-card/90 hover:bg-discord-card text-discord-cyan px-2 py-0.5 rounded-full border border-discord-border/50 shadow-xs transition-colors"
            >
              <Radio className="w-2.5 h-2.5 text-rose-400" />
              <span>Fixtures</span>
            </button>
          )}

          {/* Dynamic Countdown Pill */}
          {countdown && !gwInfo.isLive && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowScheduleModal(true);
              }}
              className="flex items-center gap-1 shrink-0 font-mono text-[10px] bg-discord-card/90 hover:bg-discord-card text-amber-300 px-2 py-0.5 rounded-full border border-discord-border/50 shadow-xs transition-colors cursor-pointer"
            >
              <Clock className="w-2.5 h-2.5 text-amber-400" />
              <span>
                {upcomingShort} Deadline: <strong className="text-amber-200">{countdown}</strong>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Gameweek Schedule & Deadline Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-discord-darkest rounded-2xl border border-discord-border/80 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-amber-950/60 via-discord-darker to-discord-darkest flex items-center justify-between border-b border-discord-border/40">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">{upcomingShort} Deadline Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1 text-discord-muted hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="p-3 rounded-xl bg-discord-darker border border-discord-border/50 flex flex-col items-center text-center">
                <span className="text-[11px] font-bold uppercase text-discord-muted tracking-wider">
                  Time Remaining
                </span>
                <span className="text-2xl font-black font-mono text-amber-300 mt-1">
                  {countdown}
                </span>
                {formattedDeadlineDate && (
                  <span className="text-xs text-discord-light mt-1 font-medium">
                    {formattedDeadlineDate}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-discord-light">
                <div className="flex items-start gap-2 p-2 rounded-lg bg-discord-card/40 border border-discord-border/30">
                  <AlertCircle className="w-4 h-4 text-discord-cyan shrink-0 mt-0.5" />
                  <span>
                    Transfers, captain locks, and chips (Wildcard, Triple Captain, Free Hit) must be locked in before the deadline.
                  </span>
                </div>
              </div>

              {onOpenPoll && (
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    onOpenPoll();
                  }}
                  className="w-full py-2.5 rounded-xl bg-discord-blurple hover:bg-discord-blurple/90 text-white font-extrabold text-xs shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-1.5"
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>Start Captain Poll in #banter</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
