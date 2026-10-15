/* ===========================================================
   server.js — o sistema próprio deste agente de tarefa: o painel do dono

   Contrato com o Escritório de Agentes (não quebre):
     GET /saude   JSON { ok, nome, setor, desde, resumo }  — sem dado de cliente
     GET /painel  o painel do dono, página inteira        — o monitor embute
     GET /log     últimas linhas de log.txt
   Porta pela variável PORT. Escuta só em 127.0.0.1.

   O painel só LÊ o que o lançador (rodar.js) já guardou em memoria/ e
   saidas/. As únicas escritas são as ações do dono: rodar, aprovar, rejeitar,
   responder, corrigir, assumir, devolver, aprovar/rejeitar lição, editar a
   constituição. Com PAINEL_SENHA no .env, tudo isso exige sessão, conferida
   aqui no servidor, rota a rota. /saude continua aberto.
   Gatilho externo: POST /gatilho { entidade } com o cabeçalho x-chave =
   GATILHO_CHAVE.
   =========================================================== */
const http = require('http');
const path = require('path');
const base = require('./agente-base');
const rodar = require('./rodar');

const { AGENTE, PORT, esc, ESTILO } = base;
const inicio = Date.now();
const COR = { 'nova': '', 'em andamento': 'warn', 'ensaiada': '', 'aguardando aprovação': 'warn', 'aguardando pergunta': 'warn', 'pronta': 'ok', 'com erro': 'bad', 'com o dono': '' };

/* ---------------- o painel ---------------- */
function painel(aviso) {
  const pr = base.progresso();
  const ents = rodar.listar();
  const res = rodar.resumo();
  const fila = ents.filter(e => ['nova', 'em andamento'].includes(e.status));
  const perguntas = ents.filter(e => e.status === 'aguardando pergunta');
  const propostas = base.licoesPropostas();
  const licoes = base.licoes();
  const pct = pr.total ? Math.round(pr.passo / pr.total * 100) : 0;
  const minutos = Math.floor((Date.now() - inicio) / 60000);
  const tag = (s) => `<span class="tag ${COR[s] || ''}">${esc(s)}</span>`;
  const form = (tipo, ent, rotulo, classe = '', campo = null) =>
    `<form class="inl" method="post" action="/acao"><input type="hidden" name="tipo" value="${tipo}"><input type="hidden" name="entidade" value="${esc(ent)}">` +
    (campo ? `<input name="texto" placeholder="${esc(campo)}" required style="min-width:220px">` : '') + `<button class="${classe}">${rotulo}</button></form>`;
  const acoes = (e) => {
    const s = e.status;
    if (s === 'em andamento') return '<span class="dimtxt">rodando…</span>';
    if (s === 'aguardando aprovação') return form('aprovar', e.id, 'Aprovar e aplicar', 'ok') + form('rejeitar', e.id, 'Rejeitar', 'bad', 'motivo');
    if (s === 'aguardando pergunta') return form('responder', e.id, 'Responder', 'ok', 'sua resposta');
    if (s === 'com o dono') return form('devolver', e.id, 'Devolver ao agente', '', 'o que você mudou (opcional)').replace(' required', '');
    return form('rodar', e.id, 'Rodar (ensaio)', 'fraco') + form('rodar-proposta', e.id, 'Rodar em proposta') +
      (s === 'pronta' || s === 'com erro' ? form('corrigir', e.id, 'Corrigir', 'fraco', 'o que estava errado') : '') + form('assumir', e.id, 'Assumir', 'fraco');
  };
  const ultima = (e) => e.rodadas.length ? e.rodadas[e.rodadas.length - 1] : null;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(AGENTE.nome)} · painel</title><meta http-equiv="refresh" content="45"><style>${ESTILO}</style></head><body>
<div class="topo"><h1>${esc(AGENTE.nome)}</h1><span class="dim">${esc(AGENTE.setor)}${AGENTE.negocio ? ' · ' + esc(AGENTE.negocio) : ''} · agente de tarefa</span>
  <span class="tag ${pr.concluido ? 'ok' : ''}">${pr.concluido ? 'em serviço' : pr.portao ? 'portão aprovado' : 'em construção ' + pr.passo + '/' + pr.total}</span>
  <nav><a href="#entidades">entidades</a><a href="#licoes">lições</a><a href="#conhecimento">conhecimento</a><a href="#rodadas">rodadas</a>${base.temSenha() ? '<a href="/sair">sair</a>' : ''}</nav></div>
${aviso ? '<div class="msg" style="margin-top:14px">' + esc(aviso) + '</div>' : ''}
${!base.temSenha() && pr.passo >= 10 ? '<div class="msg" style="margin-top:14px">Painel sem senha: defina PAINEL_SENHA no .env antes de entregar (componente 17).</div>' : ''}
<div class="grade">
  <div class="card"><h2>Resumo</h2>
    ${Object.entries(res.porStatus).map(([s, n]) => tag(s) + ' <b>' + n + '</b>').join(' &nbsp; ') || '<span class="dimtxt">nenhuma entidade ainda</span>'}
    <div class="dimtxt" style="margin-top:8px">${res.hoje} rodadas hoje (limite ${res.limiteDia}) · ${res.aprovacoesSeguidas} aprovações seguidas (${rodar.APROVACOES_PARA_REAL} liberam o real) · no ar há ${minutos >= 60 ? Math.floor(minutos / 60) + ' h' : minutos + ' min'} · porta ${PORT}</div></div>
  <div class="card"><h2>Construção</h2><div class="num">${pr.passo}<small>de ${pr.total} componentes</small></div><div class="bar"><i style="width:${pct}%"></i></div></div>
  <div class="card"><h2>Plataformas</h2><div class="num">${(process.env.PLATAFORMAS_PERMITIDAS || '').split(';').filter(Boolean).length}<small>${(process.env.PLATAFORMAS_PERMITIDAS || '').split(';').filter(Boolean).join(', ') || 'nenhuma permitida; o administrador marca no escritório'}</small></div></div>
  <div class="card"><h2>Rodar uma entidade</h2>
    <form class="inl" method="post" action="/acao"><input type="hidden" name="tipo" value="rodar"><input name="entidade" placeholder="ex.: amostras/caso-01 ou o ID" required style="min-width:240px"><button class="fraco">Ensaio</button></form>
    <form class="inl" method="post" action="/acao"><input type="hidden" name="tipo" value="rodar-proposta"><input name="entidade" placeholder="entidade" required style="min-width:240px"><button>Proposta</button></form>
    <div class="dimtxt">Ensaio só lê. Proposta escreve em saidas/ e espera sua aprovação. O real só liga com MODO_REAL=sim no .env e 10 aprovações seguidas.</div></div>

  <div class="card larga" id="perguntas"><h2>Perguntas do agente (${perguntas.length})</h2>
    ${perguntas.length ? perguntas.map(e => `<div style="margin-bottom:10px"><b>${esc(e.id)}</b> · ${esc(e.pergunta ? e.pergunta.texto : '')}<br>${form('responder', e.id, 'Responder', 'ok', 'sua resposta')}${e.perguntas >= 3 ? ' <span class="tag warn">já perguntou ' + e.perguntas + ' vezes: é regra faltando na constituição</span>' : ''}</div>`).join('') : '<span class="dimtxt">nenhuma pergunta pendente</span>'}</div>

  <div class="card larga" id="entidades"><h2>Entidades (${ents.length}) · fila: ${fila.length}</h2>
    <table><tr><th>Entidade</th><th>Status</th><th>Última rodada</th><th>Ações</th></tr>
    ${ents.map(e => { const u = ultima(e); return `<tr><td><b>${esc(e.id)}</b>${e.erro ? '<br><span style="color:var(--bad);font-size:12px">' + esc(e.erro).slice(0, 200) + '</span>' : ''}</td><td>${tag(e.status)}</td>
      <td>${u ? esc(u.modo) + ' · ' + esc(new Date(u.quando).toLocaleString('pt-BR')) + (u.feitos && u.feitos.length ? '<br><span class="dimtxt">' + u.feitos.length + ' FEITO</span>' : '') + (u.pasta ? ' <span class="dimtxt">' + esc(u.pasta) + '</span>' : '') : '<span class="dimtxt">—</span>'}</td><td>${acoes(e)}</td></tr>`; }).join('') || '<tr><td colspan="4" class="dimtxt">rode a primeira amostra acima</td></tr>'}</table></div>

  <div class="card larga" id="licoes"><h2>Lições propostas (${propostas.length}) · aprovadas (${licoes.length})</h2>
    ${propostas.map(l => `<div style="margin-bottom:6px">${esc(l)}<br><form class="inl" method="post" action="/acao"><input type="hidden" name="tipo" value="licao-aprovar"><input type="hidden" name="texto" value="${esc(l)}"><button class="ok">Aprovar</button></form>
      <form class="inl" method="post" action="/acao"><input type="hidden" name="tipo" value="licao-rejeitar"><input type="hidden" name="texto" value="${esc(l)}"><button class="bad">Rejeitar</button></form></div>`).join('') || '<span class="dimtxt">nenhuma proposta. Elas nascem quando você corrige um resultado ou rejeita uma proposta.</span>'}
    <h2 style="margin-top:14px">Aprovadas</h2><pre>${esc(licoes.join('\n')) || '(nenhuma ainda)'}</pre>${licoes.length > 40 ? '<div class="msg">Mais de 40 lições: hora da curadoria — fundir, promover para a constituição, apagar.</div>' : ''}</div>

  <div class="card larga" id="conhecimento"><h2>Conhecimento — skills/constituicao.md</h2>
    <form method="post" action="/acao"><input type="hidden" name="tipo" value="constituicao"><textarea name="texto">${esc(base.ler('skills/constituicao.md'))}</textarea>
    <div style="display:flex;gap:8px;margin-top:8px"><button>Salvar (vale na próxima rodada)</button></div></form>
    <form class="inl" method="post" action="/acao" style="margin-top:6px"><input type="hidden" name="tipo" value="constituicao-voltar"><button class="fraco">Voltar para a versão anterior</button></form>
    <div class="dimtxt">Cada salvamento valida o formato e grava uma versão no git da pasta. O prompt-agente.md não se edita por aqui.</div></div>

  <div class="card larga" id="rodadas"><h2>Últimas rodadas (memoria/execucoes.log)</h2><pre>${esc(rodar.execucoes(25).join('\n')) || '(nenhuma rodada ainda)'}</pre></div>
  <div class="card larga"><h2>Log</h2><pre>${esc(base.tail(30).join('\n')) || '(vazio)'}</pre></div>
</div></body></html>`;
}

/* ---------------- ações do dono ---------------- */
async function agir(b) {
  const t = String(b.tipo || ''), ent = String(b.entidade || '').trim(), texto = String(b.texto || '').trim();
  const bg = (p, oq) => { p.then(r => base.log(oq + ': ' + (r && r.ok ? r.status || 'ok' : (r && r.motivo) || 'falhou'))).catch(e => base.log(oq + ' falhou: ' + e.message)); return oq + ' iniciado; o painel atualiza sozinho'; };
  if (!ent && !/^(licao-|constituicao)/.test(t)) return 'diga a entidade';
  switch (t) {
    case 'rodar': return bg(rodar.rodar(ent), 'ensaio de ' + ent);
    case 'rodar-proposta': return bg(rodar.rodar(ent, { proposta: true }), 'proposta de ' + ent);
    case 'aprovar': return bg(rodar.aprovar(ent), 'aprovação de ' + ent);
    case 'rejeitar': return bg(rodar.rejeitar(ent, texto || 'sem motivo'), 'rejeição de ' + ent);
    case 'responder': if (!texto) return 'escreva a resposta'; return bg(rodar.responder(ent, texto), 'resposta para ' + ent);
    case 'corrigir': if (!texto) return 'escreva o que estava errado'; return bg(rodar.corrigir(ent, texto), 'correção de ' + ent);
    case 'assumir': { const r = rodar.assumir(ent); return r.ok ? ent + ' está com você; o agente fica quieto nela' : r.motivo; }
    case 'devolver': { const r = rodar.devolver(ent, texto); return r.ok ? ent + ' devolvida ao agente' : r.motivo; }
    case 'licao-aprovar': { const r = base.decidirLicao(texto, true); return r.ok ? 'lição aprovada' : r.motivo; }
    case 'licao-rejeitar': { const r = base.decidirLicao(texto, false); return r.ok ? 'lição rejeitada' : r.motivo; }
    case 'constituicao': { const r = base.salvarConstituicao(texto); return r.ok ? 'constituição salva' + (r.aviso ? ' — ' + r.aviso : '') : 'não salvei: ' + r.erros.join('; '); }
    case 'constituicao-voltar': { const r = base.voltarConstituicao(); return r.ok ? 'constituição voltou para a versão anterior' : r.motivo; }
    default: return 'ação desconhecida';
  }
}

/* ---------------- ação direta: uma ferramenta, sem o modelo ---------------- */
const { spawn } = require('child_process');
const fs = require('fs');
function ferramentas() {
  let nomes = []; try { nomes = fs.readdirSync(base.arq('tools')).filter(f => f.endsWith('.js') && f !== 'base.js').map(f => f.replace(/\.js$/, '')); } catch (e) {}
  return nomes.map(n => { let uso = ''; try { const t = base.ler(path.join('tools', n + '.js')); const m = /Uso[^\n]*\n((?:\s+node tools\/[^\n]+\n)+)/.exec(t); uso = m ? m[1].split('\n').map(l => l.trim()).filter(Boolean).slice(0, 8) : []; } catch (e) {} return { nome: n, uso }; });
}
function acaoDireta(ferramenta, args, entidade) {
  return new Promise(resolve => {
    if (!/^[a-z0-9_-]+$/.test(ferramenta) || ferramenta === 'base' || !fs.existsSync(base.arq('tools', ferramenta + '.js'))) return resolve({ ok: false, motivo: 'ferramenta desconhecida: ' + ferramenta });
    if (args.some(a => a.length > 4000) || args.length > 12) return resolve({ ok: false, motivo: 'argumentos demais ou longos demais' });
    const modo = process.env.MODO_REAL === 'sim' ? 'real' : 'proposta';
    let saida = '', erro = '';
    const p = spawn(process.execPath, [base.arq('tools', ferramenta + '.js'), ...args], { cwd: base.PASTA, env: { ...process.env, MODO_RODADA: modo, ENTIDADE: entidade || 'acao-direta' }, stdio: ['ignore', 'pipe', 'pipe'] });
    const prazo = setTimeout(() => { try { p.kill(); } catch (e) {} }, 60000);
    p.stdout.on('data', d => saida += d); p.stderr.on('data', d => erro += d);
    p.on('error', e => { clearTimeout(prazo); resolve({ ok: false, motivo: e.message }); });
    p.on('exit', () => {
      clearTimeout(prazo);
      let r = null; try { r = JSON.parse(saida.trim().split('\n').pop()); } catch (e) {}
      base.log('ação direta: ' + ferramenta + ' ' + args.join(' ').slice(0, 120) + ' -> ' + (r ? r.estado + ': ' + String(r.detalhe || '').slice(0, 120) : 'sem resposta'));
      resolve(r ? { ok: r.estado !== 'erro', modo, resultado: r } : { ok: false, modo, motivo: (erro || saida || 'a ferramenta não respondeu').slice(0, 300) });
    });
  });
}

/* ---------------- servidor ---------------- */
const html = (res, t, extra = {}) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...extra }); res.end(t); };
const vaiPara = (res, para, extra = {}) => { res.writeHead(303, { Location: para, ...extra }); res.end(); };
let ultimoAviso = '';

http.createServer(async (req, res) => {
  const rota = req.url.split('?')[0];
  if (rota === '/saude') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ ok: true, nome: AGENTE.nome, setor: AGENTE.setor, trilha: 'tarefa', desde: new Date(inicio).toISOString(),
      cerebro: 'claude-code', progresso: base.progresso(), resumo: rodar.resumo().porStatus, trancado: base.temSenha() }));
  }
  if (rota === '/log') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(base.tail(200).join('\n')); }
  // o escritório lê o estado das entidades (esteiras) com a mesma chave do gatilho; sem dado de cliente, só id e status
  if (rota === '/entidades' && req.method === 'GET') {
    if (!base.gatilhoAutorizado(req)) { res.writeHead(401); return res.end('chave do gatilho inválida'); }
    const lista = rodar.listar().map(e => ({ id: e.id, status: e.status, rodadas: e.rodadas.length, ultimoModo: e.ultimoModo || null, atualizado: e.atualizado || null,
      pergunta: e.status === 'aguardando pergunta' && e.pergunta ? e.pergunta.texto : undefined, erro: e.status === 'com erro' ? e.erro : undefined }));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify({ ok: true, entidades: lista, resumo: rodar.resumo().porStatus }));
  }
  // ação direta (o CRM pede pelo escritório): roda UMA ferramenta de tools/ na hora, por código, sem o modelo,
  // nas mesmas cercas (modo real só com MODO_REAL="sim"; senão proposta). Para o mecânico: evento, linha de planilha, mensagem-modelo.
  if (rota === '/ferramentas' && req.method === 'GET') {
    if (!base.gatilhoAutorizado(req)) { res.writeHead(401); return res.end('chave do gatilho inválida'); }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify({ ok: true, ferramentas: ferramentas() }));
  }
  if (rota === '/acao' && req.method === 'POST' && req.headers['x-chave']) {   // com a chave: ação direta; sem ela, é o formulário do painel (abaixo)
    if (!base.gatilhoAutorizado(req)) { res.writeHead(401); return res.end('chave do gatilho inválida'); }
    const b = await base.lerCorpo(req);
    const r = await acaoDireta(String(b.ferramenta || ''), Array.isArray(b.args) ? b.args.map(String) : [], String(b.entidade || ''));
    res.writeHead(r.ok ? 200 : 400, { 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify(r));
  }
  // o escritório opera o agente (responder, aprovar, rodar, devolver…) com a chave do gatilho: é o que a aba Trabalho usa
  if (rota === '/agir' && req.method === 'POST') {
    if (!base.gatilhoAutorizado(req)) { res.writeHead(401); return res.end('chave do gatilho inválida'); }
    const b = await base.lerCorpo(req);
    let texto; try { texto = await agir(b); } catch (e) { texto = 'erro: ' + e.message; }
    base.log('ação pelo escritório: ' + (b.tipo || '?') + (b.entidade ? ' ' + b.entidade : '') + ' -> ' + texto);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); return res.end(JSON.stringify({ ok: !/^(erro|ação desconhecida|diga |escreva |não salvei)/.test(texto), texto }));
  }
  if (rota === '/gatilho' && req.method === 'POST') {
    if (!base.gatilhoAutorizado(req)) { res.writeHead(401); return res.end('chave do gatilho inválida'); }
    const b = await base.lerCorpo(req);
    const ent = String(b.entidade || '').trim();
    if (!ent) { res.writeHead(400); return res.end('entidade?'); }
    // extra: o contexto que o escritório manda (esteira: etapa, entrega, pasta); refazer: a entrega foi devolvida
    const extra = String(b.extra || '').slice(0, 4000) || undefined;
    rodar.rodar(ent, { proposta: process.env.MODO === 'proposta', extra, refazer: !!b.refazer }).then(r => base.log('gatilho: ' + ent + ' -> ' + (r.status || r.motivo)));
    res.writeHead(202, { 'Content-Type': 'application/json' }); return res.end('{"ok":true}');
  }
  if (rota === '/entrar') {
    if (req.method === 'POST') { const b = await base.lerCorpo(req); const tk = base.entrar(b.senha); return tk ? vaiPara(res, '/painel', { 'Set-Cookie': base.cookieSessao(tk) }) : html(res, base.paginaLogin('senha errada')); }
    return html(res, base.paginaLogin());
  }
  if (rota === '/sair') return vaiPara(res, '/entrar', { 'Set-Cookie': 'painel=; Path=/; Max-Age=0' });
  if (!base.sessaoValida(req)) { if (req.method === 'POST') { res.writeHead(401); return res.end('entre no painel primeiro'); } return html(res, base.paginaLogin()); }
  if (rota === '/acao' && req.method === 'POST') {
    const b = await base.lerCorpo(req);
    try { ultimoAviso = await agir(b); } catch (e) { ultimoAviso = 'erro: ' + e.message; }
    base.log('ação do dono: ' + (b.tipo || '?') + (b.entidade ? ' ' + b.entidade : '') + ' -> ' + ultimoAviso);
    return vaiPara(res, '/painel?aviso=1');
  }
  if (rota === '/painel' || rota === '/') { const a = /aviso=1/.test(req.url) ? ultimoAviso : ''; ultimoAviso = ''; return html(res, painel(a)); }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404');
}).listen(PORT, '127.0.0.1', () => {
  base.log('painel subiu na porta ' + PORT + (base.temSenha() ? ' (trancado)' : ' (SEM senha: defina PAINEL_SENHA antes de entregar)'));
  console.log(AGENTE.nome + ' -> http://localhost:' + PORT + '/painel');
});
