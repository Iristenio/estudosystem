// Acompanhamento por disciplina (antiga aba Acompanhamento): progresso acumulado de cada disciplina ativa.
// Cartões com medidores que enchem ao aparecer na tela, ou a tabela completa.
import { useState } from 'preact/hooks';
import { ordenarDisciplinas } from '../../dominio/disciplinas';
import { acompanhamento, type LinhaAcompanhamento } from '../../dominio/painel';
import { formatarDuracaoCurta, sessoesValidas } from '../../dominio/sessoes';
import { useEntidade } from '../../dados/ganchos';
import { AlternarTabela, Contador, Medidor, ProvedorDica, Revelar } from '../componentes/Graficos';
import { IconeProgresso } from '../icones';

const fmtInt = (n: number) => Math.round(n).toLocaleString('pt-BR');
const fmtPct = (n: number | null) => (n === null ? '—' : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const fmtMin = (n: number | null) => (n === null ? '—' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtHoras = (h: number) => formatarDuracaoCurta(h * 3600);

export function TelaAcompanhamento() {
  const disciplinas = useEntidade('disciplinas');
  const leis = useEntidade('leis');
  const sessoes = useEntidade('sessoes');
  const [tabela, setTabela] = useState(false);
  const concluidas = sessoesValidas(sessoes).filter((s) => s.situacao === 'concluida');
  const linhas = acompanhamento(ordenarDisciplinas(disciplinas), leis, concluidas);

  return (
    <ProvedorDica>
      <header class="cabecalho">
        <h1>Acompanhamento</h1>
        <span class="sub">progresso acumulado de cada disciplina ativa</span>
        <AlternarTabela tabela={tabela} aoMudar={setTabela} />
      </header>
      <div class="conteudo painel-dados">
        {linhas.length === 0 ? (
          <div class="vazio">
            <IconeProgresso />
            <strong>Nenhuma disciplina ativa</strong>
          </div>
        ) : tabela ? (
          <TabelaAcompanhamento linhas={linhas} />
        ) : (
          <div class="grade-acompanhamento">
            {linhas.map((l, i) => (
              <CartaoDisciplina key={l.disciplina.id} l={l} atraso={(i % 3) * 90} />
            ))}
          </div>
        )}
      </div>
    </ProvedorDica>
  );
}

function CartaoDisciplina({ l, atraso }: { l: LinhaAcompanhamento; atraso: number }) {
  const cor = l.disciplina.cor;
  return (
    <Revelar class="cartao cartao-acompanhamento" atraso={atraso}>
      <span class="faixa-cor" style={{ background: cor }} />
      <h2>
        {l.disciplina.nome}
        <span class="tempo-disciplina">
          <Contador valor={l.segundos / 3600} formatar={fmtHoras} />
        </span>
      </h2>

      {l.totalPaginas !== null && (
        <Progresso rotulo="PDF" cor={cor} percentual={l.percentualPaginas} texto={`${fmtInt(l.paginasLidas)} de ${fmtInt(l.totalPaginas)} páginas`} />
      )}
      {l.totalHorasVideo !== null && (
        <Progresso rotulo="Videoaulas" cor={cor} percentual={l.percentualVideo} texto={`${fmtHoras(l.horasVideo)} de ${fmtHoras(l.totalHorasVideo)}`} />
      )}
      {l.totalArtigos !== null && (
        <Progresso rotulo="Lei seca" cor={cor} percentual={l.percentualLeiSeca} texto={`${fmtInt(l.artigosLidos)} de ${fmtInt(l.totalArtigos)} artigos`} />
      )}

      <div class="numeros-disciplina">
        <div>
          <span>Questões</span>
          <strong>{fmtInt(l.questoes)}</strong>
          <small>{l.questoes ? `${fmtPct(l.percentualAcerto)} de acerto` : 'nenhuma ainda'}</small>
        </div>
        <div>
          <span>Min/página</span>
          <strong>{fmtMin(l.minutosPorPagina)}</strong>
        </div>
        <div>
          <span>Min/questão</span>
          <strong>{fmtMin(l.minutosPorQuestao)}</strong>
        </div>
      </div>
    </Revelar>
  );
}

function Progresso({ rotulo, cor, percentual, texto }: { rotulo: string; cor: string; percentual: number | null; texto: string }) {
  return (
    <div class="progresso">
      <div class="progresso-topo">
        <span>{rotulo}</span>
        <strong>
          {percentual === null ? '—' : <Contador valor={percentual} formatar={(n) => fmtPct(Math.round(n * 10) / 10)} />}
        </strong>
      </div>
      <Medidor percentual={percentual ?? 0} cor={cor} />
      <small>{texto}</small>
    </div>
  );
}

function TabelaAcompanhamento({ linhas }: { linhas: LinhaAcompanhamento[] }) {
  return (
    <div class="cartao tabela-rolagem">
      <table class="tabela">
        <thead>
          <tr>
            <th>Disciplina</th>
            <th class="num">Páginas</th>
            <th class="num">% PDF</th>
            <th class="num">Vídeo</th>
            <th class="num">% vídeo</th>
            <th class="num">Artigos</th>
            <th class="num">% lei seca</th>
            <th class="num">Questões</th>
            <th class="num">Acertos</th>
            <th class="num">% acerto</th>
            <th class="num">Tempo</th>
            <th class="num">Min/pág.</th>
            <th class="num">Min/questão</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.disciplina.id}>
              <td>
                <span class="bolinha" style={{ background: l.disciplina.cor }} /> {l.disciplina.nome}
              </td>
              <td class="num">
                {fmtInt(l.paginasLidas)}
                {l.totalPaginas !== null && ` / ${fmtInt(l.totalPaginas)}`}
              </td>
              <td class="num">{fmtPct(l.percentualPaginas)}</td>
              <td class="num">
                {fmtHoras(l.horasVideo)}
                {l.totalHorasVideo !== null && ` / ${fmtHoras(l.totalHorasVideo)}`}
              </td>
              <td class="num">{fmtPct(l.percentualVideo)}</td>
              <td class="num">
                {fmtInt(l.artigosLidos)}
                {l.totalArtigos !== null && ` / ${fmtInt(l.totalArtigos)}`}
              </td>
              <td class="num">{fmtPct(l.percentualLeiSeca)}</td>
              <td class="num">{fmtInt(l.questoes)}</td>
              <td class="num">{fmtInt(l.acertos)}</td>
              <td class="num">{fmtPct(l.percentualAcerto)}</td>
              <td class="num">{fmtHoras(l.segundos / 3600)}</td>
              <td class="num">{fmtMin(l.minutosPorPagina)}</td>
              <td class="num">{fmtMin(l.minutosPorQuestao)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
