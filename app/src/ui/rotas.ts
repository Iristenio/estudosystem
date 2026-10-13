// Navegação por "#/tela" — funciona offline e no GitHub Pages sem configuração extra.
//
// ► Nova tela: acrescente em TELAS e em MENU (e o componente em App.tsx).
import type { ComponentType, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  IconeBalanca,
  IconeCiclo,
  IconeCronometro,
  IconeGrafico,
  IconeLista,
  IconeLivro,
  IconeProgresso,
} from './icones';

export const TELAS = [
  'dashboard', // a primeira é a tela inicial, logo depois da abertura
  'estudar',
  'sessoes',
  'acompanhamento',
  'ciclo',
  'disciplinas',
  'leis',
  'mapa', // Mapa da lei: "#/mapa/<id da lei>" (fora do menu; aberto a partir de Leis secas)
  'material', // Mapa do material: "#/material/<id da disciplina>" (fora do menu; aberto a partir de Disciplinas)
  'config',
] as const;
export type Tela = (typeof TELAS)[number];

type Icone = ComponentType<JSX.SVGAttributes<SVGSVGElement>>;
export interface ItemMenu {
  tela: Tela;
  rotulo: string;
  Icone: Icone;
}
export interface GrupoMenu {
  grupo: string;
  itens: ItemMenu[];
}

/** Menu lateral, no estilo do Sistema PCA: itens principais e grupos com título. "Ajustes" fica no rodapé do menu. */
export const MENU: (ItemMenu | GrupoMenu)[] = [
  { tela: 'dashboard', rotulo: 'Dashboard', Icone: IconeGrafico },
  { tela: 'estudar', rotulo: 'Estudar', Icone: IconeCronometro },
  { tela: 'sessoes', rotulo: 'Sessões', Icone: IconeLista },
  { tela: 'acompanhamento', rotulo: 'Acompanhamento', Icone: IconeProgresso },
  { tela: 'ciclo', rotulo: 'Ciclo de estudos', Icone: IconeCiclo },
  {
    grupo: 'Cadastros',
    itens: [
      { tela: 'disciplinas', rotulo: 'Disciplinas', Icone: IconeLivro },
      { tela: 'leis', rotulo: 'Leis secas', Icone: IconeBalanca },
    ],
  },
];

export const ehGrupo = (m: ItemMenu | GrupoMenu): m is GrupoMenu => 'grupo' in m;

const partesDoEndereco = () => location.hash.replace(/^#\/?/, '').split('/');

function lerTela(): Tela {
  const nome = partesDoEndereco()[0] as Tela;
  return TELAS.includes(nome) ? nome : TELAS[0];
}

export function irPara(tela: Tela, parametro?: string) {
  location.hash = parametro ? `/${tela}/${encodeURIComponent(parametro)}` : `/${tela}`;
}

/** Segunda parte do endereço (ex.: o id da lei em "#/mapa/L01"), atualizada a cada mudança. */
export function useParametroRota(): string | null {
  const ler = () => (partesDoEndereco()[1] ? decodeURIComponent(partesDoEndereco()[1]) : null);
  const [valor, setValor] = useState(ler);
  useEffect(() => {
    const aoMudar = () => setValor(ler());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  return valor;
}

export function useTela(): Tela {
  const [tela, setTela] = useState<Tela>(lerTela);
  useEffect(() => {
    const aoMudar = () => setTela(lerTela());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  return tela;
}
