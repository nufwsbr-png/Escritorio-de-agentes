/* ===========================================================
   crm/criar.js — grava a configuração do CRM a partir das respostas da
   skill /criar-crm, e registra o CRM no escritório

   Ações:
     propostas              o que o Cuki BOT propõe para cada pergunta, lido do
                            último laudo (node cuki.js medir), das esteiras, dos
                            agentes, das plataformas e dos avisos
     atual                  o que já está configurado, SEM segredos
     aplicar <respostas.json>
                            grava crm/config.json, gera crm/.env (segredos),
                            registra o sistema "crm" em data/sistemas.json,
                            cria a plataforma "crm" (tipo api) com um token
                            POR AGENTE, marca os agentes, cria usuários e cargos
                            em crm/data/. Rodar de novo mantém tokens e senhas.

   Respostas (JSON): ver a skill .claude/skills/criar-crm/SKILL.md.
   Segredo só em crm/.env, crm/data/ e data/: nunca no config.json nem no chat.
   Design: docs/superpowers/specs/2026-10-14-crm-design.md
   =========================================================== */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const UTIL = require('../util');

const ROOT = path.join(__dirname, '..');
const DADOS = process.env.ESCRITORIO_DADOS || path.join(ROOT, 'data');
const PASTA = process.env.CRM_PASTA || __dirname;              // nos testes, uma pasta temporária
const arqConfig = () => path.join(PASTA, 'config.json');
const arqEnv = () => path.join(PASTA, '.env');
const dirDados = () => path.join(PASTA, 'data');
const lerJson = (p, padrao) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return padrao; } };
const gravarJson = (p, d) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n'); };
const limpa = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const hex = (n) => crypto.randomBytes(n).toString('hex');
const hash = (senha, sal) => crypto.scryptSync(String(senha), sal, 64).toString('hex');

/* ---------------- o escritório (registro, plataformas, config) ---------------- */
const REGISTRO = path.join(DADOS, 'sistemas.json');
const lerBruto = () => lerJson(REGISTRO, {});
const lerRegistro = () => { const o = {}; for (const [id, s] of Object.entries(lerBruto())) { if (id.startsWith('_')) continue; if (s && s.pasta && !path.isAbsolute(s.pasta)) s.pasta = path.join(ROOT, s.pasta); o[id] = s; } return o; };
const gravarRegistro = (b) => gravarJson(REGISTRO, b);
const lerConfigEscritorio = () => lerJson(path.join(DADOS, 'config.json'), {});
const PLAT = require('../plataformas').init({ ROOT, DADOS, lerRegistro, lerRegistroBruto: lerBruto, gravarRegistro });
const portaEscritorio = () => Number(lerConfigEscritorio().porta) || 4321;

/* ---------------- propostas: o que o Cuki BOT sugere ---------------- */
const ETAPAS_PADRAO = {
  clinica: ['Novo contato', 'Avaliação marcada', 'Em tratamento', 'Concluído'],
  advocacia: ['Novo contato', 'Entrevista feita', 'Pasta fechada', 'Em andamento', 'Concluído'],
  loja: ['Novo contato', 'Conversando', 'Proposta enviada', 'Fechado'],
  padrao: ['Novo', 'Conversando', 'Proposta enviada', 'Fechado']
};
function ramoDe(cfg) {
  const t = ((cfg.empresa || '') + ' ' + (cfg.subtitulo || '')).toLowerCase();
  if (/cl[ií]nica|consult[óo]rio|dent|m[ée]dic|est[ée]tica|fisio/.test(t)) return 'clinica';
  if (/advoca|advog|jur[ií]d|escrit[óo]rio de advocacia/.test(t)) return 'advocacia';
  if (/loja|ecommerce|e-commerce|venda/.test(t)) return 'loja';
  return 'padrao';
}
function propostas() {
  const cfg = lerConfigEscritorio();
  const reg = lerRegistro();
  const CUKI = require('../cuki').init({ DADOS });
  const u = CUKI.ultimo();
  const m = u && u.medidas ? u.medidas : null;
  if (!m) return { ok: false, motivo: 'nenhum laudo do Cuki BOT ainda: rode node cuki.js medir com o escritório no ar' };
  if (m.geral === 'vermelho') return { ok: false, vermelho: true, motivo: 'o laudo do Cuki BOT está vermelho: o Criar CRM não começa. Resolva "o que fazer antes" e rode node cuki.js medir de novo', laudo: u.texto };
  const EST = require('../esteiras').init({ DADOS, lerRegistro, plataformas: PLAT });
  const esteiras = EST.listar();
  const aptos = m.areas.aptidao.agentesAptos || [];
  const quase = (m.areas.agentes.agentes || []).filter(a => a.cor === 'amarelo' && a.trilha !== 'atendimento');
  const atendentes = Object.entries(reg).filter(([, s]) => s.trilha === 'atendimento').map(([id, s]) => ({ id, nome: s.nome || id }));
  // a entidade: a mais comum entre os agentes aptos, senão a da esteira, senão a do ramo
  const contagem = {}; for (const a of aptos) if (a.entidade) contagem[a.entidade] = (contagem[a.entidade] || 0) + 1;
  const entidadeAgentes = Object.entries(contagem).sort((x, y) => y[1] - x[1]).map(([e]) => e)[0];
  const ramo = ramoDe(cfg);
  const singular = entidadeAgentes || (esteiras[0] && esteiras[0].entidade.singular) || { clinica: 'paciente', advocacia: 'cliente', loja: 'cliente', padrao: 'cliente' }[ramo];
  const chave = /processo|pedido|contrato|caso/i.test(singular) ? 'numero' : 'telefone';
  // as etapas: as da esteira (com quem cuida), ou o padrão do ramo
  let etapas;
  if (esteiras.length) {
    const e = esteiras[0];
    etapas = [{ nome: 'Novo', responsavel: 'pessoa:chefe', aprovacao: false }, ...e.etapas.map(et => ({ nome: et.nome, responsavel: et.agente, aprovacao: et.aprovacao === 'pessoa' })), { nome: 'Concluído', responsavel: 'pessoa:chefe', aprovacao: false }];
  } else {
    const nomes = ETAPAS_PADRAO[ramo];
    const sdr = aptos.find(a => /prospec|sdr|atend/i.test(a.setor || ''));
    etapas = nomes.map((n, i) => ({ nome: n, responsavel: i === 0 && sdr ? sdr.id : 'pessoa:chefe', aprovacao: /proposta|fechad|conclu/i.test(n) }));
  }
  const av = lerJson(path.join(DADOS, 'avisos.json'), {});
  const cukiCfg = lerJson(path.join(DADOS, 'cuki.json'), {});
  const celular = (av.whatsapp && av.whatsapp.fone) || (cukiCfg.autorizados && cukiCfg.autorizados[0] && cukiCfg.autorizados[0].numero) || '';
  const plataformas = (m.areas.aptidao.plataformasUsaveis || []);
  return {
    ok: true, laudo: { geral: m.geral, quando: u.quando }, empresa: cfg.empresa || '', ramo,
    entidade: { singular, plural: singular.endsWith('s') ? singular : singular + 's', chave },
    etapas, perdido: true,
    agentes: aptos.map(a => ({ id: a.id, nome: a.nome, cargo: a.setor || 'Agente', tarefa: a.tarefa, entidade: a.entidade })),
    agentesQuase: quase.map(a => ({ id: a.id, nome: a.nome, motivos: a.motivos })),
    atendentes, pessoas: [], chefe: cfg.dono || '', autonomia: 'b',
    entrada: { whatsapp: atendentes.map(a => a.id), manual: true, importar: '' },
    integracoes: { agenda: plataformas.some(p => p.tipo === 'agenda') ? 'fonte' : 'nao', planilha: plataformas.some(p => p.tipo === 'planilha') ? 'espelho' : 'nao' },
    plataformas, sensiveis: [], avisos: celular ? 'escritorio' : 'escritorio', celularDosAvisos: celular,
    acesso: 'aqui', fichas: { onde: 'local' }, bancos: PLAT.listar(false).filter(p => p.tipo === 'banco').map(p => ({ id: p.id, nome: p.nome })),
    porta: portaLivre()
  };
}
function portaLivre() {
  const usadas = new Set(Object.values(lerRegistro()).map(s => Number(s.porta)).filter(Boolean)); usadas.add(portaEscritorio());
  let p = 4500; while (usadas.has(p)) p++; return p;
}

/* ---------------- validar e normalizar as respostas ---------------- */
function normalizar(r, atualCfg) {
  const erros = [];
  const reg = lerRegistro();
  const ent = r.entidade || atualCfg.entidade || {};
  const singular = limpa(ent.singular, 30).toLowerCase() || 'cliente';
  const entidade = { singular, plural: limpa(ent.plural, 30).toLowerCase() || singular + 's', chave: ['telefone', 'cpf', 'email', 'numero'].includes(ent.chave) ? ent.chave : 'telefone' };
  // pessoas: nome e função; o id é o slug do nome
  const pessoasIn = Array.isArray(r.pessoas) ? r.pessoas : (atualCfg.pessoas || []);
  const pessoas = []; const vistos = new Set();
  for (const p of pessoasIn) {
    const nome = limpa(p && p.nome, 60); if (!nome) continue;
    let id = UTIL.slug(nome, 30) || 'pessoa'; let n = 2; const b = id; while (vistos.has(id)) id = b + '-' + n++; vistos.add(id);
    pessoas.push({ id, nome, funcao: limpa(p.funcao, 40) || 'equipe' });
  }
  // o chefe: nome de uma pessoa; se não está na lista, entra nela
  let chefeNome = limpa(r.chefe, 60) || (atualCfg.chefe && (pessoas.find(p => p.id === atualCfg.chefe) || {}).nome) || '';
  if (!chefeNome && pessoas.length) chefeNome = pessoas[0].nome;
  if (!chefeNome) erros.push('diga quem é o chefe do CRM (pergunta 5)');
  let chefe = pessoas.find(p => p.nome.toLowerCase() === chefeNome.toLowerCase());
  if (!chefe && chefeNome) { chefe = { id: UTIL.slug(chefeNome, 30) || 'chefe', nome: chefeNome, funcao: 'chefe' }; pessoas.unshift(chefe); }
  // agentes: ids do escritório, com cargo
  const agentesIn = Array.isArray(r.agentes) ? r.agentes : (atualCfg.agentes || []);
  const agentes = [];
  for (const a of agentesIn) {
    const id = limpa(typeof a === 'string' ? a : a && a.id, 40); const s = reg[id];
    if (!s) { erros.push('agente não existe no escritório: ' + id); continue; }
    if (!s.trilha) { erros.push(id + ' não é um agente do escritório'); continue; }
    agentes.push({ id, nome: s.nome || id, cargo: limpa(a && a.cargo, 40) || s.setor || 'Agente', trilha: s.trilha });
  }
  // etapas: nome, responsável (agente "id" ou "pessoa:Nome"), aprovação de pessoa
  const etapasIn = Array.isArray(r.etapas) && r.etapas.length ? r.etapas : (atualCfg.etapas || []);
  if (!etapasIn.length) erros.push('o CRM precisa de pelo menos uma etapa (pergunta 2)');
  const etapas = []; const eids = new Set();
  for (const e of etapasIn) {
    const nome = limpa(e && e.nome, 40); if (!nome) { erros.push('toda etapa precisa de nome'); continue; }
    let id = UTIL.slug(nome, 30) || 'etapa'; let n = 2; const b = id; while (eids.has(id)) id = b + '-' + n++; eids.add(id);
    let resp = e && e.responsavel; if (resp && typeof resp === 'object') resp = (resp.tipo === 'pessoa' ? 'pessoa:' : '') + resp.id;
    resp = limpa(resp, 60);
    let responsavel;
    if (!resp || resp === 'pessoa:chefe') responsavel = chefe ? { tipo: 'pessoa', id: chefe.id } : null;
    else if (resp.startsWith('pessoa:')) { const nomeP = resp.slice(7).trim(); let p = pessoas.find(x => x.nome.toLowerCase() === nomeP.toLowerCase() || x.id === UTIL.slug(nomeP, 30)); if (!p) { p = { id: UTIL.slug(nomeP, 30) || 'pessoa', nome: nomeP, funcao: 'equipe' }; pessoas.push(p); } responsavel = { tipo: 'pessoa', id: p.id }; }
    else { const ag = agentes.find(a => a.id === resp); if (!ag) { if (reg[resp] && reg[resp].trilha) agentes.push({ id: resp, nome: reg[resp].nome || resp, cargo: reg[resp].setor || 'Agente', trilha: reg[resp].trilha }); else erros.push('etapa "' + nome + '": responsável desconhecido: ' + resp); } responsavel = { tipo: 'agente', id: resp }; }
    etapas.push({ id, nome, responsavel, aprovacao: !!(e && e.aprovacao) });
  }
  const autonomia = ['a', 'b', 'c'].includes(r.autonomia) ? r.autonomia : (atualCfg.autonomia || 'b');
  const integ = r.integracoes || atualCfg.integracoes || {};
  const opc = (v, padrao) => ['fonte', 'espelho', 'nao'].includes(v) ? v : padrao;
  const fichasIn = r.fichas || atualCfg.fichas || {};
  const fichas = { onde: fichasIn.onde === 'supabase' ? 'supabase' : 'local', plataforma: limpa(fichasIn.plataforma, 40) };
  if (fichas.onde === 'supabase') {
    const p = fichas.plataforma && PLAT.obter(fichas.plataforma);
    if (!p) erros.push('para fichas no Supabase, cadastre-o em 🔌 Plataformas (tipo banco) e informe o id em fichas.plataforma');
    else if (p.tipo !== 'banco') erros.push('a plataforma ' + fichas.plataforma + ' não é do tipo banco');
  }
  const entradaIn = r.entrada || atualCfg.entrada || {};
  const cfg = {
    entidade, etapas, perdido: r.perdido === undefined ? (atualCfg.perdido !== false) : !!r.perdido,
    pessoas, chefe: chefe ? chefe.id : '', agentes, autonomia,
    entrada: { whatsapp: (Array.isArray(entradaIn.whatsapp) ? entradaIn.whatsapp : []).map(String).filter(id => reg[id]), manual: entradaIn.manual !== false, importar: limpa(entradaIn.importar, 300) },
    integracoes: { agenda: opc(integ.agenda, 'nao'), planilha: opc(integ.planilha, 'nao') },
    sensiveis: (Array.isArray(r.sensiveis) ? r.sensiveis : (atualCfg.sensiveis || [])).map(s => UTIL.slug(s, 30)).filter(Boolean),
    avisos: limpa(r.avisos, 20) === 'escritorio' || !r.avisos ? (atualCfg.avisos || 'escritorio') : limpa(r.avisos, 20).replace(/\D/g, '') || 'escritorio',
    acesso: ['aqui', 'rede', 'fora'].includes(r.acesso) ? r.acesso : (atualCfg.acesso || 'aqui'),
    fichas,
    porta: Number(r.porta) || Number(atualCfg.porta) || portaLivre(),
    escritorioPorta: portaEscritorio(),
    criadoEm: atualCfg.criadoEm || new Date().toISOString(), atualizadoEm: new Date().toISOString()
  };
  if (cfg.porta === cfg.escritorioPorta) erros.push('a porta ' + cfg.porta + ' é a do escritório');
  const dona = Object.entries(lerRegistro()).find(([id, s]) => id !== 'crm' && Number(s.porta) === cfg.porta);
  if (dona) erros.push('a porta ' + cfg.porta + ' já é de ' + (dona[1].nome || dona[0]));
  return { erros, cfg };
}

/* ---------------- aplicar ---------------- */
function lerEnv() { const o = {}; try { for (const l of fs.readFileSync(arqEnv(), 'utf8').split(/\r?\n/)) { const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(l); if (m) o[m[1]] = m[2].replace(/^"|"$/g, ''); } } catch (e) {} return o; }
/* pede ao escritório (se estiver no ar) para religar os agentes que entraram no CRM: o bloco de plataformas mudou no .env deles e o processo só lê o .env ao subir */
function pedeEscritorio(metodo, rota, ms = 4000) {
  return new Promise(resolve => {
    try {
      const req = http.request({ host: '127.0.0.1', port: portaEscritorio(), path: rota, method: metodo, headers: { 'Content-Type': 'application/json' }, timeout: ms }, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => { try { resolve({ status: r.statusCode, json: JSON.parse(s) }); } catch (e) { resolve({ status: r.statusCode, json: null }); } }); });
      req.on('error', () => resolve({ status: 0 })); req.on('timeout', () => { req.destroy(); resolve({ status: 0 }); }); req.end(metodo === 'POST' ? '{}' : undefined);
    } catch (e) { resolve({ status: 0 }); }
  });
}
async function religarAgentes(ids) {
  const est = await pedeEscritorio('GET', '/api/sistemas');
  if (est.status !== 200 || !Array.isArray(est.json)) return { escritorioNoAr: false, religados: [], aviso: 'escritório fora do ar: ligue e desligue os agentes do CRM quando ele subir, para pegarem o CRM' };
  const religados = [], falhas = [];
  for (const id of ids) {
    const s = est.json.find(x => x.id === id);
    if (!s || s.estado !== 'no ar') continue;
    await pedeEscritorio('POST', '/api/sistemas/' + id + '/desligar');
    await new Promise(r => setTimeout(r, 1500));
    const r = await pedeEscritorio('POST', '/api/sistemas/' + id + '/ligar');
    (r.status === 200 && r.json && r.json.ok ? religados : falhas).push(id);
  }
  return { escritorioNoAr: true, religados, falhas, aviso: falhas.length ? 'não consegui religar: ' + falhas.join(', ') + ' (ligue pelo escritório)' : '' };
}
async function aplicar(respostas) {
  const atualCfg = lerJson(arqConfig(), {});
  const { erros, cfg } = normalizar(respostas || {}, atualCfg);
  if (erros.length) return { ok: false, erros };
  fs.mkdirSync(dirDados(), { recursive: true });
  // 1. config.json (sem segredo)
  gravarJson(arqConfig(), cfg);
  // 2. .env do CRM: segredos nascem uma vez e ficam; o bloco de plataformas é do escritório (sincronizarAgente)
  const envAtual = lerEnv();
  const seg = { CRM_SEGREDO_SESSAO: envAtual.CRM_SEGREDO_SESSAO || hex(24), CRM_SEGREDO_EVENTO: envAtual.CRM_SEGREDO_EVENTO || hex(18), CRM_TOKEN_ESCRITORIO: envAtual.CRM_TOKEN_ESCRITORIO || hex(24) };
  let env = ''; try { env = fs.readFileSync(arqEnv(), 'utf8'); } catch (e) {}
  const poe = (k, v) => { const re = new RegExp('^' + k + '=.*$', 'm'); const linha = k + '="' + v + '"'; env = re.test(env) ? env.replace(re, linha) : env + (env && !env.endsWith('\n') ? '\n' : '') + linha + '\n'; };
  if (!env) env = '# CRM do escritório: segredos (nunca no chat nem no commit). PORT e ESCRITORIO_PORTA também vêm do registro.\n';
  poe('PORT', String(cfg.porta)); poe('ESCRITORIO_PORTA', String(cfg.escritorioPorta));
  for (const [k, v] of Object.entries(seg)) poe(k, v);
  poe('CRM_ESCUTA', cfg.acesso === 'aqui' ? '127.0.0.1' : '0.0.0.0');
  fs.writeFileSync(arqEnv(), env);
  // 3. o registro do escritório: o CRM é um sistema local, com .env gerenciado (crm: true) para as plataformas que ele usa (Supabase)
  const bruto = lerBruto();
  const anterior = bruto.crm || {};
    // o escritório roda o comando com cwd = pasta; o caminho absoluto do server.js (e CRM_PASTA, quando a pasta não é crm/) deixa o CRM subir de qualquer pasta, inclusive nos testes
  bruto.crm = { ...anterior, nome: 'CRM', tipo: 'local', pasta: PASTA, comando: 'node', args: [path.join(__dirname, 'server.js')], env: { PORT: String(cfg.porta), ESCRITORIO_PORTA: String(cfg.escritorioPorta), ...(PASTA !== __dirname ? { CRM_PASTA: PASTA } : {}) }, porta: cfg.porta, abre: '/', crm: true,
    plataformas: cfg.fichas.onde === 'supabase' ? [cfg.fichas.plataforma] : [],
    sobre: 'O CRM do escritório: a ficha de cada ' + cfg.entidade.singular + ', o passo em que está e quem cuida. Pessoas entram com login; os agentes, com token e cargo. Criado por /criar-crm.' };
  gravarRegistro(bruto);
  const sincCrm = PLAT.sincronizarAgente('crm');
  // 4. a plataforma "crm" (tipo api) e um token POR AGENTE (decisão do dono, 14/10/2026)
  const existente = PLAT.obter('crm', true);
  const url = 'http://127.0.0.1:' + cfg.porta;
  PLAT.salvar({ id: 'crm', nome: 'CRM', tipo: 'api', url, variaveis: { CRM_URL: url, CRM_TOKEN: '' }, notas: 'O CRM do escritório. O token é de cada agente (gerado por crm/criar.js); a tela não o mostra.' });
  const usuarios = lerJson(path.join(dirDados(), 'usuarios.json'), { pessoas: [], agentes: [] });
  const tokensNovos = [];
  for (const a of cfg.agentes) {
    const guardado = existente && existente.porAgente && existente.porAgente[a.id] && existente.porAgente[a.id].CRM_TOKEN;
    const token = guardado || hex(24);
    if (!guardado) tokensNovos.push(a.id);
    PLAT.definirPorAgente('crm', a.id, { CRM_TOKEN: token });
    const s = lerRegistro()[a.id];
    const lista = [...new Set([...(s.plataformas || []), 'crm'])];
    PLAT.definirDoAgente(a.id, lista);
    const sal = hex(8);
    const u = usuarios.agentes.find(x => x.id === a.id);
    const reg = { id: a.id, nome: a.nome, cargo: 'agente-' + (UTIL.slug(a.cargo, 30) || a.id), sal, tokenHash: hash(token, sal), ativo: true };   // o id do cargo (a chave em cargos.json), não o nome
    if (u) Object.assign(u, reg); else usuarios.agentes.push(reg);
  }
  // 5. pessoas e cargos: o chefe tem tudo; os outros editam e movem; agentes conforme a autonomia
  const cargos = lerJson(path.join(dirDados(), 'cargos.json'), {});
  cargos.chefe = { nome: 'Chefe', verTudo: true, editar: true, mover: true, aprovar: true, verSensiveis: true, gerirPessoas: true };
  for (const p of cfg.pessoas) {
    const cid = p.id === cfg.chefe ? 'chefe' : (UTIL.slug(p.funcao, 30) || 'equipe');
    if (cid !== 'chefe' && !cargos[cid]) cargos[cid] = { nome: p.funcao, verTudo: true, editar: true, mover: true, aprovar: false, verSensiveis: false, gerirPessoas: false };
  }
  for (const a of cfg.agentes) {
    const cid = 'agente-' + (UTIL.slug(a.cargo, 30) || a.id);
    if (!cargos[cid]) cargos[cid] = { nome: a.cargo, agente: true, verTudo: true, editar: cfg.autonomia !== 'a', mover: cfg.autonomia !== 'a', aprovar: false, verSensiveis: false, gerirPessoas: false };
  }
  gravarJson(path.join(dirDados(), 'cargos.json'), cargos);
  let senhaInicial = null;
  for (const p of cfg.pessoas) {
    const u = usuarios.pessoas.find(x => x.id === p.id);
    const cargo = p.id === cfg.chefe ? 'chefe' : (UTIL.slug(p.funcao, 30) || 'equipe');
    if (u) { u.nome = p.nome; u.cargo = cargo; continue; }
    const senha = p.id === cfg.chefe ? hex(4) : hex(4); const sal = hex(8);
    usuarios.pessoas.push({ id: p.id, nome: p.nome, login: p.id, cargo, sal, senhaHash: hash(senha, sal), ativa: true, trocarSenha: true });
    if (p.id === cfg.chefe) senhaInicial = { login: p.id, senha };
    else { const pend = lerJson(path.join(dirDados(), 'senhas-iniciais.json'), []); pend.push({ login: p.id, senha }); gravarJson(path.join(dirDados(), 'senhas-iniciais.json'), pend); }
  }
  gravarJson(path.join(dirDados(), 'usuarios.json'), usuarios);
  // a senha do chefe fica para a primeira abertura da tela do CRM, que a mostra UMA vez e apaga o arquivo
  if (senhaInicial) gravarJson(path.join(dirDados(), 'primeira-senha.json'), senhaInicial);
  // 6. o que o escritório precisa para falar com o CRM (data/, fora do git)
  gravarJson(path.join(DADOS, 'crm.json'), { porta: cfg.porta, url, token: seg.CRM_TOKEN_ESCRITORIO, segredoEvento: seg.CRM_SEGREDO_EVENTO, criadoEm: cfg.criadoEm });
  const religar = await religarAgentes(cfg.agentes.map(a => a.id));
  return { ok: true, religados: religar.religados, avisoReligar: religar.aviso, gravado: { config: arqConfig(), env: arqEnv(), registro: 'crm em ' + REGISTRO, plataforma: 'crm (api) marcada para ' + cfg.agentes.map(a => a.id).join(', '), tokensNovos, usuarios: { pessoas: usuarios.pessoas.length, agentes: usuarios.agentes.length }, cargos: Object.keys(cargos), supabase: cfg.fichas.onde === 'supabase' ? (sincCrm.ok ? 'bloco gravado em crm/.env' : sincCrm.motivo) : 'não (fichas locais)' },
           senhaDoChefe: senhaInicial ? 'gerada; aparece UMA vez na primeira abertura da tela do CRM' : 'já existia', porta: cfg.porta, proximo: 'Ligue o CRM no escritório (ele aparece como sistema) e abra http://localhost:' + cfg.porta };
}

function atual() {
  const cfg = lerJson(arqConfig(), null);
  if (!cfg) return { criado: false, motivo: 'o CRM ainda não foi criado: use /criar-crm' };
  const usuarios = lerJson(path.join(dirDados(), 'usuarios.json'), { pessoas: [], agentes: [] });
  return { criado: true, ...cfg, usuarios: { pessoas: usuarios.pessoas.map(p => ({ id: p.id, nome: p.nome, cargo: p.cargo, ativa: p.ativa })), agentes: usuarios.agentes.map(a => ({ id: a.id, nome: a.nome, cargo: a.cargo })) }, temEnv: fs.existsSync(arqEnv()) };
}

module.exports = { propostas, normalizar, aplicar, atual, PASTA };

if (require.main === module) {
  UTIL.rodarCli({
    _ajuda: 'propostas                  o que o Cuki BOT propõe para cada pergunta (precisa de um laudo: node cuki.js medir)\natual                      o que está configurado, sem segredos\naplicar <respostas.json>   grava a configuração, registra o CRM e os tokens dos agentes',
    propostas: () => propostas(),
    atual: () => atual(),
    aplicar: (arq) => arq ? aplicar(lerJson(arq, null) || {}) : { ok: false, motivo: 'passe o arquivo de respostas' }
  }, process.argv.slice(2));
}
