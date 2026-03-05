import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Brain, LayoutDashboard, Settings, History, Trophy,
  Ticket, Bot, LogOut, ChevronLeft, ChevronRight,
  Zap, Database, Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
  { id: 'dashboard', label: 'Painel Principal', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'analysis', label: 'Análise de Loterias', icon: Brain, path: '/dashboard/analysis' },
  { id: 'bets', label: 'Minhas Apostas', icon: Ticket, path: '/dashboard/bets' },
  { id: 'history', label: 'Histórico de Gates', icon: History, path: '/dashboard/history' },
  { id: 'results', label: 'Resultados', icon: Trophy, path: '/dashboard/results' },
  { id: 'ai', label: 'IAs Especialistas', icon: Bot, path: '/dashboard/ai' },
  { id: 'gates', label: 'Config. Gates', icon: Target, path: '/dashboard/gates' },
  { id: 'api', label: 'API & Sincronização', icon: Database, path: '/dashboard/api' },
  { id: 'settings', label: 'Configurações', icon: Settings, path: '/dashboard/settings' },
];

const DashboardSidebar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0 z-30"
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-sidebar-border">
        <Zap className="w-7 h-7 text-primary shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-display font-bold text-primary text-sm tracking-wider glow-text-primary whitespace-nowrap"
            >
              DOMMO SUPREMO
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium
                ${isActive
                  ? 'bg-primary/10 text-primary glow-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all text-sm"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span>Recolher</span>}
        </button>
        <button
          onClick={async () => { await signOut(); navigate('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-all text-sm"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default DashboardSidebar;
