import React, { useState, useRef } from 'react';
import { Smile, Send, Reply, X, BarChart2, Plus, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../services/haptics';
import { Message, MessageReply, PollData } from '../types';

const SMART_PINGS = [
  { tag: '@captains', label: 'All Captains', desc: 'All managers with active captains' },
  { tag: '@top4', label: 'Podium Leaders', desc: 'Top 4 in standings' },
  { tag: '@chasing-pack', label: 'Chasing Pack', desc: 'Managers outside the top 3' },
  { tag: '@bench-warmers', label: 'Bench Warmers', desc: 'Managers with benched points' },
];

interface MessageInputProps {
  channelName: string;
  onSendMessage: (content: string, replyTo?: MessageReply) => void;
  onSendPoll?: (poll: PollData) => void;
  memberNames: string[];
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  channelName,
  onSendMessage,
  onSendPoll,
  memberNames,
  replyingTo,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('👑 Who is your Gameweek Captain?');
  const [pollOptions, setPollOptions] = useState<string[]>([
    'Erling Haaland (MCI)',
    'Mohamed Salah (LIV)',
    'Cole Palmer (CHE)',
    'Bukayo Saka (ARS)',
  ]);
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
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleCreatePoll = () => {
    if (!pollQuestion.trim() || !onSendPoll) return;
    const validOptions = pollOptions.filter((o) => o.trim().length > 0);
    if (validOptions.length < 2) return;

    triggerHaptic('medium');
    const poll: PollData = {
      question: pollQuestion.trim(),
      options: validOptions.map((opt) => ({
        id: `opt-${Math.random().toString(36).substr(2, 6)}`,
        text: opt.trim(),
        votes: [],
      })),
      total_votes: 0,
    };

    onSendPoll(poll);
    setShowPollModal(false);
  };

  return (
    <div className="relative p-2.5 bg-discord-darkest border-t border-discord-border/40 select-none z-30">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 mb-2 bg-discord-card/70 border border-discord-border/60 rounded-xl text-xs text-discord-light animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <Reply className="w-3.5 h-3.5 text-discord-blurple shrink-0" />
            <span className="text-discord-muted font-normal">Replying to</span>
            <span className="font-bold text-white truncate">{replyingTo.sender_name}:</span>
            <span className="text-discord-muted truncate italic font-normal">"{replyingTo.content}"</span>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 text-discord-muted hover:text-white rounded-md transition-colors shrink-0"
            title="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Autocomplete Mention Popover */}
      {showMentionPicker && filteredMentions.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-2 bg-discord-darker border border-discord-border rounded-xl shadow-2xl p-1 z-40 max-h-52 overflow-y-auto animate-in fade-in duration-100">
          <div className="text-[10px] font-bold uppercase text-discord-muted px-2 py-1">
            Mention Member or Group
          </div>
          <div className="space-y-0.5">
            {filteredMentions.map((m) => (
              <button
                key={m.tag}
                type="button"
                onClick={() => handleSelectMention(m.tag)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-discord-card text-left transition-colors group"
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

      {/* Captaincy Poll Creation Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-discord-darkest rounded-2xl border border-discord-border/80 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-purple-950/70 via-discord-darker to-discord-darkest flex items-center justify-between border-b border-discord-border/40">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Create Gameweek Poll</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPollModal(false)}
                className="p-1 text-discord-muted hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-discord-muted block mb-1">
                  Question
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full px-3 py-2 bg-discord-darker border border-discord-border/60 rounded-xl text-white text-xs focus:outline-hidden focus:border-purple-500 font-semibold"
                  placeholder="e.g. Who is your GW Captain?"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-discord-muted block mb-1">
                  Options (min 2)
                </label>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...pollOptions];
                          updated[idx] = e.target.value;
                          setPollOptions(updated);
                        }}
                        className="flex-1 px-3 py-1.5 bg-discord-darker border border-discord-border/50 rounded-xl text-white text-xs focus:outline-hidden focus:border-purple-500"
                        placeholder={`Option ${idx + 1}`}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            setPollOptions(pollOptions.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 text-discord-muted hover:text-rose-400 rounded-lg"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {pollOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ''])}
                    className="mt-2 text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Option</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleCreatePoll}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg transition-transform active:scale-98 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Launch Poll in #{channelName}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Input Bar */}
      <div className="flex items-center gap-1.5 bg-discord-chat rounded-2xl px-3 py-1.5 border border-discord-border/50 focus-within:border-discord-blurple transition-all shadow-inner w-full max-w-full overflow-hidden">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}...`}
          className="flex-1 min-w-0 bg-transparent text-sm text-discord-white placeholder-discord-muted focus:outline-hidden pr-1"
        />

        <div className="flex items-center gap-0.5 shrink-0">
          {/* Poll Creator Button */}
          {onSendPoll && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowPollModal(true);
              }}
              className="p-1.5 text-discord-muted hover:text-purple-400 hover:bg-discord-card rounded-lg transition-colors shrink-0"
              title="Create Gameweek Poll"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          )}

          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowEmojiPicker(!showEmojiPicker);
            }}
            className="p-1.5 text-discord-muted hover:text-white hover:bg-discord-card rounded-lg transition-colors shrink-0"
            title="Insert Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim()}
            className={`p-1.5 rounded-xl transition-all shrink-0 flex items-center justify-center ${
              text.trim()
                ? 'bg-discord-blurple text-white shadow-md active:scale-95'
                : 'text-discord-muted/40 cursor-not-allowed'
            }`}
            title="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
