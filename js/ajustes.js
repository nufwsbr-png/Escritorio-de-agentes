/* ===========================================================
   ajustes.js (navegador) — ⚙️ Ajustes e o aviso de escritório não aberto

   Mostra o que está configurado (sem segredos), o status da conta do Claude
   Code, logo e planta, atalhos e a instrução para refazer a abertura. A
   abertura em si acontece no Claude Code, com /criar-escritorio: a tela só
   aponta para lá.
   =========================================================== */
const AJUSTES = (() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (r) => (await fetch(r)).json();

  const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const COMANDO = '<code>/criar-escritorio</code>';

  function statusClaude(c) {
    if (!c) return '<span class="aj-status off">não consegui consultar</span>';
    if (!c.instalado) return '<span class="aj-status off">Claude Code não encontrado nesta máquina</span> <span class="hint">instale e rode <code>claude auth login</code></span>';
    if (!c.conectado) return '<span class="aj-status warn">instalado, mas sem login</span> <span class="hint">rode <code>claude auth login</code> num terminal, no mesmo usuário do Windows</span>';
    return `<span class="aj-status ok">conectado</span> <span class="hint">${esc(c.conta || '')}${c.metodo ? ' · ' + esc(c.metodo) : ''}. Conversar, Construir, reunião, testador e as rodadas dos agentes de tarefa gastam a cota desta conta.</span>`;
  }

  async function abrir() {
    const corpo = $('#modal-body');
    corpo.innerHTML = '<p class="hint">lendo a configuração…</p>';
    $('#modal').classList.remove('hidden');
    let a = null, c = null;
    try { a = await api('/api/ajustes'); } catch (e) { a = null; }
    try { c = await api('/api/claude'); } catch (e) { c = null; }
    if (!a) { corpo.innerHTML = '<p class="hint">o escritório não respondeu</p>'; return; }
    const admin = ADMIN.ehAdmin();
    const re = a.reuniao || {}, meta = re.meta || {};
    const img = (arq, rotulo) => arq ? `<figure class="aj-fig"><img src="/marca/${esc(arq)}" alt="${rotulo}" onerror="this.parentElement.classList.add('quebrada')"><figcaption>${rotulo}: ${esc(arq)}</figcaption></figure>` : `<figure class="aj-fig vazia"><div></div><figcaption>${rotulo}: não enviado</figcaption></figure>`;
    corpo.innerHTML = `
      <h3 style="font-family:var(--f-display);margin:0 0 6px">⚙️ Ajustes do escritório</h3>
      ${a.aberto ? '' : `<div class="aj-aviso">Este escritório ainda não foi aberto. Abra esta pasta no Claude Code e digite ${COMANDO}: ele faz as dez perguntas e grava tudo.</div>`}
      <div class="aj-grade">
        <div class="aj-bloco"><b>O negócio</b>
          <div>${esc(a.empresa || '—')} <span class="hint">${esc(a.oQueFaz || '')}</span></div>
          <div class="hint">dono: ${esc(a.dono || '—')} · escritório: ${esc(a.nome || '—')} · porta ${esc(a.porta)}</div></div>
        <div class="aj-bloco"><b>Setores para agentes de tarefa</b>
          <div class="hint">${a.setores.length ? a.setores.map(s => esc((s.emoji ? s.emoji + ' ' : '') + s.nome)).join(' · ') : 'os padrões do escritório (Prospecção, Conteúdo, Copy, Financeiro, Dados, QA)'}</div></div>
        <div class="aj-bloco"><b>Plataformas</b>
          <div class="hint">${a.plataformas.length ? a.plataformas.map(p => esc(p.nome)).join(' · ') : 'nenhuma cadastrada'} · <a href="#" id="aj-plat">abrir 🔌 Plataformas</a></div></div>
        <div class="aj-bloco"><b>Conta do Claude Code</b><div>${statusClaude(c)}</div></div>
        <div class="aj-bloco"><b>Tranca</b>
          <div class="hint">${a.temSenhaAdmin ? 'senha de administrador definida: o cliente opera, o administrador constrói' : 'SEM senha de administrador: tudo aberto. Defina em 🔐 Admin antes de entregar'} · <a href="#" id="aj-admin">abrir 🔐 Admin</a></div></div>
        <div class="aj-bloco"><b>Avisos</b>
          <div class="hint">${a.avisos ? `ntfy ${a.avisos.ntfy.ativo ? 'ligado (' + esc(a.avisos.ntfy.topico) + ')' : 'desligado'} · WhatsApp ${a.avisos.whatsapp.ativo ? 'ligado (' + esc(a.avisos.whatsapp.fone) + (a.avisos.whatsapp.temChave ? '' : ', falta a chave do CallMeBot') + ')' : 'desligado'}` : '—'} · <a href="#" id="aj-avisos">abrir 🔔 Avisos</a></div></div>
        <div class="aj-bloco"><b>Reunião</b>
          <div class="hint">${re.automatica ? 'automática, ' + (re.dias || []).map(d => DIAS[d]).join(' e ') + ' às ' + esc(re.hora) + 'h' : 'só quando você clica em Reunir agora'}${meta.descricao ? ' · meta: ' + esc(meta.descricao) + ' ' + esc(meta.feito || 0) + '/' + esc(meta.alvo || 0) + ' ' + esc(meta.unidade || '') : ''}</div></div>
        <div class="aj-bloco"><b>Agentes</b>
          <div class="hint">${a.agentes.length} no registro · exemplo ${a.exemplo === 'presente' ? 'presente' : 'demitido'}</div></div>
      </div>
      <div class="aj-figs">${img(a.marca.logo, 'logo')}${img(a.marca.planta, 'planta')}
        <div class="aj-bloco"><b>Salas</b><div class="hint">${a.plantaSalas ? a.plantaSalas.length + ' salas lidas da planta: ' + a.plantaSalas.map(s => esc(s.nome)).join(', ') : 'as 5 salas padrão do escritório (sem planta)'}</div></div></div>
      <p class="hint" style="margin-top:12px;line-height:1.6"><b>Para mudar qualquer coisa daqui, ou refazer a abertura para outro cliente:</b> abra esta pasta no Claude Code e digite ${COMANDO}. Ele mostra o que está configurado e muda só o que você pedir. A planta nova redesenha as salas.</p>
      <div class="mactions"><button class="btn" id="aj-fechar">Fechar</button></div>`;
    $('#aj-fechar').onclick = () => $('#modal').classList.add('hidden');
    $('#aj-plat').onclick = e => { e.preventDefault(); PLATAFORMAS_UI.abrir(); };
    $('#aj-admin').onclick = e => { e.preventDefault(); ADMIN.abrir(); };
    $('#aj-avisos').onclick = e => { e.preventDefault(); AVISOS_UI.abrir(); };
    if (!admin) { /* o cliente vê tudo isso; só os botões de escrita exigem a senha, e cada modal já cobra */ }
  }

  /* o aviso de "não foi aberto", no topo da tela, quando não há config.json */
  function avisoSemAbertura() {
    const E = window.ESCRITORIO || {};
    const el = $('#sem-abertura');
    if (!el) return;
    el.classList.toggle('hidden', E.aberto !== false);
    el.innerHTML = `Este escritório ainda não foi aberto. Abra esta pasta no Claude Code e digite ${COMANDO}. <a href="#" id="sem-abertura-mais">o que isso faz?</a>`;
    const m = $('#sem-abertura-mais'); if (m) m.onclick = e => { e.preventDefault(); abrir(); };
  }

  return { abrir, avisoSemAbertura };
})();
