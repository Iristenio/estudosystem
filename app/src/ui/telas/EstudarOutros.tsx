// Tela Estudar — modo "Outros estudos" (R45, R46): escolher o curso e a descrição, o mesmo cronômetro
// (pausar, continuar, finalizar, cancelar) e concluir sem campos extras. Fora do ciclo do concurso.
import { useState } from 'preact/hooks';
import type { CursoExtra, OutraSessao } from '../../dominio/tipos';
import { cursosPorArea, validarInicioOutra } from '../../dominio/outros';
import { duracaoSegundos, formatarDuracao, formatarDuracaoCurta } from '../../dominio/sessoes';
import { useAgora } from '../../dados/ganchos';
import * as acoes from '../acoes/outros';
import { useEstado } from '../estado';
import { IconeLapis, IconeMais } from '../icones';

const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

function Identificacao({ s, cursos }: { s: OutraSessao; cursos: CursoExtra[] }) {
  const c = cursos.find((x) => x.id === s.curso_id);
  return (
    <div class="identificacao">
      <span class="faixa-cor" style={{ background: c?.cor ?? 'var(--borda)' }} />
      <div>
        <strong>{c?.nome ?? 'Curso removido'}</strong>
        <small>
          Outros estudos{c ? ` · ${c.area}` : ''}
          {s.descricao ? ` · ${s.descricao}` : ''}
        </small>
      </div>
    </div>
  );
}

/* ---------------- Iniciar ---------------- */

export function NovaOutra({ cursos, algumaAberta }: { cursos: CursoExtra[]; algumaAberta: boolean }) {
  const { abrirPainel } = useEstado();
  const grupos = cursosPorArea(cursos).map((g) => ({ ...g, cursos: g.cursos.filter((c) => c.ativo) })).filter((g) => g.cursos.length);
  const [cursoId, setCursoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erros, setErros] = useState<string[]>([]);

  async function iniciar(e: Event) {
    e.preventDefault();
    const dados = { curso_id: cursoId, descricao };
    const problemas = validarInicioOutra(dados, cursos, algumaAberta);
    setErros(problemas);
    if (problemas.length) return;
    await acoes.iniciar(dados);
  }

  if (!grupos.length)
    return (
      <div class="vazio">
        <strong>Nenhum curso cadastrado</strong>
        Cadastre os cursos de graduação, pós, Alura… para registrar o tempo.
        <button type="button" class="botao primario" onClick={() => abrirPainel({ tipo: 'curso' })}>
          <IconeMais /> Novo curso
        </button>
      </div>
    );

  return (
    <>
      <label class="rotulo">
        Curso
        <select class="campo campo-largo" value={cursoId} onChange={(e) => setCursoId(e.currentTarget.value)}>
          <option value="" disabled>
            Escolha o curso…
          </option>
          {grupos.map((g) => (
            <optgroup key={g.area} label={g.area}>
              {g.cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <label class="rotulo">
        Descrição (opcional)
        <input class="campo" value={descricao} placeholder="Ex.: Aula 3 – Pandas" onInput={(e) => setDescricao(e.currentTarget.value)} />
      </label>

      {erros.length > 0 && (
        <ul class="erros" role="alert">
          {erros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}

      <button type="button" class="botao primario botao-grande" onClick={iniciar}>
        ▶ Iniciar
      </button>
    </>
  );
}

/* ---------------- Cronômetro ---------------- */

export function CronometroOutro({ s, cursos }: { s: OutraSessao; cursos: CursoExtra[] }) {
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
      <Identificacao s={s} cursos={cursos} />
      <div class="relogio" aria-live="off">
        {formatarDuracao(duracaoSegundos(s, agora))}
      </div>
      <p class="situacao">
        <span class="situacao-ponto" />
        {pausada ? 'Pausada' : 'Em andamento'} · iniciada às {fmtHora.format(new Date(s.inicio))}
        {s.segundos_pausados > 0 && ` · ${formatarDuracaoCurta(s.segundos_pausados)} em pausas`}
      </p>
      <button class="link link-inline" onClick={() => abrirPainel({ tipo: 'outra', id: s.id })}>
        <IconeLapis /> Corrigir horário de início, curso ou descrição
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

/* ---------------- Finalizar (relógio congelado; R46: nada a preencher) ---------------- */

export function FinalizarOutro({ s, cursos }: { s: OutraSessao; cursos: CursoExtra[] }) {
  const { abrirPainel, perguntar, avisar } = useEstado();
  const duracao = duracaoSegundos(s);

  async function concluir() {
    await acoes.concluir(s);
    avisar({ texto: `Sessão concluída: ${formatarDuracaoCurta(duracao)} · outros estudos` });
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
    <section class="cartao cartao-sessao formulario">
      <Identificacao s={s} cursos={cursos} />
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
      <button type="button" class="link link-inline" onClick={() => abrirPainel({ tipo: 'outra', id: s.id })}>
        <IconeLapis /> Corrigir horários, curso ou descrição
      </button>
      <p class="dica">Nada mais a preencher: é só concluir.</p>
      <div class="botoes-cronometro">
        <button type="button" class="botao primario botao-grande" onClick={concluir}>
          ✓ Concluir
        </button>
        <button type="button" class="botao botao-grande" onClick={() => acoes.continuar(s)}>
          Voltar ao cronômetro
        </button>
        <button type="button" class="botao perigo" onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

