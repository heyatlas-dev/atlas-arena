export type ChannelId = 'banter' | 'matchday-live' | 'transfers' | 'h2h' | 'table';

export interface League {
  id: string;
  fpl_league_id: number;
  name: string;
  created_at?: string;
  is_starred?: boolean;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  fpl_entry_id: number;
  manager_name: string;
  team_name: string;
  avatar_url?: string;
  pin_hash?: string;
  is_starred?: boolean;
  is_online?: boolean;
  last_seen?: string;
  gw_points: number;
  total_points: number;
  rank: number;
  prev_rank?: number;
  captain_name: string;
  captain_multiplier: number;
  bench_points?: number;
  assets: string[]; // e.g. ['Haaland', 'Saka', 'Gabriel', 'Raya', 'Palmer', 'Salah', 'Isak']
}

export interface SquadPlayer {
  id: number;
  name: string;
  web_name: string;
  team_name: string;
  team_id: number;
  element_type: number; // 1: GKP, 2: DEF, 3: MID, 4: FWD
  position: number;     // 1-11 starting, 12-15 bench
  is_captain: boolean;
  is_vice_captain: boolean;
  multiplier: number;
}

export interface ManagerSquadData {
  managerName: string;
  teamName: string;
  fplEntryId: number;
  gw: number;
  activeChip: string | null;
  transfersCount: number;
  transfersCost: number;
  startingXI: SquadPlayer[];
  bench: SquadPlayer[];
}

export interface EmbedImpactItem {
  text: string;
  positive: boolean;
  member_name?: string;
}

export interface MatchEmbedData {
  type: 'goal' | 'assist' | 'clean_sheet_lost' | 'red_card' | 'penalty_miss' | 'bonus_swing' | 'gameweek_recap' | 'transfer_reveal';
  fixture: string;
  minute: string;
  player_name: string;
  player_team: string;
  event_title: string;
  pts_scored: number;
  assist_by?: string;
  impact_items: EmbedImpactItem[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // member names or IDs
}

export interface MessageReply {
  message_id: string;
  sender_name: string;
  snippet: string;
}

export interface Message {
  id: string;
  league_id: string;
  channel: ChannelId;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  is_bot: boolean;
  content: string;
  reply_to?: MessageReply;
  embed_data?: MatchEmbedData;
  reactions?: Record<string, string[]>; // emoji -> member_names[]
  created_at: string;
  pending?: boolean;
}

export interface H2HMatchup {
  id: string;
  manager1: LeagueMember;
  manager2: LeagueMember;
  score1: number;
  score2: number;
  diff_players1: string[];
  diff_players2: string[];
  in_play1: number;
  in_play2: number;
}
