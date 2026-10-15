/* ===========================================================
   plataformas.js — o cadastro único das plataformas do negócio

   Um CRM, uma planilha, uma agenda, uma pasta, um WhatsApp, um e-mail: cada
   plataforma é cadastrada UMA vez aqui (data/plataformas.json, fora do git),
   com endereço e variáveis de conexão. Cada agente só recebe as que foram
   marcadas para ele: o escritório grava no .env do agente um bloco
   delimitado só com essas variáveis. Sem credencial, não há acesso.

   Regras (ver docs/superpowers/specs/2026-10-13-plataformas-design.md):
   - só sistemas que o escritório criou (têm trilha) recebem o bloco;
   - o bloco fica no começo do .env, após o cabeçalho; o resto é preservado;
   - cada variável entra prefixada (OPHIR_TOKEN) e com o nome canônico do
     tipo (SISTEMA_API_TOKEN), só para a primeira plataforma de cada tipo;
   - PASTAS_AUTORIZADAS soma as pastas das plataformas com as manuais.
   - cada plataforma tem um TESTE de conexão por tipo (testar): o resultado
     (conectada, sem chave, falhou, desligada) fica gravado nela, sem o valor.
   Também é linha de comando: node plataformas.js listar | criar <lista.json> | sincronizar | testar [id]
   =========================================================== */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const tls = require('tls');
const crypto = require('crypto');
const { spawn } = require('child_process');
const UTIL = require('./util');
const { slug, lerEnvArquivo, rodarCli } = UTIL;

let dep = null;   // { ROOT, DADOS, lerRegistro, lerRegistroBruto, gravarRegistro }
const ARQ = () => path.join(dep.DADOS || path.join(dep.ROOT, 'data'), 'plataformas.json');

const INICIO = '# >>> plataformas do escritório (gerado; edite no escritório, não aqui) >>>';
const FIM = '# <<< plataformas do escritório <<<';

/* sufixos sugeridos ao cadastrar (prefixo <ID>_) e os nomes canônicos do tipo,
   na mesma ordem. Sufixo que já é um nome canônico global (GOOGLE_CREDENCIAIS_JSON)
   entra sem prefixo. */
const TIPOS = {
  api:       { nome: 'Sistema com API (CRM, ERP…)', emoji: '🔗', sufixos: ['URL', 'TOKEN'],                 canonicos: ['SISTEMA_API_URL', 'SISTEMA_API_TOKEN'] },
  planilha:  { nome: 'Planilha (Google Sheets)',    emoji: '📊', sufixos: ['SHEETS_ID', 'GOOGLE_CREDENCIAIS_JSON'], canonicos: ['GOOGLE_SHEETS_ID', 'GOOGLE_CREDENCIAIS_JSON'] },
  agenda:    { nome: 'Agenda (Google Calendar)',    emoji: '📅', sufixos: ['CALENDAR_ID', 'GOOGLE_CREDENCIAIS_JSON'], canonicos: ['GOOGLE_CALENDAR_ID', 'GOOGLE_CREDENCIAIS_JSON'] },
  pasta:     { nome: 'Pasta (OneDrive, Drive, rede)', emoji: '📁', sufixos: ['PASTA'],                     canonicos: ['PASTA_ENTRADA'] },
  whatsapp:  { nome: 'WhatsApp (API)',              emoji: '💬', sufixos: ['API_URL', 'API_CHAVE', 'SESSAO'], canonicos: ['WHATSAPP_API_URL', 'WHATSAPP_API_CHAVE', 'WHATSAPP_SESSAO'] },
  email:     { nome: 'E-mail',                      emoji: '✉️', sufixos: ['USUARIO', 'SENHA_APP', 'PASTA'], canonicos: ['EMAIL_USUARIO', 'EMAIL_SENHA_APP', 'EMAIL_PASTA'] },
  banco:     { nome: 'Banco de dados',              emoji: '🗄️', sufixos: ['URL', 'CHAVE'],                 canonicos: ['BANCO_URL', 'BANCO_CHAVE'] },
  navegador: { nome: 'Sistema pelo navegador',      emoji: '🌐', sufixos: ['URL', 'PERFIL'],                canonicos: ['SISTEMA_URL', 'NAVEGADOR_PERFIL'] },
  link:      { nome: 'Site ou link',                emoji: '🔖', sufixos: ['URL'],                          canonicos: [] },
  // servidor MCP: COMANDO (local, ex.: npx -y @modelcontextprotocol/server-filesystem C:/pasta) OU URL (remoto); TOKEN vira
  // Authorization Bearer no remoto e variável de ambiente no local. Vai para o mcp.json do agente com ${VAR}, nunca com valor.
  mcp:       { nome: 'Servidor MCP (ferramentas do Claude Code)', emoji: '🧩', sufixos: ['COMANDO', 'URL', 'TOKEN'], canonicos: [] }
};
const MCP_ARQ = 'mcp.json';
const MCP_LEIA = 'gerado pelo escritório a partir das plataformas do tipo mcp marcadas para este agente; ${VAR} é expandido pelo lançador a partir do .env na hora da chamada. Não edite: marque em 🔌 Plataformas.';
const SEM_PREFIXO = new Set(['GOOGLE_CREDENCIAIS_JSON']);
const NOME_VAR = /^[A-Z][A-Z0-9_]*$/;
const prefixoDe = (id) => String(id).toUpperCase().replace(/-/g, '_') + '_';

/* ---------------- arquivo ---------------- */
function lerTodas() {
  try { const j = JSON.parse(fs.readFileSync(ARQ(), 'utf8')); return Array.isArray(j) ? j : []; } catch (e) { return []; }
}
function gravarTodas(lista) {
  fs.mkdirSync(path.dirname(ARQ()), { recursive: true });
  fs.writeFileSync(ARQ(), JSON.stringify(lista, null, 2) + '\n');
}
const semValores = (p) => ({ ...p, variaveis: Object.keys(p.variaveis || {}), porAgente: Object.keys(p.porAgente || {}), usadaPor: usadaPor(p.id), teste: p.teste || null });

/** variáveis sugeridas para um tipo, já com o prefixo do id e valores vazios */
function variaveisSugeridas(id, tipo) {
  const t = TIPOS[tipo]; if (!t) return {};
  const out = {};
  for (const s of t.sufixos) out[SEM_PREFIXO.has(s) ? s : prefixoDe(id) + s] = '';
  return out;
}

/* ---------------- cadastro ---------------- */
function listar(comValores = false) {
  const todas = lerTodas();
  return comValores ? todas.map(p => ({ ...p, usadaPor: usadaPor(p.id) })) : todas.map(semValores);
}
function obter(id, comValores = false) {
  const p = lerTodas().find(x => x.id === id);
  if (!p) return null;
  return comValores ? { ...p, usadaPor: usadaPor(id) } : semValores(p);
}

function salvar(dados) {
  const d = dados || {};
  const nome = String(d.nome || '').trim().slice(0, 60);
  if (!nome) return { ok: false, motivo: 'dê um nome à plataforma' };
  const tipo = String(d.tipo || '').trim();
  if (!TIPOS[tipo]) return { ok: false, motivo: 'tipo desconhecido: ' + tipo + ' (use ' + Object.keys(TIPOS).join(', ') + ')' };
  const todas = lerTodas();
  let id = d.id ? String(d.id) : '';
  const existente = id ? todas.find(p => p.id === id) : null;
  if (id && !existente && !/^[a-z0-9][a-z0-9-]*$/.test(id)) return { ok: false, motivo: 'id inválido: ' + id };
  if (!id) { id = slug(nome) || 'plataforma'; let n = 2; const base = id; while (todas.some(p => p.id === id)) id = base + '-' + n++; }
  const variaveis = {};
  const entrada = d.variaveis && typeof d.variaveis === 'object' ? d.variaveis : (existente ? existente.variaveis : variaveisSugeridas(id, tipo));
  for (const [k, v] of Object.entries(entrada)) {
    const nomeVar = String(k).trim();
    if (!NOME_VAR.test(nomeVar)) return { ok: false, motivo: 'nome de variável inválido: ' + nomeVar + ' (só MAIÚSCULAS, números e _)' };
    const valor = v == null ? '' : String(v);
    if (/[\r\n]/.test(valor)) return { ok: false, motivo: 'o valor de ' + nomeVar + ' tem quebra de linha; cole em uma linha só (JSON de credencial: minificado)' };
    variaveis[nomeVar] = valor;
  }
  const agora = new Date().toISOString();
  const plataforma = {
    id, nome, tipo, url: String(d.url || '').trim().slice(0, 300), variaveis,
    notas: String(d.notas || '').trim().slice(0, 500),
    criadaEm: existente ? existente.criadaEm : agora, atualizadaEm: agora
  };
  // valores por agente (ex.: o token de cada agente no CRM): a tela não mexe neles; quem grava é definirPorAgente
  if (existente && existente.porAgente) plataforma.porAgente = existente.porAgente;
  // o último teste fica até o próximo (quem salva pela tela testa logo em seguida)
  if (existente && existente.teste) plataforma.teste = existente.teste;
  if (existente) todas[todas.indexOf(existente)] = plataforma; else todas.push(plataforma);
  gravarTodas(todas);
  const sinc = existente ? sincronizarQuemTem(id) : [];
  return { ok: true, plataforma: semValores(plataforma), sincronizados: sinc };
}

function remover(id) {
  const todas = lerTodas();
  const p = todas.find(x => x.id === id);
  if (!p) return { ok: false, motivo: 'plataforma não encontrada: ' + id };
  const quem = usadaPor(id);
  gravarTodas(todas.filter(x => x.id !== id));
  const bruto = dep.lerRegistroBruto();
  for (const sid of quem) {
    if (bruto[sid]) bruto[sid].plataformas = (bruto[sid].plataformas || []).filter(x => x !== id);
  }
  dep.gravarRegistro(bruto);
  for (const sid of quem) sincronizarAgente(sid);
  return { ok: true, usadaPor: quem };
}

/** cria várias de uma vez com as variáveis sugeridas vazias (a skill /criar-escritorio usa) */
function criarLista(lista) {
  if (!Array.isArray(lista)) return { ok: false, motivo: 'esperava uma lista [{ nome, tipo, url }]' };
  const criadas = [], erros = [];
  for (const item of lista) {
    const r = salvar({ nome: item.nome, tipo: item.tipo, url: item.url, notas: item.notas });
    if (r.ok) criadas.push(r.plataforma.id); else erros.push((item.nome || '?') + ': ' + r.motivo);
  }
  return { ok: erros.length === 0, criadas, erros };
}

function usadaPor(idPlataforma) {
  const reg = dep.lerRegistro();
  return Object.entries(reg).filter(([, s]) => Array.isArray(s.plataformas) && s.plataformas.includes(idPlataforma)).map(([id]) => id);
}

/* ---------------- o bloco do .env ---------------- */
/* aspas externas só: carregarEnv do agente tira as externas e mantém o resto como está */
const aspas = (v) => '"' + String(v == null ? '' : v) + '"';

/**
 * blocoEnvPara(['drive','ophir'], ['C:\\manual']) → texto do bloco (LF).
 * A primeira plataforma de cada tipo recebe também os nomes canônicos.
 */
function blocoEnvPara(ids, manuaisPastas = [], agenteId = '') {
  const todas = lerTodas();
  // uma plataforma pode ter valores só para um agente (porAgente[id]); eles vencem os valores comuns no .env daquele agente
  const permitidas = (ids || []).map(id => todas.find(p => p.id === id)).filter(Boolean)
    .map(p => (agenteId && p.porAgente && p.porAgente[agenteId]) ? { ...p, variaveis: { ...(p.variaveis || {}), ...p.porAgente[agenteId] } } : p);
  const linhas = [INICIO];
  const tiposVistos = new Set();
  const pastas = [];
  // um nome pode vir de duas plataformas (GOOGLE_CREDENCIAIS_JSON na planilha e na agenda):
  // o último valor NÃO vazio vence, e o bloco avisa quando divergem
  const vistos = new Map();   // nome -> { valor, de, linha }
  const avisos = [];
  const poe = (k, v, de) => {
    const atual = vistos.get(k);
    if (!atual) { vistos.set(k, { valor: v, de, linha: linhas.length }); linhas.push(k + '=' + aspas(v)); return; }
    if (v && atual.valor && v !== atual.valor) avisos.push('# aviso: ' + k + ' difere entre ' + atual.de + ' e ' + de + '; vale o de ' + de);
    if (v) { atual.valor = v; atual.de = de; linhas[atual.linha] = k + '=' + aspas(v); }
  };
  for (const p of permitidas) {
    const t = TIPOS[p.tipo] || { sufixos: [], canonicos: [] };
    const primeiraDoTipo = !tiposVistos.has(p.tipo);
    tiposVistos.add(p.tipo);
    linhas.push('# ' + p.nome + (p.url ? ' — ' + p.url : '') + ' (' + p.tipo + (primeiraDoTipo ? '' : '; segunda do tipo: só os nomes prefixados') + ')');
    const pref = prefixoDe(p.id);
    for (const [k, v] of Object.entries(p.variaveis || {})) {
      poe(k, v, p.nome);
      if (primeiraDoTipo) {
        const idx = t.sufixos.findIndex(s => k === (SEM_PREFIXO.has(s) ? s : pref + s));
        const canonico = idx >= 0 ? t.canonicos[idx] : null;
        if (canonico && canonico !== k) poe(canonico, v, p.nome);
      }
      if (p.tipo === 'pasta' && k === pref + 'PASTA' && v) pastas.push(String(v));
    }
  }
  linhas.push(...avisos);
  if (pastas.length) {
    const todasPastas = [...new Set([...pastas, ...manuaisPastas.map(String).filter(Boolean)])];
    linhas.push('PASTAS_AUTORIZADAS=' + aspas(todasPastas.join(';')));
  }
  linhas.push('PLATAFORMAS_PERMITIDAS=' + aspas(permitidas.map(p => p.id).join(';')));
  linhas.push(FIM);
  return linhas.join('\n') + '\n';
}

/** devolve [textoSemBloco, blocoAntigo|null] */
function separarBloco(texto) {
  const i = texto.indexOf(INICIO);
  if (i < 0) return [texto, null];
  const j = texto.indexOf(FIM, i);
  if (j < 0) throw new Error('bloco de plataformas corrompido no .env: há a linha de início e falta a de fim (' + FIM + ')');
  let fim = j + FIM.length;
  if (texto[fim] === '\r') fim++;
  if (texto[fim] === '\n') fim++;
  return [texto.slice(0, i) + texto.slice(fim), texto.slice(i, fim)];
}

/** insere/substitui o bloco após o cabeçalho de comentários, respeitando o fim de linha do arquivo */
function aplicarBloco(textoEnv, bloco) {
  const crlf = /\r\n/.test(textoEnv) || (!textoEnv.includes('\n') && process.platform === 'win32');
  const nl = crlf ? '\r\n' : '\n';
  const [sem] = separarBloco(textoEnv || '');
  const linhas = sem.split(/\r?\n/);
  // o cabeçalho é o bloco de comentários CONTÍGUO no topo; o primeiro branco encerra
  let i = 0;
  while (i < linhas.length && linhas[i].trim().startsWith('#')) i++;
  const cabeca = linhas.slice(0, i);
  let resto = linhas.slice(i);
  // os brancos que separavam o cabeçalho do resto são recriados em volta do bloco; nada mais muda
  let brancos = 0; while (brancos < resto.length && resto[brancos].trim() === '') brancos++;
  resto = resto.slice(brancos);
  const blocoLinhas = bloco.replace(/\r?\n$/, '').split('\n');
  const saida = [...cabeca, ...(cabeca.length ? [''] : []), ...blocoLinhas, '', ...resto];
  let txt = saida.join(nl);
  if (!txt.endsWith(nl)) txt += nl;
  return txt;
}

/** pastas digitadas à mão em PASTAS_AUTORIZADAS fora do bloco */
function manuaisDe(textoEnv) {
  const [sem] = separarBloco(textoEnv || '');
  const m = /^\s*PASTAS_AUTORIZADAS\s*=\s*(.*)$/m.exec(sem);
  if (!m) return [];
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v.split(';').map(s => s.trim()).filter(Boolean);
}

/* ---------------- sincronização ---------------- */
/* ---------------- MCP: o mcp.json do agente, com ${VAR} no lugar dos valores ---------------- */
/** a configuração de servidores MCP das plataformas `mcp` permitidas: sem valor nenhum, só ${PREFIXO_VAR} do bloco do .env */
function mcpConfigPara(ids) {
  const todas = lerTodas();
  const servidores = {}, avisos = [];
  for (const id of ids || []) {
    const p = todas.find(x => x.id === id);
    if (!p || p.tipo !== 'mcp') continue;
    const pref = prefixoDe(p.id), vars = p.variaveis || {};
    const tem = (s) => String(vars[pref + s] || '').trim() !== '';
    const ref = (s) => '${' + pref + s + '}';
    if (tem('URL')) {
      servidores[p.id] = { type: 'http', url: ref('URL'), ...(tem('TOKEN') ? { headers: { Authorization: 'Bearer ' + ref('TOKEN') } } : {}) };
    } else if (tem('COMANDO')) {
      const partes = UTIL.partirComando(vars[pref + 'COMANDO']);
      const env = {};
      for (const k of Object.keys(vars)) if (k !== pref + 'COMANDO' && k !== pref + 'URL' && String(vars[k]).trim() !== '') env[k] = '${' + k + '}';
      servidores[p.id] = { command: partes[0], args: partes.slice(1), ...(Object.keys(env).length ? { env } : {}) };
    } else avisos.push(p.id + ': sem ' + pref + 'COMANDO nem ' + pref + 'URL; fora do mcp.json');
  }
  return { mcpServers: servidores, avisos };
}

/** grava (ou limpa) o mcp.json de um agente; só mexe no arquivo que o próprio escritório gerou */
function gravarMcpDoAgente(pasta, ids) {
  const arq = path.join(pasta, MCP_ARQ);
  const { mcpServers, avisos } = mcpConfigPara(ids);
  let atual = null; try { atual = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch (e) { /* não há */ }
  const nosso = !atual || (atual._leia && /gerado pelo escritório/.test(atual._leia));
  if (!nosso) return { servidores: Object.keys(mcpServers), avisos: avisos.concat('mcp.json do agente não é do escritório: não tocado') };
  if (!Object.keys(mcpServers).length) { if (atual) fs.unlinkSync(arq); return { servidores: [], avisos }; }
  const novo = JSON.stringify({ _leia: MCP_LEIA, mcpServers }, null, 2) + '\n';
  if (!atual || JSON.stringify(atual) !== JSON.stringify(JSON.parse(novo))) fs.writeFileSync(arq, novo);
  return { servidores: Object.keys(mcpServers), avisos };
}

/** para uma chamada do Claude Code na pasta do agente (Ensinar): o mcp.json expandido com o .env dele, ou null.
    Quem chama grava num arquivo temporário da pasta, passa --mcp-config e apaga depois: segredo não vai na linha de comando. */
function mcpParaChamada(pasta) {
  let cfg = null; try { cfg = JSON.parse(fs.readFileSync(path.join(pasta, MCP_ARQ), 'utf8')); } catch (e) { return null; }
  if (!cfg || !cfg.mcpServers || !Object.keys(cfg.mcpServers).length) return null;
  const env = UTIL.lerEnvArquivo(path.join(pasta, '.env'));
  const servidores = {}, incompletos = [];
  for (const [id, s] of Object.entries(cfg.mcpServers)) {
    const r = UTIL.expandirVars(s, env);
    if (r.faltam.length) incompletos.push(id + ' (faltam ' + r.faltam.join(', ') + ')'); else servidores[id] = r.valor;
  }
  if (!Object.keys(servidores).length) return { config: null, servidores: [], incompletos };
  return { config: { mcpServers: servidores }, servidores: Object.keys(servidores), incompletos };
}

function sincronizarAgente(idSistema) {
  const s = dep.lerRegistro()[idSistema];
  if (!s) return { ok: false, motivo: 'sistema não encontrado: ' + idSistema };
  // agentes (trilha) e o CRM (crm: true) têm .env gerenciado; os outros sistemas não são tocados
  if (!s.trilha && !s.crm) return { ok: false, motivo: 'não é um agente do escritório (sem trilha): o .env dele não é tocado', pulado: true };
  if (!s.pasta || !fs.existsSync(s.pasta)) return { ok: false, motivo: 'a pasta do agente não existe: ' + (s.pasta || '?'), pulado: true };
  const arq = path.join(s.pasta, '.env');
  let atual = '';
  try { atual = fs.readFileSync(arq, 'utf8'); } catch (e) { atual = ''; }
  let novo, bloco;
  try { bloco = blocoEnvPara(s.plataformas || [], manuaisDe(atual), idSistema); novo = aplicarBloco(atual, bloco); }
  catch (e) { return { ok: false, motivo: e.message }; }
  if (novo !== atual) fs.writeFileSync(arq, novo);
  const nomes = bloco.split('\n').map(l => /^([A-Z][A-Z0-9_]*)=/.exec(l)).filter(Boolean).map(m => m[1]);
  let mcp = { servidores: [], avisos: [] };
  try { mcp = gravarMcpDoAgente(s.pasta, s.plataformas || []); } catch (e) { mcp.avisos.push('mcp.json: ' + e.message); }
  return { ok: true, variaveis: nomes, mudou: novo !== atual, mcps: mcp.servidores, avisos: mcp.avisos };
}
function sincronizarQuemTem(idPlataforma) {
  return usadaPor(idPlataforma).filter(sid => sincronizarAgente(sid).ok);
}
function sincronizarTodos() {
  const sincronizados = [], pulados = [];
  for (const id of Object.keys(dep.lerRegistro())) {
    const r = sincronizarAgente(id);
    (r.ok ? sincronizados : pulados).push(id);
  }
  return { sincronizados, pulados };
}
/** valores de uma plataforma só para um agente (ex.: CRM_TOKEN de cada agente); null apaga; sincroniza o .env dele */
function definirPorAgente(idPlataforma, agenteId, vars) {
  const todas = lerTodas();
  const p = todas.find(x => x.id === idPlataforma);
  if (!p) return { ok: false, motivo: 'plataforma não encontrada: ' + idPlataforma };
  const aid = String(agenteId || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(aid)) return { ok: false, motivo: 'id de agente inválido' };
  p.porAgente = p.porAgente || {};
  if (vars === null) delete p.porAgente[aid];
  else {
    const out = {};
    for (const [k, v] of Object.entries(vars || {})) {
      if (!NOME_VAR.test(String(k))) return { ok: false, motivo: 'nome de variável inválido: ' + k };
      if (/[\r\n]/.test(String(v == null ? '' : v))) return { ok: false, motivo: 'valor com quebra de linha: ' + k };
      out[k] = String(v == null ? '' : v);
    }
    p.porAgente[aid] = { ...(p.porAgente[aid] || {}), ...out };
  }
  p.atualizadaEm = new Date().toISOString();
  gravarTodas(todas);
  const s = dep.lerRegistro()[aid];
  const sinc = s && Array.isArray(s.plataformas) && s.plataformas.includes(idPlataforma) ? sincronizarAgente(aid) : { ok: false, pulado: true };
  return { ok: true, sincronizado: !!sinc.ok };
}
function definirDoAgente(idSistema, ids) {
  const bruto = dep.lerRegistroBruto();
  if (!bruto[idSistema]) return { ok: false, motivo: 'sistema não encontrado: ' + idSistema };
  const validos = new Set(lerTodas().map(p => p.id));
  const lista = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(id => validos.has(id)))];
  bruto[idSistema].plataformas = lista;
  dep.gravarRegistro(bruto);
  const r = sincronizarAgente(idSistema);
  return { ok: true, plataformas: lista, sincronizado: r.ok, motivo: r.ok ? undefined : r.motivo, variaveis: r.variaveis || [], mcps: r.mcps || [], avisos: r.avisos || [] };
}

/* ---------------- o teste de conexão: conectada, sem chave, falhou ----------------
   Um teste por tipo, com o que a plataforma tem. O resultado vai para a própria
   plataforma (teste: { estado, motivo, detalhe, quando, vazias? }); nenhum valor
   sai daqui, só o estado e um motivo em palavras. Estados:
     conectada  → o endereço aceitou a chave (ou a pasta existe)
     sem-chave  → falta preencher variável (cole em 🔌 Conexões)
     falhou     → sem resposta, chave recusada ou erro do lado de lá
     parada     → o CRM do escritório está desligado (não é falha de cadastro)
     sem-teste  → tipo sem teste automático */
const ESTADOS = {
  conectada:   { cor: 'verde',    rotulo: 'conectada' },
  'sem-chave': { cor: 'amarelo',  rotulo: 'sem chave' },
  falhou:      { cor: 'vermelho', rotulo: 'falhou' },
  parada:      { cor: 'cinza',    rotulo: 'desligada' },
  'sem-teste': { cor: 'cinza',    rotulo: 'sem teste automático' }
};
const R = (estado, motivo, detalhe) => ({ estado, motivo, detalhe: detalhe || '' });

/** GET/POST simples com prazo; devolve { status, json, texto, erro } (status 0 = não respondeu) */
function pedir(url, opts = {}) {
  const { metodo = 'GET', cabecalhos = {}, corpo = null, prazo = 5000 } = opts;
  return new Promise(resolve => {
    let u; try { u = new URL(url); } catch (e) { return resolve({ status: 0, erro: 'endereço inválido' }); }
    if (!/^https?:$/.test(u.protocol)) return resolve({ status: 0, erro: 'o endereço precisa começar com http:// ou https://' });
    const mod = u.protocol === 'https:' ? https : http;
    try {
      const req = mod.request(u, { method: metodo, headers: cabecalhos, timeout: prazo }, r => {
        let s = ''; r.on('data', d => { if (s.length < 20000) s += d; });
        r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch (e) {} resolve({ status: r.statusCode, json: j, texto: s }); });
      });
      req.on('error', e => resolve({ status: 0, erro: e.code === 'ECONNREFUSED' ? 'ninguém atende nesse endereço' : e.code === 'ENOTFOUND' ? 'endereço não encontrado' : e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ status: 0, erro: 'sem resposta em ' + Math.round(prazo / 1000) + ' s' }); });
      if (corpo != null) req.write(corpo);
      req.end();
    } catch (e) { resolve({ status: 0, erro: e.message }); }
  });
}
/** traduz uma resposta HTTP em estado */
function deHttp(r, quem = 'o endereço') {
  if (!r.status) return R('falhou', quem + ' não respondeu' + (r.erro ? ': ' + r.erro : ''), 'confira o endereço e se o sistema está no ar');
  if (r.status === 401 || r.status === 403) return R('falhou', quem + ' recusou a chave (' + r.status + ')', 'a chave está errada, vencida ou sem permissão');
  if (r.status === 404) return R('conectada', quem + ' responde, mas esse caminho não existe (404)', 'confira o endereço da API; o servidor está no ar');
  if (r.status >= 500) return R('falhou', quem + ' respondeu com erro ' + r.status, 'o problema é do lado de lá; tente de novo mais tarde');
  return R('conectada', quem + ' responde (' + r.status + ')');
}

function testarPasta(caminho) {
  if (!caminho) return R('sem-chave', 'sem caminho de pasta');
  let st; try { st = fs.statSync(caminho); } catch (e) { return R('falhou', 'pasta não encontrada: ' + caminho, 'confira o caminho; se é uma pasta de rede ou nuvem, veja se está montada'); }
  if (!st.isDirectory()) return R('falhou', 'não é uma pasta: ' + caminho);
  const prova = path.join(caminho, '.escritorio-teste-' + crypto.randomBytes(4).toString('hex'));
  try { fs.writeFileSync(prova, ''); fs.unlinkSync(prova); return R('conectada', 'pasta encontrada, leitura e escrita'); }
  catch (e) { return R('conectada', 'pasta encontrada, só leitura', 'o escritório não consegue gravar nela'); }
}

async function testarWhatsapp(url, chave, sessao) {
  if (!url) return R('sem-chave', 'sem endereço do WAHA');
  const r = await pedir(url.replace(/\/+$/, '') + '/api/sessions', { cabecalhos: chave ? { 'X-Api-Key': chave } : {} });
  if (!r.status || r.status === 401 || r.status === 403 || r.status >= 500) return deHttp(r, 'o WAHA');
  const lista = Array.isArray(r.json) ? r.json : [];
  const s = lista.find(x => x && x.name === (sessao || 'default'));
  if (!s) return R('falhou', 'o WAHA responde, mas não tem a sessão "' + (sessao || 'default') + '"', lista.length ? 'sessões que existem: ' + lista.map(x => x.name).join(', ') : 'crie a sessão no WAHA');
  if (String(s.status).toUpperCase() !== 'WORKING') return R('falhou', 'a sessão "' + s.name + '" está em ' + s.status, /QR/i.test(String(s.status)) ? 'escaneie o QR no WAHA com o celular' : 'reinicie a sessão no WAHA');
  return R('conectada', 'WAHA no ar, sessão "' + s.name + '" conectada');
}

async function testarGoogle(tipo, credencialJson, idRecurso) {
  let cred; try { cred = JSON.parse(credencialJson); } catch (e) { return R('sem-chave', 'GOOGLE_CREDENCIAIS_JSON não é um JSON válido', 'cole o conteúdo do arquivo da conta de serviço, em uma linha só'); }
  if (!cred || !cred.client_email || !cred.private_key) return R('sem-chave', 'a credencial não tem client_email e private_key', 'baixe o JSON da conta de serviço no Google Cloud');
  const planilha = tipo === 'planilha';
  const escopo = planilha ? 'https://www.googleapis.com/auth/spreadsheets.readonly' : 'https://www.googleapis.com/auth/calendar.readonly';
  const agora = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const semAssinatura = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: cred.client_email, scope: escopo, aud: 'https://oauth2.googleapis.com/token', iat: agora, exp: agora + 300 });
  let assinatura; try { assinatura = crypto.sign('RSA-SHA256', Buffer.from(semAssinatura), cred.private_key).toString('base64url'); } catch (e) { return R('sem-chave', 'a private_key da credencial não é válida', 'cole o JSON inteiro, sem trocar as quebras de linha da chave por outra coisa'); }
  const tok = await pedir('https://oauth2.googleapis.com/token', { metodo: 'POST', prazo: 8000, cabecalhos: { 'Content-Type': 'application/x-www-form-urlencoded' },
    corpo: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + semAssinatura + '.' + assinatura });
  if (!tok.status) return R('falhou', 'o Google não respondeu' + (tok.erro ? ': ' + tok.erro : ''), 'sem internet ou endereço bloqueado');
  if (!tok.json || !tok.json.access_token) return R('falhou', 'o Google recusou a credencial' + (tok.json && tok.json.error_description ? ': ' + tok.json.error_description : ''), 'a conta de serviço pode ter sido apagada ou a chave revogada');
  const nome = planilha ? 'a planilha' : 'a agenda';
  if (!idRecurso) return R('sem-chave', 'credencial válida, mas sem o id d' + nome.slice(2));
  const alvo = planilha ? 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(idRecurso) + '?fields=properties.title'
                        : 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(idRecurso);
  const r = await pedir(alvo, { prazo: 8000, cabecalhos: { Authorization: 'Bearer ' + tok.json.access_token } });
  if (r.status === 200) { const titulo = r.json && ((r.json.properties && r.json.properties.title) || r.json.summary); return R('conectada', nome + ' abre' + (titulo ? ': ' + titulo : '')); }
  if (r.status === 403 || r.status === 404) return R('falhou', nome + ' não está compartilhada com ' + cred.client_email, 'abra ' + nome + ' no Google e compartilhe com esse e-mail (leitor basta para o teste)');
  return deHttp(r, 'o Google');
}

function testarEmail(usuario, senha) {
  if (!usuario || !senha) return R('sem-chave', 'sem usuário ou senha de app');
  const dominio = (String(usuario).split('@')[1] || '').toLowerCase();
  if (!dominio) return R('sem-chave', 'o usuário precisa ser o e-mail completo');
  const host = /gmail|googlemail/.test(dominio) ? 'imap.gmail.com' : /outlook|hotmail|live\.|office365|msn\./.test(dominio) ? 'outlook.office365.com' : /yahoo/.test(dominio) ? 'imap.mail.yahoo.com' : 'imap.' + dominio;
  const str = s => '"' + String(s).replace(/[\\"]/g, c => '\\' + c) + '"';
  return new Promise(resolve => {
    let buf = '', etapa = 0, fim = false, sock = null;
    const done = (r) => { if (fim) return; fim = true; try { sock.destroy(); } catch (e) {} resolve(r); };
    try { sock = tls.connect({ host, port: 993, servername: host }); } catch (e) { return resolve(R('falhou', 'não consegui falar com ' + host + ': ' + e.message)); }
    sock.setTimeout(8000, () => done(R('falhou', host + ' não respondeu em 8 s', 'sem internet, ou o provedor não é esse; o escritório tenta imap.<domínio>')));
    sock.on('error', e => done(R('falhou', 'não consegui falar com ' + host + (e.code ? ' (' + e.code + ')' : ''), 'confira a internet; se o provedor usa outro servidor IMAP, avise o administrador')));
    sock.on('data', d => {
      buf += d.toString('utf8');
      if (etapa === 0 && /^\* (OK|PREAUTH)/m.test(buf)) { etapa = 1; buf = ''; sock.write('a1 LOGIN ' + str(usuario) + ' ' + str(senha) + '\r\n'); return; }
      if (etapa === 1) {
        if (/^a1 OK/m.test(buf)) { try { sock.write('a2 LOGOUT\r\n'); } catch (e) {} done(R('conectada', 'caixa de ' + usuario + ' aberta em ' + host)); }
        else if (/^a1 (NO|BAD)/m.test(buf)) done(R('falhou', host + ' recusou o usuário ou a senha de app', /gmail/.test(host) ? 'no Gmail é a "senha de app" (16 letras), não a senha da conta; IMAP precisa estar ativado' : 'confira usuário e senha; alguns provedores exigem senha de app'));
      }
    });
  });
}

/** sobe o servidor MCP local, pede initialize e tools/list; mata em seguida */
function testarMcpLocal(comando, env) {
  return new Promise(resolve => {
    let proc, fim = false, buf = '', erro = '';
    const done = (r) => { if (fim) return; fim = true; clearTimeout(tempo); try { if (process.platform === 'win32') spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); else proc.kill(); } catch (e) {} resolve(r); };
    const tempo = setTimeout(() => done(R('falhou', 'o servidor MCP não respondeu em 20 s', erro ? 'ele disse: ' + erro.trim().split('\n')[0].slice(0, 160) : 'o comando subiu mas não falou o protocolo MCP')), 20000);
    try { proc = spawn(comando, { shell: true, env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }); }
    catch (e) { clearTimeout(tempo); return resolve(R('falhou', 'não consegui iniciar o comando: ' + e.message)); }
    const manda = (o) => { try { proc.stdin.write(JSON.stringify(o) + '\n'); } catch (e) {} };
    proc.on('error', e => done(R('falhou', 'não consegui iniciar o comando: ' + e.message)));
    proc.on('exit', code => done(R('falhou', 'o comando terminou antes de responder (código ' + code + ')', erro ? 'ele disse: ' + erro.trim().split('\n')[0].slice(0, 160) : 'confira o comando e se o programa está instalado')));
    proc.stderr.on('data', d => { if (erro.length < 4000) erro += d; });
    proc.stdout.on('data', d => {
      buf += d.toString('utf8');
      let i; while ((i = buf.indexOf('\n')) >= 0) {
        const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!linha) continue;
        let m; try { m = JSON.parse(linha); } catch (e) { continue; }
        if (m.id === 1) { manda({ jsonrpc: '2.0', method: 'notifications/initialized' }); manda({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }); }
        else if (m.id === 2) {
          const tools = (m.result && Array.isArray(m.result.tools)) ? m.result.tools.map(t => t.name) : null;
          if (!tools) return done(R('falhou', 'o servidor MCP respondeu sem a lista de ferramentas' + (m.error ? ': ' + (m.error.message || '') : '')));
          done(R('conectada', tools.length + ' ferramenta(s): ' + tools.slice(0, 6).join(', ') + (tools.length > 6 ? '…' : '')));
        }
      }
    });
    manda({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'escritorio-de-agentes', version: '1' } } });
  });
}

/** o teste de uma plataforma, por tipo; nunca devolve valor */
async function executarTeste(p) {
  const pref = prefixoDe(p.id), vars = p.variaveis || {};
  const v = (s) => String(vars[SEM_PREFIXO.has(s) ? s : pref + s] || '').trim();
  // variável vazia no cadastro mas preenchida por agente (porAgente, como o CRM_TOKEN) não é vazia
  const porAg = Object.values(p.porAgente || {});
  const vazias = Object.entries(vars).filter(([k, val]) => String(val || '').trim() === '' && !porAg.some(x => String((x || {})[k] || '').trim() !== '')).map(([k]) => k);
  if (vazias.length) return { ...R('sem-chave', 'falta preencher ' + vazias.join(', '), 'cole o valor em 🔌 Conexões, como administrador'), vazias };
  switch (p.tipo) {
    case 'pasta': return testarPasta(v('PASTA'));
    case 'api': {
      const url = v('URL') || p.url;
      if (!url) return R('sem-chave', 'sem endereço para testar', 'preencha ' + pref + 'URL');
      return deHttp(await pedir(url, { cabecalhos: v('TOKEN') ? { Authorization: 'Bearer ' + v('TOKEN') } : {} }), 'o sistema');
    }
    case 'link': case 'navegador': {
      const url = v('URL') || p.url;
      if (!url) return R('sem-chave', 'sem endereço para testar');
      return deHttp(await pedir(url), 'o site');
    }
    case 'banco': {
      const url = v('URL'), chave = v('CHAVE');
      const alvo = /supabase/i.test(url) || !/\/rest\//.test(url) ? url.replace(/\/+$/, '') + '/rest/v1/' : url;
      return deHttp(await pedir(alvo, { cabecalhos: { apikey: chave, Authorization: 'Bearer ' + chave } }), 'o banco');
    }
    case 'whatsapp': return testarWhatsapp(v('API_URL'), v('API_CHAVE'), v('SESSAO'));
    case 'planilha': return testarGoogle('planilha', v('GOOGLE_CREDENCIAIS_JSON'), v('SHEETS_ID'));
    case 'agenda': return testarGoogle('agenda', v('GOOGLE_CREDENCIAIS_JSON'), v('CALENDAR_ID'));
    case 'email': return testarEmail(v('USUARIO'), v('SENHA_APP'));
    case 'mcp': {
      if (v('URL')) {
        const r = await pedir(v('URL'), { cabecalhos: v('TOKEN') ? { Authorization: 'Bearer ' + v('TOKEN') } : {} });
        if (!r.status || r.status === 401 || r.status === 403 || r.status >= 500) return deHttp(r, 'o servidor MCP');
        return R('conectada', 'o servidor MCP responde (' + r.status + ')');
      }
      if (!v('COMANDO')) return R('sem-chave', 'sem ' + pref + 'COMANDO nem ' + pref + 'URL');
      const env = {}; for (const k of Object.keys(vars)) if (k !== pref + 'COMANDO' && k !== pref + 'URL' && String(vars[k]).trim() !== '') env[k] = String(vars[k]);
      return testarMcpLocal(v('COMANDO'), env);
    }
    default: return R('sem-teste', 'este tipo não tem teste automático');
  }
}
async function testeDe(p) {
  let r; try { r = await executarTeste(p); } catch (e) { r = R('falhou', 'o teste quebrou: ' + e.message); }
  // o CRM do escritório desligado não é falha de cadastro: é só ligar
  if (p.id === 'crm' && r.estado === 'falhou' && /não respondeu/.test(r.motivo)) r = R('parada', 'o CRM está desligado: ligue-o pelo escritório');
  return { ...r, quando: new Date().toISOString() };
}
/** grava só o campo teste, relendo o arquivo (outro salvar pode ter acontecido no meio) */
function gravarTestes(porId) {
  const atuais = lerTodas();
  let mudou = false;
  for (const p of atuais) if (porId[p.id]) { p.teste = porId[p.id]; mudou = true; }
  if (mudou) gravarTodas(atuais);
}
async function testar(id) {
  const p = lerTodas().find(x => x.id === id);
  if (!p) return { ok: false, motivo: 'plataforma não encontrada: ' + id };
  const teste = await testeDe(p);
  gravarTestes({ [id]: teste });
  return { ok: true, id, teste };
}
async function testarTodas() {
  const todas = lerTodas();
  const resultados = await Promise.all(todas.map(p => testeDe(p).then(teste => [p.id, teste])));
  gravarTestes(Object.fromEntries(resultados));
  return { ok: true, testes: resultados.map(([id, t]) => ({ id, ...t })), resumo: resumoTestes() };
}
/** contagem por estado e a lista do que precisa de gente (sem chave, falhou) */
function resumoTestes(lista = lerTodas()) {
  const r = { total: lista.length, conectadas: 0, semChave: 0, falharam: 0, paradas: 0, semTeste: 0, naoTestadas: 0, atencao: [] };
  for (const p of lista) {
    const t = p.teste;
    if (!t) { r.naoTestadas++; continue; }
    if (t.estado === 'conectada') r.conectadas++;
    else if (t.estado === 'sem-chave') { r.semChave++; r.atencao.push({ id: p.id, nome: p.nome, estado: t.estado, motivo: t.motivo }); }
    else if (t.estado === 'falhou') { r.falharam++; r.atencao.push({ id: p.id, nome: p.nome, estado: t.estado, motivo: t.motivo }); }
    else if (t.estado === 'parada') r.paradas++;
    else r.semTeste++;
  }
  return r;
}

module.exports = {
  init(d) { dep = d; return module.exports; },
  TIPOS, ESTADOS, INICIO, FIM, MCP_ARQ, prefixoDe, variaveisSugeridas,
  listar, obter, salvar, remover, criarLista, usadaPor,
  testar, testarTodas, resumoTestes, executarTeste,
  blocoEnvPara, aplicarBloco, separarBloco, manuaisDe,
  mcpConfigPara, gravarMcpDoAgente, mcpParaChamada,
  sincronizarAgente, sincronizarTodos, definirDoAgente, definirPorAgente
};

/* ---------------- linha de comando (a skill /criar-escritorio usa) ---------------- */
if (require.main === module) {
  const ROOT = __dirname;
  const DADOS = process.env.ESCRITORIO_DADOS || path.join(ROOT, 'data');
  const REGISTRO = path.join(DADOS, 'sistemas.json');
  const lerBruto = () => { try { return JSON.parse(fs.readFileSync(REGISTRO, 'utf8')); } catch (e) { return {}; } };
  module.exports.init({
    ROOT, DADOS,
    lerRegistroBruto: lerBruto,
    lerRegistro: () => { const o = {}; for (const [id, s] of Object.entries(lerBruto())) { if (id.startsWith('_')) continue; if (s && s.pasta && !path.isAbsolute(s.pasta)) s.pasta = path.join(ROOT, s.pasta); o[id] = s; } return o; },
    gravarRegistro: (b) => { fs.mkdirSync(DADOS, { recursive: true }); fs.writeFileSync(REGISTRO, JSON.stringify(b, null, 2) + '\n'); }
  });
  rodarCli({
    _ajuda: 'listar                 as plataformas, sem valores\ncriar <lista.json>     [{ nome, tipo, url }] com variáveis sugeridas vazias\nsincronizar            regrava o bloco no .env de todos os agentes do escritório\ntestar [id]            testa a conexão de uma ou de todas (conectada, sem chave, falhou); grava o estado, nunca o valor\ntipos                  os tipos aceitos',
    listar: () => ({ ok: true, plataformas: listar() }),
    testar: (id) => id ? testar(id) : testarTodas(),
    criar: (arq) => criarLista(JSON.parse(fs.readFileSync(arq, 'utf8'))),
    sincronizar: () => ({ ok: true, ...sincronizarTodos() }),
    tipos: () => ({ ok: true, tipos: Object.fromEntries(Object.entries(TIPOS).map(([k, v]) => [k, v.nome])) })
  }).then(c => process.exit(c));
}
