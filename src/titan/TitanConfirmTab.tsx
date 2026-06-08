// ============================================================
// TitanConfirmTab.tsx
// Botão de confirmação de aposta + auto-conferência
// + Histórico de CONFIRMADOS (BRT, filtros, export CSV/PDF)
// ============================================================
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  persistConfirmedBet,
  fetchLatestResult,
  saveResultCheck,
  backendLotteryKey,
} from "@/lib/betsCloud";
import { TitanEvents } from "./TitanBridge";
import { useTitanCore } from "./titanCoreStore";

const LOTTERIES = [
  { id: "mega", label: "Mega-Sena", size: 6, max: 60 },
  { id: "quina", label: "Quina", size: 5, max: 80 },
  { id: "lotofacil", label: "Lotofácil", size: 15, max: 25 },
  { id: "lotomania", label: "Lotomania", size: 50, max: 100 },
  { id: "timemania", label: "Timemania", size: 10, max: 80 },
  { id: "duplasena", label: "Dupla-Sena", size: 6, max: 50 },
  { id: "diasorte", label: "Dia de Sorte", size: 7, max: 31 },
  { id: "supersete", label: "Super Sete", size: 7, max: 9 },
  { id: "milionaria", label: "+Milionária", size: 6, max: 50 },
];

const BRT = "America/Sao_Paulo";
function fmtBRT(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: BRT, hour12: false });
  } catch { return iso ?? "—"; }
}

type Bet = {
  id: string;
  lottery: string;
  concurso: number | null;
  numbers: number[];
  confidence: number | null;
  status: string | null;
  confirmed_at: string | null;
  checked_at: string | null;
  hits: number | null;
  prize_amount: number | null;
  draw_numbers: number[] | null;
};

export function TitanConfirmTab() {
  const titan = useTitanCore();
  const [lotteryId, setLotteryId] = useState("mega");
  const [numbersTxt, setNumbersTxt] = useState("");
  const [concurso, setConcurso] = useState<string>("");
  const [confidence, setConfidence] = useState<string>("85");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{type:"ok"|"err"; text:string}|null>(null);

  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const loadBets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bets")
      .select("id,lottery,concurso,numbers,confidence,status,confirmed_at,checked_at,hits,prize_amount,draw_numbers")
      .order("confirmed_at", { ascending: false })
      .limit(500);
    setBets((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadBets(); }, [loadBets]);

  // ===== AUTO-CONFERÊNCIA — polling a cada 60s =====
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const pendentes = bets.filter(b => (b.status === "confirmed" || b.status === "pending") && !b.checked_at);
      if (!pendentes.length) return;
      for (const b of pendentes) {
        const result = await fetchLatestResult(b.lottery);
        if (!result) continue;
        if (b.concurso && b.concurso !== result.concurso) continue;
        const hits = b.numbers.filter(n => result.dezenas.includes(n)).length;
        await saveResultCheck({
          lotteryId: b.lottery,
          concurso: result.concurso,
          betNumbers: b.numbers,
          drawNumbers: result.dezenas,
          hits,
          prizeTier: null,
          prizeValue: 0,
        });
        TitanEvents.reportCheckComplete({
          lotteryId: b.lottery, acertos: hits, tierId: null, tierDesc: null, prizeEstimate: 0,
        });
      }
      if (alive) loadBets();
    };
    const iv = setInterval(tick, 60_000);
    tick();
    return () => { alive = false; clearInterval(iv); };
  }, [bets, loadBets]);

  const onConfirm = async () => {
    setMsg(null);
    const nums = numbersTxt.split(/[\s,.\-]+/).map(s=>parseInt(s,10)).filter(n=>!isNaN(n));
    const meta = LOTTERIES.find(l=>l.id===lotteryId)!;
    if (nums.length !== meta.size) {
      setMsg({type:"err", text:`Informe ${meta.size} números para ${meta.label}.`}); return;
    }
    if (nums.some(n=>n<1 || n>meta.max)) {
      setMsg({type:"err", text:`Números devem estar entre 1 e ${meta.max}.`}); return;
    }
    setSubmitting(true);
    const conf = Math.max(0, Math.min(100, parseFloat(confidence) || 0));
    const res = await persistConfirmedBet({
      lotteryId,
      numbers: nums.sort((a,b)=>a-b),
      confidence: conf,
      concurso: concurso ? parseInt(concurso,10) : undefined,
    });
    setSubmitting(false);
    if (!res.ok) {
      setMsg({type:"err", text:`Falha: ${res.error}`});
      titan.log("error", `❌ Confirmação falhou: ${res.error}`);
      return;
    }
    setMsg({type:"ok", text:`✅ Aposta registrada (id ${res.betId?.slice(0,8)}…). Conferência automática ativa.`});
    titan.log("success", `🎟️ Aposta confirmada — ${meta.label} [${nums.join(",")}]`);
    TitanEvents.reportBetConfirmed(lotteryId, concurso || "next", nums);
    setNumbersTxt("");
    loadBets();
  };

  const filtered = useMemo(
    () => filter === "all" ? bets : bets.filter(b => b.lottery === backendLotteryKey(filter)),
    [bets, filter]
  );

  const exportCSV = () => {
    const head = ["data_brt","loteria","concurso","numeros","confianca","status","acertos","premio","conferido_em","sorteados"];
    const rows = filtered.map(b => [
      fmtBRT(b.confirmed_at),
      b.lottery,
      b.concurso ?? "",
      (b.numbers||[]).join(" "),
      b.confidence ?? "",
      b.status ?? "",
      b.hits ?? "",
      b.prize_amount ?? "",
      fmtBRT(b.checked_at),
      (b.draw_numbers||[]).join(" "),
    ]);
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `confirmados_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rowsHtml = filtered.map(b => `
      <tr>
        <td>${fmtBRT(b.confirmed_at)}</td>
        <td>${b.lottery}</td>
        <td style="text-align:center">${b.concurso ?? "—"}</td>
        <td>${(b.numbers||[]).join(", ")}</td>
        <td style="text-align:center">${b.confidence ?? "—"}</td>
        <td style="text-align:center">${b.status ?? "—"}</td>
        <td style="text-align:center">${b.hits ?? "—"}</td>
        <td style="text-align:right">${b.prize_amount ? `R$ ${Number(b.prize_amount).toLocaleString("pt-BR")}` : "—"}</td>
      </tr>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/>
      <title>Histórico CONFIRMADOS — ${new Date().toLocaleString("pt-BR",{timeZone:BRT})}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px}
        .sub{color:#555;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #ddd;padding:6px}
        th{background:#0f172a;color:#fff;text-align:left}
        tr:nth-child(even){background:#f7f7f9}
      </style></head><body>
      <h1>Histórico — Apostas CONFIRMADAS</h1>
      <div class="sub">Fuso de Brasília (BRT) · Filtro: ${filter==="all"?"Todas":filter} · ${filtered.length} registros</div>
      <table><thead><tr>
        <th>Data (BRT)</th><th>Loteria</th><th>Concurso</th><th>Números</th>
        <th>Confiança</th><th>Status</th><th>Acertos</th><th>Prêmio</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* CONFIRMAÇÃO */}
      <div style={{padding:14,borderRadius:10,background:"rgba(0,212,255,0.04)",border:"1px solid rgba(0,212,255,0.2)"}}>
        <div style={{fontSize:11,fontWeight:800,color:"#00d4ff",marginBottom:10,letterSpacing:.5,textTransform:"uppercase"}}>
          🎟️ Confirmar Aposta · auto-conferência ativada
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 0.8fr 0.8fr 2.4fr auto",gap:8,alignItems:"end"}}>
          <Field label="Loteria">
            <select value={lotteryId} onChange={e=>setLotteryId(e.target.value)} style={selStyle}>
              {LOTTERIES.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="Concurso (opc.)">
            <input value={concurso} onChange={e=>setConcurso(e.target.value)} placeholder="auto" style={inpStyle}/>
          </Field>
          <Field label="Confiança %">
            <input value={confidence} onChange={e=>setConfidence(e.target.value)} style={inpStyle}/>
          </Field>
          <Field label={`Números (${LOTTERIES.find(l=>l.id===lotteryId)?.size} dezenas)`}>
            <input value={numbersTxt} onChange={e=>setNumbersTxt(e.target.value)}
              placeholder="ex: 05 12 23 34 45 56" style={inpStyle}/>
          </Field>
          <button onClick={onConfirm} disabled={submitting} style={{
            padding:"9px 14px",borderRadius:8,border:"1px solid rgba(0,255,136,0.4)",cursor:submitting?"wait":"pointer",
            background:"linear-gradient(135deg,rgba(0,255,136,0.18),rgba(0,212,255,0.18))",color:"#00ff88",
            fontWeight:800,fontSize:10,fontFamily:"inherit",whiteSpace:"nowrap",
          }}>{submitting?"Confirmando…":"✅ CONFIRMAR"}</button>
        </div>
        {msg && (
          <div style={{marginTop:8,fontSize:10,fontWeight:700,color:msg.type==="ok"?"#00ff88":"#ff6b6b"}}>{msg.text}</div>
        )}
      </div>

      {/* HISTÓRICO */}
      <div style={{padding:14,borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}}>
          <div style={{fontSize:11,fontWeight:800,color:"#ffaa00",letterSpacing:.5,textTransform:"uppercase"}}>
            📜 Histórico CONFIRMADOS · BRT
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <select value={filter} onChange={e=>setFilter(e.target.value)} style={{...selStyle, minWidth:140}}>
              <option value="all">Todas as loterias</option>
              {LOTTERIES.map(l=><option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
            <button onClick={loadBets} style={btnSec}>🔄 Atualizar</button>
            <button onClick={exportCSV} style={btnSec}>⬇ CSV</button>
            <button onClick={exportPDF} style={btnSec}>📄 PDF</button>
          </div>
        </div>
        <div style={{maxHeight:380,overflow:"auto",borderRadius:8,border:"1px solid rgba(255,255,255,0.04)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead style={{position:"sticky",top:0,background:"rgba(0,0,0,0.6)"}}>
              <tr>
                {["Data (BRT)","Loteria","Conc.","Números","Conf.","Status","Acertos","Prêmio","Conferido"].map(h=>(
                  <th key={h} style={{padding:"7px 8px",textAlign:"left",color:"#94a3b8",fontWeight:700,borderBottom:"1px solid rgba(255,255,255,0.06)"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} style={{padding:14,textAlign:"center",color:"#475569"}}>carregando…</td></tr>}
              {!loading && filtered.length===0 && <tr><td colSpan={9} style={{padding:14,textAlign:"center",color:"#475569"}}>Nenhum registro.</td></tr>}
              {filtered.map(b => (
                <tr key={b.id} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                  <td style={td}>{fmtBRT(b.confirmed_at)}</td>
                  <td style={td}>{b.lottery}</td>
                  <td style={{...td,textAlign:"center"}}>{b.concurso ?? "—"}</td>
                  <td style={{...td,color:"#00d4ff",fontWeight:700}}>{(b.numbers||[]).join(" ")}</td>
                  <td style={{...td,textAlign:"center"}}>{b.confidence ?? "—"}</td>
                  <td style={{...td,textAlign:"center",color: b.status==="won" ? "#00ff88" : b.status==="checked" ? "#94a3b8" : "#ffaa00"}}>{b.status ?? "—"}</td>
                  <td style={{...td,textAlign:"center",fontWeight:700,color:(b.hits??0)>0?"#00ff88":"#475569"}}>{b.hits ?? "—"}</td>
                  <td style={{...td,textAlign:"right",color:"#00ff88"}}>{b.prize_amount ? `R$ ${Number(b.prize_amount).toLocaleString("pt-BR")}` : "—"}</td>
                  <td style={td}>{fmtBRT(b.checked_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{marginTop:6,fontSize:9,color:"#475569"}}>
          Auto-conferência consulta <code>resultados_sorteios</code> a cada 60s e grava em <code>result_checks</code>.
        </div>
      </div>
    </div>
  );
}

const inpStyle: React.CSSProperties = {
  width:"100%",padding:"7px 9px",borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",
  background:"rgba(0,0,0,0.4)",color:"#e2e8f0",fontSize:10,fontFamily:"inherit",
};
const selStyle: React.CSSProperties = { ...inpStyle, cursor:"pointer" };
const btnSec: React.CSSProperties = {
  padding:"6px 10px",borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",
  background:"rgba(255,255,255,0.04)",color:"#94a3b8",fontSize:10,fontWeight:700,
  cursor:"pointer",fontFamily:"inherit",
};
const td: React.CSSProperties = { padding:"6px 8px",color:"#cbd5e1",whiteSpace:"nowrap" };

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return (
    <label style={{display:"flex",flexDirection:"column",gap:3}}>
      <span style={{fontSize:8,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{label}</span>
      {children}
    </label>
  );
}
