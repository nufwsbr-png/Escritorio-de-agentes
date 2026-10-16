const test = require('node:test');
const assert = require('node:assert');
const RAMOS = require('../../ramos');
const PLANTA = require('../../planta');

test('a biblioteca tem os sete ramos, o genérico por último, cada um com setores, roupa e três variações com sala de descanso', () => {
  const lista = RAMOS.lista();
  assert.deepEqual(lista.map(r => r.id), ['advocacia', 'agencia', 'clinica', 'contabilidade', 'imobiliaria', 'loja', 'generico']);
  for (const r of lista) {
    assert.ok(r.setores.length >= 4 && r.setores.length <= 6, r.id + ': 4 a 6 setores sugeridos');
    assert.ok(['executivo', 'social', 'casual', 'jaleco', 'classico', 'elegante'].includes(r.roupa), r.id + ': roupa sugerida');
    assert.deepEqual(Object.keys(r.variacoes), ['compacta', 'padrao', 'ampla']);
    for (const [vid, v] of Object.entries(r.variacoes)) {
      assert.ok(v.salas.some(s => s.tipo === 'descanso'), r.id + '/' + vid + ': tem sala de descanso');
      assert.ok(v.salas.some(s => s.tipo === 'reuniao') && v.salas.some(s => s.tipo === 'recepcao') && v.salas.some(s => s.tipo === 'diretoria'), r.id + '/' + vid + ': reunião, recepção e diretoria');
    }
  }
});

test('todas as 21 variações cabem na grade do planta.js, com os setores sugeridos distribuídos nas salas', () => {
  for (const r of RAMOS.lista()) for (const vid of Object.keys(r.variacoes)) {
    const s = RAMOS.salasPara(r.id, vid, r.setores.map(x => x.nome));
    assert.equal(s.ok, true);
    const g = PLANTA.gerar(s.salas);
    assert.equal(g.ok, true, r.id + '/' + vid + ': ' + (g.motivo || '') + ' ' + (g.sugestao || ''));
    // todo setor sugerido caiu em alguma sala, e a planta gerada guarda os setores por sala
    for (const st of r.setores) assert.ok(s.atribuicao[st.nome], r.id + '/' + vid + ': ' + st.nome + ' sem sala');
    const comSetores = g.planta.salas.filter(x => x.setores && x.setores.length);
    assert.ok(comSetores.length >= 1, r.id + '/' + vid + ': a planta gerada leva os setores');
    assert.ok(g.capacidade >= 6, r.id + '/' + vid + ': pelo menos 6 mesas (tem ' + g.capacidade + ')');
  }
});

test('detectar acha o ramo pela descrição livre e cai no genérico quando nada bate', () => {
  assert.equal(RAMOS.detectar('Somos a Furtado Advocacia, escritório de advocacia em Cuiabá; o dono é o Dr. Anderson'), 'advocacia');
  assert.equal(RAMOS.detectar('Clínica de estética, pacientes marcam pelo WhatsApp'), 'clinica');
  assert.equal(RAMOS.detectar('loja de roupas com e-commerce e estoque'), 'loja');
  assert.equal(RAMOS.detectar('agência de marketing e tráfego'), 'agencia');
  assert.equal(RAMOS.detectar('imobiliária: aluguel e venda de imóveis'), 'imobiliaria');
  assert.equal(RAMOS.detectar('escritório de contabilidade, folha de pagamento'), 'contabilidade');
  assert.equal(RAMOS.detectar('vendemos consultoria'), 'generico');
});

test('salasPara: o setor cai na sala cujos papéis batem; o que não bate vai para a geral; a compacta junta tudo', () => {
  const p = RAMOS.salasPara('advocacia', 'padrao', ['Petições', 'Financeiro', 'Captação e Marketing', 'Coisa estranha']);
  assert.equal(p.atribuicao['Petições'], 'Pastas e petições');
  assert.equal(p.atribuicao['Financeiro'], 'Financeiro');
  assert.equal(p.atribuicao['Captação e Marketing'], 'Atendimento e captação');
  assert.equal(p.atribuicao['Coisa estranha'], 'Atendimento e captação', 'sem papel que bata, vai para a primeira operação');
  assert.equal(p.roupa, 'executivo');
  const c = RAMOS.salasPara('clinica', 'compacta', [{ nome: 'Agendamento' }, { nome: 'Marketing' }]);
  assert.deepEqual(c.salas.find(s => s.tipo === 'operacao').setores, ['Agendamento', 'Marketing']);
  assert.equal(c.roupa, 'jaleco');
  assert.equal(RAMOS.salasPara('nao-existe', 'xyz', []).variacao, 'padrao', 'ramo desconhecido cai no genérico, variação desconhecida no padrão');
});
