# Fase 3 — Operação (passos 16–19)

O agente atende sozinho — agora o DONO precisa enxergar e conduzir o que acontece. Na API oficial isso não é luxo: o número saiu do celular, e sem painel o dono está cego. Nesta fase o negócio ganha olhos (painel), voz para reabrir conversas (templates), reflexos para os cliques (botões) e ouvido educado (agrupador).

---

## Passo 16 — O painel do dono (só leitura)

**Por quê:** tudo que o agente faz já está guardado (Supabase, agenda, planilha) — o painel só LÊ essas três fontes e mostra pro dono, sem poder quebrar nada.

**Antes, pergunte:**
- O que o dono quer ver primeiro? (padrão comprovado: conversas em tempo real, agenda dos próximos dias, e um funil: quantos entraram → responderam → se qualificaram → agendaram)
- Opcional que melhora muito o resultado: pedir ao aluno uma imagem de referência visual — ex.: buscar "chatbot dashboard" no `dribbble.com` (em inglês acha mais) e salvar um print de um visual que ele goste, para anexar junto do pedido.

**Pedido pronto pra colar (anexando a imagem, se houver):**
> Quero um painel do dono para acompanhar o atendimento. Três telas: **Conversas** (em tempo real, mostrando quem falou por último), **Agenda** (os próximos 7 dias) e **Funil** (quantos entraram, responderam, se qualificaram, agendaram — e quantos estão parados em cada etapa). Os dados JÁ EXISTEM no Supabase, no Google Calendar e na planilha — o painel só lê, não cria nem altera nada. Use a imagem anexa como referência de visual. ANTES de mexer em qualquer arquivo, me explique quais telas você vai criar e de onde vem cada informação.

Quando o construtor apresentar o plano, revise COM o aluno: as ressalvas que o construtor levantar merecem triagem, não obediência (ver armadilha). Aí libere: "pode continuar".

**Teste que prova:** abrir `/painel` no navegador → as três telas com os dados REAIS dele (as conversas de teste do sandbox aparecem; se o WhatsApp já está ligado, as conversas reais também).

**Se falhar:**
1. Tela em branco ou dado faltando → pergunte ao construtor de onde aquela tela lê e confira se a fonte (Supabase/planilha/agenda) tem dado mesmo.
2. Painel "estreito", espremido num cartão → peça o ajuste de layout (ver armadilha).
3. Datas erradas/ausentes → o nome de uma coluna no banco pode não ser o que o código espera; peça ao construtor para conferir os nomes reais das colunas.

**Armadilhas reais:**
- **O painel saiu como um "pop-up" estreito** que não aproveitava a tela — a correção foi um pedido simples de layout ("ocupe a página inteira, sem mexer em lógica nem dado"). Se acontecer, é cosmético: peça igual.
- **O construtor levantou 3 "problemas" antes de implementar — e nenhum era problema de verdade** (os dados estavam em outra fonte, que ele não tinha olhado). A lição dita na aula: analise as ressalvas da IA uma a uma em vez de aceitar cegamente — você conhece o seu projeto melhor que ela.
- A exigência "antes de mexer, me explica as telas e de onde vem cada dado" veio ANTES do pedido dar certo — sem ela, o construtor tende a criar dados do zero em vez de ler os que existem.

**Quando pular:** se o aluno for WAHA e ainda vê tudo pelo celular, pode adiar — mas o funil e a visão de "paradas" não existem no aplicativo, e os passos 21 e 23 moram no painel. Recomende não pular.

---

## Passo 17 — Templates da Meta e a janela de 24 horas (só caminho oficial)

**Por quê:** quando o cliente fica 24h sem responder, a Meta tranca a conversa — e a única chave para reabrir é um modelo de mensagem pré-aprovado por ela (o "template"); sem isso, o lembrete de amanhã não tem como ser enviado.

**Antes, explique a regra do jogo em 30 segundos:** cliente mandou mensagem = janela aberta por 24h, conversa grátis e livre. Janela fechada = só template aprovado, e ele custa por envio (utilidade ≈ centavos; marketing ≈ dez vezes mais). TODO template deve ter botões de resposta rápida — o clique do cliente conta como resposta e REABRE a janela de graça.

**Etapa 1 — criar os templates no painel da Meta (clique a clique):**
1. `business.facebook.com` → menu → **Gerenciador do WhatsApp** → **Gerenciar modelos**.
2. Template 1, o lembrete (categoria **Utilidade**, idioma português BR): corpo tipo "Olá {{1}}, lembrando seu horário de {{2}} às {{3}} aqui na [NOME DO NEGÓCIO]. Endereço: [ENDEREÇO]." + botões **"Confirmar presença"** e **"Preciso remarcar"**. Preencher os exemplos de cada variável quando a tela pedir.
3. Template 2, a promoção (categoria **Marketing**): corpo tipo "Oi {{1}}, temos novidade na [NOME DO NEGÓCIO]: [OFERTA] até [DATA]. Quer que eu veja um horário para você?" + botões **"Quero ver horários"** e **"Não, obrigado!"**.
4. Em "período de validade da mensagem", trocar o padrão para ~30 minutos (se o celular do cliente estiver desligado e a mensagem não entregar, você não paga).
5. Enviar para análise. Avise: a aprovação leva ATÉ 24h — o teste de hoje será com o modelo `hello_world`, que já vem aprovado.

**Etapa 2 — pegar o WABA ID** (se não guardou no passo 15): business.facebook.com → **Configurações** → **Contas do WhatsApp** → o ID abaixo do nome. Vai para o `.env`/Railway como `WHATSAPP_WABA_ID`.

**Etapa 3 — pedido pronto pra colar:**
> Quero uma aba nova no painel chamada **Templates**: ela lista os modelos aprovados na minha conta do WhatsApp (buscando na API da Meta pelo WABA ID do `.env`), com nome, categoria, texto com as variáveis e preço estimado por envio — e se o token não tiver permissão para isso, não invente contorno: me avisa e deixa a lista num arquivo de configuração que eu edito à mão. Na aba de conversas, mostre em cada conversa se a janela de 24 horas está aberta ou fechada; quando fechada, um botão de reabrir: eu escolho o modelo, preencho as variáveis, VEJO o texto final antes de confirmar, e o envio sai como modelo oficial. A mensagem enviada fica salva no histórico marcada como modelo — senão o painel passa a mentir. ANTES de mexer em qualquer arquivo, me explique em uma frase como você vai calcular se a janela está aberta ou fechada — e atenção: o que conta é a última mensagem que o CLIENTE mandou, não a última da conversa.

Se a explicação do construtor contar a janela pela mensagem do agente, corrija ANTES de deixar implementar.

**Teste que prova:** na aba de conversas, achar uma conversa fechada (ou fabricar: apagar as mensagens de hoje daquela conversa) → reabrir com o `hello_world` → a mensagem CHEGA no WhatsApp → responder → a janela aparece aberta no painel, com o agente conversando normalmente de graça.

**Se falhar:**
1. Lista de templates vazia → WABA ID errado, ou token sem a permissão de gestão do WhatsApp (regerar o token do usuário do sistema marcando as permissões de WhatsApp).
2. Template não chega → o modelo ainda está "em análise" (só aprovado envia), ou as variáveis não foram preenchidas.
3. Janela sempre "fechada" ou datas malucas → o nome da coluna de data no banco não é o que o código espera (aconteceu na construção original — a coluna real tinha outro nome; peça ao construtor para conferir os nomes reais no Supabase).

**Armadilhas reais:**
- **A Meta REJEITA template com variável no comecinho ou no fim do texto** — comece e termine com palavra fixa. (No passo 23 essa regra vira validação automática.)
- **A janela quase foi calculada pela mensagem errada** — a exigência de explicar o cálculo antes de codar existe porque a IA tende a contar pela última mensagem da conversa, e mensagem do AGENTE não abre janela nenhuma.
- O preço mostrado é ESTIMATIVA em dólar (a Meta não entrega a tabela por API) — o custo real vem na fatura.
- Ao reabrir uma conversa antiga, o agente pode não ter de onde puxar serviço/horário para as variáveis — preencher à mão é o esperado, não é defeito.

**Quando pular:** caminho WAHA → não existe janela nem template; pule direto ao 18 e marque no progresso que 17 e 23 não se aplicam.

---

## Passo 18 — Os cliques nos botões + cancelar horário + o descadastro

**Por quê:** quando o cliente toca num botão, o WhatsApp não manda texto — manda um evento de clique, e um agente que não entende cliques deixa o cliente falando sozinho exatamente no momento em que ele decidiu responder.

**Antes, pergunte:** quais botões existem nos templates dele (do passo 17) e o que cada um deve disparar. O padrão comprovado: confirmar presença → agradece e mantém; preciso remarcar → consulta horários livres e remarca; quero ver horários → retoma a promoção; não obrigado → pergunta se quer parar de receber promoções.

**Pedido pronto pra colar:**
> Meus modelos têm botões de resposta rápida: [LISTAR OS BOTÕES]. Hoje o agente não entende o clique. Quero que o clique seja tratado como resposta de verdade: reconheça QUAL botão foi apertado, registre no histórico como qualquer mensagem e reaja: "[CONFIRMAR]" agradece e mantém o horário; "[REMARCAR]" entra no fluxo de remarcação consultando os horários livres da agenda; "[VER HORÁRIOS]" retoma a conversa a partir do serviço da promoção; e "[NÃO OBRIGADO]" pergunta (com dois botões) se o cliente quer parar de receber promoções — e se quiser, NUNCA mais recebe mensagem de marketing, mas continua recebendo avisos de utilidade sobre horários que já marcou. ANTES de implementar, me mostre onde no código a mensagem que chega é interpretada, para eu entender em que ponto esse caso novo entra.

**Na sequência, o buraco que sempre aparece:** pergunte ao construtor se remarcar CANCELA o horário antigo. A resposta provável é não — o agente só sabe criar. Aí o pedido:
> Crie a ferramenta **cancelar_evento**: desmarca um horário futuro DESTE cliente (identificado pelo telefone da conversa, nunca por escolha do modelo); se houver mais de um horário, pergunte qual. E ajuste a remarcação: primeiro cancela o antigo, depois cria o novo.

Adicione `cancelar_evento` no prompt (seção Ferramentas) e, em "Como agir": "para remarcar, cancele o horário antigo antes de criar o novo".

**Teste que prova:** enviar a promoção → clicar **"Não, obrigado!"** → chega a pergunta com os dois botões → **"Sim, quero parar"** → confirmação; conferir no Supabase a marcação de descadastro; e o painel deve RECUSAR enviar marketing para esse cliente dali em diante. Depois: com um horário marcado, clicar **"Preciso remarcar"** → novo horário criado E o antigo sumindo da agenda.

**Se falhar:**
1. O agente responde genérico ao clique → o evento de botão não está sendo traduzido; peça ao construtor o mapa de onde a mensagem chega.
2. Remarcou mas o antigo continua lá → a ferramenta cancelar não entrou no fluxo de remarcação.
3. Descadastrado continua recebendo promoção → a checagem tem que estar no ENVIO (servidor), não na boa vontade do agente.

**Armadilhas reais:**
- **"Enquete" não existe no WhatsApp via API** — o pedido original dizia "enquete" e o construtor avisou: os formatos são botões, listas e afins. Virou mensagem com dois botões. Nem tudo que o WhatsApp do celular faz existe na API — quando o construtor disser isso, é verdade, aceite o formato alternativo.
- **O buraco da remarcação foi descoberto pelo construtor, não pelo autor**: o agente marcava o novo e dizia que "a equipe cancela o antigo" — mentira operacional que lota a agenda de fantasmas. Por isso a pergunta dirigida acima.
- Num teste, o agente achou que um horário tinha sido "ocupado por outra pessoa" — era o evento DO PRÓPRIO cliente aparecendo na consulta. Decisão consciente da construção original: NÃO filtrar (um cliente pode querer dois procedimentos). Se incomodar o aluno, é escolha dele — mas conte o porquê.
- **Por que o descadastro importa tanto:** cliente que não quer promoção e continua recebendo BLOQUEIA o número — e denúncias derrubam número até na API oficial. O botão de sair é a vacina.

**Quando pular:** WAHA sem templates → sem botões de template; mas a ferramenta `cancelar_evento` vale para QUALQUER caminho (remarcação existe em todo negócio com agenda) — faça ao menos ela.

---

## Passo 19 — O agrupador: mensagens em pedaços, resposta única

**Por quê:** gente de verdade escreve no WhatsApp em pedaços ("Oi" / "vocês fazem X?" / "quanto tá?") — e um agente que responde cada pedaço vira três respostas atropeladas para um pensamento só.

**Antes:** reproduza o problema COM o aluno: mandar 3 mensagens rápidas seguidas no sandbox → ver o agente responder 3 vezes. Problema visto é problema entendido.

**Pedido pronto pra colar (o diagnóstico vem antes da ordem — mantenha assim):**
> Descobri um problema: quando o cliente manda três mensagens seguidas rápido, o agente responde todas separadamente. ANTES de consertar, me explica o que acontece hoje: cada mensagem que chega dispara um atendimento próprio e eles rodam ao mesmo tempo, certo? Quero entender o caminho antes de mexer. Depois conserta assim: quando uma mensagem chegar, o agente NÃO responde na hora — espera uns cinco segundos para ver se a pessoa continua escrevendo, e se chegar outra mensagem nesse intervalo o relógio REINICIA do zero. Só quando o cliente parar é que ele junta tudo e responde UMA única vez, como um pensamento só. Três garantias que eu não abro mão: nenhuma mensagem descartada (todas salvas no histórico, na ordem, inclusive as da espera); nunca dois atendimentos rodando ao mesmo tempo na mesma conversa (se um já estiver pensando, a mensagem nova entra na mesma resposta); e NÃO mexa no prompt, na base nem nas ferramentas — isso é só o jeito de receber e agrupar.

**Teste que prova:** "Oi" / "vocês fazem [serviço]?" / "quanto custa?" em pedaços rápidos → UMA resposta cobrindo as três coisas. E o teste do relógio: mandar, esperar 3 segundos, mandar de novo → ainda uma resposta só.

**Se falhar:**
1. Duas respostas mesmo assim → o relógio não está reiniciando a cada mensagem nova.
2. Mensagem "sumiu" → violação da garantia 1; todas têm que estar no histórico.
3. Resposta trava para sempre → o atendimento anterior não está liberando a conversa; peça ao construtor para conferir a trava por conversa.

**Armadilha real:** a cláusula "não mexa no prompt, na base nem nas ferramentas" existe porque pedido de conserto sem cerca vira reforma geral — o construtor aproveita para "melhorar" o que ninguém pediu, e o que funcionava quebra. Escopo cirúrgico em TODO pedido de correção.

**Quando pular:** não pule — este é barato, rápido, e é a diferença entre parecer robô e parecer gente. Funciona igual no sandbox, na API oficial e no WAHA.

**Fechando a fase 3:** progresso atualizado, e abra `referencias/fase-4.md` — a blindagem final.
