/* ===========================================================
   util.js — funções que o escritório usa em mais de um módulo

   slug          nome em minúsculas sem acento, para ids e pastas
   acharClaude   o executável do Claude Code nesta máquina
   lerEnvArquivo lê um .env como Map, sem tocar em process.env
   rodarCli      transforma { acao: fn } numa linha de comando com --ajuda
                 e saída em JSON (usado por plataformas.js, abertura.js, planta.js)

   O molde do agente (modelos/agente/comum/agente-base.js) tem cópia própria
   de acharClaude, porque a pasta do agente não pode depender do escritório.
   =========================================================== */
const fs = require('fs');
const path = require('path');

function slug(texto, max = 30) {
  return String(texto == null ? '' : texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '');
}

function acharClaude() {
  const casa = process.env.USERPROFILE || process.env.HOME || '';
  const tentativas = [
    path.join(casa, '.local', 'bin', 'claude.exe'),
    path.join(casa, '.local', 'bin', 'claude')
  ];
  for (const t of tentativas) { if (casa && fs.existsSync(t)) return t; }
  return process.platform === 'win32' ? 'claude.exe' : 'claude';   // deixa o PATH resolver
}

/** lê um .env e devolve Map nome -> valor (aspas externas removidas) */
function lerEnvArquivo(caminho) {
  const m = new Map();
  let txt = '';
  try { txt = fs.readFileSync(caminho, 'utf8'); } catch (e) { return m; }
  for (const linha of txt.split(/\r?\n/)) {
    if (linha.trim().startsWith('#')) continue;
    const r = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!r) continue;
    let v = r[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    m.set(r[1], v);
  }
  return m;
}

/**
 * rodarCli({ listar: fn, criar: fn }, process.argv.slice(2))
 * Chama a ação com os argumentos restantes; imprime o retorno (objeto vira JSON
 * em uma linha). Devolve o código de saída. `--ajuda` lista as ações.
 */
async function rodarCli(acoes, argv = process.argv.slice(2), imprime = s => console.log(s)) {
  const [acao, ...resto] = argv;
  const nomes = Object.keys(acoes);
  if (!acao || acao === '--ajuda' || acao === '-h' || acao === '--help') {
    imprime('ações: ' + nomes.join(' | ') + (acoes._ajuda ? '\n' + acoes._ajuda : ''));
    return acao ? 0 : 1;
  }
  if (!nomes.includes(acao) || acao.startsWith('_')) {
    imprime(JSON.stringify({ ok: false, motivo: 'ação desconhecida: ' + acao + ' (use --ajuda)' }));
    return 1;
  }
  try {
    const r = await acoes[acao](...resto);
    if (r !== undefined) imprime(typeof r === 'string' ? r : JSON.stringify(r));
    return r && typeof r === 'object' && r.ok === false ? 1 : 0;
  } catch (e) {
    imprime(JSON.stringify({ ok: false, motivo: e.message }));
    return 1;
  }
}

/** troca ${NOME} por env.NOME em qualquer string dentro do objeto; devolve também as variáveis que faltaram (vazias ou ausentes) */
function expandirVars(obj, env) {
  const faltam = new Set();
  const pega = (k) => { const v = env instanceof Map ? env.get(k) : env[k]; if (v === undefined || v === '') { faltam.add(k); return ''; } return String(v); };
  const anda = (x) => Array.isArray(x) ? x.map(anda)
    : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, anda(v)]))
    : typeof x === 'string' ? x.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, k) => pega(k)) : x;
  return { valor: anda(obj), faltam: [...faltam] };
}

/** divide uma linha de comando em partes, respeitando aspas duplas: `npx -y "C:/pasta com espaço"` */
function partirComando(linha) {
  const partes = []; const re = /"([^"]*)"|(\S+)/g; let m;
  while ((m = re.exec(String(linha || '')))) partes.push(m[1] !== undefined ? m[1] : m[2]);
  return partes;
}

/** roda o Claude Code SEM ferramentas, só texto (o jeito do Cuki BOT): devolve { texto, custo, sessionId } ou { erro }.
    Sem ferramenta não há o que permitir; o modo "plan" não serve (escreve um arquivo de plano em vez do texto). */
function rodarClaudeSemFerramentas({ papel, entrada, cwd, modelo, limiteMs, bin, resume }) {
  const { spawn } = require('child_process');
  return new Promise(resolve => {
    const exe = bin || acharClaude();
    try { fs.mkdirSync(cwd, { recursive: true }); } catch (e) {}
    const args = ['-p', '--output-format', 'json', '--permission-mode', 'dontAsk', '--tools', '', '--model', modelo || 'sonnet',
      '--append-system-prompt', papel + ' Responda só com o texto final pedido: sem preâmbulo, sem plano, sem arquivo, sem explicar o que fez.'];
    if (resume) args.push('--resume', resume);
    let saida = '', erro = '', p;
    try { p = spawn(exe, args, { cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { return resolve({ erro: e.message }); }
    const prazo = setTimeout(() => { try { p.kill(); } catch (e) {} }, limiteMs || 4 * 60 * 1000);
    p.stdin.on('error', () => {}); p.stdin.end(entrada, 'utf8');
    p.stdout.on('data', d => saida += d); p.stderr.on('data', d => erro += d);
    p.on('error', e => { clearTimeout(prazo); resolve({ erro: e.message }); });
    p.on('exit', () => { clearTimeout(prazo); let j = null; try { j = JSON.parse(saida); } catch (e) {} if (!j || j.is_error) return resolve({ erro: (j && j.result) || erro.slice(0, 300) || 'sem resposta' }); resolve({ texto: String(j.result || ''), custo: j.total_cost_usd || 0, sessionId: j.session_id || null }); });
  });
}
/** o primeiro objeto JSON dentro de um texto (o modelo às vezes cerca com crases) */
function extrairJson(texto) {
  const t = String(texto || '');
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; }
}

module.exports = { slug, acharClaude, lerEnvArquivo, rodarCli, expandirVars, partirComando, rodarClaudeSemFerramentas, extrairJson };
