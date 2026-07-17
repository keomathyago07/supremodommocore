// Exporta resultados de backtest para CSV
import type { BacktestResult, BacktestRoundDetail } from "@/titan/engines/backtest";

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function download(name: string, content: string, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob(["\uFEFF" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportBacktestSummaryCsv(results: BacktestResult[]) {
  const header = [
    "Loteria", "IA", "Algoritmo", "Amostras", "Acertos", "HitRate%",
    "Precisao%", "ROI%", "Brier", "CI_low%", "CI_high%", "Risco", "Garantia",
  ];
  const rows = results.map(r => [
    r.loteria, r.iaEngine, r.algoritmo, r.amostras, r.acertosTotal,
    r.hitRate, r.precisao, r.roiSimulado, r.brierScore,
    r.ci.low, r.ci.high, r.risk, r.garantia,
  ].map(csvEscape).join(","));
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  download(`titan-backtest-${ts}.csv`, [header.join(","), ...rows].join("\n"));
}

export function exportBacktestRoundsCsv(result: BacktestResult) {
  if (!result.rounds?.length) return;
  const header = ["Concurso", "Data", "Sorteados", "Previstos", "Acertos", "Premio", "Confianca"];
  const rows = result.rounds.map((r: BacktestRoundDetail) => [
    r.concurso, r.data, r.sorteados.join("-"), r.previstos.join("-"),
    r.acertos, r.premio, r.confidence.toFixed(3),
  ].map(csvEscape).join(","));
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  download(`titan-drilldown-${result.loteria}-${result.algoritmo}-${ts}.csv`,
    [header.join(","), ...rows].join("\n"));
}
