import { describe, expect, it } from 'vitest';
import type { Sessao } from './tipos';
import {
  aplicarHorarios,
  concluidasDoDia,
  concluir,
  continuar,
  duracaoSegundos,
  erros,
  finalizar,
  fimAtual,
  formatarDuracao,
  formatarDuracaoCurta,
  iniciarSessao,
  juntarDataHora,
  leisDisponiveis,
  pausar,
  percentualAcerto,
  resumoProducao,
  sessaoAberta,
  sessoesSobrepostas,
  validarDadosFinais,
  validarHorarios,
  validarInicio,
} from './sessoes';
import { novaDisciplina } from './disciplinas';
import { novaLei } from './leis';

// Horários locais de um mesmo dia, para os testes ficarem legíveis
const h = (hora: string, dia = '2026-08-03') => juntarDataHora(dia, hora.slice(0, 5)).getTime() + (Number(hora.slice(6, 8) || 0) * 1000);
const em = (hora: string, dia?: string) => new Date(h(hora, dia));

const disc = novaDisciplina({ id: 'D01', nome: 'DIREITO CONSTITUCIONAL', total_paginas: 1064, total_horas_video: 70 });
const semTotais = novaDisciplina({ id: 'D09', nome: 'SEM TOTAIS' });
const lei = novaLei({ id: 'L01', disciplina_id: 'D01', nome: 'Lei 9.784/99', total_artigos: 70 });

function sessao(campos: Partial<Sessao> = {}, inicio = em('05:10:10')): Sessao {
  return { ...iniciarSessao('s1', { disciplina_id: 'D01', tipo: 'PDF', aula: ' Controle ', lei_id: null }, inicio), ...campos };
}

describe('cronômetro', () => {
  it('reproduz a 1ª linha da planilha: 05:10:10 → 06:31:28 com 45 s de pausa = 1,34 h', () => {
    let s = sessao();
    s = pausar(s, em('06:00:00'));
    s = continuar(s, em('06:00:45'));
    s = finalizar(s, em('06:31:28'));
    expect(s.segundos_pausados).toBe(45);
    expect(duracaoSegundos(s)).toBe(4833);
    expect(Math.round((duracaoSegundos(s) / 3600) * 100) / 100).toBe(1.34);
  });

  it('conta com o app fechado: em andamento, a duração é agora − início − pausas', () => {
    const s = sessao({ segundos_pausados: 60 });
    expect(duracaoSegundos(s, em('06:10:10'))).toBe(3600 - 60);
  });

  it('pausada: o relógio fica parado no início da pausa', () => {
    const s = pausar(sessao(), em('05:40:10'));
    expect(s.situacao).toBe('pausada');
    expect(duracaoSegundos(s, em('07:00:00'))).toBe(1800);
  });

  it('várias pausas somam', () => {
    let s = sessao();
    s = continuar(pausar(s, em('05:20:00')), em('05:25:00')); // 5 min
    s = continuar(pausar(s, em('05:30:00')), em('05:32:30')); // 2,5 min
    expect(s.segundos_pausados).toBe(450);
  });

  it('R5: finalizar congela o relógio — o tempo preenchendo os campos não conta', () => {
    const s = finalizar(sessao(), em('06:10:10'));
    expect(duracaoSegundos(s, em('06:20:00'))).toBe(3600);
    const c = concluir(s, { paginas: 30, artigos: 5, questoes: 3, acertos: 1 });
    expect(c.fim).toBe(s.pausado_desde);
    expect(c.pausado_desde).toBeNull();
    expect(c.situacao).toBe('concluida');
    expect(duracaoSegundos(c, em('23:00:00'))).toBe(3600);
  });

  it('R5: finalizar uma sessão pausada vale o instante em que a pausa começou', () => {
    const s = finalizar(pausar(sessao(), em('05:40:10')), em('06:30:00'));
    expect(s.situacao).toBe('finalizando');
    expect(duracaoSegundos(s)).toBe(1800);
  });

  it('voltar ao cronômetro depois de finalizar não conta o tempo parado', () => {
    let s = finalizar(sessao(), em('06:10:10'));
    s = continuar(s, em('06:15:10'));
    expect(s.situacao).toBe('andamento');
    expect(duracaoSegundos(s, em('06:20:10'))).toBe(3600 + 300);
  });

  it('só faz transições permitidas', () => {
    const concluida = { ...sessao(), situacao: 'concluida' as const };
    expect(pausar(concluida)).toBe(concluida);
    expect(continuar(sessao())).toEqual(sessao());
    expect(finalizar(concluida)).toBe(concluida);
    expect(concluir(sessao(), { paginas: 1, artigos: null, questoes: null, acertos: null }).situacao).toBe('andamento');
  });

  it('R6: grava só os números do tipo da sessão', () => {
    const q = finalizar(sessao({ tipo: 'Questões' }), em('06:00:00'));
    const c = concluir(q, { paginas: 30, artigos: 2, questoes: 20, acertos: 13 });
    expect([c.paginas, c.artigos, c.questoes, c.acertos]).toEqual([0, 0, 20, 13]);
    expect(erros(c)).toBe(7);
    expect(percentualAcerto(c)).toBe(65);
    expect(percentualAcerto({ questoes: 0, acertos: 0 })).toBe(0);
    expect(resumoProducao(c)).toBe('20 questões · 65%');
  });

  it('R6: acertos ≤ questões e números inteiros', () => {
    expect(validarDadosFinais('Questões', { paginas: null, artigos: null, questoes: 10, acertos: 11 })).toHaveLength(1);
    expect(validarDadosFinais('Questões', { paginas: null, artigos: null, questoes: 10, acertos: 10 })).toEqual([]);
    expect(validarDadosFinais('PDF', { paginas: 2.5, artigos: null, questoes: null, acertos: null })).toHaveLength(1);
    expect(validarDadosFinais('PDF', { paginas: null, artigos: null, questoes: null, acertos: null })).toEqual([]);
    expect(validarDadosFinais('VideoAula', { paginas: NaN, artigos: null, questoes: null, acertos: null })).toEqual([]);
  });

  it('formatos de duração', () => {
    expect(formatarDuracao(3725)).toBe('01:02:05');
    expect(formatarDuracao(-5)).toBe('00:00:00');
    expect(formatarDuracaoCurta(600)).toBe('10 min');
    expect(formatarDuracaoCurta(3725)).toBe('1h02');
  });
});

describe('iniciar (R1–R3)', () => {
  const base = { disciplina_id: 'D01', tipo: 'PDF' as const, aula: '', lei_id: null };

  it('R1: só uma sessão aberta', () => {
    expect(validarInicio(base, [disc], [], [sessao()])).toContain('Já existe uma sessão aberta. Finalize ou cancele antes de iniciar outra.');
    expect(validarInicio(base, [disc], [], [{ ...sessao(), situacao: 'concluida' }])).toEqual([]);
    expect(validarInicio(base, [disc], [], [{ ...sessao(), status: 'excluido' }])).toEqual([]);
  });

  it('exige disciplina ativa e tipo', () => {
    expect(validarInicio({ ...base, disciplina_id: 'X' }, [disc], [], [])).toEqual(['Escolha a disciplina.']);
    expect(validarInicio(base, [{ ...disc, ativa: false }], [], [])).toContain('Esta disciplina está inativa.');
    expect(validarInicio({ ...base, tipo: null }, [disc], [], [])).toEqual(['Escolha o tipo de estudo.']);
  });

  it('R3: PDF e VideoAula exigem os totais da disciplina; Revisão e Questões não', () => {
    const d = { ...base, disciplina_id: 'D09' };
    expect(validarInicio(d, [semTotais], [], [])).toHaveLength(1);
    expect(validarInicio({ ...d, tipo: 'VideoAula' }, [semTotais], [], [])).toHaveLength(1);
    expect(validarInicio({ ...d, tipo: 'Revisão' }, [semTotais], [], [])).toEqual([]);
    expect(validarInicio({ ...d, tipo: 'Questões' }, [semTotais], [], [])).toEqual([]);
  });

  it('R3: Lei Seca exige uma lei ativa da disciplina, com total de artigos', () => {
    const l = { ...base, tipo: 'Lei Seca' as const };
    expect(validarInicio(l, [disc], [lei], [])).toEqual(['Escolha a lei que será estudada.']);
    expect(validarInicio({ ...l, lei_id: 'L01' }, [disc], [lei], [])).toEqual([]);
    expect(validarInicio({ ...l, lei_id: 'L01' }, [disc], [{ ...lei, total_artigos: null }], [])).toHaveLength(1);
    expect(validarInicio({ ...l, lei_id: 'L01' }, [disc], [{ ...lei, ativa: false }], [])).toEqual(['Esta lei está inativa.']);
    expect(leisDisponiveis([lei, { ...lei, id: 'L02', ativa: false }], 'D01').map((x) => x.id)).toEqual(['L01']);
  });

  it('nova sessão começa agora, em andamento, com a aula sem espaços e sem lei fora da Lei Seca', () => {
    const s = iniciarSessao('n', { ...base, aula: '  ADI  ', lei_id: 'L01' }, em('07:00:00'));
    expect(s).toMatchObject({ situacao: 'andamento', aula: 'ADI', lei_id: null, segundos_pausados: 0, fim: null });
    expect(s.inicio).toBe(em('07:00:00').toISOString());
  });

  it('sessão aberta: vale a mais recente; concluídas e canceladas não contam', () => {
    const a = sessao({ id: 'a' }, em('05:00:00'));
    const b = sessao({ id: 'b' }, em('06:00:00'));
    expect(sessaoAberta([a, b])?.id).toBe('b');
    expect(sessaoAberta([{ ...a, situacao: 'concluida' }, { ...b, status: 'excluido' }])).toBeNull();
  });
});

describe('correção de horários (R10–R14)', () => {
  it('R10: início anterior na sessão aberta aumenta a duração na hora', () => {
    const s = sessao({}, em('07:00:00'));
    const agora = em('07:30:00');
    expect(validarHorarios(s, em('06:40:00'), null, agora)).toEqual([]);
    const c = aplicarHorarios(s, em('06:40:00'), null);
    expect(duracaoSegundos(c, agora)).toBe(50 * 60);
  });

  it('R13: início no futuro, fim antes do início e fim no futuro são recusados', () => {
    const s = sessao({}, em('07:00:00'));
    const agora = em('07:30:00');
    expect(validarHorarios(s, em('08:00:00'), null, agora)).toContain('O início não pode estar no futuro.');
    expect(validarHorarios(s, em('07:00:00'), em('06:50:00'), agora)).toContain('O fim precisa ser depois do início.');
    expect(validarHorarios(s, em('07:00:00'), em('09:00:00'), agora)).toContain('O fim não pode estar no futuro.');
    expect(validarHorarios(s, new Date('x'), null, agora)).toEqual(['Horário de início inválido.']);
  });

  it('R13: as pausas não podem ficar maiores que a sessão', () => {
    const s = sessao({ segundos_pausados: 600 }, em('07:00:00'));
    expect(validarHorarios(s, em('07:25:00'), null, em('07:30:00'))).toHaveLength(1);
    expect(validarHorarios(s, em('07:20:00'), null, em('07:30:00'))).toEqual([]);
    // pausada: o relógio parou em pausado_desde
    const p = pausar(s, em('07:15:00'));
    expect(validarHorarios(p, em('07:10:00'), null, em('08:00:00'))).toHaveLength(1);
  });

  it('R11: ao finalizar, corrigir o fim muda o relógio parado; na concluída, muda o fim', () => {
    const f = finalizar(sessao({}, em('07:00:00')), em('09:00:00'));
    expect(fimAtual(f)?.getTime()).toBe(h('09:00:00'));
    const corr = aplicarHorarios(f, em('07:00:00'), em('08:00:00'));
    expect(duracaoSegundos(corr)).toBe(3600);
    const c = concluir(corr, { paginas: 10, artigos: null, questoes: null, acertos: null });
    expect(c.fim).toBe(em('08:00:00').toISOString());
    const c2 = aplicarHorarios(c, em('07:30:00'), em('08:15:00'));
    expect(duracaoSegundos(c2)).toBe(45 * 60);
    expect(fimAtual(sessao())).toBeNull();
  });

  it('R14: detecta sobreposição com outras sessões concluídas', () => {
    const outra: Sessao = { ...sessao({ id: 'o' }, em('06:00:00')), situacao: 'concluida', fim: em('07:00:00').toISOString() };
    const s = sessao({}, em('07:10:00'));
    expect(sessoesSobrepostas(s, em('06:50:00'), em('07:30:00'), [outra, s]).map((x) => x.id)).toEqual(['o']);
    expect(sessoesSobrepostas(s, em('07:00:00'), em('07:30:00'), [outra])).toEqual([]); // encostar não é sobrepor
    expect(sessoesSobrepostas(s, em('06:50:00'), em('07:30:00'), [{ ...outra, status: 'excluido' }])).toEqual([]);
  });
});

describe('consultas', () => {
  it('concluídas do dia, da mais recente para a mais antiga', () => {
    const c = (id: string, inicio: Date): Sessao => ({ ...sessao({ id }, inicio), situacao: 'concluida', fim: inicio.toISOString() });
    const lista = [c('a', em('06:00:00')), c('b', em('09:00:00')), c('ontem', em('09:00:00', '2026-08-02')), sessao({ id: 'aberta' })];
    expect(concluidasDoDia(lista, em('12:00:00')).map((s) => s.id)).toEqual(['b', 'a']);
  });
});
