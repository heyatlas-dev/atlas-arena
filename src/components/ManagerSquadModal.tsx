import React, { useEffect, useState } from 'react';
import { X, ShieldAlert, Award, ArrowLeftRight, Sparkles, User, Swords } from 'lucide-react';
import { ManagerSquadData, SquadPlayer } from '../types';
import { fetchManagerFullSquad } from '../services/fplService';
import { ClubCrest } from './ClubCrest';
import { triggerHaptic } from '../services/haptics';

interface ManagerSquadModalProps {
  isOpen: boolean;
  onClose: () => void;
  fplEntryId: number;
  managerName: string;
  teamName: string;
  gwId: number;
  onBattle?: (fplEntryId: number) => void;
}

export const ManagerSquadModal: React.FC<ManagerSquadModalProps> = ({
  isOpen,
  onClose,
  fplEntryId,
  managerName,
  teamName,
  gwId,
  onBattle,
}) => {
  const [squad, setSquad] = useState<ManagerSquadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !fplEntryId) return;

    let isMounted = true;
    setLoading(true);

    fetchManagerFullSquad(fplEntryId, managerName, teamName, gwId).then((res) => {
      if (isMounted) {
        setSquad(res);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, fplEntryId, gwId, managerName, teamName]);

  if (!isOpen) return null;

  // Group starting players by position (1: GK, 2: DEF, 3: MID, 4: FWD)
  const gks = squad?.startingXI.filter((p) => p.element_type === 1) || [];
  const defs = squad?.startingXI.filter((p) => p.element_type === 2) || [];
  const mids = squad?.startingXI.filter((p) => p.element_type === 3) || [];
  const fwds = squad?.startingXI.filter((p) => p.element_type === 4) || [];

  const formation = `${defs.length}-${mids.length}-${fwds.length}`;

  const renderPlayerCard = (p: SquadPlayer, isBench = false) => (
    <div
      key={p.id}
      className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg transition-transform hover:scale-105 select-none ${
        isBench
          ? 'bg-discord-darkest/80 border border-discord-border/50 min-w-[70px]'
          : 'bg-black/60 backdrop-blur-sm border border-emerald-500/30 shadow-lg min-w-[65px] max-w-[80px]'
      }`}
    >
      {/* Captain / Vice Captain Badge */}
      {p.is_captain && (
        <span className="absolute -top-1.5 -right-1 px-1 py-0.2 bg-amber-400 text-black font-black text-[9px] rounded-full shadow-md z-10">
          {p.multiplier === 3 ? '3xC' : 'C'}
        </span>
      )}
      {!p.is_captain && p.is_vice_captain && (
        <span className="absolute -top-1.5 -right-1 px-1 py-0.2 bg-zinc-300 text-black font-black text-[9px] rounded-full shadow-md z-10">
          VC
        </span>
      )}

      {/* Club Crest & Jersey representation */}
      <div className="w-6 h-6 flex items-center justify-center mb-1">
        <ClubCrest teamName={p.team_name} size="sm" />
      </div>

      {/* Player Web Name */}
      <span className="text-[11px] font-bold text-white tracking-tight truncate max-w-[70px] text-center leading-tight">
        {p.web_name}
      </span>

      {/* Team Short Code */}
      <span className="text-[9px] font-medium text-emerald-400/90 font-mono uppercase">
        {p.team_name.substring(0, 3)}
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm max-h-[92vh] flex flex-col bg-discord-darkest border border-discord-border rounded-2xl shadow-2xl overflow-hidden text-discord-white">
        
        {/* Header */}
        <div className="px-4 py-3 bg-discord-darker border-b border-discord-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-discord-blurple/20 flex items-center justify-center text-discord-blurple border border-discord-blurple/30 font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white leading-tight">{managerName}</h3>
              <p className="text-xs text-discord-light truncate max-w-[180px]">{teamName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onBattle && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onClose();
                  onBattle(fplEntryId);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all shadow-xs"
              >
                <Swords className="w-3.5 h-3.5 text-rose-400" />
                <span>Battle</span>
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-1.5 rounded-lg text-discord-muted hover:text-white hover:bg-discord-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Gameweek Badge & Chips Ribbon */}
        <div className="px-4 py-2 bg-discord-chat flex items-center justify-between text-xs border-b border-discord-border/30">
          <div className="flex items-center gap-1.5 font-semibold text-discord-light">
            <span className="text-discord-cyan font-mono font-bold">GW {gwId}</span>
            <span>•</span>
            <span className="text-discord-muted font-mono">{formation}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {squad?.activeChip && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                {squad.activeChip}
              </span>
            )}
            {squad && squad.transfersCost > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3" />
                -{squad.transfersCost} pts hit
              </span>
            )}
          </div>
        </div>

        {/* Content Body: Tactical Pitch */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-discord-muted">
              <div className="w-8 h-8 border-2 border-discord-blurple border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs">Loading Starting XI & Tactical Roster...</p>
            </div>
          ) : !squad ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-discord-muted">
              <ShieldAlert className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs text-discord-light">Squad picks not yet published by FPL for this gameweek.</p>
            </div>
          ) : (
            <>
              {/* Tactical Pitch Container */}
              <div className="relative w-full rounded-xl p-3 bg-gradient-to-b from-emerald-950/70 via-emerald-900/50 to-emerald-950/80 border border-emerald-600/30 overflow-hidden shadow-inner flex flex-col justify-between min-h-[320px]">
                
                {/* Field Markings */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  {/* Center circle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-white rounded-full" />
                  {/* Center line */}
                  <div className="absolute top-1/2 left-0 right-0 border-t border-white" />
                  {/* Goal box top */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-14 border-b border-x border-white" />
                  {/* Goal box bottom */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-14 border-t border-x border-white" />
                </div>

                {/* 1. Goalkeeper Row */}
                <div className="relative z-10 flex justify-center py-1">
                  {gks.map((p) => renderPlayerCard(p))}
                </div>

                {/* 2. Defenders Row */}
                <div className="relative z-10 flex justify-around py-1 gap-1">
                  {defs.map((p) => renderPlayerCard(p))}
                </div>

                {/* 3. Midfielders Row */}
                <div className="relative z-10 flex justify-around py-1 gap-1">
                  {mids.map((p) => renderPlayerCard(p))}
                </div>

                {/* 4. Forwards Row */}
                <div className="relative z-10 flex justify-around py-1 gap-1">
                  {fwds.map((p) => renderPlayerCard(p))}
                </div>
              </div>

              {/* Bench Dugout */}
              <div className="rounded-xl p-2.5 bg-discord-card/40 border border-discord-border/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-discord-muted mb-2 flex items-center justify-between">
                  <span>Substitutes Bench</span>
                  <span className="text-discord-cyan font-mono">4 Subs</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {squad.bench.map((p) => renderPlayerCard(p, true))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-discord-darker border-t border-discord-border/40 text-center">
          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="w-full py-2 rounded-xl bg-discord-card hover:bg-discord-card/80 text-xs font-bold text-white transition-colors"
          >
            Close Squad
          </button>
        </div>
      </div>
    </div>
  );
};
