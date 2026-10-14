const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

/* O Cuki BOT pela API: o laudo é aberto, analisar é do administrador e roda
   solto; aqui sem o Claude (ESCRITORIO_CUKI_SEM_CLAUDE=1), só as medidas. */
const ROOT = path.join(__dirname, '..', '..');
const PORT = 4390;
const URL = 'http://127.0.0.1:' + PORT;
let DADOS, proc;
async function subir() {
  DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-dados-'));
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify({ exemplo: { nome: 'Exemplo', tipo: 'local', pasta: path.join(ROOT, 'exemplo-agente'), comando: 'node', args: ['server.js'], porta: 4489, trilha: 'tarefa' } }));
  proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ESCRITORIO_DADOS: DADOS, ESCRITORIO_SEM_VIGILIA: '1', ESCRITORIO_CUKI_SEM_CLAUDE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (let i = 0; i < 60; i++) { try { await fetch(URL + '/api/admin'); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  throw new Error('o escritório não subiu');
}
function derrubar() { try { proc.kill(); } catch (e) {} fs.rmSync(DADOS, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
const api = async (rota, metodo = 'GET', corpo, cookie) => {
  const r = await fetch(URL + rota, { method: metodo, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})), cookie: r.headers.get('set-cookie') };
};

test('Cuki BOT pela API: laudo aberto, analisar só com administrador, laudo gravado em data/cuki/laudos', async (t) => {
  await subir(); t.after(derrubar);
  const vazio = await api('/api/cuki/laudo');
  assert.equal(vazio.status, 200); assert.equal(vazio.json.ultimo, null); assert.equal(vazio.json.rodando, false);
  // sem senha definida o escritório é aberto; com senha, analisar pede administrador
  await api('/api/admin/senha', 'POST', { senha: 'teste123' });
  assert.equal((await api('/api/cuki/analisar', 'POST', {})).status, 403);
  const cookie = ((await api('/api/admin/entrar', 'POST', { senha: 'teste123' })).cookie || '').split(';')[0];
  const r = await api('/api/cuki/analisar', 'POST', {}, cookie);
  assert.equal(r.status, 202); assert.equal(r.json.rodando, true);
  let e;
  for (let i = 0; i < 50; i++) { await new Promise(x => setTimeout(x, 300)); e = (await api('/api/cuki/laudo')).json; if (!e.rodando && e.ultimo) break; }
  assert.ok(e.ultimo, 'o laudo apareceu');
  assert.ok(['verde', 'amarelo', 'vermelho'].includes(e.ultimo.geral));
  assert.equal(e.ultimo.areas.agentes.cor, 'vermelho', 'o exemplo está desligado: fora do ar');
  assert.equal(e.ultimo.areas.base.cor, 'amarelo', 'senha definida e Claude desta máquina; sem avisos e sem abertura');
  assert.match(e.ultimo.texto, /# Laudo do Cuki BOT/); assert.match(e.ultimo.texto, /Exemplo: fora do ar/);
  assert.equal(fs.readdirSync(path.join(DADOS, 'cuki', 'laudos')).length, 2, 'json + md');
  assert.ok(!JSON.stringify(e).includes('teste123'));
});
