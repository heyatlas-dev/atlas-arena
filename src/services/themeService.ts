// ATLAS Arena Theme Customization Service

export interface ArenaTheme {
  id: string;
  name: string;
  accentHex: string;
  hoverHex: string;
  glowHex: string;
}

export const THEMES: ArenaTheme[] = [
  {
    id: 'blurple',
    name: 'Discord Blurple',
    accentHex: '#5865f2',
    hoverHex: '#4752c4',
    glowHex: 'rgba(88, 101, 242, 0.4)',
  },
  {
    id: 'emerald',
    name: 'Pitch Emerald',
    accentHex: '#10b981',
    hoverHex: '#059669',
    glowHex: 'rgba(16, 185, 129, 0.4)',
  },
  {
    id: 'cyan',
    name: 'Cyber Cyan',
    accentHex: '#00f0ff',
    hoverHex: '#00c7d4',
    glowHex: 'rgba(0, 240, 255, 0.4)',
  },
  {
    id: 'gold',
    name: 'Champion Gold',
    accentHex: '#f59e0b',
    hoverHex: '#d97706',
    glowHex: 'rgba(245, 158, 11, 0.4)',
  },
  {
    id: 'crimson',
    name: 'Derby Crimson',
    accentHex: '#f43f5e',
    hoverHex: '#e11d48',
    glowHex: 'rgba(244, 63, 94, 0.4)',
  },
];

const THEME_STORAGE_KEY = 'atlas_arena_theme_id';

export const getSavedTheme = (): ArenaTheme => {
  const savedId = localStorage.getItem(THEME_STORAGE_KEY);
  return THEMES.find((t) => t.id === savedId) || THEMES[0];
};

export const applyTheme = (theme: ArenaTheme) => {
  document.documentElement.style.setProperty('--color-discord-blurple', theme.accentHex);
  document.documentElement.style.setProperty('--color-discord-blurple-hover', theme.hoverHex);
  localStorage.setItem(THEME_STORAGE_KEY, theme.id);
};
