// Grava a importação da planilha antiga numa única transação (depois sincroniza normalmente).
import type { Sessao } from '../../dominio/tipos';
import type { ResultadoImportacao } from '../../dominio/importacao';
import { gravar, type Alteracao } from '../../dados/repositorio';

/** Disciplinas, leis e ciclo da planilha substituem os do app; das sessões, só as novas entram. */
export async function importar(r: ResultadoImportacao, novas: Sessao[]): Promise<void> {
  const alteracoes: Alteracao[] = [
    ...r.disciplinas.map((registro) => ({ entidade: 'disciplinas' as const, registro })),
    ...r.leis.map((registro) => ({ entidade: 'leis' as const, registro })),
    ...(r.ciclo ? [{ entidade: 'ciclo' as const, registro: r.ciclo }] : []),
    ...novas.map((registro) => ({ entidade: 'sessoes' as const, registro })),
  ];
  await gravar(alteracoes);
}
