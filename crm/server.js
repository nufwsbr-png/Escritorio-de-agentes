/* ===========================================================
   crm/server.js — o sistema do CRM, no contrato do escritório

     GET  /saude            JSON { ok, nome, desde, resumo } — sem dado de cliente
     GET  /painel  e  /     a tela (crm/painel/)
     GET  /log              últimas linhas de log.txt

   API (JSON). Pessoa: cookie de sessão (login na tela). Agente e
   escritório: Authorization: Bearer <token> (o token de cada agente chega
   pela plataforma "crm"; o do escritório fica em data/crm.json).

     POST /api/entrar {login, senha} · POST /api/sair · GET /api/eu · POST /api/senha {atual, nova}
     GET  /api/primeira-senha             a senha do chefe, UMA vez, só desta máquina
     GET  /api/config                     entidade, etapas, campos, sensíveis (sem segredo)
     GET  /api/fichas?etapa&minhas&parado&q&status   · POST /api/fichas {chave, campos, etapa}
     GET  /api/fichas/:id                 ficha + histórico + propostas + tarefas
     POST /api/fichas/:id/mover|anotar|campo|mensagem|atribuir|perder|arquivar|reativar
     GET  /api/propostas?estado · POST /api/propostas/:id/aprovar|rejeitar
     GET  /api/tarefas?abertas · POST /api/tarefas · POST /api/tarefas/:id/feita
     POST /api/importar {csv, mapa, etapa}
     GET  /api/painel · GET /api/equipe

   Escuta em CRM_ESCUTA (127.0.0.1 = só este computador; 0.0.0.0 = rede ou
   túnel). Nunca abre sem login. Dados: local ou Supabase (dados.js).
   =========================================================== */
const fs = require('fs');
const path = require('path');
const http = require('http');

const PASTA = process.env.CRM_PASTA || __dirname;
/* o .env do CRM: segredos e o bloco de plataformas (Supabase) */
function carregarEnv() { try { for (const l of fs.readFileSync(path.join(PASTA, '.env'), 'utf8').split(/\r?\n/)) { const m = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/.exec(l); if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, ''); } } catch (e) {} }
carregarEnv();
const PORT = Number(process.env.PORT) || 4500;
const ESCUTA = process.env.CRM_ESCUTA || '127.0.0.1';
const DESDE = new Date().toISOString();
const LOG = path.join(PASTA, 'log.txt');
function log(linha) { const l = '[' + new Date().toISOString() + '] ' + linha; try { fs.appendFileSync(LOG, l + '\n'); } catch (e) {} console.log(l); }
const tail = (n) => { try { return fs.readFileSync(LOG, 'utf8').split(/\r?\n/).filter(Boolean).slice(-n); } catch (e) { return []; } };

const CRM = require('./crm');
const D = require('./dados').abrir({ onde: (() => { try { return JSON.parse(fs.readFileSync(path.join(PASTA, 'config.json'), 'utf8')).fichas.onde; } catch (e) { return 'local'; } })(), pasta: PASTA, env: process.env });
CRM.init({ PASTA, D, env: process.env, log, avisar: process.env.CRM_SEM_AVISOS ? null : undefined });
const cfg0 = CRM.config();

/* ---------------- http ---------------- */
const json = (res, code, dados) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(dados)); };
const corpo = (req, limite = 2e5) => new Promise((resolve, reject) => { let s = ''; req.on('data', c => { s += c; if (s.length > limite) { req.destroy(); reject(new Error('corpo grande demais')); } }); req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(new Error('json inválido')); } }); req.on('error', reject); });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
function estatico(res, rel) {
  const arq = path.join(PASTA, 'painel', rel);
  if (!arq.startsWith(path.join(PASTA, 'painel')) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end('não achei'); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(fs.readFileSync(arq));
}
const ehLocal = (req) => /^(127\.0\.0\.1|::1|::ffff:127\.0\.0\.1)$/.test(req.socket.remoteAddress || '');

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const rota = decodeURIComponent(url.pathname);
  const cfg = CRM.config();
  try {
    if (rota === '/saude') { const p = cfg ? await CRM.painel() : null; return json(res, 200, { ok: true, nome: 'CRM', desde: DESDE, escritorioPorta: Number(process.env.ESCRITORIO_PORTA) || 4321, resumo: p ? { entidade: p.entidade.plural, ativas: p.ativas, propostasPendentes: p.propostasPendentes, tarefasAbertas: p.tarefasAbertas, onde: D.onde } : 'sem configuração' }); }
    if (rota === '/log') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end(tail(200).join('\n')); }
    if (rota === '/' || rota === '/painel') return estatico(res, 'index.html');
    if (!rota.startsWith('/api/')) return estatico(res, rota.replace(/^\/+/, ''));
    if (!cfg) return json(res, 503, { ok: false, motivo: 'o CRM ainda não foi criado: use /criar-crm no Claude Code' });
    // escrita só do próprio CRM (Origin, quando o navegador manda) ou de quem tem token
    if (req.method !== 'GET' && req.headers.origin && !req.headers.authorization && !new RegExp('^https?://' + (req.headers.host || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i').test(req.headers.origin)) return json(res, 403, { ok: false, motivo: 'origem não permitida' });

    if (rota === '/api/entrar' && req.method === 'POST') { const b = await corpo(req, 1e4); const r = CRM.entrar(b.login, b.senha); if (!r.ok) return json(res, 401, r); res.setHeader('Set-Cookie', CRM.cookie(r.token)); log('entrou: ' + r.pessoa.id); return json(res, 200, { ok: true, pessoa: r.pessoa }); }
    if (rota === '/api/primeira-senha' && req.method === 'GET') { if (!ehLocal(req)) return json(res, 403, { ok: false, motivo: 'só nesta máquina' }); const p = CRM.primeiraSenha(); return json(res, 200, p ? { ok: true, ...p, aviso: 'esta senha aparece uma vez; troque-a ao entrar' } : { ok: false }); }
    const eu = CRM.quem(req);
    if (!eu) return json(res, 401, { ok: false, motivo: 'entre com login e senha (ou com o token)', precisaEntrar: true });
    if (rota === '/api/sair' && req.method === 'POST') { if (eu.token) CRM.sair(eu.token); res.setHeader('Set-Cookie', CRM.cookieVazio()); return json(res, 200, { ok: true }); }
    if (rota === '/api/eu') return json(res, 200, { ok: true, eu: { tipo: eu.tipo, id: eu.id, nome: eu.nome, cargo: eu.cargo, cargoNome: (CRM.cargoDe(eu) || {}).nome, permissoes: CRM.cargoDe(eu), trocarSenha: !!eu.trocarSenha } });
    if (rota === '/api/senha' && req.method === 'POST') { if (eu.tipo !== 'pessoa') return json(res, 403, { ok: false, motivo: 'só pessoa' }); const b = await corpo(req, 1e4); const r = CRM.trocarSenha(eu.id, b.atual, b.nova); return json(res, r.ok ? 200 : 400, r); }
    if (rota === '/api/config') return json(res, 200, { ok: true, entidade: cfg.entidade, etapas: cfg.etapas, perdido: cfg.perdido, autonomia: cfg.autonomia, sensiveis: cfg.sensiveis, campos: CRM.CAMPOS_BASE, chefe: cfg.chefe, onde: D.onde, acesso: cfg.acesso, integracoes: cfg.integracoes });
    if (rota === '/api/fichas' && req.method === 'GET') return json(res, 200, { ok: true, fichas: await CRM.listarFichas(eu, { etapa: url.searchParams.get('etapa'), minhas: url.searchParams.get('minhas') === '1', paradoDias: url.searchParams.get('parado'), q: url.searchParams.get('q'), status: url.searchParams.get('status'), todas: url.searchParams.get('todas') === '1' }) });
    if (rota === '/api/fichas' && req.method === 'POST') { const b = await corpo(req); const r = await CRM.criarFicha(eu, b); log((eu.nome || eu.id) + ' criar ficha: ' + (r.ok ? (r.existente ? 'já existia' : r.proposta ? 'proposta' : 'ok') : r.motivo)); return json(res, r.ok ? 200 : 400, r); }
    let m = /^\/api\/fichas\/([a-z0-9_.@+-]+)$/i.exec(rota);
    if (m && req.method === 'GET') { const f = await CRM.obterFicha(eu, m[1]); return f ? json(res, 200, { ok: true, ficha: f }) : json(res, 404, { ok: false, motivo: 'ficha não encontrada' }); }
    m = /^\/api\/fichas\/([a-z0-9_.@+-]+)\/(mover|anotar|campo|mensagem|atribuir|perder|arquivar|reativar)$/i.exec(rota);
    if (m && req.method === 'POST') { const b = await corpo(req); const r = await CRM.mudarFicha(eu, m[1], m[2], b); log((eu.nome || eu.id) + ' ' + m[2] + ' ' + m[1] + ': ' + (r.ok ? (r.proposta ? 'proposta' : r.ensaio ? 'ensaio' : 'ok') : r.motivo)); return json(res, r.ok ? 200 : (r.comPessoa ? 409 : 400), r); }
    if (rota === '/api/propostas' && req.method === 'GET') return json(res, 200, { ok: true, propostas: await CRM.propostas(url.searchParams.get('estado') === 'todas' ? '' : (url.searchParams.get('estado') || 'pendente')) });
    m = /^\/api\/propostas\/([a-z0-9]+)\/(aprovar|rejeitar)$/i.exec(rota);
    if (m && req.method === 'POST') { const b = await corpo(req, 1e4); const r = await CRM.decidirProposta(eu, m[1], m[2] === 'aprovar', b.motivo); log((eu.nome || eu.id) + ' ' + m[2] + ' proposta ' + m[1] + ': ' + (r.ok ? 'ok' : r.motivo)); return json(res, r.ok ? 200 : 400, r); }
    if (rota === '/api/tarefas' && req.method === 'GET') return json(res, 200, { ok: true, tarefas: await CRM.tarefas({ abertas: url.searchParams.get('abertas') === '1', para: url.searchParams.get('minhas') === '1' ? { tipo: eu.tipo, id: eu.id } : null }) });
    if (rota === '/api/tarefas' && req.method === 'POST') { const b = await corpo(req, 1e4); const r = await CRM.criarTarefa(eu, b); return json(res, r.ok ? 200 : 400, r); }
    m = /^\/api\/tarefas\/([a-z0-9]+)\/feita$/i.exec(rota);
    if (m && req.method === 'POST') { const b = await corpo(req, 1e4); const r = await CRM.concluirTarefa(eu, m[1], b.resultado); return json(res, r.ok ? 200 : 400, r); }
    if (rota === '/api/importar' && req.method === 'POST') { const b = await corpo(req, 4e6); const r = await CRM.importar(eu, b); log((eu.nome || eu.id) + ' importou: ' + JSON.stringify({ criadas: r.criadas, repetidas: r.repetidas })); return json(res, r.ok ? 200 : 400, r); }
    if (rota === '/api/painel') return json(res, 200, { ok: true, ...(await CRM.painel()) });
    if (rota === '/api/equipe') return json(res, 200, { ok: true, ...(await CRM.equipe()) });
    if (rota === '/api/dados/testar') return json(res, 200, await D.testar());
    return json(res, 404, { ok: false, motivo: 'rota desconhecida' });
  } catch (e) {
    log('erro em ' + req.method + ' ' + rota + ': ' + e.message);
    return json(res, e.supabase ? 502 : 500, { ok: false, motivo: e.message });
  }
});

servidor.listen(PORT, ESCUTA, () => {
  log('CRM -> http://localhost:' + PORT + (ESCUTA === '0.0.0.0' ? ' (aberto na rede; login obrigatório)' : ' (só este computador)') + ' · fichas: ' + D.onde + (cfg0 ? '' : ' · SEM CONFIGURAÇÃO: use /criar-crm'));
});
/* o relógio do CRM: uma vez por dia, na hora do resumo (9h), as pendências */
setInterval(() => { const d = new Date(); if (d.getHours() === 9 && CRM.config()) CRM.avisosDiarios().catch(() => {}); }, 60000).unref();
