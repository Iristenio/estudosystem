// Mapa da lei: um quadradinho por artigo, colorido pelo número de leituras (só sessões com faixas, R29).
// Endereço "#/mapa/<id da lei>"; aberto a partir de Cadastros → Leis secas.
import { useState } from 'preact/hooks';
import type { Lei } from '../../dominio/tipos';
import { mapaDaLei, proximoTrechoNaoLido, resumoDoMapa, type ArtigoNoMapa } from '../../dominio/artigos';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { leisPorDisciplina } from '../../dominio/leis';
import { useEntidade } from '../../dados/ganchos';
import { useEstado } from '../estado';
import { irPara, useParametroRota } from '../rotas';
import { IconeBalanca, IconeGrade, IconeLapis } from '../icones';

const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtInt = (n: number) => n.toLocaleString('pt-BR');
const fmtPct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

const nivel = (a: ArtigoNoMapa) => (a.vezes === 0 ? 0 : a.vezes === 1 ? 1 : 2);

function descreverArtigo(a: ArtigoNoMapa): string {
  if (!a.vezes) return `Art. ${a.numero}: ainda não lido.`;
  const vezes = a.vezes === 1 ? 'lido 1 vez' : `lido ${a.vezes} vezes`;
  return `Art. ${a.numero}: ${vezes} · última leitura em ${fmtData.format(new Date(a.ultima!))}.`;
}

export function TelaMapaLei() {
  const { abrirPainel } = useEstado();
  const leiId = useParametroRota();
  const leis = useEntidade('leis');
  const sessoes = useEntidade('sessoes');
  const grupos = leisPorDisciplina(leis, ordenarDisciplinas(useEntidade('disciplinas')));
  const opcoes = grupos.flatMap((g) => g.leis);
  const lei: Lei | undefined = opcoes.find((l) => l.id === leiId) ?? opcoes.find((l) => l.ativa) ?? opcoes[0];
  const [escolhido, setEscolhido] = useState<number | null>(null);

  const concluidas = sessoes.filter((s) => s.status !== 'excluido' && s.situacao === 'concluida');
  const daLei = lei ? concluidas.filter((s) => s.tipo === 'Lei Seca' && s.lei_id === lei.id) : [];
  const semFaixas = daLei.filter((s) => !s.artigos_lidos).length;
  const mapa = lei ? mapaDaLei(lei, daLei) : [];
  const resumo = resumoDoMapa(mapa);
  const proximo = proximoTrechoNaoLido(mapa);
  const artigo = escolhido ? mapa[escolhido - 1] : undefined;

  function trocarLei(id: string) {
    setEscolhido(null);
    irPara('mapa', id);
  }

  return (
    <>
      <header class="cabecalho">
        <h1>Mapa da lei</h1>
        {lei && <span class="sub">{lei.nome}</span>}
      </header>
      <div class="conteudo">
        {!lei ? (
          <div class="vazio grande">
            <IconeBalanca />
            <strong>Nenhuma lei cadastrada</strong>
            <button class="botao primario" onClick={() => irPara('leis')}>
              Ir para Leis secas
            </button>
          </div>
        ) : (
          <div class="mapa-lei">
            <div class="mapa-escolha">
              <select class="campo campo-largo" value={lei.id} aria-label="Lei" onChange={(e) => trocarLei(e.currentTarget.value)}>
                {grupos.map((g) => (
                  <optgroup key={g.disciplina.id} label={g.disciplina.nome}>
                    {g.leis.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                        {l.ativa ? '' : ' (inativa)'}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button class="botao" onClick={() => abrirPainel({ tipo: 'lei', id: lei.id })}>
                <IconeLapis /> Editar lei
              </button>
            </div>

            {!lei.total_artigos ? (
              <div class="vazio grande">
                <IconeGrade />
                <strong>Esta lei ainda não tem o total de artigos</strong>
                Informe o total em "Editar lei" para ver o mapa.
              </div>
            ) : (
              <>
                <section class="cartao mapa-resumo">
                  <div class="progresso" style={{ '--cor': 'var(--primaria)' }}>
                    <div class="progresso-topo">
                      <span>Artigos lidos</span>
                      <strong>{fmtPct(resumo.percentual)}</strong>
                    </div>
                    <span class="medidor">
                      <span class="medidor-preench" style={{ width: `${Math.min(100, resumo.percentual)}%` }} />
                    </span>
                    <small>
                      {fmtInt(resumo.lidos)} de {fmtInt(resumo.total)} artigos
                    </small>
                  </div>
                  <div class="mapa-numeros">
                    <div>
                      <span>Relidos</span>
                      <strong>{fmtInt(resumo.relidos)}</strong>
                      <small>2 vezes ou mais</small>
                    </div>
                    <div>
                      <span>Nunca lidos</span>
                      <strong>{fmtInt(resumo.naoLidos)}</strong>
                    </div>
                    <div>
                      <span>Próximo trecho</span>
                      <strong>{proximo ? (proximo.de === proximo.ate ? `Art. ${proximo.de}` : `Arts. ${proximo.de} a ${proximo.ate}`) : 'Lei toda lida'}</strong>
                      {proximo && <small>primeiro trecho ainda não lido</small>}
                    </div>
                  </div>
                </section>

                <section class="cartao mapa-grade-cartao">
                  <div class="mapa-legenda" aria-hidden="true">
                    <span><i class="artigo-amostra nivel-0" /> Nunca lido</span>
                    <span><i class="artigo-amostra nivel-1" /> Lido 1 vez</span>
                    <span><i class="artigo-amostra nivel-2" /> 2 vezes ou mais</span>
                  </div>
                  <p class="mapa-detalhe" aria-live="polite">
                    {artigo ? descreverArtigo(artigo) : 'Toque num artigo para ver quantas vezes e quando foi lido.'}
                  </p>
                  <div class="grade-artigos mapa" role="group" aria-label={`Artigos de ${lei.nome}`}>
                    {mapa.map((a) => (
                      <button
                        key={a.numero}
                        type="button"
                        class={`artigo nivel-${nivel(a)}${escolhido === a.numero ? ' escolhido' : ''}`}
                        aria-label={descreverArtigo(a)}
                        aria-pressed={escolhido === a.numero}
                        onClick={() => setEscolhido(escolhido === a.numero ? null : a.numero)}
                      >
                        {a.numero}
                      </button>
                    ))}
                  </div>
                  {semFaixas > 0 && (
                    <p class="dica">
                      {semFaixas === 1
                        ? '1 sessão antiga desta lei guardou só a quantidade de artigos e não aparece no mapa.'
                        : `${semFaixas} sessões antigas desta lei guardaram só a quantidade de artigos e não aparecem no mapa.`}
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
