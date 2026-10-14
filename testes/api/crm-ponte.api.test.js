const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

/* A ponte escritório ↔ CRM (sub-etapa 4c): a esteira move a ficha no CRM; o
   CRM avisa o escritório quando uma pessoa põe a ficha com um agente, e o
   escritório dispara o gatilho; a ação direta vai do CRM ao sistema do
   agente pelo escritório. CRM e agente falsos. */
const ROOT = path.join(__dirname, '..', '..');
const PORT = 4396;
const URL = 'http://127.0.0.1:' + PORT;
let DADOS, proc, crm, agente;
const falso = (handler) => new Promise(r => { const s = http.createServer((req, res) => { let b = ''; req.on('data', d => b += d); req.on('end', () => handler(req, res, b ? JSON.parse(b) : {})); }); s.listen(0, '127.0.0.1', () => r({ url: 'http://127.0.0.1:' + s.address().port, fechar: () => s.close(), porta: s.address().port })); });
async function subir() {
  DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-dados-'));
  crm = await falso((req, res, b) => { crm.pedidos.push({ metodo: req.method, url: req.url, auth: req.headers.authorization, corpo: b }); res.setHeader('Content-Type', 'application/json'); if (req.url === '/api/fichas' && req.method === 'POST') return res.end(JSON.stringify({ ok: true, ficha: { id: 'f-' + b.chave } })); if (/\/mover$/.test(req.url) && b.etapa === 'Concluído') { res.writeHead(400); return res.end('{"ok":false,"motivo":"etapa não existe"}'); } res.end('{"ok":true}'); }); crm.pedidos = [];
  agente = await falso((req, res, b) => { agente.pedidos.push({ metodo: req.method, url: req.url, chave: req.headers['x-chave'], corpo: b }); res.setHeader('Content-Type', 'application/json'); if (req.headers['x-chave'] !== 'gat-1') { res.writeHead(401); return res.end('x'); } if (req.url === '/saude') return res.end('{"ok":true}'); if (req.url === '/entidades') return res.end(JSON.stringify({ ok: true, entidades: [], resumo: {} })); if (req.url === '/gatilho') { res.writeHead(202); return res.end('{"ok":true}'); } if (req.url === '/ferramentas') return res.end(JSON.stringify({ ok: true, ferramentas: [{ nome: 'agenda', uso: ['node tools/agenda.js criar <quando> <título>'] }] })); if (req.url === '/acao') return res.end(JSON.stringify({ ok: true, modo: 'real', resultado: { estado: 'feito', detalhe: 'evento criado: ' + b.args.join(' ') } })); res.writeHead(404); res.end('{}'); }); agente.pedidos = [];
  const pasta = path.join(DADOS, 'ag-leo'); fs.mkdirSync(pasta); fs.writeFileSync(path.join(pasta, '.env'), 'GATILHO_CHAVE="gat-1"\n');
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify({ leo: { nome: 'Léo', tipo: 'local', pasta, comando: 'node', args: ['server.js'], porta: agente.porta, trilha: 'tarefa', setor: 'Prospecção' } }));
  fs.writeFileSync(path.join(DADOS, 'esteiras.json'), JSON.stringify({ esteiras: [{ id: 'tratamento', nome: 'Tratamento', entidade: { singular: 'paciente', plural: 'pacientes' }, pasta: '', vigiarPasta: false, etapas: [{ id: 'novo-contato', nome: 'Novo contato', agente: 'leo', entrega: '', aprovacao: 'nenhuma', aprovador: '' }, { id: 'cobrar', nome: 'Cobrar', agente: 'leo', entrega: '', aprovacao: 'nenhuma', aprovador: '' }], criadaEm: 'x' }] }));
  fs.writeFileSync(path.join(DADOS, 'crm.json'), JSON.stringify({ porta: crm.porta, url: crm.url, token: 't'.repeat(48), segredoEvento: 'seg-evento-1' }));
  proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ESCRITORIO_DADOS: DADOS, ESCRITORIO_SEM_VIGILIA: '1', ESCRITORIO_CUKI_SEM_RELOGIO: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (let i = 0; i < 60; i++) { try { await fetch(URL + '/api/admin'); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  throw new Error('o escritório não subiu');
}
function derrubar() { try { proc.kill(); } catch (e) {} crm.fechar(); agente.fechar(); fs.rmSync(DADOS, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
const api = async (rota, metodo = 'GET', corpo) => { const r = await fetch(URL + rota, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined }); return { status: r.status, json: await r.json().catch(() => ({})) }; };
const espera = (ms) => new Promise(r => setTimeout(r, ms));

test('ponte escritório ↔ CRM: esteira move a ficha; evento do CRM dispara a esteira; ação direta chega ao agente; segredo errado é 401', async (t) => {
  await subir(); t.after(derrubar);
  assert.equal((await api('/api/crm')).json.existe, true);
  // 1. a esteira entra e o escritório cria/move a ficha no CRM com o token do escritório
  const en = await api('/api/esteiras/tratamento/entrar', 'POST', { entidade: 'Padaria do João' }); assert.equal(en.status, 200, JSON.stringify(en.json));
  await espera(400);
  const cria = crm.pedidos.find(p => p.url === '/api/fichas'); assert.ok(cria, 'criou a ficha'); assert.equal(cria.corpo.chave, 'Padaria do João'); assert.equal(cria.auth, 'Bearer ' + 't'.repeat(48));
  const mv = crm.pedidos.find(p => /\/f-Padaria do João\/mover$/.test(decodeURIComponent(p.url))); assert.ok(mv, 'moveu a ficha'); assert.equal(mv.corpo.etapa, 'novo-contato');
  assert.ok(agente.pedidos.some(p => p.url === '/gatilho'), 'o gatilho do agente disparou');
  // 2. o CRM avisa que uma pessoa pôs outra ficha com o Léo na etapa Cobrar: a entidade entra na esteira direto nessa etapa, com o id da ficha
  assert.equal((await api('/api/crm/evento', 'POST', { segredo: 'errado', tipo: 'com-agente' })).status, 401);
  const ev = await api('/api/crm/evento', 'POST', { segredo: 'seg-evento-1', tipo: 'com-agente', acao: 'mover', ficha: { id: 'f9', chave: '65999', nome: 'Maria Souza' }, etapa: 'cobrar', etapaNome: 'Cobrar', agente: 'leo', por: 'Dra. Carla' });
  assert.equal(ev.json.ok, true, JSON.stringify(ev.json)); assert.equal(ev.json.etapa, 'Cobrar');
  const est = (await api('/api/esteiras')).json;
  const maria = (est.entidades || []).find(e => e.entidade === 'Maria Souza'); assert.ok(maria, 'Maria entrou na esteira'); assert.equal(maria.etapa, 1); assert.equal(maria.fichaId, 'f9'); assert.equal(maria.status, 'andando');
  assert.equal(agente.pedidos.filter(p => p.url === '/gatilho').length, 2);
  assert.equal((await api('/api/crm/evento', 'POST', { segredo: 'seg-evento-1', tipo: 'outro' })).json.ignorado, 'outro');
  // 3. ação direta: o CRM pede, o escritório repassa ao agente com a chave do gatilho
  const fe = await api('/api/crm/ferramentas', 'POST', { segredo: 'seg-evento-1', agente: 'leo' }); assert.equal(fe.json.ferramentas[0].nome, 'agenda');
  const ac = await api('/api/crm/acao', 'POST', { segredo: 'seg-evento-1', agente: 'leo', ferramenta: 'agenda', args: ['criar', 'amanhã 10h', 'avaliação'], entidade: '65999' });
  assert.equal(ac.json.ok, true); assert.equal(ac.json.resultado.detalhe, 'evento criado: criar amanhã 10h avaliação');
  const pedido = agente.pedidos.find(p => p.url === '/acao'); assert.equal(pedido.chave, 'gat-1'); assert.equal(pedido.corpo.entidade, '65999');
  assert.match((await api('/api/crm/acao', 'POST', { segredo: 'seg-evento-1', agente: 'ninguem', ferramenta: 'x', args: [] })).json.motivo, /desconhecido/);
});
