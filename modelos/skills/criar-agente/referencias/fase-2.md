# Fase 2 — Pro mundo real (passos 13–15)

O agente convence no sandbox — agora ele vai para uma casa própria na internet e ganha um número de WhatsApp. A ordem importa: primeiro a hospedagem (passo 13), porque o WhatsApp exige um endereço público para entregar as mensagens; depois a DECISÃO de qual porta do WhatsApp usar (passo 14); só então a conexão (passo 15).

---

## Passo 13 — A casa própria: GitHub + Railway

**Por quê:** o agente precisa rodar num servidor ligado 24h com um endereço público — o GitHub guarda o projeto e o Railway o mantém no ar, atualizando sozinho a cada mudança.

**Antes, pergunte/prepare:**
- Conta no GitHub (`github.com`) e no Railway (`railway.app` — tem plano de ~US$5/mês; explique que é o "aluguel" do agente).
- Se possível, MCPs do GitHub e do Railway conectados ao editor (senão, os passos manuais no navegador funcionam igual).

**Pedido pronto pra colar:**
> Crie um repositório privado no GitHub com o nome `[nome-do-projeto]` e salve este projeto lá. Depois crie um projeto no Railway com o mesmo nome, sincronizado com esse repositório do GitHub.

Se a sincronização GitHub↔Railway não sair pelo chat, guie no navegador: painel do Railway → New Project → Deploy from GitHub repo → escolher o repositório → Deploy.

**Depois do deploy, as variáveis (o passo que mais quebra — faça com calma):**
1. Explique: o `.env` NÃO vai para o GitHub (está no `.gitignore`, de propósito) — então o Railway nasce sem nenhuma chave e o agente lá nasce "burro".
2. No Railway: serviço → aba **Variables** → editor **Raw** → colar TODAS as variáveis do `.env` de uma vez (sem os comentários).
3. **A pegadinha do Google:** o arquivo `google-credentials.json` também nunca sai do computador. Crie no Railway uma variável `GOOGLE_CREDENCIAIS_JSON` com o CONTEÚDO INTEIRO do arquivo colado como valor — e peça ao construtor: "faça o servidor aceitar as credenciais do Google pela variável `GOOGLE_CREDENCIAIS_JSON` quando o arquivo não existir".
4. Enviar a mudança ao GitHub ("envie as mudanças para o GitHub") — o Railway atualiza sozinho.

**Teste que prova:** abrir a URL pública que o Railway gerou (Settings → Networking → Generate Domain) e ver o sandbox funcionando NELA — inclusive um agendamento de teste, para provar que a agenda funciona na hospedagem.

**Se falhar:**
1. Variáveis não coladas (ou coladas com comentário no meio) — o deploy sobe mas o agente não responde.
2. `GOOGLE_CREDENCIAIS_JSON` faltando → tudo funciona MENOS agenda e planilha (o sintoma clássico: "não consigo consultar a agenda em tempo real").
3. Deploy antigo no ar — conferir no Railway se o último deploy é de agora.

**Armadilha real (a que mais enganou na construção original):** dias depois de conectar o WhatsApp, o agente "parou de conseguir usar a agenda" — e parecia culpa do WhatsApp. Não era: o `google-credentials.json` estava no `.gitignore`, nunca subiu ao GitHub e portanto nunca existiu no Railway. O problema não era o WhatsApp, era ONDE o agente passou a rodar. Este guia antecipa a variável no item 3 acima exatamente para o aluno não repetir isso.

**Quando pular:** só se o aluno quiser rodar tudo do próprio computador ligado 24h — desaconselhe: computador desliga, internet cai, cliente fica no vácuo.

---

## Passo 14 — A decisão: API oficial da Meta ou WAHA (não oficial)

**Por quê:** existem duas portas de entrada para o WhatsApp — a oficial (paga, com regras e garantia da Meta) e a não oficial (grátis, sem garantia nenhuma) — e essa escolha é uma CONTA de negócio, não de tecnologia.

**Não tem código neste passo. Apresente a comparação e faça a conta COM o aluno:**

| | **API oficial (Meta)** | **WAHA (não oficial)** |
|---|---|---|
| Como conecta | app no painel da Meta + verificação da empresa (passo 1) | escaneando QR Code, como WhatsApp Web |
| Custo por mensagem | cliente inicia = grátis por 24h de janela; marketing ≈ R$0,32/msg; utilidade (lembrete) bem mais barato | R$ 0, sempre |
| Custo fixo | hospedagem (~R$30/mês) | hospedagem (~R$30/mês) |
| O celular | o número SAI do aplicativo — só o agente responde (por isso o painel do dono, fase 3) | celular continua normal; WAHA é "mais um aparelho conectado" |
| Risco | muito baixo dentro das regras; garantido pela Meta | é CONTRA os termos do WhatsApp: banimento sem aviso, sem suporte, número perdido PARA SEMPRE |
| Templates/botões | sim (fase 3 completa) | não existem — passos 17 e 23 não se aplicam |

**A conta a fazer:** pergunte o volume dele (conversas/mês, lembretes/mês, disparos de promoção/mês) e estime os dois cenários. Referência da construção original: 2.000 conversas + 500 lembretes + campanha para 2.000 clientes ≈ R$700/mês na oficial vs R$30/mês no WAHA. Regra de bolso dita na aula: o que bane não é volume, é DENÚNCIA — responder quem te chamou dificilmente bane; metralhar marketing em massa, sim. Empresa média/grande: oficial, sem dúvida. Pequena: WAHA é defensável, sabendo do risco.

**A regra inegociável (nos DOIS caminhos):** o número do agente é um número NOVO, dedicado, comprado para isso (chip pré-pago ou plataforma de números) — **NUNCA o número oficial da empresa**, que os clientes têm salvo. Se o número for um ativo do negócio, ele não entra em agente de IA. Sem exceção.

**Aviso de honestidade:** as regras e preços da Meta estavam mudando em 2026 (fim anunciado da janela grátis, novo "Meta Business Agent" cobrado por uso). Diga ao aluno para conferir os valores atuais antes de fechar a conta — os números acima são a fotografia de quando este guia foi escrito.

**Teste que prova:** o aluno declara a escolha e o porquê em uma frase. Anote no arquivo de progresso — os passos 15, 17 e 23 dependem disso.

**Quando pular:** não pula — mas a escolha não é definitiva: o passo 15 guarda uma versão de segurança exatamente para trocar de caminho depois sem dor.

---

## Passo 15 — Conectar o WhatsApp

**Por quê:** é a hora de ligar o cérebro testado ao mundo real — a mensagem do cliente vai chegar pela internet ao seu agente e a resposta vai voltar pelo WhatsApp dele.

**Primeiro, nos dois caminhos: a versão de segurança.** Peça ao construtor: "crie uma versão de segurança (branch) chamada `antes-do-whatsapp` e salve no GitHub". Explique: é uma foto do projeto funcionando — se algo der errado, a gente volta para ela; e se um dia o aluno quiser trocar de caminho (oficial ↔ WAHA), é ela que permite.

### Caminho A — API oficial da Meta

**Antes, confira:** verificação do passo 1 APROVADA (business.facebook.com → Central de Segurança). Se ainda estiver em análise, pare aqui e faça outra coisa — não dá para pular essa espera. E o número novo dedicado já comprado, com chip ativo para receber SMS.

**Etapa 1 — o app na Meta (clique a clique):**
1. `developers.facebook.com` → **Meus apps** → **Criar app** → caso de uso "Conectar-se com clientes pelo WhatsApp" → vincular o portfólio empresarial verificado.
2. No app: **WhatsApp** → **Configuração da API**. A Meta dá um número de TESTE — use-o primeiro.
3. Copiar (você vai pondo no `.env` e no Railway): o **Phone Number ID** (é o ID, não o telefone), o **token temporário** (avise: MORRE EM 24H, é só para o teste de hoje), e em Configurações do app → Básico, a **Chave Secreta do App**. Guarde também o **WABA ID** (aparece na mesma tela) — vai servir na fase 3.
4. Inventar um **token de verificação** (qualquer palavra-senha, ex.: `[negocio]-webhook-2026`) — ela vai no `.env` E no painel da Meta, igualzinha nos dois.

**Etapa 2 — o pedido pronto pra colar:**
> Meu agente já funciona completo no sandbox. Agora quero conectar ele no WhatsApp de verdade, pela API oficial da Meta. Crie o webhook que recebe as mensagens do WhatsApp, conecta na automação que já existe e devolve a resposta pelo próprio WhatsApp. Ignore as mensagens que eu mesmo mandar pelo aplicativo do celular (os "ecos"), aceite áudio e imagem baixando a mídia da Meta e passando pelo mesmo transcritor do sandbox, e fatie respostas maiores que o limite do WhatsApp. As chaves vão em variáveis de ambiente, sem mexer nas que já existem. Antes de qualquer coisa, me diga o que eu preciso pegar no painel da Meta e onde colar cada coisa.

**Etapa 3 — registrar o webhook na Meta:** no app → WhatsApp → **Configuração** → Webhook: URL de callback = o domínio do Railway **com `https://` na frente e `/webhook` no final**; token de verificação = a palavra-senha inventada; clicar **Verificar e salvar**; depois, em campos do webhook, **assinar o campo `messages`**.

**Etapa 4 — do teste pro real:** funcionou com o número de teste? Agora: **Adicionar número de telefone** → dados do negócio → verificar o número novo por SMS → PIN de 6 dígitos; cadastrar **forma de pagamento** (vem em dólar, é normal); gerar o **token permanente** (business.facebook.com → Configurações do negócio → **Usuários do sistema** → criar/gerar token com as permissões de WhatsApp) e trocar no Railway o token temporário e o Phone Number ID do teste pelos definitivos.

**Teste que prova:** mandar "olá" de outro celular para o número → o agente responde; seguir até AGENDAR → evento na agenda do Google. Só então avise: o número saiu do aplicativo do celular — a partir de agora, quem vê as conversas é o painel da fase 3.

**Se falhar, na ordem de quem mais erra:**
1. **"Não foi possível validar o URL de callback ou o token de verificação"** → o token de verificação no Railway não bate com o do painel — MUITO cuidado com variável duplicada (ver armadilha) — ou a URL está sem `https://` ou sem `/webhook`.
2. Webhook verificado mas nada chega → campo `messages` não assinado.
3. Chega mas não responde → token errado/vencido (o temporário morreu em 24h?) ou Phone Number ID do número antigo de teste.
4. Responde mas diz que "teve um problema técnico" ao agendar → volta ao passo 13, item 3 (credencial do Google no Railway).

**Armadilhas reais (as três desta etapa na construção original):**
- **A verificação falhou ao vivo** porque existiam DUAS variáveis de token de verificação no Railway — uma criada pelo construtor (vazia) e uma criada à mão (com o valor). O servidor lia a vazia. Ao colar variáveis, confira se o construtor já criou uma com outro nome — valor vai na que o CÓDIGO lê, e a sobra se apaga.
- O domínio do Railway vem SEM o `https://` — colado puro no painel da Meta, falha.
- Dias depois, "deu problema técnico" nas respostas — era o token temporário de 24h que tinha morrido no meio do caminho. Token permanente não é opcional.

### Caminho B — WAHA (não oficial)

**Antes:** o número novo dedicado num celular em mãos (vai escanear QR Code); conta Railway.

**Pedido pronto pra colar:**
> Em vez da API oficial, quero usar a API não oficial com o WAHA. Use o MCP do WAHA (https://github.com/seejux/waha-whatsapp-mcp) e hospede o WAHA num novo projeto no Railway. Configure tudo: o WAHA recebendo as mensagens do WhatsApp e entregando para a automação que já existe, e a resposta voltando pelo WhatsApp. Aponte tudo para o Railway — NADA de servidor local nem túnel. Depois eu escaneio o QR Code para conectar o número.

**Depois, à mão (2 minutos):** abrir o painel do WAHA (o construtor te dá o link e a senha) → editar o worker (ícone de lápis) → colar a API key (está nas variáveis do projeto WAHA no Railway) → salvar. Aí: ícone de câmera/Login mostra o **QR Code** → no celular do número dedicado: WhatsApp → três pontos → **Dispositivos conectados** → **Conectar dispositivo** → escanear. Status deve ficar **"working"**.

**Teste que prova:** mandar "olá" de outro número → aparece "digitando..." e o agente responde; seguir até agendar → evento na agenda.

**Se falhar:**
1. Sessão não está "working" → escanear de novo; QR Code expira rápido.
2. API key não colada no painel do WAHA → mensagens chegam mas nada acontece.
3. O webhook do WAHA apontando para o lugar errado → tem que apontar para a URL pública do agente no Railway, não para `localhost`.

**Armadilhas reais:**
- O construtor sugeriu conectar via túnel no computador local — foi recusado na hora: servidor local é para quem quer economizar hospedagem deixando o PC ligado para sempre. Railway nos dois lados.
- **Todo número escaneado no painel do WAHA passa a ser respondido pelo agente, SEMPRE.** Na construção original, uma sessão de demonstração foi criada e apagada na sequência — sessão esquecida é um número da sua vida virando robô sem você lembrar.
- Reforce o combinado do passo 14: esse número pode ser banido a qualquer momento, sem aviso. Se doeria perder, não era para estar aqui.

**Quando pular o passo 15 inteiro:** nunca — ele é o destino. Mas pode ficar "de molho" esperando a verificação da Meta; nesse caso, adiante a fase 3 no sandbox (o painel do passo 16 funciona sem WhatsApp).

**Fechando a fase 2:** progresso atualizado com o caminho conectado, e abra `referencias/fase-3.md`.
