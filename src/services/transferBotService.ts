import { Message, LeagueMember, MatchEmbedData, EmbedImpactItem } from '../types';
import { fetchManagerFullSquad } from './fplService';
import { sounds } from './soundEffects';
import { triggerHaptic } from './haptics';

class TransferBotService {
  private seenReveals: Set<string> = new Set();
  private timer: any = null;

  constructor() {
    try {
      const saved = localStorage.getItem('atlas_transfers_seen');
      if (saved) {
        this.seenReveals = new Set(JSON.parse(saved));
      }
    } catch {}
  }

  private saveSeen() {
    try {
      localStorage.setItem('atlas_transfers_seen', JSON.stringify(Array.from(this.seenReveals)));
    } catch {}
  }

  /**
   * Scans all mini-league manager picks and publishes the transfer & chip reveal into #transfers
   */
  public async checkAndPostTransferReveal(
    leagueId: string,
    members: LeagueMember[],
    gwId: number,
    onPostMessage: (msg: Message) => void
  ) {
    if (!leagueId || members.length === 0 || gwId <= 0) return;

    const revealKey = `reveal_${leagueId}_gw_${gwId}`;
    if (this.seenReveals.has(revealKey)) {
      return; // Already revealed for this GW
    }

    try {
      // Fetch full squad for members in parallel (up to 20 managers)
      const squadResults = await Promise.all(
        members.slice(0, 20).map((m) =>
          fetchManagerFullSquad(m.fpl_entry_id, m.manager_name, m.team_name, gwId)
        )
      );

      const validSquads = squadResults.filter((s): s is NonNullable<typeof s> => s !== null);
      if (validSquads.length === 0) return;

      // 1. Analyze Active Chips
      const chipsPlayed: { manager: string; chip: string; captain?: string }[] = [];
      validSquads.forEach((s) => {
        if (s.activeChip) {
          let chipName = s.activeChip.toUpperCase();
          if (s.activeChip === 'wildcard') chipName = '🃏 WILDCARD';
          else if (s.activeChip === '3xc') chipName = '👑 TRIPLE CAPTAIN';
          else if (s.activeChip === 'bboost') chipName = '🚀 BENCH BOOST';
          else if (s.activeChip === 'freehit') chipName = '⚡ FREE HIT';

          const captain = s.startingXI.find((p) => p.is_captain)?.web_name;
          chipsPlayed.push({ manager: s.managerName, chip: chipName, captain });
        }
      });

      // 2. Analyze Transfer Hits
      const hitsTaken: { manager: string; hit: number; transfers: number }[] = [];
      validSquads.forEach((s) => {
        if (s.transfersCost > 0) {
          hitsTaken.push({
            manager: s.managerName,
            hit: s.transfersCost,
            transfers: s.transfersCount,
          });
        }
      });

      // 3. Analyze Captain choices
      const captainCounts: Record<string, number> = {};
      validSquads.forEach((s) => {
        const cap = s.startingXI.find((p) => p.is_captain)?.web_name || 'Unknown';
        captainCounts[cap] = (captainCounts[cap] || 0) + 1;
      });

      const captainRanked = Object.entries(captainCounts).sort((a, b) => b[1] - a[1]);

      // Build Impact Items for Embed
      const impactItems: EmbedImpactItem[] = [];

      chipsPlayed.forEach((c) => {
        impactItems.push({
          text: `${c.chip}: @${c.manager}${c.captain ? ` on ${c.captain}` : ''}`,
          positive: true,
          member_name: c.manager,
        });
      });

      hitsTaken.forEach((h) => {
        impactItems.push({
          text: `🩸 -${h.hit} pts hit taken by @${h.manager} (${h.transfers} transfers)`,
          positive: false,
          member_name: h.manager,
        });
      });

      captainRanked.forEach(([capName, count]) => {
        impactItems.push({
          text: `👑 ${capName}: ${count} manager${count > 1 ? 's' : ''}`,
          positive: true,
        });
      });

      // Compose Post Content
      let content = `🚨 **GAMEWEEK ${gwId} TRANSFER & CHIP REVEAL**\nThe transfer deadline has passed! Here is how your mini-league lined up:\n\n`;

      if (chipsPlayed.length > 0) {
        content += `**🔥 Chips Activated:**\n` + chipsPlayed.map((c) => `• ${c.chip} played by **@${c.manager}**${c.captain ? ` (${c.captain} 3x)` : ''}`).join('\n') + '\n\n';
      } else {
        content += `• *No chips activated in mini-league this week.*\n\n`;
      }

      if (hitsTaken.length > 0) {
        content += `**🩸 Transfer Hits Taken:**\n` + hitsTaken.map((h) => `• **@${h.manager}** took a **-${h.hit} pts** hit (${h.transfers} transfers)`).join('\n') + '\n\n';
      }

      content += `**👑 Captaincy Breakdown:**\n` + captainRanked.map(([c, n]) => `• **${c}**: ${n} manager${n > 1 ? 's' : ''}`).join('\n');

      const embedData: MatchEmbedData = {
        type: 'transfer_reveal',
        fixture: `Gameweek ${gwId} Deadline Passed`,
        minute: 'FT',
        player_name: captainRanked[0]?.[0] || 'Gameweek',
        player_team: 'FPL',
        event_title: `GW ${gwId} Chips & Transfers Revealed`,
        pts_scored: 0,
        impact_items: impactItems,
      };

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const msg: Message = {
        id: `bot_transfers_reveal_gw_${gwId}_${leagueId}`,
        league_id: leagueId,
        channel: 'transfers',
        sender_id: 'atlas-transfer-bot',
        sender_name: 'ATLAS Transfer Bot',
        is_bot: true,
        content,
        created_at: timeStr,
        embed_data: embedData,
        reactions: {
          '🔥': ['ATLAS Bot'],
          '👀': ['ATLAS Bot'],
        },
      };

      this.seenReveals.add(revealKey);
      this.saveSeen();

      sounds.playChime();
      triggerHaptic('medium');
      onPostMessage(msg);
    } catch (e) {
      console.warn('Transfer reveal error:', e);
    }
  }

  public start(
    leagueId: string,
    members: LeagueMember[],
    gwId: number,
    onPostMessage: (msg: Message) => void
  ) {
    if (this.timer) clearInterval(this.timer);
    // Delay first check slightly to let members load
    setTimeout(() => this.checkAndPostTransferReveal(leagueId, members, gwId, onPostMessage), 4000);
    this.timer = setInterval(() => this.checkAndPostTransferReveal(leagueId, members, gwId, onPostMessage), 120000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const transferBot = new TransferBotService();
