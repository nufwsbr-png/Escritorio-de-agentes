# Progresso do agente {{NOME}} (atendimento no WhatsApp)
Negócio: {{NEGOCIO}}
Caminho do WhatsApp (oficial ou WAHA): [ainda não decidiu]

Cada linha é um componente da ANATOMIA.md, com teste no fim. Marque `[x]` só com o teste provado.

- [ ] 1. Verificação da empresa na Meta iniciada (status "Em análise"; é a parte mais lenta, por isso é a primeira)
- [ ] 2. Contas e chaves — OpenRouter com crédito e Supabase com projeto; `.env` preenchido pelo dono, saldo e conexão conferidos por código
- [ ] 3. Identidade — OBJETIVO de `prompt-agente.md` rascunhado e confirmado pelo dono (quem é, para quem, tom)
- [ ] 4. Chat de teste (sandbox) respondendo pelo OpenRouter em `/`, com endpoint para o construtor testar por código
- [ ] 5. Memória por conversa — últimas 20 mensagens DAQUELA pessoa, no Supabase; ele lembra o nome em outra chamada
- [ ] 6. Constituição como ferramenta — rascunhada do material do dono, confirmada; preço fora dela não existe; `[A PREENCHER]` vira "confirmo com a equipe"
- [ ] 7. Agenda (Google Calendar) com pós-verificação — o evento EXISTE pela API antes de o agente confirmar; conflito recusado
- [ ] 8. Planilha de clientes (Google Sheets) — a linha existe pela API; nunca por número de linha
- [ ] 9. Áudio e imagem viram texto antes do cérebro pensar, com rótulo de origem
- [ ] 10. PORTÃO — o agente convence no sandbox com clientes difíceis; o dono declara que convence e autoriza sair do laboratório
- [ ] 11. Hospedagem — roda nesta máquina com túnel para o webhook (Railway opcional, só se a máquina não fica ligada); `.env` como variáveis do serviço, nunca no git
- [ ] 12. WhatsApp conectado — oficial (número de teste, depois o real) ou WAHA (número dedicado); "olá" do celular respondido
- [ ] 13. Painel do dono — conversas, agenda e funil em `/painel`, só leitura, dados reais
- [ ] 14. Templates, botões, descadastro e agrupador de mensagens (não responde cada mensagem separada)
- [ ] 15. Lições — correção do dono vira lição proposta em `memoria/licoes-propostas.md`; aprovada entra em `memoria/licoes.md` e no prompt de sistema
- [ ] 16. Testador — 30 clientes difíceis simulados, pelo menos 3 tentando dar ordem ao agente, duas réguas (constituição; o que disse que fez existe), relatório, correções aprovadas, segunda rodada com menos falhas graves
- [ ] 17. Assumir o atendimento — a equipe entra na conversa pelo painel, o agente cala naquela conversa e volta quando devolvido
- [ ] 18. Tranca e entrega — `PAINEL_SENHA`, verificação no servidor rota a rota, webhook com `GATILHO_CHAVE`; templates criados pelo painel; progresso fechado com `## CONCLUÍDO`

## Anotações
- Pasta criada pelo escritório em {{DATA}}, já com `server.js` (chat de teste em `/`, painel em `/painel`, `/saude`, `/log`, tranca e lições). Adapte o chat ao OpenRouter em vez de criar outro servidor; estenda o painel em vez de substituí-lo.
- A skill de referência está em `.claude/skills/criar-agente/`: o COMO de cada componente, o clique a clique da Meta, do Google e do Supabase, e as armadilhas da construção original.

## Feito em seu nome
- {{DATA}} — pasta criada pelo escritório; nenhum componente testado ainda.
