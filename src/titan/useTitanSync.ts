// Realtime cross-device sync — assina canal "titan-sync" e invalida query keys.
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SyncStatus = "connected" | "connecting" | "failed";

export function useTitanSync() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const backoffRef = useRef(1000);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const invalidateAll = () => {
      qc.invalidateQueries({ queryKey: ["apostas-confirmadas"] });
      qc.invalidateQueries({ queryKey: ["financeiro-premiacoes"] });
      qc.invalidateQueries({ queryKey: ["bets"] });
      qc.invalidateQueries({ queryKey: ["gate-history"] });
    };

    const connect = () => {
      if (stopped) return;
      setStatus("connecting");
      channel = supabase.channel("titan-sync")
        .on("broadcast", { event: "*" }, () => {
          setLastEventAt(Date.now());
          invalidateAll();
        })
        .on("postgres_changes",
          { event: "*", schema: "public", table: "apostas_confirmadas" },
          () => { setLastEventAt(Date.now()); invalidateAll(); }
        )
        .subscribe((s) => {
          if (s === "SUBSCRIBED") {
            setStatus("connected");
            backoffRef.current = 1000;
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
            setStatus("failed");
            const wait = Math.min(30_000, backoffRef.current);
            backoffRef.current = Math.min(30_000, backoffRef.current * 2);
            retryTimer = setTimeout(() => {
              if (channel) supabase.removeChannel(channel);
              connect();
            }, wait);
          }
        });
    };

    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);

  return { status, lastEventAt };
}
