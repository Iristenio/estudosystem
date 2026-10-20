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

/** Para listas: mesma ordem de tipo e curso, mas o último lançado (maior número) primeiro. */
export function recentesPrimeiro(itens: ItemMaterial[]): ItemMaterial[] {
  const ordem = new Map(ordenarItens(itens).map((i, n) => [i.id, n]));
  const grupo = (i: ItemMaterial) => `${i.tipo}|${i.curso}`;
  const inicioDoGrupo = new Map<string, number>();
  for (const i of ordenarItens(itens)) if (!inicioDoGrupo.has(grupo(i))) inicioDoGrupo.set(grupo(i), ordem.get(i.id)!);
  return [...itens].sort((a, b) => inicioDoGrupo.get(grupo(a))! - inicioDoGrupo.get(grupo(b))! || b.numero - a.numero);
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

/**
 * Duração de um vídeo, em minutos. A vírgula (ou o ponto, ou os dois-pontos) separa minutos de
 * segundos, para digitar rápido no teclado numérico: "32,45" = 32 min 45 s. Com três partes, a
 * primeira são horas ("1,05,30" = 1h05min30s). Também: "40", "40min", "1h20".
 */
function lerDuracao(t: string): number | null {
  let m = /^(\d+)h(?:(\d{1,2})(?:min)?)?$/.exec(t);
  if (m) return Number(m[2] ?? 0) < 60 ? Number(m[1]) * 60 + Number(m[2] ?? 0) : null;
  m = /^(\d+)[:,.](\d{1,2})(?:[:,.](\d{1,2}))?$/.exec(t);
  if (m) {
    const [a, b, c] = [Number(m[1]), Number(m[2]), m[3] === undefined ? null : Number(m[3])];
    if (c === null) return b < 60 ? a + b / 60 : null;
    return b < 60 && c < 60 ? a * 60 + b + c / 60 : null;
  }
  m = /^(\d+)(?:min)?$/.exec(t);
  if (m) return Number(m[1]);
  return null;
}

/**
 * R31 — vários tamanhos de uma vez; cada valor vira um item.
 * PDF: "35, 42, 28" (páginas; vírgula, espaço, + ou ; separam).
 * Vídeo: "32,45 28,10 1h20" (vírgula = minutos,segundos; espaço, + ou ; separam os vídeos).
 */
export function lerTamanhos(texto: string, tipo: TipoMaterial): LeituraTamanhos {
  const erros: string[] = [];
  const valores: number[] = [];
  const partes = texto
    .toLowerCase()
    .replace(/(\d)\s+h\b/g, '$1h') // "1 h20" → "1h20" (o espaço depois do h separa vídeos)
    .replace(/\s*(minutos?|mins?|m)\b/g, 'min')
    .replace(/\s*(páginas?|paginas?|págs?|pags?|p)\b\.?/g, '')
    .replace(/\s*([:,.])\s*(?=\d)/g, tipo === 'Video' ? '$1' : ' $1') // vídeo: "32 , 45" → "32,45"
    .split(tipo === 'Video' ? /[\s;+/]+/ : /[\s;,+/]+/)
    .filter(Boolean);
  for (const parte of partes) {
    const valor = tipo === 'PDF' ? (/^\d+$/.test(parte) ? Number(parte) : null) : lerDuracao(parte);
    if (valor === null) {
      erros.push(
        tipo === 'PDF'
          ? `Não entendi "${parte}". Use o número de páginas, como 35, 42.`
          : `Não entendi "${parte}". Use minutos,segundos (32,45), minutos (40) ou 1h20.`,
      );
      continue;
    }
    if (valor <= 0) {
      erros.push(`"${parte}" precisa ser maior que zero.`);
      continue;
    }
    valores.push(Math.round(valor * 100) / 100);
  }
  if (!erros.length && !valores.length)
    erros.push(tipo === 'PDF' ? 'Informe as páginas (ex.: 35, 42).' : 'Informe a duração (ex.: 32,45).');
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

/** 30 → "30 min" · 32,75 → "32 min 45 s" · 80 → "1h20" · 0,5 → "30 s" (acima de 1 h, sem segundos) */
export function formatarMinutos(minutos: number): string {
  const seg = Math.round(minutos * 60);
  if (seg < 60) return `${seg} s`;
  if (seg < 3600) return seg % 60 ? `${Math.floor(seg / 60)} min ${seg % 60} s` : `${seg / 60} min`;
  const m = Math.round(minutos);
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
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
  /** R38 — marcado à mão como já estudado (sem sessão). */
  manual: boolean;
  /** Vídeo: estudado em sessão ou à mão. PDF: concluído (R40). */
  estudado: boolean;
  /** Início da sessão mais recente em que foi marcado (ISO), ou null. */
  ultima: string | null;
  /** R40 — PDF: maior página alcançada na 1ª leitura (null = sem página informada). */
  pagina: number | null;
  /** R40 — PDF aberto e ainda não concluído (1ª leitura em andamento). */
  emAndamento: boolean;
  /** Leituras completas: PDF = 1ª leitura concluída + cada sessão depois dela; vídeo = sessões (ou 1, se à mão). */
  leituras: number;
}

/**
 * R37/R40 — situação de cada item, a partir das sessões concluídas que o marcaram (em ordem de data).
 * PDF: a 1ª leitura avança pela página em que parou; chegando à última (ou marcado à mão), fica
 * concluído. Depois disso, cada sessão que o marca é só mais uma leitura (sem página).
 */
export function mapaDoMaterial(itens: ItemMaterial[], concluidas: Sessao[]): ItemNoMapa[] {
  const mapa = new Map(
    ordenarItens(itens).map((item) => {
      const manual = !!item.estudado_manual;
      return [item.id, { item, vezes: 0, manual, estudado: manual, ultima: null as string | null, pagina: null as number | null, emAndamento: false, leituras: manual ? 1 : 0 }];
    }),
  );
  const ordem = [...concluidas].sort((a, b) => a.inicio.localeCompare(b.inicio));
  for (const s of ordem) {
    for (const id of s.materiais_estudados ?? []) {
      const m = mapa.get(id);
      if (!m) continue;
      m.vezes++;
      if (!m.ultima || s.inicio > m.ultima) m.ultima = s.inicio;
      if (m.item.tipo === 'Video') {
        m.estudado = true;
        m.leituras = Math.max(m.leituras, m.vezes);
        continue;
      }
      if (m.estudado) {
        m.leituras++; // releitura: só conta mais uma vez
        continue;
      }
      const parada = (s.paginas_paradas ?? []).find((x) => x.id === id);
      if (parada) m.pagina = Math.max(m.pagina ?? 0, parada.pagina);
      if (m.pagina !== null && m.pagina >= m.item.tamanho) {
        m.estudado = true;
        m.leituras = 1;
        m.pagina = m.item.tamanho;
      }
      m.emAndamento = !m.estudado;
    }
  }
  return [...mapa.values()];
}

/** R40 — PDFs ainda na 1ª leitura: página em que pararam (0 = nunca aberto). Concluídos ficam de fora. */
export function paginasAnteriores(itens: ItemMaterial[], concluidas: Sessao[]): Map<Id, number> {
  return new Map(
    mapaDoMaterial(itens.filter((i) => i.tipo === 'PDF'), concluidas)
      .filter((m) => !m.estudado)
      .map((m) => [m.item.id, m.pagina ?? 0]),
  );
}

/** R40 — páginas lidas sugeridas: quanto avançou em cada PDF na 1ª leitura (página nova − anterior). */
export function paginasSugeridas(paradas: { id: Id; pagina: number }[], anteriores: Map<Id, number>): number {
  return paradas.reduce((soma, p) => soma + (anteriores.has(p.id) ? Math.max(0, p.pagina - anteriores.get(p.id)!) : 0), 0);
}

/** R40 — "parei na página" precisa ser um inteiro de 1 até a última página do PDF. */
export function validarParadas(paradas: { id: Id; pagina: number }[], itens: ItemMaterial[]): string[] {
  const erros: string[] = [];
  for (const p of paradas) {
    const item = itens.find((i) => i.id === p.id);
    if (!item) continue;
    if (!Number.isInteger(p.pagina) || p.pagina < 1) erros.push(`${rotuloItem(item)}: informe a página como um número inteiro.`);
    else if (p.pagina > item.tamanho) erros.push(`${rotuloItem(item)} tem ${item.tamanho} páginas.`);
  }
  return erros;
}

/**
 * R36/R38/R40 — próximo item sugerido. PDF em andamento na sessão mais recente: continua nele.
 * Senão, o seguinte (na ordem dos que contam) ao último estudado — o mais adiante entre os itens da
 * sessão mais recente e os marcados à mão. Sem nada estudado (ou no fim da lista), o primeiro não concluído.
 */
export function proximoItem(itens: ItemMaterial[], fora: string[], tipo: TipoMaterial, concluidas: Sessao[]): ItemMaterial | null {
  const lista = itensEscolhiveis(itens, fora, tipo);
  if (!lista.length) return null;
  const posicao = new Map(lista.map((i, n) => [i.id, n]));
  const comItens = concluidas
    .filter((s) => (s.materiais_estudados ?? []).some((id) => posicao.has(id)))
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
  const mapa = new Map(mapaDoMaterial(lista, concluidas).map((m) => [m.item.id, m]));
  const ultimos = comItens[0]?.materiais_estudados.filter((id) => posicao.has(id)) ?? [];
  const emAndamento = ultimos.map((id) => mapa.get(id)!).filter((m) => m.emAndamento);
  if (emAndamento.length) return emAndamento.sort((a, b) => posicao.get(a.item.id)! - posicao.get(b.item.id)!)[0].item;
  const naoEstudado = lista.find((i) => !mapa.get(i.id)!.estudado) ?? null;
  const posicoes = [...ultimos.map((id) => posicao.get(id)!), ...lista.flatMap((i, n) => (i.estudado_manual ? [n] : []))];
  if (!posicoes.length) return naoEstudado;
  return lista[Math.max(...posicoes) + 1] ?? naoEstudado;
}

/** R38 — marca (ou desmarca) à mão os itens como já estudados. */
export function marcarEstudados(itens: ItemMaterial[], ids: Id[], estudado: boolean): ItemMaterial[] {
  const alvo = new Set(ids);
  return itens.map((i) => (alvo.has(i.id) ? { ...i, estudado_manual: estudado } : i));
}

/** Itens do primeiro ao último tocado (na ordem da lista), para marcar vários de uma vez. */
export function itensEntre(lista: ItemMaterial[], idA: Id, idB: Id): Id[] {
  const a = lista.findIndex((i) => i.id === idA);
  const b = lista.findIndex((i) => i.id === idB);
  if (a < 0 || b < 0) return [];
  const [de, ate] = a <= b ? [a, b] : [b, a];
  return lista.slice(de, ate + 1).map((i) => i.id);
}

/** Totais do mapa de um tipo (só itens que contam). */
export function resumoDoMapaMaterial(mapa: ItemNoMapa[], fora: string[]) {
  const contam = mapa.filter((m) => contaNoTotal(m.item, fora));
  const estudados = contam.filter((m) => m.estudado).length;
  const emAndamento = contam.filter((m) => m.emAndamento).length;
  return {
    total: contam.length,
    estudados,
    revistos: contam.filter((m) => m.leituras > 1).length,
    emAndamento,
    nunca: contam.length - estudados - emAndamento,
    percentual: contam.length ? Math.round((estudados / contam.length) * 1000) / 10 : 0,
  };
}
