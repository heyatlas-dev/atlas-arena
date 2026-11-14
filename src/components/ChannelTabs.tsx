import React from 'react';
import { Hash, Radio, ArrowLeftRight, Swords, Trophy } from 'lucide-react';
import { ChannelId } from '../types';
import { triggerHaptic } from '../services/haptics';

interface ChannelTabsProps {
  activeChannel: ChannelId;
  onSelectChannel: (channel: ChannelId) => void;
  unreadCount?: {
    banter?: number;
    'matchday-live'?: number;
    transfers?: number;
  };
}

export const ChannelTabs: React.FC<ChannelTabsProps> = ({
  activeChannel,
  onSelectChannel,
  unreadCount = {}
}) => {
  const tabs = [
    {
      id: 'banter' as ChannelId,
      name: 'banter',
      icon: Hash,
      badge: unreadCount.banter,
    },
    {
      id: 'matchday-live' as ChannelId,
      name: 'matchday-live',
      icon: Radio,
      badge: unreadCount['matchday-live'],
      isLive: true
    },
    {
      id: 'transfers' as ChannelId,
      name: 'transfers',
      icon: ArrowLeftRight,
      badge: unreadCount.transfers,
    },
    {
      id: 'h2h' as ChannelId,
      name: 'h2h',
      icon: Swords,
    },
    {
      id: 'table' as ChannelId,
      name: 'table',
      icon: Trophy,
    },
  ];

  return (
    <nav className="flex items-center gap-1.5 px-3 py-1.5 bg-discord-darker border-b border-discord-border/30 overflow-x-auto scrollbar-none select-none z-20">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeChannel === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic('light');
              onSelectChannel(tab.id);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all relative ${
              isActive
                ? 'bg-discord-card text-white shadow-sm ring-1 ring-discord-border/50'
                : 'text-discord-muted hover:text-discord-light hover:bg-discord-card/40'
            }`}
          >
            <Icon
              className={`w-3.5 h-3.5 ${
                isActive
                  ? tab.isLive
                    ? 'text-discord-cyan animate-pulse'
                    : 'text-discord-blurple'
                  : 'text-discord-muted'
              }`}
            />
            <span>#{tab.name}</span>

            {/* Unread badge */}
            {Boolean(tab.badge && tab.badge > 0) && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-discord-red text-white leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
