const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

/* O agente que aprende vendo, pela API: contratar com aprendizado "vendo",
   o estado do ensino, a tranca do administrador e "Tarefa concluída" sem
   demonstração. Nenhuma rodada do Claude Code é disparada aqui. */
const ROOT = path.join(__dirname, '..', '..');
const PORT = 4395;
const URL = 'http://127.0.0.1:' + PORT;

let DADOS, pastaAgentes, proc;
async function subir() {
  DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-dados-'));
  pastaAgentes = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-agentes-'));
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), '{}');
  proc = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ESCRITORIO_DADOS: DADOS }, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = ''; proc.stdout.on('data', d => saida += d); proc.stderr.on('data', d => saida += d);
  for (let i = 0; i < 50; i++) { try { await fetch(URL + '/api/admin'); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  throw new Error('o escritório não subiu: ' + saida);
}
function derrubar() {
  try { proc.kill(); } catch (e) {}
  fs.rmSync(DADOS, { recursive: true, force: true });
  fs.rmSync(pastaAgentes, { recursive: true, force: true });
}
const api = async (rota, metodo = 'GET', corpo, cookie) => {
  const r = await fetch(URL + rota, { method: metodo, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})), cookie: r.headers.get('set-cookie') };
};

test('aprende vendo: contratar grava o aprendizado, o ensino lista skills e a tranca vale', async (t) => {
  await subir(); t.after(derrubar);
  await api('/api/admin/senha', 'POST', { senha: 'teste123' });
  const cookie = ((await api('/api/admin/entrar', 'POST', { senha: 'teste123' })).cookie || '').split(';')[0];

  // o atendente não aprende vendo
  const errado = await api('/api/contratar', 'POST', { nome: 'Zé', setor: 'atendimento', porta: 4480, pasta: path.join(pastaAgentes, 'ze'), aprendizado: 'vendo' }, cookie);
  assert.equal(errado.json.ok, false); assert.match(errado.json.motivo, /atendente/);

  const r = await api('/api/contratar', 'POST', { nome: 'Tati', setor: 'sdr', negocio: 'Clínica X', porta: 4481, pasta: path.join(pastaAgentes, 'tati'), aprendizado: 'vendo' }, cookie);
  assert.equal(r.status, 200); assert.equal(r.json.ok, true, JSON.stringify(r.json));
  assert.equal(r.json.aprendizado, 'vendo');
  const aj = JSON.parse(fs.readFileSync(path.join(pastaAgentes, 'tati', 'agente.json'), 'utf8'));
  assert.equal(aj.aprendizado, 'vendo'); assert.equal(aj.trilha, 'tarefa');
  assert.match(r.json.sistema.sobre, /Aprende vendo/);
  const sis = await api('/api/sistemas');
  assert.equal(sis.json.find(s => s.id === 'tati').aprendizado, 'vendo');

  // sem aprendizado explícito, a anatomia
  const r2 = await api('/api/contratar', 'POST', { nome: 'Léo', setor: 'sdr', porta: 4482, pasta: path.join(pastaAgentes, 'leo') }, cookie);
  assert.equal(r2.json.aprendizado, 'anatomia');
  assert.match(r2.json.sistema.sobre, /Em construção/);

  // o estado do ensino: skills aprendidas excluem a referência da trilha; escopo sem valor
  const e = await api('/api/agentes/tati/ensino');
  assert.equal(e.status, 200); assert.equal(e.json.ok, true);
  assert.deepEqual(e.json.skills, []); assert.deepEqual(e.json.demonstracoes, []); assert.equal(e.json.aprendizado, 'vendo');
  assert.equal(e.json.conversa.ensino, null);
  fs.mkdirSync(path.join(pastaAgentes, 'tati', '.claude', 'skills', 'organizar-notas'), { recursive: true });
  fs.writeFileSync(path.join(pastaAgentes, 'tati', '.claude', 'skills', 'organizar-notas', 'SKILL.md'), '---\nname: organizar-notas\ndescription: Move as notas do mês.\n---\n');
  const e2 = await api('/api/agentes/tati/ensino');
  assert.deepEqual(e2.json.skills.map(s => s.id), ['organizar-notas']);
  assert.equal((await api('/api/agentes/ninguem/ensino')).status, 404);

  // a tranca: ensinar, concluir e limpar o canal de ensino pedem administrador
  const semAdmin = await api('/api/agentes/tati/chat?canal=ensino', 'POST', { texto: 'mova os PDFs', modo: 'ensinar' });
  assert.equal(semAdmin.status, 403); assert.equal(semAdmin.json.precisaAdmin, true);
  assert.equal((await api('/api/agentes/tati/ensinar/concluir', 'POST', { nome: 'x' })).status, 403);
  assert.equal((await api('/api/agentes/tati/limpar?canal=ensino', 'POST')).status, 403);

  // concluir sem demonstração: erro claro, nenhuma rodada
  const nada = await api('/api/agentes/tati/ensinar/concluir', 'POST', { nome: 'x' }, cookie);
  assert.equal(nada.status, 400); assert.match(nada.json.motivo, /demonstra/);
  assert.equal(fs.existsSync(path.join(pastaAgentes, 'tati', 'ensino')), false, 'nada gravado em ensino/ sem demonstração');

  // o canal de ensino é separado do normal, e GET não exige administrador
  const normal = await api('/api/agentes/tati/chat');
  const ens = await api('/api/agentes/tati/chat?canal=ensino');
  assert.equal(normal.status, 200); assert.equal(ens.status, 200);
  assert.equal(ens.json.destilando, false); assert.deepEqual(ens.json.historico, []);
});
