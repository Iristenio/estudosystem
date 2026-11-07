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
  /** Material lançado aos poucos (R30–R35); os totais acima são a soma do que conta. */
  materiais: ItemMaterial[];
  /** Cursos com "conta no total" desligado (R32). */
  cursos_fora: string[];
}

export type TipoMaterial = 'PDF' | 'Video';

/** R40 — "parei na página" de um PDF numa sessão (1ª leitura). */
export interface PaginaParada {
  id: Id;
  pagina: number;
}

/** Um PDF ou vídeo do material da disciplina (guardado dentro da disciplina). */
export interface ItemMaterial {
  id: Id;
  tipo: TipoMaterial;
  /** Sequencial dentro do tipo, do curso e da seção; 0 = "Total anterior" (R34). */
  numero: number;
  /** R41 — seção do curso na plataforma (ex.: 1 → itens "1.1", "1.2"…). Sem seção: "Vídeo 3". */
  secao?: number | null;
  nome: string;
  curso: string;
  /** Páginas (PDF) ou minutos (vídeo; com fração quando há segundos). */
  tamanho: number;
  /** Tirado do total sem ser apagado (R32). */
  fora: boolean;
  /** Marcado à mão como já estudado: conta só no mapa, sem sessão (R38). */
  estudado_manual?: boolean;
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

/** Campos do cronômetro, comuns às sessões do concurso e às de outros estudos. */
export interface Cronometrado extends Registro {
  inicio: string; // ISO completo
  /** Fim: preenchido ao concluir. */
  fim: string | null;
  /** Soma das pausas já encerradas. */
  segundos_pausados: number;
  /** Quando o relógio parou (pausa em curso ou "Finalizar"). */
  pausado_desde: string | null;
  situacao: SituacaoSessao;
  status: StatusRegistro;
}

/* ---------------- Outros estudos (graduação, pós, Alura… — seção 10 da ESPECIFICACAO) ---------------- */

/** Curso de outros estudos, dentro de uma área (ex.: Alura → Python para Dados). */
export interface CursoExtra extends Registro {
  area: string;
  nome: string;
  cor: string;
  ativo: boolean;
  status: StatusRegistro;
}

/** Sessão de outros estudos: só curso, horários e descrição (R45–R48). */
export interface OutraSessao extends Cronometrado {
  curso_id: Id;
  descricao: string;
}

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
  /** Lei Seca: quantos artigos (calculado das faixas; nas sessões antigas, o número digitado). */
  artigos: number;
  /** Lei Seca: quais artigos, em faixas ("1-10, 15"). Vazio nas sessões anteriores a 13/10/2026 (R29). */
  artigos_lidos: string;
  questoes: number;
  acertos: number;
  situacao: SituacaoSessao;
  /** PDF/VideoAula: ids dos itens do material estudados nesta sessão (R36). */
  materiais_estudados: Id[];
  /** PDF, 1ª leitura: página em que parou em cada PDF marcado (R40). */
  paginas_paradas: PaginaParada[];
  /** Posição do ciclo cumprida (ex.: "3F2") — preenchida a partir da etapa 4. */
  posicao_ciclo: string | null;
  /** Cancelar = "excluido": some do app e não conta em nada (a sincronização precisa do registro). */
  status: StatusRegistro;
}

/* ---------------- Ciclo de estudos (antigas abas Config_Ciclo e Ciclo_Atual) ---------------- */

export interface PosicaoCiclo {
  disciplina_id: Id;
  /** Horas previstas para esta posição (ex.: 30 h ÷ soma dos pesos 8 = 3,75). */
  duracao_prevista: number;
}

/** Registro único (id "atual"): horas do ciclo, blocos (cota de cada disciplina) e o nº do ciclo atual. */
export interface Ciclo extends Registro {
  horas_totais: number;
  sequencia: PosicaoCiclo[];
  /** Número do ciclo atual (Ciclo 1, 2, 3…). O nome do campo vem da versão antiga ("volta"). */
  volta: number;
  /** Não é mais usado (era o ponteiro da versão por sessões); mantido pela planilha. */
  ordem: number;
  /** Quando a sequência foi gerada. */
  gerado_em: string | null;
  /** Início do ciclo atual (nº em `volta`): as sessões a partir daqui preenchem as cotas (R20). */
  iniciado_em: string | null;
}

export const ID_CICLO = 'atual';

/** Nomes das entidades sincronizadas (cada uma vira uma loja local e uma aba na planilha). */
export const ENTIDADES = ['disciplinas', 'leis', 'sessoes', 'ciclo', 'cursos', 'outras_sessoes'] as const;
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

/** Aparência: seguir o sistema do aparelho ou fixar claro/escuro. */
export type Tema = 'sistema' | 'claro' | 'escuro';

/** Preferências do usuário (valem por aparelho). */
export interface Config {
  tema: Tema;
  primeiro_dia_semana: 0 | 1; // 0 = domingo, 1 = segunda
}

export const CONFIG_PADRAO: Config = {
  tema: 'sistema',
  primeiro_dia_semana: 0,
};
