import React, { useState } from 'react';
import { Trophy, ArrowUp, ArrowDown, Minus, Zap } from 'lucide-react';
import { LeagueMember } from '../types';
import { GameweekInfo } from '../services/fplService';
import { triggerHaptic } from '../services/haptics';

interface TableViewProps {
  members: LeagueMember[];
  currentMemberId?: string;
  gwInfo?: GameweekInfo | null;
  onViewSquad?: (member: LeagueMember) => void;
}

export const TableView: React.FC<TableViewProps> = ({ members, currentMemberId, gwInfo, onViewSquad }) => {
  const [sortBy, setSortBy] = useState<'total' | 'gw'>('total');

  const gwLabel = gwInfo?.recentGwId 
    ? `GW ${gwInfo.recentGwId}` 
    : (gwInfo?.recentGwName ? gwInfo.recentGwName.replace(/Gameweek\s*/i, 'GW ') : 'GW 10');

  // Sort by selected criteria
  const sorted = [...members].sort((a, b) => {
    if (sortBy === 'gw') {
      return b.gw_points - a.gw_points;
    }
    return b.total_points - a.total_points;
  });

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-discord-chat space-y-2.5">
      {/* Header and Sorting Pill */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-extrabold text-white uppercase tracking-wider truncate">
            Standings
          </span>
          <span className="text-[10px] text-discord-muted font-bold truncate">
            • {sortBy === 'total' ? 'Overall Season' : `${gwLabel} Points`}
          </span>
        </div>

        {/* Sort Switcher (Overall vs specific GW) */}
        <div className="flex items-center bg-discord-darkest rounded-lg p-0.5 border border-discord-border/50 text-[11px] font-bold shrink-0 ml-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSortBy('total');
            }}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              sortBy === 'total'
                ? 'bg-discord-blurple text-white shadow-xs'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            Overall
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSortBy('gw');
            }}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              sortBy === 'gw'
                ? 'bg-discord-blurple text-white shadow-xs'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-300" />
            <span>{gwLabel}</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-discord-darker rounded-2xl border border-discord-border/60 overflow-hidden shadow-xl">
        {/* Table Column Subheader */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-discord-darkest/70 border-b border-discord-border/40 text-[10px] font-bold text-discord-muted uppercase tracking-wider">
          <span># Manager & Team</span>
          <span>{sortBy === 'total' ? 'Overall Pts' : `${gwLabel} Pts`}</span>
        </div>

        <div className="divide-y divide-discord-border/40">
          {sorted.map((member, index) => {
            const currentRank = sortBy === 'total' ? member.rank || index + 1 : index + 1;
            const prevRank = member.prev_rank || currentRank;
            const rankDelta = prevRank - currentRank;
            const isMe = member.id === currentMemberId || member.is_starred;

            return (
              <div
                key={member.id}
                onClick={() => {
                  triggerHaptic('light');
                  if (onViewSquad) onViewSquad(member);
                }}
                className={`flex items-center justify-between p-3 transition-colors cursor-pointer ${
                  isMe
                    ? 'bg-discord-blurple/15 border-l-4 border-l-discord-blurple hover:bg-discord-blurple/25'
                    : 'hover:bg-discord-card/60'
                }`}
              >
                {/* Left: Rank & Movement */}
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="flex flex-col items-center justify-center w-6 shrink-0">
                    <span
                      className={`font-black font-mono text-sm ${
                        currentRank === 1
                          ? 'text-amber-400'
                          : currentRank === 2
                          ? 'text-slate-300'
                          : currentRank === 3
                          ? 'text-amber-600'
                          : 'text-discord-muted'
                      }`}
                    >
                      {currentRank}
                    </span>
                    {sortBy === 'total' ? (
                      <div className="flex items-center text-[10px] font-bold">
                        {rankDelta > 0 ? (
                          <span className="text-emerald-400 flex items-center">
                            <ArrowUp className="w-2.5 h-2.5" />
                            {rankDelta}
                          </span>
                        ) : rankDelta < 0 ? (
                          <span className="text-rose-400 flex items-center">
                            <ArrowDown className="w-2.5 h-2.5" />
                            {Math.abs(rankDelta)}
                          </span>
                        ) : (
                          <span className="text-discord-muted">
                            <Minus className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] text-discord-muted font-mono font-normal">
                        #{member.rank}
                      </span>
                    )}
                  </div>

                  {/* Manager and Team */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white truncate">
                        {member.manager_name}
                      </span>
                      {isMe && (
                        <span className="text-[9px] font-bold px-1 rounded bg-discord-blurple text-white shrink-0">
                          YOU
                        </span>
                      )}
                      {member.is_online && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-discord-muted truncate">
                      {member.team_name}
                    </div>
                    {member.captain_name && member.captain_name !== 'Captain' && (
                      <div className="text-[10px] font-semibold text-amber-300/80 mt-0.5 truncate">
                        [C: {member.captain_name}]
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Explicit points display with GW identification */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-black font-mono text-white">
                    {sortBy === 'total'
                      ? member.total_points.toLocaleString()
                      : member.gw_points.toLocaleString()}
                    <span className="text-[10px] font-bold text-discord-muted ml-1 font-mono">
                      {sortBy === 'total' ? 'pts' : 'pts'}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-semibold text-emerald-400 mt-0.5">
                    {sortBy === 'total'
                      ? `+${member.gw_points} in ${gwLabel}`
                      : `${member.total_points.toLocaleString()} total`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
