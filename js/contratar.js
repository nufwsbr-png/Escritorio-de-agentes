/* ===========================================================
   contratar.js — contratar é construir

   O assistente pergunta primeiro o TIPO: atendimento no WhatsApp (a skill
   criar-agente inteira, cérebro pelo OpenRouter) ou outro setor (a jornada
   reduzida, cérebro pelo Claude Code da máquina). Depois nome, negócio e
   porta. O servidor cria a pasta padrão com a skill dentro, registra o
   sistema e o boneco entra pela recepção já "em treinamento". O monitor
   abre em Construir e a skill assume.
   =========================================================== */
const CONTRATAR = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'agente';

  let setores = [];
  async function carregar() {
    try { setores = (await (await fetch('/api/setores')).json()).setores || []; } catch (e) { setores = []; }
    return setores;
  }
  const porId = id => setores.find(s => s.id === id) || null;

  const NOMES = ['Tati', 'Léo', 'Bia', 'Nico', 'Duda', 'Rafa', 'Cami', 'Dan', 'Lia', 'Theo', 'Nina', 'Gui'];
  const sugerirNome = () => {
    const usados = new Set(ROSTER.all().map(a => a.name.toLowerCase()));
    return NOMES.find(n => !usados.has(n.toLowerCase())) || 'Agente';
  };
  const portaLivre = () => {
    const usadas = SISTEMAS.todos().map(s => s.porta).filter(Boolean);
    let p = 4401; while (usadas.includes(p)) p++;
    return p;
  };

  function abrir() {
    if (!ADMIN.exigir('Contratar um agente')) return;
    const corpo = $('#modal-body');
    corpo.innerHTML = '<p class="hint">carregando setores…</p>';
    $('#modal').classList.remove('hidden');
    Promise.all([carregar(), PLATAFORMAS_UI.carregar()]).then(passo1);
  }

  function passo1() {
    const corpo = $('#modal-body');
    const atend = porId('atendimento');
    const outros = setores.filter(s => s.id !== 'atendimento');
    corpo.innerHTML = `
      <h3 style="font-family:var(--f-display);margin:0 0 4px">Contratar agente</h3>
      <p class="hint" style="margin-bottom:14px">Passo 1 de 2 — que tipo de agente? Todo agente nasce com pasta própria, sistema próprio e a skill que
        conduz a construção. No fim ele tem um painel que abre no computador dele.</p>
      <div class="setor-grid">
        <button class="setor-card destaque" data-s="atendimento">
          <span class="emo">${atend ? atend.emoji : '🎧'}</span>
          <b>Atendimento no WhatsApp</b>
          <small>${esc(atend ? atend.desc : '')}</small>
          <em>${atend ? atend.passos : 18} componentes · OpenRouter · referência: criar-agente</em>
        </button>
        <div class="setor-outros">
          <b>Agente de tarefa (por setor)</b>
          <small>Executa uma tarefa interna: organiza, redige, lança, confere. Cérebro pelo Claude Code desta máquina em rodadas isoladas; as conexões ficam no .env do agente. ${outros[0] ? outros[0].passos : 17} componentes · referência: criar-agente-tarefa.</small>
          <div class="chips">
            ${outros.map(s => `<button class="chip" data-s="${esc(s.id)}">${s.emoji} ${esc(s.nome)}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="mactions"><button class="btn" id="ct-cancel">Cancelar</button></div>`;
    $('#ct-cancel').onclick = () => $('#modal').classList.add('hidden');
    $$('#modal-body [data-s]').forEach(b => b.addEventListener('click', () => passo2(b.dataset.s)));
  }

  function passo2(setorId) {
    const s = porId(setorId);
    if (!s) return;
    const corpo = $('#modal-body');
    const E = window.ESCRITORIO || {};
    corpo.innerHTML = `
      <h3 style="font-family:var(--f-display);margin:0 0 4px">${s.emoji} ${esc(s.nome)}</h3>
      <p class="hint" style="margin-bottom:14px">Passo 2 de 2 — ${esc(s.desc)}</p>
      ${s.id === 'outro' ? `<div class="frow"><label>Nome do setor</label><input id="ct-setor" placeholder="ex.: Operações & Documentos" maxlength="40"></div>` : ''}
      <div class="two">
        <div class="frow"><label>Nome do agente</label><input id="ct-nome" value="${esc(sugerirNome())}" maxlength="22"></div>
        <div class="frow"><label>Negócio</label><input id="ct-neg" value="${esc(E.empresa || E.nome || '')}" placeholder="nome do negócio" maxlength="80"></div>
      </div>
      <div class="two">
        <div class="frow"><label>Porta do sistema dele</label><input id="ct-porta" type="number" min="1024" max="65535" value="${portaLivre()}"></div>
        <div class="frow"><label>Pasta (opcional)</label><input id="ct-pasta" placeholder="padrão: agentes/${esc(slug(sugerirNome()))}"></div>
      </div>
      <label class="opt" style="margin-top:4px"><input type="checkbox" id="ct-reun" checked> Participa da reunião dos agentes</label>
      ${PLATAFORMAS_UI.caixas([])}
      <p class="hint" style="margin-top:10px;line-height:1.6">O escritório cria a pasta com <code>skills/</code>, <code>tools/</code>, <code>prompt-agente.md</code>,
        constituição, <code>.env</code>, memória, progresso e um <code>server.js</code> com o contrato do escritório. A skill
        <b>${esc(s.skill)}</b> vai junto como referência e o monitor abre em <b>Construir</b>: a ANATOMIA do escritório conduz, um componente por vez, com teste no fim de cada um (${s.passos} componentes).
        ${s.trilha === 'atendimento' ? 'Este agente usa OpenRouter: a chave vai no <code>.env</code>, no componente 2.' : 'O cérebro é o Claude Code desta máquina, em rodadas isoladas pelo <code>rodar.js</code>; não há chave de modelo.'}</p>
      <div id="ct-msg" class="hint" style="color:#ff7a6b;margin-top:6px"></div>
      <div class="mactions">
        <button class="btn primary" id="ct-ok">Criar e começar a construção</button>
        <button class="btn" id="ct-back">Voltar</button>
      </div>`;
    $('#ct-back').onclick = passo1;
    $('#ct-ok').onclick = async () => {
      const nome = $('#ct-nome').value.trim();
      if (!nome) { $('#ct-nome').focus(); return; }
      const corpoReq = {
        nome, negocio: $('#ct-neg').value.trim(), setor: s.id,
        setorNome: s.id === 'outro' ? $('#ct-setor').value.trim() : s.nome,
        porta: Number($('#ct-porta').value), pasta: $('#ct-pasta').value.trim() || '',
        plataformas: PLATAFORMAS_UI.marcadas()
      };
      $('#ct-ok').disabled = true; $('#ct-msg').textContent = 'criando a pasta e copiando a skill…';
      let r;
      try { r = await (await fetch('/api/contratar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpoReq) })).json(); }
      catch (e) { r = { ok: false, motivo: 'o escritório não respondeu' }; }
      $('#ct-ok').disabled = false;
      if (!r.ok) { $('#ct-msg').textContent = r.motivo || 'não deu'; if (r.precisaAdmin) ADMIN.abrir(r.motivo); return; }
      await SISTEMAS.atualizar();
      const a = ROSTER.hireCustom({
        name: nome, role: r.setor.nome, emoji: r.setor.emoji, path: r.pasta, sistema: r.id,
        reuniao: $('#ct-reun').checked, setor: r.setor.id, trilha: r.setor.trilha,
        brief: r.setor.nome + (corpoReq.negocio ? ' de ' + corpoReq.negocio : '') + ' — em construção.'
      });
      $('#modal').classList.add('hidden');
      document.dispatchEvent(new CustomEvent('agente-contratado', { detail: { agente: a, sistema: r.id, trilha: r.setor.trilha } }));
    };
    $('#ct-nome').focus();
  }

  return { abrir, carregar, get setores() { return setores; }, porId };
})();
