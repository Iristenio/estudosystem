// R36 — escolher quais PDFs/vídeos do material foram estudados na sessão (opcional).
// Ordem crescente (1, 2, 3…), já rolada até o item marcado (ou o próximo, que vem destacado);
// pontinho = já estudado antes.
import { useEffect, useRef } from 'preact/hooks';
import type { Disciplina, Id, Sessao, TipoMaterial } from '../../dominio/tipos';
import { cursosFora, itensDaDisciplina, itensEscolhiveis, mapaDoMaterial, proximoItem, rotuloItem } from '../../dominio/material';
import { useEstado } from '../estado';
import { IconeMais } from '../icones';

interface Props {
  disciplina: Disciplina;
  tipo: TipoMaterial;
  escolhidos: Id[];
  aoMudar: (ids: Id[]) => void;
  /** Sessões concluídas da disciplina (sem a sessão que está sendo editada). */
  outrasSessoes: Sessao[];
  /** Mostra o atalho "Lançar material" (que troca o painel lateral). */
  podeLancar?: boolean;
}

export function EscolhaMaterial({ disciplina, tipo, escolhidos, aoMudar, outrasSessoes, podeLancar = true }: Props) {
  const { abrirPainel } = useEstado();
  const itens = itensDaDisciplina(disciplina);
  const fora = cursosFora(disciplina);
  const lista = itensEscolhiveis(itens, fora, tipo, escolhidos);
  const lidos = new Map(mapaDoMaterial(lista, outrasSessoes).map((m) => [m.item.id, m.estudado ? 1 : 0]));
  const proximo = proximoItem(itens, fora, tipo, outrasSessoes);
  const variosCursos = new Set(lista.map((i) => i.curso)).size > 1;
  const nome = tipo === 'PDF' ? 'PDF' : 'vídeo';

  // Ao abrir, rola a lista (só ela, não a página) até o primeiro item marcado ou, sem marcados, o próximo
  const refLista = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const caixa = refLista.current;
    const alvo = caixa?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? caixa?.querySelector<HTMLElement>('.chip-proximo');
    // .chips-material tem position: relative, então offsetTop já é medido dentro da lista
    if (caixa && alvo) caixa.scrollTop = alvo.offsetTop - caixa.clientHeight / 2 + alvo.offsetHeight / 2;
  }, []);

  const alternar = (id: Id) => aoMudar(escolhidos.includes(id) ? escolhidos.filter((x) => x !== id) : [...escolhidos, id]);

  return (
    <fieldset class="escolha-material">
      <legend>{tipo === 'PDF' ? 'Qual PDF você estudou?' : 'Quais vídeos você assistiu?'} (opcional)</legend>
      {lista.length === 0 ? (
        <p class="dica">Nenhum {nome} lançado nesta disciplina.</p>
      ) : (
        <>
          <div ref={refLista} class="chips chips-material" role="group" aria-label={`${nome}s do material`}>
            {lista.map((i) => (
              <button
                key={i.id}
                type="button"
                class={`chip chip-material${(lidos.get(i.id) ?? 0) > 0 ? ' ja-estudado' : ''}${proximo?.id === i.id ? ' chip-proximo' : ''}`}
                aria-pressed={escolhidos.includes(i.id)}
                title={rotuloItem(i)}
                onClick={() => alternar(i.id)}
              >
                <span class="chip-material-texto">
                  {variosCursos && i.curso && <small>{i.curso} · </small>}
                  {rotuloItem(i)}
                </span>
                {proximo?.id === i.id && <span class="marca-sugerida">próximo</span>}
              </button>
            ))}
          </div>
          <small class="dica">Toque para marcar. Pontinho = já estudado antes.</small>
        </>
      )}
      {podeLancar && (
        <button
          type="button"
          class="link link-inline"
          onClick={() => abrirPainel({ tipo: 'material', disciplinaId: disciplina.id, tipoMaterial: tipo })}
        >
          <IconeMais /> Lançar material
        </button>
      )}
    </fieldset>
  );
}
