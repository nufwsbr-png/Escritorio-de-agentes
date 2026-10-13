# Escritório de Agentes

Um escritório isométrico no navegador, estilo Habbo, para acompanhar e operar
os agentes de IA de um negócio: os seus ou os do seu cliente. Cada agente é um
boneco com mesa e computador próprios; clicar no computador dele abre o
**sistema daquele agente** ali dentro, com botões para ligar, desligar, ver o
log, conversar com ele pelo Claude Code, ver o que ele aprendeu, aprovar o que
ele propõe e testá-lo.

- Diretoria, sala de serviço com 18 estações, lounge, sala de reunião e recepção.
- **Contratar é construir:** todo agente novo nasce com pasta própria, sistema
  próprio e a skill que conduz a construção, um passo por vez.
- Os agentes **lembram** (memória por agente), **deixam recados** uns para os
  outros e **propõem** mudanças que só entram com a sua aprovação.
- O escritório sobe os sistemas locais, vigia quem caiu, religa sozinho e
  avisa no celular.
- Dois perfis: o **cliente** opera, o **administrador** constrói.
- O escritório em si não tem dependência: só Node.js e o Claude Code da
  máquina. O que cada agente precisa está na seção [Contratar um agente](#contratar-um-agente).

Este README tem duas partes. **Usar o escritório** explica o que ele faz.
**Entregar a um cliente** é o roteiro para instalar, cobrar, atualizar e
hospedar quando o escritório vai para a máquina de outra pessoa.

---

# Parte 1 — Usar o escritório

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

Os dois scripts leem a porta de `data/config.json`; sem o arquivo, usam 4321.

## Segurança

O escritório escuta só em `127.0.0.1`: ninguém de fora da máquina o alcança.
Ele executa só o que está no registro `data/sistemas.json` e recusa comando
com `& | ; < > $` e crase. Ignora pedido vindo de outro site aberto no mesmo
navegador. As conexões e chaves dos agentes ficam no `.env` de cada pasta e
nunca passam pelo chat nem pelo git.

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

Essa tranca é do escritório. Cada agente tem a própria, no último passo da
skill dele (`PAINEL_SENHA` no `.env`), para o painel dele continuar protegido
se um dia for publicado fora daqui.

## Contratar um agente

Na aba **Contratar**, **＋ contratar agente**. A primeira pergunta é o tipo:

| Tipo | Jornada | Cérebro | Contas que o cliente precisa ter |
|---|---|---|---|
| **Atendimento no WhatsApp** | skill `criar-agente`, 23 passos (sandbox, memória, prompt, constituição, agenda, planilha, áudio, WhatsApp, painel, templates, testador, tranca) | **OpenRouter**, chave no `.env` do agente | OpenRouter (crédito pré-pago), Supabase (grátis), Google (agenda e planilha), Meta WhatsApp Business ou WAHA |
| **Outro setor** (lista configurável por cliente, ou um nome seu) | skill `criar-agente-setor`, 14 passos (trabalho, conexões, cérebro, constituição, ferramenta, memória, rotina, painel, portão, testador, tranca, entrega) | **Claude Code da máquina**, sem chave de modelo | só o que o trabalho pedir (CRM, planilha, pasta…) |

Os setores da segunda linha vêm de `data/config.json` (`setores`). Sem a
chave, valem os padrões: Prospecção & SDR, Conteúdo, Copy, Financeiro, Dados
e QA. Uma clínica, um escritório de advocacia e uma loja têm setores
diferentes; troque a lista por cliente.

Depois: nome do agente, negócio, porta e, se quiser, uma pasta fora do
padrão. O escritório cria a pasta em `agentes/<nome-em-slug>/` ("Tati Teste"
vira `agentes/tati-teste`) com a estrutura padrão:

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

A skill `criar-agente` é a sua, copiada inteira. A `criar-agente-setor` foi
derivada dela para trabalho interno e ainda está marcada como **proposta**
dentro do próprio arquivo: revise-a no primeiro agente de setor que construir.

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

**Resolver** e **Construir** rodam o Claude Code com uma lista fixa de
ferramentas: editar arquivos, buscar na web e rodar `node`, `npm`, `git`,
`python`, `curl` e comandos básicos do sistema. Nada além disso.

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

Cada fala é uma chamada ao Claude e consome a cota do plano logado na máquina.
Por isso o horário automático vem **desligado**; `data/config.json` liga e dá
uma meta.

## Como cada agente é testado

1. **Durante a construção:** cada passo da skill termina com um teste concreto;
   o portão no fim da fase do sandbox impede de avançar sem provar.
2. **Antes de entrar em serviço:** o botão **🧪 Testar** solta clientes (30) ou
   tarefas (10) difíceis simulados, julgados por duas réguas: o que ele afirma
   bate com a constituição, e o que ele diz ter feito existe de verdade. Sai um
   relatório com o resumo de falhas graves e leves. O testador **não conserta
   nada**: abra **Conversar** e peça o que corrigir; o agente propõe, você
   aprova uma a uma. Uma nova rodada, com casos diferentes, tem que ter menos
   falhas graves que a anterior.
3. **Em serviço:** o escritório lê a rota de saúde, religa quem caiu, avisa no
   celular, e a reunião cobra o número prometido.

## Configuração

Copie `data/config.exemplo.json` para `data/config.json` e ajuste:

- `nome`, `subtitulo`, `dono`, `empresa`, `porta`.
- `marca.logo` (arquivo em `data/marca/`) e `marca.cores` (variáveis do tema):
  marca branca para cada cliente sem tocar no código.
- `setores`: a lista que a aba Contratar oferece em "Outro setor".
- `reuniao.automatica`, `dias`, `hora`, `foco`, `meta`.

## Avisos no celular

**🔔 Avisos** manda notificação pelo app gratuito [ntfy](https://ntfy.sh) ou
pelo WhatsApp via CallMeBot, para **mais de um destino**: o celular do cliente
e o seu. Avisa quando um sistema caiu e não voltou, quando a reunião terminou
e quando uma ação da agenda rodou.

## Agenda

`data/agenda.json` liga ou desliga um sistema numa data marcada. O exemplo está
no comentário da seção AGENDA em `server.js`.

---

# Parte 2 — Entregar a um cliente

## Roteiro de instalação

Na máquina do cliente, nesta ordem:

1. **Node.js e Claude Code.** Instale os dois e rode `claude auth login` com a
   conta decidida na seção [Custos](#custos).
2. **Clone o escritório.** `git clone` do seu repositório (o endereço acima é
   o original; se você mantém um fork por cliente, use o seu) e `npm start`
   uma vez para conferir que sobe.
3. **Configuração.** Copie `data/config.exemplo.json` para `data/config.json`
   e preencha nome do escritório, empresa, dono e porta. Ponha o logo em
   `data/marca/` e as cores em `marca.cores`. Ajuste `setores` para o ramo
   do cliente.
4. **Senha de administrador.** Abra o escritório, clique em **🔐 Admin** e
   defina a senha. A partir daqui o cliente opera e só você constrói.
5. **Avisos.** Em **🔔 Avisos**, cadastre o celular do cliente e o seu.
6. **Atalho e boot.** Rode `CRIAR ATALHO.ps1`. Para subir junto com o Windows,
   crie uma tarefa no Agendador de Tarefas que execute
   `INICIAR ESCRITORIO.cmd` no logon.
7. **Primeiro agente.** Contrate pela aba Contratar. O exemplo pode ser
   demitido depois que o cliente entendeu o fluxo.

## Custos

Tudo que chama o Claude Code gasta a cota da conta logada na máquina do
cliente: Conversar, Construir, reunião, testador e o chat dos agentes de
setor. Decida antes de instalar:

- **Conta do cliente:** ele paga o plano, você não divide cota com ninguém.
  É o padrão recomendado.
- **Sua conta:** mais simples de instalar, mas todo cliente consome o mesmo
  plano e a sessão fica logada numa máquina que não é sua.

O atendente de WhatsApp é o único que não usa o Claude Code em serviço: ele
gasta crédito pré-pago no OpenRouter, na conta do cliente, com a chave no
`.env` do agente. A conta de Supabase e de Google também são do cliente.

## Atualizar um escritório entregue

`data/` e `agentes/` ficam fora do git. Por isso, na máquina do cliente:

```bash
git pull
```

traz a versão nova do escritório sem tocar na configuração, na senha, nas
conversas, nas atas nem nas pastas dos agentes. Depois do `pull`, feche a
janela do `INICIAR ESCRITORIO.cmd` e abra de novo. Os sistemas dos agentes
não caem com isso: são processos soltos.

O que **não** se atualiza sozinho: a pasta de cada agente já contratado.
Mudanças em `modelos/agente/` valem só para agentes novos. Se quiser levar
uma melhoria do modelo a um agente existente, use **Conversar › Resolver**
nele.

## Hospedagem

O escritório e os agentes de setor rodam na máquina do cliente e não precisam
de endereço público.

O atendente de WhatsApp precisa: a Meta e o WAHA entregam as mensagens por
webhook. O padrão é rodar na mesma máquina com um túnel (Cloudflare Tunnel
ou ngrok) apontando para a porta do agente. Railway é a alternativa quando a
máquina não fica ligada: a skill cobre isso no passo 13, e o `.env` vai como
variáveis do serviço, nunca pelo git.

## O que fica fora do git

Tudo que é seu ou do cliente: `data/` (configuração, equipe, avisos, senha,
sessões, conversas, recados, propostas, atas, testes, marca) e `agentes/`
(as pastas dos agentes contratados, com `.env` e tudo). Só os dois
`*.exemplo.json` são versionados. No `exemplo-agente/`, ficam de fora o
`.env`, o log e o que ele produz operando.

## Problemas comuns

- **"claude não encontrado" ou resposta vazia em Conversar:** o Claude Code
  não está instalado ou não está logado nessa conta de usuário do Windows.
  Rode `claude auth login` no mesmo usuário que abre o escritório.
- **Porta ocupada ao subir:** outro programa usa a porta do escritório ou de
  um agente. Troque em `data/config.json` (escritório) ou no registro do
  agente e religue.
- **Agente aparece desligado logo depois de Ligar:** abra **📜 Log**. Em geral
  é dependência faltando na pasta do agente ou `.env` vazio.
- **Cliente não consegue contratar:** correto. Contratar é do administrador.

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
