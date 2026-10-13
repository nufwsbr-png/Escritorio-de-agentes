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

module.exports = { slug, acharClaude, lerEnvArquivo, rodarCli };
