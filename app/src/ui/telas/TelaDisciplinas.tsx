// Cadastro de disciplinas: lista na ordem do ciclo, com botões para reordenar (R24).
import type { Disciplina, Lei } from '../../dominio/tipos';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { useEntidade } from '../../dados/ganchos';
import { moverDisciplinaNaOrdem } from '../acoes/cadastros';
import { useEstado } from '../estado';
import { BotaoNovo } from '../layout/BotaoNovo';
import { IconeLivro, IconeSetaBaixo, IconeSetaCima } from '../icones';

const fmt = (n: number) => n.toLocaleString('pt-BR');

function detalhes(d: Disciplina, leis: Lei[]): string {
  const partes = [d.categoria || 'Sem categoria', `peso ${d.peso}`];
  if (d.possui_pdf) partes.push(d.total_paginas ? `${fmt(d.total_paginas)} págs.` : 'PDF sem total');
  if (d.possui_video) partes.push(d.total_horas_video ? `${fmt(d.total_horas_video)} h de vídeo` : 'vídeo sem total');
  const qtdLeis = leis.filter((l) => l.disciplina_id === d.id && l.status !== 'excluido').length;
  if (qtdLeis) partes.push(qtdLeis === 1 ? '1 lei' : `${qtdLeis} leis`);
  return partes.join(' · ');
}

export function TelaDisciplinas() {
  const { abrirPainel, avisar } = useEstado();
  const todas = useEntidade('disciplinas');
  const leis = useEntidade('leis');
  const lista = ordenarDisciplinas(todas);
  const ativas = lista.filter((d) => d.ativa);
  const somaPesos = ativas.reduce((s, d) => s + d.peso, 0);

  async function mover(e: Event, id: string, direcao: -1 | 1) {
    e.stopPropagation();
    const desfazer = await moverDisciplinaNaOrdem(todas, id, direcao);
    if (desfazer) avisar({ texto: 'Ordem alterada', desfazer });
  }

  return (
    <>
      <header class="cabecalho">
        <h1>Disciplinas</h1>
        <span class="sub">
          {ativas.length} ativa{ativas.length === 1 ? '' : 's'} · soma dos pesos {somaPesos}
        </span>
      </header>
      <div class="conteudo">
        {lista.length === 0 ? (
          <div class="vazio grande">
            <IconeLivro />
            <strong>Nenhuma disciplina</strong>
            Toque em + para incluir a primeira.
          </div>
        ) : (
          <>
            <p class="dica espaco-abaixo">A ordem abaixo é a usada para montar o ciclo de estudos. Toque numa disciplina para editar.</p>
            <ul class="lista-itens">
              {lista.map((d, i) => (
                <li key={d.id}>
                  <div
                    class={`linha-item linha-cadastro${d.ativa ? '' : ' inativa'}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => abrirPainel({ tipo: 'disciplina', id: d.id })}
                    onKeyDown={(e) => e.key === 'Enter' && abrirPainel({ tipo: 'disciplina', id: d.id })}
                  >
                    <span class="faixa-cor" style={{ background: d.cor }} />
                    <span class="posicao">{i + 1}</span>
                    <span class="linha-item-texto">
                      <strong>
                        {d.nome}
                        {!d.ativa && <span class="etiqueta neutra">Inativa</span>}
                      </strong>
                      <small>{detalhes(d, leis)}</small>
                    </span>
                    <span class="ordenar">
                      <button class="botao-icone" aria-label="Subir" disabled={i === 0} onClick={(e) => mover(e, d.id, -1)}>
                        <IconeSetaCima />
                      </button>
                      <button class="botao-icone" aria-label="Descer" disabled={i === lista.length - 1} onClick={(e) => mover(e, d.id, 1)}>
                        <IconeSetaBaixo />
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <BotaoNovo opcoes={[{ rotulo: 'Disciplina', Icone: IconeLivro, acao: () => abrirPainel({ tipo: 'disciplina' }) }]} />
    </>
  );
}
