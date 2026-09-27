import { describe, expect, it } from 'vitest';
import type { Ciclo, Sessao } from './tipos';
import {
  ajustarPonteiro,
  avancar,
  disciplinaDaSessaoAnterior,
  disciplinaSugerida,
  formatarPosicao,
  gerarSequencia,
  horasFeitasNaVolta,
  incluirPosicao,
  lerPosicao,
  moverPosicao,
  novoCiclo,
  regenerar,
  removerPosicao,
  trocarDisciplina,
} from './ciclo';
import { cicloInicial, disciplinasIniciais } from './dadosIniciais';
import { concluir, finalizar, iniciarSessao } from './sessoes';

const ids = (c: Ciclo) => c.sequencia.map((p) => p.disciplina_id);
/** Ciclo da planilha: D01 D02 D03 D04 D05 D01 D02 D04 */
const ciclo = (volta = 1, ordem = 1) => ({ ...cicloInicial(), volta, ordem });

describe('gerar a sequência (R17)', () => {
  it('30 h com pesos 2,2,1,2,1 → 8 posições de 3,75 h, por rodadas (igual à planilha)', () => {
    const { sequencia, erros } = gerarSequencia(disciplinasIniciais(), 30);
    expect(erros).toEqual([]);
    expect(sequencia.map((p) => p.disciplina_id)).toEqual(['D01', 'D02', 'D03', 'D04', 'D05', 'D01', 'D02', 'D04']);
    expect(sequencia.every((p) => p.duracao_prevista === 3.75)).toBe(true);
  });

  it('ignora disciplinas inativas e respeita a ordem', () => {
    const ds = disciplinasIniciais().map((d) => (d.id === 'D03' ? { ...d, ativa: false } : d.id === 'D05' ? { ...d, ordem: 0 } : d));
    expect(gerarSequencia(ds, 21).sequencia.map((p) => p.disciplina_id)).toEqual(['D05', 'D01', 'D02', 'D04', 'D01', 'D02', 'D04']);
    expect(gerarSequencia(ds, 21).sequencia[0].duracao_prevista).toBe(3);
  });

  it('acusa horas inválidas ou nenhuma disciplina ativa', () => {
    expect(gerarSequencia(disciplinasIniciais(), 0).erros).toHaveLength(1);
    expect(gerarSequencia([], 30).erros).toEqual(['Não há disciplinas ativas para montar o ciclo.']);
  });

  it('R18: regenerar substitui e volta para 1F1', () => {
    const r = regenerar(ciclo(4, 4), [{ disciplina_id: 'D01', duracao_prevista: 5 }], 5, new Date('2026-09-27T10:00:00Z'));
    expect([r.volta, r.ordem, r.horas_totais, r.gerado_em]).toEqual([1, 1, 5, '2026-09-27T10:00:00.000Z']);
  });
});

describe('posição (CRON_ID)', () => {
  it('formata e lê "volta F ordem"', () => {
    expect(formatarPosicao(3, 2)).toBe('3F2');
    expect(lerPosicao('12F8')).toEqual({ volta: 12, ordem: 8 });
    expect(lerPosicao('x')).toBeNull();
    expect(lerPosicao(null)).toBeNull();
  });

  it('sugere a disciplina da posição do ponteiro', () => {
    expect(disciplinaSugerida(ciclo(4, 4))).toBe('D04');
    expect(disciplinaSugerida(ciclo(1, 99))).toBe('D01'); // fora da sequência → 1ª posição
    expect(disciplinaSugerida(novoCiclo())).toBeNull();
    expect(disciplinaSugerida(null)).toBeNull();
  });
});

describe('avanço do ponteiro (R20, R21)', () => {
  it('disciplina da posição atual → avança uma posição e grava a posição cumprida', () => {
    const r = avancar(ciclo(4, 4), 'D04', 'D03');
    expect(r).toMatchObject({ posicao: '4F4', avancou: true });
    expect([r.ciclo.volta, r.ciclo.ordem]).toEqual([4, 5]);
  });

  it('na mesma disciplina da posição atual, avança mesmo repetindo a sessão anterior', () => {
    expect(avancar(ciclo(1, 2), 'D02', 'D02').avancou).toBe(true);
  });

  it('mais à frente na volta → salta até ela (se não repetir a sessão anterior)', () => {
    const r = avancar(ciclo(1, 1), 'D05', 'D01');
    expect(r.posicao).toBe('1F5');
    expect(r.ciclo.ordem).toBe(6);
  });

  it('trava de repetição: repetir a disciplina da sessão anterior não salta posições', () => {
    // ponteiro em 1F2 (D02); repetiu D01, que aparece de novo em 1F6
    const r = avancar(ciclo(1, 2), 'D01', 'D01');
    expect(r).toMatchObject({ avancou: false, posicao: '1F2' });
    expect(r.ciclo.ordem).toBe(2);
  });

  it('já cumprida nesta volta (só aparece para trás) → não se move e grava a posição atual', () => {
    const r = avancar(ciclo(2, 7), 'D03', 'D02');
    expect(r).toMatchObject({ avancou: false, posicao: '2F7' });
  });

  it('fora do ciclo → não se move', () => {
    expect(avancar(ciclo(1, 3), 'D99', null).avancou).toBe(false);
  });

  it('última posição → próxima volta, posição 1', () => {
    const r = avancar(ciclo(3, 8), 'D04', 'D02');
    expect(r.posicao).toBe('3F8');
    expect([r.ciclo.volta, r.ciclo.ordem]).toEqual([4, 1]);
  });

  it('sem sequência não há posição', () => {
    expect(avancar(novoCiclo(), 'D01', null)).toMatchObject({ posicao: null, avancou: false });
  });
});

function sessaoConcluida(id: string, disciplina: string, inicioIso: string, minutos: number, posicao: string | null = null): Sessao {
  const inicio = new Date(inicioIso);
  const s = iniciarSessao(id, { disciplina_id: disciplina, tipo: 'Revisão', aula: '', lei_id: null }, inicio);
  return { ...concluir(finalizar(s, new Date(inicio.getTime() + minutos * 60_000)), { paginas: null, artigos: null, questoes: null, acertos: null }), posicao_ciclo: posicao };
}

describe('sessão anterior e horas da volta', () => {
  it('sessão anterior = concluída mais recente que começou antes', () => {
    const a = sessaoConcluida('a', 'D01', '2026-09-27T07:00:00Z', 30);
    const b = sessaoConcluida('b', 'D02', '2026-09-27T08:00:00Z', 30);
    const atual = iniciarSessao('c', { disciplina_id: 'D03', tipo: 'PDF', aula: '', lei_id: null }, new Date('2026-09-27T09:00:00Z'));
    expect(disciplinaDaSessaoAnterior(atual, [a, b, atual])).toBe('D02');
    expect(disciplinaDaSessaoAnterior(atual, [{ ...b, status: 'excluido' }, a])).toBe('D01');
    expect(disciplinaDaSessaoAnterior(a, [a])).toBeNull();
  });

  it('soma as horas de cada posição da volta atual, depois da geração', () => {
    const c = { ...ciclo(4, 4), gerado_em: '2026-09-01T00:00:00Z' };
    const lista = [
      sessaoConcluida('1', 'D01', '2026-09-27T07:00:00Z', 90, '4F1'),
      sessaoConcluida('2', 'D01', '2026-09-27T09:00:00Z', 30, '4F1'),
      sessaoConcluida('3', 'D02', '2026-09-27T10:00:00Z', 60, '4F2'),
      sessaoConcluida('4', 'D02', '2026-09-20T10:00:00Z', 60, '3F2'), // volta anterior
      sessaoConcluida('5', 'D02', '2026-08-20T10:00:00Z', 60, '4F2'), // antes da geração
    ];
    expect(horasFeitasNaVolta(c, lista)).toEqual([2, 1, 0, 0, 0, 0, 0, 0]);
  });
});

describe('edição manual (R19, R22)', () => {
  it('troca, move, inclui e remove posições', () => {
    let c = ciclo(1, 1);
    c = trocarDisciplina(c, 3, 'D05');
    expect(ids(c)[2]).toBe('D05');
    c = moverPosicao(c, 1, 1);
    expect(ids(c).slice(0, 2)).toEqual(['D02', 'D01']);
    expect(moverPosicao(c, 1, -1)).toBe(c);
    c = incluirPosicao(c, 'D03');
    expect(c.sequencia).toHaveLength(9);
    expect(c.sequencia[8]).toEqual({ disciplina_id: 'D03', duracao_prevista: 3.75 });
  });

  it('remover mantém o ponteiro na mesma disciplina seguinte', () => {
    const c = removerPosicao(ciclo(1, 5), 2); // tira D02 da posição 2; ponteiro estava em D05
    expect(ids(c)[c.ordem - 1]).toBe('D05');
    expect(removerPosicao(ciclo(1, 8), 8).ordem).toBe(1); // tirou a última onde estava o ponteiro
  });

  it('R22: ajuste manual do ponteiro, dentro dos limites', () => {
    expect([ajustarPonteiro(ciclo(), 5, 3).volta, ajustarPonteiro(ciclo(), 5, 3).ordem]).toEqual([5, 3]);
    expect(ajustarPonteiro(ciclo(), 0, 99).ordem).toBe(8);
    expect(ajustarPonteiro(ciclo(), 0, 99).volta).toBe(1);
  });
});
