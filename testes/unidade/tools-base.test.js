const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

/* tools/base.js lê PLATAFORMAS_PERMITIDAS do ambiente (posta no .env pelo
   bloco do escritório). Carregamos o molde direto de modelos/. */
const BASE = path.join(__dirname, '..', '..', 'modelos', 'agente', 'comum', 'tools', 'base.js');

test('plataformasPermitidas e exigePlataforma leem PLATAFORMAS_PERMITIDAS', () => {
  process.env.PLATAFORMAS_PERMITIDAS = 'ophir;drive';
  delete require.cache[require.resolve(BASE)];
  const b = require(BASE);
  assert.deepEqual(b.plataformasPermitidas(), ['ophir', 'drive']);
  assert.equal(b.exigePlataforma('ophir'), true);
  assert.equal(b.exigePlataforma('crm'), false);
  const r = b.recusaSemPlataforma('crm');
  assert.equal(r.estado, 'recusado'); assert.match(r.detalhe, /crm/);
});

test('sem a variável, nenhuma plataforma é permitida', () => {
  delete process.env.PLATAFORMAS_PERMITIDAS;
  delete require.cache[require.resolve(BASE)];
  const b = require(BASE);
  assert.deepEqual(b.plataformasPermitidas(), []);
  assert.equal(b.exigePlataforma('ophir'), false);
});
