// Regras de negócio das disciplinas (R23, R24 da ESPECIFICACAO.md).
// Funções PURAS (sem tela, sem banco) — testadas em disciplinas.test.ts.
import type { Disciplina, Id } from './tipos';

/** Paleta sugerida no formulário (a cor também pode ser escolhida livremente). */
export const CORES_DISCIPLINA = [
  '#30503a', '#2e7d5b', '#1f7a8c', '#3b6fd1', '#5a74dd', '#7b4fc7',
  '#b0447a', '#c0392b', '#d9822b', '#ba9121', '#dabe34', '#6d6d6d',
];

export function novaDisciplina(campos: Partial<Disciplina> & { id: Id }, agora = new Date()): Disciplina {
  const carimbo = agora.toISOString();
  return {
    nome: '',
    categoria: '',
    ativa: true,
    ordem: 1,
    peso: 1,
    possui_pdf: true,
    total_paginas: null,
    possui_video: true,
    total_horas_video: null,
    cor: CORES_DISCIPLINA[0],
    observacoes: '',
    status: 'ativo',
    criado_em: carimbo,
    atualizado_em: carimbo,
    ...campos,
  };
}

/** Compara nomes sem diferenciar maiúsculas, acentos e espaços nas pontas. */
export function mesmoNome(a: string, b: string): boolean {
  const normal = (t: string) => t.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');
  return normal(a) === normal(b);
}

/** Lista de erros (vazia = válido). `todas` = disciplinas já cadastradas (para checar nome repetido). */
export function validarDisciplina(d: Disciplina, todas: Disciplina[]): string[] {
  const erros: string[] = [];
  if (!d.nome.trim()) erros.push('Informe o nome da disciplina.');
  else if (todas.some((o) => o.id !== d.id && o.status !== 'excluido' && mesmoNome(o.nome, d.nome)))
    erros.push('Já existe uma disciplina com esse nome.');
  if (!Number.isInteger(d.peso) || d.peso < 1) erros.push('O peso precisa ser um número inteiro, a partir de 1.');
  if (d.possui_pdf && d.total_paginas !== null && !(Number.isInteger(d.total_paginas) && d.total_paginas > 0))
    erros.push('O total de páginas precisa ser um número inteiro maior que zero.');
  if (d.possui_video && d.total_horas_video !== null && !(d.total_horas_video > 0))
    erros.push('O total de horas de vídeo precisa ser maior que zero.');
  if (!/^#[0-9a-f]{6}$/i.test(d.cor)) erros.push('Escolha uma cor.');
  return erros;
}

/** Prepara para gravar: tira espaços, deixa o nome em maiúsculas e zera totais de materiais que não existem. */
export function normalizarDisciplina(d: Disciplina): Disciplina {
  return {
    ...d,
    nome: d.nome.trim().toLocaleUpperCase('pt-BR'),
    categoria: d.categoria.trim().toLocaleUpperCase('pt-BR'),
    observacoes: d.observacoes.trim(),
    total_paginas: d.possui_pdf ? d.total_paginas : null,
    total_horas_video: d.possui_video ? d.total_horas_video : null,
  };
}

/** Por ordem (e nome, em caso de empate); excluídas ficam de fora. */
export function ordenarDisciplinas(lista: Disciplina[]): Disciplina[] {
  return lista
    .filter((d) => d.status !== 'excluido')
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function proximaOrdem(lista: Disciplina[]): number {
  return ordenarDisciplinas(lista).reduce((max, d) => Math.max(max, d.ordem), 0) + 1;
}

/**
 * R24 — move a disciplina uma posição para cima (-1) ou para baixo (+1) e renumera 1, 2, 3…
 * Devolve só as disciplinas cuja ordem mudou (as que precisam ser gravadas).
 */
export function moverDisciplina(lista: Disciplina[], id: Id, direcao: -1 | 1): Disciplina[] {
  const ordenadas = ordenarDisciplinas(lista);
  const i = ordenadas.findIndex((d) => d.id === id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= ordenadas.length) return [];
  [ordenadas[i], ordenadas[j]] = [ordenadas[j], ordenadas[i]];
  return ordenadas.filter((d, n) => d.ordem !== n + 1).map((d) => ({ ...d, ordem: ordenadas.indexOf(d) + 1 }));
}

/** Categorias já usadas (para sugerir no formulário). */
export function categoriasUsadas(lista: Disciplina[]): string[] {
  return [...new Set(ordenarDisciplinas(lista).map((d) => d.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * R23 — uma disciplina com sessões registradas não pode ser excluída, só desativada.
 * `sessoes` = qualquer lista com disciplina_id (as sessões chegam na etapa 2).
 */
export function podeExcluirDisciplina(id: Id, sessoes: { disciplina_id: Id }[]): boolean {
  return !sessoes.some((s) => s.disciplina_id === id);
}
