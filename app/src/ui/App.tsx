import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { APP } from '../app.config';
import { useTela, type Tela } from './rotas';
import { MenuLateral } from './layout/MenuLateral';
import { PainelLateral } from './layout/PainelLateral';
import { TelaAbertura } from './layout/TelaAbertura';
import { AvisoAtualizacao } from './layout/AvisoAtualizacao';
import { AvisoDesfazer } from './componentes/AvisoDesfazer';
import { Dialogo } from './componentes/Dialogo';
import { ProvedorEstado, useEstado, type Painel } from './estado';
import { TelaEmConstrucao } from './telas/TelaEmConstrucao';
import { TelaAjustes } from './telas/TelaAjustes';
import { FormItem } from './paineis/FormItem';
import {
  IconeBalanca,
  IconeCiclo,
  IconeCronometro,
  IconeGrafico,
  IconeLista,
  IconeLivro,
  IconeMenu,
  IconeProgresso,
} from './icones';

/** ► Nova tela: acrescente aqui (e em TELAS/MENU, em rotas.ts). */
const TELA: Record<Tela, () => JSX.Element> = {
  estudar: () => (
    <TelaEmConstrucao
      titulo="Estudar"
      etapa={2}
      Icone={IconeCronometro}
      descricao="Aqui ficará o cronômetro: escolher disciplina, tipo e aula, iniciar, pausar, finalizar e corrigir o horário de início."
    />
  ),
  dashboard: () => (
    <TelaEmConstrucao
      titulo="Dashboard"
      etapa={5}
      Icone={IconeGrafico}
      descricao="Indicadores e gráficos de horas por dia e por mês, com animação ao rolar a tela, como no PCA."
    />
  ),
  sessoes: () => (
    <TelaEmConstrucao
      titulo="Sessões"
      etapa={3}
      Icone={IconeLista}
      descricao="Histórico das sessões com filtros. Nas concluídas, será possível corrigir os horários e a descrição da aula."
    />
  ),
  acompanhamento: () => (
    <TelaEmConstrucao
      titulo="Acompanhamento"
      etapa={5}
      Icone={IconeProgresso}
      descricao="Progresso de cada disciplina: páginas, vídeo, lei seca, questões e minutos por página e por questão."
    />
  ),
  ciclo: () => (
    <TelaEmConstrucao
      titulo="Ciclo de estudos"
      etapa={4}
      Icone={IconeCiclo}
      descricao="Sequência do ciclo por pesos, posição atual (ex.: 4F4) e a sugestão da próxima disciplina."
    />
  ),
  disciplinas: () => (
    <TelaEmConstrucao
      titulo="Disciplinas"
      sub="Cadastros"
      etapa={1}
      Icone={IconeLivro}
      descricao="Cadastro das disciplinas: peso, ordem, cor e totais de páginas e de horas de vídeo."
    />
  ),
  leis: () => (
    <TelaEmConstrucao
      titulo="Leis secas"
      sub="Cadastros"
      etapa={1}
      Icone={IconeBalanca}
      descricao="Cadastro das leis de cada disciplina, com o total de artigos."
    />
  ),
  config: TelaAjustes,
};

/** ► Novo painel: título e conteúdo de cada tipo declarado em estado.tsx. */
function tituloPainel(p: Painel): string {
  switch (p.tipo) {
    case 'item':
      return p.id ? 'Item' : 'Novo item';
  }
}

function ConteudoPainel({ painel }: { painel: Painel }) {
  switch (painel.tipo) {
    case 'item':
      return <FormItem id={painel.id} />;
  }
}

function Estrutura() {
  const tela = useTela();
  const { painel, fecharPainel } = useEstado();
  const [menuAberto, setMenuAberto] = useState(false);
  const Conteudo = TELA[tela];

  return (
    <div class="estrutura">
      <MenuLateral atual={tela} aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
      <main class="principal">
        {/* Só aparece em telas estreitas (tablet em retrato), onde o menu vira gaveta */}
        <div class="barra-topo">
          <button class="botao-icone" aria-label="Abrir menu" onClick={() => setMenuAberto(true)}>
            <IconeMenu />
          </button>
          <span>{APP.nome}</span>
        </div>
        <Conteudo />
      </main>
      {painel && (
        <PainelLateral titulo={tituloPainel(painel)} aoFechar={fecharPainel}>
          <ConteudoPainel painel={painel} />
        </PainelLateral>
      )}
      <AvisoDesfazer />
      <AvisoAtualizacao />
      <Dialogo />
      <TelaAbertura />
    </div>
  );
}

export function App() {
  return (
    <ProvedorEstado>
      <Estrutura />
    </ProvedorEstado>
  );
}
