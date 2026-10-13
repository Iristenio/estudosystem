// Ações da interface sobre disciplinas e leis: gravam localmente e devolvem a função "Desfazer".
import type { Disciplina, ItemMaterial, Lei } from '../../dominio/tipos';
import { moverDisciplina } from '../../dominio/disciplinas';
import { aplicarMaterial, cursosFora, itensDaDisciplina } from '../../dominio/material';
import { buscar, gravar, type Alteracao } from '../../dados/repositorio';

export type Desfazer = () => Promise<void>;

/** Grava tudo numa transação; "Desfazer" devolve cada registro à versão anterior (ou o exclui, se era novo). */
async function gravarComDesfazer(alteracoes: Alteracao[]): Promise<Desfazer> {
  const anteriores = await gravar(alteracoes);
  return async () => {
    await gravar(
      alteracoes.map((a, i) => {
        const anterior = anteriores[i];
        const registro = anterior ?? { ...a.registro, status: 'excluido' };
        return { entidade: a.entidade, registro, operacao: anterior ? undefined : 'excluir' } as Alteracao;
      }),
    );
  };
}

export const salvarDisciplina = (d: Disciplina) => gravarComDesfazer([{ entidade: 'disciplinas', registro: d }]);

export const salvarLei = (l: Lei) => gravarComDesfazer([{ entidade: 'leis', registro: l }]);

/** R24 — sobe (-1) ou desce (+1) a disciplina na ordem. */
export async function moverDisciplinaNaOrdem(todas: Disciplina[], id: string, direcao: -1 | 1): Promise<Desfazer | null> {
  const mudaram = moverDisciplina(todas, id, direcao);
  if (!mudaram.length) return null;
  return gravarComDesfazer(mudaram.map((registro) => ({ entidade: 'disciplinas', registro })));
}

/** Exclusão lógica da disciplina e das leis dela (quem chama já conferiu que não há sessões — R23). */
export function excluirDisciplina(d: Disciplina, leisDaDisciplina: Lei[]): Promise<Desfazer> {
  return gravarComDesfazer([
    { entidade: 'disciplinas', registro: { ...d, status: 'excluido' }, operacao: 'excluir' },
    ...leisDaDisciplina.map((l) => ({ entidade: 'leis' as const, registro: { ...l, status: 'excluido' as const }, operacao: 'excluir' as const })),
  ]);
}

export const excluirLei = (l: Lei) =>
  gravarComDesfazer([{ entidade: 'leis', registro: { ...l, status: 'excluido' }, operacao: 'excluir' }]);

/**
 * R30–R35 — altera o material da disciplina a partir da versão GRAVADA mais recente (o painel do material
 * e o cadastro não se atropelam) e recalcula os totais. Lançar PDF/vídeo marca "possui PDF/vídeo".
 */
export async function alterarMaterial(
  disciplinaId: string,
  mudar: (itens: ItemMaterial[], fora: string[]) => { itens: ItemMaterial[]; fora: string[] },
): Promise<Desfazer | null> {
  const atual = await buscar('disciplinas', disciplinaId);
  if (!atual) return null;
  const r = mudar(itensDaDisciplina(atual), cursosFora(atual));
  const d = aplicarMaterial(atual, r.itens, r.fora);
  if (r.itens.some((i) => i.tipo === 'PDF')) d.possui_pdf = true;
  if (r.itens.some((i) => i.tipo === 'Video')) d.possui_video = true;
  return gravarComDesfazer([{ entidade: 'disciplinas', registro: d }]);
}
