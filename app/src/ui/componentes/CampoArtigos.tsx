// Campo "Artigos lidos" da lei seca (R25): digitar faixas ("1-10, 15") ou marcar tocando numa grade.
// O texto é a fonte da verdade; a grade só lê e reescreve o texto.
import { useState } from 'preact/hooks';
import { formatarFaixas, lerFaixas } from '../../dominio/artigos';

interface Props {
  valor: string;
  aoMudar: (texto: string) => void;
  /** Total de artigos da lei (tamanho da grade e limite das faixas). */
  total: number | null;
  /** Artigos já lidos em outras sessões — aparecem com um pontinho na grade. */
  jaLidos?: Set<number>;
}

export function CampoArtigos({ valor, aoMudar, total, jaLidos }: Props) {
  const [grade, setGrade] = useState(false);
  const [modoFaixa, setModoFaixa] = useState(false);
  const [inicioFaixa, setInicioFaixa] = useState<number | null>(null);
  const leitura = lerFaixas(valor, total);
  const marcados = new Set(leitura.artigos);
  const vazio = !valor.trim();

  function tocar(n: number) {
    const novos = new Set(marcados);
    if (modoFaixa) {
      if (inicioFaixa === null) {
        setInicioFaixa(n);
        return;
      }
      const [de, ate] = inicioFaixa <= n ? [inicioFaixa, n] : [n, inicioFaixa];
      for (let i = de; i <= ate; i++) novos.add(i);
      setInicioFaixa(null);
    } else if (novos.has(n)) novos.delete(n);
    else novos.add(n);
    aoMudar(formatarFaixas([...novos]));
  }

  function trocarModo() {
    setModoFaixa(!modoFaixa);
    setInicioFaixa(null);
  }

  return (
    <div class="campo-artigos">
      <label class="rotulo">
        Artigos lidos
        <input
          class="campo campo-largo"
          placeholder="Ex.: 1-10, 15, 37-40"
          value={valor}
          onInput={(e) => aoMudar(e.currentTarget.value)}
        />
      </label>
      <p class={`dica artigos-contagem${!vazio && leitura.erros.length ? ' com-erro' : ''}`} aria-live="polite">
        {vazio
          ? 'Use faixas e vírgulas: 1-10, 15. Artigo com letra (37-A) conta como o 37.'
          : leitura.erros.length
            ? leitura.erros[0]
            : `${leitura.artigos.length} artigo${leitura.artigos.length === 1 ? '' : 's'}`}
      </p>

      {total ? (
        <button type="button" class="link link-inline" onClick={() => setGrade(!grade)} aria-expanded={grade}>
          {grade ? 'Fechar a grade' : 'Marcar na grade'}
        </button>
      ) : null}

      {grade && total ? (
        <div class="grade-artigos-bloco">
          <div class="grade-artigos-barra">
            <label class="interruptor">
              <input type="checkbox" checked={modoFaixa} onChange={trocarModo} />
              Marcar faixa
            </label>
            <small class="dica">
              {modoFaixa
                ? inicioFaixa === null
                  ? 'Toque no primeiro artigo da faixa.'
                  : `Do ${inicioFaixa} até… toque no último.`
                : 'Toque para marcar ou desmarcar.'}
              {jaLidos?.size ? ' Pontinho = já lido antes.' : ''}
            </small>
          </div>
          <div class="grade-artigos" role="group" aria-label="Artigos da lei">
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                class={`artigo${marcados.has(n) ? ' marcado' : ''}${jaLidos?.has(n) ? ' ja-lido' : ''}${inicioFaixa === n ? ' inicio-faixa' : ''}`}
                aria-pressed={marcados.has(n)}
                onClick={() => tocar(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
