import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Palette, Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// ── TIPOS ────────────────────────────────────────────────────
export interface Theme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  vars: Record<string, string>;
  glassMorphism: boolean;
  neonGlow: boolean;
  particleEffect: boolean;
}

interface ThemeContextType {
  currentTheme: Theme;
  themes: Theme[];
  setTheme: (id: string) => void;
  generateAITheme: (prompt: string) => Promise<void>;
  isGenerating: boolean;
  customThemes: Theme[];
}

// ── TEMAS PRÉ-DEFINIDOS ───────────────────────────────────────
export const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'dommo-original',
    name: 'DommoSupremo Original',
    description: 'O tema clássico azul neon — terror das loterias',
    emoji: '⚡',
    glassMorphism: true,
    neonGlow: true,
    particleEffect: true,
    vars: {
      '--primary': '190 100% 50%',
      '--primary-foreground': '0 0% 0%',
      '--background': '220 30% 6%',
      '--foreground': '210 40% 95%',
      '--card': '220 28% 9%',
      '--card-foreground': '210 40% 95%',
      '--secondary': '220 25% 14%',
      '--accent': '190 100% 40%',
      '--muted': '220 20% 16%',
      '--border': '190 50% 25%',
      '--glow-color': '0, 191, 255',
      '--sidebar-bg': '220 30% 7%',
      '--neon-intensity': '1',
    },
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    description: 'Verde hacker — codificando os resultados',
    emoji: '🟢',
    glassMorphism: true,
    neonGlow: true,
    particleEffect: true,
    vars: {
      '--primary': '142 72% 50%',
      '--primary-foreground': '0 0% 0%',
      '--background': '140 20% 5%',
      '--foreground': '140 20% 92%',
      '--card': '140 18% 8%',
      '--card-foreground': '140 20% 92%',
      '--secondary': '140 15% 13%',
      '--accent': '142 72% 40%',
      '--muted': '140 12% 15%',
      '--border': '142 40% 22%',
      '--glow-color': '52, 211, 153',
      '--sidebar-bg': '140 20% 6%',
      '--neon-intensity': '0.9',
    },
  },
  {
    id: 'blood-gold',
    name: 'Blood & Gold',
    description: 'Vermelho poder e ouro das premiações',
    emoji: '🔴',
    glassMorphism: false,
    neonGlow: true,
    particleEffect: false,
    vars: {
      '--primary': '45 95% 55%',
      '--primary-foreground': '0 0% 0%',
      '--background': '0 20% 5%',
      '--foreground': '0 5% 92%',
      '--card': '0 18% 8%',
      '--card-foreground': '0 5% 92%',
      '--secondary': '0 15% 13%',
      '--accent': '0 80% 50%',
      '--muted': '0 12% 15%',
      '--border': '0 40% 22%',
      '--glow-color': '234, 179, 8',
      '--sidebar-bg': '0 20% 6%',
      '--neon-intensity': '0.8',
    },
  },
  {
    id: 'purple-oracle',
    name: 'Purple Oracle',
    description: 'Roxo místico — a visão além dos sorteios',
    emoji: '🔮',
    glassMorphism: true,
    neonGlow: true,
    particleEffect: true,
    vars: {
      '--primary': '270 80% 65%',
      '--primary-foreground': '0 0% 0%',
      '--background': '270 25% 6%',
      '--foreground': '270 10% 92%',
      '--card': '270 22% 9%',
      '--card-foreground': '270 10% 92%',
      '--secondary': '270 18% 14%',
      '--accent': '290 70% 55%',
      '--muted': '270 15% 16%',
      '--border': '270 35% 24%',
      '--glow-color': '147, 51, 234',
      '--sidebar-bg': '270 25% 7%',
      '--neon-intensity': '1',
    },
  },
  {
    id: 'arctic-ice',
    name: 'Arctic Ice',
    description: 'Branco gelo — clareza e precisão máxima',
    emoji: '🧊',
    glassMorphism: true,
    neonGlow: false,
    particleEffect: false,
    vars: {
      '--primary': '200 100% 45%',
      '--primary-foreground': '0 0% 100%',
      '--background': '210 30% 10%',
      '--foreground': '210 30% 96%',
      '--card': '210 28% 14%',
      '--card-foreground': '210 30% 96%',
      '--secondary': '210 22% 18%',
      '--accent': '180 80% 45%',
      '--muted': '210 18% 20%',
      '--border': '210 30% 28%',
      '--glow-color': '56, 189, 248',
      '--sidebar-bg': '210 30% 11%',
      '--neon-intensity': '0.5',
    },
  },
  {
    id: 'fire-domain',
    name: 'Fire Domain',
    description: 'Laranja fogo — combustão total nos sorteios',
    emoji: '🔥',
    glassMorphism: false,
    neonGlow: true,
    particleEffect: true,
    vars: {
      '--primary': '25 100% 55%',
      '--primary-foreground': '0 0% 0%',
      '--background': '20 25% 5%',
      '--foreground': '20 10% 93%',
      '--card': '20 22% 8%',
      '--card-foreground': '20 10% 93%',
      '--secondary': '20 18% 13%',
      '--accent': '10 90% 50%',
      '--muted': '20 15% 15%',
      '--border': '25 50% 22%',
      '--glow-color': '249, 115, 22',
      '--sidebar-bg': '20 25% 6%',
      '--neon-intensity': '0.9',
    },
  },
  {
    id: 'midnight-rose',
    name: 'Midnight Rose',
    description: 'Rosa elegante no escuro da noite',
    emoji: '🌹',
    glassMorphism: true,
    neonGlow: true,
    particleEffect: false,
    vars: {
      '--primary': '330 80% 65%',
      '--primary-foreground': '0 0% 0%',
      '--background': '330 20% 6%',
      '--foreground': '330 10% 93%',
      '--card': '330 18% 9%',
      '--card-foreground': '330 10% 93%',
      '--secondary': '330 15% 14%',
      '--accent': '350 80% 60%',
      '--muted': '330 12% 16%',
      '--border': '330 35% 24%',
      '--glow-color': '236, 72, 153',
      '--sidebar-bg': '330 20% 7%',
      '--neon-intensity': '0.85',
    },
  },
  {
    id: 'stealth-mode',
    name: 'Stealth Mode',
    description: 'Cinza carbono — invisível mas preciso',
    emoji: '🎯',
    glassMorphism: false,
    neonGlow: false,
    particleEffect: false,
    vars: {
      '--primary': '0 0% 70%',
      '--primary-foreground': '0 0% 0%',
      '--background': '0 0% 5%',
      '--foreground': '0 0% 90%',
      '--card': '0 0% 8%',
      '--card-foreground': '0 0% 90%',
      '--secondary': '0 0% 13%',
      '--accent': '0 0% 55%',
      '--muted': '0 0% 15%',
      '--border': '0 0% 20%',
      '--glow-color': '161, 161, 170',
      '--sidebar-bg': '0 0% 6%',
      '--neon-intensity': '0.3',
    },
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: 'Azul profundo — mergulho nos dados',
    emoji: '🌊',
    glassMorphism: true,
    neonGlow: false,
    particleEffect: true,
    vars: {
      '--primary': '215 80% 55%',
      '--primary-foreground': '0 0% 100%',
      '--background': '220 40% 5%',
      '--foreground': '215 20% 93%',
      '--card': '220 35% 8%',
      '--card-foreground': '215 20% 93%',
      '--secondary': '220 28% 13%',
      '--accent': '195 70% 50%',
      '--muted': '220 22% 15%',
      '--border': '215 40% 22%',
      '--glow-color': '59, 130, 246',
      '--sidebar-bg': '220 40% 6%',
      '--neon-intensity': '0.6',
    },
  },
  {
    id: 'toxic-lime',
    name: 'Toxic Lime',
    description: 'Verde limão tóxico — máxima visibilidade',
    emoji: '☢️',
    glassMorphism: false,
    neonGlow: true,
    particleEffect: true,
    vars: {
      '--primary': '82 100% 50%',
      '--primary-foreground': '0 0% 0%',
      '--background': '82 15% 5%',
      '--foreground': '82 10% 92%',
      '--card': '82 12% 8%',
      '--card-foreground': '82 10% 92%',
      '--secondary': '82 10% 13%',
      '--accent': '100 90% 45%',
      '--muted': '82 8% 15%',
      '--border': '82 35% 20%',
      '--glow-color': '163, 230, 53',
      '--sidebar-bg': '82 15% 6%',
      '--neon-intensity': '1',
    },
  },
];

// ── CONTEXT ───────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState<string>('dommo-original');
  const [customThemes, setCustomThemes] = useState<Theme[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const allThemes = [...BUILT_IN_THEMES, ...customThemes];
  const currentTheme = allThemes.find((t) => t.id === currentThemeId) || BUILT_IN_THEMES[0];

  useEffect(() => {
    const saved = localStorage.getItem('dommo-theme');
    const savedCustom = localStorage.getItem('dommo-custom-themes');
    if (saved) setCurrentThemeId(saved);
    if (savedCustom) {
      try { setCustomThemes(JSON.parse(savedCustom)); } catch {}
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    Object.entries(currentTheme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    root.classList.toggle('theme-glass', currentTheme.glassMorphism);
    root.classList.toggle('theme-neon', currentTheme.neonGlow);
    root.classList.toggle('theme-particles', currentTheme.particleEffect);
  }, [currentTheme]);

  const setTheme = useCallback((id: string) => {
    setCurrentThemeId(id);
    localStorage.setItem('dommo-theme', id);
  }, []);

  const generateAITheme = useCallback(async (prompt: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-theme', {
        body: { prompt },
      });

      if (error) throw error;

      const theme: Theme = {
        id: `ai-theme-${Date.now()}`,
        name: data?.name || 'Tema IA',
        description: data?.description || prompt.slice(0, 50),
        emoji: data?.emoji || '🎨',
        glassMorphism: data?.glassMorphism ?? true,
        neonGlow: data?.neonGlow ?? true,
        particleEffect: data?.particleEffect ?? false,
        vars: data?.vars || BUILT_IN_THEMES[0].vars,
      };

      const newCustomThemes = [...customThemes, theme];
      setCustomThemes(newCustomThemes);
      localStorage.setItem('dommo-custom-themes', JSON.stringify(newCustomThemes));
      setTheme(theme.id);
    } catch (err) {
      // Fallback: generate a random theme locally
      const hue = Math.floor(Math.random() * 360);
      const theme: Theme = {
        id: `ai-theme-${Date.now()}`,
        name: prompt.slice(0, 20) || 'Tema Personalizado',
        description: prompt.slice(0, 50),
        emoji: '🎨',
        glassMorphism: true,
        neonGlow: true,
        particleEffect: Math.random() > 0.5,
        vars: {
          '--primary': `${hue} 80% 55%`,
          '--primary-foreground': '0 0% 0%',
          '--background': `${hue} 20% 5%`,
          '--foreground': `${hue} 10% 92%`,
          '--card': `${hue} 18% 8%`,
          '--card-foreground': `${hue} 10% 92%`,
          '--secondary': `${hue} 15% 13%`,
          '--accent': `${(hue + 30) % 360} 70% 50%`,
          '--muted': `${hue} 12% 15%`,
          '--border': `${hue} 35% 22%`,
          '--glow-color': `${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}, ${Math.floor(Math.random()*255)}`,
          '--sidebar-bg': `${hue} 20% 6%`,
          '--neon-intensity': '0.9',
        },
      };
      const newCustomThemes = [...customThemes, theme];
      setCustomThemes(newCustomThemes);
      localStorage.setItem('dommo-custom-themes', JSON.stringify(newCustomThemes));
      setTheme(theme.id);
      toast.success('Tema gerado localmente!');
    } finally {
      setIsGenerating(false);
    }
  }, [customThemes, setTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, themes: allThemes, setTheme, generateAITheme, isGenerating, customThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeSystem() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeSystem deve ser usado dentro de ThemeProvider');
  return ctx;
}

// ── COMPONENTE PAINEL DE TEMAS ────────────────────────────────
export function ThemePanel() {
  const { themes, currentTheme, setTheme, generateAITheme, isGenerating } = useThemeSystem();
  const [aiPrompt, setAIPrompt] = useState('');
  const [showAI, setShowAI] = useState(false);

  const handleGenerateTheme = async () => {
    if (!aiPrompt.trim()) return;
    try {
      await generateAITheme(aiPrompt);
      setAIPrompt('');
      setShowAI(false);
      toast.success('Tema gerado pela IA!', { description: 'Seu tema personalizado foi aplicado.' });
    } catch {
      toast.error('Erro ao gerar tema');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Temas & Customização</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10"
          onClick={() => setShowAI(!showAI)}
        >
          <Sparkles className="w-3 h-3" />
          IA
        </Button>
      </div>

      {showAI && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
          <p className="text-xs text-muted-foreground">Descreva o tema que quer gerar com IA:</p>
          <Input
            value={aiPrompt}
            onChange={(e) => setAIPrompt(e.target.value)}
            placeholder="Ex: Diamante azul glacial com reflexos dourados..."
            className="text-xs h-8 bg-background/50"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerateTheme()}
          />
          <Button
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleGenerateTheme}
            disabled={isGenerating || !aiPrompt.trim()}
          >
            {isGenerating ? (
              <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Gerando...</>
            ) : (
              <><Sparkles className="w-3 h-3 mr-1" /> Gerar com IA</>
            )}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={`
              relative group p-3 rounded-xl text-left transition-all border
              ${currentTheme.id === theme.id
                ? 'border-primary/60 bg-primary/10 shadow-lg shadow-primary/10'
                : 'border-border/40 hover:border-primary/30 bg-card hover:bg-card/80'
              }
            `}
          >
            {currentTheme.id === theme.id && (
              <div className="absolute top-1.5 right-1.5">
                <Check className="w-3 h-3 text-primary" />
              </div>
            )}
            <div className="text-lg mb-1">{theme.emoji}</div>
            <div className="text-xs font-medium leading-tight">{theme.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-tight line-clamp-2">
              {theme.description}
            </div>

            <div className="flex gap-1 mt-2">
              {['--primary', '--accent', '--secondary'].map((v) => (
                <div
                  key={v}
                  className="w-4 h-2 rounded-full opacity-80"
                  style={{ background: `hsl(${theme.vars[v]})` }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
