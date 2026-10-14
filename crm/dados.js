/* ===========================================================
   crm/dados.js — onde as fichas ficam: arquivos locais ou Supabase

   Uma interface só, duas implementações. Toda coleção guarda DOCUMENTOS
   (objetos com `id`), e as duas guardam o mesmo documento: no local, um
   JSON por coleção em crm/data/; no Supabase, uma tabela por coleção com
   `id text primary key, dados jsonb, atualizado timestamptz`. Trocar de um
   para o outro é exportar e importar.

     const D = require('./dados').abrir({ onde: 'local' | 'supabase', pasta, env })
     await D.listar('fichas')              todos os documentos (mais recentes primeiro)
     await D.obter('fichas', id)           um documento ou null
     await D.gravar('fichas', doc)         cria ou substitui (pelo id)
     await D.anexar('historico', doc)      o histórico só cresce
     await D.historicoDe(fichaId)          as linhas de uma ficha, em ordem
     D.esquema()                           o SQL que cria as tabelas no Supabase

   O Supabase chega por BANCO_URL e BANCO_CHAVE no crm/.env (bloco de
   plataformas do escritório; a chave nunca passa pelo chat). Sem dependência:
   só o REST do Supabase (PostgREST) com http/https do Node.
   Design: docs/superpowers/specs/2026-10-14-crm-design.md
   =========================================================== */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const COLECOES = ['fichas', 'historico', 'propostas', 'tarefas'];

/* ---------------- local: um JSON por coleção; escrita atômica ---------------- */
function local(pasta) {
  const dir = path.join(pasta, 'data');
  const arq = (col) => path.join(dir, col + (col === 'historico' ? '.jsonl' : '.json'));
  const ler = (col) => { try { return JSON.parse(fs.readFileSync(arq(col), 'utf8')); } catch (e) { return {}; } };
  const escrever = (col, obj) => { fs.mkdirSync(dir, { recursive: true }); const tmp = arq(col) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n'); fs.renameSync(tmp, arq(col)); };
  const lerHistorico = () => { try { return fs.readFileSync(arq('historico'), 'utf8').split(/\r?\n/).filter(Boolean).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean); } catch (e) { return []; } };
  return {
    onde: 'local',
    async listar(col) { if (col === 'historico') return lerHistorico().reverse(); return Object.values(ler(col)).sort((a, b) => String(b.atualizadoEm || b.criadaEm || '').localeCompare(String(a.atualizadoEm || a.criadaEm || ''))); },
    async obter(col, id) { if (col === 'historico') return lerHistorico().find(h => h.id === id) || null; return ler(col)[id] || null; },
    async gravar(col, doc) { const o = ler(col); o[doc.id] = doc; escrever(col, o); return doc; },
    async anexar(col, doc) { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(arq('historico'), JSON.stringify(doc) + '\n'); return doc; },
    async historicoDe(fichaId) { return lerHistorico().filter(h => h.fichaId === fichaId); },
    esquema: () => '-- fichas locais: sem SQL',
    async testar() { try { fs.mkdirSync(dir, { recursive: true }); return { ok: true, onde: 'local', pasta: dir }; } catch (e) { return { ok: false, motivo: e.message }; } }
  };
}

/* ---------------- Supabase: REST (PostgREST), uma tabela por coleção ---------------- */
function supabase(env) {
  const base = String(env.BANCO_URL || env.SUPABASE_URL || '').replace(/\/+$/, '');
  const chave = String(env.BANCO_CHAVE || env.SUPABASE_CHAVE || '');
  const tabela = (col) => 'crm_' + col;
  function pede(caminho, metodo = 'GET', corpo, extra = {}) {
    return new Promise(resolve => {
      if (!base || !chave) return resolve({ status: 0, erro: 'BANCO_URL ou BANCO_CHAVE vazios no crm/.env (marque o Supabase para o CRM em 🔌 Plataformas)' });
      let u; try { u = new URL(base + '/rest/v1/' + caminho); } catch (e) { return resolve({ status: 0, erro: 'BANCO_URL inválido' }); }
      const mod = u.protocol === 'https:' ? https : http;
      const headers = { apikey: chave, Authorization: 'Bearer ' + chave, Accept: 'application/json', ...extra };
      let dados = null;
      if (corpo !== undefined) { dados = Buffer.from(JSON.stringify(corpo), 'utf8'); headers['Content-Type'] = 'application/json'; headers['Content-Length'] = dados.length; }
      try {
        const req = mod.request(u, { method: metodo, headers, timeout: 20000 }, r => { let s = ''; r.on('data', d => s += d); r.on('end', () => { let j = null; try { j = s ? JSON.parse(s) : null; } catch (e) {} resolve({ status: r.statusCode, json: j, texto: s }); }); });
        req.on('error', e => resolve({ status: 0, erro: e.message })); req.on('timeout', () => { req.destroy(); resolve({ status: 0, erro: 'sem resposta do Supabase' }); });
        if (dados) req.write(dados); req.end();
      } catch (e) { resolve({ status: 0, erro: e.message }); }
    });
  }
  const falha = (r, oque) => { const e = new Error(oque + ': ' + (r.erro || ('HTTP ' + r.status + ' ' + String(r.texto || '').slice(0, 160)))); e.supabase = true; throw e; };
  const linhas = (r) => (Array.isArray(r.json) ? r.json : []).map(l => l.dados).filter(Boolean);
  async function gravarLinha(col, doc) {
    const r = await pede(tabela(col), 'POST', [{ id: doc.id, dados: doc, atualizado: new Date().toISOString() }], { Prefer: 'resolution=merge-duplicates,return=minimal' });
    if (!(r.status >= 200 && r.status < 300)) falha(r, 'não consegui gravar em ' + tabela(col));
    return doc;
  }
  return {
    onde: 'supabase',
    async listar(col) { const r = await pede(tabela(col) + '?select=dados&order=atualizado.desc&limit=10000'); if (r.status !== 200) falha(r, 'não consegui ler ' + tabela(col)); return linhas(r); },
    async obter(col, id) { const r = await pede(tabela(col) + '?select=dados&id=eq.' + encodeURIComponent(id) + '&limit=1'); if (r.status !== 200) falha(r, 'não consegui ler ' + tabela(col)); return linhas(r)[0] || null; },
    gravar: gravarLinha, anexar: gravarLinha,
    async historicoDe(fichaId) { const r = await pede(tabela('historico') + '?select=dados&dados->>fichaId=eq.' + encodeURIComponent(fichaId) + '&order=atualizado.asc&limit=5000'); if (r.status !== 200) falha(r, 'não consegui ler o histórico'); return linhas(r); },
    esquema: () => COLECOES.map(c => 'create table if not exists ' + tabela(c) + ' (id text primary key, dados jsonb not null, atualizado timestamptz not null default now());').join('\n') +
      '\n-- índice para o histórico por ficha\ncreate index if not exists crm_historico_ficha on crm_historico ((dados->>\'fichaId\'));\n',
    async testar() { const r = await pede(tabela('fichas') + '?select=id&limit=1'); return r.status === 200 ? { ok: true, onde: 'supabase' } : { ok: false, motivo: r.erro || ('HTTP ' + r.status + (r.status === 404 ? ': as tabelas não existem; rode o SQL de node crm/dados.js esquema no editor SQL do Supabase' : '')) }; }
  };
}

function abrir({ onde, pasta, env } = {}) {
  return onde === 'supabase' ? supabase(env || process.env) : local(pasta || __dirname);
}

module.exports = { abrir, local, supabase, COLECOES };

if (require.main === module) {
  const a = process.argv[2];
  if (a === 'esquema') console.log(supabase({}).esquema());
  else console.log('uso: node crm/dados.js esquema   (o SQL das tabelas no Supabase)');
}
