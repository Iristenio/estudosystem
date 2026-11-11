# EstudoSystem — Especificação

> Perguntas em aberto respondidas em 26/09/2026. As regras vieram do Apps Script atual (planilha **EstudoSystem**), mais as
> novidades pedidas.

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
| Possui PDF / Total de páginas | O total é obrigatório para iniciar uma sessão de PDF. **Calculado** pelo material lançado (3.5) |
| Possui vídeo / Total de horas de vídeo | O total é obrigatório para iniciar uma sessão de VideoAula. **Calculado** pelo material lançado (3.5) |
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
| Faixas de artigos | Só na Lei Seca (a partir de 13/10/2026). Quais artigos foram lidos, ex.: `1-10, 15, 37-40` (R25) |
| Situação | Em andamento · Pausada · Finalizando · Concluída |
| Posição no ciclo | O antigo CRON_ID (ex.: 3F2). Preenchido automaticamente ao concluir |
| Material estudado | Só em PDF e VideoAula (a partir de 13/10/2026). Quais PDFs ou vídeos do material (3.5) foram estudados (R36) |

Dia da semana e mês são **derivados da data** e não precisam ser guardados.

### 3.4 Ciclo de estudos (por horas, desde 21/10/2026 — método de Alexandre Meirelles)
- **Horas do ciclo** (ex.: 30 h). O ciclo termina quando você estuda essa carga, sem prazo fixo
  (uma semana é só o objetivo).
- **Blocos:** as horas viram blocos de cerca de 1 h (a sessão média), repartidos pelo peso das
  disciplinas. A soma dos blocos de uma disciplina é a **cota** dela no ciclo (ex.: 7 h).
- **Número do ciclo:** Ciclo 1, 2, 3… Não existe mais "volta" nem "ponteiro": ciclo e volta são a
  mesma coisa.

### 3.5 Material da disciplina (novidade de 13/10/2026)
O material é lançado **aos poucos**, item por item, em vez de um total único.

| Campo | Observação |
|---|---|
| Tipo | PDF ou Vídeo |
| Número | Sequencial dentro do tipo e do curso (PDF 1, PDF 2…). Pode ser corrigido |
| Nome | Opcional (ex.: "Controle de constitucionalidade"). Sem nome, vale o número |
| Curso | Opcional (ex.: TJCE, TCU) |
| Tamanho | Páginas (PDF) ou duração (vídeo) |
| Fora do total | Sim/não, para tirar um item da conta sem apagá-lo |

Cada **curso** da disciplina tem a chave **"conta no total"**.

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
  - Lei Seca: **quais artigos** foram lidos, em faixas (R25). A quantidade é calculada sozinha;
  - VideoAula e Revisão: nada extra.
- **R7.** O cronômetro continua certo mesmo se o app for fechado ou o aparelho desligar. Ele é
  calculado pelos horários gravados, e não por um contador rodando.
- **R8.** Ao abrir o app com uma sessão aberta, ele volta direto para o cronômetro dela.
- **R9.** **Cancelar** uma sessão aberta a **apaga sem rastro**, como hoje. O app pede
  confirmação antes.

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
  deixa salvar.
- **R15.** Depois de concluída, uma sessão **só permite alterar os horários (início e fim) e a
  descrição da aula**. Disciplina, tipo, páginas, questões, acertos e artigos ficam travados.
  Exceção: as **faixas de artigos** podem ser corrigidas (R28).
- **R16.** Uma sessão concluída **não pode ser excluída**.

### Ciclo de estudos
> Revisto em 21/10/2026. Antes, um "ponteiro" andava a cada sessão (posições como "3F2", vindas da
> planilha antiga); por isso os blocos de 3h20 nunca se completavam. Agora o ciclo conta horas.

- **R17.** **Gerar:** o número de blocos é o total de horas (30 h → 30 blocos de 1 h), repartido entre
  as disciplinas ativas pelo peso (maiores restos; cada uma com pelo menos 1 bloco). Os blocos de cada
  disciplina são espalhados pelo ciclo, na ordem das disciplinas. Ex.: 30 h e pesos 2, 2, 2, 1, 1, 1
  → cotas de 7, 7, 7, 3, 3 e 3 h.
- **R18.** Gerar de novo **substitui** os blocos (o app pede confirmação) e recomeça a contagem no
  **Ciclo 1**, a partir daquele momento. O histórico de sessões não muda.
- **R19.** Os blocos podem ser **editados à mão**: trocar a disciplina, reordenar, incluir e remover.
- **R20.** Cada sessão concluída de uma disciplina do ciclo **preenche a cota** dela com o **tempo
  real** estudado (2 h, 1 h ou 30 min — tanto faz); dentro da cota, os blocos são preenchidos na ordem.
  Hora além da cota conta no total do ciclo e aparece como "além da cota". Sessões de disciplinas fora
  do ciclo não contam.
- **R21.** O ciclo **fecha** quando a soma chega ao total (ex.: 30 h), mesmo que alguma disciplina não
  tenha completado a cota. O próximo ciclo começa no fim da sessão que fechou, zerado (a sobra dessa
  sessão não passa adiante). A sessão guarda em qual ciclo contou ("C3").
- **R22.** **Próxima sugerida:** a disciplina do primeiro bloco ainda não cumprido.
- Na mudança (21/10/2026), a contagem recomeçou no **Ciclo 1**, valendo as sessões a partir desse dia.
- **R52.** **Intercalar categorias (11/11/2026):** ao gerar o ciclo, a opção **"Intercalar
  categorias"** (lembrada; começa marcada) reordena os blocos para que duas disciplinas da **mesma
  categoria** (ex.: Núcleo Comum × Núcleo Técnico) não fiquem seguidas. Em cada categoria a mesma
  disciplina também não se repete em sequência. As cotas não mudam. Com categorias do mesmo tamanho a
  alternância é perfeita; com tamanhos diferentes, as sobras ficam espalhadas pelo ciclo.
- **R53.** **Reorganizar sem recomeçar:** na tela Ciclo, se houver duas da mesma categoria seguidas,
  aparece **"Intercalar categorias"**, que muda **só a ordem** do ciclo atual — mesmo número, mesmo
  início, mesmas cotas; as horas já estudadas continuam valendo (quais blocos aparecem cumpridos pode
  mudar, porque cada sessão volta a preencher os blocos da sua disciplina na ordem).
- **R44.** **Disciplina escolhida pelo ciclo (07/11/2026):** na tela Estudar, a disciplina é escolhida
  numa lista dos **blocos ainda não cumpridos** do ciclo ("24 · BANCO DE DADOS — faltam 37 min"), a
  partir do atual; os que ficaram para trás aparecem no fim ("Ficaram para trás"). Só disciplinas do
  ciclo (sem ciclo gerado, a escolha volta a ser pelos botões das disciplinas ativas).
  - A sessão guarda o bloco escolhido e **preenche esse bloco**; se passar da duração dele, a sobra vai
    para o próximo bloco pendente da mesma disciplina. Sessões sem bloco escolhido (antigas) preenchem
    os blocos da disciplina na ordem, como antes.
  - O **atual** segue o último bloco escolhido: escolher um bloco mais à frente faz o ponteiro pular
    junto; os pulados continuam pendentes e voltam no fim da lista.
  - Acima da lista: **Evolução da disciplina atual** (ex.: "23 min de 1h00 · faltam 37 min"),
    **Evolução do ciclo atual** ("24h29 de 30h00") e os cartões **disciplina anterior · atual ·
    próxima**. Durante a sessão, no cronômetro, as duas barras enchem ao vivo.

### Cadastros
- **R23.** Uma disciplina ou lei com sessões registradas não pode ser apagada, só **desativada**.
  Sem sessões, pode ser excluída.
- **R24.** A lista de disciplinas pode ser reordenada.

### Artigos lidos na lei seca (novidade de 13/10/2026)
- **R25.** Ao finalizar uma sessão de Lei Seca, você informa **quais artigos leu**, em faixas:
  `1-10, 15, 37-40`. Também vale escrever `1 a 10`, separar com ponto e vírgula, e marcar os artigos
  tocando numa **grade** (botão "marcar na grade"). A quantidade de artigos da sessão é **calculada**
  a partir das faixas (no exemplo, 15).
- **R26.** Validações das faixas:
  - só números de 1 até o total de artigos da lei;
  - **artigo com letra conta como o artigo principal**: `37-A` vale como 37;
  - faixa invertida (`10-1`) é aceita como `1-10`;
  - artigo repetido na mesma sessão conta uma vez;
  - pelo menos um artigo precisa ser informado.
- **R27.** O registro é **só por artigo** (sem parágrafos e incisos).
- **R28.** Numa sessão de Lei Seca já concluída, as faixas podem ser **corrigidas** (erro de
  digitação), e a quantidade é recalculada.
- **R29.** As sessões de Lei Seca **anteriores a esta novidade** guardam só a quantidade. Elas
  continuam no histórico e nas horas, mas **não entram no mapa nem no percentual da lei** (vale só a
  partir de agora).

### Material da disciplina (novidade de 13/10/2026)
- **R30.** O **total de páginas** e o **total de horas de vídeo** da disciplina passam a ser a **soma
  do material lançado** que conta no total: item que não está "fora do total", de um curso ligado.
  Sem nenhum item que conte, o total fica vazio (e não dá para iniciar sessão daquele tipo).
- **R31.** **Lançar rápido** (pensado para o teclado numérico, que só tem vírgula):
  - PDF: `35, 42, 28` (páginas; a vírgula separa um PDF do outro);
  - vídeo: a **vírgula separa minutos de segundos**: `32,45` = 32 min 45 s (também `32:45`, `40`,
    `1h20`); Enter lança e o campo fica pronto para o próximo; vários de uma vez, separados por
    espaço ou `+` (`32,45 + 28,10`);
  - cada valor vira um item, numerado na sequência do curso. Com um **nome**, lança-se um item só.
- **R32.** **Troca de curso:** desligar "conta no total" de um curso tira todos os itens dele da soma,
  sem apagar nada. Um item também pode ser tirado sozinho ("fora do total").
- **R33.** Um item ligado a sessões não pode ser apagado, só tirado do total.
- **R34.** O **total anterior** de cada disciplina vira um primeiro item chamado "Total anterior",
  para nada mudar no dia da atualização. Ele pode ser apagado ou tirado do total depois.
- **R35.** O material é lançado no cadastro da disciplina e também por um **atalho na tela Estudar**,
  ao escolher PDF ou Videoaula (inclusive na hora de finalizar, se o item ainda não existe).
- **R36.** Ao finalizar uma sessão de PDF ou VideoAula, você pode escolher **quais itens** estudou
  (opcional), numa lista em ordem crescente que já abre rolada até o item marcado (ou o próximo). O
  app destaca o próximo item, logo depois do último estudado. Numa sessão concluída, a
  escolha pode ser corrigida.
- **R37.** As sessões anteriores a esta novidade não têm itens marcados e não aparecem no mapa do
  material.
- **R38.** Um item pode ser marcado **à mão como já estudado** (um por um, ou vários de uma vez do
  primeiro ao último tocado), no Mapa do material ou na correção do item. A marcação muda **só o
  mapa** (cor, % estudado e próximo sugerido): não cria sessão nem soma horas, páginas ou vídeo.
  O próximo sugerido passa a ser o item seguinte ao último estudado, em sessão ou marcado à mão.
- **R40.** **PDF lido aos poucos (1ª leitura):** ao finalizar uma sessão de PDF, para cada PDF
  marcado que ainda não foi concluído, informa-se **"Parei na página"** (ou "Terminei este PDF").
  - O progresso do PDF é a **maior página alcançada** ÷ total de páginas; chegando à última, o PDF
    fica **concluído**. Marcado à mão como já estudado (R38) também conta como concluído.
  - **Páginas lidas** é preenchido sozinho com quanto avançou (página nova − anterior) e pode ser
    corrigido.
  - Depois de concluído, marcar o PDF em outra sessão só conta mais uma leitura ("lido 2 ou mais
    vezes"), sem página — releitura de PDF inteiro costuma ser feita como Revisão.
  - No mapa: nunca aberto · **em andamento** (com barrinha "40 de 109 págs.") · concluído · lido 2+ vezes.
    O % do mapa conta PDFs concluídos. O próximo sugerido continua no PDF em andamento até concluí-lo.
  - Sessões antigas que marcaram um PDF sem página deixam o PDF "em andamento"; basta informar a
    página na próxima sessão.
- **R41.** **Seção:** ao lançar, informa-se a **seção** do curso (opcional; o app lembra a última). A
  numeração recomeça em cada seção e aparece como "1.1", "1.2", "2.1"… em todo lugar (painel, mapa,
  lista ao iniciar, finalização). Sem seção, continua "Vídeo 3". No formulário a ordem é **Nome →
  Duração/Páginas → Seção → Curso**; Enter no nome vai para a duração, Enter na duração lança e o
  cursor volta para o nome.
- **R42.** **Troca de curso:** curso com "conta no total" desligado vai para o **fim** da lista e fica
  **recolhido** (no painel e no mapa). Cada curso tem **"Apagar vídeos/PDFs deste curso"**: apaga de
  uma vez os que nunca foram marcados em sessão e mantém os que têm histórico (R33).
- **R43.** **Prefixo como seção:** num curso com nomes como "1.2-Teoria da Constituição", o botão
  "Usar o prefixo do nome como seção" passa a seção 1, número 2, nome "Teoria da Constituição" — os
  itens (e as sessões ligadas a eles) continuam os mesmos. Números repetidos ficam como estavam.
- **R39.** **Escolher a aula pelo material:** na tela Estudar, ao escolher PDF ou Videoaula de uma
  disciplina com material lançado, abre uma janela com a lista do material daquele tipo (número e
  nome, por curso, em ordem crescente, com as marcas do mapa e o próximo destacado; a lista já abre
  no próximo). Tocar num item preenche a **Aula** com "Vídeo 3 · Nome" e deixa esse item **já
  marcado** na finalização (R36). "Não é nenhum destes" ou fechar deixa a Aula livre. O botão
  "Escolher da lista", ao lado da Aula, reabre a janela. Se a Aula for mudada à mão, o item deixa
  de vir marcado.

## 5. Painéis (calculados; nada é digitado)

Consideram apenas as **sessões concluídas**.

- **Início / Dashboard:**
  - cartões com o tempo total de estudo, total de páginas, horas de vídeo, artigos, questões e
    acertos, minutos por página e minutos por questão;
  - horas estudadas nos **últimos 30 dias** (gráfico de barras por dia);
  - horas por **mês** do ano;
  - tempo médio por sessão, última sessão e última data estudada.
- **Acompanhamento por disciplina:**
  - páginas lidas / total (%), horas de vídeo / total (%);
  - lei seca: **artigos diferentes já lidos** / total das leis (%). Ler o mesmo artigo de novo não
    aumenta o percentual (R29: só sessões com faixas);
  - questões, acertos e % de acerto;
  - tempo total, minutos por página e minutos por questão.
- **Mapa da lei** (botão ao lado de cada lei em Cadastros → Leis secas, ou "Mapa da lei" no cadastro dela):
  - um quadradinho por artigo: cinza = nunca lido; verde-claro = lido 1 vez; verde-escuro = 2 vezes
    ou mais;
  - tocar num artigo mostra quantas vezes e a data da última leitura;
  - no topo: artigos diferentes lidos / total (%), relidos, nunca lidos e o **próximo trecho ainda
    não lido** (o primeiro trecho seguido de artigos nunca lidos);
  - a lista de leis também mostra quantos artigos de cada uma já foram lidos.
- **Mapa do material** (botão ao lado de cada disciplina em Cadastros → Disciplinas):
  - PDF e vídeo separados; itens agrupados por curso, com número, nome e tamanho;
  - cor pelo número de sessões em que o item foi estudado (nunca, 1 vez, 2 ou mais);
  - tocar num item mostra em quantas sessões e quando foi estudado pela última vez, e permite
    marcá-lo à mão como já estudado (R38; o item ganha um ✓);
  - no topo: itens estudados / total (%) e o próximo item ainda não estudado.
- **Ciclo:** o ciclo atual (número, início, horas feitas de 30 h, próxima sugerida), as horas de
  cada disciplina contra a cota e a ordem dos blocos (cumpridos, em andamento, próximo).

### Dashboard dinâmico ao rolar (igual ao PCA)
- Cada bloco **aparece suavemente quando entra na tela** durante a rolagem: ele sobe um pouco e
  fica visível.
- Ao aparecer:
  - as **barras crescem** a partir do zero;
  - as **rosquinhas se desenham**;
  - os **números contam** de 0 até o valor final;
  - os blocos lado a lado entram com um pequeno atraso um após o outro.
- Cada bloco anima **uma vez só**, na primeira vez que aparece.
- **Trocar um filtro** (período, disciplina) atualiza os valores **sem animar de novo**.
- Com "reduzir movimento" ligado no aparelho, tudo aparece pronto, sem animação.
- Tocar ou passar o mouse numa barra ou fatia mostra os detalhes (dica flutuante), como no PCA.

## 6. Telas (menu lateral)

1. **Estudar** (tela principal): botão grande **Iniciar**. Com uma sessão aberta, mostra o
   **cronômetro** com Pausar/Continuar, Finalizar e Cancelar, e permite corrigir o início e a aula.
2. **Dashboard**: indicadores e gráficos (seção 5).
3. **Sessões**: histórico com filtros por disciplina, tipo e período. Tocar numa sessão abre a
   edição no painel lateral.
4. **Acompanhamento**: progresso por disciplina.
5. **Ciclo**: andamento do ciclo atual, cotas por disciplina, ordem dos blocos, geração e edição.
6. **Cadastros**: Disciplinas e Leis. Cada lei tem o seu **Mapa da lei**.
7. **Ajustes**: sincronização com o Google, aparência e informações do aparelho.

## 7. Migração da planilha atual

> Concluída e conferida em 27/09/2026. A opção "Importar da planilha antiga" foi **retirada** do app
> em 13/10/2026, porque não é mais usada (o código continua no histórico do git, se precisar).

Numa etapa própria, depois do app funcionando:
- importar Disciplinas, Leis, Config_Ciclo/Ciclo_Atual (incluindo o ponteiro) e todas as linhas do
  Cronograma;
- recalcular as durações a partir dos horários (a coluna DURAÇÃO_HHMM tem formatos misturados e
  não será usada);
- conferir que os totais do app batem com os da planilha antes de passar a usar só o app.

## 8. Fica de fora (por enquanto)

- Versão para celular.
- Lembretes e notificações.

## 9. Etapa futura: metas de estudo

Você tem interesse. Elas entram **depois** que o app estiver funcionando e com o histórico
migrado. Os detalhes serão combinados na hora: meta diária ou semanal, em horas, páginas ou
questões, por disciplina ou geral.
## 10. Outros estudos (aprovada em 07/11/2026)

O app continua sendo, antes de tudo, para o **concurso**. Esta área registra, de forma simples, o tempo
dedicado a **outros estudos** (graduações, especialização, cursos da Alura…), para saber quanto tempo
vai para cada um por dia e decidir o que focar. Ela **não entra** no ciclo, no Dashboard, no
Acompanhamento, nos mapas nem nas estatísticas do concurso — o Dashboard principal fica intocado.

### 10.1 Cadastro: áreas e cursos
| Campo | Observação |
|---|---|
| Área | Texto livre, com sugestões das já usadas (ex.: Graduação, Especialização, Alura) |
| Curso | Nome (ex.: Engenharia de Software; Python para Dados). Único dentro da área |
| Cor | Usada nos gráficos |
| Situação | **Em andamento**, **Pausado**, **Concluído** (com a data) ou **Cancelado** (R51) |

### 10.2 Sessão de outros estudos
| Campo | Observação |
|---|---|
| Curso | Obrigatório |
| Início, fim, pausas | Como nas sessões do concurso; duração calculada |
| Descrição | Opcional (ex.: "Aula 3 – Pandas") |

Sem páginas, questões, material, mapas ou ciclo.

### 10.3 Regras
- **R45.** **Mesmo cronômetro:** na tela Estudar, a "Nova sessão" ganha a escolha **Concurso | Outros
  estudos**. Em "Outros estudos" escolhe-se o curso (agrupado por área) e a descrição opcional; o
  cronômetro (pausar, continuar, finalizar, cancelar) funciona igual. Continua existindo **uma sessão
  aberta por vez**, seja do concurso ou de outros estudos (R1).
- **R46.** Ao finalizar uma sessão de outros estudos não há campos extras: é só concluir. Ela não
  mexe no ciclo.
- **R47.** **Lançar à mão:** na tela Outros estudos, dá para registrar uma sessão que já aconteceu
  (curso, data, início, fim e descrição), para quando se esquece de usar o cronômetro.
- **R48.** Sessões de outros estudos podem ser corrigidas (horários, curso e descrição) e excluídas
  na própria tela (diferente do concurso, onde a sessão concluída não se exclui — R16).
- **R49.** Um curso com sessões não pode ser apagado, só desativado (como as disciplinas, R23).
- **R51.** **Situação do curso (08/11/2026):** em vez de ativo/inativo, cada curso está **Em
  andamento**, **Pausado** (parado por um tempo, ex.: disciplina trancada), **Concluído** (com a data,
  preenchida com hoje e corrigível) ou **Cancelado** (desistiu). Só os em andamento aparecem para
  iniciar ou lançar sessões. Na lista de Cursos, cada área mostra primeiro os em andamento e os
  pausados (com a etiqueta "Pausado"); concluídos e cancelados ficam recolhidos ("1 concluído · 1
  cancelado") e mostram o **total de horas do curso inteiro**. As sessões continuam contando em
  qualquer situação. Cursos antigos: ativo → em andamento; inativo → cancelado.
- **R50.** Na tela Estudar, o quadro **Hoje** continua mostrando só o concurso; os outros estudos de
  hoje aparecem na tela Outros estudos.

### 10.4 Tela "Outros estudos" (item próprio no menu)
- **Onde está meu tempo:** no período escolhido (hoje, esta semana, este mês, este ano, tudo), as horas de
  **Concurso** (todas as sessões concluídas do concurso) comparadas com cada **área** dos outros
  estudos, em barras e porcentagem do total. Tocar numa área mostra os cursos dela.
  A sessão **em andamento** (concurso ou outros) também entra na conta e os números se atualizam
  sozinhos — com "Hoje", dá para comparar o dia em tempo real.
  Uma versão **compacta** aparece também na tela **Estudar**, abaixo de "Hoje" (com Hoje · Semana ·
  Mês; abre em Hoje) — em teste (08/11/2026): a da tela Outros estudos continua.
- **Tempo por dia:** barras dos últimos 30 dias, cada curso na sua cor (o dia mais recente à
  esquerda, como no Dashboard).
- **Totais por curso e por área** no período.
- **Sessões:** a lista das sessões de outros estudos (mais recentes primeiro), com correção e o botão
  **Lançar sessão** (R47).
- **Cursos:** botão para cadastrar, editar e ativar/desativar áreas e cursos.

### 10.5 Planilha
Duas abas novas (cursos e sessões de outros estudos), criadas sozinhas; tablet e PC sincronizam
como o resto.
