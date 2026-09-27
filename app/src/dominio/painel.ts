// Cálculos dos painéis (Dashboard e Acompanhamento) — as mesmas definições do Apps Script antigo
// (07_Dashboard: Acompanhamento, Estatística, Dash_Diario). Funções puras, testadas em painel.test.ts.
//
// Recebem sessões JÁ CONCLUÍDAS e filtradas (ver historico.ts → filtrarSessoes).
import type { Disciplina, Id, Lei, Sessao, TipoSessao } from './tipos';
import { TIPOS_SESSAO } from './tipos';
import { duracaoSegundos } from './sessoes';
import { diaDaSessao } from './historico';
import { deDataISO, paraDataISO, somarDias } from './datas';

const somaSeg = (lista: Sessao[]) => lista.reduce((s, x) => s + duracaoSegundos(x), 0);
const doTipo = (lista: Sessao[], tipo: TipoSessao) => lista.filter((s) => s.tipo === tipo);
const umaCasa = (n: number) => Math.round(n * 100) / 100;

/* ============================ Indicadores gerais ============================ */

export interface Indicadores {
  segundos: number;
  sessoes: number;
  mediaSegundos: number;
  paginas: number;
  /** Minutos de sessões de PDF ÷ páginas lidas (null sem páginas). */
  minutosPorPagina: number | null;
  horasVideo: number;
  artigos: number;
  questoes: number;
  acertos: number;
  percentualAcerto: number | null;
  /** Minutos de sessões de Questões ÷ questões respondidas (null sem questões). */
  minutosPorQuestao: number | null;
  ultima: Sessao | null;
}

export function indicadores(concluidas: Sessao[]): Indicadores {
  const pdf = doTipo(concluidas, 'PDF');
  const questoes = doTipo(concluidas, 'Questões');
  const paginas = pdf.reduce((s, x) => s + x.paginas, 0);
  const nQuestoes = questoes.reduce((s, x) => s + x.questoes, 0);
  const acertos = questoes.reduce((s, x) => s + x.acertos, 0);
  const segundos = somaSeg(concluidas);
  const ultima = [...concluidas].sort((a, b) => b.inicio.localeCompare(a.inicio))[0] ?? null;
  return {
    segundos,
    sessoes: concluidas.length,
    mediaSegundos: concluidas.length ? segundos / concluidas.length : 0,
    paginas,
    minutosPorPagina: paginas ? umaCasa(somaSeg(pdf) / 60 / paginas) : null,
    horasVideo: somaSeg(doTipo(concluidas, 'VideoAula')) / 3600,
    artigos: doTipo(concluidas, 'Lei Seca').reduce((s, x) => s + x.artigos, 0),
    questoes: nQuestoes,
    acertos,
    percentualAcerto: nQuestoes ? Math.round((acertos / nQuestoes) * 1000) / 10 : null,
    minutosPorQuestao: nQuestoes ? umaCasa(somaSeg(questoes) / 60 / nQuestoes) : null,
    ultima,
  };
}

/* ============================ Séries no tempo ============================ */

export interface Ponto {
  chave: string; // "AAAA-MM-DD" (dia) ou "AAAA-MM" (mês)
  segundos: number;
}

/** Tempo por dia, de `de` até `ate` (inclusivo), com zero nos dias sem estudo (Dash_Diario). */
export function horasPorDia(concluidas: Sessao[], de: string, ate: string): Ponto[] {
  const porDia = new Map<string, number>();
  for (const s of concluidas) porDia.set(diaDaSessao(s), (porDia.get(diaDaSessao(s)) ?? 0) + duracaoSegundos(s));
  const pontos: Ponto[] = [];
  for (let dia = de; dia <= ate; dia = somarDias(dia, 1)) pontos.push({ chave: dia, segundos: porDia.get(dia) ?? 0 });
  return pontos;
}

/** Tempo por mês, do mês de `de` ao mês de `ate` (inclusivo), com zero nos meses sem estudo (Estatística). */
export function horasPorMes(concluidas: Sessao[], de: string, ate: string): Ponto[] {
  const porMes = new Map<string, number>();
  for (const s of concluidas) {
    const mes = diaDaSessao(s).slice(0, 7);
    porMes.set(mes, (porMes.get(mes) ?? 0) + duracaoSegundos(s));
  }
  const pontos: Ponto[] = [];
  const d = deDataISO(`${de.slice(0, 7)}-01`);
  const fim = ate.slice(0, 7);
  for (let mes = paraDataISO(d).slice(0, 7); mes <= fim; ) {
    pontos.push({ chave: mes, segundos: porMes.get(mes) ?? 0 });
    d.setMonth(d.getMonth() + 1);
    mes = paraDataISO(d).slice(0, 7);
  }
  return pontos;
}

/** Até 62 dias: por dia; mais que isso: por mês (para o gráfico não virar um pente). */
export function serieDoPeriodo(concluidas: Sessao[], de: string, ate: string): { granularidade: 'dia' | 'mes'; pontos: Ponto[] } {
  const dias = Math.round((deDataISO(ate).getTime() - deDataISO(de).getTime()) / 86_400_000) + 1;
  return dias <= 62 ? { granularidade: 'dia', pontos: horasPorDia(concluidas, de, ate) } : { granularidade: 'mes', pontos: horasPorMes(concluidas, de, ate) };
}

/** Primeiro dia com sessão (para o período "Tudo"). */
export function primeiroDia(concluidas: Sessao[]): string | null {
  return concluidas.reduce<string | null>((min, s) => (!min || diaDaSessao(s) < min ? diaDaSessao(s) : min), null);
}

/* ============================ Distribuições ============================ */

export function tempoPorDisciplina(concluidas: Sessao[], disciplinas: Disciplina[]): { disciplina: Disciplina | null; id: Id; segundos: number }[] {
  const porId = new Map<Id, number>();
  for (const s of concluidas) porId.set(s.disciplina_id, (porId.get(s.disciplina_id) ?? 0) + duracaoSegundos(s));
  return [...porId.entries()]
    .map(([id, segundos]) => ({ id, segundos, disciplina: disciplinas.find((d) => d.id === id) ?? null }))
    .sort((a, b) => b.segundos - a.segundos);
}

export function tempoPorTipo(concluidas: Sessao[]): { tipo: TipoSessao; segundos: number }[] {
  return TIPOS_SESSAO.map((tipo) => ({ tipo, segundos: somaSeg(doTipo(concluidas, tipo)) }))
    .filter((x) => x.segundos > 0)
    .sort((a, b) => b.segundos - a.segundos);
}

/* ============================ Acompanhamento por disciplina ============================ */

export interface LinhaAcompanhamento {
  disciplina: Disciplina;
  paginasLidas: number;
  totalPaginas: number | null;
  /** 0–100 (sem limite: pode passar de 100 se leu mais que o total cadastrado). */
  percentualPaginas: number | null;
  horasVideo: number;
  totalHorasVideo: number | null;
  percentualVideo: number | null;
  artigosLidos: number;
  /** Soma dos artigos das leis ativas; null se não há leis, ou alguma lei ativa está sem total ("—" na planilha). */
  totalArtigos: number | null;
  percentualLeiSeca: number | null;
  questoes: number;
  acertos: number;
  percentualAcerto: number | null;
  segundos: number;
  minutosPorPagina: number | null;
  minutosPorQuestao: number | null;
}

const pct = (parte: number, total: number | null) => (total ? Math.round((parte / total) * 10000) / 100 : null);

/** Uma linha por disciplina ativa, na ordem das disciplinas (antiga aba Acompanhamento). */
export function acompanhamento(disciplinasOrdenadas: Disciplina[], leis: Lei[], concluidas: Sessao[]): LinhaAcompanhamento[] {
  return disciplinasOrdenadas
    .filter((d) => d.ativa && d.status !== 'excluido')
    .map((d) => {
      const daDisciplina = concluidas.filter((s) => s.disciplina_id === d.id);
      const ind = indicadores(daDisciplina);
      const leisAtivas = leis.filter((l) => l.disciplina_id === d.id && l.ativa && l.status !== 'excluido');
      const idsLeis = new Set(leisAtivas.map((l) => l.id));
      const artigosLidos = doTipo(daDisciplina, 'Lei Seca')
        .filter((s) => s.lei_id && idsLeis.has(s.lei_id))
        .reduce((s, x) => s + x.artigos, 0);
      const totalArtigos =
        leisAtivas.length && leisAtivas.every((l) => l.total_artigos) ? leisAtivas.reduce((s, l) => s + (l.total_artigos ?? 0), 0) : null;
      const totalPaginas = d.possui_pdf ? d.total_paginas : null;
      const totalHorasVideo = d.possui_video ? d.total_horas_video : null;
      return {
        disciplina: d,
        paginasLidas: ind.paginas,
        totalPaginas,
        percentualPaginas: pct(ind.paginas, totalPaginas),
        horasVideo: ind.horasVideo,
        totalHorasVideo,
        percentualVideo: pct(ind.horasVideo, totalHorasVideo),
        artigosLidos,
        totalArtigos,
        percentualLeiSeca: pct(artigosLidos, totalArtigos),
        questoes: ind.questoes,
        acertos: ind.acertos,
        percentualAcerto: ind.percentualAcerto,
        segundos: ind.segundos,
        minutosPorPagina: ind.minutosPorPagina,
        minutosPorQuestao: ind.minutosPorQuestao,
      };
    });
}
