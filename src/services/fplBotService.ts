import { Message, LeagueMember, MatchEmbedData, EmbedImpactItem } from '../types';
import {
  safeFplFetch,
  getPlayerDetailsById,
  getPlayerNameById,
  getTeamNameById,
  calculateEventPoints,
  getTeamDefenderNames,
} from './fplService';
import { sounds } from './soundEffects';
import { triggerHaptic } from './haptics';
import { notificationService } from './notificationService';

interface FPLFixtureStatItem {
  value: number;
  element: number; // player element ID
}

interface FPLFixtureStat {
  identifier: 'goals_scored' | 'assists' | 'own_goals' | 'penalties_saved' | 'red_cards' | 'yellow_cards' | 'bonus' | 'bps';
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

    // Mark DEFCON, Clean Sheet Confirm, and BPS keys as seen so finished matches never trigger alerts
    const homeDefconKey = `defcon_${fix.id}_home`;
    const awayDefconKey = `defcon_${fix.id}_away`;
    const homeCsKey = `cs_confirm_${fix.id}_home`;
    const awayCsKey = `cs_confirm_${fix.id}_away`;
    const bonusKey = `bonus_lock_${fix.id}`;
    if (!this.seenEventKeys.has(homeDefconKey)) {
      this.seenEventKeys.add(homeDefconKey);
      added = true;
    }
    if (!this.seenEventKeys.has(awayDefconKey)) {
      this.seenEventKeys.add(awayDefconKey);
      added = true;
    }
    if (!this.seenEventKeys.has(homeCsKey)) {
      this.seenEventKeys.add(homeCsKey);
      added = true;
    }
    if (!this.seenEventKeys.has(awayCsKey)) {
      this.seenEventKeys.add(awayCsKey);
      added = true;
    }
    if (!this.seenEventKeys.has(bonusKey)) {
      this.seenEventKeys.add(bonusKey);
      added = true;
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

    // 1. DEFCON Check: Home team conceded (Away score >= 1)
    if (fix.team_a_score !== null && fix.team_a_score >= 1) {
      const defconKey = `defcon_${fix.id}_home`;
      if (!this.seenEventKeys.has(defconKey)) {
        this.seenEventKeys.add(defconKey);
        this.saveSeenEvents();
        this.announceDefconCleanSheetWiped(homeTeam, fix.team_h, fixtureTitle, minuteStr);
      }
    }

    // 2. DEFCON Check: Away team conceded (Home score >= 1)
    if (fix.team_h_score !== null && fix.team_h_score >= 1) {
      const defconKey = `defcon_${fix.id}_away`;
      if (!this.seenEventKeys.has(defconKey)) {
        this.seenEventKeys.add(defconKey);
        this.saveSeenEvents();
        this.announceDefconCleanSheetWiped(awayTeam, fix.team_a, fixtureTitle, minuteStr);
      }
    }

    // 3. Live BPS Bonus Points Lock Check (at 75'+ or Full Time)
    const bpsStat = fix.stats.find((s) => s.identifier === 'bps');
    if (bpsStat && (fix.minutes >= 75 || fix.finished)) {
      const bonusKey = `bonus_lock_${fix.id}`;
      if (!this.seenEventKeys.has(bonusKey)) {
        this.seenEventKeys.add(bonusKey);
        this.saveSeenEvents();
        this.announceBpsBonusLock(fix, bpsStat, fixtureTitle, minuteStr);
      }
    }

    // 4. Clean Sheet Confirmed Lock (when fixture finishes with 0 conceded)
    if (fix.finished) {
      if (fix.team_a_score === 0) {
        const homeCsKey = `cs_confirm_${fix.id}_home`;
        if (!this.seenEventKeys.has(homeCsKey)) {
          this.seenEventKeys.add(homeCsKey);
          this.saveSeenEvents();
          this.announceCleanSheetConfirmed(homeTeam, fix.team_h, fixtureTitle);
        }
      }
      if (fix.team_h_score === 0) {
        const awayCsKey = `cs_confirm_${fix.id}_away`;
        if (!this.seenEventKeys.has(awayCsKey)) {
          this.seenEventKeys.add(awayCsKey);
          this.saveSeenEvents();
          this.announceCleanSheetConfirmed(awayTeam, fix.team_a, fixtureTitle);
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

    // 2. Check Starting 11 squad owners (who didn't captain him)
    const squadManagers = this.members.filter(
      (m) =>
        !captainManagers.some((c) => c.id === m.id) &&
        m.assets?.some((a) => a.toLowerCase().includes(surname))
    );

    const totalOwnersCount = captainManagers.length + squadManagers.length;
    const isSoloDifferential = totalOwnersCount === 1;

    if (captainManagers.length > 0) {
      captainManagers.forEach((m) => {
        const mult = m.captain_multiplier || 2;
        const pts = player.points * mult;
        const text = isSoloDifferential
          ? `🎯 SOLO DIFFERENTIAL (C): @${m.manager_name} (+${pts} pts - Sole owner in league!)`
          : `@${m.manager_name} (+${pts} pts Captain!)`;
        impactItems.push({
          text,
          positive: true,
          member_name: m.manager_name,
        });
      });
    }

    squadManagers.forEach((m) => {
      const text = isSoloDifferential
        ? `🎯 SOLO DIFFERENTIAL: @${m.manager_name} (+${player.points} pts - Sole owner in league!)`
        : `@${m.manager_name} (+${player.points} pts in squad)`;
      impactItems.push({
        text,
        positive: true,
        member_name: m.manager_name,
      });
    });

    // 3. Template punishment check: if >= 60% of the league or (totalMembers >= 3 and nonOwners <= 2)
    const nonOwners = this.members.filter(
      (m) =>
        !captainManagers.some((c) => c.id === m.id) &&
        !squadManagers.some((s) => s.id === m.id)
    );

    if (this.members.length >= 3 && totalOwnersCount >= 2 && nonOwners.length <= 2) {
      nonOwners.forEach((m) => {
        impactItems.push({
          text: `⚠️ TEMPLATE PUNISHMENT: @${m.manager_name} (0 pts - Taking rank damage!)`,
          positive: false,
          member_name: m.manager_name,
        });
      });
    }

    // 4. Differential status if nobody in league owns him
    if (totalOwnersCount === 0) {
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
      event_title: isSoloDifferential ? '🎯 Solo Differential Goal' : 'Goal Scored',
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

  /**
   * Announce DEFCON 1 clean sheet loss (excluding goalkeepers)
   */
  private announceDefconCleanSheetWiped(
    teamName: string,
    teamId: number,
    fixtureTitle: string,
    minute: string
  ) {
    const defenderNames = getTeamDefenderNames(teamId);
    if (defenderNames.size === 0) return;

    const impactItems: EmbedImpactItem[] = [];

    this.members.forEach((m) => {
      // Find all defenders owned by this manager in their Starting XI (excluding goalkeepers)
      const ownedDefs = (m.assets || []).filter((a) => defenderNames.has(a.toLowerCase()));

      if (ownedDefs.length > 0) {
        const isCaptain = Boolean(m.captain_name && defenderNames.has(m.captain_name.toLowerCase()));
        const totalPtsLost = ownedDefs.length * 4 + (isCaptain ? (m.captain_multiplier - 1) * 4 : 0);

        impactItems.push({
          text: `@${m.manager_name} (-${totalPtsLost} pts: ${ownedDefs.join(', ')} CS wiped${isCaptain ? ' (C)' : ''})`,
          positive: false,
          member_name: m.manager_name,
        });
      }
    });

    if (impactItems.length === 0) {
      impactItems.push({
        text: `No managers in league own ${teamName} defenders (DEFCON Dodged)`,
        positive: true,
      });
    }

    const impactText = impactItems.map((i) => i.text).join(' • ');
    const content = `🛡️ **DEFCON 1: ${teamName} Clean Sheet WIPED!** (${minute})\nAll ${teamName} defenders lose their +4 Clean Sheet bonus.\nImpact: ${impactText}`;

    const embedData: MatchEmbedData = {
      type: 'clean_sheet_lost',
      fixture: fixtureTitle,
      minute,
      player_name: `${teamName} Defenders`,
      player_team: teamName,
      event_title: 'DEFCON 1: Clean Sheet Wiped',
      pts_scored: -4,
      impact_items: impactItems,
    };

    this.postBotMessage('matchday-live', content, embedData);

    const hasImpactedManagers = impactItems.some((i) => !i.text.includes('Dodged') && i.member_name);
    if (hasImpactedManagers) {
      notificationService.sendInstantAlert(
        `🛡️ DEFCON 1: ${teamName} Clean Sheet Wiped!`,
        `All defenders lose +4 CS points (${minute})! ${impactText}`
      );
    }
  }

  /**
   * Announce Clean Sheet Confirmed (excluding goalkeepers) when fixture finishes
   */
  private announceCleanSheetConfirmed(
    teamName: string,
    teamId: number,
    fixtureTitle: string
  ) {
    const defenderNames = getTeamDefenderNames(teamId);
    if (defenderNames.size === 0) return;

    const impactItems: EmbedImpactItem[] = [];
    const ownerManagers: { manager: LeagueMember; defs: string[] }[] = [];

    this.members.forEach((m) => {
      const ownedDefs = (m.assets || []).filter((a) => defenderNames.has(a.toLowerCase()));
      if (ownedDefs.length > 0) {
        ownerManagers.push({ manager: m, defs: ownedDefs });
      }
    });

    const isSolo = ownerManagers.length === 1;

    ownerManagers.forEach(({ manager: m, defs }) => {
      const isCaptain = Boolean(m.captain_name && defenderNames.has(m.captain_name.toLowerCase()));
      const totalPts = defs.length * 4 + (isCaptain ? (m.captain_multiplier - 1) * 4 : 0);
      const text = isSolo
        ? `🎯 SOLO DIFFERENTIAL HAUL: @${m.manager_name} (+${totalPts} pts: ${defs.join(', ')} CS locked - Sole owner!)`
        : `@${m.manager_name} (+${totalPts} pts: ${defs.join(', ')} CS locked${isCaptain ? ' (C)' : ''})`;

      impactItems.push({
        text,
        positive: true,
        member_name: m.manager_name,
      });
    });

    // Check for template punishment if majority own defenders from this team
    if (this.members.length >= 3 && ownerManagers.length >= 2) {
      const nonOwners = this.members.filter((m) => !ownerManagers.some((o) => o.manager.id === m.id));
      if (nonOwners.length <= 2) {
        nonOwners.forEach((m) => {
          impactItems.push({
            text: `⚠️ TEMPLATE PUNISHMENT: @${m.manager_name} (0 pts - Missed ${teamName} CS!)`,
            positive: false,
            member_name: m.manager_name,
          });
        });
      }
    }

    if (impactItems.length === 0) {
      impactItems.push({
        text: `No managers in league own ${teamName} defenders`,
        positive: false,
      });
    }

    const impactText = impactItems.map((i) => i.text).join(' • ');
    const content = `🛡️ **CLEAN SHEET LOCKED: ${teamName}** (FT: 0 conceded)\nDefenders secure +4 Clean Sheet points!\nImpact: ${impactText}`;

    const embedData: MatchEmbedData = {
      type: 'clean_sheet_lost', // Re-uses clean sheet embed style with positive points
      fixture: fixtureTitle,
      minute: 'FT',
      player_name: `${teamName} Defenders`,
      player_team: teamName,
      event_title: isSolo ? '🎯 Solo Differential Clean Sheet' : 'Clean Sheet Locked',
      pts_scored: 4,
      impact_items: impactItems,
    };

    this.postBotMessage('matchday-live', content, embedData);

    const hasRewardedManagers = impactItems.some((i) => i.positive && i.member_name);
    if (hasRewardedManagers) {
      notificationService.sendInstantAlert(
        `🛡️ CS LOCKED: ${teamName} (FT)`,
        `Clean sheet confirmed! ${impactText}`
      );
    }
  }

  /**
   * Announce live Bonus Points (BPS) lock for a fixture
   */
  private announceBpsBonusLock(
    fix: FPLFixture,
    bpsStat: FPLFixtureStat,
    fixtureTitle: string,
    minute: string
  ) {
    const allBps = [...(bpsStat.h || []), ...(bpsStat.a || [])].filter((i) => i.value > 0);
    allBps.sort((a, b) => b.value - a.value);

    if (allBps.length < 3) return;

    // Top 3 BPS
    const top1 = allBps[0];
    const top2 = allBps[1];
    const top3 = allBps[2];

    const p1Details = getPlayerDetailsById(top1.element);
    const p2Details = getPlayerDetailsById(top2.element);
    const p3Details = getPlayerDetailsById(top3.element);

    const p1Name = p1Details?.web_name || getPlayerNameById(top1.element);
    const p2Name = p2Details?.web_name || getPlayerNameById(top2.element);
    const p3Name = p3Details?.web_name || getPlayerNameById(top3.element);

    const impactItems: EmbedImpactItem[] = [];

    // Check league owners for Top 1 (3 pts)
    this.members.forEach((m) => {
      const isCaptain = m.captain_name?.toLowerCase().includes(p1Name.toLowerCase());
      const inSquad = m.assets?.some((a) => a.toLowerCase().includes(p1Name.toLowerCase()));
      if (isCaptain) {
        impactItems.push({
          text: `@${m.manager_name} (+${3 * m.captain_multiplier} pts Captain 3 Bonus!)`,
          positive: true,
          member_name: m.manager_name,
        });
      } else if (inSquad) {
        impactItems.push({
          text: `@${m.manager_name} (+3 pts 3 Bonus)`,
          positive: true,
          member_name: m.manager_name,
        });
      }
    });

    // Check league owners for Top 2 (2 pts)
    this.members.forEach((m) => {
      const isCaptain = m.captain_name?.toLowerCase().includes(p2Name.toLowerCase());
      const inSquad = m.assets?.some((a) => a.toLowerCase().includes(p2Name.toLowerCase()));
      if (isCaptain) {
        impactItems.push({
          text: `@${m.manager_name} (+${2 * m.captain_multiplier} pts Captain 2 Bonus!)`,
          positive: true,
          member_name: m.manager_name,
        });
      } else if (inSquad) {
        impactItems.push({
          text: `@${m.manager_name} (+2 pts 2 Bonus)`,
          positive: true,
          member_name: m.manager_name,
        });
      }
    });

    if (impactItems.length === 0) {
      impactItems.push({
        text: 'No managers in league own top bonus assets',
        positive: false,
      });
    }

    const impactText = impactItems.map((i) => i.text).join(' • ');
    const content = `🥇 **BONUS POINTS LOCKED: ${fixtureTitle}** (${minute})\n` +
      `• 3 pts: **${p1Name}** (${top1.value} BPS)\n` +
      `• 2 pts: **${p2Name}** (${top2.value} BPS)\n` +
      `• 1 pt: **${p3Name}** (${top3.value} BPS)\n` +
      `Impact: ${impactText}`;

    const embedData: MatchEmbedData = {
      type: 'bonus_swing',
      fixture: fixtureTitle,
      minute,
      player_name: p1Name,
      player_team: p1Details?.team_name || 'PL',
      event_title: 'Bonus Points (BPS) Locked',
      pts_scored: 3,
      impact_items: impactItems,
    };

    this.postBotMessage('matchday-live', content, embedData);

    const hasBonusManagers = impactItems.some((i) => i.positive && i.member_name);
    if (hasBonusManagers) {
      notificationService.sendInstantAlert(
        `🥇 BONUS LOCKED: ${p1Name} (3 pts)`,
        `${fixtureTitle} (${minute})! ${impactText}`
      );
    }
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
