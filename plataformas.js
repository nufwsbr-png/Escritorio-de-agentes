/* ===========================================================
   plataformas.js — o cadastro único das plataformas do negócio

   Um CRM, uma planilha, uma agenda, uma pasta, um WhatsApp, um e-mail: cada
   plataforma é cadastrada UMA vez aqui (data/plataformas.json, fora do git),
   com endereço e variáveis de conexão. Cada agente só recebe as que foram
   marcadas para ele: o escritório grava no .env do agente um bloco
   delimitado só com essas variáveis. Sem credencial, não há acesso.

   Regras (ver docs/superpowers/specs/2026-10-13-plataformas-design.md):
   - só sistemas que o escritório criou (têm trilha) recebem o bloco;
   - o bloco fica no começo do .env, após o cabeçalho; o resto é preservado;
   - cada variável entra prefixada (OPHIR_TOKEN) e com o nome canônico do
     tipo (SISTEMA_API_TOKEN), só para a primeira plataforma de cada tipo;
   - PASTAS_AUTORIZADAS soma as pastas das plataformas com as manuais.
   Também é linha de comando: node plataformas.js listar | criar <lista.json> | sincronizar
   =========================================================== */
const fs = require('fs');
const path = require('path');
const { slug, lerEnvArquivo, rodarCli } = require('./util');

let dep = null;   // { ROOT, DADOS, lerRegistro, lerRegistroBruto, gravarRegistro }
const ARQ = () => path.join(dep.DADOS || path.join(dep.ROOT, 'data'), 'plataformas.json');

const INICIO = '# >>> plataformas do escritório (gerado; edite no escritório, não aqui) >>>';
const FIM = '# <<< plataformas do escritório <<<';

/* sufixos sugeridos ao cadastrar (prefixo <ID>_) e os nomes canônicos do tipo,
   na mesma ordem. Sufixo que já é um nome canônico global (GOOGLE_CREDENCIAIS_JSON)
   entra sem prefixo. */
const TIPOS = {
  api:       { nome: 'Sistema com API (CRM, ERP…)', emoji: '🔗', sufixos: ['URL', 'TOKEN'],                 canonicos: ['SISTEMA_API_URL', 'SISTEMA_API_TOKEN'] },
  planilha:  { nome: 'Planilha (Google Sheets)',    emoji: '📊', sufixos: ['SHEETS_ID', 'GOOGLE_CREDENCIAIS_JSON'], canonicos: ['GOOGLE_SHEETS_ID', 'GOOGLE_CREDENCIAIS_JSON'] },
  agenda:    { nome: 'Agenda (Google Calendar)',    emoji: '📅', sufixos: ['CALENDAR_ID', 'GOOGLE_CREDENCIAIS_JSON'], canonicos: ['GOOGLE_CALENDAR_ID', 'GOOGLE_CREDENCIAIS_JSON'] },
  pasta:     { nome: 'Pasta (OneDrive, Drive, rede)', emoji: '📁', sufixos: ['PASTA'],                     canonicos: ['PASTA_ENTRADA'] },
  whatsapp:  { nome: 'WhatsApp (API)',              emoji: '💬', sufixos: ['API_URL', 'API_CHAVE', 'SESSAO'], canonicos: ['WHATSAPP_API_URL', 'WHATSAPP_API_CHAVE', 'WHATSAPP_SESSAO'] },
  email:     { nome: 'E-mail',                      emoji: '✉️', sufixos: ['USUARIO', 'SENHA_APP', 'PASTA'], canonicos: ['EMAIL_USUARIO', 'EMAIL_SENHA_APP', 'EMAIL_PASTA'] },
  banco:     { nome: 'Banco de dados',              emoji: '🗄️', sufixos: ['URL', 'CHAVE'],                 canonicos: ['BANCO_URL', 'BANCO_CHAVE'] },
  navegador: { nome: 'Sistema pelo navegador',      emoji: '🌐', sufixos: ['URL', 'PERFIL'],                canonicos: ['SISTEMA_URL', 'NAVEGADOR_PERFIL'] },
  link:      { nome: 'Site ou link',                emoji: '🔖', sufixos: ['URL'],                          canonicos: [] }
};
const SEM_PREFIXO = new Set(['GOOGLE_CREDENCIAIS_JSON']);
const NOME_VAR = /^[A-Z][A-Z0-9_]*$/;
const prefixoDe = (id) => String(id).toUpperCase().replace(/-/g, '_') + '_';

/* ---------------- arquivo ---------------- */
function lerTodas() {
  try { const j = JSON.parse(fs.readFileSync(ARQ(), 'utf8')); return Array.isArray(j) ? j : []; } catch (e) { return []; }
}
function gravarTodas(lista) {
  fs.mkdirSync(path.dirname(ARQ()), { recursive: true });
  fs.writeFileSync(ARQ(), JSON.stringify(lista, null, 2) + '\n');
}
const semValores = (p) => ({ ...p, variaveis: Object.keys(p.variaveis || {}), usadaPor: usadaPor(p.id) });

/** variáveis sugeridas para um tipo, já com o prefixo do id e valores vazios */
function variaveisSugeridas(id, tipo) {
  const t = TIPOS[tipo]; if (!t) return {};
  const out = {};
  for (const s of t.sufixos) out[SEM_PREFIXO.has(s) ? s : prefixoDe(id) + s] = '';
  return out;
}

/* ---------------- cadastro ---------------- */
function listar(comValores = false) {
  const todas = lerTodas();
  return comValores ? todas.map(p => ({ ...p, usadaPor: usadaPor(p.id) })) : todas.map(semValores);
}
function obter(id, comValores = false) {
  const p = lerTodas().find(x => x.id === id);
  if (!p) return null;
  return comValores ? { ...p, usadaPor: usadaPor(id) } : semValores(p);
}

function salvar(dados) {
  const d = dados || {};
  const nome = String(d.nome || '').trim().slice(0, 60);
  if (!nome) return { ok: false, motivo: 'dê um nome à plataforma' };
  const tipo = String(d.tipo || '').trim();
  if (!TIPOS[tipo]) return { ok: false, motivo: 'tipo desconhecido: ' + tipo + ' (use ' + Object.keys(TIPOS).join(', ') + ')' };
  const todas = lerTodas();
  let id = d.id ? String(d.id) : '';
  const existente = id ? todas.find(p => p.id === id) : null;
  if (id && !existente && !/^[a-z0-9][a-z0-9-]*$/.test(id)) return { ok: false, motivo: 'id inválido: ' + id };
  if (!id) { id = slug(nome) || 'plataforma'; let n = 2; const base = id; while (todas.some(p => p.id === id)) id = base + '-' + n++; }
  const variaveis = {};
  const entrada = d.variaveis && typeof d.variaveis === 'object' ? d.variaveis : (existente ? existente.variaveis : variaveisSugeridas(id, tipo));
  for (const [k, v] of Object.entries(entrada)) {
    const nomeVar = String(k).trim();
    if (!NOME_VAR.test(nomeVar)) return { ok: false, motivo: 'nome de variável inválido: ' + nomeVar + ' (só MAIÚSCULAS, números e _)' };
    variaveis[nomeVar] = v == null ? '' : String(v);
  }
  const agora = new Date().toISOString();
  const plataforma = {
    id, nome, tipo, url: String(d.url || '').trim().slice(0, 300), variaveis,
    notas: String(d.notas || '').trim().slice(0, 500),
    criadaEm: existente ? existente.criadaEm : agora, atualizadaEm: agora
  };
  if (existente) todas[todas.indexOf(existente)] = plataforma; else todas.push(plataforma);
  gravarTodas(todas);
  const sinc = existente ? sincronizarQuemTem(id) : [];
  return { ok: true, plataforma: semValores(plataforma), sincronizados: sinc };
}

function remover(id) {
  const todas = lerTodas();
  const p = todas.find(x => x.id === id);
  if (!p) return { ok: false, motivo: 'plataforma não encontrada: ' + id };
  const quem = usadaPor(id);
  gravarTodas(todas.filter(x => x.id !== id));
  const bruto = dep.lerRegistroBruto();
  for (const sid of quem) {
    if (bruto[sid]) bruto[sid].plataformas = (bruto[sid].plataformas || []).filter(x => x !== id);
  }
  dep.gravarRegistro(bruto);
  for (const sid of quem) sincronizarAgente(sid);
  return { ok: true, usadaPor: quem };
}

/** cria várias de uma vez com as variáveis sugeridas vazias (a skill /criar-escritorio usa) */
function criarLista(lista) {
  if (!Array.isArray(lista)) return { ok: false, motivo: 'esperava uma lista [{ nome, tipo, url }]' };
  const criadas = [], erros = [];
  for (const item of lista) {
    const r = salvar({ nome: item.nome, tipo: item.tipo, url: item.url, notas: item.notas });
    if (r.ok) criadas.push(r.plataforma.id); else erros.push((item.nome || '?') + ': ' + r.motivo);
  }
  return { ok: erros.length === 0, criadas, erros };
}

function usadaPor(idPlataforma) {
  const reg = dep.lerRegistro();
  return Object.entries(reg).filter(([, s]) => Array.isArray(s.plataformas) && s.plataformas.includes(idPlataforma)).map(([id]) => id);
}

/* ---------------- o bloco do .env ---------------- */
const aspas = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '\\"') + '"';

/**
 * blocoEnvPara(['drive','ophir'], ['C:\\manual']) → texto do bloco (LF).
 * A primeira plataforma de cada tipo recebe também os nomes canônicos.
 */
function blocoEnvPara(ids, manuaisPastas = []) {
  const todas = lerTodas();
  const permitidas = (ids || []).map(id => todas.find(p => p.id === id)).filter(Boolean);
  const linhas = [INICIO];
  const tiposVistos = new Set();
  const pastas = [];
  for (const p of permitidas) {
    const t = TIPOS[p.tipo] || { sufixos: [], canonicos: [] };
    const primeiraDoTipo = !tiposVistos.has(p.tipo);
    tiposVistos.add(p.tipo);
    linhas.push('# ' + p.nome + (p.url ? ' — ' + p.url : '') + ' (' + p.tipo + (primeiraDoTipo ? '' : '; segunda do tipo: só os nomes prefixados') + ')');
    const pref = prefixoDe(p.id);
    for (const [k, v] of Object.entries(p.variaveis || {})) {
      linhas.push(k + '=' + aspas(v));
      if (primeiraDoTipo) {
        const idx = t.sufixos.findIndex(s => k === (SEM_PREFIXO.has(s) ? s : pref + s));
        const canonico = idx >= 0 ? t.canonicos[idx] : null;
        if (canonico && canonico !== k) linhas.push(canonico + '=' + aspas(v));
      }
      if (p.tipo === 'pasta' && k === pref + 'PASTA' && v) pastas.push(String(v));
    }
  }
  if (pastas.length) {
    const todasPastas = [...new Set([...pastas, ...manuaisPastas.map(String).filter(Boolean)])];
    linhas.push('PASTAS_AUTORIZADAS=' + aspas(todasPastas.join(';')));
  }
  linhas.push('PLATAFORMAS_PERMITIDAS=' + aspas(permitidas.map(p => p.id).join(';')));
  linhas.push(FIM);
  return linhas.join('\n') + '\n';
}

/** devolve [textoSemBloco, blocoAntigo|null] */
function separarBloco(texto) {
  const i = texto.indexOf(INICIO);
  if (i < 0) return [texto, null];
  const j = texto.indexOf(FIM, i);
  if (j < 0) return [texto, null];
  let fim = j + FIM.length;
  if (texto[fim] === '\r') fim++;
  if (texto[fim] === '\n') fim++;
  return [texto.slice(0, i) + texto.slice(fim), texto.slice(i, fim)];
}

/** insere/substitui o bloco após o cabeçalho de comentários, respeitando o fim de linha do arquivo */
function aplicarBloco(textoEnv, bloco) {
  const crlf = /\r\n/.test(textoEnv) || (!textoEnv.includes('\n') && process.platform === 'win32');
  const nl = crlf ? '\r\n' : '\n';
  const [sem] = separarBloco(textoEnv || '');
  const linhas = sem.split(/\r?\n/);
  let i = 0;
  while (i < linhas.length && (linhas[i].trim() === '' || linhas[i].trim().startsWith('#'))) i++;
  // volta para não engolir uma linha vazia que separa o cabeçalho do resto
  const cabeca = linhas.slice(0, i), resto = linhas.slice(i);
  while (cabeca.length && cabeca[cabeca.length - 1].trim() === '') cabeca.pop();
  const blocoLinhas = bloco.replace(/\r?\n$/, '').split('\n');
  const saida = [...cabeca, ...(cabeca.length ? [''] : []), ...blocoLinhas, '', ...resto];
  let txt = saida.join(nl);
  if (!txt.endsWith(nl)) txt += nl;
  return txt.replace(new RegExp('(' + nl + '){3,}', 'g'), nl + nl);
}

/** pastas digitadas à mão em PASTAS_AUTORIZADAS fora do bloco */
function manuaisDe(textoEnv) {
  const [sem] = separarBloco(textoEnv || '');
  const m = /^\s*PASTAS_AUTORIZADAS\s*=\s*(.*)$/m.exec(sem);
  if (!m) return [];
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v.split(';').map(s => s.trim()).filter(Boolean);
}

/* ---------------- sincronização ---------------- */
function sincronizarAgente(idSistema) {
  const s = dep.lerRegistro()[idSistema];
  if (!s) return { ok: false, motivo: 'sistema não encontrado: ' + idSistema };
  if (!s.trilha) return { ok: false, motivo: 'não é um agente do escritório (sem trilha): o .env dele não é tocado', pulado: true };
  if (!s.pasta || !fs.existsSync(s.pasta)) return { ok: false, motivo: 'a pasta do agente não existe: ' + (s.pasta || '?'), pulado: true };
  const arq = path.join(s.pasta, '.env');
  let atual = '';
  try { atual = fs.readFileSync(arq, 'utf8'); } catch (e) { atual = ''; }
  const bloco = blocoEnvPara(s.plataformas || [], manuaisDe(atual));
  const novo = aplicarBloco(atual, bloco);
  if (novo !== atual) fs.writeFileSync(arq, novo);
  const nomes = bloco.split('\n').map(l => /^([A-Z][A-Z0-9_]*)=/.exec(l)).filter(Boolean).map(m => m[1]);
  return { ok: true, variaveis: nomes, mudou: novo !== atual };
}
function sincronizarQuemTem(idPlataforma) {
  return usadaPor(idPlataforma).filter(sid => sincronizarAgente(sid).ok);
}
function sincronizarTodos() {
  const sincronizados = [], pulados = [];
  for (const id of Object.keys(dep.lerRegistro())) {
    const r = sincronizarAgente(id);
    (r.ok ? sincronizados : pulados).push(id);
  }
  return { sincronizados, pulados };
}
function definirDoAgente(idSistema, ids) {
  const bruto = dep.lerRegistroBruto();
  if (!bruto[idSistema]) return { ok: false, motivo: 'sistema não encontrado: ' + idSistema };
  const validos = new Set(lerTodas().map(p => p.id));
  const lista = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(id => validos.has(id)))];
  bruto[idSistema].plataformas = lista;
  dep.gravarRegistro(bruto);
  const r = sincronizarAgente(idSistema);
  return { ok: true, plataformas: lista, sincronizado: r.ok, motivo: r.ok ? undefined : r.motivo, variaveis: r.variaveis || [] };
}

module.exports = {
  init(d) { dep = d; return module.exports; },
  TIPOS, INICIO, FIM, prefixoDe, variaveisSugeridas,
  listar, obter, salvar, remover, criarLista, usadaPor,
  blocoEnvPara, aplicarBloco, separarBloco, manuaisDe,
  sincronizarAgente, sincronizarTodos, definirDoAgente
};

/* ---------------- linha de comando (a skill /criar-escritorio usa) ---------------- */
if (require.main === module) {
  const ROOT = __dirname;
  const DADOS = process.env.ESCRITORIO_DADOS || path.join(ROOT, 'data');
  const REGISTRO = path.join(DADOS, 'sistemas.json');
  const lerBruto = () => { try { return JSON.parse(fs.readFileSync(REGISTRO, 'utf8')); } catch (e) { return {}; } };
  module.exports.init({
    ROOT, DADOS,
    lerRegistroBruto: lerBruto,
    lerRegistro: () => { const o = {}; for (const [id, s] of Object.entries(lerBruto())) { if (id.startsWith('_')) continue; if (s && s.pasta && !path.isAbsolute(s.pasta)) s.pasta = path.join(ROOT, s.pasta); o[id] = s; } return o; },
    gravarRegistro: (b) => { fs.mkdirSync(DADOS, { recursive: true }); fs.writeFileSync(REGISTRO, JSON.stringify(b, null, 2) + '\n'); }
  });
  rodarCli({
    _ajuda: 'listar                 as plataformas, sem valores\ncriar <lista.json>     [{ nome, tipo, url }] com variáveis sugeridas vazias\nsincronizar            regrava o bloco no .env de todos os agentes do escritório\ntipos                  os tipos aceitos',
    listar: () => ({ ok: true, plataformas: listar() }),
    criar: (arq) => criarLista(JSON.parse(fs.readFileSync(arq, 'utf8'))),
    sincronizar: () => ({ ok: true, ...sincronizarTodos() }),
    tipos: () => ({ ok: true, tipos: Object.fromEntries(Object.entries(TIPOS).map(([k, v]) => [k, v.nome])) })
  }).then(c => process.exit(c));
}
