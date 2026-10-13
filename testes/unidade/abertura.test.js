const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

/* abertura.js grava config, avisos (sem chave), senha e o exemplo numa pasta de
   dados temporária. ADMIN e AVISOS de verdade, apontados para a mesma pasta. */
function cenario() {
  const ROOT = path.join(__dirname, '..', '..');
  const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'abertura-'));
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify({ exemplo: { nome: 'Agente de exemplo', tipo: 'local', pasta: 'exemplo-agente', porta: 4401, trilha: 'tarefa' } }));
  fs.writeFileSync(path.join(DADOS, 'equipe.json'), JSON.stringify({ v: 1, team: [{ key: 'exemplo', name: 'EXEMPLO', sistema: 'exemplo' }] }));
  const ADMIN = require('../../admin').init(ROOT, DADOS);
  const AVISOS = require('../../avisos').init(DADOS, {});
  let registro = () => JSON.parse(fs.readFileSync(path.join(DADOS, 'sistemas.json'), 'utf8'));
  const A = require('../../abertura').init({
    ROOT, DADOS, ADMIN, AVISOS,
    lerConfig: () => { try { return JSON.parse(fs.readFileSync(path.join(DADOS, 'config.json'), 'utf8')); } catch (e) { return {}; } },
    lerRegistroBruto: registro, gravarRegistro: (b) => fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify(b, null, 2)),
    plataformas: { listar: () => [] }
  });
  return { ROOT, DADOS, A, limpar: () => fs.rmSync(DADOS, { recursive: true, force: true }) };
}

test('montarConfig deriva nome, subtítulo, setores e reunião; o que não veio fica como estava', () => {
  const c = cenario();
  try {
    const cfg = c.A.montarConfig({ empresa: 'Clínica X', oQueFaz: 'clínica de estética em Curitiba', dono: 'Ana', setores: [{ nome: 'Recepção' }, { nome: '' }], reuniao: { automatica: false } }, { porta: 4555, reuniao: { dias: [2] } });
    assert.equal(cfg.nome, 'Escritório da Clínica X');
    assert.equal(cfg.subtitulo, 'clínica de estética em Curitiba');
    assert.equal(cfg.empresa, 'Clínica X'); assert.equal(cfg.dono, 'Ana'); assert.equal(cfg.porta, 4555);
    assert.deepEqual(cfg.setores.map(s => s.nome), ['Recepção']);
    assert.equal(cfg.reuniao.automatica, false); assert.deepEqual(cfg.reuniao.dias, [2]);
    assert.ok(cfg.aberturaEm);
    const vazio = c.A.montarConfig({ empresa: 'Y' }, {});
    assert.equal('setores' in vazio, false, 'setores vazios não entram');
  } finally { c.limpar(); }
});

test('validar recusa empresa vazia e senha curta; gerarSenha é forte', () => {
  const c = cenario();
  try {
    assert.match(c.A.validar({}).join(' '), /empresa/);
    assert.match(c.A.validar({ empresa: 'X', senhaAdmin: '123' }).join(' '), /senha/);
    assert.deepEqual(c.A.validar({ empresa: 'X' }), []);
    const s = c.A.gerarSenha();
    assert.ok(s.length >= 16); assert.match(s, /[a-z]/); assert.match(s, /[A-Z]/); assert.match(s, /[0-9]/);
  } finally { c.limpar(); }
});

test('aplicar grava config, avisos sem chave e senha; atual devolve sem segredos; exemplo demitir', () => {
  const c = cenario();
  try {
    const r = c.A.aplicar({ empresa: 'Clínica X', oQueFaz: 'estética', dono: 'Ana', setores: [{ nome: 'Recepção', emoji: '🛎️' }],
      avisos: { ntfy: { topico: 'clinica-x-avisos' }, whatsapp: { fone: '5541999990000' } }, reuniao: { automatica: true, dias: [1], hora: 9, meta: { descricao: 'consultas', alvo: 100, unidade: 'consultas' } },
      senhaAdmin: 'Senha-Forte-123', manterExemplo: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.ok(r.gravados.includes('config.json') && r.gravados.includes('avisos.json') && r.gravados.includes('admin.json'));
    const cfg = JSON.parse(fs.readFileSync(path.join(c.DADOS, 'config.json'), 'utf8'));
    assert.equal(cfg.nome, 'Escritório da Clínica X'); assert.equal(cfg.reuniao.meta.alvo, 100);
    const av = JSON.parse(fs.readFileSync(path.join(c.DADOS, 'avisos.json'), 'utf8'));
    assert.equal(av.ntfy.topico, 'clinica-x-avisos'); assert.equal(av.whatsapp.fone, '5541999990000'); assert.equal(av.whatsapp.apikey || '', '');
    assert.ok(fs.existsSync(path.join(c.DADOS, 'admin.json')));
    assert.equal(c.A.conferirSenha('Senha-Forte-123'), true);
    const atual = c.A.atual();
    assert.equal(atual.aberto, true); assert.equal(atual.empresa, 'Clínica X');
    const txt = JSON.stringify(atual);
    assert.ok(!txt.includes('Senha-Forte-123') && !txt.includes('hash'), 'atual não vaza segredo');
    assert.equal(atual.exemplo, 'ausente');
    const reg = JSON.parse(fs.readFileSync(path.join(c.DADOS, 'sistemas.json'), 'utf8'));
    assert.equal('exemplo' in reg, false);
    const eq = JSON.parse(fs.readFileSync(path.join(c.DADOS, 'equipe.json'), 'utf8'));
    assert.equal(eq.team.length, 0);
  } finally { c.limpar(); }
});

test('aplicar de novo muda só o que veio', () => {
  const c = cenario();
  try {
    c.A.aplicar({ empresa: 'Clínica X', dono: 'Ana', setores: [{ nome: 'Recepção' }] });
    c.A.aplicar({ dono: 'Beto' });
    const cfg = JSON.parse(fs.readFileSync(path.join(c.DADOS, 'config.json'), 'utf8'));
    assert.equal(cfg.empresa, 'Clínica X'); assert.equal(cfg.dono, 'Beto'); assert.equal(cfg.setores.length, 1);
  } finally { c.limpar(); }
});

test('avisos: ntfy gerado é imprevisível; "só ntfy" deixa o WhatsApp desligado mesmo com número', () => {
  const c = cenario();
  try {
    const r = c.A.aplicar({ empresa: 'Clínica Aurora', avisos: { ntfy: { gerar: true }, whatsapp: { fone: '5541999990000', ativo: false }, resumo: { ativo: false } } });
    assert.equal(r.ok, true);
    const av = JSON.parse(fs.readFileSync(path.join(c.DADOS, 'avisos.json'), 'utf8'));
    assert.match(av.ntfy.topico, /^clinica-aurora-[0-9a-f]{8}$/);
    assert.equal(av.ntfy.ativo, true);
    assert.equal(av.whatsapp.ativo, false); assert.equal(av.whatsapp.fone, '5541999990000');
    assert.equal(av.resumo.ativo, false);
  } finally { c.limpar(); }
});
