/* ===========================================================
   conversa.js — falar com o agente sobre o sistema dele.

   Cada agente é uma sessão do Claude Code rodando DENTRO da pasta
   do sistema dele: lê o código, roda os scripts de diagnóstico do
   próprio projeto e responde sobre o que encontrou.

   Investigar = só leitura.  Resolver = pode mexer no projeto.
   Construir  = a skill da trilha conduz a construção, um passo por vez.
   Ensinar    = você faz a tarefa aqui (é o Claude Code camuflado, agindo
                de verdade nas pastas do agente) e, em "Tarefa concluída",
                a demonstração vira a skill dele. Canal próprio (?canal=ensino).
   A sessão sobrevive a reinício do escritório (fica em disco).
   =========================================================== */
const CONVERSA = (() => {

  let id = null, modo = 'investigar', timer = null;
  let ensino = null;   // GET /api/agentes/:id/ensino: skills aprendidas, demonstrações, escopo

  const el = {
    painel:   () => document.getElementById('mon-conversa'),
    linhas:   () => document.getElementById('cv-linhas'),
    texto:    () => document.getElementById('cv-texto'),
    enviar:   () => document.getElementById('cv-enviar'),
    concluir: () => document.getElementById('cv-concluir'),
    atalhos:  () => document.getElementById('cv-atalhos')
  };

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** deixa `código` e **negrito** legíveis sem puxar uma biblioteca */
  const formata = t => esc(t)
    .replace(/```[a-z]*\n([\s\S]*?)```/g, (m, p) => '<code>' + p.trim() + '</code>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');

  /* sugestões que dependem do modo */
  const ATALHOS = {
    investigar: ['Faça um diagnóstico rápido do sistema',
                 'Tem algum erro nos logs?',
                 'O que esse projeto faz, em 5 linhas?'],
    resolver:   ['Corrija o erro que aparece no log',
                 'Deixe o painel em /painel mais claro, sem mexer na lógica'],
    construir:  ['Vamos continuar de onde paramos',
                 'Em que passo estamos e o que falta?',
                 'Pode executar'],
    ensinar:    ['Vou te mostrar uma tarefa. Primeiro liste o que tem na pasta autorizada',
                 'Faça exatamente assim para os outros arquivos',
                 'Antes de seguir, me pergunte o que você não sabe']
  };

  const ehEnsino = () => modo === 'ensinar';
  const canal = () => ehEnsino() ? '?canal=ensino' : '';

  let claude = null;   // { instalado, conectado }

  async function checarLogin() {
    try { claude = await (await fetch('/api/claude')).json(); }
    catch (e) { claude = null; }
  }

  async function carregarEnsino() {
    if (!id) return;
    try { ensino = await (await fetch(`/api/agentes/${id}/ensino`)).json(); } catch (e) { ensino = null; }
  }

  function setModo(m) {
    modo = m;
    document.querySelectorAll('.cv-op').forEach(x => x.classList.toggle('on', x.dataset.modo === m));
    el.concluir().classList.toggle('hidden', !ehEnsino());
    el.texto().placeholder = ehEnsino() ? 'Diga o que fazer, como faria no Claude Code…' : 'Pergunte algo ao agente…';
    pintarAtalhos();
    if (ehEnsino()) carregarEnsino().then(atualizar); else atualizar();
  }

  /** abre a conversa; `modoInicial` e `primeira` servem ao Construir recém-contratado */
  function abrir(sistemaId, modoInicial, primeira) {
    id = sistemaId;
    ensino = null;
    el.painel().classList.remove('hidden');
    const s = SISTEMAS.porId(id);
    // Construir só faz sentido para agente com jornada na pasta; Ensinar, para agente de tarefa (o atendente tem outro cérebro)
    const temJornada = !!(s && s.trilha);
    const ensina = temJornada && s.trilha !== 'atendimento';
    const bc = document.querySelector('.cv-op[data-modo="construir"]');
    if (bc) bc.classList.toggle('hidden', !temJornada);
    const be = document.querySelector('.cv-op[data-modo="ensinar"]');
    if (be) be.classList.toggle('hidden', !ensina);
    const padrao = temJornada && s.construcao && !s.construcao.concluido ? (ensina && s.aprendizado === 'vendo' ? 'ensinar' : 'construir') : 'investigar';
    setModo(modoInicial && (modoInicial !== 'ensinar' || ensina) ? modoInicial : padrao);
    checarLogin().then(atualizar);
    clearInterval(timer);
    timer = setInterval(atualizar, 2500);
    if (primeira) setTimeout(() => enviarTexto(primeira), 400);
  }

  function fechar() {
    el.painel().classList.add('hidden');
    clearInterval(timer);
  }

  const aberto = () => !el.painel().classList.contains('hidden');

  function pintarAtalhos() {
    const lista = ATALHOS[modo] || ATALHOS.investigar;
    el.atalhos().innerHTML = lista.map(t => `<button>${esc(t)}</button>`).join('');
    el.atalhos().querySelectorAll('button').forEach((b, i) =>
      b.addEventListener('click', () => { el.texto().value = lista[i]; el.texto().focus(); }));
  }

  async function atualizar() {
    if (!id || !aberto()) return;
    // se está sem login, reconfere: o servidor guarda 30s, então não pesa.
    // assim, logar noutro terminal destrava aqui sem recarregar a página.
    if (claude && claude.instalado && !claude.conectado) await checarLogin();
    let e;
    try { e = await (await fetch(`/api/agentes/${id}/chat${canal()}`)).json(); }
    catch (err) { return; }
    pintar(e);
  }

  /** o botão que abre o painel 🔌 Plataformas deste agente sem sair do monitor: marcar uma pasta ou um sistema vale na próxima mensagem */
  const botaoPlataformas = (texto) => `<button class="mini act cv-plat">${esc(texto || '🔌 Plataformas deste agente')}</button>`;

  function introEnsino(e) {
    const skills = (ensino && ensino.skills) || [];
    const pastas = (ensino && ensino.pastasAutorizadas) || [];
    const plats = (ensino && ensino.plataformas) || [];
    const faltaEscopo = !pastas.length && !plats.length;
    return `<div class="cv-msg sistema"><b>Modo Ensinar: você faz, ele aprende.</b><br><br>
      Este chat é o Claude Code rodando na pasta do agente. Faça a tarefa aqui, do seu jeito, como faria no terminal:
      ele age de verdade, só dentro das pastas autorizadas${pastas.length ? ' (' + pastas.map(esc).join('; ') + ')' : ' (nenhuma ainda)'}
      e das plataformas permitidas${plats.length ? ' (' + plats.map(esc).join(', ') + ')' : ' (nenhuma marcada)'}.
      ${faltaEscopo ? '<br><br><b>Antes de começar</b>, dê a ele o alcance da tarefa: marque a pasta de trabalho (plataforma do tipo pasta) e os sistemas que ela usa. ' : '<br><br>Faltou pasta ou sistema? Marque e siga: a próxima mensagem já vem com o acesso. '}${botaoPlataformas()}<br><br>
      Quando terminar, clique <b>✅ Tarefa concluída</b>: a demonstração vira uma skill em <code>.claude/skills/</code>, a primeira amostra com gabarito
      e propostas para a constituição. Depois confira com <code>node rodar.js amostras/caso-NN</code> se ele faz igual.
      ${skills.length ? '<br><br>Skills que ele já aprendeu: ' + skills.map(s => '<b>' + esc(s.nome) + '</b>' + (s.descricao ? ' — ' + esc(s.descricao) : '')).join('; ') + '.' : ''}
      ${e && e.ensino ? '<br><br>Demonstração em andamento: <code>' + esc(String(e.ensino).replace(/\\\\/g, '/')) + '</code>.' : ''}</div>`;
  }

  function ligarBotoesPlataformas() {
    el.linhas().querySelectorAll('.cv-plat').forEach(b => b.addEventListener('click', () => {
      if (!id || typeof EXTRAS === 'undefined') return;
      // o painel de plataformas abre por cima; ao fechar, o monitor volta ao Conversar em Ensinar
      fechar();
      EXTRAS.abrir(id, 'plataformas');
      const volta = setInterval(() => { if (!EXTRAS.aberto()) { clearInterval(volta); abrir(id, 'ensinar'); } }, 600);
    }));
  }

  function pintar(e) {
    const c = el.linhas();
    const nofim = c.scrollHeight - c.scrollTop - c.clientHeight < 60;

    let html = e.historico.map(m => {
      const quem = m.quem === 'voce' ? 'Você' : m.modo === 'destilar' ? 'Escritório' : ehEnsino() ? 'Claude Code' : 'Agente';
      const tag = m.modo === 'resolver' ? ' · modo resolver' : m.modo === 'construir' ? ' · construindo' : m.modo === 'ensinar' ? ' · ensinando' : m.modo === 'destilar' ? ' · destilando a skill' : '';
      const notas = (m.notas || []).length ? `<div class="cv-notas">${m.notas.map(esc).join(' · ')}</div>` : '';
      // o Claude Code disse que falta pasta ou sistema: o botão de marcar aparece embaixo da fala
      const falta = m.quem === 'agente' && m.modo === 'ensinar' && /FALTA:|🔌 Plataformas/.test(m.texto) ? `<div class="cv-notas">${botaoPlataformas('🔌 marcar em Plataformas deste agente')}</div>` : '';
      return `<div class="cv-msg ${m.quem}${m.modo === 'destilar' ? ' destilar' : ''}"><span class="qm">${quem}${esc(tag)}</span>${formata(m.texto)}${notas}${falta}</div>`;
    }).join('');

    const semLogin = e.precisaLogin || (claude && claude.instalado && !claude.conectado);
    if (claude && !claude.instalado) {
      html += `<div class="cv-msg sistema"><b>Não encontrei o Claude Code nesta máquina.</b><br><br>
        Ele é o cérebro do agente: é ele que abre o projeto e investiga.</div>`;
    } else if (semLogin) {
      html += `<div class="cv-msg sistema"><b>O Claude Code não está conectado nesta máquina.</b><br><br>
        Abra um terminal e rode:<br><br>
        <code>claude auth login</code><br><br>
        Ele abre o navegador para você entrar. É uma vez só — depois todos os
        agentes passam a conversar.</div>`;
    } else if (e.erro) {
      html += `<div class="cv-msg sistema">${esc(e.erro)}</div>`;
    }
    if (e.rodando) {
      html += `<div class="cv-pensando"><i></i>${e.destilando ? 'destilando a demonstração em skill, amostra e propostas… pode levar alguns minutos'
        : modo === 'construir' ? 'construindo… um passo pode levar alguns minutos' : ehEnsino() ? 'fazendo…' : 'investigando o projeto…'}</div>`;
    }
    // atenção: aqui é atribuição, não concatenação — só pode entrar quando
    // não há nada mais importante para dizer, senão apaga o aviso de login
    if (!e.historico.length && !e.rodando && !semLogin && !(claude && !claude.instalado) && !e.erro) {
      html = modo === 'construir'
        ? `<div class="cv-msg sistema">Modo Construir: a ANATOMIA do escritório conduz, um componente por vez, com a skill da pasta como referência.
           Diga "vamos continuar de onde paramos" — ele lê o progresso e retoma.</div>`
        : ehEnsino() ? introEnsino(e)
        : `<div class="cv-msg sistema">Pergunte alguma coisa. Ele abre o projeto,
           roda os scripts de diagnóstico e responde com o que achou.</div>`;
    } else if (ehEnsino() && !e.ensino && !e.rodando && e.historico.length) {
      // a última demonstração foi destilada: a próxima mensagem abre outra
      html += `<div class="cv-msg sistema">Demonstração concluída. A próxima mensagem começa uma demonstração nova.${(ensino && ensino.skills || []).length ? ' Skills aprendidas: ' + ensino.skills.map(s => esc(s.nome)).join(', ') + '.' : ''}</div>`;
    }

    c.innerHTML = html;
    ligarBotoesPlataformas();
    const travado = e.rodando || semLogin || (claude && !claude.instalado);
    el.enviar().disabled = travado;
    el.enviar().textContent = e.rodando ? (ehEnsino() ? 'fazendo…' : 'pensando…') : semLogin ? 'sem login' : 'Enviar';
    el.concluir().disabled = travado || !e.ensino || !e.historico.some(m => m.quem === 'voce' && m.modo === 'ensinar');
    if (nofim) c.scrollTop = c.scrollHeight;
  }

  /** o usuário logou noutro terminal: rechecar sem recarregar a página */
  async function rechecar() { await checarLogin(); atualizar(); }

  async function enviarTexto(t) {
    if (!t || !id) return;
    // resolver, construir e ensinar alteram o projeto: pedem administrador
    if (modo !== 'investigar' && typeof ADMIN !== 'undefined' && !ADMIN.ehAdmin()) { ADMIN.abrir('O modo ' + modo + ' altera o projeto.'); return; }
    el.enviar().disabled = true;
    try {
      const r = await (await fetch(`/api/agentes/${id}/chat${canal()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: t, modo })
      })).json();
      if (!r.ok && r.motivo) { alertaSistema(r.motivo); if (r.precisaAdmin) ADMIN.abrir(r.motivo); }
    } catch (e) { alertaSistema('não consegui falar com o servidor'); }
    atualizar();
  }

  async function enviar() {
    const t = el.texto().value.trim();
    if (!t) return;
    el.texto().value = '';
    enviarTexto(t);
  }

  /** "Tarefa concluída": a demonstração vira a skill do agente */
  async function concluir() {
    if (!id || !ehEnsino()) return;
    if (typeof ADMIN !== 'undefined' && !ADMIN.ehAdmin()) { ADMIN.abrir('Concluir a demonstração grava a skill do agente.'); return; }
    const nome = window.prompt('Um nome curto para a tarefa que você ensinou (vira o nome da skill). Pode deixar em branco.', '');
    if (nome === null) return;
    el.concluir().disabled = true;
    try {
      const r = await (await fetch(`/api/agentes/${id}/ensinar/concluir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome })
      })).json();
      if (!r.ok && r.motivo) { alertaSistema(r.motivo); if (r.precisaAdmin) ADMIN.abrir(r.motivo); }
    } catch (e) { alertaSistema('não consegui falar com o servidor'); }
    await carregarEnsino();
    atualizar();
  }

  function alertaSistema(txt) {
    el.linhas().insertAdjacentHTML('beforeend',
      `<div class="cv-msg sistema">${esc(txt)}</div>`);
    el.linhas().scrollTop = el.linhas().scrollHeight;
  }

  function ligarEventos() {
    el.enviar().addEventListener('click', enviar);
    el.concluir().addEventListener('click', concluir);
    el.texto().addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
    });
    document.querySelectorAll('.cv-op').forEach(b => b.addEventListener('click', () => setModo(b.dataset.modo)));
  }

  return { abrir, fechar, aberto, ligarEventos, atualizar, rechecar, concluir, get modo() { return modo; } };
})();
