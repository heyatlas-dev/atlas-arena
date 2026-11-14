import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { League, LeagueMember, SquadPlayer, ManagerSquadData } from '../types';
import bundledPlayersMap from '../data/fplPlayersMap.json';
import bundledTeamsMap from '../data/fplTeamsMap.json';

export interface FPLClassicLeagueItem {
  id: number;
  name: string;
  rank: number;
  entry_rank: number;
}

export interface FPLUserEntry {
  id: number;
  player_first_name: string;
  player_last_name: string;
  name: string; // Team name
  summary_overall_points: number;
  summary_overall_rank: number;
  summary_event_points: number;
  current_event: number;
  leagues: {
    classic: FPLClassicLeagueItem[];
  };
}

export interface FPLStandingItem {
  id: number;
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  total: number;
  event_total: number;
}

export interface FPLLeagueStandingsResponse {
  league: {
    id: number;
    name: string;
  };
  standings: {
    results: FPLStandingItem[];
  };
}

export interface FPLEventItem {
  id: number;
  name: string;
  deadline_time: string;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
  data_checked: boolean;
}

export interface FPLElementItem {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  element_type: number; // 1=GKP, 2=DEF, 3=MID, 4=FWD
  team: number;
}

export interface FPLTeamItem {
  id: number;
  name: string;
  short_name: string;
}

export interface FPLBootstrapResponse {
  events: FPLEventItem[];
  elements?: FPLElementItem[];
  teams?: FPLTeamItem[];
}

export interface PlayerDetails {
  id: number;
  web_name: string;
  first_name?: string;
  second_name?: string;
  team: number;
  team_name: string;
  team_short: string;
  element_type: number;
}

export interface GameweekInfo {
  isLive: boolean;
  recentGwId: number;
  recentGwName: string;
  isRecentFinished: boolean;
  upcomingGwId: number;
  upcomingGwName: string;
  deadlineIso: string;
  formattedDeadline: string;
  deadlineCountdown: string;
}

export interface FPLPickItem {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FPLEntryHistory {
  event: number;
  points: number;
  total_points: number;
  rank: number;
  rank_sort: number;
  overall_rank: number;
  points_on_bench: number;
  event_transfers?: number;
  event_transfers_cost?: number;
}

export interface FPLPicksResponse {
  picks: FPLPickItem[];
  entry_history: FPLEntryHistory;
  active_chip?: string | null;
}

export interface ManagerRealPicks {
  captainName: string;
  captainMultiplier: number;
  assets: string[];
  benchPoints: number;
}

// Native + Web robust FPL HTTP Getter with generous 20s timeout for mobile network payloads
export const safeFplFetch = async <T>(targetUrl: string): Promise<T> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const response = await CapacitorHttp.get({
        url: targetUrl,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36'
        },
        connectTimeout: 20000,
        readTimeout: 20000
      });

      if (response.status >= 200 && response.status < 300) {
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        return data as T;
      } else {
        throw new Error(`FPL server returned HTTP ${response.status}`);
      }
    } catch (e: any) {
      console.warn('Native CapacitorHttp error:', e);
      throw new Error(e?.message || 'Failed to connect to FPL via native HTTP');
    }
  }

  // Web Browser fallbacks
  try {
    const res = await fetch(targetUrl);
    if (res.ok) return (await res.json()) as T;
  } catch {}

  try {
    const proxyUrl1 = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl1);
    if (res.ok) return (await res.json()) as T;
  } catch {}

  try {
    const proxyUrl2 = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl2);
    if (res.ok) return (await res.json()) as T;
  } catch {}

  throw new Error('Unable to connect to FPL server. Please verify your internet connection.');
};

// Calculate countdown string to deadline
const formatDeadlineCountdown = (deadlineIso: string): { formatted: string; countdown: string } => {
  if (!deadlineIso) return { formatted: '', countdown: '' };
  try {
    const deadline = new Date(deadlineIso);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();

    const formatted = deadline.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (diffMs <= 0) {
      return { formatted, countdown: 'Deadline passed' };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return { formatted, countdown: `in ${days}d ${hours}h` };
    }
    return { formatted, countdown: `in ${hours}h ${mins}m` };
  } catch {
    return { formatted: deadlineIso, countdown: '' };
  }
};

const GW_CACHE_KEY = 'atlas_cached_gw_state';
const STANDINGS_CACHE_PREFIX = 'atlas_cached_standings_';
const PLAYERS_MAP_KEY = 'atlas_fpl_elements_map_v2';
const TEAMS_MAP_KEY = 'atlas_fpl_teams_map_v2';

// Preload 2026/27 official Premier League teams & players maps synchronously!
interface CachedPlayerRaw {
  id?: number;
  web_name?: string;
  team?: number;
  element_type?: number;
}

const playersCache: Record<string, CachedPlayerRaw | string> = {
  ...(bundledPlayersMap as Record<string, CachedPlayerRaw | string>),
};

const teamsCache: Record<string, FPLTeamItem> = {
  ...(bundledTeamsMap as Record<string, FPLTeamItem>),
};

// Rehydrate dynamic updates from localStorage if available
try {
  const storedPlayers = localStorage.getItem(PLAYERS_MAP_KEY);
  if (storedPlayers) {
    Object.assign(playersCache, JSON.parse(storedPlayers));
  }
  const storedTeams = localStorage.getItem(TEAMS_MAP_KEY);
  if (storedTeams) {
    Object.assign(teamsCache, JSON.parse(storedTeams));
  }
} catch {}

/**
 * Returns complete rich player details (name, team name, team short code, position)
 */
export const getPlayerDetailsById = (elementId: number): PlayerDetails | null => {
  const strId = String(elementId);
  const raw = playersCache[strId];
  if (!raw) return null;

  const webName = typeof raw === 'string' ? raw : raw.web_name || `Player ${elementId}`;
  const teamId = typeof raw === 'object' && raw.team ? raw.team : 0;
  const elementType = typeof raw === 'object' && raw.element_type ? raw.element_type : 3;
  const teamObj = teamsCache[String(teamId)];

  return {
    id: elementId,
    web_name: webName,
    team: teamId,
    team_name: teamObj?.name || (teamId > 0 ? `Team ${teamId}` : 'Premier League'),
    team_short: teamObj?.short_name || 'PL',
    element_type: elementType,
  };
};

/**
 * Returns player's official Premier League web name (e.g. "Haaland", "Saka", "Palmer")
 */
export const getPlayerNameById = (elementId: number): string => {
  const strId = String(elementId);
  const raw = playersCache[strId];
  if (raw) {
    if (typeof raw === 'string') return raw;
    if (raw.web_name) return raw.web_name;
  }
  // Try local storage if dynamic update occurred
  try {
    const stored = localStorage.getItem(PLAYERS_MAP_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed[strId]) {
        playersCache[strId] = parsed[strId];
        return typeof parsed[strId] === 'string' ? parsed[strId] : (parsed[strId].web_name || `Player ${elementId}`);
      }
    }
  } catch {}

  return `Player ${elementId}`;
};

/**
 * Returns team's full name (e.g. "Arsenal", "Liverpool", "Coventry City")
 */
export const getTeamNameById = (teamId: number): string => {
  return teamsCache[String(teamId)]?.name || `Team ${teamId}`;
};

/**
 * Returns team's 3-letter abbreviation (e.g. "ARS", "LIV", "COV")
 */
export const getTeamShortById = (teamId: number): string => {
  return teamsCache[String(teamId)]?.short_name || 'PL';
};

/**
 * Returns all defenders (element_type === 2, strictly excluding goalkeepers) for a team
 */
export const getTeamDefenderNames = (teamId: number): Set<string> => {
  const defenderNames = new Set<string>();
  Object.values(playersCache).forEach((p: any) => {
    if (typeof p === 'object' && p.team === teamId && p.element_type === 2) {
      if (p.web_name) {
        defenderNames.add(p.web_name.toLowerCase());
      }
    }
  });
  return defenderNames;
};

/**
 * Official FPL Scoring calculator based on position
 */
export const calculateEventPoints = (
  eventType: 'goal' | 'assist' | 'red_card' | 'yellow_card' | 'own_goal',
  elementType?: number // 1=GKP, 2=DEF, 3=MID, 4=FWD
): number => {
  switch (eventType) {
    case 'goal':
      if (elementType === 1 || elementType === 2) return 6; // Defender / GKP goal = 6 pts
      if (elementType === 3) return 5; // Midfielder goal = 5 pts
      return 4; // Forward goal = 4 pts
    case 'assist':
      return 3;
    case 'red_card':
      return -3;
    case 'yellow_card':
      return -1;
    case 'own_goal':
      return -2;
    default:
      return 0;
  }
};

/**
 * Dynamically registers active season players & teams from live FPL bootstrap-static
 */
export const setPlayersAndTeams = (elements: FPLElementItem[], teams?: FPLTeamItem[]) => {
  if (elements && elements.length > 0) {
    elements.forEach((el) => {
      playersCache[String(el.id)] = {
        id: el.id,
        web_name: el.web_name,
        team: el.team,
        element_type: el.element_type,
      };
    });
    try {
      localStorage.setItem(PLAYERS_MAP_KEY, JSON.stringify(playersCache));
    } catch {}
  }

  if (teams && teams.length > 0) {
    teams.forEach((t) => {
      teamsCache[String(t.id)] = {
        id: t.id,
        name: t.name,
        short_name: t.short_name,
      };
    });
    try {
      localStorage.setItem(TEAMS_MAP_KEY, JSON.stringify(teamsCache));
    } catch {}
  }
};

export const getCachedGameweekState = (): GameweekInfo | null => {
  try {
    const raw = localStorage.getItem(GW_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getCachedLeagueData = (
  leagueId: number
): { league: League; members: LeagueMember[] } | null => {
  try {
    const raw = localStorage.getItem(`${STANDINGS_CACHE_PREFIX}${leagueId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Dynamic FPL Gameweek State (recent finished, upcoming, deadline)
export const fetchGameweekState = async (): Promise<GameweekInfo> => {
  try {
    const url = 'https://fantasy.premierleague.com/api/bootstrap-static/';
    const data = await safeFplFetch<FPLBootstrapResponse>(url);

    if (data && data.events && data.events.length > 0) {
      // Dynamic registration of all official active season players & teams!
      if (data.elements && data.elements.length > 0) {
        setPlayersAndTeams(data.elements, data.teams);
      }

      const current = data.events.find((e) => e.is_current) || data.events.find((e) => !e.finished) || data.events[0];
      const next = data.events.find((e) => e.is_next) || data.events.find((e) => !e.finished && e.id > current.id);

      const isFinished = current ? current.finished : true;
      const recentId = current ? current.id : 1;
      const recentName = current ? current.name : `Gameweek ${recentId}`;

      const upcomingId = next ? next.id : recentId + 1;
      const upcomingName = next ? next.name : `Gameweek ${upcomingId}`;
      const deadlineIso = next ? next.deadline_time : '';

      const { formatted, countdown } = formatDeadlineCountdown(deadlineIso);

      const result: GameweekInfo = {
        isLive: !isFinished, // If current GW is not finished, matches are in play!
        recentGwId: recentId,
        recentGwName: recentName,
        isRecentFinished: isFinished,
        upcomingGwId: upcomingId,
        upcomingGwName: upcomingName,
        deadlineIso,
        formattedDeadline: formatted,
        deadlineCountdown: countdown,
      };

      try {
        localStorage.setItem(GW_CACHE_KEY, JSON.stringify(result));
      } catch {}

      return result;
    }
  } catch (e) {
    console.warn('Failed to fetch gameweek state from FPL:', e);
  }

  // Check cache before fallback
  const cached = getCachedGameweekState();
  if (cached) return cached;

  // Dynamic fallback based on calendar date if offline
  return {
    isLive: false,
    recentGwId: 10,
    recentGwName: 'Gameweek 10',
    isRecentFinished: true,
    upcomingGwId: 11,
    upcomingGwName: 'Gameweek 11',
    deadlineIso: '',
    formattedDeadline: 'Saturday, 11:00',
    deadlineCountdown: 'Upcoming',
  };
};

// Fetch user team and all their classic leagues
export const fetchUserFPLProfile = async (teamId: number): Promise<FPLUserEntry> => {
  const url = `https://fantasy.premierleague.com/api/entry/${teamId}/`;
  const profile = await safeFplFetch<FPLUserEntry>(url);

  if (!profile || !profile.id) {
    throw new Error(`No FPL team found for Team ID ${teamId}.`);
  }

  return profile;
};

// Fetch real manager picks (captain, vice captain, starting 11 assets, bench points)
export const fetchManagerRealPicks = async (
  entryId: number,
  gwId: number
): Promise<ManagerRealPicks | null> => {
  const cacheKey = `atlas_picks_${entryId}_${gwId}`;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed: ManagerRealPicks = JSON.parse(raw);
      // Discard any corrupt cache containing "Player " or "Asset #"
      if (
        parsed.captainName &&
        !parsed.captainName.startsWith('Player ') &&
        !parsed.captainName.startsWith('Asset #')
      ) {
        return parsed;
      }
    }
  } catch {}

  try {
    const url = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gwId}/picks/`;
    const data = await safeFplFetch<FPLPicksResponse>(url);

    if (data && data.picks && data.picks.length > 0) {
      const captainPick = data.picks.find((p) => p.is_captain) || data.picks[0];
      const captainName = getPlayerNameById(captainPick.element);
      const captainMultiplier = captainPick.multiplier || 2;

      // Starting 11 players
      const startingPicks = data.picks.filter((p) => p.position <= 11);
      const assets = startingPicks.map((p) => getPlayerNameById(p.element));
      const benchPoints = data.entry_history?.points_on_bench || 0;

      const result: ManagerRealPicks = {
        captainName,
        captainMultiplier,
        assets,
        benchPoints,
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {}

      return result;
    }
  } catch (e) {
    // If picks not available for current live week, try previous week
    if (gwId > 1) {
      try {
        const fallbackUrl = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gwId - 1}/picks/`;
        const fbData = await safeFplFetch<FPLPicksResponse>(fallbackUrl);
        if (fbData && fbData.picks && fbData.picks.length > 0) {
          const captainPick = fbData.picks.find((p) => p.is_captain) || fbData.picks[0];
          const captainName = getPlayerNameById(captainPick.element);
          const captainMultiplier = captainPick.multiplier || 2;
          const startingPicks = fbData.picks.filter((p) => p.position <= 11);
          const assets = startingPicks.map((p) => getPlayerNameById(p.element));
          const benchPoints = fbData.entry_history?.points_on_bench || 0;
          return { captainName, captainMultiplier, assets, benchPoints };
        }
      } catch {}
    }
  }

  return null;
};

/**
 * Fetch full interactive squad (Starting 11 + Bench, Captain/VC, Chips, Hits)
 */
export const fetchManagerFullSquad = async (
  entryId: number,
  managerName: string,
  teamName: string,
  gwId: number
): Promise<ManagerSquadData | null> => {
  try {
    const url = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gwId}/picks/`;
    let data = await safeFplFetch<FPLPicksResponse>(url);

    if (!data || !data.picks || data.picks.length === 0) {
      if (gwId > 1) {
        const fbUrl = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${gwId - 1}/picks/`;
        data = await safeFplFetch<FPLPicksResponse>(fbUrl);
      }
    }

    if (!data || !data.picks || data.picks.length === 0) return null;

    const allPlayers: SquadPlayer[] = data.picks.map((p) => {
      const details = getPlayerDetailsById(p.element);
      return {
        id: p.element,
        name: details?.web_name || getPlayerNameById(p.element),
        web_name: details?.web_name || getPlayerNameById(p.element),
        team_name: details?.team_name || 'PL',
        team_id: details?.team || 0,
        element_type: details?.element_type || (p.position === 1 ? 1 : 3),
        position: p.position,
        is_captain: Boolean(p.is_captain),
        is_vice_captain: Boolean(p.is_vice_captain),
        multiplier: p.multiplier || (p.is_captain ? 2 : 1),
      };
    });

    const startingXI = allPlayers.filter((p) => p.position <= 11);
    const bench = allPlayers.filter((p) => p.position > 11);

    return {
      managerName,
      teamName,
      fplEntryId: entryId,
      gw: gwId,
      activeChip: data.active_chip || null,
      transfersCount: data.entry_history?.event_transfers || 0,
      transfersCost: data.entry_history?.event_transfers_cost || 0,
      startingXI,
      bench,
    };
  } catch (e) {
    console.warn('Failed to fetch full squad:', e);
    return null;
  }
};

// Enrich all members in a league with their real captains and real squad assets
export const enrichLeagueMembersWithRealPicks = async (
  members: LeagueMember[],
  gwId: number
): Promise<LeagueMember[]> => {
  const enriched = await Promise.all(
    members.map(async (m) => {
      const realPicks = await fetchManagerRealPicks(m.fpl_entry_id, gwId);
      if (realPicks) {
        return {
          ...m,
          captain_name: realPicks.captainName,
          captain_multiplier: realPicks.captainMultiplier,
          assets: realPicks.assets,
          bench_points: realPicks.benchPoints,
        };
      }
      return m;
    })
  );
  return enriched;
};

// Fetch standings for a specific league
export const fetchLeagueStandings = async (
  leagueId: number,
  userTeamId?: number,
  activeGwId?: number
): Promise<{ league: League; members: LeagueMember[] }> => {
  try {
    const url = `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`;
    const data = await safeFplFetch<FPLLeagueStandingsResponse>(url);

    if (!data || !data.league) {
      throw new Error(`Could not load league #${leagueId}.`);
    }

    const lgId = `league-${data.league.id}`;

    const league: League = {
      id: lgId,
      fpl_league_id: data.league.id,
      name: data.league.name,
      is_starred: true,
    };

    const targetGw = activeGwId || getCachedGameweekState()?.recentGwId || 10;

    const members: LeagueMember[] = (data.standings?.results || []).map((entry, idx) => {
      const isUser = userTeamId ? entry.entry === userTeamId : idx === 0;

      // Check if real picks were already cached for this manager in current gameweek
      let cachedPicks: ManagerRealPicks | null = null;
      try {
        const raw = localStorage.getItem(`atlas_picks_${entry.entry}_${targetGw}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed.captainName &&
            !parsed.captainName.startsWith('Player ') &&
            !parsed.captainName.startsWith('Asset #')
          ) {
            cachedPicks = parsed;
          }
        }
      } catch {}

      return {
        id: `member-${entry.entry}`,
        league_id: lgId,
        fpl_entry_id: entry.entry,
        manager_name: entry.player_name,
        team_name: entry.entry_name,
        gw_points: entry.event_total || 0,
        total_points: entry.total || 0,
        rank: entry.rank,
        prev_rank: entry.last_rank || entry.rank,
        captain_name: cachedPicks ? cachedPicks.captainName : 'Captain',
        captain_multiplier: cachedPicks ? cachedPicks.captainMultiplier : 2,
        is_online: isUser,
        is_starred: isUser,
        assets: cachedPicks ? cachedPicks.assets : [],
        bench_points: cachedPicks ? cachedPicks.benchPoints : 0,
      };
    });

    const result = { league, members };
    try {
      localStorage.setItem(`${STANDINGS_CACHE_PREFIX}${leagueId}`, JSON.stringify(result));
    } catch {}

    return result;
  } catch (err) {
    // If offline or network failed, check cache!
    const cached = getCachedLeagueData(leagueId);
    if (cached) {
      console.log(`[Offline Mode] Using cached standings for league #${leagueId}`);
      return cached;
    }
    throw err;
  }
};
