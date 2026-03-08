export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    foreground: string;
    card: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    border: string;
    success: string;
    warning: string;
    glowPrimary: string;
    glowSecondary: string;
    sidebarBackground: string;
    sidebarForeground: string;
    sidebarPrimary: string;
    sidebarBorder: string;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'cyber-dark',
    name: '🌌 Cyber Dark (Padrão)',
    description: 'Tema escuro futurista com azul ciano e dourado',
    colors: {
      background: '220 20% 6%',
      foreground: '210 40% 92%',
      card: '220 18% 10%',
      primary: '195 100% 50%',
      primaryForeground: '220 20% 6%',
      secondary: '45 100% 55%',
      muted: '220 15% 16%',
      mutedForeground: '215 20% 55%',
      accent: '195 80% 30%',
      border: '220 15% 18%',
      success: '145 80% 42%',
      warning: '38 92% 50%',
      glowPrimary: '195 100% 50%',
      glowSecondary: '45 100% 55%',
      sidebarBackground: '220 20% 8%',
      sidebarForeground: '210 40% 85%',
      sidebarPrimary: '195 100% 50%',
      sidebarBorder: '220 15% 15%',
    },
  },
  {
    id: 'emerald-matrix',
    name: '💚 Emerald Matrix',
    description: 'Verde neon estilo Matrix hacker',
    colors: {
      background: '160 20% 4%',
      foreground: '150 40% 90%',
      card: '160 18% 8%',
      primary: '145 100% 45%',
      primaryForeground: '160 20% 4%',
      secondary: '80 100% 50%',
      muted: '160 15% 14%',
      mutedForeground: '155 20% 50%',
      accent: '145 80% 25%',
      border: '160 15% 16%',
      success: '120 80% 45%',
      warning: '50 92% 50%',
      glowPrimary: '145 100% 45%',
      glowSecondary: '80 100% 50%',
      sidebarBackground: '160 20% 6%',
      sidebarForeground: '150 40% 80%',
      sidebarPrimary: '145 100% 45%',
      sidebarBorder: '160 15% 12%',
    },
  },
  {
    id: 'crimson-fire',
    name: '🔥 Crimson Fire',
    description: 'Vermelho intenso com acentos laranja',
    colors: {
      background: '0 15% 5%',
      foreground: '0 10% 92%',
      card: '0 12% 9%',
      primary: '0 85% 55%',
      primaryForeground: '0 0% 100%',
      secondary: '25 100% 55%',
      muted: '0 10% 15%',
      mutedForeground: '0 10% 55%',
      accent: '0 60% 30%',
      border: '0 10% 17%',
      success: '145 70% 42%',
      warning: '45 100% 55%',
      glowPrimary: '0 85% 55%',
      glowSecondary: '25 100% 55%',
      sidebarBackground: '0 15% 7%',
      sidebarForeground: '0 10% 82%',
      sidebarPrimary: '0 85% 55%',
      sidebarBorder: '0 10% 13%',
    },
  },
  {
    id: 'royal-purple',
    name: '👑 Royal Purple',
    description: 'Roxo real com detalhes em ouro',
    colors: {
      background: '270 20% 6%',
      foreground: '270 15% 92%',
      card: '270 18% 10%',
      primary: '270 80% 60%',
      primaryForeground: '270 20% 6%',
      secondary: '45 100% 60%',
      muted: '270 15% 16%',
      mutedForeground: '270 15% 55%',
      accent: '270 60% 35%',
      border: '270 15% 18%',
      success: '145 70% 42%',
      warning: '38 90% 55%',
      glowPrimary: '270 80% 60%',
      glowSecondary: '45 100% 60%',
      sidebarBackground: '270 20% 8%',
      sidebarForeground: '270 15% 82%',
      sidebarPrimary: '270 80% 60%',
      sidebarBorder: '270 15% 14%',
    },
  },
  {
    id: 'ocean-blue',
    name: '🌊 Ocean Deep',
    description: 'Azul profundo oceânico com brilho aqua',
    colors: {
      background: '210 25% 5%',
      foreground: '205 30% 92%',
      card: '210 22% 9%',
      primary: '210 100% 55%',
      primaryForeground: '0 0% 100%',
      secondary: '180 80% 50%',
      muted: '210 18% 15%',
      mutedForeground: '210 15% 55%',
      accent: '210 70% 30%',
      border: '210 18% 17%',
      success: '160 80% 42%',
      warning: '40 90% 55%',
      glowPrimary: '210 100% 55%',
      glowSecondary: '180 80% 50%',
      sidebarBackground: '210 25% 7%',
      sidebarForeground: '205 30% 82%',
      sidebarPrimary: '210 100% 55%',
      sidebarBorder: '210 18% 13%',
    },
  },
  {
    id: 'gold-luxury',
    name: '✨ Gold Luxury',
    description: 'Dourado premium com fundo escuro elegante',
    colors: {
      background: '30 15% 5%',
      foreground: '35 25% 90%',
      card: '30 12% 9%',
      primary: '42 90% 55%',
      primaryForeground: '30 15% 5%',
      secondary: '30 70% 60%',
      muted: '30 10% 15%',
      mutedForeground: '30 10% 55%',
      accent: '42 60% 30%',
      border: '30 10% 17%',
      success: '145 70% 42%',
      warning: '20 90% 55%',
      glowPrimary: '42 90% 55%',
      glowSecondary: '30 70% 60%',
      sidebarBackground: '30 15% 7%',
      sidebarForeground: '35 25% 82%',
      sidebarPrimary: '42 90% 55%',
      sidebarBorder: '30 10% 13%',
    },
  },
];

export function applyTheme(theme: ThemePreset) {
  const root = document.documentElement;
  root.style.setProperty('--background', theme.colors.background);
  root.style.setProperty('--foreground', theme.colors.foreground);
  root.style.setProperty('--card', theme.colors.card);
  root.style.setProperty('--card-foreground', theme.colors.foreground);
  root.style.setProperty('--popover', theme.colors.card);
  root.style.setProperty('--popover-foreground', theme.colors.foreground);
  root.style.setProperty('--primary', theme.colors.primary);
  root.style.setProperty('--primary-foreground', theme.colors.primaryForeground);
  root.style.setProperty('--secondary', theme.colors.secondary);
  root.style.setProperty('--secondary-foreground', theme.colors.primaryForeground);
  root.style.setProperty('--muted', theme.colors.muted);
  root.style.setProperty('--muted-foreground', theme.colors.mutedForeground);
  root.style.setProperty('--accent', theme.colors.accent);
  root.style.setProperty('--accent-foreground', theme.colors.foreground);
  root.style.setProperty('--border', theme.colors.border);
  root.style.setProperty('--input', theme.colors.border);
  root.style.setProperty('--ring', theme.colors.primary);
  root.style.setProperty('--success', theme.colors.success);
  root.style.setProperty('--warning', theme.colors.warning);
  root.style.setProperty('--glow-primary', theme.colors.glowPrimary);
  root.style.setProperty('--glow-secondary', theme.colors.glowSecondary);
  root.style.setProperty('--sidebar-background', theme.colors.sidebarBackground);
  root.style.setProperty('--sidebar-foreground', theme.colors.sidebarForeground);
  root.style.setProperty('--sidebar-primary', theme.colors.sidebarPrimary);
  root.style.setProperty('--sidebar-primary-foreground', theme.colors.primaryForeground);
  root.style.setProperty('--sidebar-accent', theme.colors.muted);
  root.style.setProperty('--sidebar-accent-foreground', theme.colors.sidebarForeground);
  root.style.setProperty('--sidebar-border', theme.colors.sidebarBorder);
  root.style.setProperty('--sidebar-ring', theme.colors.sidebarPrimary);
}

export function loadSavedTheme(): string {
  try {
    return localStorage.getItem('app_theme') || 'cyber-dark';
  } catch {
    return 'cyber-dark';
  }
}

export function saveTheme(themeId: string) {
  try {
    localStorage.setItem('app_theme', themeId);
  } catch {}
}

export function initTheme() {
  const savedId = loadSavedTheme();
  const theme = THEME_PRESETS.find(t => t.id === savedId);
  if (theme && savedId !== 'cyber-dark') {
    applyTheme(theme);
  }
}
