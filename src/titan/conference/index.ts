// Conferência Inteligente — orquestrador por modalidade.
// Só executa quando resultado.status === "OFICIAL" e dentro da janela BRT.
import { Bet, CheckOutcome, LotteryId, OfficialResult } from "./types";
import { conferirPadrao } from "./padrao";
import { conferirLotomania } from "./lotomania";
import { conferirSuperSete } from "./superSete";
import { conferirDiaSorte } from "./diaSorte";
import { conferirMaisMilionaria } from "./maisMilionaria";
import { conferirDuplaSena } from "./duplaSena";
import { conferirTimemania } from "./timemania";

export * from "./types";

function nowBRT(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
}

/**
 * Janela oficial de conferência:
 *  - Seg–Sex após 21:00 BRT
 *  - Sábado após 21:00 BRT (não bloqueia sábado com sorteios próprios)
 *  - Domingo a partir de 11:00 BRT (concursos transferidos)
 */
export function dentroDaJanelaOficial(d = nowBRT()): boolean {
  const dow = d.getDay(); // 0=Dom .. 6=Sáb
  const h = d.getHours();
  const m = d.getMinutes();
  const decimal = h + m / 60;
  if (dow === 0) return decimal >= 11;
  return decimal >= 21;
}

export function statusAguardando(): CheckOutcome {
  return {
    status: "AGUARDANDO_OFICIAL",
    faixa: null, acertos: 0, prizeEstimate: 0,
    detalhe: { motivo: "Resultado oficial ainda não disponível" },
  };
}

const DISPATCH: Record<LotteryId, (b: Bet, r: OfficialResult) => CheckOutcome> = {
  megasena: conferirPadrao,
  quina: conferirPadrao,
  lotofacil: conferirPadrao,
  lotomania: conferirLotomania,
  supersete: conferirSuperSete,
  diadesorte: conferirDiaSorte,
  maismilionaria: conferirMaisMilionaria,
  duplasena: conferirDuplaSena,
  timemania: conferirTimemania,
};

/**
 * Conferência com validação total (modalidade + concurso + data + status + janela).
 * Nunca confere concurso diferente. Nunca marca Premiada/Conferida sem resultado oficial.
 */
export function conferirAposta(bet: Bet, r: OfficialResult): CheckOutcome {
  if (bet.lottery !== r.lottery)  return statusAguardando();
  if (bet.concurso !== r.concurso) return statusAguardando();
  if (r.status !== "OFICIAL")      return statusAguardando();
  if (!dentroDaJanelaOficial())    return statusAguardando();

  const fn = DISPATCH[bet.lottery] ?? conferirPadrao;
  return fn(bet, r);
}
