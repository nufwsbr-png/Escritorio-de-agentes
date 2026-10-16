/* ===========================================================
   icones.js — os ícones em traço da tela (tema Compacto, escolhido
   pelo dono em 16/10/2026 em /estudio/telas.html)

   Um botão com data-ico="nome" ganha o desenho e o texto dele vira
   <span class="rotulo">; nas barras, o rótulo some e aparece em baixo ao
   passar o mouse (data-rotulo). ICONES.rotular(botao, nome, texto) troca
   os dois de uma vez (o 🔐 Admin usa).
   =========================================================== */
const ICONES = (() => {
  const TRACO = {
    admin: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    destrancado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
    quadro: '<path d="M12 17v5"/><path d="M9 3h6l-1 7 3 3H7l3-3z"/>',
    conexoes: '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v4a6 6 0 0 1-12 0z"/><path d="M12 18v4"/>',
    esteiras: '<circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M5 8v2a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V8M12 14v2"/>',
    crm: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
    cuki: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    avisos: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    relatorio: '<path d="M6 2h8l5 5v15H6z"/><path d="M14 2v5h5M9 13h7M9 17h7"/>',
    voz: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
    som: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    ligar: '<path d="M7 4l13 8-13 8z"/>',
    desligar: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    trabalho: '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    conversar: '<path d="M4 5h16v11H9l-5 4z"/>',
    ficha: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2"/><path d="M13 10h5M13 14h5M5.5 16.5c.6-1.6 1.8-2.3 3-2.3s2.4.7 3 2.3"/>',
    memoria: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    recados: '<path d="M3 13l2-8h14l2 8v6H3z"/><path d="M3 13h5l2 3h4l2-3h5"/>',
    propostas: '<path d="M9 18h6M10 21h4"/><path d="M8 13a5.5 5.5 0 1 1 8 0c-1 1-1.5 2-1.5 3h-5c0-1-.5-2-1.5-3z"/>',
    testar: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>',
    log: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
    novaAba: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    lupa: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svg = nome => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${TRACO[nome] || TRACO.mais}</svg>`;

  /** o texto do botão vira rótulo; o desenho entra na frente; o que já era elemento (badge) fica */
  function vestir(b) {
    const nome = b.dataset.ico;
    if (!nome || b.querySelector('svg.ico')) return;
    const textos = Array.from(b.childNodes).filter(n => n.nodeType === 3);
    const txt = textos.map(n => n.textContent).join('').trim();
    textos.forEach(n => n.remove());
    b.insertAdjacentHTML('afterbegin', svg(nome) + (txt ? `<span class="rotulo">${esc(txt)}</span>` : ''));
    if (txt && !b.dataset.rotulo) b.dataset.rotulo = txt;
  }
  function rotular(b, nome, texto) {
    if (!b) return;
    b.dataset.ico = nome;
    b.dataset.rotulo = texto;
    const badge = b.querySelector('.badge');
    b.innerHTML = svg(nome) + `<span class="rotulo">${esc(texto)}</span>`;
    if (badge) b.appendChild(badge);
  }
  function vestirTodos(raiz) { (raiz || document).querySelectorAll('[data-ico]').forEach(vestir); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => vestirTodos());
  else vestirTodos();
  return { svg, vestir, vestirTodos, rotular, TRACO };
})();
