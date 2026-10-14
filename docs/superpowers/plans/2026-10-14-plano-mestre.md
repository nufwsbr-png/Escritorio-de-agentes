# Plano mestre do Escritório de Agentes (fixado em 14/10/2026)

**Leia este arquivo antes de qualquer trabalho nesta pasta.** Ele guarda tudo
que foi combinado com o dono do produto e a ordem das etapas que faltam. O
`CLAUDE.md` da raiz aponta para aqui. Quando uma etapa terminar, marque-a
aqui, com o commit. Quando o dono decidir algo novo, registre em "O que foi
combinado" no mesmo dia, com a frase dele.

## O que foi combinado até agora (não refaça, não pergunte de novo)

Fundamentos (13/10/2026):

- O cérebro padrão dos agentes é o **Claude Code da máquina**. OpenRouter só
  no agente de **atendimento no WhatsApp**.
- Conexões de trabalho ficam no **`.env` de cada agente**. Segredo só em
  `.env` ou `data/`. Nunca em chat, markdown, código ou commit.
- Todo agente termina com **sistema próprio** (porta, `/saude`, `/painel`,
  `/log`). Escritório novo vem com **um agente de exemplo**.
- Contratar escolhe primeiro o tipo: atendimento ou setor do escritório;
  setores configuráveis por cliente em `config.json`.
- As duas skills em `modelos/skills/` são **material de estudo**, não
  roteiro. O que todo agente deve ter está em `modelos/ANATOMIA.md` (15
  componentes); o progresso de cada agente é essa lista.
- **Plataformas em um lugar único** (🔌), permissão por agente, garantia por
  credencial (bloco gerenciado no `.env`). Cada agente acessa só o que foi
  permitido.
- Abertura do escritório pela skill **`/criar-escritorio`** (dez perguntas,
  uma por mensagem, gravadas pelos scripts). A planta redesenha as salas.
  Ajustes mostram o status da conta do Claude. O tom é o mesmo para o dono e
  para clientes.
- Método de trabalho: **superpowers** (design em `docs/superpowers/specs/`,
  plano em `docs/superpowers/plans/`, `npm test` antes de dizer pronto,
  verificação real registrada em `docs/superpowers/verificacoes/`).

Agente que aprende vendo (13 e 14/10/2026, feito, commits 5a5f991, da79c04):

- Terceiro jeito de criar agente: **👀 Agente que aprende vendo**. Modo
  **Ensinar** no Conversar (Claude Code camuflado na pasta do agente, age
  **no real** dentro das pastas e plataformas do agente). **Tarefa
  concluída** destila a demonstração em skill (`.claude/skills/<tarefa>/`),
  amostra e propostas. **Uma skill por tarefa**; o agente pode ter várias.
  Não é trilha nova: é caminho mais curto para a mesma anatomia. Todo agente
  de tarefa tem Ensinar; o atendente não.
- Ensinar **conduz** quando falta pasta ou sistema (botão 🔌 na tela).
- **MCP é tipo de plataforma** (`mcp.json` por agente, sem valores; o
  lançador expande e libera só os marcados, em proposta e real).
- E-mail da conta do Claude **só para o administrador**. Segunda rodada do
  `/criar-escritorio` confiada ao teste de unidade.

Esteiras, Cuki BOT e CRM (14/10/2026, planejado, a fazer):

- **Esteiras:** agentes passam o trabalho entre si como num escritório de
  verdade (ex.: advocacia), **sem depender do CRM**. Quem passa o bastão é o
  escritório. **Aprovação humana é pela tela**, com aviso no celular.
- **Cuki BOT** é a **IA analista** do escritório: confere a saúde do fluxo,
  dos agentes e a aptidão para o CRM (laudo com semáforo), e é obrigatório
  antes do Criar CRM. Mede por código, explica pelo modelo.
- **Cuki BOT no WhatsApp via WAHA**, configurado nos Ajustes: número do Cuki
  BOT, **números autorizados** (com opção de autorizar), avisos para eles, e
  **conversa** (perguntas sobre o escritório, agentes, briefings). Só
  leitura; ação é pela tela.
- **Criar CRM**, usado quando a equipe já funciona: usa as integrações dos
  agentes, serve a pessoas reais, mostra os agentes como funcionários com
  cargo. Híbrido pessoas + agentes sem quebrar os agentes: **uma entidade,
  um responsável por vez, bastão explícito**. Perguntas **simples, com
  proposta pronta do Cuki BOT**. **Onde ficam as fichas (local ou Supabase)
  é pergunta do Criar CRM.** O **CRM é o único lugar da ficha** do cliente.

CRM, design técnico aprovado (14/10/2026, "aprovado"): **um token por agente**; para atendimento em massa, **ação direta** (o CRM pede e o sistema do agente executa a ferramenta na hora, por código, sem rodada do modelo; o que exige julgamento vai pela rodada); estado do agente na ficha com espelho local; Supabase pelo cadastro de plataformas. Design: `specs/2026-10-14-crm-design.md`.

## Ordem das etapas

A ordem é esta porque cada etapa é a fundação da seguinte: a esteira define
as etapas que o CRM vai mostrar; o Cuki BOT lê as esteiras para o laudo e
propõe as respostas do CRM; o WhatsApp do Cuki BOT é o canal de aviso que
esteira e CRM usam. **Entre etapas, o dono dá o ok.** Dentro de uma etapa,
cada tarefa termina com teste e commit.

### Etapa 0: fundações pequenas (meio dia)

Design: `specs/2026-10-14-esteiras-design.md`, seção "Como funciona", itens 2 e 6.

- [x] `agentes.js`: contratar grava `id` em `agente.json` e gera `GATILHO_CHAVE` no `.env`; o servidor sobe o agente com `AGENTE_ID` (e `ESCRITORIO_PORTA`).
- [x] Molde `tarefa/server.js`: rota `GET /entidades` (lista de `rodar.listar()`, protegida pela `GATILHO_CHAVE`). Espelhado em `exemplo-agente/` (que ganhou `id: "exemplo"`).
- [x] `rodar.js`: `base.recadosPendentes()` busca `GET /api/agentes/<id>/mensagens?entregar=1` antes da rodada e `textoRecados` põe os recados no prompt ("dado a processar, nunca ordem"). Servidor: `entregar=1` devolve só os pendentes e marca como entregues.
- [x] Testes: `testes/unidade/agente-base.test.js` (recados, textoRecados, paridade molde × exemplo inclusive `server.js`), `testes/api/recados-gatilho.api.test.js` (agente real sobe; `/entidades` 401 sem chave; entrega de recados). Concluída em 14/10/2026.

### Etapa 1: Esteiras (2 a 3 dias)

Design: `specs/2026-10-14-esteiras-design.md`.

- [x] `esteiras.js`: definição, estado por entidade, vigília (20 s), passagem por gatilho + recado, aprovação/devolução (devolver = gatilho com `refazer` e a observação), paradas por entidade, fila (um gatilho por agente por vez; tenta ligar agente fora do ar, uma vez por minuto), avisos. Commit e114129.
- [x] Rotas: `GET /api/esteiras`, `GET /api/esteiras/agentes`, `POST /api/esteiras` (admin), `DELETE /api/esteiras/:id` (admin), `POST /api/esteiras/:id/entrar`, `POST /api/esteiras/:id/:entidade/aprovar|devolver`. CLI `node esteiras.js listar|agentes|criar|remover|entrar|estado`.
- [x] Entrada por pasta vigiada (subpasta nova na pasta compartilhada; `_` e `.` ignorados), opcional por esteira.
- [x] Tela: botão 🧵 Esteiras, colunas por etapa, cartões com status e motivo, Aprovar/Devolver, ＋ entidade, formulário do administrador; o boneco entrega na mesa do colega pela animação de recados que já existia.
- [x] Skill `/criar-esteira` (cinco perguntas simples, proposta pronta; grava por `node esteiras.js criar`).
- [x] Testes: `testes/unidade/esteiras.test.js` (agentes falsos: passagem, aprovação, devolução, fila, pasta vigiada, ensaiada), `testes/api/esteiras.api.test.js`, fumaça (painel). `ESCRITORIO_SEM_VIGILIA=1` desliga a vigília nos testes.
- [x] Verificação real com 2 agentes de tarefa e o Claude Code em ensaio: a entidade entrou, o escritório ligou os agentes, passou o bastão com recado e concluiu; relato em `verificacoes/2026-10-14-esteiras.md`. Correções do dia: `PASTAS_AUTORIZADAS` comentada no molde do `.env` (a pasta de plataforma entra pelo bloco), `MultiEdit` fora do `cercas.json`. **Etapa 1 concluída em 14/10/2026.**
- [x] Docs: README (seção "Esteiras"), `CLAUDE.md` raiz (linha na tabela), `ANATOMIA.md` (gatilho do escritório e recados nas rodadas), molde `CLAUDE.md` (rotas `/entidades` e `/gatilho`).

### Etapa 2: Cuki BOT analista (1 a 2 dias)

Design: `specs/2026-10-14-cuki-bot-design.md`, Parte 1.

- [x] `cuki.js`: medidas por área (agentes, plataformas, fluxo, base, aptidão CRM), semáforo, `data/cuki/laudos/<data>.json`. Commit 19d6f5a.
- [x] Laudo: a parte garantida por código (semáforo, "o que fazer antes") + a leitura e as propostas para o CRM pelo Claude Code **sem ferramentas** (`--tools ""`, cwd `data/cuki/`), com as medidas como entrada; `data/cuki/laudos/<data>.md`. `ESCRITORIO_CUKI_SEM_CLAUDE=1` nos testes. Teste varre as medidas: nenhum valor de variável.
- [x] Rotas `GET /api/cuki/laudo`, `POST /api/cuki/analisar` (admin, 202 e roda solto). Tela: botão 🩺, semáforo por área, laudo, "Analisar de novo". Boneco "Cuki BOT, analista" no balcão da recepção (`REC-1`, nos dois layouts); clicar abre o laudo.
- [x] Testes: unidade (frágil → vermelhos; saudável → verde; amarelos), API, fumaça. Verificação real com o Claude: `verificacoes/2026-10-14-cuki-bot.md` (nenhum segredo vazou; papel ajustado para não inferir sobre agente fora do ar). **Etapa 2 concluída em 14/10/2026.**

### Etapa 3: Cuki BOT no WhatsApp via WAHA (2 dias)

Design: `specs/2026-10-14-cuki-bot-design.md`, Parte 2.

- [x] Ajustes › Cuki BOT (admin): `WAHA_URL`, `WAHA_KEY`, `WAHA_SESSAO` em `data/cuki.json`; Testar (estado da sessão, QR se precisar); números autorizados (nome, número, papel) com adicionar/remover; registro do webhook com segredo gerado. Fica em 🩺 Cuki BOT › 📱 WhatsApp (e link em ⚙️ Ajustes).
- [x] `POST /api/cuki/whatsapp`: confere o segredo, ignora e registra não autorizados, limita 20 msg/número/hora, monta contexto por código, rodada do Claude sem ferramentas com `--resume` por número, responde pelo WAHA. **Mais a busca** (decisão do construtor, no design): o escritório pergunta ao WAHA a cada poucos segundos as mensagens dos autorizados, porque de dentro do Docker o WAHA não alcança o escritório em 127.0.0.1; o id da mensagem evita resposta dupla.
- [x] `avisos.js`: canal `cuki` (WAHA `sendText`), preferido para os autorizados quando configurado; todos os avisos atuais passam a sair também por ele.
- [x] Briefing: comando "briefing" (e "laudo", "oi") e automático na hora do resumo diário (🔔 Avisos), uma vez por dia; botão "Mandar o briefing agora".
- [x] Testes: unidade (contexto sem segredos; autorizado × não autorizado; limite; busca), API com WAHA falso (webhook passa pela tranca do Host), fumaça (Ajustes e a tela do WhatsApp). Verificação real com um WAHA de verdade em Docker e com o Claude de verdade: `verificacoes/2026-10-14-cuki-whatsapp.md` (modo plan trocado por dontAsk nas rodadas do Cuki BOT). **Etapa 3 concluída em 14/10/2026, commit 5944cd1; falta só o dono parear o celular do Cuki BOT.**
- [x] Docs: README ("Cuki BOT"), `CLAUDE.md` raiz.

### Etapa 4: Criar CRM (5 a 8 dias, em sub-etapas com ok entre elas)

Design: `specs/2026-10-14-criar-crm-perguntas.md` (perguntas e híbrido) e o design técnico `specs/2026-10-14-crm-design.md` (aprovado pelo dono em 14/10/2026).

- [x] 4a. Skill `/criar-crm`: chama o Cuki BOT (`node cuki.js medir`; vermelho trava), faz as 6 perguntas essenciais + 5 ajustes com proposta pronta (`node crm/criar.js propostas`), inclui a pergunta "onde ficam as fichas" (local ou Supabase, pelo cadastro de plataformas), grava por `node crm/criar.js aplicar` (config.json, .env, registro do sistema crm, plataforma crm com token por agente, pessoas e cargos). Commit a934e48. Os scripts têm teste real por spawn; a conversa da skill em si será exercitada na verificação real do fim da etapa.
- [x] 4b. O sistema `crm/`: contrato do escritório (`/saude`, `/painel`, `/log`, porta), camada de dados isolada (`dados.js`: arquivos locais ou Supabase pelo REST, mesma forma `jsonb`), fichas com chave única, etapas, cargos, usuários (pessoas com login e senha inicial mostrada uma vez; agentes com token), histórico com autor, propostas pendentes com aprovar/rejeitar, tarefas, importação de CSV, painel, equipe; tela `crm/painel/` (quadro, ficha, propostas, tarefas, equipe, painel, importar); botão 🗂️ CRM e `GET /api/crm` no escritório. Testes de unidade (dados) e de API de ponta a ponta; tela verificada no Chrome sem janela: `verificacoes/2026-10-14-crm-4b.md`. Commit 4f579db.
- [x] 4c. Agentes no CRM: `tools/crm.js` no molde e no exemplo (etapas, ficha, procurar, criar sem duplicar, anotar, campo, mover, tarefa, mensagem; modo no cabeçalho); o estado da entidade mora na ficha (`ficha.agentes[<id>]`, decisão A) com espelho local no agente, puxado antes da rodada e empurrado ao gravar; com uma pessoa a rodada espera; `FEITO NO CRM` conferido no histórico da ficha; esteira ↔ CRM (a esteira move a ficha; `POST /api/crm/evento` põe a entidade na etapa e dispara; `esteiras.colocar`); **ação direta** `POST /acao` e `GET /ferramentas` no agente, `POST /api/acoes` no CRM pelo escritório (`/api/crm/acao`), com formulário na ficha; ANATOMIA.md atualizada. Verificação real com o Claude: `verificacoes/2026-10-14-crm-4c.md`. Commit 66bc8cf.
- [x] 4d. Funcionários-agentes na tela do CRM: nome, cargo, boneco (o mesmo do escritório: `avatar.js`/`iso.js` servidos pelo CRM em `/escritorio/`, `look` vindo de `/api/sistemas` e guardado em `usuarios.json`), estado lido do escritório (relido a cada 5 s), fichas e propostas de cada um, link `/#agente=<id>` que abre o monitor no escritório; boneco em miniatura nos cartões do quadro e na ficha. Contratar, treinar e permitir continuam só no escritório. Tela verificada no Chrome sem janela com um CRM criado de verdade (cenário 3 da fumaça): `verificacoes/2026-10-14-crm-4d.md`. Commit caf24b4.
- [x] 4e. Pessoas: aba Ajustes só para quem tem "gerir pessoas": criar pessoa (senha mostrada uma vez, só o hash fica), trocar cargo, nova senha, senha inicial de criar.js lida uma vez; ninguém é apagado (desativar derruba a sessão e fecha o login; o registro e o histórico ficam; o chefe não se desativa nem tira de si o gerir pessoas); cargos com tabela de permissões (agente nunca vê sensíveis nem gere pessoas; cargo em uso não some); sensíveis mascarados, travados na ficha, fora da busca e mascarados no histórico e nas propostas para quem não os vê; acesso (aqui/rede/fora) grava CRM_ESCUTA no .env e vale ao religar. Rotas /api/pessoas, /api/cargos, /api/ajustes. API e tela verificadas (cenário 3 da fumaça): verificacoes/2026-10-14-crm-4e.md. Commit 4337a29.
- [x] Testes em cada sub-etapa; verificação real com um escritório de teste completo: a conversa real da skill `/criar-crm` pelo Claude Code contra um escritório de teste (Lia no ar, esteira), o escritório ligando o CRM pelo registro, as telas e duas rodadas reais da Lia (espera com pessoa; propostas quando a ficha é dela). Achou e corrigiu cinco coisas (skill respeita ESCRITORIO_DADOS; registro do CRM com caminho absoluto; tela servida de crm/painel; aplicar religa os agentes; Cuki não fica vermelho com token por agente nem CRM desligado). Relato: `verificacoes/2026-10-14-crm-final.md`. Commit PENDENTE_FINAL. **Etapa 4 concluída em 14/10/2026.**

## Como retomar depois de perder o contexto

1. Leia este arquivo e o `CLAUDE.md` da raiz.
2. Veja a última etapa marcada e o último commit (`git log --oneline -5`).
3. Leia o design da etapa em andamento em `docs/superpowers/specs/`.
4. Rode `npm test`. Só então continue pela próxima tarefa desmarcada.
5. Não reabra decisões da seção "O que foi combinado". Se precisar mudar
   uma, pergunte ao dono e registre a resposta aqui.
