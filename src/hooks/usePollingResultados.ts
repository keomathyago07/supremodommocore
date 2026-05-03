// DOMMO CORE v18 — Polling de resultados ativo entre 21h e 23h BRT
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

function horaBRT(): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hour12: false,
  });
  return parseInt(fmt.format(new Date()), 10);
}

/**
 * A cada 5 minutos entre 21h e 23h59 BRT, dispara a edge function
 * `sync-e-confere` para buscar resultados e gerar alertas críticos
 * de TODAS as 9 loterias com sorteio no dia.
 */
export function usePollingResultados(intervalMs = 5 * 60 * 1000) {
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const tick = async () => {
      const h = horaBRT();
      if (h < 21 || h > 23) return;
      try {
        await supabase.functions.invoke("sync-e-confere", { body: {} });
      } catch (e) {
        console.warn("[polling] sync-e-confere falhou", e);
      }
    };
    tick();
    ref.current = window.setInterval(tick, intervalMs);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
    };
  }, [intervalMs]);
}
