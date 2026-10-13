# Exemplo — agente do Escritório de Agentes

Esta pasta é o sistema próprio do agente **Exemplo** (Agente de demonstração), do negócio
**Escritório de Agentes**. Ela foi criada pelo escritório e segue um contrato fixo. Leia
isto antes de qualquer alteração.

## A jornada de construção

A skill que conduz a construção está em `.claude/skills/criar-agente-setor/SKILL.md`.
Quando o dono pedir para criar, construir ou continuar este agente, leia a
skill e siga a jornada a partir de `progresso-do-agente.md`. Um passo por vez.

## Contrato com o escritório (não quebre)

O escritório sobe este sistema com `node server.js` e a variável `PORT`
(porta registrada: **4401**). Ele escuta só em `127.0.0.1`. Três rotas
precisam existir sempre:

| Rota | O que devolve | Quem usa |
|---|---|---|
| `GET /saude` | JSON `{ ok, nome, setor, desde, ... }` | o escritório pinta o boneco e religa quem caiu |
| `GET /painel` | HTML, página inteira, só leitura | o monitor do agente embute aqui |
| `GET /log` | texto com as últimas linhas de `log.txt` | o botão Log do monitor |

`GET /` é o chat de teste (sandbox). Estenda o `server.js`; não o substitua por
outro servidor sem manter as três rotas e a porta pela variável `PORT`.

## Cérebro

- **Agente de setor:** o cérebro é o **Claude Code da máquina** (`claude -p`),
  já chamado pelo `server.js`. Não usa chave de modelo.
- **Agente de atendimento no WhatsApp:** usa **OpenRouter** com a chave
  `OPENROUTER_API` do `.env`. Só este tipo de agente tem chave de modelo.

O `.env` guarda as **conexões de trabalho** (token do CRM, URL do banco,
credencial do Google, caminho de pasta). Nunca grave chave em outro arquivo,
nunca a escreva no chat nem no progresso.

## Arquivos e quem escreve neles

| Arquivo | Dono | Regra |
|---|---|---|
| `prompt-agente.md` | o dono do negócio | o construtor nunca preenche sozinho; só o OBJETIVO com o que o dono disse. As outras seções crescem por necessidade provada |
| `skills/constituicao.md` | o dono do negócio | base de conhecimento. É FERRAMENTA (lida quando preciso), nunca entra no prompt de sistema |
| `tools/` | o construtor | o código das ações; código para o garantido, IA para o interpretado |
| `memoria.md` | o escritório e o agente | o que ele aprende operando; o escritório injeta no começo de cada conversa e acrescenta no fim |
| `progresso-do-agente.md` | o construtor | onde a jornada parou. O escritório conta os `[x]` e procura `PORTÃO: aprovado` e `## CONCLUÍDO` |
| `log.txt` | o servidor | cada tarefa e cada conversa, uma linha com data |
| `agente.json` | o escritório | nome, setor, negócio, porta, trilha |

## Como o agente fala com o escritório

Quando o agente responde pelo escritório (conversa, reunião, testador), ele
pode terminar a resposta com blocos que o escritório interpreta e retira do
texto:

- `<memoria>uma ou duas linhas</memoria>` — algo durável que aprendeu (fato,
  causa de erro, compromisso). Vai para `memoria.md` com a data. Sem novidade,
  não inclua.
- `<mensagem para="id-do-sistema">texto</mensagem>` — recado para outro
  agente do escritório. É entregue no próximo prompt do destinatário.
- `<proposta arquivo="prompt-agente.md" secao="Nunca faça isso" titulo="...">texto a acrescentar</proposta>`
  — sugestão de mudança no prompt ou na constituição. NUNCA entra sozinha:
  fica pendente até o dono aprovar no escritório. Arquivos permitidos:
  `prompt-agente.md`, `skills/*.md`, `memoria.md`, `CLAUDE.md`.

Para pedir um aviso no celular do dono: `POST http://localhost:4321/api/avisar`
com `{ "titulo", "texto", "prioridade" }`. Só contagem e resumo, nunca dado
pessoal de cliente.
