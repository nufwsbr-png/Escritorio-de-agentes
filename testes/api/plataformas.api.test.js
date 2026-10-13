const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const PORT = 4397;
const URL = 'http://127.0.0.1:' + PORT;

/* um escritório de teste: pasta de dados temporária com UM agente de trilha
   (pasta também temporária) e senha de administrador já definida */
let DADOS, pastaAgente, proc;
async function subir() {
  DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-dados-'));
  pastaAgente = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-agente-'));
  fs.writeFileSync(path.join(pastaAgente, '.env'), '# .env do agente de teste\r\nPAINEL_SENHA="x"\r\n');
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify({
    teste: { nome: 'Teste', tipo: 'local', pasta: pastaAgente, comando: 'node', args: ['server.js'], porta: 4499, trilha: 'tarefa', plataformas: [] },
    robo: { nome: 'Robô', tipo: 'local', pasta: pastaAgente, comando: 'node', args: ['x.js'], porta: 4498 }
  }, null, 2));
  proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ESCRITORIO_DADOS: DADOS }, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = ''; proc.stdout.on('data', d => saida += d); proc.stderr.on('data', d => saida += d);
  for (let i = 0; i < 50; i++) { try { await fetch(URL + '/api/admin'); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  throw new Error('o escritório não subiu: ' + saida);
}
function derrubar() {
  try { proc.kill(); } catch (e) {}
  fs.rmSync(DADOS, { recursive: true, force: true });
  fs.rmSync(pastaAgente, { recursive: true, force: true });
}
const api = async (rota, metodo = 'GET', corpo, cookie) => {
  const r = await fetch(URL + rota, { method: metodo, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})), cookie: r.headers.get('set-cookie') };
};

test('API de plataformas: sem admin não vaza valor nem grava; com admin cria, edita, permite e remove', async (t) => {
  await subir(); t.after(derrubar);

  // sem senha definida o escritório é aberto; definimos uma para testar a tranca
  const def = await api('/api/admin/senha', 'POST', { senha: 'teste123' });
  assert.equal(def.status, 200);
  const semSessao = await api('/api/plataformas', 'POST', { nome: 'Ophir', tipo: 'api', variaveis: { OPHIR_TOKEN: 'segredo-99' } });
  assert.equal(semSessao.status, 403); assert.equal(semSessao.json.precisaAdmin, true);

  const login = await api('/api/admin/entrar', 'POST', { senha: 'teste123' });
  const cookie = (login.cookie || '').split(';')[0];
  assert.match(cookie, /esc_admin=/);

  const cria = await api('/api/plataformas', 'POST', { nome: 'Ophir', tipo: 'api', url: 'https://app.ophir', variaveis: { OPHIR_URL: 'u', OPHIR_TOKEN: 'segredo-99' } }, cookie);
  assert.equal(cria.status, 200); assert.equal(cria.json.plataforma.id, 'ophir');
  const criaPasta = await api('/api/plataformas', 'POST', { nome: 'Drive', tipo: 'pasta', variaveis: { DRIVE_PASTA: 'C:\\clientes' } }, cookie);
  assert.equal(criaPasta.status, 200);

  const publica = await api('/api/plataformas');
  assert.equal(publica.status, 200);
  const txt = JSON.stringify(publica.json);
  assert.ok(!txt.includes('segredo-99') && !txt.includes('"valor"'), 'lista pública sem valores');
  assert.deepEqual(publica.json.plataformas.find(p => p.id === 'ophir').variaveis, ['OPHIR_URL', 'OPHIR_TOKEN']);
  assert.equal((await api('/api/plataformas/ophir')).status, 403, 'detalhe com valor exige admin');
  assert.equal((await api('/api/plataformas/ophir', 'GET', null, cookie)).json.variaveis.OPHIR_TOKEN, 'segredo-99');

  // permissão por agente: só a pasta
  const perm = await api('/api/agentes/teste/plataformas', 'PUT', { plataformas: ['drive'] }, cookie);
  assert.equal(perm.status, 200); assert.equal(perm.json.sincronizado, true);
  let env = fs.readFileSync(path.join(pastaAgente, '.env'), 'utf8');
  assert.match(env, /DRIVE_PASTA="C:\\clientes"/); assert.match(env, /PASTAS_AUTORIZADAS="C:\\clientes"/);
  assert.doesNotMatch(env, /OPHIR/); assert.match(env, /PAINEL_SENHA="x"\r\n/, 'resto preservado com CRLF');
  const estado = await api('/api/sistemas');
  assert.deepEqual(estado.json.find(s => s.id === 'teste').plataformas, ['drive']);

  // robô de fora: a permissão grava mas o .env não é tocado
  const permRobo = await api('/api/agentes/robo/plataformas', 'PUT', { plataformas: ['ophir'] }, cookie);
  assert.equal(permRobo.json.sincronizado, false);

  // editar o token muda o .env de quem tem a plataforma
  await api('/api/agentes/teste/plataformas', 'PUT', { plataformas: ['drive', 'ophir'] }, cookie);
  const edita = await api('/api/plataformas/ophir', 'PUT', { nome: 'Ophir', tipo: 'api', url: 'https://app.ophir', variaveis: { OPHIR_URL: 'u', OPHIR_TOKEN: 'novo-77' } }, cookie);
  assert.equal(edita.status, 200);
  env = fs.readFileSync(path.join(pastaAgente, '.env'), 'utf8');
  assert.match(env, /OPHIR_TOKEN="novo-77"/); assert.match(env, /SISTEMA_API_TOKEN="novo-77"/);

  // remover
  const rem = await api('/api/plataformas/ophir', 'DELETE', null, cookie);
  assert.equal(rem.status, 200); assert.ok(rem.json.usadaPor.includes('teste'));
  env = fs.readFileSync(path.join(pastaAgente, '.env'), 'utf8');
  assert.doesNotMatch(env, /OPHIR/); assert.match(env, /PLATAFORMAS_PERMITIDAS="drive"/);

  // contratar já com plataforma
  const contrata = await api('/api/contratar', 'POST', { nome: 'Novo Agente', setor: 'financeiro', negocio: 'Teste', porta: 4497, pasta: path.join(DADOS, 'novo-agente'), plataformas: ['drive'] }, cookie);
  assert.equal(contrata.status, 200); assert.equal(contrata.json.ok, true, contrata.json.motivo);
  assert.deepEqual(contrata.json.plataformas, ['drive']);
  const envNovo = fs.readFileSync(path.join(DADOS, 'novo-agente', '.env'), 'utf8');
  assert.match(envNovo, /PLATAFORMAS_PERMITIDAS="drive"/);
  assert.match(envNovo, /MODO_REAL="nao"/, 'o molde continua lá, fora do bloco');
});
