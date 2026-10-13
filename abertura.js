/* ===========================================================
   abertura.js — a abertura do escritório, por trás da skill /criar-escritorio

   A skill faz as dez perguntas no chat do Claude Code e grava tudo por aqui,
   nunca escrevendo JSON à mão. Também serve os ⚙️ Ajustes da tela.

     atual()                  o que já está configurado, SEM segredos
     validar(r)               erros em português, ou []
     montarConfig(r, cfg)     o config.json novo a partir das respostas + o atual
     aplicar(r)               grava config.json, avisos.json (sem chave), senha,
                              exemplo; devolve o que gravou
     gerarSenha()             senha forte para o administrador
     definirSenha(s)          grava o hash em admin.json (ADMIN)
     estadoClaude()           instalado? conectado? (claude auth status)
     exemplo('manter'|'demitir')

   Linha de comando: node abertura.js atual | aplicar <respostas.json> | senha | claude | exemplo manter|demitir
   Respostas: { empresa, oQueFaz, dono, setores:[{nome,emoji?,desc?}],
                marca:{ cor?, logo?, planta? } (nomes de arquivos já em data/marca/),
                avisos:{ ntfy:{topico, extras?}, whatsapp:{fone, extras?} },
                reuniao:{ automatica, dias, hora, minuto, foco, meta:{descricao, alvo, unidade, ate} },
                senhaAdmin?, manterExemplo?: boolean }
   =========================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { rodarCli, acharClaude } = require('./util');

let dep = null;   // { ROOT, DADOS, ADMIN, AVISOS, lerConfig, lerRegistroBruto, gravarRegistro, plataformas }
const arq = (n) => path.join(dep.DADOS, n);
const lerJson = (p, padrao) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return padrao; } };
const gravarJson = (p, d) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n'); };
const limpa = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const ARQ_MARCA = /^[a-z0-9._-]+\.(png|jpg|jpeg|svg|webp|pdf)$/i;

/* ---------------- o que está configurado (sem segredos) ---------------- */
function atual() {
  const cfg = dep.lerConfig() || {};
  const aberto = fs.existsSync(arq('config.json'));
  const av = dep.AVISOS ? dep.AVISOS.publico() : null;
  const reg = dep.lerRegistroBruto ? dep.lerRegistroBruto() : {};
  const marca = cfg.marca || {};
  let planta = null;
  try { planta = JSON.parse(fs.readFileSync(arq('planta.json'), 'utf8')); } catch (e) {}
  return {
    aberto, aberturaEm: cfg.aberturaEm || null,
    empresa: cfg.empresa || '', oQueFaz: cfg.subtitulo || '', dono: cfg.dono || '', nome: cfg.nome || '', porta: cfg.porta || 4321,
    setores: Array.isArray(cfg.setores) ? cfg.setores : [],
    marca: { logo: marca.logo || '', planta: marca.planta || '', cor: (marca.cores || {})['acc-1'] || '' },
    plantaSalas: planta && Array.isArray(planta.salas) ? planta.salas.map(s => ({ id: s.id, nome: s.nome, tipo: s.tipo })) : null,
    avisos: av ? { ntfy: { ativo: av.ntfy.ativo, topico: av.ntfy.topico, extras: av.ntfy.extras || [] },
                   whatsapp: { ativo: av.whatsapp.ativo, fone: av.whatsapp.fone, temChave: av.whatsapp.temChave, extras: av.whatsapp.extras || [] } } : null,
    reuniao: cfg.reuniao || {},
    temSenhaAdmin: dep.ADMIN ? dep.ADMIN.temSenha() : false,
    exemplo: reg.exemplo ? 'presente' : 'ausente',
    agentes: Object.keys(reg).filter(k => !k.startsWith('_')),
    plataformas: dep.plataformas ? dep.plataformas.listar(false).map(p => ({ id: p.id, nome: p.nome, tipo: p.tipo, url: p.url })) : []
  };
}

/* ---------------- validação ---------------- */
function validar(r) {
  const erros = [];
  const cfg = dep.lerConfig() || {};
  if (!limpa(r.empresa, 80) && !cfg.empresa) erros.push('diga o nome da empresa');
  if (r.senhaAdmin !== undefined && String(r.senhaAdmin).length < 6) erros.push('a senha do administrador precisa ter pelo menos 6 caracteres');
  if (r.marca) {
    for (const k of ['logo', 'planta']) {
      if (r.marca[k] && !ARQ_MARCA.test(String(r.marca[k]))) erros.push(k + ': use um arquivo png, jpg, svg, webp ou pdf, sem espaços, em data/marca/');
      else if (r.marca[k] && !fs.existsSync(path.join(dep.DADOS, 'marca', String(r.marca[k])))) erros.push(k + ': o arquivo ' + r.marca[k] + ' ainda não está em data/marca/');
    }
    if (r.marca.cor && !/^#[0-9a-f]{3,8}$/i.test(String(r.marca.cor))) erros.push('cor: use o formato #RRGGBB');
  }
  if (r.setores !== undefined && !Array.isArray(r.setores)) erros.push('setores: esperava uma lista [{ nome, emoji, desc }]');
  if (r.reuniao && r.reuniao.dias !== undefined && !(Array.isArray(r.reuniao.dias) && r.reuniao.dias.every(d => Number.isInteger(d) && d >= 0 && d <= 6))) erros.push('reuniao.dias: números de 0 (domingo) a 6 (sábado)');
  return erros;
}

/* ---------------- config.json a partir das respostas ---------------- */
function montarConfig(r, cfgAtual) {
  const cfg = JSON.parse(JSON.stringify(cfgAtual || dep.lerConfig() || {}));
  const empresa = limpa(r.empresa, 80) || cfg.empresa || '';
  if (empresa) {
    cfg.empresa = empresa;
    if (limpa(r.empresa, 80) || !cfg.nome) cfg.nome = 'Escritório da ' + empresa;
  }
  if (r.oQueFaz !== undefined) cfg.subtitulo = limpa(r.oQueFaz, 120) || cfg.subtitulo;
  if (r.dono !== undefined) cfg.dono = limpa(r.dono, 60) || cfg.dono;
  if (r.porta !== undefined && Number.isInteger(Number(r.porta)) && Number(r.porta) >= 1024) cfg.porta = Number(r.porta);
  if (Array.isArray(r.setores)) {
    const setores = r.setores.map(s => s && typeof s === 'object' ? { nome: limpa(s.nome, 40), emoji: limpa(s.emoji, 4) || undefined, desc: limpa(s.desc, 200) || undefined } : { nome: limpa(s, 40) })
      .filter(s => s.nome).map(s => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)));
    if (setores.length) cfg.setores = setores; else delete cfg.setores;
  }
  if (r.marca && typeof r.marca === 'object') {
    cfg.marca = cfg.marca || {};
    if (r.marca.logo !== undefined) cfg.marca.logo = limpa(r.marca.logo, 80);
    if (r.marca.planta !== undefined) cfg.marca.planta = limpa(r.marca.planta, 80);
    if (r.marca.cor) { cfg.marca.cores = cfg.marca.cores || {}; cfg.marca.cores['acc-1'] = String(r.marca.cor).toLowerCase(); }
  }
  if (r.reuniao && typeof r.reuniao === 'object') {
    const re = cfg.reuniao || {};
    for (const k of ['automatica']) if (r.reuniao[k] !== undefined) re[k] = !!r.reuniao[k];
    for (const k of ['hora', 'minuto', 'duracaoMin']) if (r.reuniao[k] !== undefined) re[k] = Number(r.reuniao[k]);
    if (Array.isArray(r.reuniao.dias)) re.dias = r.reuniao.dias.map(Number);
    if (r.reuniao.foco !== undefined) re.foco = limpa(r.reuniao.foco, 200);
    if (r.reuniao.meta && typeof r.reuniao.meta === 'object') {
      re.meta = { ...(re.meta || {}) };
      for (const k of ['descricao', 'unidade', 'ate']) if (r.reuniao.meta[k] !== undefined) re.meta[k] = limpa(r.reuniao.meta[k], 80);
      for (const k of ['alvo', 'feito']) if (r.reuniao.meta[k] !== undefined) re.meta[k] = Number(r.reuniao.meta[k]) || 0;
    }
    cfg.reuniao = re;
  }
  cfg.aberturaEm = new Date().toISOString();
  return cfg;
}

/* ---------------- gravar tudo ---------------- */
function aplicar(r) {
  r = r || {};
  const erros = validar(r);
  if (erros.length) return { ok: false, motivos: erros };
  const gravados = [];
  gravarJson(arq('config.json'), montarConfig(r)); gravados.push('config.json');
  if (r.avisos && dep.AVISOS) {
    const corpo = {};
    if (r.avisos.ntfy) corpo.ntfy = { ativo: !!limpa(r.avisos.ntfy.topico, 64), topico: limpa(r.avisos.ntfy.topico, 64) || undefined, extras: Array.isArray(r.avisos.ntfy.extras) ? r.avisos.ntfy.extras : undefined };
    if (r.avisos.whatsapp) corpo.whatsapp = { ativo: !!limpa(r.avisos.whatsapp.fone, 20), fone: limpa(r.avisos.whatsapp.fone, 20), extras: Array.isArray(r.avisos.whatsapp.extras) ? r.avisos.whatsapp.extras.map(e => ({ fone: limpa(e.fone || e, 20) })) : undefined };
    // a chave do CallMeBot é segredo: nunca passa por aqui; cola-se em 🔔 Avisos
    dep.AVISOS.configurar(corpo); gravados.push('avisos.json');
  }
  if (r.senhaAdmin !== undefined && dep.ADMIN) { const s = dep.ADMIN.definirSenha(String(r.senhaAdmin)); if (s.ok) gravados.push('admin.json'); else return { ok: false, motivos: [s.motivo] }; }
  if (r.manterExemplo === false) { exemplo('demitir'); gravados.push('sistemas.json', 'equipe.json'); }
  registrar('abertura aplicada: ' + gravados.join(', ') + (r.empresa ? ' (empresa: ' + limpa(r.empresa, 80) + ')' : ''));
  return { ok: true, gravados, atual: atual() };
}

/* ---------------- senha, Claude, exemplo ---------------- */
function gerarSenha() {
  const grupos = ['abcdefghjkmnpqrstuvwxyz', 'ABCDEFGHJKMNPQRSTUVWXYZ', '23456789', '-_.'];
  const tudo = grupos.join('');
  const sorteia = (s) => s[crypto.randomInt(s.length)];
  let out = grupos.map(sorteia).join('');
  while (out.length < 18) out += sorteia(tudo);
  return out.split('').sort(() => crypto.randomInt(3) - 1).join('');
}
function definirSenha(senha) {
  if (!dep.ADMIN) return { ok: false, motivo: 'sem módulo de administrador' };
  const r = dep.ADMIN.definirSenha(senha);
  if (r.ok) registrar('senha de administrador definida');
  return r;
}
const conferirSenha = (senha) => !!(dep.ADMIN && dep.ADMIN.conferir(senha));

function estadoClaude() {
  const bin = acharClaude();
  try {
    const r = spawnSync(bin, ['auth', 'status'], { encoding: 'utf8', timeout: 8000 });
    let j = null; try { j = JSON.parse(r.stdout || ''); } catch (e) {}
    if (!j) return { instalado: !(r.error), conectado: false, detalhe: (r.stderr || r.stdout || '').trim().slice(0, 200) || (r.error ? r.error.message : 'resposta inesperada') };
    return { instalado: true, conectado: !!j.loggedIn, metodo: j.authMethod || null, conta: j.email || j.account || null };
  } catch (e) { return { instalado: false, conectado: false, detalhe: e.message }; }
}

function exemplo(acao) {
  const bruto = dep.lerRegistroBruto();
  if (acao === 'manter') return { ok: true, exemplo: bruto.exemplo ? 'presente' : 'ausente' };
  if (acao !== 'demitir') return { ok: false, motivo: 'use manter ou demitir' };
  if (bruto.exemplo) { if (dep.desligar) { try { dep.desligar('exemplo'); } catch (e) {} } delete bruto.exemplo; dep.gravarRegistro(bruto); }
  const eq = lerJson(arq('equipe.json'), null);
  if (eq && Array.isArray(eq.team)) { eq.team = eq.team.filter(a => a.sistema !== 'exemplo' && a.key !== 'exemplo'); gravarJson(arq('equipe.json'), eq); }
  registrar('agente de exemplo demitido');
  return { ok: true, exemplo: 'ausente', aviso: dep.desligar ? undefined : 'se o exemplo estiver ligado, desligue-o pelo escritório' };
}

function registrar(texto) {
  try { fs.mkdirSync(dep.DADOS, { recursive: true }); fs.appendFileSync(arq('abertura.log'), '[' + new Date().toLocaleString('pt-BR') + '] ' + texto + '\n'); } catch (e) {}
}

module.exports = {
  init(d) { dep = d; return module.exports; },
  atual, validar, montarConfig, aplicar, gerarSenha, definirSenha, conferirSenha, estadoClaude, exemplo
};

/* ---------------- linha de comando (a skill /criar-escritorio usa) ---------------- */
if (require.main === module) {
  const ROOT = __dirname;
  const DADOS = process.env.ESCRITORIO_DADOS || path.join(ROOT, 'data');
  const REGISTRO = path.join(DADOS, 'sistemas.json');
  const ADMIN = require('./admin').init(ROOT, DADOS);
  const AVISOS = require('./avisos').init(DADOS, {});
  const lerBruto = () => lerJson(REGISTRO, {});
  const PLAT = require('./plataformas').init({ ROOT, DADOS, lerRegistroBruto: lerBruto, gravarRegistro: (b) => gravarJson(REGISTRO, b),
    lerRegistro: () => { const o = {}; for (const [id, s] of Object.entries(lerBruto())) { if (id.startsWith('_')) continue; if (s && s.pasta && !path.isAbsolute(s.pasta)) s.pasta = path.join(ROOT, s.pasta); o[id] = s; } return o; } });
  module.exports.init({ ROOT, DADOS, ADMIN, AVISOS, plataformas: PLAT, lerConfig: () => lerJson(path.join(DADOS, 'config.json'), {}), lerRegistroBruto: lerBruto, gravarRegistro: (b) => gravarJson(REGISTRO, b) });
  rodarCli({
    _ajuda: 'atual                     o que está configurado, sem segredos\naplicar <respostas.json>  grava config, setores, marca, avisos (sem chave), reunião, senha, exemplo\nsenha                     gera uma senha forte, grava o hash e imprime UMA vez\nclaude                    o Claude Code está instalado e conectado?\nexemplo manter|demitir    o agente de exemplo fica ou sai',
    atual: () => ({ ok: true, ...atual() }),
    aplicar: (a) => aplicar(JSON.parse(fs.readFileSync(a, 'utf8'))),
    senha: () => { const s = gerarSenha(); const r = definirSenha(s); return r.ok ? { ok: true, senha: s, aviso: 'guarde agora: ela não aparece de novo; o escritório guarda só o hash em data/admin.json' } : r; },
    claude: () => ({ ok: true, ...estadoClaude() }),
    exemplo: (acao) => exemplo(acao)
  }).then(c => process.exit(c));
}
