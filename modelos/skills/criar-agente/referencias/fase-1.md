# Fase 1 — O cérebro, no sandbox (passos 3–12)

Aqui nasce o agente inteiro — rodando só num chat de teste no navegador, sem WhatsApp. A ordem é proposital: cada peça entra separada para o aluno VER a diferença que ela faz (agente sem memória esquece, sem prompt é genérico, sem base inventa). Não junte passos "pra adiantar": o aluno que vê o antes e o depois sabe consertar o agente dele sozinho depois.

No fim desta fase fica o PORTÃO: ninguém atravessa para o WhatsApp sem o sandbox convencer.

---

## Passo 3 — O projeto vazio com a estrutura certa

**Por quê:** todo agente de IA se organiza em duas pastas — `skills` (documentos que dizem como agir) e `tools` (os códigos das ações) — e começar com a estrutura certa evita a bagunça que impede o projeto de crescer.

**Antes, pergunte:** o tipo de negócio e o nome (você já deve ter do arquivo de progresso). Peça para ele criar uma pasta nova e vazia no computador com o nome do projeto (ex.: `atendimento-[nome-do-negocio]`) e abrir essa pasta no Antigravity.

**Pedido pronto pra colar:**
> Quero criar um atendente de IA para [TIPO DE NEGÓCIO, ex.: uma barbearia] chamado(a) [NOME DO NEGÓCIO], começando do zero. Por enquanto ele vai rodar somente num chat de teste no navegador — nada de WhatsApp ainda. Não crie ferramentas, prompt nem memória ainda. Organize o projeto em duas pastas: `skills` (arquivos .md que dizem como agir) e `tools` (códigos das ações). Crie a primeira skill chamada `constituicao`, vazia por enquanto.

**Teste que prova:** as pastas `skills/` e `tools/` existem no projeto, com um `constituicao.md` vazio dentro de `skills/`.

**Se falhar:**
1. A pasta aberta no editor não é a pasta nova — os arquivos foram parar em outro lugar.
2. O pedido gerou mais coisa do que devia (servidor, ferramentas) — sem problema grave, mas confira se a constituição está vazia.

**Armadilha real:** no pedido original havia "em JavaScript" e foi REMOVIDO de propósito — especificar linguagem de programação limita o construtor sem necessidade. Não deixe o aluno (nem você) decidir tecnologia que ele não vai ler.

**Quando pular:** não pula — é a fundação.

---

## Passo 4 — A chave do OpenRouter no lugar certo

**Por quê:** a chave de API é a senha que paga as respostas do agente, e senha não se cola em chat — vai num arquivo chamado `.env` que fica só no computador dele.

**Antes:** guie o clique a clique para criar a chave: `openrouter.ai` → ícone do perfil → **Keys** → **Create Key** → dê um nome (ex.: "agente [negócio]") → copie a chave (ela só aparece uma vez).

**Como fazer (você executa, ele cola):** crie você o arquivo `.env` na raiz do projeto com o conteúdo `OPENROUTER_API=""` e diga: "abra o arquivo `.env` que acabei de criar, cole a sua chave entre as aspas e salve (Ctrl+S). NÃO cole a chave aqui no chat." Crie também um `.gitignore` já contendo `.env` e `google-credentials.json` (explique: é a lista do que nunca sai do computador dele).

**Teste que prova:** ele confirma que o `.env` tem a chave entre aspas e que salvou.

**Se falhar:**
1. Esqueceu o Ctrl+S — a causa nº 1 de "não funciona" em arquivo editado à mão.
2. Copiou a chave pela metade — ela é longa; recriar no OpenRouter se perdeu.

**Armadilha real:** a regra "não cola a chave no chat" veio da construção original — chave colada em conversa fica gravada no histórico para sempre. O jeito certo é o arquivo, desde o primeiro dia.

**Quando pular:** não pula.

---

## Passo 5 — O chat de teste no navegador (sandbox)

**Por quê:** o sandbox é o laboratório onde errar é de graça — a gente conversa com o agente pelo navegador quantas vezes quiser antes de ele encostar num cliente de verdade.

**Antes:** nada novo — usa a chave do passo 4.

**Pedido pronto pra colar:**
> Crie um chat de teste no navegador (um sandbox local, só para testes) onde eu converso com o atendente. Use o modelo `anthropic/claude-sonnet-5` do OpenRouter, com a chave que está no `.env`, e mostre a resposta aparecendo aos poucos (streaming). Depois me diga como abrir esse chat.

**Teste que prova (e é proposital):** abrir o endereço local no navegador e mandar "olá, quem é você?". O agente vai responder como um assistente genérico da Anthropic, SEM saber que é do negócio dele — e vai esquecer o nome dele entre mensagens. Diga ao aluno: "isso está CERTO por enquanto; é o 'antes'. Nos próximos passos você vai ver ele ganhar memória e identidade."

**Se falhar:**
1. Crédito zerado ou chave errada no OpenRouter (o erro costuma citar "401" ou "credits").
2. O servidor não está rodando — peça "execute o servidor" ao construtor (você executa; o aluno não abre terminal).
3. Endereço errado no navegador — confirme a porta que o construtor informou.

**Armadilha real:** na construção original o teste "quem é você" respondeu "sou Claudio, assistente da Anthropic" — de propósito, para mostrar o que um agente sem prompt é. Use esse momento: é a melhor demonstração do porquê dos passos 7 e 8.

**Quando pular:** não pula — o sandbox é o laboratório de TODOS os passos seguintes.

---

## Passo 6 — Memória no Supabase

**Por quê:** um agente sem memória é um agente burro — o cliente diz "sim" e ele não sabe sim pra quê; a memória guarda as últimas mensagens de cada pessoa para a conversa ter pé e cabeça.

**Antes, clique a clique no Supabase:**
1. `supabase.com` → **New project** → nome (ex.: "atendimento [negócio]"), senha forte (guardar!), região **South America (São Paulo)**.
2. Nas opções de segurança que aparecerem: NÃO expor tabelas novas automaticamente e manter a proteção de linha (RLS) ligada — se a tela oferecer, aceite o padrão mais fechado.
3. Copiar a **URL do projeto** (Settings → API) e me mandar. (A URL pode; as chaves do Supabase vão pro `.env` se o construtor pedir.)

Verifique se o MCP do Supabase está conectado ao editor; se não estiver, guie a conexão ou peça ao construtor as instruções — sem ele, o construtor não consegue criar as tabelas sozinho e vai te dar um SQL para você rodar pelo site do Supabase (SQL Editor → colar → Run).

**Pedido pronto pra colar:**
> Quero que o atendente tenha memória, gravada no Supabase. Crie as tabelas necessárias para conversas e mensagens. Antes de cada resposta, leia as últimas 20 mensagens daquela pessoa, e reconheça cliente que já conversou antes. Altere SÓ a parte de memória — não modifique a constituição nem a chave de API. No final, me informe os nomes das tabelas criadas. A URL do meu projeto Supabase é: [URL]

**Teste que prova:** no sandbox, mandar "me chamo [nome do aluno]" e depois, em OUTRA mensagem, "qual é o meu nome?" — o agente tem que lembrar.

**Se falhar:**
1. Tabelas não foram criadas (MCP desconectado) — rodar o SQL pelo site do Supabase.
2. URL ou chave do Supabase erradas no `.env`.
3. O construtor criou as tabelas mas o servidor não foi reiniciado — peça "reinicie o servidor".

**Armadilha real:** o pedido original tinha, de propósito, a frase "altere só a memória, não modifique a constituição nem a chave" — porque construtor sem cerca mexe onde não deve. Mantenha essa cerca em TODOS os pedidos que alteram o projeto.

**Quando pular:** não pula. Sem memória, os passos de agendamento viram conversa de peixe.

---

## Passo 7 — O prompt de sistema (a identidade)

**Por quê:** o prompt é quem o agente É — sem ele o agente é um assistente genérico; com ele, é o recepcionista do SEU negócio, com o seu objetivo comercial.

**Antes, pergunte (e anote no progresso):**
- Nome do negócio e o que ele faz, em uma frase.
- O OBJETIVO COMERCIAL de cada conversa: aonde o agente deve conduzir o cliente? (ex.: agendar uma avaliação gratuita, marcar um horário, fechar um orçamento, chamar no balcão)
- O tom: caloroso? formal? descontraído?

**Como fazer:** copie `modelos/prompt-agente-modelo.md` (desta skill) para o projeto do aluno como `prompt-agente.md`, preenchendo o bloco OBJETIVO com os dados dele. IMPORTANTE: preencha SÓ o OBJETIVO — as seções "Ferramentas", "Como agir" e "Nunca faça isso" ficam com os títulos e VAZIAS (elas se preenchem nos passos seguintes, por necessidade real, nunca por antecipação). Explique o formato: `#` com espaço vira título que o modelo entende; sem o espaço, não.

**Pedido pronto pra colar:**
> Use o arquivo `prompt-agente.md` como prompt de sistema do atendente, relido a cada mensagem (para eu poder editar o arquivo e ver o efeito sem reiniciar nada). NÃO altere o conteúdo do arquivo — ele é meu; só faça o servidor usar ele.

**Teste que prova:** no sandbox, "quem é você?" → agora ele responde como o recepcionista do negócio, com o nome certo. Bônus que impressiona: mudar uma palavra no arquivo, salvar, perguntar de novo — a resposta muda sem reiniciar.

**Se falhar:**
1. Esqueceu de salvar o arquivo (Ctrl+S).
2. Título sem espaço depois do `#` — o modelo ignora a seção.
3. O construtor não religou o arquivo — confirme que o servidor foi reiniciado ao menos uma vez após a mudança.

**Armadilha real (das grandes):** na construção original, o construtor PREENCHEU SOZINHO as seções vazias do prompt, sem ninguém pedir — e tudo foi apagado na hora, com a bronca: "não deixe o agente escrever o seu prompt; ele não sabe como você quer que o seu negócio atenda". Confira o arquivo depois do pedido: se apareceram seções preenchidas que o aluno não escreveu, apague e avise o construtor para não alterar o prompt.

**Quando pular:** não pula — é a identidade do agente.

---

## Passo 8 — Ferramentas de verdade: a constituição como ferramenta

**Por quê:** a base de conhecimento NÃO entra no prompt — ela vira uma ferramenta que o agente consulta só quando precisa, porque carregar tudo em toda mensagem custa caro e aumenta a chance de o agente se confundir.

**Antes:** nada novo.

**Como fazer:** primeiro o aluno (ou você, editando por ele) adiciona no `prompt-agente.md`, na seção **Ferramentas**, a linha:
> `constituicao` — tudo sobre [NOME DO NEGÓCIO]: dados, serviços, preços, dúvidas frequentes, políticas e promoções ativas. Consulte sempre que a resposta depender de informação do negócio.

**Pedido pronto pra colar:**
> Adicionei no prompt uma ferramenta chamada `constituicao`, que lê o arquivo `skills/constituicao.md` quando o atendente precisar de informação do negócio. Implemente essa ferramenta (function calling), com o atendente podendo usar a ferramenta, receber o resultado e pensar de novo antes de responder. A constituição NÃO pode entrar no prompt de sistema — ela só é lida quando a ferramenta for chamada.

**Teste que prova (proposital, com a constituição ainda vazia):** perguntar "onde vocês ficam?" → o agente vai ENROLAR educadamente ("vou confirmar com a equipe..."). Diga ao aluno: "viu? ele não inventou um endereço — mas também não soube responder. O próximo passo dá o conhecimento."

**Se falhar:**
1. O construtor colocou a constituição DENTRO do prompt de sistema (ver armadilha) — mandar reverter.
2. O nome da ferramenta no prompt está diferente do nome no código — os nomes têm que ser EXATAMENTE iguais.
3. Servidor antigo ainda rodando em outra porta — peça para o construtor encerrar tudo e subir um só.

**Armadilha real (a mais repetida da história):** o construtor original fez exatamente o erro proibido — juntou a `constituicao.md` no prompt de sistema "para ajudar". Foi preciso explicar a arquitetura certa e mandar reverter. Depois do pedido, PERGUNTE ao construtor onde a constituição está sendo lida; se a resposta citar "prompt de sistema", corrija na hora. Segunda armadilha do mesmo dia: dois servidores rodando (um velho na porta 3000, um novo na 3001) — teste indo para o servidor errado.

**Quando pular:** não pula — function calling é o que transforma um chat num agente.

---

## Passo 9 — Preencher a constituição (o conhecimento do negócio)

**Por quê:** a constituição é a única fonte de verdade do agente — tudo que ele afirmar sobre preço, serviço e política tem que estar escrito aqui, senão ele inventa.

**Antes, colete com o aluno, seção por seção (NUNCA invente por ele):**
1. Dados do negócio: nome, endereço, referência, estacionamento, telefone, redes sociais.
2. Horário de funcionamento, dia a dia.
3. Quem atende: profissionais/atendentes, especialidade de cada um, dias de cada um.
4. Serviços com preço e duração de cada um.
5. Perguntas que os clientes mais fazem (e as respostas).
6. Políticas: agendamento, remarcação/cancelamento, atraso, pagamento.
7. Promoções vigentes, com validade.

**Como fazer:** copie `modelos/constituicao-modelo.md` (desta skill) para `skills/constituicao.md` do projeto e preencha com o que ele respondeu. O que ele não souber na hora vira `[A PREENCHER]` — e explique: o agente foi instruído a responder "confirmo com a equipe" quando esbarrar nesses campos, então campo vazio não gera mentira, gera prudência. Se o aluno já tem o material num PDF ou doc: peça o arquivo, converta você para Markdown (modelos de IA trabalham muito melhor com Markdown) e LIMPE — só as informações do negócio, sem instruções de preenchimento nem enfeite.

**Teste que prova:** "que serviços vocês oferecem?" → lista real com preços reais; "onde fica?" → o endereço dele. Peça para o aluno conferir cada número — é a informação DELE, só ele sabe se está certa.

**Se falhar:**
1. Salvou sem Ctrl+S ou editou o arquivo errado.
2. A ferramenta não está sendo chamada — pergunte ao construtor se a ferramenta `constituicao` foi usada na resposta.
3. Dado errado na própria constituição — o agente repete o que está escrito; corrija o arquivo, não o agente.

**Armadilha real:** o documento original veio de um PDF convertido que chegou SUJO — cheio de guias de "como preencher este formulário" no meio do conteúdo. Foi preciso pedir uma versão só com as informações. Documento sujo = agente que repete a sujeira para o cliente.

**Quando pular:** não pula — mas pode começar mínimo (serviços + horários + endereço) e engordar depois; o arquivo é vivo.

---

## Passo 10 — A agenda de verdade (Google Calendar)

**Por quê:** aqui o agente ganha mãos — deixa de só conversar e passa a AGIR: consultar horários livres e marcar de verdade numa agenda que o dono vê no celular.

**Antes, pergunte:**
- O negócio trabalha com horário marcado? (Se não: ver "quando pular".)
- Horário de funcionamento e regras de agendamento (antecedência mínima, duração padrão).

**Clique a clique do Google (a parte mais burocrática do projeto — avise que são 10 minutos chatos e depois nunca mais):**
1. `console.cloud.google.com` → criar projeto (ex.: "agente [negócio]").
2. Menu → **APIs e serviços** → **Biblioteca** → buscar "Google Calendar API" → **Ativar**.
3. **Credenciais** → **Criar credenciais** → **Conta de serviço** → nome (ex.: "conta-agente") → papel **Básico > Proprietário** → concluir.
4. Clicar na conta criada → aba **Chaves** → **Adicionar chave** → **JSON** → baixa um arquivo no computador.
5. Renomear o arquivo baixado para `google-credentials.json` — CUIDADO para não ficar `google-credentials.json.json` (o Windows esconde a extensão; se der erro depois, é isso). Arrastar o arquivo para a raiz do projeto, do lado do `.env`.
6. Avise: esse arquivo é uma SENHA. Já está no `.gitignore` do passo 4 — nunca enviar por WhatsApp/e-mail.
7. No `calendar.google.com` do dono: criar uma agenda NOVA dedicada (ex.: "Atendimento [negócio]") → Configurações da agenda → **Compartilhar com pessoas específicas** → colar o e-mail da conta de serviço (campo `client_email` dentro do JSON — abra e copie para ele) → permissão **"Fazer alterações e ver todos os detalhes"** → nas mesmas configurações, copiar o **ID da agenda**.
8. Você adiciona `GOOGLE_CALENDAR_ID="..."` no `.env` com o ID que ele te passar.

**Pedido pronto pra colar:**
> Quero conectar o atendente ao Google Calendar do negócio. São duas ferramentas: **ver horários livres** e **criar evento**. Use a conta de serviço do arquivo `google-credentials.json` e a agenda do `.env`. Regras: funcionamento [HORÁRIOS POR DIA], duração padrão de [X] minutos por atendimento (deixe fácil de mudar), nunca marcar no passado nem fora do expediente, nunca marcar em cima de horário ocupado (confira o conflito de novo imediatamente antes de gravar, para dois clientes ao mesmo tempo não pegarem a mesma vaga), e sempre exigir o nome do cliente. Informe a data e a hora atuais ao atendente automaticamente. Eu mesmo vou editar o prompt para adicionar essas ferramentas — NÃO altere o prompt.

Depois da implementação, pergunte ao construtor os NOMES EXATOS que as ferramentas ganharam e adicione-os você na seção Ferramentas do `prompt-agente.md`, com uma linha de descrição cada.

**Teste que prova (em dupla):** (1) no sandbox, pedir um horário → o agente consulta, oferece opções válidas e, ao confirmar com nome, o evento APARECE na agenda do Google (mandar o aluno abrir e VER); (2) simular um segundo cliente pedindo o MESMO horário → tem que ser recusado com alternativa.

**Se falhar:**
1. Agenda não compartilhada com o `client_email`, ou permissão só de leitura.
2. Arquivo `google-credentials.json.json` (extensão dupla).
3. ID da agenda errado no `.env` (é o ID comprido das configurações, não o nome).
4. Servidor não reiniciado depois das credenciais — o boot deve indicar a agenda LIGADA.

**Armadilhas reais (este passo foi o mais acidentado da construção original — conte ao aluno):**
- **O agente "confirmou" um agendamento QUE NÃO EXISTIA** antes de as credenciais entrarem — com convicção total, até "venha sem maquiagem". Lição: agente sem ferramenta enrola com segurança de quem sabe; NUNCA confie no "está confirmado" — confie no evento visível na agenda.
- O agente chamava o negócio pelo nome errado — e o erro estava no prompt escrito à mão pelo próprio autor. Erro de digitação seu vira erro do agente.
- Um horário livre "sumiu" dos testes e parecia bug — na verdade o construtor tinha consultado a constituição e visto que nenhum serviço cabia naquele buraco. Antes de acusar erro, pergunte ao construtor POR QUE ele fez o que fez.
- Testar com um modelo fraco fez o agente errar duração, nome do serviço e planilha. Modelo bom no agente não é luxo, é o que dispensa páginas de instrução.

**Quando pular:** negócio sem hora marcada (ex.: loja que só tira dúvida) → pule para o 11, avisando: os passos 18 (remarcar/cancelar) e parte do 20 (régua de "disse que agendou") deixam de existir para ele.

---

## Passo 11 — A planilha de clientes (Google Sheets)

**Por quê:** todo cliente que chama é um contato que vale ouro — a planilha guarda TODOS automaticamente, para promoção e remarketing depois, sem depender de ninguém anotar.

**Antes, clique a clique (rápido, aproveita o projeto do passo 10):**
1. No `console.cloud.google.com`, mesmo projeto → Biblioteca → "Google Sheets API" → **Ativar**.
2. Criar uma planilha nova no Google Sheets (ex.: "clientes [negócio]") → **Compartilhar** → colar o mesmo `client_email` → permissão **Editor**.
3. Copiar o ID da planilha (o trecho comprido da barra de endereço, entre `/d/` e `/edit`) → você adiciona `GOOGLE_SHEETS_ID="..."` no `.env`.

**Pedido pronto pra colar:**
> Nova função: salvar todo cliente novo na planilha do Google (`.env`). Faça híbrido: o próprio servidor cria a linha no primeiro contato, com telefone/identificação e data — garantido, sem depender do modelo; e o atendente ganha uma ferramenta `salvar_cliente` para completar a MESMA linha com nome, interesse e se agendou, quando descobrir esses dados na conversa. Se o atendente marcar "agendou: sim" sem existir o horário de verdade na agenda, grave "não" e avise-o. Não altere o prompt — eu adiciono a ferramenta lá.

Adicione você o `salvar_cliente` na seção Ferramentas do prompt.

**Teste que prova:** abrir a planilha numa aba e o sandbox na outra; conversar como cliente NOVO → a linha aparece sozinha na primeira mensagem; dizer o nome e o interesse → as células se preenchem na frente dele.

**Se falhar:**
1. Planilha não compartilhada como Editor com o `client_email`.
2. Sheets API não ativada (é uma ativação SEPARADA da Calendar).
3. ID errado (pegaram o nome, não o trecho da URL).

**Armadilha real:** a checagem "agendou sim só se a agenda confirmar" nasceu de teste real — o agente dizia "sim" na planilha sem o evento existir. Código confere o que é fato; IA interpreta o que é conversa. Essa divisão (código pro garantido, IA pro interpretado) é a regra de ouro do projeto inteiro.

**Quando pular:** quase nunca — mesmo negócio sem agenda quer a lista de contatos. Se pular, o funil do painel (passo 16) nasce manco.

---

## Passo 12 — Os sentidos: áudio e imagem viram texto

**Por quê:** gente de verdade manda áudio e foto no WhatsApp — o agente precisa transformar os dois em texto ANTES de pensar, senão metade das mensagens reais cai no vazio.

**Antes:** nada novo (usa o OpenRouter que já existe).

**Pedido pronto pra colar:**
> Logo no INÍCIO do fluxo, antes do atendente pensar: identifique se a mensagem é texto, áudio ou imagem. Texto passa direto. Áudio é transcrito para texto. Imagem vira uma descrição objetiva mais a transcrição de qualquer texto visível nela, e a legenda que o cliente mandou junto é preservada. Use exatamente o modelo `google/gemini-3.5-flash` pelo OpenRouter para transcrever e analisar. Marque no texto final se veio de áudio ou de imagem, e o restante do fluxo só vê texto. Isso NÃO é ferramenta do atendente — é uma etapa fixa antes dele. Adicione no chat de teste um jeito de eu enviar áudio e imagem para testar.

Adicione você no prompt (seção "Como agir") uma linha: tratar as marcações de áudio/imagem como fala normal do cliente, sem nunca mencioná-las.

**Teste que prova:** gravar um áudio no sandbox perguntando algo do negócio → resposta correta como se fosse texto; enviar uma foto com texto (ex.: um cartaz de promoção) e perguntar sobre ela → o agente lê o conteúdo da imagem.

**Se falhar:**
1. Modelo de transcrição sem as capacidades certas (ver armadilha) — o nome tem que ser o de um modelo que aceite áudio E imagem.
2. Crédito do OpenRouter (transcrição também consome).
3. O construtor fez a triagem como ferramenta do agente em vez de etapa fixa — mandar mover para o início do fluxo.

**Armadilha real:** o modelo principal do agente (Claude Sonnet) QUASE foi usado para transcrever — mas ele não ouve áudio. Foi preciso conferir na página do OpenRouter quais modalidades cada modelo aceita e escolher um que cobre áudio + imagem. Antes de escolher modelo para qualquer tarefa, confira o que ele enxerga.

**Quando pular:** dá para adiar se o público do aluno só digita — mas avise: no WhatsApp real, áudio é metade das mensagens; sem este passo o agente vai ignorar clientes.

---

## ⛔ O PORTÃO — fim da fase 1

Antes de abrir a fase 2, faça o aluno passar o agente por esta prova de fogo no sandbox, como se fosse um cliente chato:

- Perguntar preço de um serviço → responde o valor da constituição, sem inventar.
- Pedir algo que o negócio NÃO faz → nega com elegância, sem inventar serviço.
- Agendar, de ponta a ponta → evento na agenda + linha na planilha, conferidos NO Google.
- Mandar um áudio → entendido.
- Voltar no dia seguinte (ou nova conversa) → é reconhecido.

Se qualquer item falhar, volte ao passo correspondente. Diga a frase da casa: **"errar aqui custou um prompt; errar no WhatsApp custa dinheiro e pode custar o número"**. Só com os cinco itens verdes, atualize o progresso e abra `referencias/fase-2.md`.
