/* ===========================================================
   server.js — o sistema próprio deste agente (esqueleto do escritório).

   Contrato com o Escritório de Agentes (não quebre):
     GET /saude   JSON com { ok, nome, setor, desde }  — o escritório vigia
     GET /painel  página inteira, só leitura           — o monitor embute
     GET /log     últimas linhas de log.txt            — o botão Log
     GET /        chat de teste (sandbox)
     POST /chat   { texto } -> { resposta }
   Porta pela variável PORT. Escuta só em 127.0.0.1.

   Cérebro:
     - sem OPENROUTER_API no .env  -> Claude Code da máquina (claude -p).
       É o padrão dos agentes de setor. Não usa chave de modelo.
     - com OPENROUTER_API no .env  -> OpenRouter (agente de atendimento).
   Nos dois casos o prompt de sistema é prompt-agente.md, relido a cada
   mensagem, e a constituição (skills/constituicao.md) é FERRAMENTA: o
   modelo a lê quando precisa, ela nunca entra no prompt.
   =========================================================== */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PASTA = __dirname;
const arq = (...p) => path.join(PASTA, ...p);

/* ---------------- .env: conexões de trabalho ---------------- */
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

const AGENTE = (() => {
  try { return JSON.parse(fs.readFileSync(arq('agente.json'), 'utf8')); }
  catch (e) { return { nome: path.basename(PASTA), setor: 'agente', negocio: '', trilha: 'setor' }; }
})();
const PORT = Number(process.env.PORT) || Number(AGENTE.porta) || 4401;
const inicio = Date.now();

/* ---------------- log ---------------- */
function log(linha) {
  const l = '[' + new Date().toLocaleString('pt-BR') + '] ' + String(linha).replace(/\s+/g, ' ').slice(0, 400);
  try { fs.appendFileSync(arq('log.txt'), l + '\n'); } catch (e) { /* log não derruba o agente */ }
}
const tail = (n) => {
  try { return fs.readFileSync(arq('log.txt'), 'utf8').split(/\r?\n/).filter(Boolean).slice(-n); }
  catch (e) { return []; }
};

/* ---------------- arquivos do agente ---------------- */
const ler = (rel, padrao = '') => { try { return fs.readFileSync(arq(rel), 'utf8'); } catch (e) { return padrao; } };

function progresso() {
  const t = ler('progresso-do-agente.md');
  const feitos = (t.match(/^- \[x\]/gim) || []).length;
  const abertos = (t.match(/^- \[ \]/gim) || []).length;
  return { passo: feitos, total: feitos + abertos,
           portao: /PORT[ÃA]O:\s*aprovad/i.test(t) || /^## CONCLU[IÍ]DO/im.test(t),
           concluido: /^## CONCLU[IÍ]DO/im.test(t) };
}

/** o prompt de sistema: prompt-agente.md + o que o agente já aprendeu */
function promptDeSistema() {
  const prompt = ler('prompt-agente.md', 'Você é ' + AGENTE.nome + '.')
    .replace(/<!--[\s\S]*?-->/g, '').trim();
  const memoria = ler('memoria.md').replace(/<!--[\s\S]*?-->/g, '').trim().slice(-3000);
  return prompt +
    '\n\nREGRAS DO ESCRITÓRIO: a base de conhecimento do negócio está na ferramenta "constituicao" ' +
    '(o arquivo skills/constituicao.md). Sempre que a resposta depender de dado, regra, preço ou nome do ' +
    'negócio, consulte-a ANTES de responder. Se o dado não estiver lá ou estiver como [A PREENCHER], diga ' +
    'que confirma com a equipe — nunca invente. Não cite caminhos de arquivo nem fale de ferramentas com ' +
    'quem conversa. Responda em português do Brasil, curto.' +
    (memoria ? '\n\nMEMÓRIA DO AGENTE (o que você já aprendeu):\n' + memoria : '');
}

/* ---------------- sessões do chat de teste ---------------- */
const sessoes = new Map();   // cookie -> { claude: session_id | null, historico: [] }
function sessaoDe(req, res) {
  const m = /(?:^|;\s*)sessao=([a-f0-9]{24})/.exec(req.headers.cookie || '');
  let id = m && m[1];
  if (!id || !sessoes.has(id)) {
    id = crypto.randomBytes(12).toString('hex');
    sessoes.set(id, { claude: null, historico: [] });
    res.setHeader('Set-Cookie', 'sessao=' + id + '; Path=/; HttpOnly; SameSite=Lax');
  }
  return sessoes.get(id);
}

/* ---------------- cérebro 1: Claude Code da máquina ---------------- */
const CLAUDE_BIN = (() => {
  const casa = process.env.USERPROFILE || process.env.HOME || '';
  for (const t of [path.join(casa, '.local', 'bin', 'claude.exe'), path.join(casa, '.local', 'bin', 'claude')])
    if (fs.existsSync(t)) return t;
  return process.platform === 'win32' ? 'claude.exe' : 'claude';
})();

function perguntarClaudeCode(sessao, texto) {
  return new Promise(resolve => {
    const args = ['-p', '--output-format', 'json', '--model', process.env.MODELO || 'sonnet',
                  '--permission-mode', 'default',
                  // a constituição é lida com a ferramenta Read: é assim que ela vira ferramenta
                  '--allowedTools', 'Read', 'Glob', 'Grep',
                  '--append-system-prompt', promptDeSistema()];
    if (sessao.claude) args.push('--resume', sessao.claude);
    let saida = '', erro = '';
    const p = spawn(CLAUDE_BIN, args, { cwd: PASTA, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] });
    const corta = setTimeout(() => { try { p.kill(); } catch (e) {} }, 4 * 60000);
    p.stdin.on('error', () => {});
    p.stdin.end(texto, 'utf8');
    p.stdout.on('data', d => saida += d);
    p.stderr.on('data', d => erro += d);
    p.on('error', e => { clearTimeout(corta); resolve({ erro: 'não consegui executar o Claude Code: ' + e.message }); });
    p.on('exit', () => {
      clearTimeout(corta);
      let j = null; try { j = JSON.parse(saida); } catch (e) {}
      if (!j) return resolve({ erro: (erro || saida || 'sem resposta').slice(0, 300) });
      if (/not logged in|\/login/i.test(String(j.result))) return resolve({ erro: 'O Claude Code não está conectado nesta máquina. Rode "claude auth login" num terminal.' });
      if (j.session_id) sessao.claude = j.session_id;
      resolve({ resposta: String(j.result || '').trim(), custo: j.total_cost_usd || 0 });
    });
  });
}

/* ---------------- cérebro 2: OpenRouter (atendimento) ---------------- */
function chamarOpenRouter(mensagens, tools) {
  return new Promise(resolve => {
    const corpo = JSON.stringify({ model: process.env.OPENROUTER_MODELO || 'anthropic/claude-sonnet-5',
                                   messages: mensagens, tools, tool_choice: tools ? 'auto' : undefined });
    const req = https.request('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'Authorization': 'Bearer ' + process.env.OPENROUTER_API,
        'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:' + PORT, 'X-Title': AGENTE.nome }
    }, r => { let s = ''; r.on('data', c => s += c); r.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { resolve({ error: { message: s.slice(0, 200) } }); } }); });
    req.on('error', e => resolve({ error: { message: e.message } }));
    req.end(corpo);
  });
}

async function perguntarOpenRouter(sessao, texto) {
  const tools = [{ type: 'function', function: { name: 'constituicao',
    description: 'Tudo sobre ' + (AGENTE.negocio || 'o negócio') + ': dados, serviços, preços, dúvidas frequentes, políticas e promoções. Consulte sempre que a resposta depender de informação do negócio.',
    parameters: { type: 'object', properties: {} } } }];
  sessao.historico.push({ role: 'user', content: texto });
  sessao.historico = sessao.historico.slice(-20);
  const msgs = [{ role: 'system', content: promptDeSistema() }, ...sessao.historico];
  for (let i = 0; i < 4; i++) {
    const r = await chamarOpenRouter(msgs, tools);
    if (r.error) return { erro: 'OpenRouter: ' + (r.error.message || 'erro') };
    const m = r.choices && r.choices[0] && r.choices[0].message;
    if (!m) return { erro: 'OpenRouter não respondeu' };
    if (m.tool_calls && m.tool_calls.length) {
      msgs.push(m);
      for (const tc of m.tool_calls) {
        log('ferramenta: ' + tc.function.name);
        msgs.push({ role: 'tool', tool_call_id: tc.id, content: ler('skills/constituicao.md', '[constituição vazia]') });
      }
      continue;
    }
    sessao.historico.push({ role: 'assistant', content: m.content || '' });
    return { resposta: String(m.content || '').trim() };
  }
  return { erro: 'o modelo não concluiu a resposta' };
}

const usaOpenRouter = () => !!process.env.OPENROUTER_API;
const perguntar = (sessao, texto) => usaOpenRouter() ? perguntarOpenRouter(sessao, texto) : perguntarClaudeCode(sessao, texto);

/* ---------------- páginas ---------------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ESTILO = `
  :root{--bg:#0a0c14;--card:#10131f;--line:#222941;--txt:#e8ecf7;--dim:#8b93ad;--acc:#7c6cff;--alt:#38bdf8;--ok:#23e08a;--warn:#ffb020}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.6 'Segoe UI',system-ui,sans-serif}
  .topo{display:flex;align-items:center;gap:14px;padding:14px 22px;border-bottom:1px solid var(--line);background:#0d1019}
  .topo h1{margin:0;font-size:17px} .topo .dim{color:var(--dim);font-size:12.5px}
  .topo a{color:var(--alt);text-decoration:none;margin-left:auto;font-size:13px}
  .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;padding:18px 22px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;min-width:0}
  .card h2{margin:0 0 8px;font-size:11px;letter-spacing:.9px;text-transform:uppercase;color:var(--dim)}
  .num{font-size:30px;font-weight:700;color:var(--alt);line-height:1.1} .num small{font-size:12px;color:var(--dim);font-weight:500;margin-left:6px}
  pre{margin:0;white-space:pre-wrap;font:12px/1.55 Consolas,ui-monospace,monospace;color:#9fe8c4;max-height:260px;overflow:auto}
  .bar{height:6px;background:#161a2c;border-radius:6px;overflow:hidden;margin-top:8px}.bar i{display:block;height:100%;background:var(--acc)}
  .tag{display:inline-block;font-size:10.5px;padding:2px 8px;border-radius:20px;background:rgba(124,108,255,.15);color:#c4b8ff;font-weight:700}
  .tag.ok{background:rgba(35,224,138,.14);color:var(--ok)}
  .chat{max-width:760px;margin:0 auto;padding:18px 22px;display:flex;flex-direction:column;height:calc(100vh - 64px)}
  .linhas{flex:1;overflow:auto;display:flex;flex-direction:column;gap:10px;padding-bottom:12px}
  .msg{max-width:84%;padding:10px 13px;border-radius:12px;white-space:pre-wrap} .msg.eu{align-self:flex-end;background:#2a1d4a;border:1px solid #3b3164}
  .msg.ele{align-self:flex-start;background:var(--card);border:1px solid var(--line)} .msg.erro{align-self:center;color:#ffd98a;background:rgba(255,176,32,.1);border:1px solid rgba(255,176,32,.35);font-size:12.5px}
  form{display:flex;gap:8px} input{flex:1;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:11px 13px;color:var(--txt);font:inherit}
  button{background:linear-gradient(135deg,#7c6cff,#9d8cff);border:0;border-radius:10px;color:#fff;padding:0 18px;font-weight:700;cursor:pointer} button:disabled{opacity:.5}`;

function paginaChat() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(AGENTE.nome)} · chat de teste</title><style>${ESTILO}</style></head><body>
<div class="topo"><h1>${esc(AGENTE.nome)}</h1><span class="dim">${esc(AGENTE.setor)} · chat de teste · cérebro: ${usaOpenRouter() ? 'OpenRouter' : 'Claude Code da máquina'}</span><a href="/painel">painel do dono →</a></div>
<div class="chat"><div class="linhas" id="l"><div class="msg erro">Este é o sandbox: converse com o agente como se fosse ${AGENTE.trilha === 'atendimento' ? 'um cliente' : 'o dono'}. Errar aqui custa um prompt.</div></div>
<form id="f"><input id="t" placeholder="Escreva e aperte Enter…" autocomplete="off" autofocus><button id="b">Enviar</button></form></div>
<script>
const l=document.getElementById('l'),t=document.getElementById('t'),b=document.getElementById('b');
const add=(c,x)=>{const d=document.createElement('div');d.className='msg '+c;d.textContent=x;l.appendChild(d);l.scrollTop=l.scrollHeight;return d};
document.getElementById('f').onsubmit=async e=>{e.preventDefault();const v=t.value.trim();if(!v)return;t.value='';add('eu',v);b.disabled=true;const p=add('ele','…');
try{const r=await (await fetch('/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({texto:v})})).json();
p.textContent=r.resposta||'';if(r.erro){p.className='msg erro';p.textContent=r.erro}}catch(x){p.className='msg erro';p.textContent='o agente não respondeu'}b.disabled=false;t.focus()};
</script></body></html>`;
}

function paginaPainel() {
  const pr = progresso();
  const linhas = tail(200);
  const hoje = new Date().toLocaleDateString('pt-BR');
  const tarefasHoje = linhas.filter(l => l.startsWith('[' + hoje)).length;
  const memoria = ler('memoria.md').split(/\r?\n/).filter(l => l.startsWith('- ')).slice(-8);
  const minutos = Math.floor((Date.now() - inicio) / 60000);
  const pct = pr.total ? Math.round(pr.passo / pr.total * 100) : 0;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(AGENTE.nome)} · painel</title><meta http-equiv="refresh" content="30"><style>${ESTILO}</style></head><body>
<div class="topo"><h1>${esc(AGENTE.nome)}</h1><span class="dim">${esc(AGENTE.setor)}${AGENTE.negocio ? ' · ' + esc(AGENTE.negocio) : ''}</span>
  <span class="tag ${pr.concluido ? 'ok' : ''}">${pr.concluido ? 'em serviço' : pr.portao ? 'portão aprovado' : 'em treinamento'}</span><a href="/">chat de teste →</a></div>
<div class="grade">
  <div class="card"><h2>No ar</h2><div class="num">${minutos >= 60 ? Math.floor(minutos / 60) + ' h' : minutos + ' min'}<small>porta ${PORT}</small></div></div>
  <div class="card"><h2>Registros hoje</h2><div class="num">${tarefasHoje}<small>linhas no log</small></div></div>
  <div class="card"><h2>Construção</h2><div class="num">${pr.passo}<small>de ${pr.total || '?'} passos</small></div><div class="bar"><i style="width:${pct}%"></i></div></div>
  <div class="card" style="grid-column:1/-1"><h2>Últimas tarefas e conversas</h2><pre>${esc(linhas.slice(-25).join('\n')) || '(nada registrado ainda)'}</pre></div>
  <div class="card" style="grid-column:1/-1"><h2>O que ele aprendeu (memoria.md)</h2><pre>${esc(memoria.join('\n')) || '(nada ainda — o escritório alimenta a cada conversa e reunião)'}</pre></div>
</div></body></html>`;
}

/* ---------------- servidor ---------------- */
http.createServer((req, res) => {
  const rota = req.url.split('?')[0];
  if (rota === '/saude') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: true, nome: AGENTE.nome, setor: AGENTE.setor, trilha: AGENTE.trilha,
      desde: new Date(inicio).toISOString(), cerebro: usaOpenRouter() ? 'openrouter' : 'claude-code', progresso: progresso() }));
  }
  if (rota === '/log') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(tail(200).join('\n'));
  }
  if (rota === '/painel') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(paginaPainel());
  }
  if (rota === '/chat' && req.method === 'POST') {
    let corpo = '';
    req.on('data', d => { corpo += d; if (corpo.length > 20000) req.destroy(); });
    req.on('end', async () => {
      let b = {}; try { b = JSON.parse(corpo || '{}'); } catch (e) {}
      const texto = String(b.texto || '').trim().slice(0, 4000);
      if (!texto) { res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end('{"erro":"mensagem vazia"}'); }
      const sessao = sessaoDe(req, res);
      const r = await perguntar(sessao, texto);
      log('conversa: "' + texto.slice(0, 80) + '" -> ' + (r.erro ? 'ERRO ' + r.erro : (r.resposta || '').slice(0, 120)));
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(r));
    });
    return;
  }
  if (rota === '/') {
    sessaoDe(req, res);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(paginaChat());
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404');
}).listen(PORT, '127.0.0.1', () => {
  log('servidor subiu na porta ' + PORT + ' (cérebro: ' + (usaOpenRouter() ? 'OpenRouter' : 'Claude Code') + ')');
  console.log(AGENTE.nome + ' -> http://localhost:' + PORT + '  (painel em /painel)');
});
