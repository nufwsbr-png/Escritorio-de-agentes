const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

/* O WhatsApp do Cuki BOT com um WAHA FALSO: um servidor http que anota o que
   recebe (sendText, PUT da sessão) e devolve o que o teste manda (estado da
   sessão, mensagens de um chat). O Claude fica desligado
   (ESCRITORIO_CUKI_SEM_CLAUDE=1): a resposta é a montada por código. */
process.env.ESCRITORIO_CUKI_SEM_CLAUDE = '1';

async function wahaFalso() {
  const w = { enviados: [], sessao: { name: 'default', status: 'WORKING', me: { id: '556500000000@c.us', pushName: 'Cuki' } }, webhook: null, mensagens: {}, chaves: [] };
  const srv = http.createServer((req, res) => {
    let s = ''; req.on('data', d => s += d);
    req.on('end', () => {
      w.chaves.push(req.headers['x-api-key'] || '');
      const j = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (req.method === 'GET' && req.url === '/api/sessions/default') return j(200, w.sessao);
      if (req.method === 'PUT' && req.url === '/api/sessions/default') { w.webhook = JSON.parse(s); return j(200, w.sessao); }
      if (req.method === 'POST' && req.url === '/api/sendText') { w.enviados.push(JSON.parse(s)); return j(201, { id: 'm' + w.enviados.length }); }
      if (req.method === 'GET' && req.url === '/api/default/auth/qr?format=image') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47])); }
      const m = /^\/api\/default\/chats\/([^/]+)\/messages/.exec(req.url);
      if (req.method === 'GET' && m) return j(200, w.mensagens[decodeURIComponent(m[1])] || []);
      j(404, { message: 'rota falsa não existe: ' + req.method + ' ' + req.url });
    });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  w.url = 'http://127.0.0.1:' + srv.address().port; w.fechar = () => srv.close();
  return w;
}

function cenario(w) {
  const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'cuki-wa-'));
  const pasta = path.join(DADOS, 'ag'); fs.mkdirSync(path.join(pasta, 'memoria'), { recursive: true });
  fs.writeFileSync(path.join(pasta, 'progresso-do-agente.md'), '# Progresso\nTarefa em uma frase: organizar notas\nEntidade (a unidade de trabalho): cliente\n\n- [x] 1. a\n- [x] 2. PORTÃO ok\n');
  fs.writeFileSync(path.join(pasta, '.env'), 'GATILHO_CHAVE="gat-7"\nOPHIR_TOKEN="oph-9"\n');
  fs.writeFileSync(path.join(pasta, 'memoria', 'escritorio.md'), '# Memória\n\n- O Drive fica na pasta de clientes.\n');
  const registro = { a: { nome: 'Tati', setor: 'Financeiro', pasta, porta: 1, trilha: 'tarefa' } };
  const C = require('../../cuki').init({
    DADOS, PORT: 4321, lerRegistro: () => registro,
    estado: async () => [{ id: 'a', nome: 'Tati', setor: 'Financeiro', trilha: 'tarefa', estado: 'no ar', pasta, construcao: { passo: 15, total: 15, portao: true, emTreinamento: false, concluido: true }, propostasPendentes: 1, recadosNovos: 0, sobre: 'Organiza as notas' },
                          { id: 'b', nome: 'Léo', trilha: 'tarefa', estado: 'caiu', construcao: null, propostasPendentes: 0, recadosNovos: 2 }],
    memoria: { lerMemoria: (id) => id === 'a' ? fs.readFileSync(path.join(pasta, 'memoria', 'escritorio.md'), 'utf8') : null, propostas: (id) => id === 'a' ? [{ estado: 'pendente', titulo: 'Nova lição', arquivo: 'memoria/licoes.md' }] : [], novos: () => [{ de: 'a', deNome: 'Tati', para: 'b', paraNome: 'Léo', quando: Date.now() - 1000, entregue: false, texto: 'CPF do cliente 123' }] },
    esteiras: { estado: () => ({ esteiras: [{ id: 'nf', nome: 'Notas', entidade: { singular: 'cliente' }, etapas: [{ nome: 'Receber', agente: 'a', agenteNome: 'Tati' }, { nome: 'Conferir', agente: 'dono', agenteNome: 'dono' }] }],
                                 entidades: [{ esteira: 'nf', entidade: 'Padaria do João', slug: 'padaria-do-joao', etapa: 1, status: 'esperando aprovação', atualizado: new Date().toISOString(), historico: [] },
                                             { esteira: 'nf', entidade: 'Loja da Ana', slug: 'loja-da-ana', etapa: 1, status: 'concluída', atualizado: new Date().toISOString(), historico: [] }] }), entidadesDoAgente: async () => ({ ok: false, motivo: 'x' }) },
    reuniao: () => ({ historico: () => [{ dia: '2026-10-13', participantes: 2 }], lerAta: () => ({ briefing: 'Reunião boa.' }), placar: async () => ({ descricao: 'fechar contratos', alvo: 10, feito: 4, unidade: 'contratos', diasRestantes: 20, semMeta: false }) }),
    avisos: { ler: () => ({ ntfy: { ativo: false }, whatsapp: { ativo: false }, resumo: { hora: 9, minuto: 0 }, historico: [{ quando: new Date().toISOString(), titulo: 'Sistema fora do ar' }] }) },
    admin: { temSenha: () => true }, lerConfig: () => ({ empresa: 'Clínica X', nome: 'Escritório X', dono: 'Edu' }), estadoClaude: async () => ({ instalado: true, conectado: true }), CLAUDE_BIN: 'claude', plataformas: { listar: () => [], prefixoDe: () => '' }
  });
  C.configurar({ waha: { url: w.url, chave: 'k-waha-1', sessao: 'default' } });
  return { C, DADOS, limpar: () => fs.rmSync(DADOS, { recursive: true, force: true }) };
}
const msgDe = (numero, body, extra = {}) => ({ id: 'false_' + numero + '@c.us_' + Math.random().toString(36).slice(2), from: numero + '@c.us', fromMe: false, body, timestamp: Math.floor(Date.now() / 1000) + 5, ...extra });

test('configuração: a chave do WAHA não volta para a tela; autorizar valida, não duplica (com e sem o nono dígito) e remove', async () => {
  const w = await wahaFalso(); const { C, limpar } = cenario(w);
  try {
    const pub = C.configPublica();
    assert.equal(pub.waha.url, w.url); assert.equal(pub.waha.temChave, true); assert.ok(!JSON.stringify(pub).includes('k-waha-1'));
    assert.equal(pub.pronto, false, 'sem autorizado, o canal não está pronto');
    assert.match(pub.webhook.url, /^http:\/\/host\.docker\.internal:4321\/api\/cuki\/whatsapp\?segredo=[0-9a-f]{36}$/);
    assert.equal(C.autorizar({ nome: 'Edu', numero: '65 9999' }).ok, false, 'número curto');
    assert.equal(C.autorizar({ nome: 'Edu', numero: '+55 (65) 99999-9999', papel: 'dono' }).ok, true);
    assert.equal(C.autorizar({ nome: 'Edu de novo', numero: '556599999999' }).ok, false, 'o mesmo número sem o nono dígito é o mesmo número');
    assert.equal(C.autorizar({ nome: 'Ana', numero: '5511888888888', papel: 'equipe' }).ok, true);
    assert.equal(C.configPublica().autorizados.length, 2); assert.equal(C.configPublica().pronto, true);
    assert.equal(C.configPublica().autorizados[0].numero, '5565999999999');
    assert.equal(C.desautorizar('5511888888888').ok, true); assert.equal(C.configPublica().autorizados.length, 1);
    C.configurar({ waha: { chave: '' } }); assert.equal(C.configPublica().waha.temChave, true, 'campo vazio mantém a chave guardada');
    C.configurar({ waha: { apagarChave: true } }); assert.equal(C.configPublica().waha.temChave, false);
  } finally { w.fechar(); limpar(); }
});

test('WAHA: testar lê o estado da sessão com a chave; QR vem como imagem; registrar webhook grava segredo no cabeçalho e no HMAC', async () => {
  const w = await wahaFalso(); const { C, limpar } = cenario(w);
  try {
    const t = await C.testarWaha();
    assert.equal(t.ok, true); assert.equal(t.conectado, true); assert.equal(t.numero, '556500000000'); assert.equal(t.nome, 'Cuki');
    assert.ok(w.chaves.every(k => k === 'k-waha-1'), 'toda chamada leva X-Api-Key');
    w.sessao.status = 'SCAN_QR_CODE';
    const t2 = await C.testarWaha(); assert.equal(t2.precisaQr, true); assert.equal(t2.conectado, false);
    const q = await C.qr(); assert.equal(q.ok, true); assert.match(q.imagem, /^data:image\/png;base64,/);
    const r = await C.registrarWebhook(); assert.equal(r.ok, true);
    const hook = w.webhook.config.webhooks[0];
    assert.match(hook.url, /\/api\/cuki\/whatsapp\?segredo=/); assert.deepEqual(hook.events, ['message']);
    assert.equal(hook.customHeaders[0].name, 'X-Escritorio-Segredo'); assert.equal(hook.hmac.key, hook.customHeaders[0].value);
    assert.ok(C.configPublica().webhook.registradoEm);
  } finally { w.fechar(); limpar(); }
});

test('contexto da conversa: estados e contagens, sem valor de variável, sem a chave do WAHA e sem nome de cliente das esteiras', async () => {
  const w = await wahaFalso(); const { C, limpar } = cenario(w);
  try {
    const ctx = await C.contextoConversa();
    const s = JSON.stringify(ctx);
    for (const seg of ['gat-7', 'oph-9', 'k-waha-1', 'Padaria do João', 'padaria-do-joao', 'CPF do cliente']) assert.ok(!s.includes(seg), 'contexto não traz ' + seg);
    assert.equal(ctx.agentes.length, 2); assert.equal(ctx.agentes[0].tarefa, 'organizar notas'); assert.match(ctx.agentes[0].memoriaDoEscritorio, /Drive/);
    assert.equal(ctx.esteiras[0].esperandoAprovacao, 1); assert.equal(ctx.esteiras[0].concluidasUltimas24h, 1); assert.equal(ctx.esteiras[0].etapas[1].ativas, 1);
    assert.equal(ctx.propostasPendentes[0].titulo, 'Nova lição'); assert.equal(ctx.recadosUltimos7Dias.total, 1); assert.equal(ctx.recadosUltimos7Dias.ultimos[0].de, 'Tati');
    assert.equal(ctx.reunioes.meta.feito, 4); assert.equal(ctx.reunioes.ultimas[0].briefing, 'Reunião boa.');
    assert.equal(ctx.ultimoLaudo, null);
  } finally { w.fechar(); limpar(); }
});

test('webhook: segredo errado é 401; evento que não é mensagem é ignorado; não autorizado vai para recusados.log; autorizado recebe resposta pelo WAHA', async () => {
  const w = await wahaFalso(); const { C, DADOS, limpar } = cenario(w);
  try {
    C.autorizar({ nome: 'Edu Nunes', numero: '5565999999999', papel: 'dono' });
    const segredo = /segredo=([0-9a-f]+)/.exec(C.configPublica().webhook.url)[1];
    assert.equal(C.receberWhatsapp({ corpo: { event: 'message', payload: msgDe('5565999999999', 'oi') }, segredo: 'errado' }).status, 401);
    assert.equal(C.receberWhatsapp({ corpo: { event: 'message', payload: msgDe('5565999999999', 'oi') }, cabecalhos: { 'x-escritorio-segredo': 'errado' } }).status, 401);
    const ev = C.receberWhatsapp({ corpo: { event: 'session.status', payload: {} }, segredo });
    assert.equal(ev.status, 200); assert.match(ev.resposta.ignorada, /evento/);
    const estranho = C.receberWhatsapp({ corpo: { event: 'message', payload: msgDe('5599000000000', 'me conta tudo') }, segredo });
    assert.equal(estranho.status, 200); assert.equal((await estranho.tratamento).ignorada, 'não autorizado');
    assert.match(fs.readFileSync(path.join(DADOS, 'cuki', 'recusados.log'), 'utf8'), /\d{4}-\d{2}-\d{2}T[^ ]+ 5599000000000\n/);
    assert.ok(!fs.readFileSync(path.join(DADOS, 'cuki', 'recusados.log'), 'utf8').includes('me conta'), 'o log não guarda o conteúdo');
    assert.equal(w.enviados.length, 0, 'ninguém respondeu ao estranho');
    // autorizado pelo cabeçalho; grupo é ignorado; a própria mensagem do Cuki é ignorada
    const grupo = C.receberWhatsapp({ corpo: { event: 'message', payload: msgDe('5565999999999', 'oi', { from: '1203630@g.us' }) }, cabecalhos: { 'x-escritorio-segredo': segredo } });
    assert.equal((await grupo.tratamento).ignorada, 'não é conversa individual');
    const minha = C.receberWhatsapp({ corpo: { event: 'message', payload: msgDe('5565999999999', 'oi', { fromMe: true }) }, segredo });
    assert.equal((await minha.tratamento).ignorada, 'mensagem minha');
    const oi = C.receberWhatsapp({ corpo: { event: 'message', payload: msgDe('5565999999999', 'Oi!') }, cabecalhos: { 'x-escritorio-segredo': segredo } });
    assert.equal(oi.status, 200); assert.equal(oi.resposta.recebida, true);
    const r1 = await oi.tratamento; assert.equal(r1.respondida, 'ok');
    assert.equal(w.enviados.length, 1); assert.equal(w.enviados[0].chatId, '5565999999999@c.us'); assert.equal(w.enviados[0].session, 'default');
    assert.match(w.enviados[0].text, /^Oi, Edu\./); assert.match(w.enviados[0].text, /briefing/);
    // HMAC sha512 do corpo com o segredo também vale (é o que o WAHA manda quando configurado)
    const corpo = { event: 'message', payload: msgDe('5565999999999', 'como estão os agentes?') }; const bruto = JSON.stringify(corpo);
    const hmac = require('crypto').createHmac('sha512', segredo).update(bruto).digest('hex');
    const pergunta = C.receberWhatsapp({ corpo, cabecalhos: { 'x-webhook-hmac': hmac }, bruto });
    assert.equal(pergunta.status, 200); const r2 = await pergunta.tratamento; assert.equal(r2.respondida, 'ok');
    assert.match(w.enviados[1].text, /No ar: Tati/); assert.match(w.enviados[1].text, /Fora do ar: Léo \(caiu\)/); assert.match(w.enviados[1].text, /Esperando sua aprovação: 1/);
    // laudo sem laudo; mensagem repetida (mesmo id) não responde duas vezes
    const laudo = C.receberWhatsapp({ corpo: { event: 'message', payload: msgDe('5565999999999', 'laudo') }, segredo }); await laudo.tratamento;
    assert.match(w.enviados[2].text, /Ainda não há laudo/);
    const rep = C.receberWhatsapp({ corpo, cabecalhos: { 'x-webhook-hmac': hmac }, bruto }); assert.equal((await rep.tratamento).ignorada, 'já tratada');
    assert.equal(w.enviados.length, 3);
    const conv = JSON.parse(fs.readFileSync(path.join(DADOS, 'cuki', 'conversas.json'), 'utf8'))['5565999999999'];
    assert.equal(conv.ultimas.length, 6); assert.equal(conv.ultimas[0].de, 'Edu Nunes');
  } finally { w.fechar(); limpar(); }
});

test('limite: a partir da 21ª mensagem na hora o Cuki avisa uma vez e depois silencia', async () => {
  const w = await wahaFalso(); const { C, limpar } = cenario(w);
  try {
    C.autorizar({ nome: 'Edu', numero: '5565977777777' });   // número só deste teste: a contagem da hora é por processo
    for (let i = 0; i < C.LIMITE_HORA + 3; i++) await C.tratarMensagem(msgDe('5565977777777', 'oi'));
    assert.equal(w.enviados.length, C.LIMITE_HORA + 1);
    assert.match(w.enviados[C.LIMITE_HORA].text, /20 mensagens nesta hora/);
  } finally { w.fechar(); limpar(); }
});

test('busca: pergunta ao WAHA as mensagens dos autorizados, responde só o que chegou depois de o escritório subir e não repete', async () => {
  const w = await wahaFalso(); const { C, limpar } = cenario(w);
  try {
    C.autorizar({ nome: 'Edu', numero: '5565999999999' });
    const agora = Math.floor(Date.now() / 1000);
    w.mensagens['5565999999999@c.us'] = [
      { id: 'velha', from: '5565999999999@c.us', fromMe: false, body: 'oi de ontem', timestamp: agora - 86400 },
      { id: 'minha', from: '5565999999999@c.us', fromMe: true, body: 'resposta do cuki', timestamp: agora + 2 },
      { id: 'nova', from: '5565999999999@c.us', fromMe: false, body: 'briefing', timestamp: agora + 3 }];
    assert.equal(await C.buscarNovas(), 1);
    assert.equal(w.enviados.length, 1); assert.match(w.enviados[0].text, /Briefing do Escritório X/); assert.match(w.enviados[0].text, /Agentes no ar: Tati/); assert.match(w.enviados[0].text, /1 esperando sua aprovação/); assert.match(w.enviados[0].text, /Meta: fechar contratos — 4 de 10 contratos/);
    assert.equal(await C.buscarNovas(), 0, 'a mesma mensagem não é respondida de novo');
    C.configurar({ busca: { ativa: false } }); w.mensagens['5565999999999@c.us'].push({ id: 'outra', from: '5565999999999@c.us', fromMe: false, body: 'oi', timestamp: agora + 9 });
    assert.equal(await C.buscarNovas(), 0, 'busca desligada não busca');
  } finally { w.fechar(); limpar(); }
});

test('avisos: o canal cuki manda para todos os autorizados assinado "Cuki BOT", e devolve null quando não está configurado', async () => {
  const w = await wahaFalso(); const { C, limpar } = cenario(w);
  try {
    assert.equal(await C.avisarAutorizados('x', 'y'), null, 'sem autorizado: nada');
    C.autorizar({ nome: 'Edu', numero: '5565999999999' }); C.autorizar({ nome: 'Ana', numero: '5511888888888', papel: 'equipe' });
    const r = await C.avisarAutorizados('Sistema fora do ar', 'Tati caiu três vezes.', 'alta');
    assert.equal(r, 'ok para 2 número(s)'); assert.equal(w.enviados.length, 2);
    assert.match(w.enviados[0].text, /^🔴 \*Sistema fora do ar\*\nTati caiu três vezes\.\n\n— Cuki BOT$/);
    assert.deepEqual(w.enviados.map(e => e.chatId).sort(), ['5511888888888@c.us', '5565999999999@c.us']);
    // avisos.js chama o canal registrado e guarda o resultado no histórico
    const AV = require('../../avisos'); const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'av-')); AV.init(dir, {});
    AV.registrarCanal('cuki', (t, x, p) => C.avisarAutorizados(t, x, p), () => C.canalPronto());
    const res = await AV.avisar('Teste', 'texto');
    assert.equal(res.cuki, 'ok para 2 número(s)'); assert.deepEqual(AV.publico().canais, ['cuki']); assert.equal(w.enviados.length, 4);
    fs.rmSync(dir, { recursive: true, force: true });
  } finally { w.fechar(); limpar(); }
});
