# Fase 2 — Pro mundo real (passos 13–15)

O agente convence no sandbox — agora ele vai para uma casa própria na internet e ganha um número de WhatsApp. A ordem importa: primeiro a hospedagem (passo 13), porque o WhatsApp exige um endereço público para entregar as mensagens; depois a DECISÃO de qual porta do WhatsApp usar (passo 14); só então a conexão (passo 15).

Nesta fase as pausas são inevitáveis (contas, pagamento, cliques na Meta, celular na mão) — então cada site é visitado UMA vez, e você prepara tudo que dá ANTES de mandá-lo ao site, para a ida render inteira.

---

## Passo 13 — A casa própria: GitHub + Railway

**Por quê:** o agente precisa rodar num servidor ligado 24h com um endereço público — o GitHub guarda o projeto e o Railway o mantém no ar, atualizando sozinho a cada mudança.

**O guia detecta antes:** login no GitHub (`gh auth status`) e no Railway (`railway whoami`). Instale as duas ferramentas de linha de comando se faltarem — o aluno não precisa saber.

**Pausa humana (b, d) — uma mensagem:**
> Vamos dar uma casa ao agente. Crie uma conta no `github.com` (guarda o projeto) e uma no `railway.app` (mantém o agente no ar; tem plano de uns US$ 5/mês — é o "aluguel" do agente, e o Railway vai pedir um cartão). Quando tiver as duas, me avise: eu vou abrir duas janelas de autorização no seu navegador, uma de cada site, e você só clica em autorizar.

Rode os logins; espere as duas autorizações.

**O guia executa:**
> Criar um repositório privado no GitHub com o nome `[nome-do-projeto]` e salvar o projeto lá. Criar um projeto no Railway com o mesmo nome, sincronizado com esse repositório. Fazer o servidor aceitar as credenciais do Google pela variável `GOOGLE_CREDENCIAIS_JSON` quando o arquivo não existir. Enviar TODAS as variáveis do `.env` ao Railway pela linha de comando (sem comentários), mais `GOOGLE_CREDENCIAIS_JSON` com o conteúdo inteiro do arquivo. Gerar o domínio público. Enviar as mudanças ao GitHub e esperar o deploy.

Explique em uma frase: o `.env` e o `google-credentials.json` nunca saem do computador (estão no `.gitignore`, de propósito), então o Railway nasce sem nenhuma chave e eu copio tudo pra lá por código. Registre no progresso os NOMES das variáveis enviadas.

**O guia testa e mostra:** chame a URL pública e mostre o sandbox respondendo NELA; faça um agendamento de teste pela URL pública e mostre o evento lido pela API da agenda (prova de que agenda e planilha funcionam na hospedagem). Apague o teste. Diga: "abra [URL] no navegador; é o seu agente na internet". 

**Se falhar:**
1. Variáveis não chegaram (ou com comentário no meio) — o deploy sobe mas o agente não responde; liste as variáveis do serviço e compare com o `.env`.
2. `GOOGLE_CREDENCIAIS_JSON` faltando → tudo funciona MENOS agenda e planilha (o sintoma clássico: "não consigo consultar a agenda em tempo real").
3. Deploy antigo no ar — conferir se o último deploy é de agora.

**Armadilha real (a que mais enganou na construção original):** dias depois de conectar o WhatsApp, o agente "parou de conseguir usar a agenda" — e parecia culpa do WhatsApp. Não era: o `google-credentials.json` estava no `.gitignore`, nunca subiu ao GitHub e portanto nunca existiu no Railway. O problema não era o WhatsApp, era ONDE o agente passou a rodar. Este guia antecipa a variável exatamente para o aluno não repetir isso. Segunda lição: colar variáveis à mão no painel "Raw" era o passo que mais quebrava — por isso agora vai por código.

**Quando pular:** só se o aluno quiser rodar tudo do próprio computador ligado 24h — desaconselhe: computador desliga, internet cai, cliente fica no vácuo.

---

## Passo 14 — A decisão: API oficial da Meta ou WAHA (não oficial)

**Por quê:** existem duas portas de entrada para o WhatsApp — a oficial (paga, com regras e garantia da Meta) e a não oficial (grátis, sem garantia nenhuma) — e essa escolha é uma CONTA de negócio, não de tecnologia.

**O guia lê antes:** tipo e porte do negócio no progresso; se a verificação da Meta (passo 1) foi iniciada. Busque na internet os preços ATUAIS da Meta para o Brasil (conversa de marketing, utilidade, janela de 24h) antes de montar a tabela — as regras estavam mudando em 2026 (fim anunciado da janela grátis, novo "Meta Business Agent" cobrado por uso) e os números abaixo são a fotografia de quando este guia foi escrito.

**Apresente a comparação já com a conta feita para o porte dele:**

| | **API oficial (Meta)** | **WAHA (não oficial)** |
|---|---|---|
| Como conecta | app no painel da Meta + verificação da empresa (passo 1) | escaneando QR Code, como WhatsApp Web |
| Custo por mensagem | cliente inicia = grátis por 24h de janela; marketing ≈ R$0,32/msg; utilidade (lembrete) bem mais barato | R$ 0, sempre |
| Custo fixo | hospedagem (~R$30/mês) | hospedagem (~R$30/mês) |
| O celular | o número SAI do aplicativo — só o agente responde (por isso o painel do dono, fase 3) | celular continua normal; WAHA é "mais um aparelho conectado" |
| Risco | muito baixo dentro das regras; garantido pela Meta | é CONTRA os termos do WhatsApp: banimento sem aviso, sem suporte, número perdido PARA SEMPRE |
| Templates/botões | sim (fase 3 completa) | não existem — passos 17 e 23 não se aplicam |

Referência da construção original: 2.000 conversas + 500 lembretes + campanha para 2.000 clientes ≈ R$700/mês na oficial vs R$30/mês no WAHA. Regra de bolso dita na aula: o que bane não é volume, é DENÚNCIA — responder quem te chamou dificilmente bane; metralhar marketing em massa, sim. Empresa média/grande: oficial, sem dúvida. Pequena: WAHA é defensável, sabendo do risco.

**A regra inegociável (nos DOIS caminhos):** o número do agente é um número NOVO, dedicado, comprado para isso (chip pré-pago ou plataforma de números) — **NUNCA o número oficial da empresa**, que os clientes têm salvo. Se o número for um ativo do negócio, ele não entra em agente de IA. Sem exceção. Diga já: "providencie o chip novo — o passo 15 precisa dele na mão".

**Pausa humana (a) — uma pergunta:** "oficial ou WAHA? Se me disser seu volume (conversas, lembretes e disparos por mês), eu refaço a conta com os seus números." Anote a escolha e o porquê no progresso — os passos 15, 17 e 23 dependem disso.

**Quando pular:** não pula — mas a escolha não é definitiva: o passo 15 guarda uma versão de segurança exatamente para trocar de caminho depois sem dor.

---

## Passo 15 — Conectar o WhatsApp

**Por quê:** é a hora de ligar o cérebro testado ao mundo real — a mensagem do cliente vai chegar pela internet ao seu agente e a resposta vai voltar pelo WhatsApp dele.

**O guia lê antes:** o caminho escolhido, no progresso. Não pergunte de novo.

**Primeiro, nos dois caminhos — o guia executa:** crie uma versão de segurança (branch) chamada `antes-do-whatsapp` e salve no GitHub. Explique: é uma foto do projeto funcionando — se algo der errado, a gente volta para ela; e se um dia o aluno quiser trocar de caminho (oficial ↔ WAHA), é ela que permite.

### Caminho A — API oficial da Meta

**O guia executa ANTES da ida à Meta** (é isso que faz a visita render numa ida só):
> Conectar o agente ao WhatsApp pela API oficial da Meta. Criar o webhook que recebe as mensagens do WhatsApp, conecta na automação que já existe e devolve a resposta pelo próprio WhatsApp. Ignorar as mensagens que o próprio dono mandar pelo aplicativo do celular (os "ecos"), aceitar áudio e imagem baixando a mídia da Meta e passando pelo mesmo transcritor do sandbox, e fatiar respostas maiores que o limite do WhatsApp. As chaves vão em variáveis de ambiente, sem mexer nas que já existem: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WABA_ID`, `WHATSAPP_VERIFY_TOKEN`.

Invente você o token de verificação (uma palavra-senha, ex.: `[negocio]-webhook-2026`), grave no `.env` e envie ao Railway junto com o código. Deixe no `.env` os outros quatro campos vazios e comentados. Faça o deploy e confira que `https://[domínio]/webhook` responde ao desafio de verificação. Só então mande o aluno à Meta.

**Pausa humana 1 (b, c) — uma ida à Meta, tudo de uma vez:**
> Antes: confira em `business.facebook.com` → Central de Segurança se a verificação do passo 1 está **aprovada**. Se ainda estiver em análise, pare aqui e me avise — a gente adianta a fase 3 enquanto espera.
> 1. `developers.facebook.com` → **Meus apps** → **Criar app** → caso de uso "Conectar-se com clientes pelo WhatsApp" → vincular o portfólio empresarial verificado.
> 2. No app: **WhatsApp** → **Configuração da API**. A Meta dá um número de TESTE — vamos usar ele primeiro. Nessa tela, em "Para", adicione o SEU celular como destinatário de teste (ela manda um código).
> 3. Copie para o `.env`, nos campos que já deixei prontos: o **Phone Number ID** (é o ID, não o telefone), o **token temporário** (ele MORRE em 24h, é só para o teste de hoje), o **WABA ID** (mesma tela) e, em Configurações do app → Básico, a **Chave Secreta do App**.
> 4. Ainda no app: WhatsApp → **Configuração** → Webhook → **Editar**: URL de callback = `https://[domínio do Railway]/webhook` (copie exatamente assim); token de verificação = `[a palavra-senha que inventei]`. Clique **Verificar e salvar**. Depois, em campos do webhook, **assine o campo `messages`**.
> Salve o `.env` (Ctrl+S) e me avise.

Envie os valores novos ao Railway por código e espere o deploy. Registre no progresso os nomes das variáveis.

**Pausa humana 2 (c) — o teste do número de teste:**
> Mande "olá" do seu celular para o número de teste que apareceu na tela da Meta. Não precisa me contar o que ele respondeu — eu vejo chegar.

Leia o banco: mostre a mensagem recebida e a resposta enviada. Se nada chegar em dois minutos, percorra "se falhar".

**Pausa humana 3 (b, c, d) — do teste pro real, uma ida só:**
> Funcionou. Agora o número de verdade — tenha o chip novo no celular para receber SMS:
> 1. No app: WhatsApp → **Adicionar número de telefone** → dados do negócio → verificar o número novo por SMS → PIN de 6 dígitos.
> 2. Cadastrar a **forma de pagamento** (vem em dólar, é normal).
> 3. Gerar o **token permanente**: `business.facebook.com` → Configurações do negócio → **Usuários do sistema** → criar um usuário → gerar token marcando as permissões de WhatsApp (mensagens E gestão). Cole no `.env` no lugar do token temporário, e cole o novo **Phone Number ID** no lugar do de teste. Salve.
> 4. Mande "olá" de OUTRO celular para o número novo e siga a conversa até agendar um horário.

Envie os valores definitivos ao Railway. Leia o banco e a agenda: mostre a conversa e o evento (ID). Só então avise: o número saiu do aplicativo do celular — a partir de agora, quem vê as conversas é o painel da fase 3.

**Se falhar, na ordem de quem mais erra:**
1. **"Não foi possível validar o URL de callback ou o token de verificação"** → o token de verificação no Railway não bate com o do painel — confira que existe UMA variável com esse nome (ver armadilha) — ou a URL está sem `https://` ou sem `/webhook`.
2. Webhook verificado mas nada chega → campo `messages` não assinado.
3. Chega mas não responde → token errado/vencido (o temporário morreu em 24h?) ou Phone Number ID do número antigo de teste.
4. Responde mas diz que "teve um problema técnico" ao agendar → volta ao passo 13 (credencial do Google no Railway).

**Armadilhas reais (as três desta etapa na construção original):**
- **A verificação falhou ao vivo** porque existiam DUAS variáveis de token de verificação no Railway — uma criada pelo construtor (vazia) e uma criada à mão (com o valor). O servidor lia a vazia. Antes de cada envio ao Railway, liste as variáveis do serviço e apague sobras.
- O domínio do Railway vem SEM o `https://` — colado puro no painel da Meta, falha. Por isso você entrega a URL já montada.
- Dias depois, "deu problema técnico" nas respostas — era o token temporário de 24h que tinha morrido no meio do caminho. Token permanente não é opcional.

### Caminho B — WAHA (não oficial)

**O guia executa:**
> Usar a API não oficial com o WAHA. Hospedar o WAHA num novo projeto no Railway (a partir da imagem oficial), com API key gerada por código e guardada nas variáveis dos dois projetos. Criar a sessão do WhatsApp pela API do WAHA, já com o webhook apontando para a URL pública do agente no Railway — NADA de servidor local nem túnel. Fazer o agente receber as mensagens do WAHA, entregá-las à automação que já existe e devolver a resposta pelo WhatsApp, com "digitando..." antes de responder. Usar o MCP do WAHA (https://github.com/seejux/waha-whatsapp-mcp) se ajudar na integração.

Baixe pela API do WAHA a imagem do QR Code da sessão e abra-a na tela do aluno (salve como arquivo na pasta e abra).

**Pausa humana 1 (b, c):**
> No celular do número NOVO (o chip dedicado): WhatsApp → três pontos → **Dispositivos conectados** → **Conectar dispositivo** → escaneie o QR Code que abri na sua tela. Ele expira rápido — se expirar, me avise que eu gero outro.

Faça polling do status da sessão até **"working"** e mostre.

**Pausa humana 2 (c):**
> Mande "olá" de outro celular para o número novo e siga até agendar. Não precisa me contar — eu vejo chegar.

Leia o banco e a agenda: mostre a conversa e o evento (ID).

**Se falhar:**
1. Sessão não está "working" → gerar novo QR; expira rápido.
2. Webhook do WAHA apontando para o lugar errado → tem que ser a URL pública do agente no Railway, nunca `localhost`.
3. API key diferente entre os dois projetos → mensagens chegam mas nada acontece.

**Armadilhas reais:**
- O construtor sugeriu conectar via túnel no computador local — foi recusado na hora: servidor local é para quem quer economizar hospedagem deixando o PC ligado para sempre. Railway nos dois lados.
- **Todo número escaneado no WAHA passa a ser respondido pelo agente, SEMPRE.** Na construção original, uma sessão de demonstração foi criada e apagada na sequência — sessão esquecida é um número da sua vida virando robô sem você lembrar. Crie UMA sessão, com o nome do negócio, e registre no progresso.
- Reforce o combinado do passo 14: esse número pode ser banido a qualquer momento, sem aviso. Se doeria perder, não era para estar aqui.

**Quando pular o passo 15 inteiro:** nunca — ele é o destino. Mas pode ficar "de molho" esperando a verificação da Meta; nesse caso, adiante a fase 3 no sandbox (o painel do passo 16 funciona sem WhatsApp).

**Fechando a fase 2:** progresso atualizado com o caminho conectado e o log do que foi criado (variáveis, sessão), e abra `referencias/fase-3.md`.
