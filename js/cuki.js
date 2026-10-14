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
      <div class="mactions">${admin ? `<button class="btn primary" id="ck-rodar" ${e.rodando ? 'disabled' : ''}>${u ? 'Analisar de novo' : 'Analisar agora'}</button>` : ''}<span class="hint" id="ck-msg"></span></div>
      </div>`;
    const b = $('#ck-rodar');
    if (b) b.onclick = async () => { b.disabled = true; const r = await api('/api/cuki/analisar', 'POST'); if (!r.ok) { $('#ck-msg').textContent = r.motivo || 'não deu'; if (r.precisaAdmin) ADMIN.abrir(r.motivo); b.disabled = false; return; } $('#ck-msg').textContent = 'analisando…'; setTimeout(() => pintar(), 800); };
  }

  return { abrir, pintar };
})();
