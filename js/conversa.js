/* ===========================================================
   conversa.js — falar com o agente sobre o sistema dele.

   Cada agente é uma sessão do Claude Code rodando DENTRO da pasta
   do sistema dele: lê o código, roda os scripts de diagnóstico do
   próprio projeto e responde sobre o que encontrou.

   Investigar = só leitura.  Resolver = pode mexer no projeto.
   Construir  = a skill da trilha conduz a construção, um passo por vez.
   A sessão agora sobrevive a reinício do escritório (fica em disco).
   =========================================================== */
const CONVERSA = (() => {

  let id = null, modo = 'investigar', timer = null;

  const el = {
    painel:   () => document.getElementById('mon-conversa'),
    linhas:   () => document.getElementById('cv-linhas'),
    texto:    () => document.getElementById('cv-texto'),
    enviar:   () => document.getElementById('cv-enviar'),
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
                 'Pode executar']
  };

  let claude = null;   // { instalado, conectado }

  async function checarLogin() {
    try { claude = await (await fetch('/api/claude')).json(); }
    catch (e) { claude = null; }
  }

  function setModo(m) {
    modo = m;
    document.querySelectorAll('.cv-op').forEach(x => x.classList.toggle('on', x.dataset.modo === m));
    pintarAtalhos();
  }

  /** abre a conversa; `modoInicial` e `primeira` servem ao Construir recém-contratado */
  function abrir(sistemaId, modoInicial, primeira) {
    id = sistemaId;
    el.painel().classList.remove('hidden');
    const s = SISTEMAS.porId(id);
    // o botão Construir só faz sentido para agente com jornada na pasta
    const temJornada = !!(s && s.trilha);
    const bc = document.querySelector('.cv-op[data-modo="construir"]');
    if (bc) bc.classList.toggle('hidden', !temJornada);
    setModo(modoInicial || (temJornada && s.construcao && !s.construcao.concluido ? 'construir' : 'investigar'));
    checarLogin().then(atualizar);
    atualizar();
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
    try { e = await (await fetch(`/api/agentes/${id}/chat`)).json(); }
    catch (err) { return; }
    pintar(e);
  }

  function pintar(e) {
    const c = el.linhas();
    const nofim = c.scrollHeight - c.scrollTop - c.clientHeight < 60;

    let html = e.historico.map(m => {
      const quem = m.quem === 'voce' ? 'Você' : 'Agente';
      const tag = m.modo === 'resolver' ? ' · modo resolver' : m.modo === 'construir' ? ' · construindo' : '';
      const notas = (m.notas || []).length ? `<div class="cv-notas">${m.notas.map(esc).join(' · ')}</div>` : '';
      return `<div class="cv-msg ${m.quem}"><span class="qm">${quem}${esc(tag)}</span>${formata(m.texto)}${notas}</div>`;
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
      html += `<div class="cv-pensando"><i></i>${modo === 'construir' ? 'construindo… um passo pode levar alguns minutos' : 'investigando o projeto…'}</div>`;
    }
    // atenção: aqui é atribuição, não concatenação — só pode entrar quando
    // não há nada mais importante para dizer, senão apaga o aviso de login
    if (!e.historico.length && !e.rodando && !semLogin && !(claude && !claude.instalado) && !e.erro) {
      html = modo === 'construir'
        ? `<div class="cv-msg sistema">Modo Construir: a ANATOMIA do escritório conduz, um componente por vez, com a skill da pasta como referência.
           Diga "vamos continuar de onde paramos" — ele lê o progresso e retoma.</div>`
        : `<div class="cv-msg sistema">Pergunte alguma coisa. Ele abre o projeto,
           roda os scripts de diagnóstico e responde com o que achou.</div>`;
    }

    c.innerHTML = html;
    const travado = e.rodando || semLogin || (claude && !claude.instalado);
    el.enviar().disabled = travado;
    el.enviar().textContent = e.rodando ? 'pensando…' : semLogin ? 'sem login' : 'Enviar';
    if (nofim) c.scrollTop = c.scrollHeight;
  }

  /** o usuário logou noutro terminal: rechecar sem recarregar a página */
  async function rechecar() { await checarLogin(); atualizar(); }

  async function enviarTexto(t) {
    if (!t || !id) return;
    // resolver e construir alteram o projeto: pedem administrador
    if (modo !== 'investigar' && typeof ADMIN !== 'undefined' && !ADMIN.ehAdmin()) { ADMIN.abrir('O modo ' + modo + ' altera o projeto.'); return; }
    el.enviar().disabled = true;
    try {
      const r = await (await fetch(`/api/agentes/${id}/chat`, {
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

  function alertaSistema(txt) {
    el.linhas().insertAdjacentHTML('beforeend',
      `<div class="cv-msg sistema">${esc(txt)}</div>`);
    el.linhas().scrollTop = el.linhas().scrollHeight;
  }

  function ligarEventos() {
    el.enviar().addEventListener('click', enviar);
    el.texto().addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
    });
    document.querySelectorAll('.cv-op').forEach(b => b.addEventListener('click', () => setModo(b.dataset.modo)));
  }

  return { abrir, fechar, aberto, ligarEventos, atualizar, rechecar, get modo() { return modo; } };
})();
