/* ===========================================================
   testes/conferir-organizacao.js — cada coisa no seu lugar

   Falha (código 1) quando alguma regra do CLAUDE.md da raiz foi furada:
     a) segredo versionado: .env, *.pem, google-credentials.json, data/*.json
        fora dos dois exemplos, ou um padrão de chave em arquivo rastreado;
     b) pasta de agente (agentes/* e exemplo-agente) sem os arquivos da
        anatomia ou com .gitignore que não exclui o .env;
     c) endereço http(s) ou porta 4xxx fixos fora dos lugares permitidos;
     d) variável com prefixo de plataforma cadastrada fora do bloco gerenciado
        de um .env de agente;
     e) a skill /criar-escritorio existe com frontmatter válido (só é
        cobrado quando a pasta .claude/skills existe no projeto).
   Uso: node testes/conferir-organizacao.js   (ou pelo npm test)
   =========================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ANATOMIA = ['CLAUDE.md', 'ANATOMIA.md', 'prompt-agente.md', path.join('skills', 'constituicao.md'),
  path.join('tools', 'base.js'), path.join('memoria', 'licoes.md'), 'progresso-do-agente.md', 'server.js', '.gitignore'];
// `${VAR}` é referência a variável (mcp.json gerado), não chave
const PADRAO_CHAVE = /(api[_-]?key|apikey|token|senha|password|secret|chave)\s*[:=]\s*["'](?!\$\{)[^"'\s]{12,}["']/i;
const URL_FIXA = /https?:\/\/(?!localhost|127\.0\.0\.1|\[::1\]|\$\{)[a-z0-9.-]+\.[a-z]{2,}/i;
const PORTA_FIXA = /:4[0-9]{3}(?![\w.])/;   // só porta em endereço (":4401"), não um tempo em ms nem um tamanho
// onde endereço externo fixo pode existir
const URL_PERMITIDA = [/^avisos\.js$/, /^modelos\/agente\/atendimento\/server\.js$/, /^index\.html$/, /^estudio\/[a-z-]+\.html$/, /\.md$/, /^docs\//, /^modelos\/skills\//,
  /^exemplo-agente\/\.claude\//, /^testes\//, /^js\/plataformas\.js$/, /^js\/app\.js$/, /^server\.js$/, /^plataformas\.js$/, /^modelos\/agente\/[a-z]+\/env$/, /\.exemplo$/];
// onde uma porta 4xxx pode estar fixa (padrões e sugestões)
const PORTA_PERMITIDA = [/^server\.js$/, /^modelos\/agente\/comum\/agente-base\.js$/, /^exemplo-agente\/agente-base\.js$/, /^js\/contratar\.js$/, /^js\/app\.js$/,
  /\.md$/, /^docs\//, /^data\//, /\.json$/, /\.env/, /^modelos\/agente\/[a-z]+\/env$/, /^testes\//, /\.cmd$/, /\.ps1$/, /^modelos\/skills\//, /^exemplo-agente\/\.claude\//,
  /^modelos\/agente\/comum\/tools\/README\.md$/, /^exemplo-agente\/server\.js$/, /^modelos\/agente\/[a-z]+\/server\.js$/, /^modelos\/agente\/tarefa\/rodar\.js$/, /^exemplo-agente\/rodar\.js$/];
const INICIO = '# >>> plataformas do escritório';
const FIM = '# <<< plataformas do escritório <<<';

const bate = (lista, rel) => lista.some(r => r.test(rel));
const rel = (ROOT, p) => path.relative(ROOT, p).split(path.sep).join('/');

function rastreados(ROOT) {
  try { return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean); }
  catch (e) { return []; }
}
function lerPlataformas(ROOT) {
  const dados = process.env.ESCRITORIO_DADOS || path.join(ROOT, 'data');
  try { const j = JSON.parse(fs.readFileSync(path.join(dados, 'plataformas.json'), 'utf8')); return Array.isArray(j) ? j : []; } catch (e) { return []; }
}
function pastasDeAgente(ROOT) {
  const out = [];
  const ex = path.join(ROOT, 'exemplo-agente'); if (fs.existsSync(ex)) out.push(ex);
  const ag = path.join(ROOT, 'agentes');
  if (fs.existsSync(ag)) for (const e of fs.readdirSync(ag, { withFileTypes: true })) if (e.isDirectory()) out.push(path.join(ag, e.name));
  return out;
}
const semComentarios = (txt) => txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '')
  .split(/\r?\n/).filter(l => !/^\s*(\/\/|#|rem\b)/i.test(l)).join('\n');

function conferir({ ROOT, plataformas } = {}) {
  ROOT = ROOT || path.join(__dirname, '..');
  const problemas = [];
  const arquivos = rastreados(ROOT);
  const plats = plataformas || lerPlataformas(ROOT);

  // (a) segredos versionados
  for (const a of arquivos) {
    const nome = path.basename(a);
    if (nome === '.env' || nome.endsWith('.pem') || nome === 'google-credentials.json') problemas.push('segredo versionado: ' + a);
    if (/^data\//.test(a) && !/\.exemplo\.json$/.test(a)) problemas.push('dado do cliente versionado: ' + a);
    if (/\.(js|json|html|css|cmd|ps1|md|env|exemplo)$/i.test(a) || /\/env$/.test(a)) {
      let txt = ''; try { txt = fs.readFileSync(path.join(ROOT, a), 'utf8'); } catch (e) { continue; }
      const m = PADRAO_CHAVE.exec(semComentarios(txt));
      if (m && !/\{\{|\[A PREENCHER\]|exemplo|placeholder|teste|segredo-|abc123|tok-|novo-|"x"/i.test(m[0])) problemas.push('parece chave em arquivo rastreado: ' + a + ' (' + m[0].slice(0, 40) + '…)');
    }
  }

  // (c) endereços e portas fixos
  for (const a of arquivos) {
    if (!/\.(js|html|css)$/i.test(a)) continue;
    let txt = ''; try { txt = fs.readFileSync(path.join(ROOT, a), 'utf8'); } catch (e) { continue; }
    const limpo = semComentarios(txt);
    if (!bate(URL_PERMITIDA, a) && URL_FIXA.test(limpo)) problemas.push('endereço externo fixo fora do lugar permitido: ' + a + ' (' + URL_FIXA.exec(limpo)[0] + ')');
    if (!bate(PORTA_PERMITIDA, a) && PORTA_FIXA.test(limpo)) problemas.push('porta fixa fora do lugar permitido: ' + a + ' (' + PORTA_FIXA.exec(limpo)[0] + ')');
  }

  // (b) e (d) pastas de agente
  for (const pasta of pastasDeAgente(ROOT)) {
    const r = rel(ROOT, pasta);
    for (const f of ANATOMIA) if (!fs.existsSync(path.join(pasta, f))) problemas.push('agente sem ' + f.split(path.sep).join('/') + ' (anatomia incompleta): ' + r);
    let gi = ''; try { gi = fs.readFileSync(path.join(pasta, '.gitignore'), 'utf8'); } catch (e) {}
    if (gi && !/^\s*\.env\s*$/m.test(gi)) problemas.push('agente com .gitignore que não exclui o .env: ' + r + '/.gitignore');
    let env = ''; try { env = fs.readFileSync(path.join(pasta, '.env'), 'utf8'); } catch (e) {}
    if (env && plats.length) {
      const i = env.indexOf(INICIO), j = env.indexOf(FIM);
      const fora = i >= 0 && j > i ? env.slice(0, i) + env.slice(j + FIM.length) : env;
      const prefixos = plats.map(p => String(p.id).toUpperCase().replace(/-/g, '_') + '_');
      for (const linha of fora.split(/\r?\n/)) {
        const m = /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(linha); if (!m) continue;
        const pref = prefixos.find(p => m[1].startsWith(p));
        if (pref) problemas.push('variável de plataforma fora do bloco gerenciado: ' + r + '/.env ' + m[1] + ' (cadastre em 🔌 Plataformas e marque o agente)');
      }
    }
  }

  // (e) a skill /criar-escritorio
  const skills = path.join(ROOT, '.claude', 'skills');
  if (fs.existsSync(skills)) {
    const sk = path.join(skills, 'criar-escritorio', 'SKILL.md');
    if (!fs.existsSync(sk)) problemas.push('falta .claude/skills/criar-escritorio/SKILL.md');
    else {
      const txt = fs.readFileSync(sk, 'utf8');
      if (!/^---\r?\nname:\s*criar-escritorio\r?\ndescription:\s*\S[\s\S]*?\r?\n---/m.test(txt)) problemas.push('SKILL.md de criar-escritorio sem frontmatter válido (name, description)');
    }
  }

  return { ok: problemas.length === 0, problemas };
}

module.exports = { conferir, ANATOMIA };

if (require.main === module) {
  const r = conferir({});
  if (r.ok) { console.log('organização ok: segredos fora do git, anatomia completa, endereços e plataformas no lugar'); process.exit(0); }
  console.log('organização com ' + r.problemas.length + ' problema(s):');
  for (const p of r.problemas) console.log('  - ' + p);
  process.exit(1);
}
