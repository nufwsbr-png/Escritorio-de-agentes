const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

/* Dois agentes falsos: respondem /entidades e /gatilho como o servidor do
   agente de tarefa faria, e mudam o estado da entidade quando mandamos. O
   escritório é o módulo esteiras.js com registro, mensagens e avisos falsos. */
function agenteFalso(chave) {
  const estado = { entidades: new Map(), gatilhos: [], emAndamento: 0 };
  const srv = http.createServer((req, res) => {
    if (req.headers['x-chave'] !== chave) { res.writeHead(401); return res.end(); }
    if (req.url === '/entidades') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ ok: true, entidades: [...estado.entidades.values()], resumo: { 'em andamento': estado.emAndamento } }));
    }
    if (req.url === '/gatilho') { let s = ''; req.on('data', d => s += d); req.on('end', () => { const b = JSON.parse(s); estado.gatilhos.push(b); estado.entidades.set(b.entidade, { id: b.entidade, status: 'em andamento', rodadas: 1, atualizado: new Date(Date.now() + 1000).toISOString() }); res.writeHead(202); res.end('{"ok":true}'); }); return; }
    res.writeHead(404); res.end();
  });
  return { srv, estado, marcar: (ent, status, extra = {}) => estado.entidades.set(ent, { id: ent, status, rodadas: 1, atualizado: new Date(Date.now() + 2000).toISOString(), ...extra }) };
}
async function cenario() {
  const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esteiras-'));
  const pastaA = path.join(DADOS, 'ag-a'), pastaB = path.join(DADOS, 'ag-b'); fs.mkdirSync(pastaA); fs.mkdirSync(pastaB);
  fs.writeFileSync(path.join(pastaA, '.env'), 'GATILHO_CHAVE="chave-a"\n'); fs.writeFileSync(path.join(pastaB, '.env'), 'GATILHO_CHAVE="chave-b"\n');
  const A = agenteFalso('chave-a'), B = agenteFalso('chave-b');
  await new Promise(r => A.srv.listen(0, '127.0.0.1', r)); await new Promise(r => B.srv.listen(0, '127.0.0.1', r));
  const compartilhada = path.join(DADOS, 'clientes'); fs.mkdirSync(compartilhada);
  const registro = { a: { nome: 'Tati', pasta: pastaA, porta: A.srv.address().port, trilha: 'tarefa' }, b: { nome: 'Léo', pasta: pastaB, porta: B.srv.address().port, trilha: 'tarefa' }, z: { nome: 'Zé', pasta: pastaA, porta: 1, trilha: 'atendimento' } };
  const recados = [], avisos = [], ligados = [];
  const E = require('../../esteiras').init({
    DADOS, lerRegistro: () => registro,
    plataformas: { obter: (id, v) => id === 'drive' ? { id: 'drive', tipo: 'pasta', variaveis: v ? { DRIVE_PASTA: compartilhada } : undefined } : id === 'ophir' ? { id: 'ophir', tipo: 'api' } : null, prefixoDe: (id) => id.toUpperCase().replace(/-/g, '_') + '_' },
    mensagens: { enviar: (m) => { recados.push(m); return { ok: true, mensagem: m }; } },
    avisar: async (t, x, p) => { avisos.push({ t, x, p }); }, ligar: async (id) => { ligados.push(id); }
  });
  return { DADOS, E, A, B, registro, recados, avisos, ligados, compartilhada, limpar: () => { A.srv.close(); B.srv.close(); fs.rmSync(DADOS, { recursive: true, force: true }); } };
}
const DEF = { nome: 'Processo novo', entidade: { singular: 'processo', plural: 'processos' }, pasta: 'drive', etapas: [
  { nome: 'Fechamento de pasta', agente: 'a', entrega: 'pasta organizada' },
  { nome: 'Petição inicial', agente: 'b', entrega: 'petição em rascunho', aprovacao: 'pessoa', aprovador: 'Dra. Ana' }
] };

test('validar e salvar: ids em slug, agente de tarefa obrigatório, pasta precisa ser plataforma do tipo pasta', async () => {
  const c = await cenario();
  try {
    assert.match(c.E.salvar({ nome: '', etapas: [] }).motivo, /nome/);
    assert.match(c.E.salvar({ nome: 'X', etapas: [] }).motivo, /etapa/);
    assert.match(c.E.salvar({ nome: 'X', etapas: [{ nome: 'E', agente: 'z' }] }).motivo, /não é um agente de tarefa/);
    assert.match(c.E.salvar({ nome: 'X', etapas: [{ nome: 'E', agente: 'ninguem' }] }).motivo, /não existe/);
    assert.match(c.E.salvar({ nome: 'X', pasta: 'ophir', etapas: [{ nome: 'E', agente: 'a' }] }).motivo, /tipo pasta/);
    const r = c.E.salvar(DEF);
    assert.equal(r.ok, true, r.motivo);
    assert.equal(r.esteira.id, 'processo-novo'); assert.deepEqual(r.esteira.etapas.map(e => e.id), ['fechamento-de-pasta', 'peticao-inicial']);
    assert.equal(r.esteira.etapas[0].aprovacao, 'nenhuma'); assert.equal(r.esteira.etapas[1].aprovador, 'Dra. Ana');
    assert.equal(c.E.listar().length, 1);
    assert.deepEqual(c.E.agentesCandidatos().map(a => a.id), ['a', 'b'], 'o atendente fica de fora');
    assert.equal(c.E.remover('processo-novo').ok, true); assert.equal(c.E.remover('processo-novo').ok, false);
  } finally { c.limpar(); }
});

test('a entidade anda sozinha: gatilho com contexto, pronta vira recado + gatilho do próximo, aprovação espera a tela, devolver refaz', async () => {
  const c = await cenario();
  try {
    c.E.salvar(DEF);
    const r = await c.E.entrar('processo-novo', 'processo da cliente 1', 'teste');
    assert.equal(r.ok, true, r.motivo);
    assert.equal(r.estado.status, 'andando'); assert.equal(r.estado.etapa, 0);
    assert.equal(c.A.estado.gatilhos.length, 1);
    const g = c.A.estado.gatilhos[0];
    assert.equal(g.entidade, 'processo da cliente 1');
    assert.match(g.extra, /ESTEIRA "Processo novo", etapa 1 de 2: "Fechamento de pasta"/); assert.match(g.extra, /pasta organizada/);
    assert.ok(g.extra.includes(path.join(c.compartilhada, 'processo da cliente 1', 'fechamento-de-pasta')), 'diz onde gravar a entrega');
    assert.equal((await c.E.entrar('processo-novo', 'processo da cliente 1')).ok, false, 'não entra duas vezes');

    await c.E.tick();
    assert.equal(c.E.estadoDe('processo-novo', 'processo da cliente 1').status, 'andando', 'em andamento no agente = andando');

    // a Tati marca pronta: o escritório passa para o Léo, com recado e gatilho que cita a etapa anterior
    c.A.marcar('processo da cliente 1', 'pronta');
    await c.E.tick();
    let est = c.E.estadoDe('processo-novo', 'processo da cliente 1');
    assert.equal(est.etapa, 1); assert.equal(est.status, 'andando');
    assert.equal(c.recados.length, 1); assert.equal(c.recados[0].de, 'a'); assert.equal(c.recados[0].para, 'b'); assert.match(c.recados[0].texto, /Fechamento de pasta.*pronta.*Petição inicial/);
    assert.equal(c.B.estado.gatilhos.length, 1); assert.match(c.B.estado.gatilhos[0].extra, /etapa 2 de 2.*A etapa anterior, "Fechamento de pasta", foi feita por Tati/);

    // o Léo pergunta: a entidade para nessa etapa e avisa uma vez
    c.B.marcar('processo da cliente 1', 'aguardando pergunta', { pergunta: 'qual o valor da causa?' });
    await c.E.tick(); await c.E.tick();
    est = c.E.estadoDe('processo-novo', 'processo da cliente 1');
    assert.equal(est.status, 'parada (pergunta)'); assert.equal(est.motivo, 'qual o valor da causa?');
    assert.equal(c.avisos.filter(a => /parada/.test(a.t)).length, 1, 'avisa uma vez só');

    // o Léo termina: etapa com aprovação espera a tela; aprovar antes da hora é recusado
    c.B.marcar('processo da cliente 1', 'pronta');
    await c.E.tick();
    est = c.E.estadoDe('processo-novo', 'processo da cliente 1');
    assert.equal(est.status, 'aguardando aprovação'); assert.equal(est.etapa, 1);
    assert.ok(c.avisos.some(a => /esperando aprovação/.test(a.t) && /Dra\. Ana/.test(a.x)));
    await c.E.tick();
    assert.equal(c.E.estadoDe('processo-novo', 'processo da cliente 1').status, 'aguardando aprovação', 'esperar não muda nada');

    // devolver: recado do dono ao Léo, gatilho com refazer e a observação
    const d = await c.E.devolver('processo-novo', 'processo da cliente 1', 'Dra. Ana', 'faltou o pedido de tutela');
    assert.equal(d.ok, true, d.motivo);
    assert.equal(c.B.estado.gatilhos.length, 2); assert.equal(c.B.estado.gatilhos[1].refazer, true); assert.match(c.B.estado.gatilhos[1].extra, /DEVOLVIDA POR Dra\. Ana.*faltou o pedido de tutela/);
    assert.equal(c.recados[c.recados.length - 1].de, 'dono'); assert.equal(c.recados[c.recados.length - 1].para, 'b');
    assert.equal(c.E.estadoDe('processo-novo', 'processo da cliente 1').status, 'andando');
    assert.equal((await c.E.aprovar('processo-novo', 'processo da cliente 1')).ok, false, 'só aprova quando está esperando');

    // pronta de novo → aprovar → concluída (última etapa), com aviso
    c.B.marcar('processo da cliente 1', 'pronta');
    await c.E.tick();
    const ap = await c.E.aprovar('processo-novo', 'processo da cliente 1', 'Dra. Ana');
    assert.equal(ap.ok, true); assert.equal(ap.estado.status, 'concluída');
    assert.ok(c.avisos.some(a => /concluído/.test(a.t)));
    assert.ok(ap.estado.historico.some(h => h.evento === 'aprovada' && h.por === 'Dra. Ana'));
    const tela = c.E.estado();
    assert.equal(tela.esteiras[0].etapas[0].agenteNome, 'Tati'); assert.equal(tela.entidades.length, 1);
    // pode entrar de novo depois de concluída
    assert.equal((await c.E.entrar('processo-novo', 'processo da cliente 1')).ok, true);
  } finally { c.limpar(); }
});

test('fila e pasta vigiada: agente ocupado ou fora do ar deixa na fila (e tenta ligar); subpasta nova entra sozinha; ensaiada conta como pronta', async () => {
  const c = await cenario();
  try {
    c.E.salvar({ ...DEF, vigiarPasta: true, etapas: [DEF.etapas[0]] });
    c.A.estado.emAndamento = 1;
    const r = await c.E.entrar('processo-novo', 'p2');
    assert.equal(r.estado.status, 'na fila'); assert.match(r.estado.motivo, /ocupado/); assert.equal(c.A.estado.gatilhos.length, 0);
    c.A.estado.emAndamento = 0;
    await c.E.tick();
    assert.equal(c.E.estadoDe('processo-novo', 'p2').status, 'andando'); assert.equal(c.A.estado.gatilhos.length, 1);

    fs.mkdirSync(path.join(c.compartilhada, 'p3')); fs.mkdirSync(path.join(c.compartilhada, '_modelos'));
    await c.E.tick();
    const p3 = c.E.estadoDe('processo-novo', 'p3');
    assert.ok(p3, 'a subpasta nova virou entidade'); assert.equal(p3.historico[0].por, 'pasta vigiada');
    assert.equal(c.E.estadoDe('processo-novo', '_modelos'), null, 'pasta com _ é ignorada');

    c.A.marcar('p3', 'ensaiada');
    await c.E.tick();
    assert.equal(c.E.estadoDe('processo-novo', 'p3').status, 'concluída', 'uma etapa só: ensaiada conclui');

    // agente fora do ar: fica na fila, tenta ligar uma vez por minuto
    c.A.srv.close();
    const r4 = await c.E.entrar('processo-novo', 'p4');
    assert.equal(r4.estado.status, 'na fila'); assert.match(r4.estado.motivo, /fora do ar/); assert.deepEqual(c.ligados, ['a']);
    await c.E.tick();
    assert.deepEqual(c.ligados, ['a'], 'não insiste em ligar a cada tick');
  } finally { c.limpar(); }
});
