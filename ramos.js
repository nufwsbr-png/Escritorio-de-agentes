/* ===========================================================
   ramos.js — a biblioteca de plantas por ramo (plantas/<ramo>.json)

   Cada ramo (advocacia, clínica, loja, agência, imobiliária, contabilidade,
   genérico) traz: as palavras que o reconhecem numa descrição livre, os
   setores sugeridos (nome, emoji, descrição e os "papéis", palavras que
   ligam um setor a uma sala), a roupa sugerida dos bonecos e três
   variações de salas (compacta, padrão, ampla) no formato que o planta.js
   recebe. Toda variação tem uma sala de descanso: é onde ficam os agentes
   desligados (decisão do dono, 15/10/2026).

     lista()                         os ramos, o genérico por último
     obter(id)                       um ramo, ou null
     detectar(texto)                 o id do ramo pela descrição (genérico se nada bate)
     salasPara(ramo, variacao, setores)  as salas da variação com os setores
                                     da pessoa distribuídos (cada setor cai na
                                     sala cujos papéis batem; senão, na geral)
   =========================================================== */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'plantas');
let cache = null;

const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function lista() {
  if (cache) return cache;
  const ramos = [];
  for (const f of fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort()) {
    try { const { _leia, ...r } = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); if (r && r.id) ramos.push(r); } catch (e) { /* arquivo quebrado não derruba o resto */ }
  }
  ramos.sort((a, b) => (a.id === 'generico') - (b.id === 'generico'));
  cache = ramos;
  return cache;
}
const obter = (id) => lista().find(r => r.id === id) || null;

/** o ramo que mais palavras tem na descrição; empate vai para o primeiro da lista; nada bate → genérico */
function detectar(texto) {
  const t = norm(texto);
  let melhor = null, pontos = 0;
  for (const r of lista()) {
    const n = (r.palavras || []).filter(p => t.includes(norm(p))).length;
    if (n > pontos) { pontos = n; melhor = r.id; }
  }
  return melhor || 'generico';
}

/** as salas da variação, com os setores da pessoa em cada uma; devolve também onde cada setor caiu e a roupa sugerida */
function salasPara(ramoId, variacaoId, setores) {
  const r = obter(ramoId) || obter('generico');
  if (!r) return { ok: false, motivo: 'biblioteca de plantas vazia' };
  const v = r.variacoes[variacaoId] || r.variacoes.padrao;
  if (!v) return { ok: false, motivo: 'variação desconhecida: ' + variacaoId };
  const salas = v.salas.map(s => ({ nome: s.nome, tipo: s.tipo, tamanho: s.tamanho, setores: [] }));
  const ops = v.salas.map((s, i) => ({ s, i })).filter(x => x.s.tipo === 'operacao');
  const geral = ops.find(x => (x.s.papeis || []).includes('*')) || ops[0];
  const atribuicao = {};
  for (const item of setores || []) {
    const nome = String(item && item.nome !== undefined ? item.nome : item).trim();
    if (!nome) continue;
    const n = norm(nome);
    const alvo = ops.find(x => (x.s.papeis || []).some(p => p !== '*' && n.includes(norm(p)))) || geral;
    if (!alvo) continue;
    if (!salas[alvo.i].setores.includes(nome)) salas[alvo.i].setores.push(nome);
    atribuicao[nome] = salas[alvo.i].nome;
  }
  return { ok: true, salas, atribuicao, roupa: r.roupa, variacao: variacaoId in r.variacoes ? variacaoId : 'padrao' };
}

module.exports = { lista, obter, detectar, salasPara, norm, _limparCache: () => { cache = null; } };
