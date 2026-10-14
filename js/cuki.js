/* ===========================================================
   cuki.js — 🩺 Cuki BOT, a IA analista: o laudo na tela

   Mostra o último laudo (semáforo por área, o que fazer antes, a leitura e
   as propostas para o CRM) e deixa o administrador rodar uma análise nova.
   O servidor mede por código e pede a leitura ao Claude Code sem ferramentas.
   =========================================================== */
const CUKI = (() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (r, m = 'GET') => (await fetch(r, { method: m, headers: { 'Content-Type': 'application/json' } })).json();
  const NOME = { agentes: 'Agentes', plataformas: 'Plataformas', fluxo: 'Fluxo', base: 'Base', aptidao: 'Aptidão para o CRM' };
  let timer = null;

  /** markdown pequeno: títulos, tabela, listas, negrito, código */
  function md(t) {
    const linhas = esc(t).split(/\r?\n/);
    let html = '', tabela = [], lista = null;
    const fechaLista = () => { if (lista) { html += '</' + lista + '>'; lista = null; } };
    const fechaTabela = () => { if (tabela.length) { const [cab, , ...corpo] = tabela; html += '<table class="ck-tab"><thead><tr>' + cab.map(c => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' + corpo.map(l => '<tr>' + l.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table>'; tabela = []; } };
    const inline = s => s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    for (const l of linhas) {
      if (/^\|/.test(l)) { fechaLista(); tabela.push(l.replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim()))); continue; }
      fechaTabela();
      if (/^#{1,3} /.test(l)) { fechaLista(); const n = l.match(/^#+/)[0].length; html += '<h' + (n + 2) + '>' + inline(l.replace(/^#+ /, '')) + '</h' + (n + 2) + '>'; }
      else if (/^\d+\. /.test(l)) { if (lista !== 'ol') { fechaLista(); html += '<ol>'; lista = 'ol'; } html += '<li>' + inline(l.replace(/^\d+\. /, '')) + '</li>'; }
      else if (/^[-*] /.test(l)) { if (lista !== 'ul') { fechaLista(); html += '<ul>'; lista = 'ul'; } html += '<li>' + inline(l.replace(/^[-*] /, '')) + '</li>'; }
      else if (l.trim()) { fechaLista(); html += '<p>' + inline(l) + '</p>'; }
      else fechaLista();
    }
    fechaLista(); fechaTabela();
    return html;
  }

  async function abrir() {
    const corpo = $('#modal-body');
    corpo.innerHTML = '<p class="hint">o Cuki BOT está lendo o último laudo…</p>';
    $('#modal').classList.remove('hidden');
    clearInterval(timer);
    await pintar();
    timer = setInterval(async () => { if ($('#modal').classList.contains('hidden') || !$('#ck-raiz')) { clearInterval(timer); return; } await pintar(true); }, 3000);
  }

  async function pintar(soSeRodando) {
    let e; try { e = await api('/api/cuki/laudo'); } catch (x) { e = { rodando: false, ultimo: null, historico: [] }; }
    if (soSeRodando && !e.rodando && $('#ck-raiz') && $('#ck-raiz').dataset.nome === String(e.ultimo && e.ultimo.nome)) return;
    const admin = ADMIN.ehAdmin();
    const u = e.ultimo;
    $('#modal-body').innerHTML = `
      <div id="ck-raiz" data-nome="${esc(u ? u.nome : '')}">
      <h3 style="font-family:var(--f-display);margin:0 0 4px">🩺 Cuki BOT, a IA analista</h3>
      <p class="hint" style="margin-bottom:12px">Confere a saúde dos agentes, das plataformas, do fluxo e da base, e diz se o escritório está apto para o CRM. Mede por código e explica em palavras simples. Nenhuma chave passa por ele.</p>
      ${e.rodando ? '<div class="cv-pensando" style="margin-bottom:10px"><i></i>analisando o escritório… a leitura pelo Claude pode levar um ou dois minutos</div>' : ''}
      ${u ? `<div class="ck-semaforo">${['agentes', 'plataformas', 'fluxo', 'base', 'aptidao'].map(k => `<div class="ck-area ${esc(u.areas[k].cor)}"><b>${NOME[k]}</b><span>${esc(u.areas[k].cor)}</span><small>${esc((u.areas[k].motivos || []).slice(0, 2).join('; '))}</small></div>`).join('')}</div>
        <p class="hint">Laudo de ${esc(new Date(u.quando).toLocaleString('pt-BR'))} · geral: <b class="ck-${esc(u.geral)}">${esc(u.geral)}</b>${e.historico.length > 1 ? ' · ' + e.historico.length + ' laudos guardados em <code>data/cuki/laudos/</code>' : ''}</p>
        <div class="ck-laudo">${md(u.texto)}</div>`
        : '<p class="hint">Nenhum laudo ainda.' + (admin ? ' Clique em "Analisar agora".' : ' O administrador roda a primeira análise.') + '</p>'}
      <div class="mactions">${admin ? `<button class="btn primary" id="ck-rodar" ${e.rodando ? 'disabled' : ''}>${u ? 'Analisar de novo' : 'Analisar agora'}</button><button class="btn" id="ck-wa" title="O WhatsApp do Cuki BOT: avisos e conversa com os números autorizados">📱 WhatsApp${e.whatsapp && e.whatsapp.pronto ? ' · ligado' : ''}</button>` : (e.whatsapp && e.whatsapp.pronto ? '<span class="hint">📱 O Cuki BOT também responde no WhatsApp dos números autorizados.</span>' : '')}<span class="hint" id="ck-msg"></span></div>
      </div>`;
    const b = $('#ck-rodar');
    if (b) b.onclick = async () => { b.disabled = true; const r = await api('/api/cuki/analisar', 'POST'); if (!r.ok) { $('#ck-msg').textContent = r.motivo || 'não deu'; if (r.precisaAdmin) ADMIN.abrir(r.motivo); b.disabled = false; return; } $('#ck-msg').textContent = 'analisando…'; setTimeout(() => pintar(), 800); };
    const w = $('#ck-wa'); if (w) w.onclick = () => { clearInterval(timer); ajustes(); };
  }

  /* ---------------- 📱 o WhatsApp do Cuki BOT (WAHA), só administrador ---------------- */
  const post = (r, c) => fetch(r, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c || {}) }).then(x => x.json());
  async function ajustes() {
    clearInterval(timer);
    const corpo = $('#modal-body');
    corpo.innerHTML = '<p class="hint">lendo a configuração…</p>';
    $('#modal').classList.remove('hidden');
    let c; try { c = await api('/api/cuki/config'); } catch (x) { c = null; }
    if (!c || c.precisaAdmin) { corpo.innerHTML = '<p class="hint">' + esc((c && c.motivo) || 'o escritório não respondeu') + '</p><div class="mactions"><button class="btn" id="ckw-admin">🔐 Entrar como administrador</button></div>'; const b = $('#ckw-admin'); if (b) b.onclick = () => ADMIN.abrir(); return; }
    const PAPEL = { dono: 'dono', equipe: 'equipe' };
    corpo.innerHTML = `
      <h3 style="font-family:var(--f-display);margin:0 0 4px">📱 Cuki BOT no WhatsApp</h3>
      <p class="hint" style="margin-bottom:12px;line-height:1.6">Um número de WhatsApp só do Cuki BOT, pelo <b>WAHA</b> (servidor gratuito que roda em Docker). Ele avisa os números autorizados do que acontece no escritório e responde às perguntas deles: como estão os agentes, o que espera aprovação, o briefing do dia. Ele informa; para agir, a pessoa usa esta tela. Nenhuma chave passa pela conversa.</p>
      <div class="aj-grade">
        <div class="aj-bloco"><b>1. O servidor WAHA</b>
          <div class="frow" style="margin:6px 0 0"><label>Endereço (WAHA_URL)</label><input id="ckw-url" placeholder="http://localhost:3000" value="${esc(c.waha.url)}"></div>
          <div class="row" style="display:flex;gap:8px"><div class="frow" style="flex:1"><label>Chave (WAHA_KEY)</label><input id="ckw-chave" type="password" placeholder="${c.waha.temChave ? 'já guardada; cole para trocar' : 'a chave X-Api-Key do WAHA'}"></div>
          <div class="frow" style="width:120px"><label>Sessão</label><input id="ckw-sessao" value="${esc(c.waha.sessao)}"></div></div>
          <div class="hint">Para subir o WAHA nesta máquina: <code>docker run -d --name waha -p 3000:3000 -e WHATSAPP_API_KEY=umachave devlikeapro/waha</code>. Depois, Testar: se pedir QR, escaneie com o celular do Cuki BOT (WhatsApp › Dispositivos conectados).</div>
          <div class="mactions" style="margin-top:8px"><button class="btn primary" id="ckw-salvar">Salvar</button><button class="btn" id="ckw-testar">Testar</button></div>
          <div id="ckw-estado" class="hint" style="margin-top:8px"></div>
        </div>
        <div class="aj-bloco"><b>2. Quem recebe avisos e pode conversar</b>
          <div id="ckw-lista">${c.autorizados.length ? c.autorizados.map(a => `<div class="ckw-item"><span><b style="display:inline;text-transform:none;letter-spacing:0;font-size:13px;color:inherit">${esc(a.nome)}</b> · ${esc(a.numero)} · ${esc(PAPEL[a.papel] || a.papel)}</span><button class="btn ghost danger" data-n="${esc(a.numero)}" title="tirar da lista">✕</button></div>`).join('') : '<div class="hint">ninguém ainda: só números desta lista recebem resposta; os outros são ignorados e anotados</div>'}</div>
          <div class="row" style="display:flex;gap:6px;margin-top:8px"><input id="ckw-nome" placeholder="nome" style="flex:1"><input id="ckw-num" placeholder="5565999999999" style="flex:1"><select id="ckw-papel" style="width:90px"><option value="dono">dono</option><option value="equipe">equipe</option></select><button class="btn" id="ckw-add">＋</button></div>
          <div class="hint" style="margin-top:6px">Número com DDI e DDD, só dígitos. O dono vê tudo; a equipe também, por enquanto (os cargos vêm com o CRM).</div>
          <div class="mactions" style="margin-top:8px"><button class="btn" id="ckw-teste-msg" ${c.pronto ? '' : 'disabled'}>Mandar um teste</button><button class="btn" id="ckw-briefing" ${c.pronto ? '' : 'disabled'}>Mandar o briefing agora</button></div>
        </div>
        <div class="aj-bloco"><b>3. Como as mensagens chegam</b>
          <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="ckw-busca" ${c.busca.ativa ? 'checked' : ''}> Buscar no WAHA a cada poucos segundos (funciona em qualquer rede; é o padrão)</label>
          <div class="hint">Resposta na hora, opcional: registrar um <b>webhook</b> no WAHA. Só funciona se o WAHA alcança o escritório; de dentro do Docker, ele não alcança <code>localhost</code>. Endereço do escritório visto pelo WAHA:</div>
          <div class="row" style="display:flex;gap:6px;margin-top:6px"><input id="ckw-host" placeholder="${esc(c.webhook.host)}" value="${esc(c.webhook.host)}" style="flex:1"><button class="btn" id="ckw-webhook">Registrar webhook</button></div>
          <div class="hint" style="margin-top:6px">${c.webhook.registradoEm ? 'registrado em ' + esc(new Date(c.webhook.registradoEm).toLocaleString('pt-BR')) + '. ' : ''}Para configurar à mão no WAHA: <code>WHATSAPP_HOOK_URL=${esc(c.webhook.url)}</code> e <code>WHATSAPP_HOOK_EVENTS=message</code>.</div>
        </div>
        <div class="aj-bloco"><b>4. Briefing do dia</b>
          <label style="display:flex;gap:8px;align-items:center;margin:6px 0"><input type="checkbox" id="ckw-brief" ${c.briefing.ativo ? 'checked' : ''}> Mandar o briefing todo dia, na hora do resumo (🔔 Avisos)</label>
          <div class="hint">O que andou, o que parou, o que espera você e a meta. Apurado por código, redigido pelo Claude Code sem ferramentas. Pelo WhatsApp, a pessoa também pede escrevendo <b>briefing</b>, <b>laudo</b> ou <b>oi</b>.</div>
        </div>
      </div>
      <div class="mactions"><button class="btn" id="ckw-voltar">← Laudo</button><button class="btn ghost" id="ckw-fechar">Fechar</button></div>
      <div id="ckw-msg" class="hint" style="margin-top:8px"></div>`;
    const msg = (t) => { $('#ckw-msg').textContent = t; };
    const salvar = async () => {
      const r = await fetch('/api/cuki/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        waha: { url: $('#ckw-url').value, sessao: $('#ckw-sessao').value, ...($('#ckw-chave').value ? { chave: $('#ckw-chave').value } : {}) },
        webhookHost: $('#ckw-host').value, busca: { ativa: $('#ckw-busca').checked }, briefing: { ativo: $('#ckw-brief').checked } }) }).then(x => x.json());
      $('#ckw-chave').value = ''; if (r.waha) $('#ckw-chave').placeholder = r.waha.temChave ? 'já guardada; cole para trocar' : 'a chave X-Api-Key do WAHA';
      return r;
    };
    $('#ckw-salvar').onclick = async () => { await salvar(); msg('Salvo.'); };
    $('#ckw-testar').onclick = async () => {
      await salvar(); $('#ckw-estado').innerHTML = 'testando…';
      const r = await post('/api/cuki/testar');
      if (!r.ok) { $('#ckw-estado').innerHTML = '<span class="aj-status off">' + esc(r.motivo) + '</span>'; return; }
      if (r.conectado) { $('#ckw-estado').innerHTML = '<span class="aj-status ok">conectado</span> <span class="hint">' + esc(r.nome ? r.nome + ' · ' : '') + esc(r.numero ? '+' + r.numero : '') + '</span>'; return; }
      if (r.precisaQr) {
        $('#ckw-estado').innerHTML = '<span class="aj-status warn">precisa escanear o QR</span> <span class="hint">WhatsApp do celular do Cuki BOT › Dispositivos conectados › Conectar</span><div id="ckw-qr" class="hint">buscando o QR…</div>';
        const q = await api('/api/cuki/qr');
        $('#ckw-qr').innerHTML = q.ok ? '<img src="' + q.imagem + '" alt="QR do WhatsApp" style="width:240px;height:240px;border-radius:8px;background:#fff;padding:6px;margin-top:6px">' : esc(q.motivo);
        return;
      }
      $('#ckw-estado').innerHTML = '<span class="aj-status warn">sessão em ' + esc(r.estado || '?') + '</span> <span class="hint">' + esc(r.motivo || 'teste de novo em alguns segundos') + '</span>';
    };
    $('#ckw-add').onclick = async () => {
      const r = await post('/api/cuki/autorizados', { nome: $('#ckw-nome').value, numero: $('#ckw-num').value, papel: $('#ckw-papel').value });
      if (!r.ok) { msg(r.motivo || 'não deu'); return; }
      await salvar(); ajustes();
    };
    for (const b of corpo.querySelectorAll('#ckw-lista button[data-n]')) b.onclick = async () => { await fetch('/api/cuki/autorizados/' + b.dataset.n, { method: 'DELETE' }); await salvar(); ajustes(); };
    $('#ckw-webhook').onclick = async () => { await salvar(); msg('registrando…'); const r = await post('/api/cuki/webhook'); msg(r.ok ? 'Webhook registrado no WAHA: ' + r.url : r.motivo); };
    $('#ckw-teste-msg').onclick = async () => { await salvar(); msg('mandando…'); const r = await post('/api/cuki/whatsapp/testar'); msg(r.ok ? 'Enviado: ' + r.res + '. Confira o celular.' : 'Não foi: ' + r.res); };
    $('#ckw-briefing').onclick = async () => { await salvar(); msg('apurando e redigindo o briefing… pode levar um minuto'); const r = await post('/api/cuki/briefing'); msg(r.ok ? 'Briefing enviado.' : 'Não foi: ' + (r.motivo || JSON.stringify(r.res || {}))); };
    $('#ckw-voltar').onclick = () => abrir();
    $('#ckw-fechar').onclick = () => $('#modal').classList.add('hidden');
  }

  return { abrir, pintar, ajustes };
})();
