import React, { useState } from 'react';
import { Trophy, Star, ArrowRight, Loader2, CheckCircle2, AlertCircle, HelpCircle, Lock, User } from 'lucide-react';
import { fetchUserFPLProfile, fetchLeagueStandings, FPLUserEntry } from '../services/fplService';
import { UserAccount, hashPassword, saveLocalAccount, syncAccountToCloud, loginWithCredentials } from '../services/accountService';
import { League, LeagueMember } from '../types';
import { triggerHaptic } from '../services/haptics';
import { AtlasLogo } from './AtlasLogo';

interface AuthOnboardingModalProps {
  isOpen: boolean;
  onComplete: (account: UserAccount, leagues: League[], activeLeague: League, members: LeagueMember[]) => void;
}

export const AuthOnboardingModal: React.FC<AuthOnboardingModalProps> = ({ isOpen, onComplete }) => {
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [step, setStep] = useState<1 | 2>(1);
  const [teamIdInput, setTeamIdInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showIdHelp, setShowIdHelp] = useState(false);

  // Profile fetched in Step 1
  const [userProfile, setUserProfile] = useState<FPLUserEntry | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

  if (!isOpen) return null;

  // Handle Form Submission for Step 1
  const handleStepOneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const idNum = parseInt(teamIdInput.trim(), 10);
    if (!idNum || isNaN(idNum)) {
      setError('Please enter a valid numeric FPL Team ID.');
      return;
    }
    if (!passwordInput.trim() || passwordInput.trim().length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setError('');
    setLoading(true);
    triggerHaptic('light');

    // If Mode is LOGIN:
    if (mode === 'login') {
      try {
        const loginRes = await loginWithCredentials(idNum, passwordInput.trim());
        if (!loginRes.success || !loginRes.account) {
          setError(loginRes.error || 'Login failed. Please check your credentials.');
          triggerHaptic('error');
          setLoading(false);
          return;
        }

        const account = loginRes.account;

        // Fetch user's real leagues to resume
        const profile = await fetchUserFPLProfile(idNum);
        const classicLeagues = profile.leagues?.classic || [];
        const allLeagues: League[] = classicLeagues.map((cl) => ({
          id: `league-${cl.id}`,
          fpl_league_id: cl.id,
          name: cl.name,
          is_starred: `league-${cl.id}` === account.starredLeagueId || cl.id === Number(account.starredLeagueId),
        }));

        const targetLeague = allLeagues.find((l) => l.is_starred) || allLeagues[0];
        const standings = targetLeague
          ? await fetchLeagueStandings(targetLeague.fpl_league_id, idNum)
          : { league: targetLeague, members: [] };

        triggerHaptic('success');
        onComplete(account, allLeagues, standings.league || targetLeague, standings.members);
      } catch (err: any) {
        setError(err?.message || 'Login failed. Please check your connection.');
        triggerHaptic('error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Mode is SIGNUP: Fetch real FPL profile
    try {
      const profile = await fetchUserFPLProfile(idNum);
      setUserProfile(profile);

      const classicLeagues = profile.leagues?.classic || [];
      if (classicLeagues.length > 0) {
        setSelectedLeagueId(classicLeagues[0].id);
      } else {
        setError('No classic leagues found on FPL for this team. Please join a mini-league on FPL first.');
        setLoading(false);
        return;
      }

      triggerHaptic('success');
      setStep(2);
    } catch (err: any) {
      setError(err?.message || 'Could not find FPL Team. Please verify your Team ID.');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Choose default league & finish registration
  const handleCompleteRegistration = async () => {
    if (!selectedLeagueId || !userProfile) return;

    setLoading(true);
    setError('');
    triggerHaptic('medium');

    try {
      // 1. Fetch real standings for the chosen default league
      const result = await fetchLeagueStandings(selectedLeagueId, userProfile.id);

      // 2. Map user's actual classic leagues from FPL
      const classicLeagues = userProfile.leagues?.classic || [];
      const allLeagues: League[] = classicLeagues.map((cl) => ({
        id: `league-${cl.id}`,
        fpl_league_id: cl.id,
        name: cl.name,
        is_starred: cl.id === selectedLeagueId,
      }));

      // 3. Create the account
      const account: UserAccount = {
        teamId: userProfile.id,
        passwordHash: hashPassword(passwordInput.trim()),
        managerName: `${userProfile.player_first_name} ${userProfile.player_last_name}`.trim(),
        teamName: userProfile.name,
        overallPoints: userProfile.summary_overall_points || 0,
        overallRank: userProfile.summary_overall_rank || 0,
        starredLeagueId: result.league.id,
        createdAt: new Date().toISOString(),
      };

      // 4. Save locally & attempt cloud sync
      saveLocalAccount(account);
      syncAccountToCloud(account).catch(() => {});

      triggerHaptic('success');
      onComplete(account, allLeagues, result.league, result.members);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize league. Please try again.');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="w-full max-w-sm bg-discord-darkest border border-discord-border/80 rounded-3xl shadow-2xl p-6 text-discord-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-2">
            <AtlasLogo size={52} />
          </div>
          <h2 className="text-xl font-black tracking-wider text-white">ATLAS ARENA</h2>
          <p className="text-[11px] text-discord-muted mt-0.5">
            {mode === 'signup'
              ? 'Create your account using your FPL Team ID'
              : 'Log in with your FPL Team ID and password'}
          </p>
        </div>

        {/* Auth Mode Toggle Pill */}
        {step === 1 && (
          <div className="flex bg-discord-darker p-1 rounded-xl mb-4 text-xs font-bold border border-discord-border/40">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-discord-blurple text-white shadow'
                  : 'text-discord-muted hover:text-white'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-discord-blurple text-white shadow'
                  : 'text-discord-muted hover:text-white'
              }`}
            >
              Log In
            </button>
          </div>
        )}

        {/* STEP 1: Enter FPL Team ID & Password */}
        {step === 1 && (
          <form onSubmit={handleStepOneSubmit} className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-discord-light uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-discord-cyan" />
                  <span>FPL Team ID (Username)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowIdHelp(!showIdHelp)}
                  className="text-[10px] text-discord-cyan hover:underline flex items-center gap-0.5"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Where is this?</span>
                </button>
              </div>
              <input
                type="number"
                value={teamIdInput}
                onChange={(e) => setTeamIdInput(e.target.value)}
                placeholder="e.g. 123456"
                className="w-full bg-discord-darker border border-discord-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-discord-muted/50 focus:outline-none focus:border-discord-blurple transition-colors"
                autoFocus
              />
            </div>

            {showIdHelp && (
              <div className="p-3 bg-discord-card/50 border border-discord-border rounded-xl text-[11px] text-discord-light space-y-1 animate-in fade-in duration-100">
                <p className="font-bold text-white">Finding your FPL Team ID:</p>
                <p>1. Open <span className="text-discord-cyan">fantasy.premierleague.com</span>.</p>
                <p>2. Tap the <strong>Points</strong> tab.</p>
                <p>3. Your URL contains: <span className="font-mono text-emerald-400 font-bold">.../entry/123456/event/...</span></p>
                <p className="text-discord-muted">Enter that number as your username.</p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-discord-light uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-discord-blurple" />
                <span>Arena Password</span>
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-discord-darker border border-discord-border rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-discord-muted/50 focus:outline-none focus:border-discord-blurple transition-colors"
              />
              <span className="text-[10px] text-discord-muted mt-0.5 block">
                {mode === 'signup'
                  ? 'Your Arena password to access and sync on any device.'
                  : 'Enter the password for your Arena account.'}
              </span>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-discord-blurple hover:bg-discord-blurpleHover disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to FPL...</span>
                </>
              ) : mode === 'signup' ? (
                <>
                  <span>Verify Team & Fetch My Leagues</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Log In to Arena</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Choose Default League from Real FPL Leagues */}
        {step === 2 && userProfile && (
          <div className="space-y-4">
            <div className="p-3 bg-discord-darker border border-discord-border rounded-xl">
              <div className="text-[10px] text-discord-muted uppercase font-bold tracking-wider">
                FPL Manager Verified
              </div>
              <div className="font-extrabold text-white text-sm mt-0.5">
                {userProfile.player_first_name} {userProfile.player_last_name}
              </div>
              <div className="text-xs text-emerald-400 font-semibold">{userProfile.name}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-discord-light uppercase tracking-wider mb-2">
                Which league should be your Default (Starred) League?
              </label>
              
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {userProfile.leagues?.classic && userProfile.leagues.classic.length > 0 ? (
                  userProfile.leagues.classic.map((lg) => {
                    const isSelected = selectedLeagueId === lg.id;
                    return (
                      <div
                        key={lg.id}
                        onClick={() => {
                          triggerHaptic('light');
                          setSelectedLeagueId(lg.id);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-discord-card border-amber-400/90 shadow-md ring-1 ring-amber-400/50'
                            : 'bg-discord-darker/60 border-discord-border/60 hover:bg-discord-card/40'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                            <Star
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-amber-400 fill-amber-400' : 'text-discord-muted'
                              }`}
                            />
                            <span className="truncate">{lg.name}</span>
                          </div>
                          <div className="text-[10px] text-discord-muted mt-0.5">
                            Your Current Rank: #{lg.entry_rank || lg.rank || 1}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-rose-300">No classic leagues found on FPL for this team.</p>
                )}
              </div>
              <span className="text-[10px] text-discord-muted mt-1.5 block">
                ATLAS Arena will boot straight into this league with live banter and matchday pings.
              </span>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-3 bg-discord-card hover:bg-discord-hover text-discord-light text-xs font-bold rounded-xl transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCompleteRegistration}
                disabled={loading || !selectedLeagueId}
                className="flex-1 py-2.5 bg-discord-blurple hover:bg-discord-blurpleHover disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Launching Arena...</span>
                  </>
                ) : (
                  <>
                    <span>Set Default & Enter Arena</span>
                    <Star className="w-3.5 h-3.5 fill-current" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
