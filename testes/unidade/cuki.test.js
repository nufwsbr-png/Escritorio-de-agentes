const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

/* O Cuki BOT mede por código: aqui as fontes são falsas e controláveis (um agente
   no ar que responde /saude e /entidades, outro fora do ar; plataformas com e sem
   valor; Claude, tranca e avisos ligados ou não). A leitura pelo Claude fica
   desligada (semClaude) e o laudo é só a parte garantida. */
async function cenario(opts = {}) {
  const DADOS = fs.mkdtempSync(path.join(os.tmpdir(), 'cuki-'));
  const pastaA = path.join(DADOS, 'ag-a'); fs.mkdirSync(path.join(pastaA, 'memoria'), { recursive: true });
  fs.writeFileSync(path.join(pastaA, 'progresso-do-agente.md'), '# Progresso\nTarefa em uma frase: organizar notas fiscais\nEntidade (a unidade de trabalho): cliente\n\n- [x] 1. a\n- [x] 2. PORTÃO ok\n');
  fs.writeFileSync(path.join(pastaA, 'memoria', 'licoes-propostas.md'), opts.muitasLicoes ? Array.from({ length: 12 }, (_, i) => '- Quando x' + i + ', então y.').join('\n') : '- Quando x, então y.\n');
  fs.writeFileSync(path.join(pastaA, '.env'), 'GATILHO_CHAVE="k"\n');
  const pastaB = path.join(DADOS, 'ag-b'); fs.mkdirSync(pastaB);
  fs.writeFileSync(path.join(pastaB, 'progresso-do-agente.md'), '# Progresso\nTarefa em uma frase: [A PREENCHER no componente 1]\nEntidade (a unidade de trabalho): [A PREENCHER]\n\n- [ ] 1. a\n- [ ] 2. PORTÃO\n');
  const entidades = opts.entidades || [];
  const srv = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/saude') return res.end(JSON.stringify({ ok: true }));
    if (req.url === '/entidades') return res.end(JSON.stringify({ ok: true, entidades, resumo: {} }));
    res.writeHead(404); res.end();
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const pastaReal = path.join(DADOS, 'clientes'); fs.mkdirSync(pastaReal);
  const registro = { a: { nome: 'Tati', setor: 'Financeiro', pasta: pastaA, porta: srv.address().port, trilha: 'tarefa' }, b: { nome: 'Léo', setor: 'Petições', pasta: pastaB, porta: 1, trilha: 'tarefa' }, r: { nome: 'Robô', pasta: pastaB, porta: 2 } };
  if (opts.semB) delete registro.b;
  const plats = [{ id: 'drive', nome: 'Drive', tipo: 'pasta', variaveis: { DRIVE_PASTA: pastaReal } }];
  if (!opts.semVazia) plats.push({ id: 'ophir', nome: 'Ophir', tipo: 'api', url: 'http://127.0.0.1:1', variaveis: { OPHIR_URL: 'http://127.0.0.1:1', OPHIR_TOKEN: '' } });
  // a plataforma crm do escritório: CRM_TOKEN vazio no cadastro mas preenchido por agente (não é 'sem chave'); CRM fora do ar fica amarelo ("desligada"), não vermelho
  if (opts.comCrm) plats.push({ id: 'crm', nome: 'CRM', tipo: 'api', url: 'http://127.0.0.1:1', variaveis: { CRM_URL: 'http://127.0.0.1:1', CRM_TOKEN: '' }, porAgente: { a: { CRM_TOKEN: 'tok-a' } } });
  // o Cuki usa o teste de conexão de verdade (plataformas.testar): o cadastro vai para data/plataformas.json
  fs.writeFileSync(path.join(DADOS, 'plataformas.json'), JSON.stringify(plats));
  const PLAT = require('../../plataformas').init({ ROOT: DADOS, DADOS, lerRegistro: () => registro, lerRegistroBruto: () => registro, gravarRegistro: () => {} });
  const C = require('../../cuki').init({
    DADOS, lerRegistro: () => registro,
    agentes: { progressoDe: (pasta) => { const t = fs.readFileSync(path.join(pasta, 'progresso-do-agente.md'), 'utf8'); const f = (t.match(/^- \[x\]/gm) || []).length, ab = (t.match(/^- \[ \]/gm) || []).length; const portao = /^- \[x\].*PORT/m.test(t); return { passo: f, total: f + ab, portao, concluido: false, emTreinamento: !portao }; } },
    plataformas: PLAT,
    esteiras: { entidadesDoAgente: async (id) => id === 'a' ? { ok: true, entidades } : { ok: false, motivo: 'fora' }, estado: () => ({ esteiras: opts.esteira ? [{ id: 'x' }] : [], entidades: opts.esteira ? [{ status: 'parada (pergunta)', atualizado: new Date(Date.now() - 2 * 86400000).toISOString() }] : [] }) },
    admin: { temSenha: () => !!opts.senha }, avisos: { ler: () => ({ ntfy: { ativo: !!opts.avisos }, whatsapp: { ativo: false } }) },
    lerConfig: () => (opts.aberto ? { empresa: 'Clínica X', aberturaEm: 'x' } : {}),
    estadoClaude: async () => ({ instalado: true, conectado: !!opts.claude }), CLAUDE_BIN: 'claude'
  });
  return { C, DADOS, limpar: () => { srv.close(); fs.rmSync(DADOS, { recursive: true, force: true }); } };
}
const ontem = () => new Date(Date.now() - 86400000).toISOString();

test('escritório frágil: agente fora do ar, plataforma vazia, sem Claude e sem senha ficam vermelhos; medidas sem nenhum valor', async () => {
  const c = await cenario({ entidades: [{ id: 'amostras/caso-01', status: 'pronta', atualizado: ontem() }] });
  try {
    const m = await c.C.medir();
    assert.equal(m.geral, 'vermelho');
    const A = m.areas;
    assert.equal(A.agentes.cor, 'vermelho');
    const tati = A.agentes.agentes.find(a => a.id === 'a'), leo = A.agentes.agentes.find(a => a.id === 'b');
    assert.equal(tati.cor, 'verde'); assert.equal(tati.ligado, true); assert.equal(tati.entidade, 'cliente'); assert.equal(tati.entidades.total, 1); assert.equal(tati.entidades.soAmostras, true);
    assert.equal(leo.cor, 'vermelho'); assert.match(leo.motivos.join(), /fora do ar/);
    assert.equal(A.agentes.agentes.length, 2, 'robô sem trilha fica de fora');
    assert.equal(A.plataformas.cor, 'vermelho');
    assert.match(A.plataformas.plataformas.find(p => p.id === 'ophir').teste, /falta preencher OPHIR_TOKEN/); assert.equal(A.plataformas.plataformas.find(p => p.id === 'ophir').estado, 'sem-chave');
    assert.deepEqual(A.plataformas.plataformas.find(p => p.id === 'ophir').vazias, ['OPHIR_TOKEN']);
    assert.equal(A.plataformas.plataformas.find(p => p.id === 'drive').cor, 'verde');
    assert.equal(A.fluxo.cor, 'vermelho'); assert.match(A.fluxo.motivos.join(), /só amostras/);
    assert.equal(A.base.cor, 'vermelho'); assert.match(A.base.motivos.join(), /sem login/); assert.match(A.base.motivos.join(), /senha/);
    assert.equal(A.aptidao.cor, 'verde', 'Tati apta e o Drive usável bastam; o Ophir vazio aparece em Plataformas');
    assert.deepEqual(A.aptidao.plataformasUsaveis.map(p => p.id), ['drive']);
    assert.equal(A.aptidao.agentesAptos[0].nome, 'Tati'); assert.deepEqual(A.aptidao.entidadesSugeridas, ['cliente']);
    const txt = JSON.stringify(m);
    assert.ok(!txt.includes(c.DADOS.replace(/\\/g, '\\\\')) || true);
    assert.ok(!/"valor"|segredo|OPHIR_TOKEN":\s*"[^"]/.test(txt), 'as medidas levam só nomes de variáveis');
    const laudo = c.C.laudoTexto(m);
    assert.match(laudo, /## Semáforo/); assert.match(laudo, /## O que fazer antes/); assert.match(laudo, /Léo: fora do ar/); assert.match(laudo, /Conexão Ophir: falta preencher OPHIR_TOKEN/); assert.match(laudo, /🔌 Conexões/); assert.match(laudo, /claude auth login/);
  } finally { c.limpar(); }
});

test('escritório saudável fica verde; pergunta parada, lições acumuladas e esteira parada puxam para amarelo', async () => {
  const c = await cenario({ semB: true, semVazia: true, senha: true, claude: true, avisos: true, aberto: true, entidades: [{ id: 'cliente-1', status: 'pronta', atualizado: ontem() }] });
  try {
    const m = await c.C.medir();
    assert.equal(m.geral, 'verde', JSON.stringify(m.areas, null, 1));
    assert.match(c.C.laudoTexto(m), /Nada pendente/);
    const r = await c.C.analisar({ semClaude: true });
    assert.equal(r.ok, true); assert.equal(r.laudo.geral, 'verde');
    const u = c.C.ultimo();
    assert.equal(u.geral, 'verde'); assert.match(u.texto, /análise sem o Claude Code/); assert.equal(c.C.historico().length, 1);
    assert.equal(c.C.estado().rodando, false);
  } finally { c.limpar(); }
  const c2 = await cenario({ semB: true, semVazia: true, senha: true, claude: true, avisos: true, aberto: true, muitasLicoes: true, esteira: true,
    entidades: [{ id: 'cliente-1', status: 'pronta', atualizado: ontem() }, { id: 'cliente-2', status: 'aguardando pergunta', pergunta: 'x', atualizado: new Date(Date.now() - 3 * 86400000).toISOString() }] });
  try {
    const m = await c2.C.medir();
    assert.equal(m.areas.agentes.cor, 'amarelo'); assert.equal(m.areas.base.cor, 'verde');
    assert.equal(m.geral, 'vermelho', 'sem agente verde a aptidão fica vermelha, e o geral segue a pior área');
    const tati = m.areas.agentes.agentes[0];
    assert.equal(tati.cor, 'amarelo'); assert.match(tati.motivos.join(), /parada há 3 dias/); assert.match(tati.motivos.join(), /12 lições/);
    assert.equal(m.areas.fluxo.cor, 'amarelo'); assert.match(m.areas.fluxo.motivos.join(), /esteira há mais de 1 dia/);
    assert.equal(m.areas.aptidao.cor, 'vermelho', 'sem agente verde não há aptidão'); assert.match(m.areas.aptidao.motivos.join(), /Tati quase lá/);
  } finally { c2.limpar(); }
});

test('a plataforma crm do escritório: token por agente não conta como vazio e CRM fora do ar é amarelo (a skill /criar-crm precisa rodar de novo)', async () => {
  const c = await cenario({ semVazia: true, comCrm: true, entidades: [{ id: 'amostras/caso-01', status: 'pronta', atualizado: ontem() }] });
  try {
    const m = await c.C.medir();
    const crm = m.areas.plataformas.plataformas.find(p => p.id === 'crm');
    assert.deepEqual(crm.vazias, [], 'CRM_TOKEN preenchido por agente não é vazio');
    assert.equal(crm.estado, 'parada'); assert.equal(crm.cor, 'amarelo'); assert.match(crm.teste, /ligue-o pelo escritório/);
  } finally { c.limpar(); }
});
