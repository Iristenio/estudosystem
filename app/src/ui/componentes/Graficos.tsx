// Peças dos painéis, com a animação "ao rolar" do Sistema PCA (pn_visual):
//  • <Revelar>: o bloco só "entra" (sobe e aparece) quando surge na tela; os filhos animam junto;
//  • <Contador>: número que conta de 0 até o valor na primeira vez que aparece;
//  • colunas e barras crescem a partir do zero quando o bloco entra;
//  • depois de um filtro, tudo atualiza direto no valor final (sem animar de novo);
//  • com "reduzir movimento" no aparelho, nada anima.
import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useRef, useState } from 'preact/hooks';

const REDUZIDO = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Página escondida (app em segundo plano): o navegador pausa a animação — então mostra tudo já pronto. */
const escondida = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** A página diz se ainda deve animar (false depois que o usuário mexe num filtro). */
export const ContextoAnimar = createContext(true);
const ContextoRevelado = createContext(true);

/* ---------------- Bloco que aparece ao rolar ---------------- */

export function Revelar({ children, atraso = 0, class: classe = '' }: { children: ComponentChildren; atraso?: number; class?: string }) {
  const animar = useContext(ContextoAnimar) && !REDUZIDO;
  const ref = useRef<HTMLDivElement>(null);
  const [entrou, setEntrou] = useState(!animar || escondida() || typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (entrou || !el) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) setEntrou(true);
      },
      { threshold: 0.06 },
    );
    obs.observe(el);
    // Plano B: se o navegador não avisar (aconteceu em alguns aparelhos), o próprio bloco confere
    // se está na tela logo depois de aparecer e a cada rolagem — o conteúdo nunca fica invisível.
    const naTela = () => {
      const r = el.getBoundingClientRect();
      const altura = window.innerHeight || document.documentElement.clientHeight;
      if (altura > 0 && r.top < altura && r.bottom > 0) setEntrou(true);
    };
    const timer = setTimeout(naTela, 600);
    const rolagem = el.closest('.conteudo');
    rolagem?.addEventListener('scroll', naTela, { passive: true });
    window.addEventListener('resize', naTela);
    return () => {
      obs.disconnect();
      clearTimeout(timer);
      rolagem?.removeEventListener('scroll', naTela);
      window.removeEventListener('resize', naTela);
    };
  }, [entrou]);

  return (
    <div ref={ref} class={`rev ${entrou ? 'entrou' : ''} ${classe}`} style={{ '--atraso': `${atraso}ms` }}>
      <ContextoRevelado.Provider value={entrou}>{children}</ContextoRevelado.Provider>
    </div>
  );
}

/* ---------------- Número que conta ---------------- */

export function Contador({ valor, formatar }: { valor: number; formatar: (n: number) => string }) {
  const revelado = useContext(ContextoRevelado);
  const animar = useContext(ContextoAnimar) && !REDUZIDO;
  const jaAnimou = useRef(!animar);
  const [mostrado, setMostrado] = useState(animar ? 0 : valor);

  useEffect(() => {
    if (!revelado) return;
    if (jaAnimou.current || escondida()) {
      jaAnimou.current = true;
      setMostrado(valor);
      return;
    }
    jaAnimou.current = true;
    let inicio: number | null = null;
    let quadro = 0;
    const passo = (t: number) => {
      inicio ??= t;
      const p = Math.min((t - inicio) / 1100, 1);
      setMostrado(valor * (1 - Math.pow(1 - p, 3)));
      if (p < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [revelado, valor]);

  return <>{formatar(mostrado)}</>;
}

/* ---------------- Dica flutuante (tooltip) ---------------- */

export interface ConteudoDica {
  titulo: string;
  linhas: { valor: string; rotulo?: string; cor?: string }[];
}

type MostrarDica = (e: { clientX: number; clientY: number } | HTMLElement, c: ConteudoDica) => void;
const ContextoDica = createContext<{ mostrar: MostrarDica; esconder: () => void }>({ mostrar: () => {}, esconder: () => {} });
export const useDica = () => useContext(ContextoDica);

export function ProvedorDica({ children }: { children: ComponentChildren }) {
  const [dica, setDica] = useState<(ConteudoDica & { x: number; y: number }) | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const mostrar: MostrarDica = (e, c) => {
    // Teclado (foco): posiciona pela própria barra
    const pos = e instanceof HTMLElement ? (() => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; })() : { x: e.clientX, y: e.clientY };
    setDica({ ...c, ...pos });
  };
  const esconder = () => setDica(null);

  // Não deixa a dica sair da tela
  let estilo: Record<string, string> = {};
  if (dica) {
    const largura = caixa.current?.offsetWidth ?? 180;
    const esquerda = dica.x + 14 + largura > innerWidth - 8 ? dica.x - largura - 14 : dica.x + 14;
    estilo = { left: `${Math.max(8, esquerda)}px`, top: `${Math.max(8, dica.y + 14)}px` };
  }

  return (
    <ContextoDica.Provider value={{ mostrar, esconder }}>
      {children}
      {dica && (
        <div ref={caixa} class="dica-flutuante" style={estilo} role="tooltip">
          <div class="dica-titulo">{dica.titulo}</div>
          {dica.linhas.map((l, i) => (
            <div key={i} class="dica-linha">
              {l.cor && <span class="dica-chave" style={{ background: l.cor }} />}
              <strong>{l.valor}</strong>
              {l.rotulo && <span>{l.rotulo}</span>}
            </div>
          ))}
        </div>
      )}
    </ContextoDica.Provider>
  );
}

/** Eventos que mostram a dica ao passar o mouse, tocar ou focar pelo teclado. */
function comDica(dica: ReturnType<typeof useDica>, conteudo: ConteudoDica) {
  return {
    onPointerEnter: (e: PointerEvent) => dica.mostrar(e, conteudo),
    onPointerMove: (e: PointerEvent) => dica.mostrar(e, conteudo),
    onPointerLeave: () => dica.esconder(),
    onFocus: (e: FocusEvent) => dica.mostrar(e.currentTarget as HTMLElement, conteudo),
    onBlur: () => dica.esconder(),
  };
}

/* ---------------- Escala "redonda" do eixo ---------------- */

/** Máximo "redondo" e passo para ~3–4 linhas de grade (ex.: 2,3 h → 3 h em passos de 1 h). */
export function escalaRedonda(max: number): { max: number; passo: number } {
  if (!(max > 0)) return { max: 1, passo: 0.5 };
  const passos = [0.25, 0.5, 1, 2, 3, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
  const passo = passos.find((p) => max / p <= 4) ?? Math.pow(10, Math.ceil(Math.log10(max / 4)));
  return { max: Math.ceil(max / passo) * passo, passo };
}

/* ---------------- Gráfico de colunas (uma série) ---------------- */

export interface Coluna {
  chave: string;
  rotulo: string; // eixo X (pode ficar vazio para não amontoar)
  valor: number;
  /** Valor escrito em cima da coluna (vazio = sem rótulo, ex.: dia sem estudo). */
  texto?: string;
  dica: ConteudoDica;
}

interface PropsColunas {
  colunas: Coluna[];
  formatarEixo: (n: number) => string;
  descricao: string;
}

/** Com muitas colunas, os valores ficam na vertical para não se sobreporem. */
const LIMITE_VALORES_HORIZONTAIS = 16;

export function GraficoColunas({ colunas, formatarEixo, descricao }: PropsColunas) {
  const comValores = colunas.some((c) => c.texto);
  const vertical = colunas.length > LIMITE_VALORES_HORIZONTAIS;
  const dica = useDica();
  const { max, passo } = escalaRedonda(Math.max(0, ...colunas.map((c) => c.valor)));
  const linhas: number[] = [];
  for (let v = 0; v <= max + 1e-9; v += passo) linhas.push(v);

  return (
    <div class={`grafico-colunas${comValores ? ' com-valores' : ''}${vertical ? ' valores-verticais' : ''}`} role="img" aria-label={descricao}>
      <div class="eixo-y" aria-hidden="true">
        {linhas.map((v) => (
          <span key={v} style={{ bottom: `${(v / max) * 100}%` }}>
            {formatarEixo(v)}
          </span>
        ))}
      </div>
      <div class="area-colunas">
        {linhas.map((v) => (
          <span key={v} class="grade" style={{ bottom: `${(v / max) * 100}%` }} aria-hidden="true" />
        ))}
        {colunas.map((c, i) => (
          <button
            key={c.chave}
            type="button"
            class="coluna"
            aria-label={`${c.dica.titulo}: ${c.dica.linhas.map((l) => l.valor).join(', ')}`}
            {...comDica(dica, c.dica)}
          >
            <span class="coluna-barra" style={{ height: `${(c.valor / max) * 100}%`, transitionDelay: `${Math.min(i * 25, 600)}ms` }}>
              {c.texto && (
                <span class="coluna-valor" aria-hidden="true">
                  {c.texto}
                </span>
              )}
            </span>
            <span class="coluna-rotulo" aria-hidden="true">
              {c.rotulo}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Barras horizontais (nome · barra · valor na ponta) ---------------- */

export interface Barra {
  chave: string;
  rotulo: string;
  valor: number;
  texto: string; // valor já formatado, na ponta da barra
  cor: string;
  dica: ConteudoDica;
}

export function BarrasHorizontais({ barras }: { barras: Barra[] }) {
  const dica = useDica();
  const max = Math.max(0, ...barras.map((b) => b.valor)) || 1;
  return (
    <ul class="barras-h">
      {barras.map((b, i) => (
        <li key={b.chave}>
          <button type="button" class="barra-h" aria-label={`${b.rotulo}: ${b.texto}`} {...comDica(dica, b.dica)}>
            <span class="barra-h-nome">
              <span class="bolinha" style={{ background: b.cor }} />
              <span class="barra-h-nome-texto">{b.rotulo}</span>
            </span>
            <span class="barra-h-trilho">
              <span class="barra-h-preench" style={{ width: `${(b.valor / max) * 100}%`, background: b.cor, transitionDelay: `${i * 60}ms` }} />
            </span>
            <span class="barra-h-valor">{b.texto}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Barras empilhadas (duas partes: ex. acertos + erros) ---------------- */

export interface BarraEmpilhada {
  chave: string;
  rotulo: string;
  cor: string; // bolinha de identidade (a disciplina)
  partes: [number, number];
  texto: string; // na ponta (ex.: "85%")
  dica: ConteudoDica;
}

/** Partes em cores fixas (legenda acima); a 2ª parte é neutra. Comprimento proporcional ao total. */
export function BarrasEmpilhadas({ barras, legenda }: { barras: BarraEmpilhada[]; legenda: [string, string] }) {
  const dica = useDica();
  const max = Math.max(0, ...barras.map((b) => b.partes[0] + b.partes[1])) || 1;
  return (
    <>
      <div class="legenda" aria-hidden="true">
        <span>
          <span class="legenda-chave parte-1" /> {legenda[0]}
        </span>
        <span>
          <span class="legenda-chave parte-2" /> {legenda[1]}
        </span>
      </div>
      <ul class="barras-h">
        {barras.map((b, i) => (
          <li key={b.chave}>
            <button type="button" class="barra-h" aria-label={`${b.rotulo}: ${b.dica.linhas.map((l) => `${l.valor} ${l.rotulo ?? ''}`).join(', ')}`} {...comDica(dica, b.dica)}>
              <span class="barra-h-nome">
                <span class="bolinha" style={{ background: b.cor }} />
                <span class="barra-h-nome-texto">{b.rotulo}</span>
              </span>
              <span class="barra-h-trilho">
                <span class="empilhada" style={{ width: `${((b.partes[0] + b.partes[1]) / max) * 100}%`, transitionDelay: `${i * 60}ms` }}>
                  {b.partes[0] > 0 && <span class="parte parte-1" style={{ flexGrow: b.partes[0] }} />}
                  {b.partes[1] > 0 && <span class="parte parte-2" style={{ flexGrow: b.partes[1] }} />}
                </span>
              </span>
              <span class="barra-h-valor">{b.texto}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------------- Comparativo: nome · medidor (0–100%) · percentual ---------------- */

export interface ItemComparativo {
  chave: string;
  rotulo: string;
  cor: string;
  percentual: number | null; // null = sem dado ("—")
  detalhe: string; // na dica (ex.: "12h de 70h")
}

export function Comparativo({ itens }: { itens: ItemComparativo[] }) {
  const dica = useDica();
  const fmt = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  return (
    <ul class="barras-h comparativo">
      {itens.map((it) => (
        <li key={it.chave}>
          <button
            type="button"
            class="barra-h"
            aria-label={`${it.rotulo}: ${it.percentual === null ? 'sem dado' : fmt(it.percentual)} (${it.detalhe})`}
            {...comDica(dica, { titulo: it.rotulo, linhas: [{ valor: it.percentual === null ? '—' : fmt(it.percentual), rotulo: it.detalhe, cor: it.cor }] })}
          >
            <span class="barra-h-nome">
              <span class="bolinha" style={{ background: it.cor }} />
              <span class="barra-h-nome-texto">{it.rotulo}</span>
            </span>
            <Medidor percentual={it.percentual ?? 0} cor={it.cor} />
            <span class="barra-h-valor">{it.percentual === null ? '—' : fmt(it.percentual)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Medidor de progresso (0–100%) ---------------- */

export function Medidor({ percentual, cor }: { percentual: number; cor: string }) {
  return (
    <span class="medidor" style={{ '--cor': cor }}>
      <span class="medidor-preench" style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }} />
    </span>
  );
}

/* ---------------- Alternar gráfico / tabela ---------------- */

export function AlternarTabela({ tabela, aoMudar }: { tabela: boolean; aoMudar: (t: boolean) => void }) {
  return (
    <div class="segmentado pequeno alternar-tabela" role="radiogroup" aria-label="Forma de exibir">
      <button type="button" role="radio" aria-checked={!tabela} onClick={() => aoMudar(false)}>
        Gráfico
      </button>
      <button type="button" role="radio" aria-checked={tabela} onClick={() => aoMudar(true)}>
        Tabela
      </button>
    </div>
  );
}
