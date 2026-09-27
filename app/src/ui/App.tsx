import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { APP } from '../app.config';
import { irPara, useTela, type Tela } from './rotas';
import { MenuLateral } from './layout/MenuLateral';
import { PainelLateral } from './layout/PainelLateral';
import { TelaAbertura } from './layout/TelaAbertura';
import { AvisoAtualizacao } from './layout/AvisoAtualizacao';
import { AvisoDesfazer } from './componentes/AvisoDesfazer';
import { Dialogo } from './componentes/Dialogo';
import { ProvedorEstado, useEstado, type Painel } from './estado';
import { TelaAjustes } from './telas/TelaAjustes';
import { TelaDisciplinas } from './telas/TelaDisciplinas';
import { TelaLeis } from './telas/TelaLeis';
import { FormDisciplina } from './paineis/FormDisciplina';
import { FormLei } from './paineis/FormLei';
import { FormHorarios } from './paineis/FormHorarios';
import { TelaEstudar } from './telas/TelaEstudar';
import { TelaSessoes } from './telas/TelaSessoes';
import { TelaCiclo } from './telas/TelaCiclo';
import { TelaDashboard } from './telas/TelaDashboard';
import { TelaAcompanhamento } from './telas/TelaAcompanhamento';
import { listarTodos } from '../dados/repositorio';
import { sessaoAberta } from '../dominio/sessoes';
import { IconeMenu } from './icones';

/** ► Nova tela: acrescente aqui (e em TELAS/MENU, em rotas.ts). */
const TELA: Record<Tela, () => JSX.Element> = {
  dashboard: TelaDashboard,
  estudar: TelaEstudar,
  sessoes: TelaSessoes,
  acompanhamento: TelaAcompanhamento,
  ciclo: TelaCiclo,
  disciplinas: TelaDisciplinas,
  leis: TelaLeis,
  config: TelaAjustes,
};

/** ► Novo painel: título e conteúdo de cada tipo declarado em estado.tsx. */
function tituloPainel(p: Painel): string {
  switch (p.tipo) {
    case 'disciplina':
      return p.id ? 'Disciplina' : 'Nova disciplina';
    case 'lei':
      return p.id ? 'Lei seca' : 'Nova lei seca';
    case 'horarios':
      return 'Corrigir sessão';
  }
}

function ConteudoPainel({ painel }: { painel: Painel }) {
  switch (painel.tipo) {
    case 'disciplina':
      return <FormDisciplina id={painel.id} />;
    case 'lei':
      return <FormLei id={painel.id} disciplinaId={painel.disciplinaId} />;
    case 'horarios':
      return <FormHorarios id={painel.id} />;
  }
}

function Estrutura() {
  const tela = useTela();
  const { painel, fecharPainel } = useEstado();
  const [menuAberto, setMenuAberto] = useState(false);
  const Conteudo = TELA[tela];

  // R8 — ao abrir o app com uma sessão aberta, vai direto para o cronômetro
  useEffect(() => {
    if (location.hash) return;
    listarTodos('sessoes').then((lista) => sessaoAberta(lista) && irPara('estudar'));
  }, []);

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
