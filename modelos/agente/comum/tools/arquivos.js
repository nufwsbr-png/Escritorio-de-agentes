/* ===========================================================
   tools/arquivos.js — a primeira ferramenta: pastas e arquivos com cerca

   Uso (o agente chama pelo Bash):
     node tools/arquivos.js listar  <pasta>
     node tools/arquivos.js ler     <arquivo>
     node tools/arquivos.js mover   <origem> <destino>
     node tools/arquivos.js escrever <destino> <arquivo-com-o-conteudo>
   Tudo SÓ dentro das pastas autorizadas (PASTAS_AUTORIZADAS no .env) e de
   amostras/, saidas/ e entrada-lida/. Em ensaio nada muda: a ferramenta diz o
   que faria. Em proposta, o resultado vai para saidas/<entidade>/proposta/.
   Em real, vai para o destino, sem sobrescrever. Nunca apaga.
   =========================================================== */
const fs = require('fs');
const path = require('path');
const b = require('./base');

const [, , acao, a1, a2] = process.argv;
const F = 'arquivos';
const abs = (p) => path.resolve(b.PASTA, String(p || ''));

if (!acao) b.responder(F, b.resultado('erro', 'uso: listar <pasta> | ler <arquivo> | mover <origem> <destino> | escrever <destino> <arquivo-fonte>'));

if (acao === 'listar') {
  if (!b.dentroDoEscopo(a1)) b.responder(F, b.resultado('recusado', 'fora do escopo autorizado: ' + a1));
  try {
    const itens = fs.readdirSync(abs(a1), { withFileTypes: true }).map(e => (e.isDirectory() ? '[pasta] ' : '') + e.name);
    b.responder(F, b.resultado('feito', itens.length + ' itens em ' + a1, { itens }));
  } catch (e) { b.responder(F, b.resultado('erro', e.message)); }
}

if (acao === 'ler') {
  if (!b.dentroDoEscopo(a1)) b.responder(F, b.resultado('recusado', 'fora do escopo autorizado: ' + a1));
  try { b.responder(F, b.resultado('feito', 'lido ' + a1, { conteudo: fs.readFileSync(abs(a1), 'utf8').slice(0, 60000) })); }
  catch (e) { b.responder(F, b.resultado('erro', e.message)); }
}

if (acao === 'mover') {
  if (!b.dentroDoEscopo(a1) || !b.dentroDoEscopo(a2)) b.responder(F, b.resultado('recusado', 'origem ou destino fora do escopo autorizado'));
  if (!fs.existsSync(abs(a1))) b.responder(F, b.resultado('erro', 'origem não existe: ' + a1));
  const destino = b.destinoNoModo(a2);
  if (!destino) b.responder(F, b.resultado('feito', 'ENSAIO: moveria ' + a1 + ' para ' + a2 + ' (nada mudou)'));
  try {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    if (b.modo() === 'real') fs.renameSync(abs(a1), destino); else fs.copyFileSync(abs(a1), destino);
    b.responder(F, b.resultado('feito', (b.modo() === 'real' ? 'movido' : 'PROPOSTA: cópia em') + ' ' + path.relative(b.PASTA, destino), { caminho: destino }));
  } catch (e) { b.responder(F, b.resultado('erro', e.message)); }
}

if (acao === 'escrever') {
  if (!b.dentroDoEscopo(a1)) b.responder(F, b.resultado('recusado', 'destino fora do escopo autorizado: ' + a1));
  if (!a2 || !fs.existsSync(abs(a2))) b.responder(F, b.resultado('erro', 'informe um arquivo-fonte com o conteúdo (dentro de saidas/)'));
  const destino = b.destinoNoModo(a1);
  if (!destino) b.responder(F, b.resultado('feito', 'ENSAIO: escreveria ' + a1 + ' (nada mudou)'));
  try {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.copyFileSync(abs(a2), destino);
    b.responder(F, b.resultado('feito', (b.modo() === 'real' ? 'escrito' : 'PROPOSTA: escrito em') + ' ' + path.relative(b.PASTA, destino), { caminho: destino }));
  } catch (e) { b.responder(F, b.resultado('erro', e.message)); }
}

b.responder(F, b.resultado('erro', 'ação desconhecida: ' + acao));
