// Ações sobre o ciclo: gravam o novo ciclo e devolvem "Desfazer" (volta à versão anterior).
import type { Ciclo } from '../../dominio/tipos';
import { salvar } from '../../dados/repositorio';

export type Desfazer = () => Promise<void>;

export async function salvarCiclo(novo: Ciclo): Promise<Desfazer> {
  const anterior = await salvar('ciclo', novo);
  return async () => {
    if (anterior) await salvar('ciclo', anterior);
  };
}
