// ============================================================
// TitanBacktestTab.tsx — Backtest Ultra-Avançado dos algoritmos
// Métricas por loteria/IA, calibração de confiança, ROI, ranking
// de risco/garantia, persistência e comparação entre execuções.
// ============================================================

import { useEffect, useState } from "react";
import {
  runBacktest, saveBacktestRun, loadBacktestHistory,
  rankResults, LOTERIA_CONFIG, PREDICTORS,
  type BacktestResult, type LoteriaKey,
} from "./engines/backtest";

const LOTERIAS = Object.keys(LOTERIA_CONFIG) as LoteriaKey[];
const PREDICTOR_KEYS = Object.keys(PREDICTORS) as (keyof typeof PREDICTORS)[];

const IA_PRESETS = [
  { id: "Titan-Ensemble-Quantum", weight: 1.0 },
  { id: "Titan-PatchTST-V2",      weight: 0.9 },
  { id: "Titan-Mamba-SSM",        weight: 0.85 },
  { id: "Titan-MetaLearner",      weight: 0.95 },
];

export function TitanBacktestTab() {
  const [windowSize, setWindowSize] = useState(20);
  const [maxSamples, setMaxSamples] = useState(300);
  const [selectedLot, setSelectedLot] = useState<LoteriaKey[]>(["megasena", "lotofacil", "quina"]);
  const [selectedAlg, setSelectedAlg] = useState<(keyof typeof PREDICTORS)[]>(["ensemble", "frequency", "delay"]);
  const [selectedIA, setSelectedIA] = useState<string>("Titan-Ensemble-Quantum");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoSave, setAutoSave] = useState(true);

  useEffect(() => { refreshHistory(); }, []);

  async function refreshHistory() {
    try { setHistory(await loadBacktestHistory()); } catch (e: any) { /* silencioso */ }
  }

  async function handleRun() {
    setRunning(true); setError(null); setProgress(0);
    const all: BacktestResult[] = [];
    const total = selectedLot.length * selectedAlg.length;
    let done = 0;
    try {
      for (const lot of selectedLot) {
        for (const alg of selectedAlg) {
          const r = await runBacktest({
            loteria: lot, predictor: alg, iaEngine: selectedIA,
            windowSize, maxSamples,
          });
          all.push(r);
          if (autoSave && r.amostras > 0) {
            try { await saveBacktestRun(r, `Auto-save · ${selectedIA}`); } catch {}
          }
          done++; setProgress(Math.round((done / total) * 100));
          setResults([...all]);
        }
      }
      await refreshHistory();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRunning(false);
    }
  }

  const ranked = rankResults(results);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Box c="#00d4ff" title="🧪 Configuração Backtest Ultra-Avançado">
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:10}}>
          <Field label="IA / Engine">
            <select value={selectedIA} onChange={e=>setSelectedIA(e.target.value)} style={selStyle}>
              {IA_PRESETS.map(i => <option key={i.id} value={i.id}>{i.id}</option>)}
            </select>
          </Field>
          <Field label={`Janela histórica (${windowSize})`}>
            <input type="range" min={10} max={100} value={windowSize}
              onChange={e=>setWindowSize(Number(e.target.value))} style={{width:"100%"}}/>
          </Field>
          <Field label={`Máx. amostras (${maxSamples})`}>
            <input type="range" min={50} max={1000} step={50} value={maxSamples}
              onChange={e=>setMaxSamples(Number(e.target.value))} style={{width:"100%"}}/>
          </Field>
        </div>

        <Field label="Loterias">
          <div style={chipsRow}>
            {LOTERIAS.map(l => (
              <Chip key={l} active={selectedLot.includes(l)} onClick={()=>{
                setSelectedLot(s => s.includes(l) ? s.filter(x=>x!==l) : [...s,l]);
              }}>{l}</Chip>
            ))}
          </div>
        </Field>

        <Field label="Algoritmos">
          <div style={chipsRow}>
            {PREDICTOR_KEYS.map(a => (
              <Chip key={a} active={selectedAlg.includes(a)} onClick={()=>{
                setSelectedAlg(s => s.includes(a) ? s.filter(x=>x!==a) : [...s,a]);
              }}>{a}</Chip>
            ))}
          </div>
        </Field>

        <div style={{display:"flex",gap:10,alignItems:"center",marginTop:10}}>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:10,color:"#94a3b8"}}>
            <input type="checkbox" checked={autoSave} onChange={e=>setAutoSave(e.target.checked)}/>
            Auto-salvar no banco
          </label>
          <button onClick={handleRun} disabled={running || !selectedLot.length || !selectedAlg.length}
            style={{
              padding:"8px 16px",borderRadius:8,border:"1px solid rgba(0,212,255,0.4)",
              cursor:running?"wait":"pointer",fontSize:11,fontWeight:800,
              background:"linear-gradient(135deg,rgba(0,212,255,0.2),rgba(170,0,255,0.2))",
              color:"#00d4ff",fontFamily:"inherit",
            }}>
            {running ? `▶ Executando... ${progress}%` : `▶ Executar Backtest (${selectedLot.length * selectedAlg.length} combinações)`}
          </button>
          <button onClick={refreshHistory} style={btnSec}>↻ Histórico</button>
        </div>
        {error && <div style={{marginTop:8,color:"#ff6b6b",fontSize:10}}>⚠ {error}</div>}
      </Box>

      {ranked.length > 0 && (
        <Box c="#00ff88" title="🏆 Ranking — Risco / Garantia">
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
            <thead>
              <tr style={{color:"#475569",textAlign:"left"}}>
                <th style={th}>#</th><th style={th}>Loteria</th><th style={th}>Algoritmo</th>
                <th style={th}>Score</th><th style={th}>Hit%</th><th style={th}>Precisão</th>
                <th style={th}>ROI</th><th style={th}>Brier</th>
                <th style={th}>CI 95%</th><th style={th}>Risco</th><th style={th}>Garantia</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r:any,i)=>(
                <tr key={i} style={{borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                  <td style={td}>{i+1}</td>
                  <td style={td}>{r.loteria}</td>
                  <td style={td}>{r.algoritmo}</td>
                  <td style={{...td,color:"#00d4ff",fontWeight:800}}>{r.score}</td>
                  <td style={td}>{r.hitRate}%</td>
                  <td style={td}>{r.precisao}%</td>
                  <td style={{...td,color:r.roiSimulado>=0?"#00ff88":"#ff6b6b"}}>{r.roiSimulado}%</td>
                  <td style={td}>{r.brierScore}</td>
                  <td style={td}>{r.ci.low}–{r.ci.high}%</td>
                  <td style={td}><Pill v={r.risk} colors={{low:"#00ff88",medium:"#ffaa00",high:"#ff6b6b"}}/></td>
                  <td style={td}><Pill v={r.garantia} colors={{alta:"#00ff88",media:"#ffaa00",baixa:"#ff6b6b"}}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      {ranked.length > 0 && (
        <Box c="#aa00ff" title="📊 Calibração de Confiança (reliability)">
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
            {ranked.slice(0,6).map((r:any,i)=>(
              <div key={i} style={{padding:8,borderRadius:8,background:"rgba(0,0,0,0.25)",border:"1px solid rgba(170,0,255,0.18)"}}>
                <div style={{fontSize:9,color:"#94a3b8",marginBottom:6,fontWeight:700}}>
                  {r.loteria} · {r.algoritmo}
                </div>
                <div style={{display:"flex",gap:2,alignItems:"flex-end",height:60}}>
                  {r.calibracao.bins.map((b:any,bi:number)=>(
                    <div key={bi} title={`p=${b.p.toFixed(2)} obs=${b.observado.toFixed(2)} n=${b.n}`}
                      style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:1}}>
                      <div style={{height:`${b.observado*100}%`,background:"#00ff88",borderRadius:1}}/>
                      <div style={{height:`${b.p*100}%`,background:"#00d4ff",opacity:0.4,borderRadius:1}}/>
                    </div>
                  ))}
                </div>
                <div style={{fontSize:8,color:"#475569",marginTop:4,display:"flex",justifyContent:"space-between"}}>
                  <span>■ observado</span><span>■ previsto</span>
                </div>
              </div>
            ))}
          </div>
        </Box>
      )}

      <Box c="#ffaa00" title={`💾 Histórico de Execuções (${history.length})`}>
        {history.length === 0 ? (
          <div style={{fontSize:10,color:"#475569"}}>Nenhuma execução salva ainda.</div>
        ) : (
          <div style={{maxHeight:280,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:9}}>
              <thead><tr style={{color:"#475569",textAlign:"left"}}>
                <th style={th}>Data</th><th style={th}>Loteria</th><th style={th}>IA</th>
                <th style={th}>Algo</th><th style={th}>Hit%</th><th style={th}>Prec</th>
                <th style={th}>ROI</th><th style={th}>Brier</th><th style={th}>Risco</th>
              </tr></thead>
              <tbody>
                {history.map((h:any)=>(
                  <tr key={h.id} style={{borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                    <td style={td}>{new Date(h.created_at).toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</td>
                    <td style={td}>{h.loteria}</td>
                    <td style={td}>{h.ia_engine}</td>
                    <td style={td}>{h.algoritmo}</td>
                    <td style={td}>{Number(h.hit_rate).toFixed(2)}%</td>
                    <td style={td}>{Number(h.precisao).toFixed(2)}%</td>
                    <td style={{...td,color:Number(h.roi_simulado)>=0?"#00ff88":"#ff6b6b"}}>{Number(h.roi_simulado).toFixed(2)}%</td>
                    <td style={td}>{Number(h.brier_score).toFixed(3)}</td>
                    <td style={td}><Pill v={h.risk_level} colors={{low:"#00ff88",medium:"#ffaa00",high:"#ff6b6b"}}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Box>
    </div>
  );
}

const th: React.CSSProperties = { padding:"6px 4px", fontSize:9, fontWeight:700 };
const td: React.CSSProperties = { padding:"6px 4px", fontSize:10, color:"#cbd5e1" };
const selStyle: React.CSSProperties = {
  width:"100%",padding:"6px 8px",borderRadius:6,fontSize:10,
  background:"rgba(0,0,0,0.4)",color:"#e2e8f0",
  border:"1px solid rgba(255,255,255,0.08)",fontFamily:"inherit",
};
const btnSec: React.CSSProperties = {
  padding:"8px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",
  background:"rgba(255,255,255,0.04)",color:"#94a3b8",fontSize:10,fontWeight:700,
  cursor:"pointer",fontFamily:"inherit",
};
const chipsRow: React.CSSProperties = { display:"flex",flexWrap:"wrap",gap:5 };

function Field({label,children}:{label:string;children:React.ReactNode}) {
  return (
    <div>
      <div style={{fontSize:9,color:"#475569",marginBottom:4,fontWeight:700,textTransform:"uppercase"}}>{label}</div>
      {children}
    </div>
  );
}
function Chip({children,active,onClick}:{children:React.ReactNode;active:boolean;onClick:()=>void}) {
  return (
    <button onClick={onClick} style={{
      padding:"4px 10px",borderRadius:14,fontSize:9,fontWeight:700,cursor:"pointer",
      border:`1px solid ${active?"rgba(0,212,255,0.5)":"rgba(255,255,255,0.08)"}`,
      background:active?"rgba(0,212,255,0.15)":"rgba(255,255,255,0.03)",
      color:active?"#00d4ff":"#64748b",fontFamily:"inherit",
    }}>{children}</button>
  );
}
function Pill({v,colors}:{v:string;colors:Record<string,string>}) {
  const c = colors[v] ?? "#94a3b8";
  return <span style={{padding:"2px 8px",borderRadius:10,fontSize:9,fontWeight:700,background:c+"22",color:c,border:`1px solid ${c}55`}}>{v}</span>;
}
function Box({title,c,children}:{title:string;c:string;children:React.ReactNode}) {
  return (
    <div style={{padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:`1px solid ${c}28`}}>
      <div style={{fontSize:10,fontWeight:700,color:c,marginBottom:8,textTransform:"uppercase",letterSpacing:.5}}>{title}</div>
      {children}
    </div>
  );
}
