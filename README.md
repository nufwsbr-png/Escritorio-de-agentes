# Escritório de Agentes

Um escritório isométrico no navegador, estilo Habbo, para acompanhar e operar
os seus agentes de IA, ou os do seu cliente. Cada agente é um boneco com mesa
e computador próprios; clicar no computador dele abre o **sistema daquele
agente** ali dentro, com botões para ligar, desligar, ver o log, conversar com
ele pelo Claude Code, ver o que ele aprendeu, aprovar o que ele propõe e
testá-lo.

- Diretoria, sala de serviço com 18 estações, lounge, sala de reunião e recepção.
- **Contratar é construir:** todo agente novo nasce com pasta própria, sistema
  próprio e a skill que conduz a construção, um passo por vez.
- Os agentes **lembram** (memória por agente), **deixam recados** uns para os
  outros e **propõem** mudanças que só entram com a sua aprovação.
- O escritório sobe os sistemas locais, vigia quem caiu, religa sozinho e
  avisa no celular.
- Dois perfis: o **cliente** opera, o **administrador** constrói.
- Nenhuma dependência: só Node.js e o Claude Code da máquina.

## Começar

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo e do
[Claude Code](https://claude.com/claude-code) instalado e logado
(`claude auth login`).

```bash
git clone https://github.com/nufwsbr-png/Escritorio-de-agentes escritorio-de-agentes
cd escritorio-de-agentes
npm start
```

Abra **http://localhost:4321**. Todo escritório novo vem com **um** agente, o
de exemplo (pasta `exemplo-agente`). Clique no computador dele e em **Ligar**
para ver o fluxo completo: o painel embutido, o chat de teste, a memória.

No Windows:
- **`INICIAR ESCRITORIO.cmd`** sobe o escritório e o religa se ele cair.
- **`CRIAR ATALHO.ps1`** cria um atalho na área de trabalho (botão direito,
  **Executar com o PowerShell**). O atalho liga o escritório e abre o navegador.

## A tranca: cliente e administrador

Antes de entregar o escritório a um cliente, clique em **🔐 Admin** e defina a
senha. Sem senha, tudo fica aberto (é o escritório na sua própria máquina).
Com senha:

| Quem | Pode |
|---|---|
| **Cliente** (sem senha) | ligar, desligar, ler o log, conversar em **Investigar**, rodar a reunião, ler memória e recados, preencher a **Ficha do negócio**, mudar situação e horário dos bonecos |
| **Administrador** | tudo isso e mais: contratar, cadastrar sistema, demitir, **Resolver**, **Construir**, editar memória, aprovar propostas, rodar o testador, mudar avisos |

A verificação é no servidor, rota a rota. A senha fica em `data/admin.json`
como hash e a sessão dura 7 dias.

## Contratar um agente

Na aba **Contratar**, **＋ contratar agente**. A primeira pergunta é o tipo:

| Tipo | Jornada | Cérebro |
|---|---|---|
| **Atendimento no WhatsApp** | skill `criar-agente`, 23 passos (sandbox, memória, prompt, constituição, agenda, planilha, áudio, WhatsApp, painel, templates, testador, tranca) | **OpenRouter**, chave no `.env` do agente |
| **Outro setor** (Prospecção & SDR, Conteúdo, Copy, Financeiro, Dados, QA ou um nome seu) | skill `criar-agente-setor`, 14 passos (trabalho, conexões, cérebro, constituição, ferramenta, memória, rotina, painel, portão, testador, tranca, entrega) | **Claude Code da máquina**, sem chave de modelo |

Depois: nome do agente, negócio e porta. O escritório cria a pasta em
`agentes/<nome>/` com a estrutura padrão:

```
agente.json              nome, setor, negócio, porta, trilha
CLAUDE.md                o contrato com o escritório (leia primeiro)
server.js                o sistema próprio: /saude, /painel, /log e o chat de teste em /
prompt-agente.md         a identidade — o DONO escreve; o construtor nunca preenche sozinho
skills/constituicao.md   a base de conhecimento — é FERRAMENTA, nunca entra no prompt
tools/                   o código das ações (código para o garantido, IA para o interpretado)
.env                     as conexões de trabalho (token do CRM, Google, planilha…) — nunca no chat
memoria.md               o que ele aprende operando
progresso-do-agente.md   onde a jornada parou
.claude/skills/<skill>/  a skill que conduz a construção
```

O sistema é registrado em `data/sistemas.json`, o boneco entra pela recepção
**em treinamento** (o balão mostra "passo N de M", lido do progresso) e o
monitor abre em **Conversar › Construir**: a skill lê o progresso e conduz um
passo por vez, com teste no fim de cada um. Quando o progresso registra o
portão aprovado, o boneco vira funcionário; quando registra `## CONCLUÍDO`, a
construção acabou.

Um robô que você já construiu fora daqui entra por **＋ cadastrar sistema**:
pasta, comando e porta, ou um endereço publicado. O escritório só o liga,
vigia e embute.

## O monitor de cada agente

| Botão | O que faz |
|---|---|
| **▶ Ligar / ■ Desligar** | sobe e derruba o sistema (processo solto: reiniciar o escritório não derruba ninguém) |
| **💬 Conversar** | uma sessão do Claude Code dentro da pasta do agente. **Investigar** só lê; **Resolver** altera; **Construir** segue a skill. A sessão sobrevive a reinício |
| **📋 Ficha** | a constituição seção por seção, para o dono do negócio preencher sem abrir arquivo |
| **🧠 Memória** | `memoria.md`: o que ele aprendeu. Entra em toda conversa, reunião e teste; o administrador pode corrigir |
| **✉️ Recados** | o que outros agentes e o dono deixaram para ele. Quem deixa recado anda até a mesa do outro |
| **📝 Propostas** | mudanças que ele sugeriu no prompt ou na constituição. Nada entra sem **aprovar** |
| **🧪 Testar** | o testador: clientes ou tarefas difíceis simulados, duas réguas (constituição e fato), relatório e comparação com a rodada anterior |
| **📜 Log** | as últimas linhas do log |

## Como os agentes falam com o escritório

Ao responder (conversa, reunião, testador), um agente pode terminar com blocos
que o escritório retira do texto e trata:

- `<memoria>…</memoria>` vai para `memoria.md` com a data.
- `<mensagem para="id">…</mensagem>` é entregue no próximo prompt do destinatário.
- `<proposta arquivo="prompt-agente.md" secao="Nunca faça isso" titulo="…">…</proposta>`
  fica pendente até o dono aprovar. É a regra da skill: o construtor nunca
  escreve o prompt do dono.

Os sistemas também podem pedir um aviso no celular:

```http
POST http://localhost:4321/api/avisar
{ "titulo": "Meu agente", "texto": "3 pedidos esperando", "prioridade": "normal" }
```

## Reunião dos agentes

Na sala de reunião, **▶ Reunir agora** junta os agentes que têm sistema local.
Cada um lê o próprio projeto e diz um número real, uma melhoria e o que
precisa de outro agente (deixando o recado). A reunião **lê as últimas atas e
cobra o que cada um prometeu**. No fim, um briefing junta tudo.

Cada fala é uma chamada ao Claude e consome a cota do seu plano. Por isso o
horário automático vem **desligado**; `data/config.json` liga e dá uma meta.

## Como cada agente é testado

1. **Durante a construção:** cada passo da skill termina com um teste concreto;
   o portão no fim da fase do sandbox impede de avançar sem provar.
2. **Antes de entrar em serviço:** o botão **🧪 Testar** solta clientes (30) ou
   tarefas (10) difíceis simulados, julgados por duas réguas: o que ele afirma
   bate com a constituição, e o que ele diz ter feito existe de verdade. Sai um
   relatório; o agente propõe correções; você aprova uma a uma; nova rodada
   com casos diferentes tem que ter menos falhas graves.
3. **Em serviço:** o escritório lê a rota de saúde, religa quem caiu, avisa no
   celular, e a reunião cobra o número prometido.

## Configuração

Copie `data/config.exemplo.json` para `data/config.json` e ajuste:

- `nome`, `subtitulo`, `dono`, `empresa`, `porta`.
- `marca.logo` (arquivo em `data/marca/`) e `marca.cores` (variáveis do tema):
  marca branca para cada cliente sem tocar no código.
- `reuniao.automatica`, `dias`, `hora`, `foco`, `meta`.

## Avisos no celular

**🔔 Avisos** manda notificação pelo app gratuito [ntfy](https://ntfy.sh) ou
pelo WhatsApp via CallMeBot, para **mais de um destino**: o celular do cliente
e o seu. Avisa quando um sistema caiu e não voltou, quando a reunião terminou
e quando uma ação da agenda rodou.

## Agenda

`data/agenda.json` liga ou desliga um sistema numa data marcada. O exemplo está
no comentário da seção AGENDA em `server.js`.

## O que fica fora do git

Tudo que é seu ou do cliente: `data/` (configuração, equipe, avisos, senha,
sessões, conversas, recados, propostas, atas, testes, marca) e `agentes/`
(as pastas dos agentes contratados, com `.env` e tudo). Só os dois
`*.exemplo.json` são versionados.

## Estrutura

```
server.js          servidor: tela, API, sobe/vigia sistemas, espelho, tranca
admin.js           senha e sessão do administrador
agentes.js         contratar é construir: pasta padrão, setores, progresso, ficha
memoria.js         memória por agente, recados e propostas
testador.js        o exame do agente, com duas réguas
reuniao.js         reunião dos agentes, com memória das atas
avisos.js          ntfy e CallMeBot, vários destinos
index.html, css/   a tela e o tema
js/                motor isométrico, salas, móveis, bonecos, painéis, admin, contratação, extras
modelos/agente/    o que toda pasta de agente nova recebe
modelos/skills/    criar-agente (atendimento) e criar-agente-setor (outros setores)
exemplo-agente/    o único agente que vem no escritório, na estrutura padrão
data/              seus dados (fora do git, menos os exemplos)
agentes/           os agentes contratados (fora do git)
```

## Licença

MIT. Veja [LICENSE](LICENSE).
