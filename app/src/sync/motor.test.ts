// Testa o ciclo completo app ↔ backend usando o MESMO núcleo do Apps Script (backend/nucleo.js),
// com a planilha simulada em memória.
import 'fake-indexeddb/auto';
import { createRequire } from 'node:module';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { abrirBanco, fecharBanco, NOME_BANCO } from '../dados/db';
import { buscar, listarFila, salvar, salvarInterno } from '../dados/repositorio';
import { novaDisciplina } from '../dominio/disciplinas';
import { finalizar, iniciarSessao } from '../dominio/sessoes';
import { baixarTudo, decodificarCodigo, lerEstadoSync, sincronizar } from './motor';

const require = createRequire(import.meta.url);
const nucleo = require('../../../backend/nucleo.js');

const TOKEN = 'segredo';
let tabelas: Record<string, ReturnType<typeof nucleo.tabelaEmMemoria>>;
let relogio = 0;
const agoraServidor = () => new Date(Date.UTC(2026, 0, 1, 12, 0, relogio++)).toISOString();

function instalarServidor() {
  tabelas = Object.fromEntries(Object.keys(nucleo.ESQUEMA).map((e) => [e, nucleo.tabelaEmMemoria()]));
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const req = JSON.parse(String(init.body));
    const corpo = req.token !== TOKEN ? { ok: false, erro: 'Token inválido', codigo: 401 } : nucleo.processar(tabelas, req, agoraServidor());
    return { ok: true, status: 200, json: async () => corpo } as Response;
  });
}

/** Simula outro aparelho enviando uma alteração direto ao servidor. */
function outroAparelhoEnvia(entidade: string, payload: { id: string }) {
  nucleo.processar(tabelas, { acao: 'sincronizar', operacoes: [{ id: 'x' + payload.id, entidade, registro_id: payload.id, operacao: 'alterar', payload }] }, agoraServidor());
}

beforeEach(async () => {
  await fecharBanco();
  await new Promise<void>((ok) => {
    const req = indexedDB.deleteDatabase(NOME_BANCO);
    req.onsuccess = req.onerror = req.onblocked = () => ok();
  });
  instalarServidor();
  await salvarInterno('_conexao', { url: 'https://exemplo/exec', token: TOKEN });
});

const item = (id: string, titulo: string, atualizado = '2026-01-01T10:00:00.000Z') =>
  ({ ...novaDisciplina({ id, nome: titulo }), atualizado_em: atualizado, criado_em: atualizado });

describe('código de conexão', () => {
  it('decodifica o formato APP1', () => {
    const b64 = btoa(JSON.stringify({ u: 'https://script.google.com/macros/s/x/exec', t: 'abc' })).replace(/\+/g, '-').replace(/\//g, '_');
    expect(decodificarCodigo(`  APP1:${b64} `)).toEqual({ url: 'https://script.google.com/macros/s/x/exec', token: 'abc' });
    expect(decodificarCodigo('qualquer coisa')).toBeNull();
  });
});

describe('núcleo do backend', () => {
  it('sessão: linha ↔ registro preserva tipos (nulos, números e textos)', () => {
    const s = finalizar(
      iniciarSessao('s1', { disciplina_id: 'D01', tipo: 'Questões', aula: 'ADI', lei_id: null }, new Date('2026-08-03T08:00:00Z')),
      new Date('2026-08-03T09:00:00Z'),
    );
    const reg = { ...s, segundos_pausados: 45, questoes: 10, acertos: 7 };
    expect(nucleo.linhaParaRegistro('sessoes', nucleo.registroParaLinha('sessoes', reg, 'T'))).toEqual(reg);
  });

  it('linha ↔ registro preserva tipos', () => {
    const reg = { ...item('a', 'x'), total_paginas: null, total_horas_video: 36.5, ativa: false };
    expect(nucleo.linhaParaRegistro('disciplinas', nucleo.registroParaLinha('disciplinas', reg, 'T'))).toEqual(reg);
  });
  it('versão antiga não sobrescreve a mais nova', () => {
    outroAparelhoEnvia('disciplinas', item('a', 'nova', '2026-01-01T12:00:00.000Z'));
    outroAparelhoEnvia('disciplinas', item('a', 'velha', '2026-01-01T09:00:00.000Z'));
    expect(tabelas.disciplinas.linhas()[0][1]).toBe('nova');
  });
});

describe('sincronização', () => {
  it('envia a fila local e a esvazia', async () => {
    await salvar('disciplinas', item('i1', 'Primeiro'));
    await sincronizar();
    expect(await listarFila()).toHaveLength(0);
    expect(tabelas.disciplinas.linhas().map((l: string[]) => l[1])).toEqual(['Primeiro']);
    expect(lerEstadoSync().status).toBe('sincronizado');
  });

  it('recebe o que outro aparelho enviou, sem devolver à fila', async () => {
    outroAparelhoEnvia('disciplinas', item('i9', 'Do celular'));
    await sincronizar();
    expect((await buscar('disciplinas', 'i9'))?.nome).toBe('Do celular');
    expect(await listarFila()).toHaveLength(0);
  });

  it('token inválido vira erro e mantém a fila', async () => {
    await salvarInterno('_conexao', { url: 'https://exemplo/exec', token: 'errado' });
    await salvar('disciplinas', item('i1', 'x'));
    await sincronizar();
    expect(lerEstadoSync().status).toBe('erro');
    expect(await listarFila()).toHaveLength(1);
  });

  it('envia em lotes', async () => {
    for (let n = 0; n < 120; n++) await salvar('disciplinas', item(`i${n}`, `item ${n}`));
    await sincronizar();
    expect(await listarFila()).toHaveLength(0);
    expect(tabelas.disciplinas.linhas()).toHaveLength(120);
  });

  it('"baixar tudo" restaura um aparelho vazio', async () => {
    outroAparelhoEnvia('disciplinas', item('i1', 'a'));
    await sincronizar();
    await (await abrirBanco()).clear('disciplinas');
    await baixarTudo();
    expect((await buscar('disciplinas', 'i1'))?.nome).toBe('a');
  });
});
