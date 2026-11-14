import { Message, LeagueMember, MatchEmbedData, EmbedImpactItem } from '../types';
import {
  safeFplFetch,
  getPlayerDetailsById,
  getPlayerNameById,
  getTeamNameById,
  calculateEventPoints,
} from './fplService';
import { sounds } from './soundEffects';
import { triggerHaptic } from './haptics';
import { notificationService } from './notificationService';

interface FPLFixtureStatItem {
  value: number;
  element: number; // player element ID
}

interface FPLFixtureStat {
  identifier: 'goals_scored' | 'assists' | 'own_goals' | 'penalties_saved' | 'red_cards' | 'yellow_cards' | 'bonus';
  a: FPLFixtureStatItem[];
  h: FPLFixtureStatItem[];
}

interface FPLFixture {
  id: number;
  event: number;
  started: boolean;
  finished: boolean;
  finished_provisional: boolean;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  minutes: number;
  stats: FPLFixtureStat[];
}

class FPLAutonomousBotService {
  private timer: any = null;
  private onNewBotMessage: ((msg: Message) => void) | null = null;
  private currentLeagueId: string = '';
  private members: LeagueMember[] = [];
  private currentGwId: number = 10;
  private seenEventKeys: Set<string> = new Set();
  private isInitialScan: boolean = true;

  constructor() {
    // Load previously announced event keys from localStorage
    try {
      const saved = localStorage.getItem('atlas_bot_seen_events');
      if (saved) {
        this.seenEventKeys = new Set(JSON.parse(saved));
      }
    } catch {}
  }

  private saveSeenEvents() {
    try {
      localStorage.setItem('atlas_bot_seen_events', JSON.stringify(Array.from(this.seenEventKeys)));
    } catch {}
  }

  public start(
    leagueId: string,
    members: LeagueMember[],
    gwId: number,
    onMessage: (msg: Message) => void
  ) {
    this.currentLeagueId = leagueId;
    this.members = members;
    this.currentGwId = gwId;
    this.onNewBotMessage = onMessage;
    this.isInitialScan = true;

    if (this.timer) {
      clearInterval(this.timer);
    }

    // Run first check after 3 seconds, then periodically every 60 seconds
    setTimeout(() => this.pollMatchdayEvents(), 3000);
    this.timer = setInterval(() => this.pollMatchdayEvents(), 60000);
  }

  public updateContext(leagueId: string, members: LeagueMember[], gwId: number) {
    this.currentLeagueId = leagueId;
    this.members = members;
    this.currentGwId = gwId;
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Silently records stats for a fixture into seenEventKeys without triggering announcements or notifications
   */
  private silentlyMarkFixtureStatsSeen(fix: FPLFixture) {
    if (!fix.stats || fix.stats.length === 0) return;
    let added = false;

    for (const stat of fix.stats) {
      if (stat.identifier === 'goals_scored') {
        const homeScorers = stat.h || [];
        const awayScorers = stat.a || [];
        const allScorers = [...homeScorers, ...awayScorers];
        for (const item of allScorers) {
          const eventKey = `goal_${fix.id}_${item.element}_${item.value}`;
          if (!this.seenEventKeys.has(eventKey)) {
            this.seenEventKeys.add(eventKey);
            added = true;
          }
        }
      } else if (stat.identifier === 'assists') {
        const homeAssists = stat.h || [];
        const awayAssists = stat.a || [];
        const allAssists = [...homeAssists, ...awayAssists];
        for (const item of allAssists) {
          const eventKey = `assist_${fix.id}_${item.element}_${item.value}`;
          if (!this.seenEventKeys.has(eventKey)) {
            this.seenEventKeys.add(eventKey);
            added = true;
          }
        }
      } else if (stat.identifier === 'red_cards') {
        const homeReds = stat.h || [];
        const awayReds = stat.a || [];
        const allReds = [...homeReds, ...awayReds];
        for (const item of allReds) {
          const eventKey = `red_${fix.id}_${item.element}`;
          if (!this.seenEventKeys.has(eventKey)) {
            this.seenEventKeys.add(eventKey);
            added = true;
          }
        }
      }
    }

    if (added) {
      this.saveSeenEvents();
    }
  }

  /**
   * Autonomous polling: Checks official FPL fixtures for LIVE in-progress matches
   */
  private async pollMatchdayEvents() {
    if (!this.currentLeagueId || !this.onNewBotMessage) return;

    try {
      // Query official FPL fixtures for the active gameweek
      const fixturesUrl = `https://fantasy.premierleague.com/api/fixtures/?event=${this.currentGwId}`;
      const fixtures = await safeFplFetch<FPLFixture[]>(fixturesUrl);

      if (fixtures && Array.isArray(fixtures)) {
        for (const fix of fixtures) {
          // 1. If match is finished or provisional finished:
          // Silently mark all its events as seen so they NEVER trigger alerts, and skip announcing
          if (fix.finished || fix.finished_provisional) {
            this.silentlyMarkFixtureStatsSeen(fix);
            continue;
          }

          // 2. If match has not started yet: skip
          if (!fix.started) {
            continue;
          }

          // 3. Match is strictly LIVE right now (started && !finished)
          if (fix.stats && fix.stats.length > 0) {
            if (this.isInitialScan) {
              // On initial app launch, seed any goals scored before app opened
              // so the user is never bombarded with retroactive notifications
              this.silentlyMarkFixtureStatsSeen(fix);
            } else {
              this.processFixtureStats(fix);
            }
          }
        }
      }
    } catch (err) {
      // Background poll silently catches errors without disturbing UI
    } finally {
      this.isInitialScan = false;
    }
  }

  /**
   * Processes live goals, assists, and red cards from an in-progress Premier League fixture
   */
  private processFixtureStats(fix: FPLFixture) {
    // Extra safety guard: never process finished matches
    if (fix.finished || fix.finished_provisional || !fix.started) {
      this.silentlyMarkFixtureStatsSeen(fix);
      return;
    }
    const homeTeam = getTeamNameById(fix.team_h);
    const awayTeam = getTeamNameById(fix.team_a);
    const fixtureTitle = `${homeTeam} ${fix.team_h_score ?? 0} - ${fix.team_a_score ?? 0} ${awayTeam}`;
    const minuteStr = fix.finished ? 'FT' : `${fix.minutes}'`;

    for (const stat of fix.stats) {
      // Live Goal Scored
      if (stat.identifier === 'goals_scored') {
        const homeScorers = (stat.h || []).map((i) => ({ ...i, team: homeTeam }));
        const awayScorers = (stat.a || []).map((i) => ({ ...i, team: awayTeam }));
        const allScorers = [...homeScorers, awayScorers].flat();

        for (const item of allScorers) {
          const eventKey = `goal_${fix.id}_${item.element}_${item.value}`;
          if (!this.seenEventKeys.has(eventKey)) {
            this.seenEventKeys.add(eventKey);
            this.saveSeenEvents();

            const details = getPlayerDetailsById(item.element);
            const playerName = details?.web_name || getPlayerNameById(item.element);
            const playerTeam = details?.team_name || item.team;
            const pts = calculateEventPoints('goal', details?.element_type);

            this.announceGoal({ name: playerName, team: playerTeam, points: pts }, fixtureTitle, minuteStr);
          }
        }
      }

      // Live Assist
      if (stat.identifier === 'assists') {
        const homeAssists = (stat.h || []).map((i) => ({ ...i, team: homeTeam }));
        const awayAssists = (stat.a || []).map((i) => ({ ...i, team: awayTeam }));
        const allAssists = [...homeAssists, ...awayAssists];

        for (const item of allAssists) {
          const eventKey = `assist_${fix.id}_${item.element}_${item.value}`;
          if (!this.seenEventKeys.has(eventKey)) {
            this.seenEventKeys.add(eventKey);
            this.saveSeenEvents();

            const details = getPlayerDetailsById(item.element);
            const playerName = details?.web_name || getPlayerNameById(item.element);
            const playerTeam = details?.team_name || item.team;
            const pts = calculateEventPoints('assist');

            this.announceAssist({ name: playerName, team: playerTeam, points: pts }, fixtureTitle, minuteStr);
          }
        }
      }

      // Live Red Card
      if (stat.identifier === 'red_cards') {
        const homeReds = (stat.h || []).map((i) => ({ ...i, team: homeTeam }));
        const awayReds = (stat.a || []).map((i) => ({ ...i, team: awayTeam }));
        const allReds = [...homeReds, ...awayReds];

        for (const item of allReds) {
          const eventKey = `red_${fix.id}_${item.element}`;
          if (!this.seenEventKeys.has(eventKey)) {
            this.seenEventKeys.add(eventKey);
            this.saveSeenEvents();

            const details = getPlayerDetailsById(item.element);
            const playerName = details?.web_name || getPlayerNameById(item.element);
            const playerTeam = details?.team_name || item.team;

            this.announceRedCard({ name: playerName, team: playerTeam, points: -3 }, fixtureTitle, minuteStr);
          }
        }
      }
    }
  }

  /**
   * Announce real goal event into #matchday-live
   */
  private announceGoal(
    player: { name: string; team: string; points: number },
    fixtureTitle: string,
    minute: string
  ) {
    const impactItems: EmbedImpactItem[] = [];
    const surname = player.name.split(' ').pop()?.toLowerCase() || '';

    // 1. Check Captain Owners in this mini-league
    const captainManagers = this.members.filter((m) =>
      m.captain_name?.toLowerCase().includes(surname)
    );

    if (captainManagers.length > 0) {
      captainManagers.forEach((m) => {
        const mult = m.captain_multiplier || 2;
        impactItems.push({
          text: `@${m.manager_name} (+${player.points * mult} pts Captain!)`,
          positive: true,
          member_name: m.manager_name,
        });
      });
    }

    // 2. Check Starting 11 squad owners (who didn't captain him)
    const squadManagers = this.members.filter(
      (m) =>
        !captainManagers.some((c) => c.id === m.id) &&
        m.assets?.some((a) => a.toLowerCase().includes(surname))
    );

    squadManagers.forEach((m) => {
      impactItems.push({
        text: `@${m.manager_name} (+${player.points} pts in squad)`,
        positive: true,
        member_name: m.manager_name,
      });
    });

    // 3. Differential status if nobody in league owns him
    if (impactItems.length === 0) {
      impactItems.push({
        text: 'No managers in league own this asset (Differential dodge)',
        positive: false,
      });
    }

    const embedData: MatchEmbedData = {
      type: 'goal',
      fixture: fixtureTitle,
      minute,
      player_name: player.name,
      player_team: player.team,
      event_title: 'Goal Scored',
      pts_scored: player.points,
      impact_items: impactItems,
    };

    const impactText = impactItems.map((i) => i.text).join(' • ');
    const content = `⚽ **${player.name}** scores for ${player.team}! (${minute})\nImpact: ${impactText}`;

    this.postBotMessage('matchday-live', content, embedData);

    notificationService.sendInstantAlert(
      `⚽ GOAL: ${player.name} (${player.team})`,
      `${player.name} scored (${minute})! ${impactText}`
    );
  }

  /**
   * Announce real assist event into #matchday-live
   */
  private announceAssist(
    player: { name: string; team: string; points: number },
    fixtureTitle: string,
    minute: string
  ) {
    const impactItems: EmbedImpactItem[] = [];
    const surname = player.name.split(' ').pop()?.toLowerCase() || '';

    const captainManagers = this.members.filter((m) =>
      m.captain_name?.toLowerCase().includes(surname)
    );

    if (captainManagers.length > 0) {
      captainManagers.forEach((m) => {
        const mult = m.captain_multiplier || 2;
        impactItems.push({
          text: `@${m.manager_name} (+${player.points * mult} pts Captain Assist!)`,
          positive: true,
          member_name: m.manager_name,
        });
      });
    }

    const squadManagers = this.members.filter(
      (m) =>
        !captainManagers.some((c) => c.id === m.id) &&
        m.assets?.some((a) => a.toLowerCase().includes(surname))
    );

    squadManagers.forEach((m) => {
      impactItems.push({
        text: `@${m.manager_name} (+${player.points} pts Assist in squad)`,
        positive: true,
        member_name: m.manager_name,
      });
    });

    if (impactItems.length === 0) {
      impactItems.push({
        text: 'Unowned in mini-league',
        positive: false,
      });
    }

    const embedData: MatchEmbedData = {
      type: 'assist',
      fixture: fixtureTitle,
      minute,
      player_name: player.name,
      player_team: player.team,
      event_title: 'Assist Provided',
      pts_scored: player.points,
      impact_items: impactItems,
    };

    const impactText = impactItems.map((i) => i.text).join(' • ');
    const content = `🅰️ **${player.name}** assists for ${player.team}! (${minute})\nImpact: ${impactText}`;

    this.postBotMessage('matchday-live', content, embedData);
  }

  /**
   * Announce red card event
   */
  private announceRedCard(
    player: { name: string; team: string; points: number },
    fixtureTitle: string,
    minute: string
  ) {
    const impactItems: EmbedImpactItem[] = [];
    const surname = player.name.split(' ').pop()?.toLowerCase() || '';

    const captainManagers = this.members.filter((m) =>
      m.captain_name?.toLowerCase().includes(surname)
    );

    captainManagers.forEach((m) => {
      impactItems.push({
        text: `@${m.manager_name} (-6 pts Captain Red Card penalty)`,
        positive: false,
        member_name: m.manager_name,
      });
    });

    const squadManagers = this.members.filter(
      (m) =>
        !captainManagers.some((c) => c.id === m.id) &&
        m.assets?.some((a) => a.toLowerCase().includes(surname))
    );

    squadManagers.forEach((m) => {
      impactItems.push({
        text: `@${m.manager_name} (-3 pts card deduction)`,
        positive: false,
        member_name: m.manager_name,
      });
    });

    if (impactItems.length === 0) {
      impactItems.push({
        text: 'No managers in league own this asset',
        positive: true,
      });
    }

    const embedData: MatchEmbedData = {
      type: 'red_card',
      fixture: fixtureTitle,
      minute,
      player_name: player.name,
      player_team: player.team,
      event_title: 'Red Card Issued',
      pts_scored: -3,
      impact_items: impactItems,
    };

    const content = `🟥 **RED CARD!** ${player.name} (${player.team}) has been sent off! (${minute})`;
    this.postBotMessage('matchday-live', content, embedData);

    notificationService.sendInstantAlert(
      `🟥 RED CARD: ${player.name}`,
      `${player.name} (${player.team}) has been sent off (${minute})!`
    );
  }

  private postBotMessage(channel: 'matchday-live' | 'banter', content: string, embedData?: MatchEmbedData) {
    if (!this.onNewBotMessage) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const msg: Message = {
      id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      league_id: this.currentLeagueId,
      channel,
      sender_id: 'atlas-matchday-bot',
      sender_name: 'ATLAS Bot',
      is_bot: true,
      content,
      created_at: timeStr,
      embed_data: embedData,
      reactions: {
        '🔥': ['ATLAS Bot'],
      },
    };

    // Play Discord chime and trigger haptic
    sounds.playChime();
    triggerHaptic('light');

    this.onNewBotMessage(msg);
  }
}

export const fplBot = new FPLAutonomousBotService();
