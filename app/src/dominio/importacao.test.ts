import { describe, expect, it } from 'vitest';
import { converterPlanilhaAntiga, extrairIdPlanilha, resumirImportacao, type AbasLidas } from './importacao';
import { duracaoSegundos } from './sessoes';
import { validarDisciplina } from './disciplinas';

// Recorte fiel da planilha EstudoSystem (valores como aparecem na tela)
const CAB_CRONOGRAMA = ['DIA', 'DATA_INICIO', 'MÊS', 'DISCIPLINA', 'TIPO', 'AULA', 'LEI_ID', 'HORA_INICIO', 'HORA_FIM', 'DURAÇÃO', 'PÁGINAS', 'ARTIGOS_LIDOS', 'QUEST.', 'ACERT.', 'ERR.', '%ACERT', 'STATUS', 'CRON_ID', 'DURAÇÃO_HHMM', 'SEGUNDOS_PAUSADOS', 'PAUSADO_DESDE'];
const abas: AbasLidas = {
  Config_Disciplinas: [
    ['ID', 'NOME', 'CATEGORIA', 'ATIVA', 'ORDEM', 'PESO', 'POSSUI_PDF', 'TOTAL_PAGINAS', 'POSSUI_VIDEO', 'TOTAL_HORAS_VIDEO', 'COR', 'OBSERVACOES'],
    ['D01', 'DIREITO CONSTITUCIONAL', 'NÚCLEO COMUM', 'TRUE', '1', '2', 'TRUE', '1.064', 'TRUE', '70', '#ba9121', 'VÍDEO: Preparação Total - Controle 2026 (Código: 205052)'],
    ['D02', 'REDES DE COMPUTADORES', 'NÚCLEO TÉCNICO', 'TRUE', '2', '2', 'TRUE', '757', 'TRUE', '40', '#e3f028', ''],
    ['D03', 'DIREITO ADMINISTRATIVO', 'NÚCLEO COMUM', 'TRUE', '3', '1', 'TRUE', '1344', 'TRUE', '59', '#5a74dd', ''],
    ['D04', 'BANCO DE DADOS', 'NÚCLEO TÉCNICO', 'TRUE', '4', '2', 'TRUE', '605', 'TRUE', '36', '#e7ea39', ''],
    ['D05', 'LÍNGUA PORTUGUESA', 'NÚCLEO COMUM', 'FALSE', '5', '1', 'TRUE', '503', 'TRUE', '47', '#dabe34', ''],
    ['', '', '', 'FALSE', '', '', 'FALSE', '', 'FALSE', '', '', ''],
  ],
  Leis: [
    ['LEI_ID', 'DISCIPLINA_ID', 'NOME_LEI', 'TOTAL_ARTIGOS', 'ATIVA', 'DESCRICAO'],
    ['L01', 'D03', 'Lei 9.784/99 - Processo Administrativo', '70', 'TRUE', 'Regula o processo administrativo.'],
  ],
  Config_Ciclo: [
    ['CAMPO', 'VALOR'],
    ['HORAS_TOTAIS_CICLO', '30'],
    ['PROXIMO_CRON_ID', '4F4'],
  ],
  Ciclo_Atual: [
    ['ORDEM', 'DISCIPLINA_ID', 'DURACAO_PREVISTA'],
    ['2', 'D02', '3,75'],
    ['1', 'D01', '3,75'],
    ['3', 'D03', '3,75'],
  ],
  Cronograma: [
    CAB_CRONOGRAMA,
    ['Segunda-feira', '03/08/2026', '8', 'DIREITO CONSTITUCIONAL', 'PDF', 'Controle de Constitucionalidade - Conceitos e Modelos', '', '05:10:10', '06:31:28', '1,34', '30', '0', '0', '0', '0', '0', 'CONCLUÍDO', '1F1', '01:21:00', '45', ''],
    ['Domingo', '16/08/2026', '8', 'DIREITO CONSTITUCIONAL', 'Questões', 'Controle de Constitucionalidade', '', '08:49:12', '08:59:23', '0,17', '0', '0', '10', '4', '6', '40', 'CONCLUÍDO', '1F6', '00:10:00', '0', ''],
    ['Quarta-feira', '26/08/2026', '8', 'DIREITO CONSTITUCIONAL', 'VideoAula', 'Controle concentrado - estadual/distrital', '', '19:00:55', '19:57:43', '0,91', '0', '0', '0', '0', '0', '0', 'CONCLUÍDO', '3F2', '00:55', '120', ''],
    ['Sábado', '05/09/2026', '9', 'DIREITO ADMINISTRATIVO', 'Lei Seca', '', 'L01', '23:40:00', '00:20:00', '0,67', '0', '15', '0', '0', '0', '0', 'CONCLUÍDO', '3F3', '', '0', ''],
    ['Domingo', '06/09/2026', '9', 'DIREITO PENAL', 'PDF', '', '', '07:00:00', '08:00:00', '1,00', '10', '0', '0', '0', '0', '0', 'CONCLUÍDO', '3F4', '', '0', ''],
    ['Domingo', '27/09/2026', '9', 'BANCO DE DADOS', 'PDF', '', '', '07:00:00', '', '', '', '', '', '', '', '', 'EM ANDAMENTO', '', '', '0', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ],
};

const agora = new Date('2026-09-27T12:00:00Z');

describe('endereço da planilha', () => {
  it('aceita o link completo ou só o id', () => {
    expect(extrairIdPlanilha('https://docs.google.com/spreadsheets/d/10AncPMLLthN3orft5cdJ6UW0-G9OeXmyWQUIaJOKCIU/edit?gid=1430134022#gid=1430134022')).toBe('10AncPMLLthN3orft5cdJ6UW0-G9OeXmyWQUIaJOKCIU');
    expect(extrairIdPlanilha(' 10AncPMLLthN3orft5cdJ6UW0-G9OeXmyWQUIaJOKCIU ')).toBe('10AncPMLLthN3orft5cdJ6UW0-G9OeXmyWQUIaJOKCIU');
    expect(extrairIdPlanilha('qualquer coisa')).toBeNull();
  });
});

describe('conversão da planilha antiga', () => {
  const r = converterPlanilhaAntiga(abas, 'EstudoSystem', agora);

  it('disciplinas com os mesmos ids, números em pt-BR ("1.064"), ativa/inativa e observações', () => {
    expect(r.disciplinas.map((d) => d.id)).toEqual(['D01', 'D02', 'D03', 'D04', 'D05']);
    const d01 = r.disciplinas[0];
    expect([d01.total_paginas, d01.total_horas_video, d01.peso, d01.cor]).toEqual([1064, 70, 2, '#ba9121']);
    expect(d01.observacoes).toContain('205052');
    expect(r.disciplinas[4].ativa).toBe(false);
    r.disciplinas.forEach((d) => expect(validarDisciplina(d, r.disciplinas)).toEqual([]));
  });

  it('leis e ciclo (ordenado pela coluna ORDEM, horas em pt-BR e ponteiro 4F4)', () => {
    expect(r.leis[0]).toMatchObject({ id: 'L01', disciplina_id: 'D03', total_artigos: 70, descricao: 'Regula o processo administrativo.' });
    expect(r.ciclo?.sequencia.map((p) => p.disciplina_id)).toEqual(['D01', 'D02', 'D03']);
    expect(r.ciclo?.sequencia[0].duracao_prevista).toBe(3.75);
    expect([r.ciclo?.horas_totais, r.ciclo?.volta, r.ciclo?.ordem]).toEqual([30, 4, 4]);
  });

  it('1ª linha do Cronograma: recalcula 1,34 h e guarda a posição 1F1', () => {
    const s = r.sessoes[0];
    expect(s.id).toBe('imp-20260803-051010-D01');
    expect(s).toMatchObject({ disciplina_id: 'D01', tipo: 'PDF', paginas: 30, segundos_pausados: 45, posicao_ciclo: '1F1', situacao: 'concluida' });
    expect(Math.round((duracaoSegundos(s) / 3600) * 100) / 100).toBe(1.34);
    expect(new Date(s.inicio).getHours()).toBe(5);
  });

  it('questões, videoaula com pausa e lei seca que passou da meia-noite', () => {
    const [, q, v, lei] = r.sessoes;
    expect([q.questoes, q.acertos, q.paginas]).toEqual([10, 4, 0]);
    expect(Math.round((duracaoSegundos(v) / 3600) * 100) / 100).toBe(0.91);
    expect(lei).toMatchObject({ tipo: 'Lei Seca', lei_id: 'L01', artigos: 15 });
    expect(duracaoSegundos(lei)).toBe(40 * 60);
  });

  it('aponta problemas (disciplina desconhecida) e ignora sessões em aberto e linhas vazias', () => {
    expect(r.sessoes).toHaveLength(4);
    expect(r.problemas).toEqual(['Linha 6: disciplina "DIREITO PENAL" não está em Config_Disciplinas.']);
    expect(r.emAberto).toBe(1);
  });

  it('confere as horas: coluna DURAÇÃO da planilha x recálculo', () => {
    const resumo = resumirImportacao(r, new Set());
    // só as linhas importadas (a de DIREITO PENAL, recusada, não entra na conta)
    expect(r.horasNaPlanilha).toBeCloseTo(1.34 + 0.17 + 0.91 + 0.67, 5);
    expect(resumo.horasRecalculadas).toBeCloseTo(1.3425 + 0.1697 + 0.9133 + 0.6667, 2);
  });

  it('importar de novo: as já importadas não entram outra vez', () => {
    const resumo = resumirImportacao(r, new Set(['imp-20260803-051010-D01', 'imp-20260816-084912-D01']));
    expect(resumo.novas).toHaveLength(2);
    expect(resumo.jaImportadas).toBe(2);
    expect(resumo.primeira?.startsWith('2026-08-03')).toBe(true);
  });

  it('planilha sem as abas: nada a importar, sem quebrar', () => {
    const vazio = converterPlanilhaAntiga({}, 'Outra', agora);
    expect([vazio.disciplinas.length, vazio.leis.length, vazio.ciclo, vazio.sessoes.length]).toEqual([0, 0, null, 0]);
  });
});
