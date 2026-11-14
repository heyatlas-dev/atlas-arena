import React, { useState } from 'react';
import {
  X,
  Star,
  Plus,
  UserCheck,
  Check,
  Smartphone,
  LogOut,
  ChevronDown,
  Sparkles,
  Volume2,
  VolumeX,
  Palette,
  Bell,
  BellOff,
  Radio,
} from 'lucide-react';
import { League } from '../types';
import { triggerHaptic } from '../services/haptics';
import { UserAccount } from '../services/accountService';
import { sounds } from '../services/soundEffects';
import { THEMES, getSavedTheme, applyTheme, ArenaTheme } from '../services/themeService';
import { notificationService } from '../services/notificationService';
import { AtlasLogo } from './AtlasLogo';

interface LeftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leagues: League[];
  currentLeague: League;
  onSelectLeague: (league: League) => void;
  onOpenAddLeague: () => void;
  onToggleStarLeague: (leagueId: string) => void;
  userAccount: UserAccount | null;
  onLogout: () => void;
  onOpenFixtures?: () => void;
}

export const LeftDrawer: React.FC<LeftDrawerProps> = ({
  isOpen,
  onClose,
  leagues,
  currentLeague,
  onSelectLeague,
  onOpenAddLeague,
  onToggleStarLeague,
  userAccount,
  onLogout,
  onOpenFixtures,
}) => {
  const [activeTab, setActiveTab] = useState<'leagues' | 'account'>('leagues');
  const [changeDefaultOpen, setChangeDefaultOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => sounds.isEnabled());
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => notificationService.isEnabled());
  const [currentTheme, setCurrentTheme] = useState<ArenaTheme>(() => getSavedTheme());

  if (!isOpen) return null;

  // Starred league is either the one marked is_starred or currentLeague
  const starredLeague = leagues.find((l) => l.is_starred) || currentLeague || leagues[0];
  const otherLeagues = leagues.filter((l) => l.id !== starredLeague?.id);

  const handleSelectNewDefault = (league: League) => {
    triggerHaptic('success');
    sounds.playSuccess();
    onToggleStarLeague(league.id);
    onSelectLeague(league);
    setChangeDefaultOpen(false);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    sounds.setEnabled(next);
    setSoundEnabled(next);
    if (next) {
      sounds.playChime();
    }
    triggerHaptic('light');
  };

  const handleSelectTheme = (theme: ArenaTheme) => {
    triggerHaptic('medium');
    applyTheme(theme);
    setCurrentTheme(theme);
    sounds.playSuccess();
  };

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
      <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-discord-darkest border-r border-discord-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-discord-border/60 bg-discord-darker">
          <div className="flex items-center gap-2">
            <AtlasLogo size={26} className="shrink-0" />
            <h2 className="font-extrabold text-sm tracking-wider text-white">ATLAS ARENA</h2>
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

        {/* Premier League Fixtures & Squad Radar Quick Launcher */}
        {onOpenFixtures && (
          <div className="p-2.5 bg-gradient-to-r from-rose-950/40 via-discord-darker to-discord-darkest border-b border-discord-border/40">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onClose();
                onOpenFixtures();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-rose-900/40 to-discord-card/80 border border-rose-500/40 hover:border-rose-400 text-white transition-all shadow-md group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                  <Radio className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-extrabold text-xs text-white">Premier League Fixtures</span>
                  <span className="text-[10px] text-discord-light">Live Scores & Squad Radar</span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                Radar
              </span>
            </button>
          </div>
        )}

        {/* Sub-navigation tabs */}
        <div className="flex items-center px-3 py-2 bg-discord-darker/60 border-b border-discord-border/30 gap-1 text-xs">
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('leagues');
            }}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'leagues'
                ? 'bg-discord-card text-white'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            My Leagues
          </button>
          <button
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('account');
            }}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'account'
                ? 'bg-discord-card text-white'
                : 'text-discord-muted hover:text-white'
            }`}
          >
            Arena Account
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: MY LEAGUES */}
          {activeTab === 'leagues' && (
            <div className="space-y-4">
              
              {/* 1. TOP SECTION: THE STARRED (DEFAULT) LEAGUE */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Default Starred League</span>
                  </span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                    BOOTS FIRST
                  </span>
                </div>

                {starredLeague ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-discord-card to-discord-darker border-2 border-amber-400/80 shadow-lg relative overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                          <span className="font-extrabold text-sm text-white truncate">
                            {starredLeague.name}
                          </span>
                        </div>
                        <div className="text-xs text-discord-muted font-mono mt-1">
                          FPL League ID: <strong className="text-discord-light">{starredLeague.fpl_league_id}</strong>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-discord-blurple text-white shrink-0">
                        ACTIVE
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-discord-border/50 text-[10px] text-discord-muted flex items-center justify-between">
                      <span>Boots immediately without clutter</span>
                      <span className="text-emerald-400 font-semibold">Ready</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-discord-card text-xs text-discord-muted">
                    No default league selected.
                  </div>
                )}
              </div>

              {/* 2. CHANGE DEFAULT LEAGUE DROPDOWN SELECTOR */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setChangeDefaultOpen(!changeDefaultOpen);
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-discord-darker hover:bg-discord-card border border-discord-border text-white text-xs font-bold transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-discord-cyan" />
                    <span>Change Default League</span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-discord-muted transition-transform duration-150 ${
                      changeDefaultOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu of Other Leagues */}
                {changeDefaultOpen && (
                  <div className="mt-1.5 p-1 bg-discord-darker border border-discord-border rounded-xl shadow-2xl max-h-56 overflow-y-auto animate-in fade-in duration-100 space-y-0.5">
                    <div className="px-2 py-1 text-[10px] font-bold text-discord-muted uppercase tracking-wider">
                      Select League to Star:
                    </div>
                    {leagues.map((lg) => {
                      const isStarred = lg.id === starredLeague?.id;
                      return (
                        <div
                          key={lg.id}
                          onClick={() => handleSelectNewDefault(lg)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors text-xs ${
                            isStarred
                              ? 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/30'
                              : 'text-discord-light hover:bg-discord-card hover:text-white'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="truncate font-semibold flex items-center gap-1.5">
                              <Star
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isStarred ? 'text-amber-400 fill-amber-400' : 'text-discord-muted'
                                }`}
                              />
                              <span className="truncate">{lg.name}</span>
                            </div>
                            <div className="text-[10px] text-discord-muted font-mono mt-0.5">
                              ID: {lg.fpl_league_id}
                            </div>
                          </div>
                          {isStarred ? (
                            <span className="text-[10px] font-bold text-amber-400">Current</span>
                          ) : (
                            <span className="text-[10px] text-discord-cyan font-semibold">Make Default</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. SWITCH ACTIVE LEAGUE LIST */}
              <div className="pt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-discord-muted mb-2">
                  All Your Mini-Leagues ({leagues.length})
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {leagues.map((lg) => {
                    const isCurrent = lg.id === currentLeague.id;
                    const isStarred = lg.id === starredLeague?.id;
                    return (
                      <div
                        key={lg.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                          isCurrent
                            ? 'bg-discord-card/90 border-discord-blurple shadow-md'
                            : 'bg-discord-darker/50 border-discord-border/50 hover:bg-discord-card/50'
                        }`}
                        onClick={() => {
                          triggerHaptic('medium');
                          onSelectLeague(lg);
                          onClose();
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
                            className="p-1 hover:scale-125 transition-transform"
                            title={isStarred ? 'Current Default League' : 'Make Default'}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isStarred
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-discord-muted hover:text-amber-400'
                              }`}
                            />
                          </button>
                          <div className="min-w-0">
                            <span className="font-semibold text-xs text-white truncate block">
                              {lg.name}
                            </span>
                            <span className="text-[10px] text-discord-muted font-mono block">
                              ID: {lg.fpl_league_id}
                            </span>
                          </div>
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-discord-blurple text-white">
                            OPEN
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Import another FPL league button */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                  onOpenAddLeague();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-discord-cyan bg-discord-cyan/10 hover:bg-discord-cyan/20 border border-discord-cyan/30 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Import Another FPL League</span>
              </button>

              <div className="p-3 rounded-xl bg-discord-darker/60 border border-discord-border/50 text-[11px] text-discord-muted space-y-1">
                <div className="font-bold text-discord-light flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-discord-cyan" />
                  <span>The Starred League Paradigm</span>
                </div>
                <p>
                  Your Default Starred League boots automatically on app launch, skipping messy server and channel sidebars.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ARENA ACCOUNT */}
          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-discord-darker to-discord-card border border-discord-border shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-wider text-discord-cyan mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>Verified FPL Profile</span>
                </div>
                {userAccount ? (
                  <div className="space-y-2">
                    <div className="text-base font-extrabold text-white">
                      {userAccount.managerName}
                    </div>
                    <div className="text-xs text-emerald-400 font-bold">
                      {userAccount.teamName}
                    </div>

                    <div className="pt-2 border-t border-discord-border/40 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-discord-muted block text-[10px]">Team ID:</span>
                        <span className="font-mono font-bold text-white">#{userAccount.teamId}</span>
                      </div>
                      <div>
                        <span className="text-discord-muted block text-[10px]">Overall Rank:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          #{userAccount.overallRank ? userAccount.overallRank.toLocaleString() : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-discord-light">No account connected.</p>
                )}
              </div>

              {/* 🎨 CUSTOM ACCENT THEME SELECTOR */}
              <div className="p-3.5 rounded-xl bg-discord-darker border border-discord-border space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-discord-light flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-discord-cyan" />
                    <span>Arena Accent Theme</span>
                  </span>
                  <span className="text-[10px] text-discord-muted font-mono">{currentTheme.name}</span>
                </div>

                <div className="grid grid-cols-5 gap-2 pt-1">
                  {THEMES.map((theme) => {
                    const isSelected = theme.id === currentTheme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleSelectTheme(theme)}
                        title={theme.name}
                        className={`h-9 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-discord-darkest shadow-md'
                            : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ backgroundColor: theme.accentHex }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 🔊 SOUND EFFECTS & AUDIO SETTINGS */}
              <div className="p-3.5 rounded-xl bg-discord-darker border border-discord-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-discord-muted" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">Sound Effects</div>
                      <div className="text-[10px] text-discord-muted">Discord pops & reaction chimes</div>
                    </div>
                  </div>

                  {/* Toggle Pill */}
                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      soundEnabled ? 'bg-emerald-500' : 'bg-discord-card'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        soundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {soundEnabled && (
                  <button
                    type="button"
                    onClick={() => sounds.playChime()}
                    className="w-full py-1 px-2 rounded-lg bg-discord-card/70 hover:bg-discord-card text-[10px] font-bold text-discord-cyan flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>▶ Test Discord Chime</span>
                  </button>
                )}
              </div>

              {/* 🔔 PUSH NOTIFICATIONS */}
              <div className="p-3.5 rounded-xl bg-discord-darker border border-discord-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {notificationsEnabled ? (
                      <Bell className="w-4 h-4 text-amber-400" />
                    ) : (
                      <BellOff className="w-4 h-4 text-discord-muted" />
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">Matchday Notifications</div>
                      <div className="text-[10px] text-discord-muted">1-hr deadline warning & rival haul alerts</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !notificationsEnabled;
                      notificationService.setEnabled(next);
                      setNotificationsEnabled(next);
                      triggerHaptic('light');
                    }}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                      notificationsEnabled ? 'bg-amber-500' : 'bg-discord-card'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {notificationsEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      notificationService.sendInstantAlert(
                        '⚽ GOAL ALERT: Erling Haaland',
                        'Erling Haaland scores for Man City! (+4 pts)'
                      );
                    }}
                    className="w-full py-1 px-2 rounded-lg bg-discord-card/70 hover:bg-discord-card text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>▶ Send Test Notification</span>
                  </button>
                )}
              </div>

              {/* Log Out / Switch Account */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    onLogout();
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Switch / Log Out Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
