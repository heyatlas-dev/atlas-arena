import React, { useState } from 'react';
import { Trophy, ArrowUp, ArrowDown, Minus, Zap, Swords, ShieldCheck, Flame } from 'lucide-react';
import { LeagueMember } from '../types';
import { GameweekInfo } from '../services/fplService';
import { triggerHaptic } from '../services/haptics';

interface TableViewProps {
  members: LeagueMember[];
  currentMemberId?: string;
  gwInfo?: GameweekInfo | null;
  onViewSquad?: (member: LeagueMember) => void;
  onLaunchBattle?: (member: LeagueMember) => void;
}

export const TableView: React.FC<TableViewProps> = ({
  members,
  currentMemberId,
  gwInfo,
  onViewSquad,
  onLaunchBattle,
}) => {
  // If gameweek is currently live, default to 'live'; otherwise 'total'
  const isGwLive = Boolean(gwInfo?.isLive);
  const [sortBy, setSortBy] = useState<'live' | 'total' | 'gw'>(isGwLive ? 'live' : 'total');

  const gwLabel = gwInfo?.recentGwId
    ? `GW ${gwInfo.recentGwId}`
    : (gwInfo?.recentGwName ? gwInfo.recentGwName.replace(/Gameweek\s*/i, 'GW ') : 'GW 10');

  // Compute sorted array based on selected mode
  const sorted = [...members].sort((a, b) => {
    if (sortBy === 'gw') {
      return b.gw_points - a.gw_points;
    }
    // In live & total mode, sort by overall points
    return b.total_points - a.total_points;
  });

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-discord-chat space-y-2.5">
      {/* Live Matchday Banner if in Live mode */}
      {sortBy === 'live' && (
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-950/70 via-discord-darkest to-discord-darker rounded-xl border border-emerald-500/40 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-black text-emerald-300 tracking-wide flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                VIRTUAL LIVE MATCHDAY TABLE
              </span>
              <span className="text-[10px] text-discord-light">
                Provisional live returns & real-time rank shifts
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
            {gwLabel} LIVE
          </span>
        </div>
      )}

      {/* Header and Sorting Pills */}
      <div className="flex items-center justify-between px-1 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-extrabold text-white uppercase tracking-wider truncate">
            {sortBy === 'live' ? 'Live Standings' : 'Standings'}
          </span>
          <span className="text-[10px] text-discord-muted font-bold truncate">
            • {sortBy === 'live' ? 'Virtual Live' : sortBy === 'total' ? 'Overall Title Race' : `${gwLabel} Points`}
          </span>
        </div>

        {/* 3-Way Sort Switcher (Live, Overall, GW) */}
        <div className="flex items-center bg-discord-darkest rounded-lg p-0.5 border border-discord-border/50 text-[11px] font-bold shrink-0 ml-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSortBy('live');
            }}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
              sortBy === 'live'
                ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-300" />
            <span>Live</span>
          </button>
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
            <span>{gwLabel}</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-discord-darker rounded-2xl border border-discord-border/60 overflow-hidden shadow-xl">
        {/* Table Column Subheader */}
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-discord-darkest/70 border-b border-discord-border/40 text-[10px] font-bold text-discord-muted uppercase tracking-wider">
          <span># Manager & Team</span>
          <span>{sortBy === 'gw' ? `${gwLabel} Pts` : 'Total Score'}</span>
        </div>

        <div className="divide-y divide-discord-border/40">
          {sorted.map((member, index) => {
            const currentRank = sortBy === 'gw' ? index + 1 : index + 1;
            const prevRank = member.prev_rank || member.rank || currentRank;
            const rankDelta = prevRank - currentRank;
            const isMe = member.id === currentMemberId || member.is_starred;

            return (
              <div
                key={member.id}
                onClick={() => {
                  triggerHaptic('light');
                  if (onViewSquad) onViewSquad(member);
                }}
                className={`flex items-center justify-between p-3 transition-colors cursor-pointer group ${
                  isMe
                    ? 'bg-discord-blurple/15 border-l-4 border-l-discord-blurple hover:bg-discord-blurple/25'
                    : 'hover:bg-discord-card/60'
                }`}
              >
                {/* Left: Rank & Movement */}
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <div className="flex flex-col items-center justify-center w-7 shrink-0">
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

                    {/* Rank Movement Indicator */}
                    <div className="flex items-center text-[10px] font-bold">
                      {rankDelta > 0 ? (
                        <span className="text-emerald-400 flex items-center font-mono font-black animate-pulse">
                          <ArrowUp className="w-2.5 h-2.5" />
                          {rankDelta}
                        </span>
                      ) : rankDelta < 0 ? (
                        <span className="text-rose-400 flex items-center font-mono font-black">
                          <ArrowDown className="w-2.5 h-2.5" />
                          {Math.abs(rankDelta)}
                        </span>
                      ) : (
                        <span className="text-discord-muted font-mono">
                          <Minus className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
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

                    {/* Captain & Chip badges */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {member.captain_name && member.captain_name !== 'Captain' && (
                        <span className="text-[9px] font-bold text-amber-300/90 bg-amber-400/10 px-1 rounded border border-amber-400/20 truncate">
                          👑 (C): {member.captain_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Scores & Quick Battle trigger */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Quick Battle button on hover or for non-me members */}
                  {!isMe && onLaunchBattle && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('medium');
                        onLaunchBattle(member);
                      }}
                      title={`Battle vs ${member.manager_name}`}
                      className="hidden group-hover:flex items-center gap-1 px-2 py-1 rounded-lg bg-discord-darkest hover:bg-rose-900/40 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold transition-all"
                    >
                      <Swords className="w-3 h-3 text-rose-400" />
                      <span>Battle</span>
                    </button>
                  )}

                  <div className="text-right">
                    <div className="text-sm font-black font-mono text-white flex items-center justify-end gap-1">
                      <span>
                        {sortBy === 'gw'
                          ? member.gw_points.toLocaleString()
                          : member.total_points.toLocaleString()}
                      </span>
                      <span className="text-[10px] font-bold text-discord-muted font-mono">
                        pts
                      </span>
                    </div>
                    <div className="text-xs font-mono font-semibold text-emerald-400 mt-0.5">
                      {sortBy === 'gw'
                        ? `${member.total_points.toLocaleString()} total`
                        : `+${member.gw_points} in ${gwLabel}`}
                    </div>
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
