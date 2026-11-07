// Ações dos outros estudos (R45–R49): cronômetro, lançamento à mão, correção, exclusão e cursos.
// Gravam localmente na hora; as que podem ser desfeitas devolvem o "Desfazer".
import type { CursoExtra, OutraSessao } from '../../dominio/tipos';
import * as regra from '../../dominio/outros';
import { aplicarHorarios, continuar as continuarRelogio, finalizar as finalizarRelogio, pausar as pausarRelogio } from '../../dominio/sessoes';
import { gravar, novoId, salvar } from '../../dados/repositorio';
import { gravarComDesfazer } from './cadastros';

export async function iniciar(dados: regra.DadosOutra): Promise<OutraSessao> {
  const s = regra.iniciarOutra(novoId(), dados);
  await salvar('outras_sessoes', s);
  return s;
}

export const pausar = (s: OutraSessao) => salvar('outras_sessoes', pausarRelogio(s));
export const continuar = (s: OutraSessao) => salvar('outras_sessoes', continuarRelogio(s));
export const finalizar = (s: OutraSessao) => salvar('outras_sessoes', finalizarRelogio(s));
export const concluir = (s: OutraSessao) => salvar('outras_sessoes', regra.concluirOutra(s));

/** Cancelar a sessão aberta: some e não conta em nada (como no concurso, R9). */
export async function cancelar(s: OutraSessao) {
  await gravar([{ entidade: 'outras_sessoes', registro: { ...s, status: 'excluido' }, operacao: 'excluir' }]);
}

/** R47/R48 — grava uma sessão lançada à mão ou corrigida (horários, curso, descrição). */
export const salvarSessao = (s: OutraSessao) => gravarComDesfazer([{ entidade: 'outras_sessoes', registro: s }]);

/** Correção de uma sessão (aberta ou concluída): horários já validados, curso e descrição. */
export const corrigir = (s: OutraSessao, inicio: Date, fim: Date | null, curso_id: string, descricao: string) =>
  salvarSessao({ ...aplicarHorarios(s, inicio, fim), curso_id, descricao: descricao.trim() });

/** R48 — exclusão de uma sessão concluída (com Desfazer). */
export const excluirSessao = (s: OutraSessao) =>
  gravarComDesfazer([{ entidade: 'outras_sessoes', registro: { ...s, status: 'excluido' }, operacao: 'excluir' }]);

export const salvarCurso = (c: CursoExtra) => gravarComDesfazer([{ entidade: 'cursos', registro: c }]);

/** R49 — só cursos sem sessões (quem chama já conferiu). */
export const excluirCurso = (c: CursoExtra) =>
  gravarComDesfazer([{ entidade: 'cursos', registro: { ...c, status: 'excluido' }, operacao: 'excluir' }]);
