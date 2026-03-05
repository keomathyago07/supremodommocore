import { useAuth } from '@/hooks/useAuth';
import { Settings, User, Bell, Monitor, Smartphone } from 'lucide-react';

const SettingsPage = () => {
  const { user } = useAuth();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-display font-bold">Configurações</h1>

      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold">Conta</h2>
        </div>
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-mono text-sm">{user?.email}</p>
        </div>
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-secondary" />
          <h2 className="font-display font-semibold">Notificações</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Notificar gates encontrados', enabled: true },
            { label: 'Notificar resultados de sorteios (21h)', enabled: true },
            { label: 'Notificar conferência de apostas', enabled: true },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm">{n.label}</span>
              <div className={`w-10 h-5 rounded-full ${n.enabled ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-4 h-4 rounded-full bg-foreground transition-transform ${n.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Monitor className="w-5 h-5 text-success" />
          <h2 className="font-display font-semibold">Sincronização Desktop/Mobile</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Todos os dados são sincronizados automaticamente entre dispositivos via Lovable Cloud.
          Acesse de qualquer lugar para ver suas apostas, gates e análises em tempo real.
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-success">
            <Monitor className="w-4 h-4" />
            <span>Desktop sincronizado</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-success">
            <Smartphone className="w-4 h-4" />
            <span>Mobile sincronizado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
