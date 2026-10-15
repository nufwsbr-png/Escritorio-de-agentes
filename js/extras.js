/* ===========================================================
   extras.js — os painéis laterais do monitor

   memoria   o que o agente anotou no escritório (memoria/escritorio.md), editável pelo admin
   recados   a caixa de recados dele, e o dono pode escrever um
   propostas mudanças que ele sugeriu no prompt ou na constituição: o dono
             aprova ou recusa; nada entra sozinho
   testes    o testador (duas réguas) e a comparação com a rodada anterior
   ficha     a ficha do negócio: a constituição, seção por seção
   plataformas as plataformas que o agente pode usar (PLATAFORMAS_UI.painelDoAgente)
   =========================================================== */
const EXTRAS = (() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (r, m = 'GET', c) => (await fetch(r, { method: m,
    headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined })).json();
  const quando = ms => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  let id = null, tipo = null, timer = null;
  const el = () => $('#mon-extra');
  const aberto = () => !el().classList.contains('hidden');

  function abrir(sistemaId, qual) {
    id = sistemaId; tipo = qual;
    el().classList.remove('hidden');
    clearInterval(timer);
    pintar();
    if (qual === 'testes' || qual === 'recados' || qual === 'propostas') timer = setInterval(pintar, 4000);
    if (qual === 'trabalho') timer = setInterval(() => { if (!document.hidden && !el().querySelector('.tr-acao input:focus')) pintar(); }, 6000);
  }
  function fechar() { el().classList.add('hidden'); clearInterval(timer); tipo = null; }

  const cabeca = (titulo, sub) => `<div class="ex-top"><div><b>${titulo}</b><span>${sub || ''}</span></div><button class="btn ghost" id="ex-x">✕</button></div>`;
  const fechaBotao = () => { const b = $('#ex-x'); if (b) b.onclick = fechar; };
  const semAdmin = r => { if (r && r.precisaAdmin) { ADMIN.abrir(r.motivo); return true; } return false; };

  async function pintar() {
    if (!id || !tipo || !aberto()) return;
    try {
      if (tipo === 'memoria') await pintarMemoria();
      else if (tipo === 'recados') await pintarRecados();
      else if (tipo === 'propostas') await pintarPropostas();
      else if (tipo === 'testes') await pintarTestes();
      else if (tipo === 'ficha') await pintarFicha();
      else if (tipo === 'plataformas') await PLATAFORMAS_UI.painelDoAgente(id, el(), cabeca, fechaBotao);
      else if (tipo === 'trabalho') await TRABALHO.pintar(id, el(), cabeca, fechaBotao);
    } catch (e) { el().innerHTML = cabeca('Não consegui carregar', esc(e.message)); fechaBotao(); }
  }

  /* ---------------- memória ---------------- */
  async function pintarMemoria() {
    const r = await api(`/api/agentes/${id}/memoria`);
    const pode = ADMIN.ehAdmin();
    el().innerHTML = cabeca('🧠 Memória', 'memoria/escritorio.md da pasta do agente — o que ele anotou nas conversas e reuniões; entra em toda chamada do escritório. As lições de trabalho ficam em memoria/licoes.md e entram pelas Propostas') +
      (r.texto == null ? '<p class="hint" style="padding:16px">Esse agente não tem pasta local, então não tem memória.</p>' :
      `<textarea class="ex-texto" id="ex-mem" ${pode ? '' : 'readonly'}>${esc(r.texto)}</textarea>
       <div class="ex-baixo">
         <span class="hint">${pode ? 'O agente acrescenta linhas com <code>&lt;memoria&gt;</code> no fim das respostas. Você pode corrigir ou apagar.' : 'Só o administrador edita; o agente acrescenta sozinho.'}</span>
         ${pode ? '<button class="btn primary" id="ex-salvar">Salvar</button>' : ''}
       </div>`);
    fechaBotao();
    const b = $('#ex-salvar');
    if (b) b.onclick = async () => {
      const x = await api(`/api/agentes/${id}/memoria`, 'PUT', { texto: $('#ex-mem').value });
      if (!semAdmin(x)) b.textContent = x.ok ? 'Salvo ✓' : (x.motivo || 'erro');
    };
  }

  /* ---------------- recados ---------------- */
  async function pintarRecados() {
    const r = await api(`/api/agentes/${id}/mensagens`);
    const lista = (r.mensagens || []).slice().reverse();
    const linhas = lista.map(m => `
      <div class="ex-rec ${m.para === id ? 'rx' : 'tx'}">
        <span class="qm">${m.para === id ? 'de ' + esc(m.deNome) : 'para ' + esc(m.paraNome)} · ${quando(m.quando)}${m.para === id ? (m.entregue ? ' · lido' : ' · <b>novo</b>') : ''}</span>
        ${esc(m.texto)}</div>`).join('') || '<p class="hint">Nenhum recado ainda. Os agentes deixam recados uns para os outros com <code>&lt;mensagem para="id"&gt;</code>; o destinatário lê no próximo prompt e o boneco vai até a mesa dele.</p>';
    const rolou = $('#ex-rec-lista') && $('#ex-rec-lista').scrollTop;
    el().innerHTML = cabeca('✉️ Recados', 'o que os outros agentes e o dono deixaram para ele') +
      `<div class="ex-lista" id="ex-rec-lista">${linhas}</div>
       <div class="ex-baixo">
         <input id="ex-rec-txt" placeholder="Deixar um recado como dono…" maxlength="1500" style="flex:1">
         <button class="btn primary" id="ex-rec-ok">Enviar</button>
       </div>`;
    fechaBotao();
    if (rolou) $('#ex-rec-lista').scrollTop = rolou;
    const enviar = async () => {
      const t = $('#ex-rec-txt').value.trim(); if (!t) return;
      await api(`/api/agentes/${id}/mensagens`, 'POST', { texto: t });
      pintar();
    };
    $('#ex-rec-ok').onclick = enviar;
    $('#ex-rec-txt').addEventListener('keydown', e => { if (e.key === 'Enter') enviar(); });
  }

  /* ---------------- propostas ---------------- */
  async function pintarPropostas() {
    const r = await api(`/api/propostas?agente=${encodeURIComponent(id)}`);
    const lista = (r.propostas || []).slice().reverse();
    const pode = ADMIN.ehAdmin();
    const card = p => `
      <div class="ex-prop ${p.estado}">
        <div class="qm">${esc(p.titulo)} <small>· ${esc(p.arquivo)}${p.secao ? ' › ' + esc(p.secao) : ''} · ${quando(p.quando)} · ${p.estado}</small></div>
        <pre>${esc(p.conteudo)}</pre>
        ${p.estado === 'pendente' ? `<div class="acts">
          <button class="mini" data-ok="${p.id}" ${pode ? '' : 'disabled title="só administrador"'}>✓ aprovar e aplicar</button>
          <button class="mini" data-no="${p.id}" ${pode ? '' : 'disabled title="só administrador"'}>✕ recusar</button></div>` : ''}
      </div>`;
    el().innerHTML = cabeca('📝 Propostas', 'mudanças que o agente sugeriu no prompt ou na constituição — nada entra sem você aprovar') +
      `<div class="ex-lista">${lista.map(card).join('') ||
        '<p class="hint">Nenhuma proposta. Depois de uma tarefa ou de um teste, o agente pode sugerir uma regra nova em <b>Nunca faça isso</b> ou um dado para a constituição. Ela aparece aqui e só entra no arquivo quando você aprovar — é a regra da skill: o construtor nunca escreve o prompt do dono.</p>'}</div>`;
    fechaBotao();
    el().querySelectorAll('[data-ok],[data-no]').forEach(b => b.onclick = async () => {
      const ok = b.dataset.ok;
      const x = await api(`/api/propostas/${ok || b.dataset.no}/${ok ? 'aprovar' : 'recusar'}`, 'POST', {});
      if (!semAdmin(x)) pintar();
    });
  }

  /* ---------------- testes ---------------- */
  async function pintarTestes() {
    const r = await api(`/api/agentes/${id}/testes`);
    const s = SISTEMAS.porId(id) || {};
    const padrao = s.trilha === 'atendimento' ? 30 : 10;
    const pode = ADMIN.ehAdmin();
    const res = x => x && x.resumo ? `<b>${x.resumo.graves}</b> graves · ${x.resumo.leves} leves · ${x.resumo.tarefas} ${s.trilha === 'atendimento' ? 'conversas' : 'tarefas'}` : '<i>sem linha RESUMO</i>';
    const compara = r.ultimo && r.anterior && r.ultimo.resumo && r.anterior.resumo
      ? `<div class="ex-compara ${r.ultimo.resumo.graves < r.anterior.resumo.graves ? 'melhor' : r.ultimo.resumo.graves > r.anterior.resumo.graves ? 'pior' : ''}">
           rodada anterior: ${r.anterior.resumo.graves} graves → agora: ${r.ultimo.resumo.graves} graves
           ${r.ultimo.resumo.graves < r.anterior.resumo.graves ? '— melhorou' : r.ultimo.resumo.graves > r.anterior.resumo.graves ? '— piorou' : '— igual'}</div>` : '';
    const nEl = $('#ex-n');
    const nAtual = nEl ? nEl.value : padrao;
    el().innerHTML = cabeca('🧪 Testar', 'clientes ou tarefas difíceis simulados, julgados pela constituição e pelo fato') +
      `<div class="ex-testes">
        <div class="ex-rodar">
          ${r.rodando
            ? `<span class="rn-fase"><i></i>rodando desde ${quando(r.desde)} com ${r.n} ${s.trilha === 'atendimento' ? 'conversas' : 'tarefas'}… pode levar vários minutos</span>
               <button class="btn" id="ex-parar">■ Parar</button>`
            : `<label>Quantidade <input id="ex-n" type="number" min="3" max="60" value="${esc(nAtual)}" style="width:70px"></label>
               <button class="btn primary" id="ex-rodar" ${pode ? '' : 'disabled title="só administrador"'}>▶ Rodar o testador</button>
               <span class="hint">Cada ${s.trilha === 'atendimento' ? 'conversa' : 'tarefa'} é uma ou mais chamadas ao Claude; gasta cota da assinatura${s.trilha === 'atendimento' ? ' e crédito do OpenRouter' : ''}. Nada é consertado: sai um relatório.</span>`}
        </div>
        ${compara}
        ${r.ultimo ? `<div class="ex-relatorio"><div class="qm">Última rodada · ${r.ultimo.quando ? quando(new Date(r.ultimo.quando).getTime()) : ''} · ${res(r.ultimo)}${r.ultimo.custo ? ' · US$ ' + r.ultimo.custo.toFixed(2) : ''}</div>
          <pre>${esc(r.ultimo.texto || '')}</pre></div>` : '<p class="hint">Nenhuma rodada ainda.</p>'}
        ${r.rodadas && r.rodadas.length > 1 ? `<div class="hint" style="margin-top:8px">Histórico: ${r.rodadas.slice().reverse().map(x => (x.quando ? quando(new Date(x.quando).getTime()) : '?') + ' (' + (x.resumo ? x.resumo.graves + ' graves' : 'sem resumo') + ')').join(' · ')}</div>` : ''}
      </div>`;
    fechaBotao();
    const b = $('#ex-rodar');
    if (b) b.onclick = async () => {
      const n = Number($('#ex-n').value) || padrao;
      const x = await api(`/api/agentes/${id}/testar`, 'POST', { n });
      if (semAdmin(x)) return;
      if (!x.ok) { b.textContent = x.motivo || 'não deu'; return; }
      pintar();
    };
    const p = $('#ex-parar');
    if (p) p.onclick = async () => { await api(`/api/agentes/${id}/testar/parar`, 'POST', {}); pintar(); };
  }

  /* ---------------- ficha do negócio ---------------- */
  async function pintarFicha() {
    const r = await api(`/api/agentes/${id}/constituicao`);
    if (!r.ok) { el().innerHTML = cabeca('📋 Ficha do negócio', esc(r.motivo)); fechaBotao(); return; }
    const secoes = r.secoes && r.secoes.length ? r.secoes : [
      { titulo: '1. Sobre o negócio', corpo: '' }, { titulo: '2. O trabalho deste agente', corpo: '' },
      { titulo: '3. Serviços, produtos ou itens', corpo: '' }, { titulo: '4. Perguntas frequentes', corpo: '' },
      { titulo: '5. Políticas e regras', corpo: '' }, { titulo: '6. Promoções e prazos vigentes', corpo: '' }];
    el().innerHTML = cabeca('📋 Ficha do negócio', 'a constituição do agente, seção por seção — é a única fonte de verdade dele') +
      `<div class="ex-ficha">
        <div class="frow"><label>Título</label><input id="fx-titulo" value="${esc(r.titulo || 'Constituição')}"></div>
        ${secoes.map((s, i) => `<div class="frow"><label>${esc(s.titulo)}</label>
          <input class="fx-t" data-i="${i}" value="${esc(s.titulo)}" style="font-weight:700;margin-bottom:4px">
          <textarea class="fx-c" data-i="${i}" rows="${Math.min(14, Math.max(4, (s.corpo || '').split('\n').length + 1))}">${esc(s.corpo)}</textarea></div>`).join('')}
        <p class="hint">O que ficar como <code>[A PREENCHER]</code> o agente responde "confirmo com a equipe" — campo vazio não gera mentira, gera prudência. Promoção sem data é promoção eterna: exija a validade.</p>
      </div>
      <div class="ex-baixo"><span class="hint">Grava em <code>skills/constituicao.md</code> na pasta do agente.</span><button class="btn primary" id="fx-salvar">Salvar ficha</button></div>`;
    fechaBotao();
    $('#fx-salvar').onclick = async () => {
      const ts = Array.from(el().querySelectorAll('.fx-t')), cs = Array.from(el().querySelectorAll('.fx-c'));
      const dados = { titulo: $('#fx-titulo').value, cabeca: r.cabeca || '',
                      secoes: ts.map((t, i) => ({ titulo: t.value, corpo: cs[i].value })) };
      const x = await api(`/api/agentes/${id}/constituicao`, 'PUT', dados);
      $('#fx-salvar').textContent = x.ok ? 'Salvo ✓' : (x.motivo || 'erro');
    };
  }

  return { abrir, fechar, aberto, atualizar: pintar, get tipo() { return tipo; } };
})();
