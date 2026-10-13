/* ===========================================================
   tools/base.js — as cercas prontas para toda ferramenta

   Toda ferramenta em tools/ usa isto. O modo da rodada e a entidade vêm do
   ambiente, postos pelo lançador (rodar.js), nunca pelo agente:
     MODO_RODADA = ensaio | proposta | real
     ENTIDADE    = a entidade da rodada
   O escopo vem do .env (PASTAS_AUTORIZADAS, separadas por ;).
   As plataformas que o agente pode usar vêm de PLATAFORMAS_PERMITIDAS, posta
   no .env pelo escritório (bloco gerenciado). Toda ferramenta que fala com
   uma plataforma chama exigePlataforma(id) antes: sem permissão, recusa.
   =========================================================== */
const fs = require('fs');
const path = require('path');
const base = require('../agente-base');

const PASTA = base.PASTA;
const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'entidade';

const modo = () => ['ensaio', 'proposta', 'real'].includes(process.env.MODO_RODADA) ? process.env.MODO_RODADA : 'ensaio';
const entidade = () => process.env.ENTIDADE || 'sem-entidade';

/* ---------------- escopo ---------------- */
const escopo = () => String(process.env.PASTAS_AUTORIZADAS || '').split(';').map(s => s.trim()).filter(Boolean).map(p => path.resolve(PASTA, p));
/** dentro de uma pasta autorizada do .env, ou dentro de amostras/ e saidas/ desta pasta */
function dentroDoEscopo(caminho) {
  const c = path.resolve(PASTA, String(caminho));
  const internas = [path.join(PASTA, 'amostras'), path.join(PASTA, 'saidas'), path.join(PASTA, 'entrada-lida')];
  return [...escopo(), ...internas].some(p => c === p || c.startsWith(p + path.sep));
}

/* ---------------- plataformas permitidas (vêm do escritório) ---------------- */
const plataformasPermitidas = () => String(process.env.PLATAFORMAS_PERMITIDAS || '').split(';').map(s => s.trim()).filter(Boolean);
const exigePlataforma = (id) => plataformasPermitidas().includes(String(id));
const recusaSemPlataforma = (id) => resultado('recusado', 'plataforma não permitida para este agente: ' + id + ' (o administrador marca no escritório, em 🔌 Plataformas)');

/* ---------------- nunca apaga, nunca sobrescreve ---------------- */
function semSobrescrever(destino) {
  if (!fs.existsSync(destino)) return destino;
  const ext = path.extname(destino), semExt = destino.slice(0, destino.length - ext.length);
  let n = 2; while (fs.existsSync(semExt + '-' + n + ext)) n++;
  return semExt + '-' + n + ext;
}
function quarentena(caminho) {
  const origem = path.resolve(PASTA, caminho);
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const destino = semSobrescrever(path.join(PASTA, 'quarentena', carimbo + '-' + path.basename(origem)));
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.renameSync(origem, destino);
  fs.writeFileSync(destino + '.origem.txt', 'veio de: ' + origem + '\nquando: ' + new Date().toISOString() + '\nentidade: ' + entidade() + '\n');
  base.log('quarentena: ' + origem + ' -> ' + destino);
  return destino;
}

/* ---------------- onde escrever conforme o modo ---------------- */
const pastaProposta = () => path.join(PASTA, 'saidas', slug(entidade()), 'proposta');
/** em real, o alvo; em proposta, a cópia em saidas/<entidade>/proposta/; em ensaio, nada (null) */
function destinoNoModo(caminhoReal) {
  const m = modo();
  if (m === 'ensaio') return null;
  if (m === 'real') return semSobrescrever(path.resolve(PASTA, caminhoReal));
  const d = path.join(pastaProposta(), path.basename(caminhoReal));
  fs.mkdirSync(pastaProposta(), { recursive: true });
  return semSobrescrever(d);
}

/* ---------------- resultado e registro ---------------- */
const resultado = (estado, detalhe, extra = {}) => ({ estado, detalhe: String(detalhe || ''), modo: modo(), entidade: entidade(), ...extra });
const registrar = (ferramenta, r) => base.log('tools/' + ferramenta + ' [' + r.modo + ', ' + r.entidade + '] ' + r.estado + ': ' + r.detalhe);
/** imprime o resultado em uma linha de JSON e encerra: é o que o agente lê */
function responder(ferramenta, r) { registrar(ferramenta, r); process.stdout.write(JSON.stringify(r) + '\n'); process.exit(r.estado === 'erro' ? 1 : 0); }

module.exports = { PASTA, slug, modo, entidade, escopo, dentroDoEscopo, plataformasPermitidas, exigePlataforma, recusaSemPlataforma, semSobrescrever, quarentena, pastaProposta, destinoNoModo, resultado, registrar, responder, log: base.log };
