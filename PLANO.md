# EstudoSystem — Plano de etapas

Cada etapa termina com algo **usável no tablet e no PC**. As regras (R1, R2…) são as da
[ESPECIFICACAO.md](ESPECIFICACAO.md). Primeiro o app funciona no aparelho, sem internet; a ligação com
o Google vem depois. A planilha antiga continua sendo usada normalmente até a troca (etapa 8).

| # | Etapa | O que você consegue fazer no fim |
|---|---|---|
| 0 | Cara do app + publicação | Abrir o app no tablet/PC, com o visual do PCA, e instalá-lo |
| 1 | Cadastros | Cadastrar disciplinas e leis |
| 2 | Cronômetro | Estudar de verdade: iniciar, pausar, finalizar, cancelar |
| 3 | Histórico e edição | Ver as sessões e corrigir horários e descrição |
| 4 | Ciclo de estudos | Gerar o ciclo e receber a sugestão da próxima disciplina |
| 5 | Painéis | Dashboard animado ao rolar e acompanhamento por disciplina |
| 6 | Planilha do Google | Backup automático e tablet/PC com os mesmos dados |
| 7 | Importação | Trazer todo o histórico da planilha antiga |
| 8 | Conferência e troca | Conferir os totais e passar a usar só o app |
| 9 | (futuro) Metas | A combinar |

---

## Etapa 0 — Cara do app + publicação
- Visual do PCA adaptado:
  - tela de abertura;
  - menu lateral branco com grupos (Estudar · Dashboard · Sessões · Acompanhamento · Ciclo ·
    Cadastros · Ajustes);
  - fundo cinza-claro, cartões brancos e verde `#30503a`.
- Menu recolhível no tablet em retrato.
- Telas ainda vazias ("em construção"), para navegar e aprovar o visual.
- Publicação no GitHub Pages. Você cria o repositório; eu faço o resto.
- Instalação no tablet (menu ⋮ → Instalar app).
- **Você aprova:** o visual, antes de construir as telas em cima dele.

## Etapa 1 — Cadastros (R23, R24)
- Disciplinas: incluir, editar, ativar/desativar, reordenar, cor, peso, totais de páginas e vídeo.
- Leis: incluir, editar, ativar/desativar, total de artigos.
- Excluir só é possível se não houver sessões; senão, apenas desativar.
- Dados de exemplo: as suas 5 disciplinas e a Lei 9.784/99, para já testar com o que é real.

## Etapa 2 — Cronômetro (R1–R9)
- Tela **Estudar**: escolher disciplina, tipo, aula e lei, e **Iniciar**.
- Cronômetro grande, com Pausar/Continuar, Finalizar (congela o relógio) e Cancelar (apaga, com
  confirmação).
- Campos finais conforme o tipo: páginas, questões/acertos ou artigos.
- O cronômetro continua certo com o app fechado, e o app volta direto para a sessão aberta.
- Já dá para **corrigir o horário de início** da sessão em andamento (R10) e a aula (R12).
- Ainda sem ciclo: você escolhe a disciplina livremente.

## Etapa 3 — Histórico e edição (R11–R16)
- Tela **Sessões**: lista com filtros (disciplina, tipo, período) e totais do filtro.
- Tocar numa sessão abre o painel de edição. Nas concluídas, só **início, fim e aula** podem mudar.
- Duração recalculada na hora, aviso de sobreposição com outra sessão, e nenhum botão de excluir.

## Etapa 4 — Ciclo de estudos (R17–R22)
- Configurar as horas totais e **gerar a sequência** por rodadas, com os pesos.
- Editar a sequência à mão e ajustar o ponteiro.
- A tela Estudar passa a **sugerir** a disciplina do ponteiro.
- Ao concluir uma sessão, o ponteiro avança pelas regras de hoje (incluindo o "salto" e a trava de
  repetição), e a sessão guarda a posição cumprida (ex.: 3F2).
- Tela **Ciclo**: a volta atual, com a posição do ponteiro destacada e as horas feitas.

## Etapa 5 — Painéis (seção 5)
- **Dashboard:**
  - cartões com os totais;
  - horas por dia (últimos 30 dias) e por mês;
  - médias, última sessão e última data.
- **Acompanhamento:** progresso de cada disciplina (páginas, vídeo, lei seca, questões e minutos
  por página/questão).
- **Animação ao rolar, como no PCA:** os blocos surgem, as barras crescem e os números contam.
  Filtros não repetem a animação, e o modo "reduzir movimento" é respeitado.
- Dicas flutuantes ao tocar ou passar o mouse nos gráficos.

## Etapa 6 — Planilha do Google (conta pessoal)
- Criar a **planilha nova** "EstudoSystem - dados" na sua conta pessoal, com o backend da base.
- Você executa `configurar()` uma vez no editor, para autorizar, e cola o código `APP1:` em Ajustes.
- A partir daí: cópia automática na planilha e **tablet e PC com os mesmos dados**.
- Detalhe técnico:
  - para a sincronização funcionar, uma sessão cancelada precisa ser "avisada" aos outros aparelhos;
  - por isso, na planilha nova ela fica marcada como excluída;
  - no app ela nunca aparece e não conta em nada, então para você continua "sem rastro".

## Etapa 7 — Importação da planilha antiga
- Em Ajustes: **Importar da EstudoSystem**. O app lê a planilha antiga **sem alterá-la**.
- Traz disciplinas, leis, ciclo (com o ponteiro) e todas as sessões do Cronograma.
- As durações são recalculadas a partir dos horários.
- Pode ser repetida sem duplicar nada, útil se você continuar usando a planilha até a troca.

## Etapa 8 — Conferência e troca
- Comparar os totais do app com os da planilha: horas, páginas, questões, acertos e horas por mês.
- Com tudo batendo, você passa a usar só o app. A planilha antiga fica guardada como está.

## Etapa 9 — Metas (futuro)
- Combinar os detalhes: diária ou semanal, em horas, páginas ou questões, por disciplina ou geral.

---

## Como cada etapa é entregue
1. Eu programo as regras com testes e testo no navegador nos tamanhos de tablet (paisagem e retrato)
   e PC.
2. Salvo (commit) e publico. O app instalado se atualiza sozinho.
3. Explico **como usar** o que ficou pronto, e você testa no seu tablet.
4. Ajustamos o que precisar antes de ir para a próxima etapa.
