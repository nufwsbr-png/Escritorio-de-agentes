/* ===========================================================
   agente-base.js — o que server.js, rodar.js e tools/ compartilham

   .env, agente.json, log, progresso, identidade, lições, tranca do painel,
   aviso ao escritório e a constituição editável com histórico em git.
   Nada aqui imprime valor do .env: só nomes de variáveis.
   =========================================================== */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const PASTA = __dirname;
const arq = (...p) => path.join(PASTA, ...p);

/* ---------------- .env ---------------- */
function carregarEnv() {
  let txt = '';
  try { txt = fs.readFileSync(arq('.env'), 'utf8'); } catch (e) { return; }
  for (const linha of txt.split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || linha.trim().startsWith('#')) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
carregarEnv();
/** nomes das variáveis do .env que estão vazias (para avisar antes de rodar) */
function variaveisVazias() {
  let txt = ''; try { txt = fs.readFileSync(arq('.env'), 'utf8'); } catch (e) { return []; }
  return txt.split(/\r?\n/).map(l => /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(""|''|)\s*$/.exec(l)).filter(Boolean).map(m => m[1]);
}

/** o executável do Claude Code nesta máquina (cópia de util.js do escritório: a pasta do agente não depende dele) */
function acharClaude() {
  const casa = process.env.USERPROFILE || process.env.HOME || '';
  for (const t of [path.join(casa, '.local', 'bin', 'claude.exe'), path.join(casa, '.local', 'bin', 'claude')]) if (casa && fs.existsSync(t)) return t;
  return process.platform === 'win32' ? 'claude.exe' : 'claude';
}

const AGENTE = (() => {
  try { return JSON.parse(fs.readFileSync(arq('agente.json'), 'utf8')); }
  catch (e) { return { nome: path.basename(PASTA), setor: 'agente', negocio: '', trilha: 'tarefa' }; }
})();
const PORT = Number(process.env.PORT) || Number(AGENTE.porta) || 4401;
const ESCRITORIO = 'http://127.0.0.1:' + (process.env.ESCRITORIO_PORTA || 4321);

/* ---------------- arquivos e log ---------------- */
const ler = (rel, padrao = '') => { try { return fs.readFileSync(arq(rel), 'utf8'); } catch (e) { return padrao; } };
const escrever = (rel, txt) => { fs.mkdirSync(path.dirname(arq(rel)), { recursive: true }); fs.writeFileSync(arq(rel), txt); };
const semComentarios = (t) => String(t).replace(/<!--[\s\S]*?-->/g, '').trim();
const hoje = () => new Date().toLocaleDateString('pt-BR');

function log(linha) {
  const l = '[' + new Date().toLocaleString('pt-BR') + '] ' + String(linha).replace(/\s+/g, ' ').slice(0, 500);
  try { fs.appendFileSync(arq('log.txt'), l + '\n'); } catch (e) { /* log não derruba o agente */ }
}
const tail = (n) => { try { return ler('log.txt').split(/\r?\n/).filter(Boolean).slice(-n); } catch (e) { return []; } };

/* ---------------- progresso (a lista de componentes) ---------------- */
function progresso() {
  const t = ler('progresso-do-agente.md');
  const feitos = (t.match(/^- \[x\]/gim) || []).length;
  const abertos = (t.match(/^- \[ \]/gim) || []).length;
  const concluido = /^## CONCLU[IÍ]DO/im.test(t);
  const portao = concluido || /^- \[x\][^\n]*PORT[ÃA]O/im.test(t) || /PORT[ÃA]O:\s*aprovad/i.test(t);
  return { passo: feitos, total: feitos + abertos, portao, concluido };
}

/* ---------------- identidade e lições ---------------- */
const identidade = () => semComentarios(ler('prompt-agente.md', 'Você é ' + AGENTE.nome + '.'));
const linhasDe = (rel) => semComentarios(ler(rel)).split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('- '));
const licoes = () => linhasDe('memoria/licoes.md');
const licoesPropostas = () => linhasDe('memoria/licoes-propostas.md');

/* ---------------- MCP: o que o escritório marcou para este agente ---------------- */
/** troca ${NOME} por process.env.NOME dentro do objeto; devolve as variáveis que faltaram */
function expandirVars(obj, env = process.env) {
  const faltam = new Set();
  const anda = (x) => Array.isArray(x) ? x.map(anda)
    : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, anda(v)]))
    : typeof x === 'string' ? x.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, k) => { const v = env[k]; if (v === undefined || v === '') { faltam.add(k); return ''; } return String(v); }) : x;
  return { valor: anda(obj), faltam: [...faltam] };
}
/** mcp.json (gerado pelo escritório, com ${VAR}) expandido com o .env: { config, servidores, incompletos } ou null se não há MCP */
function mcpDaRodada() {
  let cfg = null; try { cfg = JSON.parse(ler('mcp.json', 'null')); } catch (e) { return null; }
  if (!cfg || !cfg.mcpServers || !Object.keys(cfg.mcpServers).length) return null;
  const servidores = {}, incompletos = [];
  for (const [id, s] of Object.entries(cfg.mcpServers)) {
    const r = expandirVars(s);
    if (r.faltam.length) incompletos.push(id + ' (faltam ' + r.faltam.join(', ') + ')'); else servidores[id] = r.valor;
  }
  return { config: Object.keys(servidores).length ? { mcpServers: servidores } : null, servidores: Object.keys(servidores), incompletos };
}

/** as skills que o dono ensinou vendo (.claude/skills/<tarefa>/SKILL.md), fora a referência da trilha (criar-agente*) */
function skillsAprendidas() {
  let nomes = [];
  try { nomes = fs.readdirSync(arq('.claude', 'skills'), { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); } catch (e) { return []; }
  return nomes.filter(n => !/^criar-agente/.test(n)).map(n => {
    const t = ler(path.join('.claude', 'skills', n, 'SKILL.md'));
    if (!t) return null;
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(t);
    const campo = (k) => { const m = fm && new RegExp('^' + k + ':\\s*(.+)$', 'm').exec(fm[1]); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
    return { id: n, nome: campo('name') || n, descricao: campo('description'), arquivo: '.claude/skills/' + n + '/SKILL.md' };
  }).filter(Boolean);
}

function proporLicao(linha) {
  linha = String(linha).replace(/\s+/g, ' ').trim();
  if (!linha.startsWith('- ')) linha = '- ' + linha;
  const t = ler('memoria/licoes-propostas.md', '# Lições propostas — ' + AGENTE.nome + '\n\n');
  escrever('memoria/licoes-propostas.md', t.trimEnd() + '\n' + linha.slice(0, 500) + '\n');
  log('lição proposta: ' + linha.slice(0, 120));
}
function decidirLicao(linha, aprovar) {
  const prop = ler('memoria/licoes-propostas.md');
  const linhas = prop.split(/\r?\n/);
  const i = linhas.findIndex(l => l.trim() === String(linha).trim());
  if (i < 0) return { ok: false, motivo: 'essa lição não está nas propostas' };
  linhas.splice(i, 1);
  escrever('memoria/licoes-propostas.md', linhas.join('\n'));
  if (aprovar) {
    const t = ler('memoria/licoes.md', '# Lições aprovadas — ' + AGENTE.nome + '\n\n');
    escrever('memoria/licoes.md', t.trimEnd() + '\n' + String(linha).trim() + '\n');
    log('lição aprovada pelo dono: ' + String(linha).slice(0, 120));
    commitar('lição aprovada: ' + String(linha).slice(0, 60));
  } else log('lição rejeitada pelo dono: ' + String(linha).slice(0, 120));
  return { ok: true };
}

/* ---------------- constituição editável, com histórico ---------------- */
function validarConstituicao(texto) {
  const erros = [];
  const linhas = String(texto).split(/\r?\n/);
  if (!/^#\s+\S/.test(linhas[0] || '')) erros.push('a primeira linha precisa ser o título: "# Constituição — nome"');
  linhas.forEach((l, i) => { if (/^#{1,6}[^#\s]/.test(l)) erros.push('linha ' + (i + 1) + ': falta espaço depois do # no título'); });
  if (!/^## /m.test(texto)) erros.push('precisa de pelo menos uma seção "## "');
  return erros;
}
function salvarConstituicao(texto) {
  const erros = validarConstituicao(texto);
  if (erros.length) return { ok: false, erros };
  const antes = ler('skills/constituicao.md');
  const novos = ((texto.match(/\[A PREENCHER\]/g) || []).length) - ((antes.match(/\[A PREENCHER\]/g) || []).length);
  escrever('skills/constituicao.md', String(texto).trimEnd() + '\n');
  commitar('constituição editada pelo painel');
  log('constituição salva pelo painel' + (novos > 0 ? ' (+' + novos + ' [A PREENCHER])' : ''));
  return { ok: true, aviso: novos > 0 ? 'atenção: ' + novos + ' lacuna(s) [A PREENCHER] nova(s)' : null };
}
/** histórico de versões: um commit por salvamento, se a pasta tiver git */
function commitar(msg) {
  if (!fs.existsSync(arq('.git'))) return false;
  const g = (a) => spawnSync('git', a, { cwd: PASTA, stdio: 'ignore', timeout: 15000 });
  g(['add', 'skills', 'memoria/licoes.md', 'memoria/licoes-propostas.md', 'progresso-do-agente.md']);
  return g(['commit', '-q', '-m', '[painel] ' + msg]).status === 0;
}
function voltarConstituicao() {
  if (!fs.existsSync(arq('.git'))) return { ok: false, motivo: 'sem git nesta pasta' };
  const r = spawnSync('git', ['log', '-2', '--format=%H', '--', 'skills/constituicao.md'], { cwd: PASTA, encoding: 'utf8' });
  const hashes = String(r.stdout || '').trim().split('\n').filter(Boolean);
  if (hashes.length < 2) return { ok: false, motivo: 'não há versão anterior' };
  spawnSync('git', ['checkout', hashes[1], '--', 'skills/constituicao.md'], { cwd: PASTA, stdio: 'ignore' });
  commitar('constituição: voltou para a versão anterior');
  return { ok: true };
}

/* ---------------- aviso ao escritório (quem avisa é o sistema, nunca o agente) ---------------- */
/** quem este agente é no escritório: AGENTE_ID (o escritório passa ao subir) ou o id gravado em agente.json ao contratar */
const idNoEscritorio = () => process.env.AGENTE_ID || AGENTE.id || '';

/** os recados que colegas e o dono deixaram, buscados do escritório antes de uma rodada e marcados como entregues; [] sem escritório no ar */
function recadosPendentes() {
  const id = idNoEscritorio();
  if (!id) return Promise.resolve([]);
  return new Promise(resolve => {
    try {
      const req = http.get(ESCRITORIO + '/api/agentes/' + encodeURIComponent(id) + '/mensagens?entregar=1', { timeout: 3000 }, r => {
        let s = ''; r.on('data', d => s += d);
        r.on('end', () => { try { resolve((JSON.parse(s).mensagens || []).map(m => ({ de: m.deNome || m.de, quando: m.quando, texto: String(m.texto || '').slice(0, 600) }))); } catch (e) { resolve([]); } });
      });
      req.on('error', () => resolve([])); req.on('timeout', () => { req.destroy(); resolve([]); });
    } catch (e) { resolve([]); }
  });
}

function avisarEscritorio(titulo, texto, prioridade = 'normal') {
  try {
    const corpo = JSON.stringify({ titulo: AGENTE.nome + ': ' + titulo, texto: String(texto).slice(0, 300), prioridade });
    const req = http.request(ESCRITORIO + '/api/avisar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 3000 }, r => r.resume());
    req.on('error', () => {}); req.on('timeout', () => req.destroy());
    req.end(corpo);
  } catch (e) { /* sem escritório no ar, segue */ }
}

/* ---------------- tranca do painel ---------------- */
const temSenha = () => !!(process.env.PAINEL_SENHA && process.env.PAINEL_SENHA.length >= 4);
const SESSOES_ARQ = 'memoria/sessoes.json';
const DURACAO = 5 * 24 * 60 * 60 * 1000;
const lerSessoes = () => { try { return JSON.parse(ler(SESSOES_ARQ, '{}')); } catch (e) { return {}; } };
function entrar(senha) {
  if (!temSenha()) return null;
  const a = Buffer.from(String(senha || '')), b = Buffer.from(process.env.PAINEL_SENHA);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const s = lerSessoes(); const token = crypto.randomBytes(24).toString('hex');
  for (const k of Object.keys(s)) if (s[k] < Date.now()) delete s[k];
  s[token] = Date.now() + DURACAO;
  escrever(SESSOES_ARQ, JSON.stringify(s));
  return token;
}
function sessaoValida(req) {
  if (!temSenha()) return true;
  const m = /(?:^|;\s*)painel=([a-f0-9]{48})/.exec(req.headers.cookie || '');
  if (!m) return false;
  const s = lerSessoes();
  return !!(s[m[1]] && s[m[1]] > Date.now());
}
const cookieSessao = (token) => 'painel=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + Math.floor(DURACAO / 1000);
/** gatilho externo (webhook) só com a chave do .env */
const gatilhoAutorizado = (req) => !!process.env.GATILHO_CHAVE && (req.headers['x-chave'] === process.env.GATILHO_CHAVE);

/* ---------------- utilidades de servidor ---------------- */
function lerCorpo(req, limite = 200000) {
  return new Promise(resolve => {
    let s = '';
    req.on('data', d => { s += d; if (s.length > limite) req.destroy(); });
    req.on('end', () => {
      const tipo = String(req.headers['content-type'] || '');
      if (tipo.includes('json')) { try { return resolve(JSON.parse(s || '{}')); } catch (e) { return resolve({}); } }
      const o = {};
      for (const par of s.split('&')) { if (!par) continue; const [k, v = ''] = par.split('='); o[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' ')); }
      resolve(o);
    });
    req.on('error', () => resolve({}));
  });
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ESTILO = `
  :root{--bg:#0a0c14;--card:#10131f;--line:#222941;--txt:#e8ecf7;--dim:#8b93ad;--acc:#7c6cff;--alt:#38bdf8;--ok:#23e08a;--warn:#ffb020;--bad:#ff6b6b}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.6 'Segoe UI',system-ui,sans-serif}
  .topo{display:flex;align-items:center;gap:14px;padding:14px 22px;border-bottom:1px solid var(--line);background:#0d1019;flex-wrap:wrap}
  .topo h1{margin:0;font-size:17px} .topo .dim{color:var(--dim);font-size:12.5px} .topo nav{margin-left:auto;display:flex;gap:12px}
  .topo a{color:var(--alt);text-decoration:none;font-size:13px}
  .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;padding:18px 22px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;min-width:0} .card.larga{grid-column:1/-1}
  .card h2{margin:0 0 8px;font-size:11px;letter-spacing:.9px;text-transform:uppercase;color:var(--dim)}
  .num{font-size:30px;font-weight:700;color:var(--alt);line-height:1.1} .num small{font-size:12px;color:var(--dim);font-weight:500;margin-left:6px}
  pre{margin:0;white-space:pre-wrap;font:12px/1.55 Consolas,ui-monospace,monospace;color:#9fe8c4;max-height:280px;overflow:auto}
  .bar{height:6px;background:#161a2c;border-radius:6px;overflow:hidden;margin-top:8px}.bar i{display:block;height:100%;background:var(--acc)}
  .tag{display:inline-block;font-size:10.5px;padding:2px 8px;border-radius:20px;background:rgba(124,108,255,.15);color:#c4b8ff;font-weight:700;white-space:nowrap}
  .tag.ok{background:rgba(35,224,138,.14);color:var(--ok)} .tag.warn{background:rgba(255,176,32,.14);color:var(--warn)} .tag.bad{background:rgba(255,107,107,.14);color:var(--bad)}
  table{width:100%;border-collapse:collapse;font-size:13px} td,th{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top} th{color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.6px}
  form.inl{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;margin:2px 0}
  input,textarea,select{background:#0c0f1a;border:1px solid var(--line);border-radius:8px;padding:7px 10px;color:var(--txt);font:inherit} textarea{width:100%;min-height:160px;font:12.5px/1.5 Consolas,ui-monospace,monospace}
  button{background:linear-gradient(135deg,#7c6cff,#9d8cff);border:0;border-radius:8px;color:#fff;padding:6px 12px;font-weight:700;cursor:pointer;font-size:12.5px} button.ok{background:linear-gradient(135deg,#1aa868,#23e08a)} button.bad{background:linear-gradient(135deg,#b94040,#ff6b6b)} button.fraco{background:#1a1f33;color:var(--txt)}
  .msg{padding:10px 13px;border-radius:10px;margin:0 22px 0;background:rgba(255,176,32,.1);border:1px solid rgba(255,176,32,.35);color:#ffd98a;font-size:12.5px}
  .login{max-width:360px;margin:12vh auto;padding:26px;background:var(--card);border:1px solid var(--line);border-radius:14px;display:flex;flex-direction:column;gap:10px}
  .dimtxt{color:var(--dim);font-size:12.5px}
  /* o painel em abas */
  .topo .estado{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--dim)} .topo .estado i{width:8px;height:8px;border-radius:50%;background:#5a6280} .topo .estado i.on{background:var(--ok)}
  .abas{display:flex;gap:2px;padding:0 22px;background:#0d1019;border-bottom:1px solid var(--line);overflow-x:auto}
  .aba{padding:11px 13px;font-size:13px;font-weight:600;color:var(--dim);border-bottom:2px solid transparent;margin-bottom:-1px;display:inline-flex;align-items:center;gap:8px;cursor:pointer;text-decoration:none;white-space:nowrap}
  .aba.on{color:var(--txt);border-bottom-color:var(--acc)} .aba .n{font-size:10.5px;font-weight:700;background:#1a1f33;color:#c4b8ff;padding:1px 7px;border-radius:99px} .aba .n.warn{background:rgba(255,176,32,.18);color:var(--warn)}
  .corpo{display:grid;grid-template-columns:1fr 300px} @media (max-width:860px){.corpo{grid-template-columns:1fr}.lateral{border-left:0;border-top:1px solid var(--line)}}
  .principal{padding:18px 22px;min-width:0} .pane{display:none} .pane.on{display:block}
  .pane h3{margin:0 0 2px;font-size:16px} .pane h4{margin:14px 0 6px;font-size:11px;letter-spacing:.9px;text-transform:uppercase;color:var(--dim)} .pane .expl{color:var(--dim);font-size:12.5px;margin-bottom:12px}
  .cartao{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;gap:12px;align-items:flex-start} .cartao .q{flex:1;min-width:0} .cartao .q b{font-size:14px}
  .cartao .q small{display:block;color:var(--dim);font-size:12.5px;margin-top:2px} .cartao .q small.erro{color:var(--bad)} .cartao .acoes{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px} .cartao .acoes:empty{display:none}
  .cartao.vazio{color:var(--dim);justify-content:center;border-style:dashed}
  .lateral{border-left:1px solid var(--line);padding:18px;background:#0d1019;display:flex;flex-direction:column;gap:12px}
  .caixa{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px} .caixa h4{margin:0 0 8px;font-size:11px;letter-spacing:.9px;text-transform:uppercase;color:var(--dim)}
  .caixa form.col{display:flex;flex-direction:column;gap:6px;margin-bottom:8px} .caixa form.col input{width:100%}
  .caixa .kv{display:flex;justify-content:space-between;gap:10px;font-size:13px;padding:5px 0;border-bottom:1px solid #161a2c} .caixa .kv b{text-align:right;color:var(--txt)}`;

function paginaLogin(erro) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(AGENTE.nome)} · entrar</title><style>${ESTILO}</style></head><body>
<form class="login" method="post" action="/entrar"><h1 style="margin:0;font-size:18px">${esc(AGENTE.nome)}</h1><span class="dimtxt">Painel do dono. A senha está em PAINEL_SENHA, no .env do agente.</span>
${erro ? '<span style="color:var(--bad);font-size:12.5px">' + esc(erro) + '</span>' : ''}<input type="password" name="senha" placeholder="senha" autofocus><button>Entrar</button></form></body></html>`;
}

/* ---------------- o CRM do escritório (plataforma "crm", um token por agente) ----------------
   Com a plataforma marcada, a ficha de cada entidade mora no CRM: o lançador
   lê e grava o estado dele lá (ficha.agentes[<id>]) e as ferramentas usam
   tools/crm.js. Sem a plataforma, nada disto existe e tudo segue como antes. */
const crmConfigurado = () => !!(process.env.CRM_URL && process.env.CRM_TOKEN && String(process.env.PLATAFORMAS_PERMITIDAS || '').split(';').map(s => s.trim()).includes('crm'));
function crmPede(metodo, caminho, corpo, modo) {
  return new Promise(resolve => {
    if (!crmConfigurado()) return resolve({ status: 0, erro: 'CRM não configurado para este agente' });
    try {
      const dados = corpo ? JSON.stringify(corpo) : null;
      const headers = { Authorization: 'Bearer ' + process.env.CRM_TOKEN, 'Content-Type': 'application/json', 'x-modo': modo || process.env.MODO_RODADA || 'real' };
      const req = http.request(String(process.env.CRM_URL).replace(/\/+$/, '') + caminho, { method: metodo, headers, timeout: 8000 }, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch (e) {} resolve({ status: r.statusCode, json: j }); }); });
      req.on('error', e => resolve({ status: 0, erro: e.message })); req.on('timeout', () => { req.destroy(); resolve({ status: 0, erro: 'sem resposta' }); });
      if (dados) req.write(dados); req.end();
    } catch (e) { resolve({ status: 0, erro: e.message }); }
  });
}

module.exports = {
  PASTA, arq, AGENTE, PORT, ESCRITORIO, carregarEnv, variaveisVazias, acharClaude, crmConfigurado, crmPede,
  ler, escrever, semComentarios, hoje, log, tail, progresso,
  identidade, licoes, licoesPropostas, skillsAprendidas, expandirVars, mcpDaRodada, proporLicao, decidirLicao,
  validarConstituicao, salvarConstituicao, voltarConstituicao, commitar,
  idNoEscritorio, recadosPendentes, avisarEscritorio, temSenha, entrar, sessaoValida, cookieSessao, gatilhoAutorizado,
  lerCorpo, esc, ESTILO, paginaLogin
};
