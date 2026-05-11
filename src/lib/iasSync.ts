// ================================================================
// 🔗 IAS SYNC — Sincroniza Controle de IAS com motor de gates
// Quando o usuário salva um nível (ex.: Máxima/Infinita), as metas
// são aplicadas IMEDIATAMENTE em DOMMO_CONFIG e gate_config (DB)
// sem quebrar nenhuma outra configuração.
// ================================================================
import { DOMMO_CONFIG } from './dommoCore';
import { supabase } from '@/integrations/supabase/client';
import { getIASConfig, type IASConfig } from '@/pages/IASControlPage';

export function applyIASToEngines(cfg: IASConfig) {
  // 1. Atualiza threshold do DOMMO em runtime (decimal 0..1)
  const threshold = Math.min(0.999, Math.max(0.5, cfg.score_minimo / 100));
  (DOMMO_CONFIG as any).CONFIDENCE_THRESHOLD = threshold;
  (DOMMO_CONFIG as any).PRECISAO_META = cfg.precisao_meta;
  (DOMMO_CONFIG as any).ASSERTIVIDADE_META = cfg.assertividade_meta;
  (DOMMO_CONFIG as any).DOMINANCIA_META = cfg.dominancia_meta;
  (DOMMO_CONFIG as any).CICLOS_EVO = cfg.ciclos_evolucao;
  (DOMMO_CONFIG as any).IAS_LEVEL = cfg.level;

  // 2. Persiste localmente (espelho)
  try { localStorage.setItem('dommo_runtime_overrides', JSON.stringify({
    CONFIDENCE_THRESHOLD: threshold,
    PRECISAO_META: cfg.precisao_meta,
    ASSERTIVIDADE_META: cfg.assertividade_meta,
    DOMINANCIA_META: cfg.dominancia_meta,
    CICLOS_EVO: cfg.ciclos_evolucao,
    IAS_LEVEL: cfg.level,
  })); } catch {}

  // 3. Atualiza gate_config no banco (não bloqueia a UI)
  syncGateConfig(cfg).catch(err => console.warn('[iasSync] gate_config falhou:', err));
}

async function syncGateConfig(cfg: IASConfig) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const min_confidence = Math.min(99.99, Math.max(50, cfg.score_minimo));
  const { data: existing } = await supabase
    .from('gate_config')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing?.id) {
    await supabase.from('gate_config')
      .update({ min_confidence, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('gate_config').insert({
      user_id: user.id,
      min_confidence,
      auto_approve: true,
      notify_on_gate: true,
    });
  }
}

let _started = false;
export function startIASListener() {
  if (_started) return;
  _started = true;
  // Aplica no boot
  try { applyIASToEngines(getIASConfig()); } catch {}
  // Escuta mudanças
  window.addEventListener('ias:config-changed', (e: any) => {
    if (e?.detail) applyIASToEngines(e.detail as IASConfig);
  });
  // Escuta storage cross-tab
  window.addEventListener('storage', (e) => {
    if (e.key === 'ias_config_v1' && e.newValue) {
      try { applyIASToEngines(JSON.parse(e.newValue)); } catch {}
    }
  });
}
