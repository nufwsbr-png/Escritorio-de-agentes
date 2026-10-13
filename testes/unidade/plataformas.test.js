const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

/* Cada teste monta um escritório falso numa pasta temporária: data/ com o
   cadastro, um registro em memória e duas pastas de agente (A tem trilha; B
   também; R é robô de fora, sem trilha). */
function cenario() {
  const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'plat-'));
  fs.mkdirSync(path.join(ROOT, 'data'));
  const pastas = {};
  for (const id of ['a', 'b', 'r']) { pastas[id] = path.join(ROOT, 'agentes', id); fs.mkdirSync(pastas[id], { recursive: true }); }
  let registro = {
    _leia: 'comentário',
    a: { nome: 'A', tipo: 'local', pasta: pastas.a, trilha: 'tarefa', plataformas: [] },
    b: { nome: 'B', tipo: 'local', pasta: pastas.b, trilha: 'tarefa', plataformas: [] },
    r: { nome: 'Robô', tipo: 'local', pasta: pastas.r, plataformas: [] }
  };
  const semComentario = () => Object.fromEntries(Object.entries(registro).filter(([k]) => !k.startsWith('_')));
  const P = require('../../plataformas').init({
    ROOT, DADOS: path.join(ROOT, 'data'),
    lerRegistro: semComentario, lerRegistroBruto: () => registro, gravarRegistro: (b) => { registro = b; }
  });
  return { ROOT, pastas, P, registro: () => registro, limpar: () => fs.rmSync(ROOT, { recursive: true, force: true }) };
}
const env = (p) => fs.readFileSync(path.join(p, '.env'), 'utf8');

test('salvar cria com id em slug e valida tipo e nome de variável', (t) => {
  const c = cenario(); t.after(c.limpar);
  const r = c.P.salvar({ nome: 'Ophir (CRM jurídico)', tipo: 'api', url: 'https://app.ophir.com.br', variaveis: { OPHIR_URL: 'https://api.ophir', OPHIR_TOKEN: 'tok-123' } });
  assert.equal(r.ok, true); assert.equal(r.plataforma.id, 'ophir-crm-juridico');
  assert.equal(c.P.salvar({ nome: 'X', tipo: 'xyz' }).ok, false);
  const ruim = c.P.salvar({ nome: 'Y', tipo: 'api', variaveis: { token: 'a' } });
  assert.equal(ruim.ok, false); assert.match(ruim.motivo, /token/);
  assert.equal(c.P.listar().length, 1);
  assert.equal(JSON.stringify(c.P.listar()).includes('tok-123'), false, 'listar sem valores não vaza o token');
  assert.equal(c.P.obter('ophir-crm-juridico', true).variaveis.OPHIR_TOKEN, 'tok-123');
});

test('blocoEnvPara: prefixados, canônicos, PLATAFORMAS_PERMITIDAS e sem PASTAS sem pasta', (t) => {
  const c = cenario(); t.after(c.limpar);
  c.P.salvar({ id: 'ophir', nome: 'Ophir', tipo: 'api', variaveis: { OPHIR_URL: 'u', OPHIR_TOKEN: 'tk' } });
  const b = c.P.blocoEnvPara(['ophir']);
  assert.match(b, /^OPHIR_TOKEN="tk"$/m); assert.match(b, /^SISTEMA_API_TOKEN="tk"$/m); assert.match(b, /^SISTEMA_API_URL="u"$/m);
  assert.match(b, /^PLATAFORMAS_PERMITIDAS="ophir"$/m);
  assert.doesNotMatch(b, /PASTAS_AUTORIZADAS/);
  assert.ok(b.startsWith('# >>> plataformas do escritório') && b.trimEnd().endsWith('# <<< plataformas do escritório <<<'));
});

test('blocoEnvPara: pasta soma com manuais e vira PASTA_ENTRADA; segundo do mesmo tipo só prefixado', (t) => {
  const c = cenario(); t.after(c.limpar);
  c.P.salvar({ id: 'drive', nome: 'Drive', tipo: 'pasta', variaveis: { DRIVE_PASTA: 'C:\\x' } });
  c.P.salvar({ id: 'ophir', nome: 'Ophir', tipo: 'api', variaveis: { OPHIR_URL: 'u1', OPHIR_TOKEN: 't1' } });
  c.P.salvar({ id: 'crm2', nome: 'CRM 2', tipo: 'api', variaveis: { CRM2_URL: 'u2', CRM2_TOKEN: 't2' } });
  const b = c.P.blocoEnvPara(['drive', 'ophir', 'crm2'], ['C:\\manual']);
  assert.match(b, /^PASTAS_AUTORIZADAS="C:\\x;C:\\manual"$/m);
  assert.match(b, /^PASTA_ENTRADA="C:\\x"$/m);
  assert.match(b, /^SISTEMA_API_URL="u1"$/m);
  assert.match(b, /^CRM2_URL="u2"$/m);
  assert.doesNotMatch(b, /SISTEMA_API_URL="u2"/);
  assert.match(b, /^PLATAFORMAS_PERMITIDAS="drive;ophir;crm2"$/m);
});

test('aplicarBloco: insere após o cabeçalho mantendo CRLF, e substitui bloco antigo byte a byte', (t) => {
  const c = cenario(); t.after(c.limpar);
  const original = '# cabeçalho 1\r\n# cabeçalho 2\r\n\r\nPAINEL_SENHA="abc"\r\nMODO_REAL="nao"\r\n';
  const bloco = '# >>> plataformas do escritório (gerado; edite no escritório, não aqui) >>>\nX_URL="1"\n# <<< plataformas do escritório <<<\n';
  const com = c.P.aplicarBloco(original, bloco);
  assert.ok(com.includes('\r\nX_URL="1"\r\n'), 'bloco em CRLF');
  assert.ok(com.endsWith('PAINEL_SENHA="abc"\r\nMODO_REAL="nao"\r\n'), 'resto preservado');
  assert.ok(com.indexOf('# cabeçalho 2') < com.indexOf('X_URL'), 'bloco depois do cabeçalho');
  const novo = c.P.aplicarBloco(com, bloco.replace('X_URL="1"', 'X_URL="2"'));
  assert.ok(novo.includes('X_URL="2"') && !novo.includes('X_URL="1"'));
  assert.equal(novo.replace('X_URL="2"', 'X_URL="1"'), com, 'só o bloco mudou');
  assert.equal(c.P.aplicarBloco('', bloco).includes('X_URL="1"'), true, 'arquivo vazio recebe o bloco');
});

test('sincronizar: pula sem trilha, cria .env ausente, edita só quem tem, remover limpa', (t) => {
  const c = cenario(); t.after(c.limpar);
  fs.writeFileSync(path.join(c.pastas.b, '.env'), '# b\r\nPASTAS_AUTORIZADAS="C:\\b-manual"\r\n');
  fs.writeFileSync(path.join(c.pastas.r, '.env'), 'ROBO=1\n');
  c.P.salvar({ id: 'ophir', nome: 'Ophir', tipo: 'api', variaveis: { OPHIR_URL: 'u', OPHIR_TOKEN: 'v1' } });
  c.P.salvar({ id: 'drive', nome: 'Drive', tipo: 'pasta', variaveis: { DRIVE_PASTA: 'C:\\x' } });

  assert.equal(c.P.definirDoAgente('a', ['ophir']).ok, true);
  assert.equal(c.P.definirDoAgente('b', ['drive']).ok, true);
  assert.equal(c.P.definirDoAgente('r', ['ophir']).ok, true);
  assert.match(env(c.pastas.a), /OPHIR_TOKEN="v1"/, 'A ganhou .env criado do nada');
  assert.match(env(c.pastas.b), /PASTAS_AUTORIZADAS="C:\\x;C:\\b-manual"/, 'B somou o manual');
  assert.equal(env(c.pastas.r), 'ROBO=1\n', 'robô de fora não é tocado');
  assert.deepEqual(c.P.usadaPor('ophir').sort(), ['a', 'r']);

  c.P.salvar({ id: 'ophir', nome: 'Ophir', tipo: 'api', variaveis: { OPHIR_URL: 'u', OPHIR_TOKEN: 'v2' } });
  assert.match(env(c.pastas.a), /OPHIR_TOKEN="v2"/); assert.doesNotMatch(env(c.pastas.b), /OPHIR/);
  const antesB = env(c.pastas.b);

  const rem = c.P.remover('ophir');
  assert.equal(rem.ok, true); assert.deepEqual(rem.usadaPor.sort(), ['a', 'r']);
  assert.doesNotMatch(env(c.pastas.a), /OPHIR_/); assert.match(env(c.pastas.a), /PLATAFORMAS_PERMITIDAS=""/);
  assert.equal(env(c.pastas.b), antesB, 'B não mudou com a remoção de outra');
  assert.deepEqual(c.registro().a.plataformas, []);
  assert.deepEqual(c.P.sincronizarTodos().pulados, ['r']);
});

test('criarLista (CLI da abertura) cria várias com variáveis sugeridas vazias', (t) => {
  const c = cenario(); t.after(c.limpar);
  const r = c.P.criarLista([{ nome: 'Agenda da clínica', tipo: 'agenda', url: 'https://calendar.google.com' }, { nome: 'Site', tipo: 'link', url: 'https://x.com' }]);
  assert.equal(r.ok, true); assert.equal(r.criadas.length, 2);
  const ag = c.P.obter('agenda-da-clinica', true);
  assert.deepEqual(Object.keys(ag.variaveis), ['AGENDA_DA_CLINICA_CALENDAR_ID', 'GOOGLE_CREDENCIAIS_JSON']);
  assert.equal(ag.variaveis.AGENDA_DA_CLINICA_CALENDAR_ID, '');
});

test('revisão: canônico repetido vence o não vazio com aviso; valor com quebra de linha é recusado', (t) => {
  const c = cenario(); t.after(c.limpar);
  c.P.salvar({ id: 'plan', nome: 'Planilha', tipo: 'planilha', variaveis: { PLAN_SHEETS_ID: 'id1', GOOGLE_CREDENCIAIS_JSON: '' } });
  c.P.salvar({ id: 'ag', nome: 'Agenda', tipo: 'agenda', variaveis: { AG_CALENDAR_ID: 'c1', GOOGLE_CREDENCIAIS_JSON: '{"a":"b"}' } });
  const b = c.P.blocoEnvPara(['plan', 'ag']);
  assert.match(b, /^GOOGLE_CREDENCIAIS_JSON="\{"a":"b"\}"$/m, 'o valor não vazio venceu, sem escapar aspas internas');
  assert.equal((b.match(/^GOOGLE_CREDENCIAIS_JSON=/gm) || []).length, 1, 'uma linha só');
  c.P.salvar({ id: 'ag', nome: 'Agenda', tipo: 'agenda', variaveis: { AG_CALENDAR_ID: 'c1', GOOGLE_CREDENCIAIS_JSON: '{"a":"c"}' } });
  c.P.salvar({ id: 'plan', nome: 'Planilha', tipo: 'planilha', variaveis: { PLAN_SHEETS_ID: 'id1', GOOGLE_CREDENCIAIS_JSON: '{"a":"b"}' } });
  assert.match(c.P.blocoEnvPara(['plan', 'ag']), /# aviso: GOOGLE_CREDENCIAIS_JSON difere/);
  const r = c.P.salvar({ nome: 'X', tipo: 'api', variaveis: { X_TOKEN: 'a\nb' } });
  assert.equal(r.ok, false); assert.match(r.motivo, /quebra de linha/);
});

test('revisão: aplicarBloco respeita o comentário da primeira seção e não mexe no resto', (t) => {
  const c = cenario(); t.after(c.limpar);
  const molde = '# cabeçalho 1\n# cabeçalho 2\n\n# --- escopo: só aqui dentro\nPASTAS_AUTORIZADAS=""\n\n\n\n# --- modos\nMODO_REAL="nao"\n';
  const bloco = '# >>> plataformas do escritório (gerado; edite no escritório, não aqui) >>>\nX="1"\n# <<< plataformas do escritório <<<\n';
  const com = c.P.aplicarBloco(molde, bloco);
  assert.ok(com.includes('# <<< plataformas do escritório <<<\n\n# --- escopo: só aqui dentro\nPASTAS_AUTORIZADAS=""'), 'o comentário da seção fica com a sua variável');
  assert.ok(com.includes('PASTAS_AUTORIZADAS=""\n\n\n\n# --- modos'), 'as linhas em branco do agente não são colapsadas');
  assert.equal(c.P.aplicarBloco(com, bloco), com, 'idempotente');
  assert.throws(() => c.P.aplicarBloco('# >>> plataformas do escritório (gerado; edite no escritório, não aqui) >>>\nX="1"\n', bloco), /corrompido/);
});
