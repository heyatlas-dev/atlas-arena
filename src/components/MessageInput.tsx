import React, { useState, useRef } from 'react';
import { Smile, Send, Reply, X } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';
import { Message, MessageReply } from '../types';

const SMART_PINGS = [
  { tag: '@captains', label: 'All Captains', desc: 'All managers with active captains' },
  { tag: '@top4', label: 'Podium Leaders', desc: 'Top 4 in standings' },
  { tag: '@chasing-pack', label: 'Chasing Pack', desc: 'Managers outside the top 3' },
  { tag: '@bench-warmers', label: 'Bench Warmers', desc: 'Managers with benched points' },
];

interface MessageInputProps {
  channelName: string;
  onSendMessage: (content: string, replyTo?: MessageReply) => void;
  memberNames: string[];
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  channelName,
  onSendMessage,
  memberNames,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const EMOJIS = ['⚽', '👑', '🔥', '🤡', '😭', '🟥', '🎉', '💀', '🧤', '🎯'];

  // Combine smart pings and real manager names for @ autocomplete
  const allMentions = [
    ...SMART_PINGS.map((p) => ({
      tag: p.tag,
      label: p.label,
      desc: p.desc,
      isGroup: true,
    })),
    ...memberNames.map((name) => ({
      tag: `@${name}`,
      label: name,
      desc: 'Manager',
      isGroup: false,
    })),
  ];

  const filteredMentions = allMentions.filter((m) =>
    m.tag.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    const lastWord = val.split(' ').pop() || '';
    if (lastWord.startsWith('@')) {
      setMentionFilter(lastWord);
      setShowMentionPicker(true);
    } else {
      setShowMentionPicker(false);
    }
  };

  const handleSelectMention = (tag: string) => {
    triggerHaptic('light');
    const words = text.split(' ');
    words.pop();
    words.push(tag);
    setText(words.join(' ') + ' ');
    setShowMentionPicker(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    triggerHaptic('medium');

    const replyData: MessageReply | undefined = replyingTo
      ? {
          message_id: replyingTo.id,
          sender_name: replyingTo.sender_name,
          snippet: replyingTo.content.substring(0, 60),
        }
      : undefined;

    onSendMessage(text.trim(), replyData);
    setText('');
    setShowMentionPicker(false);
    setShowEmojiPicker(false);
    if (onCancelReply) {
      onCancelReply();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative px-3 py-2 bg-discord-darkest border-t border-discord-border/30">
      {/* Discord Replying Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-discord-card/90 rounded-xl border border-discord-border/60 text-xs animate-in slide-in-from-bottom-1 duration-150">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <Reply className="w-3.5 h-3.5 text-discord-blurple shrink-0" />
            <span className="text-discord-muted shrink-0">Replying to</span>
            <strong className="text-white truncate">@{replyingTo.sender_name}:</strong>
            <span className="text-discord-muted truncate italic opacity-85">
              "{replyingTo.content.substring(0, 35)}..."
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 text-discord-muted hover:text-white rounded-md shrink-0 hover:bg-discord-darker"
            title="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Smart Mention Autocomplete Popover */}
      {showMentionPicker && filteredMentions.length > 0 && (
        <div className="absolute left-3 right-3 bottom-full mb-2 bg-discord-darker border border-discord-border rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-2 bg-discord-card/80 border-b border-discord-border text-[11px] font-bold text-discord-cyan uppercase tracking-wider flex items-center justify-between">
            <span>Smart FPL Mentions</span>
            <span className="text-discord-muted font-normal lowercase">Tab or tap to insert</span>
          </div>
          <div className="p-1 space-y-0.5">
            {filteredMentions.map((m) => (
              <button
                key={m.tag}
                type="button"
                onClick={() => handleSelectMention(m.tag)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-discord-card text-left transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold text-xs px-1.5 py-0.5 rounded ${
                      m.isGroup
                        ? 'bg-discord-cyan/20 text-discord-cyan group-hover:bg-discord-cyan group-hover:text-black'
                        : 'bg-discord-blurple/20 text-discord-blurple group-hover:bg-discord-blurple group-hover:text-white'
                    }`}
                  >
                    {m.tag}
                  </span>
                  <span className="text-xs text-discord-light">{m.label}</span>
                </div>
                <span className="text-[11px] text-discord-muted italic truncate max-w-[150px]">
                  {m.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowEmojiPicker(false)} />
          <div className="absolute right-3 bottom-full mb-2 bg-discord-darker border border-discord-border rounded-2xl shadow-2xl p-2.5 z-40 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-[10px] font-bold uppercase text-discord-muted mb-2 px-1">
              Matchday Emojis
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setText((prev) => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-discord-card rounded-lg transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main Chat Input Bar */}
      <div className="flex items-center gap-2 bg-discord-chat rounded-2xl px-3.5 py-2 border border-discord-border/50 focus-within:border-discord-blurple transition-all shadow-inner">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}... (use @ to mention)`}
          className="flex-1 bg-transparent text-sm text-discord-white placeholder-discord-muted focus:outline-hidden"
        />

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setShowEmojiPicker(!showEmojiPicker);
          }}
          className="p-1 text-discord-muted hover:text-white hover:bg-discord-card rounded-lg transition-colors"
          title="Insert Emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim()}
          className={`p-1.5 rounded-xl transition-all ${
            text.trim()
              ? 'bg-discord-blurple text-white shadow-md active:scale-95'
              : 'text-discord-muted/40 cursor-not-allowed'
          }`}
          title="Send Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
