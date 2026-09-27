// Formulário de disciplina (painel lateral): incluir, editar, ativar/desativar e excluir (R23).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Disciplina } from '../../dominio/tipos';
import {
  categoriasUsadas,
  CORES_DISCIPLINA,
  normalizarDisciplina,
  novaDisciplina,
  podeExcluirDisciplina,
  proximaOrdem,
  validarDisciplina,
} from '../../dominio/disciplinas';
import { lerNumero, mostrarNumero } from '../../dominio/numeros';
import { buscar, novoId } from '../../dados/repositorio';
import { useEntidade } from '../../dados/ganchos';
import { excluirDisciplina, salvarDisciplina } from '../acoes/cadastros';
import { useEstado } from '../estado';

export function FormDisciplina({ id }: { id?: string }) {
  const { fecharPainel, avisar, perguntar } = useEstado();
  const todas = useEntidade('disciplinas');
  const leis = useEntidade('leis');
  const sessoes = useEntidade('sessoes');
  const [d, setD] = useState<Disciplina | null>(null);
  // Números ficam como texto enquanto o usuário digita (para aceitar "36," no meio da digitação)
  const [textos, setTextos] = useState({ peso: '', paginas: '', horas: '' });
  const [erros, setErros] = useState<string[]>([]);
  const campoNome = useRef<HTMLInputElement>(null);
  const nova = !id;

  useEffect(() => {
    (async () => {
      const existente = id ? await buscar('disciplinas', id) : undefined;
      const inicial = existente ?? novaDisciplina({ id: novoId() });
      setD(inicial);
      setTextos({
        peso: mostrarNumero(inicial.peso),
        paginas: mostrarNumero(inicial.total_paginas),
        horas: mostrarNumero(inicial.total_horas_video),
      });
      setErros([]);
      if (!existente) setTimeout(() => campoNome.current?.focus(), 50);
    })();
  }, [id]);

  if (!d) return null;
  const mudar = (parcial: Partial<Disciplina>) => setD({ ...d, ...parcial });
  const leisDaDisciplina = leis.filter((l) => l.disciplina_id === d.id && l.status !== 'excluido');
  const podeExcluir = podeExcluirDisciplina(d.id, sessoes.filter((s) => s.status !== 'excluido'));

  async function salvar(e: Event) {
    e.preventDefault();
    const peso = lerNumero(textos.peso);
    const final = normalizarDisciplina({
      ...d!,
      peso: peso ?? NaN,
      total_paginas: lerNumero(textos.paginas),
      total_horas_video: lerNumero(textos.horas),
      ordem: nova ? proximaOrdem(todas) : d!.ordem,
    });
    const problemas = validarDisciplina(final, todas);
    setErros(problemas);
    if (problemas.length) return;
    const desfazer = await salvarDisciplina(final);
    fecharPainel();
    avisar({ texto: nova ? 'Disciplina incluída' : 'Disciplina salva', desfazer });
  }

  async function excluir() {
    const mensagem = leisDaDisciplina.length
      ? `As ${leisDaDisciplina.length === 1 ? 'lei' : `${leisDaDisciplina.length} leis`} desta disciplina também serão excluídas.`
      : undefined;
    const r = await perguntar(`Excluir ${d!.nome}?`, [{ valor: 'sim', rotulo: 'Excluir', estilo: 'perigo' }], mensagem);
    if (!r) return;
    const desfazer = await excluirDisciplina(d!, leisDaDisciplina);
    fecharPainel();
    avisar({ texto: 'Disciplina excluída', desfazer });
  }

  const categorias = categoriasUsadas(todas);

  return (
    <form class="formulario" onSubmit={salvar}>
      <label class="rotulo">
        Nome
        <input
          ref={campoNome}
          class="campo campo-titulo"
          placeholder="Ex.: DIREITO PENAL"
          value={d.nome}
          onInput={(e) => mudar({ nome: e.currentTarget.value })}
          enterKeyHint="next"
        />
      </label>

      <div class="grade-2">
        <label class="rotulo">
          Categoria
          <input
            class="campo"
            list="categorias-disciplina"
            placeholder="Ex.: NÚCLEO COMUM"
            value={d.categoria}
            onInput={(e) => mudar({ categoria: e.currentTarget.value })}
          />
          <datalist id="categorias-disciplina">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label class="rotulo">
          Peso no ciclo
          <input
            class="campo"
            inputMode="numeric"
            value={textos.peso}
            onInput={(e) => setTextos({ ...textos, peso: e.currentTarget.value })}
          />
        </label>
      </div>

      <label class="interruptor">
        <input type="checkbox" checked={d.ativa} onChange={(e) => mudar({ ativa: e.currentTarget.checked })} />
        <span>
          Ativa
          <br />
          <small>Inativa: sai do ciclo e dos painéis, mas o histórico continua guardado.</small>
        </span>
      </label>

      <fieldset>
        <legend>Materiais</legend>
        <div class="material">
          <label class="interruptor">
            <input type="checkbox" checked={d.possui_pdf} onChange={(e) => mudar({ possui_pdf: e.currentTarget.checked })} />
            PDF
          </label>
          {d.possui_pdf && (
            <label class="rotulo em-linha">
              Total de páginas
              <input
                class="campo campo-numero"
                inputMode="numeric"
                placeholder="—"
                value={textos.paginas}
                onInput={(e) => setTextos({ ...textos, paginas: e.currentTarget.value })}
              />
            </label>
          )}
        </div>
        <div class="material">
          <label class="interruptor">
            <input type="checkbox" checked={d.possui_video} onChange={(e) => mudar({ possui_video: e.currentTarget.checked })} />
            Videoaulas
          </label>
          {d.possui_video && (
            <label class="rotulo em-linha">
              Total de horas
              <input
                class="campo campo-numero"
                inputMode="decimal"
                placeholder="—"
                value={textos.horas}
                onInput={(e) => setTextos({ ...textos, horas: e.currentTarget.value })}
              />
            </label>
          )}
        </div>
        <p class="dica">Os totais são necessários para iniciar sessões de PDF ou videoaula e para medir o progresso.</p>
      </fieldset>

      <fieldset>
        <legend>Cor</legend>
        <div class="cores">
          {CORES_DISCIPLINA.map((c) => (
            <button
              key={c}
              type="button"
              class="cor"
              style={{ background: c }}
              aria-pressed={d.cor.toLowerCase() === c}
              aria-label={`Cor ${c}`}
              onClick={() => mudar({ cor: c })}
            />
          ))}
          <label class="cor cor-livre" style={{ background: d.cor }} aria-pressed={!CORES_DISCIPLINA.includes(d.cor.toLowerCase())} title="Outra cor">
            <input type="color" value={d.cor} onInput={(e) => mudar({ cor: e.currentTarget.value })} aria-label="Outra cor" />
            +
          </label>
        </div>
      </fieldset>

      <label class="rotulo">
        Observações
        <textarea
          class="campo"
          rows={3}
          placeholder="Curso, código do material etc. (opcional)"
          value={d.observacoes}
          onInput={(e) => mudar({ observacoes: e.currentTarget.value })}
        />
      </label>

      {erros.length > 0 && (
        <ul class="erros" role="alert">
          {erros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}

      {!nova && !podeExcluir && (
        <p class="dica">Esta disciplina tem sessões registradas: não pode ser excluída, só desativada.</p>
      )}

      <div class="acoes-form">
        <button type="submit" class="botao primario">
          {nova ? 'Incluir' : 'Salvar'}
        </button>
        {!nova && podeExcluir && (
          <button type="button" class="botao perigo" onClick={excluir}>
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
