import { RealtimeChannel } from '@supabase/supabase-js';
import { Message, MessageReply } from '../types';
import { getSupabase } from './supabaseClient';

export interface PresenceUser {
  user_id: string;
  manager_name: string;
  online_at: string;
}

class RealtimeChatService {
  private activeChannel: RealtimeChannel | null = null;
  private currentLeagueId: string = '';

  /**
   * Ensures the league is registered in Supabase arena_leagues
   */
  public async ensureLeague(league: { id: string; fpl_league_id: number; name: string }): Promise<void> {
    const supabase = getSupabase();
    if (!supabase || !league.id || league.fpl_league_id <= 0) return;
    try {
      await supabase.from('arena_leagues').upsert({
        id: league.id,
        fpl_league_id: league.fpl_league_id,
        name: league.name,
      }, { onConflict: 'id' });
    } catch (e) {
      console.warn('Could not upsert league:', e);
    }
  }

  /**
   * Subscribe to real-time messages, reactions, deletes, and presence for a league
   */
  public subscribeToLeague(
    leagueId: string,
    currentUser: { id: string; name: string } | null,
    callbacks: {
      onNewMessage: (msg: Message) => void;
      onMessageDeleted: (msgId: string) => void;
      onReactionUpdated: (msgId: string, reactions: Record<string, string[]>) => void;
      onPresenceSync: (activeUsers: PresenceUser[]) => void;
    }
  ) {
    const supabase = getSupabase();
    if (!supabase || !leagueId) return;

    // Clean up previous subscription if switching leagues
    if (this.activeChannel) {
      this.unsubscribe();
    }

    this.currentLeagueId = leagueId;
    const channelName = `arena_room_${leagueId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUser?.id || `anon-${Math.random().toString(36).substring(2, 7)}`,
        },
      },
    });

    // 1. Listen for new incoming messages from other managers / bot
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'arena_messages',
        filter: `league_id=eq.${leagueId}`,
      },
      (payload) => {
        const row = payload.new as any;
        const msg: Message = {
          id: row.id,
          league_id: row.league_id,
          channel: row.channel,
          sender_id: row.sender_id,
          sender_name: row.sender_name,
          is_bot: row.is_bot,
          content: row.content,
          reply_to: row.reply_to,
          embed_data: row.embed_data,
          reactions: row.reactions || {},
          created_at: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        callbacks.onNewMessage(msg);
      }
    );

    // 2. Listen for message deletions across devices
    channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'arena_messages',
        filter: `league_id=eq.${leagueId}`,
      },
      (payload) => {
        const deletedId = (payload.old as any)?.id;
        if (deletedId) {
          callbacks.onMessageDeleted(deletedId);
        }
      }
    );

    // 3. Listen for reaction updates
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'arena_messages',
        filter: `league_id=eq.${leagueId}`,
      },
      (payload) => {
        const updated = payload.new as any;
        if (updated?.id && updated?.reactions) {
          callbacks.onReactionUpdated(updated.id, updated.reactions);
        }
      }
    );

    // 4. Live Presence Tracking (Green dots & active member count)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const onlineUsers: PresenceUser[] = [];
      Object.values(state).forEach((presences: any) => {
        presences.forEach((p: any) => {
          if (p.manager_name) {
            onlineUsers.push({
              user_id: p.user_id,
              manager_name: p.manager_name,
              online_at: p.online_at,
            });
          }
        });
      });
      callbacks.onPresenceSync(onlineUsers);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && currentUser) {
        await channel.track({
          user_id: currentUser.id,
          manager_name: currentUser.name,
          online_at: new Date().toISOString(),
        });
      }
    });

    this.activeChannel = channel;
  }

  /**
   * Broadcast message to Supabase
   */
  public async postMessage(
    leagueId: string,
    channel: string,
    senderId: string,
    senderName: string,
    content: string,
    replyTo?: MessageReply | null,
    embedData?: any,
    isBot: boolean = false,
    customId?: string
  ): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const id = customId || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const { error } = await supabase.from('arena_messages').insert({
        id,
        league_id: leagueId,
        channel,
        sender_id: senderId,
        sender_name: senderName,
        content,
        reply_to: replyTo || null,
        embed_data: embedData || null,
        reactions: {},
        is_bot: isBot,
      });

      if (error) {
        // If conflict on deterministic bot ID, ignore gracefully
        if (error.code === '23505') return true;
        console.warn('Failed to broadcast message to Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Post message error:', e);
      return false;
    }
  }

  /**
   * Fetch recent messages from Supabase for a league
   */
  public async fetchRecentMessages(leagueId: string): Promise<Message[]> {
    const supabase = getSupabase();
    if (!supabase || !leagueId) return [];

    try {
      const { data, error } = await supabase
        .from('arena_messages')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: true })
        .limit(150);

      const rows = data || [];
      if (rows.length > 0) {
        return rows.map((row: any) => ({
          id: row.id,
          league_id: row.league_id,
          channel: row.channel,
          sender_id: row.sender_id || 'sender',
          sender_name: row.sender_name,
          is_bot: Boolean(row.is_bot),
          content: row.content,
          reply_to: row.reply_to || undefined,
          embed_data: row.embed_data || undefined,
          reactions: row.reactions || {},
          created_at: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
      }

      if (error) {
        // Fallback to legacy 'messages' if tables were named without prefix
        const { data: fbData } = await supabase
          .from('messages')
          .select('*')
          .eq('league_id', leagueId)
          .order('created_at', { ascending: true })
          .limit(150);
        if (fbData && fbData.length > 0) {
          return fbData.map((row: any) => ({
            id: row.id,
            league_id: row.league_id,
            channel: row.channel,
            sender_id: row.sender_id || 'sender',
            sender_name: row.sender_name,
            is_bot: Boolean(row.is_bot),
            content: row.content,
            reply_to: row.reply_to || undefined,
            embed_data: row.embed_data || undefined,
            reactions: row.reactions || {},
            created_at: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
        }
      }

      return [];
    } catch {
      return [];
    }
  }

  /**
   * Delete message across all connected phones
   */
  public async deleteMessage(messageId: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('arena_messages').delete().eq('id', messageId);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Update message reactions in real time
   */
  public async updateReactions(
    messageId: string,
    reactions: Record<string, string[]>
  ): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('arena_messages')
        .update({ reactions })
        .eq('id', messageId);
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Unsubscribe when leaving or switching leagues
   */
  public unsubscribe() {
    if (this.activeChannel) {
      this.activeChannel.unsubscribe();
      this.activeChannel = null;
    }
  }
}

export const realtimeChat = new RealtimeChatService();
