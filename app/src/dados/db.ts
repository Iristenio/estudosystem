// Banco local (IndexedDB) — a FONTE DA VERDADE do app: tudo é gravado aqui primeiro.
//
// ► Nova entidade? Acrescente a loja em AppDB e crie-a num bloco `if (versaoAntiga < N)`,
//   aumentando VERSAO. Nunca altere blocos antigos (os aparelhos já instalados dependem deles).
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Disciplina, ItemFila, Lei, Sessao } from '../dominio/tipos';

export interface AppDB extends DBSchema {
  disciplinas: { key: string; value: Disciplina };
  leis: { key: string; value: Lei };
  sessoes: { key: string; value: Sessao };
  fila_sync: { key: string; value: ItemFila; indexes: { registro_id: string } };
  config: { key: string; value: { chave: string; valor: unknown } };
}

// Nome próprio: todos os apps do usuário ficam em iristenio.github.io e compartilhariam um banco "app".
export const NOME_BANCO = 'estudosystem';
const VERSAO = 2;

let conexao: Promise<IDBPDatabase<AppDB>> | null = null;

export function abrirBanco(): Promise<IDBPDatabase<AppDB>> {
  conexao ??= openDB<AppDB>(NOME_BANCO, VERSAO, {
    upgrade(db, versaoAntiga) {
      if (versaoAntiga < 1) {
        db.createObjectStore('disciplinas', { keyPath: 'id' });
        db.createObjectStore('leis', { keyPath: 'id' });
        db.createObjectStore('fila_sync', { keyPath: 'id' }).createIndex('registro_id', 'registro_id');
        db.createObjectStore('config', { keyPath: 'chave' });
      }
      if (versaoAntiga < 2) {
        db.createObjectStore('sessoes', { keyPath: 'id' });
      }
    },
  });
  return conexao;
}

/** Só para testes: fecha e esquece a conexão atual. */
export async function fecharBanco() {
  if (conexao) (await conexao).close();
  conexao = null;
}
