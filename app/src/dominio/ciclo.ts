// Ciclo de estudos (R17–R22 da ESPECIFICACAO.md) — mesmas regras do Apps Script antigo (05_Ciclo / 06_Sessoes).
// Funções puras, testadas em ciclo.test.ts.
import type { Ciclo, Disciplina, Id, PosicaoCiclo, Sessao } from './tipos';
import { ID_CICLO } from './tipos';
import { ordenarDisciplinas } from './disciplinas';
import { duracaoSegundos, sessoesValidas } from './sessoes';

export function novoCiclo(campos: Partial<Ciclo> = {}, agora = new Date()): Ciclo {
  const carimbo = agora.toISOString();
  return {
    id: ID_CICLO,
    horas_totais: 30,
    sequencia: [],
    volta: 1,
    ordem: 1,
    gerado_em: null,
    criado_em: carimbo,
    atualizado_em: carimbo,
    ...campos,
  };
}

/** "3F2" = volta 3, posição 2. */
export const formatarPosicao = (volta: number, ordem: number) => `${volta}F${ordem}`;

export function lerPosicao(codigo: string | null): { volta: number; ordem: number } | null {
  const m = /^(\d+)F(\d+)$/.exec(codigo ?? '');
  return m ? { volta: Number(m[1]), ordem: Number(m[2]) } : null;
}

export const posicaoAtual = (c: Ciclo) => formatarPosicao(c.volta, c.ordem);

/* ============================ Gerar (R17, R18) ============================ */

/**
 * R17 — duração de cada vez = horas totais ÷ soma dos pesos das disciplinas ativas.
 * Sequência por rodadas: cada disciplina com peso restante entra uma vez por rodada, na ordem
 * das disciplinas, até esgotar os pesos. Ex.: 30 h, pesos 2,2,1,2,1 → 8 posições de 3,75 h.
 */
export function gerarSequencia(disciplinas: Disciplina[], horasTotais: number): { sequencia: PosicaoCiclo[]; erros: string[] } {
  const erros: string[] = [];
  if (!(horasTotais > 0)) erros.push('Informe as horas totais do ciclo (maior que zero).');
  const ativas = ordenarDisciplinas(disciplinas).filter((d) => d.ativa);
  if (!ativas.length) erros.push('Não há disciplinas ativas para montar o ciclo.');
  const somaPesos = ativas.reduce((s, d) => s + d.peso, 0);
  if (ativas.length && !(somaPesos > 0)) erros.push('A soma dos pesos precisa ser maior que zero.');
  if (erros.length) return { sequencia: [], erros };

  const duracao = Math.round((horasTotais / somaPesos) * 100) / 100;
  const saldos = ativas.map((d) => d.peso);
  const sequencia: PosicaoCiclo[] = [];
  let restantes = somaPesos;
  while (restantes > 0) {
    ativas.forEach((d, i) => {
      if (saldos[i] > 0) {
        sequencia.push({ disciplina_id: d.id, duracao_prevista: duracao });
        saldos[i]--;
        restantes--;
      }
    });
  }
  return { sequencia, erros };
}

/** R18 — substitui a sequência e volta o ponteiro para 1F1. */
export function regenerar(c: Ciclo, sequencia: PosicaoCiclo[], horasTotais: number, agora = new Date()): Ciclo {
  return { ...c, horas_totais: horasTotais, sequencia, volta: 1, ordem: 1, gerado_em: agora.toISOString() };
}

/* ============================ Sugestão (R2) ============================ */

/** Disciplina da posição do ponteiro (ou da 1ª posição, se o ponteiro estiver fora da sequência). */
export function disciplinaSugerida(c: Ciclo | null | undefined): Id | null {
  if (!c || !c.sequencia.length) return null;
  return (c.sequencia[c.ordem - 1] ?? c.sequencia[0]).disciplina_id;
}

/* ============================ Avanço do ponteiro (R20, R21) ============================ */

/**
 * Disciplina da sessão concluída mais recente que começou ANTES desta (usada na trava de repetição).
 */
export function disciplinaDaSessaoAnterior(sessao: Sessao, todas: Sessao[]): Id | null {
  const anteriores = sessoesValidas(todas).filter(
    (s) => s.id !== sessao.id && s.situacao === 'concluida' && s.inicio < sessao.inicio,
  );
  anteriores.sort((a, b) => b.inicio.localeCompare(a.inicio));
  return anteriores[0]?.disciplina_id ?? null;
}

/**
 * R20 — ao concluir uma sessão:
 *  • disciplina da posição atual → avança uma posição;
 *  • aparece mais à frente na mesma volta → salta até ela, só se for diferente da sessão anterior;
 *  • não está à frente nesta volta (já cumprida ou fora do ciclo) → o ponteiro não se move;
 *  • passou da última posição → próxima volta, posição 1.
 * R21 — devolve a posição cumprida (ex.: "3F2"); se não avançou, a posição atual do ponteiro.
 */
export function avancar(c: Ciclo, disciplinaId: Id, disciplinaAnterior: Id | null): { ciclo: Ciclo; posicao: string | null; avancou: boolean } {
  const total = c.sequencia.length;
  if (!total) return { ciclo: c, posicao: null, avancou: false };
  const ordemAtual = c.ordem >= 1 && c.ordem <= total ? c.ordem : 1;

  let encontrada: number | null = null;
  for (let ordem = ordemAtual; ordem <= total; ordem++) {
    if (c.sequencia[ordem - 1].disciplina_id === disciplinaId) {
      encontrada = ordem;
      break;
    }
  }
  const ehSalto = encontrada !== null && encontrada > ordemAtual;
  if (encontrada === null || (ehSalto && disciplinaAnterior === disciplinaId)) {
    return { ciclo: c, posicao: formatarPosicao(c.volta, ordemAtual), avancou: false };
  }

  let volta = c.volta;
  let ordem = encontrada + 1;
  if (ordem > total) {
    ordem = 1;
    volta++;
  }
  return { ciclo: { ...c, volta, ordem }, posicao: formatarPosicao(c.volta, encontrada), avancou: true };
}

/* ============================ Edição manual (R19, R22) ============================ */

/** Horas de uma posição nova: as mesmas das outras posições (ou horas ÷ nº de posições). */
function duracaoPadrao(c: Ciclo): number {
  return c.sequencia[0]?.duracao_prevista ?? c.horas_totais;
}

export function trocarDisciplina(c: Ciclo, ordem: number, disciplinaId: Id): Ciclo {
  return { ...c, sequencia: c.sequencia.map((p, i) => (i === ordem - 1 ? { ...p, disciplina_id: disciplinaId } : p)) };
}

export function moverPosicao(c: Ciclo, ordem: number, direcao: -1 | 1): Ciclo {
  const i = ordem - 1;
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= c.sequencia.length) return c;
  const sequencia = [...c.sequencia];
  [sequencia[i], sequencia[j]] = [sequencia[j], sequencia[i]];
  return { ...c, sequencia };
}

export function incluirPosicao(c: Ciclo, disciplinaId: Id): Ciclo {
  return { ...c, sequencia: [...c.sequencia, { disciplina_id: disciplinaId, duracao_prevista: duracaoPadrao(c) }] };
}

/** Remove a posição; o ponteiro continua apontando para a mesma disciplina seguinte (ou volta ao início). */
export function removerPosicao(c: Ciclo, ordem: number): Ciclo {
  const sequencia = c.sequencia.filter((_, i) => i !== ordem - 1);
  let novaOrdem = c.ordem > ordem ? c.ordem - 1 : c.ordem;
  if (novaOrdem > sequencia.length) novaOrdem = 1;
  return { ...c, sequencia, ordem: Math.max(1, novaOrdem) };
}

/** R22 — posiciona o ponteiro à mão. */
export function ajustarPonteiro(c: Ciclo, volta: number, ordem: number): Ciclo {
  const total = Math.max(1, c.sequencia.length);
  return { ...c, volta: Math.max(1, Math.round(volta)), ordem: Math.min(total, Math.max(1, Math.round(ordem))) };
}

/* ============================ Horas feitas na volta ============================ */

/**
 * Horas já estudadas em cada posição da volta atual (sessões concluídas com posicao_ciclo "volta F ordem",
 * registradas depois da última geração da sequência).
 */
export function horasFeitasNaVolta(c: Ciclo, sessoes: Sessao[]): number[] {
  const horas = c.sequencia.map(() => 0);
  for (const s of sessoesValidas(sessoes)) {
    if (s.situacao !== 'concluida') continue;
    if (c.gerado_em && s.inicio < c.gerado_em) continue;
    const p = lerPosicao(s.posicao_ciclo);
    if (!p || p.volta !== c.volta || p.ordem < 1 || p.ordem > horas.length) continue;
    horas[p.ordem - 1] += duracaoSegundos(s) / 3600;
  }
  return horas;
}
