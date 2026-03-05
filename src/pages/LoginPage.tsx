import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import robotHero from '@/assets/robot-hero.png';
import { Eye, EyeOff, Zap, Shield, Brain } from 'lucide-react';

const LoginPage = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        setError('Conta criada! Verifique seu email.');
      } else {
        await signIn(email, password);
        navigate('/dashboard');
      }
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
                <span>155+ IAs</span>
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
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* PIN section */}
              {usePin && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">PIN de Acesso</label>
                  <div className="flex gap-3 justify-center">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`} />
                    ))}
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full mt-2 bg-muted/50 border border-border rounded-lg px-4 py-2 text-foreground text-center tracking-[1em] focus:outline-none focus:ring-2 focus:ring-primary/50 text-transparent selection:text-transparent caret-transparent"
                    placeholder=""
                    style={{ color: 'transparent', textShadow: 'none' }}
                  />
                </div>
              )}

              {error && (
                <div className={`text-sm p-3 rounded-lg ${error.includes('criada') ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary text-primary-foreground font-display font-semibold py-3 rounded-lg glow-primary hover:opacity-90 transition-all disabled:opacity-50 text-lg tracking-wider"
              >
                {loading ? 'Processando...' : isSignUp ? 'CRIAR CONTA' : 'ACESSAR SISTEMA'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setUsePin(!usePin)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {usePin ? 'Ocultar PIN' : 'Usar PIN'}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  {isSignUp ? 'Já tenho conta' : 'Criar conta'}
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground/50 mt-6">
            DommoSupremo v3.0 — {AI_SPECIALISTS_COUNT} IAs Ativas — Horário de Brasília
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const AI_SPECIALISTS_COUNT = 155;

export default LoginPage;
