// Sessão de outros estudos (painel lateral): lançar à mão (R47), corrigir horários, curso e descrição e
// excluir (R48). Sem id = lançar uma sessão que já aconteceu.
import { useEffect, useState } from 'preact/hooks';
import type { OutraSessao } from '../../dominio/tipos';
import { cursosPorArea, lancarOutra } from '../../dominio/outros';
import { aplicarHorarios, duracaoSegundos, fimAtual, formatarDuracao, juntarDataHora, validarHorarios } from '../../dominio/sessoes';
import { paraDataISO, paraHora } from '../../dominio/datas';
import { buscar, novoId } from '../../dados/repositorio';
import { useAgora, useEntidade } from '../../dados/ganchos';
import { corrigir, excluirSessao, salvarSessao } from '../acoes/outros';
import { useEstado } from '../estado';
import { CampoHora } from '../componentes/CampoHora';

interface Momento {
  data: string;
  hora: string;
  original: Date;
}
const momento = (d: Date): Momento => ({ data: paraDataISO(d), hora: paraHora(d), original: d });
/** Se o usuário não mexeu, mantém o instante original (com os segundos). */
function paraData(m: Momento): Date {
  const igual = m.data === paraDataISO(m.original) && m.hora === paraHora(m.original);
  return igual ? m.original : juntarDataHora(m.data, m.hora);
}

export function FormOutraSessao({ id }: { id?: string }) {
  const { fecharPainel, avisar, perguntar } = useEstado();
  const agora = useAgora(1000);
  const cursos = useEntidade('cursos');
  const [s, setS] = useState<OutraSessao | null>(null);
  const [inicio, setInicio] = useState<Momento | null>(null);
  const [fim, setFim] = useState<Momento | null>(null);
  const [cursoId, setCursoId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const novo = !id;

  useEffect(() => {
    (async () => {
      if (!id) {
        // Lançar: sugere a última hora cheia que já passou, com 1 h de duração
        const f = new Date();
        f.setMinutes(0, 0, 0);
        setInicio(momento(new Date(f.getTime() - 3600_000)));
        setFim(momento(f));
        return;
      }
      const atual = await buscar('outras_sessoes', id);
      if (!atual) return;
      setS(atual);
      setInicio(momento(new Date(atual.inicio)));
      const f = fimAtual(atual);
      setFim(f ? momento(f) : null);
      setCursoId(atual.curso_id);
      setDescricao(atual.descricao);
    })();
  }, [id]);

  if (!inicio) return null;
  const novoInicio = paraData(inicio);
  const novoFim = fim ? paraData(fim) : null;
  const aberta = !!s && (s.situacao === 'andamento' || s.situacao === 'pausada');
  const problemas = s ? validarHorarios(s, novoInicio, novoFim, agora) : [];
  const previa = s && !problemas.length ? duracaoSegundos(aplicarHorarios(s, novoInicio, novoFim), agora) : novoFim ? (novoFim.getTime() - novoInicio.getTime()) / 1000 : 0;
  const grupos = cursosPorArea(cursos);

  async function salvar(e: Event) {
    e.preventDefault();
    if (novo) {
      const r = lancarOutra(novoId(), { curso_id: cursoId, descricao, inicio: novoInicio, fim: novoFim! }, cursos);
      setErros(r.erros);
      if (!r.sessao) return;
      const desfazer = await salvarSessao(r.sessao);
      fecharPainel();
      avisar({ texto: `Sessão lançada: ${formatarDuracao(previa)}`, desfazer });
      return;
    }
    const lista = [...problemas, ...(cursoId ? [] : ['Escolha o curso.'])];
    setErros(lista);
    if (lista.length) return;
    const desfazer = await corrigir(s!, novoInicio, novoFim, cursoId, descricao);
    fecharPainel();
    avisar({ texto: 'Sessão corrigida', desfazer });
  }

  async function excluir() {
    const r = await perguntar('Excluir esta sessão?', [{ valor: 'sim', rotulo: 'Excluir', estilo: 'perigo' }], 'Ela deixa de contar nos outros estudos.');
    if (!r) return;
    const desfazer = await excluirSessao(s!);
    fecharPainel();
    avisar({ texto: 'Sessão excluída', desfazer });
  }

  return (
    <form class="formulario" onSubmit={salvar}>
      <label class="rotulo">
        Curso
        <select class="campo campo-largo" value={cursoId} onChange={(e) => setCursoId(e.currentTarget.value)}>
          <option value="" disabled>
            Escolha…
          </option>
          {grupos.map((g) => (
            <optgroup key={g.area} label={g.area}>
              {g.cursos
                .filter((c) => c.ativo || c.id === cursoId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {c.ativo ? '' : ' (inativo)'}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>

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
        </fieldset>
      )}

      <div class="previa-duracao">
        <span>Duração</span>
        <strong>{previa > 0 ? formatarDuracao(previa) : '—'}</strong>
        {s && s.segundos_pausados > 0 && <small>já descontadas as pausas ({formatarDuracao(s.segundos_pausados)})</small>}
      </div>

      <label class="rotulo">
        Descrição (opcional)
        <input class="campo" value={descricao} placeholder="Ex.: Aula 3 – Pandas" onInput={(e) => setDescricao(e.currentTarget.value)} />
      </label>

      {(erros.length > 0 || problemas.length > 0) && (
        <ul class="erros" role="alert">
          {[...new Set([...problemas, ...erros])].map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}

      <div class="acoes-form">
        <button type="submit" class="botao primario" disabled={problemas.length > 0}>
          {novo ? 'Lançar' : 'Salvar'}
        </button>
        {s?.situacao === 'concluida' && (
          <button type="button" class="botao perigo" onClick={excluir}>
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
