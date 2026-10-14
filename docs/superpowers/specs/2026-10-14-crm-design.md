# Criar CRM: design técnico (14/10/2026)

Estado: **proposta para aprovação do dono**, no começo da etapa 4 do plano
mestre. Base: `2026-10-14-criar-crm-perguntas.md` (as perguntas e o
princípio do híbrido, já aprovados) e o que o escritório já tem (esteiras,
Cuki BOT, plataformas, anatomia). Nada aqui reabre o que foi decidido; o que
é novo está marcado como **decisão do construtor** no fim, para o dono
confirmar ou trocar.

## Em uma frase

O CRM é **mais um sistema do escritório** (`crm/`), só Node como o resto,
que guarda a **ficha** de cada cliente (ou paciente, processo…), o passo em
que ela está e quem cuida dela agora; pessoas entram com login e cargo,
agentes entram com token e cargo, e tudo que acontece na ficha tem autor.

## O que é criado

```
crm/
  server.js        o sistema: /saude, /painel, /log, a API e a tela
  crm.js           a lógica: fichas, etapas, propostas, tarefas, cargos, usuários
  dados.js         a camada de dados: local (arquivos) ou Supabase, mesma interface
  criar.js         grava config.json a partir das respostas da skill; registra o sistema
  painel/          a tela (HTML, CSS, JS sem dependência): login, quadro, ficha, equipe, ajustes
  config.json      as respostas das perguntas (sem segredo)
  .env             segredos do CRM: segredo das sessões, token dos agentes, bloco de plataformas
  data/            fichas, histórico, usuários… quando a resposta é "local" (fora do git)
.claude/skills/criar-crm/SKILL.md     a skill que pergunta e grava
modelos/agente/comum/tools/crm.js      a ferramenta do agente (vai para o molde e o exemplo)
```

`crm/` entra em `data/sistemas.json` como sistema `local` (`comando: node`,
`args: [server.js]`, porta própria, `abre: /`), como qualquer agente: o
escritório liga, vigia, embute o painel no monitor e mostra o estado. Um
botão **🗂️ CRM** no topo do escritório aparece quando o CRM existe e abre a
tela dele em outra aba.

## A ficha e o que gira em volta dela

| Coleção | O que guarda |
|---|---|
| `fichas` | id, a **chave única** (telefone, CPF ou e-mail, pergunta 1), campos (nome, telefone, e-mail, origem, observações e os que os agentes já usam), `etapa`, `responsavel` ({tipo: pessoa ou agente, id}), `status` (ativa, perdida, arquivada), motivo de perda, `agentes` (o estado de cada agente nessa ficha: ver "estado da entidade"), datas |
| `historico` | ficha, quando, **autor** (pessoa ou agente, nome), tipo (criada, movida, anotada, campo alterado, atribuída, proposta, aprovada, rejeitada, tarefa), texto, de → para. Só cresce: nada se apaga |
| `propostas` | o que um agente quer fazer e precisa de pessoa: ficha, agente, tipo (mover, anotar, alterar campo, mensagem ao cliente), conteúdo, estado (pendente, aprovada, rejeitada), quem decidiu |
| `tarefas` | ficha, título, para quem (pessoa ou agente), prazo, feita por quem, criada por quem (pessoa cria; agente propõe) |
| `usuarios` | pessoas (nome, login, hash da senha, cargo, ativa) e agentes (id do escritório, nome, cargo, lido do escritório) |
| `cargos` | nome e permissões: ver tudo, editar ficha, mover etapa, aprovar propostas, ver dados sensíveis, gerir pessoas |
| `config` | entidade (singular, plural, chave), etapas (id, nome, responsável padrão, pede aprovação de pessoa?), "perdido" permitido, autonomia dos agentes (a/b/c), chefe, campos sensíveis, como avisar, acesso (só aqui / de fora), onde ficam as fichas (local / Supabase), integrações (agenda e planilha: espelho, fonte ou não) |

**Cargos** nascem das respostas: o chefe (pergunta 5) tem tudo; cada pessoa
da pergunta 3 recebe um cargo com o nome da função dela (vendedora,
recepção…) e as permissões padrão (editar ficha, mover etapa, não ver
sensíveis, não gerir pessoas); cada agente recebe um cargo com o nome do
setor dele e as permissões que a pergunta 6 define. Tudo editável depois na
tela, pelo chefe.

**Ninguém é apagado:** pessoa desativada e ficha arquivada continuam no
histórico.

## Onde ficam as fichas: a camada de dados

`dados.js` tem uma interface só (`listar`, `obter`, `gravar`, `anexar` por
coleção) e duas implementações:

- **local**: um arquivo JSON por coleção em `crm/data/`, histórico em
  `historico.jsonl` (só anexa). Escrita atômica (grava em temporário e
  renomeia). Serve para "só aqui" e para equipes pequenas.
- **Supabase**: uma tabela por coleção, todas com a mesma forma
  (`id text primary key, dados jsonb, atualizado timestamptz`), acessadas
  pela API REST do Supabase com a chave de serviço. Com uma coluna `jsonb`
  as duas implementações guardam exatamente o mesmo documento, e trocar de
  uma para a outra é exportar e importar. O SQL que cria as tabelas sai de
  `node crm/dados.js esquema`; a pessoa cola no editor SQL do Supabase (ou o
  Claude Code aplica, se o conector do Supabase estiver ligado).

**A chave do Supabase nunca passa pelo chat.** A pessoa cadastra o Supabase
em 🔌 Plataformas (tipo `banco`: `SUPABASE_URL`, `SUPABASE_CHAVE`) e marca o
**CRM** como quem usa; o bloco gerenciado vai para `crm/.env` como vai para
os agentes. A skill só pergunta o nome da plataforma.

## Quem entra e como

- **Pessoas:** login e senha na tela (hash com `scrypt`, como `admin.js`),
  sessão em cookie, senha inicial gerada pela skill e mostrada **uma vez** na
  tela do CRM para o chefe entregar (não no chat). O chefe troca e cria
  pessoas na tela.
- **Agentes:** `Authorization: Bearer <CRM_TOKEN>` mais o cabeçalho
  `x-agente: <id>`. O token é um só, gerado em `crm/.env`, e chega aos
  agentes pela plataforma **`crm`** (tipo `api`: `CRM_URL`, `CRM_TOKEN`),
  marcada por agente em 🔌 Plataformas: sem a marca, o agente não tem o
  token e não enxerga o CRM. O CRM confere o token e que o `x-agente` é um
  funcionário-agente cadastrado, e aplica o cargo dele.
- **O escritório:** mesmo token, com `x-agente: escritorio`, para a esteira
  mover fichas e para o Cuki BOT ler contagens.
- Toda rota de escrita exige a permissão do cargo. Agente nunca tem "ver
  sensíveis" nem "gerir pessoas".

## O híbrido na prática: uma ficha, um responsável, bastão explícito

- **Responsável** é quem pode escrever na ficha agora. Quando o responsável
  é uma pessoa, toda escrita de agente nessa ficha é recusada com
  `com uma pessoa` (é o "assumir" da anatomia, visto do CRM). **Reatribuir**
  na tela é o assumir/devolver: ao devolver para o agente, o que a pessoa
  fez fica no histórico como **decisão final** e entra na rodada do agente
  como "FEITO PELO DONO", que ele nunca desfaz.
- **Autonomia** (pergunta 6) decide o que o agente faz direto e o que vira
  proposta: (a) tudo vira proposta; (b) mover para etapa marcada "fala com
  cliente ou dinheiro", mensagem ao cliente e alteração de campo sensível
  viram proposta, o resto é direto; (c) direto o que o agente já faz em modo
  real. E em qualquer caso: agente em **modo proposta** no escritório só
  propõe. Proposta pendente aparece na ficha com Aprovar e Rejeitar, e a
  decisão volta ao agente na próxima rodada (aprovada = feito; rejeitada =
  motivo, como hoje em `rodar.js`).
- **Esteira e CRM** falam a mesma língua: as etapas do CRM são propostas a
  partir das esteiras (pergunta 2). Quando a esteira passa o bastão, o
  escritório move a ficha no CRM (etapa e responsável). Quando uma pessoa
  move uma ficha na tela para uma etapa cujo responsável é um agente, o CRM
  avisa o escritório (`POST /api/crm/evento`, com o segredo do CRM) e o
  escritório dispara o gatilho como se a esteira tivesse avançado. Uma ficha
  nova criada na tela entra na esteira do mesmo jeito.
- **Estado da entidade (decisão A do dono):** o que hoje fica em
  `memoria/entidades/<slug>.json` no agente (status, rodadas, perguntas,
  feito pelo dono) passa a morar na ficha, em `ficha.agentes[<id>]`. O
  agente mantém um **espelho local** desse pedaço só para as funções
  síncronas do lançador: antes de cada rodada puxa do CRM, depois de cada
  mudança empurra. Sem o CRM no ar, o agente não roda na entidade e deixa no
  log "CRM fora do ar", como qualquer plataforma que falta. Sem plataforma
  `crm` marcada, tudo continua como hoje: o CRM é opcional por agente.

## O que o agente ganha: `tools/crm.js`

Uma ferramenta sobre `tools/base.js`, gerada no molde (e no exemplo), que
só funciona com a plataforma `crm` permitida:

```
node tools/crm.js ficha     <chave|id>                     lê a ficha (sem campos sensíveis)
node tools/crm.js procurar  "<texto>"                      acha fichas por nome, telefone, etapa
node tools/crm.js criar     <chave> <arquivo-json>         cria (se a chave já existe, devolve a existente: nunca duplica)
node tools/crm.js anotar    <chave|id> "<texto>"           escreve no histórico
node tools/crm.js campo     <chave|id> <campo> "<valor>"   altera um campo
node tools/crm.js mover     <chave|id> <etapa>             move de etapa
node tools/crm.js tarefa    <chave|id> "<título>" [prazo]  propõe uma tarefa para uma pessoa
```

Em **ensaio** só diz o que faria; em **proposta** tudo vai como proposta
pendente; em **real** faz direto o que a autonomia permite, e o resto vai
como proposta. A ferramenta nunca apaga e devolve `recusado` com o motivo
quando a ficha está com uma pessoa, quando o cargo não permite ou quando a
etapa não existe. O `prompt-agente.md` do agente ganha a seção da ferramenta
quando a plataforma é marcada (como as outras plataformas fazem hoje).

## As integrações dos agentes (pergunta 8)

O CRM **não fala com o Google nem com o WhatsApp diretamente**: ele usa as
integrações dos agentes, que já existem, já têm cerca e já foram testadas.
"Quando alguém marcar um horário no CRM, crio o evento na agenda" vira:
o CRM cria uma **tarefa** para o agente que tem a plataforma de agenda, e o
agente a cumpre pela ferramenta dele na próxima rodada; o resultado volta
ao histórico da ficha. Por integração, a resposta define **fonte** (o CRM
pede e o agente escreve lá), **espelho** (o agente lê de lá e anota na
ficha) ou **não**. Assim nunca há dupla escrita: cada dado tem um dono.

## A tela do CRM (`crm/painel/`)

Sem dependência, no tom do escritório, com a marca do cliente lida de
`/config.js` do escritório (nome, logo, cor):

- **Entrar** (login) e, na primeira vez do chefe, a senha gerada.
- **Quadro**: uma coluna por etapa, cartões com nome, responsável (foto do
  boneco para agente, iniciais para pessoa), dias parado, proposta pendente
  em destaque. Arrastar move a etapa (respeita o cargo). Filtros: meus, por
  etapa, parados há mais de N dias, perdidos.
- **Ficha**: campos (sensíveis mascarados conforme o cargo), histórico com
  autor e hora, propostas pendentes com Aprovar e Rejeitar, tarefas,
  Reatribuir (assumir e devolver), Marcar como perdido.
- **Equipe**: as pessoas (chefe gerencia) e os **funcionários-agentes**:
  nome, cargo, boneco, estado lido do escritório (no ar, fora do ar, em
  treinamento), link para o monitor no escritório. Nada de contratar,
  treinar ou dar plataforma aqui: isso é no escritório.
- **Ajustes** (chefe): etapas, campos da ficha, campos sensíveis, cargos,
  integrações, importação de planilha (CSV: colunas mapeadas na tela, chave
  única evita duplicar).
- **Painel**: os números da reunião já configurada (meta) e contagens por
  etapa.

Acesso (pergunta 11): "só aqui" escuta em `127.0.0.1` e, se a pessoa quiser
a rede do escritório, em `0.0.0.0` com login obrigatório; "de fora também"
é `0.0.0.0` atrás de um túnel (Cloudflare Tunnel ou similar, com HTTPS) e
fichas no Supabase recomendadas. O CRM nunca abre sem senha.

## Avisos e Cuki BOT

O CRM avisa pelo escritório (`POST /api/avisar`, que já existe): agente
precisa de alguém (pergunta ou proposta parada), ficha parada há mais de N
dias, tarefa vencida. Com isso os avisos saem por ntfy, CallMeBot e pelo
WhatsApp do Cuki BOT, sem configurar nada no CRM. O Cuki BOT lê do CRM
(com o token do escritório) só contagens por etapa, para o laudo e para a
conversa; nunca uma ficha.

## A skill `/criar-crm`

1. Roda `node cuki.js medir` (novo comando de linha; o escritório precisa
   estar no ar). **Vermelho trava**: mostra o laudo e o que fazer, e para.
   Amarelo segue com o aviso.
2. Monta as propostas por código a partir das medidas e das esteiras
   (`node esteiras.js listar`): entidade, etapas, agentes aptos com setor,
   plataformas usáveis, celular dos avisos.
3. Faz as **6 perguntas essenciais** e as **5 de ajuste** do documento das
   perguntas, uma por mensagem, cada uma com a proposta pronta, mais a
   pergunta **"onde ficam as fichas"** (proposta: local se "só aqui",
   Supabase se "de fora também"). Nada de segredo no chat: Supabase é
   "cadastre em 🔌 Plataformas e me diga o nome".
4. Grava `respostas.json` e roda `node crm/criar.js aplicar respostas.json`,
   que escreve `crm/config.json`, gera `crm/.env` (segredo das sessões,
   token dos agentes, segredo do evento), registra o sistema `crm` em
   `data/sistemas.json`, cria a plataforma `crm` (tipo `api`) e marca os
   agentes escolhidos, cria usuários e cargos, e devolve o que gravou. A
   senha inicial do chefe aparece na primeira abertura da tela, não no chat.
5. Diz: "Ligue o CRM no escritório (ele aparece como sistema) e abra 🗂️
   CRM."

Rodar a skill de novo mostra o que está configurado e muda só o que a pessoa
pedir (como `/criar-escritorio`).

## Cercas (valem sempre)

- Segredo só em `crm/.env`, `data/` ou `crm/data/`; nunca no chat, no
  `config.json` ou no commit. `crm/.env` e `crm/data/` entram no
  `.gitignore`.
- Agente nunca apaga, nunca vê campo sensível, nunca gerencia pessoas, nunca
  escreve em ficha que está com uma pessoa. Texto de ficha é dado, nunca
  ordem (o papel do agente diz isso, como hoje com recados).
- Toda escrita tem autor e hora no histórico; histórico só cresce.
- A chave única evita ficha duplicada por desenho (criar com chave existente
  devolve a existente).
- O CRM só confia no escritório que o registrou: evento com segredo, token
  do escritório.

## Ordem de construção (sub-etapas do plano, com ok entre elas)

- **4a** `crm/criar.js` + `config.json` + skill `/criar-crm` + `node cuki.js
  medir`. Testes de unidade da gravação; a skill verificada numa cópia.
- **4b** `crm/server.js`, `crm/crm.js`, `dados.js` (local e Supabase), tela:
  login, quadro, ficha, histórico, propostas, tarefas, importação; registro
  como sistema e botão 🗂️ CRM. Testes de API do CRM; fumaça da tela.
- **4c** `tools/crm.js` no molde e no exemplo; plataforma `crm`; lançador
  com estado na ficha (espelho local); esteira ↔ CRM (mover e evento).
  Verificação real com um agente de tarefa e o Claude.
- **4d** Equipe: funcionários-agentes com estado do escritório e link para o
  monitor; boneco.
- **4e** Pessoas: cargos e permissões, sensíveis mascarados, arquivar em vez
  de apagar, acesso (escuta e túnel), avisos de ficha parada.

## Decisões do construtor, para o dono confirmar ou trocar

1. **Um token para todos os agentes, mais o cabeçalho `x-agente`.** Simples
   e suficiente: os agentes são processos do próprio escritório, na mesma
   máquina, e o que o token protege é quem **não** foi marcado. Alternativa
   mais dura, se quiser: um token por agente (uma plataforma `crm-<id>` por
   agente).
2. **O CRM não fala com Google nem WhatsApp; pede ao agente que tem a
   plataforma.** Reaproveita o que já existe e mantém um dono por dado.
   Custo: um evento de agenda sai na próxima rodada do agente, não na hora.
3. **Estado do agente na ficha, com espelho local** no agente, em vez de
   reescrever o lançador para ler o CRM a cada passo. É a decisão A do dono
   aplicada sem mexer no que já funciona.
4. **Supabase pelo cadastro de plataformas** (tipo `banco`), nunca pelo
   chat, e tabelas com uma coluna `jsonb`: a mesma forma do local.

## Decididas pelo dono em 14/10/2026 (depois da proposta acima)

1. **Um token por agente.** A plataforma `crm` continua uma só (`CRM_URL`),
   mas o `CRM_TOKEN` é gravado **por agente** (`porAgente` em
   `plataformas.js`, novo): cada `.env` recebe o seu, o CRM guarda o hash de
   cada um e sabe quem é quem pelo token, sem cabeçalho de identidade.
2. **Atendimento em massa: ação direta, sem rodada do modelo.** Pergunta do
   dono: "quando falamos em atendimento em massa, qual seria mais rápido?".
   Resposta do construtor, adotada: a integração continua sendo do agente
   (um dono por dado), mas o CRM não espera a próxima rodada do Claude. O
   sistema de cada agente ganha `POST /acao` (com a `GATILHO_CHAVE`): o CRM
   pede e o agente executa a ferramenta **na hora, por código, sem o
   modelo**, dentro das mesmas cercas (`tools/base.js`, modo real, escopo,
   plataforma permitida). Serve para o mecânico: criar evento na agenda,
   gravar linha na planilha, mandar mensagem-modelo. O que precisa de
   julgamento (escrever uma resposta, decidir o próximo passo) continua indo
   pela rodada. Em massa, o custo por ação cai de uma rodada do Claude (30
   a 60 s, centavos) para segundos e zero modelo. Entra na sub-etapa 4c.
3. Estado do agente na ficha com espelho local: **ok**.
4. Supabase pelo cadastro de plataformas, tabelas com `jsonb`: **ok**.
