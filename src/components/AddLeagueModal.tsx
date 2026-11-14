import React, { useState } from 'react';
import { X, Search, Star, Loader2, Check } from 'lucide-react';
import { fetchLeagueStandings } from '../services/fplService';
import { League, LeagueMember } from '../types';
import { triggerHaptic } from '../services/haptics';

interface AddLeagueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeagueImported: (league: League, members: LeagueMember[]) => void;
}

export const AddLeagueModal: React.FC<AddLeagueModalProps> = ({
  isOpen,
  onClose,
  onLeagueImported,
}) => {
  const [leagueIdInput, setLeagueIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const idNum = parseInt(leagueIdInput.trim(), 10);
    if (!idNum || isNaN(idNum)) {
      setError('Please enter a valid numeric FPL League ID.');
      return;
    }

    setLoading(true);
    setError('');
    triggerHaptic('light');

    try {
      const result = await fetchLeagueStandings(idNum);
      triggerHaptic('success');
      onLeagueImported(result.league, result.members);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to import league. Please verify the ID.');
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 max-w-[92vw] bg-discord-darker border border-discord-border rounded-2xl z-50 p-4 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-discord-border">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h3 className="font-extrabold text-sm text-white">Import FPL Mini-League</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-discord-muted hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleImport} className="mt-3.5 space-y-3">
          <div>
            <label className="text-xs text-discord-light block font-semibold mb-1">
              FPL Classic League ID:
            </label>
            <div className="relative">
              <input
                type="number"
                value={leagueIdInput}
                onChange={(e) => setLeagueIdInput(e.target.value)}
                placeholder="e.g. 489201"
                className="w-full bg-discord-darkest border border-discord-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-discord-cyan"
                autoFocus
              />
              <Search className="w-4 h-4 text-discord-muted absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[11px] text-discord-muted mt-1">
              Find this ID in your FPL URL: <span className="font-mono text-discord-light">fantasy.premierleague.com/leagues/<strong>123456</strong>/standings</span>
            </p>
          </div>

          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-discord-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-discord-blurple hover:bg-discord-blurpleHover disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Connecting FPL...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Import & Star</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
