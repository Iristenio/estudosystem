// Tela Outros estudos (seção 10 da ESPECIFICACAO): "Onde está meu tempo" (Concurso × áreas), tempo por
// dia (30 dias, um curso em cada cor), totais por curso e área no período, sessões e cursos.
import { useState } from 'preact/hooks';
import type { CursoExtra, OutraSessao } from '../../dominio/tipos';
import {
  concluidasNoIntervalo,
  cursosPorArea,
  intervaloOutros,
  ondeEstaMeuTempo,
  outrasConcluidas,
  ROTULO_PERIODO_OUTROS,
  tempoPorArea,
  tempoPorDiaOutros,
  type PeriodoOutros,
  type TempoDeArea,
} from '../../dominio/outros';
import { deDataISO } from '../../dominio/datas';
import { ColunasEmpilhadas, ProvedorDica, type ColunaEmpilhada } from '../componentes/Graficos';
import { duracaoSegundos, formatarDuracaoCurta } from '../../dominio/sessoes';
import { useAgora, useEntidade } from '../../dados/ganchos';
import { useEstado } from '../estado';
import { irPara } from '../rotas';
import { IconeCapelo, IconeMais } from '../icones';

const fmtDia = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** Sessões agrupadas por dia (mais recente primeiro), com o total do dia. */
function porDia(lista: OutraSessao[]) {
  const dias = new Map<string, OutraSessao[]>();
  for (const s of lista) {
    const chave = new Date(s.inicio).toDateString();
    dias.set(chave, [...(dias.get(chave) ?? []), s]);
  }
  return [...dias.values()].map((sessoes) => ({
    data: new Date(sessoes[0].inicio),
    sessoes,
    total: sessoes.reduce((t, s) => t + duracaoSegundos(s), 0),
  }));
}

const fmtDiaCurto = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const fmtDiaLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtPct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const fmtEixoHoras = (h: number) => (h === 0 ? '0' : `${String(h).replace('.', ',')} h`);
const COR_CONCURSO = 'var(--primaria)';

export function TelaOutros() {
  const { abrirPainel } = useEstado();
  const cursos = useEntidade('cursos');
  const todasOutras = useEntidade('outras_sessoes');
  const sessoesConcurso = useEntidade('sessoes');
  const sessoes = outrasConcluidas(todasOutras);
  const grupos = cursosPorArea(cursos);
  const curso = (id: string): CursoExtra | undefined => cursos.find((c) => c.id === id);
  const [periodo, setPeriodo] = useState<PeriodoOutros>('semana');
  // A sessão em andamento (concurso ou outros) também conta, e os números se atualizam sozinhos
  const agora = useAgora(15_000);
  const emAndamento = [...todasOutras, ...sessoesConcurso].some((s) => s.status !== 'excluido' && s.situacao !== 'concluida');
  const { de, ate } = intervaloOutros(periodo);
  const areas = tempoPorArea(concluidasNoIntervalo(todasOutras, de, ate, true), cursos);
  const segundosConcurso = concluidasNoIntervalo(sessoesConcurso, de, ate, true).reduce((t, s) => t + duracaoSegundos(s, agora), 0);
  const tempoDoCurso = new Map(areas.flatMap((a) => a.cursos.map((c) => [c.curso_id, c.segundos] as const)));
  const tempoDaArea = new Map(areas.map((a) => [a.area, a.segundos]));

  return (
    <ProvedorDica>
      <header class="cabecalho">
        <h1>Outros estudos</h1>
        <span class="sub">graduação, pós, Alura… fora do concurso</span>
        <select class="campo campo-periodo" value={periodo} aria-label="Período" onChange={(e) => setPeriodo(e.currentTarget.value as PeriodoOutros)}>
          {(Object.keys(ROTULO_PERIODO_OUTROS) as PeriodoOutros[]).map((p) => (
            <option key={p} value={p}>
              {ROTULO_PERIODO_OUTROS[p]}
            </option>
          ))}
        </select>
      </header>
      <div class="conteudo">
        <div class="grade-outros-topo">
          <OndeEstaMeuTempo segundosConcurso={segundosConcurso} areas={areas} periodo={periodo} emAndamento={emAndamento} />
          <TempoPorDia sessoes={todasOutras} cursos={cursos} agora={agora} />
        </div>
        <div class="grade-outros">
          <section class="cartao">
            <h2>
              Sessões
              <button class="botao botao-pequeno" disabled={!cursos.some((c) => c.status !== 'excluido')} onClick={() => abrirPainel({ tipo: 'outra' })}>
                <IconeMais /> Lançar sessão
              </button>
            </h2>
            {sessoes.length === 0 ? (
              <div class="vazio">
                <IconeCapelo />
                <strong>Nenhuma sessão ainda</strong>
                Em Estudar, escolha "Outros estudos" para usar o cronômetro, ou lance aqui uma sessão que já aconteceu.
                <button class="botao" onClick={() => irPara('estudar')}>
                  Ir para Estudar
                </button>
              </div>
            ) : (
              porDia(sessoes).map((dia) => (
                <div key={dia.data.toDateString()} class="dia-outros">
                  <h3>
                    <span>{fmtDia.format(dia.data)}</span>
                    <span>{formatarDuracaoCurta(dia.total)}</span>
                  </h3>
                  <ul class="lista-itens compacta">
                    {dia.sessoes.map((s) => {
                      const c = curso(s.curso_id);
                      return (
                        <li key={s.id}>
                          <button class="linha-item" onClick={() => abrirPainel({ tipo: 'outra', id: s.id })}>
                            <span class="bolinha" style={{ background: c?.cor ?? 'var(--borda)' }} />
                            <span class="linha-item-texto">
                              <strong>{c?.nome ?? 'Curso removido'}</strong>
                              <small>
                                {fmtHora.format(new Date(s.inicio))}–{fmtHora.format(new Date(s.fim!))}
                                {c && ` · ${c.area}`}
                                {s.descricao && ` · ${s.descricao}`}
                              </small>
                            </span>
                            <span class="lista-hoje-duracao">{formatarDuracaoCurta(duracaoSegundos(s))}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))
            )}
          </section>

          <section class="cartao">
            <h2>
              Cursos
              <button class="botao botao-pequeno" onClick={() => abrirPainel({ tipo: 'curso' })}>
                <IconeMais /> Novo curso
              </button>
            </h2>
            {grupos.length > 0 && <p class="dica">Tempo de cada curso: {ROTULO_PERIODO_OUTROS[periodo].toLowerCase()}.</p>}
            {grupos.length === 0 ? (
              <p class="dica">Cadastre as áreas e os cursos (ex.: Graduação → Engenharia de Software; Alura → Python para Dados).</p>
            ) : (
              grupos.map((g) => (
                <div key={g.area} class="area-outros">
                  <h3>
                    <span>
                      {g.area}
                      {tempoDaArea.get(g.area) ? ` · ${formatarDuracaoCurta(tempoDaArea.get(g.area)!)}` : ''}
                    </span>
                    <button
                      class="botao-icone pequeno"
                      aria-label={`Novo curso em ${g.area}`}
                      title="Novo curso nesta área"
                      onClick={() => abrirPainel({ tipo: 'curso', area: g.area })}
                    >
                      <IconeMais />
                    </button>
                  </h3>
                  <ul class="lista-itens compacta">
                    {g.cursos.map((c) => (
                      <li key={c.id}>
                        <button class={`linha-item${c.ativo ? '' : ' inativa'}`} onClick={() => abrirPainel({ tipo: 'curso', id: c.id })}>
                          <span class="bolinha" style={{ background: c.cor }} />
                          <span class="linha-item-texto">
                            <strong>
                              {c.nome}
                              {!c.ativo && <span class="etiqueta neutra">Inativo</span>}
                            </strong>
                          </span>
                          <span class="lista-hoje-duracao">{tempoDoCurso.get(c.id) ? formatarDuracaoCurta(tempoDoCurso.get(c.id)!) : '—'}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    </ProvedorDica>
  );
}

/* ---------------- Onde está meu tempo (Concurso × áreas; tocar numa área mostra os cursos) ---------------- */

function OndeEstaMeuTempo({
  segundosConcurso,
  areas,
  periodo,
  emAndamento,
}: {
  segundosConcurso: number;
  areas: TempoDeArea[];
  periodo: PeriodoOutros;
  emAndamento: boolean;
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  const itens = ondeEstaMeuTempo(segundosConcurso, areas);
  const total = itens.reduce((t, x) => t + x.segundos, 0);
  const max = Math.max(1, ...itens.map((x) => x.segundos));
  const corDaArea = (area: string) => areas.find((a) => a.area === area)?.cursos[0]?.curso?.cor ?? 'var(--texto-2)';

  return (
    <section class="cartao">
      <h2>
        Onde está meu tempo
        <span class="total-hoje">{formatarDuracaoCurta(total)}</span>
      </h2>
      {itens.length === 0 ? (
        <p class="dica">Nenhum estudo registrado: {ROTULO_PERIODO_OUTROS[periodo].toLowerCase()}.</p>
      ) : (
        <ul class="barras-h onde-tempo">
          {itens.map((x) => {
            const area = x.chave.startsWith('area:') ? areas.find((a) => `area:${a.area}` === x.chave) : undefined;
            const cor = area ? corDaArea(area.area) : COR_CONCURSO;
            const abertaAqui = aberta === x.chave;
            return (
              <li key={x.chave}>
                <button
                  type="button"
                  class={`barra-h${area ? ' com-detalhe' : ''}`}
                  aria-expanded={area ? abertaAqui : undefined}
                  onClick={() => area && setAberta(abertaAqui ? null : x.chave)}
                >
                  <span class="barra-h-nome">
                    <span class="bolinha" style={{ background: cor }} />
                    <span class="barra-h-nome-texto">
                      {x.rotulo}
                      {area && <small> {abertaAqui ? '▴' : '▾'}</small>}
                    </span>
                  </span>
                  <span class="barra-h-trilho">
                    <span class="barra-h-preench" style={{ width: `${(x.segundos / max) * 100}%`, background: cor }} />
                  </span>
                  <span class="barra-h-valor">
                    {formatarDuracaoCurta(x.segundos)} <small>{fmtPct(x.percentual)}</small>
                  </span>
                </button>
                {area && abertaAqui && (
                  <ul class="onde-tempo-cursos">
                    {area.cursos.map((c) => (
                      <li key={c.curso_id}>
                        <span class="bolinha" style={{ background: c.curso?.cor ?? 'var(--borda)' }} />
                        <span>{c.curso?.nome ?? 'Curso removido'}</span>
                        <strong>{formatarDuracaoCurta(c.segundos)}</strong>
                        <small>{fmtPct(area.segundos ? (c.segundos / area.segundos) * 100 : 0)} da área</small>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p class="dica">
        Concurso = todas as sessões do concurso no período. Toque numa área para ver os cursos.
        {emAndamento && ' Inclui a sessão em andamento (atualiza sozinho).'}
      </p>
    </section>
  );
}

/* ---------------- Tempo por dia (30 dias, um curso em cada cor; o mais recente à esquerda) ---------------- */

function TempoPorDia({ sessoes, cursos, agora }: { sessoes: OutraSessao[]; cursos: CursoExtra[]; agora: Date }) {
  const dias = tempoPorDiaOutros(sessoes, 30, agora, true);
  const curso = (id: string) => cursos.find((c) => c.id === id);
  const comEstudo = new Set(dias.flatMap((d) => d.partes.map((p) => p.curso_id)));
  const colunas: ColunaEmpilhada[] = dias.map((d, i) => {
    const data = deDataISO(d.dia);
    return {
      chave: d.dia,
      rotulo: i % 3 === 0 ? fmtDiaCurto.format(data) : '',
      partes: d.partes.map((p) => ({ valor: p.segundos / 3600, cor: curso(p.curso_id)?.cor ?? 'var(--borda)' })),
      texto: d.total ? formatarDuracaoCurta(d.total) : '',
      dica: {
        titulo: fmtDiaLongo.format(data),
        linhas: d.partes.length
          ? d.partes.map((p) => ({ rotulo: curso(p.curso_id)?.nome ?? 'Curso removido', valor: formatarDuracaoCurta(p.segundos), cor: curso(p.curso_id)?.cor }))
          : [{ valor: 'sem estudo' }],
      },
    };
  });

  return (
    <section class="cartao">
      <h2>Tempo por dia · últimos 30 dias</h2>
      {comEstudo.size === 0 ? (
        <p class="dica">Nenhuma sessão de outros estudos nos últimos 30 dias.</p>
      ) : (
        <>
          <ColunasEmpilhadas colunas={colunas} formatarEixo={fmtEixoHoras} descricao="Horas de outros estudos por dia, nos últimos 30 dias" />
          <ul class="legenda-cursos">
            {[...comEstudo].map((id) => (
              <li key={id}>
                <span class="bolinha" style={{ background: curso(id)?.cor ?? 'var(--borda)' }} />
                {curso(id)?.nome ?? 'Curso removido'}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
