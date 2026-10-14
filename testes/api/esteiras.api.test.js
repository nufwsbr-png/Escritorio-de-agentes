const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

/* As rotas das esteiras: definir é do administrador; entrar, aprovar e devolver
   são de quem opera. O agente da etapa é um agente real criado pelo contratar,
   fora do ar: a entidade fica na fila e o estado aparece na tela. */
const ROOT = path.join(__dirname, '..', '..');
const PORT = 4392;
const URL = 'http://127.0.0.1:' + PORT;

let DADOS, pastaAgentes, proc;
async function subir() {
  DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-dados-'));
  pastaAgentes = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-agentes-'));
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), '{}');
  proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ESCRITORIO_DADOS: DADOS, ESCRITORIO_SEM_VIGILIA: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (let i = 0; i < 60; i++) { try { await fetch(URL + '/api/admin'); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  throw new Error('o escritório não subiu');
}
async function derrubar() {
  // o escritório ligou os agentes ao tentar o gatilho: desliga, espera os processos soltarem as pastas e só então apaga
  try { await fetch(URL + '/api/sistemas/tati/desligar', { method: 'POST' }); await fetch(URL + '/api/sistemas/leo/desligar', { method: 'POST' }); } catch (e) {}
  await new Promise(r => setTimeout(r, 800));
  try { proc.kill(); } catch (e) {}
  for (const p of [DADOS, pastaAgentes]) { try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch (e) { /* pasta temporária: o sistema limpa */ } }
}
const api = async (rota, metodo = 'GET', corpo, cookie) => {
  const r = await fetch(URL + rota, { method: metodo, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})), cookie: r.headers.get('set-cookie') };
};

test('API das esteiras: tranca do administrador para definir, operação aberta, entidade na fila com agente desligado', async (t) => {
  await subir(); t.after(derrubar);
  await api('/api/admin/senha', 'POST', { senha: 'teste123' });
  const cookie = ((await api('/api/admin/entrar', 'POST', { senha: 'teste123' })).cookie || '').split(';')[0];
  for (const [nome, porta] of [['Tati', 4485], ['Léo', 4486]]) {
    const r = await api('/api/contratar', 'POST', { nome, setor: 'financeiro', porta, pasta: path.join(pastaAgentes, nome.toLowerCase().replace('é', 'e')) }, cookie);
    assert.equal(r.json.ok, true, JSON.stringify(r.json));
  }
  assert.deepEqual((await api('/api/esteiras/agentes')).json.agentes.map(a => a.id).sort(), ['leo', 'tati']);

  const def = { nome: 'Processo novo', entidade: { singular: 'processo' }, etapas: [{ nome: 'Fechamento', agente: 'tati', entrega: 'pasta organizada' }, { nome: 'Petição', agente: 'leo', aprovacao: 'pessoa', aprovador: 'Ana' }] };
  const semAdmin = await api('/api/esteiras', 'POST', def);
  assert.equal(semAdmin.status, 403);
  const cria = await api('/api/esteiras', 'POST', def, cookie);
  assert.equal(cria.status, 200, JSON.stringify(cria.json)); assert.equal(cria.json.esteira.id, 'processo-novo');
  const ruim = await api('/api/esteiras', 'POST', { nome: 'X', etapas: [{ nome: 'E', agente: 'ninguem' }] }, cookie);
  assert.equal(ruim.status, 400);

  // entrar não exige administrador; o agente está desligado, então fica na fila (e o escritório tenta ligá-lo)
  const ent = await api('/api/esteiras/processo-novo/entrar', 'POST', { entidade: 'processo da cliente 1' });
  assert.equal(ent.status, 200, JSON.stringify(ent.json)); assert.equal(ent.json.estado.status, 'na fila');
  assert.equal((await api('/api/esteiras/processo-novo/entrar', 'POST', { entidade: '' })).status, 400);
  const tela = (await api('/api/esteiras')).json;
  assert.equal(tela.esteiras.length, 1); assert.equal(tela.esteiras[0].etapas[1].agenteNome, 'Léo');
  assert.equal(tela.entidades.length, 1); assert.equal(tela.entidades[0].entidade, 'processo da cliente 1');
  assert.ok(fs.existsSync(path.join(DADOS, 'esteiras', 'processo-novo', 'processo-da-cliente-1.json')), 'estado em data/esteiras/<esteira>/');
  assert.ok(!JSON.stringify(tela).match(/GATILHO_CHAVE|[0-9a-f]{32}/), 'a tela não vê chave');

  // aprovar e devolver só quando está esperando aprovação
  const ap = await api('/api/esteiras/processo-novo/' + encodeURIComponent('processo da cliente 1') + '/aprovar', 'POST', {});
  assert.equal(ap.status, 400); assert.match(ap.json.motivo, /não está esperando/);
  const dv = await api('/api/esteiras/processo-novo/' + encodeURIComponent('processo da cliente 1') + '/devolver', 'POST', { observacao: 'x' });
  assert.equal(dv.status, 400);
  assert.equal((await api('/api/esteiras/processo-novo/ninguem/aprovar', 'POST', {})).status, 400);

  // remover é do administrador
  assert.equal((await api('/api/esteiras/processo-novo', 'DELETE')).status, 403);
  assert.equal((await api('/api/esteiras/processo-novo', 'DELETE', null, cookie)).status, 200);
  assert.equal((await api('/api/esteiras/processo-novo', 'DELETE', null, cookie)).status, 404);
  assert.equal((await api('/api/esteiras')).json.esteiras.length, 0);
});
