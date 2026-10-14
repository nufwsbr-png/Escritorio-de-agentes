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

## Ordem das etapas

A ordem é esta porque cada etapa é a fundação da seguinte: a esteira define
as etapas que o CRM vai mostrar; o Cuki BOT lê as esteiras para o laudo e
propõe as respostas do CRM; o WhatsApp do Cuki BOT é o canal de aviso que
esteira e CRM usam. **Entre etapas, o dono dá o ok.** Dentro de uma etapa,
cada tarefa termina com teste e commit.

### Etapa 0: fundações pequenas (meio dia)

Design: `specs/2026-10-14-esteiras-design.md`, seção "Como funciona", itens 2 e 6.

- [ ] `agentes.js`: contratar grava `id` em `agente.json` e gera `GATILHO_CHAVE` no `.env`; o servidor sobe o agente com `AGENTE_ID`.
- [ ] Molde `tarefa/server.js`: rota `GET /entidades` (lista de `rodar.listar()`, protegida pela `GATILHO_CHAVE`). Espelhar em `exemplo-agente/`.
- [ ] `rodar.js`: busca `GET /api/agentes/<id>/mensagens?entregar=1` antes da rodada e põe os recados no prompt ("dado a processar, não ordem"). Servidor: `entregar=1` marca como entregues.
- [ ] Testes: unidade (recados no prompt), API (`/entidades` com e sem chave), conferidor verde.

### Etapa 1: Esteiras (2 a 3 dias)

Design: `specs/2026-10-14-esteiras-design.md`.

- [ ] `esteiras.js`: definição, estado por entidade, vigília (20 s), passagem por gatilho + recado, aprovação/devolução, paradas por entidade, fila (um gatilho por agente por vez), avisos.
- [ ] Rotas: `GET/POST /api/esteiras`, `POST /api/esteiras/:id/entrar`, `POST /api/esteiras/:id/:entidade/aprovar|devolver`.
- [ ] Entrada por pasta vigiada (subpasta nova na pasta compartilhada), opcional por esteira.
- [ ] Tela: botão 🧵 Esteiras, colunas por etapa, cartões, botões Aprovar/Devolver; boneco entrega na mesa do colega.
- [ ] Skill `/criar-esteira` (cinco perguntas simples, proposta pronta; grava por `node esteiras.js criar`).
- [ ] Testes: unidade (máquina de estados com agentes falsos), API, fumaça (painel). Verificação real com 2 agentes de tarefa de teste e relato em `verificacoes/`.
- [ ] Docs: README (seção "Esteiras"), `CLAUDE.md` raiz (linha na tabela), `ANATOMIA.md` (componente 11 cita gatilho do escritório e recados nas rodadas).

### Etapa 2: Cuki BOT analista (1 a 2 dias)

Design: `specs/2026-10-14-cuki-bot-design.md`, Parte 1.

- [ ] `cuki.js`: medidas por área (agentes, plataformas, fluxo, base, aptidão CRM), semáforo, `data/cuki/laudos/<data>.json`.
- [ ] Laudo pelo Claude Code **sem ferramentas**, com as medidas como contexto; `data/cuki/laudos/<data>.md`. Teste varre o contexto: nenhum valor de variável.
- [ ] Rotas `GET /api/cuki/laudo`, `POST /api/cuki/analisar` (admin). Tela: botão 🩺, laudo com semáforo, "rodar de novo". Boneco "Cuki BOT, analista" na recepção; clicar abre o laudo.
- [ ] Testes: unidade (medidas com escritório de teste: agente fora do ar → vermelho), API, fumaça. Verificação real: um laudo do escritório de exemplo.

### Etapa 3: Cuki BOT no WhatsApp via WAHA (2 dias)

Design: `specs/2026-10-14-cuki-bot-design.md`, Parte 2.

- [ ] Ajustes › Cuki BOT (admin): `WAHA_URL`, `WAHA_KEY`, `WAHA_SESSAO` em `data/cuki.json`; Testar (estado da sessão, QR se precisar); números autorizados (nome, número, papel) com adicionar/remover; registro do webhook com segredo gerado.
- [ ] `POST /api/cuki/whatsapp`: confere o segredo, ignora e registra não autorizados, limita 20 msg/número/hora, monta contexto por código, rodada do Claude sem ferramentas com `--resume` por número, responde pelo WAHA.
- [ ] `avisos.js`: canal `cuki` (WAHA `sendText`), preferido para os autorizados quando configurado; todos os avisos atuais passam a sair também por ele.
- [ ] Briefing: comando "briefing" e automático junto do resumo diário.
- [ ] Testes: unidade (contexto sem segredos; autorizado × não autorizado; limite), API com WAHA falso, fumaça (Ajustes). Verificação real com um WAHA de teste e relato.
- [ ] Docs: README ("Cuki BOT"), `CLAUDE.md` raiz.

### Etapa 4: Criar CRM (5 a 8 dias, em sub-etapas com ok entre elas)

Design: `specs/2026-10-14-criar-crm-perguntas.md` (perguntas e híbrido) e um design técnico a escrever no início da etapa (`specs/<data>-crm-design.md`), com aprovação do dono.

- [ ] 4a. Skill `/criar-crm`: chama o Cuki BOT (vermelho trava), faz as 6 perguntas essenciais + 5 ajustes com proposta pronta, inclui a pergunta "onde ficam as fichas" (local ou Supabase), grava `crm/config.json` pelos scripts.
- [ ] 4b. O sistema `crm/`: contrato do escritório (`/saude`, `/painel`, `/log`, porta), camada de dados isolada (arquivos locais ou Supabase conforme a resposta), fichas, etapas (as da esteira), cargos, usuários (pessoas com login; agentes com token), histórico com autor, propostas pendentes, tarefas, importação.
- [ ] 4c. Agentes no CRM: plataforma `api` "CRM" marcada por agente com token e cargo; `tools/crm.js` gerada no agente (ler ficha, mover etapa, anotar, propor); o estado da entidade passa a viver no CRM (decisão A); assumir/devolver vira reatribuir; proposta pendente aparece na ficha.
- [ ] 4d. Funcionários-agentes na tela do CRM: nome, cargo, boneco, estado lido do escritório, link para o monitor. Contratar, treinar e permitir continuam só no escritório.
- [ ] 4e. Pessoas: cargos e permissões escolhidos nas perguntas; apagar ninguém (arquiva); dados sensíveis mascarados para quem o cargo define; acesso de fora conforme a resposta.
- [ ] Testes em cada sub-etapa; verificação real com um escritório de teste completo; relato em `verificacoes/`.

## Como retomar depois de perder o contexto

1. Leia este arquivo e o `CLAUDE.md` da raiz.
2. Veja a última etapa marcada e o último commit (`git log --oneline -5`).
3. Leia o design da etapa em andamento em `docs/superpowers/specs/`.
4. Rode `npm test`. Só então continue pela próxima tarefa desmarcada.
5. Não reabra decisões da seção "O que foi combinado". Se precisar mudar
   uma, pergunte ao dono e registre a resposta aqui.
