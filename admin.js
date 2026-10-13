/* ===========================================================
   admin.js — a tranca do escritório

   Dois perfis. O CLIENTE opera: liga, desliga, lê log, conversa em modo
   Investigar, roda a reunião. O ADMINISTRADOR constrói: contrata, cadastra
   e demite agente, usa Resolver e Construir, edita memória, aprova
   proposta, roda testador, muda avisos e marca.

   Sem senha definida, tudo fica aberto (é o escritório na sua própria
   máquina) e a tela sugere definir uma. Com senha, as rotas de
   administrador exigem a sessão — a verificação é aqui no servidor, rota a
   rota, não na tela. A senha fica em data/admin.json como hash (scrypt) e a
   sessão dura 7 dias, em data/sessoes.json, para sobreviver a reinício.
   =========================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let ARQ = null, SESSOES = null;
const DURACAO = 7 * 24 * 3600 * 1000;

const lerJson = (a, padrao) => { try { return JSON.parse(fs.readFileSync(a, 'utf8')); } catch (e) { return padrao; } };
const gravarJson = (a, d) => { try { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, JSON.stringify(d, null, 2) + '\n'); } catch (e) {} };

const hash = (senha, sal) => crypto.scryptSync(String(senha), sal, 64).toString('hex');

function temSenha() { const d = lerJson(ARQ, null); return !!(d && d.hash && d.sal); }

function conferir(senha) {
  const d = lerJson(ARQ, null);
  if (!d || !d.hash) return false;
  const h = Buffer.from(hash(senha, d.sal), 'hex'), g = Buffer.from(d.hash, 'hex');
  return h.length === g.length && crypto.timingSafeEqual(h, g);
}

function definirSenha(senha) {
  senha = String(senha || '');
  if (senha.length < 6) return { ok: false, motivo: 'a senha precisa ter pelo menos 6 caracteres' };
  const sal = crypto.randomBytes(16).toString('hex');
  gravarJson(ARQ, { hash: hash(senha, sal), sal, desde: new Date().toISOString() });
  gravarJson(SESSOES, {});           // senha nova derruba as sessões antigas
  return { ok: true };
}

function sessoes() {
  const s = lerJson(SESSOES, {});
  const agora = Date.now();
  let mudou = false;
  for (const [t, v] of Object.entries(s)) if (!v || v.ate < agora) { delete s[t]; mudou = true; }
  if (mudou) gravarJson(SESSOES, s);
  return s;
}

function criarSessao() {
  const s = sessoes();
  const token = crypto.randomBytes(24).toString('hex');
  s[token] = { ate: Date.now() + DURACAO };
  gravarJson(SESSOES, s);
  return token;
}

function encerrar(token) { const s = sessoes(); delete s[token]; gravarJson(SESSOES, s); }

const tokenDe = (req) => {
  const m = /(?:^|;\s*)esc_admin=([a-f0-9]{48})/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
};

/** administrador? sem senha definida, todo mundo é */
function ehAdmin(req) {
  if (!temSenha()) return true;
  const t = tokenDe(req);
  return !!(t && sessoes()[t]);
}

const cookie = (token) => 'esc_admin=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + Math.floor(DURACAO / 1000);
const cookieVazio = () => 'esc_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0';

module.exports = {
  init(ROOT, DADOS) { const d = DADOS || path.join(ROOT, 'data'); ARQ = path.join(d, 'admin.json'); SESSOES = path.join(d, 'sessoes.json'); return module.exports; },
  temSenha, conferir, definirSenha, criarSessao, encerrar, ehAdmin, tokenDe, cookie, cookieVazio,
  estado(req) { return { temSenha: temSenha(), admin: ehAdmin(req) }; }
};
