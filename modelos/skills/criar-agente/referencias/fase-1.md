# Fase 1 — O cérebro, no sandbox (passos 3–12)

Aqui nasce o agente inteiro — rodando só num chat de teste no navegador, sem WhatsApp. A ordem é proposital: cada peça entra separada para o aluno VER a diferença que ela faz (agente sem memória esquece, sem prompt é genérico, sem base inventa). Não junte passos "pra adiantar": o aluno que vê o antes e o depois sabe consertar o agente dele sozinho depois.

Nesta fase o aluno quase não para: você constrói, roda o teste pela API local do sandbox, cola a entrada e a resposta literal no chat, e explica. As pausas humanas são quatro: o rascunho do prompt (7), o material e o rascunho da constituição (9) e as duas idas ao Google (10). No fim fica o PORTÃO: ninguém atravessa para o WhatsApp sem o sandbox convencer.

---

## Passo 3 — O projeto vazio com a estrutura certa

**Por quê:** todo agente de IA se organiza em duas pastas — `skills` (documentos que dizem como agir) e `tools` (os códigos das ações) — e começar com a estrutura certa evita a bagunça que impede o projeto de crescer.

**O guia lê antes:** tipo e nome do negócio no progresso. A pasta do projeto é a pasta em que você está rodando (o LEIA-ME mandou criá-la antes de abrir o chat) — não peça para criar outra.

**O guia executa:**
> Criar um atendente de IA para [TIPO DE NEGÓCIO] chamado(a) [NOME DO NEGÓCIO], começando do zero. Por enquanto ele vai rodar somente num chat de teste no navegador — nada de WhatsApp ainda. Não criar ferramentas, prompt nem memória ainda. Organizar o projeto em duas pastas: `skills` (arquivos .md que dizem como agir) e `tools` (códigos das ações). Criar a primeira skill chamada `constituicao`, vazia por enquanto.

**O guia testa e mostra:** liste as pastas e os arquivos criados. `skills/constituicao.md` existe e está vazio.

**Se falhar:**
1. Arquivos foram parar fora da pasta do projeto — confira o diretório de trabalho.
2. Criou mais coisa do que devia (servidor, ferramentas) — apague; a constituição fica vazia.

**Armadilha real:** no pedido original havia "em JavaScript" e foi REMOVIDO de propósito — especificar linguagem de programação limita o construtor sem necessidade. Não deixe o aluno decidir tecnologia que ele não vai ler; escolha você a mais simples que resolve.

**Quando pular:** não pula — é a fundação.

---

## Passo 4 — A chave do OpenRouter no lugar certo

**Por quê:** a chave de API é a senha que paga as respostas do agente, e senha não se cola em chat — vai no arquivo `.env` que fica só no computador dele.

**O guia lê antes:** a chave já está no `.env` desde o passo 2. Não há visita ao site aqui.

**O guia testa e mostra:** confira de novo a chave pela API do OpenRouter e mostre o saldo. Confirme que `.gitignore` contém `.env` e `google-credentials.json`. Explique a lição do passo em uma frase: a chave vive no arquivo, o arquivo nunca sai do computador, e eu leio de lá sem nunca escrever o valor no chat.

**Se falhar:**
1. Chave inválida ("401") — copiada pela metade; recriar no OpenRouter e colar de novo no mesmo campo.
2. Saldo zero — colocar crédito.

**Armadilha real:** a regra "não cola a chave no chat" veio da construção original — chave colada em conversa fica gravada no histórico para sempre. O jeito certo é o arquivo, desde o primeiro dia.

**Quando pular:** não pula.

---

## Passo 5 — O chat de teste no navegador (sandbox)

**Por quê:** o sandbox é o laboratório onde errar é de graça — a gente conversa com o agente pelo navegador quantas vezes quiser antes de ele encostar num cliente de verdade.

**O guia executa:**
> Criar um chat de teste no navegador (um sandbox local, só para testes) onde o dono conversa com o atendente. Usar o modelo `anthropic/claude-sonnet-5` do OpenRouter, com a chave que está no `.env`, e mostrar a resposta aparecendo aos poucos (streaming). Expor também um endpoint simples para o guia mandar mensagens por código (os testes de todos os passos seguintes passam por ele). Subir o servidor.

**O guia testa e mostra (teste proposital — demonstre, não pergunte):** mande pela API "olá, quem é você?" e cole a resposta. Depois mande "me chamo [nome do aluno]" e, em OUTRA chamada, "qual é o meu nome?" — cole as duas respostas. O agente vai se apresentar como um assistente genérico da Anthropic e vai esquecer o nome. Diga: "isso está CERTO por enquanto; é o 'antes'. Nos próximos passos você vai ver ele ganhar memória e identidade." Entregue o endereço local: "abra no navegador quando quiser conversar com ele; não precisa me responder".

**Se falhar:**
1. Crédito zerado ou chave errada no OpenRouter (o erro cita "401" ou "credits") — confira pela API.
2. O servidor não subiu — suba você; confira a porta.
3. Dois servidores no ar — encerre tudo e suba um só.

**Armadilha real:** na construção original o teste "quem é você" respondeu "sou Claudio, assistente da Anthropic" — de propósito, para mostrar o que um agente sem prompt é. Use esse momento: é a melhor demonstração do porquê dos passos 7 e 8.

**Quando pular:** não pula — o sandbox é o laboratório de TODOS os passos seguintes.

---

## Passo 6 — Memória no Supabase

**Por quê:** um agente sem memória é um agente burro — o cliente diz "sim" e ele não sabe sim pra quê; a memória guarda as últimas mensagens de cada pessoa para a conversa ter pé e cabeça.

**O guia lê antes:** URL, chaves e senha do banco no `.env` (passo 2). Detecte se o MCP do Supabase está conectado; se não estiver, crie as tabelas você mesmo pela conexão direta com o banco (a senha está no `.env`) — não peça para o aluno rodar SQL no site.

**O guia executa:**
> Dar memória ao atendente, gravada no Supabase. Criar as tabelas necessárias para conversas e mensagens. Antes de cada resposta, ler as últimas 20 mensagens daquela pessoa, e reconhecer cliente que já conversou antes. Alterar SÓ a parte de memória — não modificar a constituição nem a chave de API. Reiniciar o servidor.

Anote no progresso os nomes das tabelas.

**O guia testa e mostra:** "me chamo [nome do aluno]" e, em outra chamada, "qual é o meu nome?" — cole as duas respostas; agora ele lembra. Mostre o registro no banco (conversa e mensagens) como evidência.

**Se falhar:**
1. Tabelas não foram criadas — confira no banco; crie pela conexão direta.
2. URL ou chave do Supabase erradas no `.env`.
3. Servidor não reiniciado depois das tabelas.

**Armadilha real:** o pedido original tinha, de propósito, a frase "altere só a memória, não modifique a constituição nem a chave" — porque construtor sem cerca mexe onde não deve. Você é o construtor agora: mantenha essa cerca em TODOS os passos que alteram o projeto, e registre no progresso exatamente o que tocou.

**Quando pular:** não pula. Sem memória, os passos de agendamento viram conversa de peixe.

---

## Passo 7 — O prompt de sistema (a identidade)

**Por quê:** o prompt é quem o agente É — sem ele o agente é um assistente genérico; com ele, é o recepcionista do SEU negócio, com o seu objetivo comercial.

**O guia lê antes:** nome e descrição do negócio no progresso (não pergunte de novo). Objetivo comercial e tom: deduza do tipo de negócio (barbearia e clínica: "conduzir até marcar um horário"; loja: "fechar o orçamento"; consultório: "marcar uma avaliação") — e mostre a dedução.

**O guia rascunha:** copie `modelos/prompt-agente-modelo.md` (desta skill) para a raiz do projeto como `prompt-agente.md`, preencha SÓ o bloco OBJETIVO e apague os comentários. As seções "Ferramentas", "Como agir" e "Nunca faça isso" ficam com os títulos e VAZIAS (elas se preenchem nos passos seguintes, por necessidade real, nunca por antecipação).

**Pausa humana (a) — uma pergunta:** mostre o bloco OBJETIVO rascunhado e diga de onde tirou cada frase. Pergunte: "é assim que você quer que o seu negócio atenda? Mude o que quiser — o prompt é seu." Explique o formato em meia frase: `#` com espaço vira título que o modelo entende; sem o espaço, não.

**O guia executa (depois da confirmação):**
> Usar o arquivo `prompt-agente.md` como prompt de sistema do atendente, relido a cada mensagem (para o dono poder editar o arquivo e ver o efeito sem reiniciar nada). NÃO alterar o conteúdo do arquivo — ele é do dono; só fazer o servidor usar ele.

Depois confira por código que as três seções seguem vazias.

**O guia testa e mostra:** "quem é você?" → cole a resposta: agora ele é o recepcionista do negócio, com o nome certo. Mostre o antes (passo 5) e o depois lado a lado. Bônus que impressiona: diga ao aluno "troque uma palavra no arquivo, salve, e pergunte de novo no navegador — a resposta muda sem reiniciar nada".

**Se falhar:**
1. Título sem espaço depois do `#` — o modelo ignora a seção.
2. O arquivo não está sendo relido — confirme o servidor reiniciado ao menos uma vez.

**Armadilha real (das grandes):** na construção original, o construtor PREENCHEU SOZINHO as seções vazias do prompt, sem ninguém pedir — e tudo foi apagado na hora, com a bronca: "não deixe o agente escrever o seu prompt; ele não sabe como você quer que o seu negócio atenda". Você é o construtor agora: NUNCA escreva conteúdo de negócio no prompt sem rascunho aprovado. As linhas técnicas de ferramentas (passos 8, 10, 11, 18) e de comportamento (12, 18, 21) você insere e mostra; as regras de atendimento são dele.

**Quando pular:** não pula — é a identidade do agente.

---

## Passo 8 — Ferramentas de verdade: a constituição como ferramenta

**Por quê:** a base de conhecimento NÃO entra no prompt — ela vira uma ferramenta que o agente consulta só quando precisa, porque carregar tudo em toda mensagem custa caro e aumenta a chance de o agente se confundir.

**O guia executa:** primeiro insira no `prompt-agente.md`, na seção **Ferramentas**, a linha (e mostre ao aluno que inseriu):
> `constituicao` — tudo sobre [NOME DO NEGÓCIO]: dados, serviços, preços, dúvidas frequentes, políticas e promoções ativas. Consulte sempre que a resposta depender de informação do negócio.

Depois:
> Implementar a ferramenta `constituicao` (function calling), que lê o arquivo `skills/constituicao.md` quando o atendente precisar de informação do negócio — com o atendente podendo usar a ferramenta, receber o resultado e pensar de novo antes de responder. A constituição NÃO pode entrar no prompt de sistema — ela só é lida quando a ferramenta for chamada. Reiniciar o servidor.

Confira por código: o conteúdo de `constituicao.md` não aparece na montagem do prompt de sistema; o nome da ferramenta no prompt e no código é idêntico; só um servidor está no ar.

**O guia testa e mostra (proposital, com a constituição ainda vazia):** "onde vocês ficam?" → cole a resposta: o agente ENROLA educadamente ("vou confirmar com a equipe..."). Diga: "viu? ele não inventou um endereço — mas também não soube responder. O próximo passo dá o conhecimento." Mostre que a ferramenta foi chamada (log da chamada).

**Se falhar:**
1. A constituição foi parar DENTRO do prompt de sistema (ver armadilha) — reverter.
2. Nome da ferramenta diferente entre prompt e código — têm que ser EXATAMENTE iguais.
3. Servidor antigo ainda rodando em outra porta — encerrar tudo e subir um só.

**Armadilha real (a mais repetida da história):** o construtor original fez exatamente o erro proibido — juntou a `constituicao.md` no prompt de sistema "para ajudar". Foi preciso explicar a arquitetura certa e mandar reverter. Segunda armadilha do mesmo dia: dois servidores rodando (um velho na porta 3000, um novo na 3001) — teste indo para o servidor errado.

**Quando pular:** não pula — function calling é o que transforma um chat num agente.

---

## Passo 9 — Preencher a constituição (o conhecimento do negócio)

**Por quê:** a constituição é a única fonte de verdade do agente — tudo que ele afirmar sobre preço, serviço e política tem que estar escrito aqui, senão ele inventa.

**O guia lê antes:** nome e descrição no progresso; qualquer material já encontrado na pasta no primeiro contato; se o negócio tem site ou perfil público, leia-o.

**Pausa humana 1 (b) — o material, de uma vez:**
> Agora o agente ganha o conhecimento do seu negócio. Me mande tudo que você já tem sobre ele, do jeito que estiver: PDF, cardápio de serviços, tabela de preços, texto do site, link do Instagram. Se não tiver nada pronto, escreva de uma vez só, num texto corrido: endereço, horários de cada dia, quem atende e o que faz, serviços com preço e duração, as perguntas que os clientes mais fazem, as regras de remarcação e pagamento, e promoções com validade.

**O guia rascunha:** copie `modelos/constituicao-modelo.md` para `skills/constituicao.md` e preencha com o material. Se veio PDF ou doc, converta para Markdown e LIMPE — só as informações do negócio, sem instruções de preenchimento nem enfeite. O que não estiver no material vira `[A PREENCHER]` — NUNCA invente. Apague os comentários do modelo.

**Pausa humana 2 (a, e) — uma confirmação:** mostre o arquivo rascunhado, a lista das lacunas `[A PREENCHER]` e peça: "confira cada número — é a informação do seu negócio, só você sabe se está certa. Preencha as lacunas que souber agora; as outras ficam em aberto e o agente responde 'confirmo com a equipe' nelas, então campo vazio não gera mentira, gera prudência."

**O guia testa e mostra:** "que serviços vocês oferecem?" e "onde fica?" → cole as respostas: lista real com preços reais, o endereço dele. Mostre que a ferramenta foi chamada.

**Se falhar:**
1. A ferramenta não foi chamada — confira o log.
2. Dado errado na própria constituição — o agente repete o que está escrito; corrija o arquivo, não o agente.

**Armadilha real:** o documento original veio de um PDF convertido que chegou SUJO — cheio de guias de "como preencher este formulário" no meio do conteúdo. Foi preciso pedir uma versão só com as informações. Documento sujo = agente que repete a sujeira para o cliente.

**Quando pular:** não pula — mas pode começar mínimo (serviços + horários + endereço) e engordar depois; o arquivo é vivo.

---

## Passo 10 — A agenda de verdade (Google Calendar)

**Por quê:** aqui o agente ganha mãos — deixa de só conversar e passa a AGIR: consultar horários livres e marcar de verdade numa agenda que o dono vê no celular.

**O guia lê antes:** se o negócio trabalha com hora marcada, deduza do OBJETIVO do prompt e da constituição (duração nos serviços, política de agendamento) — diga a dedução; só pergunte se ficar ambíguo. Horário de funcionamento (constituição §1), duração padrão (§2) e antecedência mínima (§4) saem da constituição — não pergunte.

**Pausa humana 1 (c) — Google Cloud, uma ida só (avise: são 10 minutos chatos e depois nunca mais):**
> 1. `console.cloud.google.com` → criar projeto (nome "agente [negócio]").
> 2. Menu → **APIs e serviços** → **Biblioteca** → buscar "Google Calendar API" → **Ativar**. Na mesma Biblioteca, buscar "Google Sheets API" → **Ativar** (vamos usar no próximo passo; é uma ativação separada).
> 3. **Credenciais** → **Criar credenciais** → **Conta de serviço** → nome "conta-agente" → papel **Básico > Proprietário** → concluir.
> 4. Clicar na conta criada → aba **Chaves** → **Adicionar chave** → **JSON** → baixa um arquivo no computador.
> 5. Arraste esse arquivo para a pasta do projeto, do lado do `.env` (não precisa renomear — eu renomeio). Esse arquivo é uma SENHA: nunca envie por WhatsApp ou e-mail. Me avise quando ele estiver na pasta.

**O guia executa entre as pausas:** detecte o arquivo na pasta, renomeie para `google-credentials.json` (se veio `.json.json`, corrija — o Windows esconde a extensão), leia o `client_email` e mostre-o ao aluno.

**Pausa humana 2 (c) — agenda e planilha, uma ida só:**
> Agora dois compartilhamentos com o e-mail da conta de serviço, que é: `[client_email]`.
> 1. `calendar.google.com` → criar uma agenda NOVA dedicada (nome "Atendimento [negócio]") → Configurações da agenda → **Compartilhar com pessoas específicas** → colar esse e-mail → permissão **"Fazer alterações e ver todos os detalhes"**. Nas mesmas configurações, copiar o **ID da agenda** (o código comprido, não o nome).
> 2. Criar uma planilha nova no Google Sheets (nome "clientes [negócio]") → **Compartilhar** → colar o mesmo e-mail → permissão **Editor**.
> Me mande o ID da agenda e o link da planilha (os dois podem vir aqui no chat; não são segredo).

Grave `GOOGLE_CALENDAR_ID` e `GOOGLE_SHEETS_ID` (extraído do link, entre `/d/` e `/edit`) no `.env`.

**O guia executa:**
> Conectar o atendente ao Google Calendar do negócio. Duas ferramentas: **ver horários livres** e **criar evento**. Usar a conta de serviço do arquivo `google-credentials.json` e a agenda do `.env`. Regras: funcionamento [HORÁRIOS POR DIA, da constituição], duração padrão de [X, da constituição] minutos por atendimento (fácil de mudar), nunca marcar no passado nem fora do expediente, nunca marcar em cima de horário ocupado (conferir o conflito de novo imediatamente antes de gravar, para dois clientes ao mesmo tempo não pegarem a mesma vaga), e sempre exigir o nome do cliente. Informar a data e a hora atuais ao atendente automaticamente. Reiniciar o servidor; o boot deve indicar a agenda LIGADA.

Insira os nomes exatos das duas ferramentas na seção Ferramentas do `prompt-agente.md`, com uma linha de descrição cada, e mostre ao aluno.

**O guia testa e mostra (em dupla):** (1) pela API, peça um horário como cliente "TESTE Agenda", confirme com nome → cole a conversa e, pela API da agenda, mostre o evento criado (título, data, ID). Diga: "abra a sua agenda do Google e veja o evento; não precisa me responder". (2) Simule um segundo cliente pedindo o MESMO horário → cole a recusa com alternativa. Apague o evento de teste ao fim do passo e registre.

**Se falhar:**
1. Agenda não compartilhada com o `client_email`, ou permissão só de leitura.
2. API não ativada — o erro da primeira chamada diz isso e traz o link.
3. ID da agenda errado (é o ID comprido das configurações, não o nome).
4. Servidor não reiniciado depois das credenciais.

**Armadilhas reais (este passo foi o mais acidentado da construção original — conte ao aluno):**
- **O agente "confirmou" um agendamento QUE NÃO EXISTIA** antes de as credenciais entrarem — com convicção total, até "venha sem maquiagem". Lição: agente sem ferramenta enrola com segurança de quem sabe; NUNCA confie no "está confirmado" — confie no evento lido pela API da agenda. É por isso que todo teste seu traz o ID do evento.
- O agente chamava o negócio pelo nome errado — e o erro estava no prompt escrito à mão. Erro de digitação no arquivo vira erro do agente.
- Um horário livre "sumiu" dos testes e parecia bug — na verdade o construtor tinha consultado a constituição e visto que nenhum serviço cabia naquele buraco. Antes de acusar erro, explique ao aluno POR QUE o agente fez o que fez.
- Testar com um modelo fraco fez o agente errar duração, nome do serviço e planilha. Modelo bom no agente não é luxo.

**Quando pular:** negócio sem hora marcada (ex.: loja que só tira dúvida) → faça só a pausa 1 e a parte da planilha da pausa 2, pule para o 11 e avise: os passos 18 (remarcar/cancelar) e parte do 20 (régua de "disse que agendou") deixam de existir para ele.

---

## Passo 11 — A planilha de clientes (Google Sheets)

**Por quê:** todo cliente que chama é um contato que vale ouro — a planilha guarda TODOS automaticamente, para promoção e remarketing depois, sem depender de ninguém anotar.

**O guia lê antes:** `GOOGLE_SHEETS_ID` já está no `.env` e a planilha já está compartilhada (passo 10). Não há pausa humana aqui.

**O guia executa:**
> Nova função: salvar todo cliente novo na planilha do Google (`.env`). Híbrido: o próprio servidor cria a linha no primeiro contato, com telefone/identificação e data — garantido, sem depender do modelo; e o atendente ganha uma ferramenta `salvar_cliente` para completar a MESMA linha com nome, interesse e se agendou, quando descobrir esses dados na conversa. Se o atendente marcar "agendou: sim" sem existir o horário de verdade na agenda, gravar "não" e avisá-lo. Reiniciar o servidor.

Insira `salvar_cliente` na seção Ferramentas do prompt e mostre.

**O guia testa e mostra:** conversa pela API como cliente NOVO ("TESTE Planilha") → leia a planilha pela API e mostre a linha criada na primeira mensagem; diga o nome e o interesse → mostre as células preenchidas. Diga: "abra a planilha e veja a linha; não precisa me responder". Apague a linha de teste ao fim e registre.

**Se falhar:**
1. Planilha não compartilhada como Editor com o `client_email`.
2. Sheets API não ativada (é uma ativação SEPARADA da Calendar).
3. ID errado (pegou o nome, não o trecho do link).

**Armadilha real:** a checagem "agendou sim só se a agenda confirmar" nasceu de teste real — o agente dizia "sim" na planilha sem o evento existir. Código confere o que é fato; IA interpreta o que é conversa. Essa divisão (código pro garantido, IA pro interpretado) é a regra de ouro do projeto inteiro.

**Quando pular:** quase nunca — mesmo negócio sem agenda quer a lista de contatos. Se pular, o funil do painel (passo 16) nasce manco.

---

## Passo 12 — Os sentidos: áudio e imagem viram texto

**Por quê:** gente de verdade manda áudio e foto no WhatsApp — o agente precisa transformar os dois em texto ANTES de pensar, senão metade das mensagens reais cai no vazio.

**O guia executa:**
> Logo no INÍCIO do fluxo, antes do atendente pensar: identificar se a mensagem é texto, áudio ou imagem. Texto passa direto. Áudio é transcrito para texto. Imagem vira uma descrição objetiva mais a transcrição de qualquer texto visível nela, e a legenda que o cliente mandou junto é preservada. Usar exatamente o modelo `google/gemini-3.5-flash` pelo OpenRouter para transcrever e analisar. Marcar no texto final se veio de áudio ou de imagem, e o restante do fluxo só vê texto. Isso NÃO é ferramenta do atendente — é uma etapa fixa antes dele. Adicionar no chat de teste um jeito de enviar áudio e imagem. Reiniciar o servidor.

Insira no prompt (seção "Como agir") a linha: tratar as marcações de áudio/imagem como fala normal do cliente, sem nunca mencioná-las. Mostre.

**O guia testa e mostra:** gere um áudio de teste por código (a voz do Windows, via System.Speech, dizendo uma pergunta do negócio, ex.: "quanto custa o [serviço]?") e passe pela API → cole a transcrição e a resposta. Gere uma imagem por código (um PNG com um texto de promoção) e envie com a pergunta "o que diz aí?" → cole a leitura. Diga: "grave um áudio no chat do navegador quando quiser; não precisa me responder".

**Se falhar:**
1. Modelo de transcrição sem as capacidades certas (ver armadilha) — o nome tem que ser o de um modelo que aceite áudio E imagem.
2. Crédito do OpenRouter (transcrição também consome) — confira pela API.
3. A triagem foi feita como ferramenta do agente em vez de etapa fixa — mover para o início do fluxo.

**Armadilha real:** o modelo principal do agente (Claude Sonnet) QUASE foi usado para transcrever — mas ele não ouve áudio. Foi preciso conferir na página do OpenRouter quais modalidades cada modelo aceita e escolher um que cobre áudio + imagem. Antes de escolher modelo para qualquer tarefa, confira o que ele enxerga.

**Quando pular:** dá para adiar se o público do aluno só digita — mas avise: no WhatsApp real, áudio é metade das mensagens; sem este passo o agente vai ignorar clientes.

---

## ⛔ O PORTÃO — fim da fase 1

Antes de abrir a fase 2, VOCÊ passa o agente pela prova de fogo no sandbox, como se fosse um cliente chato, e entrega o relatório com as respostas literais:

- Perguntar preço de um serviço → responde o valor da constituição, sem inventar.
- Pedir algo que o negócio NÃO faz → nega com elegância, sem inventar serviço.
- Agendar, de ponta a ponta → evento lido pela API da agenda + linha lida pela API da planilha (IDs no relatório).
- Mandar um áudio sintético → entendido.
- Nova conversa com o mesmo cliente → é reconhecido.

Apague os dados de teste e registre. Se qualquer item falhar, volte ao passo correspondente.

**Pausa humana (a, d) — a única desta fase que é decisão:** mostre o relatório e pergunte: "o agente convence? A partir do próximo passo começa a custar dinheiro (hospedagem) e, depois, o número de verdade. Quer ajustar algo antes de sair do laboratório?" Diga a frase da casa: **"errar aqui custou um prompt; errar no WhatsApp custa dinheiro e pode custar o número"**. Só com o sim dele, atualize o progresso e abra `referencias/fase-2.md`.
