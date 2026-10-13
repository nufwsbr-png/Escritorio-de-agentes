# Plataformas, organização, `/criar-escritorio` e planta — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cadastro único de plataformas com permissão por agente entregue pelo `.env`; o escritório organizado e verificável por `npm test`; a criação de um escritório disparada por `/criar-escritorio` no Claude Code, com dez perguntas e a planta redesenhando as salas.

**Architecture:** módulos novos no servidor Node sem dependências (`util.js`, `plataformas.js`, `abertura.js`, `planta.js`), cada um módulo **e** linha de comando, roteados por `server.js` quando a tela precisa; a skill de projeto `.claude/skills/criar-escritorio/` conduz as perguntas e chama esses scripts; o motor da tela (`js/world.js`, `js/furniture.js`, `js/path.js`, `js/app.js`) passa a ler `data/planta.json` quando existe; `testes/` com `node --test`, um conferidor de organização e o teste de fumaça headless.

**Tech Stack:** Node >= 18 (`node:test`, `node:assert`, `http`, `fs`, `child_process`), navegador puro, Chrome headless pelo protocolo DevTools.

**Spec:** `docs/superpowers/specs/2026-10-13-plataformas-design.md`

## Global Constraints

- Nenhuma dependência npm. Node >= 18.
- Nenhum valor de variável de plataforma, chave de aviso ou senha sai para quem não é administrador, nem para o log, nem para o chat da skill (a senha gerada aparece uma vez, por decisão do design).
- Bloco gerenciado do `.env`: entre `# >>> plataformas do escritório (gerado; edite no escritório, não aqui) >>>` e `# <<< plataformas do escritório <<<`, no começo do arquivo após o cabeçalho de comentários; o resto preservado byte a byte, inclusive fim de linha.
- Só sistemas com `trilha` no registro e `pasta` existente recebem o bloco.
- Nomes de variável `[A-Z][A-Z0-9_]*`; prefixo = id em maiúsculas com `-` → `_`; nomes canônicos por tipo como na tabela do spec; só a primeira plataforma de cada tipo recebe os canônicos.
- `PASTAS_AUTORIZADAS` só com plataforma tipo `pasta`; soma com os caminhos manuais fora do bloco, sem repetição.
- Administrador verificado no servidor por `soAdmin()` em toda escrita e leitura com valor.
- Grade do escritório: 48 por 34; tipos de sala `diretoria | operacao | reuniao | recepcao | descanso | sala`; de 2 a 12 salas; sem `data/planta.json` a tela é a de hoje.
- Todo script de linha de comando aceita `--ajuda` e devolve JSON em uma linha quando chamado por outro programa.
- Textos em português do Brasil, no tom do resto da tela.

## Review Focus

1. `.env` CRLF sem bloco: sincronizar insere o bloco e mantém o CRLF (Tarefa 2).
2. Plataforma removida enquanto um agente a tem: o agente perde as variáveis e `PLATAFORMAS_PERMITIDAS` encolhe (Tarefa 2).
3. Planta com 12 salas grandes que não cabem na grade: `planta.js gerar` recusa e diz quais juntar, em vez de sobrepor (Tarefa 10).
4. `planta.json` com sala sem porta alcançável: o validador recusa; o motor nunca recebe grade sem caminho (Tarefa 10).
5. `/criar-escritorio` rodado de novo: nenhum valor existente é apagado sem a pessoa pedir; plataformas e agentes ficam (Tarefa 9 e 12).

---

### Task 1: `util.js` (slug, executável do Claude, leitura de `.env`)

**Files:**
- Create: `util.js`
- Modify: `server.js:104`, `server.js:576-581`, `agentes.js:42-43`, `modelos/agente/comum/agente-base.js` (ganha `acharClaude`, cópia documentada), `modelos/agente/tarefa/rodar.js:24-28`, `modelos/agente/atendimento/server.js:54-58`
- Test: `testes/unidade/util.test.js`

**Interfaces:**
- Produces: `slug(texto, max = 30): string`; `acharClaude(): string`; `lerEnvArquivo(caminho): Map<string,string>`; `rodarCli(modulo, acoes)`: utilitário que transforma `{ acao: fn }` numa linha de comando com `--ajuda` e saída JSON (usado por `plataformas.js`, `abertura.js`, `planta.js`).

- [ ] **Step 1: escrever o teste** (`slug('Tati Teste') === 'tati-teste'`, `slug('Recepção & Caixa', 10) === 'recepcao-c'`, `slug('---') === ''`; `lerEnvArquivo` com `A="1 2"`, `#B=3`, `C=x` → Map `{A:'1 2', C:'x'}`; `acharClaude()` não vazio; `rodarCli` com `--ajuda` imprime as ações).
- [ ] **Step 2: rodar e ver falhar:** `node --test testes/unidade/` → FAIL.
- [ ] **Step 3: criar `util.js`**; trocar as cópias em `server.js` e `agentes.js`; `agente-base.js` exporta `acharClaude`; `rodar.js` e o server do atendente usam `base.acharClaude()`.
- [ ] **Step 4: rodar:** PASS; `node --check` nos seis arquivos.
- [ ] **Step 5: commit** `util.js: slug, acharClaude, lerEnvArquivo e rodarCli`

### Task 2: `plataformas.js` (cadastro, bloco do `.env`, sincronização, CLI)

**Files:**
- Create: `plataformas.js`
- Test: `testes/unidade/plataformas.test.js` (pasta temporária como `ROOT`, registro falso)

**Interfaces:**
- `init({ ROOT, lerRegistro, lerRegistroBruto, gravarRegistro })`
- `TIPOS`, `CANONICOS` por tipo (tabela do spec; `GOOGLE_CREDENCIAIS_JSON` canônico sem prefixo em planilha e agenda)
- `listar(comValores = false)`, `obter(id, comValores = false)`, `salvar(dados)`, `remover(id)`, `blocoEnvPara(ids, manuaisPastas = [])`, `aplicarBloco(textoEnv, bloco)`, `sincronizarAgente(idSistema)`, `sincronizarTodos()`, `definirDoAgente(idSistema, ids)`, `usadaPor(idPlataforma)`
- CLI: `node plataformas.js listar | criar <lista.json> | sincronizar` (o `criar` aceita `[{nome, tipo, url}]` e cria com variáveis sugeridas vazias; é o que a skill usa)

- [ ] **Step 1: testes** (um por item): `salvar` cria id `ophir`, recusa variável `token` e tipo `xyz`; `blocoEnvPara(['ophir'])` tem `OPHIR_TOKEN`, `SISTEMA_API_TOKEN`, `PLATAFORMAS_PERMITIDAS="ophir"`, não tem `PASTAS_AUTORIZADAS`; `blocoEnvPara(['drive','ophir'], ['C:\\manual'])` tem `PASTAS_AUTORIZADAS="C:\\x;C:\\manual"` e `PASTA_ENTRADA="C:\\x"`; dois `api` → só o primeiro com `SISTEMA_API_URL`; `aplicarBloco` em CRLF sem bloco e com bloco antigo (resto byte a byte); `sincronizarAgente` pula sem `trilha`, cria `.env` ausente; editar valor + `sincronizarTodos` muda só quem tem; `remover` lista `usadaPor` e limpa; CLI `criar` com lista de 2 cria 2 com valores vazios.
- [ ] **Step 2: rodar e ver falhar.**
- [ ] **Step 3: implementar.**
- [ ] **Step 4: rodar:** PASS.
- [ ] **Step 5: commit** `plataformas.js: cadastro único, bloco do .env, sincronização e CLI`

### Task 3: rotas da API e contratação com plataformas

**Files:**
- Modify: `server.js` (rotas do spec §6 após `/api/setores`; `/api/contratar` passa `plataformas`), `agentes.js` (`criarAgente` grava `plataformas` no item e chama `dep.plataformas.sincronizarAgente(id)`)
- Test: `testes/api/plataformas.api.test.js` — sobe `server.js` com `PORT=4397` e `ESCRITORIO_DADOS=<pasta temporária>` (**uma linha nova em `server.js`:** `const DADOS = process.env.ESCRITORIO_DADOS || path.join(ROOT, 'data')`, e todos os `path.join(ROOT, 'data', ...)` passam a usar `DADOS`; é a única mudança estrutural, e é o que permite testar sem tocar nos dados reais)

- [ ] **Step 1: teste de API:** sem sessão `GET /api/plataformas` sem `"valor"` e sem o token; `POST` → 403 `precisaAdmin`; com `/api/admin/entrar`: `POST` cria, `PUT` edita, `PUT /api/agentes/exemplo/plataformas` grava e o `.env` do exemplo (cópia na pasta temporária) ganha o bloco, `DELETE` remove.
- [ ] **Step 2: rodar e ver falhar.**
- [ ] **Step 3: implementar** rotas, `DADOS`, contratação.
- [ ] **Step 4: rodar:** PASS; `node --check server.js`.
- [ ] **Step 5: commit** `API de plataformas, permissão por agente e ESCRITORIO_DADOS para testes`

### Task 4: tela — modal Plataformas, caixas no Contratar, painel no monitor

**Files:**
- Create: `js/plataformas.js` (`PLATAFORMAS_UI.abrir()`, `.caixas(selecionadas)`, `.painelDoAgente(id)`)
- Modify: `index.html` (`#btn-plataformas`, `#mon-plataformas`, script), `js/contratar.js` (caixas no passo 2; `corpoReq.plataformas`), `js/extras.js` (`abrir(id,'plataformas')`), `js/app.js` (botões), `css/style.css`
- Test: checagens no `testes/fumaca.js` (Tarefa 8): modal abre e lista; painel do monitor; caixas no passo 2.

- [ ] **Step 1: anotar as três checagens** no rascunho de `testes/fumaca.js` (vermelhas até a Tarefa 8).
- [ ] **Step 2: implementar** (ícones por tipo: api 🔗, planilha 📊, agenda 📅, pasta 📁, whatsapp 💬, email ✉️, banco 🗄️, navegador 🌐, link 🔖; valores em `type="password"` com "mostrar", só com `ADMIN.ehAdmin()`).
- [ ] **Step 3: verificar à mão** (admin cadastra, edita, remove; sem admin não vê valor) e registrar no commit.
- [ ] **Step 4: commit** `Tela de plataformas: modal, contratação e painel do agente`

### Task 5: o agente lê o bloco (molde, ANATOMIA, exemplo)

**Files:**
- Modify: `modelos/agente/comum/tools/base.js` (`plataformasPermitidas()`, `exigePlataforma(id)`), `modelos/agente/comum/CLAUDE.md`, `modelos/ANATOMIA.md` (componentes 8 e 9), `modelos/agente/tarefa/env`, `modelos/agente/atendimento/env` (comentário do bloco), os dois `server.js` de molde (painel mostra `PLATAFORMAS_PERMITIDAS`), `exemplo-agente/` (propagar)
- Test: `testes/unidade/tools-base.test.js`

- [ ] **Step 1: teste** (`PLATAFORMAS_PERMITIDAS="ophir;drive"` → `exigePlataforma('ophir')` true, `('crm')` false; sem variável → lista vazia).
- [ ] **Step 2: rodar e ver falhar.**
- [ ] **Step 3: implementar e propagar** ao exemplo (copiar os arquivos de molde alterados; manter os personalizados do exemplo).
- [ ] **Step 4: rodar:** PASS.
- [ ] **Step 5: commit** `Agente só enxerga as plataformas permitidas`

### Task 6: `CLAUDE.md` da raiz do escritório

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: escrever:** o projeto em 5 linhas; "esta pasta é o produto: para abrir um escritório, `/criar-escritorio`"; mapa onde fica cada coisa (tabela coisa → lugar → quem escreve, incluindo `docs/superpowers/`, `testes/`, `.claude/skills/`); regras de sessão (segredo só em `.env` de agente ou `data/`; plataforma só pelo cadastro; dado novo em `data/`; molde novo em `modelos/agente/` refletido em `exemplo-agente/`; regra nova de agente passa pela ANATOMIA; nenhuma escrita em `agentes/` fora das rotas; sem reestruturar pastas sem pedir); como testar (`npm test`); como mudar o que a abertura pergunta (editar a skill, não a tela).
- [ ] **Step 2: verificar:** `claude -p "onde eu guardo a chave de um CRM do cliente?"` na raiz → resposta aponta o cadastro de plataformas; registrar no commit.
- [ ] **Step 3: commit** `CLAUDE.md da raiz: onde fica cada coisa e as regras de sessão`

### Task 7: `testes/conferir-organizacao.js`

**Files:**
- Create: `testes/conferir-organizacao.js` (`conferir({ ROOT }): { ok, problemas }`, script sai 1 com a lista)
- Test: `testes/unidade/conferir.test.js` (caso negativo: `agentes/zz-teste/.env` com `CHAVE="abc12345"` fora de bloco e `.gitignore` sem `.env` → `ok: false`; apaga no fim)

Checagens: (a) `git ls-files` sem `.env`, `*.pem`, `google-credentials.json`, `data/*.json` além dos dois exemplos; (b) nenhum arquivo rastreado com `(api[_-]?key|token|senha|password|secret)\s*[:=]\s*["'][^"']{8,}` fora de comentário; (c) toda pasta em `agentes/` e `exemplo-agente/` com os arquivos da anatomia e `.gitignore` contendo `.env`; (d) `http(s)://` fixo só em `avisos.js`, `modelos/agente/atendimento/server.js`, `index.html`, `*.md`, `docs/`, `modelos/skills/`; porta `4xxx` fixa só em `server.js`, `agente-base.js`, `js/contratar.js`, `js/app.js`; (e) em cada `.env` de agente, variável com prefixo de plataforma cadastrada só dentro do bloco; (f) `.claude/skills/criar-escritorio/SKILL.md` existe e tem frontmatter válido.

- [ ] **Step 1: teste negativo.** - [ ] **Step 2: ver falhar.** - [ ] **Step 3: implementar.** - [ ] **Step 4: rodar:** `ok` no repositório; unidade PASS.
- [ ] **Step 5: commit** `conferir-organizacao: segredos, anatomia, endereços, bloco e skill`

### Task 8: `testes/fumaca.js` e `npm test`

**Files:**
- Create: `testes/fumaca.js` (a partir do rascunho headless: sobe `server.js` em `PORT=4398` com `ESCRITORIO_DADOS` temporário copiado dos exemplos; asserções: título, cards, monitor, painéis extras, modal de plataformas, caixas do contratar, aviso "não foi aberto" quando não há config, Ajustes; derruba tudo; sai 1 em erro de JS ou asserção falsa)
- Modify: `package.json` (`"test": "node --test testes/unidade/ && node testes/conferir-organizacao.js && node testes/fumaca.js"`)

- [ ] **Step 1: escrever** (asserções, não `console.log`). - [ ] **Step 2: rodar:** as de Ajustes e aviso falham até a Tarefa 9; registrar.
- [ ] **Step 3: commit** `npm test: unidade, conferidor e fumaça`

### Task 9: `abertura.js` (módulo e CLI), aviso sem config e ⚙️ Ajustes

**Files:**
- Create: `abertura.js`, `js/ajustes.js`
- Modify: `server.js` (`/config.js` ganha `aberto: boolean`, `salas: n`; rota `GET /api/ajustes` com resumo sem segredos), `index.html` (`#btn-ajustes`, aviso `#sem-abertura`), `js/app.js` (mostra o aviso se `!ESCRITORIO.aberto`; botão), `css/style.css`, `data/config.exemplo.json` (nota: "o jeito normal de criar este arquivo é /criar-escritorio")
- Test: `testes/unidade/abertura.test.js` (`montarConfig`: empresa "Clínica X" → `nome` "Escritório da Clínica X"; setores vazios omitidos; reunião desligada; `validar` recusa empresa vazia; `gerarSenha()` tem 16+ caracteres e três classes; `aplicar` numa pasta temporária grava `config.json`, `avisos.json` sem a chave e `admin.json` com hash; `atual()` devolve sem segredos) e `testes/fumaca.js`

**Interfaces:**
- `init({ ROOT, DADOS, ADMIN, AVISOS, lerConfig })`; `atual()`, `validar(r)`, `montarConfig(r)`, `aplicar(r)`, `gerarSenha()`, `definirSenha(senha)`, `estadoClaude()` (reusa `claude auth status`), `exemplo('manter'|'demitir')`
- CLI: `node abertura.js atual | aplicar <respostas.json> | senha | claude | exemplo manter|demitir`
- `Respostas: { empresa, oQueFaz, dono, setores:[{nome,emoji?,desc?}], marca:{cor?, logo?, planta?} (nomes de arquivos já em data/marca/), avisos:{ntfy:{topico}, whatsapp:{fone}} , reuniao:{automatica,dias,hora,meta}, primeiroAgente?, manterExemplo }`

- [ ] **Step 1: testes de unidade.** - [ ] **Step 2: ver falhar.** - [ ] **Step 3: implementar `abertura.js`** e as rotas. - [ ] **Step 4: unidade PASS.**
- [ ] **Step 5: implementar** aviso sem config e `js/ajustes.js` (resumo, status do Claude com botão conectar, miniaturas de logo e planta, atalhos, instrução do `/criar-escritorio`); checagens no `testes/fumaca.js`.
- [ ] **Step 6: `npm test`** → PASS exceto Tarefas 10 a 12.
- [ ] **Step 7: commit** `abertura.js, aviso sem config e Ajustes com status do Claude`

### Task 10: `planta.js` (salas → grade)

**Files:**
- Create: `planta.js`, `testes/fixtures/salas-clinica.json` (7 salas: recepcao média, operacao média, reuniao pequena, diretoria pequena, 3 `sala` pequenas, vizinhanças), `testes/fixtures/salas-grande-demais.json` (12 grandes)
- Test: `testes/unidade/planta.test.js`

**Interfaces:**
- Entrada `salas.json`: `[{ id, nome, tipo, tamanho: 'pequena'|'media'|'grande', vizinhos: [ids] }]`
- `gerar(salas): { ok, planta?, motivo?, sugestao? }` — `planta`: `{ versao: 1, grade: {w:48,h:34}, salas: [{ id, nome, tipo, bx, by, bw, bh, x1, y1, x2, y2, porta: {x,y}, estacoes: [{x,y}] }], corredor: [{x1,y1,x2,y2}] }`
- `validar(planta): { ok, problemas }` (sem sobreposição; cada sala com porta no corredor; toda sala alcançável por busca em largura na grade; de 2 a 12 salas; estações dentro da sala)
- `capacidade(planta): number`
- Algoritmo: tamanhos em tiles (pequena 8×8, média 14×10, grande 20×12, com `sala` sempre 7×7); corredor horizontal central de 3 tiles; salas acima e abaixo, da esquerda para a direita, agrupadas por vizinhança quando dá; se não couber, devolve `motivo` e `sugestao` (quais juntar ou reduzir).
- CLI: `node planta.js gerar <salas.json>` (grava `data/planta.json` e imprime capacidade) | `validar` | `capacidade` | `remover`.

- [ ] **Step 1: testes:** fixture de 7 → `ok`, `validar` ok, capacidade 6+1+1+1+2 = 11 estações (operacao média 12? **valor fixo do spec:** operacao pequena 6, média 12, grande 18; diretoria 2; `sala` 1; os outros 0) → 12+2+3 = 17; fixture grande demais → `ok:false` com `sugestao`; planta sem porta (editada) → `validar` falha; `remover` apaga `data/planta.json`.
- [ ] **Step 2: ver falhar.** - [ ] **Step 3: implementar.** - [ ] **Step 4: PASS.**
- [ ] **Step 5: commit** `planta.js: salas da planta encaixadas na grade, com validação e capacidade`

### Task 11: o motor desenha a planta

**Files:**
- Modify: `server.js` (`GET /api/planta` devolve `data/planta.json` ou `{ padrao: true }`), `js/world.js` (`WORLD.carregar(planta)`: constrói `ROOMS`, grade, portas e corredor a partir do JSON; sem JSON, o layout de hoje), `js/furniture.js` (mobília por tipo de sala: `operacao` mesas em fileiras pelas `estacoes`; `reuniao` mesa grande; `recepcao` balcão; `descanso` sofá e jogos; `diretoria` as duas estações premium; `sala` uma mesa e uma cadeira), `js/app.js` (mesas dos agentes = estações de todas as salas, na ordem; capacidade; aviso quando agentes > estações; salas no painel Salas; boot espera `/api/planta`), `js/path.js` (usa a grade gerada; sem mudança se já lê de `WORLD`)
- Test: `testes/fumaca.js` com `data/planta.json` gerado da fixture: 7 salas no painel Salas, agentes com mesa, `__escritorio.visitar('reuniao')` termina na sala, zero erro de JS; e sem o arquivo, as 5 salas de hoje.

- [ ] **Step 1: checagens no fumaça.** - [ ] **Step 2: rodar e ver falhar.**
- [ ] **Step 3: implementar** `WORLD.carregar`, mobília por tipo, mesas dinâmicas, rota.
- [ ] **Step 4: `npm test`** → PASS nas duas condições (com e sem planta).
- [ ] **Step 5: commit** `O escritório desenha as salas de data/planta.json`

### Task 12: a skill `/criar-escritorio`

**Files:**
- Create: `.claude/skills/criar-escritorio/SKILL.md`, `.claude/skills/criar-escritorio/referencias/perguntas.md` (as dez, com o texto de cada pergunta, o que ler antes, o que gravar e por qual script), `.claude/skills/criar-escritorio/referencias/planta.md` (como interpretar a planta: tipos de sala, tamanho relativo, vizinhos, o JSON de `salas.json`, o que fazer quando não dá para ler), `.claude/skills/criar-escritorio/modelos/respostas-modelo.json`, `.claude/skills/criar-escritorio/modelos/salas-modelo.json`
- Modify: `CLAUDE.md` (aponta a skill), `README.md` (seção "Abrir um escritório novo": `claude` na pasta, `/criar-escritorio`)

Regras da skill (no SKILL.md): uma pergunta por mensagem; ler `node abertura.js atual` antes de perguntar e só perguntar o que falta ou o que a pessoa quer mudar; nunca pedir chave no chat (dizer onde colar); gravar só pelos scripts; na planta, ler o arquivo, propor as salas, confirmar, `node planta.js gerar`, subir o escritório e pedir para olhar; senha gerada e mostrada uma vez; no fim, resumo com nomes de arquivos, nunca valores; registrar em `data/abertura.log` o que foi feito.

- [ ] **Step 1: escrever a skill e as referências.**
- [ ] **Step 2: verificar à seco:** `node abertura.js aplicar .claude/skills/criar-escritorio/modelos/respostas-modelo.json` numa `ESCRITORIO_DADOS` temporária grava os arquivos; `node planta.js gerar .claude/skills/criar-escritorio/modelos/salas-modelo.json` gera; o conferidor (f) passa.
- [ ] **Step 3: verificar de verdade, uma vez:** numa cópia limpa do projeto, `claude` e `/criar-escritorio`, responder as dez perguntas com uma planta de teste; conferir os critérios 9 a 13 do spec; registrar o resultado (sem valores) em `docs/superpowers/verificacoes/2026-10-13-criar-escritorio.md`.
- [ ] **Step 4: commit** `/criar-escritorio: a abertura do escritório pelo Claude Code`

### Task 13: fechamento

- [ ] **Step 1:** `README.md` (Plataformas; Abrir um escritório novo; Planta; Testar; estrutura com os módulos e `testes/`, `docs/`, `.claude/skills/`); `modelos/ANATOMIA.md` e `CLAUDE.md` conferidos.
- [ ] **Step 2:** `npm test` → PASS; `git status` limpo; push.
- [ ] **Step 3: commit** `README: plataformas, abertura, planta e testes`
