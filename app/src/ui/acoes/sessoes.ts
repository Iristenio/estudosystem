// Ações do cronômetro: aplicam a regra (dominio/sessoes.ts) e gravam localmente na hora.
import type { Sessao } from '../../dominio/tipos';
import { ID_CICLO } from '../../dominio/tipos';
import { avancar, disciplinaDaSessaoAnterior } from '../../dominio/ciclo';
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
 * Conclui a sessão e avança o ciclo (R20/R21): a sessão guarda a posição cumprida (ex.: "3F2")
 * e o ponteiro anda — tudo numa gravação só. Devolve a posição e se o ponteiro avançou.
 */
export async function concluir(s: Sessao, dados: regra.DadosFinais): Promise<{ posicao: string | null; avancou: boolean }> {
  const concluida = regra.concluir(s, dados);
  const ciclo = await buscar('ciclo', ID_CICLO);
  if (!ciclo) {
    await salvar('sessoes', concluida);
    return { posicao: null, avancou: false };
  }
  const anterior = disciplinaDaSessaoAnterior(concluida, await listarTodos('sessoes'));
  const r = avancar(ciclo, concluida.disciplina_id, anterior);
  const alteracoes: Alteracao[] = [{ entidade: 'sessoes', registro: { ...concluida, posicao_ciclo: r.posicao } }];
  if (r.avancou) alteracoes.push({ entidade: 'ciclo', registro: r.ciclo });
  await gravar(alteracoes);
  return { posicao: r.posicao, avancou: r.avancou };
}

/** R9 — cancelar apaga a sessão aberta: some do app e não conta em nada (sem Desfazer). */
export async function cancelar(s: Sessao) {
  await gravar([{ entidade: 'sessoes', registro: { ...s, status: 'excluido' }, operacao: 'excluir' }]);
}

/** R10–R12 — horários corrigidos (já validados) e descrição da aula. */
export const corrigir = (s: Sessao, inicio: Date, fim: Date | null, aula: string) =>
  salvar('sessoes', { ...regra.aplicarHorarios(s, inicio, fim), aula: aula.trim() });
