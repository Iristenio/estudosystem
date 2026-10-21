// Ações do cronômetro: aplicam a regra (dominio/sessoes.ts) e gravam localmente na hora.
import type { PaginaParada, Sessao } from '../../dominio/tipos';
import { ID_CICLO } from '../../dominio/tipos';
import { registrarConclusao } from '../../dominio/ciclo';
import * as regra from '../../dominio/sessoes';
import { buscar, gravar, listarTodos, novoId, salvar, type Alteracao } from '../../dados/repositorio';

export async function iniciar(dados: regra.DadosInicio): Promise<Sessao> {
  const s = regra.iniciarSessao(novoId(), dados);
  await salvar('sessoes', s);
  return s;
}

export const pausar = (s: Sessao) => salvar('sessoes', regra.pausar(s));
export const continuar = (s: Sessao) => salvar('sessoes', regra.continuar(s));
export const finalizar = (s: Sessao) => salvar('sessoes', regra.finalizar(s));
/**
 * Conclui a sessão e soma o tempo na cota da disciplina no ciclo (R20/R21): a sessão guarda em qual
 * ciclo contou ("C3"); se o total foi atingido, o ciclo fecha e começa o próximo — numa gravação só.
 */
export async function concluir(
  s: Sessao,
  dados: regra.DadosFinais,
): Promise<{ numero: number; fechou: boolean; feito: number; total: number } | null> {
  const concluida = regra.concluir(s, dados);
  const ciclo = await buscar('ciclo', ID_CICLO);
  if (!ciclo || !ciclo.sequencia.length) {
    await salvar('sessoes', concluida);
    return null;
  }
  const todas = (await listarTodos('sessoes')).map((x) => (x.id === concluida.id ? concluida : x));
  const r = registrarConclusao(ciclo, concluida, todas);
  const alteracoes: Alteracao[] = [{ entidade: 'sessoes', registro: { ...concluida, posicao_ciclo: r.posicao } }];
  if (r.ciclo !== ciclo) alteracoes.push({ entidade: 'ciclo', registro: r.ciclo });
  await gravar(alteracoes);
  return { numero: r.numero, fechou: r.fechou, feito: r.feito, total: r.total };
}

/** R9 — cancelar apaga a sessão aberta: some do app e não conta em nada (sem Desfazer). */
export async function cancelar(s: Sessao) {
  await gravar([{ entidade: 'sessoes', registro: { ...s, status: 'excluido' }, operacao: 'excluir' }]);
}

/** R10–R12, R28 e R36 — horários (já validados), aula, faixas de artigos (Lei Seca) e material estudado (PDF/VideoAula). */
export function corrigir(
  s: Sessao,
  inicio: Date,
  fim: Date | null,
  aula: string,
  faixas: string | null = null,
  materiais: string[] | null = null,
  paradas: PaginaParada[] | null = null,
) {
  let r = { ...regra.aplicarHorarios(s, inicio, fim), aula: aula.trim() };
  if (faixas?.trim()) r = regra.corrigirArtigos(r, faixas);
  if (materiais) r = regra.corrigirMateriais(r, materiais, paradas);
  return salvar('sessoes', r);
}
