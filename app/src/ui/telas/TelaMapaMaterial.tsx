// Mapa do material: os PDFs e vídeos da disciplina, por curso, coloridos pelo número de sessões em que
// foram estudados (R36, R37). Endereço "#/material/<id da disciplina>"; aberto a partir de Disciplinas.
import { useState } from 'preact/hooks';
import type { Disciplina, TipoMaterial } from '../../dominio/tipos';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import {
  contaNoTotal,
  cursosFora,
  formatarTamanho,
  itensDaDisciplina,
  itensEntre,
  mapaDoMaterial,
  marcarEstudados,
  ordenarItens,
  proximoItem,
  resumoDoMapaMaterial,
  rotuloItem,
  tipoMaterialDaSessao,
  type ItemNoMapa,
} from '../../dominio/material';
import { useEntidade } from '../../dados/ganchos';
import { useEstado } from '../estado';
import { alterarMaterial } from '../acoes/cadastros';
import { irPara, useParametroRota } from '../rotas';
import { IconeGrade, IconeLivro, IconeMais } from '../icones';

const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtPct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
// Marcado à mão sem sessão vale como "1 vez" na cor (R38)
const nivel = (m: ItemNoMapa) => (m.vezes >= 2 ? 2 : m.estudado ? 1 : 0);

function descrever(m: ItemNoMapa): string {
  const base = `${rotuloItem(m.item)} (${formatarTamanho(m.item)})`;
  const manual = m.manual ? 'marcado à mão como já estudado' : '';
  if (!m.vezes) return `${base}: ${manual || 'ainda não estudado'}.`;
  const vezes = m.vezes === 1 ? 'estudado em 1 sessão' : `estudado em ${m.vezes} sessões`;
  return `${base}: ${vezes} · última em ${fmtData.format(new Date(m.ultima!))}${manual ? ` · ${manual}` : ''}.`;
}

export function TelaMapaMaterial() {
  const { abrirPainel, avisar } = useEstado();
  const [varios, setVarios] = useState(false);
  const [inicioVarios, setInicioVarios] = useState<string | null>(null);
  const disciplinaId = useParametroRota();
  const opcoes = ordenarDisciplinas(useEntidade('disciplinas')).filter((d) => d.possui_pdf || d.possui_video);
  const sessoes = useEntidade('sessoes');
  const d: Disciplina | undefined = opcoes.find((x) => x.id === disciplinaId) ?? opcoes.find((x) => x.ativa) ?? opcoes[0];
  const itens = d ? itensDaDisciplina(d) : [];
  const temPdf = itens.some((i) => i.tipo === 'PDF' && i.numero > 0);
  const [escolha, setEscolha] = useState<TipoMaterial | null>(null);
  const tipo: TipoMaterial = escolha ?? (d && !temPdf && itens.some((i) => i.tipo === 'Video' && i.numero > 0) ? 'Video' : 'PDF');
  const [escolhido, setEscolhido] = useState<string | null>(null);

  const fora = d ? cursosFora(d) : [];
  const concluidas = sessoes.filter((s) => s.status !== 'excluido' && s.situacao === 'concluida' && s.disciplina_id === d?.id);
  // No mapa: todos os itens reais do tipo (também os fora do total, apagados de leve)
  const doTipo = ordenarItens(itens.filter((i) => i.tipo === tipo && i.numero > 0));
  const mapa = mapaDoMaterial(doTipo, concluidas);
  const resumo = resumoDoMapaMaterial(mapa, fora);
  const proximo = d ? proximoItem(itens, fora, tipo, concluidas) : null;
  const semMarcacao = concluidas.filter((s) => tipoMaterialDaSessao(s.tipo) === tipo && !(s.materiais_estudados ?? []).length).length;
  const cursos = [...new Set(doTipo.map((i) => i.curso))];
  const detalhe = mapa.find((m) => m.item.id === escolhido);
  const nome = tipo === 'PDF' ? 'PDF' : 'vídeo';

  function trocarDisciplina(id: string) {
    setEscolhido(null);
    setEscolha(null);
    setInicioVarios(null);
    irPara('material', id);
  }

  /** R38 — marca/desmarca à mão (sem sessão: só o mapa muda). */
  async function marcar(ids: string[], estudado: boolean) {
    if (!d || !ids.length) return;
    const desfazer = await alterarMaterial(d.id, (lista, f) => ({ itens: marcarEstudados(lista, ids, estudado), fora: f }));
    const qtd = ids.length === 1 ? rotuloItem(doTipo.find((i) => i.id === ids[0])!) : `${ids.length} ${nome}s`;
    const varios = ids.length > 1;
    const texto = estudado ? (varios ? 'marcados como já estudados' : 'marcado como já estudado') : varios ? 'marcações removidas' : 'marcação removida';
    avisar({ texto: `${qtd}: ${texto}`, desfazer: desfazer ?? undefined });
  }

  function tocar(id: string) {
    if (!varios) {
      setEscolhido(escolhido === id ? null : id);
      return;
    }
    if (!inicioVarios) {
      setInicioVarios(id);
      return;
    }
    marcar(itensEntre(doTipo, inicioVarios, id), true);
    setInicioVarios(null);
  }

  return (
    <>
      <header class="cabecalho">
        <h1>Mapa do material</h1>
        {d && <span class="sub">{d.nome}</span>}
      </header>
      <div class="conteudo">
        {!d ? (
          <div class="vazio grande">
            <IconeLivro />
            <strong>Nenhuma disciplina com PDF ou vídeo</strong>
            <button class="botao primario" onClick={() => irPara('disciplinas')}>
              Ir para Disciplinas
            </button>
          </div>
        ) : (
          <div class="mapa-lei">
            <div class="mapa-escolha">
              <select class="campo campo-largo" value={d.id} aria-label="Disciplina" onChange={(e) => trocarDisciplina(e.currentTarget.value)}>
                {opcoes.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                    {x.ativa ? '' : ' (inativa)'}
                  </option>
                ))}
              </select>
              <button class="botao" onClick={() => abrirPainel({ tipo: 'material', disciplinaId: d.id, tipoMaterial: tipo })}>
                <IconeMais /> Lançar material
              </button>
            </div>

            <div class="segmentado" role="radiogroup" aria-label="Tipo de material">
              {(['PDF', 'Video'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={t === tipo}
                  onClick={() => {
                    setEscolha(t);
                    setEscolhido(null);
                  }}
                >
                  {t === 'PDF' ? 'PDFs' : 'Vídeos'}
                </button>
              ))}
            </div>

            {!doTipo.length ? (
              <div class="vazio grande">
                <IconeGrade />
                <strong>Nenhum {nome} lançado</strong>
                {itens.some((i) => i.tipo === tipo && i.numero === 0)
                  ? 'Por enquanto só há o "Total anterior". Lance os itens um a um para ver o mapa.'
                  : 'Use "Lançar material" para incluir.'}
              </div>
            ) : (
              <>
                <section class="cartao mapa-resumo">
                  <div class="progresso" style={{ '--cor': 'var(--primaria)' }}>
                    <div class="progresso-topo">
                      <span>{tipo === 'PDF' ? 'PDFs estudados' : 'Vídeos assistidos'}</span>
                      <strong>{fmtPct(resumo.percentual)}</strong>
                    </div>
                    <span class="medidor">
                      <span class="medidor-preench" style={{ width: `${Math.min(100, resumo.percentual)}%` }} />
                    </span>
                    <small>
                      {resumo.estudados} de {resumo.total} (só o que conta no total)
                    </small>
                  </div>
                  <div class="mapa-numeros">
                    <div>
                      <span>Revistos</span>
                      <strong>{resumo.revistos}</strong>
                      <small>2 sessões ou mais</small>
                    </div>
                    <div>
                      <span>Nunca estudados</span>
                      <strong>{resumo.nunca}</strong>
                    </div>
                    <div>
                      <span>Próximo</span>
                      <strong class="mapa-proximo">{proximo ? rotuloItem(proximo) : 'Tudo estudado'}</strong>
                      {proximo && <small>depois do último estudado</small>}
                    </div>
                  </div>
                </section>

                <section class="cartao mapa-grade-cartao">
                  <div class="mapa-legenda" aria-hidden="true">
                    <span><i class="artigo-amostra nivel-0" /> Nunca estudado</span>
                    <span><i class="artigo-amostra nivel-1" /> 1 sessão</span>
                    <span><i class="artigo-amostra nivel-2" /> 2 ou mais</span>
                    <span>✓ marcado à mão</span>
                  </div>
                  <div class="mapa-marcar">
                    <label class="interruptor">
                      <input
                        type="checkbox"
                        checked={varios}
                        onChange={(e) => {
                          setVarios(e.currentTarget.checked);
                          setInicioVarios(null);
                          setEscolhido(null);
                        }}
                      />
                      Marcar vários como já estudados
                    </label>
                  </div>
                  {varios ? (
                    <p class="mapa-detalhe" aria-live="polite">
                      {inicioVarios
                        ? `Do ${rotuloItem(doTipo.find((i) => i.id === inicioVarios)!)} até… toque no último.`
                        : `Toque no primeiro ${nome} e depois no último: todos no meio ficam marcados. Não cria sessão nem soma horas.`}
                    </p>
                  ) : (
                    <div class="mapa-detalhe-linha" aria-live="polite">
                      <p class="mapa-detalhe">{detalhe ? descrever(detalhe) : `Toque num ${nome} para ver quando foi estudado ou marcá-lo.`}</p>
                      {detalhe && (
                        <button type="button" class="botao" onClick={() => marcar([detalhe.item.id], !detalhe.manual)}>
                          {detalhe.manual ? 'Desmarcar' : 'Marcar como já estudado'}
                        </button>
                      )}
                    </div>
                  )}
                  {cursos.map((c) => {
                    const doCurso = mapa.filter((m) => m.item.curso === c);
                    return (
                      <div key={c} class={`mapa-curso${fora.includes(c) ? ' desligado' : ''}`}>
                        {(cursos.length > 1 || c) && (
                          <h3>
                            {c || 'Sem curso'}
                            {fora.includes(c) && <span class="etiqueta neutra">fora do total</span>}
                          </h3>
                        )}
                        <div class="grade-material">
                          {doCurso.map((m) => (
                            <button
                              key={m.item.id}
                              type="button"
                              class={`item-mapa artigo nivel-${nivel(m)}${escolhido === m.item.id || inicioVarios === m.item.id ? ' escolhido' : ''}${contaNoTotal(m.item, fora) ? '' : ' fora'}${m.manual ? ' manual' : ''}`}
                              aria-label={descrever(m)}
                              aria-pressed={escolhido === m.item.id}
                              onClick={() => tocar(m.item.id)}
                            >
                              <strong>{m.item.numero}</strong>
                              {m.item.nome && <span class="item-mapa-nome">{m.item.nome}</span>}
                              <small>{formatarTamanho(m.item)}</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {semMarcacao > 0 && (
                    <p class="dica">
                      {semMarcacao === 1
                        ? `1 sessão de ${tipo === 'PDF' ? 'PDF' : 'videoaula'} sem ${nome} marcado não aparece no mapa.`
                        : `${semMarcacao} sessões de ${tipo === 'PDF' ? 'PDF' : 'videoaula'} sem ${nome} marcado não aparecem no mapa.`}
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
