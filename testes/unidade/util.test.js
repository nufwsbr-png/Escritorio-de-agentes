const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { slug, lerEnvArquivo, acharClaude, rodarCli } = require('../../util');

test('slug tira acento, troca separador e limita', () => {
  assert.equal(slug('Tati Teste'), 'tati-teste');
  assert.equal(slug('Recepção & Caixa', 10), 'recepcao-c');
  assert.equal(slug('---'), '');
  assert.equal(slug('Ophir (CRM jurídico)'), 'ophir-crm-juridico');
});

test('lerEnvArquivo lê aspas, ignora comentário e linha inválida', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'util-env-'));
  const arq = path.join(dir, '.env');
  fs.writeFileSync(arq, '# cabeçalho\r\nA="1 2"\r\n#B=3\r\nC=x\r\nD=\'y\'\r\nlixo\r\n');
  const m = lerEnvArquivo(arq);
  assert.deepEqual([...m.entries()], [['A', '1 2'], ['C', 'x'], ['D', 'y']]);
  assert.equal(lerEnvArquivo(path.join(dir, 'nao-existe')).size, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('acharClaude devolve um caminho ou nome não vazio', () => {
  const c = acharClaude();
  assert.equal(typeof c, 'string');
  assert.ok(c.length > 0);
});

test('rodarCli executa a ação pedida e responde --ajuda', async () => {
  const saidas = [];
  const imprime = s => saidas.push(s);
  await rodarCli({ soma: (a, b) => Number(a) + Number(b) }, ['soma', '2', '3'], imprime);
  assert.equal(saidas[0], '5');
  await rodarCli({ soma: () => 0 }, ['--ajuda'], imprime);
  assert.match(saidas[1], /soma/);
  const r = await rodarCli({ soma: () => 0 }, ['inexistente'], imprime);
  assert.equal(r, 1);
});
