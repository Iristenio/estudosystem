// R44 — painel do ciclo na tela Estudar: evolução da disciplina atual (o bloco de ~1 h) e do ciclo, e os
// cartões disciplina anterior · atual · próxima. No cronômetro, as barras somam o tempo da sessão ao vivo.
import type { Disciplina } from '../../dominio/tipos';
import type { AndamentoDoCiclo, BlocoNoCiclo } from '../../dominio/ciclo';
import { formatarDuracaoCurta } from '../../dominio/sessoes';

const horas = (h: number) => formatarDuracaoCurta(Math.max(0, h) * 3600);

interface Props {
  andamento: AndamentoDoCiclo;
  /** Bloco escolhido (na tela de iniciar) ou o da sessão em andamento. */
  bloco: BlocoNoCiclo;
  disciplinas: Disciplina[];
  /** Horas da sessão em andamento (somadas ao vivo nas barras). */
  aoVivo?: number;
  /** Mostra os cartões anterior · atual · próxima. */
  comCartoes?: boolean;
}

/** Próximo bloco ainda não cumprido depois de `ordem` (volta ao início da lista no fim). */
function proximoPendente(a: AndamentoDoCiclo, ordem: number): BlocoNoCiclo | null {
  const pendentes = a.blocos.filter((b) => !b.cumprido && b.ordem !== ordem);
  return pendentes.find((b) => b.ordem > ordem) ?? pendentes[0] ?? null;
}

export function PainelCiclo({ andamento: a, bloco, disciplinas, aoVivo = 0, comCartoes = true }: Props) {
  const nome = (id: string) => disciplinas.find((d) => d.id === id);
  const feitoBloco = Math.min(bloco.duracao, bloco.feito + aoVivo);
  const pctBloco = bloco.duracao ? (feitoBloco / bloco.duracao) * 100 : 0;
  const completo = feitoBloco >= bloco.duracao - 1 / 60;
  const feitoCiclo = a.feito + aoVivo;
  const pctCiclo = a.total ? Math.min(100, (feitoCiclo / a.total) * 100) : 0;
  const d = nome(bloco.disciplina_id);
  const anterior = bloco.ordem > 1 ? a.blocos[bloco.ordem - 2] : null;
  const proxima = proximoPendente(a, bloco.ordem);

  const cartao = (b: BlocoNoCiclo | null, rotulo: string, destaque = false) => {
    const x = b ? nome(b.disciplina_id) : undefined;
    return (
      <div class={`cartao-bloco${destaque ? ' atual' : ''}`}>
        <span class="faixa-cor" style={{ background: x?.cor ?? 'var(--borda)' }} />
        <strong>{b ? (x?.nome ?? 'Disciplina removida') : '—'}</strong>
        <small>
          {rotulo}
          {b && ` · nº ${b.ordem}`}
        </small>
      </div>
    );
  };

  return (
    <section class="painel-ciclo" aria-label="Andamento do ciclo">
      <div class="painel-ciclo-barras">
        <div class="progresso" style={{ '--cor': d?.cor ?? 'var(--primaria)' }}>
          <div class="progresso-topo">
            <span>Evolução da disciplina atual</span>
            <strong>
              {horas(feitoBloco)} <small>de {horas(bloco.duracao)}</small>
            </strong>
          </div>
          <span class="medidor">
            <span class="medidor-preench" style={{ width: `${pctBloco}%` }} />
          </span>
          <small>{completo ? 'Completo ✓' : `Faltam ${horas(bloco.duracao - feitoBloco)}`}</small>
        </div>
        <div class="progresso" style={{ '--cor': 'var(--primaria)' }}>
          <div class="progresso-topo">
            <span>Evolução do ciclo atual</span>
            <strong>
              {horas(feitoCiclo)} <small>de {horas(a.total)}</small>
            </strong>
          </div>
          <span class="medidor">
            <span class="medidor-preench" style={{ width: `${pctCiclo}%` }} />
          </span>
          <small>
            Ciclo {a.numero} · faltam {horas(a.total - feitoCiclo)}
          </small>
        </div>
      </div>
      {comCartoes && (
        <div class="painel-ciclo-cartoes">
          {cartao(anterior, 'Disciplina anterior')}
          {cartao(bloco, 'Disciplina atual', true)}
          {cartao(proxima, 'Próxima disciplina')}
        </div>
      )}
    </section>
  );
}
