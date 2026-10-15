/* ===========================================================
   trabalho.js — a aba Trabalho do monitor: o sistema do agente desenhado
   pelo escritório, para quem não é técnico.

   O escritório lê a pasta do agente (memoria/entidades, saídas, lições,
   testes) por /api/agentes/<id>/trabalho, então a aba aparece mesmo com o
   agente desligado. Responder, aprovar, devolver e rodar passam por
   /api/agentes/<id>/trabalho/acao: o escritório liga o agente se preciso e
   fala com a rota /agir dele. Palavras de gente: "esperando você", "feito",
   "deu problema"; o termo técnico aparece quando ajuda.
   =========================================================== */
const TRABALHO = (() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const api = async (r, m = 'GET', c) => (await fetch(r, { method: m,
    headers: { 'Content-Type': 'application/json' }, body: c ? JSON.stringify(c) : undefined })).json();
  const quando = (iso) => {
    if (!iso) return '';
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return 'há ' + m + ' min';
    if (m < 1440) return 'há ' + Math.round(m / 60) + ' h';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  /* o status do lançador, em palavras */
  const PALAVRA = { nova: 'na fila', 'em andamento': 'fazendo agora', ensaiada: 'ensaiada (sem efeito)', 'aguardando pergunta': 'esperando sua resposta',
    'aguardando aprovação': 'esperando sua aprovação', pronta: 'feita', 'com erro': 'deu problema', 'com o dono': 'com você' };
  const COR = { nova: '', 'em andamento': 'ok', ensaiada: '', 'aguardando pergunta': 'warn', 'aguardando aprovação': 'warn', pronta: 'ok', 'com erro': 'bad', 'com o dono': 'warn' };
  const MODO = { ensaio: 'ensaio (só olhou)', proposta: 'proposta (rascunho)', real: 'de verdade' };

  let ocupado = false;
  async function agir(id, tipo, entidade, texto, botao) {
    if (ocupado) return;
    ocupado = true;
    const antes = botao ? botao.textContent : '';
    if (botao) { botao.disabled = true; botao.textContent = 'um momento…'; }
    const r = await api('/api/agentes/' + id + '/trabalho/acao', 'POST', { tipo, entidade, texto: texto || '' }).catch(e => ({ ok: false, motivo: e.message }));
    ocupado = false;
    if (botao) { botao.disabled = false; botao.textContent = antes; }
    if (typeof toast === 'function') toast(r.ok ? (r.texto || 'feito') : ('não deu: ' + (r.motivo || r.texto || 'erro')));
    return r;
  }

  async function pintar(id, el, cabeca, fechaBotao) {
    const r = await api('/api/agentes/' + id + '/trabalho');
    const s = (typeof SISTEMAS !== 'undefined' && SISTEMAS.porId(id)) || {};
    const nome = s.nome || id;
    const admin = typeof ADMIN !== 'undefined' && ADMIN.ehAdmin();
    if (!r.ok || !r.trabalho) {
      el.innerHTML = cabeca('🗂️ Trabalho', 'o que ' + esc(nome) + ' está fazendo') +
        '<div class="tr-corpo"><p class="hint">' + (r.motivo ? esc(r.motivo) : 'Este sistema não é um agente de tarefa do escritório, então não tem a aba Trabalho. Use o painel dele em <b>↗ Nova aba</b>.') + '</p></div>';
      fechaBotao(); return;
    }
    const w = r.trabalho, vivo = r.estado === 'no ar';
    const tr = s.construcao && s.construcao.emTreinamento ? s.construcao : null;
    const btn = (tipo, ent, rotulo, classe = '', campo = null) =>
      '<span class="tr-acao" data-tipo="' + tipo + '" data-ent="' + esc(ent) + '">' +
      (campo ? '<input placeholder="' + esc(campo) + '">' : '') + '<button class="btn small ' + classe + '">' + rotulo + '</button></span>';
    const bloco = (titulo, corpo, extra = '') => '<section class="tr-bloco"><h4>' + titulo + extra + '</h4>' + corpo + '</section>';
    const vazio = (t) => '<p class="hint tr-vazio">' + t + '</p>';

    // como ele está
    const nota = w.nota || { cor: 'cinza', motivos: [] };
    const teste = w.teste && w.teste.resumo ? 'último teste ' + quando(w.teste.quando) + ': ' + w.teste.resumo.graves + ' erro(s) grave(s), ' + w.teste.resumo.leves + ' leve(s) em ' + w.teste.resumo.tarefas + ' tarefa(s)' : 'nunca passou pelo testador';
    const comoEsta = '<div class="tr-nota"><i class="sem ' + nota.cor + '"></i><div><b>' + ({ verde: 'Tudo em ordem', amarelo: 'Pede atenção', vermelho: 'Precisa de você', cinza: 'Em construção' }[nota.cor] || '') + '</b>' +
      '<span>' + (nota.motivos.length ? esc(nota.motivos.join(' · ')) : esc(teste)) + '</span>' + (nota.motivos.length ? '<span>' + esc(teste) + '</span>' : '') + '</div>' +
      (admin ? '<button class="btn small ghost" id="tr-testar">🧪 Testar agora</button>' : '') + '</div>';

    // agora
    let agora;
    if (tr) agora = '🎓 Em construção: componente ' + tr.passo + ' de ' + (tr.total || '?') + '. Ainda não recebe trabalho.';
    else if (!vivo && r.estado !== 'web') agora = '💤 Desligado, na sala de descanso. O que ele deixou fica guardado aqui; para ele voltar a trabalhar, <button class="btn small" id="tr-ligar">▶ Ligar</button>';
    else if (w.agora) agora = '💻 Fazendo <b>' + esc(w.agora.entidade) + '</b> ' + quando(w.agora.desde) + '. Quando terminar, aparece em "Feito" ou em "Esperando você".';
    else if (w.esperandoVoce) agora = '🙋 Parado esperando você: ' + w.esperandoVoce + ' trabalho(s) precisam de uma resposta ou aprovação sua, logo abaixo.';
    else if (w.fila) agora = '💻 Livre, com ' + w.fila + ' na fila. Ele pega o próximo quando a esteira ou você mandar.';
    else agora = '💻 Livre, sem nada na fila.' + (w.feitasHoje ? ' Hoje já fez ' + w.feitasHoje + '.' : '');
    const numeros = '<div class="tr-nums">' +
      ['<b>' + w.esperandoVoce + '</b>esperando você', '<b>' + w.fila + '</b>na fila', '<b>' + w.comErro + '</b>com problema', '<b>' + w.feitasHoje + '</b>feitas hoje', '<b>' + w.feitas + '</b>feitas no total'].map(x => '<span>' + x + '</span>').join('') + '</div>';

    // esperando você
    const perguntas = (w.perguntas || []).map(p => '<div class="tr-item warn"><div class="tr-quem"><b>' + esc(p.id) + '</b><span>perguntou ' + quando(p.desde) + '</span></div>' +
      '<p>' + esc(p.texto || '(sem texto)') + '</p>' + btn('responder', p.id, 'Responder', 'primary', 'sua resposta') + '</div>');
    const aprov = (w.aprovacoes || []).map(a => '<div class="tr-item warn"><div class="tr-quem"><b>' + esc(a.id) + '</b><span>pronto para aprovar ' + quando(a.desde) + (a.modo ? ' · ' + (MODO[a.modo] || a.modo) : '') + '</span></div>' +
      '<p>Ele preparou o trabalho como proposta. Aprovar aplica de verdade; devolver manda refazer com o seu motivo.</p>' + btn('aprovar', a.id, 'Aprovar e aplicar', 'primary') + btn('rejeitar', a.id, 'Devolver', '', 'o que está errado') + '</div>');
    const comVoce = (r.trabalho.entidades || []).filter(e => e.status === 'com o dono').map(e => '<div class="tr-item"><div class="tr-quem"><b>' + esc(e.id) + '</b><span>com você desde ' + quando(e.atualizado) + '</span></div><p>Você assumiu este trabalho; o agente fica quieto nele até você devolver.</p>' + btn('devolver', e.id, 'Devolver ao agente', '', 'o que você mudou (opcional)') + '</div>');
    const esperando = perguntas.concat(aprov, comVoce);

    // com problema
    const erros = (w.erros || []).map(e => '<div class="tr-item bad"><div class="tr-quem"><b>' + esc(e.id) + '</b><span>' + quando(e.desde) + '</span></div><p>' + esc(e.erro || 'erro sem detalhe') + '</p>' +
      btn('rodar-proposta', e.id, 'Tentar de novo') + btn('corrigir', e.id, 'Corrigir', '', 'o que estava errado') + '</div>');

    // na fila
    const fila = (r.trabalho.entidades || []).filter(e => e.status === 'nova').map(e => '<div class="tr-item"><div class="tr-quem"><b>' + esc(e.id) + '</b><span>' + (e.rodadas ? e.rodadas + ' rodada(s) antes' : 'nunca rodou') + ' · ' + quando(e.atualizado) + '</span></div>' +
      btn('rodar-proposta', e.id, 'Rodar agora', 'primary') + btn('rodar', e.id, 'Só ensaiar', 'ghost') + btn('assumir', e.id, 'Assumir eu', 'ghost') + '</div>');

    // feito
    const feitos = (r.trabalho.recentes || []).map(x => '<div class="tr-item ' + (COR[x.status] || '') + '"><div class="tr-quem"><b>' + esc(x.entidade) + '</b><span>' + quando(x.quando) + ' · ' + (PALAVRA[x.status] || x.status) + (x.modo ? ' · ' + (MODO[x.modo] || x.modo) : '') + '</span></div>' +
      (x.feitos && x.feitos.length ? '<p class="tr-feitos">produziu: ' + x.feitos.map(f => '<code>' + esc(f) + '</code>').join(' ') + '</p>' : '') + '</div>');

    // lições
    const licoes = (r.trabalho.licoes || []).map(l => '<div class="tr-item"><p>' + esc(l) + '</p>' + btn('licao-aprovar', '', 'Aprovar', 'primary') + btn('licao-rejeitar', '', 'Não', 'ghost') + '</div>')
      .map(h => h.replace('data-ent=""', 'data-ent="" data-texto="1"'));

    el.innerHTML = cabeca('🗂️ Trabalho de ' + esc(nome), 'o que está fazendo, o que espera por você e o que já fez · atualiza sozinho') +
      '<div class="tr-corpo">' +
      comoEsta +
      bloco('Agora', '<p class="tr-agora">' + agora + '</p>' + numeros) +
      bloco('Esperando você', esperando.join('') || vazio('Nada esperando você.'), esperando.length ? ' <em>' + esperando.length + '</em>' : '') +
      (erros.length ? bloco('Com problema', erros.join(''), ' <em class="bad">' + erros.length + '</em>') : '') +
      bloco('Na fila', fila.join('') || vazio('Fila vazia. Trabalho novo entra pela esteira, pelo CRM ou pelo painel dele.'), fila.length ? ' <em>' + fila.length + '</em>' : '') +
      bloco('Feito e tentado', feitos.join('') || vazio('Nenhuma rodada ainda.')) +
      (licoes.length ? bloco('Lições que ele quer guardar', licoes.join(''), ' <em>' + licoes.length + '</em>') : '') +
      '<p class="hint tr-rodape">' + (w.licoesAprovadas != null ? w.licoesAprovadas + ' lição(ões) aprovadas · ' : '') + w.total + ' trabalho(s) no total' + (s.url ? ' · <a href="' + esc(s.url) + '" target="_blank" rel="noopener">painel completo ↗</a>' : '') + '</p>' +
      '</div>';
    fechaBotao();

    for (const sp of el.querySelectorAll('.tr-acao')) {
      const b = sp.querySelector('button'), inp = sp.querySelector('input');
      b.onclick = async () => {
        const tipo = sp.dataset.tipo;
        if (inp && !inp.value.trim() && /^(responder|corrigir|rejeitar)$/.test(tipo)) { inp.focus(); inp.placeholder = 'escreva aqui primeiro'; return; }
        const texto = sp.dataset.texto ? sp.closest('.tr-item').querySelector('p').textContent : (inp ? inp.value.trim() : '');
        const r = await agir(id, tipo, sp.dataset.ent, texto, b);
        if (r && r.ok) setTimeout(() => pintar(id, el, cabeca, fechaBotao), 900);
      };
    }
    const lg = $('#tr-ligar');
    if (lg) lg.onclick = async () => { lg.disabled = true; lg.textContent = 'ligando…'; await SISTEMAS.ligar(id); await SISTEMAS.esperarSubir(id, 40); pintar(id, el, cabeca, fechaBotao); };
    const ts = $('#tr-testar');
    if (ts) ts.onclick = () => EXTRAS.abrir(id, 'testes');
  }

  return { pintar, PALAVRA };
})();
