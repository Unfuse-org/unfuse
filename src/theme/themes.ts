export type ThemeId = 'unfuse' | 'light' | 'rose-pine' | 'everforest' | 'nord' | 'ocean' | 'gruvbox' | 'high-contrast' | 'sand';

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
  swatches: [string, string, string, string];
}

// Palette references: https://stephango.com/flexoki, https://rosepinetheme.com/palette/,
// https://github.com/sainnhe/everforest, https://www.nordtheme.com/docs/colors-and-palettes/,
// https://github.com/morhetz/gruvbox. Unfuse, Ocean, Sand, and High Contrast are original adaptations.
export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'unfuse': {
    id: 'unfuse', name: 'Unfuse Dark', category: 'dark',
    description: 'Neutral charcoal surfaces, soft white text, and white highlights',
    swatches: ['#191919', '#282828', '#e2e2e2', '#eeeeee'],
    colors: {
      bgApp: '#191919',
      bgHeader: '#111111',
      bgRail: '#111111',
      bgPanel: '#202020',
      bgSurface: '#282828',
      bgSurfaceHover: '#323232',
      bgActive: '#3b3b3b',
      borderSubtle: '#383838',
      borderStrong: '#686868',
      textMain: '#eeeeee',
      textMuted: '#b8b8b8',
      textFaint: '#999999',
      accent: '#e2e2e2',
      accentHover: '#ffffff',
      accentFg: '#171717',
    },
  },
  'light': {
    id: 'light', name: 'Unfuse Light', category: 'light',
    description: 'Neutral white surfaces, grey text, and black highlights',
    swatches: ['#fafafa', '#eeeeee', '#282828', '#202020'],
    colors: {
      bgApp: '#fafafa',
      bgHeader: '#eeeeee',
      bgRail: '#eeeeee',
      bgPanel: '#f5f5f5',
      bgSurface: '#eeeeee',
      bgSurfaceHover: '#e4e4e4',
      bgActive: '#d9d9d9',
      borderSubtle: '#d8d8d8',
      borderStrong: '#929292',
      textMain: '#202020',
      textMuted: '#606060',
      textFaint: '#707070',
      accent: '#282828',
      accentHover: '#111111',
      accentFg: '#ffffff',
    },
  },
  'rose-pine': {
    id: 'rose-pine', name: 'Rosé Pine', category: 'dark',
    description: 'Deep plum surfaces with rose and gold accents',
    swatches: ['#191724', '#26233a', '#ebab9e', '#e0def4'],
    colors: {
      bgApp: '#191724',
      bgHeader: '#13111e',
      bgRail: '#13111e',
      bgPanel: '#1f1d2e',
      bgSurface: '#26233a',
      bgSurfaceHover: '#312d45',
      bgActive: '#40364b',
      borderSubtle: '#393552',
      borderStrong: '#6e6a86',
      textMain: '#e0def4',
      textMuted: '#b3aecb',
      textFaint: '#9893a5',
      accent: '#ebab9e',
      accentHover: '#f6c177',
      accentFg: '#191724',
    },
  },
  'everforest': {
    id: 'everforest', name: 'Everforest', category: 'dark',
    description: 'Earthy charcoal, soft greens, and warm text',
    swatches: ['#272e33', '#343f44', '#a7c080', '#d3c6aa'],
    colors: {
      bgApp: '#272e33',
      bgHeader: '#232a2e',
      bgRail: '#232a2e',
      bgPanel: '#2d353b',
      bgSurface: '#343f44',
      bgSurfaceHover: '#3d484d',
      bgActive: '#425047',
      borderSubtle: '#475258',
      borderStrong: '#7a8478',
      textMain: '#d3c6aa',
      textMuted: '#a7b09d',
      textFaint: '#9da99a',
      accent: '#a7c080',
      accentHover: '#b9d298',
      accentFg: '#272e33',
    },
  },
  'nord': {
    id: 'nord', name: 'Nord', category: 'dark',
    description: 'Slate-blue surfaces with icy blue highlights',
    swatches: ['#2e3440', '#3b4252', '#88c0d0', '#eceff4'],
    colors: {
      bgApp: '#2e3440',
      bgHeader: '#242933',
      bgRail: '#242933',
      bgPanel: '#323946',
      bgSurface: '#3b4252',
      bgSurfaceHover: '#434c5e',
      bgActive: '#4c566a',
      borderSubtle: '#4c566a',
      borderStrong: '#778397',
      textMain: '#eceff4',
      textMuted: '#d8dee9',
      textFaint: '#a9b5c9',
      accent: '#88c0d0',
      accentHover: '#a9d6e2',
      accentFg: '#242933',
    },
  },
  'ocean': {
    id: 'ocean', name: 'Ocean', category: 'dark',
    description: 'Deep ocean blue with sea-glass highlights',
    swatches: ['#101c24', '#1b2d38', '#69c9cc', '#e0edf0'],
    colors: {
      bgApp: '#101c24',
      bgHeader: '#0c151c',
      bgRail: '#0c151c',
      bgPanel: '#14232d',
      bgSurface: '#1b2d38',
      bgSurfaceHover: '#243c49',
      bgActive: '#294957',
      borderSubtle: '#2c4350',
      borderStrong: '#526f7d',
      textMain: '#e0edf0',
      textMuted: '#a5bfca',
      textFaint: '#8eabb9',
      accent: '#69c9cc',
      accentHover: '#99e1de',
      accentFg: '#102226',
    },
  },
  'gruvbox': {
    id: 'gruvbox', name: 'Gruvbox', category: 'dark',
    description: 'Warm brown surfaces and retro yellow highlights',
    swatches: ['#282828', '#3c3836', '#fabd2f', '#ebdbb2'],
    colors: {
      bgApp: '#282828',
      bgHeader: '#1d2021',
      bgRail: '#1d2021',
      bgPanel: '#32302f',
      bgSurface: '#3c3836',
      bgSurfaceHover: '#504945',
      bgActive: '#665c54',
      borderSubtle: '#665c54',
      borderStrong: '#928374',
      textMain: '#ebdbb2',
      textMuted: '#bdae93',
      textFaint: '#a89984',
      accent: '#fabd2f',
      accentHover: '#fbd776',
      accentFg: '#282828',
    },
  },
  'high-contrast': {
    id: 'high-contrast', name: 'High Contrast', category: 'dark',
    description: 'Black and white with stronger surface and focus contrast',
    swatches: ['#000000', '#191919', '#ffffff', '#ffffff'],
    colors: {
      bgApp: '#000000',
      bgHeader: '#000000',
      bgRail: '#000000',
      bgPanel: '#0a0a0a',
      bgSurface: '#191919',
      bgSurfaceHover: '#303030',
      bgActive: '#414141',
      borderSubtle: '#808080',
      borderStrong: '#bfbfbf',
      textMain: '#ffffff',
      textMuted: '#e0e0e0',
      textFaint: '#bfbfbf',
      accent: '#ffffff',
      accentHover: '#e0e0e0',
      accentFg: '#000000',
    },
  },
  'sand': {
    id: 'sand', name: 'Sand', category: 'light',
    description: 'Sunlit sand, brown ink, and terracotta highlights',
    swatches: ['#f6efdf', '#e9deca', '#9c4f33', '#352c24'],
    colors: {
      bgApp: '#f6efdf',
      bgHeader: '#e9deca',
      bgRail: '#e9deca',
      bgPanel: '#f0e6d3',
      bgSurface: '#e9deca',
      bgSurfaceHover: '#dfcfb6',
      bgActive: '#e3c9b1',
      borderSubtle: '#d5c2a7',
      borderStrong: '#a68e73',
      textMain: '#352c24',
      textMuted: '#6a5948',
      textFaint: '#7c6653',
      accent: '#9c4f33',
      accentHover: '#7e3b24',
      accentFg: '#fff7ed',
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
  root.style.setProperty('--status-success', theme.category === 'light' ? '#23754d' : '#85c998');
  root.style.setProperty('--status-warning', theme.category === 'light' ? '#8a5a12' : '#e9bd73');
  root.style.setProperty('--status-error', theme.category === 'light' ? '#b63b43' : '#f28a8a');
  const syntax = {
    unfuse: ['#d8d8d8', '#a8c8a4', '#b5bdf0', '#9bc8dd'],
    light: ['#525252', '#386841', '#6655a0', '#245f83'],
    'rose-pine': ['#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba'],
    everforest: ['#dbbc7f', '#a7c080', '#e69875', '#7fbbb3'],
    nord: ['#ebcb8b', '#a3be8c', '#81a1c1', '#8fbcbb'],
    ocean: ['#e8bf83', '#9dcda7', '#69c9cc', '#a4bdf0'],
    gruvbox: ['#fabd2f', '#b8bb26', '#fb4934', '#83a598'],
    'high-contrast': ['#ffffff', '#b8f0bb', '#ded4ff', '#b7e5ff'],
    sand: ['#845814', '#586b2b', '#9c4f33', '#346879'],
  }[theme.id];
  ['--syntax-function', '--syntax-string', '--syntax-keyword', '--syntax-type'].forEach((token, index) => root.style.setProperty(token, syntax[index]));

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
