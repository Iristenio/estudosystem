import { describe, expect, it } from 'vitest';
import type { ItemMaterial } from './tipos';
import { novaDisciplina } from './disciplinas';
import {
  aplicarMaterial,
  cursosDoTipo,
  formatarMinutos,
  itensEscolhiveis,
  mapaDoMaterial,
  proximoItem,
  marcarEstudados,
  itensEntre,
  recentesPrimeiro,
  resumoDoMapaMaterial,
  tipoMaterialDaSessao,
  formatarTamanho,
  itensDaDisciplina,
  lancarItens,
  lerTamanhos,
  podeApagarItem,
  resumoDoTipo,
  rotuloItem,
  totaisDoMaterial,
  validarItem,
} from './material';
import { concluir, corrigirMateriais, finalizar, iniciarSessao } from './sessoes';

let seq = 0;
const gerarId = () => `m${++seq}`;
const item = (campos: Partial<ItemMaterial>): ItemMaterial => ({
  id: gerarId(),
  tipo: 'PDF',
  numero: 1,
  nome: '',
  curso: '',
  tamanho: 10,
  fora: false,
  ...campos,
});

describe('lançar rápido (R31)', () => {
  it('PDF: páginas separadas por vírgula, espaço, + ou ponto e vírgula', () => {
    expect(lerTamanhos('35, 42; 28 10+5', 'PDF').valores).toEqual([35, 42, 28, 10, 5]);
    expect(lerTamanhos('35,42', 'PDF').valores).toEqual([35, 42]);
    expect(lerTamanhos('35 págs, 12p', 'PDF').valores).toEqual([35, 12]);
  });

  it('vídeo: vírgula separa minutos de segundos (teclado numérico)', () => {
    expect(lerTamanhos('32,45', 'Video').valores).toEqual([32.75]);
    expect(lerTamanhos('32,5', 'Video').valores).toEqual([32.08]); // 32 min 5 s
    expect(lerTamanhos('32.45 28,10', 'Video').valores).toEqual([32.75, 28.17]);
    expect(lerTamanhos('32 , 45 + 40', 'Video').valores).toEqual([32.75, 40]);
    expect(lerTamanhos('1,05,30; 1:05:30', 'Video').valores).toEqual([65.5, 65.5]);
  });

  it('vídeo: minutos inteiros e 1h20', () => {
    expect(lerTamanhos('40 45min', 'Video').valores).toEqual([40, 45]);
    expect(lerTamanhos('1h20 1h 1h05', 'Video').valores).toEqual([80, 60, 65]);
  });

  it('erros: texto estranho, segundos ≥ 60, zero, vazio, PDF com fração e o antigo 2x30', () => {
    expect(lerTamanhos('35, abc', 'PDF').erros).toEqual(['Não entendi "abc". Use o número de páginas, como 35, 42.']);
    expect(lerTamanhos('32,75', 'Video').erros).toEqual(['Não entendi "32,75". Use minutos,segundos (32,45), minutos (40) ou 1h20.']);
    expect(lerTamanhos('0', 'Video').erros).toEqual(['"0" precisa ser maior que zero.']);
    expect(lerTamanhos('  ', 'Video').erros).toHaveLength(1);
    expect(lerTamanhos('10.5', 'PDF').erros).toHaveLength(1);
    expect(lerTamanhos('2x30', 'Video').erros).toHaveLength(1);
  });

  it('numera na sequência do curso; com nome, lança um item só', () => {
    let itens = lancarItens([], { tipo: 'Video', curso: 'TJCE', nome: '', valores: [30, 30, 40] }, gerarId);
    itens = lancarItens(itens, { tipo: 'Video', curso: 'TCU', nome: '', valores: [20] }, gerarId);
    itens = lancarItens(itens, { tipo: 'Video', curso: ' TJCE ', nome: ' Aula extra ', valores: [15, 99] }, gerarId);
    expect(itens.map((i) => `${i.curso}:${i.numero}:${i.tamanho}:${i.nome}`)).toEqual([
      'TJCE:1:30:',
      'TJCE:2:30:',
      'TJCE:3:40:',
      'TCU:1:20:',
      'TJCE:4:15:Aula extra',
    ]);
  });
});

describe('totais (R30, R32)', () => {
  const itens = [
    item({ tipo: 'PDF', tamanho: 35 }),
    item({ tipo: 'PDF', tamanho: 40, fora: true }),
    item({ tipo: 'Video', curso: 'TJCE', tamanho: 30 }),
    item({ tipo: 'Video', curso: 'TCU', tamanho: 45 }),
    item({ tipo: 'Video', curso: 'TCU', tamanho: 50 }),
  ];

  it('soma só o que conta: item fora e curso desligado ficam de fora', () => {
    expect(totaisDoMaterial(itens, ['TJCE'])).toEqual({ paginas: 35, minutos: 95, qtdPdf: 1, qtdVideo: 2 });
    expect(totaisDoMaterial(itens, ['TJCE', 'TCU']).minutos).toBeNull();
  });

  it('aplicar grava itens ordenados, descarta curso desligado que sumiu e recalcula os totais da disciplina', () => {
    const d = aplicarMaterial(novaDisciplina({ id: 'D1' }), itens, ['TJCE', 'NAO-EXISTE']);
    expect(d.total_paginas).toBe(35);
    expect(d.total_horas_video).toBe(1.5833);
    expect(d.cursos_fora).toEqual(['TJCE']);
    expect(d.materiais.map((i) => `${i.tipo}:${i.curso}`)).toEqual(['PDF:', 'PDF:', 'Video:TCU', 'Video:TCU', 'Video:TJCE']);
    expect(aplicarMaterial(d, [], []).total_paginas).toBeNull();
  });

  it('listas: último lançado primeiro, sem misturar tipos e cursos', () => {
    const lista = [item({ id: 'a1', numero: 1, curso: 'TCU' }), item({ id: 'b1', numero: 1, curso: 'TJCE' }), item({ id: 'a3', numero: 3, curso: 'TCU' }), item({ id: 'a2', numero: 2, curso: 'TCU' }), item({ id: 'v1', tipo: 'Video', numero: 1 })];
    expect(recentesPrimeiro(lista).map((i) => i.id)).toEqual(['a3', 'a2', 'a1', 'b1', 'v1']);
  });

  it('resumos e cursos', () => {
    expect(resumoDoTipo(itens, ['TJCE'], 'PDF')).toBe('35 págs. em 1 PDF');
    expect(resumoDoTipo(itens, [], 'Video')).toBe('2h05 em 3 vídeos');
    expect(resumoDoTipo([], [], 'Video')).toBeNull();
    expect(cursosDoTipo(itens, 'Video')).toEqual(['TCU', 'TJCE']);
  });
});

describe('total anterior (R34)', () => {
  it('sem material lançado, os totais antigos viram itens "Total anterior"', () => {
    const d = novaDisciplina({ id: 'D1', total_paginas: 412, total_horas_video: 11.5 });
    const itens = itensDaDisciplina(d);
    expect(itens.map((i) => [i.id, i.tipo, i.numero, i.nome, i.tamanho])).toEqual([
      ['anterior-pdf', 'PDF', 0, 'Total anterior', 412],
      ['anterior-video', 'Video', 0, 'Total anterior', 690],
    ]);
    expect(resumoDoTipo(itens, [], 'PDF')).toBe('412 págs. (total anterior)');
    expect(resumoDoTipo([...itens, item({ tamanho: 20 })], [], 'PDF')).toBe('432 págs. em 1 PDF + total anterior');
    // gravar de volta não muda os totais
    const gravada = aplicarMaterial(d, itens, []);
    expect([gravada.total_paginas, gravada.total_horas_video]).toEqual([412, 11.5]);
  });

  it('registro antigo sem o campo e disciplina sem totais', () => {
    const antiga = { ...novaDisciplina({ id: 'D1' }), materiais: undefined } as never;
    expect(itensDaDisciplina(antiga)).toEqual([]);
  });

  it('com material lançado, vale só o que foi lançado', () => {
    const d = { ...novaDisciplina({ id: 'D1', total_paginas: 412 }), materiais: [item({ tamanho: 20 })] };
    expect(itensDaDisciplina(d).map((i) => i.tamanho)).toEqual([20]);
  });
});

describe('edição de item', () => {
  const a = item({ numero: 1, curso: 'TCU' });
  const b = item({ numero: 2, curso: 'TCU' });

  it('número repetido no mesmo curso e tamanho inválido', () => {
    expect(validarItem({ ...b, numero: 1 }, [a, b])).toEqual(['Já existe PDF 1 neste curso.']);
    expect(validarItem({ ...b, numero: 1, curso: 'TJCE' }, [a, b])).toEqual([]);
    expect(validarItem({ ...b, tamanho: 0 }, [a, b])).toEqual(['Informe as páginas.']);
    expect(validarItem({ ...b, tamanho: 2.5 }, [a, b])).toEqual(['As páginas precisam ser um número inteiro.']);
  });

  it('R33 — só apaga item que nenhuma sessão usou', () => {
    expect(podeApagarItem(a.id, [{ materiais_estudados: [b.id] }, {}])).toBe(true);
    expect(podeApagarItem(a.id, [{ materiais_estudados: [a.id] }])).toBe(false);
  });

  it('textos', () => {
    expect(rotuloItem({ tipo: 'PDF', numero: 3, nome: 'Controle' })).toBe('PDF 3 · Controle');
    expect(rotuloItem({ tipo: 'Video', numero: 12, nome: '' })).toBe('Vídeo 12');
    expect(rotuloItem({ tipo: 'PDF', numero: 0, nome: 'Total anterior' })).toBe('Total anterior');
    expect(formatarMinutos(80)).toBe('1h20');
    expect(formatarMinutos(32.25)).toBe('32 min 15 s');
    expect(formatarTamanho({ tipo: 'PDF', tamanho: 1 })).toBe('1 pág.');
  });
});

describe('sessões e mapa do material (R36, R37)', () => {
  const p1 = item({ id: 'p1', numero: 1, curso: 'TCU' });
  const p2 = item({ id: 'p2', numero: 2, curso: 'TCU' });
  const p3 = item({ id: 'p3', numero: 3, curso: 'TCU' });
  const pFora = item({ id: 'pf', numero: 4, curso: 'TCU', fora: true });
  const velho = item({ id: 'v1', numero: 1, curso: 'TJCE' });
  const v = item({ id: 'vid', tipo: 'Video', numero: 1 });
  const itens = [p3, p1, p2, pFora, velho, v];
  const inicio = new Date('2026-10-13T08:00:00Z');
  const sessao = (id: string, tipo: 'PDF' | 'VideoAula' | 'Revisão', ids: string[], horas = 0) => {
    const quando = new Date(inicio.getTime() + horas * 3600e3);
    const s = iniciarSessao(id, { disciplina_id: 'D1', tipo, aula: '', lei_id: null }, quando);
    return concluir(finalizar(s, new Date(quando.getTime() + 600e3)), { paginas: 5, artigos_lidos: '', questoes: null, acertos: null, materiais_estudados: ids });
  };

  it('concluir guarda os itens só em PDF e VideoAula, sem repetir; corrigir troca a lista', () => {
    expect(sessao('a', 'PDF', ['p1', 'p1', 'p2']).materiais_estudados).toEqual(['p1', 'p2']);
    expect(sessao('b', 'Revisão', ['p1']).materiais_estudados).toEqual([]);
    expect(corrigirMateriais(sessao('c', 'PDF', ['p1']), ['p3']).materiais_estudados).toEqual(['p3']);
    expect(tipoMaterialDaSessao('VideoAula')).toBe('Video');
    expect(tipoMaterialDaSessao('Lei Seca')).toBeNull();
  });

  it('escolhíveis: só o que conta, em ordem, mais os já escolhidos; sem o "Total anterior"', () => {
    expect(itensEscolhiveis(itens, ['TJCE'], 'PDF').map((i) => i.id)).toEqual(['p1', 'p2', 'p3']);
    expect(itensEscolhiveis([...itens, item({ id: 'ant', numero: 0 })], ['TJCE'], 'PDF').map((i) => i.id)).toEqual(['p1', 'p2', 'p3']);
    expect(itensEscolhiveis(itens, ['TJCE'], 'PDF', ['v1']).map((i) => i.id)).toEqual(['p1', 'p2', 'p3', 'v1']);
  });

  it('mapa conta sessões por item e guarda a mais recente', () => {
    const sessoes = [sessao('a', 'PDF', ['p1']), sessao('b', 'PDF', ['p1', 'p2'], 5), { ...sessao('c', 'PDF', []), materiais_estudados: undefined } as never];
    const mapa = mapaDoMaterial(itens.filter((i) => i.tipo === 'PDF'), sessoes);
    expect(mapa.map((m) => `${m.item.id}:${m.vezes}`)).toEqual(['p1:2', 'p2:1', 'p3:0', 'pf:0', 'v1:0']);
    expect(mapa[0].ultima).toBe(new Date(inicio.getTime() + 5 * 3600e3).toISOString());
    expect(resumoDoMapaMaterial(mapa, ['TJCE'])).toEqual({ total: 3, estudados: 2, revistos: 1, nunca: 1, percentual: 66.7 });
  });

  it('R38 — marcado à mão conta no mapa e no próximo, sem sessão', () => {
    const lista = [p1, p2, p3];
    const ids = itensEntre(lista, 'p2', 'p1');
    expect(ids).toEqual(['p1', 'p2']);
    const marcados = marcarEstudados(itens, ids, true);
    const mapa = mapaDoMaterial(marcados.filter((i) => i.tipo === 'PDF'), []);
    expect(mapa.slice(0, 3).map((m) => [m.item.id, m.vezes, m.manual, m.estudado])).toEqual([
      ['p1', 0, true, true],
      ['p2', 0, true, true],
      ['p3', 0, false, false],
    ]);
    expect(resumoDoMapaMaterial(mapa, ['TJCE']).estudados).toBe(2);
    expect(proximoItem(marcados, ['TJCE'], 'PDF', [])?.id).toBe('p3');
    // sessão mais recente revisou o p1, mas o mais adiante estudado é o p2 (à mão)
    expect(proximoItem(marcados, ['TJCE'], 'PDF', [sessao('r', 'PDF', ['p1'])])?.id).toBe('p3');
    // desmarcar volta ao normal
    expect(proximoItem(marcarEstudados(marcados, ['p1', 'p2'], false), ['TJCE'], 'PDF', [])?.id).toBe('p1');
  });

  it('próximo item: depois do último marcado; no fim, o primeiro nunca estudado', () => {
    expect(proximoItem(itens, ['TJCE'], 'PDF', [])?.id).toBe('p1');
    expect(proximoItem(itens, ['TJCE'], 'PDF', [sessao('a', 'PDF', ['p1', 'p2'])])?.id).toBe('p3');
    expect(proximoItem(itens, ['TJCE'], 'PDF', [sessao('a', 'PDF', ['p2'], 1), sessao('b', 'PDF', ['p3'], 2)])?.id).toBe('p1');
    expect(proximoItem(itens, ['TJCE'], 'PDF', [sessao('a', 'PDF', ['p1', 'p2', 'p3'])])).toBeNull();
    expect(proximoItem([], [], 'Video', [])).toBeNull();
  });
});
