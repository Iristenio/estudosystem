// Outros estudos (seção 10 da ESPECIFICACAO, R45–R50): cursos agrupados por área e sessões simples
// (curso, horários, descrição), fora do ciclo e das estatísticas do concurso. Funções puras, testadas
// em outros.test.ts. O cronômetro (pausar, continuar, finalizar, duração) é o mesmo de sessoes.ts.
import type { Cronometrado, CursoExtra, Id, OutraSessao } from './tipos';
import { paraDataISO, somarDias } from './datas';
import { CORES_DISCIPLINA, mesmoNome } from './disciplinas';
import { duracaoSegundos, sessaoAberta, sessoesValidas, validarHorarios } from './sessoes';

/* ============================ Cursos ============================ */

export function novoCurso(campos: Partial<CursoExtra> & { id: Id }, agora = new Date()): CursoExtra {
  const carimbo = agora.toISOString();
  return { area: '', nome: '', cor: CORES_DISCIPLINA[3], ativo: true, status: 'ativo', criado_em: carimbo, atualizado_em: carimbo, ...campos };
}

export function normalizarCurso(c: CursoExtra): CursoExtra {
  return { ...c, area: c.area.trim(), nome: c.nome.trim() };
}

/** Primeira cor da paleta ainda não usada pelos cursos (para cada curso novo nascer com uma cor diferente). */
export function corLivre(cursos: CursoExtra[]): string {
  const usadas = new Set(cursos.filter((c) => c.status !== 'excluido').map((c) => c.cor.toLowerCase()));
  return CORES_DISCIPLINA.find((c) => !usadas.has(c)) ?? CORES_DISCIPLINA[cursos.length % CORES_DISCIPLINA.length];
}

/** Lista de erros (vazia = válido). O nome não pode se repetir dentro da mesma área. */
export function validarCurso(c: CursoExtra, todos: CursoExtra[]): string[] {
  const erros: string[] = [];
  if (!c.area.trim()) erros.push('Informe a área (ex.: Graduação, Especialização, Alura).');
  if (!c.nome.trim()) erros.push('Informe o nome do curso.');
  else if (todos.some((o) => o.id !== c.id && o.status !== 'excluido' && mesmoNome(o.area, c.area) && mesmoNome(o.nome, c.nome)))
    erros.push('Essa área já tem um curso com esse nome.');
  if (!/^#[0-9a-f]{6}$/i.test(c.cor)) erros.push('Escolha uma cor.');
  return erros;
}

/** R49 — curso com sessões não pode ser apagado, só desativado. */
export const podeExcluirCurso = (id: Id, sessoes: Pick<OutraSessao, 'curso_id' | 'status'>[]) =>
  !sessoes.some((s) => s.status !== 'excluido' && s.curso_id === id);

/** Áreas em ordem alfabética, cada uma com seus cursos (ativos primeiro, depois por nome). Excluídos ficam de fora. */
export function cursosPorArea(cursos: CursoExtra[]): { area: string; cursos: CursoExtra[] }[] {
  const validos = cursos.filter((c) => c.status !== 'excluido');
  const areas = [...new Set(validos.map((c) => c.area))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return areas.map((area) => ({
    area,
    cursos: validos
      .filter((c) => c.area === area)
      .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })),
  }));
}

/** Áreas já usadas (para sugerir ao digitar). */
export const areasUsadas = (cursos: CursoExtra[]) => cursosPorArea(cursos).map((g) => g.area);

/* ============================ Sessões ============================ */

export interface DadosOutra {
  curso_id: Id;
  descricao: string;
}

/** R45 — erros ao iniciar (vazio = pode iniciar). `algumaAberta`: já há sessão aberta (concurso ou outros). */
export function validarInicioOutra(dados: DadosOutra, cursos: CursoExtra[], algumaAberta: boolean): string[] {
  const erros: string[] = [];
  if (algumaAberta) erros.push('Já existe uma sessão aberta. Finalize ou cancele antes de iniciar outra.');
  const c = cursos.find((x) => x.id === dados.curso_id && x.status !== 'excluido');
  if (!c) erros.push('Escolha o curso.');
  else if (!c.ativo) erros.push('Este curso está inativo.');
  return erros;
}

export function iniciarOutra(id: Id, dados: DadosOutra, agora = new Date()): OutraSessao {
  const carimbo = agora.toISOString();
  return {
    id,
    curso_id: dados.curso_id,
    descricao: dados.descricao.trim(),
    inicio: carimbo,
    fim: null,
    segundos_pausados: 0,
    pausado_desde: null,
    situacao: 'andamento',
    status: 'ativo',
    criado_em: carimbo,
    atualizado_em: carimbo,
  };
}

/** R46 — fecha a sessão: o fim é o instante em que o relógio parou (não há campos extras). */
export function concluirOutra(s: OutraSessao): OutraSessao {
  if (s.situacao !== 'finalizando' || !s.pausado_desde) return s;
  return { ...s, situacao: 'concluida', fim: s.pausado_desde, pausado_desde: null };
}

/** Sessão de outros estudos aberta (em andamento, pausada ou finalizando), se houver. */
export const outraAberta = (lista: OutraSessao[]) => sessaoAberta(lista);

/**
 * R47 — sessão lançada à mão (já concluída). Valida curso e horários (fim depois do início, nada no
 * futuro). Devolve a sessão ou a lista de erros.
 */
export function lancarOutra(
  id: Id,
  dados: DadosOutra & { inicio: Date; fim: Date },
  cursos: CursoExtra[],
  agora = new Date(),
): { sessao: OutraSessao | null; erros: string[] } {
  const base: OutraSessao = { ...iniciarOutra(id, dados, agora), inicio: dados.inicio.toISOString(), situacao: 'concluida', fim: dados.fim.toISOString() };
  const erros = [
    ...(cursos.some((c) => c.id === dados.curso_id && c.status !== 'excluido') ? [] : ['Escolha o curso.']),
    ...validarHorarios(base, dados.inicio, dados.fim, agora),
  ];
  return { sessao: erros.length ? null : base, erros };
}

/** Concluídas, da mais recente para a mais antiga (lista da tela Outros estudos). */
export function outrasConcluidas(lista: OutraSessao[]): OutraSessao[] {
  return sessoesValidas(lista)
    .filter((s) => s.situacao === 'concluida')
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
}

/* ============================ Acompanhamento (etapa 16, 10.4) ============================ */

export type PeriodoOutros = 'semana' | 'mes' | 'ano' | 'tudo';

export const ROTULO_PERIODO_OUTROS: Record<PeriodoOutros, string> = {
  semana: 'Esta semana',
  mes: 'Este mês',
  ano: 'Este ano',
  tudo: 'Tudo',
};

/** Intervalo [de, ate] ("AAAA-MM-DD", inclusivo) do período; a semana começa na segunda-feira. null = sem limite. */
export function intervaloOutros(p: PeriodoOutros, agora = new Date()): { de: string | null; ate: string } {
  const hoje = paraDataISO(agora);
  if (p === 'semana') return { de: somarDias(hoje, -((agora.getDay() + 6) % 7)), ate: hoje };
  if (p === 'mes') return { de: `${hoje.slice(0, 7)}-01`, ate: hoje };
  if (p === 'ano') return { de: `${hoje.slice(0, 4)}-01-01`, ate: hoje };
  return { de: null, ate: hoje };
}

/** Sessões concluídas (de qualquer tipo com cronômetro) cujo dia de início está no intervalo. */
export function concluidasNoIntervalo<T extends Cronometrado>(lista: T[], de: string | null, ate: string): T[] {
  return sessoesValidas(lista).filter((s) => {
    if (s.situacao !== 'concluida') return false;
    const dia = paraDataISO(new Date(s.inicio));
    return (!de || dia >= de) && dia <= ate;
  });
}

export interface TempoDeCurso {
  curso: CursoExtra | null;
  curso_id: Id;
  segundos: number;
}

export interface TempoDeArea {
  area: string;
  segundos: number;
  cursos: TempoDeCurso[];
}

/** Tempo por área e, dentro dela, por curso (maior primeiro). Cursos sem sessão no período ficam de fora. */
export function tempoPorArea(sessoes: OutraSessao[], cursos: CursoExtra[]): TempoDeArea[] {
  const porCurso = new Map<Id, number>();
  for (const s of sessoes) porCurso.set(s.curso_id, (porCurso.get(s.curso_id) ?? 0) + duracaoSegundos(s));
  const areas = new Map<string, TempoDeArea>();
  for (const [curso_id, segundos] of porCurso) {
    const curso = cursos.find((c) => c.id === curso_id) ?? null;
    const area = curso?.area ?? 'Curso removido';
    const a = areas.get(area) ?? { area, segundos: 0, cursos: [] };
    a.segundos += segundos;
    a.cursos.push({ curso, curso_id, segundos });
    areas.set(area, a);
  }
  return [...areas.values()]
    .map((a) => ({ ...a, cursos: a.cursos.sort((x, y) => y.segundos - x.segundos) }))
    .sort((x, y) => y.segundos - x.segundos);
}

/**
 * "Onde está meu tempo": o Concurso (todas as sessões concluídas do concurso no período) e cada área dos
 * outros estudos, com a % do total. Maior primeiro.
 */
export function ondeEstaMeuTempo(segundosConcurso: number, areas: TempoDeArea[]): { chave: string; rotulo: string; segundos: number; percentual: number }[] {
  const itens = [
    { chave: 'concurso', rotulo: 'Concurso', segundos: segundosConcurso },
    ...areas.map((a) => ({ chave: `area:${a.area}`, rotulo: a.area, segundos: a.segundos })),
  ].filter((x) => x.segundos > 0);
  const total = itens.reduce((t, x) => t + x.segundos, 0);
  return itens
    .map((x) => ({ ...x, percentual: total ? Math.round((x.segundos / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.segundos - a.segundos);
}

/** Tempo por dia dos últimos `dias` dias (do mais recente para o mais antigo), com as partes de cada curso. */
export function tempoPorDiaOutros(sessoes: OutraSessao[], dias: number, agora = new Date()): { dia: string; total: number; partes: { curso_id: Id; segundos: number }[] }[] {
  const hoje = paraDataISO(agora);
  const lista = Array.from({ length: dias }, (_, i) => somarDias(hoje, -i));
  const porDia = new Map<string, Map<Id, number>>();
  for (const s of concluidasNoIntervalo(sessoes, lista[lista.length - 1], hoje)) {
    const dia = paraDataISO(new Date(s.inicio));
    const m = porDia.get(dia) ?? new Map<Id, number>();
    m.set(s.curso_id, (m.get(s.curso_id) ?? 0) + duracaoSegundos(s));
    porDia.set(dia, m);
  }
  return lista.map((dia) => {
    const partes = [...(porDia.get(dia) ?? new Map<Id, number>()).entries()].map(([curso_id, segundos]) => ({ curso_id, segundos }));
    return { dia, total: partes.reduce((t, p) => t + p.segundos, 0), partes };
  });
}
