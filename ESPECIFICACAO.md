# EstudoSystem — Especificação

> Rascunho para revisão. Nada será programado antes de você aprovar este documento.
> As regras vieram do Apps Script atual (planilha **EstudoSystem**), mais as novidades pedidas.
> Itens marcados com **❓** são perguntas em aberto.

## 1. Objetivo

App para registrar e acompanhar sessões de estudo para concursos. Ele controla o tempo com um
cronômetro, organiza as disciplinas num **ciclo de estudos** com pesos e mostra o progresso de cada
disciplina: páginas, vídeo, lei seca e questões.

- **Aparelhos:** tablet (paisagem e retrato) e PC. Não é pensado para celular.
- **Funciona sem internet.** Os dados ficam no aparelho e são copiados para uma **planilha nova** na
  conta Google pessoal, o que também mantém tablet e PC iguais.
- A planilha atual (EstudoSystem) **não é alterada**. O histórico dela será importado numa etapa própria.

## 2. Visual (inspirado no Sistema PCA)

- **Tela de abertura** rápida com o nome do app, como a do PCA.
- **Menu lateral fixo** à esquerda, com fundo branco, grupos com título e o item ativo destacado.
  No tablet em retrato, o menu pode ser recolhido.
- **Conteúdo** sobre um fundo cinza-claro, com cartões brancos de borda suave.
- **Cor principal:** verde `#30503a`, usada no item ativo do menu, nos botões principais e nos
  destaques. Cada disciplina mantém a **cor própria** nos gráficos e etiquetas.
- Formulários abrem num **painel lateral**, e a tela de fundo continua visível (padrão da base).
- Botões grandes (bons para toque) e tema escuro automático.

## 3. Cadastros (entidades)

### 3.1 Disciplina
| Campo | Observação |
|---|---|
| Nome | Obrigatório e único |
| Categoria | Texto livre (ex.: NÚCLEO COMUM, NÚCLEO TÉCNICO) |
| Ativa | Sim/não. As inativas somem do ciclo e dos painéis, mas o histórico é mantido |
| Ordem | Posição na lista e na montagem do ciclo |
| Peso | Número inteiro ≥ 1 |
| Possui PDF / Total de páginas | O total é obrigatório para iniciar uma sessão de PDF |
| Possui vídeo / Total de horas de vídeo | O total é obrigatório para iniciar uma sessão de VideoAula |
| Cor | Usada em gráficos e etiquetas |
| Observações | Texto livre (curso, código do material etc.) |

### 3.2 Lei (lei seca)
| Campo | Observação |
|---|---|
| Disciplina | A qual disciplina pertence |
| Nome da lei | Ex.: Lei 9.784/99 - Processo Administrativo |
| Total de artigos | Obrigatório para iniciar uma sessão de Lei Seca |
| Ativa | Sim/não |
| Descrição | Texto livre |

### 3.3 Sessão de estudo
| Campo | Observação |
|---|---|
| Disciplina, Tipo, Aula (descrição) | Tipo: **PDF, VideoAula, Revisão, Lei Seca, Questões** |
| Lei | Só no tipo Lei Seca |
| Início, Fim | Data e hora completas |
| Tempo pausado | Soma de todas as pausas |
| Duração | **Calculada:** fim − início − pausas. Nunca é digitada |
| Páginas / Artigos lidos / Questões e acertos | Conforme o tipo. Os erros e o % de acerto são calculados |
| Situação | Em andamento · Pausada · Finalizando · Concluída |
| Posição no ciclo | O antigo CRON_ID (ex.: 3F2). Preenchido automaticamente ao concluir |

Dia da semana e mês são **derivados da data** e não precisam ser guardados.

### 3.4 Ciclo de estudos
- **Horas totais do ciclo** (ex.: 30 h).
- **Sequência:** lista ordenada de disciplinas, cada posição com a duração prevista.
- **Ponteiro:** volta e posição da próxima disciplina sugerida (ex.: volta 4, posição 4 = "4F4").

## 4. Regras de negócio

### Sessão e cronômetro
- **R1.** Só pode existir **uma sessão aberta** (em andamento, pausada ou finalizando) de cada vez.
- **R2.** Para iniciar, escolha a disciplina, o tipo, a aula (opcional) e, na Lei Seca, a lei. O app
  **sugere a disciplina** indicada pelo ponteiro do ciclo.
- **R3.** Validações ao iniciar:
  - PDF exige o total de páginas da disciplina;
  - VideoAula exige o total de horas de vídeo;
  - Lei Seca exige uma lei ativa da disciplina com o total de artigos.
- **R4.** Pausar e continuar podem ser repetidos à vontade, e o tempo de cada pausa é somado.
- **R5.** Ao tocar em **Finalizar**, o relógio **congela** naquele instante. Se a sessão estava
  pausada, vale o instante em que a pausa começou. O tempo gasto preenchendo os campos finais não conta.
- **R6.** Campos finais por tipo:
  - PDF: páginas;
  - Questões: total e acertos (acertos ≤ total; erros e % são calculados);
  - Lei Seca: artigos lidos;
  - VideoAula e Revisão: nada extra.
- **R7.** O cronômetro continua certo mesmo se o app for fechado ou o aparelho desligar. Ele é
  calculado pelos horários gravados, e não por um contador rodando.
- **R8.** Ao abrir o app com uma sessão aberta, ele volta direto para o cronômetro dela.
- **R9.** **Cancelar** uma sessão aberta a descarta: ela não conta em nada.
  ❓ Hoje ela é apagada sem rastro. A base recomenda "nada se perde": a sessão fica marcada como
  cancelada, oculta, com opção **Desfazer**. Pode ser assim?

### Edição manual (novidade)
- **R10.** **Horário de início editável** na sessão aberta: ao corrigir para um horário anterior, o
  cronômetro já passa a mostrar o tempo certo.
- **R11.** **Horário de fim editável** em sessões concluídas (e na tela de finalizar, antes de
  confirmar). Resolve o caso de esquecer de finalizar.
- **R12.** **Aula (descrição) editável** a qualquer momento, na sessão aberta ou concluída.
- **R13.** Validações da edição:
  - o fim precisa ser depois do início, e o início não pode estar no futuro;
  - as pausas não podem ser maiores que o tempo entre início e fim;
  - a duração é recalculada na hora.
- **R14.** Se o horário editado **se sobrepuser** a outra sessão, o app mostra um **aviso**, mas
  deixa salvar. ❓ Prefere que bloqueie?
- **R15.** Em sessões concluídas também dá para corrigir páginas, questões, acertos e artigos.
  ❓ E a **disciplina** ou o **tipo** de uma sessão concluída, também pode mudar? Isso não mexe no
  ciclo, que já avançou.
- **R16.** Uma sessão concluída pode ser **excluída** (fica marcada como excluída, com Desfazer).

### Ciclo de estudos
- **R17.** Geração da sequência: a duração de cada vez é igual às horas totais ÷ soma dos pesos das
  disciplinas ativas. A sequência é montada em **rodadas**: cada disciplina com peso restante aparece
  uma vez por rodada, na ordem das disciplinas, até esgotar os pesos. Exemplo: 30 h e pesos
  2, 2, 1, 2, 1 geram 8 posições de 3,75 h.
- **R18.** Gerar de novo **substitui** a sequência (o app pede confirmação) e volta o ponteiro para 1F1.
- **R19.** A sequência pode ser **editada à mão**: trocar a disciplina de uma posição, reordenar,
  incluir e remover posições.
- **R20.** Avanço do ponteiro ao concluir uma sessão:
  - se a disciplina é a da **posição atual**, avança uma posição;
  - se ela aparece **mais à frente** na mesma volta, salta até ela, mas **só se for diferente da
    disciplina da sessão anterior** (repetir a mesma disciplina não pula posições);
  - se ela não está à frente nesta volta (já cumprida ou fora do ciclo), o ponteiro não se move;
  - ao passar da última posição, começa a próxima volta, na posição 1.
- **R21.** A sessão concluída guarda a posição cumprida (ex.: 3F2). Se não avançou, guarda a
  posição atual do ponteiro, como hoje.
- **R22.** O ponteiro pode ser ajustado à mão (ex.: pular uma disciplina).

### Cadastros
- **R23.** Uma disciplina ou lei com sessões registradas não pode ser apagada, só **desativada**.
  Sem sessões, pode ser excluída.
- **R24.** A lista de disciplinas pode ser reordenada.

## 5. Painéis (calculados; nada é digitado)

Consideram apenas as **sessões concluídas**.

- **Início / Dashboard:**
  - cartões com o tempo total de estudo, total de páginas, horas de vídeo, artigos, questões e
    acertos, minutos por página e minutos por questão;
  - horas estudadas nos **últimos 30 dias** (gráfico de barras por dia);
  - horas por **mês** do ano;
  - tempo médio por sessão, última sessão e última data estudada.
- **Acompanhamento por disciplina:**
  - páginas lidas / total (%), horas de vídeo / total (%), artigos lidos / total das leis (%);
  - questões, acertos e % de acerto;
  - tempo total, minutos por página e minutos por questão.
- **Ciclo:** a sequência da volta atual, com a posição do ponteiro destacada e as horas feitas em
  cada posição.

## 6. Telas (menu lateral)

1. **Estudar** (tela principal): botão grande **Iniciar**. Com uma sessão aberta, mostra o
   **cronômetro** com Pausar/Continuar, Finalizar e Cancelar, e permite corrigir o início e a aula.
2. **Dashboard**: indicadores e gráficos (seção 5).
3. **Sessões**: histórico com filtros por disciplina, tipo e período. Tocar numa sessão abre a
   edição no painel lateral.
4. **Acompanhamento**: progresso por disciplina.
5. **Ciclo**: sequência, ponteiro, geração e edição.
6. **Cadastros**: Disciplinas e Leis.
7. **Ajustes**: sincronização com o Google, importação da planilha antiga e backup.

## 7. Migração da planilha atual

Numa etapa própria, depois do app funcionando:
- importar Disciplinas, Leis, Config_Ciclo/Ciclo_Atual (incluindo o ponteiro) e todas as linhas do
  Cronograma;
- recalcular as durações a partir dos horários (a coluna DURAÇÃO_HHMM tem formatos misturados e
  não será usada);
- conferir que os totais do app batem com os da planilha antes de passar a usar só o app.

## 8. Fica de fora (por enquanto)

- Versão para celular.
- Lembretes e notificações.
- Metas diárias ou semanais. ❓ Tem interesse no futuro?

## 9. Resumo das perguntas em aberto

1. **R9:** cancelar marca como cancelada (com Desfazer) em vez de apagar?
2. **R14:** sobreposição de horários só avisa ou bloqueia?
3. **R15:** pode mudar a disciplina ou o tipo de uma sessão concluída?
4. **Seção 8:** metas de estudo no futuro?
