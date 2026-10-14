# MCP como plataforma e as pendências decididas (14/10/2026)

Decisões do dono em 14/10/2026, sobre os itens que ficaram em aberto depois
do "agente que aprende vendo":

1. **Ensinar sem pasta ou sistema marcado: a tela conduz (B).** O prompt do
   Ensinar manda o Claude Code parar e dizer `FALTA: …` em vez de contornar;
   a tela mostra o botão 🔌 Plataformas do agente na introdução e embaixo da
   fala que pediu. Marcar vale na próxima mensagem (o papel e o `--add-dir`
   são refeitos a cada chamada). Pasta de trabalho é plataforma do tipo
   `pasta`, então o mesmo botão resolve pasta e sistema.
2. **MCP vira tipo de plataforma (B).** Tipo `mcp` em `plataformas.js`, com
   `COMANDO` (local) ou `URL` (remoto) e `TOKEN`. Marcar o agente grava
   `mcp.json` na pasta dele com `${VARIÁVEL}`, nunca valor, e só o escritório
   mexe nesse arquivo (marca `_leia`). O lançador (`rodar.js`) expande com o
   `.env` em `.mcp-rodada.json` (fora do git, apagado no fim), passa
   `--mcp-config` + `--strict-mcp-config` e libera `mcp__<id>` só em
   proposta e real. O Ensinar faz o mesmo em `.mcp-ensino.json`. Segredo
   nunca vai na linha de comando. Servidor com variável vazia fica de fora e
   é apontado no log.
3. **E-mail da conta do Claude só para o administrador (B).** `GET /api/claude`
   só inclui `conta` com sessão de administrador; Ajustes diz "conta visível
   só para o administrador" para o cliente.
4. **Segunda rodada do `/criar-escritorio`: confiar no teste de unidade (A).**
   Nenhuma verificação real adicional.

## Onde fica

| Coisa | Lugar |
|---|---|
| Tipo `mcp`, `mcpConfigPara`, `gravarMcpDoAgente`, `mcpParaChamada` | `plataformas.js` |
| `expandirVars`, `partirComando` | `util.js` (escritório); cópia de `expandirVars` e `mcpDaRodada` em `agente-base.js` (a pasta do agente não depende do escritório) |
| Flags na rodada | `modelos/agente/tarefa/rodar.js` (`chamar`), `server.js` (`perguntar`, canal de ensino) |
| Dica do tipo na tela | `js/plataformas.js` |
| `.mcp-rodada.json`, `.mcp-ensino.json` no `.gitignore` do agente | `modelos/agente/comum/gitignore`, `exemplo-agente/.gitignore` |

## Critérios de aceite

- `mcp.json` gerado não contém nenhum valor de variável; `.env` recebe as
  variáveis prefixadas, sem nome canônico.
- Agente sem plataforma `mcp` não ganha `mcp.json`; tirar as plataformas
  `mcp` apaga o arquivo gerado; um `mcp.json` que não é do escritório não é
  tocado.
- `rodar.js` em ensaio não passa MCP; em proposta e real passa só os
  servidores do `mcp.json` com variáveis preenchidas e apaga o arquivo
  expandido ao fim.
- `/api/claude` sem administrador não traz `conta`.
