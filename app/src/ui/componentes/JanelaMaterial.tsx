// R39 — janela "Escolha o vídeo/PDF" da tela Estudar: lista o material da disciplina (por curso, em ordem
// crescente, com as marcas do mapa) e já abre rolada no próximo. Tocar num item o escolhe para a aula.
import { useEffect, useRef } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import type { Disciplina, ItemMaterial, Sessao, TipoMaterial } from '../../dominio/tipos';
import { cursosFora, formatarTamanho, itensDaDisciplina, itensEscolhiveis, mapaDoMaterial, proximoItem, ROTULO_MATERIAL } from '../../dominio/material';
import { IconeFechar } from '../icones';

interface Props {
  disciplina: Disciplina;
  tipo: TipoMaterial;
  /** Sessões concluídas da disciplina (para as marcas e o próximo). */
  concluidas: Sessao[];
  aoEscolher: (item: ItemMaterial) => void;
  aoFechar: () => void;
}

/** Itens que a janela mostra; vazio = a janela nem abre. */
export function itensDaJanela(d: Disciplina, tipo: TipoMaterial): ItemMaterial[] {
  return itensEscolhiveis(itensDaDisciplina(d), cursosFora(d), tipo);
}

export function JanelaMaterial({ disciplina, tipo, concluidas, aoEscolher, aoFechar }: Props) {
  const itens = itensDaDisciplina(disciplina);
  const lista = itensEscolhiveis(itens, cursosFora(disciplina), tipo);
  const mapa = new Map(mapaDoMaterial(lista, concluidas).map((m) => [m.item.id, m]));
  const proximo = proximoItem(itens, cursosFora(disciplina), tipo, concluidas);
  const cursos = [...new Set(lista.map((i) => i.curso))];
  const refProximo = useRef<HTMLButtonElement>(null);
  const nome = tipo === 'PDF' ? 'PDF' : 'vídeo';

  useEffect(() => {
    refProximo.current?.scrollIntoView({ block: 'center' });
    refProximo.current?.focus({ preventScroll: true });
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  // Desenhada direto no <body>: dentro do cartão do formulário, o conteúdo dele vazaria por cima
  return createPortal(
    <div class="dialogo-veu" onClick={aoFechar}>
      <div class="dialogo largo" role="dialog" aria-modal="true" aria-labelledby="janela-material-titulo" onClick={(e) => e.stopPropagation()}>
        <div class="dialogo-topo">
          <h2 id="janela-material-titulo">Escolha o {nome}</h2>
          <button type="button" class="botao-icone" aria-label="Fechar" onClick={aoFechar}>
            <IconeFechar />
          </button>
        </div>
        <p>
          {disciplina.nome} · a aula será preenchida e o {nome} já virá marcado ao finalizar.
        </p>
        <div class="janela-material-lista">
          {cursos.map((c) => (
            <div key={c}>
              {(cursos.length > 1 || c) && <h3>{c || 'Sem curso'}</h3>}
              {lista
                .filter((i) => i.curso === c)
                .map((i) => {
                  const m = mapa.get(i.id);
                  const ehProximo = proximo?.id === i.id;
                  return (
                    <button
                      key={i.id}
                      ref={ehProximo ? refProximo : undefined}
                      type="button"
                      class={`janela-material-item${ehProximo ? ' proximo' : ''}`}
                      onClick={() => aoEscolher(i)}
                    >
                      <span class="janela-material-marca" aria-label={m?.estudado ? 'já estudado' : undefined}>
                        {m?.estudado ? '✓' : ''}
                      </span>
                      <span class="janela-material-texto">
                        <strong>
                          {ROTULO_MATERIAL[i.tipo]} {i.numero}
                          {i.nome && ` · ${i.nome}`}
                        </strong>
                        <small>
                          {formatarTamanho(i)}
                          {m && m.vezes > 0 && ` · estudado em ${m.vezes} ${m.vezes === 1 ? 'sessão' : 'sessões'}`}
                        </small>
                      </span>
                      {ehProximo && <span class="marca-sugerida">próximo</span>}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
        <div class="dialogo-opcoes">
          <button type="button" class="botao fantasma" onClick={aoFechar}>
            Não é nenhum destes
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
