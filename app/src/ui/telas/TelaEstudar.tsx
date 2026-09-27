// Tela Estudar: iniciar sessão → cronômetro (pausar/continuar) → finalizar (campos finais) → concluída.
// Ao lado, as sessões de hoje.
import { useState } from 'preact/hooks';
import type { Disciplina, Lei, Sessao, TipoSessao } from '../../dominio/tipos';
import { TIPOS_SESSAO } from '../../dominio/tipos';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { lerNumero } from '../../dominio/numeros';
import {
  concluidasDoDia,
  duracaoSegundos,
  erros as calcularErros,
  formatarDuracao,
  formatarDuracaoCurta,
  leisDisponiveis,
  percentualAcerto,
  resumoProducao,
  ROTULO_TIPO,
  sessaoAberta,
  validarDadosFinais,
  validarInicio,
} from '../../dominio/sessoes';
import { useAgora, useEntidade } from '../../dados/ganchos';
import * as acoes from '../acoes/sessoes';
import { useEstado } from '../estado';
import { irPara } from '../rotas';
import { IconeCronometro, IconeLapis } from '../icones';

const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export function TelaEstudar() {
  const sessoes = useEntidade('sessoes');
  const disciplinas = useEntidade('disciplinas');
  const leis = useEntidade('leis');
  const aberta = sessaoAberta(sessoes);

  return (
    <>
      <header class="cabecalho">
        <h1>Estudar</h1>
        <span class="sub">{fmtDataLonga.format(new Date())}</span>
      </header>
      <div class="conteudo">
        <div class="grade-estudar">
          {!aberta && <NovaSessao disciplinas={disciplinas} leis={leis} sessoes={sessoes} />}
          {aberta && aberta.situacao !== 'finalizando' && <Cronometro s={aberta} disciplinas={disciplinas} leis={leis} />}
          {aberta && aberta.situacao === 'finalizando' && <Finalizar s={aberta} disciplinas={disciplinas} leis={leis} />}
          <Hoje sessoes={sessoes} disciplinas={disciplinas} />
        </div>
      </div>
    </>
  );
}

/* ---------------- Cabeçalho comum: disciplina, tipo, lei e aula ---------------- */

function Identificacao({ s, disciplinas, leis }: { s: Sessao; disciplinas: Disciplina[]; leis: Lei[] }) {
  const d = disciplinas.find((x) => x.id === s.disciplina_id);
  const lei = s.lei_id ? leis.find((l) => l.id === s.lei_id) : null;
  return (
    <div class="identificacao">
      <span class="faixa-cor" style={{ background: d?.cor ?? 'var(--borda)' }} />
      <div>
        <strong>{d?.nome ?? 'Disciplina removida'}</strong>
        <small>
          {ROTULO_TIPO[s.tipo]}
          {lei && ` · ${lei.nome}`}
          {s.aula ? ` · ${s.aula}` : ' · sem descrição da aula'}
        </small>
      </div>
    </div>
  );
}

/* ---------------- 1. Nova sessão ---------------- */

function NovaSessao({ disciplinas, leis, sessoes }: { disciplinas: Disciplina[]; leis: Lei[]; sessoes: Sessao[] }) {
  const [disciplinaId, setDisciplinaId] = useState('');
  const [tipo, setTipo] = useState<TipoSessao | null>(null);
  const [leiId, setLeiId] = useState<string | null>(null);
  const [aula, setAula] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const ativas = ordenarDisciplinas(disciplinas).filter((d) => d.ativa);
  const opcoesLei = disciplinaId ? leisDisponiveis(leis, disciplinaId) : [];

  function escolherDisciplina(id: string) {
    setDisciplinaId(id);
    setLeiId(null);
    setErros([]);
  }

  async function iniciar(e: Event) {
    e.preventDefault();
    const dados = { disciplina_id: disciplinaId, tipo, aula, lei_id: leiId };
    const problemas = validarInicio(dados, disciplinas, leis, sessoes);
    setErros(problemas);
    if (problemas.length) return;
    await acoes.iniciar(dados);
  }

  if (!ativas.length) {
    return (
      <section class="cartao cartao-sessao">
        <div class="vazio">
          <IconeCronometro />
          <strong>Nenhuma disciplina ativa</strong>
          Cadastre ou ative uma disciplina para começar.
          <button class="botao primario" onClick={() => irPara('disciplinas')}>
            Ir para Disciplinas
          </button>
        </div>
      </section>
    );
  }

  return (
    <form class="cartao cartao-sessao formulario" onSubmit={iniciar}>
      <h2>
        <IconeCronometro /> Nova sessão
      </h2>

      <fieldset>
        <legend>Disciplina</legend>
        <div class="chips">
          {ativas.map((d) => (
            <button key={d.id} type="button" class="chip" aria-pressed={d.id === disciplinaId} onClick={() => escolherDisciplina(d.id)}>
              <span class="bolinha" style={{ background: d.cor }} />
              {d.nome}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Tipo de estudo</legend>
        <div class="segmentado" role="radiogroup">
          {TIPOS_SESSAO.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={t === tipo}
              onClick={() => {
                setTipo(t);
                setErros([]);
              }}
            >
              {ROTULO_TIPO[t]}
            </button>
          ))}
        </div>
      </fieldset>

      {tipo === 'Lei Seca' && (
        <label class="rotulo">
          Lei
          {disciplinaId && opcoesLei.length === 0 ? (
            <p class="dica">Esta disciplina não tem leis ativas. Cadastre em Cadastros → Leis secas.</p>
          ) : (
            <select class="campo campo-largo" value={leiId ?? ''} onChange={(e) => setLeiId(e.currentTarget.value || null)}>
              <option value="">{disciplinaId ? 'Escolha a lei…' : 'Escolha antes a disciplina'}</option>
              {opcoesLei.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          )}
        </label>
      )}

      <label class="rotulo">
        Aula (opcional)
        <input class="campo" value={aula} placeholder="Ex.: Controle concentrado - ADI" onInput={(e) => setAula(e.currentTarget.value)} />
      </label>

      {erros.length > 0 && (
        <ul class="erros" role="alert">
          {erros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}

      <button type="submit" class="botao primario botao-grande">
        ▶ Iniciar
      </button>
    </form>
  );
}

/* ---------------- 2. Cronômetro ---------------- */

function Cronometro({ s, disciplinas, leis }: { s: Sessao; disciplinas: Disciplina[]; leis: Lei[] }) {
  const { abrirPainel, perguntar } = useEstado();
  const agora = useAgora(1000);
  const pausada = s.situacao === 'pausada';

  async function cancelar() {
    const r = await perguntar(
      'Cancelar esta sessão?',
      [{ valor: 'sim', rotulo: 'Sim, apagar sessão', estilo: 'perigo' }],
      'A sessão será apagada e não contará em nada.',
    );
    if (r) await acoes.cancelar(s);
  }

  return (
    <section class={`cartao cartao-sessao cronometro${pausada ? ' pausada' : ''}`}>
      <Identificacao s={s} disciplinas={disciplinas} leis={leis} />

      <div class="relogio" aria-live="off">
        {formatarDuracao(duracaoSegundos(s, agora))}
      </div>
      <p class="situacao">
        <span class="situacao-ponto" />
        {pausada ? 'Pausada' : 'Em andamento'} · iniciada às {fmtHora.format(new Date(s.inicio))}
        {s.segundos_pausados > 0 && ` · ${formatarDuracaoCurta(s.segundos_pausados)} em pausas`}
      </p>

      <button class="link link-inline" onClick={() => abrirPainel({ tipo: 'horarios', id: s.id })}>
        <IconeLapis /> Corrigir horário de início ou aula
      </button>

      <div class="botoes-cronometro">
        {pausada ? (
          <button class="botao primario botao-grande" onClick={() => acoes.continuar(s)}>
            ▶ Continuar
          </button>
        ) : (
          <button class="botao primario botao-grande" onClick={() => acoes.pausar(s)}>
            ❚❚ Pausar
          </button>
        )}
        <button class="botao botao-grande" onClick={() => acoes.finalizar(s)}>
          ■ Finalizar
        </button>
        <button class="botao perigo" onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

/* ---------------- 3. Finalizar (relógio congelado) ---------------- */

function Finalizar({ s, disciplinas, leis }: { s: Sessao; disciplinas: Disciplina[]; leis: Lei[] }) {
  const { abrirPainel, perguntar, avisar } = useEstado();
  const [textos, setTextos] = useState({ paginas: '', artigos: '', questoes: '', acertos: '' });
  const [erros, setErros] = useState<string[]>([]);
  const dados = {
    paginas: lerNumero(textos.paginas),
    artigos: lerNumero(textos.artigos),
    questoes: lerNumero(textos.questoes),
    acertos: lerNumero(textos.acertos),
  };
  const duracao = duracaoSegundos(s);
  const campo = (chave: keyof typeof textos, rotulo: string) => (
    <label class="rotulo">
      {rotulo}
      <input
        class="campo campo-numero"
        inputMode="numeric"
        placeholder="0"
        value={textos[chave]}
        onInput={(e) => setTextos({ ...textos, [chave]: e.currentTarget.value })}
      />
    </label>
  );
  const parcial = { questoes: dados.questoes ?? 0, acertos: dados.acertos ?? 0 };

  async function concluir(e: Event) {
    e.preventDefault();
    const problemas = validarDadosFinais(s.tipo, dados);
    setErros(problemas);
    if (problemas.length) return;
    await acoes.concluir(s, dados);
    avisar({ texto: `Sessão concluída: ${formatarDuracaoCurta(duracao)}` });
  }

  async function cancelar() {
    const r = await perguntar(
      'Cancelar esta sessão?',
      [{ valor: 'sim', rotulo: 'Sim, apagar sessão', estilo: 'perigo' }],
      'A sessão será apagada e não contará em nada.',
    );
    if (r) await acoes.cancelar(s);
  }

  return (
    <form class="cartao cartao-sessao formulario" onSubmit={concluir}>
      <Identificacao s={s} disciplinas={disciplinas} leis={leis} />

      <div class="resumo-final">
        <div>
          <span>Duração</span>
          <strong>{formatarDuracao(duracao)}</strong>
        </div>
        <div>
          <span>Das</span>
          <strong>
            {fmtHora.format(new Date(s.inicio))} às {fmtHora.format(new Date(s.pausado_desde!))}
          </strong>
        </div>
      </div>
      <button type="button" class="link link-inline" onClick={() => abrirPainel({ tipo: 'horarios', id: s.id })}>
        <IconeLapis /> Corrigir horários ou aula
      </button>

      {s.tipo === 'PDF' && <div class="linha">{campo('paginas', 'Páginas lidas')}</div>}
      {s.tipo === 'Lei Seca' && <div class="linha">{campo('artigos', 'Artigos lidos')}</div>}
      {s.tipo === 'Questões' && (
        <div class="linha campos-questoes">
          {campo('questoes', 'Questões')}
          {campo('acertos', 'Acertos')}
          <div class="calculado">
            <span>Erros</span>
            <strong>{Math.max(0, calcularErros(parcial))}</strong>
          </div>
          <div class="calculado">
            <span>Acerto</span>
            <strong>{String(percentualAcerto(parcial)).replace('.', ',')}%</strong>
          </div>
        </div>
      )}
      {(s.tipo === 'VideoAula' || s.tipo === 'Revisão') && <p class="dica">Nada mais a preencher: é só concluir.</p>}

      {erros.length > 0 && (
        <ul class="erros" role="alert">
          {erros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}

      <div class="botoes-cronometro">
        <button type="submit" class="botao primario botao-grande">
          ✓ Concluir
        </button>
        <button type="button" class="botao botao-grande" onClick={() => acoes.continuar(s)}>
          Voltar ao cronômetro
        </button>
        <button type="button" class="botao perigo" onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

/* ---------------- Sessões de hoje ---------------- */

function Hoje({ sessoes, disciplinas }: { sessoes: Sessao[]; disciplinas: Disciplina[] }) {
  const hoje = concluidasDoDia(sessoes);
  const total = hoje.reduce((soma, s) => soma + duracaoSegundos(s), 0);
  return (
    <section class="cartao cartao-hoje">
      <h2>
        Hoje <span class="total-hoje">{formatarDuracao(total)}</span>
      </h2>
      {hoje.length === 0 ? (
        <p class="dica">Nenhuma sessão concluída hoje.</p>
      ) : (
        <ul class="lista-hoje">
          {hoje.map((s) => {
            const d = disciplinas.find((x) => x.id === s.disciplina_id);
            const producao = resumoProducao(s);
            return (
              <li key={s.id}>
                <span class="bolinha" style={{ background: d?.cor ?? 'var(--borda)' }} />
                <span class="lista-hoje-texto">
                  <strong>{d?.nome ?? 'Disciplina removida'}</strong>
                  <small>
                    {fmtHora.format(new Date(s.inicio))} · {ROTULO_TIPO[s.tipo]}
                    {producao && ` · ${producao}`}
                    {s.aula && ` · ${s.aula}`}
                  </small>
                </span>
                <span class="lista-hoje-duracao">{formatarDuracaoCurta(duracaoSegundos(s))}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
