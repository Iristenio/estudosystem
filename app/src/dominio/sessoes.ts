// Regras de negócio das sessões de estudo e do cronômetro (R1–R14 da ESPECIFICACAO.md).
// Funções PURAS: recebem o "agora" como parâmetro — testadas em sessoes.test.ts.
//
// O cronômetro não é um contador rodando: a duração é sempre calculada pelos horários gravados
// (início, pausas, instante em que o relógio parou). Por isso continua certa com o app fechado (R7).
import type { Disciplina, Id, Lei, Sessao, TipoSessao } from './tipos';

/** Nome de cada tipo como aparece na tela. */
export const ROTULO_TIPO: Record<TipoSessao, string> = {
  PDF: 'PDF',
  VideoAula: 'Videoaula',
  Revisão: 'Revisão',
  'Lei Seca': 'Lei seca',
  Questões: 'Questões',
};

const seg = (iso: string) => new Date(iso).getTime() / 1000;

export function sessoesValidas(lista: Sessao[]): Sessao[] {
  return lista.filter((s) => s.status !== 'excluido');
}

/** R1 — a sessão aberta (em andamento, pausada ou finalizando), se houver. */
export function sessaoAberta(lista: Sessao[]): Sessao | null {
  const abertas = sessoesValidas(lista).filter((s) => s.situacao !== 'concluida');
  // Se dois aparelhos abriram sessões sem internet, vale a mais recente
  return abertas.sort((a, b) => b.inicio.localeCompare(a.inicio))[0] ?? null;
}

/** Instante até onde o relógio conta: fim (concluída), relógio parado (pausa/finalizando) ou agora. */
function fimDaContagem(s: Sessao, agora: Date): number {
  if (s.situacao === 'concluida' && s.fim) return seg(s.fim);
  if (s.pausado_desde) return seg(s.pausado_desde);
  return agora.getTime() / 1000;
}

/** Duração em segundos = fim − início − pausas (nunca negativa). */
export function duracaoSegundos(s: Sessao, agora = new Date()): number {
  return Math.max(0, Math.round(fimDaContagem(s, agora) - seg(s.inicio) - s.segundos_pausados));
}

/** 3725 → "01:02:05" */
export function formatarDuracao(segundos: number): string {
  const t = Math.max(0, Math.round(segundos));
  const d = (n: number) => String(n).padStart(2, '0');
  return `${d(Math.floor(t / 3600))}:${d(Math.floor((t % 3600) / 60))}:${d(t % 60)}`;
}

/** 3725 → "1h02" · 600 → "10 min" */
export function formatarDuracaoCurta(segundos: number): string {
  const min = Math.round(segundos / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`;
}

/* ============================ Iniciar ============================ */

export interface DadosInicio {
  disciplina_id: Id;
  tipo: TipoSessao | null;
  aula: string;
  lei_id: Id | null;
}

/** R1 e R3 — lista de erros (vazia = pode iniciar). */
export function validarInicio(dados: DadosInicio, disciplinas: Disciplina[], leis: Lei[], sessoes: Sessao[]): string[] {
  const erros: string[] = [];
  if (sessaoAberta(sessoes)) erros.push('Já existe uma sessão aberta. Finalize ou cancele antes de iniciar outra.');
  const d = disciplinas.find((x) => x.id === dados.disciplina_id && x.status !== 'excluido');
  if (!d) {
    erros.push('Escolha a disciplina.');
    return erros;
  }
  if (!d.ativa) erros.push('Esta disciplina está inativa.');
  if (!dados.tipo) {
    erros.push('Escolha o tipo de estudo.');
    return erros;
  }
  if (dados.tipo === 'PDF' && !d.total_paginas)
    erros.push('Esta disciplina ainda não tem o total de páginas. Preencha em Cadastros → Disciplinas.');
  if (dados.tipo === 'VideoAula' && !d.total_horas_video)
    erros.push('Esta disciplina ainda não tem o total de horas de vídeo. Preencha em Cadastros → Disciplinas.');
  if (dados.tipo === 'Lei Seca') {
    const lei = leis.find((l) => l.id === dados.lei_id && l.disciplina_id === d.id && l.status !== 'excluido');
    if (!lei) erros.push('Escolha a lei que será estudada.');
    else if (!lei.ativa) erros.push('Esta lei está inativa.');
    else if (!lei.total_artigos) erros.push('Esta lei ainda não tem o total de artigos. Preencha em Cadastros → Leis secas.');
  }
  return erros;
}

/** Leis que podem ser escolhidas numa sessão de Lei Seca da disciplina. */
export function leisDisponiveis(leis: Lei[], disciplinaId: Id): Lei[] {
  return leis
    .filter((l) => l.status !== 'excluido' && l.ativa && l.disciplina_id === disciplinaId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
}

export function iniciarSessao(id: Id, dados: DadosInicio, agora = new Date()): Sessao {
  const carimbo = agora.toISOString();
  return {
    id,
    disciplina_id: dados.disciplina_id,
    tipo: dados.tipo!,
    aula: dados.aula.trim(),
    lei_id: dados.tipo === 'Lei Seca' ? dados.lei_id : null,
    inicio: carimbo,
    fim: null,
    segundos_pausados: 0,
    pausado_desde: null,
    paginas: 0,
    artigos: 0,
    questoes: 0,
    acertos: 0,
    situacao: 'andamento',
    posicao_ciclo: null,
    status: 'ativo',
    criado_em: carimbo,
    atualizado_em: carimbo,
  };
}

/* ======================= Pausar / continuar / finalizar ======================= */

/** R4 — só pausa o que está em andamento. */
export function pausar(s: Sessao, agora = new Date()): Sessao {
  if (s.situacao !== 'andamento') return s;
  return { ...s, situacao: 'pausada', pausado_desde: agora.toISOString() };
}

/** R4 — soma o tempo desta pausa e volta a contar. Também serve para "voltar ao cronômetro" depois de Finalizar. */
export function continuar(s: Sessao, agora = new Date()): Sessao {
  if (s.situacao !== 'pausada' && s.situacao !== 'finalizando') return s;
  const pausa = s.pausado_desde ? Math.max(0, agora.getTime() / 1000 - seg(s.pausado_desde)) : 0;
  return { ...s, situacao: 'andamento', pausado_desde: null, segundos_pausados: Math.round(s.segundos_pausados + pausa) };
}

/**
 * R5 — congela o relógio. Se estava em andamento, para agora; se estava pausada, vale o instante
 * em que a pausa começou. O tempo gasto preenchendo os campos finais nunca conta.
 */
export function finalizar(s: Sessao, agora = new Date()): Sessao {
  if (s.situacao === 'andamento') return { ...s, situacao: 'finalizando', pausado_desde: agora.toISOString() };
  if (s.situacao === 'pausada') return { ...s, situacao: 'finalizando' };
  return s;
}

/* ============================ Concluir ============================ */

export interface DadosFinais {
  paginas: number | null;
  artigos: number | null;
  questoes: number | null;
  acertos: number | null;
}

const inteiroOuZero = (n: number | null) => (n === null ? 0 : n);
const inteiroValido = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0);

/** R6 — campos finais conforme o tipo. */
export function validarDadosFinais(tipo: TipoSessao, dados: DadosFinais): string[] {
  const erros: string[] = [];
  if (tipo === 'PDF' && !inteiroValido(dados.paginas)) erros.push('Informe as páginas como um número inteiro.');
  if (tipo === 'Lei Seca' && !inteiroValido(dados.artigos)) erros.push('Informe os artigos como um número inteiro.');
  if (tipo === 'Questões') {
    if (!inteiroValido(dados.questoes) || !inteiroValido(dados.acertos)) erros.push('Informe questões e acertos como números inteiros.');
    else if (inteiroOuZero(dados.acertos) > inteiroOuZero(dados.questoes)) erros.push('Os acertos não podem ser mais que as questões.');
  }
  return erros;
}

/** Fecha a sessão: o fim é o instante em que o relógio parou (ou o fim corrigido pelo usuário, R11). */
export function concluir(s: Sessao, dados: DadosFinais): Sessao {
  if (s.situacao !== 'finalizando' || !s.pausado_desde) return s;
  const soTipo = (t: TipoSessao, n: number | null) => (s.tipo === t ? inteiroOuZero(n) : 0);
  return {
    ...s,
    situacao: 'concluida',
    fim: s.pausado_desde,
    pausado_desde: null,
    paginas: soTipo('PDF', dados.paginas),
    artigos: soTipo('Lei Seca', dados.artigos),
    questoes: soTipo('Questões', dados.questoes),
    acertos: soTipo('Questões', dados.acertos),
  };
}

export const erros = (s: Pick<Sessao, 'questoes' | 'acertos'>) => s.questoes - s.acertos;
export const percentualAcerto = (s: Pick<Sessao, 'questoes' | 'acertos'>) =>
  s.questoes > 0 ? Math.round((s.acertos / s.questoes) * 1000) / 10 : 0;

/* ======================= Correção manual de horários (R10–R14) ======================= */

/**
 * Valida novos horários. `fim` = instante em que o relógio parou/terminou (null enquanto ainda conta).
 * Regras: início não pode estar no futuro; fim depois do início e não no futuro; as pausas
 * não podem ser maiores que o tempo entre início e fim (senão a duração ficaria negativa).
 */
export function validarHorarios(s: Sessao, novoInicio: Date, novoFim: Date | null, agora = new Date()): string[] {
  const erros: string[] = [];
  const t = agora.getTime();
  if (Number.isNaN(novoInicio.getTime())) return ['Horário de início inválido.'];
  if (novoFim && Number.isNaN(novoFim.getTime())) return ['Horário de fim inválido.'];
  if (novoInicio.getTime() > t) erros.push('O início não pode estar no futuro.');
  if (novoFim && novoFim.getTime() > t + 1000) erros.push('O fim não pode estar no futuro.');
  if (novoFim && novoFim.getTime() <= novoInicio.getTime()) erros.push('O fim precisa ser depois do início.');
  // Pausa em curso também conta: enquanto pausada, o relógio parou em pausado_desde
  const limite = novoFim ?? (s.pausado_desde ? new Date(s.pausado_desde) : agora);
  if (!erros.length && (limite.getTime() - novoInicio.getTime()) / 1000 < s.segundos_pausados)
    erros.push('Com esse horário, as pausas seriam maiores que a própria sessão.');
  return erros;
}

/**
 * Aplica os horários corrigidos (já validados). Na sessão aberta só o início muda (R10);
 * ao finalizar e nas concluídas, o fim também (R11): enquanto "finalizando", o fim é o relógio parado.
 */
export function aplicarHorarios(s: Sessao, novoInicio: Date, novoFim: Date | null): Sessao {
  const r: Sessao = { ...s, inicio: novoInicio.toISOString() };
  if (novoFim) {
    if (s.situacao === 'concluida') r.fim = novoFim.toISOString();
    else if (s.situacao === 'finalizando') r.pausado_desde = novoFim.toISOString();
  }
  return r;
}

/** Instante que aparece como "fim" na correção: concluída → fim; finalizando → relógio parado. */
export function fimAtual(s: Sessao): Date | null {
  if (s.situacao === 'concluida' && s.fim) return new Date(s.fim);
  if (s.situacao === 'finalizando' && s.pausado_desde) return new Date(s.pausado_desde);
  return null;
}

/** R14 — sessões concluídas cujo intervalo se cruza com [inicio, fim] (só para avisar; não bloqueia). */
export function sessoesSobrepostas(s: Sessao, inicio: Date, fim: Date, todas: Sessao[]): Sessao[] {
  const a = inicio.getTime();
  const b = fim.getTime();
  return sessoesValidas(todas).filter((o) => {
    if (o.id === s.id || o.situacao !== 'concluida' || !o.fim) return false;
    return new Date(o.inicio).getTime() < b && new Date(o.fim).getTime() > a;
  });
}

/** Junta "AAAA-MM-DD" + "HH:mm" num Date local. */
export function juntarDataHora(data: string, hora: string): Date {
  const [a, m, d] = data.split('-').map(Number);
  const [h, min] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, h, min, 0, 0);
}

/* ============================ Consultas ============================ */

/** Sessões concluídas com início no dia local de `agora`, da mais recente para a mais antiga. */
export function concluidasDoDia(lista: Sessao[], agora = new Date()): Sessao[] {
  const mesmoDia = (iso: string) => new Date(iso).toDateString() === agora.toDateString();
  return sessoesValidas(lista)
    .filter((s) => s.situacao === 'concluida' && mesmoDia(s.inicio))
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
}

/** Resumo de uma sessão conforme o tipo: "30 págs.", "10 questões · 70%", "12 artigos". */
export function resumoProducao(s: Sessao): string {
  if (s.tipo === 'PDF') return `${s.paginas} pág${s.paginas === 1 ? '.' : 's.'}`;
  if (s.tipo === 'Lei Seca') return `${s.artigos} artigo${s.artigos === 1 ? '' : 's'}`;
  if (s.tipo === 'Questões') return `${s.questoes} questões · ${String(percentualAcerto(s)).replace('.', ',')}%`;
  return '';
}
