// Formulário de lei seca (painel lateral): incluir, editar, ativar/desativar e excluir (R23).
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Lei } from '../../dominio/tipos';
import { normalizarLei, novaLei, podeExcluirLei, validarLei } from '../../dominio/leis';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { lerNumero, mostrarNumero } from '../../dominio/numeros';
import { buscar, novoId } from '../../dados/repositorio';
import { useEntidade } from '../../dados/ganchos';
import { excluirLei, salvarLei } from '../acoes/cadastros';
import { useEstado } from '../estado';

export function FormLei({ id, disciplinaId }: { id?: string; disciplinaId?: string }) {
  const { fecharPainel, avisar, perguntar } = useEstado();
  const todas = useEntidade('leis');
  const sessoes = useEntidade('sessoes');
  const disciplinas = ordenarDisciplinas(useEntidade('disciplinas'));
  const [l, setL] = useState<Lei | null>(null);
  const [artigos, setArtigos] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const campoNome = useRef<HTMLInputElement>(null);
  const nova = !id;

  useEffect(() => {
    (async () => {
      const existente = id ? await buscar('leis', id) : undefined;
      const inicial = existente ?? novaLei({ id: novoId(), disciplina_id: disciplinaId ?? '' });
      setL(inicial);
      setArtigos(mostrarNumero(inicial.total_artigos));
      setErros([]);
      if (!existente) setTimeout(() => campoNome.current?.focus(), 50);
    })();
  }, [id, disciplinaId]);

  if (!l) return null;
  const mudar = (parcial: Partial<Lei>) => setL({ ...l, ...parcial });
  const podeExcluir = podeExcluirLei(l.id, sessoes.filter((s) => s.status !== 'excluido'));

  async function salvar(e: Event) {
    e.preventDefault();
    const final = normalizarLei({ ...l!, total_artigos: lerNumero(artigos) });
    const problemas = validarLei(final, todas, disciplinas);
    setErros(problemas);
    if (problemas.length) return;
    const desfazer = await salvarLei(final);
    fecharPainel();
    avisar({ texto: nova ? 'Lei incluída' : 'Lei salva', desfazer });
  }

  async function excluir() {
    const r = await perguntar(`Excluir ${l!.nome}?`, [{ valor: 'sim', rotulo: 'Excluir', estilo: 'perigo' }]);
    if (!r) return;
    const desfazer = await excluirLei(l!);
    fecharPainel();
    avisar({ texto: 'Lei excluída', desfazer });
  }

  return (
    <form class="formulario" onSubmit={salvar}>
      <label class="rotulo">
        Disciplina
        <select class="campo campo-largo" value={l.disciplina_id} onChange={(e) => mudar({ disciplina_id: e.currentTarget.value })}>
          <option value="" disabled>
            Escolha…
          </option>
          {disciplinas.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
              {d.ativa ? '' : ' (inativa)'}
            </option>
          ))}
        </select>
      </label>

      <label class="rotulo">
        Nome da lei
        <input
          ref={campoNome}
          class="campo campo-titulo"
          placeholder="Ex.: Lei 8.112/90 - Servidores Públicos"
          value={l.nome}
          onInput={(e) => mudar({ nome: e.currentTarget.value })}
        />
      </label>

      <label class="rotulo">
        Total de artigos
        <input
          class="campo campo-numero"
          inputMode="numeric"
          placeholder="—"
          value={artigos}
          onInput={(e) => setArtigos(e.currentTarget.value)}
        />
        <small class="dica">Necessário para iniciar sessões de lei seca e medir o progresso.</small>
      </label>

      <label class="interruptor">
        <input type="checkbox" checked={l.ativa} onChange={(e) => mudar({ ativa: e.currentTarget.checked })} />
        Ativa
      </label>

      <label class="rotulo">
        Descrição
        <textarea
          class="campo"
          rows={3}
          placeholder="Opcional"
          value={l.descricao}
          onInput={(e) => mudar({ descricao: e.currentTarget.value })}
        />
      </label>

      {erros.length > 0 && (
        <ul class="erros" role="alert">
          {erros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}

      {!nova && !podeExcluir && <p class="dica">Esta lei tem sessões registradas: não pode ser excluída, só desativada.</p>}

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
