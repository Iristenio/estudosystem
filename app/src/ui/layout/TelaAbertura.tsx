import { useEffect, useState } from 'preact/hooks';
import { APP } from '../../app.config';

const TEMPO_VISIVEL_MS = 1200;
const DURACAO_FADE_MS = 600; // precisa bater com .abertura.saindo em global.css

/** Tela de apresentação ao abrir o app (inspirada na do Sistema PCA). Some sozinha. */
export function TelaAbertura() {
  const [fase, setFase] = useState<'visivel' | 'saindo' | 'fim'>('visivel');

  useEffect(() => {
    const t1 = setTimeout(() => setFase('saindo'), TEMPO_VISIVEL_MS);
    const t2 = setTimeout(() => setFase('fim'), TEMPO_VISIVEL_MS + DURACAO_FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (fase === 'fim') return null;
  return (
    <div class={`abertura${fase === 'saindo' ? ' saindo' : ''}`} onClick={() => setFase('saindo')}>
      <div class="abertura-faixa" />
      <div class="abertura-conteudo">
        <p class="abertura-titulo">{APP.nome}</p>
        <p class="abertura-sub">Ciclo de estudos</p>
        <p class="abertura-carregando">Carregando...</p>
      </div>
      <div class="abertura-rodape">Constância vence intensidade.</div>
    </div>
  );
}
