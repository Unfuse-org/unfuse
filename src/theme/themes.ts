export type ThemeId =
  | 'unfuse-default'
  | 'github-dark'
  | 'github-light'
  | 'one-dark-pro'
  | 'dracula'
  | 'tokyo-night'
  | 'catppuccin-mocha'
  | 'catppuccin-latte'
  | 'nord'
  | 'gruvbox-dark'
  | 'solarized-dark'
  | 'solarized-light'
  | 'monokai-pro'
  | 'rose-pine'
  | 'night-owl'
  | 'vesper';

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

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'unfuse-default': {
    id: 'unfuse-default',
    name: 'Unfuse Default',
    category: 'dark',
    description: 'Hacker Lab / LM Studio inspired dark magenta',
    swatches: ['#0e0e11', '#1e1e24', '#d946ef', '#f4f4f5'],
    colors: {
      bgApp: '#0e0e11',
      bgHeader: '#16161a',
      bgRail: '#0a0a0c',
      bgPanel: '#16161a',
      bgSurface: '#1e1e24',
      bgSurfaceHover: '#292933',
      bgActive: 'rgba(217, 70, 239, 0.15)',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
      borderStrong: 'rgba(255, 255, 255, 0.16)',
      textMain: '#f4f4f5',
      textMuted: '#a1a1aa',
      textFaint: '#52525b',
      accent: '#d946ef',
      accentHover: '#e879f9',
      accentFg: '#ffffff',
    },
  },
  'github-dark': {
    id: 'github-dark',
    name: 'GitHub Dark',
    category: 'dark',
    description: 'The standard dark theme from GitHub',
    swatches: ['#0d1117', '#161b22', '#58a6ff', '#c9d1d9'],
    colors: {
      bgApp: '#0d1117',
      bgHeader: '#161b22',
      bgRail: '#090d13',
      bgPanel: '#161b22',
      bgSurface: '#21262d',
      bgSurfaceHover: '#30363d',
      bgActive: 'rgba(88, 166, 255, 0.15)',
      borderSubtle: '#30363d',
      borderStrong: '#8b949e',
      textMain: '#c9d1d9',
      textMuted: '#8b949e',
      textFaint: '#484f58',
      accent: '#58a6ff',
      accentHover: '#79c0ff',
      accentFg: '#0d1117',
    },
  },
  'github-light': {
    id: 'github-light',
    name: 'GitHub Light',
    category: 'light',
    description: 'Clean high-contrast light theme from GitHub',
    swatches: ['#ffffff', '#f6f8fa', '#0969da', '#1f2328'],
    colors: {
      bgApp: '#ffffff',
      bgHeader: '#f6f8fa',
      bgRail: '#eaeef2',
      bgPanel: '#f6f8fa',
      bgSurface: '#f6f8fa',
      bgSurfaceHover: '#eaeef2',
      bgActive: 'rgba(9, 105, 218, 0.12)',
      borderSubtle: '#d0d7de',
      borderStrong: '#afb8c1',
      textMain: '#1f2328',
      textMuted: '#656d76',
      textFaint: '#8c959f',
      accent: '#0969da',
      accentHover: '#0550ae',
      accentFg: '#ffffff',
    },
  },
  'one-dark-pro': {
    id: 'one-dark-pro',
    name: 'One Dark Pro',
    category: 'dark',
    description: 'Atom’s iconic and balanced One Dark palette',
    swatches: ['#282c34', '#21252b', '#61afef', '#abb2bf'],
    colors: {
      bgApp: '#282c34',
      bgHeader: '#21252b',
      bgRail: '#1b1d23',
      bgPanel: '#21252b',
      bgSurface: '#2c313a',
      bgSurfaceHover: '#353b45',
      bgActive: 'rgba(97, 175, 239, 0.15)',
      borderSubtle: '#3e4451',
      borderStrong: '#5c6370',
      textMain: '#abb2bf',
      textMuted: '#5c6370',
      textFaint: '#4b5263',
      accent: '#61afef',
      accentHover: '#7ec0f3',
      accentFg: '#282c34',
    },
  },
  'dracula': {
    id: 'dracula',
    name: 'Dracula',
    category: 'dark',
    description: 'Famous gothic high-contrast theme by Zeno Rocha',
    swatches: ['#282a36', '#21222c', '#bd93f9', '#f8f8f2'],
    colors: {
      bgApp: '#282a36',
      bgHeader: '#21222c',
      bgRail: '#191a21',
      bgPanel: '#21222c',
      bgSurface: '#343746',
      bgSurfaceHover: '#44475a',
      bgActive: 'rgba(189, 147, 249, 0.18)',
      borderSubtle: '#44475a',
      borderStrong: '#6272a4',
      textMain: '#f8f8f2',
      textMuted: '#6272a4',
      textFaint: '#44475a',
      accent: '#bd93f9',
      accentHover: '#d1b3fb',
      accentFg: '#282a36',
    },
  },
  'tokyo-night': {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    category: 'dark',
    description: 'Clean visual theme celebrating downtown Tokyo night lights',
    swatches: ['#1a1b26', '#16161e', '#7aa2f7', '#c0caf5'],
    colors: {
      bgApp: '#1a1b26',
      bgHeader: '#16161e',
      bgRail: '#111218',
      bgPanel: '#16161e',
      bgSurface: '#24283b',
      bgSurfaceHover: '#2f3549',
      bgActive: 'rgba(122, 162, 247, 0.15)',
      borderSubtle: '#292e42',
      borderStrong: '#414868',
      textMain: '#c0caf5',
      textMuted: '#565f89',
      textFaint: '#3b4261',
      accent: '#7aa2f7',
      accentHover: '#8cb1fa',
      accentFg: '#1a1b26',
    },
  },
  'catppuccin-mocha': {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    category: 'dark',
    description: 'Soothing pastel dark theme with lavender accents',
    swatches: ['#1e1e2e', '#181825', '#cba6f7', '#cdd6f4'],
    colors: {
      bgApp: '#1e1e2e',
      bgHeader: '#181825',
      bgRail: '#11111b',
      bgPanel: '#181825',
      bgSurface: '#313244',
      bgSurfaceHover: '#45475a',
      bgActive: 'rgba(203, 166, 247, 0.18)',
      borderSubtle: '#45475a',
      borderStrong: '#585b70',
      textMain: '#cdd6f4',
      textMuted: '#a6adc8',
      textFaint: '#6c7086',
      accent: '#cba6f7',
      accentHover: '#d9bbf9',
      accentFg: '#1e1e2e',
    },
  },
  'catppuccin-latte': {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    category: 'light',
    description: 'Warm and gentle pastel light palette',
    swatches: ['#eff1f5', '#e6e9ef', '#8839ef', '#4c4f69'],
    colors: {
      bgApp: '#eff1f5',
      bgHeader: '#e6e9ef',
      bgRail: '#dce0e8',
      bgPanel: '#e6e9ef',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#e6e9ef',
      bgActive: 'rgba(136, 57, 239, 0.12)',
      borderSubtle: '#ccd0da',
      borderStrong: '#acb0be',
      textMain: '#4c4f69',
      textMuted: '#8c8fa1',
      textFaint: '#9ca0b0',
      accent: '#8839ef',
      accentHover: '#7422dc',
      accentFg: '#ffffff',
    },
  },
  'nord': {
    id: 'nord',
    name: 'Nord',
    category: 'dark',
    description: 'Arctic, north-bluish clean and elegant color palette',
    swatches: ['#2e3440', '#242933', '#88c0d0', '#eceff4'],
    colors: {
      bgApp: '#2e3440',
      bgHeader: '#242933',
      bgRail: '#1b1f27',
      bgPanel: '#242933',
      bgSurface: '#3b4252',
      bgSurfaceHover: '#434c5e',
      bgActive: 'rgba(136, 192, 208, 0.18)',
      borderSubtle: '#434c5e',
      borderStrong: '#4c566a',
      textMain: '#eceff4',
      textMuted: '#d8dee9',
      textFaint: '#4c566a',
      accent: '#88c0d0',
      accentHover: '#81a1c1',
      accentFg: '#2e3440',
    },
  },
  'gruvbox-dark': {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    category: 'dark',
    description: 'Retro groove warm palette with earthy tones',
    swatches: ['#282828', '#1d2021', '#fe8019', '#ebdbb2'],
    colors: {
      bgApp: '#282828',
      bgHeader: '#1d2021',
      bgRail: '#141617',
      bgPanel: '#1d2021',
      bgSurface: '#3c3836',
      bgSurfaceHover: '#504945',
      bgActive: 'rgba(254, 128, 25, 0.18)',
      borderSubtle: '#504945',
      borderStrong: '#665c54',
      textMain: '#ebdbb2',
      textMuted: '#a89984',
      textFaint: '#7c6f64',
      accent: '#fe8019',
      accentHover: '#fabd2f',
      accentFg: '#282828',
    },
  },
  'solarized-dark': {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    category: 'dark',
    description: 'Ethan Schoonover’s precision calculated cyan dark palette',
    swatches: ['#002b36', '#073642', '#268bd2', '#839496'],
    colors: {
      bgApp: '#002b36',
      bgHeader: '#073642',
      bgRail: '#001e26',
      bgPanel: '#073642',
      bgSurface: '#0a4654',
      bgSurfaceHover: '#0e5263',
      bgActive: 'rgba(38, 139, 210, 0.2)',
      borderSubtle: '#0f596b',
      borderStrong: '#586e75',
      textMain: '#839496',
      textMuted: '#657b83',
      textFaint: '#586e75',
      accent: '#268bd2',
      accentHover: '#2aa198',
      accentFg: '#ffffff',
    },
  },
  'solarized-light': {
    id: 'solarized-light',
    name: 'Solarized Light',
    category: 'light',
    description: 'Ethan Schoonover’s precision warm cream light palette',
    swatches: ['#fdf6e3', '#eee8d5', '#268bd2', '#657b83'],
    colors: {
      bgApp: '#fdf6e3',
      bgHeader: '#eee8d5',
      bgRail: '#e4decb',
      bgPanel: '#eee8d5',
      bgSurface: '#ffffff',
      bgSurfaceHover: '#eee8d5',
      bgActive: 'rgba(38, 139, 210, 0.15)',
      borderSubtle: '#d3cbbb',
      borderStrong: '#b7ad97',
      textMain: '#657b83',
      textMuted: '#93a1a1',
      textFaint: '#a9b7b7',
      accent: '#268bd2',
      accentHover: '#2aa198',
      accentFg: '#ffffff',
    },
  },
  'monokai-pro': {
    id: 'monokai-pro',
    name: 'Monokai Pro',
    category: 'dark',
    description: 'Subtle charcoal background with vibrant yellow/orange accents',
    swatches: ['#2d2a2e', '#221f22', '#ffd866', '#fcfcfa'],
    colors: {
      bgApp: '#2d2a2e',
      bgHeader: '#221f22',
      bgRail: '#181618',
      bgPanel: '#221f22',
      bgSurface: '#3a373b',
      bgSurfaceHover: '#49454a',
      bgActive: 'rgba(255, 216, 102, 0.18)',
      borderSubtle: '#49454a',
      borderStrong: '#727072',
      textMain: '#fcfcfa',
      textMuted: '#939293',
      textFaint: '#727072',
      accent: '#ffd866',
      accentHover: '#ff6188',
      accentFg: '#2d2a2e',
    },
  },
  'rose-pine': {
    id: 'rose-pine',
    name: 'Rosé Pine',
    category: 'dark',
    description: 'All natural pine, warm rose gold, and soft lilac aesthetic',
    swatches: ['#191724', '#1f1d2e', '#ebbcba', '#e0def4'],
    colors: {
      bgApp: '#191724',
      bgHeader: '#1f1d2e',
      bgRail: '#12101b',
      bgPanel: '#1f1d2e',
      bgSurface: '#26233a',
      bgSurfaceHover: '#312f47',
      bgActive: 'rgba(235, 188, 186, 0.18)',
      borderSubtle: '#403d52',
      borderStrong: '#524f67',
      textMain: '#e0def4',
      textMuted: '#908caa',
      textFaint: '#6e6a86',
      accent: '#ebbcba',
      accentHover: '#f6c177',
      accentFg: '#191724',
    },
  },
  'night-owl': {
    id: 'night-owl',
    name: 'Night Owl',
    category: 'dark',
    description: 'Sarah Drasner’s deep midnight blue tuned for low-light coding',
    swatches: ['#011627', '#01111d', '#82aaff', '#d6deeb'],
    colors: {
      bgApp: '#011627',
      bgHeader: '#01111d',
      bgRail: '#000c14',
      bgPanel: '#01111d',
      bgSurface: '#0b253a',
      bgSurfaceHover: '#13334d',
      bgActive: 'rgba(130, 170, 255, 0.18)',
      borderSubtle: '#1d3b53',
      borderStrong: '#5f7e97',
      textMain: '#d6deeb',
      textMuted: '#7f98b0',
      textFaint: '#5f7e97',
      accent: '#82aaff',
      accentHover: '#addb67',
      accentFg: '#011627',
    },
  },
  'vesper': {
    id: 'vesper',
    name: 'Vesper',
    category: 'dark',
    description: 'Pitch black minimalist design with warm amber accents',
    swatches: ['#101010', '#0a0a0a', '#ffc799', '#ffffff'],
    colors: {
      bgApp: '#101010',
      bgHeader: '#0a0a0a',
      bgRail: '#040404',
      bgPanel: '#0a0a0a',
      bgSurface: '#1c1c1c',
      bgSurfaceHover: '#282828',
      bgActive: 'rgba(255, 199, 153, 0.18)',
      borderSubtle: '#282828',
      borderStrong: '#404040',
      textMain: '#ffffff',
      textMuted: '#8a8a8a',
      textFaint: '#505050',
      accent: '#ffc799',
      accentHover: '#ffe0c2',
      accentFg: '#101010',
    },
  },
};

const THEME_STORAGE_KEY = 'unfuse_active_theme';

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return 'github-dark';
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (saved && THEMES[saved]) {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'github-dark';
}

export function applyTheme(themeId: ThemeId): void {
  const theme = THEMES[themeId] || THEMES['github-dark'];
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
