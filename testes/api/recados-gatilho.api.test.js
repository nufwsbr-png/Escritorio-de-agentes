const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

/* Etapa 0 das esteiras: contratar grava id e GATILHO_CHAVE; o servidor do agente
   expõe /entidades com a chave; o escritório entrega recados pendentes ao lançador
   com ?entregar=1. O agente real (pasta criada pelo contratar) sobe de verdade. */
const ROOT = path.join(__dirname, '..', '..');
const PORT = 4393, PORTA_AGENTE = 4484;
const URL = 'http://127.0.0.1:' + PORT;

let DADOS, pastaAgentes, proc, procAgente;
async function esperar(url, cabecalhos) {
  for (let i = 0; i < 60; i++) { try { const r = await fetch(url, { headers: cabecalhos }); if (r.status) return r; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  throw new Error('não subiu: ' + url);
}
async function subir() {
  DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-dados-'));
  pastaAgentes = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-agentes-'));
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), '{}');
  proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ESCRITORIO_DADOS: DADOS }, stdio: ['ignore', 'pipe', 'pipe'] });
  await esperar(URL + '/api/admin');
}
function derrubar() {
  for (const p of [procAgente, proc]) { try { p && p.kill(); } catch (e) {} }
  fs.rmSync(DADOS, { recursive: true, force: true });
  fs.rmSync(pastaAgentes, { recursive: true, force: true });
}
const api = async (rota, metodo = 'GET', corpo, cookie) => {
  const r = await fetch(URL + rota, { method: metodo, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};

test('etapa 0: id e GATILHO_CHAVE no contratar, /entidades do agente com a chave, recados entregues ao lançador', async (t) => {
  await subir(); t.after(derrubar);
  await api('/api/admin/senha', 'POST', { senha: 'teste123' });
  const login = await fetch(URL + '/api/admin/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: 'teste123' }) });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];

  const pasta = path.join(pastaAgentes, 'tati');
  const r = await api('/api/contratar', 'POST', { nome: 'Tati', setor: 'financeiro', porta: PORTA_AGENTE, pasta }, cookie);
  assert.equal(r.json.ok, true, JSON.stringify(r.json));
  const aj = JSON.parse(fs.readFileSync(path.join(pasta, 'agente.json'), 'utf8'));
  assert.equal(aj.id, 'tati', 'agente.json sabe o próprio id');
  const env = fs.readFileSync(path.join(pasta, '.env'), 'utf8');
  const chave = (/^GATILHO_CHAVE="([0-9a-f]{32})"$/m.exec(env) || [])[1];
  assert.ok(chave, 'GATILHO_CHAVE nasce preenchida (32 hex) no .env');
  assert.ok(!JSON.stringify(r.json).includes(chave), 'a chave não volta na resposta da API');

  // o servidor do agente, de verdade, na pasta criada
  procAgente = spawn(process.execPath, ['server.js'], { cwd: pasta, env: { ...process.env, PORT: String(PORTA_AGENTE), ESCRITORIO_PORTA: String(PORT), AGENTE_ID: 'tati' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let saidaAg = ''; procAgente.stdout.on('data', d => saidaAg += d); procAgente.stderr.on('data', d => saidaAg += d);
  const saude = await esperar('http://127.0.0.1:' + PORTA_AGENTE + '/saude');
  assert.equal(saude.status, 200, saidaAg);
  const semChave = await fetch('http://127.0.0.1:' + PORTA_AGENTE + '/entidades');
  assert.equal(semChave.status, 401);
  const errada = await fetch('http://127.0.0.1:' + PORTA_AGENTE + '/entidades', { headers: { 'x-chave': 'x' } });
  assert.equal(errada.status, 401);
  const ok = await fetch('http://127.0.0.1:' + PORTA_AGENTE + '/entidades', { headers: { 'x-chave': chave } });
  assert.equal(ok.status, 200);
  const ent = await ok.json();
  assert.deepEqual(ent.entidades, []); assert.equal(ent.ok, true);

  // recados: o dono deixa dois; o lançador busca com entregar=1 e eles saem da fila
  assert.equal((await api('/api/agentes/tati/mensagens', 'POST', { texto: 'faltou o CPF na pasta' })).json.ok, true);
  assert.equal((await api('/api/agentes/tati/mensagens', 'POST', { texto: 'segue para você' })).json.ok, true);
  const caixa = await api('/api/agentes/tati/mensagens');
  assert.equal(caixa.json.mensagens.length, 2);
  const entrega = await api('/api/agentes/tati/mensagens?entregar=1');
  assert.equal(entrega.json.entregues, 2); assert.equal(entrega.json.mensagens[0].texto, 'faltou o CPF na pasta');
  const vazio = await api('/api/agentes/tati/mensagens?entregar=1');
  assert.equal(vazio.json.entregues, 0);
  assert.equal((await api('/api/agentes/tati/mensagens')).json.mensagens.length, 2, 'a caixa completa continua mostrando os dois');
});
