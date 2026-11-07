// Tela Outros estudos (seção 10 da ESPECIFICACAO). Etapa 15: sessões (lançar à mão, corrigir, excluir)
// e cursos por área. A etapa 16 acrescenta "Onde está meu tempo", tempo por dia e totais.
import type { CursoExtra, OutraSessao } from '../../dominio/tipos';
import { cursosPorArea, outrasConcluidas } from '../../dominio/outros';
import { duracaoSegundos, formatarDuracaoCurta } from '../../dominio/sessoes';
import { useEntidade } from '../../dados/ganchos';
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

export function TelaOutros() {
  const { abrirPainel } = useEstado();
  const cursos = useEntidade('cursos');
  const sessoes = outrasConcluidas(useEntidade('outras_sessoes'));
  const grupos = cursosPorArea(cursos);
  const curso = (id: string): CursoExtra | undefined => cursos.find((c) => c.id === id);

  return (
    <>
      <header class="cabecalho">
        <h1>Outros estudos</h1>
        <span class="sub">graduação, pós, Alura… fora do concurso</span>
      </header>
      <div class="conteudo">
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
            {grupos.length === 0 ? (
              <p class="dica">Cadastre as áreas e os cursos (ex.: Graduação → Engenharia de Software; Alura → Python para Dados).</p>
            ) : (
              grupos.map((g) => (
                <div key={g.area} class="area-outros">
                  <h3>
                    {g.area}
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
    </>
  );
}
