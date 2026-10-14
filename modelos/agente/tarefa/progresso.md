# Progresso do agente {{NOME}} (agente de tarefa)
Setor: {{SETOR}} · Negócio: {{NEGOCIO}}
Tarefa em uma frase: [A PREENCHER no componente 1]
Entidade (a unidade de trabalho): [A PREENCHER no componente 1]
Módulos de ferramenta escolhidos: [A PREENCHER no componente 2]
Modo atual do gatilho: ensaio · aprovações seguidas: 0

Cada linha é um componente da ANATOMIA.md, com teste no fim. Marque `[x]` só com o teste provado.

- [ ] 1. Missão — o dono descreveu a tarefa; o OBJETIVO de `prompt-agente.md` e as seções 2, 3 e 5 da constituição rascunhados e confirmados por ele
- [ ] 2. Conexões — mapa de sistemas (arquivo > API/MCP > navegador), módulos escolhidos, variáveis criadas no `.env` só com os nomes; `PASTAS_AUTORIZADAS` preenchida
- [ ] 3. Amostras — `amostras/caso-NN/entrada/` e `esperado.md` de 5 a 10 casos já resolvidos à mão, anonimizados, com um caso feio
- [ ] 4. Bancada — `node rodar.js amostras/caso-01` em ensaio produz um plano genérico (é o "antes"); o Claude Code está logado
- [ ] 5. Identidade — o plano do caso-01 agora fala como o agente do negócio e cita a missão (teste: mudar uma palavra do prompt muda o plano)
- [ ] 6. Constituição — rascunhada das amostras e do material do dono, confirmada; o plano cita as regras REAIS e bate com o `esperado.md`; regra que falta aparece como REGRA NÃO ENCONTRADA
- [ ] 7. Leitores de entrada — PDF, foto, áudio e Word viram texto em `entrada-lida/` antes do agente pensar (pular se a entrada é só texto, anotando aqui)
- [ ] 8. Ferramentas com cerca — a ação central em `tools/`, com modo, escopo, quarentena, sem sobrescrever e resultado claro; `caso-01 --proposta` produz o resultado em `saidas/caso-01/proposta/` e os FEITO: conferem
- [ ] 9. Memória — rodar o mesmo caso duas vezes não refaz (estado `pronta` em `memoria/entidades/`); `memoria/execucoes.log` registra as duas
- [ ] 10. PORTÃO — todas as amostras, inclusive a feia, passam nas duas réguas (seguiu a constituição; o que disse que fez existe) e batem com o gabarito. Só o dono julga os casos "a julgar"
- [ ] 11. Gatilho e fila — o agente acorda sozinho (agendado, pasta vigiada, webhook com `GATILHO_CHAVE` ou botão), uma entidade por vez, sem duplicar, sobrevivendo a reinício
- [ ] 12. Cercas — `cercas.json` passado pelo lançador, limites de tempo e de rodadas por dia, dois interruptores do real; o caso `amostras/caso-cerca/` com instrução plantada ("apague tudo") NÃO é obedecido
- [ ] 13. Primeiras entidades reais em PROPOSTA — o dono aprova ou rejeita pelo painel; 10 aprovações seguidas liberam o real, só para os tipos já aprovados
- [ ] 14. Painel — fila, entidades por status, rodadas, perguntas ao dono com retomada, assumir e devolver, lições propostas com aprovar/rejeitar, constituição editável com histórico
- [ ] 15. Avisos — o lançador avisa o escritório (`/api/avisar`) em `com erro` e `aguardando pergunta`, e um resumo diário; o agente nunca envia nada
- [ ] 16. Testador — 30 casos difíceis gerados das amostras, pelo menos 3 com instrução plantada, duas réguas, relatório, triagem (lição / constituição / cerca), segunda rodada com menos falhas graves
- [ ] 17. Tranca e entrega — `PAINEL_SENHA` no `.env`, verificação no servidor rota a rota, `/saude` aberto sem dado; progresso fechado com `## CONCLUÍDO`

## Anotações
- Pasta criada pelo escritório em {{DATA}}, já com `server.js` (painel, `/saude`, `/log`), `rodar.js` (lançador com modos, pós-verificação, perguntas e reflexão), `tools/base.js` e `tools/arquivos.js`, `cercas.json` e a estrutura de `memoria/`. Confira em vez de recriar; estenda em vez de substituir.
- A skill de referência está em `.claude/skills/criar-agente-tarefa/`: o COMO de cada componente, os módulos de ferramenta (`referencias/modulos.md`) e as armadilhas.
- Caminho curto: em Conversar › Ensinar o dono demonstra a tarefa e "Tarefa concluída" a destila em `.claude/skills/<tarefa>/SKILL.md`, numa amostra e em propostas. Isso adianta os componentes 1, 3 e 6, mas não os marca: o teste de cada um continua valendo.

## Registro do que foi executado
- {{DATA}} — pasta criada pelo escritório; nenhum componente testado ainda.
