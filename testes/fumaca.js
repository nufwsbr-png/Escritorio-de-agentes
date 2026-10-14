/* ===========================================================
   testes/fumaca.js — a tela inteira, no Chrome headless

   Sobe o escritório numa porta de teste com uma pasta de dados temporária
   (ESCRITORIO_DADOS) e abre a tela no Chrome sem janela, pelo protocolo
   DevTools. Confere, com asserções: a tela monta sem erro de JavaScript, o
   monitor e os painéis extras abrem, o modal de plataformas e as caixas do
   contratar aparecem, o aviso de "não aberto" e os Ajustes funcionam, e a
   planta de 7 salas da clínica redesenha o escritório (salas, mesas, caminho
   até a reunião). Sem planta, as 5 salas de sempre.

   Precisa do Chrome instalado. Uso: node testes/fumaca.js  (ou npm test)
   =========================================================== */
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');
const PORT = 4398, DEVTOOLS = 9336;
const URL_ALVO = 'http://localhost:' + PORT + '/';
const CHROMES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const CHROME = process.env.CHROME || CHROMES.find(c => fs.existsSync(c));

const espera = ms => new Promise(r => setTimeout(r, ms));
const getJson = (u) => new Promise((res, rej) => http.get(u, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => { try { res(JSON.parse(s)); } catch (e) { rej(e); } }); }).on('error', rej));

let falhas = 0;
function ok(cond, msg) { if (cond) console.log('  ✔ ' + msg); else { falhas++; console.log('  ✖ ' + msg); } }

/* ---------------- o escritório de teste ---------------- */
function dadosDeTeste(comPlanta) {
  const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-fumaca-'));
  const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'sistemas.exemplo.json'), 'utf8'));
  fs.writeFileSync(path.join(DADOS, 'sistemas.json'), JSON.stringify(reg, null, 2));
  fs.writeFileSync(path.join(DADOS, 'plataformas.json'), JSON.stringify([
    { id: 'drive', nome: 'Drive de clientes', tipo: 'pasta', url: '', variaveis: { DRIVE_PASTA: 'C:/x' }, notas: '', criadaEm: 'x', atualizadaEm: 'x' },
    { id: 'ophir', nome: 'Ophir', tipo: 'api', url: 'https://app.ophir', variaveis: { OPHIR_URL: 'u', OPHIR_TOKEN: 'segredo-99' }, notas: '', criadaEm: 'x', atualizadaEm: 'x' }], null, 2));
  if (comPlanta) {
    const P = require(path.join(ROOT, 'planta.js'));
    const r = P.gerar(JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'salas-clinica.json'), 'utf8')));
    assert.equal(r.ok, true, r.motivo);
    fs.writeFileSync(path.join(DADOS, 'planta.json'), JSON.stringify(r.planta, null, 2));
    fs.writeFileSync(path.join(DADOS, 'config.json'), JSON.stringify({ empresa: 'Clínica Teste', nome: 'Escritório da Clínica Teste' }));
  }
  return DADOS;
}
async function subirEscritorio(DADOS) {
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT), ESCRITORIO_DADOS: DADOS }, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = ''; p.stdout.on('data', d => saida += d); p.stderr.on('data', d => saida += d);
  for (let i = 0; i < 50; i++) { try { await getJson('http://127.0.0.1:' + PORT + '/api/admin'); return p; } catch (e) { await espera(200); } }
  throw new Error('o escritório não subiu: ' + saida);
}

/* ---------------- o Chrome ---------------- */
async function abrirChrome() {
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1400,900', '--remote-debugging-port=' + DEVTOOLS, '--user-data-dir=' + perfil, 'about:blank'], { stdio: 'ignore' });
  let alvos = null;
  for (let i = 0; i < 40 && !alvos; i++) { try { alvos = await getJson('http://127.0.0.1:' + DEVTOOLS + '/json'); } catch (e) { await espera(300); } }
  if (!alvos) throw new Error('o Chrome não respondeu na porta ' + DEVTOOLS);
  const ws = new WebSocket(alvos.find(t => t.type === 'page').webSocketDebuggerUrl);
  let id = 0; const pend = new Map(); const erros = [];
  const send = (m, p = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({ id: n, method: m, params: p })); });
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result || m.error); pend.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') erros.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') erros.push('console.error: ' + m.params.args.map(a => a.value || a.description).join(' '));
  };
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable'); await send('Page.enable');
  const ev = async (x) => (await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true })).result?.value;
  const ir = async (u) => { await send('Page.navigate', { url: u }); await espera(4000); };
  const foto = async () => (await send('Page.captureScreenshot', { format: 'png' })).data;
  const fechar = () => { try { ws.close(); } catch (e) {} try { chrome.kill(); } catch (e) {} setTimeout(() => fs.rmSync(perfil, { recursive: true, force: true }), 500); };
  return { ev, ir, foto, erros, fechar };
}

/* ---------------- os cenários ---------------- */
async function cenarioPadrao(b) {
  console.log('\nCenário 1: escritório padrão, sem config (não aberto)');
  await b.ir(URL_ALVO);
  ok((await b.ev('document.title')).length > 0, 'a página carregou');
  ok(await b.ev('!document.getElementById("sem-abertura").classList.contains("hidden")'), 'aviso "não foi aberto" visível sem config.json');
  ok(await b.ev('document.querySelectorAll("#team-list .card").length') >= 1, 'equipe tem pelo menos um card');
  ok(await b.ev('document.querySelectorAll("#rooms-list .roomcard").length') === 5, 'painel Salas mostra as 5 salas padrão');
  await b.ev('__escritorio.sistema("EXEMPLO")'); await espera(1200);
  ok(await b.ev('!document.getElementById("monitor").classList.contains("hidden")'), 'monitor do exemplo abre');
  for (const [botao, titulo] of [['ficha', 'Ficha'], ['memoria', 'Memória'], ['recados', 'Recados'], ['propostas', 'Propostas'], ['plataformas', 'Plataformas'], ['testar', 'Testar']]) {
    await b.ev('document.getElementById("mon-' + botao + '").click()'); await espera(900);
    ok(String(await b.ev('document.querySelector("#mon-extra .ex-top b")?.textContent')).includes(titulo), 'painel ' + titulo + ' abre');
    if (botao === 'plataformas') ok(await b.ev('document.querySelectorAll("#mon-extra .pl-caixa").length') === 2, 'painel Plataformas lista as 2 cadastradas');
  }
  await b.ev('document.getElementById("mon-x").click()'); await espera(300);
  await b.ev('PLATAFORMAS_UI.abrir()'); await espera(900);
  ok(await b.ev('document.querySelectorAll("#modal-body .pl-item").length') === 2, 'modal Plataformas lista 2');
  ok(!(await b.ev('document.getElementById("modal-body").innerHTML.includes("segredo-99")')), 'modal Plataformas não vaza valor');
  await b.ev('document.getElementById("modal-x").click()');
  await b.ev('document.getElementById("btn-cuki").click()'); await espera(1200);
  ok(String(await b.ev('document.querySelector("#modal-body h3")?.textContent')).includes('Cuki BOT'), 'Cuki BOT abre');
  ok(await b.ev('document.getElementById("modal-body").textContent.includes("Nenhum laudo")'), 'Cuki BOT sem laudo explica o que fazer');
  await b.ev('document.getElementById("modal-x").click()');
  await b.ev('document.getElementById("btn-esteiras").click()'); await espera(1200);
  ok(String(await b.ev('document.querySelector("#modal-body h3")?.textContent')).includes('Esteiras'), 'Esteiras abre');
  ok(await b.ev('document.getElementById("modal-body").textContent.includes("Nenhuma esteira")'), 'Esteiras sem definição explica o que fazer');
  await b.ev('document.getElementById("modal-x").click()');
  await b.ev('AJUSTES.abrir()'); await espera(1500);
  ok(String(await b.ev('document.querySelector("#modal-body h3")?.textContent')).includes('Ajustes'), 'Ajustes abre');
  ok(await b.ev('!!document.querySelector(".aj-status")'), 'Ajustes mostra o status do Claude Code');
  ok(await b.ev('!!document.querySelector(".aj-aviso")'), 'Ajustes avisa que não foi aberto');
  await b.ev('document.getElementById("modal-x").click()');
  await b.ev('CONTRATAR.abrir()'); await espera(1200);
  ok(await b.ev('!!document.getElementById("ct-vendo")'), 'contratar passo 1 mostra "Agente que aprende vendo"');
  await b.ev('document.querySelector("#modal-body [data-s=sdr]")?.click()'); await espera(500);
  ok(await b.ev('document.querySelectorAll("#modal-body .pl-caixa").length') === 2, 'contratar passo 2 mostra as caixas das plataformas');
  ok(String(await b.ev('document.getElementById("ct-ok")?.textContent')).includes('construção'), 'pela anatomia, o botão diz construção');
  await b.ev('document.getElementById("ct-back").click()'); await espera(300);
  await b.ev('document.getElementById("ct-vendo").click()'); await espera(500);
  ok(await b.ev('!!document.getElementById("ct-setor-sel")'), 'aprende vendo: passo 2 pede o setor');
  ok(String(await b.ev('document.getElementById("ct-ok")?.textContent')).includes('ensinar'), 'aprende vendo: o botão diz ensinar');
  await b.ev('document.getElementById("modal-x").click()');
  // o modo Ensinar no Conversar do exemplo (agente de tarefa): botão visível, "Tarefa concluída" aparece só nele
  await b.ev('__escritorio.sistema("EXEMPLO")'); await espera(1000);
  await b.ev('document.getElementById("mon-chat").click()'); await espera(800);
  ok(await b.ev('!document.querySelector(".cv-op[data-modo=ensinar]").classList.contains("hidden")'), 'Conversar do agente de tarefa mostra Ensinar');
  ok(await b.ev('document.getElementById("cv-concluir").classList.contains("hidden")'), '"Tarefa concluída" escondido fora do Ensinar');
  await b.ev('document.querySelector(".cv-op[data-modo=ensinar]").click()'); await espera(900);
  ok(await b.ev('!document.getElementById("cv-concluir").classList.contains("hidden")'), '"Tarefa concluída" aparece em Ensinar');
  ok(await b.ev('document.getElementById("cv-concluir").disabled'), '"Tarefa concluída" desabilitado sem demonstração');
  ok(await b.ev('document.getElementById("cv-linhas").textContent.includes("você faz, ele aprende")'), 'Ensinar explica o que fazer');
  await b.ev('document.getElementById("mon-x").click()'); await espera(300);
}

async function cenarioPlanta(b) {
  console.log('\nCenário 2: planta da clínica (7 salas), escritório aberto');
  await b.ir(URL_ALVO);
  ok(await b.ev('document.getElementById("sem-abertura").classList.contains("hidden")'), 'sem aviso: config.json existe');
  ok(await b.ev('!!(window.ESCRITORIO && ESCRITORIO.planta)'), 'a planta chegou pelo /config.js');
  ok(await b.ev('Object.keys(WORLD.ROOMS).length') === 8, 'WORLD tem 7 salas + corredor');
  ok(await b.ev('document.querySelectorAll("#rooms-list .roomcard").length') === 8, 'painel Salas mostra 7 salas + corredor');
  ok(await b.ev('FURN.workSlots.filter(s => !s.vip).length') === 14, 'mesas de agente: 12 da operação + 2 consultórios');
  ok(await b.ev('FURN.workSlots.filter(s => s.vip && s.id !== "REC-1").length') === 2, 'duas mesas da diretoria');
  ok(await b.ev('!!FURN.workSlots.find(s => s.id === "REC-1")'), 'balcão da recepção tem o ponto do Cuki BOT');
  ok(await b.ev('!!ROSTER.get("cuki-bot") && ROSTER.get("cuki-bot").cuki === true'), 'o boneco do Cuki BOT existe');
  ok(await b.ev('FURN.meetSlots.length') >= 6, 'cadeiras na sala de reunião');
  ok(await b.ev('FURN.restSlots.length') >= 3, 'lugares de descanso');
  ok(await b.ev('ROSTER.all().filter(a => !a.boss).every(a => a.slotId)'), 'todo agente tem mesa');
  // um boneco anda até a sala de reunião e chega lá
  const chegou = await b.ev(`(async () => {
    const ac = [...__escritorio.actors.values()].find(a => !a.a.boss && !a.hidden);
    if (!ac) return 'sem boneco';
    const sala = Object.values(WORLD.ROOMS).find(r => r.tipo === 'reuniao');
    ac.goTo(sala.x1 + 2.5, sala.y1 + 2.5);
    for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 100)); if (WORLD.roomAt(Math.round(ac.x), Math.round(ac.y)) === sala.id) return 'chegou'; }
    return 'não chegou: ' + Math.round(ac.x) + ',' + Math.round(ac.y) + ' em ' + WORLD.roomAt(Math.round(ac.x), Math.round(ac.y));
  })()`);
  ok(chegou === 'chegou', 'um boneco anda do corredor até a sala de reunião (' + chegou + ')');
  await b.ev('document.getElementById("z-fit").click()'); await espera(600);
  if (process.env.FUMACA_FOTO) { const shot = await b.foto(); fs.writeFileSync(process.env.FUMACA_FOTO, Buffer.from(shot, 'base64')); }
}

(async () => {
  if (typeof WebSocket === 'undefined') { console.log('fumaça pulada: precisa do Node 22 ou mais novo (WebSocket nativo); o resto do npm test vale'); process.exit(0); }
  if (!CHROME) { console.log('fumaça pulada: Chrome não encontrado (defina CHROME=caminho)'); process.exit(0); }
  const DADOS1 = dadosDeTeste(false), DADOS2 = dadosDeTeste(true);
  let esc = null, b = null;
  try {
    b = await abrirChrome();
    esc = await subirEscritorio(DADOS1);
    await cenarioPadrao(b);
    esc.kill(); await espera(800);
    esc = await subirEscritorio(DADOS2);
    b.erros.length = 0;
    await cenarioPlanta(b);
    ok(b.erros.length === 0, 'nenhum erro de JavaScript' + (b.erros.length ? ': ' + b.erros.join(' | ') : ''));
  } catch (e) {
    falhas++; console.log('  ✖ a fumaça quebrou: ' + e.message);
  } finally {
    if (b) b.fechar();
    if (esc) esc.kill();
    await espera(600);
    for (const d of [DADOS1, DADOS2]) fs.rmSync(d, { recursive: true, force: true });
  }
  console.log(falhas ? '\nfumaça: ' + falhas + ' falha(s)' : '\nfumaça ok');
  process.exit(falhas ? 1 : 0);
})();
