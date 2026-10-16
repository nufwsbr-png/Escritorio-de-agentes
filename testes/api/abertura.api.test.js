const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

/* A abertura na tela pela API: sem config.json as rotas são livres e a raiz leva a /abertura;
   depois de montar, só o administrador refaz (quem montou já recebe o cookie). Sem o Claude. */
const ROOT = path.join(__dirname, '..', '..');
const PORT = 4394;
const URL = 'http://127.0.0.1:' + PORT;
let DADOS, proc;
async function subir() {
  DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-abertura-'));
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), fs.readFileSync(path.join(ROOT, 'data', 'sistemas.exemplo.json')));
  proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ESCRITORIO_DADOS: DADOS, ESCRITORIO_SEM_VIGILIA: '1', ESCRITORIO_CUKI_SEM_RELOGIO: '1', ESCRITORIO_ABERTURA_SEM_CLAUDE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = ''; proc.stdout.on('data', d => saida += d); proc.stderr.on('data', d => saida += d);
  for (let i = 0; i < 50; i++) { try { await fetch(URL + '/api/admin'); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  throw new Error('o escritório não subiu: ' + saida);
}
function derrubar() { try { proc.kill(); } catch (e) {} fs.rmSync(DADOS, { recursive: true, force: true }); }
const api = async (rota, metodo = 'GET', corpo, cookie) => {
  const r = await fetch(URL + rota, { method: metodo, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})), cookie: (r.headers.get('set-cookie') || '').split(';')[0], location: r.headers.get('location') };
};

test('abertura pela API: raiz leva a /abertura sem config; estado, interpretar e montar livres; depois só o administrador', async (t) => {
  await subir(); t.after(derrubar);
  const raiz = await api('/');
  assert.equal(raiz.status, 302); assert.equal(raiz.location, '/abertura');
  assert.equal((await api('/?tela=1')).status, 200, 'com ?tela=1 a tela abre mesmo sem config');
  assert.equal((await api('/abertura')).status, 200);
  const est = await api('/api/abertura/estado');
  assert.equal(est.status, 200); assert.equal(est.json.aberto, false);
  assert.ok(est.json.ramos.length === 7 && est.json.tipos.api && est.json.estilo.opcoes.roupa.includes('jaleco'));
  const inter = await api('/api/abertura/interpretar', 'POST', { texto: 'Somos a Loja Bela, loja de roupas em Goiânia. A dona é a Marina. Vendemos pelo WhatsApp e pelo Instagram, controlamos o estoque numa planilha.' });
  assert.equal(inter.status, 200); assert.equal(inter.json.entendido.ramo, 'loja'); assert.equal(inter.json.entendido.empresa, 'Loja Bela'); assert.equal(inter.json.origem, 'palavras');
  assert.equal((await api('/api/abertura/interpretar', 'POST', { texto: 'oi' })).status, 400);
  const e = inter.json.entendido;
  const m = await api('/api/abertura/montar', 'POST', { ...e, estilo: { planta: 'compacta', roupa: 'casual' }, marca: { cor: '#ff00aa' } });
  assert.equal(m.status, 200, JSON.stringify(m.json)); assert.ok(m.json.senha && m.json.senha.length >= 12);
  assert.match(m.cookie, /esc_admin=/, 'quem montou já é administrador');
  assert.equal(m.json.planta.salas.length, 5); assert.ok(m.json.planta.salas.some(s => s.tipo === 'descanso'));
  assert.ok(fs.existsSync(path.join(DADOS, 'config.json')) && fs.existsSync(path.join(DADOS, 'planta.json')) && fs.existsSync(path.join(DADOS, 'admin.json')));
  const cfg = JSON.parse(fs.readFileSync(path.join(DADOS, 'config.json'), 'utf8'));
  assert.equal(cfg.ramo, 'loja'); assert.equal(cfg.estilo.roupa, 'casual'); assert.equal(cfg.marca.cores['acc-1'], '#ff00aa');
  // aberto: a raiz é a tela, e refazer exige o administrador (o cookie de quem montou serve)
  assert.equal((await api('/')).status, 200);
  assert.equal((await api('/api/abertura/estado')).json.aberto, true);
  assert.equal('conta' in (await api('/api/abertura/estado')).json.claude, false, 'com senha e sem cookie, o e-mail da conta do Claude não vaza');
  const semAdmin = await api('/api/abertura/montar', 'POST', { empresa: 'Outra' });
  assert.equal(semAdmin.status, 403); assert.equal(semAdmin.json.precisaAdmin, true);
  const comAdmin = await api('/api/abertura/montar', 'POST', { empresa: 'Loja Bela', ramo: 'loja', estilo: { planta: 'ampla' } }, m.cookie);
  assert.equal(comAdmin.status, 200); assert.equal(comAdmin.json.senha, null, 'a senha não vem de novo');
  assert.equal(JSON.parse(fs.readFileSync(path.join(DADOS, 'config.json'), 'utf8')).estilo.planta, 'ampla');
  // a tela recebe o estilo e os setores do negócio
  const cfgJs = await (await fetch(URL + '/config.js')).text();
  assert.ok(cfgJs.includes('Loja Bela'));
  const setores = (await api('/api/setores')).json.setores.map(s => s.nome);
  assert.ok(setores.includes('Vendas') && setores.includes('Estoque e logística'), JSON.stringify(setores));
});
