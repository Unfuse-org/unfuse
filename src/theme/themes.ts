export type ThemeId =
  | 'unfuse'
  | 'dark'
  | 'light'
  | 'midnight'
  | 'paper'
  | 'cyberpunk'
  | 'retrowave'
  | 'forest'
  | 'ocean'
  | 'ume'
  | 'copper'
  | 'terminal'
  | 'organs'
  | 'lavender'
  | 'gpt'
  | 'claude'
  | 'cute';

export interface ThemeColors {
  bgApp: string;
  bgHeader: string;
  bgRail: string;
  bgPanel: string;
  bgSurface: string;
  bgSurfaceHover: string;
  bgActive: string;
  borderSubtle: string;
  borderStrong: string;
  textMain: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentHover: string;
  accentFg: string;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  category: 'dark' | 'light';
  description: string;
  colors: ThemeColors;
  swatches: [string, string, string, string]; // [bgApp, bgSurface, accent, textMain]
}

// Preset base palettes: https://github.com/odysseus-dev/odysseus/blob/dev/static/js/theme.js
// Additional Unfuse surface/text tokens adapt those palettes to the existing UI.
export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'unfuse': {
    id: 'unfuse',
    name: 'Unfuse',
    category: 'dark',
    description: 'Default Unfuse palette: charcoal surfaces and soft silver highlights',
    swatches: ['#18191c', '#202226', '#d3d8e0', '#f0f1f3'],
    colors: {
      bgApp: '#18191c',
      bgHeader: '#111214',
      bgRail: '#111214',
      bgPanel: '#141518',
      bgSurface: '#202226',
      bgSurfaceHover: '#2a2d32',
      bgActive: '#30343b',
      borderSubtle: '#303238',
      borderStrong: '#50545d',
      textMain: '#f0f1f3',
      textMuted: '#b0b4bd',
      textFaint: '#9197a3',
      accent: '#d3d8e0',
      accentHover: '#eef0f4',
      accentFg: '#18191c',
    },
  },
  'dark': {
    id: 'dark',
    name: 'Dark',
    category: 'dark',
    description: 'Odysseus Dark palette',
    swatches: ['#282c34', '#111111', '#e06c75', '#9cdef2'],
    colors: {
      bgApp: '#282c34',
      bgHeader: '#111111',
      bgRail: '#111111',
      bgPanel: '#111111',
      bgSurface: '#111111',
      bgSurfaceHover: 'color-mix(in srgb, #111111, #9cdef2 8%)',
      bgActive: 'color-mix(in srgb, #e06c75 15%, #111111)',
      borderSubtle: '#355a66',
      borderStrong: '#355a66',
      textMain: '#9cdef2',
      textMuted: 'color-mix(in srgb, #9cdef2 75%, #282c34)',
      textFaint: 'color-mix(in srgb, #9cdef2 60%, #282c34)',
      accent: '#e06c75',
      accentHover: '#e06c75',
      accentFg: '#282c34',
    },
  },
  'light': {
    id: 'light',
    name: 'Light',
    category: 'light',
    description: 'Odysseus Light palette',
    swatches: ['#f0ebe3', '#faf6f0', '#c47d5a', '#5a5248'],
    colors: {
      bgApp: '#f0ebe3',
      bgHeader: '#faf6f0',
      bgRail: '#faf6f0',
      bgPanel: '#faf6f0',
      bgSurface: '#faf6f0',
      bgSurfaceHover: 'color-mix(in srgb, #faf6f0, #5a5248 8%)',
      bgActive: 'color-mix(in srgb, #c47d5a 15%, #faf6f0)',
      borderSubtle: '#d4cdc2',
      borderStrong: '#d4cdc2',
      textMain: '#5a5248',
      textMuted: 'color-mix(in srgb, #5a5248 75%, #f0ebe3)',
      textFaint: 'color-mix(in srgb, #5a5248 60%, #f0ebe3)',
      accent: '#c47d5a',
      accentHover: '#c47d5a',
      accentFg: '#f0ebe3',
    },
  },
  'midnight': {
    id: 'midnight',
    name: 'Midnight',
    category: 'dark',
    description: 'Odysseus Midnight palette',
    swatches: ['#0d1117', '#161b22', '#f85149', '#c9d1d9'],
    colors: {
      bgApp: '#0d1117',
      bgHeader: '#161b22',
      bgRail: '#161b22',
      bgPanel: '#161b22',
      bgSurface: '#161b22',
      bgSurfaceHover: 'color-mix(in srgb, #161b22, #c9d1d9 8%)',
      bgActive: 'color-mix(in srgb, #f85149 15%, #161b22)',
      borderSubtle: '#30363d',
      borderStrong: '#30363d',
      textMain: '#c9d1d9',
      textMuted: 'color-mix(in srgb, #c9d1d9 75%, #0d1117)',
      textFaint: 'color-mix(in srgb, #c9d1d9 60%, #0d1117)',
      accent: '#f85149',
      accentHover: '#f85149',
      accentFg: '#0d1117',
    },
  },
  'paper': {
    id: 'paper',
    name: 'Paper',
    category: 'light',
    description: 'Odysseus Paper palette',
    swatches: ['#faf8f5', '#ffffff', '#c5ac4a', '#3b3836'],
    colors: {
      bgApp: '#faf8f5',
      bgHeader: '#ffffff',
      bgRail: '#ffffff',
      bgPanel: '#ffffff',
      bgSurface: '#ffffff',
      bgSurfaceHover: 'color-mix(in srgb, #ffffff, #3b3836 8%)',
      bgActive: 'color-mix(in srgb, #c5ac4a 15%, #ffffff)',
      borderSubtle: '#d5d0c8',
      borderStrong: '#d5d0c8',
      textMain: '#3b3836',
      textMuted: 'color-mix(in srgb, #3b3836 75%, #faf8f5)',
      textFaint: 'color-mix(in srgb, #3b3836 60%, #faf8f5)',
      accent: '#c5ac4a',
      accentHover: '#c5ac4a',
      accentFg: '#faf8f5',
    },
  },
  'cyberpunk': {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    category: 'dark',
    description: 'Odysseus Cyberpunk palette',
    swatches: ['#0a0a0f', '#12101a', '#e040fb', '#0ff0fc'],
    colors: {
      bgApp: '#0a0a0f',
      bgHeader: '#12101a',
      bgRail: '#12101a',
      bgPanel: '#12101a',
      bgSurface: '#12101a',
      bgSurfaceHover: 'color-mix(in srgb, #12101a, #0ff0fc 8%)',
      bgActive: 'color-mix(in srgb, #e040fb 15%, #12101a)',
      borderSubtle: '#9b30ff',
      borderStrong: '#9b30ff',
      textMain: '#0ff0fc',
      textMuted: 'color-mix(in srgb, #0ff0fc 75%, #0a0a0f)',
      textFaint: 'color-mix(in srgb, #0ff0fc 60%, #0a0a0f)',
      accent: '#e040fb',
      accentHover: '#e040fb',
      accentFg: '#0a0a0f',
    },
  },
  'retrowave': {
    id: 'retrowave',
    name: 'Retrowave',
    category: 'dark',
    description: 'Odysseus Retrowave palette',
    swatches: ['#1a1a2e', '#16213e', '#e94560', '#e94560'],
    colors: {
      bgApp: '#1a1a2e',
      bgHeader: '#16213e',
      bgRail: '#16213e',
      bgPanel: '#16213e',
      bgSurface: '#16213e',
      bgSurfaceHover: 'color-mix(in srgb, #16213e, #e94560 8%)',
      bgActive: 'color-mix(in srgb, #e94560 15%, #16213e)',
      borderSubtle: '#533483',
      borderStrong: '#533483',
      textMain: '#e94560',
      textMuted: 'color-mix(in srgb, #e94560 75%, #1a1a2e)',
      textFaint: 'color-mix(in srgb, #e94560 60%, #1a1a2e)',
      accent: '#e94560',
      accentHover: '#e94560',
      accentFg: '#1a1a2e',
    },
  },
  'forest': {
    id: 'forest',
    name: 'Forest',
    category: 'dark',
    description: 'Odysseus Forest palette',
    swatches: ['#1b2a1b', '#142414', '#7cb871', '#a8d5a2'],
    colors: {
      bgApp: '#1b2a1b',
      bgHeader: '#142414',
      bgRail: '#142414',
      bgPanel: '#142414',
      bgSurface: '#142414',
      bgSurfaceHover: 'color-mix(in srgb, #142414, #a8d5a2 8%)',
      bgActive: 'color-mix(in srgb, #7cb871 15%, #142414)',
      borderSubtle: '#3d6b3d',
      borderStrong: '#3d6b3d',
      textMain: '#a8d5a2',
      textMuted: 'color-mix(in srgb, #a8d5a2 75%, #1b2a1b)',
      textFaint: 'color-mix(in srgb, #a8d5a2 60%, #1b2a1b)',
      accent: '#7cb871',
      accentHover: '#7cb871',
      accentFg: '#1b2a1b',
    },
  },
  'ocean': {
    id: 'ocean',
    name: 'Ocean',
    category: 'dark',
    description: 'Odysseus Ocean palette',
    swatches: ['#0b1a2c', '#091422', '#4facfe', '#64d2ff'],
    colors: {
      bgApp: '#0b1a2c',
      bgHeader: '#091422',
      bgRail: '#091422',
      bgPanel: '#091422',
      bgSurface: '#091422',
      bgSurfaceHover: 'color-mix(in srgb, #091422, #64d2ff 8%)',
      bgActive: 'color-mix(in srgb, #4facfe 15%, #091422)',
      borderSubtle: '#1e5074',
      borderStrong: '#1e5074',
      textMain: '#64d2ff',
      textMuted: 'color-mix(in srgb, #64d2ff 75%, #0b1a2c)',
      textFaint: 'color-mix(in srgb, #64d2ff 60%, #0b1a2c)',
      accent: '#4facfe',
      accentHover: '#4facfe',
      accentFg: '#0b1a2c',
    },
  },
  'ume': {
    id: 'ume',
    name: 'Ume',
    category: 'dark',
    description: 'Odysseus Ume palette',
    swatches: ['#2b1b2e', '#1e1420', '#f5a0c0', '#f5c2e7'],
    colors: {
      bgApp: '#2b1b2e',
      bgHeader: '#1e1420',
      bgRail: '#1e1420',
      bgPanel: '#1e1420',
      bgSurface: '#1e1420',
      bgSurfaceHover: 'color-mix(in srgb, #1e1420, #f5c2e7 8%)',
      bgActive: 'color-mix(in srgb, #f5a0c0 15%, #1e1420)',
      borderSubtle: '#6c4675',
      borderStrong: '#6c4675',
      textMain: '#f5c2e7',
      textMuted: 'color-mix(in srgb, #f5c2e7 75%, #2b1b2e)',
      textFaint: 'color-mix(in srgb, #f5c2e7 60%, #2b1b2e)',
      accent: '#f5a0c0',
      accentHover: '#f5a0c0',
      accentFg: '#2b1b2e',
    },
  },
  'copper': {
    id: 'copper',
    name: 'Copper',
    category: 'dark',
    description: 'Odysseus Copper palette',
    swatches: ['#1c1410', '#140f0a', '#d4764e', '#e8c39e'],
    colors: {
      bgApp: '#1c1410',
      bgHeader: '#140f0a',
      bgRail: '#140f0a',
      bgPanel: '#140f0a',
      bgSurface: '#140f0a',
      bgSurfaceHover: 'color-mix(in srgb, #140f0a, #e8c39e 8%)',
      bgActive: 'color-mix(in srgb, #d4764e 15%, #140f0a)',
      borderSubtle: '#7a5533',
      borderStrong: '#7a5533',
      textMain: '#e8c39e',
      textMuted: 'color-mix(in srgb, #e8c39e 75%, #1c1410)',
      textFaint: 'color-mix(in srgb, #e8c39e 60%, #1c1410)',
      accent: '#d4764e',
      accentHover: '#d4764e',
      accentFg: '#1c1410',
    },
  },
  'terminal': {
    id: 'terminal',
    name: 'Terminal',
    category: 'dark',
    description: 'Odysseus Terminal palette',
    swatches: ['#000000', '#0a0a0a', '#00ff41', '#00ff41'],
    colors: {
      bgApp: '#000000',
      bgHeader: '#0a0a0a',
      bgRail: '#0a0a0a',
      bgPanel: '#0a0a0a',
      bgSurface: '#0a0a0a',
      bgSurfaceHover: 'color-mix(in srgb, #0a0a0a, #00ff41 8%)',
      bgActive: 'color-mix(in srgb, #00ff41 15%, #0a0a0a)',
      borderSubtle: '#003b00',
      borderStrong: '#003b00',
      textMain: '#00ff41',
      textMuted: 'color-mix(in srgb, #00ff41 75%, #000000)',
      textFaint: 'color-mix(in srgb, #00ff41 60%, #000000)',
      accent: '#00ff41',
      accentHover: '#00ff41',
      accentFg: '#000000',
    },
  },
  'organs': {
    id: 'organs',
    name: 'Organs',
    category: 'dark',
    description: 'Odysseus Organs palette',
    swatches: ['#0a0406', '#15080a', '#c83240', '#efe1c8'],
    colors: {
      bgApp: '#0a0406',
      bgHeader: '#15080a',
      bgRail: '#15080a',
      bgPanel: '#15080a',
      bgSurface: '#15080a',
      bgSurfaceHover: 'color-mix(in srgb, #15080a, #efe1c8 8%)',
      bgActive: 'color-mix(in srgb, #c83240 15%, #15080a)',
      borderSubtle: '#3a1519',
      borderStrong: '#3a1519',
      textMain: '#efe1c8',
      textMuted: 'color-mix(in srgb, #efe1c8 75%, #0a0406)',
      textFaint: 'color-mix(in srgb, #efe1c8 60%, #0a0406)',
      accent: '#c83240',
      accentHover: '#c83240',
      accentFg: '#0a0406',
    },
  },
  'lavender': {
    id: 'lavender',
    name: 'Lavender',
    category: 'light',
    description: 'Odysseus Lavender palette',
    swatches: ['#f3eef8', '#faf7ff', '#9b6dcc', '#3d3551'],
    colors: {
      bgApp: '#f3eef8',
      bgHeader: '#faf7ff',
      bgRail: '#faf7ff',
      bgPanel: '#faf7ff',
      bgSurface: '#faf7ff',
      bgSurfaceHover: 'color-mix(in srgb, #faf7ff, #3d3551 8%)',
      bgActive: 'color-mix(in srgb, #9b6dcc 15%, #faf7ff)',
      borderSubtle: '#cec3de',
      borderStrong: '#cec3de',
      textMain: '#3d3551',
      textMuted: 'color-mix(in srgb, #3d3551 75%, #f3eef8)',
      textFaint: 'color-mix(in srgb, #3d3551 60%, #f3eef8)',
      accent: '#9b6dcc',
      accentHover: '#9b6dcc',
      accentFg: '#f3eef8',
    },
  },
  'gpt': {
    id: 'gpt',
    name: 'GPT',
    category: 'dark',
    description: 'Odysseus GPT palette',
    swatches: ['#212121', '#171717', '#949494', '#ececec'],
    colors: {
      bgApp: '#212121',
      bgHeader: '#171717',
      bgRail: '#171717',
      bgPanel: '#171717',
      bgSurface: '#2f2f2f',
      bgSurfaceHover: 'color-mix(in srgb, #171717, #ececec 8%)',
      bgActive: 'color-mix(in srgb, #949494 15%, #171717)',
      borderSubtle: '#424242',
      borderStrong: '#424242',
      textMain: '#ececec',
      textMuted: 'color-mix(in srgb, #ececec 75%, #212121)',
      textFaint: 'color-mix(in srgb, #ececec 60%, #212121)',
      accent: '#949494',
      accentHover: '#7f7f7f',
      accentFg: '#212121',
    },
  },
  'claude': {
    id: 'claude',
    name: 'Claude',
    category: 'dark',
    description: 'Odysseus Claude palette',
    swatches: ['#262624', '#30302e', '#c6613f', '#f5f4f0'],
    colors: {
      bgApp: '#262624',
      bgHeader: '#30302e',
      bgRail: '#30302e',
      bgPanel: '#30302e',
      bgSurface: '#30302e',
      bgSurfaceHover: 'color-mix(in srgb, #30302e, #f5f4f0 8%)',
      bgActive: 'color-mix(in srgb, #c6613f 15%, #30302e)',
      borderSubtle: '#4a4a47',
      borderStrong: '#4a4a47',
      textMain: '#f5f4f0',
      textMuted: 'color-mix(in srgb, #f5f4f0 75%, #262624)',
      textFaint: 'color-mix(in srgb, #f5f4f0 60%, #262624)',
      accent: '#c6613f',
      accentHover: '#c6613f',
      accentFg: '#262624',
    },
  },
  'cute': {
    id: 'cute',
    name: 'Cute',
    category: 'light',
    description: 'Odysseus Cute palette',
    swatches: ['#fff0f5', '#fff8fa', '#ff6b9d', '#d4608a'],
    colors: {
      bgApp: '#fff0f5',
      bgHeader: '#fff8fa',
      bgRail: '#fff8fa',
      bgPanel: '#fff8fa',
      bgSurface: '#fff8fa',
      bgSurfaceHover: 'color-mix(in srgb, #fff8fa, #d4608a 8%)',
      bgActive: 'color-mix(in srgb, #ff6b9d 15%, #fff8fa)',
      borderSubtle: '#f0c0d0',
      borderStrong: '#f0c0d0',
      textMain: '#d4608a',
      textMuted: 'color-mix(in srgb, #d4608a 75%, #fff0f5)',
      textFaint: 'color-mix(in srgb, #d4608a 60%, #fff0f5)',
      accent: '#ff6b9d',
      accentHover: '#ff6b9d',
      accentFg: '#fff0f5',
    },
  },
};

const THEME_STORAGE_KEY = 'unfuse_active_theme_v2';

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'unfuse';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (saved && THEMES[saved]) {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'unfuse';
}

export function applyTheme(themeId: ThemeId): void {
  const theme = THEMES[themeId] || THEMES['unfuse'];
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const colors = theme.colors;

  root.style.setProperty('--bg-app', colors.bgApp);
  root.style.setProperty('--bg-header', colors.bgHeader);
  root.style.setProperty('--bg-rail', colors.bgRail);
  root.style.setProperty('--bg-panel', colors.bgPanel);
  root.style.setProperty('--bg-surface', colors.bgSurface);
  root.style.setProperty('--bg-surface-hover', colors.bgSurfaceHover);
  root.style.setProperty('--bg-active', colors.bgActive);
  root.style.setProperty('--border-subtle', colors.borderSubtle);
  root.style.setProperty('--border-strong', colors.borderStrong);
  root.style.setProperty('--text-main', colors.textMain);
  root.style.setProperty('--text-muted', colors.textMuted);
  root.style.setProperty('--text-faint', colors.textFaint);
  root.style.setProperty('--accent', colors.accent);
  root.style.setProperty('--accent-hover', colors.accentHover);
  root.style.setProperty('--accent-fg', colors.accentFg);

  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-theme-category', theme.category);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // ignore
  }

  // Dispatch custom event for reactive components
  window.dispatchEvent(new CustomEvent('unfuse_theme_changed', { detail: themeId }));
}
