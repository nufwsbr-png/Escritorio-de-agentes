# Fase 3 — Operação (passos 16–19)

O agente atende sozinho — agora o DONO precisa enxergar e conduzir o que acontece. Na API oficial isso não é luxo: o número saiu do celular, e sem painel o dono está cego. Nesta fase o negócio ganha olhos (painel), voz para reabrir conversas (templates), reflexos para os cliques (botões) e ouvido educado (agrupador).

Pausas humanas desta fase: o plano do painel (16) e, no caminho oficial, os templates no Gerenciador e o envio pago de teste (17). O resto você constrói e prova por código.

---

## Passo 16 — O painel do dono (só leitura)

**Por quê:** tudo que o agente faz já está guardado (Supabase, agenda, planilha) — o painel só LÊ essas três fontes e mostra pro dono, sem poder quebrar nada.

**O guia rascunha o plano** (não pergunte "o que você quer ver"; proponha o padrão comprovado): três telas — **Conversas** (em tempo real, quem falou por último), **Agenda** (próximos 7 dias) e **Funil** (quantos entraram → responderam → se qualificaram → agendaram, e quantos estão parados em cada etapa) — e, para cada tela, de onde vem cada dado (Supabase, Google Calendar, planilha).

**Pausa humana (a) — uma pergunta:** mostre o plano e pergunte: "é isso que você quer ver quando abrir o painel? Pode tirar, trocar ou acrescentar. Se tiver um print de um painel que você ache bonito (procure 'chatbot dashboard' no `dribbble.com`), manda junto que eu uso de referência."

**O guia executa (depois da confirmação):**
> Painel do dono para acompanhar o atendimento, em `/painel`. Três telas: Conversas, Agenda e Funil, conforme o plano aprovado. Os dados JÁ EXISTEM no Supabase, no Google Calendar e na planilha — o painel só lê, não cria nem altera nada. Usar a imagem de referência, se houver. Ocupar a página inteira. Reiniciar o servidor e enviar ao Railway.

**O guia testa e mostra:** chame cada tela por código e mostre que ela devolve dados REAIS (as conversas de teste do sandbox e, se o WhatsApp já está ligado, as reais). Diga: "abra [URL]/painel. Se o visual não te agradar, me diz o que mudar — isso é cosmético, mexo sem tocar em dado." Esta olhada é a conferência (e) do passo.

**Se falhar:**
1. Tela em branco ou dado faltando → confira de onde aquela tela lê e se a fonte tem dado mesmo.
2. Painel "estreito", espremido num cartão → ajuste de layout, sem mexer em lógica nem dado.
3. Datas erradas/ausentes → o nome de uma coluna no banco não é o que o código espera; confira os nomes reais.

**Armadilhas reais:**
- **O painel saiu como um "pop-up" estreito** que não aproveitava a tela — a correção foi um pedido simples de layout. Por isso "ocupar a página inteira" já está na especificação.
- **O construtor levantou 3 "problemas" antes de implementar — e nenhum era problema de verdade** (os dados estavam em outra fonte, que ele não tinha olhado). Você é o construtor: antes de dizer que falta dado, olhe as três fontes.
- A exigência "antes de mexer, explique as telas e de onde vem cada dado" existia porque sem ela o construtor criava dados do zero em vez de ler os que existem. Aqui ela virou o plano que o dono aprova.

**Quando pular:** se o aluno for WAHA e ainda vê tudo pelo celular, pode adiar — mas o funil e a visão de "paradas" não existem no aplicativo, e os passos 21 e 23 moram no painel. Recomende não pular.

---

## Passo 17 — Templates da Meta e a janela de 24 horas (só caminho oficial)

**Por quê:** quando o cliente fica 24h sem responder, a Meta tranca a conversa — e a única chave para reabrir é um modelo de mensagem pré-aprovado por ela (o "template"); sem isso, o lembrete de amanhã não tem como ser enviado.

**O guia lê antes:** caminho no progresso (WAHA → pule). `WHATSAPP_WABA_ID` e o token permanente já estão no `.env` desde o passo 15 — não peça de novo. Nome e endereço do negócio: constituição §1.

**Explique a regra do jogo em 30 segundos:** cliente mandou mensagem = janela aberta por 24h, conversa grátis e livre. Janela fechada = só template aprovado, e ele custa por envio (utilidade ≈ centavos; marketing ≈ dez vezes mais). TODO template deve ter botões de resposta rápida — o clique do cliente conta como resposta e REABRE a janela de graça.

**O guia rascunha os dois templates**, já com nome e endereço da constituição e com as regras que a Meta cobra (começar e terminar com palavra fixa, variáveis numeradas sem buraco, exemplo para cada uma, botões curtos):
- `lembrete_horario`, categoria **Utilidade**, português BR: "Olá {{1}}, lembrando seu horário de {{2}} às {{3}} aqui na [NOME]. Endereço: [ENDEREÇO]. Até lá!" + botões **"Confirmar presença"** e **"Preciso remarcar"**. Exemplos: Maria / 15 de março / 14h.
- `promocao_novidade`, categoria **Marketing**: "Oi {{1}}, temos novidade na [NOME]: {{2}} até {{3}}. Quer que eu veja um horário para você?" + botões **"Quero ver horários"** e **"Não, obrigado!"**. Exemplos: Maria / corte com 20% / 30 de março.

Anote os textos e os botões no progresso — o passo 18 lê daqui.

**Pausa humana 1 (c) — uma ida ao Gerenciador:**
> `business.facebook.com` → menu → **Gerenciador do WhatsApp** → **Gerenciar modelos** → **Criar modelo**. Crie os dois exatamente como escrevi acima (nome, categoria, idioma português BR, texto, os exemplos de cada variável quando a tela pedir, e os dois botões de resposta rápida). Em "período de validade da mensagem", troque o padrão para uns 30 minutos (se o celular do cliente estiver desligado e a mensagem não entregar, você não paga). Envie os dois para análise e me avise.

Avise: a aprovação leva ATÉ 24h — o teste de hoje será com o modelo `hello_world`, que já vem aprovado.

**O guia executa:**
> Aba nova no painel chamada **Templates**: lista os modelos aprovados na conta do WhatsApp (buscando na API da Meta pelo WABA ID do `.env`), com nome, categoria, texto com as variáveis e preço estimado por envio — se o token não tiver permissão para isso, não inventar contorno: avisar e deixar a lista num arquivo de configuração editável. Na aba de conversas, mostrar em cada conversa se a janela de 24 horas está aberta ou fechada — calculada pela última mensagem que o CLIENTE mandou, nunca pela última da conversa; quando fechada, um botão de reabrir: o dono escolhe o modelo, preenche as variáveis, VÊ o texto final antes de confirmar, e o envio sai como modelo oficial. A mensagem enviada fica salva no histórico marcada como modelo — senão o painel passa a mentir. Reiniciar e enviar ao Railway.

Registre no log, em uma frase, como a janela é calculada.

**Pausa humana 2 (c, d) — o teste, com aprovação do gasto:**
> Para provar, eu vou mandar o modelo `hello_world` pelo painel para o seu celular — custa centavos, é o único envio pago do teste. Pode? Quando chegar, responda qualquer coisa.

Para fabricar uma conversa fechada, use a conversa do celular dele e mude por código a data da última mensagem do cliente para dois dias atrás (registre e reverta depois). Envie, leia o banco: mostre o envio marcado como modelo, a resposta dele chegando e a janela aparecendo ABERTA no painel, com o agente conversando normalmente de graça.

**Se falhar:**
1. Lista de templates vazia → WABA ID errado, ou token sem a permissão de gestão do WhatsApp (regerar o token do usuário do sistema marcando as permissões de WhatsApp).
2. Template não chega → o modelo ainda está "em análise" (só aprovado envia), ou as variáveis não foram preenchidas.
3. Janela sempre "fechada" ou datas malucas → o nome da coluna de data no banco não é o que o código espera (aconteceu na construção original); confira os nomes reais.

**Armadilhas reais:**
- **A Meta REJEITA template com variável no comecinho ou no fim do texto** — por isso os rascunhos acima começam e terminam com palavra fixa. (No passo 23 essa regra vira validação automática.)
- **A janela quase foi calculada pela mensagem errada** — a IA tende a contar pela última mensagem da conversa, e mensagem do AGENTE não abre janela nenhuma. Já está na especificação; confira no seu código antes de testar.
- O preço mostrado é ESTIMATIVA em dólar (a Meta não entrega a tabela por API) — o custo real vem na fatura.
- Ao reabrir uma conversa antiga, o agente pode não ter de onde puxar serviço/horário para as variáveis — preencher à mão é o esperado, não é defeito.

**Quando pular:** caminho WAHA → não existe janela nem template; pule direto ao 18 e marque no progresso que 17 e 23 não se aplicam.

---

## Passo 18 — Os cliques nos botões + cancelar horário + o descadastro

**Por quê:** quando o cliente toca num botão, o WhatsApp não manda texto — manda um evento de clique, e um agente que não entende cliques deixa o cliente falando sozinho exatamente no momento em que ele decidiu responder.

**O guia lê antes:** os botões dos templates, no progresso (passo 17). Não pergunte. Padrão comprovado do que cada um dispara: confirmar presença → agradece e mantém; preciso remarcar → consulta horários livres e remarca; quero ver horários → retoma a promoção; não obrigado → pergunta se quer parar de receber promoções.

**O guia executa:**
> Os modelos têm botões de resposta rápida: [BOTÕES DO PROGRESSO]. Tratar o clique como resposta de verdade: reconhecer QUAL botão foi apertado, registrar no histórico como qualquer mensagem e reagir: "Confirmar presença" agradece e mantém o horário; "Preciso remarcar" entra no fluxo de remarcação consultando os horários livres da agenda; "Quero ver horários" retoma a conversa a partir do serviço da promoção; e "Não, obrigado!" pergunta (com dois botões) se o cliente quer parar de receber promoções — e se quiser, NUNCA mais recebe mensagem de marketing (a checagem fica no ENVIO, no servidor, não na boa vontade do agente), mas continua recebendo avisos de utilidade sobre horários que já marcou.
>
> E o buraco que sempre aparece: remarcar hoje só cria o horário novo — o agente não sabe cancelar. Criar a ferramenta **cancelar_evento**: desmarca um horário futuro DESTE cliente (identificado pelo telefone da conversa, nunca por escolha do modelo); se houver mais de um horário, pergunta qual. E ajustar a remarcação: primeiro cancela o antigo, depois cria o novo. Reiniciar e enviar ao Railway.

Insira `cancelar_evento` na seção Ferramentas do prompt e, em "Como agir": "para remarcar, cancele o horário antigo antes de criar o novo". Mostre.

**O guia testa e mostra:** simule por código os eventos de clique que a Meta envia (payload assinado com a chave secreta, direto no webhook): (1) "Não, obrigado!" → mostre a pergunta com dois botões saindo; "Sim, quero parar" → mostre a marcação de descadastro no banco e, pelo painel, a recusa de enviar marketing para esse cliente; (2) com um horário de teste marcado, "Preciso remarcar" → mostre, pela API da agenda, o novo evento criado E o antigo sumindo. Apague os dados de teste. Diga: "quando o template aprovar, clique num botão no seu celular para ver ao vivo; não precisa me responder".

**Se falhar:**
1. O agente responde genérico ao clique → o evento de botão não está sendo traduzido; confira onde a mensagem é interpretada.
2. Remarcou mas o antigo continua lá → a ferramenta cancelar não entrou no fluxo de remarcação.
3. Descadastrado continua recebendo promoção → a checagem tem que estar no ENVIO (servidor).

**Armadilhas reais:**
- **"Enquete" não existe no WhatsApp via API** — o pedido original dizia "enquete" e o construtor avisou: os formatos são botões, listas e afins. Virou mensagem com dois botões. Nem tudo que o WhatsApp do celular faz existe na API.
- **O buraco da remarcação foi descoberto pelo construtor, não pelo autor**: o agente marcava o novo e dizia que "a equipe cancela o antigo" — mentira operacional que lota a agenda de fantasmas. Por isso `cancelar_evento` já entra na especificação.
- Num teste, o agente achou que um horário tinha sido "ocupado por outra pessoa" — era o evento DO PRÓPRIO cliente aparecendo na consulta. Decisão consciente da construção original: NÃO filtrar (um cliente pode querer dois procedimentos). Conte ao aluno; se incomodar, é escolha dele.
- **Por que o descadastro importa tanto:** cliente que não quer promoção e continua recebendo BLOQUEIA o número — e denúncias derrubam número até na API oficial. O botão de sair é a vacina.

**Quando pular:** WAHA sem templates → sem botões de template; mas a ferramenta `cancelar_evento` vale para QUALQUER caminho (remarcação existe em todo negócio com agenda) — faça ao menos ela.

---

## Passo 19 — O agrupador: mensagens em pedaços, resposta única

**Por quê:** gente de verdade escreve no WhatsApp em pedaços ("Oi" / "vocês fazem X?" / "quanto tá?") — e um agente que responde cada pedaço vira três respostas atropeladas para um pensamento só.

**O guia demonstra o problema (proposital):** mande por código 3 mensagens rápidas seguidas ("Oi" / "vocês fazem [serviço]?" / "quanto custa?") → cole as 3 respostas atropeladas. Explique em uma frase o que acontece hoje: cada mensagem que chega dispara um atendimento próprio e eles rodam ao mesmo tempo. Problema visto é problema entendido.

**O guia executa:**
> Quando uma mensagem chegar, o agente NÃO responde na hora — espera uns cinco segundos para ver se a pessoa continua escrevendo, e se chegar outra mensagem nesse intervalo o relógio REINICIA do zero. Só quando o cliente parar é que ele junta tudo e responde UMA única vez, como um pensamento só. Três garantias: nenhuma mensagem descartada (todas salvas no histórico, na ordem, inclusive as da espera); nunca dois atendimentos rodando ao mesmo tempo na mesma conversa (se um já estiver pensando, a mensagem nova entra na mesma resposta); e NÃO mexer no prompt, na base nem nas ferramentas — isso é só o jeito de receber e agrupar. Reiniciar e enviar ao Railway.

**O guia testa e mostra:** as mesmas 3 mensagens em pedaços rápidos → UMA resposta cobrindo as três coisas. E o teste do relógio: mandar, esperar 3 segundos, mandar de novo → ainda uma resposta só. Mostre as três mensagens no histórico, na ordem.

**Se falhar:**
1. Duas respostas mesmo assim → o relógio não está reiniciando a cada mensagem nova.
2. Mensagem "sumiu" → violação da garantia 1; todas têm que estar no histórico.
3. Resposta trava para sempre → o atendimento anterior não está liberando a conversa; confira a trava por conversa.

**Armadilha real:** a cláusula "não mexa no prompt, na base nem nas ferramentas" existe porque pedido de conserto sem cerca vira reforma geral — o construtor aproveita para "melhorar" o que ninguém pediu, e o que funcionava quebra. Escopo cirúrgico em TODA correção: toque só no que o passo pede e registre no progresso o que tocou.

**Quando pular:** não pule — este é barato, rápido, e é a diferença entre parecer robô e parecer gente. Funciona igual no sandbox, na API oficial e no WAHA.

**Fechando a fase 3:** progresso atualizado, e abra `referencias/fase-4.md` — a blindagem final.
