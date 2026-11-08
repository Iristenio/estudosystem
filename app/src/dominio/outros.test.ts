import { describe, expect, it } from 'vitest';
import {
  concluidasNoIntervalo,
  concluirOutra,
  intervaloOutros,
  ondeEstaMeuTempo,
  tempoPorArea,
  tempoPorDiaOutros,
  corLivre,
  cursosPorArea,
  iniciarOutra,
  lancarOutra,
  novoCurso,
  outraAberta,
  outrasConcluidas,
  podeExcluirCurso,
  mudarSituacao,
  situacaoDoCurso,
  tempoTotalDoCurso,
  validarCurso,
  validarInicioOutra,
} from './outros';
import { continuar, duracaoSegundos, finalizar, pausar } from './sessoes';

const python = novoCurso({ id: 'c1', area: 'Alura', nome: 'Python para Dados' });
const eng = novoCurso({ id: 'c2', area: 'Graduação', nome: 'Engenharia de Software' });
// registro antigo: só tinha "ativo" (sem situação)
const velho = { ...novoCurso({ id: 'c3', area: 'Alura', nome: 'Excel', ativo: false }), situacao: undefined };
const cursos = [python, eng, velho];
const t = (hhmm: string) => new Date(`2026-11-07T${hhmm}:00Z`);

describe('cursos (10.1, R49)', () => {
  it('validação: área, nome e nome único na área', () => {
    expect(validarCurso(novoCurso({ id: 'x', area: ' ', nome: '' }), cursos)).toHaveLength(2);
    expect(validarCurso(novoCurso({ id: 'x', area: 'alura', nome: 'PYTHON para dados' }), cursos)).toEqual(['Essa área já tem um curso com esse nome.']);
    expect(validarCurso(novoCurso({ id: 'x', area: 'Graduação', nome: 'Python para Dados' }), cursos)).toEqual([]);
  });

  it('curso novo pega uma cor ainda não usada', () => {
    expect(corLivre([])).toBe('#30503a');
    expect(corLivre([novoCurso({ id: 'a', cor: '#30503a' })])).toBe('#2e7d5b');
  });

  it('agrupa por área (ativos primeiro) e só apaga curso sem sessões', () => {
    expect(cursosPorArea(cursos).map((g) => [g.area, g.cursos.map((c) => c.id)])).toEqual([
      ['Alura', ['c1', 'c3']],
      ['Graduação', ['c2']],
    ]);
    expect(podeExcluirCurso('c1', [{ curso_id: 'c1', status: 'ativo' }])).toBe(false);
    expect(podeExcluirCurso('c1', [{ curso_id: 'c1', status: 'excluido' }])).toBe(true);
  });
});

describe('sessões de outros estudos (R45–R48)', () => {
  it('R51: situação do curso (registros antigos, mudar, validar)', () => {
    expect([situacaoDoCurso(python), situacaoDoCurso(velho)]).toEqual(['andamento', 'cancelado']); // "velho" só tem ativo: false
    const fim = mudarSituacao(python, 'concluido', '2026-11-08');
    expect([fim.situacao, fim.ativo, fim.concluido_em]).toEqual(['concluido', false, '2026-11-08']);
    expect(mudarSituacao(fim, 'concluido', '2026-12-01').concluido_em).toBe('2026-11-08'); // mantém a data
    expect(mudarSituacao(fim, 'pausado', '2026-12-01')).toMatchObject({ situacao: 'pausado', ativo: false, concluido_em: null });
    expect(validarCurso({ ...fim, concluido_em: '' }, [])).toEqual(['Informe a data de conclusão.']);
    const pausado = mudarSituacao(eng, 'pausado', '2026-11-08');
    expect(validarInicioOutra({ curso_id: 'c2', descricao: '' }, [pausado], false)).toEqual(['Este curso está pausado.']);
    expect(cursosPorArea([fim, pausado, velho, novoCurso({ id: 'n', area: 'Alura', nome: 'Zeta' })]).map((g) => g.cursos.map((c) => c.id))).toEqual([
      ['n', 'c1', 'c3'],
      ['c2'],
    ]);
  });

  it('tempo total do curso: todas as sessões concluídas', () => {
    const a = lancarOutra('ta', { curso_id: 'c1', descricao: '', inicio: t('08:00'), fim: t('09:30') }, cursos, t('12:00')).sessao!;
    const b = lancarOutra('tb', { curso_id: 'c2', descricao: '', inicio: t('10:00'), fim: t('11:00') }, cursos, t('12:00')).sessao!;
    expect(tempoTotalDoCurso([a, b, { ...a, id: 'tx', status: 'excluido' }], 'c1')).toBe(90 * 60);
  });

  it('iniciar exige curso em andamento e nenhuma sessão aberta', () => {
    expect(validarInicioOutra({ curso_id: 'c1', descricao: '' }, cursos, false)).toEqual([]);
    expect(validarInicioOutra({ curso_id: 'c3', descricao: '' }, cursos, false)).toEqual(['Este curso está cancelado.']);
    expect(validarInicioOutra({ curso_id: '', descricao: '' }, cursos, true)).toHaveLength(2);
  });

  it('o mesmo cronômetro: pausa, continua, finaliza e conclui sem campos extras', () => {
    let s = iniciarOutra('s1', { curso_id: 'c1', descricao: ' Aula 3 – Pandas ' }, t('10:00'));
    expect(s.descricao).toBe('Aula 3 – Pandas');
    s = pausar(s, t('10:30'));
    s = continuar(s, t('10:40'));
    s = finalizar(s, t('11:10'));
    expect(outraAberta([s])?.id).toBe('s1');
    const c = concluirOutra(s);
    expect([c.situacao, c.fim, duracaoSegundos(c)]).toEqual(['concluida', t('11:10').toISOString(), 60 * 60]);
    expect(outraAberta([c])).toBeNull();
  });

  it('R47: lançar à mão valida curso e horários', () => {
    const ok = lancarOutra('m1', { curso_id: 'c2', descricao: '', inicio: t('08:00'), fim: t('09:20') }, cursos, t('12:00'));
    expect([ok.erros, ok.sessao?.situacao, duracaoSegundos(ok.sessao!)]).toEqual([[], 'concluida', 80 * 60]);
    expect(lancarOutra('m2', { curso_id: 'c2', descricao: '', inicio: t('09:00'), fim: t('08:00') }, cursos, t('12:00')).erros).toEqual([
      'O fim precisa ser depois do início.',
    ]);
    expect(lancarOutra('m3', { curso_id: 'zz', descricao: '', inicio: t('08:00'), fim: t('09:00') }, cursos, t('12:00')).erros).toEqual(['Escolha o curso.']);
  });

  it('lista: só concluídas e não excluídas, mais recentes primeiro', () => {
    const a = lancarOutra('a', { curso_id: 'c1', descricao: '', inicio: t('08:00'), fim: t('09:00') }, cursos, t('12:00')).sessao!;
    const b = lancarOutra('b', { curso_id: 'c1', descricao: '', inicio: t('10:00'), fim: t('11:00') }, cursos, t('12:00')).sessao!;
    const aberta = iniciarOutra('c', { curso_id: 'c1', descricao: '' }, t('11:30'));
    expect(outrasConcluidas([a, b, aberta, { ...b, id: 'd', status: 'excluido' }]).map((s) => s.id)).toEqual(['b', 'a']);
  });
});

describe('acompanhamento (etapa 16)', () => {
  const local = (dia: number, h: number) => new Date(2026, 10, dia, h, 0, 0); // novembro de 2026 (dia 7 = sábado)
  const sessao = (id: string, curso: string, dia: number, h: number, minutos: number) =>
    lancarOutra(id, { curso_id: curso, descricao: '', inicio: local(dia, h), fim: new Date(local(dia, h).getTime() + minutos * 60e3) }, cursos, local(30, 0)).sessao!;
  const lista = [sessao('a', 'c1', 7, 8, 60), sessao('b', 'c1', 6, 8, 30), sessao('c', 'c2', 7, 10, 90), sessao('d', 'c2', 1, 10, 45)];

  it('períodos: a semana começa na segunda-feira', () => {
    expect(intervaloOutros('semana', local(7, 12))).toEqual({ de: '2026-11-02', ate: '2026-11-07' });
    expect(intervaloOutros('mes', local(7, 12))).toEqual({ de: '2026-11-01', ate: '2026-11-07' });
    expect(intervaloOutros('tudo', local(7, 12)).de).toBeNull();
    expect(intervaloOutros('hoje', local(7, 12))).toEqual({ de: '2026-11-07', ate: '2026-11-07' });
  });

  it('a sessão em andamento entra quando pedido, com o tempo até agora', () => {
    const aberta = iniciarOutra('ab', { curso_id: 'c1', descricao: '' }, local(7, 14));
    expect(concluidasNoIntervalo([...lista, aberta], '2026-11-07', '2026-11-07').map((s) => s.id).sort()).toEqual(['a', 'c']);
    const comAberta = concluidasNoIntervalo([...lista, aberta], '2026-11-07', '2026-11-07', true);
    expect(comAberta.map((s) => s.id).sort()).toEqual(['a', 'ab', 'c']);
    expect(tempoPorDiaOutros([...lista, aberta], 1, new Date(2026, 10, 7, 14, 30), true)[0].total / 60).toBe(150 + 30);
  });

  it('tempo por área e curso no período, e o Concurso × áreas com %', () => {
    const daSemana = concluidasNoIntervalo(lista, '2026-11-02', '2026-11-07');
    expect(daSemana.map((s) => s.id).sort()).toEqual(['a', 'b', 'c']);
    const areas = tempoPorArea(daSemana, cursos);
    expect(areas.map((a) => [a.area, a.segundos / 60, a.cursos.map((c) => c.curso_id)])).toEqual([
      ['Alura', 90, ['c1']],
      ['Graduação', 90, ['c2']],
    ]);
    expect(ondeEstaMeuTempo(3 * 3600, areas)).toEqual([
      { chave: 'concurso', rotulo: 'Concurso', segundos: 10800, percentual: 50 },
      { chave: 'area:Alura', rotulo: 'Alura', segundos: 5400, percentual: 25 },
      { chave: 'area:Graduação', rotulo: 'Graduação', segundos: 5400, percentual: 25 },
    ]);
    expect(ondeEstaMeuTempo(0, [])).toEqual([]);
  });

  it('tempo por dia: do mais recente para o mais antigo, com as partes de cada curso', () => {
    const dias = tempoPorDiaOutros(lista, 7, local(7, 23));
    expect(dias.map((d) => [d.dia, d.total / 60])).toEqual([
      ['2026-11-07', 150],
      ['2026-11-06', 30],
      ['2026-11-05', 0],
      ['2026-11-04', 0],
      ['2026-11-03', 0],
      ['2026-11-02', 0],
      ['2026-11-01', 45],
    ]);
    expect(dias[0].partes).toEqual([
      { curso_id: 'c1', segundos: 3600 },
      { curso_id: 'c2', segundos: 5400 },
    ]);
  });
});
