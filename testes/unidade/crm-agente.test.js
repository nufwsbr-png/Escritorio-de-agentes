const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

/* O lado do agente no CRM (sub-etapa 4c), com um CRM FALSO: tools/crm.js
   manda o modo no cabeçalho e traduz as respostas; o lançador puxa o estado
   da ficha antes da rodada e empurra depois; /acao roda uma ferramenta na
   hora, por código. Tudo no agente de exemplo, sem mexer nele. */
const ROOT = path.join(__dirname, '..', '..');
const EXEMPLO = path.join(ROOT, 'exemplo-agente');
async function crmFalso() {
  const w = { pedidos: [], fichas: { '65999990001': { id: 'f1', chave: '65999990001', etapa: 'novo-contato', status: 'ativa', responsavel: { tipo: 'agente', id: 'exemplo' }, campos: { nome: 'João', cpf: '***' }, agentes: {}, historico: [], propostas: [], tarefas: [{ titulo: 'confirmar endereço', feita: null, para: { tipo: 'agente', id: 'exemplo' } }] } }, estados: [] };
  const srv = http.createServer((req, res) => {
    let s = ''; req.on('data', d => s += d);
    req.on('end', () => {
      w.pedidos.push({ metodo: req.method, url: req.url, auth: req.headers.authorization, modo: req.headers['x-modo'], corpo: s ? JSON.parse(s) : null });
      const j = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (req.headers.authorization !== 'Bearer ' + 'a'.repeat(48)) return j(401, { ok: false, motivo: 'token' });
      const u = new URL(req.url, 'http://x');
      if (u.pathname === '/api/config') return j(200, { ok: true, entidade: { singular: 'paciente' }, etapas: [{ id: 'novo-contato', nome: 'Novo contato', responsavel: { tipo: 'agente', id: 'exemplo' } }, { id: 'avaliacao', nome: 'Avaliação', aprovacao: true }], autonomia: 'b' });
      let m = /^\/api\/fichas\/([^/]+)$/.exec(u.pathname);
      if (m && req.method === 'GET') { const f = w.fichas[decodeURIComponent(m[1])] || Object.values(w.fichas).find(x => x.id === m[1]); return f ? j(200, { ok: true, ficha: f }) : j(404, { ok: false, motivo: 'ficha não encontrada' }); }
      if (u.pathname === '/api/fichas' && req.method === 'GET') return j(200, { ok: true, fichas: Object.values(w.fichas) });
      if (u.pathname === '/api/fichas' && req.method === 'POST') { const c = JSON.parse(s); if (w.fichas[c.chave]) return j(200, { ok: true, existente: true, ficha: w.fichas[c.chave] }); const f = { id: 'f' + (Object.keys(w.fichas).length + 1), chave: c.chave, etapa: 'novo-contato', status: 'ativa', campos: c.campos || {}, agentes: {} }; w.fichas[c.chave] = f; return j(200, { ok: true, ficha: f }); }
      m = /^\/api\/fichas\/([^/]+)\/agente$/.exec(u.pathname);
      if (m) { w.estados.push(JSON.parse(s).estado); return j(200, { ok: true }); }
      m = /^\/api\/fichas\/([^/]+)\/(anotar|mover|campo|mensagem)$/.exec(u.pathname);
      if (m) { const f = w.fichas[m[1]] || Object.values(w.fichas).find(x => x.id === m[1]); if (!f) return j(404, { ok: false, motivo: 'ficha não encontrada' }); if (f.responsavel && f.responsavel.tipo === 'pessoa') return j(409, { ok: false, motivo: 'com uma pessoa: Ana está com esta ficha', comPessoa: true }); const modo = req.headers['x-modo']; if (modo === 'ensaio') return j(200, { ok: true, ensaio: true, motivo: 'em ensaio: faria ' + m[2] }); if (modo === 'proposta' || m[2] === 'mensagem' || (m[2] === 'mover' && JSON.parse(s).etapa === 'avaliacao')) return j(200, { ok: true, proposta: true, id: 'p1', motivo: 'virou proposta pendente: pede uma pessoa' }); return j(200, { ok: true, feito: m[2] + ' ok', ficha: { id: f.id, etapa: f.etapa, responsavel: f.responsavel } }); }
      if (u.pathname === '/api/tarefas' && req.method === 'POST') return j(200, { ok: true, proposta: true, id: 'p2', motivo: 'virou proposta pendente: tarefa para uma pessoa' });
      j(404, { ok: false, motivo: 'rota falsa: ' + req.method + ' ' + u.pathname });
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  w.url = 'http://127.0.0.1:' + srv.address().port; w.fechar = () => srv.close();
  return w;
}
const ENV = (w, extra = {}) => ({ ...process.env, CRM_URL: w.url, CRM_TOKEN: 'a'.repeat(48), PLATAFORMAS_PERMITIDAS: 'crm', AGENTE_ID: 'exemplo', ...extra });
/* assíncrono: o CRM falso vive neste processo, e spawnSync travaria o laço de eventos (ele nunca responderia) */
const tool = (w, args, extra) => new Promise(resolve => { const p = spawn(process.execPath, ['tools/crm.js', ...args], { cwd: EXEMPLO, env: ENV(w, extra) }); let out = '', err = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => err += d); p.on('exit', (status) => { let j = null; try { j = JSON.parse(out.trim().split(/\r?\n/).pop()); } catch (e) {} resolve({ j, saida: out + err, status }); }); });

test('tools/crm.js: sem a plataforma recusa; com ela lê, cria sem duplicar, anota direto, e traduz proposta, ensaio e "com uma pessoa"', async (t) => {
  const w = await crmFalso(); t.after(w.fechar);
  const sem = await tool(w, ['ficha', '65999990001'], { PLATAFORMAS_PERMITIDAS: '' });
  assert.equal(sem.j.estado, 'recusado'); assert.match(sem.j.detalhe, /plataforma não permitida/);
  assert.equal((await tool(w, [])).j.estado, 'erro');
  const et = (await tool(w, ['etapas'], { MODO_RODADA: 'real' })).j; assert.equal(et.estado, 'feito'); assert.equal(et.etapas.length, 2); assert.equal(et.etapas[1].pedePessoa, true);
  const f = (await tool(w, ['ficha', '65999990001'], { MODO_RODADA: 'real' })).j; assert.equal(f.estado, 'feito'); assert.equal(f.ficha.id, 'f1'); assert.deepEqual(f.ficha.tarefasAbertas, ['confirmar endereço']);
  assert.equal((await tool(w, ['ficha', '000'], { MODO_RODADA: 'real' })).j.estado, 'recusado');
  const c = (await tool(w, ['criar', '65999990001', '{"nome":"João"}'], { MODO_RODADA: 'real' })).j; assert.equal(c.existente, true); assert.match(c.detalhe, /já existia/);
  const c2 = (await tool(w, ['criar', '65999990002', '{"nome":"Maria"}'], { MODO_RODADA: 'real' })).j; assert.equal(c2.estado, 'feito'); assert.equal(c2.ficha.id, 'f2');
  assert.equal((await tool(w, ['criar', '65999990003', 'não é json'], { MODO_RODADA: 'real' })).j.estado, 'erro');
  const a = (await tool(w, ['anotar', '65999990001', 'ligou de manhã'], { MODO_RODADA: 'real' })).j; assert.equal(a.estado, 'feito'); assert.equal(a.detalhe, 'anotar ok');
  const mv = (await tool(w, ['mover', '65999990001', 'avaliacao'], { MODO_RODADA: 'real' })).j; assert.equal(mv.estado, 'feito'); assert.match(mv.detalhe, /PROPOSTA pendente/); assert.equal(mv.proposta, 'p1');
  const en = (await tool(w, ['mover', '65999990001', 'novo-contato'], { MODO_RODADA: 'ensaio' })).j; assert.equal(en.ensaio, true);
  const pr = (await tool(w, ['anotar', '65999990001', 'x'], { MODO_RODADA: 'proposta' })).j; assert.match(pr.detalhe, /PROPOSTA/);
  const tf = (await tool(w, ['tarefa', '65999990001', 'confirmar', '2026-10-20'], { MODO_RODADA: 'real' })).j; assert.match(tf.detalhe, /PROPOSTA/);
  w.fichas['65999990001'].responsavel = { tipo: 'pessoa', id: 'ana' };
  const bl = (await tool(w, ['anotar', '65999990001', 'x'], { MODO_RODADA: 'real' })).j; assert.equal(bl.estado, 'recusado'); assert.match(bl.detalhe, /com uma pessoa/);
  assert.ok(w.pedidos.every(p => p.auth === 'Bearer ' + 'a'.repeat(48)), 'o token vai em toda chamada');
  assert.deepEqual([...new Set(w.pedidos.map(p => p.modo))].sort(), ['ensaio', 'proposta', 'real'], 'o modo da rodada vai no cabeçalho');
});

test('o lançador: puxa o estado da ficha (se mais novo), para quando a ficha está com uma pessoa, segue sem ficha, e empurra ao gravar', async (t) => {
  const w = await crmFalso(); t.after(w.fechar);
  for (const [k, v] of Object.entries(ENV(w, { MODO_RODADA: 'real' }))) process.env[k] = v;
  const rodar = require(path.join(EXEMPLO, 'rodar.js'));
  const base = require(path.join(EXEMPLO, 'agente-base.js'));
  assert.equal(base.crmConfigurado(), true);
  const e = rodar.estadoDe('65999990001');
  w.fichas['65999990001'].agentes.exemplo = { status: 'aguardando pergunta', pergunta: { texto: 'qual plano?' }, rodadas: [{ modo: 'real' }], atualizado: '2999-01-01T00:00:00Z' };
  w.fichas['65999990001'].feitoPeloDono = [{ quando: 'x', por: 'Dra. Carla', texto: 'já liguei' }];
  const s = await rodar.sincronizarDoCrm(e);
  assert.equal(s.ok, true); assert.equal(e.fichaId, 'f1'); assert.equal(e.status, 'aguardando pergunta', 'o estado mais novo da ficha vence'); assert.equal(e.feitoPeloDono[0].texto, 'Dra. Carla: já liguei');
  assert.match(rodar.textoCrm(s.ficha), /FICHA NO CRM.*id f1.*etapa "novo-contato"/); assert.match(rodar.textoCrm(s.ficha), /TAREFAS PARA VOCÊ NO CRM.*confirmar endereço/); assert.ok(!/\*\*\*/.test('') );
  w.fichas['65999990001'].responsavel = { tipo: 'pessoa', id: 'ana' };
  const s2 = await rodar.sincronizarDoCrm(e); assert.equal(s2.ok, false); assert.equal(s2.comPessoa, true);
  const s3 = await rodar.sincronizarDoCrm(rodar.estadoDe('sem-ficha-nenhuma')); assert.equal(s3.ok, true); assert.equal(s3.semFicha, true);
  // gravar empurra o estado para a ficha (fire and forget, com aguardarCrm para os testes)
  const antes = w.estados.length;
  const r = await rodar.rodar('65999990001', {});   // com uma pessoa: não roda, mas grava e empurra
  assert.equal(r.ok, false); assert.equal(r.comPessoa, true);
  await rodar.aguardarCrm();
  assert.ok(w.estados.length > antes, 'o estado foi empurrado'); assert.equal(w.estados[w.estados.length - 1].id, '65999990001');
  fs.rmSync(path.join(EXEMPLO, 'memoria', 'entidades', '65999990001.json'), { force: true });
  assert.equal(rodar.textoCrm(null), '');
  assert.match(rodar.textoCrm(s.ficha), /FEITO NO CRM/);
  // a pós-verificação no CRM: FEITO NO CRM sem registro no histórico reprova; com registro do agente depois do começo, aprova
  const i = rodar.interpretar('FEITO: x.md\nFEITO NO CRM: anotei a ficha\nPERGUNTA: nada?');
  assert.deepEqual(i.feitos, ['x.md']); assert.deepEqual(i.feitosCrm, ['anotei a ficha']);
  assert.equal((await rodar.verificarCrm(e, [], 'x')).ok, true);
  const desde = new Date(Date.now() - 1000).toISOString();
  const v1 = await rodar.verificarCrm(e, ['anotei'], desde); assert.equal(v1.ok, false); assert.match(v1.faltando[0], /não registra nada seu/);
  w.fichas['65999990001'].historico.push({ quando: new Date().toISOString(), autor: { tipo: 'agente', id: 'exemplo', nome: 'Exemplo' }, tipo: 'proposta', texto: 'propôs: anotar' });
  assert.equal((await rodar.verificarCrm(e, ['anotei'], desde)).ok, true);
});

test('/acao no sistema do agente: com a chave do gatilho roda uma ferramenta na hora (proposta sem MODO_REAL) e /ferramentas lista com o uso', async (t) => {
  const PORT = 4571;
  const proc = spawn(process.execPath, ['server.js'], { cwd: EXEMPLO, env: { ...process.env, PORT: String(PORT), GATILHO_CHAVE: 'gat-teste-1', MODO_REAL: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { try { proc.kill(); } catch (e) {} });
  for (let i = 0; i < 50; i++) { try { await fetch('http://127.0.0.1:' + PORT + '/saude'); break; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  const pede = async (rota, corpo, chave = 'gat-teste-1') => { const r = await fetch('http://127.0.0.1:' + PORT + rota, { method: corpo ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', 'x-chave': chave }, body: corpo ? JSON.stringify(corpo) : undefined }); return { status: r.status, json: await r.json().catch(() => ({})) }; };
  assert.equal((await pede('/ferramentas', null, 'errada')).status, 401);
  const fe = await pede('/ferramentas'); assert.equal(fe.json.ok, true); assert.ok(fe.json.ferramentas.some(f => f.nome === 'arquivos' && f.uso.length >= 2)); assert.ok(fe.json.ferramentas.some(f => f.nome === 'crm')); assert.ok(!fe.json.ferramentas.some(f => f.nome === 'base'));
  assert.equal((await pede('/acao', { ferramenta: 'arquivos', args: ['listar', 'amostras'] }, 'errada')).status, 401);
  const ac = await pede('/acao', { ferramenta: 'arquivos', args: ['listar', 'amostras'], entidade: 'teste' });
  assert.equal(ac.status, 200, JSON.stringify(ac.json)); assert.equal(ac.json.ok, true); assert.equal(ac.json.modo, 'proposta'); assert.equal(ac.json.resultado.estado, 'feito'); assert.ok(ac.json.resultado.itens.length >= 1);
  assert.equal((await pede('/acao', { ferramenta: '../rodar', args: [] })).status, 400);
  assert.equal((await pede('/acao', { ferramenta: 'base', args: [] })).status, 400);
  const fora = await pede('/acao', { ferramenta: 'arquivos', args: ['listar', 'C:/Windows'] }); assert.equal(fora.json.ok, true); assert.equal(fora.json.resultado.estado, 'recusado', 'a cerca da ferramenta vale na ação direta');
});
