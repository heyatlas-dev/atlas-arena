import { getSupabase } from './supabaseClient';

export interface UserAccount {
  teamId: number;
  passwordHash: string;
  managerName: string;
  teamName: string;
  overallPoints: number;
  overallRank: number;
  starredLeagueId: string;
  createdAt: string;
}

const STORAGE_KEY = 'atlas_arena_account';
const ALL_ACCOUNTS_KEY = 'atlas_arena_all_accounts';

// Simple fast hash for client-side password verification
export const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash).toString(16)}`;
};

export const getLocalAccount = (): UserAccount | null => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : null;
};

export const saveLocalAccount = (account: UserAccount) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  
  // Also store in device accounts registry
  const allRaw = localStorage.getItem(ALL_ACCOUNTS_KEY);
  const allAccounts: Record<string, UserAccount> = allRaw ? JSON.parse(allRaw) : {};
  allAccounts[String(account.teamId)] = account;
  localStorage.setItem(ALL_ACCOUNTS_KEY, JSON.stringify(allAccounts));
};

export const clearLocalAccount = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('atlas_leagues');
  localStorage.removeItem('atlas_current_league');
};

// Sync account to Supabase Cloud if configured
export const syncAccountToCloud = async (account: UserAccount): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.from('arena_users').upsert(
      {
        fpl_entry_id: account.teamId,
        manager_name: account.managerName,
        team_name: account.teamName,
        password_hash: account.passwordHash,
        overall_points: account.overallPoints || 0,
        overall_rank: account.overallRank || 0,
        starred_league_id: account.starredLeagueId || null,
        last_seen: new Date().toISOString(),
      },
      { onConflict: 'fpl_entry_id' }
    );

    if (error) {
      console.warn('Could not sync account to arena_users:', error);
    }
  } catch (e) {
    console.warn('Could not sync to cloud:', e);
  }
};

// Log in with FPL Team ID + Password
export const loginWithCredentials = async (
  teamId: number,
  password: string
): Promise<{ success: boolean; account?: UserAccount; error?: string }> => {
  const expectedHash = hashPassword(password);
  const teamIdKey = String(teamId);

  // 1. Check local accounts registry on device
  const allRaw = localStorage.getItem(ALL_ACCOUNTS_KEY);
  const allAccounts: Record<string, UserAccount> = allRaw ? JSON.parse(allRaw) : {};

  if (allAccounts[teamIdKey]) {
    const acc = allAccounts[teamIdKey];
    if (acc.passwordHash === expectedHash) {
      saveLocalAccount(acc);
      // Sync latest seen time to cloud
      syncAccountToCloud(acc).catch(() => {});
      return { success: true, account: acc };
    } else {
      return { success: false, error: 'Incorrect password for this FPL Team ID.' };
    }
  }

  // 2. Try checking cloud Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('arena_users')
        .select('*')
        .eq('fpl_entry_id', teamId)
        .single();

      if (data && !error) {
        if (data.password_hash === expectedHash) {
          const acc: UserAccount = {
            teamId,
            passwordHash: expectedHash,
            managerName: data.manager_name,
            teamName: data.team_name,
            overallPoints: data.overall_points || 0,
            overallRank: data.overall_rank || 0,
            starredLeagueId: data.starred_league_id || '',
            createdAt: data.created_at || new Date().toISOString(),
          };
          saveLocalAccount(acc);
          return { success: true, account: acc };
        } else {
          return { success: false, error: 'Incorrect password for this FPL Team ID.' };
        }
      }
    } catch (e) {
      console.warn('Cloud login lookup failed:', e);
    }
  }

  return {
    success: false,
    error: 'Account not found for this FPL Team ID on this device. Please use "Create Account" first.',
  };
};
