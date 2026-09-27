import { describe, expect, it } from 'vitest';
import {
  categoriasUsadas,
  mesmoNome,
  moverDisciplina,
  normalizarDisciplina,
  novaDisciplina,
  ordenarDisciplinas,
  podeExcluirDisciplina,
  proximaOrdem,
  validarDisciplina,
} from './disciplinas';
import { leisPorDisciplina, novaLei, podeExcluirLei, validarLei } from './leis';
import { lerNumero, mostrarNumero } from './numeros';
import { disciplinasIniciais, leisIniciais } from './dadosIniciais';

const disc = (id: string, campos = {}) => novaDisciplina({ id, nome: id, ...campos });

describe('disciplinas', () => {
  it('exige nome, e o nome não pode repetir (ignorando maiúsculas e acentos)', () => {
    const lp = disc('a', { nome: 'LÍNGUA PORTUGUESA' });
    expect(validarDisciplina(disc('b', { nome: '  ' }), [])).toContain('Informe o nome da disciplina.');
    expect(validarDisciplina(disc('b', { nome: 'lingua portuguesa ' }), [lp])).toContain('Já existe uma disciplina com esse nome.');
    // a própria disciplina e as excluídas não contam
    expect(validarDisciplina(lp, [lp])).toEqual([]);
    expect(validarDisciplina(disc('b', { nome: 'Língua Portuguesa' }), [{ ...lp, status: 'excluido' }])).toEqual([]);
    expect(mesmoNome('Redes', ' REDES ')).toBe(true);
  });

  it('peso inteiro ≥ 1; totais positivos quando informados; totais vazios são aceitos', () => {
    expect(validarDisciplina(disc('a', { peso: 0 }), [])).toHaveLength(1);
    expect(validarDisciplina(disc('a', { peso: 1.5 }), [])).toHaveLength(1);
    expect(validarDisciplina(disc('a', { total_paginas: 0 }), [])).toHaveLength(1);
    expect(validarDisciplina(disc('a', { total_paginas: NaN }), [])).toHaveLength(1);
    expect(validarDisciplina(disc('a', { total_horas_video: -2 }), [])).toHaveLength(1);
    expect(validarDisciplina(disc('a', { total_paginas: null, total_horas_video: 36.5 }), [])).toEqual([]);
    // sem PDF, o total de páginas não é validado (e é apagado ao normalizar)
    expect(validarDisciplina(disc('a', { possui_pdf: false, total_paginas: 0 }), [])).toEqual([]);
    expect(normalizarDisciplina(disc('a', { possui_pdf: false, total_paginas: 10 })).total_paginas).toBeNull();
  });

  it('normaliza nome e categoria em maiúsculas', () => {
    const d = normalizarDisciplina(disc('a', { nome: '  direito penal ', categoria: 'núcleo comum' }));
    expect(d.nome).toBe('DIREITO PENAL');
    expect(d.categoria).toBe('NÚCLEO COMUM');
  });

  it('ordena por ordem, sem as excluídas, e calcula a próxima ordem', () => {
    const lista = [disc('c', { ordem: 3 }), disc('a', { ordem: 1 }), disc('x', { ordem: 9, status: 'excluido' }), disc('b', { ordem: 2 })];
    expect(ordenarDisciplinas(lista).map((d) => d.id)).toEqual(['a', 'b', 'c']);
    expect(proximaOrdem(lista)).toBe(4);
    expect(proximaOrdem([])).toBe(1);
  });

  it('mover troca de posição, renumera e devolve só as que mudaram', () => {
    const lista = [disc('a', { ordem: 1 }), disc('b', { ordem: 2 }), disc('c', { ordem: 3 })];
    const mudou = moverDisciplina(lista, 'c', -1);
    expect(mudou.map((d) => [d.id, d.ordem])).toEqual([['c', 2], ['b', 3]]);
    expect(moverDisciplina(lista, 'a', -1)).toEqual([]); // já é a primeira
    expect(moverDisciplina(lista, 'c', 1)).toEqual([]); // já é a última
    // ordens "com buracos" (ex.: 1, 5, 9) são arrumadas para 1, 2, 3
    const buracos = [disc('a', { ordem: 1 }), disc('b', { ordem: 5 }), disc('c', { ordem: 9 })];
    expect(moverDisciplina(buracos, 'a', 1).map((d) => [d.id, d.ordem])).toEqual([['b', 1], ['a', 2], ['c', 3]]);
  });

  it('categorias usadas, sem repetir', () => {
    expect(categoriasUsadas([disc('a', { categoria: 'B' }), disc('b', { categoria: 'A' }), disc('c', { categoria: 'B' }), disc('d')])).toEqual(['A', 'B']);
  });

  it('R23: só pode excluir disciplina sem sessões', () => {
    expect(podeExcluirDisciplina('a', [])).toBe(true);
    expect(podeExcluirDisciplina('a', [{ disciplina_id: 'b' }])).toBe(true);
    expect(podeExcluirDisciplina('a', [{ disciplina_id: 'a' }])).toBe(false);
  });
});

describe('leis', () => {
  const d1 = disc('D1');
  const d2 = disc('D2', { ordem: 2 });
  const lei = (id: string, campos = {}) => novaLei({ id, disciplina_id: 'D1', nome: id, ...campos });

  it('exige disciplina existente e nome; nome não repete na mesma disciplina', () => {
    expect(validarLei(lei('a', { disciplina_id: 'X' }), [], [d1])).toContain('Escolha a disciplina.');
    expect(validarLei(lei('a', { nome: '' }), [], [d1])).toContain('Informe o nome da lei.');
    const existente = lei('b', { nome: 'Lei 8.112/90' });
    expect(validarLei(lei('a', { nome: 'lei 8.112/90' }), [existente], [d1])).toHaveLength(1);
    expect(validarLei(lei('a', { nome: 'lei 8.112/90', disciplina_id: 'D2' }), [existente], [d1, d2])).toEqual([]);
  });

  it('total de artigos: vazio ou inteiro positivo', () => {
    expect(validarLei(lei('a', { total_artigos: 0 }), [], [d1])).toHaveLength(1);
    expect(validarLei(lei('a', { total_artigos: 70 }), [], [d1])).toEqual([]);
  });

  it('agrupa por disciplina, na ordem das disciplinas', () => {
    const grupos = leisPorDisciplina([lei('z', { disciplina_id: 'D2' }), lei('Lei 10'), lei('Lei 9'), lei('x', { status: 'excluido' })], [d1, d2]);
    expect(grupos.map((g) => [g.disciplina.id, g.leis.map((l) => l.id)])).toEqual([['D1', ['Lei 9', 'Lei 10']], ['D2', ['z']]]);
  });

  it('R23: só pode excluir lei sem sessões', () => {
    expect(podeExcluirLei('L1', [{ lei_id: null }])).toBe(true);
    expect(podeExcluirLei('L1', [{ lei_id: 'L1' }])).toBe(false);
  });
});

describe('números digitados', () => {
  it('aceita vírgula ou ponto; vazio vira null; texto inválido vira NaN', () => {
    expect(lerNumero('36,5')).toBe(36.5);
    expect(lerNumero(' 1064 ')).toBe(1064);
    expect(lerNumero('')).toBeNull();
    expect(lerNumero('abc')).toBeNaN();
    expect(mostrarNumero(36.5)).toBe('36,5');
    expect(mostrarNumero(1064)).toBe('1064');
    expect(mostrarNumero(null)).toBe('');
  });
});

describe('dados iniciais (da planilha)', () => {
  it('são válidos e usam os ids da planilha', () => {
    const ds = disciplinasIniciais();
    expect(ds.map((d) => d.id)).toEqual(['D01', 'D02', 'D03', 'D04', 'D05']);
    ds.forEach((d) => expect(validarDisciplina(d, ds)).toEqual([]));
    const ls = leisIniciais();
    ls.forEach((l) => expect(validarLei(l, ls, ds)).toEqual([]));
    // pesos 2, 2, 1, 2, 1 → soma 8 (ciclo de 30 h = 3,75 h por vez)
    expect(ds.reduce((s, d) => s + d.peso, 0)).toBe(8);
  });
});
