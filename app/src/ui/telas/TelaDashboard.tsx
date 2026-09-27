// Dashboard: indicadores e gráficos do período escolhido, com a animação ao rolar do Sistema PCA.
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { Disciplina } from '../../dominio/tipos';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { FILTRO_PADRAO, filtrarSessoes, intervaloDoPeriodo, ROTULO_PERIODO, type Filtro, type Periodo } from '../../dominio/historico';
import { indicadores, primeiroDia, serieDoPeriodo, tempoPorDisciplina, tempoPorTipo, horasPorMes } from '../../dominio/painel';
import { duracaoSegundos, formatarDuracaoCurta, ROTULO_TIPO } from '../../dominio/sessoes';
import { deDataISO, hojeISO } from '../../dominio/datas';
import { useEntidade } from '../../dados/ganchos';
import {
  AlternarTabela,
  BarrasHorizontais,
  ContextoAnimar,
  Contador,
  GraficoColunas,
  ProvedorDica,
  Revelar,
  type Barra,
  type Coluna,
} from '../componentes/Graficos';
import { IconeGrafico } from '../icones';

const PERIODOS: Periodo[] = ['7dias', '30dias', '90dias', 'mes', 'mesPassado', 'ano', 'tudo'];
const fmtInt = (n: number) => Math.round(n).toLocaleString('pt-BR');
const fmtDec = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtDec2 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 5.5 h → "5h30" */
const fmtHoras = (h: number) => formatarDuracaoCurta(h * 3600);
const fmtEixoHoras = (h: number) => (h === 0 ? '0' : `${String(h).replace('.', ',')} h`);
const fmtDiaCurto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fmtDiaLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtMesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const fmtMesLongo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const COR_SERIE = 'var(--primaria)';

export function TelaDashboard() {
  const sessoes = useEntidade('sessoes');
  const disciplinas = useEntidade('disciplinas');
  const [filtro, setFiltro] = useState<Filtro>({ ...FILTRO_PADRAO, periodo: '30dias' });
  // Depois que o usuário mexe num filtro, os valores atualizam direto, sem animar de novo
  const [animar, setAnimar] = useState(true);
  const mudar = (parcial: Partial<Filtro>) => {
    setAnimar(false);
    setFiltro((f) => ({ ...f, ...parcial }));
  };

  const lista = filtrarSessoes(sessoes, filtro);
  const ind = indicadores(lista);
  const hoje = hojeISO();
  const intervalo = intervaloDoPeriodo(filtro);
  const de = intervalo.de ?? primeiroDia(lista) ?? hoje;
  const serie = serieDoPeriodo(lista, de, intervalo.ate ?? hoje);
  // "Horas por mês" mostra sempre o ano atual (só o filtro de disciplina vale)
  const doAno = filtrarSessoes(sessoes, { ...FILTRO_PADRAO, periodo: 'ano', disciplina_id: filtro.disciplina_id });
  const meses = horasPorMes(doAno, `${hoje.slice(0, 4)}-01-01`, `${hoje.slice(0, 4)}-12-31`);
  const porDisciplina = tempoPorDisciplina(lista, disciplinas);
  const porTipo = tempoPorTipo(lista);
  const diasComEstudo = serie.granularidade === 'dia' ? serie.pontos.filter((p) => p.segundos > 0).length : null;

  return (
    <ProvedorDica>
      <ContextoAnimar.Provider value={animar}>
        <header class="cabecalho">
          <h1>Dashboard</h1>
          <span class="sub">{ROTULO_PERIODO[filtro.periodo].toLowerCase()}</span>
        </header>
        <div class={`conteudo painel-dados${animar ? '' : ' sem-anim'}`}>
          <div class="filtros">
            <select class="campo" value={filtro.periodo} onChange={(e) => mudar({ periodo: e.currentTarget.value as Periodo })} aria-label="Período">
              {PERIODOS.map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PERIODO[p]}
                </option>
              ))}
            </select>
            <select class="campo" value={filtro.disciplina_id} onChange={(e) => mudar({ disciplina_id: e.currentTarget.value })} aria-label="Disciplina">
              <option value="">Todas as disciplinas</option>
              {ordenarDisciplinas(disciplinas).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Indicadores */}
          <Revelar class="kpis">
            <div class="kpi kpi-heroi">
              <span>Tempo de estudo</span>
              <strong>
                <Contador valor={ind.segundos / 3600} formatar={fmtHoras} />
              </strong>
              <small>
                {fmtInt(ind.sessoes)} {ind.sessoes === 1 ? 'sessão' : 'sessões'}
                {diasComEstudo !== null && ` · ${diasComEstudo} ${diasComEstudo === 1 ? 'dia' : 'dias'} com estudo`}
              </small>
            </div>
            <Kpi rotulo="Média por sessão" valor={ind.mediaSegundos / 60} formatar={(n) => `${fmtInt(n)} min`} />
            <Kpi rotulo="Páginas lidas" valor={ind.paginas} formatar={fmtInt} extra={ind.minutosPorPagina !== null ? `${fmtDec2(ind.minutosPorPagina)} min por página` : undefined} />
            <Kpi
              rotulo="Questões"
              valor={ind.questoes}
              formatar={fmtInt}
              extra={ind.percentualAcerto !== null ? `${fmtDec(ind.percentualAcerto)}% de acerto · ${fmtDec2(ind.minutosPorQuestao!)} min cada` : undefined}
            />
            <Kpi rotulo="Horas de vídeo" valor={ind.horasVideo} formatar={fmtHoras} />
            <Kpi rotulo="Artigos de lei" valor={ind.artigos} formatar={fmtInt} />
          </Revelar>

          {lista.length === 0 ? (
            <div class="vazio">
              <IconeGrafico />
              <strong>Nenhuma sessão no período</strong>
              Conclua sessões em Estudar ou escolha outro período.
            </div>
          ) : (
            <>
              <CartaoGrafico titulo={serie.granularidade === 'dia' ? 'Horas por dia' : 'Horas por mês no período'} atraso={0}>
                {(tabela) =>
                  tabela ? (
                    <Tabela
                      cabecalho={[serie.granularidade === 'dia' ? 'Dia' : 'Mês', 'Tempo']}
                      linhas={serie.pontos.map((p) => [rotuloLongo(p.chave, serie.granularidade), formatarDuracaoCurta(p.segundos)])}
                    />
                  ) : (
                    <GraficoColunas
                      descricao="Horas estudadas no período"
                      formatarEixo={fmtEixoHoras}
                      colunas={colunasDe(serie.pontos, serie.granularidade)}
                    />
                  )
                }
              </CartaoGrafico>

              <div class="grade-painel">
                <CartaoGrafico titulo="Tempo por disciplina" atraso={0}>
                  {(tabela) =>
                    tabela ? (
                      <Tabela cabecalho={['Disciplina', 'Tempo', '%']} linhas={porDisciplina.map((x) => [x.disciplina?.nome ?? 'Disciplina removida', formatarDuracaoCurta(x.segundos), `${fmtDec((x.segundos / ind.segundos) * 100)}%`])} />
                    ) : (
                      <BarrasHorizontais barras={porDisciplina.map((x) => barraDisciplina(x, ind.segundos))} />
                    )
                  }
                </CartaoGrafico>
                <CartaoGrafico titulo="Tempo por tipo de estudo" atraso={120}>
                  {(tabela) =>
                    tabela ? (
                      <Tabela cabecalho={['Tipo', 'Tempo', '%']} linhas={porTipo.map((x) => [ROTULO_TIPO[x.tipo], formatarDuracaoCurta(x.segundos), `${fmtDec((x.segundos / ind.segundos) * 100)}%`])} />
                    ) : (
                      <BarrasHorizontais
                        barras={porTipo.map((x) => ({
                          chave: x.tipo,
                          rotulo: ROTULO_TIPO[x.tipo],
                          valor: x.segundos,
                          texto: formatarDuracaoCurta(x.segundos),
                          cor: COR_SERIE,
                          dica: { titulo: ROTULO_TIPO[x.tipo], linhas: [{ valor: formatarDuracaoCurta(x.segundos), rotulo: `${fmtDec((x.segundos / ind.segundos) * 100)}% do tempo` }] },
                        }))}
                      />
                    )
                  }
                </CartaoGrafico>
              </div>
            </>
          )}

          <CartaoGrafico titulo={`Horas por mês em ${hoje.slice(0, 4)}`} atraso={0}>
            {(tabela) =>
              tabela ? (
                <Tabela cabecalho={['Mês', 'Tempo']} linhas={meses.map((p) => [rotuloLongo(p.chave, 'mes'), formatarDuracaoCurta(p.segundos)])} />
              ) : (
                <GraficoColunas descricao={`Horas estudadas por mês em ${hoje.slice(0, 4)}`} formatarEixo={fmtEixoHoras} colunas={colunasDe(meses, 'mes')} />
              )
            }
          </CartaoGrafico>

          {ind.ultima && (
            <Revelar class="cartao ultima-sessao">
              <span>Última sessão</span>
              <strong>{disciplinas.find((d) => d.id === ind.ultima!.disciplina_id)?.nome ?? 'Disciplina removida'}</strong>
              <small>
                {fmtDataHora.format(new Date(ind.ultima.inicio))} · {ROTULO_TIPO[ind.ultima.tipo]} · {formatarDuracaoCurta(duracaoSegundos(ind.ultima))}
              </small>
            </Revelar>
          )}
        </div>
      </ContextoAnimar.Provider>
    </ProvedorDica>
  );
}

function Kpi({ rotulo, valor, formatar, extra }: { rotulo: string; valor: number; formatar: (n: number) => string; extra?: string }) {
  return (
    <div class="kpi">
      <span>{rotulo}</span>
      <strong>
        <Contador valor={valor} formatar={formatar} />
      </strong>
      {extra && <small>{extra}</small>}
    </div>
  );
}

function CartaoGrafico({ titulo, atraso, children }: { titulo: string; atraso: number; children: (tabela: boolean) => ComponentChildren }) {
  const [tabela, setTabela] = useState(false);
  return (
    <Revelar class="cartao cartao-grafico" atraso={atraso}>
      <h2>
        {titulo}
        <AlternarTabela tabela={tabela} aoMudar={setTabela} />
      </h2>
      {children(tabela)}
    </Revelar>
  );
}

function Tabela({ cabecalho, linhas }: { cabecalho: string[]; linhas: string[][] }) {
  return (
    <div class="tabela-rolagem">
      <table class="tabela">
        <thead>
          <tr>
            {cabecalho.map((c, i) => (
              <th key={c} class={i ? 'num' : ''}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              {l.map((c, j) => (
                <td key={j} class={j ? 'num' : ''}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function rotuloLongo(chave: string, granularidade: 'dia' | 'mes'): string {
  const texto = granularidade === 'dia' ? fmtDiaLongo.format(deDataISO(chave)) : fmtMesLongo.format(deDataISO(`${chave}-01`));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Colunas com rótulos espaçados no eixo X (não mais que ~10 rótulos). */
function colunasDe(pontos: { chave: string; segundos: number }[], granularidade: 'dia' | 'mes'): Coluna[] {
  const cada = Math.max(1, Math.ceil(pontos.length / 10));
  return pontos.map((p, i) => {
    const data = deDataISO(granularidade === 'dia' ? p.chave : `${p.chave}-01`);
    const curto = granularidade === 'dia' ? fmtDiaCurto.format(data) : fmtMesCurto.format(data).replace('.', '');
    const mostrar = (pontos.length - 1 - i) % cada === 0; // sempre rotula o mais recente
    return {
      chave: p.chave,
      rotulo: mostrar ? curto : '',
      valor: p.segundos / 3600,
      dica: { titulo: rotuloLongo(p.chave, granularidade), linhas: [{ valor: p.segundos ? formatarDuracaoCurta(p.segundos) : 'sem estudo', cor: p.segundos ? COR_SERIE : undefined }] },
    };
  });
}

function barraDisciplina(x: { id: string; disciplina: Disciplina | null; segundos: number }, total: number): Barra {
  const nome = x.disciplina?.nome ?? 'Disciplina removida';
  return {
    chave: x.id,
    rotulo: nome,
    valor: x.segundos,
    texto: formatarDuracaoCurta(x.segundos),
    cor: x.disciplina?.cor ?? 'var(--borda)',
    dica: { titulo: nome, linhas: [{ valor: formatarDuracaoCurta(x.segundos), rotulo: `${fmtDec((x.segundos / total) * 100)}% do tempo`, cor: x.disciplina?.cor }] },
  };
}
