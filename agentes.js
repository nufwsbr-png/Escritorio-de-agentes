/* ===========================================================
   agentes.js — contratar é construir

   Todo agente novo nasce numa pasta com a estrutura padrão (derivada da
   skill criar-agente): skills/ e tools/, prompt-agente.md do dono,
   constituição como ferramenta, .env com as conexões de trabalho,
   memoria.md, progresso e um server.js com o contrato do escritório
   (/saude, /painel, /log). A skill da trilha vai junto, em
   .claude/skills/, e o modo Construir do monitor a invoca.

   Duas trilhas:
     atendimento — a skill criar-agente inteira (WhatsApp, OpenRouter).
     setor       — a jornada criar-agente-setor (Claude Code da máquina).
   =========================================================== */
const fs = require('fs');
const path = require('path');

let dep = null;   // { ROOT, PORT, lerRegistro, lerRegistroBruto, gravarRegistro, config }

const SETORES = [
  { id: 'atendimento', nome: 'Atendimento no WhatsApp', emoji: '🎧', trilha: 'atendimento', skill: 'criar-agente', passos: 23,
    desc: 'Atende clientes no WhatsApp: responde, agenda, registra e passa para gente quando precisa. Cérebro pelo OpenRouter, com chave própria.' },
  { id: 'sdr',        nome: 'Prospecção & SDR',          emoji: '🎯', trilha: 'setor', skill: 'criar-agente-setor', passos: 14,
    desc: 'Encontra clientes em potencial, qualifica e prepara a primeira abordagem.' },
  { id: 'conteudo',   nome: 'Conteúdo & Redes Sociais',  emoji: '📱', trilha: 'setor', skill: 'criar-agente-setor', passos: 14,
    desc: 'Planeja o calendário, escreve legendas e acompanha o que funcionou.' },
  { id: 'copy',       nome: 'Copywriter',                emoji: '✍️', trilha: 'setor', skill: 'criar-agente-setor', passos: 14,
    desc: 'Escreve anúncios, páginas e e-mails e testa variações.' },
  { id: 'financeiro', nome: 'Financeiro',                emoji: '🧾', trilha: 'setor', skill: 'criar-agente-setor', passos: 14,
    desc: 'Acompanha entradas, saídas e o caixa, e avisa quando algo foge do previsto.' },
  { id: 'dados',      nome: 'Dados & Relatórios',        emoji: '🧮', trilha: 'setor', skill: 'criar-agente-setor', passos: 14,
    desc: 'Junta os números dos outros sistemas num painel e explica o que mudou.' },
  { id: 'qa',         nome: 'QA de Sistemas',            emoji: '🧪', trilha: 'setor', skill: 'criar-agente-setor', passos: 14,
    desc: 'Roda build, typecheck e teste antes de qualquer deploy dos outros agentes.' },
  { id: 'outro',      nome: 'Outro setor',               emoji: '🏢', trilha: 'setor', skill: 'criar-agente-setor', passos: 14,
    desc: 'Um trabalho interno que não está na lista: você dá o nome do setor.' }
];
const setorDe = (id) => SETORES.find(s => s.id === id) || null;

const slug = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'agente';

/* ---------------- progresso da construção ---------------- */
function progressoDe(pasta, trilha) {
  if (!pasta) return null;
  let t = '';
  try { t = fs.readFileSync(path.join(pasta, 'progresso-do-agente.md'), 'utf8'); } catch (e) { return null; }
  const feitos = (t.match(/^- \[x\]/gim) || []).length;
  const abertos = (t.match(/^- \[ \]/gim) || []).length;
  const concluido = /^## CONCLU[IÍ]DO/im.test(t);
  // atendimento: o portão é o fim da fase 1 (passo 12); setor: a linha "PORTÃO: aprovado"
  const portao = concluido || /PORT[ÃA]O:\s*aprovad/i.test(t) || (trilha === 'atendimento' && feitos >= 12);
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

function criarAgente(b) {
  const nome = String(b.nome || '').trim().slice(0, 40);
  if (!nome) return { ok: false, motivo: 'dê um nome ao agente' };
  const setor = setorDe(b.setor);
  if (!setor) return { ok: false, motivo: 'escolha o setor do agente' };
  const setorNome = setor.id === 'outro' ? String(b.setorNome || '').trim().slice(0, 40) : setor.nome;
  if (!setorNome) return { ok: false, motivo: 'diga o nome do setor' };
  const negocio = String(b.negocio || dep.config().empresa || dep.config().nome || '').trim().slice(0, 80) || 'o negócio';

  const porta = Number(b.porta);
  if (!Number.isInteger(porta) || porta < 1024 || porta > 65535) return { ok: false, motivo: 'porta inválida (use de 1024 a 65535)' };
  if (porta === dep.PORT) return { ok: false, motivo: 'essa é a porta do próprio escritório' };
  const reg = dep.lerRegistro();
  const dona = Object.entries(reg).find(([, x]) => x.porta === porta);
  if (dona) return { ok: false, motivo: 'a porta ' + porta + ' já é de ' + (dona[1].nome || dona[0]) };

  const bruto = dep.lerRegistroBruto();
  let id = slug(nome), n = 2;
  while (bruto[id]) id = slug(nome) + '-' + n++;

  let pasta = String(b.pasta || '').trim();
  pasta = pasta ? path.resolve(pasta) : path.join(dep.ROOT, 'agentes', id);
  if (fs.existsSync(pasta) && fs.readdirSync(pasta).length)
    return { ok: false, motivo: 'a pasta já existe e não está vazia: ' + pasta };

  const MODELOS = path.join(dep.ROOT, 'modelos');
  const skillDe = path.join(MODELOS, 'skills', setor.skill);
  if (!fs.existsSync(skillDe)) return { ok: false, motivo: 'skill não encontrada em modelos/skills/' + setor.skill };

  const data = new Date().toLocaleDateString('pt-BR');
  const troca = (t) => t.replace(/\{\{NOME\}\}/g, nome).replace(/\{\{SETOR\}\}/g, setorNome)
    .replace(/\{\{NEGOCIO\}\}/g, negocio).replace(/\{\{PORTA\}\}/g, String(porta))
    .replace(/\{\{SKILL\}\}/g, setor.skill).replace(/\{\{DATA\}\}/g, data);
  const modelo = (rel) => troca(fs.readFileSync(path.join(MODELOS, 'agente', rel), 'utf8'));
  const escreve = (rel, txt) => { const a = path.join(pasta, rel); fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, txt); };

  try {
    fs.mkdirSync(pasta, { recursive: true });
    escreve('agente.json', JSON.stringify({ nome, setor: setorNome, setorId: setor.id, trilha: setor.trilha, negocio, porta,
                                            criadoEm: new Date().toISOString(), trabalho: '' }, null, 2) + '\n');
    escreve('CLAUDE.md', modelo('CLAUDE.md'));
    escreve('server.js', modelo('server.js'));
    escreve('prompt-agente.md', modelo('prompt-agente.md'));
    escreve(path.join('skills', 'constituicao.md'), modelo(path.join('skills', 'constituicao.md')));
    escreve(path.join('tools', 'README.md'), modelo(path.join('tools', 'README.md')));
    escreve('memoria.md', modelo('memoria.md'));
    escreve('.gitignore', modelo('gitignore'));
    escreve('.env', modelo(setor.trilha === 'atendimento' ? 'env-atendimento' : 'env-setor'));
    escreve('progresso-do-agente.md', modelo(setor.trilha === 'atendimento' ? 'progresso-atendimento.md' : 'progresso-setor.md'));
    copiarDir(skillDe, path.join(pasta, '.claude', 'skills', setor.skill));
    // o atendimento usa também os modelos da própria skill (passos 7 e 9); já estão dentro dela
  } catch (e) {
    return { ok: false, motivo: 'não consegui criar a pasta: ' + e.message };
  }

  const item = {
    nome, tipo: 'local', pasta, comando: 'node', args: ['server.js'], env: { PORT: String(porta) }, porta, abre: '/painel',
    setor: setorNome, setorId: setor.id, trilha: setor.trilha, negocio,
    sobre: setor.emoji + ' ' + setorNome + (negocio ? ' de ' + negocio : '') + '. Em construção pela skill ' + setor.skill + '. Abra Conversar > Construir para seguir a jornada.',
    dicas: ['O chat de teste do agente fica em / e o painel do dono em /painel',
            'Em Conversar > Construir, a skill conduz a construção passo a passo',
            'As conexões de trabalho ficam no .env da pasta; cole os valores pelo editor, nunca no chat']
  };
  bruto[id] = item;
  dep.gravarRegistro(bruto);
  return { ok: true, id, sistema: item, pasta, setor: { id: setor.id, nome: setorNome, emoji: setor.emoji, trilha: setor.trilha } };
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
  SETORES, setorDe, progressoDe, criarAgente, lerConstituicao, gravarConstituicao
};
