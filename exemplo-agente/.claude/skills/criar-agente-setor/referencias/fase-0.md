# Fase 0 — Definir o trabalho (passos 1–2)

Nada de código ainda. Um agente de setor nasce de uma frase clara sobre o trabalho e de um número que diz se ele está indo bem. Sem isso, o construtor inventa um agente genérico que não serve a ninguém.

---

## Passo 1 — O trabalho definido

**Por quê:** o agente só é útil se fizer UM trabalho bem definido, com entrada, saída e um número que o dono olha para saber se funcionou.

**Antes, pergunte (uma por vez, e anote no progresso):**
- O que esse agente faz, em uma frase? (ex.: "lê os leads novos da planilha e escreve a primeira abordagem")
- De onde vem o que ele usa? (planilha, CRM, pasta, site, e-mail, outro agente)
- Para onde vai o resultado? (planilha, CRM, arquivo, mensagem para o dono)
- Qual o número que diz que ele está indo bem? (ex.: abordagens enviadas por dia, erros encontrados por semana)
- Ele age sozinho em horário fixo, ou só quando alguém pede?
- O que ele NUNCA pode fazer sem o dono? (enviar para cliente, apagar, pagar, publicar)

**Não há pedido pra colar:** você registra as respostas em `progresso-do-agente.md` e em `agente.json` (campo `trabalho`).

**Teste que prova:** o dono lê a frase do trabalho e o número e diz "é isso".

**Se falhar:**
1. A frase tem dois trabalhos — divida: este agente faz um; o outro é outro agente.
2. Não existe número — pergunte "como você saberia, no fim da semana, que ele valeu?".

**Quando pular:** não pula.

---

## Passo 2 — As conexões no `.env`

**Por quê:** tudo que o agente acessa no trabalho exige uma chave ou um endereço, e isso fica num arquivo que só existe nesta máquina.

**Antes, pergunte:** para cada fonte e destino do passo 1, o que é preciso para acessar? (token do CRM, URL do projeto, credencial do Google, caminho de pasta). Guie clique a clique onde conseguir cada um.

**Como fazer (você executa, ele cola):** abra o `.env` da pasta, que já existe com variáveis vazias, e deixe uma linha por conexão com o nome em MAIÚSCULAS (ex.: `OPHIR_TOKEN=""`, `PLANILHA_ID=""`). Diga: "abra o arquivo `.env`, cole cada valor entre as aspas e salve (Ctrl+S). NÃO cole aqui no chat." Confirme que `.gitignore` lista `.env`.

**Teste que prova:** ele confirma que cada variável tem valor e que salvou. Você NÃO lê os valores em voz alta.

**Se falhar:**
1. Esqueceu o Ctrl+S.
2. Colou com aspas duplicadas ou espaço no fim.

**Armadilha herdada:** chave colada em conversa fica no histórico para sempre. O jeito certo é o arquivo, desde o primeiro dia.

**Quando pular:** só se o agente não acessa nada externo (raro). Mesmo assim mantenha o `.env` vazio no lugar.

**Fechando a fase 0:** atualize o progresso e abra `referencias/fase-1.md`.
