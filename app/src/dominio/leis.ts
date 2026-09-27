// Regras de negócio das leis secas (R23 da ESPECIFICACAO.md). Funções puras, testadas em leis.test.ts.
import type { Disciplina, Id, Lei } from './tipos';
import { mesmoNome } from './disciplinas';

export function novaLei(campos: Partial<Lei> & { id: Id; disciplina_id: Id }, agora = new Date()): Lei {
  const carimbo = agora.toISOString();
  return {
    nome: '',
    total_artigos: null,
    ativa: true,
    descricao: '',
    status: 'ativo',
    criado_em: carimbo,
    atualizado_em: carimbo,
    ...campos,
  };
}

/** Lista de erros (vazia = válido). O nome não pode se repetir dentro da mesma disciplina. */
export function validarLei(l: Lei, todas: Lei[], disciplinas: Disciplina[]): string[] {
  const erros: string[] = [];
  if (!disciplinas.some((d) => d.id === l.disciplina_id && d.status !== 'excluido')) erros.push('Escolha a disciplina.');
  if (!l.nome.trim()) erros.push('Informe o nome da lei.');
  else if (
    todas.some((o) => o.id !== l.id && o.status !== 'excluido' && o.disciplina_id === l.disciplina_id && mesmoNome(o.nome, l.nome))
  )
    erros.push('Essa disciplina já tem uma lei com esse nome.');
  if (l.total_artigos !== null && !(Number.isInteger(l.total_artigos) && l.total_artigos > 0))
    erros.push('O total de artigos precisa ser um número inteiro maior que zero.');
  return erros;
}

export function normalizarLei(l: Lei): Lei {
  return { ...l, nome: l.nome.trim(), descricao: l.descricao.trim() };
}

/** Agrupa por disciplina, na ordem das disciplinas; dentro de cada uma, por nome. Excluídas ficam de fora. */
export function leisPorDisciplina(leis: Lei[], disciplinasOrdenadas: Disciplina[]): { disciplina: Disciplina; leis: Lei[] }[] {
  return disciplinasOrdenadas
    .map((disciplina) => ({
      disciplina,
      leis: leis
        .filter((l) => l.status !== 'excluido' && l.disciplina_id === disciplina.id)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })),
    }))
    .filter((g) => g.leis.length > 0);
}

/** R23 — uma lei com sessões registradas não pode ser excluída, só desativada. */
export function podeExcluirLei(id: Id, sessoes: { lei_id: Id | null }[]): boolean {
  return !sessoes.some((s) => s.lei_id === id);
}
