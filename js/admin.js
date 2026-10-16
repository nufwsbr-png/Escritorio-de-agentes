/* ===========================================================
   admin.js (navegador) — o cadeado do topo

   Dois perfis: o cliente opera (liga, desliga, lê, conversa em Investigar,
   reúne); o administrador constrói (contrata, cadastra, demite, Resolver,
   Construir, memória, propostas, testador, avisos). Sem senha definida,
   tudo fica aberto e o cadeado aparece aberto, pedindo para definir uma.
   A verificação de verdade é no servidor; aqui só se mostra e se pede.
   =========================================================== */
const ADMIN = (() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (r, m = 'GET', c) => (await fetch(r, { method: m,
    headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined })).json();

  let est = { temSenha: false, admin: true };
  const aoMudar = [];

  async function atualizar() {
    try { est = await api('/api/admin'); } catch (e) { /* servidor fora: fica como está */ }
    pintarBotao();
    aoMudar.forEach(f => { try { f(est); } catch (e) {} });
    return est;
  }

  function pintarBotao() {
    const b = $('#btn-admin');
    if (!b) return;
    if (typeof ICONES !== 'undefined') ICONES.rotular(b, !est.temSenha ? 'destrancado' : 'admin', !est.temSenha || est.admin ? 'Admin' : 'Entrar');
    else b.textContent = !est.temSenha ? '🔓 Admin' : est.admin ? '🔐 Admin' : '🔒 Entrar';
    b.classList.toggle('aberto', !est.temSenha);
    b.title = !est.temSenha ? 'Sem senha de administrador: tudo aberto. Clique para definir uma.'
            : est.admin ? 'Você é o administrador' : 'Entrar como administrador';
  }

  function abrir(motivo) {
    const corpo = $('#modal-body');
    const aviso = motivo ? `<p class="hint" style="color:var(--warn);margin-bottom:12px">${esc(motivo)}</p>` : '';
    if (!est.temSenha) {
      corpo.innerHTML = `
        <h3 style="font-family:var(--f-display);margin:0 0 6px">🔓 Definir a senha de administrador</h3>
        ${aviso}
        <p class="hint" style="margin-bottom:14px;line-height:1.6">Hoje tudo está aberto: quem abrir esta página contrata, cadastra comandos
          e altera projetos. Antes de entregar o escritório a um cliente, defina uma senha. Com ela, o cliente opera
          (ligar, desligar, log, conversar em Investigar, reunião) e só você constrói.</p>
        <div class="frow"><label>Senha (mínimo 6)</label><input id="ad-s1" type="password" autocomplete="new-password"></div>
        <div class="frow"><label>Repita</label><input id="ad-s2" type="password" autocomplete="new-password"></div>
        <div id="ad-msg" class="hint" style="color:#ff7a6b"></div>
        <div class="mactions"><button class="btn primary" id="ad-ok">Definir senha</button><button class="btn" id="ad-no">Agora não</button></div>`;
      $('#modal').classList.remove('hidden');
      $('#ad-no').onclick = () => $('#modal').classList.add('hidden');
      $('#ad-ok').onclick = async () => {
        const a = $('#ad-s1').value, b = $('#ad-s2').value;
        if (a !== b) { $('#ad-msg').textContent = 'as senhas não batem'; return; }
        const r = await api('/api/admin/senha', 'POST', { senha: a });
        if (!r.ok) { $('#ad-msg').textContent = r.motivo || 'não deu'; return; }
        $('#modal').classList.add('hidden');
        await atualizar();
      };
      return;
    }
    if (!est.admin) {
      corpo.innerHTML = `
        <h3 style="font-family:var(--f-display);margin:0 0 6px">🔒 Entrar como administrador</h3>
        ${aviso}
        <p class="hint" style="margin-bottom:14px">Contratar, cadastrar, demitir, Resolver, Construir, memória, propostas e testes pedem a senha.</p>
        <div class="frow"><label>Senha</label><input id="ad-s1" type="password" autocomplete="current-password"></div>
        <div id="ad-msg" class="hint" style="color:#ff7a6b"></div>
        <div class="mactions"><button class="btn primary" id="ad-ok">Entrar</button><button class="btn" id="ad-no">Cancelar</button></div>`;
      $('#modal').classList.remove('hidden');
      $('#ad-no').onclick = () => $('#modal').classList.add('hidden');
      const entrar = async () => {
        const r = await api('/api/admin/entrar', 'POST', { senha: $('#ad-s1').value });
        if (!r.ok) { $('#ad-msg').textContent = r.motivo || 'senha errada'; return; }
        $('#modal').classList.add('hidden');
        await atualizar();
      };
      $('#ad-ok').onclick = entrar;
      $('#ad-s1').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
      $('#ad-s1').focus();
      return;
    }
    corpo.innerHTML = `
      <h3 style="font-family:var(--f-display);margin:0 0 6px">🔐 Administrador</h3>
      <p class="hint" style="margin-bottom:14px;line-height:1.6">Você está como administrador nesta máquina por 7 dias. O cliente, sem a senha,
        só opera: liga, desliga, lê o log, conversa em Investigar e roda a reunião.</p>
      <div class="frow"><label>Trocar a senha</label><input id="ad-s1" type="password" placeholder="nova senha" autocomplete="new-password"></div>
      <div id="ad-msg" class="hint"></div>
      <div class="mactions"><button class="btn" id="ad-troca">Trocar senha</button><button class="btn danger" id="ad-sair">Sair</button></div>`;
    $('#modal').classList.remove('hidden');
    $('#ad-troca').onclick = async () => {
      const r = await api('/api/admin/senha', 'POST', { senha: $('#ad-s1').value });
      $('#ad-msg').textContent = r.ok ? 'Senha trocada.' : (r.motivo || 'não deu');
    };
    $('#ad-sair').onclick = async () => { await api('/api/admin/sair', 'POST', {}); $('#modal').classList.add('hidden'); await atualizar(); };
  }

  /** true se pode seguir; senão abre o cadeado e devolve false */
  function exigir(acao) {
    if (est.admin) return true;
    abrir((acao || 'Isso') + ' é coisa de administrador.');
    return false;
  }

  return { abrir, atualizar, exigir, onChange: f => aoMudar.push(f),
           ehAdmin: () => est.admin, temSenha: () => est.temSenha };
})();
