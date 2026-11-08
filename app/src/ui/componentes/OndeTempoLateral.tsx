// "Onde está meu tempo" na lateral da tela Estudar (abaixo de Hoje): versão compacta, com o próprio seletor
// de período (abre em Hoje) e a sessão em andamento contando em tempo real. A tela Outros estudos tem a completa.
import { useState } from 'preact/hooks';
import { concluidasNoIntervalo, intervaloOutros, ROTULO_PERIODO_OUTROS, tempoPorArea, type PeriodoOutros } from '../../dominio/outros';
import { duracaoSegundos } from '../../dominio/sessoes';
import { useAgora, useEntidade } from '../../dados/ganchos';
import { OndeEstaMeuTempo } from '../telas/TelaOutros';

export function OndeTempoLateral() {
  const cursos = useEntidade('cursos');
  const outras = useEntidade('outras_sessoes');
  const sessoes = useEntidade('sessoes');
  const agora = useAgora(15_000);
  const [periodo, setPeriodo] = useState<PeriodoOutros>('hoje');
  const { de, ate } = intervaloOutros(periodo, agora);
  const areas = tempoPorArea(concluidasNoIntervalo(outras, de, ate, true), cursos);
  const segundosConcurso = concluidasNoIntervalo(sessoes, de, ate, true).reduce((t, s) => t + duracaoSegundos(s, agora), 0);
  const emAndamento = [...outras, ...sessoes].some((s) => s.status !== 'excluido' && s.situacao !== 'concluida');

  return (
    <OndeEstaMeuTempo
      compacto
      segundosConcurso={segundosConcurso}
      areas={areas}
      periodo={periodo}
      emAndamento={emAndamento}
      seletor={
        <div class="segmentado pequeno periodo-compacto" role="radiogroup" aria-label="Período">
          {(['hoje', 'semana', 'mes'] as PeriodoOutros[]).map((p) => (
            <button key={p} type="button" role="radio" aria-checked={periodo === p} onClick={() => setPeriodo(p)}>
              {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : ROTULO_PERIODO_OUTROS[p]}
            </button>
          ))}
        </div>
      }
    />
  );
}
