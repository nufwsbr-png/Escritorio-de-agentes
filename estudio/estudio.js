/* ===========================================================
   estudio.js — o Estúdio: a pessoa escolhe o escritório antes de montar.

   Trilha de passos, um por vez. Cada cartão traz uma prévia DESENHADA pelo
   motor da tela (iso.js e avatar.js), não uma imagem. A prévia grande no
   topo junta tudo que já foi escolhido. Este é o EXEMPLO para o dono
   aprovar o formato: os dados são fictícios (um escritório de advocacia) e
   nada é gravado. Na abertura de verdade, as três variações de cada passo
   nascem das respostas já dadas (ramo, setores, planta) e "Montar" grava
   `estilo` em data/config.json.
   =========================================================== */
const ESTUDIO = (() => {
  const EXEMPLO = { empresa: 'Furtado Advocacia', ramo: 'advocacia',
    setores: ['Atendimento no WhatsApp', 'Fechamento de pasta', 'Petições', 'Financeiro', 'Captação'] };

  /* ---------- as plantas pelo ramo (3 variações) ----------
     x, y, w, h em tiles; duas faixas de salas com o corredor no meio, como planta.js faz. */
  const PLANTAS = {
    compacta: { nome: 'Compacta', desc: '4 salas: todo mundo numa operação só', salas: [
      { nome: 'Recepção', tipo: 'recepcao', x: 0, y: 0, w: 6, h: 5 },
      { nome: 'Operação', tipo: 'operacao', x: 7, y: 0, w: 12, h: 5, setores: ['Atendimento', 'Pastas', 'Petições', 'Financeiro', 'Captação'] },
      { nome: 'Reunião', tipo: 'reuniao', x: 20, y: 0, w: 6, h: 5 },
      { nome: 'Diretoria', tipo: 'diretoria', x: 0, y: 7, w: 6, h: 5 }] },
    padrao: { nome: 'Padrão', desc: '6 salas: uma por frente de trabalho', salas: [
      { nome: 'Recepção', tipo: 'recepcao', x: 0, y: 0, w: 5, h: 5 },
      { nome: 'Atendimento', tipo: 'operacao', x: 6, y: 0, w: 9, h: 5, setores: ['Atendimento', 'Captação'] },
      { nome: 'Pastas e petições', tipo: 'operacao', x: 16, y: 0, w: 10, h: 5, setores: ['Fechamento de pasta', 'Petições'] },
      { nome: 'Financeiro', tipo: 'operacao', x: 0, y: 7, w: 6, h: 5, setores: ['Financeiro'] },
      { nome: 'Reunião', tipo: 'reuniao', x: 7, y: 7, w: 7, h: 5 },
      { nome: 'Diretoria', tipo: 'diretoria', x: 15, y: 7, w: 6, h: 5 }] },
    ampla: { nome: 'Ampla', desc: '8 salas: espera para o cliente e um setor por sala', salas: [
      { nome: 'Recepção', tipo: 'recepcao', x: 0, y: 0, w: 5, h: 5 },
      { nome: 'Sala de espera', tipo: 'descanso', x: 6, y: 0, w: 4, h: 5 },
      { nome: 'Atendimento', tipo: 'operacao', x: 11, y: 0, w: 8, h: 5, setores: ['Atendimento', 'Captação'] },
      { nome: 'Petições', tipo: 'operacao', x: 20, y: 0, w: 8, h: 5, setores: ['Petições'] },
      { nome: 'Fechamento de pasta', tipo: 'operacao', x: 0, y: 7, w: 8, h: 5, setores: ['Fechamento de pasta'] },
      { nome: 'Financeiro', tipo: 'operacao', x: 9, y: 7, w: 6, h: 5, setores: ['Financeiro'] },
      { nome: 'Reunião', tipo: 'reuniao', x: 16, y: 7, w: 6, h: 5 },
      { nome: 'Diretoria', tipo: 'diretoria', x: 23, y: 7, w: 5, h: 5 }] }
  };
  const TAMANHOS = {
    enxuto: { nome: 'Enxuto', desc: 'salas baixas, 2 mesas por sala de operação', h: 4, mesas: 2 },
    medio:  { nome: 'Médio',  desc: 'salas de 5 tiles, 4 mesas',                  h: 5, mesas: 4 },
    amplo:  { nome: 'Amplo',  desc: 'salas fundas, 6 mesas e espaço para andar',  h: 6, mesas: 6 }
  };
  /* a paleta: destaque + bases para o escuro e para o claro */
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
  const AVATARES = {
    sobrio: { nome: 'Sóbrio', desc: 'terno, camisa escura, cores fechadas', hints: (i) => ({ shirt: ['#2b3140', '#1f2937', '#3b2f2f', '#243b53', '#2d2a3e', '#1e3a34'][i % 6], pants: '#1b1f2b', cap: false, tattoo: false }) },
    cartum: { nome: 'Cartum', desc: 'o boneco de hoje: camisas coloridas', hints: () => ({}) },
    pictograma: { nome: 'Pictograma', desc: 'figura chapada, sem rosto, na cor do destaque', flat: true }
  };
  const MOBILIAS = {
    minimalista: { nome: 'Minimalista', desc: 'mesa, cadeira, monitor. Só.', extras: 0 },
    aconchegante: { nome: 'Aconchegante', desc: 'plantas, tapete e abajur', extras: 1 },
    corporativo: { nome: 'Corporativo', desc: 'armários, plantas nos cantos, letreiro', extras: 2 }
  };
  const MOVIMENTOS = {
    parado: { nome: 'Parado', desc: 'ninguém se mexe; a tela não gasta nada', fps: 0 },
    calmo:  { nome: 'Calmo', desc: 'respiração leve, de vez em quando', fps: 12 },
    vivo:   { nome: 'Vivo', desc: 'digitando, balançando: como é hoje', fps: 20 }
  };
  const MOTORES = {
    iso: { nome: 'Isométrico', desc: 'o escritório em perspectiva, como hoje' },
    '2d': { nome: '2D de cima', desc: 'planta vista de cima, mais simples e mais leve' }
  };
  const TEMAS = { escuro: { nome: 'Escuro', desc: 'fundo escuro, bom para tela o dia todo' }, claro: { nome: 'Claro', desc: 'fundo claro, bom para projetar e imprimir' } };
  const ROTULOS = { setor: { nome: 'Pelo setor', desc: 'a placa da sala diz os setores que moram nela' }, livre: { nome: 'Nome livre', desc: 'a placa diz o nome que você der à sala' } };

  const PASSOS = [
    { id: 'motor', titulo: 'O estilo', pergunta: 'Como você quer ver o escritório?', opcoes: MOTORES },
    { id: 'planta', titulo: 'A planta pelo seu ramo', pergunta: 'Três plantas montadas para ' + EXEMPLO.ramo + ', com os seus setores em cada sala. Dá para trocar sala por sala depois.', opcoes: PLANTAS, foco: null },
    { id: 'tamanho', titulo: 'O tamanho das salas', pergunta: 'Quantas mesas cabem e quanto espaço sobra.', opcoes: TAMANHOS, foco: 'operacao' },
    { id: 'paleta', titulo: 'A paleta', pergunta: 'As cores do chão, das paredes e do destaque.', opcoes: PALETAS },
    { id: 'avatares', titulo: 'Os bonecos', pergunta: 'A família de avatares dos agentes.', opcoes: AVATARES, foco: 'bonecos' },
    { id: 'mobilia', titulo: 'A mobília', pergunta: 'Quanta coisa tem em cada sala.', opcoes: MOBILIAS, foco: 'recepcao' },
    { id: 'movimento', titulo: 'O movimento', pergunta: 'Se os bonecos se mexem, e quanto. Parado é o mais leve.', opcoes: MOVIMENTOS, foco: 'operacao' },
    { id: 'tema', titulo: 'Claro ou escuro', pergunta: 'O fundo da cena e dos painéis.', opcoes: TEMAS },
    { id: 'rotulos', titulo: 'As placas das salas', pergunta: 'O que a placa de cada sala mostra.', opcoes: ROTULOS },
    { id: 'resumo', titulo: 'Resumo', pergunta: 'Confira e monte. Tudo pode ser trocado depois em ⚙️ Ajustes › Estúdio.' }
  ];
  const cfg = { motor: 'iso', planta: 'padrao', tamanho: 'medio', paleta: 'sobria', avatares: 'sobrio', mobilia: 'minimalista', movimento: 'parado', tema: 'escuro', rotulos: 'setor' };
  let passo = 0;

  /* ---------- a cena: salas com mesas, pelas escolhas ---------- */
  const CORES_TIPO = { recepcao: 0.06, operacao: 0, reuniao: -0.05, diretoria: 0.1, descanso: 0.03, sala: 0 };
  function cena(c) {
    const p = PLANTAS[c.planta], t = TAMANHOS[c.tamanho];
    const salas = p.salas.map(s => {
      const h = s.tipo === 'operacao' || s.tipo === 'descanso' ? t.h : Math.min(s.h, t.h);
      const y = s.y === 0 ? 0 : t.h + 2;                       // a faixa de baixo desce junto com a altura
      const sala = { ...s, h, y, mesas: [], extras: [] };
      const n = s.tipo === 'operacao' ? Math.min(t.mesas, Math.floor((s.w - 1) / 1.6) * Math.max(1, Math.floor((h - 1) / 2.2)))
              : s.tipo === 'diretoria' ? 1 : s.tipo === 'recepcao' ? 1 : s.tipo === 'reuniao' ? 0 : 0;
      const porLinha = Math.max(1, Math.floor((s.w - 1) / 1.6));
      for (let i = 0; i < n; i++) {
        const col = i % porLinha, lin = Math.floor(i / porLinha);
        sala.mesas.push({ x: s.x + 0.6 + col * 1.6, y: y + 0.8 + lin * 2.2, seed: s.nome + i, setor: (s.setores || [s.nome])[i % (s.setores || [1]).length] });
      }
      if (s.tipo === 'reuniao') sala.mesaGrande = { x: s.x + 1, y: y + 1.2, w: s.w - 2, d: Math.max(1.2, h - 2.6) };
      if (s.tipo === 'descanso') { sala.sofa = { x: s.x + 0.6, y: y + h - 1.6, w: s.w - 1.2 }; }
      const ex = MOBILIAS[c.mobilia].extras;
      if (ex >= 1) sala.extras.push({ t: 'planta', x: s.x + s.w - 0.6, y: y + 0.5 });
      if (ex >= 1 && (s.tipo === 'recepcao' || s.tipo === 'descanso')) sala.extras.push({ t: 'tapete', x: s.x + 0.8, y: y + 1.2, w: s.w - 1.6, d: h - 2.4 });
      if (ex >= 2) { sala.extras.push({ t: 'armario', x: s.x + 0.2, y: y + 0.1, w: 1.2 }); sala.extras.push({ t: 'planta', x: s.x + 0.4, y: y + h - 0.5 }); }
      return sala;
    });
    const W = Math.max(...salas.map(s => s.x + s.w)) + 1, H = Math.max(...salas.map(s => s.y + s.h)) + 1;
    return { salas, W, H, corredorY: t.h + 0.5 };
  }
  const base = (c) => PALETAS[c.paleta][c.tema];
  const rotulo = (c, s) => c.rotulos === 'setor' && s.setores ? s.setores.join(' · ') : s.nome;
  function look(c, i, seed) {
    const fam = AVATARES[c.avatares];
    return fam.flat ? { flat: true } : AVATAR.makeLook('estudio-' + seed, fam.hints(i));
  }

  /* ---------- desenho isométrico (pelo iso.js e avatar.js da tela) ---------- */
  function desenharIso(ctx, c, W0, H0, t, foco) {
    const sc = cena(c), b = base(c), acc = PALETAS[c.paleta].acc;
    const salas = foco ? sc.salas.filter(s => s.tipo === foco).slice(0, 1) : sc.salas;
    const x0 = foco ? salas[0].x - 0.5 : -0.5, y0 = foco ? salas[0].y - 0.5 : -0.5;
    const x1 = foco ? salas[0].x + salas[0].w + 0.5 : sc.W, y1 = foco ? salas[0].y + salas[0].h + 0.5 : sc.H;
    const cantos = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => ISO.toScreen(x, y));
    const minX = Math.min(...cantos.map(p => p.x)), maxX = Math.max(...cantos.map(p => p.x));
    const minY = Math.min(...cantos.map(p => p.y)) - 70, maxY = Math.max(...cantos.map(p => p.y)) + 10;
    const k = Math.min(W0 / (maxX - minX), H0 / (maxY - minY)) * 0.96;
    ctx.save();
    ctx.translate(W0 / 2, H0 / 2); ctx.scale(k, k); ctx.translate(-(minX + maxX) / 2, -(minY + maxY) / 2);
    const WALL = 26;
    // corredor (piso do meio)
    if (!foco) ISO.plane(ctx, -0.5, sc.corredorY - 0.5, sc.W + 0.5, 1.6, 0, b.piso2, ISO.rgba('#000', 0.15));
    const ordem = [...salas].sort((a, bb) => (a.x + a.y) - (bb.x + bb.y));
    for (const s of ordem) {
      const piso = ISO.shade(b.piso, CORES_TIPO[s.tipo] || 0);
      // piso em xadrez leve
      for (let x = s.x; x < s.x + s.w; x++) for (let y = s.y; y < s.y + s.h; y++)
        ISO.tile(ctx, x, y, (x + y) % 2 ? piso : ISO.shade(piso, 0.03), null);
      for (const e of s.extras) if (e.t === 'tapete') ISO.plane(ctx, e.x, e.y, e.w, e.d, 1, ISO.rgba(acc, c.tema === 'claro' ? 0.18 : 0.14), null);
      // paredes de trás (topo e esquerda), com uma porta no meio da de cima
      const porta = s.x + Math.floor(s.w / 2);
      ISO.box(ctx, s.x - 0.18, s.y - 0.18, 0.18, s.h + 0.18, WALL, 0, b.parede);
      ISO.box(ctx, s.x, s.y - 0.18, porta - s.x, 0.18, WALL, 0, b.parede);
      ISO.box(ctx, porta + 1, s.y - 0.18, s.x + s.w - porta - 1, 0.18, WALL, 0, b.parede);
      ISO.box(ctx, porta, s.y - 0.18, 1, 0.18, WALL, 0, ISO.shade(acc, -0.3), { top: ISO.rgba(acc, .9) });
      // mobília
      for (const e of s.extras) {
        if (e.t === 'armario') ISO.box(ctx, e.x, e.y, e.w, 0.5, 20, 0, ISO.shade(b.mesa, -0.1));
        if (e.t === 'planta') { ISO.cyl(ctx, e.x, e.y, 0.18, 6, 0, '#6b4a2b'); ISO.cyl(ctx, e.x, e.y, 0.3, 9, 6, '#2f8f4e'); }
      }
      if (s.mesaGrande) { const m = s.mesaGrande; ISO.box(ctx, m.x, m.y, m.w, m.d, 11, 0, b.mesa); for (let i = 0; i < 4; i++) ISO.box(ctx, m.x + 0.3 + i * (m.w / 4), m.y + m.d + 0.2, 0.5, 0.5, 8, 0, ISO.shade(b.mesa, -0.25)); }
      if (s.sofa) ISO.box(ctx, s.sofa.x, s.sofa.y, s.sofa.w, 0.8, 10, 0, ISO.shade(acc, -0.35));
      const mesas = [...s.mesas].sort((a, bb) => (a.x + a.y) - (bb.x + bb.y));
      mesas.forEach((m, i) => {
        ISO.box(ctx, m.x, m.y, 1.2, 0.7, 10, 0, b.mesa);
        ISO.box(ctx, m.x + 0.35, m.y + 0.08, 0.5, 0.06, 9, 10, '#141722', { top: ISO.rgba(acc, .85) });
        ISO.box(ctx, m.x + 0.35, m.y + 0.95, 0.5, 0.5, 7, 0, ISO.shade(b.mesa, -0.3));
        const p = ISO.toScreen(m.x + 0.6, m.y + 1.15, 0);
        desenharBoneco(ctx, c, i, m.seed, p.x, p.y, 0.5, t, acc);
      });
      // paredes da frente baixas, para ver dentro
      ISO.box(ctx, s.x, s.y + s.h, s.w, 0.18, 6, 0, ISO.rgba(b.parede, .9));
      ISO.box(ctx, s.x + s.w, s.y, 0.18, s.h + 0.18, 6, 0, ISO.rgba(b.parede, .9));
      // placa
      const pc = ISO.toScreen(s.x + s.w / 2, s.y, WALL + 14);
      placa(ctx, rotulo(c, s), pc.x, pc.y, b, acc);
    }
    if (!foco && MOBILIAS[c.mobilia].extras >= 2) { const p = ISO.toScreen(sc.W / 2, sc.corredorY, 2); ctx.save(); ctx.font = '700 22px Barlow, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = ISO.rgba(acc, .55); ctx.fillText(EXEMPLO.empresa.toUpperCase(), p.x, p.y); ctx.restore(); }
    ctx.restore();
  }
  function placa(ctx, txt, x, y, b, acc) {
    ctx.save(); ctx.font = '600 11px Barlow Semi Condensed, Segoe UI, sans-serif';
    const w = ctx.measureText(txt).width + 14;
    ctx.fillStyle = ISO.rgba(b.bg, .85); ISO.rrect(ctx, x - w / 2, y - 9, w, 17, 5); ctx.fill();
    ctx.strokeStyle = ISO.rgba(acc, .6); ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = b.txt; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x, y);
    ctx.restore();
  }
  function desenharBoneco(ctx, c, i, seed, sx, sy, k, t, acc) {
    const fase = MOVIMENTOS[c.movimento].fps ? t * (c.movimento === 'calmo' ? 0.6 : 1) : 0;
    const lk = look(c, i, seed);
    ctx.save(); ctx.translate(sx, sy); ctx.scale(k, k);
    if (lk.flat) {
      // pictograma: cabeça e corpo chapados, sem rosto
      const resp = c.movimento === 'parado' ? 0 : Math.sin(fase * 1.5) * 0.7;
      ctx.fillStyle = ISO.rgba('#000', .25); ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = acc; ISO.rrect(ctx, -9, -30 + resp, 18, 26, 7); ctx.fill();
      ctx.fillStyle = ISO.shade(acc, 0.35); ctx.beginPath(); ctx.arc(0, -38 + resp, 8, 0, 7); ctx.fill();
    } else {
      AVATAR.draw(ctx, lk, 0, 0, 'n', { sitting: true, working: c.movimento === 'vivo', phase: fase });
    }
    ctx.restore();
  }

  /* ---------- desenho 2D de cima (como nas referências) ---------- */
  function desenhar2D(ctx, c, W0, H0, t, foco) {
    const sc = cena(c), b = base(c), acc = PALETAS[c.paleta].acc;
    const salas = foco ? sc.salas.filter(s => s.tipo === foco).slice(0, 1) : sc.salas;
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
      if (s.sofa) R(s.sofa.x, s.sofa.y, s.sofa.w, 0.8, T * 0.3, ISO.shade(acc, -0.35), null);
      s.mesas.forEach((m, i) => {
        R(m.x, m.y, 1.2, 0.7, 4, b.mesa, null);
        R(m.x + 0.35, m.y + 0.08, 0.5, 0.14, 2, acc, null);
        boneco2D(ctx, c, i, m.seed, (m.x + 0.6) * T, (m.y + 1.1) * T, T, t, acc);
      });
      // placa da sala (acima, como nas referências)
      const txt = rotulo(c, s);
      ctx.save(); ctx.font = '700 ' + Math.min(13, Math.max(8, T * 0.42)) + 'px Barlow, Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(txt).width + T * 0.8;
      const ph = Math.min(20, T * 0.6);
      ISO.rrect(ctx, (s.x + s.w / 2) * T - w / 2, (s.y - 0.3) * T - ph, w, ph, 6); ctx.fillStyle = ISO.rgba(b.bg, .9); ctx.fill(); ctx.strokeStyle = ISO.rgba(acc, .6); ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = b.txt; ctx.fillText(txt, (s.x + s.w / 2) * T, (s.y - 0.3) * T - ph / 2); ctx.restore();
    }
    ctx.restore();
  }
  function boneco2D(ctx, c, i, seed, x, y, T, t, acc) {
    const fase = MOVIMENTOS[c.movimento].fps ? t * (c.movimento === 'calmo' ? 0.6 : 1) : 0;
    const resp = c.movimento === 'parado' ? 0 : Math.sin(fase * 1.5) * T * 0.02;
    const lk = look(c, i, seed);
    const corpo = lk.flat ? acc : lk.shirt, pele = lk.flat ? ISO.shade(acc, 0.35) : lk.skin;
    ctx.save(); ctx.translate(x, y + resp);
    ctx.fillStyle = corpo; ctx.beginPath(); ctx.ellipse(0, 0, T * 0.42, T * 0.26, 0, 0, 7); ctx.fill();          // ombros
    ctx.fillStyle = pele; ctx.beginPath(); ctx.arc(0, -T * 0.1, T * 0.26, 0, 7); ctx.fill();                        // cabeça
    if (!lk.flat) { ctx.fillStyle = lk.hair; ctx.beginPath(); ctx.arc(0, -T * 0.16, T * 0.26, Math.PI, 2 * Math.PI); ctx.fill(); }
    ctx.restore();
  }

  /* três bonecos de perto, para comparar as famílias */
  function desenharBonecos(ctx, c, W0, H0, t) {
    const b = base(c), acc = PALETAS[c.paleta].acc, k = H0 / 110;
    const fase = MOVIMENTOS[c.movimento].fps ? t : 0;
    ctx.fillStyle = b.piso; ctx.fillRect(0, H0 * 0.78, W0, H0 * 0.22);
    [0, 1, 2].forEach(i => {
      const sx = W0 * (0.25 + i * 0.25), sy = H0 * 0.86, lk = look(c, i, 'perto' + i);
      ctx.save(); ctx.translate(sx, sy); ctx.scale(k, k);
      if (lk.flat) {
        ctx.fillStyle = ISO.rgba('#000', .25); ctx.beginPath(); ctx.ellipse(0, 0, 13, 6, 0, 0, 7); ctx.fill();
        ctx.fillStyle = acc; ISO.rrect(ctx, -11, -46, 22, 44, 9); ctx.fill();
        ctx.fillStyle = ISO.shade(acc, 0.35); ctx.beginPath(); ctx.arc(0, -56, 10, 0, 7); ctx.fill();
      } else AVATAR.draw(ctx, lk, 0, 0, i === 1 ? 's' : i === 0 ? 'e' : 'w', { phase: fase, working: false });
      ctx.restore();
    });
  }
  function desenhar(canvas, c, t, foco) {
    const ctx = canvas.getContext('2d');
    const W0 = canvas.width, H0 = canvas.height, b = base(c);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = b.bg; ctx.fillRect(0, 0, W0, H0);
    if (foco === 'bonecos') return desenharBonecos(ctx, c, W0, H0, t);
    if (c.motor === '2d') desenhar2D(ctx, c, W0, H0, t, foco); else desenharIso(ctx, c, W0, H0, t, foco);
  }

  /* ---------- a trilha ---------- */
  const $ = (s) => document.querySelector(s);
  let vivos = [];      // canvases que animam (quando o movimento não é parado)
  function montar() {
    const p = PASSOS[passo];
    document.documentElement.dataset.tema = cfg.tema;
    $('#quem').textContent = EXEMPLO.empresa + ' · exemplo, nada é gravado';
    $('#pontos').innerHTML = PASSOS.map((_, i) => '<i class="' + (i < passo ? 'feito' : i === passo ? 'atual' : '') + '"></i>').join('');
    $('#contador').textContent = 'passo ' + (passo + 1) + ' de ' + PASSOS.length;
    $('#titulo').textContent = p.titulo; $('#pergunta').textContent = p.pergunta;
    $('#voltar').disabled = passo === 0;
    $('#avancar').textContent = passo === PASSOS.length - 1 ? 'Montar o escritório' : 'Avançar ▶';
    $('#avancar').disabled = passo === PASSOS.length - 1;
    const cart = $('#cartoes'); cart.innerHTML = ''; vivos = [];
    $('#resumo').classList.toggle('hidden', p.id !== 'resumo'); cart.classList.toggle('hidden', p.id === 'resumo');
    if (p.id === 'resumo') { resumo(); } else {
      for (const [id, op] of Object.entries(p.opcoes)) {
        const el = document.createElement('button'); el.className = 'cartao' + (cfg[p.id] === id ? ' escolhido' : ''); el.dataset.id = id;
        const extra = p.id === 'planta' ? '<ul class="lista">' + op.salas.map(s => '<li>' + s.nome + (s.setores ? ' <span class="hint">(' + s.setores.join(', ') + ')</span>' : '') + '</li>').join('') + '</ul>' : '';
        el.innerHTML = '<canvas width="360" height="200"></canvas><div class="nome"><span>' + op.nome + '</span><span class="sel">' + (cfg[p.id] === id ? 'escolhido' : '') + '</span></div><p class="desc">' + op.desc + '</p>' + extra;
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
    if (!vivos.length) return;                       // parado: nenhum quadro, nenhum gasto
    const loop = (now) => {
      const fps = Math.max(...vivos.map(v => MOVIMENTOS[v.c.movimento].fps));
      if (now - ultimo >= 1000 / fps) { ultimo = now; for (const v of vivos) desenhar(v.cv, v.c, now / 1000, v.foco); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; } else animar(); });
  function resumo() {
    const linhas = PASSOS.filter(p => p.id !== 'resumo').map(p => '<tr><td>' + p.titulo + '</td><td>' + p.opcoes[cfg[p.id]].nome + '</td></tr>').join('');
    const estilo = { ...cfg, ramo: EXEMPLO.ramo };
    $('#resumo').innerHTML = '<div class="caixa"><b>As suas escolhas</b><table>' + linhas + '</table></div>' +
      '<div class="caixa"><b>O que "Montar" gravaria</b><p class="hint">em <code>data/config.json</code>, chave <code>estilo</code>; a planta vira <code>data/planta.json</code> pelo <code>planta.js</code></p><pre>' + JSON.stringify(estilo, null, 2) + '</pre>' +
      '<div class="aviso">Este é o exemplo do formato: nada é gravado. Na abertura de verdade, o botão monta o escritório com estas escolhas e abre a tela.</div></div>';
  }
  $('#voltar').onclick = () => { if (passo > 0) { passo--; montar(); } };
  $('#avancar').onclick = () => { if (passo < PASSOS.length - 1) { passo++; montar(); } };
  document.addEventListener('keydown', (e) => {
    const p = PASSOS[passo]; if (!p.opcoes) return;
    const ids = Object.keys(p.opcoes), i = ids.indexOf(cfg[p.id]);
    if (e.key === 'ArrowRight') { cfg[p.id] = ids[(i + 1) % ids.length]; montar(); }
    if (e.key === 'ArrowLeft') { cfg[p.id] = ids[(i - 1 + ids.length) % ids.length]; montar(); }
    if (e.key === 'Enter') $('#avancar').click();
  });
  montar();
  return { cfg, PASSOS, desenhar, ir: (n) => { passo = Math.max(0, Math.min(PASSOS.length - 1, n)); montar(); } };
})();
