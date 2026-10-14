const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ENSINO = require('../../ensino');

/* uma pasta de agente mínima, com .env (valores que NUNCA podem vazar) e uma skill de referência */
function pastaAgente() {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'ensino-'));
  const autorizada = path.join(pasta, 'clientes'); fs.mkdirSync(autorizada);
  fs.writeFileSync(path.join(pasta, '.env'),
    '# .env\nPASTAS_AUTORIZADAS="' + autorizada.replace(/\\/g, '\\\\') + ';C:\\\\nao\\\\existe"\n' +
    '# >>> plataformas do escritório (gerado; edite no escritório, não aqui) >>>\nPLATAFORMAS_PERMITIDAS="ophir;drive"\nOPHIR_TOKEN="segredo-77"\nSISTEMA_API_TOKEN="segredo-77"\n# <<< plataformas do escritório <<<\n' +
    'PAINEL_SENHA="oculta-9"\nMODO_REAL="nao"\nVAZIA=""\n');
  fs.mkdirSync(path.join(pasta, '.claude', 'skills', 'criar-agente-tarefa'), { recursive: true });
  fs.writeFileSync(path.join(pasta, '.claude', 'skills', 'criar-agente-tarefa', 'SKILL.md'), '---\nname: criar-agente-tarefa\ndescription: referência\n---\n');
  fs.mkdirSync(path.join(pasta, 'amostras', 'caso-01'), { recursive: true });
  return { pasta, autorizada, limpar: () => fs.rmSync(pasta, { recursive: true, force: true }) };
}

test('iniciar numera as demonstrações, cria a transcrição e anotar acrescenta falas', () => {
  const c = pastaAgente();
  try {
    assert.equal(ENSINO.proximoNumero(c.pasta), '01');
    const rel = ENSINO.iniciar(c.pasta);
    assert.match(rel.replace(/\\/g, '/'), /^ensino\/01-\d{4}-\d{2}-\d{2}$/);
    assert.equal(ENSINO.proximoNumero(c.pasta), '02');
    assert.ok(ENSINO.anotar(c.pasta, rel, 'voce', 'mova os PDFs'));
    assert.ok(ENSINO.anotar(c.pasta, rel, 'agente', 'movi 3 arquivos'));
    const t = fs.readFileSync(path.join(c.pasta, rel, 'transcricao.md'), 'utf8');
    assert.match(t, /## Você .*\n\nmova os PDFs/); assert.match(t, /## Claude Code .*\n\nmovi 3 arquivos/);
    const d = ENSINO.demonstracoes(c.pasta);
    assert.equal(d.length, 1); assert.equal(d[0].falas, 2); assert.equal(d[0].concluida, false);
    fs.writeFileSync(path.join(c.pasta, rel, 'resumo.md'), 'ok');
    assert.equal(ENSINO.demonstracoes(c.pasta)[0].concluida, true);
  } finally { c.limpar(); }
});

test('skillsAprendidas lê o frontmatter e deixa de fora a skill de referência da trilha', () => {
  const c = pastaAgente();
  try {
    assert.deepEqual(ENSINO.skillsAprendidas(c.pasta), []);
    fs.mkdirSync(path.join(c.pasta, '.claude', 'skills', 'organizar-notas'), { recursive: true });
    fs.writeFileSync(path.join(c.pasta, '.claude', 'skills', 'organizar-notas', 'SKILL.md'), '---\nname: organizar-notas\ndescription: "Move as notas fiscais do mês para a pasta do cliente."\n---\n# Organizar notas\n');
    fs.mkdirSync(path.join(c.pasta, '.claude', 'skills', 'sem-skill-md'), { recursive: true });
    const s = ENSINO.skillsAprendidas(c.pasta);
    assert.equal(s.length, 1);
    assert.equal(s[0].id, 'organizar-notas'); assert.equal(s[0].nome, 'organizar-notas');
    assert.equal(s[0].descricao, 'Move as notas fiscais do mês para a pasta do cliente.');
    assert.equal(s[0].arquivo, '.claude/skills/organizar-notas/SKILL.md');
  } finally { c.limpar(); }
});

test('o .env entra nos prompts só como nomes e caminhos: nenhum valor, nenhuma senha', () => {
  const c = pastaAgente();
  try {
    assert.deepEqual(ENSINO.pastasAutorizadas(c.pasta), [c.autorizada], 'só a pasta que existe');
    assert.deepEqual(ENSINO.plataformasPermitidas(c.pasta), ['ophir', 'drive']);
    const vars = ENSINO.variaveisPreenchidas(c.pasta);
    assert.ok(vars.includes('OPHIR_TOKEN') && vars.includes('MODO_REAL') && !vars.includes('VAZIA') && !vars.includes('PAINEL_SENHA'));
    const s = { nome: 'Tati', setor: 'Faturamento', negocio: 'Clínica X' };
    const papel = ENSINO.papelEnsinar(s, c.pasta);
    assert.ok(papel.includes(c.autorizada) && papel.includes('ophir, drive') && papel.includes('OPHIR_TOKEN'));
    assert.ok(!papel.includes('segredo-77') && !papel.includes('oculta-9'), 'o papel não vaza valor');
    assert.match(papel, /DEMONSTRAR/); assert.match(papel, /Não edite prompt-agente\.md/);
    const rel = ENSINO.iniciar(c.pasta);
    const p = ENSINO.promptDestilar(s, c.pasta, 'Organizar notas fiscais', rel);
    assert.ok(p.includes('.claude/skills/organizar-notas-fiscais/SKILL.md'));
    assert.ok(p.includes('amostras/caso-02/esperado.md'), 'o caso-01 já existe, a demonstração vira o caso-02');
    assert.ok(p.includes(rel) && p.includes('<proposta arquivo="skills/constituicao.md"'));
    assert.ok(!p.includes('segredo-77') && !p.includes('oculta-9'));
    assert.ok(p.includes(rel + '/skill-destilada.md'), 'a destilação grava em ensino/, o escritório instala');
    const semNome = ENSINO.promptDestilar(s, c.pasta, '', rel);
    assert.ok(semNome.includes('.claude/skills/tarefa-01/SKILL.md'), 'sem nome, a skill ganha o número da demonstração');
    const pd = ENSINO.papelDestilar(s, c.pasta);
    assert.match(pd, /DESTILA/); assert.ok(!pd.includes('segredo-77'));
    assert.match(ENSINO.papelEnsinar(s, c.pasta), /tools\/base\.js/, 'o papel manda usar ferramenta Node em vez de shell nas pastas autorizadas');
  } finally { c.limpar(); }
});

test('instalarSkill: lê o name do frontmatter, instala em .claude/skills, substitui guardando a anterior, recusa valor e nome reservado', () => {
  const c = pastaAgente();
  try {
    const rel = ENSINO.iniciar(c.pasta);
    assert.equal(ENSINO.instalarSkill(c.pasta, rel).ok, false, 'sem skill-destilada.md');
    const grava = (t) => fs.writeFileSync(path.join(c.pasta, rel, 'skill-destilada.md'), t);
    grava('---\nname: Organizar Notas\ndescription: move notas\n---\n# v1\nUse SISTEMA_API_TOKEN pelo código.\n');
    let r = ENSINO.instalarSkill(c.pasta, rel);
    assert.deepEqual(r, { ok: true, id: 'organizar-notas', arquivo: '.claude/skills/organizar-notas/SKILL.md', substituiu: false });
    assert.match(fs.readFileSync(path.join(c.pasta, '.claude', 'skills', 'organizar-notas', 'SKILL.md'), 'utf8'), /# v1/);
    assert.equal(ENSINO.instalarSkill(c.pasta, rel).jaEstava, true, 'igual: não regrava');
    grava('---\nname: organizar-notas\ndescription: move notas\n---\n# v2\n');
    r = ENSINO.instalarSkill(c.pasta, rel);
    assert.equal(r.substituiu, true);
    assert.match(fs.readFileSync(path.join(c.pasta, rel, 'skill-anterior.md'), 'utf8'), /# v1/);
    assert.match(fs.readFileSync(path.join(c.pasta, '.claude', 'skills', 'organizar-notas', 'SKILL.md'), 'utf8'), /# v2/);
    assert.equal(ENSINO.skillsAprendidas(c.pasta).length, 1);
    grava('---\nname: vazar\n---\nOPHIR_TOKEN="segredo-77-abcdef"\n');
    assert.match(ENSINO.instalarSkill(c.pasta, rel).motivo, /valor/);
    grava('---\nname: criar-agente-tarefa\n---\nx');
    assert.match(ENSINO.instalarSkill(c.pasta, rel).motivo, /reservado/);
    assert.equal(ENSINO.demonstracoes(c.pasta)[0].concluida, true);
  } finally { c.limpar(); }
});

test('estado devolve skills, demonstrações e escopo pelo registro; sem pasta, motivo', () => {
  const c = pastaAgente();
  try {
    const E = ENSINO.init({ lerRegistro: () => ({ tati: { nome: 'Tati', pasta: c.pasta, aprendizado: 'vendo' }, fantasma: { nome: 'X', pasta: path.join(c.pasta, 'nao') } }) });
    const e = E.estado('tati');
    assert.equal(e.ok, true); assert.equal(e.aprendizado, 'vendo'); assert.deepEqual(e.skills, []); assert.deepEqual(e.plataformas, ['ophir', 'drive']);
    assert.equal(E.estado('fantasma').ok, false);
    assert.equal(E.estado('ninguem').ok, false);
    assert.ok(!JSON.stringify(e).includes('segredo-77'));
  } finally { c.limpar(); }
});
