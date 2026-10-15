/* ===========================================================
   plataformas.js (navegador) — o cadastro único das conexões do negócio

   🔌 Conexões no topo: lista com o ESTADO de cada uma (conectada, sem chave,
   falhou, desligada), Testar e Testar todas, cadastra, edita e remove
   (administrador). Cliente sem senha vê nome, tipo, endereço, estado e os
   NOMES das variáveis; nunca valores. Também fornece as caixas de marcação
   do assistente de contratação, o painel "Conexões" do monitor de cada
   agente e a faixa no topo quando alguma conexão precisa de gente.
   Por dentro o nome continua "plataformas" (rotas, arquivos, .env).
   =========================================================== */
const PLATAFORMAS_UI = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (r, m = 'GET', c) => (await fetch(r, { method: m,
    headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined })).json();

  let cache = { plataformas: [], tipos: {}, estados: {}, resumo: null };
  async function carregar() {
    try { const r = await api('/api/plataformas'); cache = { plataformas: r.plataformas || [], tipos: r.tipos || {}, estados: r.estados || {}, resumo: r.resumo || null }; }
    catch (e) { cache = { plataformas: [], tipos: {}, estados: {}, resumo: null }; }
    return cache;
  }
  const emoji = tipo => (cache.tipos[tipo] && cache.tipos[tipo].emoji) || '🔌';
  const nomeTipo = tipo => (cache.tipos[tipo] && cache.tipos[tipo].nome) || tipo;
  const nomeDoAgente = id => { try { const a = ROSTER.all().find(x => x.sistema === id); return a ? a.name : id; } catch (e) { return id; } };
  const ha = (iso) => {
    const ms = Date.now() - new Date(iso).getTime();
    if (!(ms >= 0)) return '';
    const min = Math.round(ms / 60000);
    if (min < 1) return 'agora'; if (min < 60) return 'há ' + min + ' min';
    const h = Math.round(min / 60); if (h < 24) return 'há ' + h + ' h';
    const d = Math.round(h / 24); return d === 1 ? 'ontem' : 'há ' + d + ' dias';
  };

  /* ---------------- o estado de uma conexão ---------------- */
  const NAO_TESTADA = { cor: 'cinza', rotulo: 'ainda não testada' };
  const estadoDe = p => p.teste ? (cache.estados[p.teste.estado] || { cor: 'cinza', rotulo: p.teste.estado }) : NAO_TESTADA;
  const precisaDeGente = p => !!p.teste && (p.teste.estado === 'sem-chave' || p.teste.estado === 'falhou');
  /** o selo: bolinha + palavra; `curto` esconde o "há X min" */
  function selo(p, curto) {
    const e = estadoDe(p);
    const titulo = p.teste ? p.teste.motivo + (p.teste.detalhe ? '. ' + p.teste.detalhe : '') : 'o escritório ainda não testou esta conexão';
    return `<span class="pl-estado ${e.cor}" title="${esc(titulo)}"><i class="sem ${e.cor}"></i>${esc(e.rotulo)}${curto || !p.teste ? '' : `<small>· ${esc(ha(p.teste.quando))}</small>`}</span>`;
  }
  const motivoHtml = p => p.teste ? `<div class="pl-motivo ${estadoDe(p).cor}">${esc(p.teste.motivo)}${p.teste.detalhe ? ` <span>${esc(p.teste.detalhe)}</span>` : ''}</div>` : '';
  function resumoHtml(r) {
    if (!r || !r.total) return '';
    const chip = (n, cor, txt) => n ? `<span class="pl-chip ${cor}"><i class="sem ${cor}"></i>${n} ${txt}</span>` : '';
    return `<div class="pl-resumo">${chip(r.conectadas, 'verde', r.conectadas === 1 ? 'conectada' : 'conectadas')}${chip(r.semChave, 'amarelo', 'sem chave')}${chip(r.falharam, 'vermelho', r.falharam === 1 ? 'falhou' : 'falharam')}${chip(r.paradas, 'cinza', r.paradas === 1 ? 'desligada' : 'desligadas')}${chip(r.naoTestadas, 'cinza', r.naoTestadas === 1 ? 'não testada' : 'não testadas')}</div>`;
  }

  /* ---------------- o modal da lista ---------------- */
  async function abrir(aviso) {
    await carregar();
    const admin = ADMIN.ehAdmin();
    const corpo = $('#modal-body');
    const itens = cache.plataformas.map(p => `
      <div class="pl-item ${precisaDeGente(p) ? 'atencao' : ''}" data-id="${esc(p.id)}">
        <span class="pl-emo">${emoji(p.tipo)}</span>
        <div class="pl-txt">
          <div class="pl-cabeca"><b>${esc(p.nome)}</b> <small class="hint">${esc(nomeTipo(p.tipo))}</small> ${selo(p)}</div>
          ${motivoHtml(p)}
          ${p.url ? `<div class="hint"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a></div>` : ''}
          <div class="hint">${p.variaveis.length ? 'variáveis: <code>' + p.variaveis.map(esc).join('</code> <code>') + '</code>' : 'sem variáveis'}
            · ${p.usadaPor.length ? 'usada por ' + p.usadaPor.map(nomeDoAgente).map(esc).join(', ') : 'nenhum agente usa'}</div>
        </div>
        ${admin ? `<div class="pl-botoes"><button class="btn ghost pl-testar" data-id="${esc(p.id)}" title="Testa a conexão agora">Testar</button><button class="btn ghost pl-edit" data-id="${esc(p.id)}">Editar</button></div>` : ''}
      </div>`).join('');
    corpo.innerHTML = `
      <h3 style="font-family:var(--f-display);margin:0 0 6px">🔌 Conexões do negócio</h3>
      <p class="hint" style="margin:0 0 10px;line-height:1.6">Os sistemas que a empresa já usa e os agentes podem acessar: CRM, planilha, agenda, pasta, WhatsApp, e-mail. Cadastre cada um uma vez; ao contratar, você marca quais o agente pode usar, e só essas entram no <code>.env</code> dele, num bloco que o escritório mantém.
        ${admin ? 'Chaves ficam só aqui e no <code>.env</code> dos agentes permitidos: nunca no chat.' : 'Só o administrador vê e edita os valores.'}
        O escritório testa cada conexão ao salvar, ao subir e a cada 15 minutos.</p>
      ${resumoHtml(cache.resumo)}
      ${aviso ? `<div class="pl-aviso">${esc(aviso)}</div>` : ''}
      <div class="pl-lista">${itens || '<p class="hint">Nenhuma conexão cadastrada ainda.</p>'}</div>
      <div class="mactions">
        ${admin ? `<button class="btn primary" id="pl-nova">＋ Cadastrar conexão</button>${cache.plataformas.length ? '<button class="btn" id="pl-testar-todas" title="Testa todas agora">Testar todas</button>' : ''}<button class="btn ghost" id="pl-sinc" title="Regrava o bloco no .env de todos os agentes do escritório">Sincronizar agentes</button>` : ''}
        <button class="btn" id="pl-fechar">Fechar</button>
      </div>`;
    $('#modal').classList.remove('hidden');
    $('#pl-fechar').onclick = () => $('#modal').classList.add('hidden');
    if (admin) {
      $('#pl-nova').onclick = () => formulario(null);
      $('#pl-sinc').onclick = async () => {
        const r = await api('/api/plataformas/sincronizar', 'POST', {});
        abrir(r.ok ? `Bloco regravado em ${r.sincronizados.length} agente(s)${r.pulados.length ? '; pulados (sem trilha ou sem pasta): ' + r.pulados.join(', ') : ''}. Religue os que estão ligados para lerem o .env novo.` : r.motivo);
      };
      const tt = $('#pl-testar-todas');
      if (tt) tt.onclick = async () => {
        tt.disabled = true; tt.textContent = 'testando…';
        const r = await api('/api/plataformas/testar', 'POST', {});
        if (r.precisaAdmin) { ADMIN.abrir(r.motivo); return; }
        const n = r.resumo || {};
        abrir(r.ok ? `Testadas ${n.total}: ${n.conectadas} conectada(s), ${n.semChave} sem chave, ${n.falharam} falhou/falharam${n.paradas ? ', ' + n.paradas + ' desligada(s)' : ''}.` : (r.motivo || 'não deu'));
        faixa();
      };
      $$('.pl-edit').forEach(b => b.onclick = () => formulario(b.dataset.id));
      $$('.pl-testar').forEach(b => b.onclick = async () => {
        b.disabled = true; b.textContent = 'testando…';
        const r = await api('/api/plataformas/' + b.dataset.id + '/testar', 'POST', {});
        if (r.precisaAdmin) { ADMIN.abrir(r.motivo); return; }
        const p = cache.plataformas.find(x => x.id === b.dataset.id) || { nome: b.dataset.id };
        abrir(r.ok ? `${p.nome}: ${(cache.estados[r.teste.estado] || {}).rotulo || r.teste.estado}. ${r.teste.motivo}.` : (r.motivo || 'não deu'));
        faixa();
      });
    }
  }

  /* ---------------- cadastrar / editar (administrador) ---------------- */
  async function formulario(id) {
    if (!ADMIN.exigir('Cadastrar conexões')) return;
    let p = { nome: '', tipo: 'api', url: '', notas: '', variaveis: {}, usadaPor: [] };
    if (id) { const r = await api('/api/plataformas/' + id); if (r.precisaAdmin) { ADMIN.abrir(r.motivo); return; } p = r; }
    const corpo = $('#modal-body');
    const opcoesTipo = Object.entries(cache.tipos).map(([k, v]) => `<option value="${k}" ${k === p.tipo ? 'selected' : ''}>${v.emoji} ${esc(v.nome)}</option>`).join('');
    const linhaVar = (k = '', v = '') => `
      <div class="pl-var">
        <input class="pl-k" placeholder="NOME_DA_VARIAVEL" value="${esc(k)}" spellcheck="false">
        <input class="pl-v" type="password" placeholder="valor (fica só aqui e no .env dos agentes permitidos)" value="${esc(v)}" autocomplete="new-password">
        <button class="btn ghost pl-ver" title="mostrar">👁</button>
        <button class="btn ghost pl-tira" title="remover">✕</button>
      </div>`;
    corpo.innerHTML = `
      <h3 style="font-family:var(--f-display);margin:0 0 4px">${id ? 'Editar conexão' : 'Cadastrar conexão'}</h3>
      <p class="hint" style="margin-bottom:12px">O nome vira o id e o prefixo das variáveis. O tipo sugere as variáveis, diz como os agentes a enxergam e como o escritório a testa.</p>
      <p class="hint pl-dica hidden" id="pl-dica-mcp" style="margin:-6px 0 12px">🧩 Servidor MCP: preencha <b>COMANDO</b> para um servidor local (ex.: <code>npx -y @modelcontextprotocol/server-filesystem C:/pasta</code>) <b>ou</b> <b>URL</b> para um remoto. <b>TOKEN</b> vira Authorization no remoto e variável de ambiente no local. O escritório grava um <code>mcp.json</code> na pasta de cada agente marcado, sem valores; o lançador libera só esses servidores, em proposta e real.</p>
      ${id && p.teste ? `<div class="pl-item" style="margin-bottom:12px"><span class="pl-emo">${emoji(p.tipo)}</span><div class="pl-txt"><div class="pl-cabeca">${selo(p)}</div>${motivoHtml(p)}</div></div>` : ''}
      <div class="two">
        <div class="frow"><label>Nome</label><input id="pl-nome" value="${esc(p.nome)}" maxlength="60" placeholder="ex.: Ophir (CRM jurídico)"></div>
        <div class="frow"><label>Tipo</label><select id="pl-tipo" ${id ? 'disabled' : ''}>${opcoesTipo}</select></div>
      </div>
      <div class="frow"><label>Endereço (o que o dono abre no navegador)</label><input id="pl-url" value="${esc(p.url)}" placeholder="https://…"></div>
      <div class="frow"><label>Variáveis de conexão</label>
        <div id="pl-vars">${Object.entries(p.variaveis).map(([k, v]) => linhaVar(k, v)).join('')}</div>
        <div><button class="btn ghost" id="pl-mais">＋ variável</button> ${id ? '' : '<button class="btn ghost" id="pl-sugerir">sugerir pelo tipo</button>'}</div>
      </div>
      <div class="frow"><label>Notas</label><input id="pl-notas" value="${esc(p.notas)}" maxlength="500" placeholder="ex.: token do usuário 'agente', só leitura"></div>
      ${id && p.usadaPor.length ? `<p class="hint">Usada por: ${p.usadaPor.map(nomeDoAgente).map(esc).join(', ')}. Salvar regrava o bloco no .env deles.</p>` : ''}
      <div id="pl-msg" class="hint" style="color:#ff7a6b;margin-top:6px"></div>
      <div class="mactions">
        <button class="btn primary" id="pl-salvar">${id ? 'Salvar e testar' : 'Cadastrar e testar'}</button>
        ${id ? '<button class="btn" id="pl-remover" style="color:#ff7a6b">Remover</button>' : ''}
        <button class="btn" id="pl-voltar">Voltar</button>
      </div>`;
    const ligaLinhas = () => {
      $$('.pl-ver').forEach(b => b.onclick = e => { e.preventDefault(); const i = b.parentElement.querySelector('.pl-v'); i.type = i.type === 'password' ? 'text' : 'password'; });
      $$('.pl-tira').forEach(b => b.onclick = e => { e.preventDefault(); b.parentElement.remove(); });
    };
    ligaLinhas();
    const prefixo = () => (slugDe($('#pl-nome').value) || 'plataforma').toUpperCase().replace(/-/g, '_') + '_';
    const sugerir = () => {
      const t = cache.tipos[$('#pl-tipo').value]; if (!t) return;
      $('#pl-vars').innerHTML = (t.sufixos || []).map(s => linhaVar(s === 'GOOGLE_CREDENCIAIS_JSON' ? s : prefixo() + s, '')).join('');
      ligaLinhas();
    };
    if (!id && !Object.keys(p.variaveis).length) sugerir();
    if ($('#pl-sugerir')) $('#pl-sugerir').onclick = sugerir;
    const dica = () => $('#pl-dica-mcp').classList.toggle('hidden', $('#pl-tipo').value !== 'mcp');
    dica(); $('#pl-tipo').onchange = dica;
    $('#pl-mais').onclick = () => { $('#pl-vars').insertAdjacentHTML('beforeend', linhaVar(prefixo(), '')); ligaLinhas(); };
    $('#pl-voltar').onclick = () => abrir();
    $('#pl-salvar').onclick = async () => {
      const b = $('#pl-salvar'); b.disabled = true; b.textContent = 'salvando e testando…';
      const variaveis = {};
      for (const linha of $$('.pl-var')) { const k = linha.querySelector('.pl-k').value.trim(); if (k) variaveis[k] = linha.querySelector('.pl-v').value; }
      const corpoReq = { nome: $('#pl-nome').value.trim(), tipo: $('#pl-tipo').value, url: $('#pl-url').value.trim(), notas: $('#pl-notas').value.trim(), variaveis };
      const r = id ? await api('/api/plataformas/' + id, 'PUT', corpoReq) : await api('/api/plataformas', 'POST', corpoReq);
      if (!r.ok) { b.disabled = false; b.textContent = id ? 'Salvar e testar' : 'Cadastrar e testar'; $('#pl-msg').textContent = r.motivo || 'não deu'; if (r.precisaAdmin) ADMIN.abrir(r.motivo); return; }
      const t = r.teste ? ((cache.estados[r.teste.estado] || {}).rotulo || r.teste.estado) + ': ' + r.teste.motivo + '.' : '';
      abrir((id ? 'Conexão salva. ' : 'Conexão cadastrada. ') + t + (id
        ? (r.sincronizados && r.sincronizados.length ? ' O .env de ' + r.sincronizados.length + ' agente(s) foi regravado; religue-os para lerem a mudança.' : '')
        : ' Agora marque quem pode usá-la: ao contratar, ou no monitor do agente.'));
      faixa();
    };
    if ($('#pl-remover')) $('#pl-remover').onclick = async () => {
      const quem = p.usadaPor.length ? ' Ela é usada por ' + p.usadaPor.map(nomeDoAgente).join(', ') + ', que vão perder as variáveis dela.' : '';
      $('#pl-msg').innerHTML = `Remover <b>${esc(p.nome)}</b>?${esc(quem)} <button class="btn" id="pl-confirma" style="margin-left:8px;color:#ff7a6b">Sim, remover</button>`;
      $('#pl-confirma').onclick = async () => { const r = await api('/api/plataformas/' + id, 'DELETE'); abrir(r.ok ? 'Conexão removida.' + (r.usadaPor.length ? ' Religue os agentes que a usavam.' : '') : r.motivo); faixa(); };
    };
    $('#pl-nome').focus();
  }
  const slugDe = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

  /* ---------------- as caixas do assistente de contratação ---------------- */
  function caixas(selecionadas = []) {
    if (!cache.plataformas.length) return `<p class="hint" style="margin-top:8px">Nenhuma conexão cadastrada. Cadastre em <b>🔌 Conexões</b>, no topo, para os agentes já nascerem conectados.</p>`;
    const comProblema = cache.plataformas.filter(precisaDeGente);
    return `<div class="frow" style="margin-top:8px"><label>Conexões que este agente pode usar</label>
      <div class="opts pl-caixas">${cache.plataformas.map(p => `<label class="opt ${precisaDeGente(p) ? 'pl-atencao' : ''}"><input type="checkbox" class="pl-caixa" value="${esc(p.id)}" ${selecionadas.includes(p.id) ? 'checked' : ''}> ${emoji(p.tipo)} ${esc(p.nome)} <small class="hint">${esc(nomeTipo(p.tipo))}</small> ${selo(p, true)}</label>`).join('')}</div>
      <span class="hint">Só as marcadas entram no <code>.env</code> dele. Dá para mudar depois, no monitor.${comProblema.length ? ` <b class="pl-alerta">${comProblema.length === 1 ? comProblema[0].nome + ' ainda não está conectada' : comProblema.length + ' ainda não estão conectadas'}</b>: o agente pode ser marcado, mas só vai usar quando a conexão ficar verde em 🔌 Conexões.` : ''}</span></div>`;
  }
  const marcadas = () => $$('.pl-caixa:checked').map(i => i.value);

  /* ---------------- o painel do monitor ---------------- */
  async function painelDoAgente(idSistema, el, cabeca, fechaBotao) {
    await carregar();
    const sistemas = SISTEMAS.todos ? SISTEMAS.todos() : [];
    const s = sistemas.find(x => x.id === idSistema) || {};
    const atuais = Array.isArray(s.plataformas) ? s.plataformas : [];
    const admin = ADMIN.ehAdmin();
    const semTrilha = !s.trilha;
    const dele = cache.plataformas.filter(p => atuais.includes(p.id) && precisaDeGente(p));
    el.innerHTML = cabeca('🔌 Conexões', semTrilha ? 'sistema cadastrado à mão: o escritório mostra, mas não escreve no .env dele' : 'as conexões que este agente pode usar; só elas entram no .env dele, no bloco mantido pelo escritório') +
      `<div class="ex-lista">
        ${dele.length ? `<div class="pl-aviso atencao">${dele.length === 1 ? 'A conexão ' + esc(dele[0].nome) + ' deste agente ainda não funciona' : dele.length + ' conexões deste agente ainda não funcionam'}: ${dele.map(p => esc(p.teste.motivo)).join('; ')}. Resolva em 🔌 Conexões, no topo.</div>` : ''}
        ${cache.plataformas.length ? cache.plataformas.map(p => `<label class="opt pl-linha ${atuais.includes(p.id) && precisaDeGente(p) ? 'atencao' : ''}"><input type="checkbox" class="pl-caixa" value="${esc(p.id)}" ${atuais.includes(p.id) ? 'checked' : ''} ${admin ? '' : 'disabled'}>
          <span class="pl-emo">${emoji(p.tipo)}</span><span><b>${esc(p.nome)}</b> <small class="hint">${esc(nomeTipo(p.tipo))}</small> ${selo(p)}${p.teste && p.teste.estado !== 'conectada' ? `<br><small class="hint">${esc(p.teste.motivo)}</small>` : ''}${p.url ? `<br><small class="hint">${esc(p.url)}</small>` : ''}<br><small class="hint">${p.variaveis.map(esc).join(', ')}</small></span></label>`).join('')
          : '<p class="hint">Nenhuma conexão cadastrada. Cadastre em 🔌 Conexões, no topo.</p>'}
      </div>
      <div class="ex-baixo">
        <span class="hint" id="pl-painel-msg">${admin ? 'Marque e salve: o escritório regrava o bloco no .env na hora. Depois, religue o agente.' : 'Só o administrador muda as permissões.'}</span>
        ${admin && !semTrilha && cache.plataformas.length ? '<button class="btn primary" id="pl-painel-salvar">Salvar</button>' : ''}
      </div>`;
    fechaBotao();
    const b = $('#pl-painel-salvar');
    if (b) b.onclick = async () => {
      const r = await api(`/api/agentes/${idSistema}/plataformas`, 'PUT', { plataformas: marcadas() });
      if (r.precisaAdmin) { ADMIN.abrir(r.motivo); return; }
      $('#pl-painel-msg').textContent = r.ok ? `Salvo: ${r.plataformas.length} conexão(ões), ${r.variaveis.length} variável(is) no bloco. Religue o agente para ele ler o .env novo.` : (r.motivo || 'não deu');
      if (SISTEMAS.atualizar) SISTEMAS.atualizar();
    };
  }

  /* ---------------- a faixa no topo: conexões que precisam de gente ---------------- */
  async function faixa(recarregar = true) {
    const el = $('#faixa-conexoes'); if (!el) return;
    if (recarregar) await carregar();
    const admin = typeof ADMIN !== 'undefined' && ADMIN.ehAdmin();
    const r = cache.resumo;
    const lista = r && Array.isArray(r.atencao) ? r.atencao : [];
    if (!admin || !lista.length) { el.classList.add('hidden'); return; }
    const rot = e => (cache.estados[e] || {}).rotulo || e;
    const nomes = lista.slice(0, 3).map(a => `<b>${esc(a.nome)}</b> (${esc(rot(a.estado))})`).join(', ') + (lista.length > 3 ? ' e mais ' + (lista.length - 3) : '');
    el.innerHTML = `🔌 ${lista.length === 1 ? 'Uma conexão precisa de você' : lista.length + ' conexões precisam de você'}: ${nomes}. <a href="#" id="faixa-conexoes-abrir">Abrir Conexões</a>`;
    const sa = $('#sem-abertura');
    el.classList.toggle('segunda', !!sa && !sa.classList.contains('hidden'));
    el.classList.remove('hidden');
    const a = $('#faixa-conexoes-abrir'); if (a) a.onclick = e => { e.preventDefault(); abrir(); };
  }
  window.addEventListener('load', () => {
    setTimeout(() => faixa(), 2500);          // o escritório testa as conexões logo que sobe
    setInterval(() => faixa(), 60000);
    if (typeof ADMIN !== 'undefined' && ADMIN.onChange) ADMIN.onChange(() => faixa(false));
  });

  return { abrir, carregar, caixas, marcadas, painelDoAgente, faixa, get lista() { return cache.plataformas; } };
})();
