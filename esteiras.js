/* ===========================================================
   esteiras.js — agentes passando o trabalho entre si

   Uma esteira é uma lista de etapas em ordem; cada etapa tem um agente
   responsável, o que ele entrega e se uma pessoa precisa aprovar antes de
   seguir. A coisa que anda na esteira é a ENTIDADE (um processo, um pedido,
   um paciente). Quem passa o bastão é o escritório, nunca o agente: o agente
   só marca a entidade como pronta; o escritório lê isso em GET /entidades do
   agente, chama o POST /gatilho do próximo e deixa um recado.

   Definições em data/esteiras.json; estado de cada entidade em
   data/esteiras/<esteira>/<entidade>.json. Aprovação é pela tela.
   Design: docs/superpowers/specs/2026-10-14-esteiras-design.md

   Linha de comando (para a skill /criar-esteira):
     node esteiras.js listar | agentes | criar <def.json> | remover <id> | entrar <esteira> <entidade> | estado
   =========================================================== */
const fs = require('fs');
const path = require('path');
const http = require('http');
const UTIL = require('./util');

let dep = {};   // { DADOS, lerRegistro, mensagens (MEMORIA), avisar, plataformas, ligar }

const INTERVALO_MS = 20000;
const APROVACOES = ['nenhuma', 'pessoa'];
const VIVOS = new Set(['na fila', 'andando', 'parada (pergunta)', 'com erro', 'proposta no agente', 'com o dono']);

/* ---------------- definições ---------------- */
const arqDefs = () => path.join(dep.DADOS, 'esteiras.json');
function lerDefs() { try { const d = JSON.parse(fs.readFileSync(arqDefs(), 'utf8')); return Array.isArray(d.esteiras) ? d.esteiras : []; } catch (e) { return []; } }
function gravarDefs(lista) { fs.mkdirSync(dep.DADOS, { recursive: true }); fs.writeFileSync(arqDefs(), JSON.stringify({ _leia: 'esteiras do escritório: etapas em ordem, um agente por etapa; gravado pela tela 🧵 ou por node esteiras.js criar', esteiras: lista }, null, 2) + '\n'); }
const listar = () => lerDefs();
const obter = (id) => lerDefs().find(e => e.id === id) || null;

/** os agentes de tarefa que podem entrar numa etapa, com o que a tela e a skill precisam para propor */
function agentesCandidatos() {
  const reg = dep.lerRegistro();
  return Object.entries(reg).filter(([, s]) => s.trilha && s.trilha !== 'atendimento').map(([id, s]) => {
    let tarefa = ''; try { tarefa = (/^Tarefa em uma frase:\s*(.+)$/m.exec(fs.readFileSync(path.join(s.pasta, 'progresso-do-agente.md'), 'utf8')) || [])[1] || ''; } catch (e) {}
    if (/\[A PREENCHER/.test(tarefa)) tarefa = '';
    return { id, nome: s.nome || id, setor: s.setor || '', tarefa: tarefa.trim(), plataformas: Array.isArray(s.plataformas) ? s.plataformas : [], pasta: !!s.pasta };
  });
}

function validar(def) {
  const d = def || {};
  const nome = String(d.nome || '').trim().slice(0, 60);
  if (!nome) return { ok: false, motivo: 'dê um nome à esteira' };
  const id = UTIL.slug(d.id || nome, 40);
  if (!id) return { ok: false, motivo: 'nome inválido' };
  const reg = dep.lerRegistro();
  const etapas = Array.isArray(d.etapas) ? d.etapas : [];
  if (!etapas.length) return { ok: false, motivo: 'a esteira precisa de pelo menos uma etapa' };
  const vistos = new Set(), out = [];
  for (const e of etapas) {
    const en = String((e && e.nome) || '').trim().slice(0, 60);
    if (!en) return { ok: false, motivo: 'toda etapa precisa de nome' };
    let eid = UTIL.slug((e && e.id) || en, 30); let n = 2; const basee = eid; while (vistos.has(eid)) eid = basee + '-' + n++;
    vistos.add(eid);
    const ag = String((e && e.agente) || '').trim();
    const s = reg[ag];
    if (!s) return { ok: false, motivo: 'etapa "' + en + '": agente não existe: ' + ag };
    if (!s.trilha || s.trilha === 'atendimento') return { ok: false, motivo: 'etapa "' + en + '": ' + (s.nome || ag) + ' não é um agente de tarefa' };
    const aprovacao = APROVACOES.includes(e.aprovacao) ? e.aprovacao : 'nenhuma';
    out.push({ id: eid, nome: en, agente: ag, entrega: String((e && e.entrega) || '').trim().slice(0, 200), aprovacao, aprovador: aprovacao === 'pessoa' ? String((e && e.aprovador) || '').trim().slice(0, 60) : '' });
  }
  let pasta = String(d.pasta || '').trim();
  if (pasta) {
    const p = dep.plataformas && dep.plataformas.obter(pasta);
    if (!p) return { ok: false, motivo: 'plataforma da pasta não existe: ' + pasta };
    if (p.tipo !== 'pasta') return { ok: false, motivo: 'a plataforma ' + pasta + ' não é do tipo pasta' };
  }
  const ent = d.entidade && typeof d.entidade === 'object' ? d.entidade : {};
  return { ok: true, def: { id, nome, entidade: { singular: String(ent.singular || 'entidade').trim().slice(0, 30), plural: String(ent.plural || ent.singular || 'entidades').trim().slice(0, 30) },
    pasta: pasta || '', vigiarPasta: !!d.vigiarPasta && !!pasta, etapas: out, criadaEm: d.criadaEm || new Date().toISOString() } };
}
function salvar(def) {
  const v = validar(def);
  if (!v.ok) return v;
  const lista = lerDefs().filter(e => e.id !== v.def.id);
  lista.push(v.def); gravarDefs(lista);
  return { ok: true, esteira: v.def };
}
function remover(id) {
  const lista = lerDefs();
  if (!lista.some(e => e.id === id)) return { ok: false, motivo: 'esteira não existe: ' + id };
  gravarDefs(lista.filter(e => e.id !== id));
  return { ok: true };
}

/* ---------------- estado das entidades ---------------- */
const dirEstados = (esteira) => path.join(dep.DADOS, 'esteiras', esteira);
function lerEstados(esteira) {
  let arqs = []; try { arqs = fs.readdirSync(dirEstados(esteira)).filter(f => f.endsWith('.json')); } catch (e) { return []; }
  return arqs.map(f => { try { return JSON.parse(fs.readFileSync(path.join(dirEstados(esteira), f), 'utf8')); } catch (e) { return null; } }).filter(Boolean)
    .sort((a, b) => String(b.atualizado || '').localeCompare(String(a.atualizado || '')));
}
function gravarEstado(est) {
  est.atualizado = new Date().toISOString();
  fs.mkdirSync(dirEstados(est.esteira), { recursive: true });
  fs.writeFileSync(path.join(dirEstados(est.esteira), est.slug + '.json'), JSON.stringify(est, null, 2) + '\n');
  return est;
}
const estadoDe = (esteira, entidade) => lerEstados(esteira).find(e => e.slug === UTIL.slug(entidade, 40) || e.entidade === entidade) || null;
function anota(est, evento, extra = {}) { est.historico.push({ quando: new Date().toISOString(), etapa: est.etapa, evento, ...extra }); if (est.historico.length > 200) est.historico.splice(0, est.historico.length - 200); }

/* ---------------- falar com o agente ---------------- */
function agenteInfo(id) {
  const s = dep.lerRegistro()[id];
  if (!s) return null;
  const chave = s.pasta ? (UTIL.lerEnvArquivo(path.join(s.pasta, '.env')).get('GATILHO_CHAVE') || '') : '';
  return { id, nome: s.nome || id, porta: s.porta, pasta: s.pasta, chave, url: 'http://127.0.0.1:' + s.porta };
}
function httpJson(metodo, url, cabecalhos, corpo) {
  return new Promise(resolve => {
    try {
      const dados = corpo ? JSON.stringify(corpo) : null;
      const req = http.request(url, { method: metodo, headers: { 'Content-Type': 'application/json', ...(cabecalhos || {}) }, timeout: 4000 }, r => {
        let s = ''; r.on('data', d => s += d);
        r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch (e) {} resolve({ status: r.statusCode, json: j }); });
      });
      req.on('error', () => resolve({ status: 0 })); req.on('timeout', () => { req.destroy(); resolve({ status: 0 }); });
      req.end(dados);
    } catch (e) { resolve({ status: 0 }); }
  });
}
/** o que o agente tem: { ok, entidades, resumo } ou { ok: false, motivo } */
async function entidadesDoAgente(id) {
  const a = agenteInfo(id);
  if (!a) return { ok: false, motivo: 'agente não existe' };
  if (!a.chave) return { ok: false, motivo: a.nome + ' sem GATILHO_CHAVE no .env' };
  const r = await httpJson('GET', a.url + '/entidades', { 'x-chave': a.chave });
  if (r.status === 0) return { ok: false, motivo: a.nome + ' fora do ar', foraDoAr: true };
  if (r.status === 401) return { ok: false, motivo: a.nome + ' recusou a chave do gatilho' };
  if (r.status !== 200 || !r.json) return { ok: false, motivo: a.nome + ' respondeu ' + r.status };
  return { ok: true, entidades: r.json.entidades || [], resumo: r.json.resumo || {} };
}
async function gatilho(id, entidade, extra, refazer) {
  const a = agenteInfo(id);
  if (!a || !a.chave) return { ok: false, motivo: 'agente sem chave do gatilho' };
  const r = await httpJson('POST', a.url + '/gatilho', { 'x-chave': a.chave }, { entidade, extra, refazer: !!refazer });
  return r.status === 202 ? { ok: true } : { ok: false, motivo: r.status === 0 ? a.nome + ' fora do ar' : a.nome + ' respondeu ' + r.status, foraDoAr: r.status === 0 };
}

/** o caminho da pasta compartilhada da esteira (plataforma do tipo pasta), ou '' */
function caminhoPasta(def) {
  if (!def.pasta || !dep.plataformas) return '';
  const p = dep.plataformas.obter(def.pasta, true);
  if (!p) return '';
  const pref = dep.plataformas.prefixoDe(p.id);
  return String((p.variaveis || {})[pref + 'PASTA'] || '').trim();
}
/** o que vai no gatilho: a etapa, a entrega esperada, onde ler o anterior e onde gravar */
function textoGatilho(def, est) {
  const i = est.etapa, et = def.etapas[i], ant = i > 0 ? def.etapas[i - 1] : null;
  const pasta = caminhoPasta(def);
  const base = pasta ? path.join(pasta, est.entidade) : '';
  return 'ESTEIRA "' + def.nome + '", etapa ' + (i + 1) + ' de ' + def.etapas.length + ': "' + et.nome + '". ' +
    (et.entrega ? 'Entrega esperada: ' + et.entrega + '. ' : '') +
    (base ? 'Pasta desta ' + def.entidade.singular + ': ' + base + ' . Grave a sua entrega em ' + path.join(base, et.id) + ' . ' : '(sem pasta compartilhada definida para a esteira) ') +
    (ant ? 'A etapa anterior, "' + ant.nome + '", foi feita por ' + (agenteInfo(ant.agente) || { nome: ant.agente }).nome + (base ? ' e está em ' + path.join(base, ant.id) + ' .' : '.') : 'É a primeira etapa.') +
    (et.aprovacao === 'pessoa' ? ' Depois de pronta, uma pessoa aprova na tela do escritório antes de seguir.' : '');
}

/* ---------------- entrar, disparar, passar ---------------- */
async function tentarDisparar(def, est, refazer, extraDevolucao) {
  const et = def.etapas[est.etapa];
  const r = await entidadesDoAgente(et.agente);
  if (!r.ok) {
    if (r.foraDoAr && dep.ligar && (!est.ligarTentadoEm || Date.now() - est.ligarTentadoEm > 60000)) { est.ligarTentadoEm = Date.now(); try { await dep.ligar(et.agente); } catch (e) {} }
    est.status = 'na fila'; est.motivo = r.motivo; return gravarEstado(est);
  }
  if ((r.resumo || {})['em andamento'] > 0 && !refazer) { est.status = 'na fila'; est.motivo = 'agente ocupado com outra entidade'; return gravarEstado(est); }
  const extra = textoGatilho(def, est) + (extraDevolucao ? '\n\n' + extraDevolucao : '');
  const g = await gatilho(et.agente, est.entidade, extra, refazer);
  if (!g.ok) { est.status = 'na fila'; est.motivo = g.motivo; return gravarEstado(est); }
  est.status = 'andando'; delete est.motivo; est.disparadoEm = new Date().toISOString();
  anota(est, 'gatilho', { agente: et.agente, refazer: !!refazer });
  return gravarEstado(est);
}

async function entrar(esteiraId, entidade, origem = 'tela') {
  const def = obter(esteiraId);
  if (!def) return { ok: false, motivo: 'esteira não existe: ' + esteiraId };
  const nome = String(entidade || '').trim().slice(0, 80);
  if (!nome) return { ok: false, motivo: 'diga qual ' + def.entidade.singular + ' entra' };
  const slug = UTIL.slug(nome, 40);
  const atual = estadoDe(esteiraId, nome);
  if (atual && atual.status !== 'concluída') return { ok: false, motivo: 'já está na esteira, na etapa "' + def.etapas[atual.etapa].nome + '" (' + atual.status + ')' };
  const est = { esteira: def.id, entidade: nome, slug, etapa: 0, status: 'na fila', historico: [], criado: new Date().toISOString() };
  anota(est, 'entrou', { por: origem });
  gravarEstado(est);
  if (dep.crm && origem !== 'crm') dep.crm.mover(def, est).catch(() => {});
  await tentarDisparar(def, est);
  return { ok: true, estado: est };
}

async function avancar(def, est, quem) {
  const i = est.etapa, et = def.etapas[i];
  if (i + 1 >= def.etapas.length) {
    est.status = 'concluída'; anota(est, 'concluída', { por: quem });
    gravarEstado(est);
    if (dep.crm) dep.crm.concluir(def, est).catch(() => {});
    if (dep.avisar) dep.avisar(def.nome + ': ' + def.entidade.singular + ' concluído(a)', est.entidade + ' passou por todas as etapas.', 'normal').catch(() => {});
    return est;
  }
  const prox = def.etapas[i + 1];
  const pasta = caminhoPasta(def);
  if (dep.mensagens) {
    dep.mensagens.enviar({ de: et.agente, para: prox.agente, texto: 'Esteira "' + def.nome + '": a etapa "' + et.nome + '" de ' + est.entidade + ' está pronta' +
      (pasta ? ' (em ' + path.join(pasta, est.entidade, et.id) + ')' : '') + '. Segue para você: "' + prox.nome + '"' + (prox.entrega ? ' — ' + prox.entrega : '') + '.' });
  }
  est.etapa = i + 1; anota(est, 'passou', { de: et.agente, para: prox.agente, por: quem });
  if (dep.crm) dep.crm.mover(def, est).catch(() => {});
  return tentarDisparar(def, est);
}

/* o CRM pôs a ficha com um agente (uma pessoa moveu ou passou): a entidade entra ou vai para essa etapa da esteira e o gatilho dispara */
async function colocar(nome, etapaId, agenteId, por = 'CRM', fichaId = null) {
  const defs = lerDefs();
  const s = UTIL.slug(etapaId || '', 30);
  const def = defs.find(d => d.etapas.some(e => e.id === s || UTIL.slug(e.nome, 30) === s)) || defs.find(d => d.etapas.some(e => e.agente === agenteId));
  if (!def) return { ok: false, motivo: 'nenhuma esteira tem essa etapa ou esse agente' };
  let i = def.etapas.findIndex(e => e.id === s || UTIL.slug(e.nome, 30) === s); if (i < 0) i = def.etapas.findIndex(e => e.agente === agenteId);
  const entidade = String(nome || '').trim().slice(0, 80); if (!entidade) return { ok: false, motivo: 'sem nome da entidade' };
  let est = estadoDe(def.id, entidade);
  if (!est) { est = { esteira: def.id, entidade, slug: UTIL.slug(entidade, 40), etapa: i, status: 'na fila', historico: [], criado: new Date().toISOString() }; anota(est, 'entrou', { por }); }
  if (fichaId) est.fichaId = fichaId;   // a ficha do CRM desta entidade: o escritório move essa, nunca cria outra
  else if (est.status === 'andando' && est.etapa === i) return { ok: true, estado: est, motivo: 'já está andando nessa etapa' };
  else { est.etapa = i; est.status = 'na fila'; delete est.motivo; anota(est, 'movida pelo CRM', { por }); }
  gravarEstado(est);
  await tentarDisparar(def, est);
  return { ok: true, estado: est, esteira: def.id, etapa: def.etapas[i].nome };
}

async function concluirEtapa(def, est, ensaio) {
  const et = def.etapas[est.etapa];
  anota(est, 'etapa pronta', { agente: et.agente, ensaio: !!ensaio });
  if (et.aprovacao === 'pessoa') {
    est.status = 'aguardando aprovação'; delete est.motivo; gravarEstado(est);
    if (dep.avisar) dep.avisar(def.nome + ': esperando aprovação', (et.entrega || et.nome) + ' de ' + est.entidade + (et.aprovador ? ' espera ' + et.aprovador : ' espera aprovação') + '. Aprove na tela do escritório, em 🧵 Esteiras.', 'alta').catch(() => {});
    return est;
  }
  return avancar(def, est, 'escritório');
}

async function aprovar(esteiraId, entidade, quem = 'pessoa') {
  const def = obter(esteiraId); if (!def) return { ok: false, motivo: 'esteira não existe' };
  const est = estadoDe(esteiraId, entidade); if (!est) return { ok: false, motivo: 'entidade não está na esteira' };
  if (est.status !== 'aguardando aprovação') return { ok: false, motivo: 'não está esperando aprovação (está: ' + est.status + ')' };
  anota(est, 'aprovada', { por: quem });
  await avancar(def, est, quem);
  return { ok: true, estado: est };
}
async function devolver(esteiraId, entidade, quem = 'pessoa', observacao = '') {
  const def = obter(esteiraId); if (!def) return { ok: false, motivo: 'esteira não existe' };
  const est = estadoDe(esteiraId, entidade); if (!est) return { ok: false, motivo: 'entidade não está na esteira' };
  if (est.status !== 'aguardando aprovação') return { ok: false, motivo: 'não está esperando aprovação (está: ' + est.status + ')' };
  const obs = String(observacao || '').trim().slice(0, 1000) || 'refaça esta etapa';
  const et = def.etapas[est.etapa];
  anota(est, 'devolvida', { por: quem, observacao: obs });
  if (dep.mensagens) dep.mensagens.enviar({ de: 'dono', para: et.agente, texto: 'Esteira "' + def.nome + '", ' + est.entidade + ': a etapa "' + et.nome + '" foi devolvida. Observação: ' + obs });
  await tentarDisparar(def, est, true, 'A ENTREGA DESTA ETAPA FOI DEVOLVIDA POR ' + quem + '. Observação: ' + obs + '\nRefaça a etapa levando a observação em conta; não desfaça o que estiver certo.');
  return { ok: true, estado: est };
}

/* ---------------- a vigília ---------------- */
function vigiarPasta(def) {
  const pasta = caminhoPasta(def);
  if (!def.vigiarPasta || !pasta) return [];
  let subs = []; try { subs = fs.readdirSync(pasta, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name); } catch (e) { return []; }
  const vistos = new Set(lerEstados(def.id).map(e => e.entidade));
  return subs.filter(n => !vistos.has(n) && !n.startsWith('.') && !n.startsWith('_'));
}
let rodandoTick = false;
async function tick() {
  if (rodandoTick) return; rodandoTick = true;
  try {
    for (const def of lerDefs()) {
      for (const nova of vigiarPasta(def)) await entrar(def.id, nova, 'pasta vigiada');
      const cache = new Map();
      const leia = async (ag) => { if (!cache.has(ag)) cache.set(ag, await entidadesDoAgente(ag)); return cache.get(ag); };
      for (const est of lerEstados(def.id)) {
        if (!VIVOS.has(est.status)) continue;
        const et = def.etapas[est.etapa]; if (!et) continue;
        if (est.status === 'na fila') { await tentarDisparar(def, est); cache.delete(et.agente); continue; }
        const r = await leia(et.agente);
        if (!r.ok) { if (est.motivo !== r.motivo) { est.motivo = r.motivo; gravarEstado(est); } continue; }
        const e = r.entidades.find(x => x.id === est.entidade || UTIL.slug(x.id, 40) === est.slug);
        if (!e) continue;
        if (est.disparadoEm && e.atualizado && e.atualizado < est.disparadoEm) continue;   // estado velho, de antes do gatilho
        const antes = est.status;
        if (e.status === 'pronta' || e.status === 'ensaiada') { await concluirEtapa(def, est, e.status === 'ensaiada'); continue; }
        if (e.status === 'aguardando pergunta') { est.status = 'parada (pergunta)'; est.motivo = e.pergunta || ''; }
        else if (e.status === 'com erro') { est.status = 'com erro'; est.motivo = e.erro || ''; }
        else if (e.status === 'aguardando aprovação') { est.status = 'proposta no agente'; est.motivo = 'o agente propôs; aprove no painel dele'; }
        else if (e.status === 'com o dono') { est.status = 'com o dono'; est.motivo = ''; }
        else if (e.status === 'em andamento' || e.status === 'nova') { est.status = 'andando'; delete est.motivo; }
        if (est.status !== antes) {
          anota(est, est.status, { agente: et.agente });
          gravarEstado(est);
          if (dep.avisar && (est.status === 'parada (pergunta)' || est.status === 'com erro'))
            dep.avisar(def.nome + ': ' + est.entidade + ' ' + est.status, (agenteInfo(et.agente) || {}).nome + ' na etapa "' + et.nome + '": ' + String(est.motivo || '').slice(0, 200), 'alta').catch(() => {});
        } else if (est.motivo !== undefined && est.motivo !== (e.pergunta || e.erro || est.motivo)) gravarEstado(est);
      }
    }
  } catch (e) { /* a vigília nunca derruba o escritório */ }
  finally { rodandoTick = false; }
}
let timer = null;
function iniciar(ms = INTERVALO_MS) { if (timer) return; timer = setInterval(() => { tick(); }, ms); if (timer.unref) timer.unref(); return timer; }
function parar() { clearInterval(timer); timer = null; }

/* ---------------- para a tela ---------------- */
function estado() {
  const reg = dep.lerRegistro();
  const nomeDe = (id) => (reg[id] && reg[id].nome) || id;
  return {
    esteiras: lerDefs().map(d => ({ ...d, etapas: d.etapas.map(e => ({ ...e, agenteNome: nomeDe(e.agente) })) })),
    entidades: lerDefs().flatMap(d => lerEstados(d.id).map(e => ({ ...e, historico: e.historico.slice(-12) })))
  };
}

module.exports = {
  init(d) { dep = d || {}; return module.exports; },
  listar, obter, validar, salvar, remover, agentesCandidatos,
  lerEstados, estadoDe, entrar, aprovar, devolver, tick, iniciar, parar, estado, colocar, agenteInfo,
  textoGatilho, caminhoPasta, entidadesDoAgente, INTERVALO_MS
};

/* ---------------- linha de comando ---------------- */
if (require.main === module) {
  const ROOT = __dirname;
  const DADOS = process.env.ESCRITORIO_DADOS || path.join(ROOT, 'data');
  const REGISTRO = path.join(DADOS, 'sistemas.json');
  const lerBruto = () => { try { return JSON.parse(fs.readFileSync(REGISTRO, 'utf8')); } catch (e) { return {}; } };
  const lerRegistro = () => { const o = {}; for (const [id, s] of Object.entries(lerBruto())) { if (id.startsWith('_')) continue; if (s && s.pasta && !path.isAbsolute(s.pasta)) s.pasta = path.join(ROOT, s.pasta); o[id] = s; } return o; };
  const PLAT = require('./plataformas').init({ ROOT, DADOS, lerRegistro, lerRegistroBruto: lerBruto, gravarRegistro: (b) => fs.writeFileSync(REGISTRO, JSON.stringify(b, null, 2) + '\n') });
  const MEM = require('./memoria').init({ ROOT, DADOS, lerRegistro, nomeDe: (id) => (lerRegistro()[id] || {}).nome || id });
  module.exports.init({ DADOS, lerRegistro, plataformas: PLAT, mensagens: MEM, avisar: null, ligar: null });
  const ler = (a) => JSON.parse(fs.readFileSync(a, 'utf8'));
  UTIL.rodarCli({
    _ajuda: 'listar                      as esteiras definidas\nagentes                     os agentes de tarefa que podem entrar numa etapa\ncriar <def.json>            cria ou substitui uma esteira ({ nome, entidade, pasta, vigiarPasta, etapas: [{ nome, agente, entrega, aprovacao, aprovador }] })\nremover <id>\nentrar <esteira> <entidade> põe uma entidade na primeira etapa (o escritório precisa estar no ar para o gatilho)\nestado                      esteiras e entidades, como a tela vê',
    listar: () => ({ ok: true, esteiras: listar() }),
    agentes: () => ({ ok: true, agentes: agentesCandidatos() }),
    criar: (arq) => arq ? salvar(ler(arq)) : { ok: false, motivo: 'passe o arquivo da definição' },
    remover: (id) => remover(id),
    entrar: (esteira, entidade) => entrar(esteira, entidade, 'cli'),
    estado: () => ({ ok: true, ...estado() })
  }, process.argv.slice(2));
}
