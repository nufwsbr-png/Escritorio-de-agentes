/* ===========================================================
   crm/painel/app.js — a tela do CRM: login, quadro por etapa, ficha com
   histórico e propostas, tarefas, equipe, painel, importação.
   Sem dependência. Fala só com a API deste CRM.
   =========================================================== */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (rota, metodo = 'GET', corpo) => { const r = await fetch(rota, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined }); const j = await r.json().catch(() => ({ ok: false, motivo: 'resposta inválida' })); if (r.status === 401 && j.precisaEntrar) { mostrarLogin(); } return j; };
  const quando = iso => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  let EU = null, CFG = null, EQUIPE = { pessoas: [], agentes: [] };
  let ESCRITORIO_PORTA = 4321;   // o servidor diz a porta certa em /api/config (escritorioPorta)
  const nomeResp = r => { if (!r) return 'ninguém'; const l = r.tipo === 'pessoa' ? EQUIPE.pessoas : EQUIPE.agentes; const x = l.find(p => p.id === r.id); return x ? x.nome : r.id; };
  const ini = r => r ? '<span class="ini ' + (r.tipo === 'agente' ? 'ag' : '') + '" title="' + esc(r.tipo === 'agente' ? 'agente' : 'pessoa') + '">' + esc(nomeResp(r).slice(0, 1).toUpperCase()) + '</span>' : '';
  const etapaNome = id => (CFG.etapas.find(e => e.id === id) || { nome: id }).nome;

  /* ---------------- marca do escritório, se ele estiver no ar ---------------- */
  function marca() {
    const s = document.createElement('script'); s.src = 'http://localhost:' + ESCRITORIO_PORTA + '/config.js';
    s.onload = () => { const E = window.ESCRITORIO || {}; if (E.empresa) { $('#titulo').textContent = 'CRM · ' + E.empresa; document.title = 'CRM · ' + E.empresa; } if (E.marca && E.marca.logo) $('#logo').innerHTML = '<img src="http://localhost:' + ESCRITORIO_PORTA + '/marca/' + esc(E.marca.logo) + '" alt="">'; };
    s.onerror = () => {}; document.head.appendChild(s);
  }

  /* ---------------- login ---------------- */
  async function mostrarLogin() {
    $('#login').classList.remove('hidden'); $('#main').innerHTML = '';
    try { const p = await api('/api/primeira-senha'); if (p.ok) { $('#primeira').classList.remove('hidden'); $('#primeira').innerHTML = 'Primeira vez: o login do chefe é <code>' + esc(p.login) + '</code> e a senha é <code>' + esc(p.senha) + '</code>. Anote agora: isto não aparece de novo. Troque a senha depois de entrar (🔑).'; $('#lg-login').value = p.login; } } catch (e) {}
  }
  $('#form-login').onsubmit = async (e) => {
    e.preventDefault(); $('#lg-erro').textContent = '';
    const r = await api('/api/entrar', 'POST', { login: $('#lg-login').value, senha: $('#lg-senha').value });
    if (!r.ok) { $('#lg-erro').textContent = r.motivo || 'não deu'; return; }
    $('#login').classList.add('hidden'); $('#lg-senha').value = ''; await iniciar();
    if (r.pessoa.trocarSenha) trocarSenha(true);
  };
  $('#btn-sair').onclick = async () => { await api('/api/sair', 'POST', {}); EU = null; mostrarLogin(); };
  $('#btn-senha').onclick = () => trocarSenha(false);
  function trocarSenha(obrigatoria) {
    abrirModal(`<h3>🔑 Trocar a senha</h3>${obrigatoria ? '<p class="aviso">Esta é a senha inicial: escolha a sua.</p>' : ''}
      <label>Senha atual <input id="s-atual" type="password"></label><label style="margin-top:8px">Senha nova (6 ou mais) <input id="s-nova" type="password"></label>
      <div class="mactions"><button class="btn primary" id="s-ok">Salvar</button><span class="hint" id="s-msg"></span></div>`);
    $('#s-ok').onclick = async () => { const r = await api('/api/senha', 'POST', { atual: $('#s-atual').value, nova: $('#s-nova').value }); $('#s-msg').textContent = r.ok ? 'Senha trocada.' : r.motivo; if (r.ok) setTimeout(fecharModal, 800); };
  }

  /* ---------------- abas ---------------- */
  const abrirModal = html => { $('#modal-body').innerHTML = html; $('#modal').classList.remove('hidden'); };
  const fecharModal = () => $('#modal').classList.add('hidden');
  $('#modal-x').onclick = fecharModal;
  let aba = 'quadro';
  $('#abas').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; aba = b.dataset.aba; for (const x of $('#abas').children) x.classList.toggle('ativa', x === b); pintar(); };
  async function iniciar() {
    const eu = await api('/api/eu'); if (!eu.ok) return;
    EU = eu.eu; CFG = await api('/api/config'); EQUIPE = await api('/api/equipe');
    $('#eu-nome').textContent = EU.nome + ' · ' + (EU.cargoNome || EU.cargo);
    $('#subtitulo').textContent = CFG.entidade.plural + ' · fichas ' + (CFG.onde === 'supabase' ? 'no Supabase' : 'locais');
    await contadores(); await pintar();
  }
  async function contadores() {
    const p = await api('/api/painel'); if (!p.ok) return;
    $('#n-propostas').textContent = p.propostasPendentes || ''; $('#n-tarefas').textContent = p.tarefasAbertas || '';
  }
  async function pintar() {
    const m = $('#main');
    if (aba === 'quadro') return quadro(m);
    if (aba === 'propostas') return propostas(m);
    if (aba === 'tarefas') return tarefas(m);
    if (aba === 'equipe') return equipe(m);
    if (aba === 'painel') return painel(m);
    if (aba === 'importar') return importar(m);
  }

  /* ---------------- o quadro ---------------- */
  let filtro = { minhas: false, parado: '', q: '', status: '' };
  async function quadro(m) {
    const qs = new URLSearchParams(); if (filtro.minhas) qs.set('minhas', '1'); if (filtro.parado) qs.set('parado', filtro.parado); if (filtro.q) qs.set('q', filtro.q); if (filtro.status) qs.set('status', filtro.status);
    const r = await api('/api/fichas?' + qs); if (!r.ok) return;
    const colunas = CFG.etapas.map(e => `<div class="coluna" data-etapa="${esc(e.id)}"><h4><span>${esc(e.nome)}${e.aprovacao ? ' 👁' : ''}</span><span>${r.fichas.filter(f => f.etapa === e.id).length}</span></h4>${r.fichas.filter(f => f.etapa === e.id).map(cartao).join('')}</div>`).join('');
    m.innerHTML = `<div class="barra">
        <button class="btn primary" id="q-nova">＋ ${esc(CFG.entidade.singular)}</button>
        <input id="q-busca" placeholder="buscar" value="${esc(filtro.q)}" style="width:180px">
        <label style="flex-direction:row;align-items:center;gap:6px;text-transform:none;letter-spacing:0"><input type="checkbox" id="q-minhas" ${filtro.minhas ? 'checked' : ''}> só as minhas</label>
        <select id="q-parado"><option value="">todas</option><option value="3" ${filtro.parado === '3' ? 'selected' : ''}>paradas há 3+ dias</option><option value="7" ${filtro.parado === '7' ? 'selected' : ''}>paradas há 7+ dias</option></select>
        <select id="q-status"><option value="">ativas</option><option value="perdida" ${filtro.status === 'perdida' ? 'selected' : ''}>perdidas</option><option value="arquivada" ${filtro.status === 'arquivada' ? 'selected' : ''}>arquivadas</option></select>
        <span class="hint">${r.fichas.length} ${esc(r.fichas.length === 1 ? CFG.entidade.singular : CFG.entidade.plural)}${EU.permissoes && EU.permissoes.mover ? ' · arraste para mover' : ''}</span></div>
      <div class="quadro">${colunas}</div>`;
    $('#q-nova').onclick = () => novaFicha();
    $('#q-busca').onchange = () => { filtro.q = $('#q-busca').value; quadro(m); };
    $('#q-minhas').onchange = () => { filtro.minhas = $('#q-minhas').checked; quadro(m); };
    $('#q-parado').onchange = () => { filtro.parado = $('#q-parado').value; quadro(m); };
    $('#q-status').onchange = () => { filtro.status = $('#q-status').value; quadro(m); };
    for (const c of m.querySelectorAll('.cartao')) {
      c.onclick = () => ficha(c.dataset.id);
      c.draggable = !!(EU.permissoes && EU.permissoes.mover);
      c.ondragstart = (e) => { e.dataTransfer.setData('text/plain', c.dataset.id); };
    }
    for (const col of m.querySelectorAll('.coluna')) {
      col.ondragover = (e) => { e.preventDefault(); col.classList.add('sobre'); };
      col.ondragleave = () => col.classList.remove('sobre');
      col.ondrop = async (e) => { e.preventDefault(); col.classList.remove('sobre'); const id = e.dataTransfer.getData('text/plain'); const r = await api('/api/fichas/' + id + '/mover', 'POST', { etapa: col.dataset.etapa }); if (!r.ok) alerta(r.motivo); quadro(m); contadores(); };
    }
  }
  const cartao = f => `<div class="cartao ${f.diasParada >= 7 && f.status === 'ativa' ? 'parada' : ''} ${f.status !== 'ativa' ? 'perdida' : ''}" data-id="${esc(f.id)}"><b>${esc(f.campos.nome || f.chave)}</b>
      <div class="meta"><span class="resp">${ini(f.responsavel)} ${esc(nomeResp(f.responsavel))}</span><span>${f.propostasPendentes ? '<span class="prop">' + f.propostasPendentes + ' proposta' + (f.propostasPendentes > 1 ? 's' : '') + '</span> · ' : ''}${f.diasParada ? f.diasParada + ' d' : 'hoje'}</span></div></div>`;
  function alerta(t) { abrirModal('<p>' + esc(t) + '</p><div class="mactions"><button class="btn" id="al-ok">Ok</button></div>'); $('#al-ok').onclick = fecharModal; }

  /* ---------------- ficha nova ---------------- */
  function novaFicha() {
    abrirModal(`<h3>＋ ${esc(CFG.entidade.singular)}</h3><div class="campos">
      ${CFG.campos.map(c => `<label class="${c === 'observacoes' ? 'largo' : ''}">${esc(c)}${c === CFG.entidade.chave ? ' (chave)' : ''}${c === 'observacoes' ? '<textarea id="nf-' + c + '"></textarea>' : '<input id="nf-' + c + '">'}</label>`).join('')}
      <label>etapa <select id="nf-etapa">${CFG.etapas.map(e => '<option value="' + esc(e.id) + '">' + esc(e.nome) + '</option>').join('')}</select></label></div>
      <div class="mactions"><button class="btn primary" id="nf-ok">Criar</button><span class="hint" id="nf-msg"></span></div>`);
    $('#nf-ok').onclick = async () => {
      const campos = {}; for (const c of CFG.campos) campos[c] = $('#nf-' + c).value;
      const r = await api('/api/fichas', 'POST', { campos, chave: campos[CFG.entidade.chave] || campos.telefone, etapa: $('#nf-etapa').value });
      $('#nf-msg').textContent = r.ok ? (r.existente ? 'Já existia: abrindo a ficha.' : 'Criada.') : (r.motivo || 'não deu');
      if (r.ok) { fecharModal(); if (r.ficha) ficha(r.ficha.id); else quadro($('#main')); }
    };
  }

  /* ---------------- a ficha ---------------- */
  async function ficha(id) {
    const r = await api('/api/fichas/' + id); if (!r.ok) return alerta(r.motivo);
    const f = r.ficha; const P = EU.permissoes || {};
    const campos = [...new Set([...CFG.campos, ...Object.keys(f.campos || {})])];
    const resp = [...EQUIPE.pessoas.filter(p => p.ativa).map(p => ({ tipo: 'pessoa', id: p.id, nome: p.nome })), ...EQUIPE.agentes.map(a => ({ tipo: 'agente', id: a.id, nome: a.nome + ' (agente)' }))];
    abrirModal(`<h3>${esc(f.campos.nome || f.chave)} <span class="estado ${f.status === 'ativa' ? 'ok' : 'bad'}">${esc(f.status)}</span></h3>
      <p class="hint">${esc(CFG.entidade.singular)} · etapa <b>${esc(etapaNome(f.etapa))}</b> · com ${ini(f.responsavel)} ${esc(nomeResp(f.responsavel))} · criada ${quando(f.criadaEm)} · mexida ${quando(f.atualizadaEm)}</p>
      <div class="ficha"><div>
        <div class="campos">${campos.map(c => `<label class="${c === 'observacoes' ? 'largo' : ''}">${esc(c)}${(CFG.sensiveis || []).includes(c) ? ' 🔒' : ''}<input id="fc-${esc(c)}" value="${esc(f.campos[c] || '')}" ${P.editar ? '' : 'disabled'}></label>`).join('')}</div>
        ${P.editar ? '<div class="mactions"><button class="btn" id="fc-salvar">Salvar campos</button><input id="fc-novo" placeholder="novo campo" style="width:120px"></div>' : ''}
        <div class="mactions" style="flex-wrap:wrap">
          ${P.mover ? '<select id="f-etapa">' + CFG.etapas.map(e => '<option value="' + esc(e.id) + '" ' + (e.id === f.etapa ? 'selected' : '') + '>' + esc(e.nome) + '</option>').join('') + '</select><button class="btn" id="f-mover">Mover</button>' : ''}
          ${P.mover ? '<select id="f-resp">' + resp.map(x => '<option value="' + esc(x.tipo + ':' + x.id) + '" ' + (f.responsavel && f.responsavel.tipo === x.tipo && f.responsavel.id === x.id ? 'selected' : '') + '>' + esc(x.nome) + '</option>').join('') + '</select><button class="btn" id="f-atribuir" title="assumir ou devolver: quem está com a ficha">Passar para</button>' : ''}
          ${P.mover && f.status === 'ativa' ? '<button class="btn danger" id="f-perder">Perdido</button>' : ''}
          ${P.mover && f.status !== 'ativa' ? '<button class="btn" id="f-reativar">Reativar</button>' : ''}
          ${P.mover && f.status !== 'arquivada' ? '<button class="btn ghost" id="f-arquivar">Arquivar</button>' : ''}
        </div>
        ${P.editar ? '<div class="mactions"><input id="f-nota" placeholder="anotar na ficha" style="flex:1"><button class="btn" id="f-anotar">Anotar</button></div>' : ''}
        ${P.editar ? '<div class="mactions"><input id="f-tarefa" placeholder="nova tarefa" style="flex:1"><input id="f-prazo" type="date" style="width:150px"><button class="btn" id="f-tarefa-ok">Tarefa</button></div>' : ''}
        ${P.editar && EQUIPE.agentes.length ? '<div class="mactions" title="ação direta: o agente roda a ferramenta na hora, por código, sem o modelo"><select id="ad-agente">' + EQUIPE.agentes.map(a => '<option value="' + esc(a.id) + '">' + esc(a.nome) + '</option>').join('') + '</select><select id="ad-ferr"><option value="">ferramenta…</option></select><input id="ad-args" placeholder="argumentos" style="flex:1"><button class="btn" id="ad-ok">Pedir agora</button></div><p class="hint" id="ad-uso"></p>' : ''}
        ${f.tarefas.length ? '<div class="lista" style="margin-top:10px">' + f.tarefas.map(t => '<div class="item" style="padding:6px 10px">' + (t.feita ? '✅ ' : '⬜ ') + esc(t.titulo) + ' <span class="hint">para ' + esc(nomeResp(t.para)) + (t.prazo ? ' até ' + esc(t.prazo) : '') + '</span>' + (!t.feita && (t.para.id === EU.id || P.aprovar) ? ' <button class="btn small" data-feita="' + esc(t.id) + '">feita</button>' : '') + '</div>').join('') + '</div>' : ''}
      </div><div>
        ${f.propostas.filter(p => p.estado === 'pendente').map(p => `<div class="item proposta"><b>${esc(p.autor.nome)}</b> quer <b>${esc(p.texto)}</b><div class="hint">${esc(p.motivo)} · ${quando(p.criadaEm)}</div>${P.aprovar ? `<div class="acoes"><button class="btn primary small" data-ap="${esc(p.id)}">Aprovar</button><button class="btn small" data-rj="${esc(p.id)}">Rejeitar</button></div>` : ''}</div>`).join('')}
        <h4 style="margin:8px 0 6px">Histórico</h4>
        <div class="hist">${f.historico.slice().reverse().map(h => `<div><span class="q">${quando(h.quando)} · ${esc(h.autor.nome)}${h.autor.tipo === 'agente' ? ' (agente)' : ''}</span><br>${esc(h.texto)}</div>`).join('') || '<span class="hint">nada ainda</span>'}</div>
        ${f.feitoPeloDono && f.feitoPeloDono.length ? '<p class="hint" style="margin-top:6px">Feito por pessoa (decisão final para o agente): ' + f.feitoPeloDono.map(x => esc(x.por + ': ' + x.texto)).join('; ') + '</p>' : ''}
      </div></div><p class="hint" id="f-msg" style="margin-top:8px"></p>`);
    const acao = async (rota, corpo) => { const r = await api('/api/fichas/' + f.id + '/' + rota, 'POST', corpo); $('#f-msg').textContent = r.ok ? (r.proposta ? 'Virou proposta: ' + r.motivo : 'Feito.') : (r.motivo || 'não deu'); if (r.ok) { setTimeout(() => ficha(f.id), 300); quadro($('#main')); contadores(); } };
    const on = (sel, fn) => { const el = $(sel); if (el) el.onclick = fn; };
    on('#fc-salvar', async () => { for (const c of campos) { const v = $('#fc-' + c).value; if (v !== (f.campos[c] || '')) await api('/api/fichas/' + f.id + '/campo', 'POST', { campo: c, valor: v }); } const n = $('#fc-novo').value.trim(); if (n) await api('/api/fichas/' + f.id + '/campo', 'POST', { campo: n, valor: '' }); ficha(f.id); });
    on('#f-mover', () => acao('mover', { etapa: $('#f-etapa').value }));
    on('#f-atribuir', () => { const [tipo, id] = $('#f-resp').value.split(':'); const obs = tipo === 'agente' && f.responsavel && f.responsavel.tipo === 'pessoa' ? prompt('O que você fez nesta ficha? (vai para o agente como decisão final; pode ficar vazio)') || '' : ''; acao('atribuir', { responsavel: { tipo, id }, observacao: obs }); });
    on('#f-perder', () => { const motivo = prompt('Motivo (opcional):') || ''; acao('perder', { motivo }); });
    on('#f-reativar', () => acao('reativar', {}));
    on('#f-arquivar', () => acao('arquivar', {}));
    on('#f-anotar', () => acao('anotar', { texto: $('#f-nota').value }));
    const adAg = $('#ad-agente');
    if (adAg) {
      const carregar = async () => { const r = await api('/api/acoes/ferramentas', 'POST', { agente: adAg.value }); const sel = $('#ad-ferr'); sel.innerHTML = '<option value="">ferramenta…</option>' + (r.ok ? r.ferramentas.filter(x => x.nome !== 'crm').map(x => '<option value="' + esc(x.nome) + '">' + esc(x.nome) + '</option>').join('') : ''); $('#ad-uso').textContent = r.ok ? '' : (r.motivo || 'o escritório não respondeu'); sel.onchange = () => { const f = (r.ferramentas || []).find(x => x.nome === sel.value); $('#ad-uso').textContent = f && f.uso ? f.uso.join(' · ') : ''; }; };
      adAg.onchange = carregar; carregar();
      $('#ad-ok').onclick = async () => { const args = ($('#ad-args').value.match(/"[^"]*"|S+/g) || []).map(s => s.replace(/^"|"$/g, '')); $('#f-msg').textContent = 'pedindo ao agente…'; const r = await api('/api/acoes', 'POST', { agente: adAg.value, ferramenta: $('#ad-ferr').value, args, fichaId: f.id }); $('#f-msg').textContent = r.ok ? 'Feito' + (r.resultado ? ': ' + r.resultado.detalhe : '') + (r.modo === 'proposta' ? ' (em modo proposta: o agente ainda não tem o real ligado)' : '') : 'Não deu: ' + (r.motivo || ''); setTimeout(() => ficha(f.id), 1200); };
    }
    on('#f-tarefa-ok', async () => { const r = await api('/api/tarefas', 'POST', { fichaId: f.id, titulo: $('#f-tarefa').value, prazo: $('#f-prazo').value }); $('#f-msg').textContent = r.ok ? 'Tarefa criada.' : r.motivo; if (r.ok) setTimeout(() => ficha(f.id), 300); });
    for (const b of document.querySelectorAll('[data-feita]')) b.onclick = async () => { await api('/api/tarefas/' + b.dataset.feita + '/feita', 'POST', {}); ficha(f.id); contadores(); };
    for (const b of document.querySelectorAll('[data-ap]')) b.onclick = async () => { const r = await api('/api/propostas/' + b.dataset.ap + '/aprovar', 'POST', {}); if (!r.ok) alerta(r.motivo); else { ficha(f.id); quadro($('#main')); contadores(); } };
    for (const b of document.querySelectorAll('[data-rj]')) b.onclick = async () => { const motivo = prompt('Por que não? (vai para o agente)') || ''; const r = await api('/api/propostas/' + b.dataset.rj + '/rejeitar', 'POST', { motivo }); if (!r.ok) alerta(r.motivo); else { ficha(f.id); contadores(); } };
  }

  /* ---------------- propostas, tarefas, equipe, painel, importar ---------------- */
  async function propostas(m) {
    const r = await api('/api/propostas?estado=' + (m.dataset.todas ? 'todas' : 'pendente')); if (!r.ok) return;
    m.innerHTML = `<div class="barra"><b>Propostas dos agentes</b><span class="hint">o que um agente quer fazer e precisa de uma pessoa</span><button class="btn ghost small" id="p-todas">${m.dataset.todas ? 'só pendentes' : 'ver decididas'}</button></div>
      <div class="lista">${r.propostas.map(p => `<div class="item proposta"><b>${esc(p.autor.nome)}</b> quer <b>${esc(p.texto)}</b> <span class="estado ${p.estado === 'pendente' ? 'warn' : p.estado === 'aprovada' ? 'ok' : 'bad'}">${esc(p.estado)}</span><div class="hint">${esc(p.motivo)} · ${quando(p.criadaEm)}${p.decidida ? ' · ' + esc(p.estado) + ' por ' + esc(p.decidida.por.nome) + (p.decidida.motivo ? ': ' + esc(p.decidida.motivo) : '') : ''}</div>
        <div class="acoes">${p.fichaId ? '<button class="btn small" data-f="' + esc(p.fichaId) + '">abrir a ficha</button>' : ''}${p.estado === 'pendente' && EU.permissoes.aprovar ? `<button class="btn primary small" data-ap="${esc(p.id)}">Aprovar</button><button class="btn small" data-rj="${esc(p.id)}">Rejeitar</button>` : ''}</div></div>`).join('') || '<p class="hint">Nenhuma proposta pendente.</p>'}</div>`;
    $('#p-todas').onclick = () => { m.dataset.todas = m.dataset.todas ? '' : '1'; propostas(m); };
    for (const b of m.querySelectorAll('[data-f]')) b.onclick = () => ficha(b.dataset.f);
    for (const b of m.querySelectorAll('[data-ap]')) b.onclick = async () => { const r = await api('/api/propostas/' + b.dataset.ap + '/aprovar', 'POST', {}); if (!r.ok) alerta(r.motivo); propostas(m); contadores(); };
    for (const b of m.querySelectorAll('[data-rj]')) b.onclick = async () => { const motivo = prompt('Por que não?') || ''; const r = await api('/api/propostas/' + b.dataset.rj + '/rejeitar', 'POST', { motivo }); if (!r.ok) alerta(r.motivo); propostas(m); contadores(); };
  }
  async function tarefas(m) {
    const r = await api('/api/tarefas?abertas=1'); if (!r.ok) return;
    const hoje = new Date().toISOString().slice(0, 10);
    m.innerHTML = `<div class="barra"><b>Tarefas abertas</b><span class="hint">de pessoas e de agentes; as de agente ele cumpre na próxima rodada</span></div>
      <div class="lista">${r.tarefas.map(t => `<div class="item ${t.prazo && t.prazo < hoje ? 'proposta' : ''}">⬜ <b>${esc(t.titulo)}</b> <span class="hint">para ${esc(nomeResp(t.para))}${t.prazo ? ' · até ' + esc(t.prazo) + (t.prazo < hoje ? ' (vencida)' : '') : ''} · por ${esc(t.criadaPor.nome)}</span>
        <div class="acoes">${t.fichaId ? '<button class="btn small" data-f="' + esc(t.fichaId) + '">ficha</button>' : ''}${(t.para.id === EU.id || EU.permissoes.aprovar) ? '<button class="btn primary small" data-feita="' + esc(t.id) + '">feita</button>' : ''}</div></div>`).join('') || '<p class="hint">Nenhuma tarefa aberta.</p>'}</div>`;
    for (const b of m.querySelectorAll('[data-f]')) b.onclick = () => ficha(b.dataset.f);
    for (const b of m.querySelectorAll('[data-feita]')) b.onclick = async () => { const res = prompt('Resultado (opcional):') || ''; await api('/api/tarefas/' + b.dataset.feita + '/feita', 'POST', { resultado: res }); tarefas(m); contadores(); };
  }
  async function equipe(m) {
    EQUIPE = await api('/api/equipe'); if (!EQUIPE.ok) return;
    const cor = e => /no ar/.test(e) ? 'ok' : /treinamento|subindo/.test(e) ? 'warn' : 'bad';
    m.innerHTML = `<div class="barra"><b>Equipe</b><span class="hint">pessoas entram com login; agentes são funcionários com cargo. Contratar, treinar e dar plataforma é no escritório.</span></div>
      <div class="grade">${EQUIPE.pessoas.map(p => `<div class="item"><span class="ini">${esc(p.nome.slice(0, 1).toUpperCase())}</span> <b>${esc(p.nome)}</b><div class="hint">${esc(p.cargoNome)}${p.ativa ? '' : ' · desativada'}</div></div>`).join('')}
      ${EQUIPE.agentes.map(a => `<div class="item"><span class="ini ag">${esc(a.nome.slice(0, 1).toUpperCase())}</span> <b>${esc(a.nome)}</b> <span class="estado ${cor(a.estado)}">${esc(a.estado)}</span><div class="hint">${esc(a.cargoNome)} · agente${a.setor ? ' · ' + esc(a.setor) : ''} · <a href="${esc(a.monitor)}" target="_blank" rel="noopener">monitor no escritório</a></div></div>`).join('')}</div>
      ${EQUIPE.escritorioNoAr ? '' : '<p class="hint" style="margin-top:10px">O escritório não está no ar: o estado dos agentes não pôde ser lido.</p>'}`;
  }
  async function painel(m) {
    const p = await api('/api/painel'); if (!p.ok) return;
    m.innerHTML = `<div class="grade">
      <div class="num"><b>${p.ativas}</b><span>${esc(p.entidade.plural)} ativos</span></div>
      <div class="num"><b>${p.novas7d}</b><span>novos em 7 dias</span></div>
      <div class="num"><b>${p.paradas7d}</b><span>parados há 7+ dias</span></div>
      <div class="num"><b>${p.propostasPendentes}</b><span>propostas pendentes</span></div>
      <div class="num"><b>${p.tarefasAbertas}</b><span>tarefas abertas${p.tarefasVencidas ? ' (' + p.tarefasVencidas + ' vencidas)' : ''}</span></div>
      <div class="num"><b>${p.perdidas}</b><span>perdidos</span></div></div>
      <h4 style="margin:14px 0 6px">Por etapa</h4><div class="grade">${p.porEtapa.map(e => `<div class="num"><b>${e.total}</b><span>${esc(e.nome)}</span></div>`).join('')}</div>`;
  }
  function importar(m) {
    if (!EU.permissoes.editar) { m.innerHTML = '<p class="hint">O seu cargo não importa.</p>'; return; }
    m.innerHTML = `<div class="barra"><b>Importar uma planilha</b><span class="hint">CSV com cabeçalho (vírgula ou ponto e vírgula). Fichas com a mesma chave (${esc(CFG.entidade.chave)}) não duplicam.</span></div>
      <label>Arquivo CSV <input type="file" id="im-arq" accept=".csv,text/csv"></label>
      <div id="im-mapa" class="campos" style="margin-top:10px"></div>
      <div class="mactions"><label>etapa <select id="im-etapa">${CFG.etapas.map(e => '<option value="' + esc(e.id) + '">' + esc(e.nome) + '</option>').join('')}</select></label><button class="btn primary" id="im-ok" disabled>Importar</button><span class="hint" id="im-msg"></span></div>`;
    let csv = '';
    $('#im-arq').onchange = async () => { const f = $('#im-arq').files[0]; if (!f) return; csv = await f.text(); const cab = csv.split(/\r?\n/)[0].split(/[;,]/).map(s => s.replace(/^"|"$/g, '').trim());
      $('#im-mapa').innerHTML = CFG.campos.map(c => `<label>${esc(c)} ← coluna <select data-campo="${esc(c)}"><option value="">(nenhuma)</option>${cab.map(h => '<option value="' + esc(h) + '" ' + (h.toLowerCase() === c ? 'selected' : '') + '>' + esc(h) + '</option>').join('')}</select></label>`).join(''); $('#im-ok').disabled = false; };
    $('#im-ok').onclick = async () => { const mapa = {}; for (const s of $('#im-mapa').querySelectorAll('select')) if (s.value) mapa[s.dataset.campo] = s.value; $('#im-msg').textContent = 'importando…'; const r = await api('/api/importar', 'POST', { csv, mapa, etapa: $('#im-etapa').value }); $('#im-msg').textContent = r.ok ? `${r.criadas} criadas, ${r.repetidas} já existiam, ${r.semChave} sem chave.` : r.motivo; contadores(); };
  }

  fetch('/saude').then(r => r.json()).then(s => { if (s.escritorioPorta) ESCRITORIO_PORTA = s.escritorioPorta; }).catch(() => {}).finally(marca);
  api('/api/eu').then(r => { if (r.ok) iniciar(); else mostrarLogin(); });
})();
