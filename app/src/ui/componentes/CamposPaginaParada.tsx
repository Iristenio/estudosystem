// R40 — "Parei na página" de cada PDF marcado que ainda está na 1ª leitura (ou "Terminei este PDF").
// PDFs já concluídos não pedem página: marcar de novo só conta mais uma leitura.
import type { Id, ItemMaterial } from '../../dominio/tipos';
import { rotuloItem } from '../../dominio/material';

/** Texto digitado por PDF; "terminei" = página final. */
export type TextosParada = Record<Id, string>;

interface Props {
  /** PDFs marcados na sessão. */
  pdfs: ItemMaterial[];
  /** Página anterior de cada PDF na 1ª leitura (0 = nunca aberto); ausente = já concluído. */
  anteriores: Map<Id, number>;
  textos: TextosParada;
  aoMudar: (textos: TextosParada) => void;
}

/** Textos → paradas válidas para gravar (vazio fica de fora). */
export function lerParadas(textos: TextosParada): { id: Id; pagina: number }[] {
  return Object.entries(textos)
    .filter(([, t]) => t.trim() !== '')
    .map(([id, t]) => ({ id, pagina: /^\d+$/.test(t.trim()) ? Number(t.trim()) : NaN }));
}

export function CamposPaginaParada({ pdfs, anteriores, textos, aoMudar }: Props) {
  if (!pdfs.length) return null;
  return (
    <div class="paginas-paradas">
      {pdfs.map((i) => {
        if (!anteriores.has(i.id))
          return (
            <p key={i.id} class="dica">
              {rotuloItem(i)}: já concluído — conta como mais uma leitura.
            </p>
          );
        const anterior = anteriores.get(i.id)!;
        const texto = textos[i.id] ?? '';
        const pagina = /^\d+$/.test(texto.trim()) ? Number(texto) : null;
        const terminou = pagina === i.tamanho;
        const pct = pagina ? Math.min(100, Math.round((pagina / i.tamanho) * 100)) : null;
        return (
          <div key={i.id} class="pagina-parada">
            <span class="pagina-parada-nome">
              <strong>{rotuloItem(i)}</strong>
              <small>
                {i.tamanho} págs. · {anterior ? `parou na pág. ${anterior} da última vez` : 'primeira vez neste PDF'}
              </small>
            </span>
            <label class="rotulo em-linha">
              Parei na página
              <input
                class="campo campo-numero"
                inputMode="numeric"
                placeholder={anterior ? String(anterior) : '—'}
                value={texto}
                onInput={(e) => aoMudar({ ...textos, [i.id]: e.currentTarget.value })}
              />
              {pct !== null && <small class="dica">{pct}%</small>}
            </label>
            <label class="interruptor">
              <input
                type="checkbox"
                checked={terminou}
                onChange={(e) => aoMudar({ ...textos, [i.id]: e.currentTarget.checked ? String(i.tamanho) : '' })}
              />
              Terminei este PDF
            </label>
          </div>
        );
      })}
    </div>
  );
}
