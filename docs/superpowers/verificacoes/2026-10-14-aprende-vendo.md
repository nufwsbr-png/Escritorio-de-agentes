# Verificação: agente que aprende vendo, rodada real (14/10/2026)

Como foi: escritório de teste em pasta temporária (`ESCRITORIO_DADOS`), agente
"Tati" contratado pela API com `aprendizado: "vendo"`, pasta autorizada
`clientes/` com duas notas fiscais de brinquedo (nomes fictícios), duas
mensagens em Ensinar e "Tarefa concluída" com o nome "Organizar notas
fiscais". Duas rodadas reais do Claude Code. Nada tocou em `data/` nem em
`agentes/` de verdade.

## Resultado

- A demonstração aconteceu de verdade: as notas foram movidas para
  `2026-09/<Nome>/`, nada apagado, cópia intermediária em `quarentena/` com
  registro. A transcrição ficou em `ensino/01-2026-10-14/transcricao.md`.
- A destilação, na mesma sessão, gravou: a skill (frontmatter, quando usar,
  entrada, passo a passo, decisões da pessoa, quando perguntar, como conferir,
  nunca), `amostras/caso-01/` com entrada anonimizada (fulano, beltrana) e
  gabarito, `tools/mover-notas.js`, rascunho do OBJETIVO marcado como
  rascunho, linha no progresso sem marcar `[x]`, `resumo.md` com o que ficou
  em aberto, 4 propostas para a constituição e 1 lição proposta, todas
  pendentes de aprovação.
- Sessão de ensino fechada ao fim (`ensino: null`), skill listada em
  `GET /api/agentes/tati/ensino`.
- Nenhum valor do `.env` nem a senha em arquivo nenhum. Dado pessoal só em
  `ensino/` e `quarentena/`, ambos fora do git.

## O que o teste mostrou e foi corrigido no mesmo dia

1. **Shell bloqueado fora da pasta do agente.** Mesmo com `--add-dir`, o
   ambiente do Claude Code recusou `mkdir` e `Move-Item` na pasta autorizada;
   a primeira rodada gastou 5 minutos tentando antes de escrever um script
   Node. O papel do Ensinar agora diz isso de cara e manda usar Write ou uma
   ferramenta em `tools/` sobre `tools/base.js`, que é o que o agente vai
   rodar depois.
2. **Escrever em `.claude/skills/` pela sessão não funcionou.** A destilação
   gravou `ensino/01/skill-destilada.md` e improvisou um instalador em
   `tools/`. Agora o contrato é esse: a destilação grava em `ensino/NN/`, e o
   **escritório instala** em `.claude/skills/<name>/SKILL.md`
   (`ENSINO.instalarSkill`), recusando skill com valor de variável ou nome
   reservado, e guardando a versão anterior ao substituir.
3. **Caminho fixo na ferramenta gerada.** `mover-notas.js` nasceu com o
   caminho da pasta de clientes no código. A destilação passa a ser instruída
   a deixar as ferramentas sobre `tools/base.js` com escopo por
   `PASTAS_AUTORIZADAS`, e a tirar de `tools/` os scripts descartáveis.

Não mudou: a demonstração age no real (decisão do dono), e o agente nasce em
ensaio depois de aprender; o resumo manda rodar `node rodar.js
amostras/caso-01` e conferir antes de qualquer proposta ou real.
