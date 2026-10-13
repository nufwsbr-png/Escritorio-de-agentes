# Plataformas, organização e abertura — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** cadastro único de plataformas com permissão por agente entregue pelo `.env`, o escritório organizado e verificável por `npm test`, e um assistente de abertura que faz as perguntas de um escritório novo.

**Architecture:** três módulos novos no servidor Node sem dependências (`util.js`, `plataformas.js`, `abertura.js`) roteados por `server.js`; três arquivos novos na tela (`js/plataformas.js`, `js/abertura.js`, `js/ajustes.js`) usando o modal que já existe; o molde do agente ganha a leitura do bloco gerenciado; `testes/` com `node --test` para unidade, um conferidor de organização e o teste de fumaça headless.

**Tech Stack:** Node >= 18 (`node:test`, `node:assert`, `http`, `fs`), navegador puro, Chrome headless pelo protocolo DevTools (já usado no rascunho do teste de fumaça).

**Spec:** `docs/superpowers/specs/2026-10-13-plataformas-design.md`

## Global Constraints

- Nenhuma dependência npm. Node >= 18.
- Nenhum valor de variável de plataforma sai para quem não é administrador, nem para o log, nem para o chat.
- O bloco gerenciado do `.env` fica entre `# >>> plataformas do escritório (gerado; edite no escritório, não aqui) >>>` e `# <<< plataformas do escritório <<<`, no começo do arquivo, logo após o cabeçalho de comentários; o resto do arquivo é preservado byte a byte, inclusive o fim de linha.
- Só sistemas com `trilha` no registro e `pasta` existente recebem o bloco.
- Nomes de variável: `[A-Z][A-Z0-9_]*`; prefixo = id da plataforma em maiúsculas com `-` trocado por `_`.
- Nomes canônicos por tipo exatamente como na tabela do spec; só a primeira plataforma de cada tipo na lista de permissão os recebe.
- `PASTAS_AUTORIZADAS` só entra no bloco se houver plataforma tipo `pasta`; valor = caminhos das plataformas + caminhos manuais já presentes fora do bloco, separados por `;`, sem repetição.
- Verificação de administrador no servidor, pelo `soAdmin()` já existente, em toda rota de escrita e em toda leitura com valor.
- Textos em português do Brasil, no tom do resto da tela.

## Review Focus

1. `.env` do agente com CRLF e sem bloco: sincronizar deve inserir o bloco e manter o CRLF do resto (teste na Tarefa 2).
2. Plataforma removida enquanto um agente a tem: o agente perde as variáveis dela e `PLATAFORMAS_PERMITIDAS` encolhe (teste na Tarefa 2).
3. Dois agentes, um com a plataforma e outro sem: editar o valor muda só o primeiro (teste na Tarefa 2).
4. Variável com nome inválido ou id duplicado no cadastro: recusado com motivo em português, nada gravado (teste na Tarefa 2).
5. Abertura concluída sem logo, sem planta e sem avisos: grava só o que veio e o escritório sobe sem erro (teste na Tarefa 9).

---

### Task 1: `util.js` (slug e executável do Claude, sem repetição)

**Files:**
- Create: `util.js`
- Modify: `server.js:104` (slug), `server.js:576-581` (CLAUDE_BIN), `agentes.js:42-43`, `testador.js` (usa `dep.CLAUDE_BIN`, não muda), `modelos/agente/tarefa/rodar.js:24-28`, `modelos/agente/atendimento/server.js:54-58`, `modelos/agente/comum/agente-base.js`
- Test: `testes/unidade/util.test.js`

**Interfaces:**
- Produces: `slug(texto: string, max = 30): string` (NFD, sem acento, minúsculas, `[^a-z0-9]+` → `-`, sem `-` nas pontas, cortado em `max`); `acharClaude(): string` (procura `~/.local/bin/claude(.exe)`, senão `claude.exe`/`claude`); `lerEnvArquivo(caminho): Map<string,string>` (mesma regra do `carregarEnv` do molde, sem tocar em `process.env`).
- O molde do agente não pode depender do escritório: `agente-base.js` ganha `acharClaude` próprio (uma cópia, documentada como cópia do `util.js` do escritório) e `rodar.js` e o `server.js` do atendente passam a usar `base.acharClaude()`.

- [ ] **Step 1: escrever o teste**

```js
// testes/unidade/util.test.js
const test = require('node:test'); const assert = require('node:assert');
const { slug, lerEnvArquivo, acharClaude } = require('../../util');
test('slug tira acento e limita', () => { assert.equal(slug('Tati Teste'), 'tati-teste'); assert.equal(slug('Recepção & Caixa', 10), 'recepcao-c'); assert.equal(slug('---'), ''); });
test('lerEnvArquivo lê aspas e ignora comentário', () => { /* grava um .env temporário com A="1 2", #B=3, C=x e confere Map {A:'1 2', C:'x'} */ });
test('acharClaude devolve string não vazia', () => { assert.ok(acharClaude().length > 0); });
```

- [ ] **Step 2: rodar e ver falhar:** `node --test testes/unidade/` → FAIL (módulo não existe)
- [ ] **Step 3: criar `util.js`** com as três funções; trocar as cópias em `server.js` e `agentes.js` por `require('./util')`; em `agente-base.js` exportar `acharClaude`; `rodar.js` e o server do atendente usam `base.acharClaude()`.
- [ ] **Step 4: rodar:** `node --test testes/unidade/` → PASS; `node --check server.js agentes.js modelos/agente/tarefa/rodar.js modelos/agente/atendimento/server.js modelos/agente/comum/agente-base.js` → sem erro.
- [ ] **Step 5: commit** `git commit -m "util.js: slug, acharClaude e lerEnvArquivo sem repetição"`

### Task 2: `plataformas.js` (cadastro, bloco do `.env`, sincronização)

**Files:**
- Create: `plataformas.js`
- Test: `testes/unidade/plataformas.test.js` (usa uma pasta temporária como `ROOT`, com `data/` e um registro falso)

**Interfaces:**
- `init({ ROOT, lerRegistro, lerRegistroBruto, gravarRegistro })`
- `TIPOS: { api: ['URL','TOKEN'], planilha: ['SHEETS_ID','GOOGLE_CREDENCIAIS_JSON'], agenda: ['CALENDAR_ID','GOOGLE_CREDENCIAIS_JSON'], pasta: ['PASTA'], whatsapp: ['API_URL','API_CHAVE','SESSAO'], email: ['USUARIO','SENHA_APP','PASTA'], banco: ['URL','CHAVE'], navegador: ['URL','PERFIL'], link: ['URL'] }` e `CANONICOS` por tipo conforme o spec (`GOOGLE_CREDENCIAIS_JSON` é canônico sem prefixo nos tipos planilha e agenda).
- `listar(comValores = false): Plataforma[]` (sem valores: `variaveis` vira lista de nomes; inclui `usadaPor: string[]`)
- `obter(id, comValores = false): Plataforma | null`
- `salvar(dados): { ok, plataforma?, motivo? }` (cria se não tem `id`; id = `slug(nome)`, único; valida tipo, nomes de variáveis; `atualizadaEm`)
- `remover(id): { ok, usadaPor, motivo? }` (tira dos sistemas e sincroniza)
- `blocoEnvPara(ids: string[], manuaisPastas: string[] = []): string` (texto do bloco, LF; vazio → bloco só com `PLATAFORMAS_PERMITIDAS=""`)
- `sincronizarAgente(idSistema): { ok, motivo?, variaveis: string[] }` (só nomes)
- `sincronizarTodos(): { sincronizados: string[], pulados: string[] }`
- `definirDoAgente(idSistema, ids: string[]): { ok, motivo? }` (grava `plataformas` no registro bruto e sincroniza)
- `usadaPor(idPlataforma): string[]`
- Regra interna `aplicarBloco(textoEnv, bloco): string` (exportada para teste): remove bloco antigo se houver, insere o novo após o cabeçalho (linhas iniciais que começam com `#` ou vazias), preserva `\r\n` se o arquivo usa.

- [ ] **Step 1: escrever os testes** (um `test()` por item):
  - `salvar` cria com id `ophir`, recusa nome de variável `token` (minúsculo) e tipo `xyz`;
  - `blocoEnvPara(['ophir'])` contém `OPHIR_TOKEN="..."` e `SISTEMA_API_TOKEN="..."` e `PLATAFORMAS_PERMITIDAS="ophir"`, não contém `PASTAS_AUTORIZADAS`;
  - `blocoEnvPara(['drive','ophir'], ['C:\\manual'])` contém `PASTAS_AUTORIZADAS="C:\\x;C:\\manual"` e `PASTA_ENTRADA="C:\\x"`;
  - dois do tipo `api`: só o primeiro tem `SISTEMA_API_URL`;
  - `aplicarBloco` em `.env` CRLF sem bloco → bloco após cabeçalho, resto idêntico, CRLF mantido; em `.env` com bloco antigo → substitui, resto idêntico byte a byte;
  - `sincronizarAgente` pula sistema sem `trilha`; cria `.env` se não existe em sistema com `trilha`;
  - editar o valor de `OPHIR_TOKEN` e `sincronizarTodos` → muda o `.env` do agente A (tem), não o do B (não tem);
  - `remover('ophir')` → `usadaPor` lista A, `.env` de A sem `OPHIR_`, `PLATAFORMAS_PERMITIDAS=""`.
- [ ] **Step 2: rodar e ver falhar:** `node --test testes/unidade/plataformas.test.js` → FAIL
- [ ] **Step 3: implementar `plataformas.js`** (arquivo `data/plataformas.json` = lista; escapes de `"` com `\"`; `PASTAS_AUTORIZADAS` manual lido com `lerEnvArquivo` sobre o texto fora do bloco).
- [ ] **Step 4: rodar:** `node --test testes/unidade/` → PASS
- [ ] **Step 5: commit** `git commit -m "plataformas.js: cadastro único, bloco do .env e sincronização"`

### Task 3: rotas da API e contratação com plataformas

**Files:**
- Modify: `server.js` (bloco de rotas `/api/`, após `/api/setores`; `/api/contratar` passa `plataformas`), `agentes.js` (`criarAgente` recebe `plataformas` e grava no item; depois de criar a pasta chama `dep.plataformas.sincronizarAgente(id)`), `.gitignore` (já cobre `data/*.json`; conferir)
- Test: `testes/api/plataformas.api.test.js` (sobe `server.js` com `PORT=4397` e `ROOT` temporário via variável `ESCRITORIO_ROOT`? **Decisão:** não existe hoje; o teste usa a pasta real com `data/` de teste copiada para `data-teste/` e `ROOT` apontando por `process.env.ESCRITORIO_DADOS`. Se isso exigir mexer em `server.js` além de uma linha, o teste de API vira parte do teste de fumaça (Tarefa 8) e esta tarefa testa só por `curl` manual registrado no commit.)

**Interfaces:**
- Consumes: `PLATAFORMAS` (Tarefa 2), `soAdmin()`.
- Produces: rotas da tabela do spec §6; `POST /api/contratar` aceita `plataformas: string[]`; a resposta de contratar inclui `plataformas`.

- [ ] **Step 1: escrever o teste de API** (sem sessão: `GET /api/plataformas` não contém `"valor"` nem o token; `POST` → 403 com `precisaAdmin`; com `/api/admin/entrar`: `POST` cria, `PUT` edita, `PUT /api/agentes/exemplo/plataformas` grava e o `.env` do exemplo ganha o bloco, `DELETE` remove).
- [ ] **Step 2: rodar e ver falhar.**
- [ ] **Step 3: implementar** as rotas; `agentes.js` recebe `plataformas` em `init` e chama a sincronização ao criar.
- [ ] **Step 4: rodar:** PASS; `node --check server.js`.
- [ ] **Step 5: commit** `git commit -m "API de plataformas e permissão por agente na contratação"`

### Task 4: tela — modal Plataformas, caixas no Contratar, painel no monitor

**Files:**
- Create: `js/plataformas.js` (`PLATAFORMAS_UI.abrir()`, `PLATAFORMAS_UI.caixas(selecionadas): string` para o Contratar, `PLATAFORMAS_UI.painelDoAgente(id)`)
- Modify: `index.html` (botão `#btn-plataformas` ao lado de `#btn-avisos`; botão `#mon-plataformas` no monitor; `<script src="js/plataformas.js">`), `js/contratar.js` (passo 2: caixas; `corpoReq.plataformas`), `js/extras.js` (`abrir(id,'plataformas')`), `js/app.js` (ligar os dois botões), `css/style.css` (lista de plataformas, campo de senha com "mostrar")
- Test: `testes/fumaca.js` (Tarefa 8) ganha: abrir o modal, contar itens, abrir o painel no monitor, ver as caixas no passo 2.

- [ ] **Step 1: acrescentar ao rascunho do teste de fumaça** as três checagens (ficam vermelhas até a Tarefa 8 existir; registrar que a verificação completa é na Tarefa 8).
- [ ] **Step 2: implementar** a tela. Ícones por tipo: api 🔗, planilha 📊, agenda 📅, pasta 📁, whatsapp 💬, email ✉️, banco 🗄️, navegador 🌐, link 🔖. Valores em `<input type="password">` com botão "mostrar"; só renderizados se `ADMIN.ehAdmin()`.
- [ ] **Step 3: verificar à mão** no navegador (admin: cadastrar, editar, remover; sem admin: sem valores) e registrar no commit.
- [ ] **Step 4: commit** `git commit -m "Tela de plataformas: modal, contratação e painel do agente"`

### Task 5: o agente lê o bloco (molde, ANATOMIA, exemplo)

**Files:**
- Modify: `modelos/agente/comum/tools/base.js` (`plataformasPermitidas(): string[]`, `exigePlataforma(id): boolean`), `modelos/agente/comum/CLAUDE.md` (linha na tabela de arquivos e regra "plataformas só pelo escritório"), `modelos/ANATOMIA.md` (componentes 8 e 9), `modelos/agente/tarefa/env` e `modelos/agente/atendimento/env` (comentário: "o bloco do escritório entra aqui em cima; não edite"), `modelos/agente/tarefa/server.js` e `modelos/agente/atendimento/server.js` (o painel mostra `PLATAFORMAS_PERMITIDAS` como "plataformas que este agente usa"), `exemplo-agente/` (mesmas mudanças, por cópia), `README.md` (seção nova "Plataformas")
- Test: `testes/unidade/tools-base.test.js` (com `PLATAFORMAS_PERMITIDAS="ophir;drive"` no ambiente: `exigePlataforma('ophir')` true, `exigePlataforma('crm')` false; sem a variável: lista vazia)

- [ ] **Step 1: escrever o teste** (carrega `modelos/agente/comum/tools/base.js` com `process.env` ajustado).
- [ ] **Step 2: rodar e ver falhar.**
- [ ] **Step 3: implementar** e propagar ao `exemplo-agente/` (copiar os arquivos de molde alterados, mantendo os já personalizados do exemplo).
- [ ] **Step 4: rodar:** PASS.
- [ ] **Step 5: commit** `git commit -m "Agente só enxerga as plataformas permitidas: tools/base, contrato, anatomia"`

### Task 6: `CLAUDE.md` da raiz do escritório

**Files:**
- Create: `CLAUDE.md`
- Test: verificação manual (uma sessão `claude -p "onde eu guardo a chave de um CRM do cliente?"` na raiz responde "no cadastro de plataformas, botão 🔌, nunca em arquivo de código"); registrar a resposta no commit.

- [ ] **Step 1: escrever** o `CLAUDE.md` com: o que é o projeto em 5 linhas; o mapa "onde fica cada coisa" (tabela: coisa → lugar → quem escreve); as regras de sessão do spec ("Trabalho irmão" item 1); o roteiro das 10 perguntas da abertura para "criar o escritório do cliente X"; como testar (`npm test`); o que nunca fazer (segredo fora de `.env`/`data/`, escrever em `agentes/` fora das rotas, reestruturar pastas sem pedir).
- [ ] **Step 2: rodar** a verificação manual acima.
- [ ] **Step 3: commit** `git commit -m "CLAUDE.md da raiz: onde fica cada coisa e as regras de sessão"`

### Task 7: `testes/conferir-organizacao.js`

**Files:**
- Create: `testes/conferir-organizacao.js`
- Test: ele mesmo, mais um caso negativo: `testes/unidade/conferir.test.js` cria `agentes/zz-teste/.env` com `CHAVE="abc123"` fora de bloco e `.gitignore` sem `.env`, chama o conferidor como função e espera `ok: false` com o motivo; apaga a pasta no fim.

**Interfaces:**
- `conferir({ ROOT }): { ok, problemas: string[] }` exportada; executado como script sai com código 1 e lista os problemas.
- Checagens: (a) `git ls-files` não contém `.env`, `*.pem`, `google-credentials.json`, nem `data/*.json` além dos dois exemplos; (b) nenhum arquivo rastreado tem padrão `(api[_-]?key|token|senha|password|secret)\s*[:=]\s*["'][^"']{8,}` fora de comentário; (c) toda pasta em `agentes/` e `exemplo-agente/` tem `CLAUDE.md`, `ANATOMIA.md`, `prompt-agente.md`, `skills/constituicao.md`, `tools/base.js`, `memoria/licoes.md`, `progresso-do-agente.md`, `server.js`, `.gitignore` com `.env`; (d) `http://` ou `https://` fixo só nos arquivos permitidos (`avisos.js`, `modelos/agente/atendimento/server.js`, `index.html` fontes, `README.md`, `docs/`, `modelos/skills/`, `*.md`); porta de 4 dígitos começando com 4 fixa só em `server.js` (padrão), `agente-base.js` (padrão) e `js/contratar.js`/`js/app.js` (sugestão); (e) em cada `.env` de agente, variável com prefixo de plataforma cadastrada só dentro do bloco.

- [ ] **Step 1: escrever o teste negativo.**
- [ ] **Step 2: rodar e ver falhar.**
- [ ] **Step 3: implementar** o conferidor.
- [ ] **Step 4: rodar:** `node testes/conferir-organizacao.js` → `ok` no repositório; `node --test testes/unidade/` → PASS.
- [ ] **Step 5: commit** `git commit -m "conferir-organizacao: segredos, anatomia, endereços e bloco de plataformas"`

### Task 8: `testes/fumaca.js` e `npm test`

**Files:**
- Create: `testes/fumaca.js` (a partir do rascunho do Chrome headless: sobe `server.js` em `PORT=4398` com `data` de teste em pasta temporária copiada dos exemplos, abre a tela, confere título, cards, monitor, painéis extras, modal de plataformas, caixas do contratar, assistente de abertura quando não há config; derruba tudo no fim; sai 1 se houver erro de JS ou checagem falsa)
- Modify: `package.json` (`"test": "node --test testes/unidade/ && node testes/conferir-organizacao.js && node testes/fumaca.js"`), `README.md` (seção "Testar")

- [ ] **Step 1: escrever o teste** (as checagens são asserções, não `console.log`).
- [ ] **Step 2: rodar:** `npm test` → as checagens de abertura falham (Tarefa 9 ainda não existe): registrar e seguir.
- [ ] **Step 3: commit** `git commit -m "npm test: unidade, conferidor e fumaça da tela"`

### Task 9: abertura do escritório e Ajustes

**Files:**
- Create: `abertura.js` (servidor), `js/abertura.js`, `js/ajustes.js`
- Modify: `server.js` (rotas `/api/abertura` GET/POST, `/config.js` com `abertura`, `/api/admin/senha` reaproveitado; upload base64 → `data/marca/logo.<ext>`, `data/marca/planta.<ext>`, extensões `png|jpg|jpeg|svg|webp|pdf`, 5 MB), `index.html` (`#btn-ajustes`, `<script>`s), `js/app.js` (abrir o assistente no boot se `ESCRITORIO.abertura`; ligar o botão), `css/style.css`, `data/config.exemplo.json` (comentário sobre a abertura), `README.md` (seção "Abrir um escritório novo" substitui parte do roteiro de instalação)
- Test: `testes/unidade/abertura.test.js` (`montarConfig(respostas)` puro: empresa "Clínica X" → `nome` "Escritório da Clínica X"; setores vazios → omite; reunião desligada → `automatica:false`; `validar(respostas)` recusa senha < 6 e empresa vazia) e `testes/fumaca.js` (assistente aparece sem config; concluir com o mínimo grava os arquivos; com config não aparece; Ajustes mostra o status do Claude igual a `/api/claude`)

**Interfaces:**
- `abertura.js`: `init({ ROOT, lerConfig, ADMIN, AVISOS, PLATAFORMAS, lerRegistroBruto, gravarRegistro })`; `atual(): Respostas` (sem segredos); `validar(r): string[]`; `montarConfig(r): Config`; `aplicar(r): { ok, gravados: string[], motivos? }`.
- Respostas: `{ empresa, oQueFaz, dono, setores: [{nome, emoji?, desc?}], plataformas: [{nome, tipo, url}], marca: { cor?, logo?: {nome, base64}, planta?: {nome, base64} }, senhaAdmin?, avisos?: {...formato do AVISOS.configurar}, reuniao: { automatica, dias, hora, meta }, primeiroAgente?: { setor, plataformas, dor }, manterExemplo: boolean }`.
- Tela: `ABERTURA.abrir(valoresAtuais)` com os 10 passos do spec, "pular" nos opcionais, resumo final, `POST /api/abertura`; ao terminar, se `primeiroAgente`, chama `CONTRATAR.abrir()` com os campos preenchidos. `AJUSTES.abrir()` com resumo, status do Claude (`/api/claude`, botão conectar reaproveitando o fluxo de `conversa.js`), miniaturas, atalhos e "Refazer abertura" (`ADMIN.exigir`).

- [ ] **Step 1: escrever os testes de unidade** de `montarConfig` e `validar`.
- [ ] **Step 2: rodar e ver falhar.**
- [ ] **Step 3: implementar `abertura.js`** e as rotas.
- [ ] **Step 4: rodar:** unidade PASS.
- [ ] **Step 5: implementar a tela** (`js/abertura.js`, `js/ajustes.js`, botão, CSS) e as checagens no `testes/fumaca.js`.
- [ ] **Step 6: rodar:** `npm test` → PASS completo.
- [ ] **Step 7: commit** `git commit -m "Abertura do escritório: assistente, Refazer abertura e Ajustes com status do Claude"`

### Task 10: fechamento

- [ ] **Step 1:** `README.md`: seções Plataformas, Abrir um escritório novo, Testar; estrutura atualizada (`util.js`, `plataformas.js`, `abertura.js`, `testes/`, `docs/`).
- [ ] **Step 2:** `npm test` → PASS; `git status` limpo; push.
- [ ] **Step 3: commit** `git commit -m "README: plataformas, abertura e testes"`
