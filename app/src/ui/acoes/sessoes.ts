// Ações do cronômetro: aplicam a regra (dominio/sessoes.ts) e gravam localmente na hora.
import type { Sessao } from '../../dominio/tipos';
import * as regra from '../../dominio/sessoes';
import { gravar, novoId, salvar } from '../../dados/repositorio';

export async function iniciar(dados: regra.DadosInicio): Promise<Sessao> {
  const s = regra.iniciarSessao(novoId(), dados);
  await salvar('sessoes', s);
  return s;
}

export const pausar = (s: Sessao) => salvar('sessoes', regra.pausar(s));
export const continuar = (s: Sessao) => salvar('sessoes', regra.continuar(s));
export const finalizar = (s: Sessao) => salvar('sessoes', regra.finalizar(s));
export const concluir = (s: Sessao, dados: regra.DadosFinais) => salvar('sessoes', regra.concluir(s, dados));

/** R9 — cancelar apaga a sessão aberta: some do app e não conta em nada (sem Desfazer). */
export async function cancelar(s: Sessao) {
  await gravar([{ entidade: 'sessoes', registro: { ...s, status: 'excluido' }, operacao: 'excluir' }]);
}

/** R10–R12 — horários corrigidos (já validados) e descrição da aula. */
export const corrigir = (s: Sessao, inicio: Date, fim: Date | null, aula: string) =>
  salvar('sessoes', { ...regra.aplicarHorarios(s, inicio, fim), aula: aula.trim() });
