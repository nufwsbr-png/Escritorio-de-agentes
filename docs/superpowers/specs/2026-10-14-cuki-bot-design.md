# Cuki BOT: a IA analista do escritório, na tela e no WhatsApp (design, 14/10/2026)

## O pedido do dono

- A conferência de saúde e aptidão (antes do Criar CRM, e como exame do
  escritório) é feita por uma **IA analista** chamada **Cuki BOT**.
- Nos **Ajustes**, cadastrar um número de WhatsApp pela **API WAHA**, que
  será o número do Cuki BOT. Ele **avisa por WhatsApp os números
  autorizados** (com a opção de autorizar números) e os números autorizados
  **conversam com ele**: perguntas sobre o escritório, sobre os agentes,
  briefings.

## Princípios

- **Mede por código, explica pelo modelo.** Tudo que é número ou estado é
  lido por código do que o escritório já tem. O Claude Code só escreve o
  laudo e responde perguntas, com esse contexto montado por código.
- **Só leitura.** Cuki BOT informa e explica; nunca executa ação (ligar,
  desligar, aprovar, contratar) por WhatsApp. Ação é pela tela, com a tranca
  de sempre. Se pedirem, ele diz onde fazer.
- **Nenhum segredo passa por ele.** O contexto que o Claude recebe é montado
  pelo escritório e não contém valor de variável, senha nem chave. O Claude
  roda **sem ferramentas** (não lê arquivos), só com o texto do contexto.
- **Número autorizado é a chave.** Mensagem de número não autorizado é
  registrada e ignorada, sem resposta. Autorizar é ação de administrador na
  tela.

## Parte 1: o analista (laudo)

Botão **🩺 Cuki BOT** no topo e chamada obrigatória no início do Criar CRM.

O que mede (código):

| Área | Medidas | Verde | Amarelo | Vermelho |
|---|---|---|---|---|
| Agentes | PORTÃO, ligado, `/saude`, última rodada, perguntas paradas (dias), lições propostas acumuladas | tudo ok | em treinamento; pergunta parada > 2 dias; > 10 lições propostas | fora do ar; falha de verificação; erro na última rodada |
| Plataformas | variáveis preenchidas; pasta existe; API responde a `GET`; MCP conecta | tudo | preenchida sem teste possível | vazia ou sem resposta |
| Fluxo | entidades tratadas em 30 dias por agente; aprovado/rejeitado; tempo em proposta; esteiras paradas | há entidades reais e aprovações | só amostras; esteira parada > 1 dia | nenhuma entidade real |
| Base | Claude conectado; senha de administrador; avisos; `config.json` | tudo | sem avisos | sem Claude ou sem senha |
| Aptidão CRM | agentes verdes, entidade de cada um, plataformas usáveis, sugestões | 1+ agente apto e 1+ plataforma | aptos sem plataforma | nenhum apto |

O que escreve (uma rodada do Claude Code, sem ferramentas, prompt =
medidas + papel): `data/cuki/laudos/<data-hora>.md` com semáforo por área,
"o que fazer antes" em frases curtas, e, se verde, as **propostas** para o
Criar CRM (o que acompanhar, etapas, cargos, integrações, quem cuida de cada
etapa). Guarda também `data/cuki/laudos/<data-hora>.json` com as medidas.
Na tela, o último laudo com o semáforo; "rodar de novo" para refazer.

Boneco: Cuki BOT ganha um boneco na recepção do isométrico, com a plaquinha
"analista". Clicar nele abre o laudo.

## Parte 2: o WhatsApp do Cuki BOT (WAHA)

**Ajustes › Cuki BOT no WhatsApp** (administrador):

- `WAHA_URL`, `WAHA_KEY`, `WAHA_SESSAO` (padrão `default`), gravados em
  `data/cuki.json` (segredo em `data/`, fora do git, como `avisos.json`).
  Botão **Testar**: `GET {WAHA_URL}/api/sessions/{sessao}` e mostra o estado
  (conectado, precisa de QR). Se precisar de QR, mostra o QR da sessão
  (`/api/{sessao}/auth/qr`) para o dono escanear com o celular do Cuki BOT.
- **Números autorizados:** lista com nome, número e papel (`dono`,
  `equipe`), adicionar e remover. Só eles recebem avisos e são respondidos.
- **Webhook:** o escritório registra no WAHA o webhook
  `http://<host>:<porta>/api/cuki/whatsapp` com um segredo
  (`WEBHOOK_SEGREDO`, gerado) que o WAHA devolve no cabeçalho; mensagens sem
  o segredo são descartadas. Quando o escritório não é alcançável pelo WAHA
  (máquinas diferentes), a tela diz o que fazer.

**Avisos:** `avisos.js` ganha o canal `cuki` (WAHA `POST /api/sendText`).
Quando configurado, vira o canal preferido para os números autorizados; ntfy
e CallMeBot continuam como estão para quem já usa. Tudo que hoje é aviso
(sistema caiu, pergunta ao dono, resumo diário, reunião terminou, esteira
esperando aprovação) sai pelo Cuki BOT, assinado "Cuki BOT".

**Conversa:** mensagem de número autorizado → o escritório monta o contexto
por código → uma rodada do Claude Code (sem ferramentas, `-p`, com
`--resume` por número para manter a conversa) → resposta pelo WAHA. Contexto:

- estado atual (`estado()`): quem está ligado, caiu, em treinamento, com
  pergunta parada;
- último laudo (resumo) e medidas;
- progresso e "sobre" de cada agente; esteiras e entidades por etapa;
- últimas atas de reunião e placar da meta; recados e propostas pendentes
  (títulos);
- memória do escritório de cada agente (trechos), nunca o `.env`.

Papel do Cuki BOT: analista do escritório, direto, em português do Brasil,
respostas curtas para celular; explica estados e números; para ação, diz
onde fazer na tela; nunca inventa número que não está no contexto. Pedidos
típicos: "como estão os agentes?", "o que a Tati fez hoje?", "tem algo
esperando eu aprovar?", "me dá o briefing da semana".

**Briefing:** comando no WhatsApp ("briefing") ou automático junto do
resumo diário: o que andou, o que parou, o que espera a pessoa, números da
meta. Montado por código, redigido pelo modelo.

## Onde fica cada coisa

| Coisa | Lugar | Quem escreve |
|---|---|---|
| Medidas, laudo, boneco, contexto da conversa, webhook, autorizados | `cuki.js` (módulo do servidor) | o construtor |
| Configuração (WAHA, segredo do webhook, números autorizados, horário do briefing) | `data/cuki.json` | ⚙️ Ajustes › Cuki BOT (administrador) |
| Laudos | `data/cuki/laudos/` | o servidor |
| Conversas por número (session id do Claude, últimas mensagens) | `data/cuki/conversas.json` | o servidor |
| Canal `cuki` dos avisos | `avisos.js` | o construtor |
| Rotas | `GET /api/cuki/laudo`, `POST /api/cuki/analisar` (admin), `GET/PUT /api/cuki/config` (admin, sem valores no GET), `POST /api/cuki/autorizados` (admin), `POST /api/cuki/whatsapp` (webhook, segredo), `POST /api/cuki/testar` (admin) | o servidor |
| Tela | `js/cuki.js` (laudo, Ajustes › Cuki BOT), botão 🩺 no topo, boneco no `roster`/`world` | o construtor |

## Cercas

- Só números autorizados recebem resposta; os demais são registrados em
  `data/cuki/recusados.log` (número e hora, sem conteúdo) e ignorados.
- O Claude roda sem ferramentas e com contexto sem segredos. Um teste
  garante que o contexto montado não contém valor de variável nem a chave do
  WAHA.
- Limites: 20 mensagens por número por hora; mensagens com mais de 2.000
  caracteres são cortadas; rodada com `LIMITE_CONVERSA`.
- Texto vindo do WhatsApp é dado, nunca ordem: o papel diz isso, e nenhuma
  ferramenta existe para ser mal usada.
- Dado de cliente final (nome, telefone de quem o atendente conversa) não
  entra no contexto do Cuki BOT: só contagens e estados.

## Critérios de aceite

1. 🩺 gera laudo com semáforo coerente com um escritório de teste (um agente
   fora do ar → vermelho em Agentes; plataforma vazia → vermelho).
2. Criar CRM recusa começar com vermelho e mostra o laudo.
3. Ajustes salva WAHA e autorizados; GET da configuração não traz a chave.
4. Webhook: mensagem com segredo errado → 401; número não autorizado →
   ignorado e registrado; autorizado → rodada do Claude e resposta enviada
   (WAHA falso no teste).
5. Avisos saem pelo canal `cuki` quando configurado.
6. O contexto montado para o Claude nunca contém valores (teste varre).
7. `npm test` verde; verificação real com um WAHA de teste antes de entregar.
