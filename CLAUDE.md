# Escritório de Agentes — instruções para quem abre esta pasta no Claude Code

Esta pasta é o **produto**: um escritório isométrico no navegador que sobe,
vigia e opera os agentes de IA de um negócio. Só Node.js e o Claude Code da
máquina; nenhuma dependência. Cada agente contratado nasce com a **anatomia**
de `modelos/ANATOMIA.md` e vive em `agentes/<id>/`, com pasta e sistema
próprios. Os dados do escritório ficam em `data/`, fora do git.

## Plano mestre: leia antes de trabalhar

`docs/superpowers/plans/2026-10-14-plano-mestre.md` guarda **tudo que foi
combinado com o dono** e a ordem das etapas que faltam (fundações, esteiras,
Cuki BOT analista, Cuki BOT no WhatsApp via WAHA, Criar CRM). Leia-o no
começo de toda sessão de construção, siga a próxima tarefa desmarcada, marque
o que terminar com o commit, e registre ali qualquer decisão nova do dono no
mesmo dia. Não reabra decisões já tomadas.

## O que fazer quando a pessoa quer criar o escritório

Use a skill **`/criar-escritorio`** (`.claude/skills/criar-escritorio/`). Ela
faz as dez perguntas da abertura, uma por mensagem, e grava tudo pelos
scripts do projeto. Também vale quando a pessoa escreve "criar escritório",
"abrir o escritório", "configurar para o cliente X" ou quando não existe
`data/config.json`. **Nunca** monte `config.json`, `plataformas.json`,
`avisos.json` ou `admin.json` à mão: são os scripts `abertura.js`,
`plataformas.js` e `planta.js` que gravam, e a skill que pergunta. Para
mudar o que a abertura pergunta, edite a skill, não a tela.

## Onde fica cada coisa

| Coisa | Lugar | Quem escreve |
|---|---|---|
| Servidor do escritório: tela, API, sobe e vigia sistemas, tranca | `server.js` | o construtor |
| Senha e sessão do administrador | `admin.js`, hash em `data/admin.json` | o botão 🔐 Admin ou `node abertura.js senha` |
| Contratar: anatomia, trilhas, setores, progresso, ficha | `agentes.js` | o construtor |
| Conexões do negócio (na tela "🔌 Conexões"; por dentro, `plataformas`): CRM, planilha, agenda, pasta, servidor MCP…; cadastro, permissão por agente e o **teste de conexão** por tipo (`testar`: conectada, sem chave, falhou, desligada; estado gravado na plataforma, nunca o valor; roda ao salvar, ao subir e a cada 15 min; faixa no topo quando alguma precisa de gente; o Cuki BOT usa o mesmo teste) | `plataformas.js`, `data/plataformas.json`, bloco gerenciado no `.env` de cada agente e `mcp.json` (tipo mcp, sem valores); rotas `POST /api/plataformas/testar` e `/api/plataformas/:id/testar` | o botão 🔌 Conexões (Testar, Testar todas), `node plataformas.js testar` |
| Abertura do escritório (as dez perguntas) | `abertura.js`, skill `/criar-escritorio` | a skill, pelos scripts |
| Esteiras: o trabalho passando de agente em agente, aprovação pela tela | `esteiras.js`, `data/esteiras.json`, estado em `data/esteiras/<esteira>/`, skill `/criar-esteira`; no agente, `GET /entidades` e `POST /gatilho` com `GATILHO_CHAVE` | o botão 🧵 Esteiras, `node esteiras.js`, a skill |
| Cuki BOT, a IA analista: medidas, semáforo, laudo (sem ferramentas, sem segredos) | `cuki.js`, `data/cuki/laudos/`, boneco na recepção | o botão 🩺 Cuki BOT (analisar é do administrador) |
| Cuki BOT no WhatsApp (WAHA): avisos e conversa com os números autorizados, busca e webhook, briefing diário | `cuki.js` (parte 2), `data/cuki.json` (WAHA, segredo do webhook, autorizados), `data/cuki/conversas.json`, `data/cuki/recusados.log`; canal `cuki` em `avisos.js`; rota `POST /api/cuki/whatsapp` | 🩺 Cuki BOT › 📱 WhatsApp (administrador) |
| Criar CRM: a ficha única do cliente, pessoas com login e agentes como funcionários (etapa 4 concluída em 14/10/2026) | `crm/` (`criar.js` grava `config.json`, `.env` e `data/`, fora do git; `server.js`, `crm.js`, `dados.js` local ou Supabase, `painel/`), skill `/criar-crm`, plataforma `crm` com token por agente (`porAgente` em `plataformas.js`), `data/crm.json`, botão 🗂️ CRM; no agente, `tools/crm.js`, estado na ficha com espelho local, `POST /acao` (ação direta); ponte em `server.js` (`/api/crm/evento`, `/api/crm/acao`) e `esteiras.colocar`; a aba Equipe desenha o boneco do escritório (`avatar.js` servido pelo CRM em `/escritorio/`, `look` em `/api/sistemas`) e abre o monitor por `/#agente=<id>`; a aba Ajustes (quem tem "gerir pessoas") cria e desativa pessoas, edita cargos, sensíveis e acesso (`/api/pessoas`, `/api/cargos`, `/api/ajustes`) | a skill, pelos scripts; o construtor |
| Estúdio: a pessoa escolhe o escritório antes de montar (etapa 5, em construção: hoje é o exemplo em `/estudio`, nada grava) | `estudio/` (HTML, CSS, JS; desenha as prévias com `js/iso.js` e `js/avatar.js`), rota `/estudio` em `server.js` | o construtor |
| Aba Trabalho do monitor: o sistema do agente para leigo, lido da pasta dele (aparece desligado); estado real do boneco (no ar = trabalhando, desligado = sala de descanso) | `js/trabalho.js`, `trabalhoDe` e `agirNoAgente` em `server.js` (`/api/agentes/:id/trabalho`, `/trabalho/acao`), rota `POST /agir` no molde; testador automático (`TESTADOR.agendar`) | o construtor |
| Agente que aprende vendo: modo Ensinar, "Tarefa concluída", skills aprendidas | `ensino.js`; no agente, `ensino/` (fora do git) e `.claude/skills/<tarefa>/SKILL.md` | o servidor (canal de ensino da conversa) e a destilação, na pasta do agente |
| Planta: salas lidas da planta do cliente | `planta.js`, `data/planta.json` | a skill, `node planta.js gerar` |
| Memória do escritório, recados e propostas | `memoria.js`, `data/mensagens.json`, `data/propostas.json` | o servidor |
| Testador, reunião, avisos | `testador.js`, `reuniao.js`, `avisos.js`; `data/testes/`, `data/reunioes/`, `data/avisos.json` | o servidor, o botão 🔔 Avisos |
| Funções compartilhadas (slug, executável do Claude, leitura de `.env`, CLI) | `util.js` | o construtor |
| A tela | `index.html`, `css/`, `js/` (motor isométrico, salas, bonecos, painéis, admin, contratação, plataformas, extras) | o construtor |
| Configuração do escritório: nome, empresa, dono, porta, marca, setores, reunião | `data/config.json` (modelo comentado em `data/config.exemplo.json`) | `node abertura.js aplicar` |
| Registro dos sistemas e da equipe | `data/sistemas.json`, `data/equipe.json` | o servidor (contratar, cadastrar, demitir) |
| Estado de execução (quem está vivo, portas, desejados, conversas, sessões, logs) | `data/vivos.json`, `data/portas.json`, `data/desejados.json`, `data/conversas.json`, `data/sessoes.json`, `data/logs/` | o servidor; pode ser apagado com o escritório parado |
| Logo e planta do cliente | `data/marca/` | a pessoa, na abertura |
| O molde de toda pasta de agente | `modelos/agente/comum/`, `modelos/agente/tarefa/`, `modelos/agente/atendimento/` | o construtor; toda mudança se reflete em `exemplo-agente/` |
| A anatomia (os 15 componentes de todo agente) | `modelos/ANATOMIA.md` | o construtor, com o dono do produto |
| As skills de referência que ensinam a construir agentes | `modelos/skills/criar-agente/`, `modelos/skills/criar-agente-tarefa/` | material do dono do produto; não se edita por conta própria |
| O agente de exemplo, único que vem no escritório | `exemplo-agente/` | o construtor, espelhando o molde |
| Os agentes contratados (pasta, `.env`, memória, saídas) | `agentes/<id>/` | o escritório, pelas rotas; o construtor, em Conversar › Construir ou Resolver dentro da pasta do agente |
| Design e planos de trabalho | `docs/superpowers/specs/`, `docs/superpowers/plans/` | o construtor, com aprovação do dono |
| Testes | `testes/unidade/`, `testes/api/`, `testes/conferir-organizacao.js`, `testes/fumaca.js` | o construtor; `npm test` |
| Scripts do Windows | `INICIAR ESCRITORIO.cmd`, `ABRIR ESCRITORIO.ps1`, `CRIAR ATALHO.ps1` | o construtor |

## Regras para qualquer sessão nesta pasta

- **Segredo só em dois lugares:** `.env` de um agente ou `data/`. Nunca em
  código, em markdown, no chat, no progresso de um agente ou em commit. No
  chat e no log só os **nomes** das variáveis.
- **Endereço e chave de plataforma só pelo cadastro de plataformas.** Nada de
  escrever `OPHIR_TOKEN` à mão no `.env` de um agente: cadastre em 🔌
  Conexões (ou `node plataformas.js criar`) e marque o agente. O bloco entre
  `# >>> plataformas do escritório` e `# <<< plataformas do escritório <<<` é
  do escritório.
- **Dado novo do escritório vai para `data/`**, e o arquivo entra no
  `.gitignore` (já cobre `data/*.json`). Modelo comentado, se precisar, como
  `*.exemplo.json` versionado.
- **Molde novo em `modelos/agente/`**, e a mesma mudança em `exemplo-agente/`.
  Regra nova para agente passa primeiro pela `ANATOMIA.md`, depois pelo molde.
- **Nenhuma escrita em `agentes/` fora das rotas do servidor** quando se está
  na pasta do escritório. Para mexer em um agente, abra Conversar › Resolver
  ou Construir no monitor dele: a sessão roda dentro da pasta do agente, com
  o contrato (`CLAUDE.md` do agente) valendo.
- **Não reestruture pastas nem divida arquivos grandes sem pedir.** `server.js`
  e `js/app.js` são grandes de propósito, em seções nomeadas.
- **Endereço fixo só onde já existe:** `avisos.js` (ntfy, CallMeBot), o
  OpenRouter no molde do atendente, fontes no `index.html` e nas páginas do
  Estúdio, os servidores do
  Google e de IMAP no teste de conexão de `plataformas.js`, documentação.
- **Textos em português do Brasil**, no tom da tela: direto, sem jargão solto.
- **Antes de dizer "pronto", `npm test`.** Ele roda unidade, API, o conferidor
  de organização (segredos, anatomia, endereços, bloco de plataformas) e a
  fumaça da tela. Testes de API e de fumaça sobem o escritório numa porta de
  teste com `ESCRITORIO_DADOS` apontando para uma pasta temporária; nunca
  rode testes contra `data/` de verdade.

## Como o escritório funciona, em uma página

- `npm start` sobe em `http://localhost:4321` (porta em `data/config.json`).
  No Windows, `INICIAR ESCRITORIO.cmd` religa se cair.
- Sem senha de administrador tudo é aberto; com senha, o cliente opera
  (ligar, desligar, Investigar, Ficha, reunião) e o administrador constrói
  (contratar, Resolver, Construir, propostas, testador, plataformas, avisos).
- **Contratar é construir:** a aba Contratar cria `agentes/<id>/` a partir do
  molde da trilha (atendimento no WhatsApp com OpenRouter, ou agente de
  tarefa com o Claude Code em rodadas isoladas), registra em
  `data/sistemas.json`, grava o bloco de plataformas permitidas no `.env` e
  abre Conversar › Construir, onde o construtor segue a anatomia um
  componente por vez, com teste no fim de cada um.
- O agente fala com o escritório por blocos no fim das respostas:
  `<memoria>`, `<mensagem para="id">`, `<proposta arquivo=… secao=… titulo=…>`.
  Propostas e lições só entram com aprovação do dono.
- Leitura recomendada antes de mexer: `README.md` (para pessoas),
  `modelos/ANATOMIA.md`, `docs/superpowers/specs/` (o porquê de cada decisão).
