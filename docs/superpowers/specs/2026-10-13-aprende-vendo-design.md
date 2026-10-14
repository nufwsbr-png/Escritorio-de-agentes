# Agente que aprende vendo — design (13/10/2026)

## O problema

Hoje um agente de tarefa só nasce por um caminho: Contratar cria a pasta e o
monitor abre em **Construir**, onde o construtor segue a anatomia componente
por componente. É o caminho certo para quem constrói um agente do zero, mas
é longo para o caso mais comum do dono do produto: "eu sei fazer a tarefa;
quero mostrar uma vez e o agente fazer igual".

## A ideia aprovada pelo dono

Um terceiro jeito de criar e treinar agentes: **ensinar fazendo**. A pessoa
abre um chat que é o Claude Code camuflado, rodando dentro da pasta do agente,
e faz a tarefa ali, de verdade, do jeito que quer. Ao clicar **Tarefa
concluída**, o escritório destila a demonstração numa **skill** que o agente
passa a executar sozinho, mais a primeira amostra com gabarito e as regras de
negócio que apareceram.

Decisões tomadas com o dono (13/10/2026):

- A demonstração **age no real**, porque é a pessoa operando. A sessão fica
  limitada às pastas autorizadas e às plataformas permitidas do agente.
- **Uma skill por tarefa.** Um agente pode ter várias. Refazer uma não mexe
  nas outras.
- Não é uma terceira trilha: é um caminho mais curto para cumprir a mesma
  anatomia. O agente criado assim é um agente de tarefa normal.
- Todo agente de tarefa pode ser ensinado, não só os criados como "aprende
  vendo". O modo **Ensinar** fica no Conversar de todos eles.

## Como fica para quem usa

1. **Contratar** mostra três formas: Atendimento no WhatsApp, Agente de
   tarefa (por setor, constrói pela anatomia) e **👀 Agente que aprende
   vendo**. A terceira pede o setor, nome, porta e plataformas como as
   outras, e o botão diz "Criar e começar a ensinar".
2. O monitor abre em **Conversar › 👀 Ensinar**. A tela explica em três
   linhas: faça a tarefa aqui como faria no Claude Code; ele age de verdade,
   dentro das pastas e plataformas deste agente; no fim clique Tarefa
   concluída.
3. A pessoa conversa e trabalha. Cada mensagem é uma rodada do Claude Code na
   pasta do agente, com permissão de editar e rodar comandos, e com as pastas
   autorizadas do `.env` liberadas para edição (`--add-dir`). A conversa
   inteira fica em `ensino/NN-<data>/transcricao.md`.
4. **✅ Tarefa concluída** pede um nome curto para a tarefa (opcional) e
   dispara a destilação, na mesma sessão (ela viu tudo que foi feito,
   inclusive os resultados dos comandos). A destilação grava:
   - `.claude/skills/<tarefa>/SKILL.md`: quando usar, entrada, passo a passo
     com caminhos e comandos exatos, decisões que a pessoa tomou, quando parar
     e perguntar, como conferir (as linhas `FEITO:`), o que nunca fazer.
     Nomes de variáveis, nunca valores. Nomes de clientes anonimizados.
   - `amostras/caso-NN/esperado.md` (e `entrada/` quando a entrada era
     arquivo): a demonstração vira o primeiro caso com gabarito.
   - Regras de negócio que apareceram → blocos `<proposta>` para a
     constituição, que ficam pendentes até o dono aprovar (mecanismo que já
     existe).
   - Se o OBJETIVO de `prompt-agente.md` ainda é `[A PREENCHER]`, um
     rascunho a partir da demonstração, marcado como rascunho a confirmar.
   - Anotação em `progresso-do-agente.md` e `ensino/NN/resumo.md`.
5. A resposta da destilação aparece no chat com o resumo. A sessão de ensino
   fecha; a próxima mensagem em Ensinar começa uma demonstração nova.
6. **Executar:** o lançador (`rodar.js`) passa a listar as skills aprendidas
   no prompt de cada rodada e manda o agente ler a SKILL.md que se aplica e
   seguir o passo a passo. O agente continua nascendo em ensaio; a pessoa
   confere na amostra que ele faz igual antes de liberar proposta e real. A
   anatomia continua valendo.

## Onde fica cada coisa

| Coisa | Lugar |
|---|---|
| Lógica do ensino: pastas, transcrição, skills aprendidas, prompts | `ensino.js` (servidor) |
| Modo `ensinar` e `destilar` na conversa, canal separado | `server.js`, seção conversa |
| Rotas | `GET/POST /api/agentes/:id/chat?canal=ensino`, `POST /api/agentes/:id/ensinar/concluir`, `GET /api/agentes/:id/ensino` |
| Forma de criação | `agentes.js` (`aprendizado: 'anatomia' \| 'vendo'` em `agente.json` e no registro) |
| Tela | `js/contratar.js` (terceiro cartão), `js/conversa.js` (modo, canal, botão), `index.html`, `css/style.css` |
| No agente | `ensino/` (fora do git), `.claude/skills/<tarefa>/SKILL.md`, `amostras/caso-NN/` |
| Lançador lê as skills | `modelos/agente/comum/agente-base.js` (`skillsAprendidas`), `modelos/agente/tarefa/rodar.js` |

## Cercas

- Ensinar, concluir e ver a transcrição pedem **administrador**.
- A sessão de ensino roda com a mesma lista fixa de ferramentas de Resolver.
  Edição fora da pasta do agente só nas pastas de `PASTAS_AUTORIZADAS`
  (`--add-dir`). Comandos de shell seguem cercados só por instrução: é a
  mesma confiança que já se dá ao Resolver, e é a pessoa operando.
- O prompt de ensino lista **nomes** das variáveis do `.env` e os ids das
  plataformas permitidas, nunca valores. A destilação é instruída a nunca
  escrever valor em skill, amostra ou resumo.
- `ensino/` entra no `.gitignore` do agente: a transcrição pode conter dado
  de cliente. A skill gerada é anonimizada por instrução.
- A destilação só escreve dentro da pasta do agente. Nunca escreve em
  `memoria/licoes.md` nem direto em `skills/constituicao.md`: regra de
  negócio vira proposta.
- Agente de atendimento não tem Ensinar: o cérebro dele é outro e não roda
  pelo lançador.

## Critérios de aceite

1. Contratar mostra o terceiro cartão; criar por ele grava
   `aprendizado: "vendo"` em `agente.json` e abre o monitor em Ensinar.
2. Em Ensinar, cada mensagem roda na pasta do agente, com `--add-dir` das
   pastas autorizadas, e a transcrição cresce em `ensino/NN/transcricao.md`.
3. Tarefa concluída sem demonstração responde erro claro; com demonstração
   dispara a destilação na mesma sessão e, ao terminar, fecha a sessão.
4. `GET /api/agentes/:id/ensino` lista as skills aprendidas (nome,
   descrição, arquivo), excluindo a skill de referência da trilha.
5. `rodar.js` inclui as skills aprendidas no prompt de sistema.
6. Nenhum valor de `.env` em prompt, skill, resumo ou resposta da API.
7. `npm test` passa; fumaça confere o terceiro cartão e o modo Ensinar.
8. `exemplo-agente/` espelha o molde.
