// Tela Ciclo de estudos: próxima posição (ponteiro), a sequência da volta com as horas feitas,
// edição manual (R19, R22) e geração por pesos (R17, R18).
import { useEffect, useState } from 'preact/hooks';
import type { Ciclo, Disciplina, Sessao } from '../../dominio/tipos';
import { ID_CICLO } from '../../dominio/tipos';
import {
  ajustarPonteiro,
  formatarPosicao,
  gerarSequencia,
  horasFeitasNaVolta,
  incluirPosicao,
  moverPosicao,
  novoCiclo,
  posicaoAtual,
  regenerar,
  removerPosicao,
  trocarDisciplina,
} from '../../dominio/ciclo';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { lerNumero, mostrarNumero } from '../../dominio/numeros';
import { formatarDuracaoCurta } from '../../dominio/sessoes';
import { useEntidade } from '../../dados/ganchos';
import { salvarCiclo } from '../acoes/ciclo';
import { useEstado } from '../estado';
import { irPara } from '../rotas';
import { IconeCiclo, IconeFechar, IconeMais, IconeSetaBaixo, IconeSetaCima } from '../icones';

const horas = (h: number) => formatarDuracaoCurta(h * 3600);

export function TelaCiclo() {
  const ciclo = useEntidade('ciclo').find((c) => c.id === ID_CICLO) ?? null;
  const disciplinas = useEntidade('disciplinas');
  const sessoes = useEntidade('sessoes');
  const [editando, setEditando] = useState(false);

  return (
    <>
      <header class="cabecalho">
        <h1>Ciclo de estudos</h1>
        {ciclo && ciclo.sequencia.length > 0 && (
          <span class="sub">
            {mostrarNumero(ciclo.horas_totais)} h por volta · {ciclo.sequencia.length} posições
          </span>
        )}
      </header>
      <div class="conteudo">
        <div class="grade-ciclo">
          <div class="coluna-ciclo">
            {ciclo && ciclo.sequencia.length > 0 ? (
              <>
                <Proxima ciclo={ciclo} disciplinas={disciplinas} />
                <Sequencia ciclo={ciclo} disciplinas={disciplinas} sessoes={sessoes} editando={editando} setEditando={setEditando} />
              </>
            ) : (
              <section class="cartao">
                <div class="vazio">
                  <IconeCiclo />
                  <strong>Nenhum ciclo gerado</strong>
                  Informe as horas por volta e toque em Gerar ciclo.
                </div>
              </section>
            )}
          </div>
          <Gerar ciclo={ciclo} disciplinas={disciplinas} />
        </div>
      </div>
    </>
  );
}

const nomeDe = (disciplinas: Disciplina[], id: string) => disciplinas.find((d) => d.id === id && d.status !== 'excluido');

/* ---------------- Próxima posição ---------------- */

function Proxima({ ciclo, disciplinas }: { ciclo: Ciclo; disciplinas: Disciplina[] }) {
  const pos = ciclo.sequencia[ciclo.ordem - 1];
  const d = pos ? nomeDe(disciplinas, pos.disciplina_id) : undefined;
  return (
    <section class="cartao proxima-ciclo">
      <span class="faixa-cor" style={{ background: d?.cor ?? 'var(--borda)' }} />
      <div class="proxima-codigo">{posicaoAtual(ciclo)}</div>
      <div class="proxima-texto">
        <span>Próxima disciplina</span>
        <strong>{d?.nome ?? 'Disciplina removida'}</strong>
        <small>
          Volta {ciclo.volta} · posição {ciclo.ordem} de {ciclo.sequencia.length}
          {pos && ` · ${horas(pos.duracao_prevista)} previstas`}
        </small>
      </div>
      <button class="botao primario" onClick={() => irPara('estudar')}>
        Estudar
      </button>
    </section>
  );
}

/* ---------------- Sequência da volta (com edição manual) ---------------- */

interface PropsSequencia {
  ciclo: Ciclo;
  disciplinas: Disciplina[];
  sessoes: Sessao[];
  editando: boolean;
  setEditando: (v: boolean) => void;
}

function Sequencia({ ciclo, disciplinas, sessoes, editando, setEditando }: PropsSequencia) {
  const { avisar } = useEstado();
  const feitas = horasFeitasNaVolta(ciclo, sessoes);
  const ativas = ordenarDisciplinas(disciplinas).filter((d) => d.ativa);
  const [nova, setNova] = useState('');

  async function aplicar(novo: Ciclo, texto: string) {
    const desfazer = await salvarCiclo(novo);
    avisar({ texto, desfazer });
  }

  return (
    <section class="cartao">
      <h2>
        Volta {ciclo.volta}
        <button class={`botao ${editando ? 'primario' : ''} botao-pequeno`} onClick={() => setEditando(!editando)}>
          {editando ? 'Concluir edição' : 'Editar'}
        </button>
      </h2>

      {editando && (
        <div class="ajuste-volta">
          <span>Volta atual</span>
          <button class="botao-icone" aria-label="Volta anterior" disabled={ciclo.volta <= 1} onClick={() => aplicar(ajustarPonteiro(ciclo, ciclo.volta - 1, ciclo.ordem), 'Volta ajustada')}>
            <IconeSetaBaixo />
          </button>
          <strong>{ciclo.volta}</strong>
          <button class="botao-icone" aria-label="Próxima volta" onClick={() => aplicar(ajustarPonteiro(ciclo, ciclo.volta + 1, ciclo.ordem), 'Volta ajustada')}>
            <IconeSetaCima />
          </button>
          <small>Para mudar a posição, toque em “Próxima” na linha desejada.</small>
        </div>
      )}

      <ol class="sequencia-ciclo">
        {ciclo.sequencia.map((p, i) => {
          const ordem = i + 1;
          const d = nomeDe(disciplinas, p.disciplina_id);
          const estado = ordem < ciclo.ordem ? 'cumprida' : ordem === ciclo.ordem ? 'atual' : 'pendente';
          const pct = Math.min(100, (feitas[i] / p.duracao_prevista) * 100 || 0);
          return (
            <li key={`${ordem}-${p.disciplina_id}`} class={`posicao-ciclo ${estado}`}>
              <span class="faixa-cor" style={{ background: d?.cor ?? 'var(--borda)' }} />
              <span class="codigo">{formatarPosicao(ciclo.volta, ordem)}</span>
              <span class="posicao-texto">
                {editando ? (
                  <select
                    class="campo"
                    value={p.disciplina_id}
                    aria-label={`Disciplina da posição ${ordem}`}
                    onChange={(e) => aplicar(trocarDisciplina(ciclo, ordem, e.currentTarget.value), 'Disciplina trocada')}
                  >
                    {!d && <option value={p.disciplina_id}>Disciplina removida</option>}
                    {ordenarDisciplinas(disciplinas).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nome}
                        {x.ativa ? '' : ' (inativa)'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong>{d?.nome ?? 'Disciplina removida'}</strong>
                )}
                <span class="barra-horas" aria-hidden="true">
                  <span style={{ width: `${pct}%`, background: d?.cor ?? 'var(--primaria)' }} />
                </span>
                <small>
                  {horas(feitas[i])} de {horas(p.duracao_prevista)}
                  {estado === 'cumprida' && ' · cumprida'}
                  {estado === 'atual' && ' · próxima'}
                </small>
              </span>
              {editando ? (
                <span class="acoes-posicao">
                  <button class="botao botao-pequeno" disabled={estado === 'atual'} onClick={() => aplicar(ajustarPonteiro(ciclo, ciclo.volta, ordem), `Ponteiro em ${formatarPosicao(ciclo.volta, ordem)}`)}>
                    Próxima
                  </button>
                  <button class="botao-icone" aria-label="Subir" disabled={ordem === 1} onClick={() => aplicar(moverPosicao(ciclo, ordem, -1), 'Posição movida')}>
                    <IconeSetaCima />
                  </button>
                  <button class="botao-icone" aria-label="Descer" disabled={ordem === ciclo.sequencia.length} onClick={() => aplicar(moverPosicao(ciclo, ordem, 1), 'Posição movida')}>
                    <IconeSetaBaixo />
                  </button>
                  <button class="botao-icone" aria-label="Remover posição" disabled={ciclo.sequencia.length <= 1} onClick={() => aplicar(removerPosicao(ciclo, ordem), 'Posição removida')}>
                    <IconeFechar />
                  </button>
                </span>
              ) : (
                estado === 'atual' && <span class="etiqueta">Próxima</span>
              )}
            </li>
          );
        })}
      </ol>

      {editando && (
        <div class="incluir-posicao">
          <select class="campo" value={nova} onChange={(e) => setNova(e.currentTarget.value)} aria-label="Disciplina da nova posição">
            <option value="">Nova posição no fim…</option>
            {ativas.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
          <button
            class="botao"
            disabled={!nova}
            onClick={async () => {
              await aplicar(incluirPosicao(ciclo, nova), 'Posição incluída');
              setNova('');
            }}
          >
            <IconeMais /> Incluir
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------------- Gerar por pesos ---------------- */

function Gerar({ ciclo, disciplinas }: { ciclo: Ciclo | null; disciplinas: Disciplina[] }) {
  const { avisar, perguntar } = useEstado();
  const [texto, setTexto] = useState(mostrarNumero(ciclo?.horas_totais ?? 30));
  // Acompanha o ciclo gravado (ao carregar, ao gerar e ao desfazer)
  useEffect(() => {
    if (ciclo) setTexto(mostrarNumero(ciclo.horas_totais));
  }, [ciclo?.horas_totais, ciclo?.atualizado_em]);
  const horasTotais = lerNumero(texto) ?? NaN;
  const { sequencia, erros } = gerarSequencia(disciplinas, horasTotais);
  const ativas = ordenarDisciplinas(disciplinas).filter((d) => d.ativa);

  async function gerar() {
    if (erros.length) return;
    if (ciclo?.sequencia.length) {
      const r = await perguntar(
        'Gerar um novo ciclo?',
        [{ valor: 'sim', rotulo: 'Gerar e substituir', estilo: 'perigo' }],
        'A sequência atual (inclusive edições manuais) será substituída e a posição volta para 1F1.',
      );
      if (!r) return;
    }
    const desfazer = await salvarCiclo(regenerar(ciclo ?? novoCiclo(), sequencia, horasTotais));
    avisar({ texto: 'Novo ciclo gerado · posição 1F1', desfazer });
  }

  return (
    <section class="cartao cartao-gerar">
      <h2>Gerar ciclo por pesos</h2>
      <label class="rotulo">
        Horas por volta
        <input class="campo campo-numero" inputMode="decimal" value={texto} onInput={(e) => setTexto(e.currentTarget.value)} />
      </label>
      {erros.length > 0 ? (
        <ul class="erros">
          {erros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <p class="dica">
          {sequencia.length} posições de {horas(sequencia[0].duracao_prevista)}, com as {ativas.length} disciplinas ativas (soma dos pesos{' '}
          {ativas.reduce((s, d) => s + d.peso, 0)}). Pesos e ordem vêm de Cadastros → Disciplinas.
        </p>
      )}
      <button class="botao primario" disabled={erros.length > 0} onClick={gerar}>
        Gerar ciclo
      </button>
    </section>
  );
}
