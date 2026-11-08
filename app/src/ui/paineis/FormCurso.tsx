// Curso de outros estudos (painel lateral, 10.1, R49, R51): área, nome, cor, situação; excluir só sem sessões.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { CursoExtra, SituacaoCurso } from '../../dominio/tipos';
import { CORES_DISCIPLINA } from '../../dominio/disciplinas';
import { hojeISO } from '../../dominio/datas';
import { areasUsadas, corLivre, mudarSituacao, ROTULO_SITUACAO_CURSO, situacaoDoCurso, normalizarCurso, novoCurso, podeExcluirCurso, validarCurso } from '../../dominio/outros';
import { buscar, novoId } from '../../dados/repositorio';
import { useEntidade } from '../../dados/ganchos';
import { excluirCurso, salvarCurso } from '../acoes/outros';
import { useEstado } from '../estado';

export function FormCurso({ id, area }: { id?: string; area?: string }) {
  const { fecharPainel, avisar, perguntar } = useEstado();
  const todos = useEntidade('cursos');
  const sessoes = useEntidade('outras_sessoes');
  const [c, setC] = useState<CursoExtra | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const campoNome = useRef<HTMLInputElement>(null);
  const novo = !id;

  useEffect(() => {
    (async () => {
      const existente = id ? await buscar('cursos', id) : undefined;
      setC(existente ?? novoCurso({ id: novoId(), area: area ?? '', cor: corLivre(todos) }));
      setErros([]);
      if (!existente) setTimeout(() => campoNome.current?.focus(), 50);
    })();
  }, [id, area]);

  if (!c) return null;
  const mudar = (parcial: Partial<CursoExtra>) => setC({ ...c, ...parcial });
  const podeExcluir = podeExcluirCurso(c.id, sessoes);

  async function salvar(e: Event) {
    e.preventDefault();
    const final = normalizarCurso(c!);
    const problemas = validarCurso(final, todos);
    setErros(problemas);
    if (problemas.length) return;
    const desfazer = await salvarCurso(final);
    fecharPainel();
    avisar({ texto: novo ? 'Curso incluído' : 'Curso salvo', desfazer });
  }

  async function excluir() {
    const r = await perguntar(`Excluir ${c!.nome}?`, [{ valor: 'sim', rotulo: 'Excluir', estilo: 'perigo' }]);
    if (!r) return;
    const desfazer = await excluirCurso(c!);
    fecharPainel();
    avisar({ texto: 'Curso excluído', desfazer });
  }

  return (
    <form class="formulario" onSubmit={salvar}>
      <label class="rotulo">
        Área
        <input
          class="campo"
          list="areas-outros"
          placeholder="Ex.: Graduação, Especialização, Alura"
          value={c.area}
          onInput={(e) => mudar({ area: e.currentTarget.value })}
        />
        <datalist id="areas-outros">
          {areasUsadas(todos).map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </label>

      <label class="rotulo">
        Curso
        <input
          ref={campoNome}
          class="campo campo-titulo"
          placeholder="Ex.: Engenharia de Software"
          value={c.nome}
          onInput={(e) => mudar({ nome: e.currentTarget.value })}
        />
      </label>

      <fieldset>
        <legend>Situação</legend>
        <div class="segmentado segmentado-situacao" role="radiogroup" aria-label="Situação do curso">
          {(Object.keys(ROTULO_SITUACAO_CURSO) as SituacaoCurso[]).map((x) => (
            <button key={x} type="button" role="radio" aria-checked={situacaoDoCurso(c) === x} onClick={() => setC(mudarSituacao(c, x, hojeISO()))}>
              {ROTULO_SITUACAO_CURSO[x]}
            </button>
          ))}
        </div>
        {situacaoDoCurso(c) === 'concluido' && (
          <label class="rotulo em-linha">
            Concluído em
            <input type="date" class="campo" value={c.concluido_em ?? ''} onInput={(e) => mudar({ concluido_em: e.currentTarget.value })} />
          </label>
        )}
        <small class="dica">
          {situacaoDoCurso(c) === 'andamento'
            ? 'Aparece para iniciar sessões.'
            : 'Sai da escolha ao iniciar; as sessões e o histórico continuam guardados.'}
        </small>
      </fieldset>

      <fieldset>
        <legend>Cor</legend>
        <div class="cores">
          {CORES_DISCIPLINA.map((x) => (
            <button
              key={x}
              type="button"
              class="cor"
              style={{ background: x }}
              aria-pressed={c.cor.toLowerCase() === x}
              aria-label={`Cor ${x}`}
              onClick={() => mudar({ cor: x })}
            />
          ))}
          <label class="cor cor-livre" style={{ background: c.cor }} aria-pressed={!CORES_DISCIPLINA.includes(c.cor.toLowerCase())} title="Outra cor">
            <input type="color" value={c.cor} onInput={(e) => mudar({ cor: e.currentTarget.value })} aria-label="Outra cor" />+
          </label>
        </div>
      </fieldset>

      {erros.length > 0 && (
        <ul class="erros" role="alert">
          {erros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}

      {!novo && !podeExcluir && <p class="dica">Este curso tem sessões registradas: não pode ser excluído, só desativado.</p>}

      <div class="acoes-form">
        <button type="submit" class="botao primario">
          {novo ? 'Incluir' : 'Salvar'}
        </button>
        {!novo && podeExcluir && (
          <button type="button" class="botao perigo" onClick={excluir}>
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
