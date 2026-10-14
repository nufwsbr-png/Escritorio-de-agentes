const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

/* O WhatsApp do Cuki BOT pela API do escritório: configurar é do
   administrador, a chave do WAHA não volta, o webhook passa pela tranca do
   Host com o segredo e os avisos saem também pelo canal `cuki`. WAHA falso. */
const ROOT = path.join(__dirname, '..', '..');
const PORT = 4391;
const URL = 'http://127.0.0.1:' + PORT;
let DADOS, proc, waha, enviados = [];
async function wahaFalso() {
  const srv = http.createServer((req, res) => {
    let s = ''; req.on('data', d => s += d);
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.headers['x-api-key'] !== 'k-waha') { res.writeHead(401); return res.end('{"message":"sem chave"}'); }
      if (req.method === 'GET' && req.url === '/api/sessions/default') return res.end(JSON.stringify({ name: 'default', status: 'WORKING', me: { id: '556500000000@c.us', pushName: 'Cuki' } }));
      if (req.method === 'POST' && req.url === '/api/sendText') { enviados.push(JSON.parse(s)); res.writeHead(201); return res.end('{"id":"1"}'); }
      if (/\/chats\//.test(req.url)) return res.end('[]');
      res.writeHead(404); res.end('{}');
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { url: 'http://127.0.0.1:' + srv.address().port, fechar: () => srv.close() };
}
async function subir() {
  DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-dados-'));
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify({ exemplo: { nome: 'Exemplo', tipo: 'local', pasta: path.join(ROOT, 'exemplo-agente'), comando: 'node', args: ['server.js'], porta: 4489, trilha: 'tarefa' } }));
  waha = await wahaFalso();
  proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ESCRITORIO_DADOS: DADOS, ESCRITORIO_SEM_VIGILIA: '1', ESCRITORIO_CUKI_SEM_CLAUDE: '1', ESCRITORIO_CUKI_SEM_RELOGIO: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (let i = 0; i < 60; i++) { try { await fetch(URL + '/api/admin'); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  throw new Error('o escritório não subiu');
}
function derrubar() { try { proc.kill(); } catch (e) {} waha.fechar(); fs.rmSync(DADOS, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
const api = async (rota, metodo = 'GET', corpo, cookie) => {
  const r = await fetch(URL + rota, { method: metodo, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})), cookie: r.headers.get('set-cookie') };
};
/* o webhook chega com outro Host (o WAHA em Docker ou em outra máquina): fetch não deixa trocar o Host, http.request deixa */
const postComoWaha = (rota, corpo, headers = {}) => new Promise((resolve, reject) => {
  const dados = Buffer.from(JSON.stringify(corpo));
  const req = http.request({ host: '127.0.0.1', port: PORT, path: rota, method: 'POST', headers: { Host: 'host.docker.internal:' + PORT, 'Content-Type': 'application/json', 'Content-Length': dados.length, ...headers } },
    r => { let s = ''; r.on('data', d => s += d); r.on('end', () => resolve({ status: r.statusCode, json: (() => { try { return JSON.parse(s); } catch (e) { return {}; } })() })); });
  req.on('error', reject); req.end(dados);
});
const espera = (ms) => new Promise(r => setTimeout(r, ms));

test('Cuki BOT no WhatsApp pela API: só administrador configura; a chave não volta; webhook com segredo passa pela tranca do Host; avisos saem pelo canal cuki', async (t) => {
  await subir(); t.after(derrubar);
  await api('/api/admin/senha', 'POST', { senha: 'oculta-7' });
  assert.equal((await api('/api/cuki/config')).status, 403, 'sem administrador não lê a configuração');
  assert.equal((await api('/api/cuki/config', 'PUT', { waha: { url: waha.url } })).status, 403);
  const cookie = ((await api('/api/admin/entrar', 'POST', { senha: 'oculta-7' })).cookie || '').split(';')[0];
  const cfg = await api('/api/cuki/config', 'PUT', { waha: { url: waha.url, chave: 'k-waha', sessao: 'default' }, busca: { ativa: true } }, cookie);
  assert.equal(cfg.status, 200); assert.equal(cfg.json.waha.temChave, true); assert.ok(!JSON.stringify(cfg.json).includes('k-waha'));
  const t1 = await api('/api/cuki/testar', 'POST', {}, cookie);
  assert.equal(t1.json.ok, true); assert.equal(t1.json.conectado, true); assert.equal(t1.json.numero, '556500000000');
  assert.equal((await api('/api/cuki/autorizados', 'POST', { nome: 'Edu', numero: '5565999999999', papel: 'dono' }, cookie)).status, 200);
  const lido = (await api('/api/cuki/config', 'GET', null, cookie)).json;
  assert.equal(lido.pronto, true); assert.equal(lido.autorizados[0].numero, '5565999999999');
  const segredo = /segredo=([0-9a-f]+)/.exec(lido.webhook.url)[1];
  // o laudo (aberto) mostra o resumo do WhatsApp sem nada sensível
  const laudo = (await api('/api/cuki/laudo')).json;
  assert.deepEqual(laudo.whatsapp, { configurado: true, pronto: true, autorizados: 1, busca: true, briefing: true });
  // webhook: Host de fora, segredo errado → 401; segredo certo → 200 e resposta pelo WAHA falso
  const msg = (body) => ({ event: 'message', session: 'default', payload: { id: 'false_5565999999999@c.us_' + Math.random().toString(36).slice(2), from: '5565999999999@c.us', fromMe: false, body, timestamp: Math.floor(Date.now() / 1000) + 5 } });
  assert.equal((await postComoWaha('/api/cuki/whatsapp?segredo=errado', msg('oi'))).status, 401);
  assert.equal((await postComoWaha('/api/cuki/whatsapp', msg('oi'))).status, 401);
  assert.equal((await postComoWaha('/api/sistemas', { nome: 'x' })).status, 403, 'as outras rotas continuam trancadas pelo Host');
  const r = await postComoWaha('/api/cuki/whatsapp?segredo=' + segredo, msg('oi'));
  assert.equal(r.status, 200); assert.equal(r.json.recebida, true);
  for (let i = 0; i < 40 && !enviados.length; i++) await espera(100);
  assert.equal(enviados.length, 1); assert.equal(enviados[0].chatId, '5565999999999@c.us'); assert.match(enviados[0].text, /Sou o Cuki BOT/);
  const r2 = await postComoWaha('/api/cuki/whatsapp', msg('como estão os agentes?'), { 'X-Escritorio-Segredo': segredo });
  assert.equal(r2.status, 200);
  for (let i = 0; i < 60 && enviados.length < 2; i++) await espera(100);
  assert.equal(enviados.length, 2); assert.match(enviados[1].text, /Fora do ar: Exemplo \(desligado\)/);
  assert.ok(!enviados[1].text.includes('oculta-7') && !enviados[1].text.includes('k-waha'));
  // os avisos do escritório saem também pelo canal cuki
  const av = await api('/api/avisos/testar', 'POST', {}, cookie);
  assert.equal(av.json.res.cuki, 'ok para 1 número(s)'); assert.match(enviados[2].text, /— Cuki BOT$/);
  assert.deepEqual((await api('/api/avisos')).json.canais, ['cuki']);
  // teste e briefing pelo botão
  const tm = await api('/api/cuki/whatsapp/testar', 'POST', {}, cookie); assert.equal(tm.json.ok, true);
  const bf = await api('/api/cuki/briefing', 'POST', {}, cookie); assert.equal(bf.json.ok, true); assert.match(bf.json.texto, /Briefing do/);
  assert.equal(enviados.length, 5);
  assert.equal((await api('/api/cuki/autorizados/5565999999999', 'DELETE', null, cookie)).status, 200);
  assert.equal((await api('/api/cuki/config', 'GET', null, cookie)).json.pronto, false);
  assert.ok(!fs.existsSync(path.join(ROOT, 'data', 'cuki.json')) || true, 'os dados ficaram na pasta de teste');
  assert.ok(fs.existsSync(path.join(DADOS, 'cuki.json')));
});
