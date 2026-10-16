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
     interpretar(texto)       a abertura na tela (16/10/2026): da descrição livre do
                              negócio tira empresa, o que faz, dono, ramo, setores e
                              conexões; pelo Claude Code sem ferramentas, ou por
                              palavras-chave quando ele não está conectado
     montar(escolhas)         grava tudo de uma vez: config (com ramo e estilo),
                              planta da variação escolhida com os setores por sala,
                              conexões com variáveis vazias, senha gerada (uma vez)
     salvarMarca(arquivo)     logo ou planta mandados pela tela, em data/marca/

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
const { rodarCli, acharClaude, rodarClaudeSemFerramentas, extrairJson } = require('./util');
const RAMOS = require('./ramos');
const PLANTA = require('./planta');

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
    plataformas: dep.plataformas ? dep.plataformas.listar(false).map(p => ({ id: p.id, nome: p.nome, tipo: p.tipo, url: p.url })) : [],
    ramo: cfg.ramo || null, estilo: cfg.estilo || null
  };
}

/* ---------------- a abertura na tela: uma pergunta, interpretada ---------------- */
const TIPOS_CONEXAO = ['api', 'planilha', 'agenda', 'pasta', 'whatsapp', 'email', 'banco', 'navegador', 'link', 'mcp'];
/* palavras que denunciam um sistema na descrição livre → nome e tipo da conexão */
const PISTAS_CONEXAO = [
  ['whatsapp', 'WhatsApp', 'whatsapp'], ['pipedrive', 'Pipedrive', 'api'], ['rd station', 'RD Station', 'api'], ['hubspot', 'HubSpot', 'api'], ['ophir', 'Ophir', 'api'], ['kommo', 'Kommo', 'api'], ['crm', 'CRM', 'api'],
  ['google sheets', 'Planilha Google', 'planilha'], ['planilha', 'Planilha', 'planilha'], ['sheets', 'Planilha Google', 'planilha'],
  ['google agenda', 'Agenda Google', 'agenda'], ['google calendar', 'Agenda Google', 'agenda'], ['agenda', 'Agenda', 'agenda'], ['calendly', 'Calendly', 'link'],
  ['onedrive', 'OneDrive', 'pasta'], ['google drive', 'Google Drive', 'pasta'], ['dropbox', 'Dropbox', 'pasta'], ['drive', 'Drive', 'pasta'], ['pasta', 'Pasta de arquivos', 'pasta'],
  ['gmail', 'E-mail (Gmail)', 'email'], ['outlook', 'E-mail (Outlook)', 'email'], ['e-mail', 'E-mail', 'email'], ['email', 'E-mail', 'email'],
  ['supabase', 'Supabase', 'banco'], ['banco de dados', 'Banco de dados', 'banco'], ['pje', 'PJe', 'navegador'], ['projudi', 'Projudi', 'navegador'], ['site', 'Site', 'link'], ['instagram', 'Instagram', 'link']
];
const PAPEL_INTERPRETAR = 'Você lê a descrição livre que uma pessoa fez do negócio dela para abrir um "escritório de agentes de IA". Extraia SÓ o que ela disse e responda com um único JSON, sem crases nem comentários: ' +
  '{"empresa": nome da empresa como ela escreveu (ou ""), "oQueFaz": uma frase curta do que o negócio faz (até 120 caracteres, ou ""), "dono": nome da pessoa dona (ou ""), "ramo": um id da lista de ramos, o mais próximo, ' +
  '"setores": 4 a 6 setores de trabalho para agentes de IA nesse negócio, como [{"nome","emoji","desc"}], usando os nomes que a pessoa usou quando ela citou setores e completando com os sugeridos do ramo; desc em uma frase curta, ' +
  '"conexoes": só os sistemas que ela CITOU, como [{"nome","tipo"}], tipo um da lista de tipos}. Nunca invente nome de empresa, de dono ou sistema que ela não disse. Português do Brasil.';

const pareceChave = (t) => /(token|chave|senha|api[_ -]?key|secret|password)\s*[:=]\s*\S{8,}/i.test(t) || /(^|\s)(?=[^\s]*[A-Za-z])(?=[^\s]*\d)[A-Za-z0-9_\-]{28,}(\s|$)/.test(t);
const primeiraFrase = (t) => String(t).split(/[.!?\n]/).map(s => s.trim()).find(Boolean) || '';
const maiusc = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

/** o que dá para tirar sem modelo nenhum: ramo por palavras, setores do ramo, conexões por pistas, empresa e dono por padrões */
function porPalavras(texto) {
  const t = String(texto || '');
  const ramo = RAMOS.detectar(t);
  const r = RAMOS.obter(ramo);
  let empresa = '';
  const mEmp = /(?:somos|sou|chamamos?|chama-se|empresa|escrit[óo]rio|cl[íi]nica|loja|ag[êe]ncia|imobili[áa]ria|contabilidade|neg[óo]cio)\s+(?:é |e |a |o |da |do |de |chamad[ao] )?["“]?([A-ZÀ-Ú][^,.;:\n"”()]{1,50})/.exec(t);
  if (mEmp) empresa = mEmp[1].trim();
  else { const mCap = /\b([A-ZÀ-Ú][\wÀ-ú&'-]+(?:\s+(?:de|da|do|e|&)?\s*[A-ZÀ-Ú][\wÀ-ú&'-]+){1,3})/.exec(t); if (mCap) empresa = mCap[1].trim(); }
  empresa = empresa.replace(/\s+(?:em|de|no|na|que|onde|e)\s*$/i, '').slice(0, 60);
  let dono = '';
  const mDono = /(?:don[oa]|propriet[áa]ri[oa]|s[óo]ci[oa]|respons[áa]vel|dirigid[oa] por|comandad[oa] por|meu nome [ée]|eu sou|sou [oa])\s*(?:(?:é|e|:|o|a|pel[oa])\s+)*((?:Dr[a]?\.?\s)?[A-ZÀ-Ú][\wÀ-ú]+(?:\s(?:de|da|do|dos|das)?\s?[A-ZÀ-Ú][\wÀ-ú]+){0,3})/.exec(t);
  if (mDono) dono = mDono[1].trim().replace(/[.,;]+$/, '').slice(0, 60);
  const baixo = t.toLowerCase();
  // uma conexão por tipo (a pista mais específica vem primeiro na lista), menos api, navegador e link, que podem ser vários sistemas
  const conexoes = []; const UMA_POR_TIPO = new Set(['planilha', 'agenda', 'whatsapp', 'email', 'pasta', 'banco']);
  for (const [pista, nome, tipo] of PISTAS_CONEXAO) {
    if (!baixo.includes(pista)) continue;
    if (conexoes.some(c => c.nome === nome)) continue;
    if (UMA_POR_TIPO.has(tipo) && conexoes.some(c => c.tipo === tipo)) continue;
    if (pista === 'crm' && conexoes.some(c => c.tipo === 'api')) continue;   // "Pipedrive CRM" é um sistema só
    conexoes.push({ nome, tipo });
  }
  return { empresa, oQueFaz: maiusc(primeiraFrase(t)).slice(0, 120), dono, ramo, setores: r.setores.map(s => ({ nome: s.nome, emoji: s.emoji, desc: s.desc })), conexoes };
}
/** limpa o que o modelo (ou a tela) devolveu: só campos conhecidos, tamanhos certos, ramo e tipos válidos */
function sanear(e, base) {
  const out = { ...base };
  const s = (v, n) => (typeof v === 'string' && v.trim()) ? v.trim().slice(0, n) : '';
  if (s(e.empresa, 80)) out.empresa = s(e.empresa, 80);
  if (s(e.oQueFaz, 120)) out.oQueFaz = s(e.oQueFaz, 120);
  if (s(e.dono, 60)) out.dono = s(e.dono, 60);
  if (e.ramo && RAMOS.obter(String(e.ramo))) out.ramo = String(e.ramo);
  if (Array.isArray(e.setores)) {
    const lista = e.setores.map(x => typeof x === 'string' ? { nome: x } : x).filter(x => x && s(x.nome, 40)).map(x => ({ nome: s(x.nome, 40), emoji: s(x.emoji, 4) || '🏢', desc: s(x.desc, 200) })).slice(0, 8);
    if (lista.length) out.setores = lista;
  }
  if (Array.isArray(e.conexoes)) {
    const lista = e.conexoes.filter(x => x && s(x.nome, 60)).map(x => ({ nome: s(x.nome, 60), tipo: TIPOS_CONEXAO.includes(String(x.tipo)) ? String(x.tipo) : 'api', url: s(x.url, 300) })).slice(0, 12);
    out.conexoes = lista;
  }
  return out;
}
async function interpretar(texto, opts = {}) {
  const t = String(texto || '').trim();
  if (t.length < 10) return { ok: false, motivo: 'conte um pouco mais: o nome, o que o negócio faz, quem é o dono e os sistemas que vocês usam' };
  if (pareceChave(t)) return { ok: false, motivo: 'isso parece uma chave ou senha. Aqui não entra segredo: a chave você cola depois em 🔌 Conexões, como administrador. Tire-a do texto e mande de novo.' };
  const base = porPalavras(t);
  let origem = 'palavras', aviso = null, entendido = base;
  const semClaude = opts.semClaude || process.env.ESCRITORIO_ABERTURA_SEM_CLAUDE === '1';
  const claude = semClaude ? { conectado: false } : estadoClaude();
  if (claude.conectado) {
    const papel = PAPEL_INTERPRETAR + ' Ramos possíveis (id: nome): ' + RAMOS.lista().map(r => r.id + ': ' + r.nome).join('; ') + '. Tipos de conexão: ' + TIPOS_CONEXAO.join(', ') + '.';
    const r = await rodarClaudeSemFerramentas({ papel, entrada: 'DESCRIÇÃO:\n' + t, cwd: path.join(dep.DADOS, 'abertura'), limiteMs: opts.limiteMs || 120000 });
    const j = r.texto ? extrairJson(r.texto) : null;
    if (j) { entendido = sanear(j, base); origem = 'claude'; }
    else aviso = (r.erro ? 'o Claude Code não respondeu (' + String(r.erro).slice(0, 120) + ')' : 'o Claude Code respondeu fora do formato') + '; entendi por palavras-chave, confira com atenção';
  } else aviso = (semClaude ? 'entendi por palavras-chave' : 'o Claude Code não está conectado nesta máquina; entendi por palavras-chave') + ', confira com atenção';
  return { ok: true, origem, aviso, entendido, roupaSugerida: (RAMOS.obter(entendido.ramo) || RAMOS.obter('generico')).roupa };
}

/* ---------------- a abertura na tela: montar tudo de uma vez ---------------- */
const ESTILO_PADRAO = { motor: 'iso', planta: 'padrao', tamanho: 'medio', paleta: 'marca', roupa: 'social', mobilia: 'minimalista', movimento: 'parado', tema: 'escuro', rotulos: 'setor' };
const ESTILO_OPCOES = { motor: ['iso', '2d'], planta: ['compacta', 'padrao', 'ampla'], tamanho: ['enxuto', 'medio', 'amplo'], paleta: ['sobria', 'clara', 'marca'], roupa: ['executivo', 'social', 'casual', 'jaleco', 'classico', 'elegante'], mobilia: ['minimalista', 'aconchegante', 'corporativo'], movimento: ['parado', 'calmo', 'vivo'], tema: ['escuro', 'claro'], rotulos: ['setor', 'livre'] };
function montar(e) {
  e = e || {};
  const base = sanear(e, { empresa: '', oQueFaz: '', dono: '', ramo: 'generico', setores: [], conexoes: [] });
  if (!base.empresa) return { ok: false, motivos: ['falta o nome da empresa'] };
  const ramoDef = RAMOS.obter(base.ramo) || RAMOS.obter('generico');
  const estilo = { ...ESTILO_PADRAO, roupa: ramoDef.roupa };
  for (const [k, v] of Object.entries(e.estilo && typeof e.estilo === 'object' ? e.estilo : {})) if (ESTILO_OPCOES[k] && ESTILO_OPCOES[k].includes(String(v))) estilo[k] = String(v);
  const setores = base.setores.length ? base.setores : ramoDef.setores.map(s => ({ nome: s.nome, emoji: s.emoji, desc: s.desc }));
  // 1. a planta primeiro: se não couber, nada é gravado
  const sp = RAMOS.salasPara(base.ramo, estilo.planta, setores.map(s => s.nome));
  const g = PLANTA.gerar(sp.salas);
  if (!g.ok) return { ok: false, motivos: ['a planta não coube: ' + g.motivo] };
  // 2. config: empresa, o que faz, dono, setores, marca
  const marca = e.marca && typeof e.marca === 'object' ? {} : undefined;
  if (marca) { if (e.marca.cor) marca.cor = String(e.marca.cor); if (e.marca.logo) marca.logo = String(e.marca.logo); if (e.marca.planta) marca.planta = String(e.marca.planta); }
  const r1 = aplicar({ empresa: base.empresa, oQueFaz: base.oQueFaz, dono: base.dono, setores, marca });
  if (!r1.ok) return r1;
  const gravados = [...r1.gravados];
  const cfg = lerJson(arq('config.json'), {});
  cfg.ramo = base.ramo; cfg.estilo = estilo;
  gravarJson(arq('config.json'), cfg);
  gravarJson(arq('planta.json'), g.planta); gravados.push('planta.json');
  // 3. conexões com variáveis vazias: a chave entra depois em 🔌 Conexões
  let conexoes = { criadas: [], erros: [] };
  if (dep.plataformas && dep.plataformas.criarLista && base.conexoes.length) {
    const jaTem = new Set(dep.plataformas.listar(false).map(p => p.nome.toLowerCase()));
    const novas = base.conexoes.filter(c => !jaTem.has(c.nome.toLowerCase()));
    if (novas.length) { conexoes = dep.plataformas.criarLista(novas); if (conexoes.criadas.length) gravados.push('plataformas.json'); }
  }
  // 4. a senha do administrador: gerada aqui e devolvida UMA vez (só quando ainda não há senha, ou quando a tela pede uma nova)
  let senha = null;
  if (dep.ADMIN && (!dep.ADMIN.temSenha() || e.novaSenha === true)) { senha = gerarSenha(); const s = dep.ADMIN.definirSenha(senha); if (s.ok) gravados.push('admin.json'); else senha = null; }
  registrar('abertura pela tela: ' + gravados.join(', ') + ' (empresa: ' + base.empresa + ', ramo: ' + base.ramo + ', planta: ' + estilo.planta + ')');
  return { ok: true, gravados, senha, ramo: base.ramo, estilo, conexoes,
    planta: { salas: g.planta.salas.map(s => ({ id: s.id, nome: s.nome, tipo: s.tipo, setores: s.setores || [] })), capacidade: g.capacidade, aviso: g.aviso }, atual: atual() };
}

/** logo ou planta mandados pela tela: { tipo: 'logo'|'planta', nome, dados (base64) } → grava em data/marca/ e devolve o nome do arquivo */
function salvarMarca(a) {
  a = a || {};
  const tipo = a.tipo === 'planta' ? 'planta' : 'logo';
  const ext = (String(a.nome || '').match(/\.(png|jpe?g|svg|webp|pdf)$/i) || [])[1];
  if (!ext) return { ok: false, motivo: 'use um arquivo png, jpg, svg, webp ou pdf' };
  let buf; try { buf = Buffer.from(String(a.dados || '').replace(/^data:[^,]*,/, ''), 'base64'); } catch (e) { return { ok: false, motivo: 'arquivo ilegível' }; }
  if (!buf.length) return { ok: false, motivo: 'arquivo vazio' };
  if (buf.length > 4 * 1024 * 1024) return { ok: false, motivo: 'arquivo grande demais (até 4 MB)' };
  const nome = tipo + '-' + Date.now().toString(36) + '.' + ext.toLowerCase();
  fs.mkdirSync(arq('marca'), { recursive: true });
  fs.writeFileSync(path.join(arq('marca'), nome), buf);
  return { ok: true, tipo, arquivo: nome };
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
    if (r.avisos.ntfy) {
      // gerar: true cria um tópico imprevisível (quem adivinha o tópico lê os avisos no ntfy.sh)
      const topico = r.avisos.ntfy.gerar ? gerarTopico() : limpa(r.avisos.ntfy.topico, 64);
      corpo.ntfy = { ativo: r.avisos.ntfy.ativo !== undefined ? !!r.avisos.ntfy.ativo : !!topico, topico: topico || undefined, extras: Array.isArray(r.avisos.ntfy.extras) ? r.avisos.ntfy.extras : undefined };
    }
    if (r.avisos.whatsapp) {
      const fone = limpa(r.avisos.whatsapp.fone, 20);
      corpo.whatsapp = { ativo: r.avisos.whatsapp.ativo !== undefined ? !!r.avisos.whatsapp.ativo : !!fone, fone, extras: Array.isArray(r.avisos.whatsapp.extras) ? r.avisos.whatsapp.extras.map(e => ({ fone: limpa(e.fone || e, 20) })) : undefined };
    }
    if (r.avisos.resumo && typeof r.avisos.resumo === 'object') corpo.resumo = { ativo: r.avisos.resumo.ativo !== undefined ? !!r.avisos.resumo.ativo : undefined, hora: r.avisos.resumo.hora };
    // a chave do CallMeBot é segredo: nunca passa por aqui; cola-se em 🔔 Avisos
    dep.AVISOS.configurar(corpo); gravados.push('avisos.json');
  }
  if (r.senhaAdmin !== undefined && dep.ADMIN) { const s = dep.ADMIN.definirSenha(String(r.senhaAdmin)); if (s.ok) gravados.push('admin.json'); else return { ok: false, motivos: [s.motivo] }; }
  if (r.manterExemplo === false) { exemplo('demitir'); gravados.push('sistemas.json', 'equipe.json'); }
  registrar('abertura aplicada: ' + gravados.join(', ') + (r.empresa ? ' (empresa: ' + limpa(r.empresa, 80) + ')' : ''));
  return { ok: true, gravados, atual: atual() };
}

/** tópico do ntfy imprevisível: slug da empresa + 8 caracteres aleatórios */
function gerarTopico() {
  const cfg = dep.lerConfig() || {};
  const base = String(cfg.empresa || 'escritorio').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'escritorio';
  return base + '-' + crypto.randomBytes(4).toString('hex');
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
  atual, validar, montarConfig, aplicar, gerarSenha, definirSenha, conferirSenha, estadoClaude, exemplo,
  interpretar, porPalavras, montar, salvarMarca, ESTILO_PADRAO, ESTILO_OPCOES
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
    _ajuda: 'atual                     o que está configurado, sem segredos\naplicar <respostas.json>  grava config, setores, marca, avisos (sem chave), reunião, senha, exemplo\nsenha                     gera uma senha forte, grava o hash e imprime UMA vez\nclaude                    o Claude Code está instalado e conectado?\nexemplo manter|demitir    o agente de exemplo fica ou sai\ninterpretar <texto.txt>   a descrição livre do negócio → empresa, dono, ramo, setores, conexões (a abertura na tela usa)\nmontar <escolhas.json>    grava tudo da abertura na tela de uma vez (config com ramo e estilo, planta, conexões, senha)',
    atual: () => ({ ok: true, ...atual() }),
    aplicar: (a) => aplicar(JSON.parse(fs.readFileSync(a, 'utf8'))),
    senha: () => { const s = gerarSenha(); const r = definirSenha(s); return r.ok ? { ok: true, senha: s, aviso: 'guarde agora: ela não aparece de novo; o escritório guarda só o hash em data/admin.json' } : r; },
    claude: () => ({ ok: true, ...estadoClaude() }),
    exemplo: (acao) => exemplo(acao),
    interpretar: (arqTexto) => interpretar(fs.readFileSync(arqTexto, 'utf8')),
    montar: (a) => montar(JSON.parse(fs.readFileSync(a, 'utf8')))
  }).then(c => process.exit(c));
}
