/* ===========================================================
   cuki.js — Cuki BOT, a IA analista do escritório (parte 1: o laudo)

   Confere a saúde do fluxo, dos agentes e a aptidão para o CRM. Regra da
   anatomia: MEDE POR CÓDIGO, EXPLICA PELO MODELO. Tudo que é número ou
   estado vem do que o escritório já tem (registro, /saude e /entidades dos
   agentes, plataformas, esteiras, Claude, tranca, avisos). O Claude Code
   recebe só as medidas (sem nenhum valor de variável), roda SEM ferramentas
   e escreve a leitura e as propostas para o CRM.

   Laudos em data/cuki/laudos/<data-hora>.json (medidas) e .md (texto).
   Design: docs/superpowers/specs/2026-10-14-cuki-bot-design.md
   =========================================================== */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

let dep = {};   // { DADOS, lerRegistro, agentes (AGENTES), plataformas, esteiras, admin, avisos, lerConfig, estadoClaude, CLAUDE_BIN }

const CORES = ['verde', 'amarelo', 'vermelho'];
const pior = (lista) => CORES[Math.max(0, ...lista.map(c => CORES.indexOf(c)))];
const DIA = 86400000;
const dirLaudos = () => path.join(dep.DADOS, 'cuki', 'laudos');

/* ---------------- http pequeno, com prazo ---------------- */
function pede(url, metodo = 'GET', cabecalhos = {}, prazo = 4000) {
  return new Promise(resolve => {
    let u; try { u = new URL(url); } catch (e) { return resolve({ status: 0, erro: 'endereço inválido' }); }
    const mod = u.protocol === 'https:' ? https : http;
    try {
      const req = mod.request(u, { method: metodo, headers: cabecalhos, timeout: prazo }, r => { let s = ''; r.on('data', d => { if (s.length < 20000) s += d; }); r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch (e) {} resolve({ status: r.statusCode, json: j }); }); });
      req.on('error', e => resolve({ status: 0, erro: e.message })); req.on('timeout', () => { req.destroy(); resolve({ status: 0, erro: 'sem resposta' }); });
      req.end();
    } catch (e) { resolve({ status: 0, erro: e.message }); }
  });
}
const lerLinhas = (arq) => { try { return fs.readFileSync(arq, 'utf8').split(/\r?\n/).filter(l => l.trim().startsWith('- ')).length; } catch (e) { return 0; } };
const campoProgresso = (pasta, rotulo) => { try { const m = new RegExp('^' + rotulo + ':\\s*(.+)$', 'm').exec(fs.readFileSync(path.join(pasta, 'progresso-do-agente.md'), 'utf8')); const v = m ? m[1].trim() : ''; return /\[A PREENCHER/.test(v) ? '' : v; } catch (e) { return ''; } };

/* ---------------- as medidas, área por área ---------------- */
async function medirAgentes() {
  const reg = dep.lerRegistro();
  const agentes = [];
  for (const [id, s] of Object.entries(reg)) {
    if (!s.trilha) continue;
    const a = { id, nome: s.nome || id, setor: s.setor || '', trilha: s.trilha, cor: 'verde', motivos: [] };
    const prog = dep.agentes ? dep.agentes.progressoDe(s.pasta, s.trilha) : null;
    a.progresso = prog ? { passo: prog.passo, total: prog.total, portao: prog.portao, concluido: prog.concluido } : null;
    a.entidade = campoProgresso(s.pasta || '', 'Entidade \\(a unidade de trabalho\\)');
    a.tarefa = campoProgresso(s.pasta || '', 'Tarefa em uma frase');
    a.licoesPropostas = s.pasta ? lerLinhas(path.join(s.pasta, 'memoria', 'licoes-propostas.md')) : 0;
    const saude = s.porta ? await pede('http://127.0.0.1:' + s.porta + '/saude') : { status: 0 };
    a.ligado = saude.status === 200;
    a.entidades = { total: 0, porStatus: {}, perguntasParadasDias: 0, ultimaRodada: null, comErro: 0, reais30d: 0, soAmostras: true };
    if (a.ligado && s.trilha !== 'atendimento' && dep.esteiras) {
      const r = await dep.esteiras.entidadesDoAgente(id);
      if (r.ok) {
        for (const e of r.entidades) {
          a.entidades.total++;
          a.entidades.porStatus[e.status] = (a.entidades.porStatus[e.status] || 0) + 1;
          if (e.status === 'com erro') a.entidades.comErro++;
          const quando = e.atualizado ? new Date(e.atualizado).getTime() : 0;
          if (quando && (!a.entidades.ultimaRodada || quando > new Date(a.entidades.ultimaRodada).getTime())) a.entidades.ultimaRodada = e.atualizado;
          if (e.status === 'aguardando pergunta' && quando) a.entidades.perguntasParadasDias = Math.max(a.entidades.perguntasParadasDias, Math.floor((Date.now() - quando) / DIA));
          const amostra = /^(amostras[\\/]|caso-)/i.test(String(e.id));
          if (!amostra) { a.entidades.soAmostras = false; if (quando && Date.now() - quando < 30 * DIA) a.entidades.reais30d++; }
        }
      } else a.motivos.push('não consegui ler as entidades: ' + r.motivo);
    }
    if (!a.ligado) { a.cor = 'vermelho'; a.motivos.push('fora do ar'); }
    if (a.entidades.comErro) { a.cor = 'vermelho'; a.motivos.push(a.entidades.comErro + ' entidade(s) com erro'); }
    if (a.cor !== 'vermelho') {
      if (prog && prog.emTreinamento) { a.cor = 'amarelo'; a.motivos.push('em treinamento (' + prog.passo + ' de ' + prog.total + ' componentes; o PORTÃO ainda não passou)'); }
      if (a.entidades.perguntasParadasDias > 2) { a.cor = 'amarelo'; a.motivos.push('pergunta ao dono parada há ' + a.entidades.perguntasParadasDias + ' dias'); }
      if (a.licoesPropostas > 10) { a.cor = 'amarelo'; a.motivos.push(a.licoesPropostas + ' lições propostas esperando triagem'); }
    }
    if (!a.motivos.length) a.motivos.push(prog && prog.concluido ? 'concluído e no ar' : 'no ar, portão passado');
    agentes.push(a);
  }
  const cor = agentes.length ? pior(agentes.map(a => a.cor)) : 'vermelho';
  return { cor, agentes, motivo: agentes.length ? undefined : 'nenhum agente do escritório' };
}

async function medirPlataformas() {
  const lista = dep.plataformas ? dep.plataformas.listar(true) : [];
  const plataformas = [];
  for (const p of lista) {
    const vars = Object.entries(p.variaveis || {});
    const vazias = vars.filter(([, v]) => String(v || '').trim() === '').map(([k]) => k);
    const item = { id: p.id, nome: p.nome, tipo: p.tipo, variaveis: vars.map(([k]) => k), vazias, teste: 'sem teste', cor: 'verde', usadaPor: dep.plataformas.usadaPor ? dep.plataformas.usadaPor(p.id) : [] };
    const pref = dep.plataformas.prefixoDe(p.id);
    const v = (s) => String((p.variaveis || {})[pref + s] || '').trim();
    if (vazias.length) { item.cor = 'vermelho'; item.teste = 'variável vazia'; }
    else if (p.tipo === 'pasta') { const existe = v('PASTA') && fs.existsSync(v('PASTA')); item.teste = existe ? 'pasta existe' : 'pasta não encontrada'; if (!existe) item.cor = 'vermelho'; }
    else if (['api', 'navegador', 'link'].includes(p.tipo) || (p.tipo === 'mcp' && v('URL'))) {
      const url = v('URL') || p.url;
      if (url) { const r = await pede(url, 'GET', {}, 5000); item.teste = r.status && r.status < 500 ? 'endereço responde (' + r.status + ')' : 'endereço sem resposta'; if (!(r.status && r.status < 500)) item.cor = 'vermelho'; }
      else { item.teste = 'sem endereço para testar'; item.cor = 'amarelo'; }
    } else { item.teste = 'preenchida; este tipo não tem teste automático'; item.cor = 'amarelo'; }
    plataformas.push(item);
  }
  return { cor: plataformas.length ? pior(plataformas.map(p => p.cor)) : 'amarelo', plataformas, motivo: plataformas.length ? undefined : 'nenhuma plataforma cadastrada' };
}

function medirFluxo(agentes) {
  const reais30d = agentes.reduce((n, a) => n + a.entidades.reais30d, 0);
  const total = agentes.reduce((n, a) => n + a.entidades.total, 0);
  const soAmostras = total > 0 && agentes.every(a => a.entidades.soAmostras);
  const porStatus = {};
  for (const a of agentes) for (const [k, n] of Object.entries(a.entidades.porStatus)) porStatus[k] = (porStatus[k] || 0) + n;
  const est = dep.esteiras ? dep.esteiras.estado() : { esteiras: [], entidades: [] };
  const ativas = est.entidades.filter(e => e.status !== 'concluída');
  const paradas1d = ativas.filter(e => /parada|com erro|na fila/.test(e.status) && e.atualizado && Date.now() - new Date(e.atualizado).getTime() > DIA).length;
  const fluxo = { entidadesTotal: total, reaisUltimos30Dias: reais30d, soAmostras, porStatus, esteiras: est.esteiras.length, esteirasEntidadesAtivas: ativas.length, esteirasConcluidas: est.entidades.length - ativas.length, esteirasParadasMaisDe1Dia: paradas1d, cor: 'verde', motivos: [] };
  if (!reais30d) { fluxo.cor = 'vermelho'; fluxo.motivos.push(total ? (soAmostras ? 'só amostras foram tratadas; nenhuma entidade real nos últimos 30 dias' : 'nenhuma entidade real nos últimos 30 dias') : 'nenhuma entidade tratada ainda'); }
  if (paradas1d) { if (fluxo.cor === 'verde') fluxo.cor = 'amarelo'; fluxo.motivos.push(paradas1d + ' entidade(s) parada(s) em esteira há mais de 1 dia'); }
  if (!fluxo.motivos.length) fluxo.motivos.push(reais30d + ' entidade(s) real(is) nos últimos 30 dias');
  return fluxo;
}

async function medirBase() {
  const claude = dep.estadoClaude ? await dep.estadoClaude() : { instalado: false, conectado: false };
  const cfg = dep.lerConfig ? dep.lerConfig() : {};
  const av = dep.avisos && dep.avisos.ler ? dep.avisos.ler() : {};
  const base = { claudeInstalado: !!claude.instalado, claudeConectado: !!claude.conectado, senhaAdmin: !!(dep.admin && dep.admin.temSenha()), aberto: !!(cfg && cfg.aberturaEm), avisosAtivos: !!((av.ntfy && av.ntfy.ativo) || (av.whatsapp && av.whatsapp.ativo)), cor: 'verde', motivos: [] };
  if (!base.claudeConectado) { base.cor = 'vermelho'; base.motivos.push(base.claudeInstalado ? 'Claude Code sem login (claude auth login)' : 'Claude Code não encontrado nesta máquina'); }
  if (!base.senhaAdmin) { base.cor = 'vermelho'; base.motivos.push('sem senha de administrador (🔐 Admin)'); }
  if (base.cor !== 'vermelho') { if (!base.avisosAtivos) { base.cor = 'amarelo'; base.motivos.push('avisos desligados (🔔 Avisos)'); } if (!base.aberto) { base.cor = 'amarelo'; base.motivos.push('escritório sem abertura (/criar-escritorio)'); } }
  if (!base.motivos.length) base.motivos.push('Claude conectado, tranca e avisos no lugar');
  return base;
}

function medirAptidao(agentes, plataformas) {
  const aptos = agentes.agentes.filter(a => a.cor === 'verde' && a.trilha !== 'atendimento').map(a => ({ id: a.id, nome: a.nome, setor: a.setor, entidade: a.entidade, tarefa: a.tarefa }));
  const quase = agentes.agentes.filter(a => a.cor === 'amarelo' && a.trilha !== 'atendimento').map(a => a.nome);
  const usaveis = plataformas.plataformas.filter(p => p.cor !== 'vermelho').map(p => ({ id: p.id, nome: p.nome, tipo: p.tipo }));
  const apt = { agentesAptos: aptos, agentesQuase: quase, plataformasUsaveis: usaveis, entidadesSugeridas: [...new Set(aptos.map(a => a.entidade).filter(Boolean))], cor: 'verde', motivos: [] };
  if (!aptos.length) { apt.cor = 'vermelho'; apt.motivos.push(quase.length ? 'nenhum agente verde ainda (' + quase.join(', ') + ' quase lá)' : 'nenhum agente apto'); }
  else if (!usaveis.length) { apt.cor = 'amarelo'; apt.motivos.push('agentes aptos, mas nenhuma plataforma usável'); }
  else apt.motivos.push(aptos.length + ' agente(s) apto(s) e ' + usaveis.length + ' plataforma(s) usável(is)');
  return apt;
}

async function medir() {
  const agentes = await medirAgentes();
  const plataformas = await medirPlataformas();
  const fluxo = medirFluxo(agentes.agentes);
  const base = await medirBase();
  const aptidao = medirAptidao(agentes, plataformas);
  const areas = { agentes, plataformas, fluxo, base, aptidao };
  const cfg = dep.lerConfig ? dep.lerConfig() : {};
  return { quando: new Date().toISOString(), empresa: cfg.empresa || cfg.nome || '', geral: pior(Object.values(areas).map(a => a.cor)), areas };
}

/* ---------------- o laudo: a parte garantida (código) ---------------- */
const BOLA = { verde: '🟢', amarelo: '🟡', vermelho: '🔴' };
function laudoTexto(m) {
  const A = m.areas;
  const fazer = [];
  for (const a of A.agentes.agentes) for (const x of a.motivos) if (a.cor !== 'verde') fazer.push(a.nome + ': ' + x);
  if (A.agentes.motivo) fazer.push(A.agentes.motivo + ': contrate na aba Contratar');
  for (const p of A.plataformas.plataformas) if (p.cor === 'vermelho') fazer.push('Plataforma ' + p.nome + ': ' + p.teste + (p.vazias.length ? ' (' + p.vazias.join(', ') + ')' : '') + ' — 🔌 Plataformas');
  if (A.plataformas.motivo) fazer.push(A.plataformas.motivo + ' — cadastre em 🔌 Plataformas');
  if (A.fluxo.cor !== 'verde') for (const x of A.fluxo.motivos) fazer.push('Fluxo: ' + x);
  if (A.base.cor !== 'verde') for (const x of A.base.motivos) fazer.push('Base: ' + x);
  const linhas = [
    '# Laudo do Cuki BOT' + (m.empresa ? ' — ' + m.empresa : ''),
    '', 'Quando: ' + new Date(m.quando).toLocaleString('pt-BR') + ' · Geral: ' + BOLA[m.geral] + ' ' + m.geral, '',
    '## Semáforo', '',
    '| Área | Estado | Resumo |', '|---|---|---|',
    '| Agentes | ' + BOLA[A.agentes.cor] + ' | ' + (A.agentes.motivo || A.agentes.agentes.map(a => a.nome + ' ' + BOLA[a.cor]).join(', ')) + ' |',
    '| Plataformas | ' + BOLA[A.plataformas.cor] + ' | ' + (A.plataformas.motivo || A.plataformas.plataformas.map(p => p.nome + ' ' + BOLA[p.cor]).join(', ')) + ' |',
    '| Fluxo | ' + BOLA[A.fluxo.cor] + ' | ' + A.fluxo.motivos.join('; ') + ' |',
    '| Base | ' + BOLA[A.base.cor] + ' | ' + A.base.motivos.join('; ') + ' |',
    '| Aptidão para o CRM | ' + BOLA[A.aptidao.cor] + ' | ' + A.aptidao.motivos.join('; ') + ' |',
    '', '## O que fazer antes', ''
  ];
  linhas.push(...(fazer.length ? fazer.map((f, i) => (i + 1) + '. ' + f) : ['Nada pendente: o escritório está pronto para o Criar CRM.']));
  return linhas.join('\n') + '\n';
}

/* ---------------- a parte interpretada (Claude, sem ferramentas) ---------------- */
const PAPEL = 'Você é o Cuki BOT, a IA analista do Escritório de Agentes. Você recebe as MEDIDAS do escritório em JSON (estados e números já conferidos por código; não há nenhum valor de senha ou chave neles, só nomes). ' +
  'Escreva, em português do Brasil simples, direto, sem jargão, para o dono do negócio ler no celular: ' +
  '1) "## Leitura do Cuki BOT": 3 a 6 frases curtas sobre como o escritório está, citando só o que está nas medidas (nunca invente número nem nome). ' +
  '2) Se a aptidão para o CRM estiver verde ou amarela, "## Propostas para o CRM": o que acompanhar (a entidade, no singular e plural), as etapas sugeridas em ordem, o cargo de cada agente apto, as plataformas que o CRM leria ou escreveria, e quem cuidaria de cada etapa (agente ou pessoa). Se estiver vermelha, diga em uma frase o que falta para começar. ' +
  '3) Uma linha final "Resumo: ..." de até 20 palavras. Não repita o semáforo nem a lista "o que fazer antes": eles já estão no laudo. Não use tabelas.';

function chamarClaude(medidas) {
  return new Promise(resolve => {
    const bin = dep.CLAUDE_BIN || 'claude';
    const cwd = path.join(dep.DADOS, 'cuki'); fs.mkdirSync(cwd, { recursive: true });
    // --tools "" desliga todas as ferramentas: o Claude só lê o JSON que recebe; cwd é a pasta do Cuki, sem segredo nenhum
    const args = ['-p', '--output-format', 'json', '--permission-mode', 'plan', '--tools', '', '--model', process.env.CUKI_MODELO || 'sonnet', '--append-system-prompt', PAPEL];
    let saida = '', erro = '', p;
    try { p = spawn(bin, args, { cwd, env: process.env, stdio: ['pipe', 'pipe', 'pipe'] }); } catch (e) { return resolve({ erro: e.message }); }
    const prazo = setTimeout(() => { try { p.kill(); } catch (e) {} }, 4 * 60 * 1000);
    p.stdin.on('error', () => {}); p.stdin.end('MEDIDAS:\n' + JSON.stringify(medidas, null, 1), 'utf8');
    p.stdout.on('data', d => saida += d); p.stderr.on('data', d => erro += d);
    p.on('error', e => { clearTimeout(prazo); resolve({ erro: e.message }); });
    p.on('exit', () => { clearTimeout(prazo); let j = null; try { j = JSON.parse(saida); } catch (e) {} if (!j || j.is_error) return resolve({ erro: (j && j.result) || erro.slice(0, 300) || 'sem resposta' }); resolve({ texto: String(j.result || ''), custo: j.total_cost_usd || 0 }); });
  });
}

/* ---------------- analisar, gravar, ler ---------------- */
let rodando = false;
async function analisar(opts = {}) {
  if (rodando) return { ok: false, motivo: 'já tem uma análise em andamento' };
  rodando = true;
  try {
    const m = await medir();
    const semClaude = opts.semClaude || process.env.ESCRITORIO_CUKI_SEM_CLAUDE === '1';
    let texto = laudoTexto(m);
    let leitura = null;
    if (!semClaude) { leitura = await chamarClaude(m); texto += '\n' + (leitura.erro ? '## Leitura do Cuki BOT\n\n(o Claude Code não respondeu desta vez: ' + String(leitura.erro).slice(0, 160) + '. O laudo acima vale; a leitura fica para a próxima análise.)\n' : leitura.texto.trim() + '\n'); }
    else texto += '\n## Leitura do Cuki BOT\n\n(análise sem o Claude Code: só as medidas)\n';
    fs.mkdirSync(dirLaudos(), { recursive: true });
    const nome = m.quando.replace(/[:.]/g, '-').slice(0, 19);
    fs.writeFileSync(path.join(dirLaudos(), nome + '.json'), JSON.stringify({ ...m, leitura: leitura && !leitura.erro ? { custo: leitura.custo } : null }, null, 2) + '\n');
    fs.writeFileSync(path.join(dirLaudos(), nome + '.md'), texto);
    return { ok: true, laudo: { nome, quando: m.quando, geral: m.geral, areas: resumoAreas(m), texto } };
  } catch (e) { return { ok: false, motivo: e.message }; }
  finally { rodando = false; }
}
const resumoAreas = (m) => Object.fromEntries(Object.entries(m.areas).map(([k, a]) => [k, { cor: a.cor, motivos: a.motivos || (a.motivo ? [a.motivo] : []) }]));
function ultimo() {
  let nomes = []; try { nomes = fs.readdirSync(dirLaudos()).filter(f => f.endsWith('.json')).sort(); } catch (e) { return null; }
  const n = nomes[nomes.length - 1]; if (!n) return null;
  try {
    const m = JSON.parse(fs.readFileSync(path.join(dirLaudos(), n), 'utf8'));
    let texto = ''; try { texto = fs.readFileSync(path.join(dirLaudos(), n.replace(/\.json$/, '.md')), 'utf8'); } catch (e) {}
    return { nome: n.replace(/\.json$/, ''), quando: m.quando, geral: m.geral, areas: resumoAreas(m), texto, medidas: m };
  } catch (e) { return null; }
}
function historico() { try { return fs.readdirSync(dirLaudos()).filter(f => f.endsWith('.json')).sort().reverse().map(f => { try { const m = JSON.parse(fs.readFileSync(path.join(dirLaudos(), f), 'utf8')); return { nome: f.replace(/\.json$/, ''), quando: m.quando, geral: m.geral }; } catch (e) { return null; } }).filter(Boolean).slice(0, 20); } catch (e) { return []; } }
const estado = () => ({ rodando, ultimo: ultimo(), historico: historico() });

module.exports = {
  init(d) { dep = d || {}; return module.exports; },
  medir, laudoTexto, analisar, ultimo, historico, estado, PAPEL, pior
};
