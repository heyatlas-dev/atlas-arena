import { LeagueMember, Message, MatchEmbedData, EmbedImpactItem } from '../types';
import { sounds } from './soundEffects';
import { triggerHaptic } from './haptics';
import { notificationService } from './notificationService';

export class GameweekRecapService {
  private seenRecapKeys: Set<string> = new Set();

  constructor() {
    const saved = localStorage.getItem('atlas_seen_recaps');
    if (saved) {
      try {
        this.seenRecapKeys = new Set(JSON.parse(saved));
      } catch {}
    }
  }

  private saveSeenKeys() {
    try {
      localStorage.setItem('atlas_seen_recaps', JSON.stringify(Array.from(this.seenRecapKeys)));
    } catch {}
  }

  /**
   * Generates and returns a Gameweek Awards Ceremony embed message
   */
  public generateRecap(
    leagueId: string,
    members: LeagueMember[],
    gwId: number,
    force = false
  ): Message | null {
    if (!members || members.length < 2) return null;

    const recapKey = `recap_${leagueId}_gw${gwId}`;
    if (!force && this.seenRecapKeys.has(recapKey)) {
      return null;
    }

    this.seenRecapKeys.add(recapKey);
    this.saveSeenKeys();

    // 1. Sort by GW points
    const sortedByGw = [...members].sort((a, b) => b.gw_points - a.gw_points);
    const winner = sortedByGw[0];
    const clown = sortedByGw[sortedByGw.length - 1];

    // 2. Sort by rank climbers
    const withRankShift = members.map((m) => {
      const prev = m.prev_rank || m.rank;
      const climb = prev - m.rank;
      return { member: m, climb };
    });
    withRankShift.sort((a, b) => b.climb - a.climb);

    const rocket = withRankShift[0].climb > 0 ? withRankShift[0] : null;
    const dropper = withRankShift[withRankShift.length - 1].climb < 0 ? withRankShift[withRankShift.length - 1] : null;

    // 3. Bench regret
    const sortedByBench = [...members].sort((a, b) => (b.bench_points || 0) - (a.bench_points || 0));
    const benchKing = sortedByBench[0]?.bench_points && sortedByBench[0].bench_points > 4 ? sortedByBench[0] : null;

    const impactItems: EmbedImpactItem[] = [
      {
        text: `👑 KING OF THE GAMEWEEK: @${winner.manager_name} (+${winner.gw_points} pts haul! 🍾)`,
        positive: true,
        member_name: winner.manager_name,
      },
      {
        text: `🤡 CLOWN OF THE GAMEWEEK: @${clown.manager_name} (${clown.gw_points} pts - Taking the dunce cap 🎩)`,
        positive: false,
        member_name: clown.manager_name,
      },
    ];

    if (rocket) {
      impactItems.push({
        text: `🚀 ROCKET OF THE WEEK: @${rocket.member.manager_name} (Climbed +${rocket.climb} spots to #${rocket.member.rank})`,
        positive: true,
        member_name: rocket.member.manager_name,
      });
    }

    if (dropper) {
      impactItems.push({
        text: `📉 FREEFALL AWARD: @${dropper.member.manager_name} (Dropped ${Math.abs(dropper.climb)} spots to #${dropper.member.rank})`,
        positive: false,
        member_name: dropper.member.manager_name,
      });
    }

    if (benchKing) {
      impactItems.push({
        text: `🧤 BENCH REGRET: @${benchKing.manager_name} left ${benchKing.bench_points} pts stranded on the bench!`,
        positive: false,
        member_name: benchKing.manager_name,
      });
    }

    const embedData: MatchEmbedData = {
      type: 'gameweek_recap',
      fixture: `Gameweek ${gwId} Official Ceremony`,
      minute: 'CONCLUDED',
      player_name: `${winner.manager_name} (👑 Winner)`,
      player_team: winner.team_name,
      event_title: `Gameweek ${gwId} Hall of Fame & Shame`,
      pts_scored: winner.gw_points,
      impact_items: impactItems,
    };

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const content =
      `🏆 **OFFICIAL GAMEWEEK ${gwId} AWARDS CEREMONY**\n\n` +
      `👑 **Manager of the Week:** @${winner.manager_name} with an astonishing **${winner.gw_points} pts**!\n` +
      `🤡 **Dunce Cap:** @${clown.manager_name} with **${clown.gw_points} pts**.\n` +
      (rocket ? `🚀 **Biggest Climber:** @${rocket.member.manager_name} (+${rocket.climb} ranks)\n` : '') +
      `\nTime to pay your debts and make your transfers for the next round! 🍻`;

    const msg: Message = {
      id: `recap-${gwId}-${Date.now()}`,
      league_id: leagueId,
      channel: 'banter',
      sender_id: 'atlas-awards-bot',
      sender_name: 'ATLAS Awards Bot',
      is_bot: true,
      content,
      embed_data: embedData,
      created_at: timeStr,
      reactions: {
        '👑': [winner.manager_name],
        '🤡': [clown.manager_name],
      },
    };

    sounds.playChime();
    triggerHaptic('medium');

    notificationService.sendInstantAlert(
      `🏆 GW ${gwId} Awards Ceremony!`,
      `👑 @${winner.manager_name} wins GW ${gwId} with ${winner.gw_points} pts! 🤡 @${clown.manager_name} took the dunce cap!`
    );

    return msg;
  }
}

export const gameweekRecap = new GameweekRecapService();
