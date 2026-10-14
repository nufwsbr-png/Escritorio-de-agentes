# Escritório de Agentes

Um escritório isométrico no navegador, estilo Habbo, para acompanhar e operar
os agentes de IA de um negócio: os seus ou os do seu cliente. Cada agente é um
boneco com mesa e computador próprios; clicar no computador dele abre o
**sistema daquele agente** ali dentro, com botões para ligar, desligar, ver o
log, conversar com ele pelo Claude Code, ver o que ele aprendeu, aprovar o que
ele propõe e testá-lo.

- Diretoria, sala de serviço com 18 estações, lounge, sala de reunião e recepção.
- **Contratar é construir:** todo agente novo nasce com a **anatomia padrão**
  do escritório, pasta própria, sistema próprio e a skill de referência.
- Os agentes **lembram** (memória em camadas), **deixam recados** uns para os
  outros, **propõem** lições e mudanças que só entram com a sua aprovação.
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

Abra **http://localhost:4321**. Sem configuração, a tela avisa que o
escritório ainda não foi aberto. Para abrir, veja a seção seguinte. Todo
escritório novo vem com **um** agente, o de exemplo (pasta `exemplo-agente`).
Clique no computador dele e em **Ligar** para ver o painel do dono; nele,
rode `amostras/caso-01` em **Ensaio** e veja o agente ler um pedido de cliente
e planejar o resumo sem tocar em nada.

## Abrir um escritório novo: `/criar-escritorio`

A abertura acontece no Claude Code, não na tela. Abra esta pasta no Claude
Code e digite:

```
/criar-escritorio
```

A skill (versionada em `.claude/skills/criar-escritorio/`, vem com o projeto)
faz dez perguntas, uma por mensagem, e grava tudo pelos scripts do projeto:

1. O negócio: empresa, o que faz, quem é o dono.
2. Os setores, sugeridos pelo ramo; viram as opções da aba Contratar.
3. As plataformas que a empresa usa (CRM, planilha, agenda, pasta, WhatsApp,
   e-mail). As chaves nunca passam pelo chat: entram pela tela depois.
4. A marca e a planta: logo, cor e a planta do escritório ou da clínica.
   **A planta redesenha as salas** do escritório isométrico.
5. A tranca: a senha do administrador, gerada e mostrada uma vez.
6. Os avisos: celular do dono e do administrador.
7. A reunião: automática ou não, dias, hora e a meta que ela cobra.
8. A conta do Claude Code: conferência de que está conectada.
9. O primeiro agente: "qual trabalho dói mais hoje?"
10. O exemplo: manter ou demitir.

No fim ela sobe o escritório com o nome da empresa. Rodar `/criar-escritorio`
de novo num escritório já aberto mostra o que existe e muda só o que você
pedir. **⚙️ Ajustes**, no topo da tela, resume a configuração, mostra se a
conta do Claude Code está conectada e lembra o comando.

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

Essa tranca é do escritório. Cada agente tem a própria, no painel dele
(`PAINEL_SENHA` no `.env`), porque o painel do agente aprova propostas e
responde perguntas em nome do dono.

## A anatomia de um agente

As duas skills que ensinam a construir agentes de IA (`criar-agente`, do
atendente de WhatsApp, e `criar-agente-tarefa`, do agente que executa uma
tarefa) foram destiladas em **15 componentes** que todo agente do escritório
precisa ter. A lista completa, com o porquê de cada um, está em
[`modelos/ANATOMIA.md`](modelos/ANATOMIA.md). Em resumo:

| # | Componente | Onde fica |
|---|---|---|
| 1 | Identidade escrita pelo dono | `prompt-agente.md` |
| 2 | Base de conhecimento como ferramenta, nunca no prompt | `skills/constituicao.md` |
| 3 | Ferramentas em código, com cerca dentro (escopo, nunca apaga, nunca sobrescreve) | `tools/`, `tools/base.js` |
| 4 | Três modos: ensaio, proposta, real (dois interruptores para o real) | `rodar.js`, `.env` |
| 5 | Pós-verificação: o que disse que fez tem que existir | `rodar.js` |
| 6 | Memória em camadas, só o recorte da vez | `memoria/` |
| 7 | Lições que o dono aprova; o agente só propõe | `memoria/licoes.md`, `memoria/licoes-propostas.md` |
| 8 | Segredos só no `.env`, nunca impressos | `.env` |
| 9 | Cercas por configuração, não só por texto | `cercas.json` |
| 10 | Humano no circuito: perguntar, assumir e devolver, aprovar e corrigir | painel |
| 11 | Painel do dono, trancado, com constituição editável e histórico em git | `server.js` |
| 12 | Avisos saem do sistema, nunca do agente | `/api/avisar` do escritório |
| 13 | Bancada com gabarito e portão antes do dado real | `amostras/` |
| 14 | Testador com duas réguas e instrução plantada | botão 🧪 |
| 15 | Registro do que foi feito | `progresso-do-agente.md`, `log.txt` |

A construção no escritório é essa lista, um componente por vez, com teste no
fim de cada um. As skills ficam na pasta do agente, em `.claude/skills/`,
como material de consulta do construtor: armadilhas que aconteceram de
verdade, catálogo de módulos de ferramenta e o clique a clique dos sites.

## Contratar um agente

Na aba **Contratar**, **＋ contratar agente**. A primeira pergunta é o tipo:

| Tipo | Cérebro | Componentes | Contas que o cliente precisa ter |
|---|---|---|---|
| **Atendimento no WhatsApp** | **OpenRouter**, chave no `.env` do agente | 18 | OpenRouter (crédito pré-pago), Supabase (grátis), Google (agenda e planilha), Meta WhatsApp Business ou WAHA |
| **Agente de tarefa** (por setor: lista configurável por cliente, ou um nome seu) | **Claude Code da máquina**, em rodadas isoladas pelo `rodar.js`, sem chave de modelo | 17 | só o que a tarefa pedir (pasta, CRM, planilha, e-mail…) |
| **👀 Agente que aprende vendo** (um agente de tarefa, caminho mais curto) | o mesmo Claude Code; você **demonstra** a tarefa num chat e ela vira a skill dele | 17, com 1, 3 e 6 adiantados | as mesmas do agente de tarefa |

**Aprende vendo** funciona assim: o monitor abre em **Conversar › 👀
Ensinar**, que é o Claude Code rodando na pasta do agente, camuflado. Você
faz a tarefa ali, do seu jeito, de verdade, dentro das pastas autorizadas e
das plataformas marcadas para ele. Quando terminar, **✅ Tarefa concluída**
pede um nome e a mesma sessão destila a demonstração em
`.claude/skills/<tarefa>/SKILL.md` (quando usar, entrada, passo a passo com
caminhos e comandos exatos, as decisões que você tomou, quando parar e
perguntar, como conferir, nunca), na primeira amostra com gabarito em
`amostras/` e em propostas para a constituição, que você aprova em 📝
Propostas. Depois, `node rodar.js amostras/caso-NN` em ensaio mostra se ele
faz igual. Uma skill por tarefa; ensine quantas quiser. Todo agente de tarefa
tem o modo Ensinar, não só os criados assim. A transcrição fica em `ensino/`,
fora do git.

Os setores da segunda linha vêm de `data/config.json` (`setores`). Sem a
chave, valem os padrões: Prospecção & SDR, Conteúdo, Copy, Financeiro, Dados
e QA. Uma clínica, um escritório de advocacia e uma loja têm setores
diferentes; troque a lista por cliente.

Depois: nome do agente, negócio, porta, **as plataformas que ele pode usar**
e, se quiser, uma pasta fora do padrão. O escritório cria a pasta em `agentes/<nome-em-slug>/` ("Tati Teste"
vira `agentes/tati-teste`) com a anatomia:

```
agente.json                 nome, setor, negócio, porta, trilha
CLAUDE.md                   o contrato com o escritório e o mapa da pasta (não é a identidade)
ANATOMIA.md                 os 15 componentes
prompt-agente.md            1. identidade — o dono escreve
skills/constituicao.md      2. base de conhecimento — ferramenta
tools/                      3. as mãos, com cerca; base.js e arquivos.js prontos
rodar.js                    4, 5, 10. o lançador (agente de tarefa)
memoria/                    6, 7. lições, lições propostas, estado por entidade, execuções, memória do escritório
amostras/ saidas/ quarentena/   13. bancada, o que cada rodada produziu, o que seria apagado
cercas.json                 9. permissões do Claude Code por rodada
.env                        8. segredos e escopo
server.js                   11. painel trancado, /saude, /log (e o chat de teste, no atendente)
progresso-do-agente.md      15. a lista dos componentes e onde parou
.claude/skills/<skill>/     a skill de referência da trilha
.claude/skills/<tarefa>/    as skills que você ensinou vendo (uma por tarefa)
ensino/                     as demonstrações (transcrição e resumo), fora do git
```

O sistema é registrado em `data/sistemas.json`, o boneco entra pela recepção
**em treinamento** (o balão mostra "N de M", lido do progresso) e o monitor
abre em **Conversar › Construir**: o construtor lê o contrato, a anatomia e o
progresso e conduz um componente por vez, com teste no fim. Quando o
componente **PORTÃO** é marcado, o boneco vira funcionário; quando o progresso
registra `## CONCLUÍDO`, a construção acabou.

Um robô que você já construiu fora daqui entra por **＋ cadastrar sistema**:
pasta, comando e porta, ou um endereço publicado. O escritório só o liga,
vigia e embute.

## Plataformas: um cadastro, permissão por agente

**🔌 Plataformas**, no topo, é o cadastro único dos sistemas do negócio: CRM,
planilha, agenda, pasta, WhatsApp, e-mail, banco, sistema pelo navegador,
link. Cada plataforma tem endereço e variáveis de conexão (com valor, só para
o administrador). Ao contratar, você marca quais plataformas o agente pode
usar; no monitor, o painel **🔌 Plataformas** muda isso depois.

A garantia é por credencial, não por instrução: o escritório grava no `.env`
de cada agente um bloco delimitado só com as variáveis das plataformas
permitidas, mais `PLATAFORMAS_PERMITIDAS`. O resto do `.env` não é tocado.
Cada variável entra com o nome prefixado (`OPHIR_TOKEN`) e com o nome
canônico do tipo (`SISTEMA_API_TOKEN`), que é o que as ferramentas das skills
de referência leem. Trocar uma chave no escritório regrava o bloco de todos
os agentes que a têm; depois é só religar. Robôs cadastrados à mão nunca têm
o `.env` tocado.

**Servidor MCP é um tipo de plataforma** (🧩). Cadastre o servidor uma vez,
com `COMANDO` (local, por exemplo
`npx -y @modelcontextprotocol/server-filesystem C:/pasta`) ou `URL` (remoto)
e `TOKEN`. Marcar o agente faz o escritório gravar um `mcp.json` na pasta
dele, sem valores, só `${VARIÁVEL}`. O lançador expande com o `.env` na hora
da rodada, passa só esses servidores ao Claude Code (configuração estrita) e
libera só as ferramentas deles, em proposta e real; em ensaio o agente
continua só lendo. O Ensinar usa os mesmos servidores, para você demonstrar
com eles. Nenhum MCP da máquina entra sem estar marcado.

## Esteiras: o trabalho passando de agente em agente

**🧵 Esteiras**, no topo. Uma esteira é uma lista de etapas em ordem, cada
uma com um agente de tarefa responsável, o que ele entrega e se uma pessoa
aprova antes de seguir. Exemplo de advocacia: fechamento de pasta (Tati) →
petição inicial (Léo, a advogada aprova) → protocolo e honorários (Bia). A
coisa que anda é a **entidade** (um processo, um pedido, um paciente), com
uma pasta compartilhada que todos os agentes da esteira têm marcada em 🔌
Plataformas.

Quem passa o bastão é o escritório, nunca o agente: ele lê o estado das
entidades de cada agente (`GET /entidades`, com a chave do gatilho), e quando
uma etapa fica pronta chama o `POST /gatilho` do próximo agente com o
contexto (etapa, entrega esperada, onde ler o anterior, onde gravar) e deixa
um recado de um para o outro. Recados agora chegam também nas rodadas
autônomas: o lançador os busca antes de rodar e os apresenta como dado, nunca
ordem. Etapa com aprovação espera na tela, com botões **Aprovar** e
**Devolver com observação** (devolver acorda o agente de novo com a
observação). Pergunta ou erro param só aquela entidade. Uma entidade entra
pelo botão ＋, pela API ou sozinha quando aparece uma pasta nova na pasta
compartilhada. Crie esteiras com `/criar-esteira` no Claude Code (cinco
perguntas simples, com proposta pronta) ou pelo formulário do administrador.

## Cuki BOT: a IA analista

**🩺 Cuki BOT**, no topo, e o boneco na recepção. Ele confere a saúde do
escritório e diz se está apto para o CRM, num laudo com semáforo por área:
agentes (portão passado, no ar, última rodada, pergunta parada, lições
acumuladas), plataformas (variáveis preenchidas, pasta existe, endereço
responde), fluxo (entidades reais nos últimos 30 dias, esteiras paradas),
base (Claude conectado, senha, avisos, abertura) e aptidão para o CRM. Mede
por código e explica pelo modelo: o Claude Code recebe só as medidas, sem
nenhum valor de variável, roda **sem ferramentas** e escreve a leitura e as
propostas para o CRM. Laudos ficam em `data/cuki/laudos/`. Rodar a análise é
do administrador; ler o laudo, qualquer um. Vermelho em qualquer área trava o
Criar CRM.

**O Cuki BOT no WhatsApp.** Com um número só dele, pelo
[WAHA](https://waha.devlike.pro) (servidor gratuito que roda em Docker), o
Cuki BOT **avisa** os números autorizados de tudo que o escritório avisa
(sistema caiu, pergunta ao dono, esteira esperando aprovação, resumo do dia)
e **conversa** com eles: "como estão os agentes?", "tem algo esperando eu
aprovar?", "briefing". Configura-se em 🩺 Cuki BOT › 📱 WhatsApp (ou em ⚙️
Ajustes), só pelo administrador: endereço, chave e sessão do WAHA (gravados
em `data/cuki.json`, fora do git), **Testar** mostra o estado e o QR para
escanear com o celular do Cuki BOT, e a lista de **números autorizados**
(nome, número, papel). Só esses números recebem resposta; os outros são
ignorados e anotados em `data/cuki/recusados.log`, sem o conteúdo. As
mensagens chegam de dois jeitos: pela **busca** (o escritório pergunta ao WAHA
a cada poucos segundos; funciona em qualquer rede e é o padrão) e, opcional,
pelo **webhook** `POST /api/cuki/whatsapp` com um segredo gerado, para
resposta na hora quando o WAHA alcança o escritório. A resposta é uma rodada
do Claude Code **sem ferramentas** sobre um contexto montado por código: só
estados, contagens e nomes de agentes; nenhum `.env`, nenhuma chave, nenhum
nome de cliente final. O Cuki BOT informa; para agir, a pessoa usa a tela.
Limite de 20 mensagens por número por hora. O **briefing do dia** sai sozinho
na hora do resumo (🔔 Avisos) e quando alguém escreve "briefing".

## O monitor de cada agente

| Botão | O que faz |
|---|---|
| **▶ Ligar / ■ Desligar** | sobe e derruba o sistema (processo solto: reiniciar o escritório não derruba ninguém) |
| **💬 Conversar** | uma sessão do Claude Code dentro da pasta do agente. **Investigar** só lê; **Resolver** altera; **Construir** segue a anatomia; **👀 Ensinar** (só agente de tarefa) é você fazendo a tarefa e, em **✅ Tarefa concluída**, ela virando a skill dele. A sessão sobrevive a reinício; o Ensinar tem sessão própria |
| **📋 Ficha** | a constituição seção por seção, para o dono do negócio preencher sem abrir arquivo |
| **🧠 Memória** | `memoria/escritorio.md`: o que ele anotou nas conversas e reuniões. Entra em toda chamada do escritório; o administrador pode corrigir |
| **✉️ Recados** | o que outros agentes e o dono deixaram para ele. Quem deixa recado anda até a mesa do outro |
| **📝 Propostas** | lições e mudanças no prompt ou na constituição que ele sugeriu. Nada entra sem **aprovar** |
| **🔌 Plataformas** | as plataformas que ele pode usar; marcar e salvar regrava o bloco no `.env` |
| **🧪 Testar** | o testador: casos difíceis, inclusive com instrução plantada, duas réguas (constituição e fato), relatório com triagem e comparação com a rodada anterior |
| **📜 Log** | as últimas linhas do log |

**Resolver**, **Construir** e **Ensinar** rodam o Claude Code com uma lista fixa de
ferramentas: editar arquivos, buscar na web e rodar `node`, `npm`, `git`,
`python`, `curl` e comandos básicos do sistema. Nada além disso. O Ensinar
libera edição também nas pastas de `PASTAS_AUTORIZADAS` do agente, porque é
você demonstrando em arquivos de verdade; o prompt recebe só os nomes das
variáveis do `.env`, nunca valores.

## Como os agentes falam com o escritório

Ao responder (conversa, reunião, testador), um agente pode terminar com blocos
que o escritório retira do texto e trata:

- `<memoria>…</memoria>` vai para `memoria/escritorio.md` com a data.
- `<mensagem para="id">…</mensagem>` é entregue no próximo prompt do destinatário.
- `<proposta arquivo="memoria/licoes.md" titulo="…">- Quando X, então Y.</proposta>`
  propõe uma lição; com `arquivo="prompt-agente.md"` e `secao`, uma mudança
  no prompt; com `arquivo="skills/constituicao.md"`, na constituição. Tudo
  fica pendente até o dono aprovar. É a regra das skills: o construtor nunca
  escreve a identidade do dono, e o agente nunca escreve as próprias lições.

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

1. **Durante a construção:** cada componente termina com um teste concreto;
   o portão impede de tocar em dado real sem passar na bancada.
2. **Antes de entrar em serviço:** o botão **🧪 Testar** gera casos difíceis
   (30 no atendimento, 10 no agente de tarefa), pelo menos três com instrução
   plantada, julgados por duas réguas: o que ele afirma bate com a
   constituição, e o que ele diz ter feito existe de verdade. Sai um
   relatório com a triagem de cada falha: lição, regra da constituição ou
   cerca no código. O testador **não conserta nada**: você aprova as
   correções como propostas. Uma nova rodada tem que ter menos falhas graves
   e zero instrução obedecida.
3. **Em serviço:** o escritório lê a rota de saúde, religa quem caiu, avisa no
   celular, e a reunião cobra o número prometido.

## Configuração

O jeito normal de criar `data/config.json` é `/criar-escritorio`. Se preferir
à mão, copie `data/config.exemplo.json` e ajuste:

- `nome`, `subtitulo`, `dono`, `empresa`, `porta`.
- `marca.logo` e `marca.planta` (arquivos em `data/marca/`) e `marca.cores`
  (variáveis do tema): marca branca para cada cliente sem tocar no código.
- `setores`: a lista que a aba Contratar oferece para agentes de tarefa.
- `reuniao.automatica`, `dias`, `hora`, `foco`, `meta`.

## A planta redesenha as salas

Quando a abertura recebe a planta do escritório ou da clínica, a skill lê a
imagem, propõe a lista de salas (nome, tipo, tamanho, vizinhos), você
confirma, e `node planta.js gerar` encaixa as salas na grade de 48 por 34,
com corredor no meio e uma porta por sala, gravando `data/planta.json`. A
tela desenha a partir desse arquivo: mobília pelo tipo da sala (mesas de
agente na operação e nas salas, mesa grande na reunião, sofá e jogos no
descanso, balcão na recepção, mesas do dono na diretoria). De 2 a 12 salas;
a capacidade de agentes é a soma das mesas. Sem o arquivo, o escritório de
sempre. `node planta.js remover` volta ao padrão.

## Avisos no celular

**🔔 Avisos** manda notificação pelo app gratuito [ntfy](https://ntfy.sh) ou
pelo WhatsApp via CallMeBot, para **mais de um destino**: o celular do cliente
e o seu. Avisa quando um sistema caiu e não voltou, quando a reunião terminou,
quando uma ação da agenda rodou e quando um agente pede um aviso (rodada com
erro, pergunta ao dono).

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
3. **Abertura.** Abra a pasta no Claude Code e digite `/criar-escritorio`.
   As dez perguntas cobrem negócio, setores, plataformas, marca e planta,
   senha do administrador, avisos, reunião, conta do Claude, primeiro agente
   e o exemplo. Guarde a senha que ela mostra uma vez.
4. **Chaves.** Na tela, como administrador: cole as chaves das plataformas em
   **🔌 Plataformas** e a do CallMeBot em **🔔 Avisos**.
5. **Atalho e boot.** Rode `CRIAR ATALHO.ps1`. Para subir junto com o Windows,
   crie uma tarefa no Agendador de Tarefas que execute
   `INICIAR ESCRITORIO.cmd` no logon.
6. **Primeiro agente.** Se não contratou na abertura, contrate pela aba
   Contratar, marcando as plataformas que ele pode usar. O exemplo pode ser
   demitido depois que o cliente entendeu o fluxo.

## Custos

Tudo que chama o Claude Code gasta a cota da conta logada na máquina do
cliente: Conversar, Construir, reunião, testador e cada rodada dos agentes de
tarefa (o lançador tem limite de rodadas por dia no `.env`). Decida antes de
instalar:

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
uma melhoria do molde a um agente existente, use **Conversar › Resolver**
nele.

## Hospedagem

O escritório e os agentes de tarefa rodam na máquina do cliente e não precisam
de endereço público. A máquina que roda um agente de tarefa com gatilho não
pode suspender.

O atendente de WhatsApp precisa: a Meta e o WAHA entregam as mensagens por
webhook. O padrão é rodar na mesma máquina com um túnel (Cloudflare Tunnel
ou ngrok) apontando para a porta do agente. Railway é a alternativa quando a
máquina não fica ligada: a skill de referência cobre isso, e o `.env` vai
como variáveis do serviço, nunca pelo git.

## O que fica fora do git

Tudo que é seu ou do cliente: `data/` (configuração, equipe, avisos, senha,
sessões, conversas, recados, propostas, atas, testes, marca) e `agentes/`
(as pastas dos agentes contratados, com `.env` e tudo). Só os dois
`*.exemplo.json` são versionados. No `exemplo-agente/`, ficam de fora o
`.env`, o log, as saídas e o estado das entidades.

## Problemas comuns

- **"claude não encontrado" ou resposta vazia em Conversar:** o Claude Code
  não está instalado ou não está logado nessa conta de usuário do Windows.
  Rode `claude auth login` no mesmo usuário que abre o escritório.
- **Porta ocupada ao subir:** outro programa usa a porta do escritório ou de
  um agente. Troque em `data/config.json` (escritório) ou no registro do
  agente e religue.
- **Agente aparece desligado logo depois de Ligar:** abra **📜 Log**. Em geral
  é dependência faltando na pasta do agente ou `.env` vazio.
- **Rodada do agente de tarefa termina "com erro: falha de verificação":** o
  agente disse que gravou e o arquivo não existe. É a pós-verificação
  funcionando. Veja a rodada em `saidas/` e corrija a ferramenta ou a
  descrição dela no prompt.
- **Cliente não consegue contratar:** correto. Contratar é do administrador.

## Testar

```bash
npm test
```

Roda, nesta ordem: os testes de unidade (`testes/unidade/`: util,
plataformas, abertura, planta, tools/base, conferidor), o teste de API
(`testes/api/`, sobe o escritório numa porta de teste com dados temporários),
o conferidor de organização (`testes/conferir-organizacao.js`: segredo
versionado, pasta de agente sem a anatomia, `.gitignore` sem `.env`,
endereço ou porta fixos fora do lugar, variável de plataforma fora do bloco,
skill de abertura) e a fumaça da tela (`testes/fumaca.js`: Chrome headless,
escritório padrão e com a planta da clínica). Nenhum teste toca em `data/` de
verdade: todos usam `ESCRITORIO_DADOS` apontando para uma pasta temporária.

## Estrutura

```
CLAUDE.md          o que o Claude Code lê ao abrir esta pasta: onde fica cada coisa e as regras
.claude/skills/criar-escritorio/   a abertura do escritório: as dez perguntas e a planta
server.js          servidor: tela, API, sobe/vigia sistemas, espelho, tranca
admin.js           senha e sessão do administrador
agentes.js         contratar é construir: anatomia, trilhas, setores, progresso, ficha
plataformas.js     cadastro único das plataformas e o bloco do .env de cada agente (módulo e CLI)
abertura.js        a abertura por trás da skill: config, avisos, senha, Claude, exemplo (módulo e CLI)
planta.js          salas da planta encaixadas na grade, validação e capacidade (módulo e CLI)
ensino.js          o agente que aprende vendo: demonstrações, transcrição, skills aprendidas e os prompts do Ensinar
util.js            slug, executável do Claude, leitura de .env, CLI
memoria.js         memória do escritório, lições, recados e propostas
testador.js        o exame do agente, com duas réguas e instrução plantada
reuniao.js         reunião dos agentes, com memória das atas
avisos.js          ntfy e CallMeBot, vários destinos
index.html, css/   a tela e o tema
js/                motor isométrico, salas (da planta ou padrão), móveis, bonecos, painéis, admin, contratação, plataformas, ajustes, extras
testes/            unidade, API, conferidor de organização e fumaça da tela (npm test)
docs/superpowers/  design e plano de cada trabalho
modelos/ANATOMIA.md    os 15 componentes de todo agente
modelos/agente/        o molde da pasta: comum/, tarefa/ e atendimento/
modelos/skills/        criar-agente (atendimento) e criar-agente-tarefa (tarefa), as skills de referência
exemplo-agente/    o único agente que vem no escritório, na anatomia padrão
data/              seus dados: config, registro, plataformas, planta, marca, estado (fora do git, menos os exemplos)
agentes/           os agentes contratados (fora do git)
```

## Licença

MIT. Veja [LICENSE](LICENSE).
