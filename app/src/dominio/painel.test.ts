import { describe, expect, it } from 'vitest';
import type { Sessao } from './tipos';
import { acompanhamento, horasPorDia, horasPorMes, indicadores, primeiroDia, serieDoPeriodo, tempoPorDisciplina, tempoPorTipo } from './painel';
import { concluir, finalizar, iniciarSessao, juntarDataHora } from './sessoes';
import { disciplinasIniciais, leisIniciais } from './dadosIniciais';
import { novaLei } from './leis';

let seq = 0;
function sessao(dia: string, minutos: number, campos: Partial<Sessao> = {}): Sessao {
  const inicio = juntarDataHora(dia, '07:00');
  const s = { ...iniciarSessao(`s${++seq}`, { disciplina_id: 'D01', tipo: 'Revisão', aula: '', lei_id: null }, inicio), ...campos };
  return concluir(finalizar(s, new Date(inicio.getTime() + minutos * 60_000)), {
    paginas: campos.paginas ?? null,
    artigos: campos.artigos ?? null,
    questoes: campos.questoes ?? null,
    acertos: campos.acertos ?? null,
  });
}

const pdf = sessao('2026-09-20', 60, { tipo: 'PDF', paginas: 30 }); // 2 min/página
const pdf2 = sessao('2026-09-21', 30, { tipo: 'PDF', paginas: 10, disciplina_id: 'D02' }); // total: 90 min / 40 págs = 2,25
const q = sessao('2026-09-21', 15, { tipo: 'Questões', questoes: 20, acertos: 13 }); // 0,75 min/questão
const video = sessao('2026-08-10', 90, { tipo: 'VideoAula', disciplina_id: 'D02' });
const lei = sessao('2026-09-22', 40, { tipo: 'Lei Seca', disciplina_id: 'D03', lei_id: 'L01', artigos: 14 });
const todas = [pdf, pdf2, q, video, lei];

describe('indicadores gerais', () => {
  it('totais, médias e minutos por página/questão (como na planilha)', () => {
    const i = indicadores(todas);
    expect(i.segundos).toBe(235 * 60);
    expect(i.sessoes).toBe(5);
    expect(i.mediaSegundos).toBe(47 * 60);
    expect(i.paginas).toBe(40);
    expect(i.minutosPorPagina).toBe(2.25);
    expect(i.questoes).toBe(20);
    expect(i.acertos).toBe(13);
    expect(i.percentualAcerto).toBe(65);
    expect(i.minutosPorQuestao).toBe(0.75);
    expect(i.horasVideo).toBe(1.5);
    expect(i.artigos).toBe(14);
    expect(i.ultima?.id).toBe(lei.id);
  });

  it('sem sessões: zeros e "sem dado" (null)', () => {
    const i = indicadores([]);
    expect([i.segundos, i.mediaSegundos, i.minutosPorPagina, i.percentualAcerto, i.ultima]).toEqual([0, 0, null, null, null]);
  });
});

describe('séries no tempo', () => {
  it('horas por dia com zero nos dias sem estudo', () => {
    expect(horasPorDia(todas, '2026-09-19', '2026-09-22').map((p) => [p.chave, p.segundos / 60])).toEqual([
      ['2026-09-19', 0],
      ['2026-09-20', 60],
      ['2026-09-21', 45],
      ['2026-09-22', 40],
    ]);
  });

  it('horas por mês, atravessando o ano', () => {
    expect(horasPorMes(todas, '2026-07-15', '2026-09-27').map((p) => [p.chave, p.segundos / 60])).toEqual([
      ['2026-07', 0],
      ['2026-08', 90],
      ['2026-09', 145],
    ]);
    expect(horasPorMes([], '2025-12-01', '2026-01-31').map((p) => p.chave)).toEqual(['2025-12', '2026-01']);
  });

  it('até 62 dias por dia; acima disso por mês', () => {
    expect(serieDoPeriodo(todas, '2026-08-29', '2026-09-27').granularidade).toBe('dia');
    expect(serieDoPeriodo(todas, '2026-06-30', '2026-09-27').granularidade).toBe('mes');
    expect(primeiroDia(todas)).toBe('2026-08-10');
    expect(primeiroDia([])).toBeNull();
  });
});

describe('distribuições', () => {
  it('tempo por disciplina (maior primeiro) e por tipo (sem os zerados)', () => {
    const porDisc = tempoPorDisciplina(todas, disciplinasIniciais());
    expect(porDisc.map((x) => [x.id, x.segundos / 60])).toEqual([
      ['D02', 120],
      ['D01', 75],
      ['D03', 40],
    ]);
    expect(porDisc[0].disciplina?.nome).toBe('REDES DE COMPUTADORES');
    // PDF e Videoaula empatam (90 min): vale a ordem fixa dos tipos
    expect(tempoPorTipo(todas).map((x) => x.tipo)).toEqual(['PDF', 'VideoAula', 'Lei Seca', 'Questões']);
  });
});

describe('acompanhamento por disciplina', () => {
  const ds = disciplinasIniciais();
  it('uma linha por disciplina ativa, com os percentuais da planilha', () => {
    const linhas = acompanhamento(ds, leisIniciais(), todas);
    expect(linhas).toHaveLength(5);
    const d01 = linhas[0];
    expect(d01.paginasLidas).toBe(30);
    expect(d01.percentualPaginas).toBe(2.82); // 30 / 1064
    expect(d01.questoes).toBe(20);
    expect(d01.percentualAcerto).toBe(65);
    expect(d01.minutosPorPagina).toBe(2);
    expect(d01.totalArtigos).toBeNull(); // sem leis → "—"
    const d02 = linhas[1];
    expect(d02.horasVideo).toBe(1.5);
    expect(d02.percentualVideo).toBe(3.75); // 1,5 / 40
    const d03 = linhas[2];
    expect([d03.artigosLidos, d03.totalArtigos, d03.percentualLeiSeca]).toEqual([14, 70, 20]);
  });

  it('lei ativa sem total de artigos deixa o total "—"; inativas ficam de fora', () => {
    const leis = [...leisIniciais(), novaLei({ id: 'L02', disciplina_id: 'D03', nome: 'Lei 8.112', total_artigos: null })];
    expect(acompanhamento(ds, leis, todas)[2].totalArtigos).toBeNull();
    const semD05 = ds.map((d) => (d.id === 'D05' ? { ...d, ativa: false } : d));
    expect(acompanhamento(semD05, [], todas).map((l) => l.disciplina.id)).toEqual(['D01', 'D02', 'D03', 'D04']);
  });
});
