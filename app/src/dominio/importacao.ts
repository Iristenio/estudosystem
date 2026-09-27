// Importação do histórico da planilha antiga (EstudoSystem): converte as abas lidas pelo backend
// (valores como aparecem na tela) em registros do app. Funções puras — testadas em importacao.test.ts.
//
// Regras:
//  • Disciplinas, leis e ciclo: a planilha manda (substituem os do app, pelos mesmos ids D01…/L01…).
//  • Sessões: só as CONCLUÍDAS; cada uma ganha um id fixo (data + hora + disciplina), então importar
//    de novo traz apenas as novas — as já importadas (mesmo se corrigidas no app) ficam como estão.
//  • A duração é recalculada: fim − início − pausas (a coluna DURAÇÃO só serve para conferência).
import type { Ciclo, Disciplina, Lei, Sessao, TipoSessao } from './tipos';
import { ID_CICLO, TIPOS_SESSAO } from './tipos';
import { mesmoNome, novaDisciplina } from './disciplinas';
import { novaLei } from './leis';
import { lerPosicao, novoCiclo } from './ciclo';
import { duracaoSegundos } from './sessoes';
import { lerNumero } from './numeros';

export const ABAS_PLANILHA_ANTIGA = ['Config_Disciplinas', 'Leis', 'Config_Ciclo', 'Ciclo_Atual', 'Cronograma'] as const;
export const ID_PLANILHA_ANTIGA = '10AncPMLLthN3orft5cdJ6UW0-G9OeXmyWQUIaJOKCIU';

export type AbasLidas = Partial<Record<string, string[][] | null>>;

/** Aceita o endereço completo da planilha ou só o id. */
export function extrairIdPlanilha(texto: string): string | null {
  const t = texto.trim();
  const m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]{20,})/.exec(t);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(t) ? t : null;
}

/* ---------------- Leitura de células ---------------- */

/** Linhas como objetos { CABEÇALHO: valor }, ignorando linhas vazias. */
function linhasDe(aba: string[][] | null | undefined): Record<string, string>[] {
  if (!aba || aba.length < 2) return [];
  const cab = aba[0].map((c) => c.trim().toUpperCase());
  return aba
    .slice(1)
    .filter((l) => l.some((c) => String(c).trim() !== ''))
    .map((l) => Object.fromEntries(cab.map((c, i) => [c, String(l[i] ?? '').trim()])));
}

const simNao = (v: string) => /^(true|verdadeiro|sim|1)$/i.test(v.trim());
/** Número como a planilha mostra em pt-BR: "1.064" = mil e sessenta e quatro; "3,75" = três vírgula setenta e cinco. */
function numero(v: string): number | null {
  let t = (v ?? '').trim();
  if (t.includes(',')) t = t.replace(/\./g, ''); // "1.234,5": o ponto separa milhar
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, ''); // "1.064": milhar
  const n = lerNumero(t);
  return n === null || Number.isNaN(n) ? null : n;
}
const inteiro = (v: string) => Math.max(0, Math.round(numero(v) ?? 0));

/** "03/08/2026" ou "2026-08-03" → [ano, mês, dia] */
function lerData(v: string): [number, number, number] | null {
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v);
  if (m) return [Number(m[3]), Number(m[2]), Number(m[1])];
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** "5:10:10", "05:10" → [h, min, s] (aceita também data + hora na mesma célula). */
function lerHora(v: string): [number, number, number] | null {
  const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(v);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = Number(m[3] ?? 0);
  return h < 24 && min < 60 && s < 60 ? [h, min, s] : null;
}

const dois = (n: number) => String(n).padStart(2, '0');

/* ---------------- Conversão ---------------- */

export interface ResultadoImportacao {
  titulo: string;
  disciplinas: Disciplina[];
  leis: Lei[];
  ciclo: Ciclo | null;
  /** Sessões concluídas convertidas (todas, inclusive as que já existem no app). */
  sessoes: Sessao[];
  /** Linhas que não puderam ser importadas, com o motivo. */
  problemas: string[];
  /** Linhas do Cronograma ainda em aberto na planilha (não entram). */
  emAberto: number;
  /** Soma da coluna DURAÇÃO das linhas importadas, em horas (para conferir com o recálculo). */
  horasNaPlanilha: number;
}

export function converterPlanilhaAntiga(abas: AbasLidas, titulo = 'Planilha', agora = new Date()): ResultadoImportacao {
  const problemas: string[] = [];

  // Disciplinas
  const disciplinas: Disciplina[] = linhasDe(abas.Config_Disciplinas)
    .filter((l) => l.ID && l.NOME)
    .map((l) =>
      novaDisciplina(
        {
          id: l.ID,
          nome: l.NOME.toLocaleUpperCase('pt-BR'),
          categoria: (l.CATEGORIA ?? '').toLocaleUpperCase('pt-BR'),
          ativa: simNao(l.ATIVA ?? 'TRUE'),
          ordem: inteiro(l.ORDEM) || 1,
          peso: Math.max(1, inteiro(l.PESO)),
          possui_pdf: simNao(l.POSSUI_PDF ?? 'TRUE'),
          total_paginas: numero(l.TOTAL_PAGINAS),
          possui_video: simNao(l.POSSUI_VIDEO ?? 'TRUE'),
          total_horas_video: numero(l.TOTAL_HORAS_VIDEO),
          cor: /^#[0-9a-f]{6}$/i.test(l.COR ?? '') ? l.COR.toLowerCase() : '#30503a',
          observacoes: l.OBSERVACOES ?? '',
        },
        agora,
      ),
    );
  const idDaDisciplina = (nome: string) => disciplinas.find((d) => mesmoNome(d.nome, nome))?.id ?? null;

  // Leis
  const leis: Lei[] = linhasDe(abas.Leis)
    .filter((l) => l.LEI_ID && l.NOME_LEI)
    .map((l) =>
      novaLei(
        {
          id: l.LEI_ID,
          disciplina_id: l.DISCIPLINA_ID,
          nome: l.NOME_LEI,
          total_artigos: numero(l.TOTAL_ARTIGOS),
          ativa: simNao(l.ATIVA ?? 'TRUE'),
          descricao: l.DESCRICAO ?? '',
        },
        agora,
      ),
    );

  // Ciclo
  const config = Object.fromEntries(linhasDe(abas.Config_Ciclo).map((l) => [l.CAMPO, l.VALOR]));
  const sequencia = linhasDe(abas.Ciclo_Atual)
    .filter((l) => l.DISCIPLINA_ID)
    .sort((a, b) => inteiro(a.ORDEM) - inteiro(b.ORDEM))
    .map((l) => ({ disciplina_id: l.DISCIPLINA_ID, duracao_prevista: numero(l.DURACAO_PREVISTA) ?? 0 }));
  const ponteiro = lerPosicao(config.PROXIMO_CRON_ID ?? '') ?? { volta: 1, ordem: 1 };
  const ciclo = sequencia.length
    ? novoCiclo({ id: ID_CICLO, horas_totais: numero(config.HORAS_TOTAIS_CICLO ?? '') ?? 0, sequencia, volta: ponteiro.volta, ordem: ponteiro.ordem }, agora)
    : null;

  // Sessões (Cronograma)
  const sessoes: Sessao[] = [];
  const ids = new Set<string>();
  let emAberto = 0;
  let horasNaPlanilha = 0;
  linhasDe(abas.Cronograma).forEach((l, i) => {
    const linha = i + 2;
    if (!l.DATA_INICIO && !l.DISCIPLINA) return;
    if ((l.STATUS ?? '').toUpperCase() !== 'CONCLUÍDO') {
      emAberto++;
      return;
    }
    const data = lerData(l.DATA_INICIO ?? '');
    const hi = lerHora(l.HORA_INICIO ?? '');
    const hf = lerHora(l.HORA_FIM ?? '');
    const disciplinaId = idDaDisciplina(l.DISCIPLINA ?? '');
    const tipo = TIPOS_SESSAO.find((t) => t.toLowerCase() === (l.TIPO ?? '').toLowerCase()) as TipoSessao | undefined;
    if (!data || !hi || !hf) return problemas.push(`Linha ${linha}: data ou horário inválido.`);
    if (!disciplinaId) return problemas.push(`Linha ${linha}: disciplina "${l.DISCIPLINA}" não está em Config_Disciplinas.`);
    if (!tipo) return problemas.push(`Linha ${linha}: tipo "${l.TIPO}" desconhecido.`);

    const inicio = new Date(data[0], data[1] - 1, data[2], hi[0], hi[1], hi[2]);
    const fim = new Date(data[0], data[1] - 1, data[2], hf[0], hf[1], hf[2]);
    if (fim <= inicio) fim.setDate(fim.getDate() + 1); // passou da meia-noite
    const pausas = inteiro(l.SEGUNDOS_PAUSADOS);
    horasNaPlanilha += numero(l['DURAÇÃO'] ?? '') ?? 0;

    let id = `imp-${data[0]}${dois(data[1])}${dois(data[2])}-${dois(hi[0])}${dois(hi[1])}${dois(hi[2])}-${disciplinaId}`;
    for (let n = 2; ids.has(id); n++) id = `${id}-${n}`;
    ids.add(id);

    const questoes = tipo === 'Questões' ? inteiro(l['QUEST.']) : 0;
    const s: Sessao = {
      id,
      disciplina_id: disciplinaId,
      tipo,
      aula: l.AULA ?? '',
      lei_id: tipo === 'Lei Seca' && l.LEI_ID ? l.LEI_ID : null,
      inicio: inicio.toISOString(),
      fim: fim.toISOString(),
      segundos_pausados: pausas,
      pausado_desde: null,
      paginas: tipo === 'PDF' ? inteiro(l['PÁGINAS']) : 0,
      artigos: tipo === 'Lei Seca' ? inteiro(l.ARTIGOS_LIDOS) : 0,
      questoes,
      acertos: tipo === 'Questões' ? Math.min(questoes, inteiro(l['ACERT.'])) : 0,
      situacao: 'concluida',
      posicao_ciclo: lerPosicao(l.CRON_ID ?? '') ? l.CRON_ID : null,
      status: 'ativo',
      criado_em: agora.toISOString(),
      atualizado_em: agora.toISOString(),
    };
    if ((fim.getTime() - inicio.getTime()) / 1000 < pausas) return problemas.push(`Linha ${linha}: as pausas são maiores que a sessão.`);
    sessoes.push(s);
  });

  return { titulo, disciplinas, leis, ciclo, sessoes, problemas, emAberto, horasNaPlanilha };
}

/** Resumo para mostrar antes de importar. */
export function resumirImportacao(r: ResultadoImportacao, idsExistentes: Set<string>) {
  const novas = r.sessoes.filter((s) => !idsExistentes.has(s.id));
  const horasRecalculadas = r.sessoes.reduce((t, s) => t + duracaoSegundos(s), 0) / 3600;
  const datas = r.sessoes.map((s) => s.inicio).sort();
  return {
    novas,
    jaImportadas: r.sessoes.length - novas.length,
    horasRecalculadas,
    primeira: datas[0] ?? null,
    ultima: datas[datas.length - 1] ?? null,
  };
}
