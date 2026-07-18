// Badge de calibração para o módulo Candidatos+XAI:
// exibe faixa CI95/CI99 e classificação de risco/garantia
import { wilson95, wilson99 } from "@/titan/calibration/intervals";

export interface CandidateCalib {
  numero: number;
  pBase: number;      // probabilidade bruta do modelo
  pCalibrated: number; // após calibração
  n: number;          // amostras suportando
}

export function CandidatesCalibrationBadge({ c }: { c: CandidateCalib }) {
  const ci95 = wilson95(c.pCalibrated, c.n);
  const ci99 = wilson99(c.pCalibrated, c.n);
  const risk = c.pCalibrated >= 0.65 ? "low" : c.pCalibrated >= 0.4 ? "medium" : "high";
  const garantia = ci95.low >= 0.5 ? "alta" : ci95.low >= 0.3 ? "media" : "baixa";
  const rc = { low: "#00ff88", medium: "#ffaa00", high: "#ff6b6b" }[risk];
  const gc = { alta: "#00ff88", media: "#ffaa00", baixa: "#ff6b6b" }[garantia];

  return (
    <div style={{ padding: 6, borderRadius: 6, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(0,212,255,0.15)", fontSize: 9 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <b style={{ color: "#00d4ff" }}>#{c.numero}</b>
        <span style={{ color: "#94a3b8" }}>p={c.pCalibrated.toFixed(3)}</span>
      </div>
      <div style={{ position: "relative", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, marginBottom: 3 }}>
        <div style={{ position: "absolute", left: `${ci99.low * 100}%`, width: `${(ci99.high - ci99.low) * 100}%`, height: "100%", background: "rgba(0,212,255,0.15)", borderRadius: 3 }} />
        <div style={{ position: "absolute", left: `${ci95.low * 100}%`, width: `${(ci95.high - ci95.low) * 100}%`, height: "100%", background: "rgba(0,212,255,0.4)", borderRadius: 3 }} />
        <div style={{ position: "absolute", left: `${c.pCalibrated * 100}%`, width: 2, height: "100%", background: "#fff" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: 8 }}>
        <span>95: {(ci95.low * 100).toFixed(0)}–{(ci95.high * 100).toFixed(0)}%</span>
        <span>99: {(ci99.low * 100).toFixed(0)}–{(ci99.high * 100).toFixed(0)}%</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        <span style={{ padding: "1px 6px", borderRadius: 8, background: rc + "22", color: rc, border: `1px solid ${rc}55`, fontWeight: 700 }}>risco {risk}</span>
        <span style={{ padding: "1px 6px", borderRadius: 8, background: gc + "22", color: gc, border: `1px solid ${gc}55`, fontWeight: 700 }}>garantia {garantia}</span>
      </div>
    </div>
  );
}

export function rankCandidatesByGuarantee(list: CandidateCalib[]): CandidateCalib[] {
  return [...list].sort((a, b) => {
    const la = wilson95(a.pCalibrated, a.n).low;
    const lb = wilson95(b.pCalibrated, b.n).low;
    return lb - la;
  });
}
