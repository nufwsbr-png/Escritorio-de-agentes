/* ===========================================================
   estudio.js — o Estúdio: a pessoa escolhe o escritório antes de montar.

   Trilha de passos, um por vez. Cada cartão traz uma prévia DESENHADA pelo
   motor da tela (iso.js e boneco-pixel.js), não uma imagem. A prévia grande
   no topo junta tudo que já foi escolhido.

   É um motor: ESTUDIO.criar({ dados, cfg, exemplo, aoMontar }) monta a
   trilha nos elementos da página (#previa, #titulo, #pergunta, #cartoes,
   #resumo, #voltar, #avancar, #pontos, #contador, #quem).
     dados: { empresa, ramo (o objeto da biblioteca plantas/<ramo>.json),
              setores: [nomes], cor (da marca, ou null) }
     exemplo: true = nada é gravado, Montar fica desligado (/estudio)
     aoMontar(cfg): chamado no "Montar o escritório" da abertura (/abertura)
   As plantas vêm da biblioteca por ramo; os setores da pessoa caem na sala
   cujos papéis batem (a mesma regra de ramos.js). A roupa dos bonecos é um
   passo do Estúdio, sugerida pelo ramo (decisão do dono, 16/10/2026).
   =========================================================== */
const ESTUDIO = (() => {
  /* ---------- as opções de cada passo ---------- */
  const TAMANHOS = {
    enxuto: { nome: 'Enxuto', desc: 'salas baixas, 2 mesas por sala de operação', h: 4, mesas: 2 },
    medio:  { nome: 'Médio',  desc: 'salas de 5 tiles, 4 mesas',                  h: 5, mesas: 4 },
    amplo:  { nome: 'Amplo',  desc: 'salas fundas, 6 mesas e espaço para andar',  h: 6, mesas: 6 }
  };
  const PALETAS = {
    sobria: { nome: 'Sóbria', desc: 'grafite e dourado: escritório tradicional', acc: '#c9a24a',
      escuro: { bg: '#0b0d12', piso: '#1a1d26', piso2: '#20242f', parede: '#2a2f3d', mesa: '#3a3f4d', txt: '#e8ecf7' },
      claro:  { bg: '#ece9e1', piso: '#dcd6c8', piso2: '#e4dfd3', parede: '#b9b2a3', mesa: '#8d8373', txt: '#1b1f2b' } },
    clara:  { nome: 'Clara', desc: 'cinza e azul: limpo e leve', acc: '#2f7bf0',
      escuro: { bg: '#0a0e16', piso: '#1c2230', piso2: '#222a3a', parede: '#2f3a52', mesa: '#3d4a66', txt: '#e8ecf7' },
      claro:  { bg: '#eef1f6', piso: '#dfe4ec', piso2: '#e8ecf3', parede: '#b6c0d1', mesa: '#8392ad', txt: '#1b1f2b' } },
    marca:  { nome: 'Da marca', desc: 'a cor do seu logo como destaque', acc: '#7c6cff',
      escuro: { bg: '#06070b', piso: '#171a2a', piso2: '#1d2133', parede: '#262c44', mesa: '#353c5a', txt: '#e8ecf7' },
      claro:  { bg: '#f1effa', piso: '#e2dff2', piso2: '#eae7f6', parede: '#bcb6dc', mesa: '#8e86bd', txt: '#1b1f2b' } }
  };
  const MOBILIAS = {
    minimalista: { nome: 'Minimalista', desc: 'mesa, cadeira, monitor. Só.', extras: 0 },
    aconchegante: { nome: 'Aconchegante', desc: 'plantas, tapete e abajur', extras: 1 },
    corporativo: { nome: 'Corporativo', desc: 'armários, plantas nos cantos, letreiro', extras: 2 }
  };
  const MOVIMENTOS = {
    parado: { nome: 'Parado', desc: 'ninguém se mexe; a tela não gasta nada', fps: 0 },
    calmo:  { nome: 'Calmo', desc: 'respiração leve, de vez em quando', fps: 12 },
    vivo:   { nome: 'Vivo', desc: 'digitando, balançando', fps: 20 }
  };
  const MOTORES = {
    iso: { nome: 'Isométrico', desc: 'o escritório em perspectiva' },
    '2d': { nome: '2D de cima', desc: 'planta vista de cima, mais simples e mais leve (chega depois; até lá vale a prévia)' }
  };
  const TEMAS = { escuro: { nome: 'Escuro', desc: 'fundo escuro, bom para tela o dia todo' }, claro: { nome: 'Claro', desc: 'fundo claro, bom para projetar e imprimir' } };
  const ROTULOS = { setor: { nome: 'Pelo setor', desc: 'a placa da sala diz os setores que moram nela' }, livre: { nome: 'Nome da sala', desc: 'a placa diz o nome da sala' } };
  const ROUPAS = Object.fromEntries(Object.entries(BONECO_PIXEL.ROUPAS).map(([k, v]) => [k, { nome: v.nome, desc: v.desc }]));
  const CORES_AGENTE = ['#18bfff', '#7c6cff', '#23e08a', '#f472b6', '#f59e0b', '#14b8a6'];
  const CORES_TIPO = { recepcao: 0.06, operacao: 0, reuniao: -0.05, diretoria: 0.1, descanso: 0.03, sala: 0 };
  /* larguras das salas na prévia (tiles), por tipo e tamanho; a prévia é mais apertada que a grade de 48 do planta.js */
  const LARG = { recepcao: { pequena: 5, media: 7, grande: 9 }, operacao: { pequena: 6, media: 9, grande: 13 }, reuniao: { pequena: 6, media: 8, grande: 10 },
                 diretoria: { pequena: 6, media: 8, grande: 11 }, descanso: { pequena: 7, media: 10, grande: 14 }, sala: { pequena: 4, media: 4, grande: 4 } };
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /** os setores da pessoa em cada sala da variação (a mesma regra de ramos.salasPara) */
  function distribuir(variacao, setores) {
    const salas = variacao.salas.map(s => ({ nome: s.nome, tipo: s.tipo, tamanho: s.tamanho, papeis: s.papeis || [], setores: [] }));
    const ops = salas.filter(s => s.tipo === 'operacao');
    const geral = ops.find(s => s.papeis.includes('*')) || ops[0];
    for (const nome of setores || []) {
      const n = norm(nome);
      const alvo = ops.find(s => s.papeis.some(p => p !== '*' && n.includes(norm(p)))) || geral;
      if (alvo && !alvo.setores.includes(nome)) alvo.setores.push(nome);
    }
    return salas;
  }
  /** x, y, w, h das salas na prévia: operação e diretoria em cima, o resto embaixo, como o planta.js */
  function layout(salas, t) {
    const cima = salas.filter(s => s.tipo === 'operacao' || s.tipo === 'diretoria'), baixo = salas.filter(s => !(s.tipo === 'operacao' || s.tipo === 'diretoria'));
    const out = []; let x = 0;
    for (const s of cima) { const w = (LARG[s.tipo] || LARG.sala)[s.tamanho] || 6; out.push({ ...s, x, y: 0, w, h: t.h }); x += w + 1; }
    x = 0;
    for (const s of baixo) { const w = (LARG[s.tipo] || LARG.sala)[s.tamanho] || 6; out.push({ ...s, x, y: t.h + 2, w, h: t.h }); x += w + 1; }
    return out;
  }

  function criar({ dados, cfg: cfgInicial, exemplo, aoMontar }) {
    const D = dados || {};
    const ramo = D.ramo || { id: 'generico', nome: 'Negócio', roupa: 'social', variacoes: {} };
    const setores = Array.isArray(D.setores) && D.setores.length ? D.setores : (ramo.setores || []).map(s => s.nome);
    const PLANTAS = {};
    for (const [id, v] of Object.entries(ramo.variacoes || {})) PLANTAS[id] = { nome: v.nome, desc: v.desc, salas: distribuir(v, setores) };
    if (!Object.keys(PLANTAS).length) PLANTAS.padrao = { nome: 'Padrão', desc: '', salas: distribuir({ salas: [{ nome: 'Recepção', tipo: 'recepcao', tamanho: 'pequena' }, { nome: 'Operação', tipo: 'operacao', tamanho: 'grande', papeis: ['*'] }, { nome: 'Diretoria', tipo: 'diretoria', tamanho: 'pequena' }, { nome: 'Sala de reunião', tipo: 'reuniao', tamanho: 'pequena' }, { nome: 'Sala de descanso', tipo: 'descanso', tamanho: 'pequena' }] }, setores) };
    if (D.cor) PALETAS.marca.acc = D.cor;
    const cfg = Object.assign({ motor: 'iso', planta: PLANTAS.padrao ? 'padrao' : Object.keys(PLANTAS)[0], tamanho: 'medio', paleta: D.cor ? 'marca' : 'sobria', roupa: ramo.roupa || 'social', mobilia: 'minimalista', movimento: 'parado', tema: 'escuro', rotulos: 'setor' }, cfgInicial || {});
    if (!PLANTAS[cfg.planta]) cfg.planta = Object.keys(PLANTAS)[0];
    const PASSOS = [
      { id: 'motor', titulo: 'O estilo', pergunta: 'Como você quer ver o escritório?', opcoes: MOTORES },
      { id: 'planta', titulo: 'A planta pelo seu ramo', pergunta: 'Três plantas montadas para ' + (ramo.nome || 'o seu negócio').toLowerCase() + ', com os seus setores em cada sala. Toda planta tem a sala de descanso, onde ficam os agentes desligados.', opcoes: PLANTAS, foco: null },
      { id: 'tamanho', titulo: 'O tamanho das salas', pergunta: 'Quantas mesas cabem e quanto espaço sobra.', opcoes: TAMANHOS, foco: 'operacao' },
      { id: 'paleta', titulo: 'A paleta', pergunta: 'As cores do chão, das paredes e do destaque.', opcoes: PALETAS },
      { id: 'roupa', titulo: 'A roupa dos agentes', pergunta: 'Os bonecos são em pixel art; o que muda é a roupa. Sugerida pelo seu ramo: ' + (ROUPAS[ramo.roupa] ? ROUPAS[ramo.roupa].nome.toLowerCase() : 'social') + '.', opcoes: ROUPAS, foco: 'bonecos' },
      { id: 'mobilia', titulo: 'A mobília', pergunta: 'Quanta coisa tem em cada sala.', opcoes: MOBILIAS, foco: 'recepcao' },
      { id: 'movimento', titulo: 'O movimento', pergunta: 'Se os bonecos se mexem, e quanto. Parado é o mais leve.', opcoes: MOVIMENTOS, foco: 'operacao' },
      { id: 'tema', titulo: 'Claro ou escuro', pergunta: 'O fundo da cena e dos painéis.', opcoes: TEMAS },
      { id: 'rotulos', titulo: 'As placas das salas', pergunta: 'O que a placa de cada sala mostra.', opcoes: ROTULOS },
      { id: 'resumo', titulo: 'Resumo', pergunta: exemplo ? 'Confira. Este é o exemplo: nada é gravado.' : 'Confira e monte. Tudo pode ser trocado depois em ⚙️ Ajustes › Estúdio.' }
    ];
    let passo = 0;

    /* ---------- a cena: salas com mesas, pelas escolhas ---------- */
    function cena(c) {
      const t = TAMANHOS[c.tamanho];
      const salas = layout(PLANTAS[c.planta].salas, t).map(s => {
        const sala = { ...s, mesas: [], extras: [] };
        const h = s.h;
        const porLinha = Math.max(1, Math.floor((s.w - 1) / 1.6));
        const n = s.tipo === 'operacao' ? Math.min(t.mesas, porLinha * Math.max(1, Math.floor((h - 1) / 2.2))) : s.tipo === 'diretoria' ? 1 : s.tipo === 'recepcao' ? 1 : 0;
        for (let i = 0; i < n; i++) {
          const col = i % porLinha, lin = Math.floor(i / porLinha);
          sala.mesas.push({ x: s.x + 0.6 + col * 1.6, y: s.y + 0.8 + lin * 2.2, seed: s.nome + i, setor: (s.setores && s.setores.length ? s.setores : [s.nome])[i % Math.max(1, (s.setores || []).length || 1)] });
        }
        if (s.tipo === 'reuniao') sala.mesaGrande = { x: s.x + 1, y: s.y + 1.2, w: s.w - 2, d: Math.max(1.2, h - 2.6) };
        if (s.tipo === 'descanso') sala.sofa = { x: s.x + 0.6, y: s.y + h - 1.6, w: s.w - 1.2 };
        const ex = MOBILIAS[c.mobilia].extras;
        if (ex >= 1) sala.extras.push({ t: 'planta', x: s.x + s.w - 0.6, y: s.y + 0.5 });
        if (ex >= 1 && (s.tipo === 'recepcao' || s.tipo === 'descanso')) sala.extras.push({ t: 'tapete', x: s.x + 0.8, y: s.y + 1.2, w: s.w - 1.6, d: h - 2.4 });
        if (ex >= 2) { sala.extras.push({ t: 'armario', x: s.x + 0.2, y: s.y + 0.1, w: 1.2 }); sala.extras.push({ t: 'planta', x: s.x + 0.4, y: s.y + h - 0.5 }); }
        return sala;
      });
      const W = Math.max(...salas.map(s => s.x + s.w)) + 1, H = Math.max(...salas.map(s => s.y + s.h)) + 1;
      return { salas, W, H, corredorY: t.h + 0.5 };
    }
    const base = (c) => PALETAS[c.paleta][c.tema];
    const rotulo = (c, s) => c.rotulos === 'setor' && s.setores && s.setores.length ? s.setores.join(' · ') : s.nome;
    const look = (c, i, seed) => BONECO_PIXEL.makeLook('estudio-' + seed, { roupa: c.roupa, acc: CORES_AGENTE[i % CORES_AGENTE.length] });

    /* ---------- desenho isométrico ---------- */
    function desenharIso(ctx, c, W0, H0, t, foco) {
      const sc = cena(c), b = base(c), acc = PALETAS[c.paleta].acc;
      const salas = foco ? (sc.salas.filter(s => s.tipo === foco).slice(0, 1).length ? sc.salas.filter(s => s.tipo === foco).slice(0, 1) : sc.salas.slice(0, 1)) : sc.salas;
      const x0 = foco ? salas[0].x - 0.5 : -0.5, y0 = foco ? salas[0].y - 0.5 : -0.5;
      const x1 = foco ? salas[0].x + salas[0].w + 0.5 : sc.W, y1 = foco ? salas[0].y + salas[0].h + 0.5 : sc.H;
      const cantos = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => ISO.toScreen(x, y));
      const minX = Math.min(...cantos.map(p => p.x)), maxX = Math.max(...cantos.map(p => p.x));
      const minY = Math.min(...cantos.map(p => p.y)) - 70, maxY = Math.max(...cantos.map(p => p.y)) + 10;
      const k = Math.min(W0 / (maxX - minX), H0 / (maxY - minY)) * 0.96;
      ctx.save();
      ctx.translate(W0 / 2, H0 / 2); ctx.scale(k, k); ctx.translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
      const WALL = 26;
      if (!foco) ISO.plane(ctx, -0.5, sc.corredorY - 0.5, sc.W + 0.5, 1.6, 0, b.piso2, ISO.rgba('#000', 0.15));
      const ordem = [...salas].sort((a, bb) => (a.x + a.y) - (bb.x + bb.y));
      for (const s of ordem) {
        const piso = ISO.shade(b.piso, CORES_TIPO[s.tipo] || 0);
        for (let x = s.x; x < s.x + s.w; x++) for (let y = s.y; y < s.y + s.h; y++) ISO.tile(ctx, x, y, (x + y) % 2 ? piso : ISO.shade(piso, 0.03), null);
        for (const e of s.extras) if (e.t === 'tapete') ISO.plane(ctx, e.x, e.y, e.w, e.d, 1, ISO.rgba(acc, c.tema === 'claro' ? 0.18 : 0.14), null);
        const porta = s.x + Math.floor(s.w / 2);
        ISO.box(ctx, s.x - 0.18, s.y - 0.18, 0.18, s.h + 0.18, WALL, 0, b.parede);
        ISO.box(ctx, s.x, s.y - 0.18, porta - s.x, 0.18, WALL, 0, b.parede);
        ISO.box(ctx, porta + 1, s.y - 0.18, s.x + s.w - porta - 1, 0.18, WALL, 0, b.parede);
        ISO.box(ctx, porta, s.y - 0.18, 1, 0.18, WALL, 0, ISO.shade(acc, -0.3), { top: ISO.rgba(acc, .9) });
        for (const e of s.extras) {
          if (e.t === 'armario') ISO.box(ctx, e.x, e.y, e.w, 0.5, 20, 0, ISO.shade(b.mesa, -0.1));
          if (e.t === 'planta') { ISO.cyl(ctx, e.x, e.y, 0.18, 6, 0, '#6b4a2b'); ISO.cyl(ctx, e.x, e.y, 0.3, 9, 6, '#2f8f4e'); }
        }
        if (s.mesaGrande) { const m = s.mesaGrande; ISO.box(ctx, m.x, m.y, m.w, m.d, 11, 0, b.mesa); for (let i = 0; i < 4; i++) ISO.box(ctx, m.x + 0.3 + i * (m.w / 4), m.y + m.d + 0.2, 0.5, 0.5, 8, 0, ISO.shade(b.mesa, -0.25)); }
        if (s.sofa) { ISO.box(ctx, s.sofa.x, s.sofa.y, s.sofa.w, 0.8, 10, 0, ISO.shade(b.mesa, -0.15)); ISO.box(ctx, s.sofa.x, s.sofa.y, s.sofa.w, 0.25, 16, 0, ISO.shade(b.mesa, -0.3)); }
        const mesas = [...s.mesas].sort((a, bb) => (a.x + a.y) - (bb.x + bb.y));
        mesas.forEach((m, i) => {
          ISO.box(ctx, m.x, m.y, 1.2, 0.7, 10, 0, b.mesa);
          ISO.box(ctx, m.x + 0.35, m.y + 0.08, 0.5, 0.06, 9, 10, '#141722', { top: ISO.rgba(acc, .85) });
          ISO.box(ctx, m.x + 0.35, m.y + 0.95, 0.5, 0.5, 7, 0, ISO.shade(b.mesa, -0.3));
          const p = ISO.toScreen(m.x + 0.6, m.y + 1.15, 0);
          BONECO_PIXEL.draw(ctx, look(c, i, m.seed), p.x, p.y, 0.9, 'sentado');
        });
        ISO.box(ctx, s.x, s.y + s.h, s.w, 0.18, 6, 0, ISO.rgba(b.parede, .9));
        ISO.box(ctx, s.x + s.w, s.y, 0.18, s.h + 0.18, 6, 0, ISO.rgba(b.parede, .9));
        const pc = ISO.toScreen(s.x + s.w / 2, s.y, WALL + 14);
        placa(ctx, rotulo(c, s), pc.x, pc.y, b, acc);
      }
      if (!foco && MOBILIAS[c.mobilia].extras >= 2) { const p = ISO.toScreen(sc.W / 2, sc.corredorY, 2); ctx.save(); ctx.font = '700 22px Barlow, Outfit, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = ISO.rgba(acc, .55); ctx.fillText(String(D.empresa || 'ESCRITÓRIO').toUpperCase(), p.x, p.y); ctx.restore(); }
      ctx.restore();
    }
    function placa(ctx, txt, x, y, b, acc) {
      ctx.save(); ctx.font = '600 11px Barlow Semi Condensed, DM Sans, Segoe UI, sans-serif';
      const w = ctx.measureText(txt).width + 14;
      ctx.fillStyle = ISO.rgba(b.bg, .85); ISO.rrect(ctx, x - w / 2, y - 9, w, 17, 5); ctx.fill();
      ctx.strokeStyle = ISO.rgba(acc, .6); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = b.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y);
      ctx.restore();
    }

    /* ---------- desenho 2D de cima ---------- */
    function desenhar2D(ctx, c, W0, H0, t, foco) {
      const sc = cena(c), b = base(c), acc = PALETAS[c.paleta].acc;
      const salas = foco ? (sc.salas.filter(s => s.tipo === foco).slice(0, 1).length ? sc.salas.filter(s => s.tipo === foco).slice(0, 1) : sc.salas.slice(0, 1)) : sc.salas;
      const x0 = foco ? salas[0].x - 0.4 : -0.4, y0 = foco ? salas[0].y - 1.2 : -1.2;
      const x1 = foco ? salas[0].x + salas[0].w + 0.4 : sc.W, y1 = foco ? salas[0].y + salas[0].h + 0.4 : sc.H;
      const T = Math.min(W0 / (x1 - x0), H0 / (y1 - y0)) * 0.96;
      ctx.save(); ctx.translate(W0 / 2 - (x0 + x1) / 2 * T, H0 / 2 - (y0 + y1) / 2 * T);
      const R = (x, y, w, h, r, fill, stroke) => { ISO.rrect(ctx, x * T, y * T, w * T, h * T, r); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, T * 0.08); ctx.stroke(); } };
      if (!foco) { ctx.fillStyle = b.piso2; for (let x = -1; x < sc.W; x++) ctx.fillRect(x * T, (sc.corredorY - 0.5) * T, T - 1, 1.6 * T); }
      for (const s of salas) {
        const piso = ISO.shade(b.piso, CORES_TIPO[s.tipo] || 0);
        R(s.x, s.y, s.w, s.h, T * 0.25, piso, b.parede);
        ctx.fillStyle = ISO.shade(piso, 0.04); for (let x = s.x; x < s.x + s.w; x++) for (let y = s.y; y < s.y + s.h; y++) if ((x + y) % 2) ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2);
        for (const e of s.extras) {
          if (e.t === 'tapete') R(e.x, e.y, e.w, e.d, T * 0.2, ISO.rgba(acc, .16));
          if (e.t === 'armario') R(e.x, e.y, e.w, 0.5, 3, ISO.shade(b.mesa, -0.1), null);
          if (e.t === 'planta') { ctx.fillStyle = '#2f8f4e'; ctx.beginPath(); ctx.arc(e.x * T, e.y * T, T * 0.3, 0, 7); ctx.fill(); }
        }
        if (s.mesaGrande) { const m = s.mesaGrande; R(m.x, m.y, m.w, m.d, T * 0.5, b.mesa, null); }
        if (s.sofa) R(s.sofa.x, s.sofa.y, s.sofa.w, 0.8, T * 0.3, ISO.shade(b.mesa, -0.2), null);
        s.mesas.forEach((m, i) => {
          R(m.x, m.y, 1.2, 0.7, 4, b.mesa, null);
          R(m.x + 0.35, m.y + 0.08, 0.5, 0.14, 2, acc, null);
          BONECO_PIXEL.draw(ctx, look(c, i, m.seed), (m.x + 0.6) * T, (m.y + 1.9) * T, T * 0.06, 'sentado');
        });
        const txt = rotulo(c, s);
        ctx.save(); ctx.font = '700 ' + Math.min(13, Math.max(8, T * 0.42)) + 'px Barlow, Outfit, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const w = ctx.measureText(txt).width + T * 0.8, ph = Math.min(20, T * 0.6);
        ISO.rrect(ctx, (s.x + s.w / 2) * T - w / 2, (s.y - 0.3) * T - ph, w, ph, 6); ctx.fillStyle = ISO.rgba(b.bg, .9); ctx.fill(); ctx.strokeStyle = ISO.rgba(acc, .6); ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = b.txt; ctx.fillText(txt, (s.x + s.w / 2) * T, (s.y - 0.3) * T - ph / 2); ctx.restore();
      }
      ctx.restore();
    }

    /* três bonecos de perto, para comparar as roupas */
    function desenharBonecos(ctx, c, W0, H0) {
      const b = base(c);
      ctx.fillStyle = b.piso; ctx.fillRect(0, H0 * 0.82, W0, H0 * 0.18);
      const k = (H0 * 0.78) / 40;
      [0, 1, 2].forEach(i => BONECO_PIXEL.draw(ctx, look(c, i, 'perto' + i), W0 * (0.25 + i * 0.25), H0 * 0.84, k, 'pe'));
    }
    function desenhar(canvas, c, t, foco) {
      const ctx = canvas.getContext('2d');
      const W0 = canvas.width, H0 = canvas.height, b = base(c);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = b.bg; ctx.fillRect(0, 0, W0, H0);
      if (foco === 'bonecos') return desenharBonecos(ctx, c, W0, H0);
      if (c.motor === '2d') desenhar2D(ctx, c, W0, H0, t, foco); else desenharIso(ctx, c, W0, H0, t, foco);
    }

    /* ---------- a trilha ---------- */
    const $ = (s) => document.querySelector(s);
    let vivos = [];
    function montar() {
      const p = PASSOS[passo];
      document.documentElement.dataset.tema = cfg.tema;
      if ($('#quem')) $('#quem').textContent = (D.empresa || '') + (exemplo ? ' · exemplo, nada é gravado' : '');
      $('#pontos').innerHTML = PASSOS.map((_, i) => '<i class="' + (i < passo ? 'feito' : i === passo ? 'atual' : '') + '"></i>').join('');
      $('#contador').textContent = 'passo ' + (passo + 1) + ' de ' + PASSOS.length;
      $('#titulo').textContent = p.titulo; $('#pergunta').textContent = p.pergunta;
      $('#voltar').disabled = passo === 0;
      const ultimo = passo === PASSOS.length - 1;
      $('#avancar').textContent = ultimo ? 'Montar o escritório' : 'Avançar ▶';
      $('#avancar').disabled = ultimo && (exemplo || !aoMontar);
      const cart = $('#cartoes'); cart.innerHTML = ''; vivos = [];
      $('#resumo').classList.toggle('hidden', p.id !== 'resumo'); cart.classList.toggle('hidden', p.id === 'resumo');
      if (p.id === 'resumo') resumo();
      else {
        for (const [id, op] of Object.entries(p.opcoes)) {
          const el = document.createElement('button'); el.type = 'button'; el.className = 'cartao' + (cfg[p.id] === id ? ' escolhido' : ''); el.dataset.id = id;
          const extra = p.id === 'planta' ? '<ul class="lista">' + op.salas.map(s => '<li>' + s.nome + (s.setores && s.setores.length ? ' <span class="hint">(' + s.setores.join(', ') + ')</span>' : '') + '</li>').join('') + '</ul>' : '';
          el.innerHTML = '<canvas width="360" height="200"></canvas><div class="nome"><span>' + op.nome + '</span><span class="sel">' + (cfg[p.id] === id ? 'escolhido' : '') + '</span></div><p class="desc">' + (op.desc || '') + '</p>' + extra;
          const alvo = { ...cfg, [p.id]: id };
          const cv = el.querySelector('canvas'); desenhar(cv, alvo, 0, p.foco || null);
          if (MOVIMENTOS[alvo.movimento].fps) vivos.push({ cv, c: alvo, foco: p.foco || null });
          el.onclick = () => { cfg[p.id] = id; montar(); };
          cart.appendChild(el);
        }
      }
      desenhar($('#previa'), cfg, 0, null);
      if (MOVIMENTOS[cfg.movimento].fps) vivos.push({ cv: $('#previa'), c: cfg, foco: null });
      animar();
    }
    let raf = null, ultimo = 0;
    function animar() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (!vivos.length) return;
      const loop = (now) => {
        const fps = Math.max(...vivos.map(v => MOVIMENTOS[v.c.movimento].fps));
        if (now - ultimo >= 1000 / fps) { ultimo = now; for (const v of vivos) desenhar(v.cv, v.c, now / 1000, v.foco); }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; } else animar(); });
    function resumo() {
      const linhas = PASSOS.filter(p => p.id !== 'resumo').map(p => '<tr><td>' + p.titulo + '</td><td>' + (p.opcoes[cfg[p.id]] ? p.opcoes[cfg[p.id]].nome : cfg[p.id]) + '</td></tr>').join('');
      const estilo = { ...cfg, ramo: ramo.id };
      const salas = PLANTAS[cfg.planta].salas;
      $('#resumo').innerHTML = '<div class="caixa"><b>As suas escolhas</b><table>' + linhas + '</table></div>' +
        '<div class="caixa"><b>As salas</b><ul class="lista">' + salas.map(s => '<li>' + s.nome + (s.setores && s.setores.length ? ' <span class="hint">(' + s.setores.join(', ') + ')</span>' : '') + '</li>').join('') + '</ul>' +
        (exemplo ? '<p class="hint" style="margin-top:8px">"Montar" gravaria em <code>data/config.json</code> (chave <code>estilo</code>) e a planta em <code>data/planta.json</code>:</p><pre>' + JSON.stringify(estilo, null, 2) + '</pre><div class="aviso">Este é o exemplo do formato: nada é gravado.</div>' : '<p class="hint" style="margin-top:8px">Ao montar, o escritório grava a planta com estas salas, as conexões que você citou (sem chave) e as suas escolhas; depois mostra a senha do administrador uma única vez.</p>') + '</div>';
    }
    $('#voltar').onclick = () => { if (passo > 0) { passo--; montar(); } };
    $('#avancar').onclick = () => { if (passo < PASSOS.length - 1) { passo++; montar(); } else if (aoMontar && !exemplo) aoMontar({ ...cfg }); };
    document.addEventListener('keydown', (e) => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement && document.activeElement.tagName)) return;
      const p = PASSOS[passo]; if (!p || !p.opcoes) return;
      const ids = Object.keys(p.opcoes), i = ids.indexOf(cfg[p.id]);
      if (e.key === 'ArrowRight') { cfg[p.id] = ids[(i + 1) % ids.length]; montar(); }
      if (e.key === 'ArrowLeft') { cfg[p.id] = ids[(i - 1 + ids.length) % ids.length]; montar(); }
      if (e.key === 'Enter') $('#avancar').click();
    });
    montar();
    return { cfg, PASSOS, desenhar, ir: (n) => { passo = Math.max(0, Math.min(PASSOS.length - 1, n)); montar(); }, salas: () => PLANTAS[cfg.planta].salas };
  }
  return { criar, TAMANHOS, PALETAS, MOBILIAS, MOVIMENTOS, MOTORES, TEMAS, ROTULOS, ROUPAS, distribuir };
})();
