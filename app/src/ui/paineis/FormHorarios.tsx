// Correção manual (R10–R14): horário de início, horário de fim (ao finalizar e nas concluídas) e aula.
// A nova duração aparece na hora; sobreposição com outra sessão só gera aviso.
import { useEffect, useState } from 'preact/hooks';
import type { Sessao } from '../../dominio/tipos';
import {
  aplicarHorarios,
  duracaoSegundos,
  fimAtual,
  formatarDuracao,
  juntarDataHora,
  resumoProducao,
  ROTULO_TIPO,
  sessoesSobrepostas,
  validarHorarios,
} from '../../dominio/sessoes';
import { paraDataISO, paraHora } from '../../dominio/datas';
import { artigosLidosDaLei, lerFaixas } from '../../dominio/artigos';
import { tipoMaterialDaSessao } from '../../dominio/material';
import { buscar } from '../../dados/repositorio';
import { useAgora, useEntidade } from '../../dados/ganchos';
import { corrigir } from '../acoes/sessoes';
import { useEstado } from '../estado';
import { CampoHora } from '../componentes/CampoHora';
import { CampoArtigos } from '../componentes/CampoArtigos';
import { EscolhaMaterial } from '../componentes/EscolhaMaterial';

interface Momento {
  data: string;
  hora: string;
  original: Date;
}

const momento = (d: Date): Momento => ({ data: paraDataISO(d), hora: paraHora(d), original: d });

/** Se o usuário não mexeu, mantém o instante original (com os segundos); senão, usa data + hora digitadas. */
function paraData(m: Momento): Date {
  const igual = m.data === paraDataISO(m.original) && m.hora === paraHora(m.original);
  return igual ? m.original : juntarDataHora(m.data, m.hora);
}

const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function FormHorarios({ id }: { id: string }) {
  const { fecharPainel, avisar } = useEstado();
  const agora = useAgora(1000);
  const todas = useEntidade('sessoes');
  const disciplinas = useEntidade('disciplinas');
  const leis = useEntidade('leis');
  const [s, setS] = useState<Sessao | null>(null);
  const [inicio, setInicio] = useState<Momento | null>(null);
  const [fim, setFim] = useState<Momento | null>(null);
  const [aula, setAula] = useState('');
  const [faixas, setFaixas] = useState('');
  const [estudados, setEstudados] = useState<string[]>([]);

  useEffect(() => {
    buscar('sessoes', id).then((atual) => {
      if (!atual) return;
      setS(atual);
      setInicio(momento(new Date(atual.inicio)));
      const f = fimAtual(atual);
      setFim(f ? momento(f) : null);
      setAula(atual.aula);
      setFaixas(atual.artigos_lidos ?? '');
      setEstudados(atual.materiais_estudados ?? []);
    });
  }, [id]);

  if (!s || !inicio) return null;
  const novoInicio = paraData(inicio);
  const novoFim = fim ? paraData(fim) : null;
  // R28 — numa Lei Seca concluída, as faixas também podem ser corrigidas
  const lei = s.lei_id ? leis.find((l) => l.id === s.lei_id) : undefined;
  const editaArtigos = s.tipo === 'Lei Seca' && s.situacao === 'concluida';
  // R36 — numa sessão de PDF/VideoAula concluída, o material estudado pode ser corrigido
  const tipoMaterial = s.situacao === 'concluida' ? tipoMaterialDaSessao(s.tipo) : null;
  const disciplina = disciplinas.find((d) => d.id === s.disciplina_id);
  const editaMaterial = !!(tipoMaterial && disciplina);
  const errosArtigos = !editaArtigos
    ? []
    : faixas.trim()
      ? lerFaixas(faixas, lei?.total_artigos ?? null).erros
      : s.artigos_lidos
        ? ['Informe quais artigos foram lidos (ex.: 1-10, 15).']
        : [];
  const problemas = validarHorarios(s, novoInicio, novoFim, agora);
  const previa = problemas.length ? null : duracaoSegundos(aplicarHorarios(s, novoInicio, novoFim), agora);
  const sobrepostas = problemas.length ? [] : sessoesSobrepostas(s, novoInicio, novoFim ?? agora, todas);
  const nomeDisciplina = (did: string) => disciplinas.find((d) => d.id === did)?.nome ?? '';
  const aberta = s.situacao === 'andamento' || s.situacao === 'pausada';

  async function salvar(e: Event) {
    e.preventDefault();
    if (problemas.length || errosArtigos.length) return;
    await corrigir(s!, novoInicio, novoFim, aula, editaArtigos ? faixas : null, editaMaterial ? estudados : null);
    fecharPainel();
    avisar({ texto: 'Sessão corrigida' });
  }

  return (
    <form class="formulario" onSubmit={salvar}>
      {s.situacao === 'concluida' && (
        <div class="resumo-sessao">
          <strong>{nomeDisciplina(s.disciplina_id) || 'Disciplina removida'}</strong>
          <span>
            {[ROTULO_TIPO[s.tipo], s.lei_id && leis.find((l) => l.id === s.lei_id)?.nome, resumoProducao(s)].filter(Boolean).join(' · ')}
          </span>
          <small>
            Depois de concluída, a sessão só permite corrigir os horários, a descrição da aula
            {s.tipo === 'Lei Seca' ? ' e os artigos lidos' : s.tipo === 'PDF' || s.tipo === 'VideoAula' ? ' e o material estudado' : ''}.
          </small>
        </div>
      )}

      <fieldset>
        <legend>Início</legend>
        <div class="linha">
          <input type="date" class="campo" value={inicio.data} onInput={(e) => setInicio({ ...inicio, data: e.currentTarget.value })} />
          <CampoHora valor={inicio.hora} aoMudar={(v) => v && setInicio({ ...inicio, hora: v })} rotulo="Hora de início" />
        </div>
        {aberta && <p class="dica">Esqueceu de iniciar o cronômetro? Informe aqui o horário em que realmente começou.</p>}
      </fieldset>

      {fim && (
        <fieldset>
          <legend>Fim</legend>
          <div class="linha">
            <input type="date" class="campo" value={fim.data} onInput={(e) => setFim({ ...fim, data: e.currentTarget.value })} />
            <CampoHora valor={fim.hora} aoMudar={(v) => v && setFim({ ...fim, hora: v })} rotulo="Hora de fim" />
          </div>
          <p class="dica">Esqueceu de finalizar? Informe o horário em que realmente parou.</p>
        </fieldset>
      )}

      <div class="previa-duracao">
        <span>Duração</span>
        <strong>{previa === null ? '—' : formatarDuracao(previa)}</strong>
        {s.segundos_pausados > 0 && <small>já descontadas as pausas ({formatarDuracao(s.segundos_pausados)})</small>}
      </div>

      {problemas.length > 0 && (
        <ul class="erros" role="alert">
          {problemas.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}

      {sobrepostas.length > 0 && (
        <div class="alerta">
          Esse horário se sobrepõe {sobrepostas.length === 1 ? 'à sessão' : 'às sessões'}:{' '}
          {sobrepostas
            .map((o) => `${nomeDisciplina(o.disciplina_id)} (${fmtHora.format(new Date(o.inicio))}–${fmtHora.format(new Date(o.fim!))})`)
            .join(', ')}
          . Você pode salvar assim mesmo.
        </div>
      )}

      <label class="rotulo">
        Aula (descrição)
        <input class="campo" value={aula} placeholder="Ex.: Controle concentrado - ADI" onInput={(e) => setAula(e.currentTarget.value)} />
      </label>

      {editaArtigos && (
        <>
          <CampoArtigos
            valor={faixas}
            aoMudar={setFaixas}
            total={lei?.total_artigos ?? null}
            jaLidos={lei ? artigosLidosDaLei(lei, todas.filter((o) => o.id !== s.id && o.status !== 'excluido' && o.situacao === 'concluida')) : undefined}
          />
          {!s.artigos_lidos && (
            <p class="dica">
              Sessão anterior ao registro por artigo: ficou guardado só o número ({s.artigos}). Se lembrar quais foram, informe acima.
            </p>
          )}
        </>
      )}

      {editaMaterial && (
        <EscolhaMaterial
          disciplina={disciplina!}
          tipo={tipoMaterial!}
          escolhidos={estudados}
          aoMudar={setEstudados}
          outrasSessoes={todas.filter((o) => o.id !== s.id && o.status !== 'excluido' && o.situacao === 'concluida' && o.disciplina_id === s.disciplina_id)}
          podeLancar={false}
        />
      )}

      <div class="acoes-form">
        <button type="submit" class="botao primario" disabled={problemas.length > 0 || errosArtigos.length > 0}>
          Salvar
        </button>
      </div>
    </form>
  );
}
