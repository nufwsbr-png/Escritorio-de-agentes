/* ===========================================================
   agentes.js — contratar é construir

   Todo agente novo nasce numa pasta com a anatomia do escritório
   (modelos/ANATOMIA.md): identidade do dono, constituição como ferramenta,
   tools/ com cerca, lançador com modos e pós-verificação, memória em camadas,
   lições aprovadas pelo dono, painel trancado, .env com os segredos e o
   progresso como lista de componentes. A skill de referência da trilha vai
   junto em .claude/skills/ e o modo Construir do monitor a consulta.

   Duas trilhas:
     atendimento — atendente de WhatsApp (OpenRouter). Referência: criar-agente.
     tarefa      — agente que executa uma tarefa (Claude Code da máquina em
                   chamadas isoladas). Referência: criar-agente-tarefa.
   =========================================================== */
const fs = require('fs');
const path = require('path');

let dep = null;   // { ROOT, PORT, lerRegistro, lerRegistroBruto, gravarRegistro, config, plataformas }

const TRILHAS = {
  atendimento: { skill: 'criar-agente', passos: 18, molde: 'atendimento' },
  tarefa: { skill: 'criar-agente-tarefa', passos: 17, molde: 'tarefa' },
  setor: { skill: 'criar-agente-tarefa', passos: 17, molde: 'tarefa' }   // nome antigo da trilha tarefa
};

/* Os dois setores fixos: o atendimento e "outro" (o dono dá o nome). Os do
   meio variam por cliente e podem vir de data/config.json
   ("setores": [{ id, nome, emoji, desc }]); sem a chave, valem os padrões. */
const ATENDIMENTO = { id: 'atendimento', nome: 'Atendimento no WhatsApp', emoji: '🎧', trilha: 'atendimento',
  desc: 'Atende clientes no WhatsApp: responde, agenda, registra e passa para gente quando precisa. Cérebro pelo OpenRouter, com chave própria.' };
const OUTRO = { id: 'outro', nome: 'Outro setor', emoji: '🏢', trilha: 'tarefa',
  desc: 'Uma tarefa interna que não está na lista: você dá o nome do setor.' };
const SETORES_PADRAO = [
  { id: 'sdr',        nome: 'Prospecção & SDR',          emoji: '🎯', desc: 'Encontra clientes em potencial, qualifica e prepara a primeira abordagem.' },
  { id: 'conteudo',   nome: 'Conteúdo & Redes Sociais',  emoji: '📱', desc: 'Planeja o calendário, escreve legendas e acompanha o que funcionou.' },
  { id: 'copy',       nome: 'Copywriter',                emoji: '✍️', desc: 'Escreve anúncios, páginas e e-mails e testa variações.' },
  { id: 'financeiro', nome: 'Financeiro',                emoji: '🧾', desc: 'Acompanha entradas, saídas e o caixa, e avisa quando algo foge do previsto.' },
  { id: 'dados',      nome: 'Dados & Relatórios',        emoji: '🧮', desc: 'Junta os números dos outros sistemas num painel e explica o que mudou.' },
  { id: 'qa',         nome: 'QA de Sistemas',            emoji: '🧪', desc: 'Roda build, typecheck e teste antes de qualquer deploy dos outros agentes.' }
];
const { slug } = require('./util');
const comTrilha = (s) => ({ ...s, skill: TRILHAS[s.trilha].skill, passos: TRILHAS[s.trilha].passos });

/** a lista que a tela mostra: atendimento, os setores do cliente (ou os padrões) e "outro" */
function setores() {
  const cfg = dep && dep.config ? dep.config() : {};
  const doCliente = Array.isArray(cfg.setores) && cfg.setores.length ? cfg.setores : SETORES_PADRAO;
  const meio = [];
  for (const s of doCliente) {
    if (!s || !s.nome) continue;
    const id = slug(s.id || s.nome);
    if (!id || id === 'atendimento' || id === 'outro' || id === slug(ATENDIMENTO.nome) || meio.some(x => x.id === id)) continue;
    meio.push({ id, nome: String(s.nome).slice(0, 40), emoji: s.emoji || '🏢', desc: String(s.desc || '').slice(0, 200), trilha: 'tarefa' });
  }
  return [ATENDIMENTO, ...meio, OUTRO].map(comTrilha);
}
const setorDe = (id) => setores().find(s => s.id === id) || null;

/* ---------------- progresso da construção ---------------- */
function progressoDe(pasta, trilha) {
  if (!pasta) return null;
  let t = '';
  try { t = fs.readFileSync(path.join(pasta, 'progresso-do-agente.md'), 'utf8'); } catch (e) { return null; }
  const feitos = (t.match(/^- \[x\]/gim) || []).length;
  const abertos = (t.match(/^- \[ \]/gim) || []).length;
  const concluido = /^## CONCLU[IÍ]DO/im.test(t);
  // o portão é um componente da lista: marcado, o boneco vira funcionário
  const portao = concluido || /^- \[x\][^\n]*PORT[ÃA]O/im.test(t) || /PORT[ÃA]O:\s*aprovad/i.test(t);
  const total = feitos + abertos;
  return { passo: feitos, total, portao, concluido, emTreinamento: !portao && !concluido,
           pct: total ? Math.round(feitos / total * 100) : 0 };
}

/* ---------------- criar a pasta do agente ---------------- */
const copiarDir = (de, para) => {
  fs.mkdirSync(para, { recursive: true });
  for (const e of fs.readdirSync(de, { withFileTypes: true })) {
    const a = path.join(de, e.name), b = path.join(para, e.name);
    if (e.isDirectory()) copiarDir(a, b); else fs.copyFileSync(a, b);
  }
};
const EH_TEXTO = /\.(md|js|json|txt|env)$|^(env|gitignore)$/i;

function criarAgente(b) {
  const nome = String(b.nome || '').trim().slice(0, 40);
  if (!nome) return { ok: false, motivo: 'dê um nome ao agente' };
  const setor = setorDe(b.setor);
  if (!setor) return { ok: false, motivo: 'escolha o setor do agente' };
  const setorNome = setor.id === 'outro' ? String(b.setorNome || '').trim().slice(0, 40) : setor.nome;
  if (!setorNome) return { ok: false, motivo: 'diga o nome do setor' };
  const negocio = String(b.negocio || dep.config().empresa || dep.config().nome || '').trim().slice(0, 80) || 'o negócio';
  const trilha = TRILHAS[setor.trilha];

  const porta = Number(b.porta);
  if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) return { ok: false, motivo: 'porta inválida (use de 1024 a 65535)' };
  if (porta === dep.PORT) return { ok: false, motivo: 'essa é a porta do próprio escritório' };
  const reg = dep.lerRegistro();
  const dona = Object.entries(reg).find(([, x]) => x.porta === porta);
  if (dona) return { ok: false, motivo: 'a porta ' + porta + ' já é de ' + (dona[1].nome || dona[0]) };

  const bruto = dep.lerRegistroBruto();
  let id = slug(nome) || 'agente', n = 2;
  while (bruto[id]) id = (slug(nome) || 'agente') + '-' + n++;

  let pasta = String(b.pasta || '').trim();
  pasta = pasta ? path.resolve(pasta) : path.join(dep.ROOT, 'agentes', id);
  if (fs.existsSync(pasta) && fs.readdirSync(pasta).length)
    return { ok: false, motivo: 'a pasta já existe e não está vazia: ' + pasta };

  const MODELOS = path.join(dep.ROOT, 'modelos');
  const skillDe = path.join(MODELOS, 'skills', trilha.skill);
  if (!fs.existsSync(skillDe)) return { ok: false, motivo: 'skill não encontrada em modelos/skills/' + trilha.skill };

  const data = new Date().toLocaleDateString('pt-BR');
  const troca = (t) => t.replace(/\{\{NOME\}\}/g, nome).replace(/\{\{SETOR\}\}/g, setorNome)
    .replace(/\{\{NEGOCIO\}\}/g, negocio).replace(/\{\{PORTA\}\}/g, String(porta)).replace(/\{\{TRILHA\}\}/g, setor.trilha)
    .replace(/\{\{SKILL\}\}/g, trilha.skill).replace(/\{\{DATA\}\}/g, data).replace(/\{\{ESCRITORIO_PORTA\}\}/g, String(dep.PORT));
  /** copia um molde inteiro trocando os {{CAMPOS}} nos arquivos de texto; `env` e `gitignore` ganham o ponto */
  const copiarMolde = (de, para) => {
    for (const e of fs.readdirSync(de, { withFileTypes: true })) {
      const origem = path.join(de, e.name);
      const nomeFinal = e.name === 'env' ? '.env' : e.name === 'gitignore' ? '.gitignore' : e.name === 'progresso.md' ? 'progresso-do-agente.md' : e.name;
      const destino = path.join(para, nomeFinal);
      if (e.isDirectory()) { copiarMolde(origem, destino); continue; }
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      if (EH_TEXTO.test(e.name)) fs.writeFileSync(destino, troca(fs.readFileSync(origem, 'utf8')));
      else fs.copyFileSync(origem, destino);
    }
  };

  try {
    fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(path.join(pasta, 'agente.json'), JSON.stringify({ nome, setor: setorNome, setorId: setor.id, trilha: setor.trilha, negocio, porta,
                                            criadoEm: new Date().toISOString(), tarefa: '' }, null, 2) + '\n');
    copiarMolde(path.join(MODELOS, 'agente', 'comum'), pasta);
    copiarMolde(path.join(MODELOS, 'agente', trilha.molde), pasta);
    fs.writeFileSync(path.join(pasta, 'ANATOMIA.md'), fs.readFileSync(path.join(MODELOS, 'ANATOMIA.md'), 'utf8'));
    for (const d of ['memoria/entidades', 'amostras', 'saidas', 'quarentena']) fs.mkdirSync(path.join(pasta, d), { recursive: true });
    copiarDir(skillDe, path.join(pasta, '.claude', 'skills', trilha.skill));
  } catch (e) {
    return { ok: false, motivo: 'não consegui criar a pasta: ' + e.message };
  }

  const plataformasPedidas = [...new Set((Array.isArray(b.plataformas) ? b.plataformas : []).map(String).filter(x => /^[a-z0-9][a-z0-9-]*$/.test(x)))];
  const item = {
    nome, tipo: 'local', pasta, comando: 'node', args: ['server.js'], env: { PORT: String(porta), ESCRITORIO_PORTA: String(dep.PORT) }, porta, abre: '/painel',
    setor: setorNome, setorId: setor.id, trilha: setor.trilha, negocio,
    plataformas: plataformasPedidas,
    sobre: setor.emoji + ' ' + setorNome + (negocio ? ' de ' + negocio : '') + '. Em construção: ' + trilha.passos + ' componentes da anatomia do escritório, com a skill ' + trilha.skill + ' de referência. Abra Conversar > Construir para seguir.',
    dicas: ['Em Conversar > Construir, o construtor segue a ANATOMIA, um componente por vez, com teste no fim de cada um',
            setor.trilha === 'atendimento' ? 'O chat de teste fica em / e o painel do dono em /painel' : 'O lançador é rodar.js: node rodar.js amostras/caso-01 roda em ensaio; o painel em /painel aprova, responde e corrige',
            'As conexões ficam no .env da pasta; cole os valores pelo editor, nunca no chat']
  };
  bruto[id] = item;
  dep.gravarRegistro(bruto);
  // as plataformas permitidas entram no .env agora, no bloco gerenciado pelo escritório
  const sinc = dep.plataformas && plataformasPedidas.length ? dep.plataformas.sincronizarAgente(id) : null;
  return { ok: true, id, sistema: item, pasta, plataformas: plataformasPedidas, variaveisDePlataforma: sinc && sinc.ok ? sinc.variaveis : [], setor: { id: setor.id, nome: setorNome, emoji: setor.emoji, trilha: setor.trilha, skill: trilha.skill, passos: trilha.passos } };
}

/* ---------------- constituição pela tela (ficha do negócio) ---------------- */
function arquivoConstituicao(id) {
  const s = dep.lerRegistro()[id];
  if (!s || !s.pasta) return null;
  return path.join(s.pasta, 'skills', 'constituicao.md');
}

/** divide o markdown por títulos "## " para a ficha mostrar uma caixa por seção */
function lerConstituicao(id) {
  const a = arquivoConstituicao(id);
  if (!a) return { ok: false, motivo: 'esse agente não tem pasta' };
  let t = '';
  try { t = fs.readFileSync(a, 'utf8'); } catch (e) { return { ok: true, existe: false, titulo: '', secoes: [] }; }
  const linhas = t.split(/\r?\n/);
  const secoes = [];
  let titulo = '', atual = null, cabeca = [];
  for (const l of linhas) {
    const m = /^##\s+(.*)$/.exec(l);
    if (m) { atual = { titulo: m[1].trim(), corpo: [] }; secoes.push(atual); continue; }
    if (/^#\s+/.test(l) && !titulo) { titulo = l.replace(/^#\s+/, '').trim(); continue; }
    if (atual) atual.corpo.push(l); else cabeca.push(l);
  }
  return { ok: true, existe: true, titulo, cabeca: cabeca.join('\n').trim(),
           secoes: secoes.map(s => ({ titulo: s.titulo, corpo: s.corpo.join('\n').replace(/^\n+|\n+$/g, '') })) };
}

function gravarConstituicao(id, dados) {
  const a = arquivoConstituicao(id);
  if (!a) return { ok: false, motivo: 'esse agente não tem pasta' };
  const titulo = String(dados.titulo || 'Constituição').trim().slice(0, 120);
  const secoes = Array.isArray(dados.secoes) ? dados.secoes : [];
  let t = '# ' + titulo + '\n\n';
  if (dados.cabeca) t += String(dados.cabeca).trim() + '\n\n';
  for (const s of secoes) t += '## ' + String(s.titulo || '').trim().slice(0, 120) + '\n\n' + String(s.corpo || '').trim() + '\n\n';
  fs.mkdirSync(path.dirname(a), { recursive: true });
  fs.writeFileSync(a, t.trimEnd() + '\n');
  return { ok: true };
}

module.exports = {
  init(d) { dep = d; return module.exports; },
  TRILHAS, setores, setorDe, progressoDe, criarAgente, lerConstituicao, gravarConstituicao
};
