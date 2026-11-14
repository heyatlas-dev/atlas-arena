import React from 'react';

interface ClubCrestProps {
  teamId?: number;
  teamName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

// Official color palettes and vector branding for all 20 Premier League 2026/27 clubs
const CLUB_BRANDING: Record<
  number,
  { short: string; bg: string; text: string; accent: string; symbol: string }
> = {
  1: { short: 'ARS', bg: '#EF0107', text: '#FFFFFF', accent: '#063672', symbol: 'C' }, // Arsenal (Cannon)
  2: { short: 'AVL', bg: '#670E36', text: '#95BFE5', accent: '#FEE12B', symbol: '🦁' }, // Aston Villa
  3: { short: 'BOU', bg: '#DA291C', text: '#000000', accent: '#B3995D', symbol: '🍒' }, // Bournemouth
  4: { short: 'BRE', bg: '#E30613', text: '#FFFFFF', accent: '#FBB800', symbol: '🐝' }, // Brentford
  5: { short: 'BHA', bg: '#0057B8', text: '#FFFFFF', accent: '#FFCD00', symbol: '🌊' }, // Brighton
  6: { short: 'CHE', bg: '#034694', text: '#FFFFFF', accent: '#EE242C', symbol: '🦁' }, // Chelsea
  7: { short: 'COV', bg: '#00A3E0', text: '#FFFFFF', accent: '#002D62', symbol: '🐘' }, // Coventry City
  8: { short: 'CRY', bg: '#1B458F', text: '#FFFFFF', accent: '#C4122E', symbol: '🦅' }, // Crystal Palace
  9: { short: 'EVE', bg: '#003399', text: '#FFFFFF', accent: '#FFFFFF', symbol: '🏰' }, // Everton
  10: { short: 'FUL', bg: '#000000', text: '#CC0000', accent: '#FFFFFF', symbol: 'F' }, // Fulham
  11: { short: 'HUL', bg: '#F5A623', text: '#000000', accent: '#000000', symbol: '🐅' }, // Hull City
  12: { short: 'IPS', bg: '#004488', text: '#FFFFFF', accent: '#E21836', symbol: '🐴' }, // Ipswich Town
  13: { short: 'LEE', bg: '#FFCD00', text: '#1D428A', accent: '#FFFFFF', symbol: '🦚' }, // Leeds
  14: { short: 'LIV', bg: '#C8102E', text: '#FFFFFF', accent: '#00B2A9', symbol: '🦅' }, // Liverpool (Liverbird)
  15: { short: 'MCI', bg: '#6CABDD', text: '#1C2C5B', accent: '#FFFFFF', symbol: '⛵' }, // Man City (Ship)
  16: { short: 'MUN', bg: '#DA291C', text: '#FBE122', accent: '#000000', symbol: '🔱' }, // Man Utd (Devil)
  17: { short: 'NEW', bg: '#241F20', text: '#FFFFFF', accent: '#41B6E6', symbol: '🏰' }, // Newcastle
  18: { short: 'NFO', bg: '#DD0000', text: '#FFFFFF', accent: '#FFFFFF', symbol: '🌲' }, // Nott'm Forest (Tree)
  19: { short: 'TOT', bg: '#132257', text: '#FFFFFF', accent: '#C8102E', symbol: '🐓' }, // Spurs (Cockerel)
  20: { short: 'SUN', bg: '#EB172B', text: '#FFFFFF', accent: '#231F20', symbol: '🐈‍⬛' }, // Sunderland (Black Cat)
};

const NAME_TO_ID: Record<string, number> = {
  arsenal: 1,
  'aston villa': 2,
  bournemouth: 3,
  brentford: 4,
  brighton: 5,
  chelsea: 6,
  'coventry city': 7,
  coventry: 7,
  'crystal palace': 8,
  palace: 8,
  everton: 9,
  fulham: 10,
  'hull city': 11,
  hull: 11,
  'ipswich town': 12,
  ipswich: 12,
  leeds: 13,
  'leeds united': 13,
  liverpool: 14,
  'man city': 15,
  'manchester city': 15,
  'man utd': 16,
  'man united': 16,
  'manchester united': 16,
  newcastle: 17,
  'newcastle united': 17,
  "nott'm forest": 18,
  'nottingham forest': 18,
  forest: 18,
  spurs: 19,
  tottenham: 19,
  sunderland: 20,
};

export const ClubCrest: React.FC<ClubCrestProps> = ({
  teamId,
  teamName,
  size = 'md',
  className = '',
}) => {
  let resolvedId = teamId;
  if (!resolvedId && teamName) {
    const key = teamName.toLowerCase().trim();
    resolvedId = NAME_TO_ID[key];
  }

  const brand = resolvedId && CLUB_BRANDING[resolvedId] ? CLUB_BRANDING[resolvedId] : null;

  const sizeStyles = {
    xs: 'w-4 h-4 text-[8px] rounded-xs',
    sm: 'w-5 h-5 text-[9px] rounded-md',
    md: 'w-7 h-7 text-[11px] rounded-lg',
    lg: 'w-9 h-9 text-xs rounded-xl',
  };

  if (!brand) {
    return (
      <div
        className={`inline-flex items-center justify-center font-bold bg-discord-card text-discord-light border border-discord-border shrink-0 shadow-xs ${sizeStyles[size]} ${className}`}
      >
        ⚽
      </div>
    );
  }

  return (
    <div
      title={teamName || brand.short}
      className={`relative inline-flex items-center justify-center font-extrabold uppercase shrink-0 select-none shadow-md transition-transform hover:scale-105 ${sizeStyles[size]} ${className}`}
      style={{
        backgroundColor: brand.bg,
        color: brand.text,
        boxShadow: `0 2px 6px ${brand.bg}40`,
        border: `1.5px solid ${brand.accent}`,
      }}
    >
      <span className="leading-none drop-shadow-sm font-mono tracking-tighter">
        {brand.short}
      </span>
    </div>
  );
};
