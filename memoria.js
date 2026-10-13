/* ===========================================================
   memoria.js — o que os agentes lembram, dizem uns aos outros e propõem

   Três coisas, todas em arquivo:

   MEMÓRIA   memoria.md na pasta de cada agente. Entra no começo de toda
             chamada (conversa, reunião, testador) e cresce no fim com o que
             o agente marcou em <memoria>…</memoria>. Limite de tamanho:
             as linhas mais velhas saem.
   RECADOS   data/mensagens.json. Um agente deixa um recado para outro com
             <mensagem para="id">…</mensagem>; ele é entregue no próximo
             prompt do destinatário. O dono também pode escrever pela tela.
   PROPOSTAS data/propostas.json. O agente sugere mudança no prompt ou na
             constituição com <proposta arquivo=".." titulo="..">…</proposta>.
             Nada entra sozinho: fica pendente até o dono aprovar. É a regra
             da skill: o construtor nunca escreve o prompt do dono.
   =========================================================== */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let dep = null;   // { ROOT, lerRegistro, nomeDe(id) }
const MEMORIA_MAX = 8000;
const MODELO_MEMORIA = (nome) => '# Memória de ' + nome + '\n\n' +
  '<!-- O que este agente aprendeu operando. O escritório lê no começo de cada conversa,\n' +
  '     reunião e teste, e acrescenta no fim o que o agente marcou como aprendizado. -->\n\n## Aprendizados\n\n';

const arqMensagens = () => path.join(dep.ROOT, 'data', 'mensagens.json');
const arqPropostas = () => path.join(dep.ROOT, 'data', 'propostas.json');
const lerJson = (a, padrao) => { try { return JSON.parse(fs.readFileSync(a, 'utf8')); } catch (e) { return padrao; } };
const gravarJson = (a, d) => { try { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, JSON.stringify(d, null, 2) + '\n'); } catch (e) {} };
const hoje = () => new Date().toLocaleDateString('pt-BR');
const nomeDe = (id) => (dep.nomeDe && dep.nomeDe(id)) || ((dep.lerRegistro()[id] || {}).nome) || id;

/* ---------------- memória ---------------- */
function arquivoMemoria(id) {
  const s = dep.lerRegistro()[id];
  if (!s || !s.pasta || !fs.existsSync(s.pasta)) return null;
  return path.join(s.pasta, 'memoria.md');
}

function lerMemoria(id) {
  const a = arquivoMemoria(id);
  if (!a) return null;
  try { return fs.readFileSync(a, 'utf8'); }
  catch (e) {
    const t = MODELO_MEMORIA(nomeDe(id));
    try { fs.writeFileSync(a, t); } catch (_) {}
    return t;
  }
}

function gravarMemoria(id, texto) {
  const a = arquivoMemoria(id);
  if (!a) return { ok: false, motivo: 'esse agente não tem pasta' };
  fs.writeFileSync(a, String(texto).slice(0, MEMORIA_MAX * 2));
  return { ok: true };
}

/** acrescenta um aprendizado datado e mantém o arquivo dentro do limite */
function anotar(id, linha) {
  const a = arquivoMemoria(id);
  if (!a) return false;
  let t = lerMemoria(id) || MODELO_MEMORIA(nomeDe(id));
  if (!/^## Aprendizados/m.test(t)) t = t.trimEnd() + '\n\n## Aprendizados\n\n';
  t = t.trimEnd() + '\n- [' + hoje() + '] ' + String(linha).replace(/\s+/g, ' ').trim().slice(0, 400) + '\n';
  // estourou: tira as linhas mais antigas de aprendizado, nunca o cabeçalho
  while (t.length > MEMORIA_MAX) {
    const linhas = t.split('\n');
    const i = linhas.findIndex((l, k) => l.startsWith('- ') && k > linhas.findIndex(x => /^## Aprendizados/.test(x)));
    if (i < 0) break;
    linhas.splice(i, 1);
    t = linhas.join('\n');
  }
  fs.writeFileSync(a, t);
  return true;
}

/* ---------------- recados ---------------- */
function enviar({ de, para, texto }) {
  const reg = dep.lerRegistro();
  if (!reg[para] && para !== 'dono') return { ok: false, motivo: 'destinatário não existe: ' + para };
  const lista = lerJson(arqMensagens(), []);
  const m = { id: crypto.randomBytes(5).toString('hex'), de, deNome: de === 'dono' ? 'Dono' : nomeDe(de),
              para, paraNome: para === 'dono' ? 'Dono' : nomeDe(para),
              texto: String(texto).trim().slice(0, 1500), quando: Date.now(), entregue: false };
  lista.push(m);
  gravarJson(arqMensagens(), lista.slice(-500));
  return { ok: true, mensagem: m };
}

/** recados ainda não entregues a esse agente; marcá-los entregues é opcional */
function pendentesPara(id, marcar) {
  const lista = lerJson(arqMensagens(), []);
  const p = lista.filter(m => m.para === id && !m.entregue);
  if (marcar && p.length) { for (const m of p) m.entregue = Date.now(); gravarJson(arqMensagens(), lista); }
  return p;
}

const caixaDe = (id, n = 40) => lerJson(arqMensagens(), []).filter(m => m.para === id || m.de === id).slice(-n);
/** recados criados depois de `desde`: a tela usa para animar o boneco levando o recado */
const novos = (desde) => lerJson(arqMensagens(), []).filter(m => m.quando > desde);

/* ---------------- propostas ---------------- */
const ARQUIVOS_PERMITIDOS = /^(prompt-agente\.md|CLAUDE\.md|memoria\.md|skills\/[a-z0-9_-]+\.md)$/i;

function registrarProposta({ agente, arquivo, secao, titulo, conteudo }) {
  arquivo = String(arquivo || 'prompt-agente.md').replace(/\\/g, '/').trim();
  if (!ARQUIVOS_PERMITIDOS.test(arquivo)) return { ok: false, motivo: 'arquivo não permitido: ' + arquivo };
  const lista = lerJson(arqPropostas(), []);
  const p = { id: crypto.randomBytes(5).toString('hex'), agente, agenteNome: nomeDe(agente), arquivo,
              secao: String(secao || '').trim().slice(0, 80) || null, titulo: String(titulo || 'Proposta').trim().slice(0, 120),
              conteudo: String(conteudo).trim().slice(0, 4000), quando: Date.now(), estado: 'pendente' };
  lista.push(p);
  gravarJson(arqPropostas(), lista.slice(-300));
  return { ok: true, proposta: p };
}

const propostas = (agente) => lerJson(arqPropostas(), []).filter(p => !agente || p.agente === agente);

/** aprovar aplica no arquivo do agente; recusar só registra */
function decidir(idProposta, decisao) {
  const lista = lerJson(arqPropostas(), []);
  const p = lista.find(x => x.id === idProposta);
  if (!p) return { ok: false, motivo: 'proposta não existe' };
  if (p.estado !== 'pendente') return { ok: false, motivo: 'já foi ' + p.estado };
  if (decisao === 'aprovada') {
    const s = dep.lerRegistro()[p.agente];
    if (!s || !s.pasta) return { ok: false, motivo: 'o agente não tem pasta' };
    const alvo = path.join(s.pasta, p.arquivo);
    if (!alvo.startsWith(path.resolve(s.pasta))) return { ok: false, motivo: 'caminho fora da pasta' };
    let t = ''; try { t = fs.readFileSync(alvo, 'utf8'); } catch (e) {}
    const bloco = '\n' + p.conteudo.trim() + '\n';
    const marca = '<!-- aprovado pelo dono em ' + hoje() + ': ' + p.titulo.replace(/-->/g, '') + ' -->';
    if (p.secao) {
      // dentro da seção pedida: logo antes do próximo título do mesmo nível ou do fim
      const re = new RegExp('^(#{1,6})\\s+' + p.secao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'mi');
      const m = re.exec(t);
      if (m) {
        const nivel = m[1].length;
        const resto = t.slice(m.index + m[0].length);
        const prox = resto.search(new RegExp('^#{1,' + nivel + '}\\s', 'm'));
        const corte = prox < 0 ? t.length : m.index + m[0].length + prox;
        t = t.slice(0, corte).trimEnd() + '\n' + marca + bloco + '\n' + t.slice(corte);
      } else t = t.trimEnd() + '\n\n## ' + p.secao + '\n' + marca + bloco;
    } else t = t.trimEnd() + '\n\n' + marca + bloco;
    fs.mkdirSync(path.dirname(alvo), { recursive: true });
    fs.writeFileSync(alvo, t);
  }
  p.estado = decisao === 'aprovada' ? 'aprovada' : 'recusada';
  p.decididaEm = Date.now();
  gravarJson(arqPropostas(), lista);
  return { ok: true, proposta: p };
}

/* ---------------- o que vai no prompt e o que volta dele ---------------- */
const INSTRUCOES =
  '\n\nCOMO FALAR COM O ESCRITÓRIO (blocos no FIM da resposta, retirados do texto antes de o dono ler):\n' +
  '- <memoria>uma ou duas linhas</memoria> se aprendeu algo durável sobre este sistema (fato, causa de erro, compromisso). Sem novidade, não inclua.\n' +
  '- <mensagem para="ID">texto</mensagem> para deixar um recado a outro agente; use o ID do sistema dele, listado abaixo.\n' +
  '- <proposta arquivo="prompt-agente.md" secao="Nunca faça isso" titulo="curto">texto a acrescentar</proposta> para sugerir mudança no seu prompt ' +
  'ou na constituição. Ela NÃO entra sozinha: o dono aprova no escritório. Nunca edite prompt-agente.md nem skills/constituicao.md diretamente.';

/** memória + recados pendentes + colegas, para colar no prompt de sistema */
function contextoDe(id) {
  const reg = dep.lerRegistro();
  let ctx = '';
  const mem = lerMemoria(id);
  if (mem) {
    const util = mem.replace(/<!--[\s\S]*?-->/g, '').replace(/^# .*$/m, '').trim();
    if (util.replace(/## Aprendizados/, '').trim()) ctx += '\n\nSUA MEMÓRIA (memoria.md — o que você já aprendeu operando):\n' + util.slice(-4000);
  }
  const pend = pendentesPara(id, true);
  if (pend.length)
    ctx += '\n\nRECADOS RECEBIDOS (responda ou aja sobre eles se fizer sentido):\n' +
      pend.map(m => '- de ' + m.deNome + ' (' + m.de + '), ' + new Date(m.quando).toLocaleString('pt-BR') + ': ' + m.texto).join('\n');
  const colegas = Object.entries(reg).filter(([k]) => k !== id).map(([k, s]) => k + ' = ' + (s.nome || k) + (s.setor ? ' (' + s.setor + ')' : ''));
  ctx += '\n\nCOLEGAS DO ESCRITÓRIO (ID = nome): ' + (colegas.join('; ') || 'nenhum') + '; dono = o dono do negócio.';
  return ctx + INSTRUCOES;
}

/** separa os blocos da resposta, grava cada um e devolve o texto limpo com notas */
function processarBlocos(id, texto) {
  const notas = [];
  let t = String(texto || '');
  t = t.replace(/<memoria>([\s\S]*?)<\/memoria>/gi, (_, c) => {
    const linhas = c.trim().split(/\n+/).map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean).slice(0, 3);
    let n = 0; for (const l of linhas) if (anotar(id, l)) n++;
    if (n) notas.push('🧠 memória atualizada');
    return '';
  });
  t = t.replace(/<mensagem\s+para="([^"]+)">([\s\S]*?)<\/mensagem>/gi, (_, para, c) => {
    const r = enviar({ de: id, para: para.trim(), texto: c });
    notas.push(r.ok ? '✉️ recado deixado para ' + r.mensagem.paraNome : '✉️ recado não enviado: ' + r.motivo);
    return '';
  });
  t = t.replace(/<proposta([^>]*)>([\s\S]*?)<\/proposta>/gi, (_, attrs, c) => {
    const at = (k) => { const m = new RegExp(k + '="([^"]*)"', 'i').exec(attrs); return m ? m[1] : ''; };
    const r = registrarProposta({ agente: id, arquivo: at('arquivo'), secao: at('secao'), titulo: at('titulo'), conteudo: c });
    notas.push(r.ok ? '📝 proposta registrada para aprovação: ' + r.proposta.titulo : '📝 proposta recusada: ' + r.motivo);
    return '';
  });
  return { texto: t.trim(), notas };
}

module.exports = {
  init(d) { dep = d; return module.exports; },
  lerMemoria, gravarMemoria, anotar,
  enviar, pendentesPara, caixaDe, novos,
  registrarProposta, propostas, decidir,
  contextoDe, processarBlocos
};
