// Entidades do app.
// Datas: "AAAA-MM-DD" (data), "HH:mm" (hora) e ISO completo (carimbos de data-hora).
//
// ► Para criar uma entidade nova, siga o roteiro em ARQUITETURA.md ("Adicionar uma entidade").

export type Id = string;

/** Campos que TODA entidade sincronizada precisa ter. */
export interface Registro {
  id: Id;
  criado_em: string;
  atualizado_em: string;
}

/** Exclusão lógica: nada é apagado de verdade (a sincronização precisa avisar os outros aparelhos). */
export type StatusRegistro = 'ativo' | 'excluido';

/* ---------------- Disciplina (antiga aba Config_Disciplinas) ---------------- */

export interface Disciplina extends Registro {
  nome: string;
  categoria: string;
  /** Inativa: some do ciclo e dos painéis, mas o histórico continua guardado. */
  ativa: boolean;
  ordem: number;
  peso: number;
  possui_pdf: boolean;
  total_paginas: number | null;
  possui_video: boolean;
  total_horas_video: number | null;
  cor: string; // #rrggbb
  observacoes: string;
  status: StatusRegistro;
}

/* ---------------- Lei seca (antiga aba Leis) ---------------- */

export interface Lei extends Registro {
  disciplina_id: Id;
  nome: string;
  total_artigos: number | null;
  ativa: boolean;
  descricao: string;
  status: StatusRegistro;
}

/* ---------------- Sessão de estudo (antiga aba Cronograma) ---------------- */

export const TIPOS_SESSAO = ['PDF', 'VideoAula', 'Revisão', 'Lei Seca', 'Questões'] as const;
export type TipoSessao = (typeof TIPOS_SESSAO)[number];

/** andamento → pausada ⇄ andamento → finalizando (relógio congelado) → concluida */
export type SituacaoSessao = 'andamento' | 'pausada' | 'finalizando' | 'concluida';

export interface Sessao extends Registro {
  disciplina_id: Id;
  tipo: TipoSessao;
  aula: string;
  lei_id: Id | null; // só no tipo Lei Seca
  inicio: string; // ISO completo
  /** Fim: preenchido ao concluir. */
  fim: string | null;
  /** Soma das pausas já encerradas. */
  segundos_pausados: number;
  /** Quando o relógio parou (pausa em curso ou "Finalizar"). */
  pausado_desde: string | null;
  paginas: number;
  artigos: number;
  questoes: number;
  acertos: number;
  situacao: SituacaoSessao;
  /** Posição do ciclo cumprida (ex.: "3F2") — preenchida a partir da etapa 4. */
  posicao_ciclo: string | null;
  /** Cancelar = "excluido": some do app e não conta em nada (a sincronização precisa do registro). */
  status: StatusRegistro;
}

/** Nomes das entidades sincronizadas (cada uma vira uma loja local e uma aba na planilha). */
export const ENTIDADES = ['disciplinas', 'leis', 'sessoes'] as const;
export type Entidade = (typeof ENTIDADES)[number];

/* ---------------- Infraestrutura ---------------- */

export interface ItemFila {
  id: Id;
  entidade: Entidade;
  registro_id: Id;
  operacao: 'criar' | 'alterar' | 'excluir';
  payload: Registro;
  tentativas: number;
  ultimo_erro: string | null;
  criado_em: string;
}

/** Preferências do usuário (valem por aparelho). */
export interface Config {
  primeiro_dia_semana: 0 | 1; // 0 = domingo, 1 = segunda
}

export const CONFIG_PADRAO: Config = {
  primeiro_dia_semana: 0,
};
