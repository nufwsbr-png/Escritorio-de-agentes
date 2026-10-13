/* ===========================================================
   planta.js — as salas da planta do cliente encaixadas na grade do escritório

   A skill /criar-escritorio lê a planta (imagem ou PDF) e propõe uma lista de
   salas; a pessoa confirma; este script encaixa as salas na grade de 48 x 34
   e grava data/planta.json. A tela (js/world.js, js/furniture.js) desenha a
   partir desse arquivo; sem ele, desenha o escritório padrão.

   Entrada (salas.json):
     [{ id?, nome, tipo, tamanho: 'pequena'|'media'|'grande', vizinhos?: [ids] }]
     tipos: diretoria | operacao | reuniao | recepcao | descanso | sala
   Saída (planta.json):
     { versao: 1, grade: { w: 48, h: 34 }, corredor: { x1, y1, x2, y2 },
       salas: [{ id, nome, tipo, tamanho, bx, by, bw, bh, x1, y1, x2, y2, porta: { x, y }, estacoes: [{ x, y }] }] }

   O corredor é a faixa horizontal do meio (y 19..21), como no escritório
   padrão: as salas ficam acima (altura 19) e abaixo (altura 12), da esquerda
   para a direita. Cada sala tem uma porta de dois tiles para o corredor.
   Código para o garantido: sem sobreposição, toda sala alcançável, limites.

   Linha de comando: node planta.js gerar <salas.json> | validar | capacidade | remover
   =========================================================== */
const fs = require('fs');
const path = require('path');
const { slug, rodarCli } = require('./util');

const W = 48, H = 34;
const BANDAS = [
  { nome: 'cima', by: 0, bh: 19 },     // interior y 1..17; porta na parede y=18
  { nome: 'baixo', by: 22, bh: 12 }    // interior y 23..32; porta na parede y=22
];
const CORREDOR = { x1: 1, y1: 19, x2: 46, y2: 21 };
const TIPOS = ['diretoria', 'operacao', 'reuniao', 'recepcao', 'descanso', 'sala'];
const TAMANHOS = ['pequena', 'media', 'grande'];
/* largura em tiles por tipo e tamanho; `sala` é sempre 7 */
const LARGURA = {
  diretoria: { pequena: 10, media: 14, grande: 20 },
  operacao:  { pequena: 10, media: 14, grande: 22 },
  reuniao:   { pequena: 10, media: 14, grande: 18 },
  recepcao:  { pequena: 8,  media: 12, grande: 16 },
  descanso:  { pequena: 12, media: 18, grande: 26 },
  sala:      { pequena: 7,  media: 7,  grande: 7 }
};
/* estações de trabalho (mesas para agentes) por tipo e tamanho */
const ESTACOES = {
  operacao: { pequena: 6, media: 12, grande: 18 },
  diretoria: { pequena: 2, media: 2, grande: 2 },
  sala: { pequena: 1, media: 1, grande: 1 }
};
const PREFERE_CIMA = { operacao: 0, diretoria: 1, sala: 2, reuniao: 3, recepcao: 4, descanso: 5 };

function normalizar(salas) {
  if (!Array.isArray(salas) || !salas.length) return { erro: 'esperava uma lista de salas' };
  const out = [];
  const ids = new Set();
  for (const s of salas) {
    if (!s || !s.nome) return { erro: 'sala sem nome' };
    const tipo = String(s.tipo || 'sala').toLowerCase();
    if (!TIPOS.includes(tipo)) return { erro: 'tipo desconhecido em "' + s.nome + '": ' + tipo + ' (use ' + TIPOS.join(', ') + ')' };
    const tamanho = TAMANHOS.includes(String(s.tamanho)) ? String(s.tamanho) : (tipo === 'sala' ? 'pequena' : 'media');
    let id = slug(s.id || s.nome) || 'sala'; let n = 2; const base = id;
    while (ids.has(id)) id = base + '-' + n++;
    ids.add(id);
    out.push({ id, nome: String(s.nome).trim().slice(0, 40), tipo, tamanho, vizinhos: Array.isArray(s.vizinhos) ? s.vizinhos.map(v => slug(v)) : [] });
  }
  if (out.length < 2) return { erro: 'são precisas pelo menos 2 salas (uma de operação e uma de reunião, por exemplo)' };
  if (out.length > 12) return { erro: 'no máximo 12 salas cabem na grade; junte as menores (ex.: consultórios iguais viram uma sala de operação)' };
  return { salas: out };
}

/** mesas numa grade dentro do interior da sala: mesa de 3 x 1.3, cadeira 2 tiles abaixo; passo 4 */
function estacoesDe(sala, quantas) {
  const out = [];
  if (!quantas) return out;
  const largura = sala.tipo === 'diretoria' ? 4.2 : 3;
  const passoX = sala.tipo === 'diretoria' ? 5.4 : 4, passoY = sala.tipo === 'diretoria' ? 7 : 4;
  for (let y = sala.y1 + 1; y + 3 <= sala.y2 && out.length < quantas; y += passoY)
    for (let x = sala.x1; x + largura <= sala.x2 + 1 && out.length < quantas; x += passoX)
      out.push({ x, y });
  return out;
}

function gerar(entrada) {
  const n = normalizar(entrada);
  if (n.erro) return { ok: false, motivo: n.erro };
  // ordem: preferência de banda, depois a ordem da lista; vizinhos declarados puxados para perto
  const salas = [...n.salas].sort((a, b) => PREFERE_CIMA[a.tipo] - PREFERE_CIMA[b.tipo]);
  for (let i = 0; i < salas.length; i++) {
    for (const v of salas[i].vizinhos) {
      const j = salas.findIndex(s => s.id === v);
      if (j > i + 1) salas.splice(i + 1, 0, salas.splice(j, 1)[0]);
    }
  }
  const bandas = BANDAS.map(b => ({ ...b, x: 0, salas: [] }));
  const semLugar = [];
  for (const s of salas) {
    const bw = LARGURA[s.tipo][s.tamanho];
    const pref = s.tipo === 'operacao' || s.tipo === 'diretoria' ? [0, 1] : [1, 0];
    const banda = pref.map(i => bandas[i]).find(b => b.x + bw <= W);
    if (!banda) { semLugar.push(s.nome + ' (' + s.tamanho + ', ' + bw + ' tiles)'); continue; }
    const sala = { ...s, bx: banda.x, by: banda.by, bw, bh: banda.bh };
    sala.x1 = sala.bx + 1; sala.y1 = sala.by + 1; sala.x2 = sala.bx + sala.bw - 2; sala.y2 = sala.by + sala.bh - 2;
    const px = sala.bx + Math.floor(sala.bw / 2) - 1;
    sala.porta = { x: px, y: banda.nome === 'cima' ? sala.by + sala.bh - 1 : sala.by };
    sala.estacoes = estacoesDe(sala, (ESTACOES[s.tipo] || {})[s.tamanho] || 0);
    delete sala.vizinhos;
    banda.salas.push(sala); banda.x += bw;
  }
  if (semLugar.length) {
    const livre = bandas.map(b => (W - b.x)).join(' e ');
    return { ok: false, motivo: 'não coube na grade: ' + semLugar.join('; '), sugestao: 'sobram ' + livre + ' tiles nas duas faixas. Reduza o tamanho dessas salas, ou junte salas iguais numa só (ex.: 4 consultórios viram uma "operação" média).' };
  }
  const planta = { versao: 1, grade: { w: W, h: H }, corredor: { ...CORREDOR }, salas: [...bandas[0].salas, ...bandas[1].salas] };
  const v = validar(planta);
  if (!v.ok) return { ok: false, motivo: 'a planta gerada não passou na validação: ' + v.problemas.join('; ') };
  const embaixo = planta.salas.filter(s => s.by !== 0 && (s.tipo === 'operacao' || s.tipo === 'diretoria')).map(s => s.nome);
  return { ok: true, planta, capacidade: capacidade(planta), aviso: embaixo.length ? 'na faixa de baixo cabe metade das mesas: ' + embaixo.join(', ') + '. Para mais mesas, reduza as salas de cima.' : undefined };
}

/* ---------------- validação: código para o garantido ---------------- */
function grade(planta) {
  // 0 vazio/parede, 1 chão
  const g = new Uint8Array(W * H);
  const c = planta.corredor;
  for (let y = c.y1; y <= c.y2; y++) for (let x = c.x1; x <= c.x2; x++) g[y * W + x] = 1;
  for (const s of planta.salas) {
    for (let y = s.y1; y <= s.y2; y++) for (let x = s.x1; x <= s.x2; x++) if (x >= 0 && y >= 0 && x < W && y < H) g[y * W + x] = 1;
    if (s.porta) { g[s.porta.y * W + s.porta.x] = 1; g[s.porta.y * W + s.porta.x + 1] = 1; }
  }
  return g;
}
function validar(planta) {
  const p = [];
  if (!planta || !Array.isArray(planta.salas)) return { ok: false, problemas: ['planta sem lista de salas'] };
  const S = planta.salas;
  if (S.length < 2 || S.length > 12) p.push('de 2 a 12 salas; tem ' + S.length);
  const ids = new Set();
  for (const s of S) {
    if (ids.has(s.id)) p.push('id repetido: ' + s.id); ids.add(s.id);
    if (!TIPOS.includes(s.tipo)) p.push(s.id + ': tipo inválido');
    if (s.bx < 0 || s.by < 0 || s.bx + s.bw > W || s.by + s.bh > H) p.push(s.id + ': fora da grade');
    if (!s.porta || s.porta.x < s.bx || s.porta.x + 1 > s.bx + s.bw - 1 || (s.porta.y !== s.by && s.porta.y !== s.by + s.bh - 1)) p.push(s.id + ': porta fora da parede do corredor');
    for (const e of (s.estacoes || [])) if (e.x < s.x1 || e.y < s.y1 || e.x > s.x2 || e.y > s.y2) p.push(s.id + ': estação fora da sala');
  }
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], b = S[j];
    if (a.bx < b.bx + b.bw && b.bx < a.bx + a.bw && a.by < b.by + b.bh && b.by < a.by + a.bh) p.push('sobreposição: ' + a.id + ' e ' + b.id);
  }
  // alcance: busca em largura a partir do corredor
  if (!p.length) {
    const g = grade(planta);
    const visto = new Uint8Array(W * H);
    const fila = [[planta.corredor.x2 - 1, planta.corredor.y1 + 1]];
    visto[fila[0][1] * W + fila[0][0]] = 1;
    while (fila.length) {
      const [x, y] = fila.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const i = ny * W + nx;
        if (g[i] && !visto[i]) { visto[i] = 1; fila.push([nx, ny]); }
      }
    }
    for (const s of S) if (!visto[s.y1 * W + s.x1]) p.push(s.id + ': sala sem caminho até o corredor');
  }
  return { ok: p.length === 0, problemas: p };
}
const capacidade = (planta) => (planta && planta.salas ? planta.salas : []).reduce((n, s) => n + (s.estacoes || []).length, 0);

module.exports = { W, H, TIPOS, TAMANHOS, LARGURA, ESTACOES, CORREDOR, normalizar, gerar, validar, capacidade };

/* ---------------- linha de comando ---------------- */
if (require.main === module) {
  const DADOS = process.env.ESCRITORIO_DADOS || path.join(__dirname, 'data');
  const ARQ = path.join(DADOS, 'planta.json');
  const lerPlanta = () => { try { return JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) { return null; } };
  rodarCli({
    _ajuda: 'gerar <salas.json>   encaixa as salas na grade e grava data/planta.json\nvalidar              confere data/planta.json\ncapacidade           quantas mesas de agente a planta tem\nremover              apaga data/planta.json (volta ao escritório padrão)\ntipos                tipos e tamanhos aceitos',
    gerar: (arq) => {
      if (!arq) return { ok: false, motivo: 'passe o arquivo salas.json' };
      const r = gerar(JSON.parse(fs.readFileSync(arq, 'utf8')));
      if (!r.ok) return r;
      fs.mkdirSync(DADOS, { recursive: true }); fs.writeFileSync(ARQ, JSON.stringify(r.planta, null, 2) + '\n');
      return { ok: true, arquivo: ARQ, salas: r.planta.salas.map(s => s.id + ' (' + s.tipo + ', ' + s.estacoes.length + ' mesas)'), capacidade: r.capacidade, aviso: 'religue o escritório (ou recarregue a tela) para ver as salas novas' };
    },
    validar: () => { const p = lerPlanta(); return p ? { ...validar(p), capacidade: capacidade(p) } : { ok: false, motivo: 'não existe data/planta.json: o escritório usa as salas padrão' }; },
    capacidade: () => { const p = lerPlanta(); return { ok: true, capacidade: p ? capacidade(p) : 20, padrao: !p }; },
    remover: () => { try { fs.unlinkSync(ARQ); } catch (e) {} return { ok: true, aviso: 'escritório padrão de volta; recarregue a tela' }; },
    tipos: () => ({ ok: true, tipos: TIPOS, tamanhos: TAMANHOS, largura: LARGURA, estacoes: ESTACOES })
  }).then(c => process.exit(c));
}
