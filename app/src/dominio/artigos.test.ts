import { describe, expect, it } from 'vitest';
import type { Sessao } from './tipos';
import { artigosDiferentesLidos, artigosLidosDaLei, formatarFaixas, lerFaixas } from './artigos';
import { concluir, corrigirArtigos, finalizar, iniciarSessao, resumoProducao, validarDadosFinais } from './sessoes';

describe('lerFaixas (R25/R26)', () => {
  it('faixas e artigos soltos, em ordem e sem repetir', () => {
    expect(lerFaixas('1-3, 7, 5').artigos).toEqual([1, 2, 3, 5, 7]);
    expect(lerFaixas('1-5, 3-4, 5').artigos).toEqual([1, 2, 3, 4, 5]);
  });

  it('aceita "a", "até", ponto e vírgula, "e", espaços e "art."', () => {
    expect(lerFaixas('1 a 3; 10 até 11').artigos).toEqual([1, 2, 3, 10, 11]);
    expect(lerFaixas('arts. 1º a 3º e 5').artigos).toEqual([1, 2, 3, 5]);
    expect(lerFaixas('1 - 3   7 8').artigos).toEqual([1, 2, 3, 7, 8]);
    expect(lerFaixas('Art. 4°').artigos).toEqual([4]);
  });

  it('artigo com letra conta como o principal', () => {
    expect(lerFaixas('37-A').artigos).toEqual([37]);
    expect(lerFaixas('37A, 103-b').artigos).toEqual([37, 103]);
    expect(lerFaixas('5-A-7').artigos).toEqual([5, 6, 7]);
    expect(lerFaixas('5-10-A').artigos).toEqual([5, 6, 7, 8, 9, 10]);
  });

  it('faixa invertida e número com ponto de milhar', () => {
    expect(lerFaixas('10-8').artigos).toEqual([8, 9, 10]);
    expect(lerFaixas('1.000-1.002').artigos).toEqual([1000, 1001, 1002]);
  });

  it('erros: texto estranho, zero, além do total e vazio', () => {
    expect(lerFaixas('1-3, abc').erros).toEqual(['Não entendi "abc". Use números e faixas, como 1-10, 15.']);
    expect(lerFaixas('0-2').erros).toEqual(['Os artigos começam no 1.']);
    expect(lerFaixas('250-260', 253).erros).toEqual(['O artigo 260 não existe nesta lei (ela vai até o 253).']);
    expect(lerFaixas('  ').erros).toEqual(['Informe quais artigos foram lidos (ex.: 1-10, 15).']);
    expect(lerFaixas('253', 253).erros).toEqual([]);
  });
});

describe('formatarFaixas', () => {
  it('junta números seguidos', () => {
    expect(formatarFaixas([7, 1, 2, 3, 5, 8, 2])).toBe('1-3, 5, 7-8');
    expect(formatarFaixas([])).toBe('');
  });
});

/* ---------------- Sessões ---------------- */

const inicio = new Date('2026-10-13T08:00:00Z');
function sessaoLei(id: string, faixas: string, leiId = 'L1', minutos = 30): Sessao {
  const s = iniciarSessao(id, { disciplina_id: 'D1', tipo: 'Lei Seca', aula: '', lei_id: leiId }, inicio);
  return concluir(finalizar(s, new Date(inicio.getTime() + minutos * 60_000)), {
    paginas: null,
    artigos_lidos: faixas,
    questoes: null,
    acertos: null,
  });
}

describe('sessão de lei seca', () => {
  it('ao concluir, guarda as faixas arrumadas e a quantidade calculada', () => {
    const s = sessaoLei('s1', '15, 1 a 10, 37-A, 38');
    expect(s.artigos_lidos).toBe('1-10, 15, 37-38');
    expect(s.artigos).toBe(13);
    expect(resumoProducao(s)).toBe('13 artigos (1-10, 15, 37-38)');
  });

  it('validação usa o total da lei', () => {
    const dados = { paginas: null, artigos_lidos: '60-80', questoes: null, acertos: null };
    expect(validarDadosFinais('Lei Seca', dados, 70)).toEqual(['O artigo 80 não existe nesta lei (ela vai até o 70).']);
    expect(validarDadosFinais('Lei Seca', { ...dados, artigos_lidos: '' }, 70)).toHaveLength(1);
    expect(validarDadosFinais('PDF', { ...dados, artigos_lidos: '' })).toEqual([]);
  });

  it('outros tipos não guardam artigos', () => {
    const s = iniciarSessao('p', { disciplina_id: 'D1', tipo: 'PDF', aula: '', lei_id: null }, inicio);
    const c = concluir(finalizar(s, new Date(inicio.getTime() + 60_000)), { paginas: 3, artigos_lidos: '1-5', questoes: null, acertos: null });
    expect([c.artigos, c.artigos_lidos]).toEqual([0, '']);
  });

  it('R28 — corrigir as faixas recalcula a quantidade', () => {
    const c = corrigirArtigos(sessaoLei('s1', '1-10'), '1-4, 9');
    expect([c.artigos, c.artigos_lidos]).toEqual([5, '1-4, 9']);
  });
});

describe('artigos diferentes lidos (R29)', () => {
  const antiga = { ...sessaoLei('velha', '1'), artigos: 40, artigos_lidos: '' }; // importada: só a quantidade
  const sessoes = [sessaoLei('a', '1-10'), sessaoLei('b', '5-12'), sessaoLei('c', '1-3', 'L2'), antiga];

  it('reler não conta de novo; sessões sem faixas ficam de fora', () => {
    expect([...artigosLidosDaLei({ id: 'L1', total_artigos: 70 }, sessoes)]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('artigos acima do total atual da lei não contam', () => {
    expect(artigosLidosDaLei({ id: 'L1', total_artigos: 8 }, sessoes).size).toBe(8);
  });

  it('soma por lei', () => {
    expect(artigosDiferentesLidos([{ id: 'L1', total_artigos: 70 }, { id: 'L2', total_artigos: 20 }], sessoes)).toBe(15);
  });
});
