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
  /** R22/R44 — bloco atual: segue o último bloco escolhido; sem escolha, o primeiro não cumprido. */
  atual: BlocoNoCiclo | null;
  /** Bloco antes do atual na ordem do ciclo. */
  anterior: BlocoNoCiclo | null;
  /** Próximo bloco não cumprido depois do atual. */
  seguinte: BlocoNoCiclo | null;
  /** Disciplina do bloco atual (sugerida para a próxima sessão). */
  proxima: Id | null;
}

/** Sessões concluídas que contam no ciclo atual: começaram depois do início dele. */
export function sessoesDoCiclo(c: Ciclo, sessoes: Sessao[]): Sessao[] {
  const atual = cicloAtual(c);
  return sessoesValidas(sessoes).filter((s) => s.situacao === 'concluida' && s.inicio >= atual.iniciado_em!);
}

/** R44 — bloco escolhido ao iniciar a sessão, guardado em posicao_ciclo ("B24" e, ao concluir, "C1B24"). */
export function blocoDaSessao(s: Pick<Sessao, 'posicao_ciclo'>): number | null {
  const m = /B(\d+)$/.exec(s.posicao_ciclo ?? '');
  return m ? Number(m[1]) : null;
}

/**
 * R20/R44 — cada sessão (em ordem de data) preenche, com o tempo real estudado:
 *  • o bloco escolhido ao iniciar (se for da mesma disciplina) e, se sobrar, os próximos blocos pendentes
 *    dessa disciplina (depois os de antes, que ficaram pulados);
 *  • sem bloco escolhido (sessões antigas), os blocos da disciplina na ordem.
 * Hora além da cota conta no total do ciclo (aparece como "além da cota").
 */
export function andamentoDoCiclo(c: Ciclo, sessoes: Sessao[]): AndamentoDoCiclo {
  const atual = cicloAtual(c);
  const cotas = cotasDoCiclo(atual);
  const noCiclo = new Set(cotas.map((x) => x.disciplina_id));
  const blocos: BlocoNoCiclo[] = atual.sequencia.map((p, i) => ({ ordem: i + 1, disciplina_id: p.disciplina_id, duracao: p.duracao_prevista, feito: 0, cumprido: false }));
  const feitoPor = new Map<Id, number>();
  let referencia: number | null = null;

  const daSessoes = sessoesDoCiclo(atual, sessoes)
    .filter((s) => noCiclo.has(s.disciplina_id))
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (const s of daSessoes) {
    let resto = duracaoSegundos(s) / 3600;
    feitoPor.set(s.disciplina_id, (feitoPor.get(s.disciplina_id) ?? 0) + resto);
    const escolhido = blocoDaSessao(s);
    const valido = escolhido !== null && blocos[escolhido - 1]?.disciplina_id === s.disciplina_id;
    const daDisciplina = blocos.filter((b) => b.disciplina_id === s.disciplina_id);
    const ordem = valido
      ? [...daDisciplina.filter((b) => b.ordem >= escolhido!), ...daDisciplina.filter((b) => b.ordem < escolhido!)]
      : daDisciplina;
    for (const b of ordem) {
      if (resto <= 0) break;
      const x = Math.min(b.duracao - b.feito, resto);
      b.feito += x;
      resto -= x;
    }
    if (valido) referencia = escolhido;
  }
  for (const b of blocos) b.cumprido = b.feito >= b.duracao - FOLGA_HORAS;

  const pendentes = blocos.filter((b) => !b.cumprido);
  const depois = (n: number) => pendentes.find((b) => b.ordem >= n) ?? pendentes[0] ?? null;
  const blocoAtual = depois(referencia ?? 1);
  const seguinte = blocoAtual ? (pendentes.find((b) => b.ordem > blocoAtual.ordem) ?? pendentes.find((b) => b.ordem < blocoAtual.ordem) ?? null) : null;
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
    atual: blocoAtual,
    anterior: blocoAtual && blocoAtual.ordem > 1 ? blocos[blocoAtual.ordem - 2] : null,
    seguinte,
    proxima: blocoAtual?.disciplina_id ?? atual.sequencia[0]?.disciplina_id ?? null,
  };
}

/**
 * R44 — blocos para escolher ao iniciar: os não cumpridos, a partir do atual; os que ficaram para trás
 * (pulados) vêm no fim.
 */
export function blocosParaEscolher(a: AndamentoDoCiclo): { bloco: BlocoNoCiclo; pulado: boolean }[] {
  const pendentes = a.blocos.filter((b) => !b.cumprido);
  const inicio = a.atual?.ordem ?? 1;
  return [
    ...pendentes.filter((b) => b.ordem >= inicio).map((bloco) => ({ bloco, pulado: false })),
    ...pendentes.filter((b) => b.ordem < inicio).map((bloco) => ({ bloco, pulado: true })),
  ];
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
  const bloco = blocoDaSessao(sessao);
  const posicao = `C${atual.volta}${bloco ? `B${bloco}` : ''}`;
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
