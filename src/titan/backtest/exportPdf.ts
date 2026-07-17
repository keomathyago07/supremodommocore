// Exporta resultados de backtest para PDF (jsPDF + autotable)
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { BacktestResult } from "@/titan/engines/backtest";

const BRT = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export function exportBacktestSummaryPdf(results: BacktestResult[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("TITAN — Relatório de Backtest", 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Gerado: ${BRT(new Date())} (BRT)`, 40, 56);
  doc.text(`Total de execuções: ${results.length}`, 40, 68);

  autoTable(doc, {
    startY: 84,
    head: [["Loteria", "IA", "Algoritmo", "Amostras", "HitRate%", "Precisão%", "ROI%", "Brier", "CI 95%", "Risco", "Garantia"]],
    body: results.map(r => [
      r.loteria, r.iaEngine, r.algoritmo, r.amostras,
      `${r.hitRate}%`, `${r.precisao}%`, `${r.roiSimulado}%`,
      r.brierScore.toFixed(3), `${r.ci.low}–${r.ci.high}%`, r.risk, r.garantia,
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [0, 30, 50], textColor: [0, 212, 255] },
    alternateRowStyles: { fillColor: [245, 250, 255] },
  });

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  doc.save(`titan-backtest-${ts}.pdf`);
}

export function exportBacktestDrillPdf(result: BacktestResult) {
  if (!result.rounds?.length) return;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(`TITAN — Drill-Down: ${result.loteria} · ${result.algoritmo}`, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `IA: ${result.iaEngine} · Amostras: ${result.amostras} · HitRate: ${result.hitRate}% · ROI: ${result.roiSimulado}%`,
    40, 56,
  );
  doc.text(`Gerado: ${BRT(new Date())} (BRT)`, 40, 68);

  autoTable(doc, {
    startY: 84,
    head: [["Concurso", "Data", "Sorteados", "Previstos", "Acertos", "Prêmio (R$)", "Conf."]],
    body: result.rounds.map(r => [
      r.concurso, r.data, r.sorteados.join(" "), r.previstos.join(" "),
      r.acertos, r.premio.toLocaleString("pt-BR"), r.confidence.toFixed(2),
    ]),
    styles: { fontSize: 7, cellPadding: 3 },
    headStyles: { fillColor: [30, 0, 50], textColor: [170, 100, 255] },
  });

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  doc.save(`titan-drilldown-${result.loteria}-${result.algoritmo}-${ts}.pdf`);
}
