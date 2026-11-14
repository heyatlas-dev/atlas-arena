import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get credentials from env or localStorage
const getSavedCredentials = () => {
  const url = localStorage.getItem('atlas_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey =
    localStorage.getItem('atlas_supabase_anon_key') ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    '';
  return { url, anonKey };
};

let clientInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  const { url, anonKey } = getSavedCredentials();
  if (!url || !anonKey || url === 'https://your-project.supabase.co') {
    return null;
  }
  if (!clientInstance) {
    try {
      clientInstance = createClient(url, anonKey);
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return clientInstance;
};

export const updateSupabaseCredentials = (url: string, anonKey: string) => {
  localStorage.setItem('atlas_supabase_url', url.trim());
  localStorage.setItem('atlas_supabase_anon_key', anonKey.trim());
  clientInstance = null; // force reload
  return getSupabase();
};

export const SUPABASE_SQL_MIGRATIONS = `-- ==========================================
-- ATLAS ARENA POSTGRESQL SCHEMA ($0.00 Free Tier)
-- ==========================================

-- 1. Leagues Table
CREATE TABLE IF NOT EXISTS leagues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fpl_league_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. League Members Table
CREATE TABLE IF NOT EXISTS league_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    fpl_entry_id INTEGER NOT NULL,
    manager_name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    pin_hash TEXT,
    is_starred BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(league_id, fpl_entry_id)
);

-- 3. Messages & Matchday Embeds
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'banter', -- 'banter', 'matchday-live', 'h2h', 'table'
    sender_id UUID REFERENCES league_members(id),
    sender_name TEXT NOT NULL,
    is_bot BOOLEAN DEFAULT FALSE,
    content TEXT,
    embed_data JSONB, -- Stores goal card, scorer, points impact, team badges
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Message Reactions Table
CREATE TABLE IF NOT EXISTS reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    member_id UUID REFERENCES league_members(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    UNIQUE(message_id, member_id, emoji)
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
`;
