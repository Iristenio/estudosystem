// Tela provisória: mostra o que vai existir ali e em qual etapa do PLANO.md fica pronta.
import type { ComponentType, JSX } from 'preact';

interface Props {
  titulo: string;
  sub?: string;
  etapa: number;
  descricao: string;
  Icone: ComponentType<JSX.SVGAttributes<SVGSVGElement>>;
}

export function TelaEmConstrucao({ titulo, sub, etapa, descricao, Icone }: Props) {
  return (
    <>
      <header class="cabecalho">
        <h1>{titulo}</h1>
        {sub && <span class="sub">{sub}</span>}
      </header>
      <div class="conteudo">
        <section class="cartao em-construcao">
          <Icone />
          <strong>Em construção</strong>
          <p>{descricao}</p>
          <span class="etiqueta">Etapa {etapa}</span>
        </section>
      </div>
    </>
  );
}
