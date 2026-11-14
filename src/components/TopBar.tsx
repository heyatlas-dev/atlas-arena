import React, { useState } from 'react';
import { Menu, Users, Star, ChevronDown, Check, Plus, Radio } from 'lucide-react';
import { League } from '../types';
import { triggerHaptic } from '../services/haptics';

interface TopBarProps {
  currentLeague: League;
  leagues: League[];
  onlineCount: number;
  totalMembers: number;
  onOpenLeftDrawer: () => void;
  onOpenRightDrawer: () => void;
  onSelectLeague: (league: League) => void;
  onOpenAddLeague: () => void;
  onToggleStarLeague: (leagueId: string) => void;
  realtimeConnected: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentLeague,
  leagues,
  onlineCount,
  totalMembers,
  onOpenLeftDrawer,
  onOpenRightDrawer,
  onSelectLeague,
  onOpenAddLeague,
  onToggleStarLeague,
  realtimeConnected
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header 
      style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.625rem)' }}
      className="relative z-30 flex items-center justify-between px-3.5 pb-2.5 bg-discord-darkest border-b border-discord-border/40 select-none shadow-md"
    >
      {/* Left Menu Button */}
      <button
        onClick={() => {
          triggerHaptic('light');
          onOpenLeftDrawer();
        }}
        className="p-2 text-discord-light hover:text-discord-white hover:bg-discord-card/80 active:bg-discord-card rounded-xl transition-colors"
        aria-label="Open Navigation Drawer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Center Starred League Pill & Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            triggerHaptic('light');
            setDropdownOpen(!dropdownOpen);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-discord-darker hover:bg-discord-card/80 border border-discord-border/70 text-discord-white transition-all shadow-inner group"
        >
          <Star
            className={`w-3.5 h-3.5 ${
              currentLeague.is_starred ? 'text-amber-400 fill-amber-400' : 'text-discord-muted'
            }`}
          />
          <span className="font-bold text-xs tracking-wide max-w-[170px] truncate sm:max-w-xs text-white">
            {currentLeague.name}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-discord-muted transition-transform duration-200 ${
              dropdownOpen ? 'rotate-180 text-discord-white' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setDropdownOpen(false)}
            />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-discord-darker border border-discord-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-2 py-1.5 text-[11px] font-bold text-discord-muted uppercase tracking-wider flex items-center justify-between">
                <span>Switch League</span>
                <span className="text-[10px] text-discord-cyan flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  {realtimeConnected ? 'Live' : 'Standby'}
                </span>
              </div>

              <div className="space-y-1 my-1">
                {leagues.map((lg) => {
                  const isCurrent = lg.id === currentLeague.id;
                  return (
                    <div
                      key={lg.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                        isCurrent
                          ? 'bg-discord-card text-white font-medium'
                          : 'text-discord-light hover:bg-discord-card/50 hover:text-white'
                      }`}
                      onClick={() => {
                        triggerHaptic('medium');
                        onSelectLeague(lg);
                        setDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHaptic('light');
                            onToggleStarLeague(lg.id);
                          }}
                          className="p-1 hover:scale-110 transition-transform"
                          title={lg.is_starred ? 'Starred League (Boots first)' : 'Star this league'}
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              lg.is_starred
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-discord-muted hover:text-amber-300'
                            }`}
                          />
                        </button>
                        <span className="text-xs truncate">{lg.name}</span>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-discord-blurple shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-discord-border/50">
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setDropdownOpen(false);
                    onOpenAddLeague();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium text-discord-cyan bg-discord-cyan/10 hover:bg-discord-cyan/20 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Import Another FPL League</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Roster Button */}
      <button
        onClick={() => {
          triggerHaptic('light');
          onOpenRightDrawer();
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-discord-light hover:text-discord-white hover:bg-discord-card/80 active:bg-discord-card transition-colors relative"
        aria-label="View Active Managers"
      >
        <Users className="w-4 h-4" />
        <span className="text-xs font-bold tabular-nums text-discord-white">
          {onlineCount}/{totalMembers}
        </span>
        {onlineCount > 0 && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute top-1.5 right-1.5 opacity-75" />
        )}
      </button>
    </header>
  );
};
