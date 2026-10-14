const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

/* O sistema do CRM de ponta a ponta: criado por crm/criar.js numa pasta
   temporária, subido com crm/server.js, usado por uma pessoa (login) e por
   um agente (token da plataforma). Sem o escritório no ar (os avisos vão
   para um escritório falso que anota o /api/avisar). */
const ROOT = path.join(__dirname, '..', '..');
const PORT = 4593, PORT_ESC = 4594;
const URL = 'http://127.0.0.1:' + PORT;
let DADOS, CRM, proc, esc, avisos = [], eventos = [], acoes = [];
async function subir() {
  DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-dados-')); CRM = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-pasta-'));
  fs.mkdirSync(path.join(CRM, 'painel')); for (const f of ['index.html', 'app.js', 'style.css']) fs.copyFileSync(path.join(ROOT, 'crm', 'painel', f), path.join(CRM, 'painel', f));
  const ag = path.join(DADOS, 'ag-leo'); fs.mkdirSync(ag); fs.writeFileSync(path.join(ag, '.env'), '');
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify({ leo: { nome: 'Léo', tipo: 'local', pasta: ag, comando: 'node', args: ['server.js'], porta: 4595, trilha: 'tarefa', setor: 'Prospecção', plataformas: [] } }));
  fs.writeFileSync(path.join(DADOS, 'config.json'), JSON.stringify({ empresa: 'Clínica Sorriso', dono: 'Dra. Carla', porta: PORT_ESC }));
  const resp = path.join(CRM, 'r.json');
  fs.writeFileSync(resp, JSON.stringify({ entidade: { singular: 'paciente', plural: 'pacientes', chave: 'telefone' }, etapas: [{ nome: 'Novo contato', responsavel: 'leo' }, { nome: 'Avaliação', responsavel: 'pessoa:Ana' }, { nome: 'Em tratamento', responsavel: 'pessoa:Ana', aprovacao: true }, { nome: 'Concluído', responsavel: 'pessoa:chefe' }],
    pessoas: [{ nome: 'Ana', funcao: 'recepção' }], agentes: [{ id: 'leo', cargo: 'Prospecção' }], chefe: 'Dra. Carla', autonomia: 'b', sensiveis: ['cpf'], acesso: 'aqui', fichas: { onde: 'local' }, porta: PORT }));
  const r = spawnSync(process.execPath, ['crm/criar.js', 'aplicar', resp], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, ESCRITORIO_DADOS: DADOS, CRM_PASTA: CRM } });
  const j = JSON.parse(r.stdout.trim().split('\n').pop()); if (!j.ok) throw new Error('criar falhou: ' + r.stdout + r.stderr);
  // o escritório falso: só anota os avisos
  esc = http.createServer((req, res) => { let s = ''; req.on('data', d => s += d); req.on('end', () => { if (req.url === '/api/avisar') avisos.push(JSON.parse(s)); if (req.url === '/api/crm/evento') { eventos.push(JSON.parse(s)); return res.end('{"ok":true}'); } if (req.url === '/api/crm/ferramentas') return res.end(JSON.stringify({ ok: true, ferramentas: [{ nome: 'agenda', uso: ['node tools/agenda.js criar <quando>'] }] })); if (req.url === '/api/crm/acao') { acoes.push(JSON.parse(s)); return res.end(JSON.stringify({ ok: true, modo: 'real', resultado: { estado: 'feito', detalhe: 'evento criado' } })); } if (req.url === '/api/sistemas') return res.end(JSON.stringify([{ id: 'leo', nome: 'Léo', estado: 'no ar', setor: 'Prospecção', construcao: { emTreinamento: false } }])); res.end('{"ok":true}'); }); });
  await new Promise(r => esc.listen(PORT_ESC, '127.0.0.1', r));
  proc = spawn(process.execPath, ['server.js'], { cwd: path.join(ROOT, 'crm'), env: { ...process.env, CRM_PASTA: CRM, PORT: String(PORT), ESCRITORIO_PORTA: String(PORT_ESC) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = ''; proc.stdout.on('data', d => saida += d); proc.stderr.on('data', d => saida += d);
  for (let i = 0; i < 60; i++) { try { await fetch(URL + '/saude'); return; } catch (e) { await new Promise(r => setTimeout(r, 200)); } }
  throw new Error('o CRM não subiu: ' + saida);
}
function derrubar() { try { proc.kill(); } catch (e) {} esc.close(); fs.rmSync(DADOS, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); fs.rmSync(CRM, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
const api = async (rota, metodo = 'GET', corpo, auth) => {
  const h = { 'Content-Type': 'application/json' }; if (auth && auth.cookie) h.Cookie = auth.cookie; if (auth && auth.token) h.Authorization = 'Bearer ' + auth.token; if (auth && auth.modo) h['x-modo'] = auth.modo;
  const r = await fetch(URL + rota, { method: metodo, headers: h, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})), cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
};
const espera = (ms) => new Promise(r => setTimeout(r, ms));

test('CRM de ponta a ponta: login, ficha única pela chave, agente com token e autonomia b, propostas, assumir e devolver, sensíveis, tarefas, importação, painel, equipe', async (t) => {
  await subir(); t.after(derrubar);
  const saude = (await api('/saude')).json; assert.equal(saude.ok, true); assert.equal(saude.resumo.onde, 'local'); assert.equal(saude.escritorioPorta, PORT_ESC);
  assert.equal((await api('/api/fichas')).status, 401, 'sem login, nada');
  // a senha do chefe aparece UMA vez, só desta máquina
  const p1 = (await api('/api/primeira-senha')).json; assert.equal(p1.ok, true); assert.equal(p1.login, 'dra-carla'); assert.equal((await api('/api/primeira-senha')).json.ok, false, 'não aparece de novo');
  assert.equal((await api('/api/entrar', 'POST', { login: 'dra-carla', senha: 'errada' })).status, 401);
  const ent = await api('/api/entrar', 'POST', { login: 'dra-carla', senha: p1.senha }); assert.equal(ent.status, 200); assert.equal(ent.json.pessoa.trocarSenha, true);
  const chefe = { cookie: ent.cookie };
  assert.equal((await api('/api/senha', 'POST', { atual: p1.senha, nova: 'nova-senha-7' }, chefe)).json.ok, true);
  const eu = (await api('/api/eu', 'GET', null, chefe)).json.eu; assert.equal(eu.cargo, 'chefe'); assert.equal(eu.permissoes.aprovar, true);
  // o token do Léo, lido do .env dele (gravado pela plataforma crm)
  const envLeo = fs.readFileSync(path.join(DADOS, 'ag-leo', '.env'), 'utf8'); const token = new RegExp('CRM_TOKEN=' + '"([0-9a-f]{48})"').exec(envLeo)[1];   // string partida: o conferidor não confunde com chave de verdade
  const leo = { token }; const leoProp = { token, modo: 'proposta' }; const leoEnsaio = { token, modo: 'ensaio' };
  assert.equal((await api('/api/eu', 'GET', null, leo)).json.eu.tipo, 'agente');
  assert.equal((await api('/api/eu', 'GET', null, { token: 'a'.repeat(48) })).status, 401, 'token inválido');
  // o agente cria uma ficha direto (autonomia b, etapa sem aprovação); a mesma chave não duplica
  const c1 = await api('/api/fichas', 'POST', { chave: '(65) 99999-0001', campos: { nome: 'João', origem: 'whatsapp' } }, leo);
  assert.equal(c1.status, 200); assert.equal(c1.json.ficha.chave, '65999990001'); assert.equal(c1.json.ficha.etapa, 'novo-contato'); assert.deepEqual(c1.json.ficha.responsavel, { tipo: 'agente', id: 'leo' });
  const c2 = await api('/api/fichas', 'POST', { chave: '65999990001', campos: { nome: 'João de novo' } }, leo); assert.equal(c2.json.existente, true); assert.equal(c2.json.ficha.id, c1.json.ficha.id);
  const id = c1.json.ficha.id;
  assert.equal((await api('/api/fichas', 'POST', { chave: '65999990002', campos: { nome: 'Teste' } }, leoEnsaio)).json.ensaio, true, 'em ensaio nada grava');
  // anotar direto; campo sensível vira proposta; mover para etapa com aprovação vira proposta; mensagem vira proposta
  assert.equal((await api('/api/fichas/' + id + '/anotar', 'POST', { texto: 'ligou, quer avaliação' }, leo)).json.feito, 'anotar: ligou, quer avaliação');
  assert.equal((await api('/api/fichas/(65) 99999-0001/anotar', 'POST', { texto: 'pela chave' }, leo)).json.ok, true, 'anotar pela chave (o telefone), não só pelo id');
  assert.equal((await api('/api/fichas/65999990001/agente', 'POST', { estado: { status: 'nova' } }, leo)).json.ok, true, 'estado pela chave');
  const cpf = await api('/api/fichas/' + id + '/campo', 'POST', { campo: 'cpf', valor: '12345678901' }, leo); assert.equal(cpf.json.proposta, true); assert.match(cpf.json.motivo, /sensível/);
  const mv = await api('/api/fichas/' + id + '/mover', 'POST', { etapa: 'em-tratamento' }, leo); assert.equal(mv.json.proposta, true); assert.match(mv.json.motivo, /pede uma pessoa/);
  const mv2 = await api('/api/fichas/' + id + '/mover', 'POST', { etapa: 'avaliacao' }, leo); assert.equal(mv2.json.feito, 'mover de "Novo contato" para "Avaliação"'); assert.deepEqual(mv2.json.ficha.responsavel, { tipo: 'pessoa', id: 'ana' }, 'a etapa tem responsável pessoa: a ficha passa para ela');
  // agora a ficha está com a Ana: o agente não escreve nela
  const bloq = await api('/api/fichas/' + id + '/anotar', 'POST', { texto: 'x' }, leo); assert.equal(bloq.status, 409); assert.match(bloq.json.motivo, /com uma pessoa: Ana/);
  assert.equal((await api('/api/fichas/' + id + '/anotar', 'POST', { texto: 'x' }, leoProp)).status, 409, 'nem como proposta');
  // o chefe aprova o CPF e rejeita o tratamento; o agente vê o CPF mascarado, o chefe inteiro
  const pend = (await api('/api/propostas', 'GET', null, chefe)).json.propostas; assert.equal(pend.length, 2);
  assert.equal((await api('/api/propostas/' + pend.find(p => p.acao === 'campo').id + '/aprovar', 'POST', {}, chefe)).json.ok, true);
  assert.equal((await api('/api/propostas/' + pend.find(p => p.acao === 'mover').id + '/rejeitar', 'POST', { motivo: 'ainda não' }, chefe)).json.ok, true);
  assert.equal((await api('/api/propostas/' + pend[0].id + '/aprovar', 'POST', {}, chefe)).status, 400, 'já decidida');
  const fChefe = (await api('/api/fichas/' + id, 'GET', null, chefe)).json.ficha; assert.equal(fChefe.campos.cpf, '12345678901'); assert.equal(fChefe.etapa, 'avaliacao');
  assert.ok(fChefe.historico.some(h => /aprovou a proposta de Léo/.test(h.texto)) && fChefe.historico.some(h => /rejeitou a proposta de Léo.*ainda não/.test(h.texto)));
  // devolver ao agente com o que a pessoa fez: vira "feito pelo dono"; então o agente escreve de novo e vê o CPF mascarado
  assert.equal((await api('/api/fichas/' + id + '/atribuir', 'POST', { responsavel: { tipo: 'agente', id: 'leo' }, observacao: 'já confirmei o horário por telefone' }, chefe)).json.ok, true);
  const fLeo = (await api('/api/fichas/' + id, 'GET', null, leo)).json.ficha; assert.equal(fLeo.campos.cpf, '*******8901'); assert.equal(fLeo.feitoPeloDono[0].texto, 'já confirmei o horário por telefone');
  assert.equal((await api('/api/fichas/' + id + '/anotar', 'POST', { texto: 'de volta comigo' }, leo)).json.ok, true);
  // a Ana (cargo recepção) não aprova, não vê sensível, mas edita e move
  const senhas = JSON.parse(fs.readFileSync(path.join(CRM, 'data', 'senhas-iniciais.json'), 'utf8')); const ana = { cookie: (await api('/api/entrar', 'POST', { login: 'ana', senha: senhas.find(s => s.login === 'ana').senha })).cookie };
  assert.equal((await api('/api/fichas/' + id, 'GET', null, ana)).json.ficha.campos.cpf, '*******8901');
  assert.match((await api('/api/propostas/' + pend[0].id + '/aprovar', 'POST', {}, ana)).json.motivo, /cargo de aprovar/);
  assert.equal((await api('/api/fichas/' + id + '/campo', 'POST', { campo: 'email', valor: 'joao@x.com' }, ana)).json.ok, true);
  // tarefas: pessoa cria direto; agente propõe; a pessoa conclui
  const tp = await api('/api/tarefas', 'POST', { fichaId: id, titulo: 'ligar amanhã', prazo: '2026-10-15' }, chefe); assert.equal(tp.json.tarefa.para.id, 'leo', 'sem "para", vai para o responsável da ficha');
  const ta = await api('/api/tarefas', 'POST', { fichaId: id, titulo: 'confirmar endereço', para: { tipo: 'pessoa', id: 'ana' } }, leo); assert.equal(ta.json.proposta, true);
  assert.equal((await api('/api/tarefas/' + tp.json.tarefa.id + '/feita', 'POST', { resultado: 'ligado' }, leo)).json.ok, true);
  assert.equal((await api('/api/tarefas?abertas=1', 'GET', null, chefe)).json.tarefas.length, 0);
  // importar: repetidas não duplicam
  const im = await api('/api/importar', 'POST', { csv: 'Nome;Fone;E-mail\n"Maria";65999990003;m@x.com\nJoão;(65) 99999-0001;\n;;\n', mapa: { nome: 'Nome', telefone: 'Fone', email: 'E-mail' } }, chefe);
  assert.equal(im.json.criadas, 1); assert.equal(im.json.repetidas, 1); assert.equal(im.json.semChave, 1);
  assert.equal((await api('/api/importar', 'POST', { csv: 'a\nb' }, leo)).status, 400, 'agente não importa');
  // perdido, filtros, painel, equipe, avisos
  const fichas = (await api('/api/fichas?q=maria', 'GET', null, chefe)).json.fichas; assert.equal(fichas.length, 1); assert.equal(fichas[0].campos.nome, 'Maria');
  assert.equal((await api('/api/fichas/' + fichas[0].id + '/perder', 'POST', { motivo: 'sem retorno' }, ana)).json.ficha.status, 'perdida');
  assert.equal((await api('/api/fichas?status=perdida', 'GET', null, chefe)).json.fichas.length, 1); assert.equal((await api('/api/fichas', 'GET', null, chefe)).json.fichas.length, 1);
  const pn = (await api('/api/painel', 'GET', null, chefe)).json; assert.equal(pn.ativas, 1); assert.equal(pn.perdidas, 1); assert.equal(pn.propostasPendentes, 1); assert.equal(pn.porEtapa.find(e => e.id === 'avaliacao').total, 1);
  const eq = (await api('/api/equipe', 'GET', null, ana)).json; assert.equal(eq.agentes[0].estado, 'no ar'); assert.equal(eq.pessoas.length, 2); assert.equal(eq.escritorioNoAr, true);
  await espera(200);
  assert.ok(avisos.some(a => /Proposta no CRM/.test(a.titulo) && /Léo quer/.test(a.texto)), 'propostas avisam pelo escritório');
  // a tela e o log existem; o log não tem senha nem token
  assert.match(await (await fetch(URL + '/')).text(), /Entrar no CRM/);
  const log = await (await fetch(URL + '/log')).text(); assert.ok(!log.includes(p1.senha) && !log.includes(token) && !log.includes('nova-senha-7'));
  // 4c: o agente grava o próprio estado na ficha (e a rodada 'pronta' entra no histórico); a chefe pondo a ficha com o Léo avisa o escritório; ação direta
  const ag = await api('/api/fichas/' + id + '/agente', 'POST', { estado: { id: '65999990001', status: 'pronta', rodadas: [{ modo: 'real' }], atualizado: new Date().toISOString() } }, leo);
  assert.equal(ag.json.ok, true); assert.equal((await api('/api/fichas/' + id + '/agente', 'POST', { estado: {} }, chefe)).status, 400, 'só o agente grava o próprio estado');
  const fAg = (await api('/api/fichas/' + id, 'GET', null, chefe)).json.ficha; assert.equal(fAg.agentes.leo.status, 'pronta'); assert.ok(fAg.historico.some(h => /rodada do agente: pronta/.test(h.texto)));
  const fLeo2 = (await api('/api/fichas/' + id, 'GET', null, leo)).json.ficha; assert.deepEqual(Object.keys(fLeo2.agentes), ['leo'], 'o agente vê só o próprio estado');
  eventos.length = 0; await api('/api/fichas/' + id + '/atribuir', 'POST', { responsavel: { tipo: 'pessoa', id: 'ana' } }, chefe);
  assert.equal((await api('/api/fichas/' + id + '/mover', 'POST', { etapa: 'novo-contato' }, chefe)).json.ok, true); await espera(300);
  assert.equal(eventos.length, 1, 'mover para a etapa do agente avisa o escritório'); assert.equal(eventos[0].tipo, 'com-agente'); assert.equal(eventos[0].agente, 'leo'); assert.equal(eventos[0].segredo, new RegExp('CRM_SEGREDO_EVENTO=' + '"([0-9a-f]+)"').exec(fs.readFileSync(path.join(CRM, '.env'), 'utf8'))[1]); assert.equal(eventos[0].ficha.id, id);
  const fer = await api('/api/acoes/ferramentas', 'POST', { agente: 'leo' }, chefe); assert.equal(fer.json.ferramentas[0].nome, 'agenda');
  const acao = await api('/api/acoes', 'POST', { agente: 'leo', ferramenta: 'agenda', args: ['criar', 'amanhã'], fichaId: id }, chefe);
  assert.equal(acao.json.ok, true, JSON.stringify(acao.json)); assert.equal(acoes[0].entidade, '65999990001'); assert.equal(acoes[0].ferramenta, 'agenda');
  assert.ok((await api('/api/fichas/' + id, 'GET', null, chefe)).json.ficha.historico.some(h => /ação direta|pediu a Léo: agenda criar amanhã → feito: evento criado/.test(h.texto)));
  assert.equal((await api('/api/acoes', 'POST', { agente: 'leo', ferramenta: 'agenda', args: [] }, leo)).status, 400, 'agente não pede ação direta');
  assert.equal((await api('/api/sair', 'POST', {}, chefe)).json.ok, true); assert.equal((await api('/api/eu', 'GET', null, chefe)).status, 401);
});
