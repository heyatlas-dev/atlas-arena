import React from 'react';
import { Download, Sparkles, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { ReleaseInfo, CURRENT_APP_VERSION } from '../services/updateService';
import { triggerHaptic } from '../services/haptics';
import { AtlasLogo } from './AtlasLogo';

interface UpdateModalProps {
  isOpen: boolean;
  updateInfo: ReleaseInfo | null;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  updateInfo,
  onClose,
}) => {
  if (!isOpen || !updateInfo) return null;

  const handleDownload = () => {
    triggerHaptic('medium');
    // Open direct download link in external browser/downloader
    if (updateInfo.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_system');
    }
  };

  // Parse release notes or fall back to high-level bullets
  const notesLines = updateInfo.body
    ? updateInfo.body
        .split('\n')
        .map((l) => l.trim().replace(/^[-*•]\s*/, ''))
        .filter((l) => l.length > 0 && !l.startsWith('#'))
        .slice(0, 5)
    : [
        'Live Premier League matchday scoreboard overhaul',
        'Real-time message deletion across all devices',
        'Notch & status bar safe-area collision fix',
        'Full multi-word manager mention styling',
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-discord-darkest border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Glowing Header */}
        <div className="relative bg-gradient-to-br from-emerald-600 via-teal-700 to-discord-darkest p-5 text-center overflow-hidden">
          {/* Subtle glow circle */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex p-3 rounded-2xl bg-black/40 border border-emerald-400/30 shadow-lg mb-2">
            <AtlasLogo size={36} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-mono text-[11px] font-bold mb-1">
            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            <span>New Version Ready</span>
          </div>

          <h2 className="text-xl font-black text-white tracking-wide">
            Update Available
          </h2>
          <p className="text-xs text-emerald-100/80 mt-0.5">
            Upgrade from <span className="font-mono font-bold text-white">v{CURRENT_APP_VERSION}</span> to{' '}
            <span className="font-mono font-bold text-emerald-300">{updateInfo.tagName}</span>
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div>
            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-discord-light mb-2">
              What's New in {updateInfo.tagName}:
            </h4>
            <div className="bg-discord-card/50 border border-discord-border/50 rounded-2xl p-3 space-y-2">
              {notesLines.map((line, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-discord-white">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-tight">{line}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <a
              href={updateInfo.downloadUrl}
              onClick={handleDownload}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-950/50 active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download & Install APK</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </a>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-discord-light hover:text-white transition-colors"
            >
              Later
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
