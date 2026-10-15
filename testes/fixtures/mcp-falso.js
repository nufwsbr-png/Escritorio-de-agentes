/* um servidor MCP de mentira, por stdio: responde initialize e tools/list.
   Usado pelo teste de conexão das plataformas tipo mcp (COMANDO local). */
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => {
  buf += d;
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (!linha) continue;
    let m; try { m = JSON.parse(linha); } catch (e) { continue; }
    if (m.method === 'initialize') process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result: { protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'falso', version: '1' } } }) + '\n');
    else if (m.method === 'tools/list') process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: m.id, result: { tools: [{ name: 'ler_pasta' }, { name: 'gravar_arquivo' }] } }) + '\n');
  }
});
process.stdin.on('end', () => process.exit(0));
