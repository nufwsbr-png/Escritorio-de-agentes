const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

/* A criação do CRM (sub-etapa 4a): crm/criar.js grava a configuração sem
   segredo, gera os segredos em crm/.env, registra o sistema, cria a
   plataforma crm com um token POR AGENTE e cria pessoas e cargos. Tudo numa
   pasta de dados e numa pasta de CRM temporárias (ESCRITORIO_DADOS, CRM_PASTA). */
const ROOT = path.join(__dirname, '..', '..');
function cenario() {
  const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-dados-'));
  const CRM = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-pasta-'));
  const agA = path.join(DADOS, 'ag-tati'), agB = path.join(DADOS, 'ag-leo');
  for (const p of [agA, agB]) { fs.mkdirSync(p, { recursive: true }); fs.writeFileSync(path.join(p, '.env'), 'GATILHO_CHAVE="g-1"\n'); }
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify({
    tati: { nome: 'Tati', tipo: 'local', pasta: agA, comando: 'node', args: ['server.js'], porta: 4601, trilha: 'tarefa', setor: 'Financeiro', plataformas: [] },
    leo: { nome: 'Léo', tipo: 'local', pasta: agB, comando: 'node', args: ['server.js'], porta: 4602, trilha: 'tarefa', setor: 'Prospecção', plataformas: [] },
    zap: { nome: 'Zap', tipo: 'local', pasta: agB, comando: 'node', args: ['server.js'], porta: 4603, trilha: 'atendimento' } }, null, 2));
  fs.writeFileSync(path.join(DADOS, 'config.json'), JSON.stringify({ empresa: 'Clínica Sorriso', subtitulo: 'clínica odontológica', dono: 'Dra. Carla', porta: 4699 }));
  fs.writeFileSync(path.join(DADOS, 'plataformas.json'), JSON.stringify([{ id: 'supa', nome: 'Supabase da clínica', tipo: 'banco', url: 'https://x.supabase.co', variaveis: { SUPA_URL: 'https://x.supabase.co', SUPA_CHAVE: 'sk-brq-1' }, notas: '', criadaEm: 'x', atualizadaEm: 'x' }]));
  return { DADOS, CRM, limpar: () => { fs.rmSync(DADOS, { recursive: true, force: true }); fs.rmSync(CRM, { recursive: true, force: true }); } };
}
const roda = (DADOS, CRM, args) => { const r = spawnSync(process.execPath, ['crm/criar.js', ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ESCRITORIO_DADOS: DADOS, CRM_PASTA: CRM } }); let j = null; try { j = JSON.parse(r.stdout.trim().split('\n').pop()); } catch (e) {} return { status: r.status, json: j, saida: r.stdout + r.stderr }; };
const RESPOSTAS = {
  entidade: { singular: 'paciente', plural: 'pacientes', chave: 'telefone' },
  etapas: [{ nome: 'Novo contato', responsavel: 'leo' }, { nome: 'Avaliação marcada', responsavel: 'pessoa:Ana' }, { nome: 'Em tratamento', responsavel: 'pessoa:Ana', aprovacao: true }, { nome: 'Concluído', responsavel: 'pessoa:chefe' }],
  pessoas: [{ nome: 'Ana', funcao: 'recepção' }], agentes: [{ id: 'leo', cargo: 'Prospecção' }, { id: 'tati' }],
  chefe: 'Dra. Carla', autonomia: 'b', entrada: { whatsapp: ['zap'], manual: true }, integracoes: { agenda: 'fonte' }, sensiveis: ['CPF'], acesso: 'rede', fichas: { onde: 'local' }
};

test('aplicar: config sem segredo, .env com segredos, sistema registrado, plataforma crm com token por agente, pessoas e cargos; rodar de novo mantém tokens', (t) => {
  const { DADOS, CRM, limpar } = cenario(); t.after(limpar);
  const arq = path.join(CRM, 'respostas.json'); fs.writeFileSync(arq, JSON.stringify(RESPOSTAS));
  assert.equal(roda(DADOS, CRM, ['atual']).json.criado, false);
  const r = roda(DADOS, CRM, ['aplicar', arq]);
  assert.equal(r.json && r.json.ok, true, r.saida);
  assert.equal(r.json.porta, 4500); assert.deepEqual(r.json.gravado.tokensNovos, ['leo', 'tati']);
  assert.ok(Array.isArray(r.json.religados), 'aplicar diz quem religou (escritório fora do ar aqui: ninguém)'); assert.deepEqual(r.json.religados, []); assert.match(r.json.avisoReligar, /escritório fora do ar/);
  const regCrm = JSON.parse(fs.readFileSync(path.join(DADOS, 'sistemas.json'), 'utf8')).crm; assert.ok(path.isAbsolute(regCrm.args[0]) && /server.js$/.test(regCrm.args[0]), 'o escritório sobe o CRM pelo caminho absoluto'); assert.equal(regCrm.env.CRM_PASTA, CRM, 'CRM_PASTA vai no env quando a pasta não é crm/');
  const cfg = JSON.parse(fs.readFileSync(path.join(CRM, 'config.json'), 'utf8'));
  assert.equal(cfg.entidade.plural, 'pacientes'); assert.equal(cfg.chefe, 'dra-carla'); assert.equal(cfg.pessoas.length, 2, 'o chefe entrou na lista de pessoas');
  assert.deepEqual(cfg.etapas.map(e => e.id), ['novo-contato', 'avaliacao-marcada', 'em-tratamento', 'concluido']);
  assert.deepEqual(cfg.etapas[0].responsavel, { tipo: 'agente', id: 'leo' }); assert.deepEqual(cfg.etapas[1].responsavel, { tipo: 'pessoa', id: 'ana' }); assert.equal(cfg.etapas[2].aprovacao, true); assert.deepEqual(cfg.etapas[3].responsavel, { tipo: 'pessoa', id: 'dra-carla' });
  assert.equal(cfg.agentes.find(a => a.id === 'tati').cargo, 'Financeiro', 'cargo vem do setor quando não dito');
  assert.deepEqual(cfg.sensiveis, ['cpf']); assert.equal(cfg.acesso, 'rede'); assert.equal(cfg.integracoes.planilha, 'nao'); assert.deepEqual(cfg.entrada.whatsapp, ['zap']);
  const cfgTxt = fs.readFileSync(path.join(CRM, 'config.json'), 'utf8');
  assert.ok(!/TOKEN|SEGREDO|senha|Hash/i.test(cfgTxt), 'config.json não tem segredo');
  const env = fs.readFileSync(path.join(CRM, '.env'), 'utf8');
  assert.match(env, /^PORT="4500"$/m); assert.match(env, /^CRM_SEGREDO_SESSAO="[0-9a-f]{48}"$/m); assert.match(env, /^CRM_TOKEN_ESCRITORIO="[0-9a-f]{48}"$/m); assert.match(env, /^CRM_ESCUTA="0\.0\.0\.0"$/m);
  const reg = JSON.parse(fs.readFileSync(path.join(DADOS, 'sistemas.json'), 'utf8'));
  assert.equal(reg.crm.tipo, 'local'); assert.equal(reg.crm.porta, 4500); assert.equal(reg.crm.crm, true); assert.equal(reg.crm.pasta, CRM); assert.deepEqual(reg.crm.plataformas, []);
  assert.deepEqual(reg.leo.plataformas, ['crm']); assert.deepEqual(reg.tati.plataformas, ['crm']); assert.equal(reg.zap.plataformas, undefined, 'o atendente não entrou');
  const plats = JSON.parse(fs.readFileSync(path.join(DADOS, 'plataformas.json'), 'utf8'));
  const crm = plats.find(p => p.id === 'crm');
  assert.equal(crm.tipo, 'api'); assert.equal(crm.variaveis.CRM_URL, 'http://127.0.0.1:4500'); assert.equal(crm.variaveis.CRM_TOKEN, '');
  const tokLeo = crm.porAgente.leo.CRM_TOKEN, tokTati = crm.porAgente.tati.CRM_TOKEN;
  assert.match(tokLeo, /^[0-9a-f]{48}$/); assert.notEqual(tokLeo, tokTati, 'um token por agente');
  const envLeo = fs.readFileSync(path.join(DADOS, 'ag-leo', '.env'), 'utf8'), envTati = fs.readFileSync(path.join(DADOS, 'ag-tati', '.env'), 'utf8');
  assert.ok(envLeo.includes('CRM_TOKEN="' + tokLeo + '"') && envLeo.includes('CRM_URL="http://127.0.0.1:4500"') && /PLATAFORMAS_PERMITIDAS="crm"/.test(envLeo), 'o .env do Léo tem o token dele');
  assert.ok(envTati.includes('CRM_TOKEN="' + tokTati + '"') && !envTati.includes(tokLeo), 'o .env da Tati tem só o dela');
  assert.ok(envLeo.includes('GATILHO_CHAVE="g-1"'), 'o resto do .env ficou');
  const us = JSON.parse(fs.readFileSync(path.join(CRM, 'data', 'usuarios.json'), 'utf8'));
  assert.deepEqual(us.pessoas.map(p => [p.id, p.cargo]), [['dra-carla', 'chefe'], ['ana', 'recepcao']]);
  assert.ok(us.pessoas.every(p => p.senhaHash && !p.senha)); assert.deepEqual(us.agentes.map(a => a.id), ['leo', 'tati']); assert.ok(us.agentes.every(a => a.tokenHash && !a.token));
  const cargos = JSON.parse(fs.readFileSync(path.join(CRM, 'data', 'cargos.json'), 'utf8'));
  assert.equal(cargos.chefe.gerirPessoas, true); assert.equal(cargos.recepcao.verSensiveis, false); assert.equal(cargos['agente-prospeccao'].agente, true); assert.equal(cargos['agente-financeiro'].mover, true);
  const primeira = JSON.parse(fs.readFileSync(path.join(CRM, 'data', 'primeira-senha.json'), 'utf8'));
  assert.equal(primeira.login, 'dra-carla'); assert.match(primeira.senha, /^[0-9a-f]{8}$/);
  const escr = JSON.parse(fs.readFileSync(path.join(DADOS, 'crm.json'), 'utf8'));
  assert.equal(escr.url, 'http://127.0.0.1:4500'); assert.match(env, new RegExp('CRM_TOKEN_ESCRITORIO="' + escr.token + '"'));
  // de novo, só mudando a autonomia: tokens, segredos e senhas ficam
  fs.writeFileSync(arq, JSON.stringify({ autonomia: 'c' }));
  const r2 = roda(DADOS, CRM, ['aplicar', arq]);
  assert.equal(r2.json.ok, true, r2.saida); assert.deepEqual(r2.json.gravado.tokensNovos, []); assert.equal(r2.json.senhaDoChefe, 'já existia');
  const cfg2 = JSON.parse(fs.readFileSync(path.join(CRM, 'config.json'), 'utf8'));
  assert.equal(cfg2.autonomia, 'c'); assert.equal(cfg2.etapas.length, 4); assert.equal(cfg2.pessoas.length, 2);
  assert.equal(JSON.parse(fs.readFileSync(path.join(DADOS, 'plataformas.json'), 'utf8')).find(p => p.id === 'crm').porAgente.leo.CRM_TOKEN, tokLeo);
  assert.equal(fs.readFileSync(path.join(CRM, '.env'), 'utf8'), env);
  const at = roda(DADOS, CRM, ['atual']).json;
  assert.equal(at.criado, true); assert.equal(at.autonomia, 'c'); assert.ok(!JSON.stringify(at).includes(tokLeo));
});

test('aplicar recusa o que não dá para gravar: etapa sem nome, agente que não existe, Supabase sem plataforma, porta de outro', (t) => {
  const { DADOS, CRM, limpar } = cenario(); t.after(limpar);
  const arq = path.join(CRM, 'r.json');
  fs.writeFileSync(arq, JSON.stringify({ ...RESPOSTAS, etapas: [{ nome: '' }, { nome: 'X', responsavel: 'ninguem' }], agentes: ['fantasma'], fichas: { onde: 'supabase' }, porta: 4601 }));
  const r = roda(DADOS, CRM, ['aplicar', arq]);
  assert.equal(r.json.ok, false);
  const e = r.json.erros.join(' | ');
  assert.match(e, /toda etapa precisa de nome/); assert.match(e, /responsável desconhecido: ninguem/); assert.match(e, /agente não existe no escritório: fantasma/); assert.match(e, /cadastre-o em 🔌 Plataformas/); assert.match(e, /porta 4601 já é de Tati/);
  assert.ok(!fs.existsSync(path.join(CRM, 'config.json')), 'nada gravado');
  // com o Supabase cadastrado, o CRM recebe o bloco de plataformas no .env dele
  fs.writeFileSync(arq, JSON.stringify({ ...RESPOSTAS, fichas: { onde: 'supabase', plataforma: 'supa' } }));
  const r2 = roda(DADOS, CRM, ['aplicar', arq]);
  assert.equal(r2.json.ok, true, r2.saida); assert.equal(r2.json.gravado.supabase, 'bloco gravado em crm/.env');
  const env = fs.readFileSync(path.join(CRM, '.env'), 'utf8');
  assert.match(env, /SUPA_URL="https:\/\/x\.supabase\.co"/); assert.match(env, /SUPA_CHAVE="sk-brq-1"/); assert.match(env, /BANCO_CHAVE="sk-brq-1"/, 'o nome canônico também');
  assert.ok(!fs.readFileSync(path.join(CRM, 'config.json'), 'utf8').includes('sk-brq-1'));
});

test('propostas: sem laudo explica; com laudo vermelho trava; com laudo amarelo propõe entidade, etapas da esteira, agentes aptos e porta livre', (t) => {
  const { DADOS, CRM, limpar } = cenario(); t.after(limpar);
  assert.match(roda(DADOS, CRM, ['propostas']).json.motivo, /nenhum laudo/);
  const laudos = path.join(DADOS, 'cuki', 'laudos'); fs.mkdirSync(laudos, { recursive: true });
  const medidas = (geral) => ({ quando: new Date().toISOString(), empresa: 'Clínica Sorriso', geral, areas: {
    agentes: { cor: geral, agentes: [{ id: 'leo', nome: 'Léo', setor: 'Prospecção', trilha: 'tarefa', cor: 'verde', motivos: [] }, { id: 'tati', nome: 'Tati', setor: 'Financeiro', trilha: 'tarefa', cor: 'amarelo', motivos: ['em treinamento'] }] },
    plataformas: { cor: 'verde', plataformas: [] }, fluxo: { cor: 'amarelo', motivos: [] }, base: { cor: 'verde', motivos: [] },
    aptidao: { cor: 'verde', agentesAptos: [{ id: 'leo', nome: 'Léo', setor: 'Prospecção', entidade: 'paciente', tarefa: 'qualificar' }], agentesQuase: ['Tati'], plataformasUsaveis: [{ id: 'ag', nome: 'Agenda', tipo: 'agenda' }], motivos: [] } } });
  fs.writeFileSync(path.join(laudos, '2026-10-14T00-00-00.json'), JSON.stringify(medidas('vermelho')));
  fs.writeFileSync(path.join(laudos, '2026-10-14T00-00-00.md'), '# Laudo\n');
  const v = roda(DADOS, CRM, ['propostas']).json; assert.equal(v.vermelho, true); assert.match(v.motivo, /não começa/);
  fs.writeFileSync(path.join(laudos, '2026-10-14T00-10-00.json'), JSON.stringify(medidas('amarelo')));
  fs.writeFileSync(path.join(laudos, '2026-10-14T00-10-00.md'), '# Laudo\n');
  fs.writeFileSync(path.join(DADOS, 'esteiras.json'), JSON.stringify({ esteiras: [{ id: 'tratamento', nome: 'Tratamento', entidade: { singular: 'paciente', plural: 'pacientes' }, pasta: '', vigiarPasta: false, etapas: [{ id: 'qualificar', nome: 'Qualificar', agente: 'leo', entrega: '', aprovacao: 'nenhuma', aprovador: '' }, { id: 'cobrar', nome: 'Cobrar', agente: 'tati', entrega: '', aprovacao: 'pessoa', aprovador: 'Ana' }], criadaEm: 'x' }] }));
  fs.writeFileSync(path.join(DADOS, 'avisos.json'), JSON.stringify({ ntfy: { ativo: false }, whatsapp: { ativo: true, fone: '5565999999999', apikey: 'k' }, resumo: {}, historico: [] }));
  const p = roda(DADOS, CRM, ['propostas']).json;
  assert.equal(p.ok, true); assert.equal(p.ramo, 'clinica'); assert.deepEqual(p.entidade, { singular: 'paciente', plural: 'pacientes', chave: 'telefone' });
  assert.deepEqual(p.etapas.map(e => e.nome), ['Novo', 'Qualificar', 'Cobrar', 'Concluído']); assert.equal(p.etapas[1].responsavel, 'leo'); assert.equal(p.etapas[2].aprovacao, true);
  assert.deepEqual(p.agentes.map(a => a.id), ['leo']); assert.equal(p.agentes[0].cargo, 'Prospecção'); assert.deepEqual(p.agentesQuase.map(a => a.id), ['tati']);
  assert.deepEqual(p.atendentes.map(a => a.id), ['zap']); assert.equal(p.chefe, 'Dra. Carla'); assert.equal(p.celularDosAvisos, '5565999999999');
  assert.equal(p.integracoes.agenda, 'fonte'); assert.deepEqual(p.bancos.map(b => b.id), ['supa']); assert.equal(p.porta, 4500);
  assert.ok(!JSON.stringify(p).includes('sk-brq-1') && !JSON.stringify(p).includes('"k"'), 'propostas sem valores');
});

test('node cuki.js medir grava um laudo por código (sem o Claude) e node cuki.js laudo o lê', (t) => {
  const { DADOS, CRM, limpar } = cenario(); t.after(limpar);
  const r = spawnSync(process.execPath, ['cuki.js', 'medir'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ESCRITORIO_DADOS: DADOS } });
  const j = JSON.parse(r.stdout.trim().split('\n').pop());
  assert.equal(j.ok, true, r.stderr); assert.equal(j.geral, 'vermelho', 'agentes fora do ar'); assert.equal(j.areas.agentes.cor, 'vermelho'); assert.match(j.texto, /Leitura do Cuki BOT\n\n\(análise sem o Claude Code/);
  assert.equal(fs.readdirSync(path.join(DADOS, 'cuki', 'laudos')).length, 2);
  const l = JSON.parse(spawnSync(process.execPath, ['cuki.js', 'laudo'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ESCRITORIO_DADOS: DADOS } }).stdout.trim().split('\n').pop());
  assert.equal(l.ok, true); assert.equal(l.geral, 'vermelho');
});
