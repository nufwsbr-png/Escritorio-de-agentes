# Fase 3 — Painel e portão (passos 10–11)

O que o agente faz já está registrado (log, registro de tarefas, fonte). O painel só LÊ e mostra ao dono. Depois vem o portão: a prova de fogo antes de ele entrar em serviço.

---

## Passo 10 — O painel do dono (só leitura)

**Por quê:** o dono precisa ver, em um minuto, o número que o agente controla e o que ele fez hoje, sem poder quebrar nada.

**Antes, pergunte:** o que ele quer ver primeiro? (padrão: o número do passo 1 hoje e na semana, as últimas tarefas, e o que está pendente ou travado)

**Pedido pronto pra colar:**
> Quero o painel do dono em `/painel`, ocupando a página inteira. Três blocos: **Número** ([O NÚMERO DO PASSO 1], hoje e nos últimos 7 dias), **Últimas tarefas** (do registro de tarefas, com resultado) e **Pendências** (o que está parado e por quê). Os dados JÁ EXISTEM no registro e no log — o painel só lê, não cria nem altera nada. `/saude` deve continuar respondendo o JSON que o escritório lê. ANTES de mexer, me explique quais blocos e de onde vem cada informação.

Quando o construtor apresentar o plano, revise COM o dono. Ressalvas merecem triagem, não obediência.

**Teste que prova:** abrir o monitor do agente no escritório → o painel aparece embutido com os dados REAIS.

**Se falhar:**
1. Tela em branco → de onde cada bloco lê? A fonte tem dado?
2. Painel estreito → pedido simples de layout ("ocupe a página inteira, sem mexer em lógica").
3. `/saude` parou de responder → o escritório vai mostrar o agente como caído; restaure.

**Armadilha herdada:** o construtor criar dados do zero em vez de ler os que existem. A exigência "me explique antes" evita isso.

**Quando pular:** não pule — o escritório embute este painel; sem ele o computador do agente fica em branco.

---

## ⛔ Passo 11 — O PORTÃO

**Por quê:** ninguém entra em serviço sem a prova de fogo; errar aqui custou um prompt, errar em serviço custa trabalho refeito ou dado perdido.

Faça o dono passar o agente por estes cinco itens, no chat de teste:

1. Perguntar uma regra do setor → responde com o que está na constituição, sem inventar.
2. Pedir algo que o agente NÃO faz → nega com clareza e diz quem faz.
3. Executar a ferramenta principal de ponta a ponta → efeito VISÍVEL na fonte e no log.
4. Repetir a mesma tarefa → reconhece que já foi feita.
5. Abrir `/painel` → o número e as últimas tarefas batem com a realidade.

Se qualquer item falhar, volte ao passo correspondente. Só com os cinco verdes, escreva no progresso a linha:

```
PORTÃO: aprovado em [data]
```

O escritório lê essa linha e deixa de mostrar o agente "em treinamento".

**Fechando a fase 3:** atualize o progresso e abra `referencias/fase-4.md`.
