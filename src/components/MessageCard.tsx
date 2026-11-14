import React, { useState } from 'react';
import {
  Bot,
  Trophy,
  Zap,
  AlertTriangle,
  Flame,
  Reply,
  Copy,
  Trash2,
  MoreVertical,
  Check,
  Smile,
  ArrowLeftRight
} from 'lucide-react';
import { Message } from '../types';
import { ClubCrest } from './ClubCrest';
import { triggerHaptic } from '../services/haptics';

interface MessageCardProps {
  message: Message;
  currentUserName?: string;
  onAddReaction: (messageId: string, emoji: string) => void;
  onReplyMessage?: (message: Message) => void;
  onDeleteMessage?: (messageId: string) => void;
}

const COMMON_REACTIONS = ['⚽', '👑', '🔥', '🤡', '😭', '🟥'];

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  currentUserName = 'Manager',
  onAddReaction,
  onReplyMessage,
  onDeleteMessage,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Can delete if it is my own message or a bot message
  const canDelete = Boolean(
    onDeleteMessage &&
      (message.sender_name === currentUserName ||
        message.sender_id === 'me' ||
        message.sender_id.includes(currentUserName) ||
        message.is_bot)
  );

  const handleCopy = () => {
    triggerHaptic('light');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message.content).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setShowActionsMenu(false);
  };

  const handleDelete = () => {
    triggerHaptic('warning');
    if (onDeleteMessage) {
      onDeleteMessage(message.id);
    }
    setShowActionsMenu(false);
  };

  const handleReply = () => {
    triggerHaptic('light');
    if (onReplyMessage) {
      onReplyMessage(message);
    }
    setShowActionsMenu(false);
  };

  // Render smart mentions with styled pills
  const renderFormattedContent = (content: string) => {
    const parts = content.split(/(@[a-zA-Z0-9_\-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const isSmartGroup =
          part.includes('captains') ||
          part.includes('assets') ||
          part.includes('bench') ||
          part.includes('top4');
        return (
          <span
            key={i}
            className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium text-[13px] mx-0.5 cursor-pointer transition-colors ${
              isSmartGroup
                ? 'bg-discord-cyan/20 text-discord-cyan hover:bg-discord-cyan/30'
                : 'bg-discord-blurple/20 text-discord-blurple hover:bg-discord-blurple/30 font-semibold'
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const getAvatarBg = (name: string, isBot: boolean) => {
    if (isBot) return 'bg-gradient-to-br from-discord-blurple to-discord-cyan text-white';
    const colors = [
      'bg-indigo-600',
      'bg-emerald-600',
      'bg-amber-600',
      'bg-rose-600',
      'bg-purple-600',
      'bg-sky-600',
    ];
    const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="group relative flex flex-col px-3.5 py-1.5 hover:bg-discord-hover/20 transition-colors rounded-lg">
      
      {/* 1. DISCORD REPLY THREAD HEADER */}
      {message.reply_to && (
        <div className="flex items-center gap-1.5 ml-6 mb-1 text-[11px] text-discord-muted select-none">
          <div className="w-3 h-2 border-l-2 border-t-2 border-discord-muted/50 rounded-tl shrink-0" />
          <Reply className="w-3 h-3 text-discord-blurple shrink-0" />
          <span className="font-bold text-discord-light">@{message.reply_to.sender_name}</span>
          <span className="truncate max-w-[200px] italic opacity-80">
            "{message.reply_to.snippet}"
          </span>
        </div>
      )}

      {/* 2. MAIN MESSAGE ROW */}
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm select-none ${getAvatarBg(
              message.sender_name,
              message.is_bot
            )}`}
          >
            {message.is_bot ? (
              <Bot className="w-5 h-5 text-white" />
            ) : (
              message.sender_name.charAt(0).toUpperCase()
            )}
          </div>
        </div>

        {/* Message Body */}
        <div className="flex-1 min-w-0 pr-8">
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className={`font-semibold text-sm ${
                message.is_bot
                  ? 'text-discord-cyan flex items-center gap-1.5'
                  : 'text-white hover:underline cursor-pointer'
              }`}
            >
              {message.sender_name}
              {message.is_bot && (
                <span className="bg-discord-blurple text-[10px] uppercase font-bold px-1.5 py-0.2 rounded text-white tracking-wider">
                  BOT
                </span>
              )}
            </span>
            <span className="text-[11px] text-discord-muted">{message.created_at}</span>
          </div>

          {/* Text Content */}
          {message.content && (
            <p className="text-discord-light text-[13.5px] leading-relaxed break-words whitespace-pre-wrap">
              {renderFormattedContent(message.content)}
            </p>
          )}

          {/* Rich Bot Matchday Embed Card */}
          {message.embed_data && (
            <div className="mt-2.5 max-w-md rounded-xl border border-discord-border/80 bg-discord-darkest/90 overflow-hidden shadow-xl">
              <div className="px-3.5 py-2 bg-gradient-to-r from-discord-card to-discord-darker flex items-center justify-between border-b border-discord-border/50">
                <div className="flex items-center gap-2">
                  {message.embed_data.type === 'goal' && (
                    <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  )}
                  {message.embed_data.type === 'assist' && (
                    <Zap className="w-4 h-4 text-amber-400" />
                  )}
                  {message.embed_data.type === 'clean_sheet_lost' && (
                    <AlertTriangle className="w-4 h-4 text-discord-red" />
                  )}
                  {message.embed_data.type === 'red_card' && (
                    <Flame className="w-4 h-4 text-red-500" />
                  )}
                  {message.embed_data.type === 'transfer_reveal' && (
                    <ArrowLeftRight className="w-4 h-4 text-purple-400" />
                  )}
                  <span className="font-extrabold text-xs tracking-wider text-white">
                    {message.embed_data.fixture}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-discord-cyan px-2 py-0.5 rounded bg-discord-cyan/10">
                  {message.embed_data.minute}
                </span>
              </div>

              {/* Scorer / Top Player Details */}
              <div className="p-3 bg-discord-darker/60 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-discord-muted">
                    {message.embed_data.type === 'transfer_reveal' ? 'Top Captaincy Pick:' : 'Scorer:'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <ClubCrest teamName={message.embed_data.player_team} size="xs" />
                    <span className="font-bold text-white flex items-center gap-1">
                      <span>{message.embed_data.player_name}</span>
                      {message.embed_data.pts_scored > 0 && (
                        <span className="text-emerald-400 font-mono">
                          (+{message.embed_data.pts_scored} pts)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {message.embed_data.assist_by && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-discord-muted">Assist:</span>
                    <span className="font-medium text-discord-light">
                      {message.embed_data.assist_by}
                    </span>
                  </div>
                )}
              </div>

              {/* Impact Analysis Section */}
              {message.embed_data.impact_items && message.embed_data.impact_items.length > 0 && (
                <div className="p-3 bg-discord-card/30 border-t border-discord-border/40">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-discord-cyan mb-1.5 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" />
                    <span>League Impact</span>
                  </div>
                  <div className="space-y-1">
                    {message.embed_data.impact_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs flex items-start gap-1.5 text-discord-light"
                      >
                        <span className={item.positive ? 'text-emerald-400' : 'text-rose-400'}>
                          {item.positive ? '•' : '×'}
                        </span>
                        <span>{renderFormattedContent(item.text)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reaction Pills */}
          <div className="flex flex-wrap gap-1.5 mt-2 select-none items-center">
            {message.reactions &&
              Object.entries(message.reactions).map(([emoji, users]) => {
                const hasReacted = users.includes(currentUserName);
                return (
                  <button
                    key={emoji}
                    onClick={() => {
                      triggerHaptic('light');
                      onAddReaction(message.id, emoji);
                    }}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all ${
                      hasReacted
                        ? 'bg-discord-blurple/20 border-discord-blurple text-discord-white shadow-sm'
                        : 'bg-discord-card/50 border-discord-border/60 text-discord-light hover:bg-discord-card hover:border-discord-border'
                    }`}
                    title={users.join(', ')}
                  >
                    <span>{emoji}</span>
                    <span className="text-[11px] font-mono">{users.length}</span>
                  </button>
                );
              })}

            {/* Quick Add Reaction Button */}
            <div className="relative">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowPicker(!showPicker);
                }}
                className="px-1.5 py-0.5 text-discord-muted hover:text-white rounded hover:bg-discord-card text-xs transition-colors opacity-70 group-hover:opacity-100"
                title="Add reaction"
              >
                +
              </button>

              {showPicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowPicker(false)} />
                  <div className="absolute left-0 bottom-full mb-1 z-40 flex items-center gap-1 p-1 bg-discord-darkest border border-discord-border rounded-xl shadow-xl animate-in fade-in duration-100">
                    {COMMON_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          triggerHaptic('medium');
                          onAddReaction(message.id, emoji);
                          setShowPicker(false);
                        }}
                        className="p-1.5 hover:bg-discord-card rounded-lg hover:scale-125 transition-transform text-base"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. DISCORD HOVER / TAP ACTIONS TOOLBAR */}
      <div className="absolute top-2 right-2 flex items-center bg-discord-darker/90 border border-discord-border/80 rounded-lg shadow-md opacity-85 group-hover:opacity-100 transition-opacity z-20">
        {/* Reply Action */}
        {onReplyMessage && (
          <button
            type="button"
            onClick={handleReply}
            title="Reply"
            className="p-1.5 text-discord-muted hover:text-white hover:bg-discord-card rounded-l-lg transition-colors"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Copy Action */}
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy Text'}
          className="p-1.5 text-discord-muted hover:text-white hover:bg-discord-card transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* Delete Action (Available for user messages & bot pings) */}
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            title="Delete Message"
            className="p-1.5 text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/20 rounded-r-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
