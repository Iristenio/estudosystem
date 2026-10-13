// Material da disciplina (painel lateral, R30–R35): lançar PDFs e vídeos aos poucos, por curso,
// ligar/desligar cursos do total e corrigir, tirar do total ou apagar cada item.
// Cada ação grava na hora (com "Desfazer"); os totais da disciplina são recalculados.
import { useState } from 'preact/hooks';
import type { ItemMaterial, TipoMaterial } from '../../dominio/tipos';
import {
  contaNoTotal,
  cursosDoTipo,
  cursosFora,
  cursosUsados,
  formatarMinutos,
  formatarTamanho,
  itensDaDisciplina,
  lancarItens,
  lerTamanhos,
  podeApagarItem,
  recentesPrimeiro,
  resumoDoTipo,
  rotuloItem,
  validarItem,
} from '../../dominio/material';
import { novoId } from '../../dados/repositorio';
import { useEntidade } from '../../dados/ganchos';
import { alterarMaterial } from '../acoes/cadastros';
import { useEstado } from '../estado';

/** Tamanho como texto editável: 30 → "30"; 32,25 min → "32:15". */
function tamanhoParaTexto(i: ItemMaterial): string {
  if (i.tipo === 'PDF' || Number.isInteger(i.tamanho)) return String(i.tamanho);
  const seg = Math.round(i.tamanho * 60);
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
}

export function FormMaterial({ disciplinaId, tipoMaterial }: { disciplinaId: string; tipoMaterial?: TipoMaterial }) {
  const { avisar } = useEstado();
  const d = useEntidade('disciplinas').find((x) => x.id === disciplinaId);
  const sessoes = useEntidade('sessoes').filter((s) => s.status !== 'excluido');
  const [tipo, setTipo] = useState<TipoMaterial>(tipoMaterial ?? (d && !d.possui_pdf && d.possui_video ? 'Video' : 'PDF'));
  const [curso, setCurso] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [tamanhos, setTamanhos] = useState('');
  const [editando, setEditando] = useState<string | null>(null);

  if (!d) return <p class="dica">Disciplina não encontrada.</p>;
  const itens = itensDaDisciplina(d);
  const fora = cursosFora(d);
  const doTipo = itens.filter((i) => i.tipo === tipo);
  // Curso sugerido: o do último item lançado deste tipo
  const cursoAtual = curso ?? doTipo[doTipo.length - 1]?.curso ?? '';
  const leitura = lerTamanhos(tamanhos, tipo);
  const vazio = !tamanhos.trim();
  const errosLancar = vazio ? [] : [...leitura.erros, ...(nome.trim() && leitura.valores.length > 1 ? ['Com nome, informe um tamanho só.'] : [])];
  const resumo = resumoDoTipo(itens, fora, tipo);
  const nomeTipo = tipo === 'PDF' ? 'PDF' : 'vídeo';

  async function lancar(e: Event) {
    e.preventDefault();
    if (vazio || errosLancar.length) return;
    const qtd = leitura.valores.length;
    const desfazer = await alterarMaterial(d!.id, (lista, f) => ({
      itens: lancarItens(lista, { tipo, curso: cursoAtual, nome, valores: leitura.valores }, novoId),
      fora: f,
    }));
    setTamanhos('');
    setNome('');
    avisar({ texto: `${qtd} ${tipo === 'PDF' ? (qtd === 1 ? 'PDF lançado' : 'PDFs lançados') : qtd === 1 ? 'vídeo lançado' : 'vídeos lançados'}`, desfazer: desfazer ?? undefined });
  }

  async function ligarCurso(c: string, conta: boolean) {
    const desfazer = await alterarMaterial(d!.id, (lista, f) => ({ itens: lista, fora: conta ? f.filter((x) => x !== c) : [...f, c] }));
    avisar({ texto: `${c || 'Sem curso'}: ${conta ? 'conta no total' : 'fora do total'}`, desfazer: desfazer ?? undefined });
  }

  return (
    <div class="formulario form-material">
      <p class="dica">
        <strong>{d.nome}</strong>
      </p>

      <div class="segmentado" role="radiogroup" aria-label="Tipo de material">
        {(['PDF', 'Video'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={t === tipo}
            onClick={() => {
              setTipo(t);
              setCurso(null);
              setEditando(null);
            }}
          >
            {t === 'PDF' ? 'PDFs' : 'Vídeos'}
          </button>
        ))}
      </div>

      <p class="material-total">
        <span>Conta no total</span>
        <strong>{resumo ?? `nenhum ${nomeTipo} lançado`}</strong>
      </p>

      <form class="cartao-lancar" onSubmit={lancar}>
        <h3>Lançar {tipo === 'PDF' ? 'PDFs' : 'vídeos'}</h3>
        <label class="rotulo">
          {tipo === 'PDF' ? 'Páginas' : 'Duração'}
          <input
            class="campo"
            value={tamanhos}
            placeholder={tipo === 'PDF' ? 'Ex.: 35, 42, 28' : 'Ex.: 2x30, 40, 1h20, 32:15'}
            onInput={(e) => setTamanhos(e.currentTarget.value)}
          />
          <small class={`dica${errosLancar.length ? ' com-erro' : ''}`} aria-live="polite">
            {vazio
              ? tipo === 'PDF'
                ? 'Um número por PDF. 2x30 = dois PDFs de 30 páginas.'
                : 'Um valor por vídeo, em minutos. 2x30 = dois vídeos de 30 min.'
              : errosLancar.length
                ? errosLancar[0]
                : `${leitura.valores.length} ${tipo === 'PDF' ? 'PDF' : 'vídeo'}${leitura.valores.length === 1 ? '' : 's'}: ${leitura.valores
                    .map((v) => formatarTamanho({ tipo, tamanho: v }))
                    .join(', ')}`}
          </small>
        </label>
        <div class="grade-2 grade-lancar">
          <label class="rotulo">
            Nome (opcional)
            <input class="campo" value={nome} placeholder="Ex.: Controle de constitucionalidade" onInput={(e) => setNome(e.currentTarget.value)} />
          </label>
          <label class="rotulo">
            Curso
            <input
              class="campo"
              list="cursos-material"
              value={cursoAtual}
              placeholder="Opcional"
              onInput={(e) => setCurso(e.currentTarget.value)}
            />
            <datalist id="cursos-material">
              {cursosUsados(itens).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
        </div>
        <button type="submit" class="botao primario" disabled={vazio || errosLancar.length > 0}>
          Lançar
        </button>
      </form>

      {cursosDoTipo(itens, tipo).map((c) => {
        const doCurso = recentesPrimeiro(doTipo.filter((i) => i.curso === c)); // o último lançado no topo
        const conta = !fora.includes(c);
        const somaCurso = resumoDoTipo(doCurso, [], tipo);
        return (
          <section key={c} class={`curso-material${conta ? '' : ' desligado'}`}>
            <header>
              <span class="curso-material-nome">
                <strong>{c || 'Sem curso'}</strong>
                <small>{somaCurso ?? 'tudo fora do total'}</small>
              </span>
              <label class="interruptor">
                <input type="checkbox" checked={conta} onChange={(e) => ligarCurso(c, e.currentTarget.checked)} />
                Conta no total
              </label>
            </header>
            <ul class="lista-itens compacta">
              {doCurso.map((i) =>
                editando === i.id ? (
                  <li key={i.id}>
                    <EditarItem item={i} itens={itens} podeApagar={podeApagarItem(i.id, sessoes)} aoFechar={() => setEditando(null)} disciplinaId={d.id} />
                  </li>
                ) : (
                  <li key={i.id}>
                    <button class={`linha-item${contaNoTotal(i, fora) ? '' : ' inativa'}`} onClick={() => setEditando(i.id)}>
                      <span class="linha-item-texto">
                        <strong>{rotuloItem(i)}</strong>
                        <small>
                          {formatarTamanho(i)}
                          {i.fora && ' · fora do total'}
                          {i.estudado_manual && ' · ✓ já estudado'}
                        </small>
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ---------------- Correção de um item ---------------- */

function EditarItem({
  item,
  itens,
  podeApagar,
  aoFechar,
  disciplinaId,
}: {
  item: ItemMaterial;
  itens: ItemMaterial[];
  podeApagar: boolean;
  aoFechar: () => void;
  disciplinaId: string;
}) {
  const { avisar, perguntar } = useEstado();
  const [numero, setNumero] = useState(String(item.numero));
  const [nome, setNome] = useState(item.nome);
  const [curso, setCurso] = useState(item.curso);
  const [tamanho, setTamanho] = useState(tamanhoParaTexto(item));
  const [foraDoTotal, setForaDoTotal] = useState(item.fora);
  const [jaEstudado, setJaEstudado] = useState(!!item.estudado_manual);
  const leitura = lerTamanhos(tamanho, item.tipo);
  const final: ItemMaterial = {
    ...item,
    numero: /^\d+$/.test(numero.trim()) ? Number(numero) : NaN,
    nome: nome.trim(),
    curso: curso.trim(),
    tamanho: leitura.valores.length === 1 ? leitura.valores[0] : NaN,
    fora: foraDoTotal,
    estudado_manual: jaEstudado,
  };
  const errosTamanho = leitura.valores.length > 1 ? ['Informe um tamanho só.'] : leitura.erros;
  const erros = errosTamanho.length ? errosTamanho : validarItem(final, itens);

  async function salvar(e: Event) {
    e.preventDefault();
    if (erros.length) return;
    const desfazer = await alterarMaterial(disciplinaId, (lista, f) => ({ itens: lista.map((i) => (i.id === item.id ? final : i)), fora: f }));
    aoFechar();
    avisar({ texto: `${rotuloItem(final)} salvo`, desfazer: desfazer ?? undefined });
  }

  async function apagar() {
    const r = await perguntar(`Apagar ${rotuloItem(item)}?`, [{ valor: 'sim', rotulo: 'Apagar', estilo: 'perigo' }]);
    if (!r) return;
    const desfazer = await alterarMaterial(disciplinaId, (lista, f) => ({ itens: lista.filter((i) => i.id !== item.id), fora: f }));
    aoFechar();
    avisar({ texto: `${rotuloItem(item)} apagado`, desfazer: desfazer ?? undefined });
  }

  return (
    <form class="editar-item-material" onSubmit={salvar}>
      <div class="grade-2 grade-item">
        <label class="rotulo">
          Número
          <input class="campo" inputMode="numeric" value={numero} onInput={(e) => setNumero(e.currentTarget.value)} />
        </label>
        <label class="rotulo">
          {item.tipo === 'PDF' ? 'Páginas' : 'Duração'}
          <input class="campo" value={tamanho} onInput={(e) => setTamanho(e.currentTarget.value)} />
          {item.tipo === 'Video' && leitura.valores.length === 1 && <small class="dica">{formatarMinutos(leitura.valores[0])}</small>}
        </label>
      </div>
      <label class="rotulo">
        Nome
        <input class="campo" value={nome} placeholder="Opcional" onInput={(e) => setNome(e.currentTarget.value)} />
      </label>
      <label class="rotulo">
        Curso
        <input class="campo" list="cursos-material" value={curso} placeholder="Opcional" onInput={(e) => setCurso(e.currentTarget.value)} />
      </label>
      <label class="interruptor">
        <input type="checkbox" checked={foraDoTotal} onChange={(e) => setForaDoTotal(e.currentTarget.checked)} />
        Fora do total
      </label>
      <label class="interruptor">
        <input type="checkbox" checked={jaEstudado} onChange={(e) => setJaEstudado(e.currentTarget.checked)} />
        <span>
          Já estudado (marcado à mão)
          <br />
          <small>Só muda o mapa: não cria sessão nem soma horas.</small>
        </span>
      </label>
      {erros.length > 0 && (
        <ul class="erros" role="alert">
          {erros.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      {!podeApagar && <p class="dica">Este item já foi marcado em sessões: não pode ser apagado, só tirado do total.</p>}
      <div class="acoes-form">
        <button type="submit" class="botao primario" disabled={erros.length > 0}>
          Salvar
        </button>
        <button type="button" class="botao" onClick={aoFechar}>
          Cancelar
        </button>
        {podeApagar && (
          <button type="button" class="botao perigo" onClick={apagar}>
            Apagar
          </button>
        )}
      </div>
    </form>
  );
}
