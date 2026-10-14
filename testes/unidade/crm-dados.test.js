const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

/* A camada de dados do CRM: local (arquivos) e Supabase (REST falso que
   guarda as linhas em memória). As duas guardam o mesmo documento. */
const DADOS = require('../../crm/dados');

test('local: gravar, obter, listar (mais recente primeiro), histórico só cresce e por ficha', async (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-local-')); t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const D = DADOS.abrir({ onde: 'local', pasta });
  assert.equal(D.onde, 'local'); assert.deepEqual(await D.listar('fichas'), []);
  await D.gravar('fichas', { id: 'a', chave: '1', atualizadaEm: '2026-10-01T00:00:00Z' });
  await D.gravar('fichas', { id: 'b', chave: '2', atualizadaEm: '2026-10-02T00:00:00Z' });
  await D.gravar('fichas', { id: 'a', chave: '1', nome: 'novo', atualizadaEm: '2026-10-03T00:00:00Z' });
  assert.deepEqual((await D.listar('fichas')).map(f => f.id), ['a', 'b']); assert.equal((await D.obter('fichas', 'a')).nome, 'novo'); assert.equal(await D.obter('fichas', 'x'), null);
  await D.anexar('historico', { id: 'h1', fichaId: 'a', texto: 'um' }); await D.anexar('historico', { id: 'h2', fichaId: 'b', texto: 'dois' }); await D.anexar('historico', { id: 'h3', fichaId: 'a', texto: 'três' });
  assert.deepEqual((await D.historicoDe('a')).map(h => h.texto), ['um', 'três']); assert.equal((await D.listar('historico')).length, 3);
  assert.ok(fs.existsSync(path.join(pasta, 'data', 'fichas.json')) && fs.existsSync(path.join(pasta, 'data', 'historico.jsonl')));
  assert.ok(!fs.existsSync(path.join(pasta, 'data', 'fichas.json.tmp')), 'escrita atômica limpa o temporário');
  assert.equal((await D.testar()).ok, true);
});

test('supabase: mesma interface pelo REST, com apikey e upsert; sem chave explica; esquema é SQL', async (t) => {
  const tabelas = {}; const pedidos = [];
  const srv = http.createServer((req, res) => {
    let s = ''; req.on('data', d => s += d);
    req.on('end', () => {
      pedidos.push({ metodo: req.method, url: req.url, apikey: req.headers.apikey, auth: req.headers.authorization, prefer: req.headers.prefer });
      res.setHeader('Content-Type', 'application/json');
      const u = new URL(req.url, 'http://x'); const tab = u.pathname.replace('/rest/v1/', ''); tabelas[tab] = tabelas[tab] || {};
      if (req.method === 'POST') { for (const l of JSON.parse(s)) tabelas[tab][l.id] = l; res.writeHead(201); return res.end(''); }
      let linhas = Object.values(tabelas[tab]);
      const id = u.searchParams.get('id'); if (id) linhas = linhas.filter(l => l.id === id.replace('eq.', ''));
      const fi = u.searchParams.get('dados->>fichaId'); if (fi) linhas = linhas.filter(l => l.dados.fichaId === fi.replace('eq.', ''));
      if (/atualizado\.desc/.test(u.searchParams.get('order') || '')) linhas.sort((a, b) => b.atualizado.localeCompare(a.atualizado));
      res.end(JSON.stringify(linhas.map(l => ({ dados: l.dados }))));
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); t.after(() => srv.close());
  const D = DADOS.abrir({ onde: 'supabase', env: { BANCO_URL: 'http://127.0.0.1:' + srv.address().port, BANCO_CHAVE: 'chave-1' } });
  assert.equal(D.onde, 'supabase');
  await D.gravar('fichas', { id: 'a', chave: '1' }); await new Promise(r => setTimeout(r, 5)); await D.gravar('fichas', { id: 'b', chave: '2' }); await D.gravar('fichas', { id: 'a', chave: '1', nome: 'novo' });
  assert.deepEqual((await D.listar('fichas')).map(f => f.id), ['a', 'b']); assert.equal((await D.obter('fichas', 'a')).nome, 'novo'); assert.equal(await D.obter('fichas', 'x'), null);
  await D.anexar('historico', { id: 'h1', fichaId: 'a', texto: 'um' }); await D.anexar('historico', { id: 'h2', fichaId: 'b', texto: 'dois' });
  assert.deepEqual((await D.historicoDe('a')).map(h => h.texto), ['um']);
  assert.ok(pedidos.every(p => p.apikey === 'chave-1' && p.auth === 'Bearer chave-1'), 'toda chamada leva a chave');
  assert.ok(pedidos.filter(p => p.metodo === 'POST').every(p => /merge-duplicates/.test(p.prefer)), 'gravar é upsert');
  assert.equal((await D.testar()).ok, true);
  const vazio = DADOS.abrir({ onde: 'supabase', env: {} });
  await assert.rejects(() => vazio.listar('fichas'), /BANCO_URL ou BANCO_CHAVE vazios/);
  assert.match(DADOS.abrir({ onde: 'supabase', env: {} }).esquema(), /create table if not exists crm_fichas \(id text primary key, dados jsonb not null, atualizado timestamptz/);
});
