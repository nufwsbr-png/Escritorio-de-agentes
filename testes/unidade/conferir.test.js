const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { conferir } = require('../conferir-organizacao');

const ROOT = path.join(__dirname, '..', '..');

test('o repositório como está passa no conferidor', () => {
  const r = conferir({ ROOT });
  assert.deepEqual(r.problemas, [], r.problemas.join('\n'));
  assert.equal(r.ok, true);
});

test('um agente plantado com chave fora do bloco, sem .gitignore e sem anatomia é reprovado', (t) => {
  const pasta = path.join(ROOT, 'agentes', 'zz-teste-conferidor');
  fs.mkdirSync(pasta, { recursive: true });
  t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  fs.writeFileSync(path.join(pasta, '.env'), 'OPHIR_TOKEN="abc12345-fora-do-bloco"\n');
  fs.writeFileSync(path.join(pasta, '.gitignore'), 'log.txt\n');
  const plataformas = [{ id: 'ophir', nome: 'Ophir', tipo: 'api', variaveis: { OPHIR_TOKEN: 'x' } }];
  const r = conferir({ ROOT, plataformas });
  assert.equal(r.ok, false);
  const txt = r.problemas.join('\n');
  assert.match(txt, /zz-teste-conferidor[^\n]*\.gitignore/, 'acusa o .gitignore sem .env');
  assert.match(txt, /zz-teste-conferidor[^\n]*OPHIR_TOKEN/, 'acusa a variável de plataforma fora do bloco');
  assert.match(txt, /(ANATOMIA|prompt-agente|CLAUDE\.md)[^\n]*zz-teste-conferidor/, 'acusa a anatomia incompleta');
});
