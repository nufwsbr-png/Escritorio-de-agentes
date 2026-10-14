const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

/* agente-base.js resolve tudo pela própria pasta (__dirname), então o molde é
   copiado para uma pasta temporária com uma skill aprendida e a de referência. */
function pastaAgente() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'agente-base-'));
  fs.copyFileSync(path.join(__dirname, '..', '..', 'modelos', 'agente', 'comum', 'agente-base.js'), path.join(pasta, 'agente-base.js'));
  fs.writeFileSync(path.join(pasta, 'agente.json'), JSON.stringify({ nome: 'Tati', setor: 'x', trilha: 'tarefa', porta: 4499 }));
  for (const [n, fm] of [['criar-agente-tarefa', 'name: criar-agente-tarefa\ndescription: referência'], ['organizar-notas', 'name: organizar-notas\ndescription: "Move as notas do mês para a pasta do cliente."']]) {
    fs.mkdirSync(path.join(pasta, '.claude', 'skills', n), { recursive: true });
    fs.writeFileSync(path.join(pasta, '.claude', 'skills', n, 'SKILL.md'), '---\n' + fm + '\n---\n# ' + n + '\n');
  }
  return { pasta, limpar: () => fs.rmSync(pasta, { recursive: true, force: true }) };
}

test('agente-base.skillsAprendidas lista as skills ensinadas vendo e deixa a referência de fora', () => {
  const c = pastaAgente();
  try {
    const base = require(path.join(c.pasta, 'agente-base.js'));
    const s = base.skillsAprendidas();
    assert.deepEqual(s, [{ id: 'organizar-notas', nome: 'organizar-notas', descricao: 'Move as notas do mês para a pasta do cliente.', arquivo: '.claude/skills/organizar-notas/SKILL.md' }]);
  } finally { c.limpar(); }
});

test('o molde e o exemplo-agente têm o mesmo agente-base.js e rodar.js', () => {
  const ROOT = path.join(__dirname, '..', '..');
  for (const [de, para] of [['modelos/agente/comum/agente-base.js', 'exemplo-agente/agente-base.js'], ['modelos/agente/tarefa/rodar.js', 'exemplo-agente/rodar.js'], ['modelos/agente/comum/tools/base.js', 'exemplo-agente/tools/base.js']])
    assert.equal(fs.readFileSync(path.join(ROOT, de), 'utf8'), fs.readFileSync(path.join(ROOT, para), 'utf8'), para + ' difere do molde ' + de);
});
