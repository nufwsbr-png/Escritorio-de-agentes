/* ===========================================================
   esteiras.js — 🧵 Esteiras: o trabalho passando de agente em agente

   Uma coluna por etapa, um cartão por entidade. Quem opera põe uma entidade
   nova, aprova ou devolve (pela tela, como o dono decidiu). Definir ou
   remover uma esteira é do administrador; a skill /criar-esteira também
   grava, pelo node esteiras.js. O servidor faz o resto: vigia os agentes,
   chama o gatilho do próximo e deixa o recado.
   =========================================================== */
const ESTEIRAS = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (r, m = 'GET', c) => (await fetch(r, { method: m, headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined })).json();
  const ha = (iso) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? 'agora' : m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' d'; };
  const COR = { 'na fila': 'fila', andando: 'andando', 'aguardando aprovação': 'aprovar', 'parada (pergunta)': 'parada', 'com erro': 'erro', 'proposta no agente': 'proposta', 'com o dono': 'dono', 'concluída': 'feita' };

  let timer = null, dados = { esteiras: [], entidades: [] };

  async function abrir(msg) {
    const corpo = $('#modal-body');
    corpo.innerHTML = '<p class="hint">lendo as esteiras…</p>';
    $('#modal').classList.remove('hidden');
    clearInterval(timer);
    await pintar(msg);
    // enquanto o modal estiver aberto, atualiza sozinho (o bastão anda em segundo plano)
    timer = setInterval(async () => { if ($('#modal').classList.contains('hidden') || !$('#es-raiz')) { clearInterval(timer); return; } await pintar(); }, 5000);
  }

  async function pintar(msg) {
    try { dados = await api('/api/esteiras'); } catch (e) { dados = { esteiras: [], entidades: [] }; }
    const admin = ADMIN.ehAdmin();
    const corpo = $('#modal-body');
    const foco = document.activeElement && document.activeElement.closest && document.activeElement.closest('#es-form');
    if (foco) return;   // a pessoa está preenchendo o formulário: não redesenha em cima
    corpo.innerHTML = `
      <div id="es-raiz">
      <h3 style="font-family:var(--f-display);margin:0 0 4px">🧵 Esteiras</h3>
      <p class="hint" style="margin-bottom:12px">O trabalho passa de agente em agente, na ordem. O escritório lê quando uma etapa fica pronta, acorda o próximo agente e deixa o recado. Onde uma pessoa precisa aprovar, o cartão espera aqui.</p>
      ${msg ? `<p class="hint" style="color:var(--acc-3)">${esc(msg)}</p>` : ''}
      ${dados.esteiras.length ? dados.esteiras.map(quadro).join('') : '<p class="hint">Nenhuma esteira ainda. ' + (admin ? 'Crie abaixo, ou abra esta pasta no Claude Code e digite <code>/criar-esteira</code>.' : 'O administrador cria em <code>/criar-esteira</code>.') + '</p>'}
      ${admin ? formulario() : ''}
      </div>`;
    ligar();
  }

  function quadro(e) {
    const ents = dados.entidades.filter(x => x.esteira === e.id);
    const ativas = ents.filter(x => x.status !== 'concluída'), feitas = ents.filter(x => x.status === 'concluída');
    return `<section class="es-quadro" data-es="${esc(e.id)}">
      <div class="es-top"><b>${esc(e.nome)}</b> <small class="hint">${esc(e.entidade.plural)} · ${e.etapas.length} etapas${e.pasta ? ' · pasta: ' + esc(e.pasta) : ''}${e.vigiarPasta ? ' · entra sozinha por pasta nova' : ''}</small>
        <span class="es-acoes"><button class="mini act es-nova" data-es="${esc(e.id)}">＋ ${esc(e.entidade.singular)}</button>${ADMIN.ehAdmin() ? `<button class="mini es-remover" data-es="${esc(e.id)}" title="remover a esteira (as entidades ficam no histórico)">✕</button>` : ''}</span></div>
      <div class="es-colunas">
        ${e.etapas.map((et, i) => `<div class="es-col">
          <div class="es-col-top"><span class="es-n">${i + 1}</span><b>${esc(et.nome)}</b><small>${esc(et.agenteNome)}${et.aprovacao === 'pessoa' ? ' · aprova: ' + esc(et.aprovador || 'uma pessoa') : ''}</small></div>
          ${ativas.filter(x => x.etapa === i).map(x => cartao(e, x)).join('') || '<div class="es-vazio"></div>'}
        </div>`).join('')}
      </div>
      ${feitas.length ? `<p class="hint" style="margin:6px 0 0">Concluídas: ${feitas.slice(0, 8).map(x => esc(x.entidade)).join(', ')}${feitas.length > 8 ? ' e mais ' + (feitas.length - 8) : ''}.</p>` : ''}
    </section>`;
  }

  function cartao(e, x) {
    const ult = x.historico && x.historico.length ? x.historico[x.historico.length - 1] : null;
    const aprovar = x.status === 'aguardando aprovação';
    return `<div class="es-card ${COR[x.status] || ''}">
      <b>${esc(x.entidade)}</b>
      <span class="es-status">${esc(x.status)}${x.atualizado ? ' · ' + ha(x.atualizado) : ''}</span>
      ${x.motivo ? `<small class="hint">${esc(String(x.motivo).slice(0, 160))}</small>` : ''}
      ${ult && ult.evento === 'devolvida' ? `<small class="hint">devolvida: ${esc(ult.observacao || '')}</small>` : ''}
      ${aprovar ? `<div class="es-botoes"><button class="mini act es-aprovar" data-es="${esc(e.id)}" data-ent="${esc(x.entidade)}">✅ Aprovar</button><button class="mini es-devolver" data-es="${esc(e.id)}" data-ent="${esc(x.entidade)}">↩ Devolver</button></div>` : ''}
    </div>`;
  }

  function formulario() {
    const agentes = (SISTEMAS.todos ? SISTEMAS.todos() : []).filter(s => s.trilha && s.trilha !== 'atendimento');
    const pastas = (typeof PLATAFORMAS_UI !== 'undefined' ? PLATAFORMAS_UI.lista : []).filter(p => p.tipo === 'pasta');
    const opAg = agentes.map(a => `<option value="${esc(a.id)}">${esc(a.nome)}${a.setor ? ' · ' + esc(a.setor) : ''}</option>`).join('');
    const linha = () => `<div class="es-linha"><input class="es-et-nome" placeholder="nome da etapa (ex.: Petição inicial)" maxlength="60"><select class="es-et-ag">${opAg}</select><input class="es-et-ent" placeholder="o que entrega" maxlength="200"><select class="es-et-ap"><option value="nenhuma">segue sozinha</option><option value="pessoa">uma pessoa aprova</option></select><input class="es-et-quem hidden" placeholder="quem aprova" maxlength="60"><button class="btn ghost es-et-x" title="tirar">✕</button></div>`;
    return `<details class="es-form" id="es-form"><summary>＋ Nova esteira (administrador)</summary>
      <p class="hint">Prefira <code>/criar-esteira</code> no Claude Code: ele propõe as etapas pelos agentes que você já tem. Aqui é o caminho rápido.</p>
      <div class="two"><div class="frow"><label>Nome da esteira</label><input id="es-nome" placeholder="ex.: Processo novo" maxlength="60"></div>
        <div class="frow"><label>O que anda nela (singular)</label><input id="es-ent" placeholder="ex.: processo" maxlength="30"></div></div>
      <div class="two"><div class="frow"><label>Pasta compartilhada (plataforma do tipo pasta)</label><select id="es-pasta"><option value="">nenhuma</option>${pastas.map(p => `<option value="${esc(p.id)}">${esc(p.nome)}</option>`).join('')}</select></div>
        <div class="frow"><label class="opt" style="margin-top:22px"><input type="checkbox" id="es-vigiar"> entra sozinha quando aparece uma pasta nova lá</label></div></div>
      <div class="frow"><label>Etapas, na ordem</label><div id="es-etapas">${linha()}${linha()}</div><button class="btn ghost" id="es-mais">＋ etapa</button></div>
      <div id="es-msg" class="hint" style="color:#ff7a6b"></div>
      <div class="mactions"><button class="btn primary" id="es-salvar">Criar esteira</button></div>
    </details>`;
  }

  function ligar() {
    $$('.es-nova').forEach(b => b.onclick = async () => {
      const e = dados.esteiras.find(x => x.id === b.dataset.es);
      const nome = window.prompt('Qual ' + (e ? e.entidade.singular : 'entidade') + ' entra na esteira? (um nome curto, ex.: "processo da cliente 1")', '');
      if (!nome) return;
      const r = await api(`/api/esteiras/${b.dataset.es}/entrar`, 'POST', { entidade: nome });
      pintar(r.ok ? nome + ' entrou na esteira.' : r.motivo);
    });
    $$('.es-aprovar').forEach(b => b.onclick = async () => { const r = await api(`/api/esteiras/${b.dataset.es}/${encodeURIComponent(b.dataset.ent)}/aprovar`, 'POST', {}); pintar(r.ok ? 'Aprovada: ' + b.dataset.ent + ' segue para a próxima etapa.' : r.motivo); });
    $$('.es-devolver').forEach(b => b.onclick = async () => {
      const obs = window.prompt('O que precisa mudar? (vai como recado ao agente, que refaz a etapa)', '');
      if (obs === null) return;
      const r = await api(`/api/esteiras/${b.dataset.es}/${encodeURIComponent(b.dataset.ent)}/devolver`, 'POST', { observacao: obs });
      pintar(r.ok ? 'Devolvida: o agente refaz a etapa com a sua observação.' : r.motivo);
    });
    $$('.es-remover').forEach(b => b.onclick = async () => { if (!window.confirm('Remover a esteira? As entidades ficam no histórico.')) return; const r = await api(`/api/esteiras/${b.dataset.es}`, 'DELETE'); pintar(r.ok ? 'Esteira removida.' : r.motivo); });
    const mais = $('#es-mais');
    if (mais) {
      const ligaLinhas = () => $$('#es-etapas .es-linha').forEach(l => {
        l.querySelector('.es-et-x').onclick = (ev) => { ev.preventDefault(); l.remove(); };
        const ap = l.querySelector('.es-et-ap'); ap.onchange = () => l.querySelector('.es-et-quem').classList.toggle('hidden', ap.value !== 'pessoa');
      });
      ligaLinhas();
      mais.onclick = (ev) => { ev.preventDefault(); const t = document.createElement('div'); t.innerHTML = $('#es-etapas .es-linha').outerHTML; const n = t.firstElementChild; n.querySelectorAll('input').forEach(i => i.value = ''); n.querySelector('.es-et-quem').classList.add('hidden'); $('#es-etapas').appendChild(n); ligaLinhas(); };
      $('#es-salvar').onclick = async () => {
        const etapas = $$('#es-etapas .es-linha').map(l => ({ nome: l.querySelector('.es-et-nome').value.trim(), agente: l.querySelector('.es-et-ag').value, entrega: l.querySelector('.es-et-ent').value.trim(), aprovacao: l.querySelector('.es-et-ap').value, aprovador: l.querySelector('.es-et-quem').value.trim() })).filter(e => e.nome);
        const r = await api('/api/esteiras', 'POST', { nome: $('#es-nome').value.trim(), entidade: { singular: $('#es-ent').value.trim() }, pasta: $('#es-pasta').value, vigiarPasta: $('#es-vigiar').checked, etapas });
        if (!r.ok) { $('#es-msg').textContent = r.motivo || 'não deu'; if (r.precisaAdmin) ADMIN.abrir(r.motivo); return; }
        pintar('Esteira "' + r.esteira.nome + '" criada.');
      };
    }
  }

  return { abrir, pintar };
})();
