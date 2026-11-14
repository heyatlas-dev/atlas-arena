import React from 'react';
import { Clock } from 'lucide-react';
import { GameweekInfo } from '../services/fplService';

interface GameweekTickerProps {
  gwInfo: GameweekInfo | null;
}

export const GameweekTicker: React.FC<GameweekTickerProps> = ({ gwInfo }) => {
  if (!gwInfo) return null;

  // Shorten Gameweek 10 -> GW 10 for clean mobile display without ellipsis
  const recentShort = gwInfo.recentGwId 
    ? `GW ${gwInfo.recentGwId}` 
    : (gwInfo.recentGwName ? gwInfo.recentGwName.replace(/Gameweek\s*/i, 'GW ') : 'GW 10');

  const upcomingShort = gwInfo.upcomingGwId 
    ? `GW ${gwInfo.upcomingGwId}` 
    : (gwInfo.upcomingGwName ? gwInfo.upcomingGwName.replace(/Gameweek\s*/i, 'GW ') : 'GW 11');

  return (
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

      {/* Deadline Countdown */}
      {gwInfo.deadlineCountdown && !gwInfo.isLive && (
        <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] bg-discord-card/90 text-amber-300 px-2 py-0.5 rounded-full border border-discord-border/50 shadow-xs">
          <Clock className="w-2.5 h-2.5 text-amber-400" />
          <span>
            {upcomingShort} Deadline: <strong className="text-amber-200">{gwInfo.deadlineCountdown}</strong>
          </span>
        </div>
      )}
    </div>
  );
};
