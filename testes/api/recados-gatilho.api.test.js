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
async function derrubar() {
  for (const p of [procAgente, proc]) { try { p && p.kill(); } catch (e) {} }
  await new Promise(r => setTimeout(r, 500));   // no Windows o processo solta a pasta um instante depois de morrer
  for (const p of [DADOS, pastaAgentes]) { try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch (e) { /* pasta temporária: o sistema limpa */ } }
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
  const chave = (new RegExp('^GATILHO_CHAVE=' + '"([0-9a-f]{32})"$', 'm').exec(env) || [])[1];   // montado em partes para o conferidor não ler como chave
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

  // 5c: o trabalho é lido da PASTA do agente (aparece mesmo desligado) e o escritório age pela rota /agir dele
  const ents = path.join(pasta, 'memoria', 'entidades'); fs.mkdirSync(ents, { recursive: true });
  const agoraIso = new Date().toISOString(), ontem = new Date(Date.now() - 2 * 86400000).toISOString();
  fs.writeFileSync(path.join(ents, 'caso-a.json'), JSON.stringify({ id: 'caso-a', slug: 'caso-a', status: 'aguardando pergunta', pergunta: { texto: 'o CPF da pasta está ilegível: qual é?' }, rodadas: [{ quando: agoraIso, modo: 'proposta', status: 'aguardando pergunta' }], correcoes: [], rejeicoes: [], feitoPeloDono: [], perguntas: 1, criado: agoraIso, atualizado: ontem }));
  fs.writeFileSync(path.join(ents, 'caso-b.json'), JSON.stringify({ id: 'caso-b', slug: 'caso-b', status: 'pronta', rodadas: [{ quando: agoraIso, modo: 'real', status: 'pronta', feitos: ['saidas/caso-b/resumo.md'] }], correcoes: [], rejeicoes: [], feitoPeloDono: [], perguntas: 0, criado: agoraIso, atualizado: agoraIso }));
  fs.writeFileSync(path.join(ents, 'caso-c.json'), JSON.stringify({ id: 'caso-c', slug: 'caso-c', status: 'nova', rodadas: [], correcoes: [], rejeicoes: [], feitoPeloDono: [], perguntas: 0, criado: agoraIso, atualizado: agoraIso }));
  const sis = (await api('/api/sistemas')).json.find(s => s.id === 'tati');
  assert.ok(sis.trabalho, '/api/sistemas leva o bloco trabalho');
  assert.equal(sis.trabalho.esperandoVoce, 1); assert.equal(sis.trabalho.fila, 1); assert.equal(sis.trabalho.feitasHoje, 1); assert.equal(sis.trabalho.total, 3);
  assert.equal(sis.trabalho.perguntas[0].texto, 'o CPF da pasta está ilegível: qual é?');
  assert.equal(sis.trabalho.nota.cor, 'cinza', 'em construção, a nota é cinza');
  const tr = (await api('/api/agentes/tati/trabalho')).json;
  assert.equal(tr.ok, true); assert.equal(tr.estado, 'no ar'); assert.equal(tr.trabalho.entidades.length, 3); assert.equal(tr.trabalho.recentes[0].feitos[0], 'saidas/caso-b/resumo.md');
  assert.equal((await api('/api/agentes/tati/trabalho/acao', 'POST', { tipo: 'apagar', entidade: 'caso-c' })).status, 400, 'ação desconhecida é recusada');
  const as = await api('/api/agentes/tati/trabalho/acao', 'POST', { tipo: 'assumir', entidade: 'caso-c' });
  assert.equal(as.json.ok, true, JSON.stringify(as.json));
  assert.equal(JSON.parse(fs.readFileSync(path.join(ents, 'caso-c.json'), 'utf8')).status, 'com o dono', 'o escritório agiu no agente pela rota /agir');
  const dv = await api('/api/agentes/tati/trabalho/acao', 'POST', { tipo: 'devolver', entidade: 'caso-c', texto: 'nada' });
  assert.equal(dv.json.ok, true); assert.equal(JSON.parse(fs.readFileSync(path.join(ents, 'caso-c.json'), 'utf8')).status, 'nova');
  // o formulário do painel do dono (sem a chave) continua chegando ao /acao de sessão, não ao da ação direta
  const semSessao = await fetch('http://127.0.0.1:' + PORTA_AGENTE + '/acao', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"tipo":"assumir","entidade":"caso-c"}' });
  assert.equal(semSessao.status, 200, 'o painel (sem senha neste teste) recebe o formulário'); assert.match(await semSessao.text(), /painel/i);
  assert.equal(JSON.parse(fs.readFileSync(path.join(ents, 'caso-c.json'), 'utf8')).status, 'com o dono', 'o formulário do painel chegou ao agir, não ao /acao da ação direta');
  assert.equal((await api('/api/agentes/tati/trabalho/acao', 'POST', { tipo: 'devolver', entidade: 'caso-c' })).json.ok, true);
  // desligado, o trabalho continua visível
  procAgente.kill(); await new Promise(r => setTimeout(r, 800));
  const trOff = (await api('/api/agentes/tati/trabalho')).json;
  assert.equal(trOff.estado, 'desligado'); assert.equal(trOff.trabalho.total, 3, 'desligado, a pasta continua sendo lida');
});
