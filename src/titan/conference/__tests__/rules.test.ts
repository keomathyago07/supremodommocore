import { describe, it, expect } from "vitest";
import { conferirPadrao } from "../padrao";
import { conferirLotomania } from "../lotomania";
import { conferirSuperSete } from "../superSete";
import { conferirDiaSorte } from "../diaSorte";
import { conferirMaisMilionaria } from "../maisMilionaria";
import { conferirDuplaSena } from "../duplaSena";
import { conferirTimemania } from "../timemania";
import { dentroDaJanelaOficial } from "../index";
import type { Bet, OfficialResult, LotteryId } from "../types";

function bet(lottery: LotteryId, numeros: number[], extras?: Bet["extras"]): Bet {
  return { id: `b-${lottery}`, lottery, concurso: 1000, numeros, extras };
}
function res(lottery: LotteryId, dezenas: number[], extras?: OfficialResult["extras"]): OfficialResult {
  return { lottery, concurso: 1000, dataApuracao: "2026-08-01", status: "OFICIAL", dezenas, extras };
}

describe("Mega-Sena", () => {
  const sorteio = [1, 2, 3, 4, 5, 6];
  it("Sena com 6 acertos", () => {
    const o = conferirPadrao(bet("megasena", sorteio), res("megasena", sorteio));
    expect(o.acertos).toBe(6);
    expect(o.faixa).toBe("Sena");
    expect(o.status).toBe("PREMIADA");
  });
  it("Quina com 5 acertos", () => {
    const o = conferirPadrao(bet("megasena", [1, 2, 3, 4, 5, 60]), res("megasena", sorteio));
    expect(o.faixa).toBe("Quina");
  });
  it("Quadra com 4 acertos", () => {
    const o = conferirPadrao(bet("megasena", [1, 2, 3, 4, 59, 60]), res("megasena", sorteio));
    expect(o.faixa).toBe("Quadra");
  });
  it("3 acertos não premia", () => {
    const o = conferirPadrao(bet("megasena", [1, 2, 3, 58, 59, 60]), res("megasena", sorteio));
    expect(o.faixa).toBeNull();
    expect(o.status).toBe("CONFERIDA");
  });
});

describe("Quina", () => {
  const sorteio = [10, 20, 30, 40, 50];
  it("Quina", () => expect(conferirPadrao(bet("quina", sorteio), res("quina", sorteio)).faixa).toBe("Quina"));
  it("Quadra", () => expect(conferirPadrao(bet("quina", [10, 20, 30, 40, 51]), res("quina", sorteio)).faixa).toBe("Quadra"));
  it("Terno", () => expect(conferirPadrao(bet("quina", [10, 20, 30, 52, 51]), res("quina", sorteio)).faixa).toBe("Terno"));
  it("Duque", () => expect(conferirPadrao(bet("quina", [10, 20, 53, 52, 51]), res("quina", sorteio)).faixa).toBe("Duque"));
  it("1 acerto não premia", () =>
    expect(conferirPadrao(bet("quina", [10, 54, 53, 52, 51]), res("quina", sorteio)).faixa).toBeNull());
});

describe("Lotofácil", () => {
  const sorteio = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  it("15 acertos", () => expect(conferirPadrao(bet("lotofacil", sorteio), res("lotofacil", sorteio)).faixa).toBe("15 acertos"));
  it("11 acertos", () => {
    const aposta = [...sorteio.slice(0, 11), 21, 22, 23, 24];
    expect(conferirPadrao(bet("lotofacil", aposta), res("lotofacil", sorteio)).faixa).toBe("11 acertos");
  });
  it("10 acertos não premia", () => {
    const aposta = [...sorteio.slice(0, 10), 21, 22, 23, 24, 25];
    expect(conferirPadrao(bet("lotofacil", aposta), res("lotofacil", sorteio)).faixa).toBeNull();
  });
});

describe("Lotomania — conferência dupla", () => {
  const sorteio = Array.from({ length: 20 }, (_, i) => i); // 0..19
  it("20 acertos no principal", () => {
    const aposta = Array.from({ length: 50 }, (_, i) => i); // 0..49 → contém as 20
    const o = conferirLotomania(bet("lotomania", aposta), res("lotomania", sorteio));
    expect(o.acertos).toBe(20);
    expect(o.acertosExtra).toBe(0);
    expect(o.faixa).toContain("Principal 20");
    expect((o.detalhe as any).somaOk).toBe(true);
  });
  it("0 acertos também premia (faixa zero)", () => {
    const aposta = Array.from({ length: 50 }, (_, i) => i + 50); // 50..99
    const o = conferirLotomania(bet("lotomania", aposta), res("lotomania", sorteio));
    expect(o.acertos).toBe(0);
    expect(o.status).toBe("PREMIADA");
  });
  it("premia pelo complementar quando o principal fica fora das faixas", () => {
    // principal com 5 acertos (não premiada) → complementar 15 (premiada)
    const aposta = [...sorteio.slice(0, 5), ...Array.from({ length: 45 }, (_, i) => i + 50)];
    const o = conferirLotomania(bet("lotomania", aposta), res("lotomania", sorteio));
    expect(o.acertos).toBe(5);
    expect(o.acertosExtra).toBe(15);
    expect(o.faixa).toContain("Complementar 15");
    expect(o.status).toBe("PREMIADA");
  });
  it("principal + complementar sempre soma 20", () => {
    const aposta = [...sorteio.slice(0, 8), ...Array.from({ length: 42 }, (_, i) => i + 50)];
    const o = conferirLotomania(bet("lotomania", aposta), res("lotomania", sorteio));
    expect((o.acertos + (o.acertosExtra ?? 0))).toBe(20);
  });
});

describe("Super Sete — posição por coluna", () => {
  const cols = [1, 2, 3, 4, 5, 6, 7];
  it("7 colunas certas", () => {
    const o = conferirSuperSete(
      bet("supersete", [], { colunas: cols }),
      res("supersete", [], { colunas: cols })
    );
    expect(o.acertos).toBe(7);
    expect(o.faixa).toBe("7 colunas");
  });
  it("mesmos números em posições diferentes NÃO conta como acerto", () => {
    const o = conferirSuperSete(
      bet("supersete", [], { colunas: [7, 6, 5, 4, 3, 2, 1] }),
      res("supersete", [], { colunas: cols })
    );
    expect(o.acertos).toBe(1); // apenas a coluna central (4)
  });
  it("3 colunas premia, 2 não", () => {
    const a3 = conferirSuperSete(bet("supersete", [], { colunas: [1, 2, 3, 0, 0, 0, 0] }), res("supersete", [], { colunas: cols }));
    expect(a3.faixa).toBe("3 colunas");
    const a2 = conferirSuperSete(bet("supersete", [], { colunas: [1, 2, 0, 0, 0, 0, 0] }), res("supersete", [], { colunas: cols }));
    expect(a2.faixa).toBeNull();
  });
  it("colunas incompletas retornam erro controlado", () => {
    const o = conferirSuperSete(bet("supersete", [], { colunas: [1, 2] }), res("supersete", [], { colunas: cols }));
    expect(o.status).toBe("CONFERIDA");
    expect((o.detalhe as any).erro).toBe("colunas incompletas");
  });
});

describe("Dia de Sorte — 7 dezenas + Mês da Sorte", () => {
  const sorteio = [1, 2, 3, 4, 5, 6, 7];
  it("7 acertos + mês certo", () => {
    const o = conferirDiaSorte(
      bet("diadesorte", sorteio, { mesSorte: "Março" }),
      res("diadesorte", sorteio, { mesSorte: "março" })
    );
    expect(o.faixa).toBe("7 acertos");
    expect(o.acertosExtra).toBe(1);
  });
  it("4 acertos premia", () => {
    const o = conferirDiaSorte(bet("diadesorte", [1, 2, 3, 4, 20, 21, 22]), res("diadesorte", sorteio));
    expect(o.faixa).toBe("4 acertos");
  });
  it("3 acertos com mês certo premia apenas pelo mês", () => {
    const o = conferirDiaSorte(
      bet("diadesorte", [1, 2, 3, 19, 20, 21, 22], { mesSorte: "Abril" }),
      res("diadesorte", sorteio, { mesSorte: "Abril" })
    );
    expect(o.faixa).toBe("Mês da Sorte");
    expect(o.status).toBe("PREMIADA");
  });
  it("mês errado e poucos acertos não premia", () => {
    const o = conferirDiaSorte(
      bet("diadesorte", [1, 2, 3, 19, 20, 21, 22], { mesSorte: "Maio" }),
      res("diadesorte", sorteio, { mesSorte: "Abril" })
    );
    expect(o.status).toBe("CONFERIDA");
  });
});

describe("+Milionária — 6 dezenas + 2 trevos", () => {
  const sorteio = [1, 2, 3, 4, 5, 6];
  const trevos = [1, 2];
  it("6+2", () => {
    const o = conferirMaisMilionaria(
      bet("maismilionaria", sorteio, { trevos }),
      res("maismilionaria", sorteio, { trevos })
    );
    expect(o.faixa).toBe("6+2");
    expect(o.acertosExtra).toBe(2);
  });
  it("6+0", () => {
    const o = conferirMaisMilionaria(
      bet("maismilionaria", sorteio, { trevos: [5, 6] }),
      res("maismilionaria", sorteio, { trevos })
    );
    expect(o.faixa).toBe("6+0");
  });
  it("2+1 premia", () => {
    const o = conferirMaisMilionaria(
      bet("maismilionaria", [1, 2, 30, 31, 32, 33], { trevos: [1, 6] }),
      res("maismilionaria", sorteio, { trevos })
    );
    expect(o.faixa).toBe("2+1");
  });
  it("2+0 não premia", () => {
    const o = conferirMaisMilionaria(
      bet("maismilionaria", [1, 2, 30, 31, 32, 33], { trevos: [5, 6] }),
      res("maismilionaria", sorteio, { trevos })
    );
    expect(o.faixa).toBeNull();
  });
});

describe("Dupla Sena — dois motores independentes", () => {
  const s1 = [1, 2, 3, 4, 5, 6];
  const s2 = [10, 11, 12, 13, 14, 15];
  it("Sena no 2º sorteio", () => {
    const o = conferirDuplaSena(bet("duplasena", s2), res("duplasena", s1, { dezenas2: s2 }));
    expect(o.faixa).toBe("2º sorteio: Sena");
    expect((o.detalhe as any).sorteio1.acertos).toBe(0);
  });
  it("premia nos dois sorteios de forma independente", () => {
    const aposta = [1, 2, 3, 10, 11, 12];
    const o = conferirDuplaSena(bet("duplasena", aposta), res("duplasena", s1, { dezenas2: s2 }));
    expect(o.faixa).toBe("1º sorteio: Terno · 2º sorteio: Terno");
    expect(o.acertos).toBe(3);
  });
  it("2 acertos não premia", () => {
    const o = conferirDuplaSena(bet("duplasena", [1, 2, 40, 41, 42, 43]), res("duplasena", s1, { dezenas2: s2 }));
    expect(o.faixa).toBeNull();
  });
});

describe("Timemania — 7 dezenas + Time do Coração", () => {
  const sorteio = [1, 2, 3, 4, 5, 6, 7];
  it("7 acertos", () => {
    const o = conferirTimemania(bet("timemania", sorteio), res("timemania", sorteio));
    expect(o.faixa).toBe("7 acertos");
  });
  it("3 acertos premia", () => {
    const o = conferirTimemania(bet("timemania", [1, 2, 3, 50, 51, 52, 53]), res("timemania", sorteio));
    expect(o.faixa).toBe("3 acertos");
  });
  it("time do coração premia com poucos acertos", () => {
    const o = conferirTimemania(
      bet("timemania", [1, 2, 50, 51, 52, 53, 54], { timeCoracao: "Flamengo" }),
      res("timemania", sorteio, { timeCoracao: "flamengo" })
    );
    expect(o.faixa).toBe("Time do Coração");
    expect(o.acertosExtra).toBe(1);
  });
  it("time errado com 2 acertos não premia", () => {
    const o = conferirTimemania(
      bet("timemania", [1, 2, 50, 51, 52, 53, 54], { timeCoracao: "Vasco" }),
      res("timemania", sorteio, { timeCoracao: "Flamengo" })
    );
    expect(o.status).toBe("CONFERIDA");
  });
});

describe("Janela oficial BRT", () => {
  it("segunda 20:59 fora / 21:00 dentro", () => {
    expect(dentroDaJanelaOficial(new Date("2026-08-03T20:59:00"))).toBe(false);
    expect(dentroDaJanelaOficial(new Date("2026-08-03T21:00:00"))).toBe(true);
  });
  it("domingo a partir das 11:00", () => {
    expect(dentroDaJanelaOficial(new Date("2026-08-02T10:59:00"))).toBe(false);
    expect(dentroDaJanelaOficial(new Date("2026-08-02T11:00:00"))).toBe(true);
  });
});
