// Artigos lidos na lei seca (R25–R29 da ESPECIFICACAO.md). Funções puras, testadas em artigos.test.ts.
//
// Cada sessão de Lei Seca guarda QUAIS artigos foram lidos, em faixas de texto ("1-10, 15, 37-40").
// Só o número do artigo conta: "37-A" vale como 37, e parágrafos/incisos não entram.
import type { Lei, Sessao } from './tipos';

export interface LeituraFaixas {
  /** Artigos em ordem, sem repetição. */
  artigos: number[];
  erros: string[];
}

/** Um artigo, com letra opcional depois (37-A, 37A): a letra é ignorada. */
const ARTIGO = String.raw`(\d+)(?:-?[a-z]{1,2})?`;
const TRECHO = new RegExp(`^${ARTIGO}(?:-${ARTIGO})?$`);

/** Deixa o texto num formato único: "Arts. 1º a 10; 15 e 37-A" → "1-10,15,37-a". */
function normalizar(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/(\d)\.(\d{3})/g, '$1$2') // 1.000 → 1000
    .replace(/\b(arts?|artigos?)\b\.?/g, ' ')
    .replace(/[º°ª]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+(a|até)\s+/g, '-')
    .replace(/\s+e\s+/g, ',')
    .replace(/\s*-\s*/g, '-')
    .split(/[,;\s]+/)
    .filter(Boolean);
}

/**
 * R25/R26 — lê as faixas digitadas. Aceita "1-10, 15", "1 a 10", ponto e vírgula, "art. 5º",
 * artigos com letra (contam como o principal) e faixa invertida (10-1 = 1-10).
 * `total` = último artigo da lei (sem ele, não confere o limite).
 */
export function lerFaixas(texto: string, total: number | null = null): LeituraFaixas {
  const erros: string[] = [];
  const lidos = new Set<number>();
  for (const trecho of normalizar(texto)) {
    const m = TRECHO.exec(trecho);
    if (!m) {
      erros.push(`Não entendi "${trecho}". Use números e faixas, como 1-10, 15.`);
      continue;
    }
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    const [de, ate] = a <= b ? [a, b] : [b, a];
    if (de < 1) {
      erros.push('Os artigos começam no 1.');
      continue;
    }
    if (total && ate > total) {
      erros.push(`O artigo ${ate} não existe nesta lei (ela vai até o ${total}).`);
      continue;
    }
    for (let n = de; n <= ate; n++) lidos.add(n);
  }
  if (!erros.length && !lidos.size) erros.push('Informe quais artigos foram lidos (ex.: 1-10, 15).');
  return { artigos: [...lidos].sort((x, y) => x - y), erros };
}

/** [1,2,3,5,7,8] → "1-3, 5, 7-8" */
export function formatarFaixas(artigos: number[]): string {
  const ordem = [...new Set(artigos)].sort((x, y) => x - y);
  const partes: string[] = [];
  for (let i = 0; i < ordem.length; i++) {
    const de = ordem[i];
    while (i + 1 < ordem.length && ordem[i + 1] === ordem[i] + 1) i++;
    partes.push(ordem[i] === de ? String(de) : `${de}-${ordem[i]}`);
  }
  return partes.join(', ');
}

/** Faixas já gravadas numa sessão → artigos. Sessões antigas (sem faixas) devolvem lista vazia (R29). */
export function artigosDaSessao(s: Pick<Sessao, 'artigos_lidos'>): number[] {
  return s.artigos_lidos ? lerFaixas(s.artigos_lidos).artigos : [];
}

/**
 * R29 — artigos DIFERENTES já lidos da lei, só das sessões com faixas. Artigos acima do total
 * atual da lei (se o total foi diminuído depois) não contam.
 */
export function artigosLidosDaLei(lei: Pick<Lei, 'id' | 'total_artigos'>, concluidas: Sessao[]): Set<number> {
  const lidos = new Set<number>();
  for (const s of concluidas) {
    if (s.tipo !== 'Lei Seca' || s.lei_id !== lei.id) continue;
    for (const n of artigosDaSessao(s)) if (!lei.total_artigos || n <= lei.total_artigos) lidos.add(n);
  }
  return lidos;
}

/** Soma dos artigos diferentes lidos de várias leis. */
export function artigosDiferentesLidos(leis: Pick<Lei, 'id' | 'total_artigos'>[], concluidas: Sessao[]): number {
  return leis.reduce((soma, l) => soma + artigosLidosDaLei(l, concluidas).size, 0);
}

/* ============================ Mapa da lei ============================ */

export interface ArtigoNoMapa {
  numero: number;
  /** Em quantas sessões o artigo foi lido. */
  vezes: number;
  /** Início da sessão mais recente em que foi lido (ISO), ou null. */
  ultima: string | null;
}

/** Um item por artigo da lei (1 até o total), com as leituras das sessões com faixas (R29). */
export function mapaDaLei(lei: Pick<Lei, 'id' | 'total_artigos'>, concluidas: Sessao[]): ArtigoNoMapa[] {
  const total = lei.total_artigos ?? 0;
  const mapa: ArtigoNoMapa[] = Array.from({ length: total }, (_, i) => ({ numero: i + 1, vezes: 0, ultima: null }));
  for (const s of concluidas) {
    if (s.tipo !== 'Lei Seca' || s.lei_id !== lei.id) continue;
    for (const n of artigosDaSessao(s)) {
      const a = mapa[n - 1];
      if (!a) continue;
      a.vezes++;
      if (!a.ultima || s.inicio > a.ultima) a.ultima = s.inicio;
    }
  }
  return mapa;
}

/** Primeiro trecho seguido de artigos nunca lidos (ex.: 13 a 29), ou null se a lei foi toda lida. */
export function proximoTrechoNaoLido(mapa: ArtigoNoMapa[]): { de: number; ate: number } | null {
  const i = mapa.findIndex((a) => a.vezes === 0);
  if (i < 0) return null;
  let f = i;
  while (f + 1 < mapa.length && mapa[f + 1].vezes === 0) f++;
  return { de: mapa[i].numero, ate: mapa[f].numero };
}

/** Totais do mapa: lidos (ao menos 1 vez), relidos (2 ou mais) e nunca lidos. */
export function resumoDoMapa(mapa: ArtigoNoMapa[]) {
  const lidos = mapa.filter((a) => a.vezes > 0).length;
  return {
    total: mapa.length,
    lidos,
    relidos: mapa.filter((a) => a.vezes > 1).length,
    naoLidos: mapa.length - lidos,
    percentual: mapa.length ? Math.round((lidos / mapa.length) * 1000) / 10 : 0,
  };
}
