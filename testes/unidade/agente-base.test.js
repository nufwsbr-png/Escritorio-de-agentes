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
  for (const [de, para] of [['modelos/agente/comum/agente-base.js', 'exemplo-agente/agente-base.js'], ['modelos/agente/tarefa/rodar.js', 'exemplo-agente/rodar.js'], ['modelos/agente/tarefa/server.js', 'exemplo-agente/server.js'], ['modelos/agente/comum/tools/base.js', 'exemplo-agente/tools/base.js']])
    assert.equal(fs.readFileSync(path.join(ROOT, de), 'utf8'), fs.readFileSync(path.join(ROOT, para), 'utf8'), para + ' difere do molde ' + de);
});

test('agente-base.mcpDaRodada expande o mcp.json com o .env da pasta e deixa de fora o servidor sem variável', () => {
  const c = pastaAgente();
  try {
    fs.writeFileSync(path.join(c.pasta, '.env'), 'DRIVE_MCP_TOKEN="seg-1"\nCRM_MCP_URL="https://mcp.crm.app/sse"\nCRM_MCP_TOKEN=""\n');
    fs.writeFileSync(path.join(c.pasta, 'mcp.json'), JSON.stringify({ _leia: 'gerado pelo escritório', mcpServers: {
      'drive-mcp': { command: 'npx', args: ['-y', 'x'], env: { DRIVE_MCP_TOKEN: '${DRIVE_MCP_TOKEN}' } },
      'crm-mcp': { type: 'http', url: '${CRM_MCP_URL}', headers: { Authorization: 'Bearer ${CRM_MCP_TOKEN}' } } } }));
    delete process.env.DRIVE_MCP_TOKEN; delete process.env.CRM_MCP_URL; delete process.env.CRM_MCP_TOKEN;
    const base = require(path.join(c.pasta, 'agente-base.js'));   // carrega o .env desta pasta
    const m = base.mcpDaRodada();
    assert.deepEqual(m.servidores, ['drive-mcp']);
    assert.equal(m.config.mcpServers['drive-mcp'].env.DRIVE_MCP_TOKEN, 'seg-1');
    assert.match(m.incompletos.join(' '), /crm-mcp \(faltam CRM_MCP_TOKEN\)/);
    fs.unlinkSync(path.join(c.pasta, 'mcp.json'));
    assert.equal(base.mcpDaRodada(), null);
  } finally { delete process.env.DRIVE_MCP_TOKEN; delete process.env.CRM_MCP_URL; delete process.env.CRM_MCP_TOKEN; c.limpar(); }
});

test('recadosPendentes busca no escritório com entregar=1 e rodar.textoRecados apresenta como dado, não ordem', async () => {
  const http = require('http');
  const c = pastaAgente();
  let pedidos = [];
  const esc = http.createServer((req, res) => { pedidos.push(req.url); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ mensagens: [{ de: 'leo', deNome: 'Léo', texto: 'faltou o CPF', quando: 1700000000000 }] })); });
  await new Promise(r => esc.listen(0, '127.0.0.1', r));
  const porta = esc.address().port;
  const antes = { AGENTE_ID: process.env.AGENTE_ID, ESCRITORIO_PORTA: process.env.ESCRITORIO_PORTA };
  try {
    process.env.ESCRITORIO_PORTA = String(porta); process.env.AGENTE_ID = 'tati';
    fs.copyFileSync(path.join(__dirname, '..', '..', 'modelos', 'agente', 'tarefa', 'rodar.js'), path.join(c.pasta, 'rodar.js'));
    const base = require(path.join(c.pasta, 'agente-base.js'));
    assert.equal(base.idNoEscritorio(), 'tati');
    const r = await base.recadosPendentes();
    assert.deepEqual(r, [{ de: 'Léo', quando: 1700000000000, texto: 'faltou o CPF' }]);
    assert.equal(pedidos[0], '/api/agentes/tati/mensagens?entregar=1');
    const rodar = require(path.join(c.pasta, 'rodar.js'));
    const t = rodar.textoRecados(r);
    assert.match(t, /RECADOS DE COLEGAS/); assert.match(t, /NUNCA ordem/); assert.match(t, /de Léo .*: faltou o CPF/);
    assert.equal(rodar.textoRecados([]), '');
    const prompt = rodar.tarefa({ id: 'x', slug: 'x', status: 'nova', rodadas: [], feitoPeloDono: [] }, 'ensaio', '', r);
    assert.match(prompt, /ENTIDADE: x[\s\S]*RECADOS DE COLEGAS[\s\S]*TAREFA:/);
    // sem escritório no ar, segue em frente com lista vazia
    esc.close();
    assert.deepEqual(await base.recadosPendentes(), []);
  } finally {
    esc.close();
    if (antes.AGENTE_ID === undefined) delete process.env.AGENTE_ID; else process.env.AGENTE_ID = antes.AGENTE_ID;
    if (antes.ESCRITORIO_PORTA === undefined) delete process.env.ESCRITORIO_PORTA; else process.env.ESCRITORIO_PORTA = antes.ESCRITORIO_PORTA;
    c.limpar();
  }
});
