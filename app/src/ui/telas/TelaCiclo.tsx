// Tela Ciclo de estudos (por horas — método de Alexandre Meirelles): andamento do ciclo atual, cota de
// cada disciplina, ordem dos blocos (com edição manual, R19) e geração por pesos (R17, R18).
import { useEffect, useState } from 'preact/hooks';
import type { Ciclo, Disciplina, Sessao } from '../../dominio/tipos';
import { ID_CICLO } from '../../dominio/tipos';
import {
  andamentoDoCiclo,
  cotasDoCiclo,
  gerarSequencia,
  incluirPosicao,
  moverPosicao,
  novoCiclo,
  regenerar,
  removerPosicao,
  trocarDisciplina,
  type AndamentoDoCiclo,
} from '../../dominio/ciclo';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { lerNumero, mostrarNumero } from '../../dominio/numeros';
import { formatarDuracaoCurta } from '../../dominio/sessoes';
import { useEntidade } from '../../dados/ganchos';
import { salvarCiclo } from '../acoes/ciclo';
import { useEstado } from '../estado';
import { irPara } from '../rotas';
import { IconeCiclo, IconeFechar, IconeMais, IconeSetaBaixo, IconeSetaCima } from '../icones';

const horas = (h: number) => formatarDuracaoCurta(Math.max(0, h) * 3600);
const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

export function TelaCiclo() {
  const ciclo = useEntidade('ciclo').find((c) => c.id === ID_CICLO) ?? null;
  const disciplinas = useEntidade('disciplinas');
  const sessoes = useEntidade('sessoes');
  const [editando, setEditando] = useState(false);
  const andamento = ciclo && ciclo.sequencia.length ? andamentoDoCiclo(ciclo, sessoes) : null;

  return (
    <>
      <header class="cabecalho">
        <h1>Ciclo de estudos</h1>
        {ciclo && andamento && (
          <span class="sub">
            {horas(andamento.total)} por ciclo · {ciclo.sequencia.length} blocos de {horas(ciclo.sequencia[0].duracao_prevista)}
          </span>
        )}
      </header>
      <div class="conteudo">
        <div class="grade-ciclo">
          <div class="coluna-ciclo">
            {ciclo && andamento ? (
              <>
                <Andamento andamento={andamento} disciplinas={disciplinas} />
                <Cotas andamento={andamento} disciplinas={disciplinas} />
                <Blocos ciclo={ciclo} andamento={andamento} disciplinas={disciplinas} editando={editando} setEditando={setEditando} />
              </>
            ) : (
              <section class="cartao">
                <div class="vazio">
                  <IconeCiclo />
                  <strong>Nenhum ciclo gerado</strong>
                  Informe as horas do ciclo e toque em Gerar ciclo.
                </div>
              </section>
            )}
          </div>
          <Gerar ciclo={ciclo} disciplinas={disciplinas} sessoes={sessoes} />
        </div>
      </div>
    </>
  );
}

const nomeDe = (disciplinas: Disciplina[], id: string) => disciplinas.find((d) => d.id === id && d.status !== 'excluido');

/* ---------------- Ciclo atual: horas feitas e próxima sugerida ---------------- */

function Andamento({ andamento: a, disciplinas }: { andamento: AndamentoDoCiclo; disciplinas: Disciplina[] }) {
  const d = a.proxima ? nomeDe(disciplinas, a.proxima) : undefined;
  const pct = a.total ? Math.min(100, (a.feito / a.total) * 100) : 0;
  const dias = Math.floor((Date.now() - new Date(a.iniciado_em).getTime()) / 86_400_000);
  return (
    <section class="cartao andamento-ciclo">
      <div class="andamento-topo">
        <div>
          <h2>Ciclo {a.numero}</h2>
          <small>
            começou em {fmtData.format(new Date(a.iniciado_em))} ({dias === 0 ? 'hoje' : dias === 1 ? 'há 1 dia' : `há ${dias} dias`})
          </small>
        </div>
        <strong class="andamento-horas">
          {horas(a.feito)} <span>de {horas(a.total)}</span>
        </strong>
      </div>
      <span class="medidor medidor-ciclo" style={{ '--cor': 'var(--primaria)' }} aria-hidden="true">
        <span class="medidor-preench" style={{ width: `${pct}%` }} />
      </span>
      <small class="dica">
        {a.concluido ? 'Ciclo completo: o próximo começa na próxima sessão.' : `Faltam ${horas(a.total - a.feito)} para fechar o ciclo.`}
      </small>
      <div class="proxima-sugerida">
        <span class="faixa-cor" style={{ background: d?.cor ?? 'var(--borda)' }} />
        <span class="proxima-texto">
          <span>Próxima sugerida</span>
          <strong>{d?.nome ?? 'Disciplina removida'}</strong>
        </span>
        <button class="botao primario" onClick={() => irPara('estudar')}>
          Estudar
        </button>
      </div>
    </section>
  );
}

/* ---------------- Cota de cada disciplina ---------------- */

function Cotas({ andamento: a, disciplinas }: { andamento: AndamentoDoCiclo; disciplinas: Disciplina[] }) {
  return (
    <section class="cartao">
      <h2>Horas por disciplina</h2>
      <ul class="cotas-ciclo">
        {a.porDisciplina.map((x) => {
          const d = nomeDe(disciplinas, x.disciplina_id);
          const pct = x.cota ? Math.min(100, (x.feito / x.cota) * 100) : 0;
          const alem = x.feito - x.cota;
          return (
            <li key={x.disciplina_id} class="progresso" style={{ '--cor': d?.cor ?? 'var(--primaria)' }}>
              <div class="progresso-topo">
                <span>
                  <span class="bolinha" style={{ background: d?.cor ?? 'var(--borda)' }} /> {d?.nome ?? 'Disciplina removida'}
                </span>
                <strong>
                  {horas(x.feito)} <small>de {horas(x.cota)}</small>
                  {pct >= 99.9 && ' ✓'}
                </strong>
              </div>
              <span class="medidor">
                <span class="medidor-preench" style={{ width: `${pct}%` }} />
              </span>
              {alem >= 1 / 60 && <small>+{horas(alem)} além da cota</small>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- Ordem dos blocos (com edição manual) ---------------- */

interface PropsBlocos {
  ciclo: Ciclo;
  andamento: AndamentoDoCiclo;
  disciplinas: Disciplina[];
  editando: boolean;
  setEditando: (v: boolean) => void;
}

function Blocos({ ciclo, andamento, disciplinas, editando, setEditando }: PropsBlocos) {
  const { avisar } = useEstado();
  const ativas = ordenarDisciplinas(disciplinas).filter((d) => d.ativa);
  const [nova, setNova] = useState('');
  const proximo = andamento.atual?.ordem ?? null; // R44: segue o último bloco escolhido

  async function aplicar(novo: Ciclo, texto: string) {
    const desfazer = await salvarCiclo(novo);
    avisar({ texto, desfazer });
  }

  return (
    <section class="cartao">
      <h2>
        Ordem dos blocos
        <button class={`botao ${editando ? 'primario' : ''} botao-pequeno`} onClick={() => setEditando(!editando)}>
          {editando ? 'Concluir edição' : 'Editar'}
        </button>
      </h2>
      <p class="dica">
        Cada bloco é cerca de 1 h. As sessões preenchem os blocos da disciplina, em qualquer duração; a ordem só serve para sugerir a próxima.
      </p>

      <ol class="sequencia-ciclo">
        {andamento.blocos.map((b) => {
          const d = nomeDe(disciplinas, b.disciplina_id);
          const estado = b.cumprido ? 'cumprida' : b.ordem === proximo ? 'atual' : 'pendente';
          const pct = Math.min(100, (b.feito / b.duracao) * 100 || 0);
          return (
            <li key={`${b.ordem}-${b.disciplina_id}`} class={`posicao-ciclo ${estado}`}>
              <span class="faixa-cor" style={{ background: d?.cor ?? 'var(--borda)' }} />
              <span class="codigo">{b.ordem}</span>
              <span class="posicao-texto">
                {editando ? (
                  <select
                    class="campo"
                    value={b.disciplina_id}
                    aria-label={`Disciplina do bloco ${b.ordem}`}
                    onChange={(e) => aplicar(trocarDisciplina(ciclo, b.ordem, e.currentTarget.value), 'Disciplina trocada')}
                  >
                    {!d && <option value={b.disciplina_id}>Disciplina removida</option>}
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
                  {b.cumprido ? 'cumprido' : `${horas(b.feito)} de ${horas(b.duracao)}`}
                  {estado === 'atual' && ' · próximo'}
                </small>
              </span>
              {editando ? (
                <span class="acoes-posicao">
                  <button class="botao-icone" aria-label="Subir" disabled={b.ordem === 1} onClick={() => aplicar(moverPosicao(ciclo, b.ordem, -1), 'Bloco movido')}>
                    <IconeSetaCima />
                  </button>
                  <button
                    class="botao-icone"
                    aria-label="Descer"
                    disabled={b.ordem === ciclo.sequencia.length}
                    onClick={() => aplicar(moverPosicao(ciclo, b.ordem, 1), 'Bloco movido')}
                  >
                    <IconeSetaBaixo />
                  </button>
                  <button
                    class="botao-icone"
                    aria-label="Remover bloco"
                    disabled={ciclo.sequencia.length <= 1}
                    onClick={() => aplicar(removerPosicao(ciclo, b.ordem), 'Bloco removido')}
                  >
                    <IconeFechar />
                  </button>
                </span>
              ) : (
                estado === 'atual' && <span class="etiqueta">Próximo</span>
              )}
            </li>
          );
        })}
      </ol>

      {editando && (
        <div class="incluir-posicao">
          <select class="campo" value={nova} onChange={(e) => setNova(e.currentTarget.value)} aria-label="Disciplina do novo bloco">
            <option value="">Novo bloco no fim…</option>
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
              await aplicar(incluirPosicao(ciclo, nova), 'Bloco incluído');
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

function Gerar({ ciclo, disciplinas, sessoes }: { ciclo: Ciclo | null; disciplinas: Disciplina[]; sessoes: Sessao[] }) {
  const { avisar, perguntar } = useEstado();
  const [texto, setTexto] = useState(mostrarNumero(ciclo?.horas_totais ?? 30));
  // Acompanha o ciclo gravado (ao carregar, ao gerar e ao desfazer)
  useEffect(() => {
    if (ciclo) setTexto(mostrarNumero(ciclo.horas_totais));
  }, [ciclo?.horas_totais, ciclo?.atualizado_em]);
  const horasTotais = lerNumero(texto) ?? NaN;
  const { sequencia, erros } = gerarSequencia(disciplinas, horasTotais);
  const cotas = sequencia.length ? cotasDoCiclo({ ...novoCiclo(), sequencia }) : [];

  async function gerar() {
    if (erros.length) return;
    if (ciclo?.sequencia.length) {
      const a = andamentoDoCiclo(ciclo, sessoes);
      const r = await perguntar(
        'Gerar um novo ciclo?',
        [{ valor: 'sim', rotulo: 'Gerar e substituir', estilo: 'perigo' }],
        'Os blocos atuais (inclusive edições) serão substituídos e a contagem recomeça no Ciclo 1.' +
          (a.feito > 0 ? ` O que já foi estudado no Ciclo ${a.numero} (${horas(a.feito)}) fica no histórico, mas não conta no novo ciclo.` : ''),
      );
      if (!r) return;
    }
    const desfazer = await salvarCiclo(regenerar(ciclo ?? novoCiclo(), sequencia, horasTotais));
    avisar({ texto: 'Novo ciclo gerado · Ciclo 1', desfazer });
  }

  return (
    <section class="cartao cartao-gerar">
      <h2>Gerar ciclo por pesos</h2>
      <label class="rotulo">
        Horas por ciclo
        <input class="campo campo-numero" inputMode="decimal" value={texto} onInput={(e) => setTexto(e.currentTarget.value)} />
      </label>
      {erros.length > 0 ? (
        <ul class="erros">
          {erros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      ) : (
        <>
          <p class="dica">
            {sequencia.length} blocos de {horas(sequencia[0].duracao_prevista)}, divididos pelos pesos (Cadastros → Disciplinas):
          </p>
          <ul class="cotas-previa">
            {cotas.map((x) => {
              const d = nomeDe(disciplinas, x.disciplina_id);
              return (
                <li key={x.disciplina_id}>
                  <span class="bolinha" style={{ background: d?.cor ?? 'var(--borda)' }} />
                  <span>{d?.nome}</span>
                  <strong>{horas(x.horas)}</strong>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <button class="botao primario" disabled={erros.length > 0} onClick={gerar}>
        Gerar ciclo
      </button>
    </section>
  );
}
