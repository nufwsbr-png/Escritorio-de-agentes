# Fase 1 — O cérebro, no sandbox (passos 3–6)

Aqui o agente ganha identidade e conhecimento, só no chat de teste do próprio servidor. Cada peça entra separada para o dono VER a diferença: sem prompt é genérico, sem constituição inventa.

---

## Passo 3 — A estrutura que já existe

**Por quê:** o agente se organiza em `skills` (como agir) e `tools` (as ações), e o escritório já criou isso para a pasta crescer sem bagunça.

**Antes:** nada. Leia `CLAUDE.md` e mostre ao dono, em 5 linhas, o que cada arquivo da pasta faz.

**Pedido pronto pra colar:**
> Confira a pasta deste agente: `server.js`, `prompt-agente.md`, `skills/constituicao.md`, `tools/`, `.env`, `memoria.md`. Suba o servidor com a porta de `agente.json` e me diga o endereço do chat de teste e do painel. Não altere nenhum arquivo ainda.

**Teste que prova:** abrir `http://localhost:[PORTA]/` e mandar "olá, quem é você?". A resposta vai ser genérica — está CERTO por enquanto; é o "antes".

**Se falhar:**
1. Porta ocupada — confira em `agente.json` e no escritório.
2. Claude Code sem login na máquina — rodar `claude auth login` no terminal.

**Quando pular:** não pula.

---

## Passo 4 — O chat de teste é o laboratório

**Por quê:** errar aqui custa um prompt; errar no sistema do cliente custa trabalho refeito.

**Antes:** nada novo.

**Como fazer:** explique que tudo até o passo 9 é testado nesse chat, e que o painel (`/painel`) vai mostrar o que ele faz. Não há pedido: é o momento de o dono se acostumar com a ferramenta. Peça que ele faça três perguntas sobre o trabalho e anote o que achou fraco.

**Teste que prova:** três perguntas feitas, três respostas lidas.

**Quando pular:** pode juntar com o passo 3.

---

## Passo 5 — O prompt (a identidade)

**Por quê:** o prompt é quem o agente É — sem ele é um assistente genérico; com ele, é o funcionário do setor, com o objetivo que o dono deu.

**Antes, pergunte (e anote):**
- O nome do agente e do negócio (já estão em `agente.json`; confirme).
- O OBJETIVO: o que ele entrega no fim de cada tarefa?
- O tom: direto? formal? Com quem ele fala — o dono, a equipe, nunca o cliente?

**Como fazer:** abra `prompt-agente.md` e preencha SÓ o bloco OBJETIVO com o que ele disse. "Ferramentas", "Como agir" e "Nunca faça isso" ficam com os títulos e VAZIAS. O `server.js` já relê o arquivo a cada mensagem.

**Pedido pronto pra colar:**
> Preenchi o OBJETIVO de `prompt-agente.md`. Não altere o conteúdo do arquivo — ele é meu. Confirme que o servidor usa ele como prompt de sistema e relê a cada mensagem.

**Teste que prova:** no chat, "quem é você?" → responde como o agente do setor, com o nome certo. Bônus: mudar uma palavra no arquivo, salvar, perguntar de novo — muda sem reiniciar.

**Se falhar:**
1. Esqueceu de salvar.
2. Título sem espaço depois do `#`.

**Armadilha herdada (das grandes):** o construtor PREENCHER sozinho as seções vazias. Confira o arquivo depois: se apareceu seção que o dono não escreveu, apague.

**Quando pular:** não pula.

---

## Passo 6 — A constituição como ferramenta

**Por quê:** o conhecimento do setor NÃO entra no prompt — vira um arquivo que o agente lê só quando precisa, porque carregar tudo em toda mensagem custa caro e confunde.

**Antes, colete com o dono (NUNCA invente):** as regras do trabalho, os nomes das coisas (colunas, etapas, pastas, status), o que é "certo" e "errado" no setor, as exceções, os contatos de quem decide. Se existir documento, converta para Markdown e LIMPE.

**Como fazer:** preencha `skills/constituicao.md` seção por seção com o que ele disse. O que faltar vira `[A PREENCHER]`. O dono também pode preencher pela **Ficha do negócio** no monitor do escritório.

**Pedido pronto pra colar:**
> O agente deve consultar `skills/constituicao.md` sempre que a resposta depender de regra ou dado do setor, lendo o arquivo na hora (ferramenta de leitura), NUNCA colando o conteúdo no prompt de sistema. Confirme onde a constituição está sendo lida.

**Teste que prova (em dupla):** (1) perguntar uma regra que ESTÁ no arquivo → responde certo; (2) perguntar algo que NÃO está → diz que não tem e não inventa.

**Se falhar:**
1. O construtor colou a constituição no prompt de sistema — reverter.
2. Dado errado na constituição — corrija o arquivo, não o agente.

**Armadilha herdada (a mais repetida):** o construtor juntar a constituição no prompt "para ajudar". Pergunte onde ela é lida; se a resposta citar "prompt de sistema", corrija.

**Quando pular:** não pula — mas pode começar mínimo e engordar depois; o arquivo é vivo.

**Fechando a fase 1:** atualize o progresso e abra `referencias/fase-2.md`.
