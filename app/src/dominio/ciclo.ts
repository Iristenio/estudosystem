// Ciclo de estudos por horas (R17–R22 da ESPECIFICACAO.md, revistas em 21/10/2026 — método do ciclo
// de Alexandre Meirelles). Funções puras, testadas em ciclo.test.ts.
//
// O ciclo tem um total de horas (ex.: 30 h), dividido em blocos de cerca de 1 h (a sessão média). Cada
// disciplina recebe blocos conforme o peso: é a COTA dela no ciclo. Toda sessão concluída preenche a
// cota da disciplina com o tempo real estudado; o ciclo fecha quando a soma chega ao total, e então
// começa o próximo (Ciclo 1, 2, 3…). A ordem dos blocos só serve para sugerir a próxima disciplina.
import type { Ciclo, Disciplina, Id, PosicaoCiclo, Sessao } from './tipos';
import { ID_CICLO } from './tipos';
import { ordenarDisciplinas } from './disciplinas';
import { duracaoSegundos, sessoesValidas } from './sessoes';

/** Ciclos gravados antes da contagem por horas recomeçam no Ciclo 1 a partir deste dia (00:00 de Brasília). */
export const INICIO_CICLO_POR_HORAS = '2026-10-21T03:00:00.000Z';

/** Folga para considerar um bloco/ciclo cumprido (evita ficar pendente por segundos). */
const FOLGA_HORAS = 1 / 60;

export function novoCiclo(campos: Partial<Ciclo> = {}, agora = new Date()): Ciclo {
  const carimbo = agora.toISOString();
  return {
    id: ID_CICLO,
    horas_totais: 30,
    sequencia: [],
    volta: 1,
    ordem: 1,
    gerado_em: null,
    iniciado_em: null,
    criado_em: carimbo,
    atualizado_em: carimbo,
    ...campos,
  };
}

/** Ciclo como vale hoje: sem início gravado (versão antiga), é o Ciclo 1 desde INICIO_CICLO_POR_HORAS. */
export function cicloAtual(c: Ciclo): Ciclo {
  return c.iniciado_em ? c : { ...c, volta: 1, iniciado_em: INICIO_CICLO_POR_HORAS };
}

/* ============================ Gerar (R17, R18) ============================ */

/**
 * R17 — blocos de cerca de 1 h: o número de blocos é o total de horas (arredondado), repartido entre as
 * disciplinas ativas pelo peso (maiores restos; cada uma com pelo menos 1). Os blocos de cada disciplina
 * são espalhados ao longo do ciclo, na ordem das disciplinas. Ex.: 30 h, pesos 2,2,2,1,1,1 → 7,7,7,3,3,3.
 */
export function gerarSequencia(disciplinas: Disciplina[], horasTotais: number): { sequencia: PosicaoCiclo[]; erros: string[] } {
  const erros: string[] = [];
  if (!(horasTotais > 0)) erros.push('Informe as horas do ciclo (maior que zero).');
  const ativas = ordenarDisciplinas(disciplinas).filter((d) => d.ativa);
  if (!ativas.length) erros.push('Não há disciplinas ativas para montar o ciclo.');
  const somaPesos = ativas.reduce((s, d) => s + d.peso, 0);
  if (ativas.length && !(somaPesos > 0)) erros.push('A soma dos pesos precisa ser maior que zero.');
  if (erros.length) return { sequencia: [], erros };

  const blocos = Math.max(ativas.length, Math.round(horasTotais));
  const exatos = ativas.map((d) => (blocos * d.peso) / somaPesos);
  const quantos = exatos.map((x) => Math.max(1, Math.floor(x)));
  let sobra = blocos - quantos.reduce((s, q) => s + q, 0);
  const porResto = ativas.map((_, i) => i).sort((a, b) => exatos[b] - Math.floor(exatos[b]) - (exatos[a] - Math.floor(exatos[a])) || a - b);
  // Sobrou bloco: vai para quem teve o maior resto. Faltou (por causa do mínimo de 1): sai de quem teve o menor.
  for (let k = 0; sobra > 0; k = (k + 1) % porResto.length) {
    quantos[porResto[k]]++;
    sobra--;
  }
  for (let k = porResto.length - 1; sobra < 0 && k >= 0; k--) {
    if (quantos[porResto[k]] > 1) {
      quantos[porResto[k]]--;
      sobra++;
    }
  }

  const duracao = Math.round((horasTotais / quantos.reduce((s, q) => s + q, 0)) * 10000) / 10000;
  // Espalhar: o j-ésimo bloco de uma disciplina com n blocos fica na posição (j + ½) / n do ciclo
  const lugares = ativas.flatMap((d, i) => Array.from({ length: quantos[i] }, (_, j) => ({ d: d.id, lugar: (j + 0.5) / quantos[i], i })));
  lugares.sort((a, b) => a.lugar - b.lugar || a.i - b.i);
  return { sequencia: lugares.map((x) => ({ disciplina_id: x.d, duracao_prevista: duracao })), erros };
}

/** R18 — substitui a sequência e recomeça a contagem no Ciclo 1 (o histórico de sessões não muda). */
export function regenerar(c: Ciclo, sequencia: PosicaoCiclo[], horasTotais: number, agora = new Date()): Ciclo {
  const carimbo = agora.toISOString();
  return { ...c, horas_totais: horasTotais, sequencia, volta: 1, ordem: 1, gerado_em: carimbo, iniciado_em: carimbo };
}

/** Cota de cada disciplina no ciclo: soma das horas dos blocos dela, na ordem da sequência. */
export function cotasDoCiclo(c: Ciclo): { disciplina_id: Id; horas: number; blocos: number }[] {
  const cotas = new Map<Id, { disciplina_id: Id; horas: number; blocos: number }>();
  for (const p of c.sequencia) {
    const x = cotas.get(p.disciplina_id) ?? { disciplina_id: p.disciplina_id, horas: 0, blocos: 0 };
    x.horas += p.duracao_prevista;
    x.blocos++;
    cotas.set(p.disciplina_id, x);
  }
  return [...cotas.values()];
}

/** Total do ciclo = soma dos blocos (igual às horas do ciclo, salvo edição manual). */
export const totalDoCiclo = (c: Ciclo) => c.sequencia.reduce((s, p) => s + p.duracao_prevista, 0);

/* ============================ Andamento (R20–R22) ============================ */

export interface BlocoNoCiclo {
  ordem: number;
  disciplina_id: Id;
  duracao: number;
  /** Horas já preenchidas neste bloco (0 até a duração). */
  feito: number;
  cumprido: boolean;
}

export interface AndamentoDoCiclo {
  numero: number;
  iniciado_em: string;
  total: number;
  /** Horas estudadas no ciclo (só disciplinas do ciclo; inclui o que passou da cota). */
  feito: number;
  concluido: boolean;
  porDisciplina: { disciplina_id: Id; cota: number; feito: number }[];
  blocos: BlocoNoCiclo[];
  /** R22 — próxima disciplina sugerida: a do primeiro bloco ainda não cumprido. */
  proxima: Id | null;
}

/** Sessões concluídas que contam no ciclo atual: começaram depois do início dele. */
export function sessoesDoCiclo(c: Ciclo, sessoes: Sessao[]): Sessao[] {
  const atual = cicloAtual(c);
  return sessoesValidas(sessoes).filter((s) => s.situacao === 'concluida' && s.inicio >= atual.iniciado_em!);
}

/**
 * R20 — cada sessão preenche a cota da disciplina com o tempo real estudado; dentro da cota, os blocos
 * da disciplina são preenchidos na ordem. Hora além da cota conta no total (aparece como "além da cota").
 */
export function andamentoDoCiclo(c: Ciclo, sessoes: Sessao[]): AndamentoDoCiclo {
  const atual = cicloAtual(c);
  const cotas = cotasDoCiclo(atual);
  const noCiclo = new Set(cotas.map((x) => x.disciplina_id));
  const feitoPor = new Map<Id, number>();
  for (const s of sessoesDoCiclo(atual, sessoes)) {
    if (!noCiclo.has(s.disciplina_id)) continue;
    feitoPor.set(s.disciplina_id, (feitoPor.get(s.disciplina_id) ?? 0) + duracaoSegundos(s) / 3600);
  }
  const restante = new Map(feitoPor);
  const blocos = atual.sequencia.map((p, i) => {
    const disponivel = restante.get(p.disciplina_id) ?? 0;
    const feito = Math.min(p.duracao_prevista, disponivel);
    restante.set(p.disciplina_id, disponivel - feito);
    return { ordem: i + 1, disciplina_id: p.disciplina_id, duracao: p.duracao_prevista, feito, cumprido: feito >= p.duracao_prevista - FOLGA_HORAS };
  });
  const total = totalDoCiclo(atual);
  const feito = [...feitoPor.values()].reduce((s, h) => s + h, 0);
  return {
    numero: atual.volta,
    iniciado_em: atual.iniciado_em!,
    total,
    feito,
    concluido: total > 0 && feito >= total - FOLGA_HORAS,
    porDisciplina: cotas.map((x) => ({ disciplina_id: x.disciplina_id, cota: x.horas, feito: feitoPor.get(x.disciplina_id) ?? 0 })),
    blocos,
    proxima: blocos.find((b) => !b.cumprido)?.disciplina_id ?? atual.sequencia[0]?.disciplina_id ?? null,
  };
}

/** Disciplina sugerida para a próxima sessão (R2/R22). */
export function disciplinaSugerida(c: Ciclo | null | undefined, sessoes: Sessao[]): Id | null {
  if (!c || !c.sequencia.length) return null;
  return andamentoDoCiclo(c, sessoes).proxima;
}

/**
 * R21 — ao concluir uma sessão (já incluída em `sessoes`): grava em qual ciclo ela contou ("C3") e, se a
 * soma chegou ao total, fecha o ciclo e começa o próximo a partir do fim desta sessão.
 */
export function registrarConclusao(
  c: Ciclo,
  sessao: Sessao,
  sessoes: Sessao[],
): { ciclo: Ciclo; posicao: string | null; numero: number; fechou: boolean; feito: number; total: number } {
  if (!c.sequencia.length) return { ciclo: c, posicao: null, numero: 0, fechou: false, feito: 0, total: 0 };
  const atual = cicloAtual(c);
  const a = andamentoDoCiclo(atual, sessoes);
  const posicao = `C${atual.volta}`;
  if (!a.concluido) return { ciclo: atual, posicao, numero: atual.volta, fechou: false, feito: a.feito, total: a.total };
  const proximo = { ...atual, volta: atual.volta + 1, iniciado_em: sessao.fim ?? new Date().toISOString() };
  return { ciclo: proximo, posicao, numero: atual.volta, fechou: true, feito: a.feito, total: a.total };
}

/* ============================ Edição manual (R19) ============================ */

/** Horas de um bloco novo: as mesmas dos outros blocos (ou 1 h). */
function duracaoPadrao(c: Ciclo): number {
  return c.sequencia[0]?.duracao_prevista ?? 1;
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

export function removerPosicao(c: Ciclo, ordem: number): Ciclo {
  return { ...c, sequencia: c.sequencia.filter((_, i) => i !== ordem - 1) };
}
