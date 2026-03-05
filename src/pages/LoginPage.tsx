import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import robotHero from '@/assets/robot-hero.png';
import { Eye, EyeOff, Zap, Shield, Brain } from 'lucide-react';
import { AI_SPECIALISTS } from '@/lib/lotteryConstants';

const VALID_EMAIL = 'keomatiago@gmail.com';
const VALID_PIN = '834589';

const LoginPage = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email !== VALID_EMAIL) {
      setError('Acesso negado — email não autorizado');
      return;
    }
    if (pin !== VALID_PIN) {
      setError('PIN incorreto');
      return;
    }

    setLoading(true);
    try {
      // Use PIN as part of a longer password to meet Supabase requirements
      const password = `DommoSupremo#${pin}#2026`;
      try {
        await signIn(email, password);
      } catch {
        await signUp(email, password);
        // Wait briefly for auto-confirm
        await new Promise(r => setTimeout(r, 1000));
        await signIn(email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute w-full h-[2px] bg-primary/10 animate-[scan-line_4s_linear_infinite]" />
      </div>

      {/* Left - Robot */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08)_0%,transparent_70%)]" />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="relative z-10"
        >
          <motion.img
            src={robotHero}
            alt="DommoSupremo AI"
            className="w-[500px] h-auto drop-shadow-[0_0_40px_hsl(var(--primary)/0.3)]"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[300px] h-[20px] rounded-[100%] bg-primary/20 blur-xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>

      {/* Right - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center gap-2 mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Brain className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-display font-bold text-primary glow-text-primary">
                DOMMO SUPREMO
              </h1>
            </motion.div>
            <p className="text-muted-foreground text-lg">
              Sistema Avançado de Inteligência para Loterias
            </p>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-secondary" />
                <span>{AI_SPECIALISTS.length}+ IAs</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-success" />
                <span>9 Loterias</span>
              </div>
            </div>
          </div>

          {/* Mobile robot */}
          <div className="lg:hidden flex justify-center mb-6">
            <img src={robotHero} alt="DommoSupremo AI" className="w-32 h-auto opacity-80" />
          </div>

          {/* Form */}
          <div className="glass rounded-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              {/* PIN */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">PIN de Acesso</label>
                <div className="flex gap-2 justify-center mb-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                        pin.length > i
                          ? 'bg-primary border-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]'
                          : 'border-muted-foreground/30 bg-transparent'
                      }`}
                    />
                  ))}
                </div>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 text-center tracking-[0.5em] text-transparent focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all caret-transparent"
                  placeholder="••••••"
                  required
                />
              </div>

              {error && (
                <div className="text-sm p-3 rounded-lg bg-destructive/10 text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-primary-foreground font-display font-semibold py-3 rounded-lg glow-primary hover:opacity-90 transition-all disabled:opacity-50 text-lg tracking-wider"
              >
                {loading ? 'Processando...' : 'ACESSAR SISTEMA'}
              </button>

              <p className="text-xs text-center text-muted-foreground/50">
                Acesso restrito — Sistema privado
              </p>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            DommoSupremo v3.0 — {AI_SPECIALISTS.length} IAs Ativas — Horário de Brasília
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
