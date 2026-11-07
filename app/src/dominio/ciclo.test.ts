import { describe, expect, it } from 'vitest';
import type { Ciclo, Sessao } from './tipos';
import {
  andamentoDoCiclo,
  blocoDaSessao,
  blocosParaEscolher,
  cicloAtual,
  cotasDoCiclo,
  disciplinaSugerida,
  gerarSequencia,
  incluirPosicao,
  INICIO_CICLO_POR_HORAS,
  moverPosicao,
  novoCiclo,
  regenerar,
  registrarConclusao,
  removerPosicao,
  trocarDisciplina,
} from './ciclo';
import { disciplinasIniciais } from './dadosIniciais';
import { novaDisciplina } from './disciplinas';
import { concluir, finalizar, iniciarSessao } from './sessoes';

const ids = (c: Pick<Ciclo, 'sequencia'>) => c.sequencia.map((p) => p.disciplina_id);
const contagem = (c: Pick<Ciclo, 'sequencia'>) =>
  Object.fromEntries(cotasDoCiclo({ ...novoCiclo(), sequencia: c.sequencia }).map((x) => [x.disciplina_id, x.blocos]));

/** Ciclo de 6 blocos de 1 h: D01 ×2, D02 ×2, D03, D04 — começou em 01/10. */
const INICIO = '2026-10-01T10:00:00.000Z';
const ciclo = (campos: Partial<Ciclo> = {}): Ciclo =>
  novoCiclo({
    horas_totais: 6,
    volta: 3,
    iniciado_em: INICIO,
    sequencia: ['D01', 'D02', 'D03', 'D01', 'D02', 'D04'].map((d) => ({ disciplina_id: d, duracao_prevista: 1 })),
    ...campos,
  });

let seq = 0;
function sessao(disciplina: string, inicioIso: string, minutos: number): Sessao {
  const inicio = new Date(inicioIso);
  const s = iniciarSessao(`s${++seq}`, { disciplina_id: disciplina, tipo: 'Revisão', aula: '', lei_id: null }, inicio);
  return concluir(finalizar(s, new Date(inicio.getTime() + minutos * 60_000)), { paginas: null, artigos_lidos: '', questoes: null, acertos: null });
}

describe('gerar os blocos (R17)', () => {
  it('30 h, pesos 2,2,1,2,1 → 30 blocos de 1 h repartidos pelo peso (maiores restos)', () => {
    const { sequencia, erros } = gerarSequencia(disciplinasIniciais(), 30);
    expect(erros).toEqual([]);
    expect(sequencia).toHaveLength(30);
    expect(sequencia.every((p) => p.duracao_prevista === 1)).toBe(true);
    expect(contagem({ sequencia })).toEqual({ D01: 8, D02: 7, D03: 4, D04: 7, D05: 4 });
  });

  it('o exemplo combinado: 30 h, pesos 2,2,2,1,1,1 → 7,7,7,3,3,3', () => {
    const ds = [
      novaDisciplina({ id: 'A', nome: 'A', peso: 2, ordem: 1 }),
      novaDisciplina({ id: 'B', nome: 'B', peso: 2, ordem: 2 }),
      novaDisciplina({ id: 'C', nome: 'C', peso: 2, ordem: 3 }),
      novaDisciplina({ id: 'D', nome: 'D', peso: 1, ordem: 4 }),
      novaDisciplina({ id: 'E', nome: 'E', peso: 1, ordem: 5 }),
      novaDisciplina({ id: 'F', nome: 'F', peso: 1, ordem: 6 }),
    ];
    const { sequencia } = gerarSequencia(ds, 30);
    expect(contagem({ sequencia })).toEqual({ A: 7, B: 7, C: 7, D: 3, E: 3, F: 3 });
    // espalhados: a mesma disciplina nunca aparece duas vezes seguidas
    expect(ids({ sequencia }).some((d, i, l) => d === l[i + 1])).toBe(false);
    expect(ids({ sequencia }).slice(0, 6)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('ignora inativas; com poucas horas, cada disciplina tem pelo menos 1 bloco', () => {
    const ds = disciplinasIniciais().map((d) => (d.id === 'D03' ? { ...d, ativa: false } : d));
    const { sequencia } = gerarSequencia(ds, 3);
    expect(contagem({ sequencia })).toEqual({ D01: 1, D02: 1, D04: 1, D05: 1 });
    expect(sequencia[0].duracao_prevista).toBe(0.75); // 3 h em 4 blocos
  });

  it('acusa horas inválidas ou nenhuma disciplina ativa', () => {
    expect(gerarSequencia(disciplinasIniciais(), 0).erros).toHaveLength(1);
    expect(gerarSequencia([], 30).erros).toEqual(['Não há disciplinas ativas para montar o ciclo.']);
  });

  it('R18: gerar de novo substitui os blocos e recomeça no Ciclo 1, a partir de agora', () => {
    const r = regenerar(ciclo(), [{ disciplina_id: 'D01', duracao_prevista: 5 }], 5, new Date('2026-10-21T10:00:00Z'));
    expect([r.volta, r.horas_totais, r.gerado_em, r.iniciado_em]).toEqual([1, 5, '2026-10-21T10:00:00.000Z', '2026-10-21T10:00:00.000Z']);
  });

  it('ciclo gravado na versão antiga (sem início) vale como Ciclo 1 desde a mudança', () => {
    const antigo = ciclo({ volta: 4, iniciado_em: null });
    expect([cicloAtual(antigo).volta, cicloAtual(antigo).iniciado_em]).toEqual([1, INICIO_CICLO_POR_HORAS]);
  });
});

describe('andamento por horas (R20–R22)', () => {
  it('cada sessão preenche a cota da disciplina com o tempo real; blocos na ordem', () => {
    const lista = [
      sessao('D01', '2026-10-02T08:00:00Z', 90), // 1h30 de Constitucional: 1º bloco cheio, 2º com 30 min
      sessao('D02', '2026-10-02T10:00:00Z', 30),
      sessao('D02', '2026-10-02T11:00:00Z', 30), // 30 + 30 = 1 bloco
      sessao('D03', '2026-09-30T10:00:00Z', 60), // antes do início do ciclo: não conta
    ];
    const a = andamentoDoCiclo(ciclo(), lista);
    expect(a.numero).toBe(3);
    expect(a.feito).toBe(2.5);
    expect(a.blocos.map((b) => [b.disciplina_id, b.feito, b.cumprido])).toEqual([
      ['D01', 1, true],
      ['D02', 1, true],
      ['D03', 0, false],
      ['D01', 0.5, false],
      ['D02', 0, false],
      ['D04', 0, false],
    ]);
    expect(a.porDisciplina).toEqual([
      { disciplina_id: 'D01', cota: 2, feito: 1.5 },
      { disciplina_id: 'D02', cota: 2, feito: 1 },
      { disciplina_id: 'D03', cota: 1, feito: 0 },
      { disciplina_id: 'D04', cota: 1, feito: 0 },
    ]);
    expect(a.proxima).toBe('D03'); // primeiro bloco não cumprido
    expect(disciplinaSugerida(ciclo(), lista)).toBe('D03');
  });

  it('hora além da cota conta no total; disciplina fora do ciclo não conta', () => {
    const lista = [sessao('D04', '2026-10-02T08:00:00Z', 180), sessao('D99', '2026-10-02T12:00:00Z', 60)];
    const a = andamentoDoCiclo(ciclo(), lista);
    expect(a.feito).toBe(3);
    expect(a.porDisciplina.find((x) => x.disciplina_id === 'D04')).toEqual({ disciplina_id: 'D04', cota: 1, feito: 3 });
    expect(a.blocos[5].feito).toBe(1);
  });

  it('R21: ao somar o total, o ciclo fecha e o próximo começa no fim da sessão', () => {
    const antes = [sessao('D01', '2026-10-02T08:00:00Z', 120), sessao('D02', '2026-10-03T08:00:00Z', 120), sessao('D03', '2026-10-04T08:00:00Z', 60)];
    const ultima = sessao('D04', '2026-10-05T08:00:00Z', 70); // 5 h + 1h10 ≥ 6 h
    const r = registrarConclusao(ciclo(), ultima, [...antes, ultima]);
    expect([r.fechou, r.numero, r.posicao]).toEqual([true, 3, 'C3']);
    expect(r.ciclo.volta).toBe(4);
    expect(r.ciclo.iniciado_em).toBe(ultima.fim);
    // o novo ciclo começa zerado
    expect(andamentoDoCiclo(r.ciclo, [...antes, ultima]).feito).toBe(0);

    const parcial = registrarConclusao(ciclo(), antes[0], [antes[0]]);
    expect([parcial.fechou, parcial.posicao, parcial.feito, parcial.total]).toEqual([false, 'C3', 2, 6]);
    expect(parcial.ciclo.volta).toBe(3);
  });

  it('fecha mesmo se alguma disciplina não completou a cota (vale o total)', () => {
    const r = registrarConclusao(ciclo(), sessao('D01', '2026-10-02T08:00:00Z', 360), [sessao('D01', '2026-10-02T08:00:00Z', 360)]);
    expect(r.fechou).toBe(true);
  });

  it('sem blocos, nada muda', () => {
    const s = sessao('D01', '2026-10-02T08:00:00Z', 60);
    expect(registrarConclusao(novoCiclo(), s, [s])).toMatchObject({ posicao: null, fechou: false });
    expect(disciplinaSugerida(novoCiclo(), [])).toBeNull();
    expect(disciplinaSugerida(null, [])).toBeNull();
  });
});

describe('edição manual (R19)', () => {
  it('troca, move, inclui e remove blocos', () => {
    let c = ciclo();
    c = trocarDisciplina(c, 3, 'D05');
    expect(ids(c)[2]).toBe('D05');
    c = moverPosicao(c, 1, 1);
    expect(ids(c).slice(0, 2)).toEqual(['D02', 'D01']);
    expect(moverPosicao(c, 1, -1)).toBe(c);
    c = incluirPosicao(c, 'D03');
    expect(c.sequencia[6]).toEqual({ disciplina_id: 'D03', duracao_prevista: 1 });
    c = removerPosicao(c, 1);
    expect(ids(c)[0]).toBe('D01');
  });
});

describe('bloco escolhido ao iniciar (R44)', () => {
  // Ciclo de teste: 1 D01 · 2 D02 · 3 D03 · 4 D01 · 5 D02 · 6 D04 (blocos de 1 h)
  const comBloco = (disciplina: string, inicioIso: string, minutos: number, bloco: number): Sessao => ({
    ...sessao(disciplina, inicioIso, minutos),
    posicao_ciclo: `C3B${bloco}`,
  });

  it('a sessão preenche o bloco escolhido; o atual segue a partir dele e os pulados ficam pendentes', () => {
    const lista = [sessao('D01', '2026-10-02T08:00:00Z', 60), comBloco('D02', '2026-10-02T10:00:00Z', 23, 5)];
    const a = andamentoDoCiclo(ciclo(), lista);
    expect(a.blocos.map((b) => Math.round(b.feito * 60))).toEqual([60, 0, 0, 0, 23, 0]);
    expect([a.atual?.ordem, a.anterior?.ordem, a.seguinte?.ordem, a.proxima]).toEqual([5, 4, 6, 'D02']);
    expect(blocosParaEscolher(a).map((x) => `${x.bloco.ordem}${x.pulado ? 'p' : ''}`)).toEqual(['5', '6', '2p', '3p', '4p']);
  });

  it('completando o bloco escolhido, o atual passa ao próximo pendente; a sobra vai para o próximo da disciplina', () => {
    const lista = [comBloco('D02', '2026-10-02T10:00:00Z', 90, 2)]; // 1h30: bloco 2 cheio + 30 min no bloco 5
    const a = andamentoDoCiclo(ciclo(), lista);
    expect(a.blocos.map((b) => Math.round(b.feito * 60))).toEqual([0, 60, 0, 0, 30, 0]);
    expect([a.atual?.ordem, a.seguinte?.ordem]).toEqual([3, 4]);
  });

  it('no fim da lista, volta aos blocos pulados', () => {
    const lista = [comBloco('D04', '2026-10-02T10:00:00Z', 60, 6)];
    const a = andamentoDoCiclo(ciclo(), lista);
    expect([a.atual?.ordem, a.anterior, a.seguinte?.ordem]).toEqual([1, null, 2]);
  });

  it('bloco que não é da disciplina da sessão é ignorado (preenche na ordem, como antes)', () => {
    const a = andamentoDoCiclo(ciclo(), [comBloco('D01', '2026-10-02T10:00:00Z', 60, 2)]);
    expect(a.blocos[0].feito).toBe(1);
    expect(a.blocos[1].feito).toBe(0);
  });

  it('iniciar guarda o bloco e concluir mantém ("B5" → "C3B5")', () => {
    const s = iniciarSessao('x', { disciplina_id: 'D02', tipo: 'Revisão', aula: '', lei_id: null, bloco_ciclo: 5 }, new Date('2026-10-02T10:00:00Z'));
    expect([s.posicao_ciclo, blocoDaSessao(s)]).toEqual(['B5', 5]);
    const fim = concluir(finalizar(s, new Date('2026-10-02T10:30:00Z')), { paginas: null, artigos_lidos: '', questoes: null, acertos: null });
    expect(registrarConclusao(ciclo(), fim, [fim]).posicao).toBe('C3B5');
  });
});
