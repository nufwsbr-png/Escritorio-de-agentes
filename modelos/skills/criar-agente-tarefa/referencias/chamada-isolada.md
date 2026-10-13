# A chamada isolada do Claude Code

Como o lançador acorda o agente sem ninguém digitar. Este arquivo é para VOCÊ (o guia, que também constrói) seguir nos passos 5, 14 e 17. O aluno não precisa ler.

Os nomes exatos de parâmetros mudam com as versões do Claude Code — a regra é: confirme com `claude --help` (ou a documentação do Agent SDK) antes de implementar, e garanta os CONCEITOS abaixo, não a grafia.

## Os conceitos que o lançador precisa cobrir

1. **Modo não interativo.** O Claude Code tem um modo "imprime e sai" (`claude -p "tarefa"`, também chamado print/headless) e um SDK (Agent SDK, em Python ou Node) que faz o mesmo por código. Qualquer dos dois serve; o SDK dá mais controle (eventos, ferramentas próprias, hooks). Escolha pelo que já está instalado na máquina.
2. **Diretório de trabalho = pasta do agente.** É isso que faz o `CLAUDE.md`, as skills em `skills/` (ou `.claude/skills/`) e as permissões em `.claude/settings.json` serem lidos automaticamente. Lançador que roda de outra pasta acorda um agente amnésico e sem cercas.
3. **A tarefa da rodada é curta.** O lançador monta um texto com: a entidade (caminho/ID), o modo (ensaio/proposta/real), o estado da entidade (se existir) e o resumo das últimas 5 execuções. Nada mais — identidade vem do `CLAUDE.md`, regras vêm da skill sob demanda, lições vêm por importação no `CLAUDE.md`.
4. **Importações no `CLAUDE.md`.** O Claude Code aceita incluir outros arquivos no `CLAUDE.md` com uma linha `@caminho/do/arquivo.md`. O modelo de identidade desta skill usa isso para `missao.md` e `memoria/licoes.md`. Assim a missão e as lições entram em toda rodada sem o lançador precisar colar nada.
5. **Saída estruturada.** O modo não interativo pode devolver JSON com o texto final, o custo, a duração e o identificador da sessão. O lançador guarda tudo em `saidas/[caso]/rodada-[data-hora]/` e lê o identificador da sessão (necessário para retomar, passo 17).
6. **Limites.** Número máximo de turnos (`--max-turns` ou equivalente) e um tempo máximo controlado pelo próprio lançador (mata o processo se passar). Sem isso, uma rodada pode girar para sempre.
7. **Permissões.** Ver seção abaixo. É a diferença entre ensaio e real.
8. **Retomada.** Ver seção abaixo. É o que permite pausar numa pergunta e continuar.

## Permissões (passo 5 para ensaio; passo 14 para as cercas)

Três camadas, da mais forte para a mais fraca:

- **Configuração da pasta** (`.claude/settings.json` dentro da pasta do agente): listas de ferramentas permitidas e negadas. É lida em toda rodada e o agente não consegue alterá-la (desde que a pasta `.claude/` esteja fora do escopo de escrita das ferramentas dele). Aqui ficam as cercas permanentes: negar apagar, negar comandos de sistema genéricos, negar escrita fora das pastas, liberar só as ferramentas de `tools/` e os MCPs escolhidos.
- **Parâmetros da chamada** (`--allowedTools`, `--disallowedTools`, modo de permissão): o lançador restringe AINDA MAIS por rodada. Ensaio: só leitura (ler arquivo, listar, buscar). Proposta: leitura + as ferramentas de `tools/` em modo proposta. Real: leitura + `tools/` em modo real. Nunca "aceitar tudo" (`bypass`/`dangerously-skip`) — é o contrário de cerca.
- **Instruções no `CLAUDE.md`** ("Nunca faça isso"): a camada mais fraca, porque texto se contorna. Serve para orientar, não para impedir. Toda proibição que importa vive também nas duas camadas acima.

Modo de permissão: em rodada não interativa não há ninguém para aprovar um pedido de permissão, então o que não estiver liberado é NEGADO (o construtor escolhe o modo que faz isso, nunca o que aprova sozinho). Hooks (ganchos que rodam antes/depois de cada ferramenta) são o lugar ideal para o log detalhado e para bloquear por caminho — se o construtor sugerir, aceite.

Ferramentas do próprio agente (`tools/`): o construtor pode expô-las ao Claude Code como um pequeno servidor MCP local ou como scripts chamados por uma ferramenta permitida. Qualquer um serve, desde que as permissões liberem SÓ essas e a cerca de modo (ensaio/proposta/real) fique DENTRO da ferramenta.

## Retomada de sessão (passo 17)

Cada rodada devolve um identificador de sessão. O Claude Code consegue continuar aquela mesma sessão depois (`--resume <id>` ou equivalente no SDK), com todo o contexto que ela tinha. O fluxo da pergunta ao dono:

1. O agente chama `perguntar_ao_dono`; a ferramenta grava a pergunta no estado da entidade e devolve "aguarde a resposta do dono; encerre a rodada agora". O agente encerra.
2. O lançador guarda o identificador da sessão junto com a entidade (`aguardando pergunta`).
3. O dono responde no painel. O lançador retoma a sessão com a tarefa: "resposta do dono: […]. Continue de onde parou."
4. A rodada retomada termina normalmente e passa pela pós-verificação.

Se a sessão não puder ser retomada (versão mudou, arquivo de sessão perdido), o lançador roda a entidade do zero COM a resposta já incluída na tarefa e o estado dizendo o que já foi feito — é o plano B, e o estado por entidade (passo 11) é o que o torna possível.

## Checklist da sua própria implementação (passo 5)

- [ ] Roda sem interação e termina sozinho.
- [ ] Diretório de trabalho é a pasta do agente.
- [ ] `CLAUDE.md` está sendo lido (aparece no log/contexto).
- [ ] Ensaio = só leitura, por parâmetro e por configuração.
- [ ] Saída guardada inteira, com identificador de sessão.
- [ ] Limite de turnos e de tempo.
- [ ] Nenhum modo "aceitar tudo".
