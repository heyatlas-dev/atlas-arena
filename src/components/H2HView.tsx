import React, { useState } from 'react';
import { Swords, ChevronDown, Check, ArrowUp, ArrowDown, MessageSquare, Trophy, Zap } from 'lucide-react';
import { LeagueMember } from '../types';
import { GameweekInfo } from '../services/fplService';
import { triggerHaptic } from '../services/haptics';
import { sounds } from '../services/soundEffects';
import { ClubCrest } from './ClubCrest';

interface H2HViewProps {
  members: LeagueMember[];
  currentMemberId?: string;
  isGameweekLive?: boolean;
  gwInfo?: GameweekInfo | null;
  onJumpToBanter?: (mentionText: string) => void;
}

export const H2HView: React.FC<H2HViewProps> = ({
  members,
  currentMemberId,
  isGameweekLive = false,
  gwInfo,
  onJumpToBanter,
}) => {
  // If gameweek is live, default to 'gameweek'; if between gameweeks, default to 'overall'!
  const [viewMode, setViewMode] = useState<'overall' | 'gameweek'>(
    isGameweekLive ? 'gameweek' : 'overall'
  );

  const gwLabel = gwInfo?.recentGwId 
    ? `GW ${gwInfo.recentGwId}` 
    : (gwInfo?.recentGwName ? gwInfo.recentGwName.replace(/Gameweek\s*/i, 'GW ') : 'GW 10');

  // Identify user's team
  const myMember = members.find((m) => m.id === currentMemberId || m.is_starred) || members[0];
  
  // Potential rival managers (all members except me)
  const rivalOptions = members.filter((m) => m.id !== myMember?.id);

  // Selected rival state (defaults to #1 manager or first rival)
  const [selectedRivalId, setSelectedRivalId] = useState<string>(() => {
    return rivalOptions[0]?.id || '';
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const rivalMember = members.find((m) => m.id === selectedRivalId) || rivalOptions[0];

  if (!myMember || !rivalMember) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-discord-muted">
        <Swords className="w-10 h-10 mb-2 opacity-50" />
        <p className="text-sm font-semibold text-white">No Rivalry Matchups Available</p>
        <p className="text-xs text-discord-light mt-1">
          Need at least 2 managers in this league to calculate Head-to-Head differentials.
        </p>
      </div>
    );
  }

  // Points depending on view mode
  const isOverallMode = viewMode === 'overall';
  const myScore = isOverallMode ? myMember.total_points : myMember.gw_points;
  const rivalScore = isOverallMode ? rivalMember.total_points : rivalMember.gw_points;
  const pointDiff = myScore - rivalScore;
  const isAhead = pointDiff > 0;
  const isTied = pointDiff === 0;

  // Calculate differentials
  const myAssets = myMember.assets || [];
  const rivalAssets = rivalMember.assets || [];
  const myDifferentials = myAssets.filter((a) => !rivalAssets.includes(a));
  const rivalDifferentials = rivalAssets.filter((a) => !myAssets.includes(a));

  // Quick shortcuts: Leader, Next Above, Next Below
  const leader = members.find((m) => m.rank === 1 && m.id !== myMember.id);
  const nextAbove = members.find((m) => m.rank === myMember.rank - 1);
  const nextBelow = members.find((m) => m.rank === myMember.rank + 1);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-discord-chat">
      {/* View Mode Toggle Bar (Overall Season vs. Specific Gameweek) */}
      <div className="flex items-center justify-between p-1 bg-discord-darkest rounded-xl border border-discord-border/60">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setViewMode('overall');
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            isOverallMode
              ? 'bg-discord-blurple text-white shadow-sm'
              : 'text-discord-muted hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-300" />
          <span>Overall (Title Race)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setViewMode('gameweek');
          }}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            !isOverallMode
              ? 'bg-discord-blurple text-white shadow-sm'
              : 'text-discord-muted hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span>{isGameweekLive ? `${gwLabel} Live` : `${gwLabel} Points`}</span>
        </button>
      </div>

      {/* Top Selector Card */}
      <div className="bg-discord-darkest/95 p-3 rounded-2xl border border-discord-border/80 shadow-md">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-discord-muted uppercase tracking-wider flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-discord-blurple" />
            <span>Select Rival to Challenge</span>
          </span>
          <span className="text-[10px] text-discord-cyan bg-discord-cyan/10 px-2 py-0.5 rounded-full font-bold">
            YOU VS RIVAL
          </span>
        </div>

        {/* Rival Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setDropdownOpen(!dropdownOpen);
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-discord-darker hover:bg-discord-card border border-discord-border text-white text-xs font-bold transition-all shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <span className="text-discord-muted font-normal shrink-0">Challenging:</span>
              <span className="text-discord-cyan font-bold truncate">
                {rivalMember.manager_name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-discord-card text-emerald-400 font-mono shrink-0">
                #{rivalMember.rank}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-discord-muted transition-transform duration-150 shrink-0 ${
                dropdownOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>

          {/* Dropdown Options */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-discord-darker border border-discord-border rounded-xl shadow-2xl z-20 max-h-56 overflow-y-auto animate-in fade-in duration-150 space-y-0.5 p-1">
              {rivalOptions.map((rival) => {
                const isSelected = rival.id === selectedRivalId;
                return (
                  <div
                    key={rival.id}
                    onClick={() => {
                      triggerHaptic('light');
                      sounds.playClash();
                      setSelectedRivalId(rival.id);
                      setDropdownOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-discord-blurple/20 text-white font-bold'
                        : 'text-discord-light hover:bg-discord-card hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-discord-muted font-mono text-[10px] w-5 shrink-0">
                        #{rival.rank}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-white truncate">{rival.manager_name}</div>
                        <div className="text-[10px] text-discord-muted truncate font-normal">{rival.team_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-discord-light">
                        {isOverallMode ? `${rival.total_points} pts` : `${rival.gw_points} pts`}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-discord-cyan" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Shortcut Pills */}
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-discord-border/40 text-[11px]">
          {leader && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                sounds.playClash();
                setSelectedRivalId(leader.id);
              }}
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                selectedRivalId === leader.id
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                  : 'bg-discord-darker text-discord-muted hover:text-white'
              }`}
            >
              <span>👑 #1 Leader ({leader.manager_name})</span>
            </button>
          )}
          {nextAbove && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                sounds.playClash();
                setSelectedRivalId(nextAbove.id);
              }}
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                selectedRivalId === nextAbove.id
                  ? 'bg-discord-cyan/20 text-discord-cyan border border-discord-cyan/50'
                  : 'bg-discord-darker text-discord-muted hover:text-white'
              }`}
            >
              <span>▲ Chasing ({nextAbove.manager_name})</span>
            </button>
          )}
          {nextBelow && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                sounds.playClash();
                setSelectedRivalId(nextBelow.id);
              }}
              className={`px-2 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                selectedRivalId === nextBelow.id
                  ? 'bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/50'
                  : 'bg-discord-darker text-discord-muted hover:text-white'
              }`}
            >
              <span>▼ Defender ({nextBelow.manager_name})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Duel Showdown Card */}
      <div className="bg-discord-darker rounded-2xl border border-discord-border/70 overflow-hidden shadow-xl">
        <div className="p-3.5 bg-gradient-to-b from-discord-card/60 to-discord-darkest/90 border-b border-discord-border/50">
          
          {/* Header Row: Manager Names & Badges */}
          <div className="flex items-center justify-between gap-3 mb-3">
            {/* Left: YOU */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-white truncate">
                  {myMember.manager_name}
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-discord-blurple text-white shrink-0">
                  YOU
                </span>
              </div>
              <div className="text-[11px] text-discord-muted truncate mt-0.5">
                Rank #{myMember.rank} • {myMember.team_name}
              </div>
            </div>

            {/* Right: RIVAL */}
            <div className="flex-1 min-w-0 text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 shrink-0">
                  RIVAL
                </span>
                <span className="font-extrabold text-sm text-white truncate">
                  {rivalMember.manager_name}
                </span>
              </div>
              <div className="text-[11px] text-discord-muted truncate mt-0.5">
                Rank #{rivalMember.rank} • {rivalMember.team_name}
              </div>
            </div>
          </div>

          {/* Dedicated 3-Column Scoreboard Row (YOU | VS & Gap | RIVAL) */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-2 border-t border-discord-border/30">
            {/* YOU Score Box */}
            <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-discord-darkest/70 border border-discord-border/40 shadow-inner">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  isAhead ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {myScore.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold font-mono text-discord-muted tracking-wider uppercase mt-0.5">
                {isOverallMode ? 'Overall Pts' : `${gwLabel} Pts`}
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 mt-1.5 font-mono">
                {isOverallMode ? `+${myMember.gw_points} in ${gwLabel}` : `${myMember.total_points} total`}
              </span>
              {myMember.captain_name && myMember.captain_name !== 'Captain' && (
                <span className="text-[10px] font-bold text-amber-300 mt-0.5 truncate max-w-full">
                  [C: {myMember.captain_name}]
                </span>
              )}
            </div>

            {/* Center VS & Lead/Deficit Badge */}
            <div className="flex flex-col items-center justify-center px-1 shrink-0">
              <div className="w-8 h-8 rounded-full bg-discord-darkest border border-discord-border flex items-center justify-center font-black text-[11px] text-discord-cyan shadow-md">
                VS
              </div>
              <div
                className={`mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold whitespace-nowrap shadow-xs text-center ${
                  isAhead
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : isTied
                    ? 'bg-discord-card text-discord-muted'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {isAhead
                  ? `+${pointDiff} lead`
                  : isTied
                  ? 'Level'
                  : `${pointDiff} behind`}
              </div>
            </div>

            {/* RIVAL Score Box */}
            <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-discord-darkest/70 border border-discord-border/40 shadow-inner">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  !isAhead && !isTied ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {rivalScore.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold font-mono text-discord-muted tracking-wider uppercase mt-0.5">
                {isOverallMode ? 'Overall Pts' : `${gwLabel} Pts`}
              </span>
              <span className="text-[11px] font-semibold text-emerald-400 mt-1.5 font-mono">
                {isOverallMode ? `+${rivalMember.gw_points} in ${gwLabel}` : `${rivalMember.total_points} total`}
              </span>
              {rivalMember.captain_name && rivalMember.captain_name !== 'Captain' && (
                <span className="text-[10px] font-bold text-amber-300 mt-0.5 truncate max-w-full">
                  [C: {rivalMember.captain_name}]
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Differentials Comparison Grid */}
        <div className="p-3 bg-discord-darkest/90 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* My Differential Advantage */}
            <div className="p-2.5 rounded-xl bg-discord-card/30 border border-discord-border/40">
              <div className="text-[10px] font-bold uppercase text-emerald-400 mb-1.5 flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                <span>Your Differentials</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {myDifferentials.length > 0 ? (
                  myDifferentials.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    >
                      {p}
                    </span>
                  ))
                ) : myAssets.length === 0 ? (
                  <span className="text-[10px] text-discord-muted italic">Syncing squad picks...</span>
                ) : (
                  <span className="text-[10px] text-discord-muted italic">Identical starting XI</span>
                )}
              </div>
            </div>

            {/* Rival Threat Differentials */}
            <div className="p-2.5 rounded-xl bg-discord-card/30 border border-discord-border/40 text-right">
              <div className="text-[10px] font-bold uppercase text-rose-400 mb-1.5 flex items-center justify-end gap-1">
                <span>Rival's Threats</span>
                <ArrowDown className="w-3 h-3" />
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                {rivalDifferentials.length > 0 ? (
                  rivalDifferentials.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    >
                      {p}
                    </span>
                  ))
                ) : rivalAssets.length === 0 ? (
                  <span className="text-[10px] text-discord-muted italic">Syncing squad picks...</span>
                ) : (
                  <span className="text-[10px] text-discord-muted italic">Identical starting XI</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Banter Trigger Button */}
          {onJumpToBanter && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                const gapText = isOverallMode
                  ? `${Math.abs(pointDiff)} pts overall`
                  : `${Math.abs(pointDiff)} pts in ${gwLabel}`;
                const prompt = isAhead
                  ? `@${rivalMember.manager_name} +${gapText} clear mate, good luck catching up 👑`
                  : `@${rivalMember.manager_name} only ${gapText} gap, your lead won't last long 💀`;
                onJumpToBanter(prompt);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold text-discord-cyan bg-discord-cyan/10 hover:bg-discord-cyan/20 border border-discord-cyan/30 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Banter with @{rivalMember.manager_name} in #banter</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
