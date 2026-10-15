/* ===========================================================
   plataformas.js (navegador) — o cadastro único das plataformas

   🔌 Conexões no topo: lista, cadastra, edita e remove (administrador).
   Cliente sem senha vê nome, tipo, endereço e os NOMES das variáveis; nunca
   valores. Também fornece as caixas de marcação do assistente de contratação
   e o painel "Plataformas" do monitor de cada agente.
   =========================================================== */
const PLATAFORMAS_UI = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (r, m = 'GET', c) => (await fetch(r, { method: m,
    headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined })).json();

  let cache = { plataformas: [], tipos: {} };
  async function carregar() {
    try { const r = await api('/api/plataformas'); cache = { plataformas: r.plataformas || [], tipos: r.tipos || {} }; }
    catch (e) { cache = { plataformas: [], tipos: {} }; }
    return cache;
  }
  const emoji = tipo => (cache.tipos[tipo] && cache.tipos[tipo].emoji) || '🔌';
  const nomeTipo = tipo => (cache.tipos[tipo] && cache.tipos[tipo].nome) || tipo;
  const nomeDoAgente = id => { try { const a = ROSTER.all().find(x => x.sistema === id); return a ? a.name : id; } catch (e) { return id; } };

  /* ---------------- o modal da lista ---------------- */
  async function abrir(aviso) {
    await carregar();
    const admin = ADMIN.ehAdmin();
    const corpo = $('#modal-body');
    const itens = cache.plataformas.map(p => `
      <div class="pl-item" data-id="${esc(p.id)}">
        <span class="pl-emo">${emoji(p.tipo)}</span>
        <div class="pl-txt">
          <b>${esc(p.nome)}</b> <small class="hint">${esc(nomeTipo(p.tipo))}</small>
          ${p.url ? `<div class="hint"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.url)}</a></div>` : ''}
          <div class="hint">${p.variaveis.length ? 'variáveis: <code>' + p.variaveis.map(esc).join('</code> <code>') + '</code>' : 'sem variáveis'}
            · ${p.usadaPor.length ? 'usada por ' + p.usadaPor.map(nomeDoAgente).map(esc).join(', ') : 'nenhum agente usa'}</div>
        </div>
        ${admin ? `<button class="btn ghost pl-edit" data-id="${esc(p.id)}">Editar</button>` : ''}
      </div>`).join('');
    corpo.innerHTML = `
      <h3 style="font-family:var(--f-display);margin:0 0 6px">🔌 Conexões do negócio</h3><p class="hint" style="margin:0 0 10px">Os sistemas que a empresa já usa e os agentes podem acessar. Antes a tela chamava isto de "plataformas".</p>
      <p class="hint" style="margin-bottom:14px;line-height:1.6">Cadastre aqui, uma vez, cada sistema que a empresa usa: CRM, planilha, agenda, pasta, WhatsApp, e-mail.
        Ao contratar um agente você marca quais ele pode usar, e só essas entram no <code>.env</code> dele, num bloco que o escritório mantém.
        ${admin ? 'Chaves ficam só aqui e no <code>.env</code> dos agentes permitidos: nunca no chat.' : 'Só o administrador vê e edita os valores.'}</p>
      ${aviso ? `<div class="hint" style="color:#8ef0b0;margin-bottom:10px">${esc(aviso)}</div>` : ''}
      <div class="pl-lista">${itens || '<p class="hint">Nenhuma plataforma cadastrada ainda.</p>'}</div>
      <div class="mactions">
        ${admin ? '<button class="btn primary" id="pl-nova">＋ Cadastrar plataforma</button><button class="btn" id="pl-sinc" title="Regrava o bloco no .env de todos os agentes do escritório">Sincronizar agentes</button>' : ''}
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
      $$('.pl-edit').forEach(b => b.onclick = () => formulario(b.dataset.id));
    }
  }

  /* ---------------- cadastrar / editar (administrador) ---------------- */
  async function formulario(id) {
    if (!ADMIN.exigir('Cadastrar plataformas')) return;
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
      <h3 style="font-family:var(--f-display);margin:0 0 4px">${id ? 'Editar plataforma' : 'Cadastrar plataforma'}</h3>
      <p class="hint" style="margin-bottom:12px">O nome vira o id e o prefixo das variáveis. O tipo sugere as variáveis e diz como os agentes a enxergam.</p>
      <p class="hint pl-dica hidden" id="pl-dica-mcp" style="margin:-6px 0 12px">🧩 Servidor MCP: preencha <b>COMANDO</b> para um servidor local (ex.: <code>npx -y @modelcontextprotocol/server-filesystem C:/pasta</code>) <b>ou</b> <b>URL</b> para um remoto. <b>TOKEN</b> vira Authorization no remoto e variável de ambiente no local. O escritório grava um <code>mcp.json</code> na pasta de cada agente marcado, sem valores; o lançador libera só esses servidores, em proposta e real.</p>
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
        <button class="btn primary" id="pl-salvar">${id ? 'Salvar' : 'Cadastrar'}</button>
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
      const variaveis = {};
      for (const linha of $$('.pl-var')) { const k = linha.querySelector('.pl-k').value.trim(); if (k) variaveis[k] = linha.querySelector('.pl-v').value; }
      const corpoReq = { nome: $('#pl-nome').value.trim(), tipo: $('#pl-tipo').value, url: $('#pl-url').value.trim(), notas: $('#pl-notas').value.trim(), variaveis };
      const r = id ? await api('/api/plataformas/' + id, 'PUT', corpoReq) : await api('/api/plataformas', 'POST', corpoReq);
      if (!r.ok) { $('#pl-msg').textContent = r.motivo || 'não deu'; if (r.precisaAdmin) ADMIN.abrir(r.motivo); return; }
      abrir(id ? 'Plataforma salva' + (r.sincronizados && r.sincronizados.length ? '; .env regravado em ' + r.sincronizados.length + ' agente(s). Religue-os para lerem a mudança.' : '.') : 'Plataforma cadastrada. Agora marque quem pode usá-la: ao contratar, ou no monitor do agente.');
    };
    if ($('#pl-remover')) $('#pl-remover').onclick = async () => {
      const quem = p.usadaPor.length ? ' Ela é usada por ' + p.usadaPor.map(nomeDoAgente).join(', ') + ', que vão perder as variáveis dela.' : '';
      $('#pl-msg').innerHTML = `Remover <b>${esc(p.nome)}</b>?${esc(quem)} <button class="btn" id="pl-confirma" style="margin-left:8px;color:#ff7a6b">Sim, remover</button>`;
      $('#pl-confirma').onclick = async () => { const r = await api('/api/plataformas/' + id, 'DELETE'); abrir(r.ok ? 'Plataforma removida.' + (r.usadaPor.length ? ' Religue os agentes que a usavam.' : '') : r.motivo); };
    };
    $('#pl-nome').focus();
  }
  const slugDe = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

  /* ---------------- as caixas do assistente de contratação ---------------- */
  function caixas(selecionadas = []) {
    if (!cache.plataformas.length) return `<p class="hint" style="margin-top:8px">Nenhuma conexão cadastrada. Cadastre em <b>🔌 Conexões</b>, no topo, para os agentes já nascerem conectados.</p>`;
    return `<div class="frow" style="margin-top:8px"><label>Conexões que este agente pode usar</label>
      <div class="opts pl-caixas">${cache.plataformas.map(p => `<label class="opt"><input type="checkbox" class="pl-caixa" value="${esc(p.id)}" ${selecionadas.includes(p.id) ? 'checked' : ''}> ${emoji(p.tipo)} ${esc(p.nome)} <small class="hint">${esc(nomeTipo(p.tipo))}</small></label>`).join('')}</div>
      <span class="hint">Só as marcadas entram no <code>.env</code> dele. Dá para mudar depois, no monitor.</span></div>`;
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
    el.innerHTML = cabeca('🔌 Conexões', semTrilha ? 'sistema cadastrado à mão: o escritório mostra, mas não escreve no .env dele' : 'as plataformas que este agente pode usar; só elas entram no .env dele, no bloco mantido pelo escritório') +
      `<div class="ex-lista">
        ${cache.plataformas.length ? cache.plataformas.map(p => `<label class="opt pl-linha"><input type="checkbox" class="pl-caixa" value="${esc(p.id)}" ${atuais.includes(p.id) ? 'checked' : ''} ${admin ? '' : 'disabled'}>
          <span class="pl-emo">${emoji(p.tipo)}</span><span><b>${esc(p.nome)}</b> <small class="hint">${esc(nomeTipo(p.tipo))}</small>${p.url ? `<br><small class="hint">${esc(p.url)}</small>` : ''}<br><small class="hint">${p.variaveis.map(esc).join(', ')}</small></span></label>`).join('')
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
      $('#pl-painel-msg').textContent = r.ok ? `Salvo: ${r.plataformas.length} plataforma(s), ${r.variaveis.length} variável(is) no bloco. Religue o agente para ele ler o .env novo.` : (r.motivo || 'não deu');
      if (SISTEMAS.atualizar) SISTEMAS.atualizar();
    };
  }

  return { abrir, carregar, caixas, marcadas, painelDoAgente, get lista() { return cache.plataformas; } };
})();
