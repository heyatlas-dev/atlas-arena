import React, { useState } from 'react';
import { X } from 'lucide-react';
import { LeagueMember } from '../types';
import { triggerHaptic } from '../services/haptics';
import { ClubCrest } from './ClubCrest';

interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  members: LeagueMember[];
  currentMember?: LeagueMember;
  onViewSquad?: (member: LeagueMember) => void;
}

export const RightDrawer: React.FC<RightDrawerProps> = ({
  isOpen,
  onClose,
  members,
  currentMember,
  onViewSquad,
}) => {
  const [selectedMember, setSelectedMember] = useState<LeagueMember | null>(null);

  if (!isOpen) return null;

  const onlineMembers = members.filter((m) => m.is_online);
  const offlineMembers = members.filter((m) => !m.is_online);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }}
      />

      {/* Drawer Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-discord-darker border-l border-discord-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div 
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
          className="flex items-center justify-between px-4 pb-3 border-b border-discord-border/60 bg-discord-darkest"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-white">Live Manager Roster</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400">
              {onlineMembers.length} Online
            </span>
          </div>
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1 text-discord-muted hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member Details Modal / Popover if a member is clicked */}
        {selectedMember && (
          <div className="p-3 bg-discord-darkest/95 border-b border-discord-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-discord-cyan">
                Manager Breakdown
              </span>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-discord-muted hover:text-white text-xs"
              >
                close
              </button>
            </div>
            <div className="bg-discord-card/50 p-2.5 rounded-xl border border-discord-border/50 text-xs space-y-1.5">
              <div className="flex justify-between font-bold text-white">
                <span>{selectedMember.manager_name}</span>
                <span className="text-emerald-400">Rank #{selectedMember.rank}</span>
              </div>
              <div className="text-discord-light text-[11px]">{selectedMember.team_name}</div>
              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-discord-muted">
                <span>Captain:</span>
                <span className="font-bold text-amber-300">
                  {selectedMember.captain_name} (×{selectedMember.captain_multiplier})
                </span>
              </div>
              <div className="pt-1">
                <span className="text-[10px] text-discord-muted uppercase font-semibold">
                  Starting XI Assets:
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedMember.assets && selectedMember.assets.length > 0 ? (
                    selectedMember.assets.map((asset) => {
                      const isShared = currentMember?.assets.includes(asset);
                      return (
                        <span
                          key={asset}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            isShared
                              ? 'bg-discord-card text-discord-light border border-discord-border'
                              : 'bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/40'
                          }`}
                        >
                          {asset} {!isShared && '⚡ diff'}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[10px] text-discord-muted italic">
                      Syncing squad picks...
                    </span>
                  )}
                </div>
              </div>

              {/* View Full Pitch XI Button */}
              {onViewSquad && (
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    onViewSquad(selectedMember);
                    onClose();
                  }}
                  className="w-full mt-2 py-1.5 px-3 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>⚽</span>
                  <span>View Starting XI Pitch</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* List of Managers */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Online Section */}
          <div>
            <div className="px-2 py-1 text-[11px] font-bold text-discord-muted uppercase tracking-wider">
              Matchday Active — {onlineMembers.length}
            </div>
            <div className="space-y-1 mt-1">
              {onlineMembers.map((member) => (
                <div
                  key={member.id}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedMember(member);
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                    selectedMember?.id === member.id
                      ? 'bg-discord-card ring-1 ring-discord-border'
                      : 'hover:bg-discord-card/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        {member.manager_name.charAt(0)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-discord-darker" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white truncate">
                          {member.manager_name}
                        </span>
                        {member.is_starred && (
                          <span className="text-[9px] px-1 py-0.2 bg-amber-400/20 text-amber-300 rounded font-bold">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-discord-muted truncate">
                        {member.team_name}
                      </div>
                    </div>
                  </div>

                  {/* GW Points & Captain */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      {member.gw_points} pts
                    </div>
                    {member.captain_name && member.captain_name !== 'Captain' && (
                      <div className="text-[10px] font-semibold text-amber-300/90">
                        [C: {member.captain_name}]
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Offline Section */}
          {offlineMembers.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold text-discord-muted uppercase tracking-wider">
                Standby — {offlineMembers.length}
              </div>
              <div className="space-y-1 mt-1 opacity-70">
                {offlineMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedMember(member);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-discord-card/40 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-discord-card text-discord-light font-bold text-xs flex items-center justify-center">
                          {member.manager_name.charAt(0)}
                        </div>
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-discord-muted ring-2 ring-discord-darker" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-xs text-discord-light truncate block">
                          {member.manager_name}
                        </span>
                        <span className="text-[11px] text-discord-muted truncate block">
                          {member.last_seen || 'Offline'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-discord-muted">
                        {member.gw_points} pts
                      </div>
                      {member.captain_name && member.captain_name !== 'Captain' && (
                        <div className="text-[10px] text-discord-muted">
                          [C: {member.captain_name}]
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
