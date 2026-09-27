// Histórico de sessões concluídas: filtros, totais do filtro e lista por dia.
// Tocar numa sessão abre a correção (só horários e aula podem mudar — R15).
import { useState } from 'preact/hooks';
import type { Disciplina, Lei, Sessao, TipoSessao } from '../../dominio/tipos';
import { TIPOS_SESSAO } from '../../dominio/tipos';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { agruparPorDia, FILTRO_PADRAO, filtrarSessoes, ROTULO_PERIODO, totalizar, type Filtro, type Periodo } from '../../dominio/historico';
import { duracaoSegundos, formatarDuracao, formatarDuracaoCurta, resumoProducao, ROTULO_TIPO } from '../../dominio/sessoes';
import { deDataISO } from '../../dominio/datas';
import { useEntidade } from '../../dados/ganchos';
import { useEstado } from '../estado';
import { IconeLapis, IconeLista } from '../icones';

const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const fmtDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtNum = (n: number) => n.toLocaleString('pt-BR');

export function TelaSessoes() {
  const sessoes = useEntidade('sessoes');
  const disciplinas = useEntidade('disciplinas');
  const leis = useEntidade('leis');
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_PADRAO);
  const lista = filtrarSessoes(sessoes, filtro);
  const totais = totalizar(lista);
  const grupos = agruparPorDia(lista);
  const mudar = (parcial: Partial<Filtro>) => setFiltro((atual) => ({ ...atual, ...parcial }));

  return (
    <>
      <header class="cabecalho">
        <h1>Sessões</h1>
        <span class="sub">{ROTULO_PERIODO[filtro.periodo].toLowerCase()}</span>
      </header>
      <div class="conteudo">
        <div class="filtros">
          <select class="campo" value={filtro.periodo} onChange={(e) => mudar({ periodo: e.currentTarget.value as Periodo })} aria-label="Período">
            {(Object.keys(ROTULO_PERIODO) as Periodo[]).map((p) => (
              <option key={p} value={p}>
                {ROTULO_PERIODO[p]}
              </option>
            ))}
          </select>
          {filtro.periodo === 'personalizado' && (
            <>
              <input type="date" class="campo" value={filtro.de} onInput={(e) => mudar({ de: e.currentTarget.value })} aria-label="De" />
              <span class="ate">até</span>
              <input type="date" class="campo" value={filtro.ate} onInput={(e) => mudar({ ate: e.currentTarget.value })} aria-label="Até" />
            </>
          )}
          <select class="campo" value={filtro.disciplina_id} onChange={(e) => mudar({ disciplina_id: e.currentTarget.value })} aria-label="Disciplina">
            <option value="">Todas as disciplinas</option>
            {ordenarDisciplinas(disciplinas).map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
          <select class="campo" value={filtro.tipo} onChange={(e) => mudar({ tipo: e.currentTarget.value as TipoSessao | '' })} aria-label="Tipo">
            <option value="">Todos os tipos</option>
            {TIPOS_SESSAO.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO[t]}
              </option>
            ))}
          </select>
          {(filtro.disciplina_id || filtro.tipo || filtro.periodo !== FILTRO_PADRAO.periodo) && (
            <button class="link link-inline" onClick={() => setFiltro(FILTRO_PADRAO)}>
              Limpar filtros
            </button>
          )}
        </div>

        <div class="totais">
          <Total rotulo="Tempo" valor={formatarDuracao(totais.segundos)} destaque />
          <Total rotulo="Sessões" valor={fmtNum(totais.sessoes)} />
          {totais.paginas > 0 && <Total rotulo="Páginas" valor={fmtNum(totais.paginas)} />}
          {totais.questoes > 0 && (
            <Total
              rotulo="Questões"
              valor={fmtNum(totais.questoes)}
              extra={`${fmtNum(totais.acertos)} acertos · ${String(totais.percentual).replace('.', ',')}%`}
            />
          )}
          {totais.artigos > 0 && <Total rotulo="Artigos" valor={fmtNum(totais.artigos)} />}
        </div>

        {grupos.length === 0 ? (
          <div class="vazio">
            <IconeLista />
            <strong>Nenhuma sessão</strong>
            Nenhuma sessão concluída com esses filtros.
          </div>
        ) : (
          grupos.map((g) => (
            <section key={g.dia} class="dia-sessoes">
              <h2>
                <span>{fmtDia.format(deDataISO(g.dia))}</span>
                <span class="dia-total">{formatarDuracaoCurta(g.segundos)}</span>
              </h2>
              <ul class="lista-itens">
                {g.sessoes.map((s) => (
                  <LinhaSessao key={s.id} s={s} disciplinas={disciplinas} leis={leis} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}

function Total({ rotulo, valor, extra, destaque }: { rotulo: string; valor: string; extra?: string; destaque?: boolean }) {
  return (
    <div class={`total${destaque ? ' destaque' : ''}`}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
      {extra && <small>{extra}</small>}
    </div>
  );
}

function LinhaSessao({ s, disciplinas, leis }: { s: Sessao; disciplinas: Disciplina[]; leis: Lei[] }) {
  const { abrirPainel } = useEstado();
  const d = disciplinas.find((x) => x.id === s.disciplina_id);
  const lei = s.lei_id ? leis.find((l) => l.id === s.lei_id) : null;
  const producao = resumoProducao(s);
  const detalhes = [
    `${fmtHora.format(new Date(s.inicio))}–${s.fim ? fmtHora.format(new Date(s.fim)) : ''}`,
    ROTULO_TIPO[s.tipo],
    lei?.nome,
    producao,
    s.aula,
  ].filter(Boolean);

  return (
    <li>
      <button class="linha-item linha-cadastro linha-sessao" onClick={() => abrirPainel({ tipo: 'horarios', id: s.id })}>
        <span class="faixa-cor" style={{ background: d?.cor ?? 'var(--borda)' }} />
        <span class="linha-item-texto">
          <strong>{d?.nome ?? 'Disciplina removida'}</strong>
          <small>{detalhes.join(' · ')}</small>
        </span>
        <span class="duracao-sessao">{formatarDuracaoCurta(duracaoSegundos(s))}</span>
        <IconeLapis class="icone-editar" />
      </button>
    </li>
  );
}
