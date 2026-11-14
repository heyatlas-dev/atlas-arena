import React, { useState, useEffect, useRef } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { League, LeagueMember, Message, ChannelId, MessageReply, PollData } from './types';
import { TopBar } from './components/TopBar';
import { ChannelTabs } from './components/ChannelTabs';
import { GameweekTicker } from './components/GameweekTicker';
import { MessageCard } from './components/MessageCard';
import { MessageInput } from './components/MessageInput';
import { LeftDrawer } from './components/LeftDrawer';
import { RightDrawer } from './components/RightDrawer';
import { H2HView } from './components/H2HView';
import { TableView } from './components/TableView';
import { AddLeagueModal } from './components/AddLeagueModal';
import { AuthOnboardingModal } from './components/AuthOnboardingModal';
import { UserAccount, getLocalAccount, clearLocalAccount, syncAccountToCloud } from './services/accountService';
import { triggerHaptic } from './services/haptics';
import { sounds } from './services/soundEffects';
import {
  fetchLeagueStandings,
  fetchGameweekState,
  getCachedGameweekState,
  enrichLeagueMembersWithRealPicks,
  getEstimatedSeasonGameweek,
  GameweekInfo,
} from './services/fplService';
import { fplBot } from './services/fplBotService';
import { transferBot } from './services/transferBotService';
import { ManagerSquadModal } from './components/ManagerSquadModal';
import { LiveFixturesModal } from './components/LiveFixturesModal';
import { notificationService } from './services/notificationService';
import { realtimeChat } from './services/realtimeChatService';
import { checkForAppUpdates, ReleaseInfo } from './services/updateService';
import { gameweekRecap } from './services/gameweekRecapService';
import { Sparkles, X } from 'lucide-react';

export const App: React.FC = () => {
  // --- One-time clean-up of legacy mock data & corrupt "Player 123" cache ---
  useEffect(() => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('atlas_picks_') || key.startsWith('atlas_members_')) {
        const val = localStorage.getItem(key);
        if (val && (val.includes('Player ') || val.includes('Asset #') || val.includes('Player 350'))) {
          localStorage.removeItem(key);
        }
      }
    });

    const cleaned = localStorage.getItem('atlas_cleaned_mocks_v7');
    if (!cleaned) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('atlas_picks_') || key.startsWith('atlas_members_')) {
          localStorage.removeItem(key);
        }
      });
      localStorage.setItem('atlas_cleaned_mocks_v7', 'true');
    }
  }, []);

  // --- Configure Native Status Bar & Audio Context Pre-warm ---
  useEffect(() => {
    try {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#1e1f22' }).catch(() => {});
    } catch {
      // Ignore in browser
    }

    const unlockAudio = () => {
      sounds.unlock();
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // --- Dynamic Gameweek State (Recent, Upcoming, Deadline, Live status) ---
  const [gwInfo, setGwInfo] = useState<GameweekInfo | null>(() => getCachedGameweekState());

  useEffect(() => {
    fetchGameweekState().then((info) => {
      setGwInfo(info);
      if (info && info.upcomingGwId && info.deadlineIso) {
        notificationService.scheduleDeadlineAlert(info.upcomingGwId, info.deadlineIso);
      }
    });
  }, []);

  // --- User Account State ---
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    return getLocalAccount();
  });

  const [showOnboarding, setShowOnboarding] = useState<boolean>(!userAccount);

  // Sync active account to Supabase arena_users table
  useEffect(() => {
    if (userAccount) {
      syncAccountToCloud(userAccount).catch(() => {});
    }
  }, [userAccount]);

  // --- Leagues State ---
  const [leagues, setLeagues] = useState<League[]>(() => {
    const saved = localStorage.getItem('atlas_leagues');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentLeague, setCurrentLeague] = useState<League>(() => {
    const saved = localStorage.getItem('atlas_current_league');
    if (saved) return JSON.parse(saved);
    const starred = leagues.find((l) => l.is_starred);
    return (
      starred ||
      leagues[0] || {
        id: 'league-init',
        fpl_league_id: 0,
        name: 'My Mini-League',
        is_starred: true,
      }
    );
  });

  // --- Real League Members State ---
  const [members, setMembers] = useState<LeagueMember[]>(() => {
    const saved = localStorage.getItem(`atlas_members_${currentLeague.id}`);
    if (!saved) return [];
    try {
      const parsed: LeagueMember[] = JSON.parse(saved);
      return parsed.map((m) => ({
        ...m,
        is_online: Boolean(m.is_starred || (userAccount && m.fpl_entry_id === userAccount.teamId)),
      }));
    } catch {
      return [];
    }
  });

  // Refresh fresh FPL standings & real manager squad picks from Premier League API
  useEffect(() => {
    if (!currentLeague || !currentLeague.fpl_league_id || currentLeague.fpl_league_id <= 0) return;

    let isCancelled = false;
    const activeGw = gwInfo?.recentGwId || getCachedGameweekState()?.recentGwId || getEstimatedSeasonGameweek();

    fetchLeagueStandings(currentLeague.fpl_league_id, userAccount?.teamId, activeGw)
      .then(async (res) => {
        if (isCancelled || !res || !res.members) return;
        setMembers(res.members);

        try {
          const enriched = await enrichLeagueMembersWithRealPicks(res.members, activeGw);
          if (!isCancelled && enriched && enriched.length > 0) {
            setMembers(enriched);
          }
        } catch {}
      })
      .catch((e) => console.warn('Failed to refresh standings:', e));

    return () => {
      isCancelled = true;
    };
  }, [currentLeague.id, currentLeague.fpl_league_id, userAccount?.teamId, gwInfo?.recentGwId]);

  const [activeChannel, setActiveChannel] = useState<ChannelId>('banter');

  // Real messages only (Starts clean)
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(`atlas_msgs_${currentLeague.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [unreadCount, setUnreadCount] = useState<Record<string, number>>({});
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // --- Drawers & Modals ---
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [addLeagueOpen, setAddLeagueOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [battleRivalId, setBattleRivalId] = useState<string>('');
  const [availableUpdate, setAvailableUpdate] = useState<ReleaseInfo | null>(null);
  const [fixturesModalOpen, setFixturesModalOpen] = useState(false);
  const [viewingSquadMember, setViewingSquadMember] = useState<{
    entryId: number;
    managerName: string;
    teamName: string;
  } | null>(null);

  // Check for newer APK releases on GitHub
  useEffect(() => {
    checkForAppUpdates().then((update) => {
      if (update) {
        setAvailableUpdate(update);
      }
    });
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Autonomous FPL Matchday Bot & Transfer Reveal Bot
  useEffect(() => {
    const activeGw = gwInfo?.recentGwId || getCachedGameweekState()?.recentGwId || getEstimatedSeasonGameweek();
    
    // 1. Start live matchday goal & card announcer
    fplBot.start(
      currentLeague.id,
      members,
      activeGw,
      (botMsg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === botMsg.id)) return prev;
          return [...prev, botMsg];
        });

        // Broadcast bot ping to all other managers via Supabase Realtime
        realtimeChat.postMessage(
          currentLeague.id,
          botMsg.channel,
          botMsg.sender_id,
          botMsg.sender_name,
          botMsg.content,
          botMsg.reply_to,
          botMsg.embed_data,
          true,
          botMsg.id
        );
      }
    );

    // 2. Start post-deadline transfer & chip reveal bot in #transfers
    transferBot.start(
      currentLeague.id,
      members,
      activeGw,
      (botMsg: Message) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === botMsg.id)) return prev;
          return [...prev, botMsg];
        });

        realtimeChat.postMessage(
          currentLeague.id,
          botMsg.channel,
          botMsg.sender_id,
          botMsg.sender_name,
          botMsg.content,
          botMsg.reply_to,
          botMsg.embed_data,
          true,
          botMsg.id
        );
      }
    );

    return () => {
      fplBot.stop();
      transferBot.stop();
    };
  }, [currentLeague.id, members.length]);

  useEffect(() => {
    const activeGw = gwInfo?.recentGwId || getCachedGameweekState()?.recentGwId || getEstimatedSeasonGameweek();
    fplBot.updateContext(currentLeague.id, members, activeGw);
  }, [currentLeague.id, members, gwInfo]);

  // Sync state
  useEffect(() => {
    if (leagues.length > 0) {
      localStorage.setItem('atlas_leagues', JSON.stringify(leagues));
    }
  }, [leagues]);

  useEffect(() => {
    if (currentLeague.id && currentLeague.id !== 'league-init') {
      localStorage.setItem('atlas_current_league', JSON.stringify(currentLeague));
    }
  }, [currentLeague]);

  useEffect(() => {
    if (members.length > 0) {
      localStorage.setItem(`atlas_members_${currentLeague.id}`, JSON.stringify(members));
    }
  }, [members, currentLeague.id]);

  useEffect(() => {
    localStorage.setItem(`atlas_msgs_${currentLeague.id}`, JSON.stringify(messages));
  }, [messages, currentLeague.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (activeChannel === 'banter' || activeChannel === 'matchday-live') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChannel]);

  // Connect to Supabase Realtime for Messages, Deletions, Reactions, and Live Presence
  useEffect(() => {
    if (!currentLeague.id || currentLeague.id === 'league-init') {
      setRealtimeConnected(false);
      return;
    }

    // Register league in Supabase arena_leagues if needed
    realtimeChat.ensureLeague(currentLeague);

    // 1. Fetch recent server message history from Supabase
    realtimeChat.fetchRecentMessages(currentLeague.id).then((serverMsgs) => {
      if (serverMsgs && serverMsgs.length > 0) {
        setMessages((prev) => {
          const map = new Map<string, Message>();
          prev.forEach((m) => map.set(m.id, m));
          serverMsgs.forEach((m) => map.set(m.id, m));
          return Array.from(map.values()).sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
        });
      }
    });

    // 2. Subscribe to real-time events across all phones
    const currentUser = userAccount
      ? { id: `member-${userAccount.teamId}`, name: userAccount.managerName }
      : null;

    realtimeChat.subscribeToLeague(currentLeague.id, currentUser, {
      onNewMessage: (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        const isMe = userAccount && (
          newMsg.sender_id === `member-${userAccount.teamId}` ||
          newMsg.sender_name === userAccount.managerName
        );

        if (!isMe && userAccount) {
          const myFullName = userAccount.managerName.toLowerCase();
          const myFirstName = userAccount.managerName.split(' ')[0]?.toLowerCase();
          const contentLower = (newMsg.content || '').toLowerCase();

          // Check if user was pinged (@Full Name, @First Name, reply, or squad impact)
          const isMentioned =
            contentLower.includes(`@${myFullName}`) ||
            (Boolean(myFirstName) && contentLower.includes(`@${myFirstName}`)) ||
            newMsg.reply_to?.sender_name?.toLowerCase() === myFullName ||
            Boolean(
              newMsg.embed_data?.impact_items?.some(
                (item) => item.member_name?.toLowerCase() === myFullName
              )
            );

          if (isMentioned) {
            sounds.playChime();
            const notifTitle = newMsg.is_bot
              ? `⚽ ATLAS Bot Alert`
              : `💬 @${newMsg.sender_name} mentioned you in #${newMsg.channel}`;

            // Clean markdown formatting for clear system notification preview
            const cleanBody = newMsg.content.replace(/\*\*/g, '').slice(0, 120);
            notificationService.sendInstantAlert(notifTitle, cleanBody);
          } else {
            if (newMsg.is_bot) {
              sounds.playChime();
            } else {
              sounds.playPop();
            }
          }
        }
      },
      onMessageDeleted: (deletedId) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      },
      onReactionUpdated: (msgId, reactions) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, reactions } : m))
        );
      },
      onPresenceSync: (activeUsers) => {
        setRealtimeConnected(true);
        const activeNames = new Set(activeUsers.map((u) => u.manager_name.toLowerCase()));
        setMembers((prev) =>
          prev.map((m) => ({
            ...m,
            is_online: Boolean(
              m.is_starred ||
              activeNames.has(m.manager_name.toLowerCase()) ||
              (userAccount && m.fpl_entry_id === userAccount.teamId)
            ),
          }))
        );
      },
    });

    setRealtimeConnected(true);

    return () => {
      realtimeChat.unsubscribe();
    };
  }, [currentLeague.id, userAccount]);

  // Onboarding Completed
  const handleOnboardingComplete = (
    account: UserAccount,
    userLeagues: League[],
    activeLeague: League,
    leagueMembers: LeagueMember[]
  ) => {
    setUserAccount(account);
    setLeagues(userLeagues);
    setCurrentLeague(activeLeague);
    setMembers(leagueMembers);
    setShowOnboarding(false);
  };

  // Switch or Log out
  const handleLogout = () => {
    clearLocalAccount();
    setUserAccount(null);
    setLeagues([]);
    setMembers([]);
    setMessages([]);
    setShowOnboarding(true);
  };

  // Switch to another league
  const handleSelectLeague = async (lg: League) => {
    setCurrentLeague(lg);
    const saved = localStorage.getItem(`atlas_members_${lg.id}`);
    if (saved) {
      setMembers(JSON.parse(saved));
    } else {
      try {
        const res = await fetchLeagueStandings(lg.fpl_league_id, userAccount?.teamId);
        setMembers(res.members);
      } catch (e) {
        console.warn('Failed to load standings for league:', e);
      }
    }
    const msgs = localStorage.getItem(`atlas_msgs_${lg.id}`);
    setMessages(msgs ? JSON.parse(msgs) : []);
  };

  // Send message
  const handleSendMessage = (content: string, replyTo?: MessageReply) => {
    const sender = userAccount ? userAccount.managerName : 'Manager';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      league_id: currentLeague.id,
      channel: activeChannel,
      sender_id: userAccount ? `member-${userAccount.teamId}` : 'me',
      sender_name: sender,
      is_bot: false,
      content,
      reply_to: replyTo,
      created_at: timeStr,
      reactions: {},
    };

    setMessages((prev) => [...prev, newMsg]);
    triggerHaptic('light');
    sounds.playSend();
    setReplyingTo(null);

    // Broadcast in real-time to Supabase & all other managers
    realtimeChat.postMessage(
      currentLeague.id,
      activeChannel,
      newMsg.sender_id,
      newMsg.sender_name,
      newMsg.content,
      newMsg.reply_to,
      undefined,
      false,
      newMsg.id
    );
  };

  // Reaction toggle
  const handleAddReaction = (messageId: string, emoji: string) => {
    triggerHaptic('light');
    sounds.playReaction();
    const userName = userAccount ? userAccount.managerName : 'Manager';

    let nextReactions: Record<string, string[]> = {};

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = { ...(msg.reactions || {}) };
        const users = currentReactions[emoji] ? [...currentReactions[emoji]] : [];

        if (users.includes(userName)) {
          const filtered = users.filter((u) => u !== userName);
          if (filtered.length === 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = filtered;
          }
        } else {
          currentReactions[emoji] = [...users, userName];
        }

        nextReactions = currentReactions;
        return {
          ...msg,
          reactions: currentReactions,
        };
      })
    );

    // Sync reaction update to Supabase
    realtimeChat.updateReactions(messageId, nextReactions);
  };

  // Delete message
  const handleDeleteMessage = (messageId: string) => {
    triggerHaptic('warning');
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.id !== messageId);
      try {
        localStorage.setItem(`atlas_msgs_${currentLeague.id}`, JSON.stringify(filtered));
      } catch {}
      return filtered;
    });

    realtimeChat.deleteMessage(messageId);
  };

  // Create & Broadcast Gameweek Poll
  const handleSendPoll = (poll: PollData) => {
    const sender = userAccount ? userAccount.managerName : 'Manager';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const targetChannel = activeChannel === 'table' || activeChannel === 'h2h' ? 'banter' : activeChannel;

    const newMsg: Message = {
      id: `poll-${Date.now()}`,
      league_id: currentLeague.id,
      channel: targetChannel,
      sender_id: userAccount ? `member-${userAccount.teamId}` : 'me',
      sender_name: sender,
      is_bot: false,
      content: `📊 **${poll.question}**`,
      poll_data: poll,
      created_at: timeStr,
      reactions: {},
    };

    setMessages((prev) => [...prev, newMsg]);
    triggerHaptic('medium');
    sounds.playSend();

    realtimeChat.postMessage(
      currentLeague.id,
      newMsg.channel,
      newMsg.sender_id,
      newMsg.sender_name,
      newMsg.content,
      undefined,
      undefined,
      false,
      newMsg.id
    );
  };

  // Vote on Interactive Poll
  const handleVotePoll = (messageId: string, optionId: string) => {
    const userName = userAccount ? userAccount.managerName : 'Manager';
    triggerHaptic('medium');
    sounds.playReaction();

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId || !msg.poll_data) return msg;

        const options = msg.poll_data.options.map((opt) => {
          if (opt.id === optionId) {
            const hasVoted = opt.votes.includes(userName);
            const votes = hasVoted ? opt.votes.filter((u) => u !== userName) : [...opt.votes, userName];
            return { ...opt, votes };
          } else {
            // Remove previous vote if single-choice
            return { ...opt, votes: opt.votes.filter((u) => u !== userName) };
          }
        });

        const total_votes = options.reduce((sum, opt) => sum + opt.votes.length, 0);

        return {
          ...msg,
          poll_data: {
            ...msg.poll_data,
            options,
            total_votes,
          },
        };
      })
    );
  };

  // Toggle Starred League
  const handleToggleStarLeague = (leagueId: string) => {
    setLeagues((prev) =>
      prev.map((lg) => ({
        ...lg,
        is_starred: lg.id === leagueId,
      }))
    );
  };

  // Trigger Gameweek Awards Ceremony in #banter
  const handleTriggerRecap = (force = true) => {
    const activeGw = gwInfo?.recentGwId || getCachedGameweekState()?.recentGwId || getEstimatedSeasonGameweek();
    const recapMsg = gameweekRecap.generateRecap(currentLeague.id, members, activeGw, force);
    if (recapMsg) {
      setMessages((prev) => [...prev, recapMsg]);
      realtimeChat.postMessage(
        currentLeague.id,
        recapMsg.channel,
        recapMsg.sender_id,
        recapMsg.sender_name,
        recapMsg.content,
        undefined,
        recapMsg.embed_data,
        true,
        recapMsg.id
      );
    }
  };

  // Import FPL League
  const handleLeagueImported = (newLeague: League, newMembers: LeagueMember[]) => {
    setLeagues((prev) => {
      const filtered = prev.filter((l) => l.id !== newLeague.id);
      return [newLeague, ...filtered];
    });
    setCurrentLeague(newLeague);
    setMembers(newMembers);
  };

  const currentMember = members.find(
    (m) => m.fpl_entry_id === userAccount?.teamId || m.is_starred
  );
  const channelMessages = messages.filter((m) => m.channel === activeChannel);
  const onlineCount = members.filter((m) => m.is_online).length;

  return (
    <div className="flex justify-center w-full h-screen bg-black overflow-hidden font-sans">
      <div className="w-full max-w-md h-full flex flex-col bg-discord-chat relative shadow-2xl overflow-hidden border-x border-discord-border/20">
        
        {/* Onboarding & Account Modal */}
        <AuthOnboardingModal
          isOpen={showOnboarding}
          onComplete={handleOnboardingComplete}
        />

        {/* In-App Auto-Update Notification Banner */}
        {availableUpdate && (
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-3 py-1.5 flex items-center justify-between text-xs font-bold z-40 select-none shadow-md shrink-0">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
              <span className="truncate">New ATLAS Arena {availableUpdate.tagName} available!</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={availableUpdate.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-0.5 rounded-md bg-white text-emerald-900 font-extrabold text-[11px] shadow-xs hover:bg-slate-100"
              >
                Update Now
              </a>
              <button
                type="button"
                onClick={() => setAvailableUpdate(null)}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <TopBar
          currentLeague={currentLeague}
          leagues={leagues}
          onlineCount={onlineCount}
          totalMembers={members.length}
          onOpenLeftDrawer={() => setLeftDrawerOpen(true)}
          onOpenRightDrawer={() => setRightDrawerOpen(true)}
          onSelectLeague={handleSelectLeague}
          onOpenAddLeague={() => setAddLeagueOpen(true)}
          onToggleStarLeague={handleToggleStarLeague}
          realtimeConnected={realtimeConnected}
        />

        {/* 4 Dedicated Channel Tabs */}
        <ChannelTabs
          activeChannel={activeChannel}
          onSelectChannel={(ch) => {
            setActiveChannel(ch);
            setUnreadCount((prev) => ({ ...prev, [ch]: 0 }));
          }}
          unreadCount={unreadCount}
        />

        {/* Dynamic Gameweek Status Ticker (Real FPL deadline / live status) */}
        <GameweekTicker
          gwInfo={gwInfo}
          onOpenPoll={() => setActiveChannel('banter')}
        />

        {/* Main Channel Content */}
        {activeChannel === 'h2h' ? (
          <H2HView
            members={members}
            currentMemberId={currentMember?.id}
            isGameweekLive={Boolean(gwInfo?.isLive)}
            gwInfo={gwInfo}
            initialRivalId={battleRivalId}
            onJumpToBanter={(promptText) => {
              setActiveChannel('banter');
              handleSendMessage(promptText);
            }}
          />
        ) : activeChannel === 'table' ? (
          <TableView
            members={members}
            currentMemberId={currentMember?.id}
            gwInfo={gwInfo}
            onLaunchBattle={(m) => {
              setBattleRivalId(m.id);
              setActiveChannel('h2h');
            }}
            onViewSquad={(m) =>
              setViewingSquadMember({
                entryId: m.fpl_entry_id,
                managerName: m.manager_name,
                teamName: m.team_name,
              })
            }
          />
        ) : (
          <div className="flex-1 overflow-y-auto px-1 py-2 space-y-1 scroll-smooth">
            {channelMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-discord-muted">
                <div className="text-3xl mb-2">🏟️</div>
                <h4 className="font-bold text-white text-sm">Welcome to #{activeChannel}!</h4>
                <p className="text-xs text-discord-light mt-1 max-w-xs">
                  This is the start of the #{activeChannel} channel for{' '}
                  <span className="font-bold text-discord-cyan">{currentLeague.name}</span>.
                </p>

                {/* Quick Banter Suggestions */}
                <div className="mt-4 w-full max-w-xs space-y-1.5 text-left">
                  <div className="text-[10px] font-bold uppercase text-discord-muted text-center mb-1">
                    Kick off the banter:
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('Who is everyone captaining this week?')}
                    className="w-full text-left p-2 rounded-xl bg-discord-darkest hover:bg-discord-card border border-discord-border/60 text-xs text-discord-light hover:text-white transition-colors"
                  >
                    💬 "Who is everyone captaining this week?"
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('Title is coming home this year, no doubts 👑')}
                    className="w-full text-left p-2 rounded-xl bg-discord-darkest hover:bg-discord-card border border-discord-border/60 text-xs text-discord-light hover:text-white transition-colors"
                  >
                    👑 "Title is coming home this year, no doubts"
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSendMessage('Need a major differential haul this gameweek 🎯')}
                    className="w-full text-left p-2 rounded-xl bg-discord-darkest hover:bg-discord-card border border-discord-border/60 text-xs text-discord-light hover:text-white transition-colors"
                  >
                    🎯 "Need a major differential haul this gameweek"
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerRecap(true)}
                    className="w-full text-left p-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/40 text-xs text-purple-200 transition-colors"
                  >
                    🏆 "Announce Gameweek Awards Ceremony"
                  </button>
                </div>
              </div>
            ) : (
              channelMessages.map((msg) => (
                <MessageCard
                  key={msg.id}
                  message={msg}
                  currentUserName={userAccount?.managerName}
                  onAddReaction={handleAddReaction}
                  onReplyMessage={(m) => setReplyingTo(m)}
                  onDeleteMessage={handleDeleteMessage}
                  onVotePoll={handleVotePoll}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Discord Message Input Bar with Reply Banner & Poll support */}
        {(activeChannel === 'banter' || activeChannel === 'matchday-live' || activeChannel === 'transfers') && (
          <MessageInput
            channelName={activeChannel}
            onSendMessage={handleSendMessage}
            onSendPoll={handleSendPoll}
            memberNames={members.map((m) => m.manager_name)}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
          />
        )}

        {/* Left Drawer (My Leagues & Arena Account only) */}
        <LeftDrawer
          isOpen={leftDrawerOpen}
          onClose={() => setLeftDrawerOpen(false)}
          leagues={leagues}
          currentLeague={currentLeague}
          onSelectLeague={handleSelectLeague}
          onOpenAddLeague={() => setAddLeagueOpen(true)}
          onToggleStarLeague={handleToggleStarLeague}
          userAccount={userAccount}
          onLogout={handleLogout}
          onOpenFixtures={() => setFixturesModalOpen(true)}
        />

        {/* Right Drawer (Live Manager Roster) */}
        <RightDrawer
          isOpen={rightDrawerOpen}
          onClose={() => setRightDrawerOpen(false)}
          members={members}
          currentMember={currentMember}
          onViewSquad={(m) =>
            setViewingSquadMember({
              entryId: m.fpl_entry_id,
              managerName: m.manager_name,
              teamName: m.team_name,
            })
          }
        />

        {/* Import FPL League Modal */}
        <AddLeagueModal
          isOpen={addLeagueOpen}
          onClose={() => setAddLeagueOpen(false)}
          onLeagueImported={handleLeagueImported}
        />

        {/* Interactive Manager Squad Pitch Modal */}
        <ManagerSquadModal
          isOpen={Boolean(viewingSquadMember)}
          onClose={() => setViewingSquadMember(null)}
          fplEntryId={viewingSquadMember?.entryId || 0}
          managerName={viewingSquadMember?.managerName || ''}
          teamName={viewingSquadMember?.teamName || ''}
          gwId={gwInfo?.recentGwId || getCachedGameweekState()?.recentGwId || getEstimatedSeasonGameweek()}
          onBattle={(entryId) => {
            const rival = members.find((m) => m.fpl_entry_id === entryId);
            if (rival) {
              setBattleRivalId(rival.id);
              setActiveChannel('h2h');
              setViewingSquadMember(null);
            }
          }}
        />

        {/* Live Premier League Fixtures Modal */}
        <LiveFixturesModal
          isOpen={fixturesModalOpen}
          onClose={() => setFixturesModalOpen(false)}
          gwId={
            gwInfo?.isRecentFinished && gwInfo?.upcomingGwId
              ? gwInfo.upcomingGwId
              : gwInfo?.recentGwId || getEstimatedSeasonGameweek()
          }
        />
      </div>
    </div>
  );
};

export default App;
