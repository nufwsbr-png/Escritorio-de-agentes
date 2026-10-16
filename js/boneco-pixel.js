/* ===========================================================
   boneco-pixel.js — o boneco em pixel art, estilo Habbo (decisão do dono, 16/10/2026)

   Grade de 16 x 40 pixels, contorno escuro, sombra de um lado. Cabelo, pele,
   óculos, barba, roupa e cor são parâmetros: cada agente nasce diferente sem
   sprite nenhum. Usado pelo Estúdio (prévia da roupa) e, pelo avatar.js, pela
   cena do escritório. Roupas: executivo, social, casual, jaleco, classico,
   elegante; a roupa é escolhida por negócio (sugerida pelo ramo), nunca pelo
   dono do produto.

     BONECO_PIXEL.grade(look, pose)        a matriz de letras (16 x 40)
     BONECO_PIXEL.cores(look)              letra → cor
     BONECO_PIXEL.draw(ctx, look, x, y, k, pose)  desenha no canvas, pé em (x, y), k = pixels por célula
     BONECO_PIXEL.ROUPAS                   id → { nome, desc }
   =========================================================== */
const BONECO_PIXEL = (() => {
  const HEAD = ['..oooooooo..', '.ossssssssSo', 'osssssssssSo', 'osssssssssSo', 'osspesspeSSo', 'osssssssssSo', 'ossssmmssSSo', '.osssssssSo.', '..oossssoo..', '....ossS....'];
  const HAIR = {
    curto:  ['..oooooooo..', '.ohhhhhhhHo.', 'ohhhhhhhhhHo', 'ohhhhhhhhhHo', 'ohHo......Ho'],
    longo:  ['..oooooooo..', '.ohhhhhhhHo.', 'ohhhhhhhhhHo', 'ohhhhhhhhhHo', 'ohh......HHo', 'ohh......HHo', 'ohh......HHo', 'ohh......HHo', 'ohh......HHo', 'oHH......HHo', '.oo......oo.'],
    coque:  ['....ohhhho..', '..oooHHHoo..', '.ohhhhhhhHo.', 'ohhhhhhhhhHo', 'ohhhhhhhhhHo', 'ohHo......Ho'],
    espeto: ['..o.oo.oo.o.', '.ohohhohhoho', 'ohhhhhhhhhHo', 'ohhhhhhhhhHo', 'ohHo......Ho'],
    fade:   ['..oooooooo..', '.ohhhhhhhHo.', '.oHHHHHHHHo.'],
    franja: ['..oooooooo..', '.ohhhhhhhHo.', 'ohhhhhhhhhHo', 'ohhhhhhhhhHo', 'ohhhhhoHhhHo', 'ohh.....oHHo', 'oHH......HHo', '.oo......oo.'],
    raspado: ['..oooooooo..', '.oHHHHHHHHo.']
  };
  const GLASSES = ['..oooooooo..', '..o..oo..o..', '..oooooooo..'];
  const BEARD = ['.oBBBBBBBBo.', '..oBBBBBBo..'];
  const BODY = {
    executivo: ['oooooooooo', 'occwaawcCo', 'occwaawcCo', 'occcaaccCo', 'occcaaccCo', 'occcaaccCo', 'occccccCCo', 'occccccCCo', 'occccccCCo', 'occccccCCo', 'occccccCCo', 'oooooooooo'],
    social:    ['oooooooooo', 'oaawwwwaAo', 'oaaawwaaAo', 'oaaaoaaaAo', 'oaaaaaaaAo', 'oaaaoaaaAo', 'oaaaaaaaAo', 'oaaaoaaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oAAAAAAAAo', 'oooooooooo'],
    casual:    ['oooooooooo', 'oaaaaaaaAo', 'oaawwwaaAo', 'oaawawaaAo', 'oaawwwaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oAAAAAAAAo', 'oooooooooo'],
    jaleco:    ['oooooooooo', 'oaawwwwaAo', 'owwwwwwwWo', 'owawwwwwWo', 'owwwwwwwWo', 'owwwowwwWo', 'owwwwwwwWo', 'owwwowwwWo', 'owwwwwwwWo', 'owwwwwwwWo', 'oWWWWWWWWo', 'oooooooooo'],
    classico:  ['oooooooooo', 'oaaaaaaaAo', 'owwwwwwwWo', 'oaaaaaaaAo', 'owwwwwwwWo', 'oaaaaaaaAo', 'owwwwwwwWo', 'oaaaaaaaAo', 'owwwwwwwWo', 'oaaaaaaaAo', 'oAAAAAAAAo', 'oooooooooo'],
    elegante:  ['oooooooooo', 'oaassssaAo', 'oaaasssaAo', 'oaaaowaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oaaaaaaaAo', 'oAAAAAAAAo', 'oooooooooo']
  };
  const ROUPAS = {
    executivo: { nome: 'Executivo', desc: 'terno escuro, gravata na cor do agente' },
    social:    { nome: 'Social', desc: 'camisa na cor do agente, calça escura' },
    casual:    { nome: 'Casual', desc: 'camiseta na cor do agente, jeans' },
    jaleco:    { nome: 'Jaleco', desc: 'jaleco branco, gola e crachá na cor do agente' },
    classico:  { nome: 'Clássico', desc: 'a camiseta listrada do Habbo, nas cores do agente' },
    elegante:  { nome: 'Elegante', desc: 'blazer na cor do agente, decote e colar' }
  };
  /* o terno, a calça e o jeans por roupa (o resto vem da cor do agente) */
  const CALCA = { executivo: null, social: '#26304a', casual: '#3b5a8a', jaleco: '#5b6478', classico: '#26304a', elegante: '#1f2937' };
  const TERNOS = ['#26304a', '#3b2f2f', '#1f2937', '#243b53', '#2d2a3e', '#1e3a34'];
  const ARM_L = ['..', 'or', 'or', 'or', 'or', 'or', 'or', 'os', 'os', 'oo'];
  const ARM_R = ['..', 'Ro', 'Ro', 'Ro', 'Ro', 'Ro', 'Ro', 'So', 'So', 'oo'];
  const LEGS = ['ollo.ollLo', 'ollo.ollLo', 'ollo.ollLo', 'ollo.ollLo', 'ollo.ollLo', 'ollo.ollLo', 'ollo.ollLo', 'ollo.ollLo', 'obbo.obbBo', 'oooo.ooooo'];
  const LEGS_SIT = ['ollo.ollLo', 'ollo.ollLo', 'ollo.ollLo', 'oLLo.oLLLo'];

  const tom = (hex, k) => { const n = parseInt(String(hex).slice(1), 16); if (isNaN(n)) return hex; const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); return '#' + [16, 8, 0].map(sh => f((n >> sh) & 255).toString(16).padStart(2, '0')).join(''); };
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h | 0); };

  function stamp(g, map, x, y) { map.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== '.' && g[y + j] && i + x >= 0 && i + x < 16) g[y + j][x + i] = ch; } }); }

  /** a matriz 16 x 40: look = { roupa, acc, skin, hair, style, glasses, beard, seed } */
  function grade(look, pose) {
    const g = Array.from({ length: 40 }, () => Array(16).fill('.'));
    const estilo = HAIR[look.style] ? look.style : 'curto';
    stamp(g, HEAD, 2, 4);
    stamp(g, HAIR[estilo], 2, estilo === 'coque' ? 2 : 4);
    if (look.glasses) stamp(g, GLASSES, 2, 7);
    if (look.beard) stamp(g, BEARD, 2, 10);
    stamp(g, BODY[look.roupa] || BODY.social, 3, 14);
    stamp(g, ARM_L, 1, 14); stamp(g, ARM_R, 13, 14);
    stamp(g, pose === 'sentado' ? LEGS_SIT : LEGS, 3, 26);
    return g;
  }
  function cores(look) {
    const roupa = BODY[look.roupa] ? look.roupa : 'social';
    const terno = look.terno || TERNOS[hash(String(look.seed || look.acc || 'x')) % TERNOS.length];
    const calca = CALCA[roupa] || terno;
    const manga = roupa === 'executivo' ? terno : roupa === 'jaleco' ? '#f2f4f8' : look.acc;
    const skin = look.skin || '#f2c9a6', hair = look.hair || '#2a1a10', acc = look.acc || '#5FE0FB';
    return { o: '#17120f', s: skin, S: tom(skin, -0.22), h: hair, H: tom(hair, -0.3), e: '#ffffff', p: '#1a1a1a', m: tom(skin, -0.45),
      c: terno, C: tom(terno, -0.3), a: acc, A: tom(acc, -0.3), w: '#f2f4f8', W: '#c9d0e0', r: manga, R: tom(manga, -0.3), B: tom(hair, -0.1),
      l: calca, L: tom(calca, -0.3), b: '#1a1a1a' };
  }
  /** desenha com o pé em (x, y); k = tamanho de cada pixel; pose 'pe' ou 'sentado' (pernas curtas, para a cadeira) */
  function draw(ctx, look, x, y, k, pose) {
    const g = grade(look, pose), c = cores(look);
    const alto = pose === 'sentado' ? 30 : 40;
    const x0 = x - 8 * k, y0 = y - alto * k;
    ctx.save();
    for (let j = 0; j < alto; j++) {
      const row = g[j];
      let i = 0;
      while (i < 16) {
        const ch = row[i];
        if (ch === '.' || !c[ch]) { i++; continue; }
        let n = 1; while (i + n < 16 && row[i + n] === ch) n++;   // junta pixels iguais na linha: menos retângulos
        ctx.fillStyle = c[ch]; ctx.fillRect(x0 + i * k, y0 + j * k, n * k + 0.02, k + 0.02);
        i += n;
      }
    }
    ctx.restore();
  }
  /** aparência a partir de uma semente (o id do agente) e da roupa do negócio */
  const SKIN = ['#f7d7bd', '#f2c9a6', '#e0a878', '#c98a5b', '#a2643b', '#7a4a2c', '#5a3620'];
  const HAIRC = ['#2a1a10', '#140f0c', '#3d2a1a', '#6b4423', '#a8702f', '#d9b56a', '#8e8e93', '#111111'];
  const STYLES = Object.keys(HAIR);
  function makeLook(seed, hints = {}) {
    const h = hash(String(seed));
    return Object.assign({ seed: String(seed), skin: SKIN[h % SKIN.length], hair: HAIRC[(h >> 3) % HAIRC.length], style: STYLES[(h >> 6) % STYLES.length],
      glasses: (h % 5 === 0), beard: (h % 4 === 0) && !/longo|coque|franja/.test(STYLES[(h >> 6) % STYLES.length]), acc: '#5FE0FB', roupa: 'social' }, hints);
  }
  return { grade, cores, draw, makeLook, ROUPAS, HAIR, BODY, ALTURA: 40, LARGURA: 16 };
})();
if (typeof module !== 'undefined') module.exports = BONECO_PIXEL;
