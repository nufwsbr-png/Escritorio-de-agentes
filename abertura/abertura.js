/* ===========================================================
   abertura.js (navegador) — a abertura do escritório na tela

   Cinco etapas: boas-vindas → uma pergunta (texto livre + logo, cor e
   planta opcionais) → "Entendi assim" (campos editáveis) → o Estúdio
   (estudio/estudio.js, com as plantas do ramo e os setores da resposta)
   → a chave de administrador, mostrada uma vez. Tudo passa pelas rotas
   /api/abertura/* (abertura.js do servidor); nada é gravado antes do
   "Montar o escritório". Nenhuma chave de sistema entra aqui.
   =========================================================== */
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (rota, metodo = 'GET', corpo) => (await fetch(rota, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined })).json();

  const est = { estado: null, marca: { cor: '#5FE0FB', logo: '', planta: '' }, entendido: null, roupaSugerida: 'social', estudio: null, resultado: null };

  /* ---------- as etapas ---------- */
  function ir(n) {
    $$('.etapa').forEach((e, i) => e.classList.toggle('hidden', i !== n));
    $$('#etapas li').forEach((li, i) => { li.classList.toggle('atual', i === n); li.classList.toggle('feita', i < n); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $$('[data-ir]').forEach(b => b.onclick = () => ir(Number(b.dataset.ir)));

  /* ---------- 0 · boas-vindas: o Claude Code e o escritório já aberto ---------- */
  async function carregar() {
    try { est.estado = await api('/api/abertura/estado'); } catch (e) { est.estado = null; }
    const el = $('#estado-claude');
    if (!est.estado) { el.innerHTML = '<i class="sem vermelho"></i><span>o escritório não respondeu; confira se ele está no ar</span>'; return; }
    const c = est.estado.claude || {};
    if (c.conectado) el.innerHTML = '<i class="sem verde"></i><span><b>Claude Code conectado</b> nesta máquina: ele lê o que você escrever e sugere os setores e as conexões.</span>';
    else if (c.instalado) el.innerHTML = '<i class="sem amarelo"></i><span><b>Claude Code instalado, sem login.</b> Dá para seguir: eu entendo por palavras-chave e você corrige. Para a leitura completa, rode <code>claude auth login</code> num terminal e recarregue.</span>';
    else el.innerHTML = '<i class="sem amarelo"></i><span><b>Claude Code não encontrado</b> nesta máquina. Dá para abrir o escritório mesmo assim (eu entendo por palavras-chave), mas os agentes precisam dele para trabalhar: instale e rode <code>claude auth login</code>.</span>';
    const ab = $('#estado-aberto');
    if (est.estado.aberto) {
      const a = est.estado.atual || {};
      ab.classList.remove('hidden');
      if (est.estado.admin) { ab.innerHTML = '<i class="sem amarelo"></i><span><b>Este escritório já foi aberto</b>' + (a.empresa ? ' para ' + esc(a.empresa) : '') + '. Refazer troca empresa, dono, setores, planta e visual; agentes, conexões e senha ficam.</span>'; }
      else { ab.innerHTML = '<i class="sem vermelho"></i><span><b>Este escritório já foi aberto</b>' + (a.empresa ? ' para ' + esc(a.empresa) : '') + '. Para refazer, entre como administrador na tela (🔐 Admin) e volte aqui.</span>'; $('#b-comecar').disabled = true; }
    }
    // o tipo das conexões
    const tipos = est.estado.tipos || {};
    $('#novo-tipo').innerHTML = Object.entries(tipos).map(([k, v]) => `<option value="${k}">${v.emoji} ${esc(v.nome)}</option>`).join('');
    $('#c-ramo').innerHTML = (est.estado.ramos || []).map(r => `<option value="${r.id}">${esc(r.nome)}</option>`).join('');
  }
  $('#b-comecar').onclick = () => { ir(1); $('#txt').focus(); };

  /* ---------- 1 · a pergunta, a marca ---------- */
  $('#f-cor').oninput = () => { est.marca.cor = $('#f-cor').value; $('#t-cor').textContent = est.marca.cor.toUpperCase(); };
  async function subirArquivo(input, tipo, rotuloEl) {
    const f = input.files && input.files[0]; if (!f) return;
    if (f.size > 4 * 1024 * 1024) { rotuloEl.textContent = 'arquivo grande demais (até 4 MB)'; input.value = ''; return; }
    rotuloEl.textContent = 'enviando…';
    const dados = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
    const r = await api('/api/abertura/marca', 'POST', { tipo, nome: f.name, dados });
    if (!r.ok) { rotuloEl.textContent = r.motivo || 'não deu'; input.value = ''; return; }
    est.marca[tipo] = r.arquivo; rotuloEl.textContent = f.name + ' ✓';
    if (tipo === 'logo' && /\.(png|jpe?g|svg|webp)$/i.test(f.name)) { $('#img-logo').src = dados; $('#p-logo').classList.remove('hidden'); }
  }
  $('#f-logo').onchange = () => subirArquivo($('#f-logo'), 'logo', $('#n-logo'));
  $('#f-planta').onchange = () => subirArquivo($('#f-planta'), 'planta', $('#n-planta'));

  $('#b-interpretar').onclick = async () => {
    const texto = $('#txt').value.trim();
    const erro = $('#erro-1'); erro.classList.add('hidden');
    const b = $('#b-interpretar'); b.disabled = true; $('#lendo').textContent = est.estado && est.estado.claude && est.estado.claude.conectado ? 'lendo o que você escreveu… (o Claude Code leva alguns segundos)' : 'lendo o que você escreveu…';
    let r; try { r = await api('/api/abertura/interpretar', 'POST', { texto }); } catch (e) { r = { ok: false, motivo: 'o escritório não respondeu' }; }
    b.disabled = false; $('#lendo').textContent = '';
    if (!r.ok) { erro.textContent = r.motivo || 'não deu'; erro.classList.remove('hidden'); return; }
    est.entendido = r.entendido; est.roupaSugerida = r.roupaSugerida || 'social';
    const av = $('#aviso-2');
    if (r.aviso) { av.textContent = r.aviso; av.classList.remove('hidden'); } else av.classList.add('hidden');
    pintarEntendido(); ir(2);
  };

  /* ---------- 2 · entendi assim ---------- */
  function pintarEntendido() {
    const e = est.entendido;
    $('#c-empresa').value = e.empresa || ''; $('#c-dono').value = e.dono || ''; $('#c-faz').value = e.oQueFaz || '';
    $('#c-ramo').value = e.ramo || 'generico';
    pintarSetores(); pintarConexoes();
  }
  function pintarSetores() {
    const e = est.entendido;
    $('#c-setores').innerHTML = (e.setores || []).map((s, i) => `<span class="chip" title="${esc(s.desc || '')}">${esc(s.emoji || '🏢')} ${esc(s.nome)}<button type="button" data-tira="${i}" title="tirar">✕</button></span>`).join('') || '<span class="hint">nenhum setor; acrescente abaixo ou use os sugeridos do ramo</span>';
    $$('[data-tira]').forEach(b => b.onclick = () => { e.setores.splice(Number(b.dataset.tira), 1); pintarSetores(); });
  }
  function pintarConexoes() {
    const e = est.entendido, tipos = est.estado.tipos || {};
    $('#c-conexoes').innerHTML = (e.conexoes || []).map((c, i) => `<div class="conexao"><input value="${esc(c.nome)}" data-nome="${i}" maxlength="60"><select data-tipo="${i}">${Object.entries(tipos).map(([k, v]) => `<option value="${k}" ${k === c.tipo ? 'selected' : ''}>${v.emoji} ${esc(v.nome)}</option>`).join('')}</select><button type="button" data-tira-c="${i}" title="tirar">✕</button></div>`).join('') || '<span class="hint">nenhuma conexão citada; acrescente abaixo, ou cadastre depois em 🔌 Conexões</span>';
    $$('[data-nome]').forEach(i => i.oninput = () => { e.conexoes[Number(i.dataset.nome)].nome = i.value; });
    $$('[data-tipo]').forEach(s => s.onchange = () => { e.conexoes[Number(s.dataset.tipo)].tipo = s.value; });
    $$('[data-tira-c]').forEach(b => b.onclick = () => { e.conexoes.splice(Number(b.dataset.tiraC), 1); pintarConexoes(); });
  }
  const ramoAtual = () => (est.estado.ramos || []).find(r => r.id === $('#c-ramo').value) || (est.estado.ramos || []).find(r => r.id === 'generico');
  $('#b-setor').onclick = () => { const v = $('#novo-setor').value.trim(); if (!v) return; est.entendido.setores.push({ nome: v, emoji: '🏢', desc: '' }); $('#novo-setor').value = ''; pintarSetores(); };
  $('#novo-setor').onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); $('#b-setor').click(); } };
  $('#b-setores-ramo').onclick = () => { const r = ramoAtual(); if (r) { est.entendido.setores = r.setores.map(s => ({ nome: s.nome, emoji: s.emoji, desc: s.desc })); pintarSetores(); } };
  $('#c-ramo').onchange = () => { const r = ramoAtual(); if (r) est.roupaSugerida = r.roupa; };
  $('#b-conexao').onclick = () => { const v = $('#nova-conexao').value.trim(); if (!v) return; est.entendido.conexoes.push({ nome: v, tipo: $('#novo-tipo').value }); $('#nova-conexao').value = ''; pintarConexoes(); };
  $('#nova-conexao').onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); $('#b-conexao').click(); } };

  function lerEntendido() {
    const e = est.entendido;
    e.empresa = $('#c-empresa').value.trim(); e.dono = $('#c-dono').value.trim(); e.oQueFaz = $('#c-faz').value.trim(); e.ramo = $('#c-ramo').value;
    e.conexoes = (e.conexoes || []).filter(c => c.nome && c.nome.trim());
    return e;
  }
  $('#b-estudio').onclick = () => {
    const e = lerEntendido();
    const erro = $('#erro-2'); erro.classList.add('hidden');
    if (!e.empresa) { erro.textContent = 'falta o nome da empresa'; erro.classList.remove('hidden'); $('#c-empresa').focus(); return; }
    if (!e.setores.length) { erro.textContent = 'escolha pelo menos um setor (ou use os sugeridos do ramo)'; erro.classList.remove('hidden'); return; }
    const ramo = ramoAtual();
    est.estudio = ESTUDIO.criar({ dados: { empresa: e.empresa, ramo, setores: e.setores.map(s => s.nome), cor: est.marca.cor }, cfg: { roupa: ramo ? ramo.roupa : 'social' }, exemplo: false, aoMontar: montar });
    ir(3);
  };

  /* ---------- 3 · montar ---------- */
  async function montar(cfg) {
    const e = est.entendido;
    const erro = $('#erro-3'); erro.classList.add('hidden');
    $('#avancar').disabled = true; $('#montando').textContent = 'montando o escritório…';
    const corpo = { empresa: e.empresa, oQueFaz: e.oQueFaz, dono: e.dono, ramo: e.ramo, setores: e.setores, conexoes: e.conexoes,
      marca: { cor: est.marca.cor, logo: est.marca.logo || undefined, planta: est.marca.planta || undefined }, estilo: cfg };
    let r; try { r = await api('/api/abertura/montar', 'POST', corpo); } catch (x) { r = { ok: false, motivos: ['o escritório não respondeu'] }; }
    $('#avancar').disabled = false; $('#montando').textContent = '';
    if (!r.ok) { erro.textContent = (r.motivos || [r.motivo || 'não deu']).join('; '); erro.classList.remove('hidden'); if (r.precisaAdmin) erro.textContent += ' (entre como administrador na tela e volte)'; return; }
    est.resultado = r; pintarPronto(); ir(4);
  }

  /* ---------- 4 · a chave ---------- */
  function pintarPronto() {
    const r = est.resultado, e = est.entendido;
    const n = r.planta ? r.planta.salas.length : 0;
    $('#t-pronto').textContent = 'O escritório da ' + e.empresa + ' está montado.';
    $('#p-pronto').textContent = n + ' salas, ' + (r.planta ? r.planta.capacidade : 0) + ' mesas para agentes, ' + e.setores.length + ' setor(es)' + (r.conexoes && r.conexoes.criadas.length ? ', ' + r.conexoes.criadas.length + ' conexão(ões) cadastrada(s) sem chave' : '') + '.' + (r.planta && r.planta.aviso ? ' ' + r.planta.aviso : '');
    if (r.senha) { $('#senha').textContent = r.senha; $('#caixa-senha').classList.remove('hidden'); $('#guardei').checked = false; $('#b-abrir').disabled = true; }
    else { $('#caixa-senha').classList.add('hidden'); $('#b-abrir').disabled = false; }
    const cx = $('#caixa-conexoes');
    const nomePor = (id) => { const c = (e.conexoes || []).find(x => String(x.nome).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) === id); return c ? c.nome : id; };
    const criadas = ((r.conexoes && r.conexoes.criadas) || []).map(nomePor);
    cx.innerHTML = '<span class="mini">O que vem agora</span><ul>' +
      (criadas.length ? '<li>Cole as chaves das conexões em <b>🔌 Conexões</b>, no topo da tela: ' + criadas.map(esc).join(', ') + '. Cada uma mostra se conectou.</li>' : '<li>Cadastre as conexões do negócio em <b>🔌 Conexões</b>, no topo da tela.</li>') +
      '<li>Contrate o primeiro agente na aba <b>Contratar</b>: escolha o setor, dê um nome, marque as conexões.</li>' +
      '<li>Avisos no celular em <b>🔔 Avisos</b> e a reunião dos agentes em <b>⚙️ Ajustes</b>, quando quiser.</li></ul>';
  }
  $('#guardei').onchange = () => { $('#b-abrir').disabled = !$('#guardei').checked; };
  $('#b-copiar').onclick = async () => { try { await navigator.clipboard.writeText($('#senha').textContent); $('#b-copiar').textContent = 'Copiada ✓'; } catch (e) { $('#b-copiar').textContent = 'selecione e copie'; } };
  $('#b-abrir').onclick = () => { location.href = '/'; };

  carregar();
  window.ABERTURA_TELA = { est, ir, pintarEntendido };
})();
