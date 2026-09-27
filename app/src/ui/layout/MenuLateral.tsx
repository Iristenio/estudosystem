import { useEffect, useState } from 'preact/hooks';
import { APP } from '../../app.config';
import { ehGrupo, irPara, MENU, type ItemMenu, type Tela } from '../rotas';
import { ROTULO_STATUS, useSync } from '../../sync/ganchos';
import { IconeConfig } from '../icones';

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    window.addEventListener('online', atualizar);
    window.addEventListener('offline', atualizar);
    return () => {
      window.removeEventListener('online', atualizar);
      window.removeEventListener('offline', atualizar);
    };
  }, []);
  return online;
}

interface Props {
  atual: Tela;
  /** Telas estreitas (tablet em retrato): o menu vira uma gaveta que abre por cima do conteúdo. */
  aberto: boolean;
  aoFechar: () => void;
}

/**
 * Menu lateral no estilo do Sistema PCA: cabeçalho com o nome do app, itens principais,
 * grupos com título e, no rodapé, Ajustes e o estado da sincronização.
 */
export function MenuLateral({ atual, aberto, aoFechar }: Props) {
  const online = useOnline();
  const sync = useSync();
  const status = !online && sync.status !== 'desconectado' ? 'offline' : sync.status;

  const ir = (tela: Tela) => {
    irPara(tela);
    aoFechar();
  };

  const link = (item: ItemMenu, filho = false) => (
    <button
      key={item.tela}
      class={`menu-link${filho ? ' filho' : ''}`}
      aria-current={item.tela === atual ? 'page' : undefined}
      onClick={() => ir(item.tela)}
    >
      <item.Icone />
      {item.rotulo}
    </button>
  );

  return (
    <>
      {aberto && <div class="menu-veu" onClick={aoFechar} />}
      <nav class={`menu${aberto ? ' aberto' : ''}`} aria-label="Navegação principal">
        <div class="menu-cabecalho">
          <p class="menu-titulo">{APP.nome}</p>
          <p class="menu-sub">Ciclo de estudos</p>
        </div>

        <div class="menu-lista">
          {MENU.map((m) =>
            ehGrupo(m) ? (
              <div key={m.grupo} class="menu-grupo">
                <p class="menu-grupo-titulo">{m.grupo}</p>
                {m.itens.map((item) => link(item, true))}
              </div>
            ) : (
              link(m)
            ),
          )}
        </div>

        <div class="menu-rodape">
          {link({ tela: 'config', rotulo: 'Ajustes', Icone: IconeConfig })}
          <button class="status-sync" onClick={() => ir('config')} title={sync.erro ?? ROTULO_STATUS[status]}>
            <span class={`status-ponto ${status}`} />
            {ROTULO_STATUS[status]}
            {status === 'pendente' && <small>{sync.pendentes}</small>}
          </button>
        </div>
      </nav>
    </>
  );
}
