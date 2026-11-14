-- ==============================================================================
-- 🏟️ ATLAS Arena — Production Supabase Schema ($0.00 Tier, 1,000+ Users)
-- Safe & Idempotent (can be re-run multiple times without errors)
-- ==============================================================================

-- 1. User Accounts Table (Manager Profile created with FPL Team ID & Password)
CREATE TABLE IF NOT EXISTS arena_users (
    fpl_entry_id INTEGER PRIMARY KEY,           -- Official FPL Team ID (e.g. 581920)
    manager_name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    overall_points INTEGER DEFAULT 0,
    overall_rank INTEGER DEFAULT 0,
    starred_league_id TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Mini-Leagues Table
CREATE TABLE IF NOT EXISTS arena_leagues (
    id TEXT PRIMARY KEY,                        -- e.g. 'league-102938'
    fpl_league_id INTEGER UNIQUE NOT NULL,      -- Official Premier League mini-league ID
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. League Members Table
CREATE TABLE IF NOT EXISTS arena_members (
    id TEXT PRIMARY KEY,                        -- e.g. 'member-581920'
    league_id TEXT NOT NULL,                    -- e.g. 'league-102938'
    fpl_entry_id INTEGER NOT NULL,              -- Official FPL Team ID
    manager_name TEXT NOT NULL,
    team_name TEXT NOT NULL,
    captain_name TEXT,
    captain_multiplier INTEGER DEFAULT 2,
    assets JSONB DEFAULT '[]'::jsonb,           -- Starting XI player names
    bench_points INTEGER DEFAULT 0,
    gw_points INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    rank INTEGER DEFAULT 1,
    prev_rank INTEGER DEFAULT 1,
    is_starred BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(league_id, fpl_entry_id)
);

-- 4. Messages & Matchday Bot Embeds Table
CREATE TABLE IF NOT EXISTS arena_messages (
    id TEXT PRIMARY KEY,                        -- Deterministic bot IDs (bot_goal_123_456_1) & UUIDs
    league_id TEXT NOT NULL,                    -- e.g. 'league-102938'
    channel TEXT NOT NULL DEFAULT 'banter',     -- 'banter', 'matchday-live', 'h2h', 'table'
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    is_bot BOOLEAN DEFAULT FALSE,
    content TEXT NOT NULL,
    reply_to JSONB,                             -- Quoted reply preview { message_id, sender_name, snippet }
    embed_data JSONB,                           -- Scorer card, badges, team names, points impact
    reactions JSONB DEFAULT '{}'::jsonb,        -- { "🔥": ["Name1", "Name2"], "⚽": ["Name3"] }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexing for sub-10ms query speeds
CREATE INDEX IF NOT EXISTS idx_arena_messages_league_channel ON arena_messages(league_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_members_league ON arena_members(league_id);
CREATE INDEX IF NOT EXISTS idx_arena_users_last_seen ON arena_users(last_seen DESC);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE arena_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running so Postgres doesn't throw 42710
DROP POLICY IF EXISTS "Public read users" ON arena_users;
DROP POLICY IF EXISTS "Public insert users" ON arena_users;
DROP POLICY IF EXISTS "Public update users" ON arena_users;

DROP POLICY IF EXISTS "Public read leagues" ON arena_leagues;
DROP POLICY IF EXISTS "Public insert leagues" ON arena_leagues;
DROP POLICY IF EXISTS "Public update leagues" ON arena_leagues;

DROP POLICY IF EXISTS "Public read members" ON arena_members;
DROP POLICY IF EXISTS "Public insert members" ON arena_members;
DROP POLICY IF EXISTS "Public update members" ON arena_members;

DROP POLICY IF EXISTS "Public read messages" ON arena_messages;
DROP POLICY IF EXISTS "Public insert messages" ON arena_messages;
DROP POLICY IF EXISTS "Public update messages" ON arena_messages;
DROP POLICY IF EXISTS "Public delete messages" ON arena_messages;

-- Create permissive public policies for authenticated and anon client apps
CREATE POLICY "Public read users" ON arena_users FOR SELECT USING (true);
CREATE POLICY "Public insert users" ON arena_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update users" ON arena_users FOR UPDATE USING (true);

CREATE POLICY "Public read leagues" ON arena_leagues FOR SELECT USING (true);
CREATE POLICY "Public insert leagues" ON arena_leagues FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update leagues" ON arena_leagues FOR UPDATE USING (true);

CREATE POLICY "Public read members" ON arena_members FOR SELECT USING (true);
CREATE POLICY "Public insert members" ON arena_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update members" ON arena_members FOR UPDATE USING (true);

CREATE POLICY "Public read messages" ON arena_messages FOR SELECT USING (true);
CREATE POLICY "Public insert messages" ON arena_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update messages" ON arena_messages FOR UPDATE USING (true);
CREATE POLICY "Public delete messages" ON arena_messages FOR DELETE USING (true);

-- 6. Enable Realtime Broadcasting safely (only adds if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'arena_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE arena_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'arena_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE arena_members;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'arena_users'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE arena_users;
    END IF;
END $$;
