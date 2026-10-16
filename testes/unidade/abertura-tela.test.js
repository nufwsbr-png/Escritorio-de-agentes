const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

/* A abertura na tela (16/10/2026): interpretar a descrição livre (aqui sem o Claude, por
   palavras-chave) e montar tudo de uma vez numa pasta de dados temporária. */
function cenario() {
  const ROOT = path.join(__dirname, '..', '..');
  const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'abertura-tela-'));
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify({ exemplo: { nome: 'Agente de exemplo', tipo: 'local', pasta: 'exemplo-agente', porta: 4401, trilha: 'tarefa' } }));
  const ADMIN = require('../../admin').init(ROOT, DADOS);
  const AVISOS = require('../../avisos').init(DADOS, {});
  const lerBruto = () => JSON.parse(fs.readFileSync(path.join(DADOS, 'sistemas.json'), 'utf8'));
  const gravar = (b) => fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify(b, null, 2));
  const PLAT = require('../../plataformas').init({ ROOT, DADOS, lerRegistro: lerBruto, lerRegistroBruto: lerBruto, gravarRegistro: gravar });
  const A = require('../../abertura').init({
    ROOT, DADOS, ADMIN, AVISOS, plataformas: PLAT,
    lerConfig: () => { try { return JSON.parse(fs.readFileSync(path.join(DADOS, 'config.json'), 'utf8')); } catch (e) { return {}; } },
    lerRegistroBruto: lerBruto, gravarRegistro: gravar
  });
  return { ROOT, DADOS, A, ADMIN, PLAT, limpar: () => fs.rmSync(DADOS, { recursive: true, force: true }) };
}
const DESCRICAO = 'Somos a Furtado Advocacia, um escritório de advocacia em Cuiabá. O dono é o Dr. Anderson Furtado. Usamos o PJe, uma planilha no Google Sheets, a Google Agenda, o WhatsApp e uma pasta no OneDrive.';

test('interpretar por palavras-chave: empresa, dono, ramo, setores do ramo e as conexões citadas; recusa chave e texto curto', async () => {
  const c = cenario();
  try {
    const r = await c.A.interpretar(DESCRICAO, { semClaude: true });
    assert.equal(r.ok, true); assert.equal(r.origem, 'palavras');
    const e = r.entendido;
    assert.equal(e.empresa, 'Furtado Advocacia');
    assert.equal(e.dono, 'Dr. Anderson Furtado');
    assert.equal(e.ramo, 'advocacia'); assert.equal(r.roupaSugerida, 'executivo');
    assert.ok(e.setores.length >= 4 && e.setores.every(s => s.nome && s.emoji));
    const tipos = e.conexoes.map(x => x.tipo).sort();
    assert.deepEqual(tipos, ['agenda', 'navegador', 'pasta', 'planilha', 'whatsapp'], JSON.stringify(e.conexoes));
    assert.ok(e.conexoes.some(x => x.nome === 'PJe') && e.conexoes.some(x => x.nome === 'OneDrive'));
    assert.match(e.oQueFaz, /^Somos a Furtado/);
    const curto = await c.A.interpretar('oi', { semClaude: true });
    assert.equal(curto.ok, false); assert.match(curto.motivo, /conte um pouco mais/);
    const chave = await c.A.interpretar('Somos a Loja X e o token do CRM é token=' + 'abcdef1234567890abcdef', { semClaude: true });
    assert.equal(chave.ok, false); assert.match(chave.motivo, /chave/);
    const sem = await c.A.interpretar('vendemos consultoria para pequenas empresas, eu sou a Carla', { semClaude: true });
    assert.equal(sem.entendido.ramo, 'generico'); assert.equal(sem.entendido.dono, 'Carla');
  } finally { c.limpar(); }
});

test('montar grava config com ramo e estilo, a planta da variação com os setores por sala, as conexões vazias e a senha uma vez', () => {
  const c = cenario();
  try {
    const r = c.A.montar({ empresa: 'Furtado Advocacia', oQueFaz: 'advocacia em Cuiabá', dono: 'Dr. Anderson', ramo: 'advocacia',
      setores: [{ nome: 'Petições', emoji: '⚖️', desc: 'x' }, { nome: 'Financeiro' }, { nome: 'Captação' }],
      conexoes: [{ nome: 'PJe', tipo: 'navegador' }, { nome: 'Planilha Google', tipo: 'planilha' }, { nome: 'Esquisita', tipo: 'xyz' }],
      estilo: { planta: 'ampla', roupa: 'elegante', tema: 'claro', movimento: 'invalido' }, marca: { cor: '#c9a24a' } });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.ok(r.senha && r.senha.length >= 12, 'a senha vem uma vez');
    assert.ok(c.ADMIN.conferir(r.senha), 'a senha vale');
    assert.deepEqual(r.gravados.sort(), ['admin.json', 'config.json', 'planta.json', 'plataformas.json']);
    const cfg = JSON.parse(fs.readFileSync(path.join(c.DADOS, 'config.json'), 'utf8'));
    assert.equal(cfg.empresa, 'Furtado Advocacia'); assert.equal(cfg.ramo, 'advocacia');
    assert.equal(cfg.estilo.planta, 'ampla'); assert.equal(cfg.estilo.roupa, 'elegante'); assert.equal(cfg.estilo.tema, 'claro');
    assert.equal(cfg.estilo.movimento, 'parado', 'valor inválido cai no padrão');
    assert.equal(cfg.marca.cores['acc-1'], '#c9a24a');
    assert.deepEqual(cfg.setores.map(s => s.nome), ['Petições', 'Financeiro', 'Captação']);
    const planta = JSON.parse(fs.readFileSync(path.join(c.DADOS, 'planta.json'), 'utf8'));
    assert.ok(planta.salas.some(s => s.tipo === 'descanso'), 'sala de descanso obrigatória');
    assert.deepEqual(planta.salas.find(s => s.nome === 'Financeiro').setores, ['Financeiro']);
    assert.deepEqual(planta.salas.find(s => s.nome === 'Petições e audiências').setores, ['Petições']);
    assert.deepEqual(r.planta.salas.length, 8);
    const plats = c.PLAT.listar();
    assert.deepEqual(plats.map(p => [p.nome, p.tipo]).sort(), [['Esquisita', 'api'], ['PJe', 'navegador'], ['Planilha Google', 'planilha']], 'tipo desconhecido vira api; variáveis vazias');
    assert.ok(plats.every(p => p.variaveis.length >= 1));
    // montar de novo: senha não vem (já existe), conexões não duplicam
    const r2 = c.A.montar({ empresa: 'Furtado Advocacia', ramo: 'advocacia', conexoes: [{ nome: 'PJe', tipo: 'navegador' }] });
    assert.equal(r2.ok, true); assert.equal(r2.senha, null); assert.equal(c.PLAT.listar().length, 3);
    assert.equal(c.A.montar({ ramo: 'advocacia' }).ok, false, 'sem empresa não monta');
    assert.equal(r2.atual.ramo, 'advocacia'); assert.equal(r2.atual.estilo.planta, 'padrao', 'sem estilo, o padrão');
  } finally { c.limpar(); }
});

test('salvarMarca grava o logo em data/marca/ e recusa extensão errada', () => {
  const c = cenario();
  try {
    const png = Buffer.from('89504e470d0a1a0a', 'hex').toString('base64');
    const r = c.A.salvarMarca({ tipo: 'logo', nome: 'meu logo.PNG', dados: 'data:image/png;base64,' + png });
    assert.equal(r.ok, true); assert.match(r.arquivo, /^logo-[a-z0-9]+\.png$/);
    assert.ok(fs.existsSync(path.join(c.DADOS, 'marca', r.arquivo)));
    assert.equal(c.A.salvarMarca({ tipo: 'logo', nome: 'x.exe', dados: png }).ok, false);
    assert.equal(c.A.salvarMarca({ tipo: 'planta', nome: 'p.pdf', dados: '' }).ok, false);
    const m = c.A.montar({ empresa: 'X', ramo: 'loja', marca: { logo: r.arquivo } });
    assert.equal(m.ok, true); assert.equal(m.atual.marca.logo, r.arquivo);
  } finally { c.limpar(); }
});
