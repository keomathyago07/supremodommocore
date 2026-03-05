import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { LOTTERIES } from '@/lib/lotteryConstants';
import { Target, Save, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const GateConfigPage = () => {
  const { user } = useAuth();
  const [minConfidence, setMinConfidence] = useState(100);
  const [autoApprove, setAutoApprove] = useState(true);
  const [notifyOnGate, setNotifyOnGate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('gate_config')
      .select('*')
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setMinConfidence(Number(data.min_confidence));
          setAutoApprove(data.auto_approve);
          setNotifyOnGate(data.notify_on_gate);
          setConfigId(data.id);
        }
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      min_confidence: minConfidence,
      auto_approve: autoApprove,
      notify_on_gate: notifyOnGate,
    };
    if (configId) {
      await supabase.from('gate_config').update(payload as any).eq('id', configId);
    } else {
      const { data } = await supabase.from('gate_config').insert(payload as any).select().single() as any;
      if (data) setConfigId(data.id);
    }
    toast.success('Configurações de gate salvas!');
    setSaving(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-bold">Configuração de Gates</h1>
      <p className="text-muted-foreground text-sm">
        Defina os critérios de confiança. As IAs trabalham, estudam e se aperfeiçoam continuamente para atingir 100%.
      </p>

      <div className="glass rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-display font-semibold">Critérios de Confiança</h2>
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-2">
            Confiança Mínima para Gate: <span className="text-primary font-display font-bold">{minConfidence.toFixed(1)}%</span>
          </label>
          <input
            type="range"
            min={95}
            max={100}
            step={0.1}
            value={minConfidence}
            onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>95%</span>
            <span>100%</span>
          </div>
        </div>

        {[
          { label: 'Auto-aprovação de gates', desc: 'Gates que atingem o padrão são salvos automaticamente', value: autoApprove, set: setAutoApprove },
          { label: 'Notificar ao encontrar gate', desc: 'Notificação instantânea quando um gate é encontrado', value: notifyOnGate, set: setNotifyOnGate },
        ].map((toggle) => (
          <div key={toggle.label} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm font-medium">{toggle.label}</p>
              <p className="text-xs text-muted-foreground">{toggle.desc}</p>
            </div>
            <button
              onClick={() => toggle.set(!toggle.value)}
              className={`w-12 h-6 rounded-full transition-all ${toggle.value ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-foreground transition-transform ${toggle.value ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}

        <button
          onClick={save}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 gradient-primary text-primary-foreground font-display font-semibold py-3 rounded-lg glow-primary hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Salvar Configurações
        </button>
      </div>

      {/* Locked Patterns */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-secondary" />
          <h2 className="text-lg font-display font-semibold">Padrões Travados por Loteria</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Estes padrões NÃO podem ser alterados. As IAs trabalham exclusivamente com eles.
        </p>
        <div className="space-y-4">
          {LOTTERIES.map((lottery, i) => (
            <motion.div
              key={lottery.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="p-4 bg-muted/20 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: lottery.color }} />
                <span className="font-display font-semibold text-sm">{lottery.name}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {lottery.lockedPatterns.map((p) => (
                  <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-mono border border-primary/20">
                    🔒 {p}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GateConfigPage;
