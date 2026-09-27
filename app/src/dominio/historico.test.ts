import { describe, expect, it } from 'vitest';
import type { Sessao } from './tipos';
import { agruparPorDia, FILTRO_PADRAO, filtrarSessoes, intervaloDoPeriodo, totalizar, type Filtro } from './historico';
import { concluir, finalizar, iniciarSessao, juntarDataHora } from './sessoes';

let seq = 0;
/** Sessão concluída: dia, hora de início, minutos de duração e campos extras. */
function concluida(dia: string, hora: string, minutos: number, campos: Partial<Sessao> = {}): Sessao {
  const inicio = juntarDataHora(dia, hora);
  const s = iniciarSessao(`s${++seq}`, { disciplina_id: 'D01', tipo: 'PDF', aula: '', lei_id: null }, inicio);
  const c = concluir(finalizar({ ...s, ...campos }, new Date(inicio.getTime() + minutos * 60_000)), {
    paginas: campos.paginas ?? 0,
    artigos: campos.artigos ?? 0,
    questoes: campos.questoes ?? 0,
    acertos: campos.acertos ?? 0,
  });
  return c;
}

const agora = juntarDataHora('2026-09-27', '12:00'); // domingo
const f = (campos: Partial<Filtro>): Filtro => ({ ...FILTRO_PADRAO, ...campos });

describe('períodos', () => {
  it('calcula os intervalos a partir de hoje', () => {
    expect(intervaloDoPeriodo(f({ periodo: 'hoje' }), agora)).toEqual({ de: '2026-09-27', ate: '2026-09-27' });
    expect(intervaloDoPeriodo(f({ periodo: '7dias' }), agora)).toEqual({ de: '2026-09-21', ate: '2026-09-27' });
    expect(intervaloDoPeriodo(f({ periodo: '30dias' }), agora)).toEqual({ de: '2026-08-29', ate: '2026-09-27' });
    expect(intervaloDoPeriodo(f({ periodo: 'mes' }), agora)).toEqual({ de: '2026-09-01', ate: '2026-09-27' });
    expect(intervaloDoPeriodo(f({ periodo: 'mesPassado' }), agora)).toEqual({ de: '2026-08-01', ate: '2026-08-31' });
    expect(intervaloDoPeriodo(f({ periodo: 'tudo' }), agora)).toEqual({ de: null, ate: null });
    expect(intervaloDoPeriodo(f({ periodo: '90dias' }), agora)).toEqual({ de: '2026-06-30', ate: '2026-09-27' });
    expect(intervaloDoPeriodo(f({ periodo: 'ano' }), agora)).toEqual({ de: '2026-01-01', ate: '2026-09-27' });
    expect(intervaloDoPeriodo(f({ periodo: 'personalizado', de: '2026-08-03' }), agora)).toEqual({ de: '2026-08-03', ate: null });
  });
});

describe('filtro', () => {
  const a = concluida('2026-09-27', '07:00', 30, { disciplina_id: 'D01', tipo: 'PDF', paginas: 12 });
  const b = concluida('2026-09-27', '09:00', 20, { disciplina_id: 'D02', tipo: 'Questões', questoes: 10, acertos: 7 });
  const c = concluida('2026-08-31', '07:00', 60, { disciplina_id: 'D01', tipo: 'VideoAula' });
  const aberta = iniciarSessao('aberta', { disciplina_id: 'D01', tipo: 'PDF', aula: '', lei_id: null }, agora);
  const cancelada = { ...concluida('2026-09-27', '10:00', 10), status: 'excluido' as const };
  const todas = [c, a, aberta, b, cancelada];

  it('só concluídas e não canceladas, da mais recente para a mais antiga', () => {
    expect(filtrarSessoes(todas, f({ periodo: 'tudo' }), agora).map((s) => s.id)).toEqual([b.id, a.id, c.id]);
  });

  it('por disciplina, tipo e período', () => {
    expect(filtrarSessoes(todas, f({ periodo: 'tudo', disciplina_id: 'D01' }), agora)).toEqual([a, c]);
    expect(filtrarSessoes(todas, f({ periodo: 'tudo', tipo: 'Questões' }), agora)).toEqual([b]);
    expect(filtrarSessoes(todas, f({ periodo: 'hoje' }), agora)).toEqual([b, a]);
    expect(filtrarSessoes(todas, f({ periodo: 'mesPassado' }), agora)).toEqual([c]);
    expect(filtrarSessoes(todas, f({ periodo: 'personalizado', de: '2026-09-01', ate: '2026-09-30' }), agora)).toEqual([b, a]);
  });

  it('totais do filtro', () => {
    const t = totalizar([a, b, c]);
    expect(t).toMatchObject({ sessoes: 3, segundos: 110 * 60, paginas: 12, questoes: 10, acertos: 7, percentual: 70 });
    expect(totalizar([a]).percentual).toBeNull();
    expect(totalizar([]).segundos).toBe(0);
  });

  it('agrupa por dia com o total de cada dia', () => {
    const grupos = agruparPorDia(filtrarSessoes(todas, f({ periodo: 'tudo' }), agora));
    expect(grupos.map((g) => [g.dia, g.sessoes.length, g.segundos / 60])).toEqual([
      ['2026-09-27', 2, 50],
      ['2026-08-31', 1, 60],
    ]);
  });
});
