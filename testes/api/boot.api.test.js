const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

/* O escritório tem que subir SEM a variável ESCRITORIO_DADOS, que só os testes
   usam: é o caso real do cliente (npm start, INICIAR ESCRITORIO.cmd). Para
   não tocar em data/ de verdade, os módulos do servidor são copiados para
   uma pasta temporária e sobem de lá: DADOS vira <temp>/data. */
test('server.js sobe sem ESCRITORIO_DADOS, criando data/ ao lado dele', async () => {
  const ROOT = path.join(__dirname, '..', '..');
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-boot-'));
  for (const f of fs.readdirSync(ROOT)) if (f.endsWith('.js')) fs.copyFileSync(path.join(ROOT, f), path.join(TMP, f));
  fs.mkdirSync(path.join(TMP, 'data'));
  for (const f of ['sistemas.exemplo.json', 'config.exemplo.json']) fs.copyFileSync(path.join(ROOT, 'data', f), path.join(TMP, 'data', f));
  const env = { ...process.env, PORT: '4396' }; delete env.ESCRITORIO_DADOS;
  const p = spawn(process.execPath, ['server.js'], { cwd: TMP, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = ''; p.stdout.on('data', d => saida += d); p.stderr.on('data', d => saida += d);
  let subiu = false;
  for (let i = 0; i < 40 && !subiu; i++) { try { await fetch('http://127.0.0.1:4396/api/admin'); subiu = true; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  try { p.kill(); } catch (e) {}
  await new Promise(r => setTimeout(r, 300));
  const temRegistro = fs.existsSync(path.join(TMP, 'data', 'sistemas.json'));
  fs.rmSync(TMP, { recursive: true, force: true });
  assert.equal(subiu, true, 'o escritório não subiu sem ESCRITORIO_DADOS: ' + saida.slice(0, 400));
  assert.equal(temRegistro, true, 'data/sistemas.json nasceu do exemplo ao lado do server.js');
});
