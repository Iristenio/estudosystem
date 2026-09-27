// Histórico de sessões: filtros, totais e agrupamento por dia (tela Sessões).
// Funções puras — testadas em historico.test.ts.
import type { Id, Sessao, TipoSessao } from './tipos';
import { duracaoSegundos, sessoesValidas } from './sessoes';
import { hojeISO, inicioDoMes, paraDataISO, somarDias, somarMeses } from './datas';

export type Periodo = 'hoje' | '7dias' | '30dias' | '90dias' | 'mes' | 'mesPassado' | 'ano' | 'tudo' | 'personalizado';

export const ROTULO_PERIODO: Record<Periodo, string> = {
  hoje: 'Hoje',
  '7dias': 'Últimos 7 dias',
  '30dias': 'Últimos 30 dias',
  '90dias': 'Últimos 90 dias',
  mes: 'Este mês',
  mesPassado: 'Mês passado',
  ano: 'Este ano',
  tudo: 'Tudo',
  personalizado: 'Escolher datas',
};

export interface Filtro {
  disciplina_id: Id | '';
  tipo: TipoSessao | '';
  periodo: Periodo;
  /** Só no período "personalizado" ("AAAA-MM-DD", inclusivo). */
  de: string;
  ate: string;
}

export const FILTRO_PADRAO: Filtro = { disciplina_id: '', tipo: '', periodo: '30dias', de: '', ate: '' };

/** Intervalo de datas [de, ate] (inclusivo) do período; null = sem limite. */
export function intervaloDoPeriodo(f: Filtro, agora = new Date()): { de: string | null; ate: string | null } {
  const hoje = hojeISO(agora);
  switch (f.periodo) {
    case 'hoje':
      return { de: hoje, ate: hoje };
    case '7dias':
      return { de: somarDias(hoje, -6), ate: hoje };
    case '30dias':
      return { de: somarDias(hoje, -29), ate: hoje };
    case '90dias':
      return { de: somarDias(hoje, -89), ate: hoje };
    case 'ano':
      return { de: `${hoje.slice(0, 4)}-01-01`, ate: hoje };
    case 'mes':
      return { de: inicioDoMes(hoje), ate: hoje };
    case 'mesPassado': {
      const inicio = somarMeses(hoje, -1);
      return { de: inicio, ate: somarDias(inicioDoMes(hoje), -1) };
    }
    case 'personalizado':
      return { de: f.de || null, ate: f.ate || null };
    default:
      return { de: null, ate: null };
  }
}

/** Dia local ("AAAA-MM-DD") em que a sessão começou. */
export const diaDaSessao = (s: Sessao) => paraDataISO(new Date(s.inicio));

/** Sessões concluídas que passam no filtro, da mais recente para a mais antiga. */
export function filtrarSessoes(lista: Sessao[], f: Filtro, agora = new Date()): Sessao[] {
  const { de, ate } = intervaloDoPeriodo(f, agora);
  return sessoesValidas(lista)
    .filter((s) => {
      if (s.situacao !== 'concluida') return false;
      if (f.disciplina_id && s.disciplina_id !== f.disciplina_id) return false;
      if (f.tipo && s.tipo !== f.tipo) return false;
      const dia = diaDaSessao(s);
      if (de && dia < de) return false;
      if (ate && dia > ate) return false;
      return true;
    })
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
}

export interface Totais {
  sessoes: number;
  segundos: number;
  paginas: number;
  artigos: number;
  questoes: number;
  acertos: number;
  /** % de acerto (uma casa decimal); null se não houve questões. */
  percentual: number | null;
}

export function totalizar(lista: Sessao[]): Totais {
  const t = lista.reduce(
    (acc, s) => ({
      sessoes: acc.sessoes + 1,
      segundos: acc.segundos + duracaoSegundos(s),
      paginas: acc.paginas + s.paginas,
      artigos: acc.artigos + s.artigos,
      questoes: acc.questoes + s.questoes,
      acertos: acc.acertos + s.acertos,
    }),
    { sessoes: 0, segundos: 0, paginas: 0, artigos: 0, questoes: 0, acertos: 0 },
  );
  return { ...t, percentual: t.questoes ? Math.round((t.acertos / t.questoes) * 1000) / 10 : null };
}

/** Agrupa (já ordenadas) por dia, com o total de tempo de cada dia. */
export function agruparPorDia(lista: Sessao[]): { dia: string; sessoes: Sessao[]; segundos: number }[] {
  const grupos: { dia: string; sessoes: Sessao[]; segundos: number }[] = [];
  for (const s of lista) {
    const dia = diaDaSessao(s);
    let g = grupos[grupos.length - 1];
    if (!g || g.dia !== dia) grupos.push((g = { dia, sessoes: [], segundos: 0 }));
    g.sessoes.push(s);
    g.segundos += duracaoSegundos(s);
  }
  return grupos;
}
