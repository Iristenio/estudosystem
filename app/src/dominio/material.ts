// Material da disciplina lançado aos poucos (R30–R35 da ESPECIFICACAO.md). Funções puras, testadas em material.test.ts.
//
// Cada PDF ou vídeo é um item (número, nome opcional, curso, tamanho). O total de páginas e de horas
// de vídeo da disciplina é a soma dos itens que contam: não estão "fora do total" e o curso está ligado.
import type { Disciplina, Id, ItemMaterial, Sessao, TipoMaterial } from './tipos';

export const ROTULO_MATERIAL: Record<TipoMaterial, string> = { PDF: 'PDF', Video: 'Vídeo' };

/** Itens gravados na disciplina (registros antigos podem não ter o campo). */
const gravados = (d: Pick<Disciplina, 'materiais'>) => d.materiais ?? [];
export const cursosFora = (d: Pick<Disciplina, 'cursos_fora'>) => d.cursos_fora ?? [];

/**
 * Itens da disciplina. R34 — enquanto nada foi lançado, o total antigo aparece como o item
 * "Total anterior" (número 0), para nada mudar no dia da atualização.
 */
export function itensDaDisciplina(d: Disciplina): ItemMaterial[] {
  if (gravados(d).length) return gravados(d);
  const itens: ItemMaterial[] = [];
  const anterior = (tipo: TipoMaterial, tamanho: number): ItemMaterial => ({
    id: `anterior-${tipo === 'PDF' ? 'pdf' : 'video'}`,
    tipo,
    numero: 0,
    nome: 'Total anterior',
    curso: '',
    tamanho,
    fora: false,
  });
  if (d.total_paginas) itens.push(anterior('PDF', d.total_paginas));
  if (d.total_horas_video) itens.push(anterior('Video', Math.round(d.total_horas_video * 60 * 100) / 100));
  return itens;
}

export const contaNoTotal = (item: ItemMaterial, fora: string[]) => !item.fora && !fora.includes(item.curso);

/** R30 — soma do que conta no total. null = nenhum item daquele tipo conta. */
export function totaisDoMaterial(itens: ItemMaterial[], fora: string[]) {
  const contam = itens.filter((i) => contaNoTotal(i, fora));
  const pdfs = contam.filter((i) => i.tipo === 'PDF');
  const videos = contam.filter((i) => i.tipo === 'Video');
  const soma = (l: ItemMaterial[]) => l.reduce((s, i) => s + i.tamanho, 0);
  return {
    paginas: pdfs.length ? soma(pdfs) : null,
    minutos: videos.length ? Math.round(soma(videos) * 100) / 100 : null,
    qtdPdf: pdfs.length,
    qtdVideo: videos.length,
  };
}

/** Grava itens e cursos desligados na disciplina e recalcula os totais (R30). */
export function aplicarMaterial(d: Disciplina, itens: ItemMaterial[], fora: string[]): Disciplina {
  const cursos = new Set(itens.map((i) => i.curso));
  const foraUsados = [...new Set(fora)].filter((c) => cursos.has(c));
  const t = totaisDoMaterial(itens, foraUsados);
  return {
    ...d,
    materiais: ordenarItens(itens),
    cursos_fora: foraUsados,
    total_paginas: t.paginas,
    total_horas_video: t.minutos === null ? null : Math.round((t.minutos / 60) * 10000) / 10000,
  };
}

/** Por tipo (PDF antes), curso (sem curso por último) e número. */
export function ordenarItens(itens: ItemMaterial[]): ItemMaterial[] {
  return [...itens].sort(
    (a, b) =>
      (a.tipo === b.tipo ? 0 : a.tipo === 'PDF' ? -1 : 1) ||
      (a.curso === b.curso ? 0 : !a.curso ? 1 : !b.curso ? -1 : a.curso.localeCompare(b.curso, 'pt-BR')) ||
      a.numero - b.numero,
  );
}

/** Cursos usados num tipo de material, na ordem da lista. "" = sem curso. */
export function cursosDoTipo(itens: ItemMaterial[], tipo: TipoMaterial): string[] {
  return [...new Set(ordenarItens(itens.filter((i) => i.tipo === tipo)).map((i) => i.curso))];
}

/** Todos os nomes de curso já usados na disciplina (para sugerir ao digitar). */
export const cursosUsados = (itens: ItemMaterial[]) => [...new Set(itens.map((i) => i.curso).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export function proximoNumero(itens: ItemMaterial[], tipo: TipoMaterial, curso: string): number {
  return itens.filter((i) => i.tipo === tipo && i.curso === curso).reduce((m, i) => Math.max(m, i.numero), 0) + 1;
}

/* ============================ Lançar rápido (R31) ============================ */

export interface LeituraTamanhos {
  valores: number[];
  erros: string[];
}

const MAX_REPETICAO = 300;

/** "1h20" → 80 · "32:15" → 32,25 · "1:05:30" → 65,5 · "40" / "40min" → 40 (minutos). */
function lerDuracao(t: string): number | null {
  let m = /^(\d+)h(?:(\d{1,2})(?:min)?)?$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0);
  m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (m) return m[3] !== undefined ? Number(m[1]) * 60 + Number(m[2]) + Number(m[3]) / 60 : Number(m[1]) + Number(m[2]) / 60;
  m = /^(\d+(?:\.\d+)?)(?:min)?$/.exec(t);
  if (m) return Number(m[1]);
  return null;
}

/**
 * R31 — vários tamanhos de uma vez. PDF: "35, 42, 2x28" (páginas). Vídeo: "2x30, 40, 1h20, 32:15"
 * (minutos). Cada valor vira um item; "2x30" = dois itens de 30.
 */
export function lerTamanhos(texto: string, tipo: TipoMaterial): LeituraTamanhos {
  const erros: string[] = [];
  const valores: number[] = [];
  const partes = texto
    .toLowerCase()
    .replace(/\s*[x×*]\s*/g, 'x')
    .replace(/(\d)\s*h\s*(\d)/g, '$1h$2')
    .replace(/\s*(minutos?|mins?|m)\b/g, 'min')
    .replace(/\s*(páginas?|paginas?|págs?|pags?|p)\b\.?/g, '')
    .split(/[;,\s]+/) // a vírgula sempre separa itens (decimal, só com ponto: 40.5)
    .filter(Boolean);
  for (const parte of partes) {
    const m = /^(?:(\d+)x)?(.+)$/.exec(parte)!;
    const vezes = m[1] ? Number(m[1]) : 1;
    const valor = tipo === 'PDF' ? (/^\d+$/.test(m[2]) ? Number(m[2]) : null) : lerDuracao(m[2]);
    if (valor === null) {
      erros.push(
        tipo === 'PDF'
          ? `Não entendi "${parte}". Use o número de páginas, como 35, 42 ou 2x30.`
          : `Não entendi "${parte}". Use minutos, como 30, 2x30, 1h20 ou 32:15.`,
      );
      continue;
    }
    if (valor <= 0 || vezes < 1) {
      erros.push(`"${parte}" precisa ser maior que zero.`);
      continue;
    }
    if (vezes > MAX_REPETICAO) {
      erros.push(`"${parte}": no máximo ${MAX_REPETICAO} itens de uma vez.`);
      continue;
    }
    for (let i = 0; i < vezes; i++) valores.push(Math.round(valor * 100) / 100);
  }
  if (!erros.length && !valores.length)
    erros.push(tipo === 'PDF' ? 'Informe as páginas (ex.: 35, 42).' : 'Informe a duração (ex.: 2x30, 40, 1h20).');
  return { valores, erros };
}

/** Cria os itens lançados, numerados na sequência do curso. Com nome, só um item. */
export function lancarItens(
  itens: ItemMaterial[],
  dados: { tipo: TipoMaterial; curso: string; nome: string; valores: number[] },
  gerarId: () => Id,
): ItemMaterial[] {
  const curso = dados.curso.trim();
  const nome = dados.nome.trim();
  const valores = nome ? dados.valores.slice(0, 1) : dados.valores;
  let numero = proximoNumero(itens, dados.tipo, curso);
  const novos = valores.map((tamanho) => ({ id: gerarId(), tipo: dados.tipo, numero: numero++, nome, curso, tamanho, fora: false }));
  return [...itens, ...novos];
}

/* ============================ Edição de um item ============================ */

export function validarItem(item: ItemMaterial, itens: ItemMaterial[]): string[] {
  const erros: string[] = [];
  if (!(item.tamanho > 0)) erros.push(item.tipo === 'PDF' ? 'Informe as páginas.' : 'Informe a duração.');
  if (item.tipo === 'PDF' && !Number.isInteger(item.tamanho)) erros.push('As páginas precisam ser um número inteiro.');
  if (!Number.isInteger(item.numero) || item.numero < 0) erros.push('O número precisa ser inteiro.');
  else if (
    item.numero > 0 &&
    itens.some((o) => o.id !== item.id && o.tipo === item.tipo && o.curso === item.curso.trim() && o.numero === item.numero)
  )
    erros.push(`Já existe ${ROTULO_MATERIAL[item.tipo]} ${item.numero} neste curso.`);
  return erros;
}

/** R33 — item ligado a sessões não pode ser apagado, só tirado do total. */
export function podeApagarItem(id: Id, sessoes: { materiais_estudados?: Id[] }[]): boolean {
  return !sessoes.some((s) => s.materiais_estudados?.includes(id));
}

/* ============================ Textos ============================ */

/** "PDF 3 · Controle de constitucionalidade" · "Vídeo 12" · "Total anterior" */
export function rotuloItem(i: Pick<ItemMaterial, 'tipo' | 'numero' | 'nome'>): string {
  if (i.numero === 0) return i.nome || ROTULO_MATERIAL[i.tipo];
  return `${ROTULO_MATERIAL[i.tipo]} ${i.numero}${i.nome ? ` · ${i.nome}` : ''}`;
}

/** 30 → "30 min" · 80 → "1h20" · 0,5 → "30 s" */
export function formatarMinutos(minutos: number): string {
  if (minutos < 1) return `${Math.round(minutos * 60)} s`;
  const m = Math.round(minutos);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

export function formatarTamanho(i: Pick<ItemMaterial, 'tipo' | 'tamanho'>): string {
  if (i.tipo === 'Video') return formatarMinutos(i.tamanho);
  return `${i.tamanho.toLocaleString('pt-BR')} pág${i.tamanho === 1 ? '.' : 's.'}`;
}

/**
 * "412 págs. em 11 PDFs" · "11h05 em 15 vídeos" · "1.064 págs. (total anterior)" ·
 * "1.100 págs. em 3 PDFs + total anterior" · null se nada conta.
 */
export function resumoDoTipo(itens: ItemMaterial[], fora: string[], tipo: TipoMaterial): string | null {
  const contam = itens.filter((i) => i.tipo === tipo && contaNoTotal(i, fora));
  if (!contam.length) return null;
  const soma = contam.reduce((s, i) => s + i.tamanho, 0);
  const tamanho = tipo === 'PDF' ? formatarTamanho({ tipo, tamanho: soma }) : formatarMinutos(soma);
  const n = contam.filter((i) => i.numero > 0).length;
  const anterior = n < contam.length;
  if (!n) return `${tamanho} (total anterior)`;
  const nome = tipo === 'PDF' ? `PDF${n === 1 ? '' : 's'}` : `vídeo${n === 1 ? '' : 's'}`;
  return `${tamanho} em ${n} ${nome}${anterior ? ' + total anterior' : ''}`;
}

/* ============================ Sessões e mapa do material (R36, R37) ============================ */

/** Tipo de material de cada tipo de sessão (só PDF e VideoAula usam material). */
export function tipoMaterialDaSessao(tipo: Sessao['tipo']): TipoMaterial | null {
  return tipo === 'PDF' ? 'PDF' : tipo === 'VideoAula' ? 'Video' : null;
}

/**
 * Itens que aparecem para escolher numa sessão e no mapa: os que contam no total, na ordem, mais os
 * já escolhidos. O "Total anterior" (número 0) não é um PDF/vídeo de verdade e fica de fora.
 */
export function itensEscolhiveis(itens: ItemMaterial[], fora: string[], tipo: TipoMaterial, escolhidos: Id[] = []): ItemMaterial[] {
  return ordenarItens(
    itens.filter((i) => i.tipo === tipo && (escolhidos.includes(i.id) || (i.numero > 0 && contaNoTotal(i, fora)))),
  );
}

export interface ItemNoMapa {
  item: ItemMaterial;
  /** Em quantas sessões o item foi marcado. */
  vezes: number;
  /** Início da sessão mais recente em que foi marcado (ISO), ou null. */
  ultima: string | null;
}

/** R37 — leituras de cada item, a partir das sessões concluídas da disciplina que marcaram itens. */
export function mapaDoMaterial(itens: ItemMaterial[], concluidas: Sessao[]): ItemNoMapa[] {
  const mapa = new Map(ordenarItens(itens).map((item) => [item.id, { item, vezes: 0, ultima: null as string | null }]));
  for (const s of concluidas) {
    for (const id of s.materiais_estudados ?? []) {
      const m = mapa.get(id);
      if (!m) continue;
      m.vezes++;
      if (!m.ultima || s.inicio > m.ultima) m.ultima = s.inicio;
    }
  }
  return [...mapa.values()];
}

/**
 * R36 — próximo item sugerido: o seguinte (na ordem dos que contam) ao último item marcado na
 * sessão mais recente; sem marcações (ou no fim da lista), o primeiro nunca estudado.
 */
export function proximoItem(itens: ItemMaterial[], fora: string[], tipo: TipoMaterial, concluidas: Sessao[]): ItemMaterial | null {
  const lista = itensEscolhiveis(itens, fora, tipo);
  if (!lista.length) return null;
  const posicao = new Map(lista.map((i, n) => [i.id, n]));
  const comItens = concluidas
    .filter((s) => (s.materiais_estudados ?? []).some((id) => posicao.has(id)))
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  const mapa = mapaDoMaterial(lista, concluidas);
  const nuncaEstudado = mapa.find((m) => m.vezes === 0)?.item ?? null;
  if (!comItens.length) return nuncaEstudado;
  const ultimo = Math.max(...comItens[0].materiais_estudados.filter((id) => posicao.has(id)).map((id) => posicao.get(id)!));
  return lista[ultimo + 1] ?? nuncaEstudado;
}

/** Totais do mapa de um tipo (só itens que contam). */
export function resumoDoMapaMaterial(mapa: ItemNoMapa[], fora: string[]) {
  const contam = mapa.filter((m) => contaNoTotal(m.item, fora));
  const estudados = contam.filter((m) => m.vezes > 0).length;
  return {
    total: contam.length,
    estudados,
    revistos: contam.filter((m) => m.vezes > 1).length,
    nunca: contam.length - estudados,
    percentual: contam.length ? Math.round((estudados / contam.length) * 1000) / 10 : 0,
  };
}
