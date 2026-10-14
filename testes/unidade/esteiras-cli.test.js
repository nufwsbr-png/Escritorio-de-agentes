const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

/* A linha de comando das esteiras, que a skill /criar-esteira usa: criar,
   listar, remover. (rodarCli passa os argumentos soltos, não em lista: um
   bug fez `criar` ler só a primeira letra do caminho até 14/10/2026.) */
const ROOT = path.join(__dirname, '..', '..');
const roda = (DADOS, args) => { const r = spawnSync(process.execPath, ['esteiras.js', ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ESCRITORIO_DADOS: DADOS } }); let j = null; try { j = JSON.parse(r.stdout.trim().split('\n').pop()); } catch (e) {} return { json: j, saida: r.stdout + r.stderr }; };

test('node esteiras.js criar <arquivo> grava a esteira; listar a mostra; remover <id> a tira', (t) => {
  const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'est-cli-')); t.after(() => fs.rmSync(DADOS, { recursive: true, force: true }));
  const pasta = path.join(DADOS, 'ag'); fs.mkdirSync(pasta);
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify({ tati: { nome: 'Tati', tipo: 'local', pasta, comando: 'node', args: ['server.js'], porta: 4611, trilha: 'tarefa' } }));
  const def = path.join(DADOS, 'esteira.json');
  fs.writeFileSync(def, JSON.stringify({ nome: 'Processo novo', entidade: { singular: 'processo', plural: 'processos' }, etapas: [{ nome: 'Fechamento', agente: 'tati', entrega: 'pasta fechada', aprovacao: 'nenhuma' }] }));
  const c = roda(DADOS, ['criar', def]);
  assert.equal(c.json && c.json.ok, true, c.saida);
  const l = roda(DADOS, ['listar']).json;
  assert.equal(l.esteiras.length, 1); assert.equal(l.esteiras[0].id, 'processo-novo'); assert.equal(l.esteiras[0].etapas[0].agente, 'tati');
  assert.equal(roda(DADOS, ['remover', 'processo-novo']).json.ok, true);
  assert.equal(roda(DADOS, ['listar']).json.esteiras.length, 0);
});
