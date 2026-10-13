# Plataformas, organização, `/criar-escritorio` e planta — design

Data: 13/10/2026. Projeto: Escritório de Agentes. Método: superpowers (brainstorming → design → plano).

Esta sessão define **como o projeto funciona para quem for utilizá-lo**. Ela não
cria um escritório: a criação acontece depois, em cada instalação, pelo gatilho
descrito na seção "Abertura".

## Intenção e porquê

O escritório vai para a máquina de um cliente que tem um conjunto de plataformas
de trabalho: um CRM, uma planilha, uma agenda, pastas no OneDrive, um número de
WhatsApp, um e-mail, um site. Hoje cada agente guarda sozinho, no `.env` dele,
os endereços e as chaves das plataformas que usa. Isso espalha a mesma chave em
várias pastas, obriga a digitar de novo a cada agente contratado, e não deixa
claro quem acessa o quê.

O dono do produto decidiu (frase dele, 13/10/2026): "quero em um lugar único do
escritório, dessa forma, quando eu criar os agentes quero que já apareça as
plataformas conectadas para os agentes usarem e trabalharem. Cada agente deve
acessar somente as plataformas que ele foi permitido usar."

## Objetivos

1. Um **cadastro único de plataformas** no escritório, com nome, tipo, endereço,
   as variáveis de conexão (nomes e valores) e observações.
2. Ao **contratar** um agente, a tela mostra as plataformas cadastradas e o
   administrador marca quais aquele agente pode usar.
3. **Cada agente só tem acesso às plataformas permitidas**, garantido por código,
   não por instrução: o agente não recebe credencial do que não pode usar.
4. Trocar uma chave ou um endereço **uma vez**, no escritório, e todos os agentes
   permitidos receberem a mudança.
5. Ver, no monitor de cada agente, quais plataformas ele usa, e mudar isso sem
   abrir arquivo.

## Não objetivos

- Não é um gerenciador de senhas nem um cofre criptografado. Os valores ficam
  em `data/plataformas.json`, fora do git, na máquina do cliente, como já ficam
  hoje a chave do CallMeBot e o hash do administrador.
- Não é um proxy: o escritório não fica no meio das chamadas do agente à
  plataforma. O agente continua chamando a plataforma direto, com a credencial
  que recebeu.
- Não substitui as conexões exclusivas de um agente (ex.: a chave do OpenRouter
  do atendente, o `MODO_REAL`, a `PAINEL_SENHA`). Essas continuam só no `.env`
  do agente, fora do bloco gerenciado.

## Anti-objetivos (o que tornaria isto um fracasso)

- Um agente conseguir usar uma plataforma que não foi marcada para ele.
- Uma chave aparecer no chat, no progresso, no log ou no git.
- O cliente (sem senha de administrador) conseguir ler valores de chave pela
  tela ou pela API.
- Quebrar agentes já contratados: o `.env` que eles têm hoje precisa continuar
  valendo.

## Restrições

- Node.js sem dependências, como o resto do escritório.
- Os princípios da ANATOMIA valem: segredo só no `.env` do agente; código para
  o garantido; o agente nunca imprime valor de variável.
- Verificação de permissão no servidor, rota a rota, como a tranca já faz.

## O desenho

### 1. O cadastro: `data/plataformas.json`

Uma lista de plataformas. Cada uma:

```json
{
  "id": "ophir",
  "nome": "Ophir (CRM jurídico)",
  "tipo": "api",
  "url": "https://app.ophir.com.br",
  "variaveis": { "OPHIR_URL": "https://api.ophir.com.br", "OPHIR_TOKEN": "..." },
  "notas": "token do usuário 'agente', só leitura e criação de tarefas",
  "criadaEm": "2026-10-13T...", "atualizadaEm": "2026-10-13T..."
}
```

- `id`: slug do nome, único, gerado pelo escritório. Não muda depois de criado.
- `tipo`: um de `api`, `planilha`, `agenda`, `pasta`, `whatsapp`, `email`,
  `banco`, `navegador`, `link`. O tipo serve para o ícone, a sugestão de
  variáveis ao cadastrar, os nomes canônicos e, no tipo `pasta`, para
  alimentar `PASTAS_AUTORIZADAS`.
- `url`: o endereço humano (o que o dono abre no navegador). Opcional.
- `variaveis`: os pares que entram no `.env` dos agentes permitidos. Nomes em
  MAIÚSCULAS, prefixados pelo id em maiúsculas com `-` trocado por `_`
  (`OPHIR_`); o escritório sugere o prefixo e recusa nome fora do padrão
  `[A-Z][A-Z0-9_]*`. Valores podem ficar vazios enquanto o dono não os tem.
- O arquivo entra no `.gitignore` já existente (`data/*.json`).

Sugestão de variáveis por tipo, ao cadastrar (o administrador edita):

| tipo | variáveis sugeridas |
|---|---|
| api | `<ID>_URL`, `<ID>_TOKEN` |
| planilha | `<ID>_SHEETS_ID`, `GOOGLE_CREDENCIAIS_JSON` |
| agenda | `<ID>_CALENDAR_ID`, `GOOGLE_CREDENCIAIS_JSON` |
| pasta | `<ID>_PASTA` (caminho absoluto) |
| whatsapp | `<ID>_API_URL`, `<ID>_API_CHAVE`, `<ID>_SESSAO` |
| email | `<ID>_USUARIO`, `<ID>_SENHA_APP`, `<ID>_PASTA` |
| banco | `<ID>_URL`, `<ID>_CHAVE` |
| navegador | `<ID>_URL`, `<ID>_PERFIL` |
| link | `<ID>_URL` |

Uma variável com o mesmo nome em duas plataformas (ex.: `GOOGLE_CREDENCIAIS_JSON`)
é permitida; na hora de gerar o `.env`, o último valor não vazio vence e o
escritório avisa na tela quando os valores divergem.

**Nomes canônicos por tipo (para as ferramentas do catálogo encontrarem).**
As skills de referência e os moldes prescrevem nomes fixos (`SISTEMA_API_URL`,
`GOOGLE_SHEETS_ID`, `WHATSAPP_API_URL`, `EMAIL_USUARIO`, `BANCO_URL`...). Para
uma ferramenta construída pelo catálogo achar a plataforma, o bloco grava cada
variável **duas vezes**: com o nome prefixado (`OPHIR_TOKEN`) e com o nome
canônico do tipo (`SISTEMA_API_TOKEN`):

| tipo | canônicos |
|---|---|
| api | `SISTEMA_API_URL`, `SISTEMA_API_TOKEN` |
| planilha | `GOOGLE_SHEETS_ID`, `GOOGLE_CREDENCIAIS_JSON` |
| agenda | `GOOGLE_CALENDAR_ID`, `GOOGLE_CREDENCIAIS_JSON` |
| pasta | `PASTA_ENTRADA` (a primeira), e todas em `PASTAS_AUTORIZADAS` |
| whatsapp | `WHATSAPP_API_URL`, `WHATSAPP_API_CHAVE`, `WHATSAPP_SESSAO` |
| email | `EMAIL_USUARIO`, `EMAIL_SENHA_APP`, `EMAIL_PASTA` |
| banco | `BANCO_URL`, `BANCO_CHAVE` |
| navegador | `SISTEMA_URL`, `NAVEGADOR_PERFIL` |
| link | (só o prefixado) |

Quando o agente tem **duas plataformas do mesmo tipo**, a primeira da lista de
permissão recebe os nomes canônicos; a segunda só os prefixados, e o bloco
anota isso em comentário. O construtor, ao criar a ferramenta, lê o bloco e
escolhe pelo prefixo quando precisar da segunda.

As conexões nativas do atendente (OpenRouter, Supabase, Meta ou WAHA) **não**
são plataformas: continuam exclusivas do `.env` dele, fora do bloco. Agenda e
planilha do atendente são plataformas (tipos `agenda` e `planilha`), e os
canônicos coincidem com os nomes que o código dele já lê.

### 2. A permissão: no registro do sistema

Cada agente contratado ganha, em `data/sistemas.json`, o campo
`plataformas: ["ophir", "drive-clientes"]` (lista de ids). Sem o campo, ou
lista vazia, o agente não tem plataforma nenhuma. O escritório só sincroniza
o `.env` de sistemas **que ele mesmo criou** (têm `trilha` no registro e a
`pasta` existe); o exemplo-agente conta. Robôs cadastrados à mão (sem
`trilha`) podem ter o campo `plataformas` para a tela mostrar, mas o
escritório nunca escreve no `.env` deles: é projeto de terceiro, com formato
próprio. Se a pasta existe e o `.env` não, o escritório cria o arquivo só com
o bloco.

### 3. A entrega ao agente: o bloco gerenciado do `.env`

O escritório é a fonte da verdade; o agente continua lendo só o `.env` dele,
como a ANATOMIA manda. Ao contratar e a cada sincronização, o escritório
reescreve no `.env` do agente um bloco delimitado:

```
# >>> plataformas do escritório (gerado; edite no escritório, não aqui) >>>
# Ophir (CRM jurídico) — https://app.ophir.com.br
OPHIR_URL="https://api.ophir.com.br"
OPHIR_TOKEN="..."
SISTEMA_API_URL="https://api.ophir.com.br"
SISTEMA_API_TOKEN="..."
# Drive de clientes — pasta
DRIVE_CLIENTES_PASTA="C:\Users\...\OneDrive\Clientes"
PASTA_ENTRADA="C:\Users\...\OneDrive\Clientes"
PASTAS_AUTORIZADAS="C:\Users\...\OneDrive\Clientes"
PLATAFORMAS_PERMITIDAS="ophir;drive-clientes"
# <<< plataformas do escritório <<<
```

- Tudo fora dos marcadores é do agente e nunca é tocado.
- `PASTAS_AUTORIZADAS` só entra no bloco quando há pelo menos uma plataforma
  tipo `pasta` permitida, e **soma**: os caminhos das plataformas primeiro, e
  depois os caminhos que o agente já tinha digitados à mão fora do bloco (o
  escritório lê o resto do arquivo antes de gravar). Assim marcar uma
  plataforma `api` para um agente antigo não zera o escopo dele, e marcar uma
  `pasta` acrescenta sem tirar. É a variável que `tools/base.js` já usa como
  escopo. Como o bloco fica no começo do arquivo e `carregarEnv` não
  sobrescreve variável já definida, o valor do bloco (que já contém os manuais)
  é o que vale.
- `PLATAFORMAS_PERMITIDAS` é a lista de ids, para o agente e o painel dele
  mostrarem o que ele pode usar.
- Sincronizar acontece: ao contratar; ao salvar uma plataforma (todos os
  agentes que a têm); ao mudar a lista de um agente no monitor; e pelo botão
  "Sincronizar" da tela de plataformas. Nunca em agente com `pasta` que não
  existe.
- Depois de sincronizar, o agente precisa ser religado para ler o `.env` novo.
  A tela avisa isso e oferece religar os que estão ligados.

### 4. A garantia por código

- O agente só recebe as variáveis das plataformas permitidas. Sem credencial,
  não há acesso. É a garantia principal.
- `tools/base.js` ganha `plataformasPermitidas()` (lê `PLATAFORMAS_PERMITIDAS`)
  e `exigePlataforma(id)`: toda ferramenta que fala com uma plataforma chama
  isso antes e devolve `recusado` se o id não estiver na lista. O molde
  `tools/arquivos.js` passa a conferir pelo escopo de pastas, como já faz.
- O contrato (`CLAUDE.md` do agente) e a ANATOMIA (componentes 8 e 9) passam a
  dizer: "as plataformas que você pode usar estão no bloco do escritório no
  `.env`; nada além dessas existe para você; endereço e chave de trabalho
  entram pelo escritório, nunca à mão".

### 5. A tela

- **Botão `🔌 Plataformas`** no topo, ao lado de `🔔 Avisos`, abrindo o modal
  que já existe. Lista as plataformas com ícone do tipo, nome, url e quais
  agentes usam cada uma. Administrador: adicionar, editar (nome, url, notas,
  variáveis com valor), remover, sincronizar. Os valores das variáveis
  aparecem num campo de senha com botão "mostrar", só para o administrador.
  Cliente sem senha: vê nome, tipo, url e nomes das variáveis; nunca valores.
- **Contratar, passo 2:** uma lista de caixas de marcação com as plataformas
  cadastradas (ícone, nome). Marcadas vão em `plataformas` do pedido.
  Se não houver nenhuma cadastrada, um aviso com link para `🔌 Plataformas`.
- **Monitor do agente, painel `🔌 Plataformas`** (botão novo em `#mon-extra`,
  ao lado de Ficha e Memória): a lista de todas as plataformas, marcadas as
  que ele tem; o administrador marca e desmarca e o escritório sincroniza o
  `.env` na hora, avisando que precisa religar.
- O boneco não muda.

### 6. A API (todas verificadas no servidor)

| Rota | Quem | O que |
|---|---|---|
| `GET /api/plataformas` | todos | lista sem valores de variáveis (só nomes), com `usadaPor: [ids]` |
| `GET /api/plataformas/:id` | admin | uma plataforma com valores |
| `POST /api/plataformas` | admin | cria; devolve a lista |
| `PUT /api/plataformas/:id` | admin | edita; sincroniza os agentes que a têm |
| `DELETE /api/plataformas/:id` | admin | remove; tira dos agentes e sincroniza |
| `POST /api/plataformas/sincronizar` | admin | regrava o bloco em todos os agentes do escritório |
| `PUT /api/agentes/:id/plataformas` | admin | `{ plataformas: [ids] }`; grava no registro e sincroniza |
| `POST /api/contratar` | admin | passa a aceitar `plataformas: [ids]` |

Nenhuma rota devolve valor de variável para quem não é administrador. O log do
servidor registra só nomes.

### 7. Módulo novo: `plataformas.js`

Com a mesma forma dos outros módulos (`init(dep)`, funções puras sobre
arquivo) e também linha de comando, para a skill de abertura usar:
`listar(comValores)`, `obter(id)`, `salvar(dados)`, `remover(id)`,
`blocoEnvPara(ids)`, `sincronizarAgente(idSistema)`, `sincronizarTodos()`,
`usadaPor(idPlataforma)`. O `agentes.js` chama a sincronização ao criar a
pasta; o `server.js` só roteia.

## Decisões do construtor (minhas, não dele; corrija se quiser)

- O bloco gerenciado fica no **começo** do `.env`, logo após o cabeçalho de
  comentários do molde, porque `carregarEnv` só define variável que ainda não
  existe no processo: o que vem primeiro vence.
- Valores de variáveis são gravados **entre aspas duplas**, com `"` interno
  escapado como `\"`; o `carregarEnv` do molde já tira as aspas externas.
  Caminhos do Windows com `\` entram como estão.
- `id` é o slug do nome no momento da criação; renomear a plataforma não muda
  o id (senão quebraria o `.env` dos agentes).
- Remover uma plataforma em uso pede confirmação na tela e mostra quem a usa.
- A sincronização não religa agentes sozinha: mexer em processo de cliente sem
  ele pedir é mais perigoso do que um `.env` desatualizado por alguns minutos.
  A tela mostra o aviso e o botão.
- Agentes contratados **antes** desta mudança não têm o bloco. Continuam
  funcionando com o `.env` que têm. Quando o administrador marcar uma
  plataforma para eles, o bloco é criado no começo do arquivo.
- O molde `env` das duas trilhas ganha um comentário dizendo onde o bloco vai
  entrar e que não se edita à mão. O `.env.exemplo` do exemplo-agente mostra o
  bloco vazio.

## Abertura do escritório: `/criar-escritorio` no Claude Code

Pedido do dono (13/10/2026): "quando acessar esse projeto aqui, para criar o
escritório sejam feitas perguntas"; e, corrigindo a versão anterior deste
design: "Essa sessão é apenas para ajustar como o projeto deve funcionar para
quem for utilizar. Não para criação desse escritório em si. (...) O gatilho
para a criação do escritório deve ser abrir a pasta desse projeto aqui no
claude e digitar /criar escritorio, daí começa a criação."

### O gatilho

Uma skill do projeto, versionada em `.claude/skills/criar-escritorio/`, que
qualquer pessoa que abra esta pasta no Claude Code invoca com
`/criar-escritorio` (o Claude Code não aceita espaço no nome; a skill também
dispara se a pessoa escrever "quero criar o escritório" ou "criar escritorio").
Ela conduz as perguntas abaixo **no chat**, uma por mensagem, no tom que
serve tanto para o administrador quanto para o cliente, e grava os arquivos
chamando scripts do projeto (nunca escrevendo JSON à mão). Pode ser rodada de
novo em um escritório já configurado: ela lê os valores atuais, mostra e
pergunta o que muda. É o "Refazer abertura".

Não há assistente na tela do navegador. Sem `data/config.json`, a tela mostra
um aviso: "Este escritório ainda não foi aberto. Abra esta pasta no Claude
Code e digite /criar-escritorio."

### As perguntas, na ordem

| # | Pergunta | Grava em | Como |
|---|---|---|---|
| 1 | O negócio: nome da empresa, o que faz em uma frase, nome do dono | `config.json` (`empresa`, `dono`, `nome` = "Escritório da <empresa>", `subtitulo`) | `node abertura.js aplicar` |
| 2 | Os setores: a skill sugere uma lista pelo ramo; a pessoa marca e completa | `config.json` (`setores`) | idem |
| 3 | As plataformas: nome, tipo e endereço de cada sistema que a empresa usa. **Chaves nunca no chat**: a skill cria as entradas com valores vazios e diz onde colar (botão 🔌 Plataformas, como administrador) | `plataformas.json` | `node plataformas.js criar` |
| 4 | A marca e a planta: logo e cor principal; a planta do escritório ou da clínica. A pessoa coloca os arquivos em `data/marca/`; a skill confere que chegaram. **Se veio planta, a skill redesenha as salas (seção abaixo)** | `data/marca/`, `config.json` (`marca`), `data/planta.json` | `node planta.js` |
| 5 | A tranca: a skill **gera** uma senha forte de administrador, grava o hash e mostra a senha UMA vez, pedindo para guardar; explica que o cliente opera sem senha e só o administrador constrói | `admin.json` | `node abertura.js senha` |
| 6 | Os avisos: celular do dono e do administrador. Tópico do ntfy é público e entra no chat; a chave do CallMeBot é segredo e é colada em 🔔 Avisos | `avisos.json` | `node abertura.js aplicar` |
| 7 | A reunião: automática ou não, dias e hora; a meta (o que medir, alvo, unidade, até quando) | `config.json` (`reuniao`) | idem |
| 8 | A conta do Claude Code: conferência, não pergunta; a skill roda `claude auth status`, diz se está conectado e de quem é a conta, com o aviso de custo | nada | `node abertura.js claude` |
| 9 | O primeiro agente: "qual trabalho dói mais hoje?"; a skill contrata pela API do escritório com setor e plataformas já escolhidos, se o escritório estiver no ar; senão deixa anotado | `sistemas.json`, pasta do agente | `POST /api/contratar` |
| 10 | O exemplo: manter o agente de exemplo ou demitir já | `sistemas.json`, `equipe.json` | `node abertura.js exemplo` |

No fim a skill sobe o escritório (`npm start` solto), abre `http://localhost:<porta>`
e resume o que gravou, só com nomes de variáveis e arquivos.

### A planta redesenha as salas (passo 4)

Decisão do dono: "Quando ser mandado a planta, deve acontecer isso e ser
feito redesenhada as salas do escritório isométrico." Como:

1. **Interpretar (IA):** a skill, que roda no Claude Code e enxerga imagens e
   PDFs, lê a planta e propõe no chat uma lista de salas: nome, tipo, tamanho
   relativo (pequena, média, grande) e vizinhos. Tipos: `diretoria`,
   `operacao` (mesas para agentes), `reuniao`, `recepcao`, `descanso`,
   `sala` (sala genérica pequena: um consultório, uma sala de atendimento,
   com uma estação). A pessoa confirma ou corrige nomes e tipos.
2. **Encaixar (código):** `node planta.js gerar salas.json` distribui as
   salas na grade de 48 por 34 sem sobreposição, com portas e corredor
   ligando todas, e grava `data/planta.json`. Limites: de 2 a 12 salas; se
   não couber, o script diz quais juntar ou reduzir. A capacidade de agentes
   é a soma das estações (uma por `sala`; seis, doze ou dezoito por `operacao`
   pequena, média ou grande; duas na `diretoria`); a skill avisa a capacidade.
3. **Desenhar (código):** o motor da tela lê `data/planta.json` quando ele
   existe e desenha salas, portas, corredor e móveis pelo tipo da sala; sem o
   arquivo, desenha o escritório padrão de hoje. As mesas dos agentes são
   geradas pelas estações; o caminho dos bonecos usa a grade gerada.
4. **Conferir (gente):** a skill abre o escritório e pede "olhe e me diga se
   bate"; corrigir é editar a lista e gerar de novo.

É uma interpretação, não uma cópia: uma clínica com doze consultórios vira um
escritório com doze salas pequenas com os nomes certos.

### Os Ajustes

Botão **⚙️ Ajustes** no topo, ao lado de Avisos. Modal com: resumo da
configuração (empresa, dono, setores, porta, salas da planta); **status da
conta do Claude Code** (instalado, conectado, método; botão "conectar" que
reaproveita o login existente); miniatura do logo e da planta; atalhos para
Plataformas, Avisos e Admin; e a instrução "Para refazer a abertura, abra
esta pasta no Claude Code e digite /criar-escritorio". Cliente sem senha vê
tudo isso menos os atalhos de administrador.

### Scripts do projeto que a skill usa (todos com `--ajuda`)

- `node abertura.js atual` → JSON com os valores atuais, sem segredos.
- `node abertura.js aplicar <respostas.json>` → grava config, setores,
  avisos (sem chave), reunião; devolve o que gravou.
- `node abertura.js senha` → gera, grava o hash em `admin.json`, imprime uma vez.
- `node abertura.js claude` → status do Claude Code.
- `node abertura.js exemplo manter|demitir`.
- `node plataformas.js criar <lista.json>` / `listar`.
- `node planta.js gerar <salas.json>` / `validar` / `capacidade` / `remover`.

## Trabalho irmão, no mesmo plano: organização do escritório

Pedido do dono na mesma conversa: "veja se o código está bagunçado ou
desorganizado e sugira apenas se precisar (...) preciso que cada coisa fique
no seu devido lugar". A avaliação (13/10/2026) achou o projeto organizado e
quatro lacunas pequenas. Entram neste plano, sem reestruturar pastas:

1. **`CLAUDE.md` na raiz do escritório:** o mapa "onde fica cada coisa" (código,
   tela, moldes, `data/` configuração e estado, `agentes/`, `docs/`, `testes/`,
   `.claude/skills/`) e as regras para qualquer sessão do Claude Code nesta
   pasta: segredo só em `.env` de agente ou `data/`; endereço e chave de
   plataforma só pelo cadastro de plataformas; dado novo do escritório em
   `data/`; molde novo em `modelos/agente/`, refletido em `exemplo-agente/`;
   regra nova de agente passa pela ANATOMIA e pelo molde; nenhuma escrita em
   `agentes/` fora das rotas do servidor; para abrir um escritório,
   `/criar-escritorio`, e para mudar o que ele pergunta, editar a skill.
2. **`testes/fumaca.js`** (o teste headless da tela, hoje fora do repositório) e
   **`testes/conferir-organizacao.js`**: falha se houver segredo versionado,
   `.env` de agente fora do `.gitignore`, pasta de agente sem os arquivos da
   anatomia, endereço `http` ou porta fixa fora dos lugares permitidos, ou
   variável com prefixo de plataforma cadastrada fora do bloco gerenciado.
   `npm test` roda unidade, conferidor e fumaça; o de fumaça sobe o escritório
   numa porta de teste com dados temporários e derruba no fim.
3. **`util.js`** com `slug`, `acharClaude`, `lerEnvArquivo` e `rodarCli` (hoje
   repetidos). A cópia do navegador em `js/contratar.js` fica (é outro
   ambiente).
4. **Não fazer agora:** separar `data/` em configuração e estado; dividir
   `server.js` e `js/app.js`; mover os scripts do Windows. Avaliados e deixados
   como estão de propósito. A única mudança estrutural é `ESCRITORIO_DADOS`
   (variável de ambiente que troca a pasta `data/`), para os testes não
   tocarem nos dados reais.

## O que fica para o construtor

- Ícones por tipo e textos da tela.
- O formulário de variáveis (adicionar linha, remover linha).
- Como mostrar "quem usa" na lista.
- O algoritmo exato de encaixe das salas na grade, respeitando os limites
  acima.
- A forma exata das checagens do `conferir-organizacao.js`.

## Critérios de aceitação

0. `npm test` existe, roda unidade, conferidor e fumaça, e passa no
   repositório como está depois deste plano; o conferidor falha de propósito
   quando se planta um `.env` com chave num agente de teste.
1. Cadastrar uma plataforma tipo `pasta` e outra tipo `api` pela tela, como
   administrador. Sem senha de administrador, a lista aparece sem valores.
2. Contratar um agente marcando só a plataforma `pasta`: o `.env` dele tem o
   bloco com `<ID>_PASTA`, `PASTAS_AUTORIZADAS` e `PLATAFORMAS_PERMITIDAS`, e
   **não** tem as variáveis da `api`.
3. `node tools/arquivos.js listar <pasta da plataforma>` funciona; listar uma
   pasta fora dela é recusado.
4. Marcar a `api` para esse agente no monitor: o bloco ganha as variáveis dela;
   o resto do `.env` fica igual byte a byte.
5. Mudar o valor do token no escritório: o `.env` do agente muda; um agente que
   não tem a plataforma não muda.
6. Remover a plataforma: sai do bloco e do registro; a tela avisou quem usava.
7. `GET /api/plataformas` sem sessão de administrador não contém nenhum valor.
8. O teste de fumaça da tela abre o modal de plataformas e o passo 2 do
   contratar com as caixas, sem erro de JavaScript.
9. Em uma cópia limpa do projeto, `claude` na pasta e `/criar-escritorio`
   conduz as dez perguntas uma por vez; ao fim existem `config.json`,
   `plataformas.json` (valores vazios), `avisos.json`, `admin.json`, e o
   escritório sobe com o nome "Escritório da <empresa>". Nenhuma chave passou
   pelo chat; a senha do administrador apareceu uma vez.
10. Rodar `/criar-escritorio` de novo mostra os valores atuais e só muda o
    que a pessoa pedir.
11. Sem `config.json`, a tela mostra o aviso com o comando; com config, não.
12. Os Ajustes mostram o status do Claude Code igual ao de `/api/claude`, o
    logo e a planta.
13. Com uma planta de 7 salas (fixture em `testes/fixtures/salas-clinica.json`),
    `node planta.js gerar` produz um `planta.json` válido (sem sobreposição,
    todas as salas alcançáveis pelo corredor), a tela desenha as 7 salas sem
    erro de JavaScript, os agentes recebem mesas e um boneco anda até a sala
    de reunião. Sem `planta.json`, a tela é a de hoje.
