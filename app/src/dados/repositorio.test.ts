import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { abrirBanco, fecharBanco, NOME_BANCO } from './db';
import { garantirDadosIniciais, gravar, listarTodos, salvar } from './repositorio';
import { novaDisciplina } from '../dominio/disciplinas';

beforeEach(async () => {
  await fecharBanco();
  await new Promise<void>((ok) => {
    const req = indexedDB.deleteDatabase(NOME_BANCO);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
  });
});

const fila = async () => (await abrirBanco()).getAll('fila_sync');

describe('repositório local', () => {
  it('grava e coloca na fila como "criar"', async () => {
    await salvar('disciplinas', novaDisciplina({ id: 'a', nome: 'Primeiro' }));
    const itens = await fila();
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ entidade: 'disciplinas', registro_id: 'a', operacao: 'criar' });
  });

  it('compacta alterações seguidas e mantém "criar" enquanto não sincronizar', async () => {
    const i = novaDisciplina({ id: 'a', nome: 'v1' });
    await salvar('disciplinas', i);
    await salvar('disciplinas', { ...i, nome: 'v2' });
    await gravar([{ entidade: 'disciplinas', registro: { ...i, nome: 'v3', status: 'excluido' }, operacao: 'excluir' }]);
    const itens = await fila();
    expect(itens).toHaveLength(1);
    expect(itens[0].operacao).toBe('criar');
    expect((itens[0].payload as unknown as { nome: string }).nome).toBe('v3');
  });

  it('preserva criado_em, atualiza atualizado_em e devolve a versão anterior (para Desfazer)', async () => {
    const i = novaDisciplina({ id: 'a', nome: 'v1' }, new Date('2026-01-01T10:00:00Z'));
    await salvar('disciplinas', i);
    const anterior = await salvar('disciplinas', { ...i, nome: 'v2', criado_em: 'lixo' });
    expect(anterior?.nome).toBe('v1');
    const [salvo] = await listarTodos('disciplinas');
    expect(salvo.criado_em).toBe(i.criado_em);
    expect(salvo.atualizado_em).not.toBe(i.atualizado_em);
  });

  it('cria as disciplinas e a lei da planilha uma única vez, mesmo que o usuário as exclua depois', async () => {
    await garantirDadosIniciais();
    expect((await listarTodos('disciplinas')).map((d) => d.id).sort()).toEqual(['D01', 'D02', 'D03', 'D04', 'D05']);
    expect((await listarTodos('leis')).map((l) => l.id)).toEqual(['L01']);
    const [d01] = await listarTodos('disciplinas');
    await salvar('disciplinas', { ...d01, status: 'excluido' });
    await garantirDadosIniciais();
    expect((await listarTodos('disciplinas')).filter((d) => d.status === 'excluido')).toHaveLength(1);
    expect(await listarTodos('disciplinas')).toHaveLength(5);
  });
});
