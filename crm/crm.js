/* ===========================================================
   crm/crm.js — a lógica do CRM: fichas, etapas, propostas, tarefas,
   cargos, usuários, histórico com autor

   O princípio do híbrido: UMA FICHA, UM RESPONSÁVEL POR VEZ, BASTÃO
   EXPLÍCITO. Pessoa escreve o que o cargo permite. Agente escreve o que a
   autonomia (config.autonomia: a, b, c) permite; o resto vira proposta
   pendente, que uma pessoa aprova ou rejeita na ficha. Quando o responsável
   da ficha é uma pessoa, agente não escreve nela ("com uma pessoa").
   Nada se apaga: ficha arquiva, pessoa desativa, histórico só cresce.

   Config em crm/config.json (gravado por crm/criar.js); usuários, cargos e
   sessões em crm/data/ (sempre locais); fichas, histórico, propostas e
   tarefas em dados.js (local ou Supabase).
   Design: docs/superpowers/specs/2026-10-14-crm-design.md
   =========================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

let dep = {};   // { PASTA, D (dados), log }
const lerJson = (a, padrao) => { try { return JSON.parse(fs.readFileSync(a, 'utf8')); } catch (e) { return padrao; } };
const gravarJson = (a, d) => { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, JSON.stringify(d, null, 2) + '\n'); };
const arqDados = (n) => path.join(dep.PASTA, 'data', n);
const hex = (n) => crypto.randomBytes(n).toString('hex');
const hash = (s, sal) => crypto.scryptSync(String(s), sal, 64).toString('hex');
const igual = (a, b) => { const x = Buffer.from(String(a), 'hex'), y = Buffer.from(String(b), 'hex'); return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y); };
const agora = () => new Date().toISOString();
const slug = (t, max = 40) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max);
const limpa = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const DIA = 86400000;

/* ---------------- config, usuários, cargos ---------------- */
const config = () => lerJson(path.join(dep.PASTA, 'config.json'), null);
const usuarios = () => lerJson(arqDados('usuarios.json'), { pessoas: [], agentes: [] });
const gravarUsuarios = (u) => gravarJson(arqDados('usuarios.json'), u);
const cargos = () => lerJson(arqDados('cargos.json'), {});
const cargoDe = (autor) => {
  if (!autor) return null;
  if (autor.tipo === 'escritorio') return { nome: 'Escritório', verTudo: true, editar: true, mover: true, aprovar: false, verSensiveis: false, gerirPessoas: false, escritorio: true };
  const u = autor.tipo === 'pessoa' ? usuarios().pessoas.find(p => p.id === autor.id) : usuarios().agentes.find(a => a.id === autor.id);
  return (u && cargos()[u.cargo]) || null;
};
/* pelo id, ou pelo nome (a esteira do escritório manda o nome da etapa dela) */
const etapaDe = (id) => { const ets = (config() || { etapas: [] }).etapas; const s = slug(id, 30); return ets.find(e => e.id === id) || ets.find(e => e.id === s || slug(e.nome, 30) === s) || null; };
const nomeDe = (autor) => { if (!autor) return '?'; if (autor.nome) return autor.nome; if (autor.tipo === 'escritorio') return 'escritório'; const u = autor.tipo === 'pessoa' ? usuarios().pessoas.find(p => p.id === autor.id) : usuarios().agentes.find(a => a.id === autor.id); return u ? u.nome : autor.id; };

/* ---------------- quem é: sessões de pessoa, token de agente ---------------- */
const DURACAO = 12 * 3600 * 1000;
const sessoes = () => { const s = lerJson(arqDados('sessoes.json'), {}); const t = Date.now(); let mudou = false; for (const [k, v] of Object.entries(s)) if (!v || v.ate < t) { delete s[k]; mudou = true; } if (mudou) gravarJson(arqDados('sessoes.json'), s); return s; };
function entrar(login, senha) {
  const u = usuarios().pessoas.find(p => p.login === String(login || '').trim().toLowerCase() && p.ativa !== false);
  if (!u || !igual(hash(senha || '', u.sal), u.senhaHash)) return { ok: false, motivo: 'login ou senha errados' };
  const s = sessoes(); const token = hex(24); s[token] = { pessoa: u.id, ate: Date.now() + DURACAO }; gravarJson(arqDados('sessoes.json'), s);
  return { ok: true, token, pessoa: { id: u.id, nome: u.nome, cargo: u.cargo, trocarSenha: !!u.trocarSenha } };
}
function sair(token) { const s = sessoes(); delete s[token]; gravarJson(arqDados('sessoes.json'), s); }
function quem(req) {
  const m = /(?:^|;\s*)crm=([a-f0-9]{48})/.exec(req.headers.cookie || '');
  if (m) { const s = sessoes()[m[1]]; if (s) { const u = usuarios().pessoas.find(p => p.id === s.pessoa && p.ativa !== false); if (u) return { tipo: 'pessoa', id: u.id, nome: u.nome, cargo: u.cargo, token: m[1], trocarSenha: !!u.trocarSenha }; } }
  const b = /^Bearer\s+([a-f0-9]{48})$/.exec(req.headers.authorization || '');
  if (b) {
    const env = dep.env || process.env;
    if (env.CRM_TOKEN_ESCRITORIO && b[1] === env.CRM_TOKEN_ESCRITORIO) return { tipo: 'escritorio', id: 'escritorio', nome: 'escritório' };
    for (const a of usuarios().agentes) if (a.ativo !== false && a.tokenHash && igual(hash(b[1], a.sal), a.tokenHash)) return { tipo: 'agente', id: a.id, nome: a.nome, cargo: a.cargo, modo: /^(ensaio|proposta|real)$/.test(req.headers['x-modo'] || '') ? req.headers['x-modo'] : 'real' };
  }
  return null;
}
const cookie = (t) => 'crm=' + t + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + Math.floor(DURACAO / 1000);
const cookieVazio = () => 'crm=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';
function trocarSenha(pessoaId, atual, nova) {
  const u = usuarios(); const p = u.pessoas.find(x => x.id === pessoaId);
  if (!p) return { ok: false, motivo: 'pessoa não encontrada' };
  if (!igual(hash(atual || '', p.sal), p.senhaHash)) return { ok: false, motivo: 'a senha atual não confere' };
  if (String(nova || '').length < 6) return { ok: false, motivo: 'a senha nova precisa ter pelo menos 6 caracteres' };
  p.sal = hex(8); p.senhaHash = hash(nova, p.sal); p.trocarSenha = false; gravarUsuarios(u);
  return { ok: true };
}
/* a senha do chefe, gerada por criar.js, é mostrada UMA vez e o arquivo some */
function primeiraSenha() { const a = arqDados('primeira-senha.json'); const d = lerJson(a, null); if (!d) return null; try { fs.unlinkSync(a); } catch (e) {} return d; }

/* ---------------- a chave única e os campos ---------------- */
function chaveNormal(cfg, valor) {
  const t = cfg.entidade.chave;
  const v = String(valor == null ? '' : valor).trim();
  if (t === 'email') return v.toLowerCase();
  if (t === 'telefone' || t === 'cpf' || t === 'numero') { const d = v.replace(/\D/g, ''); return d || slug(v); }
  return slug(v);
}
const CAMPOS_BASE = ['nome', 'telefone', 'email', 'origem', 'observacoes'];
function mascarar(v) { const s = String(v == null ? '' : v); if (!s) return ''; return s.length <= 4 ? '****' : '*'.repeat(Math.min(8, s.length - 4)) + s.slice(-4); }
function fichaPara(cfg, ficha, autor) {
  const c = cargoDe(autor);
  const vePossivel = !!(c && c.verSensiveis) && autor.tipo === 'pessoa';
  const campos = { ...(ficha.campos || {}) };
  if (!vePossivel) for (const s of (cfg.sensiveis || [])) if (campos[s] !== undefined) campos[s] = mascarar(campos[s]);
  const out = { ...ficha, campos };
  if (autor.tipo === 'agente') { out.agentes = ficha.agentes && ficha.agentes[autor.id] ? { [autor.id]: ficha.agentes[autor.id] } : {}; }
  return out;
}

/* ---------------- histórico ---------------- */
async function anota(fichaId, autor, tipo, texto, extra = {}) {
  const h = { id: hex(8), fichaId, quando: agora(), autor: { tipo: autor.tipo, id: autor.id, nome: nomeDe(autor) }, tipo, texto: limpa(texto, 2000), ...extra };
  await dep.D.anexar('historico', h);
  return h;
}

/* ---------------- o que cada um pode: pessoa pelo cargo, agente pela autonomia ---------------- */
const PERM = { mover: 'mover', anotar: 'editar', campo: 'editar', mensagem: 'editar', tarefa: 'editar', atribuir: 'mover', perder: 'mover', criar: 'editar' };
function decidir(cfg, autor, ficha, acao, detalhe = {}) {
  const c = cargoDe(autor);
  if (!c) return { ok: false, motivo: 'sem cargo no CRM' };
  if (autor.tipo === 'pessoa' || autor.tipo === 'escritorio') return c[PERM[acao] || 'editar'] ? { ok: true, direto: true } : { ok: false, motivo: 'o seu cargo (' + c.nome + ') não permite ' + acao };
  // agente
  if (ficha && ficha.responsavel && ficha.responsavel.tipo === 'pessoa') return { ok: false, motivo: 'com uma pessoa: ' + nomeDe(ficha.responsavel) + ' está com esta ficha; o agente espera devolver', comPessoa: true };
  if (autor.modo === 'ensaio') return { ok: true, ensaio: true };
  const proposta = (motivo) => ({ ok: true, direto: false, motivo });
  if (autor.modo === 'proposta') return proposta('agente em modo proposta');
  const aut = cfg.autonomia || 'b';
  if (aut === 'a') return proposta('tudo passa por uma pessoa (autonomia a)');
  if (!c[PERM[acao] || 'editar']) return proposta('o cargo do agente não faz isso direto');
  if (aut === 'b') {
    if (acao === 'mover') { const et = etapaDe(detalhe.etapa); if (et && et.aprovacao) return proposta('a etapa "' + et.nome + '" pede uma pessoa'); }
    if (acao === 'mensagem') return proposta('mensagem para o cliente passa por uma pessoa');
    if (acao === 'campo' && (cfg.sensiveis || []).includes(slug(detalhe.campo, 30))) return proposta('campo sensível passa por uma pessoa');
    if (acao === 'tarefa') return proposta('tarefa para uma pessoa é proposta');
  }
  if (aut === 'c' && acao === 'tarefa') return proposta('tarefa para uma pessoa é proposta');
  return { ok: true, direto: true };
}

/* ---------------- fichas ---------------- */
/* pelo id ou pela chave (o agente chama pelo telefone, pelo CPF…): nunca cria, só acha */
async function acharFicha(idOuChave) { if (!idOuChave) return null; let f = await dep.D.obter('fichas', String(idOuChave)); if (f) return f; const cfg = config(); if (!cfg) return null; const ch = chaveNormal(cfg, idOuChave); return (await dep.D.listar('fichas')).find(x => x.chave === ch) || null; }
async function listarFichas(autor, filtro = {}) {
  const cfg = config();
  let lista = await dep.D.listar('fichas');
  if (filtro.status) lista = lista.filter(f => f.status === filtro.status); else if (!filtro.todas) lista = lista.filter(f => f.status === 'ativa');   // o quadro mostra as ativas; perdidas e arquivadas pelo filtro
  if (filtro.etapa) lista = lista.filter(f => f.etapa === filtro.etapa);
  if (filtro.minhas) lista = lista.filter(f => f.responsavel && f.responsavel.tipo === autor.tipo && f.responsavel.id === autor.id);
  if (filtro.paradoDias) lista = lista.filter(f => f.status === 'ativa' && Date.now() - new Date(f.atualizadaEm).getTime() > Number(filtro.paradoDias) * DIA);
  if (filtro.q) { const q = String(filtro.q).toLowerCase(); lista = lista.filter(f => JSON.stringify(f.campos || {}).toLowerCase().includes(q) || String(f.chave).includes(q)); }
  const pend = (await dep.D.listar('propostas')).filter(p => p.estado === 'pendente');
  return lista.map(f => ({ ...fichaPara(cfg, f, autor), propostasPendentes: pend.filter(p => p.fichaId === f.id).length, diasParada: Math.floor((Date.now() - new Date(f.atualizadaEm).getTime()) / DIA) }));
}
async function obterFicha(autor, idOuChave) {
  const cfg = config();
  let f = await dep.D.obter('fichas', idOuChave);
  if (!f) { const ch = chaveNormal(cfg, idOuChave); f = (await dep.D.listar('fichas')).find(x => x.chave === ch) || null; }
  if (!f) return null;
  const historico = await dep.D.historicoDe(f.id);
  const propostas = (await dep.D.listar('propostas')).filter(p => p.fichaId === f.id);
  const tarefas = (await dep.D.listar('tarefas')).filter(t => t.fichaId === f.id);
  return { ...fichaPara(cfg, f, autor), historico, propostas, tarefas };
}
async function criarFicha(autor, { chave, campos = {}, etapa, responsavel } = {}) {
  const cfg = config();
  const d = decidir(cfg, autor, null, 'criar');
  if (!d.ok) return d;
  const ch = chaveNormal(cfg, chave || campos[cfg.entidade.chave] || campos.telefone || campos.nome);
  if (!ch) return { ok: false, motivo: 'diga a chave da ficha (' + cfg.entidade.chave + ')' };
  const existente = (await dep.D.listar('fichas')).find(f => f.chave === ch);
  if (existente) return { ok: true, existente: true, ficha: fichaPara(cfg, existente, autor), motivo: 'já existe uma ficha com essa chave: devolvi a existente, nada duplicado' };
  if (d.ensaio) return { ok: true, ensaio: true, motivo: 'em ensaio: criaria a ficha ' + ch };
  const et = etapa && etapaDe(etapa) ? etapaDe(etapa) : cfg.etapas[0];
  const camposLimpos = {}; for (const [k, v] of Object.entries(campos || {})) { const nk = slug(k, 30); if (nk) camposLimpos[nk] = limpa(v, 2000); }
  if (!camposLimpos[cfg.entidade.chave] && cfg.entidade.chave !== 'numero') camposLimpos[cfg.entidade.chave] = ch;
  const resp = responsavel && responsavel.tipo && responsavel.id ? responsavel : (et.responsavel || null);
  const f = { id: hex(6), chave: ch, campos: camposLimpos, etapa: et.id, responsavel: resp, status: 'ativa', agentes: {}, criadaEm: agora(), atualizadaEm: agora(), criadaPor: { tipo: autor.tipo, id: autor.id } };
  if (!d.direto) { return await propor(autor, f, 'criar', { ficha: f }, 'criar a ficha ' + (camposLimpos.nome || ch), d.motivo); }
  await dep.D.gravar('fichas', f);
  await anota(f.id, autor, 'criada', 'ficha criada em "' + et.nome + '"' + (resp ? ', com ' + nomeDe(resp) : ''));
  if (dep.aoMudar) dep.aoMudar('criada', f, autor);
  return { ok: true, ficha: fichaPara(cfg, f, autor) };
}
async function mudarFicha(autor, id, acao, detalhe = {}) {
  const cfg = config();
  const f = await acharFicha(id);
  if (!f) return { ok: false, motivo: 'ficha não encontrada' };
  if (f.status === 'arquivada' && acao !== 'atribuir') return { ok: false, motivo: 'ficha arquivada: nada muda nela' };
  const d = decidir(cfg, autor, f, acao, detalhe);
  if (!d.ok) return d;
  const descricoes = {
    mover: () => { const et = etapaDe(detalhe.etapa); if (!et) throw new Error('etapa não existe: ' + detalhe.etapa); return 'mover de "' + (etapaDe(f.etapa) || { nome: f.etapa }).nome + '" para "' + et.nome + '"'; },
    anotar: () => { if (!limpa(detalhe.texto, 1)) throw new Error('anotação vazia'); return 'anotar: ' + limpa(detalhe.texto, 300); },
    campo: () => { const k = slug(detalhe.campo, 30); if (!k) throw new Error('diga o campo'); return 'alterar ' + k + ' para "' + limpa(detalhe.valor, 120) + '"'; },
    mensagem: () => { if (!limpa(detalhe.texto, 1)) throw new Error('mensagem vazia'); return 'mandar ao cliente: ' + limpa(detalhe.texto, 300); },
    atribuir: () => { const r = detalhe.responsavel; if (!r || !r.tipo || !r.id) throw new Error('diga para quem'); return 'passar para ' + nomeDe(r); },
    perder: () => 'marcar como ' + (cfg.perdido === false ? 'arquivada' : 'perdida') + (detalhe.motivo ? ' (' + limpa(detalhe.motivo, 200) + ')' : ''),
    arquivar: () => 'arquivar',
    reativar: () => 'reativar'
  };
  let texto; try { texto = (descricoes[acao] || (() => { throw new Error('ação desconhecida: ' + acao); }))(); } catch (e) { return { ok: false, motivo: e.message }; }
  if (d.ensaio) return { ok: true, ensaio: true, motivo: 'em ensaio: ' + texto };
  if (!d.direto) return await propor(autor, f, acao, detalhe, texto, d.motivo);
  return await aplicar(autor, f, acao, detalhe, texto);
}
async function aplicar(autor, f, acao, detalhe, texto, origem) {
  const cfg = config();
  const antes = f.etapa;
  if (acao === 'mover') { const et = etapaDe(detalhe.etapa); f.etapa = et.id; if (et.responsavel && !(detalhe.manterResponsavel)) f.responsavel = et.responsavel; if (f.status === 'perdida') f.status = 'ativa'; }
  if (acao === 'campo') { f.campos = f.campos || {}; f.campos[slug(detalhe.campo, 30)] = limpa(detalhe.valor, 2000); }
  if (acao === 'atribuir') { f.responsavel = { tipo: detalhe.responsavel.tipo, id: detalhe.responsavel.id }; if (detalhe.responsavel.tipo === 'agente' && autor.tipo === 'pessoa' && detalhe.observacao) f.feitoPeloDono = [...(f.feitoPeloDono || []), { quando: agora(), por: nomeDe(autor), texto: limpa(detalhe.observacao, 500) }]; }
  if (acao === 'perder') { f.status = cfg.perdido === false ? 'arquivada' : 'perdida'; f.motivoPerda = limpa(detalhe.motivo, 200); }
  if (acao === 'arquivar') f.status = 'arquivada';
  if (acao === 'reativar') { f.status = 'ativa'; delete f.motivoPerda; }
  f.atualizadaEm = agora();
  await dep.D.gravar('fichas', f);
  const tipo = { mover: 'movida', anotar: 'anotada', campo: 'campo', mensagem: 'mensagem', atribuir: 'atribuída', perder: 'perdida', arquivar: 'arquivada', reativar: 'reativada' }[acao];
  await anota(f.id, autor, tipo, (origem ? origem + ': ' : '') + (acao === 'anotar' ? limpa(detalhe.texto, 2000) : acao === 'mensagem' ? 'mensagem ao cliente: ' + limpa(detalhe.texto, 2000) : texto), acao === 'mover' ? { de: antes, para: f.etapa } : {});
  if (dep.aoMudar) dep.aoMudar(acao, f, autor, detalhe);
  return { ok: true, ficha: fichaPara(cfg, f, autor), feito: texto };
}

/* ---------------- propostas: o agente quer, uma pessoa decide ---------------- */
async function propor(autor, f, acao, detalhe, texto, motivo) {
  const p = { id: hex(6), fichaId: f.id, autor: { tipo: autor.tipo, id: autor.id, nome: nomeDe(autor) }, acao, detalhe, texto, motivo, estado: 'pendente', criadaEm: agora() };
  await dep.D.gravar('propostas', p);
  if (f.id && acao !== 'criar') await anota(f.id, autor, 'proposta', 'propôs: ' + texto + ' (' + motivo + ')');
  if (dep.avisar) dep.avisar('Proposta no CRM', nomeDe(autor) + ' quer ' + texto + '. Aprove na ficha.', 'normal');
  return { ok: true, direto: false, proposta: true, id: p.id, motivo: 'virou proposta pendente: ' + motivo };
}
async function decidirProposta(autor, id, aprovar, motivoRejeicao) {
  const cfg = config();
  const c = cargoDe(autor);
  if (!c || !c.aprovar || autor.tipo !== 'pessoa') return { ok: false, motivo: 'só quem tem o cargo de aprovar decide propostas' };
  const p = await dep.D.obter('propostas', id);
  if (!p) return { ok: false, motivo: 'proposta não encontrada' };
  if (p.estado !== 'pendente') return { ok: false, motivo: 'essa proposta já foi decidida' };
  p.estado = aprovar ? 'aprovada' : 'rejeitada'; p.decidida = { por: { tipo: 'pessoa', id: autor.id, nome: nomeDe(autor) }, quando: agora(), motivo: limpa(motivoRejeicao, 300) };
  await dep.D.gravar('propostas', p);
  if (!aprovar) { if (p.fichaId && p.acao !== 'criar') await anota(p.fichaId, autor, 'rejeitada', 'rejeitou a proposta de ' + p.autor.nome + ': ' + p.texto + (p.decidida.motivo ? ' — ' + p.decidida.motivo : '')); return { ok: true, proposta: p }; }
  if (p.acao === 'criar') { const f = p.detalhe.ficha; await dep.D.gravar('fichas', { ...f, atualizadaEm: agora() }); await anota(f.id, autor, 'criada', 'aprovou a proposta de ' + p.autor.nome + ': ficha criada'); return { ok: true, proposta: p }; }
  if (p.acao === 'tarefa') { const r = await criarTarefa(autor, { ...p.detalhe, fichaId: p.fichaId }, 'aprovou a proposta de ' + p.autor.nome); return { ok: true, proposta: p, tarefa: r.tarefa }; }
  const f = await dep.D.obter('fichas', p.fichaId);
  if (!f) return { ok: false, motivo: 'a ficha da proposta não existe mais' };
  const r = await aplicar(autor, f, p.acao, p.detalhe, p.texto, 'aprovou a proposta de ' + p.autor.nome);
  return { ok: true, proposta: p, ficha: r.ficha };
}
const propostas = async (estado = 'pendente') => (await dep.D.listar('propostas')).filter(p => !estado || p.estado === estado);

/* ---------------- tarefas ---------------- */
async function criarTarefa(autor, { fichaId, titulo, para, prazo } = {}, origem) {
  const cfg = config();
  const t = limpa(titulo, 200); if (!t) return { ok: false, motivo: 'diga o título da tarefa' };
  const f = fichaId ? await acharFicha(fichaId) : null;
  if (fichaId && !f) return { ok: false, motivo: 'ficha não encontrada' };
  if (!origem) { const d = decidir(cfg, autor, f, 'tarefa'); if (!d.ok) return d; if (d.ensaio) return { ok: true, ensaio: true, motivo: 'em ensaio: criaria a tarefa ' + t }; if (!d.direto) return await propor(autor, f || { id: null }, 'tarefa', { fichaId, titulo: t, para, prazo }, 'tarefa "' + t + '"' + (para ? ' para ' + nomeDe(para) : ''), d.motivo); }
  const tarefa = { id: hex(6), fichaId: f ? f.id : null, titulo: t, para: para && para.tipo && para.id ? { tipo: para.tipo, id: para.id } : (f && f.responsavel) || { tipo: 'pessoa', id: cfg.chefe }, prazo: /^\d{4}-\d{2}-\d{2}$/.test(prazo || '') ? prazo : null, feita: null, criadaPor: { tipo: autor.tipo, id: autor.id, nome: nomeDe(autor) }, criadaEm: agora() };
  await dep.D.gravar('tarefas', tarefa);
  if (f) await anota(f.id, autor, 'tarefa', (origem ? origem + ': ' : '') + 'tarefa "' + t + '" para ' + nomeDe(tarefa.para) + (tarefa.prazo ? ' até ' + tarefa.prazo : ''));
  return { ok: true, tarefa };
}
async function concluirTarefa(autor, id, resultado) {
  const t = await dep.D.obter('tarefas', id);
  if (!t) return { ok: false, motivo: 'tarefa não encontrada' };
  if (t.feita) return { ok: false, motivo: 'já estava feita' };
  t.feita = { por: { tipo: autor.tipo, id: autor.id, nome: nomeDe(autor) }, quando: agora(), resultado: limpa(resultado, 500) };
  await dep.D.gravar('tarefas', t);
  if (t.fichaId) await anota(t.fichaId, autor, 'tarefa feita', 'tarefa "' + t.titulo + '" feita' + (t.feita.resultado ? ': ' + t.feita.resultado : ''));
  return { ok: true, tarefa: t };
}
const tarefas = async (filtro = {}) => (await dep.D.listar('tarefas')).filter(t => (filtro.abertas ? !t.feita : true) && (filtro.para ? t.para && t.para.tipo === filtro.para.tipo && t.para.id === filtro.para.id : true));

/* ---------------- importar (CSV) ---------------- */
function lerCsv(texto) {
  const linhas = String(texto || '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!linhas.length) return { cab: [], linhas: [] };
  const sep = (linhas[0].match(/;/g) || []).length > (linhas[0].match(/,/g) || []).length ? ';' : ',';
  const parte = (l) => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out.map(s => s.trim()); };
  const cab = parte(linhas[0]);
  return { cab, linhas: linhas.slice(1).map(parte) };
}
async function importar(autor, { csv, mapa = {}, etapa } = {}) {
  const cfg = config();
  const c = cargoDe(autor); if (!c || !c.editar || autor.tipo !== 'pessoa') return { ok: false, motivo: 'só uma pessoa com cargo de editar importa' };
  const { cab, linhas } = lerCsv(csv);
  if (!cab.length) return { ok: false, motivo: 'CSV vazio' };
  const idx = {}; for (const [campo, coluna] of Object.entries(mapa)) { const i = cab.findIndex(h => h.toLowerCase() === String(coluna).toLowerCase()); if (i >= 0) idx[slug(campo, 30)] = i; }
  if (!Object.keys(idx).length) for (const [i, h] of cab.entries()) { const k = slug(h, 30); if (k) idx[k] = i; }
  let criadas = 0, repetidas = 0, semChave = 0; const erros = [];
  for (const l of linhas.slice(0, 5000)) {
    const campos = {}; for (const [k, i] of Object.entries(idx)) if (l[i]) campos[k] = l[i];
    const r = await criarFicha(autor, { campos, etapa });
    if (!r.ok) { if (/chave/.test(r.motivo || '')) semChave++; else erros.push(r.motivo); continue; }
    if (r.existente) repetidas++; else criadas++;
  }
  return { ok: true, criadas, repetidas, semChave, erros: erros.slice(0, 5), colunas: cab };
}

/* ---------------- o painel e a equipe ---------------- */
async function painel() {
  const cfg = config();
  const fichas = (await dep.D.listar('fichas'));
  const ativas = fichas.filter(f => f.status === 'ativa');
  const porEtapa = cfg.etapas.map(e => ({ id: e.id, nome: e.nome, total: ativas.filter(f => f.etapa === e.id).length }));
  const pend = (await dep.D.listar('propostas')).filter(p => p.estado === 'pendente').length;
  const abertas = (await dep.D.listar('tarefas')).filter(t => !t.feita);
  return { entidade: cfg.entidade, porEtapa, ativas: ativas.length, perdidas: fichas.filter(f => f.status === 'perdida').length, arquivadas: fichas.filter(f => f.status === 'arquivada').length,
           paradas7d: ativas.filter(f => Date.now() - new Date(f.atualizadaEm).getTime() > 7 * DIA).length, propostasPendentes: pend, tarefasAbertas: abertas.length, tarefasVencidas: abertas.filter(t => t.prazo && t.prazo < agora().slice(0, 10)).length,
           novas7d: fichas.filter(f => Date.now() - new Date(f.criadaEm).getTime() < 7 * DIA).length };
}
function estadoDoEscritorio() {
  const porta = Number((dep.env || process.env).ESCRITORIO_PORTA) || 4321;
  return new Promise(resolve => {
    try {
      const req = http.get('http://127.0.0.1:' + porta + '/api/sistemas', { timeout: 3000 }, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => { try { resolve(JSON.parse(s)); } catch (e) { resolve(null); } }); });
      req.on('error', () => resolve(null)); req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch (e) { resolve(null); }
  });
}
async function equipe() {
  const u = usuarios(); const cg = cargos();
  const est = await estadoDoEscritorio();
  const porta = Number((dep.env || process.env).ESCRITORIO_PORTA) || 4321;
  return {
    pessoas: u.pessoas.map(p => ({ id: p.id, nome: p.nome, cargo: p.cargo, cargoNome: (cg[p.cargo] || {}).nome || p.cargo, ativa: p.ativa !== false })),
    agentes: u.agentes.map(a => { const s = Array.isArray(est) ? est.find(x => x.id === a.id) : null; return { id: a.id, nome: a.nome, cargo: a.cargo, cargoNome: (cg[a.cargo] || {}).nome || a.cargo, setor: s ? s.setor : null, estado: s ? (s.construcao && s.construcao.emTreinamento ? 'em treinamento' : s.estado) : 'escritório fora do ar', monitor: 'http://localhost:' + porta + '/#agente=' + a.id }; }),
    escritorioNoAr: Array.isArray(est), cargos: cg
  };
}

/* ---------------- o estado do agente na ficha (decisão A: a verdade mora aqui; o agente guarda um espelho) ----------------
   Só o próprio agente grava o seu; não é escrita "na ficha" (não passa pela regra do responsável), é o registro das rodadas dele. */
async function estadoDoAgente(autor, fichaId, estado) {
  if (autor.tipo !== 'agente') return { ok: false, motivo: 'só o agente grava o próprio estado' };
  const f = await acharFicha(fichaId);
  if (!f) return { ok: false, motivo: 'ficha não encontrada' };
  const e = estado && typeof estado === 'object' ? estado : {};
  const anterior = (f.agentes || {})[autor.id] || {};
  f.agentes = f.agentes || {};
  f.agentes[autor.id] = { ...e, atualizado: e.atualizado || agora(), gravadoEm: agora() };
  await dep.D.gravar('fichas', f);
  if (e.status && e.status !== anterior.status && /^(pronta|com erro|aguardando pergunta|aguardando aprovação)$/.test(e.status))
    await anota(f.id, autor, 'rodada', 'rodada do agente: ' + e.status + (e.status === 'aguardando pergunta' && e.pergunta ? ' — ' + String(e.pergunta.texto || '').slice(0, 300) : e.status === 'com erro' && e.erro ? ' — ' + String(e.erro).slice(0, 200) : ''));
  return { ok: true };
}

/* ---------------- ação direta: o CRM pede, o escritório repassa, o sistema do agente roda a ferramenta na hora ---------------- */
function pedirAoEscritorio(rota, corpo, prazo = 70000) {
  const env = dep.env || process.env;
  const porta = Number(env.ESCRITORIO_PORTA) || 4321;
  return new Promise(resolve => {
    try {
      const dados = JSON.stringify({ ...corpo, segredo: env.CRM_SEGREDO_EVENTO || '' });
      const req = http.request('http://127.0.0.1:' + porta + rota, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dados) }, timeout: prazo }, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch (e) {} resolve({ status: r.statusCode, json: j }); }); });
      req.on('error', e => resolve({ status: 0, erro: e.message })); req.on('timeout', () => { req.destroy(); resolve({ status: 0, erro: 'sem resposta do escritório' }); });
      req.end(dados);
    } catch (e) { resolve({ status: 0, erro: e.message }); }
  });
}
async function ferramentasDoAgente(agente) {
  const r = await pedirAoEscritorio('/api/crm/ferramentas', { agente }, 8000);
  return r.status === 200 && r.json ? r.json : { ok: false, motivo: r.erro || (r.json && r.json.motivo) || ('escritório respondeu ' + r.status) };
}
async function acaoDireta(autor, { agente, ferramenta, args, fichaId } = {}) {
  const c = cargoDe(autor);
  if (!c || !(c.editar) || !(autor.tipo === 'pessoa' || autor.tipo === 'escritorio')) return { ok: false, motivo: 'só uma pessoa com cargo de editar pede ação direta' };
  if (!usuarios().agentes.some(a => a.id === agente)) return { ok: false, motivo: 'esse agente não é funcionário do CRM' };
  const f = fichaId ? await acharFicha(fichaId) : null;
  if (fichaId && !f) return { ok: false, motivo: 'ficha não encontrada' };
  const r = await pedirAoEscritorio('/api/crm/acao', { agente, ferramenta: String(ferramenta || ''), args: Array.isArray(args) ? args.map(String) : [], entidade: f ? f.chave : '' });
  const res = r.json || { ok: false, motivo: r.erro || ('escritório respondeu ' + r.status) };
  if (f) await anota(f.id, autor, 'ação direta', 'pediu a ' + nomeDe({ tipo: 'agente', id: agente }) + ': ' + ferramenta + ' ' + (args || []).join(' ').slice(0, 200) + ' → ' + (res.ok ? (res.resultado ? res.resultado.estado + ': ' + String(res.resultado.detalhe || '').slice(0, 300) : 'feito') + (res.modo === 'proposta' ? ' (em modo proposta: o agente ainda não tem MODO_REAL)' : '') : 'não deu: ' + String(res.motivo || '').slice(0, 300)));
  return res;
}

/* ---------------- avisos: pelo escritório (ntfy, CallMeBot, Cuki BOT) ---------------- */
function avisarEscritorio(titulo, texto, prioridade = 'normal') {
  const porta = Number((dep.env || process.env).ESCRITORIO_PORTA) || 4321;
  try {
    const corpo = JSON.stringify({ titulo: 'CRM: ' + titulo, texto: String(texto).slice(0, 400), prioridade });
    const req = http.request('http://127.0.0.1:' + porta + '/api/avisar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 3000 }, r => r.resume());
    req.on('error', () => {}); req.on('timeout', () => req.destroy()); req.end(corpo);
  } catch (e) { /* sem escritório no ar, segue */ }
}
/* uma vez por dia: fichas paradas há mais de 7 dias e tarefas vencidas */
let ultimoAvisoDia = null;
async function avisosDiarios() {
  const dia = agora().slice(0, 10); if (ultimoAvisoDia === dia) return null; ultimoAvisoDia = dia;
  const p = await painel();
  const linhas = [];
  if (p.paradas7d) linhas.push(p.paradas7d + ' ' + (p.paradas7d === 1 ? p.entidade.singular + ' parado(a)' : p.entidade.plural + ' parados(as)') + ' há mais de 7 dias');
  if (p.tarefasVencidas) linhas.push(p.tarefasVencidas + ' tarefa(s) vencida(s)');
  if (p.propostasPendentes) linhas.push(p.propostasPendentes + ' proposta(s) de agente esperando decisão');
  if (linhas.length && dep.avisar) dep.avisar('Pendências de hoje', linhas.join('; ') + '. Abra o CRM.', 'normal');
  return linhas;
}

module.exports = {
  init(d) { dep = d || {}; if (!dep.avisar && dep.avisar !== null) dep.avisar = avisarEscritorio; return module.exports; },
  config, usuarios, gravarUsuarios, cargos, cargoDe, etapaDe, nomeDe, chaveNormal, mascarar, lerCsv,
  entrar, sair, quem, cookie, cookieVazio, trocarSenha, primeiraSenha,
  listarFichas, obterFicha, criarFicha, mudarFicha, decidir, propostas, decidirProposta,
  criarTarefa, concluirTarefa, tarefas, importar, painel, equipe, estadoDoEscritorio, avisarEscritorio, avisosDiarios, CAMPOS_BASE, hex, hash,
  estadoDoAgente, acaoDireta, ferramentasDoAgente, pedirAoEscritorio
};
