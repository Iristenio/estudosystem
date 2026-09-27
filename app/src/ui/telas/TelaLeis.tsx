// Cadastro de leis secas, agrupadas por disciplina.
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { leisPorDisciplina } from '../../dominio/leis';
import { useEntidade } from '../../dados/ganchos';
import { useEstado } from '../estado';
import { BotaoNovo } from '../layout/BotaoNovo';
import { IconeBalanca, IconeMais } from '../icones';

export function TelaLeis() {
  const { abrirPainel } = useEstado();
  const disciplinas = ordenarDisciplinas(useEntidade('disciplinas'));
  const grupos = leisPorDisciplina(useEntidade('leis'), disciplinas);
  const total = grupos.reduce((s, g) => s + g.leis.length, 0);

  return (
    <>
      <header class="cabecalho">
        <h1>Leis secas</h1>
        <span class="sub">
          {total} lei{total === 1 ? '' : 's'}
        </span>
      </header>
      <div class="conteudo">
        {grupos.length === 0 ? (
          <div class="vazio grande">
            <IconeBalanca />
            <strong>Nenhuma lei cadastrada</strong>
            Toque em + para incluir.
          </div>
        ) : (
          <div class="grupos-leis">
            {grupos.map(({ disciplina, leis }) => (
              <section key={disciplina.id} class="cartao">
                <h2>
                  <span class="bolinha grande" style={{ background: disciplina.cor }} />
                  {disciplina.nome}
                  <button
                    class="botao-icone pequeno"
                    aria-label={`Nova lei em ${disciplina.nome}`}
                    title="Nova lei nesta disciplina"
                    onClick={() => abrirPainel({ tipo: 'lei', disciplinaId: disciplina.id })}
                  >
                    <IconeMais />
                  </button>
                </h2>
                <ul class="lista-itens compacta">
                  {leis.map((l) => (
                    <li key={l.id}>
                      <button class={`linha-item${l.ativa ? '' : ' inativa'}`} onClick={() => abrirPainel({ tipo: 'lei', id: l.id })}>
                        <span class="linha-item-texto">
                          <strong>
                            {l.nome}
                            {!l.ativa && <span class="etiqueta neutra">Inativa</span>}
                          </strong>
                          <small>
                            {l.total_artigos ? `${l.total_artigos.toLocaleString('pt-BR')} artigos` : 'Total de artigos não informado'}
                            {l.descricao && ` · ${l.descricao}`}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      <BotaoNovo opcoes={[{ rotulo: 'Lei seca', Icone: IconeBalanca, acao: () => abrirPainel({ tipo: 'lei' }) }]} />
    </>
  );
}
