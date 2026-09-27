// Ajustes → Importar da planilha antiga: lê (sem alterar) a planilha EstudoSystem, mostra um resumo
// para conferência e só grava depois da confirmação. Pode ser repetido: traz apenas as sessões novas.
import { useState } from 'preact/hooks';
import {
  ABAS_PLANILHA_ANTIGA,
  converterPlanilhaAntiga,
  extrairIdPlanilha,
  ID_PLANILHA_ANTIGA,
  resumirImportacao,
  type ResultadoImportacao,
} from '../../dominio/importacao';
import { posicaoAtual } from '../../dominio/ciclo';
import { formatarDuracaoCurta } from '../../dominio/sessoes';
import { listarTodos } from '../../dados/repositorio';
import { lerPlanilhaExterna } from '../../sync/motor';
import { importar } from '../acoes/importacao';
import { useEstado } from '../estado';

const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtHoras = (h: number) => formatarDuracaoCurta(h * 3600);

type Previa = { r: ResultadoImportacao; resumo: ReturnType<typeof resumirImportacao> };

export function CartaoImportar() {
  const { avisar } = useEstado();
  const [endereco, setEndereco] = useState(`https://docs.google.com/spreadsheets/d/${ID_PLANILHA_ANTIGA}/edit`);
  const [etapa, setEtapa] = useState<'inicio' | 'lendo' | 'previa' | 'gravando'>('inicio');
  const [erro, setErro] = useState<string | null>(null);
  const [previa, setPrevia] = useState<Previa | null>(null);

  async function ler() {
    const id = extrairIdPlanilha(endereco);
    if (!id) return setErro('Cole o endereço da planilha (o link que aparece no navegador).');
    setErro(null);
    setEtapa('lendo');
    try {
      const { titulo, abas } = await lerPlanilhaExterna(id, ABAS_PLANILHA_ANTIGA);
      const r = converterPlanilhaAntiga(abas, titulo);
      if (!r.disciplinas.length && !r.sessoes.length) throw new Error(`A planilha "${titulo}" não tem as abas Config_Disciplinas e Cronograma.`);
      const existentes = new Set((await listarTodos('sessoes')).map((s) => s.id));
      setPrevia({ r, resumo: resumirImportacao(r, existentes) });
      setEtapa('previa');
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setEtapa('inicio');
    }
  }

  async function confirmar() {
    if (!previa) return;
    setEtapa('gravando');
    await importar(previa.r, previa.resumo.novas);
    avisar({ texto: `Importação concluída: ${previa.resumo.novas.length} sessões novas` });
    setPrevia(null);
    setEtapa('inicio');
  }

  return (
    <section class="cartao importar">
      <h2>Importar da planilha antiga</h2>
      {etapa !== 'previa' && etapa !== 'gravando' ? (
        <>
          <p class="dica">
            Traz as disciplinas, as leis, o ciclo (com a posição atual) e as sessões concluídas do Cronograma. A planilha antiga não é
            alterada. Pode repetir quantas vezes quiser: só as sessões novas entram.
          </p>
          <label class="rotulo">
            Endereço da planilha
            <input class="campo" value={endereco} onInput={(e) => setEndereco(e.currentTarget.value)} />
          </label>
          {erro && <p class="erros">{erro}</p>}
          <div class="linha">
            <button class="botao primario" onClick={ler} disabled={etapa === 'lendo'}>
              {etapa === 'lendo' ? 'Lendo a planilha…' : 'Ler planilha'}
            </button>
          </div>
        </>
      ) : (
        previa && <Resumo previa={previa} gravando={etapa === 'gravando'} aoConfirmar={confirmar} aoCancelar={() => { setPrevia(null); setEtapa('inicio'); }} />
      )}
    </section>
  );
}

function Resumo({ previa, gravando, aoConfirmar, aoCancelar }: { previa: Previa; gravando: boolean; aoConfirmar: () => void; aoCancelar: () => void }) {
  const { r, resumo } = previa;
  const diferenca = Math.abs(resumo.horasRecalculadas - r.horasNaPlanilha);
  // A planilha arredonda cada sessão em 2 casas (até ±0,005 h): só avisa se passar disso
  const destoa = diferenca > r.sessoes.length * 0.005 + 0.02;
  return (
    <div class="resumo-importacao">
      <p class="dica">
        Planilha lida: <strong>{r.titulo}</strong>. Confira antes de importar:
      </p>
      <ul class="info-lista">
        <li>
          <span>Disciplinas</span>
          <strong>{r.disciplinas.length} (substituem as do app, com observações)</strong>
        </li>
        <li>
          <span>Leis secas</span>
          <strong>{r.leis.length}</strong>
        </li>
        <li>
          <span>Ciclo</span>
          <strong>
            {r.ciclo ? `${r.ciclo.horas_totais} h · ${r.ciclo.sequencia.length} posições · próxima ${posicaoAtual(r.ciclo)}` : 'não encontrado (o do app fica)'}
          </strong>
        </li>
        <li>
          <span>Sessões concluídas</span>
          <strong>
            {r.sessoes.length}
            {resumo.primeira && ` · de ${fmtData.format(new Date(resumo.primeira))} a ${fmtData.format(new Date(resumo.ultima!))}`}
          </strong>
        </li>
        <li>
          <span>Novas (vão entrar)</span>
          <strong>{resumo.novas.length}</strong>
        </li>
        {resumo.jaImportadas > 0 && (
          <li>
            <span>Já importadas antes (ficam como estão)</span>
            <strong>{resumo.jaImportadas}</strong>
          </li>
        )}
        <li>
          <span>Horas: planilha x recalculado</span>
          <strong>
            {fmtHoras(r.horasNaPlanilha)} x {fmtHoras(resumo.horasRecalculadas)}
            {destoa && ' ⚠'}
          </strong>
        </li>
        {r.emAberto > 0 && (
          <li>
            <span>Sessões em aberto na planilha (não entram)</span>
            <strong>{r.emAberto}</strong>
          </li>
        )}
      </ul>
      {destoa && (
        <p class="alerta">
          A soma recalculada difere da coluna DURAÇÃO mais do que os arredondamentos explicam. Pode haver horários editados à mão
          na planilha; confira as sessões depois de importar.
        </p>
      )}
      {r.problemas.length > 0 && (
        <div class="alerta">
          <strong>{r.problemas.length === 1 ? '1 linha não será importada:' : `${r.problemas.length} linhas não serão importadas:`}</strong>
          <ul class="lista-problemas">
            {r.problemas.slice(0, 12).map((p) => (
              <li key={p}>{p}</li>
            ))}
            {r.problemas.length > 12 && <li>… e mais {r.problemas.length - 12}.</li>}
          </ul>
        </div>
      )}
      <div class="linha">
        <button class="botao primario" onClick={aoConfirmar} disabled={gravando}>
          {gravando ? 'Importando…' : resumo.novas.length ? `Importar (${resumo.novas.length} sessões novas)` : 'Atualizar cadastros e ciclo'}
        </button>
        <button class="botao" onClick={aoCancelar} disabled={gravando}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
