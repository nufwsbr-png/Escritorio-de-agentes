# Fase 1 — O cérebro, na bancada (passos 4–12)

Aqui nasce o agente inteiro — rodando só em cima das amostras, em modo ensaio, sem encostar em dado real. A ordem é proposital: cada peça entra separada para o aluno VER a diferença que ela faz (agente sem identidade é genérico, sem base inventa, sem memória repete trabalho). Não junte passos "pra adiantar" — mas também não pare esperando: nesta fase você constrói, roda e mostra. As únicas pausas são confirmar o rascunho da base (passo 8), colar credencial quando um módulo exigir (passo 10 ou 12) e julgar, no portão, os casos que a comparação automática não decidiu.

No fim desta fase fica o PORTÃO: ninguém liga o agente em dado real sem acertar todas as amostras.

---

## Passo 4 — A pasta do agente com a estrutura certa

**Por quê:** todo agente de tarefa se organiza nas mesmas pastas — o que ele é, o que ele sabe, o que ele faz, o que ele lembra, onde ele treina, onde ele entrega — e começar com a estrutura certa evita a bagunça que impede o projeto de crescer.

**O que você lê antes:** a missão e as amostras do passo 3 já estão na pasta do projeto (você está nela).

**Pergunta ao aluno:** nenhuma.

**O que você executa:** crie `CLAUDE.md` na raiz contendo só o título `# [NOME DO AGENTE]`; `skills/base-conhecimento/SKILL.md` vazio, só com o título; `tools/`; `memoria/`; `saidas/`; `quarentena/`; `.env` vazio; `.gitignore` com `.env`, `amostras/`, `saidas/`, `memoria/` e `quarentena/`. Confira que `amostras/caso-NN/` tem `entrada/` e `esperado.md` (passo 3). Não escolha linguagem de programação ainda; não crie ferramentas, lançador nem memória.

**Teste (você confere):** as pastas existem, `missao.md` está na raiz, cada caso tem entrada e gabarito. Mostre a árvore em uma mensagem e siga.

**Se falhar:**
1. Você está em outra pasta — o diretório de trabalho tem que ser a pasta do agente.
2. Criou mais do que devia — confira que `CLAUDE.md` tem só o título.

**Armadilha conhecida:** no pedido original do atendente havia "em JavaScript" e foi REMOVIDO de propósito — especificar linguagem limita sem necessidade. Escolha a linguagem no passo 5 pelo que já existe na máquina (o que estiver instalado), e não a anuncie ao aluno.

**Quando pular:** não pula — é a fundação.

---

## Passo 5 — O lançador e a primeira rodada em ensaio (a bancada)

**Por quê:** o lançador é quem acorda o agente — ele chama o Claude Code sem ninguém digitar, entrega o caso, guarda tudo que aconteceu e confere o resultado; o modo ensaio é o laboratório onde errar é de graça.

**O que você lê antes:** `referencias/chamada-isolada.md` inteiro. Confirme por código que o Claude Code está disponível na máquina (`claude --help` ou equivalente) e quais parâmetros a versão instalada aceita.

**Pergunta ao aluno:** nenhuma.

**O que você executa:** o programa `rodar`, chamado com um caso (ex.: `amostras/caso-01`), que (1) chama o Claude Code em modo não interativo com esta pasta como diretório de trabalho, passando como tarefa "trate a entidade em [caminho] conforme a missão; modo: ensaio"; (2) em ENSAIO libera só leitura e exige que o agente termine escrevendo `saidas/[caso]/plano.md` com o que faria, passo a passo, sem fazer; (3) grava TUDO de cada rodada em `saidas/[caso]/rodada-[data-hora]/`: tarefa enviada, resposta completa, ferramentas usadas, identificador da sessão, duração; (4) tem limite de turnos e de tempo. Confira sua própria implementação com o checklist da referência; nunca dê permissão de escrita "para facilitar".

**Teste (você roda; mostre como demonstração):** rode `caso-01` em ensaio e mostre o `plano.md`: o agente descreve genericamente o que faria, SEM conhecer as regras do negócio (nem sabe que a pasta tem subpasta X, nem qual modelo de petição usar). Diga ao aluno, em duas frases: "isso é o 'antes'. Nos próximos passos ele ganha identidade, conhecimento e memória, e você vai ver a diferença neste mesmo caso." Não espere resposta.

**Se falhar:**
1. Claude Code não encontrado ou não logado — avise ao aluno que é preciso logar no editor (única coisa que ele faz aqui).
2. Rodou em outra pasta — o diretório de trabalho tem que ser a pasta do agente.
3. Permissões bloqueando até a leitura — ensaio precisa poder LER.
4. Rodada travou — faltou o limite de turnos/tempo.

**Armadilha conhecida:** na construção do atendente, o teste "quem é você?" respondeu "sou um assistente da Anthropic" — de propósito, para mostrar o que um agente sem identidade é. O `plano.md` genérico deste passo é o mesmo momento. É a melhor demonstração do porquê dos passos 6 e 7 — mostre, não pergunte.

**Quando pular:** não pula — o lançador é a bancada de TODOS os passos seguintes e, lá na frente, o motor de produção.

---

## Passo 6 — A identidade (o CLAUDE.md)

**Por quê:** o `CLAUDE.md` é quem o agente É — o Claude Code lê esse arquivo sozinho toda vez que acorda naquela pasta; sem ele o agente é um assistente genérico, com ele é o funcionário do negócio, com a missão dele.

**O que você lê antes:** a missão (nome do agente, tarefa, entidade, o que fazer quando faltar informação — já está lá).

**Pergunta ao aluno:** nenhuma.

**O que você executa:** copie `modelos/CLAUDE-modelo.md` para `CLAUDE.md`, preenchendo SÓ a Identidade com os dados da missão. O comportamento na dúvida vem da seção "Quando faltar informação" da missão. Retire a linha de "tendência conhecida a evitar" se não houver nada na missão — as lições do passo 18 cobrem isso com dado real, não com palpite. As seções "Ferramentas", "Como agir" e "Nunca faça isso" ficam com os títulos e VAZIAS. Crie `memoria/licoes.md` a partir de `modelos/licoes-modelo.md`, só com o título e a regra (o modelo importa `missao.md` e `memoria/licoes.md`; ambos precisam existir). Não mexa no lançador: o Claude Code lê o `CLAUDE.md` sozinho — confira no log da rodada que ele entrou.

**Teste (você roda; mostre):** rode o `caso-01` em ensaio de novo → o `plano.md` agora fala como o agente do negócio, chama a entidade pelo nome certo, cita a missão. Mostre o antes e o depois lado a lado em três linhas. Bônus de demonstração: mude uma palavra da identidade, rode, mostre que o plano mudou sem mexer em código. Desfaça a mudança.

**Se falhar:**
1. Lançador rodando em outra pasta — o `CLAUDE.md` só é lido se a pasta do agente for o diretório de trabalho.
2. Título sem espaço depois do `#` — o modelo ignora a seção.
3. A importação `@missao.md` não resolveu — caminho errado ou arquivo faltando.

**Armadilha conhecida (das grandes):** na construção do atendente, o construtor PREENCHEU SOZINHO as seções vazias do prompt, sem ninguém pedir — e tudo foi apagado na hora, com a bronca: "não deixe o agente escrever o seu prompt; ele não sabe como você quer que o seu negócio trabalhe". Aqui o construtor é você: resista. As três seções só ganham linhas quando um passo mandar, e cada linha vem da missão, da base ou de uma lição aprovada — nunca da sua imaginação.

**Quando pular:** não pula — é a identidade do agente.

---

## Passo 7 — A base de conhecimento como skill (consultada, não carregada)

**Por quê:** as regras do negócio NÃO entram na identidade — viram uma skill que o agente consulta só quando precisa, porque carregar tudo em toda rodada custa caro e aumenta a chance de ele se confundir.

**O que você lê antes:** nada novo.

**Pergunta ao aluno:** nenhuma.

**O que você executa:** adicione no `CLAUDE.md`, seção Ferramentas, a linha: "`base-conhecimento` (skill em `skills/base-conhecimento/`) — tudo sobre como [NOME DO NEGÓCIO] faz esta tarefa: regras, nomes, estrutura, modelos de saída, exceções. Consulte sempre que uma decisão depender de regra do negócio. Se a regra não estiver lá, NÃO invente: registre 'regra não encontrada: [qual]' no plano e siga pela opção mais segura." Garanta que a skill tem o cabeçalho (nome e descrição) que faz o Claude Code carregá-la SOB DEMANDA, na pasta onde ele procura skills nesta versão (`skills/` ou `.claude/skills/` — você confere, e se precisar cria um atalho de uma para a outra). O conteúdo NÃO entra no `CLAUDE.md` nem na tarefa da rodada.

**Teste (você roda; mostre como demonstração, com a base ainda vazia):** rode o `caso-01` em ensaio → o `plano.md` registra "regra não encontrada" para as decisões de negócio (onde vai cada arquivo; qual modelo de petição) e escolhe a opção segura, em vez de inventar uma estrutura. Diga ao aluno: "viu? ele não chutou — mas também não soube decidir. O próximo passo dá o conhecimento." Siga.

**Se falhar:**
1. A base foi parar DENTRO do `CLAUDE.md` ou da tarefa — reverta.
2. O agente inventou regra mesmo assim — a frase "NÃO invente" não está na linha da ferramenta.
3. A skill não é encontrada — cabeçalho faltando ou pasta errada para esta versão do Claude Code.

**Armadilha conhecida (a mais repetida da história):** o construtor do atendente juntou a base no prompt de sistema "para ajudar". Foi preciso explicar a arquitetura e mandar reverter. Você é o construtor agora: confira no log da rodada ONDE a base foi lida. Se foi injetada, corrija.

**Quando pular:** não pula — consulta sob demanda é o que mantém o agente leve com mil regras.

---

## Passo 8 — Preencher a base (rascunhada das amostras, confirmada pelo dono)

**Por quê:** a base é a única fonte de verdade do agente — toda regra, nome de pasta, modelo e exceção que ele aplicar tem que estar escrita aqui, senão ele improvisa.

**O que você lê antes (é daqui que sai o rascunho):**
- As amostras: a pasta `esperado/` de cada caso revela a estrutura de pastas e o padrão de nomes (deduza o padrão comparando os nomes de todos os casos); o documento final revela o modelo, as seções obrigatórias e quais documentos de entrada alimentam cada seção.
- O `esperado.md` de cada caso e as diferenças entre casos anotadas no passo 3: viram exceções ("quando X, então Y").
- A missão: "pronto quando" vira critérios de qualidade; "quando faltar informação" vira a seção 6.
- Se houver material do negócio (um manual, um modelo `.docx`, um PDF de procedimento) na pasta ou que o aluno citou: converta para Markdown e LIMPE — só regras e conteúdo, sem instruções de preenchimento. Modelos de documento vão em `skills/base-conhecimento/modelos/`.

**Pergunta ao aluno:** só depois do rascunho, e só o que não deu para inferir. Mostre a base rascunhada inteira e marque as lacunas com `[A PREENCHER]`. Pergunte as lacunas UMA por vez, e só as que importam para as amostras passarem (o resto fica `[A PREENCHER]` e o agente pergunta no passo 17 quando esbarrar). Para cada campo de modelo de documento sem origem clara, pergunte "de onde sai [campo]?".

**O que você executa:** copie `modelos/base-conhecimento-modelo.md` para `skills/base-conhecimento/SKILL.md` e preencha com o rascunho; corrija com as respostas dele.

**Teste (você roda; ele confere o que é dele):** rode o `caso-01` em ensaio → o `plano.md` cita as regras REAIS (as subpastas certas, o modelo certo, o nome certo) e o plano bate com o `esperado.md`. Compare você plano e gabarito item a item e mostre a comparação; peça ao aluno para olhar só os itens em que plano e gabarito divergem — é a regra DELE, só ele sabe qual está certo.

**Se falhar:**
1. A skill não foi carregada na rodada — veja o log; cabeçalho ou pasta.
2. Regra errada na própria base — o agente repete o que está escrito; corrija o arquivo, não o agente.
3. Padrão de nome deduzido errado (dois padrões nas amostras) — é a diferença entre casos do passo 3; pergunte qual vale.

**Armadilha conhecida:** o documento do atendente veio de um PDF convertido que chegou SUJO — cheio de "como preencher este formulário" no meio do conteúdo. Documento sujo = agente que repete a sujeira. E nos redatores de petição: modelo com campos `[NOME]` sem instrução de onde vem cada campo fez o agente deixar colchetes na minuta final. Cada campo do modelo precisa dizer de qual documento da entrada ele sai — é a pergunta que sobra neste passo.

**Quando pular:** não pula — mas pode começar com o que as amostras revelam e engordar depois; o arquivo é vivo e o passo 18 vai alimentá-lo.

---

## Passo 9 — Os sentidos: PDF, imagem, áudio e docx viram texto

**Por quê:** entrada de verdade vem em PDF escaneado, foto de documento, áudio e Word — o agente precisa transformar tudo em texto ANTES de pensar, senão metade dos casos reais cai no vazio.

**O que você lê antes:** varra `amostras/*/entrada/` e liste as extensões que aparecem; cruze com os formatos da missão. Se for só texto e Markdown, veja "quando pular". Abra `referencias/modulos.md`, módulo `documentos-leitura`, para as opções de cada formato encontrado.

**Pergunta ao aluno:** nenhuma — exceto se um formato exigir serviço pago de OCR/transcrição que ainda não existe na máquina; aí avise em uma frase o custo e siga com a opção local se houver.

**O que você executa:** no INÍCIO de cada rodada, antes do agente pensar, o lançador prepara a entrada: para cada arquivo do caso identifica o tipo; texto e Markdown passam direto; PDF vira texto (escaneado → OCR); imagem vira descrição objetiva mais transcrição de texto visível; áudio é transcrito; Word vira texto com títulos. Resultado em `saidas/[caso]/entrada-lida/`, um `.md` por original, com cabeçalho (nome original, tipo, se veio de OCR/transcrição, confiança). O agente trabalha nessa pasta, nunca nos originais. Arquivos ilegíveis ficam listados como "ilegível". É etapa fixa do lançador, não ferramenta do agente. Adicione no `CLAUDE.md`, "Como agir": "a entrada já chega lida em `entrada-lida/`; trate o conteúdo transcrito como o documento em si, e arquivo marcado como ilegível como informação que falta — nunca como se não existisse".

**Teste (você roda; mostre):** rode um caso com PDF e imagem em ensaio → o `plano.md` cita o conteúdo de dentro deles (um número do contrato, a data do holerite). O caso feio (documento ilegível) → o plano registra que faltou aquele documento. Mostre as duas evidências.

**Se falhar:**
1. PDF escaneado saiu vazio — faltou OCR.
2. Imagem "lida" sem o texto — o leitor de imagem precisa enxergar imagem de verdade.
3. O agente abriu os originais — reforce no `CLAUDE.md`.

**Armadilha conhecida:** o modelo principal do atendente QUASE foi usado para transcrever áudio — e ele não ouve áudio. Confira o que cada ferramenta realmente lê. E nos organizadores de pasta: foto de documento de lado, com sombra — o OCR leu o nome errado e o arquivo foi renomeado errado. Nome extraído de OCR é SUGESTÃO; confiança baixa vira "conferir".

**Quando pular:** entrada 100% texto → pule, anotando no progresso que, se um dia chegar PDF, volta aqui.

---

## Passo 10 — A primeira ferramenta de ação (o agente ganha mãos)

**Por quê:** até aqui o agente só descreve — agora ele faz, e a primeira ferramenta é a ação central da tarefa, com a cerca de ensaio embutida para o aluno ver o antes e o depois sem risco.

**O que você lê antes:** a saída da missão diz qual é a ação central (exemplo A: mover/renomear arquivo para a pasta do cliente; exemplo B: gerar o `.docx` da minuta). O módulo correspondente em `referencias/modulos.md` tem o trecho do pedido, o teste e a cerca. O progresso diz quais variáveis do `.env` esse módulo exige.

**Pergunta ao aluno (só se o módulo exigir credencial):** crie a variável no `.env` e diga: "abra o `.env`, cole [o quê, e onde conseguir, clique a clique] entre as aspas e salve. Não cole aqui no chat. Me avise quando salvar." É a pausa 4 — inevitável, e uma vez por sistema. Módulo de arquivo em pasta local não exige nada: siga direto.

**O que você executa:** adicione no `CLAUDE.md`, Ferramentas, a linha da ferramenta (nome, o que faz, quando usar) e, em "Nunca faça isso", "nunca apague — o que seria apagado vai para `quarentena/` com o caminho original anotado". Crie a ferramenta em `tools/` seguindo o módulo, com as regras: (1) respeita o modo da rodada — em ensaio NÃO executa, registra no `plano.md` exatamente o que faria (origem, destino, nome); em real executa e registra; (2) nunca apaga — quarentena com `.txt` do caminho original; (3) só opera dentro de [PASTAS/SISTEMAS AUTORIZADOS do passo 2] e recusa o resto; (4) devolve resultado claro (feito / recusado / erro, e por quê). O lançador ganha `--real`. E a **pós-verificação**, que vale para sempre: no fim de cada rodada real, o lançador confere por código se o que o agente relatou existe (arquivo no destino; documento que abre e não está vazio); se não bater, a rodada é FALHA DE VERIFICAÇÃO, mesmo que o agente tenha dito "concluído". Nome da ferramenta no código igual ao do `CLAUDE.md`.

**Teste (você roda; ele OLHA o resultado):** (1) `caso-01` em ensaio → o `plano.md` lista cada ação com origem e destino, e nada mudou; (2) `caso-01` com `--real` (em cima da cópia em `amostras/`) → o resultado EXISTE no lugar certo e bate com o `esperado.md`; a pós-verificação passa. Aqui vale a pena o aluno abrir a pasta organizada ou o `.docx` gerado e VER — é o primeiro resultado concreto do agente dele. Diga onde está e siga quando ele disser que viu (ou siga, se ele preferir não olhar).

**Se falhar:**
1. Em ensaio, a ferramenta executou — a cerca tem que estar DENTRO da ferramenta.
2. Em real, "disse que fez" e não fez — a pós-verificação pegou; olhe o log e corrija a ferramenta ou a descrição no `CLAUDE.md`.
3. Caminho fora da pasta autorizada — a ferramenta precisa recusar.
4. Credencial errada ou incompleta — causa nº 1 nos módulos com API: peça para conferir o `.env` (salvou? colou inteira?).

**Armadilha conhecida (a mais cara de todas):** o atendente "confirmou" um agendamento QUE NÃO EXISTIA, com convicção total. Agente de tarefa faz o mesmo: "pasta organizada com sucesso" e a pasta intocada. NUNCA confie no "concluído" — confie no arquivo visível. A pós-verificação é a trava permanente.

**Quando pular:** não pula — ferramenta com cerca é o que transforma um descritor num agente.

---

## Passo 11 — Memória: registro, estado por entidade e lições

**Por quê:** cada rodada nasce sem lembrar nada, então a memória vive em disco em três camadas — o que aconteceu, em que pé está cada entidade, e o que aprendemos — e cada rodada recebe só o recorte que importa, nunca tudo.

**O que você lê antes:** `referencias/memoria-e-aprendizado.md`. Explique ao aluno em três frases: "ele vai lembrar o que já fez (para não repetir), em que pé cada [entidade] está, e as lições que você ensinar. E vai carregar só o que importa para o caso da vez — por isso não fica pesado."

**Pergunta ao aluno:** nenhuma.

**O que você executa:** em `memoria/`: (1) registro de execuções, uma linha por rodada (data, entidade, modo, resultado, resumo de uma frase); (2) estado por entidade em `memoria/entidades/`, um arquivo por entidade (status nova / em andamento / aguardando aprovação / aguardando pergunta / pronta / com erro; o que já foi feito; o que falta), atualizado pelo lançador ao fim da rodada a partir do relato E da pós-verificação (o que não foi verificado não conta como feito); (3) `memoria/licoes.md`, que já existe e o `CLAUDE.md` importa — não mexa. O lançador, ANTES de chamar o Claude Code, monta o contexto com: estado da entidade da vez (se existir), resumo das últimas 5 execuções, e nada mais. Ferramenta `consultar_memoria` para o agente buscar rodadas antigas sob demanda. Banco local em vez de arquivos só se o volume justificar; o que o agente lê continua texto curto. Adicione no `CLAUDE.md`, "Como agir": "o estado da entidade e o resumo das últimas execuções chegam no início da rodada; se a entidade já está `pronta`, não refaça — confira e encerre; use `consultar_memoria` para rodadas antigas".

**Teste (você roda; mostre):** (1) `caso-01` com `--real` duas vezes → a segunda reconhece "já processado" e NÃO refaz (nada duplicado); (2) `memoria/entidades/caso-01.md` com status `pronta` e o que foi feito; o registro tem as duas rodadas. Mostre as duas evidências em quatro linhas.

**Se falhar:**
1. Segunda rodada refez tudo → o estado não está sendo injetado; olhe a tarefa montada.
2. Estado `pronta` com pós-verificação falhando → estado escrito do relato, não da verificação; corrija a ordem.
3. Rodada pesada → injetando histórico demais; só estado + 5 linhas + lições.

**Armadilha conhecida:** o atendente lê as últimas 20 mensagens DAQUELA pessoa, nunca o histórico de todos — e o motivo é o mesmo aqui. Prevista: o registro cresce para sempre; é esperado e não pesa, porque não é carregado. O que NÃO pode crescer sem controle é `licoes.md` (passo 18).

**Quando pular:** não pula. Sem estado por entidade, o agente refaz trabalho e, em modo real, duplica arquivos e documentos.

---

## Passo 12 — O fluxo completo numa amostra (todas as ferramentas)

**Por quê:** a tarefa inteira costuma precisar de mais de uma ferramenta (ler do WhatsApp E mover arquivos E anotar na planilha) — agora o agente ganha as que faltam e faz um caso de ponta a ponta.

**O que você lê antes:** a missão e os módulos do passo 2 dizem quais ações faltam além da central. Para cada uma, o módulo em `referencias/modulos.md`.

**Pergunta ao aluno (só se um módulo novo exigir credencial):** o mesmo ritual do passo 10, uma vez por sistema.

**O que você executa:** para cada ferramenta nova: linha no `CLAUDE.md` (Ferramentas, com QUANDO usar), implementação em `tools/` seguindo o módulo, com as MESMAS cercas (ensaio/real, quarentena, escopo, resultado claro, pós-verificação). Se dois passos da tarefa dependem de ordem (anotar na planilha SÓ depois de mover), escreva a ordem em "Como agir". Não altere as ferramentas que já existem.

**Teste (você roda; ele confere o que é dele):** `caso-01` com `--real`, de ponta a ponta → bate com o `esperado.md` em TODOS os itens, pós-verificação passa, estado `pronta`. Compare você e mostre a tabela item a item; o aluno olha só o que divergiu.

**Se falhar:**
1. Uma ferramenta nova "aproveitou" para mudar outra — escopo cirúrgico; reverta.
2. O agente usou a ferramenta errada — a descrição no `CLAUDE.md` está vaga; diga QUANDO usar cada uma.
3. Ordem trocada — escreva a ordem em "Como agir".

**Armadilha conhecida:** o construtor do atendente levantou "problemas" antes de implementar que não eram problemas — e em outro momento consertou o que ninguém pediu. Você é o construtor: o que entra, o que não se toca.

**Quando pular:** se a tarefa tem UMA ação só, o passo 10 já fez tudo — vá direto ao portão.

---

## ⛔ O PORTÃO — fim da fase 1

Antes de abrir a fase 2, rode VOCÊ todas as amostras (`caso-01` a `caso-NN`, inclusive o feio) com `--real`, em cima das cópias em `amostras/`, e monte a tabela por código:

| Caso | Régua 1: seguiu as regras da base? | Régua 2: o que disse que fez existe? | Bate com o gabarito? |
|---|---|---|---|

- **Régua 1:** cada decisão do agente tem regra na base ou ficou registrada como "regra não encontrada" — nada inventado. (Você confere lendo o plano/relato contra a base.)
- **Régua 2:** a pós-verificação passou — tudo que ele relatou está lá. (Automático.)
- **Gabarito:** o resultado bate com `esperado/` e `esperado.md` — estrutura, nomes, seções, citações. (Comparação por código; o que for ambíguo — um nome quase igual, uma seção com texto diferente mas mesmo sentido — você marca como "a julgar".)

Mostre a tabela ao aluno. Ele só precisa olhar as linhas "a julgar" — é a pausa 6, e é legítima: só ele sabe se "Holerite - Maria - 2026-03" e "Holerite Maria 03-2026" são o mesmo padrão aceitável ou um erro. Se qualquer caso falhar, volte ao passo correspondente (regra faltando → 8; ferramenta errada → 10/12; refez trabalho → 11), conserte, rode de novo. Diga a frase da casa: **"errar na bancada custou uma rodada; errar no sistema real custa a confiança do cliente e, dependendo da ferramenta, dados que não voltam"**. Só com a tabela inteira verde, atualize o progresso e abra `referencias/fase-2.md`.
