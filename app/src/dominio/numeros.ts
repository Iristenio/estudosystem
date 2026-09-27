// Números digitados pelo usuário (aceita vírgula ou ponto) e exibidos no formato brasileiro.

/** "36,5" → 36.5 · "" → null · "abc" → NaN (a validação da entidade acusa o erro). */
export function lerNumero(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(',', '.');
  if (!limpo) return null;
  return /^-?\d+(\.\d+)?$/.test(limpo) ? Number(limpo) : NaN;
}

// Sem separador de milhar: o texto volta para um campo e "1.064" seria lido como 1,064.
const formatador = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2, useGrouping: false });

/** 36.5 → "36,5" · 1064 → "1064" · null → "" */
export function mostrarNumero(n: number | null): string {
  return n === null || Number.isNaN(n) ? '' : formatador.format(n);
}
