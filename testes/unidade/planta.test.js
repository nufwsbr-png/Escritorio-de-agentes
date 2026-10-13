const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const P = require('../../planta');

const fixture = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures', n), 'utf8'));

test('a clínica de 7 salas cabe, valida e tem 3 mesas de sala + 12 + 2', () => {
  const r = P.gerar(fixture('salas-clinica.json'));
  assert.equal(r.ok, true, r.motivo);
  assert.equal(r.planta.salas.length, 7);
  assert.deepEqual(P.validar(r.planta), { ok: true, problemas: [] });
  assert.equal(r.capacidade, 12 + 2 + 1 + 1);
  const op = r.planta.salas.find(s => s.tipo === 'operacao');
  assert.equal(op.estacoes.length, 12); assert.equal(op.by, 0, 'operação vai para a faixa de cima');
  const re = r.planta.salas.find(s => s.tipo === 'recepcao');
  assert.equal(re.by, 22, 'recepção vai para a faixa de baixo');
  for (const s of r.planta.salas) assert.ok(s.porta && (s.porta.y === 18 || s.porta.y === 22), s.id + ' porta no corredor');
  const vizinha = r.planta.salas.find(s => s.id === 'sala-de-espera');
  assert.equal(Math.abs(vizinha.bx - (re.bx + re.bw)) <= 0 || Math.abs(re.bx - (vizinha.bx + vizinha.bw)) <= 0, true, 'vizinhos declarados ficam lado a lado');
});

test('salas grandes demais são recusadas com sugestão, nunca sobrepostas', () => {
  const r = P.gerar(fixture('salas-grande-demais.json'));
  assert.equal(r.ok, false); assert.match(r.motivo, /não coube/); assert.match(r.sugestao, /junte|Reduza/);
});

test('validar pega porta fora da parede, sobreposição e sala sem caminho', () => {
  const r = P.gerar(fixture('salas-clinica.json'));
  const p = JSON.parse(JSON.stringify(r.planta));
  p.salas[0].porta.y = 5;
  assert.match(P.validar(p).problemas.join(' '), /porta/);
  const q = JSON.parse(JSON.stringify(r.planta));
  q.salas[1].bx = q.salas[0].bx;
  assert.match(P.validar(q).problemas.join(' '), /sobreposição/);
  const z = JSON.parse(JSON.stringify(r.planta));
  z.corredor = { x1: 1, y1: 19, x2: 2, y2: 21 };   // corredor curto: salas longe dele ficam sem caminho
  assert.match(P.validar(z).problemas.join(' '), /sem caminho/);
});

test('normalizar: limites de 2 a 12, tipo inválido, ids únicos', () => {
  assert.match(P.normalizar([{ nome: 'Só uma', tipo: 'sala' }]).erro, /pelo menos 2/);
  assert.match(P.normalizar(Array.from({ length: 13 }, (_, i) => ({ nome: 'S' + i, tipo: 'sala' }))).erro, /12/);
  assert.match(P.normalizar([{ nome: 'A', tipo: 'xyz' }, { nome: 'B' }]).erro, /tipo desconhecido/);
  const n = P.normalizar([{ nome: 'Consultório' }, { nome: 'Consultório' }]);
  assert.deepEqual(n.salas.map(s => s.id), ['consultorio', 'consultorio-2']);
});

test('12 salas pequenas cabem', () => {
  const r = P.gerar(Array.from({ length: 12 }, (_, i) => ({ nome: 'Consultório ' + (i + 1), tipo: 'sala' })));
  assert.equal(r.ok, true, r.motivo); assert.equal(r.capacidade, 12);
});
