# Fase 3 — Operação (passos 16–19)

O agente trabalha sozinho — agora o DONO precisa enxergar o que acontece, responder quando o agente travar numa dúvida, ensinar quando ele errar e ser avisado sem precisar olhar. Nesta fase o agente ganha olhos (painel), voz (perguntas), aprendizado (lições) e um jeito de chamar o dono (avisos). Na construção, a única pergunta possível desta fase é o canal de avisos, se a missão não disse. Na operação, responder perguntas e aprovar lições é a pausa 8 — para sempre, e por desenho.

---

## Passo 16 — O painel do agente (só leitura)

**Por quê:** tudo que o agente faz já está guardado (registro, estados, fila, saídas) — o painel só LÊ e mostra pro dono, sem poder quebrar nada.

**O que você lê antes:** `memoria/` (registro, entidades), a fila do passo 13, `saidas/`. Use o conjunto padrão de telas — não pergunte o que ele quer ver; depois de pronto, ele pede o que faltar.

**Pergunta ao aluno:** nenhuma.

**O que você executa:** um servidor próprio do agente com as telas **Fila** (esperando e rodando agora), **Entidades** (lista por status: nova / em andamento / aguardando aprovação / aguardando pergunta / pronta / com erro; ao clicar: o que foi feito, as rodadas, a proposta se houver, com os botões `aprovar`/`rejeitar` do passo 15 — o painel passa a ser o lugar da pausa 7), **Rodadas** (log completo de cada uma: tarefa enviada, ferramentas usadas, resultado, pós-verificação) e **Resumo** (contagens por status e por dia). Endereço `/saude` que responde se o agente e o gatilho estão vivos. O painel só lê; a única escrita é aprovar/rejeitar, que já existia como comando. Ocupa a página inteira; visual limpo e legível.

**Teste (você roda; ele olha):** abra `/painel` → as quatro telas com os dados REAIS (amostras e entidades reais já processadas; a fila mostra o pendente). Mostre o endereço e peça só: "abra e me diga se falta alguma informação que você quer ver". A resposta dele vira ajuste, não bloqueio.

**Se falhar:**
1. Tela em branco ou dado faltando → confira a fonte da tela.
2. Painel mostra `pronta` o que a pós-verificação reprovou → está lendo o relato, não o estado; corrija a fonte.
3. Datas erradas → nome de campo diferente do esperado; confira os nomes reais.

**Armadilha conhecida:** o painel do atendente saiu como um pop-up estreito; e o construtor levantou três "problemas" antes de implementar que não eram problemas (os dados estavam em outra fonte). Você é o construtor: leia as fontes antes de concluir que algo falta.

**Quando pular:** não pule — os passos 17, 18, 21 e 23 moram no painel.

---

## Passo 17 — Perguntas ao humano (o agente pausa e espera)

**Por quê:** sempre vai existir o caso em que falta dado ou decisão — o agente que chuta estraga; o agente que pergunta, registra a dúvida, para AQUELA entidade e continua de onde parou quando a resposta chega.

**O que você lê antes:** a missão, "Quando faltar informação" (já diz que ele pergunta) e "Canal de avisos" (onde a pergunta chega além do painel — se `[A PREENCHER]`, o passo 19 resolve; por enquanto só painel). Prazo padrão: pergunta sem resposta por 5 dias vira `com erro: sem resposta`. `referencias/chamada-isolada.md`, seção "Retomada".

**Pergunta ao aluno:** nenhuma.

**O que você executa:** a ferramenta `perguntar_ao_dono`: quando faltar dado ou decisão que não está na missão, na base nem na entrada, o agente chama com a pergunta (curta, com opções se houver); a rodada termina limpa; a entidade fica `aguardando pergunta`; a pergunta aparece no painel com campo de resposta; a sessão fica guardada para RETOMADA. Quando o dono responde, o lançador retoma a mesma sessão com a resposta e o agente continua de onde parou, sem reprocessar. Plano B se a sessão não retomar: rodar do zero com a resposta incluída e o estado dizendo o que já foi feito. O painel mostra "esta pergunta já foi feita N vezes" (pergunta repetida é regra faltando — passo 18). Adicione no `CLAUDE.md`, "Como agir": "quando faltar dado ou decisão, use `perguntar_ao_dono` com UMA pergunta objetiva; nunca chute, nunca pergunte o que a base ou a entrada já respondem; ao retomar, trate a resposta do dono como regra para esta entidade".

**Teste (você roda; ele responde uma vez):** (1) o caso feio (dado faltando) → o agente pergunta, a entidade fica `aguardando pergunta`, a pergunta aparece no painel; (2) peça ao aluno para responder no painel (é a demonstração da pausa 8) → a rodada retoma e termina com a resposta aplicada; (3) um caso completo → o agente NÃO pergunta nada. Mostre as três evidências.

**Se falhar:**
1. Retomou do zero → sessão não guardada/retomada; ver a referência; o plano B segura enquanto você corrige.
2. Pergunta demais → falta a frase "nunca pergunte o que a base ou a entrada já respondem"; e se a base está incompleta, é regra faltando (passo 8).
3. Resposta não chegou no agente → o lançador retomou sem incluí-la.

**Armadilha prevista:** a resposta do dono vale para AQUELA entidade — mas, se a mesma pergunta aparecer três vezes, é regra faltando na base. O passo 18 transforma resposta repetida em lição.

**Quando pular:** não pule — é a rede que impede o agente de chutar quando o mundo real sai do roteiro.

---

## Passo 18 — Aprendizado: correção vira lição, lição vira regra

**Por quê:** o agente aprende com o tempo de um jeito só — cada correção do dono vira uma lição curta, aprovada, que ele lê em toda rodada; sem esse ciclo, ele repete o mesmo erro para sempre.

**O que você lê antes:** `referencias/memoria-e-aprendizado.md`, seção "Lições". Os motivos das rejeições do passo 15 e as respostas do passo 17 já estão no estado das entidades — são a matéria-prima.

**Pergunta ao aluno:** nenhuma na construção. Explique em três frases: "ele não aprende sozinho, e isso é bom — você ensina. Cada vez que você rejeitar uma proposta, responder uma pergunta repetida ou corrigir um resultado, ele vai propor uma lição de uma linha; você aprova ou não, no painel. As aprovadas ficam num arquivo que ele lê sempre, e que a gente mantém curto."

**O que você executa:** (1) no painel, em cada entidade `pronta` ou `aguardando aprovação`, botão **Corrigir**: o dono escreve o que estava errado e, se quiser, ajusta o resultado à mão; rejeições e perguntas repetidas entram no mesmo fluxo. (2) Para cada correção, o lançador roda uma rodada de REFLEXÃO: o agente lê a correção, a rodada original e a base, e escreve UMA lição proposta em `memoria/licoes-propostas.md`, no formato "Quando [situação concreta], então [regra]. (origem: entidade, data)", e diz se deveria ser regra da base em vez de lição. (3) Tela **Lições** no painel: propostas com Aprovar / Editar / Rejeitar; aprovada vai para `memoria/licoes.md`. O agente NUNCA escreve em `licoes.md`. (4) Acima de 40 linhas, o painel pede curadoria. Não altere o `CLAUDE.md`.

**Teste (você roda o ciclo com UMA correção real dele):** use a primeira rejeição ou correção que o dono já fez no passo 15 (se não houve, peça que ele corrija qualquer detalhe de uma entidade pronta pelo painel — uma ação, não uma pergunta). (1) a lição proposta aparece no painel em linguagem de gente, com origem; (2) ele aprova; (3) rode um caso novo parecido → o agente acerta, e o log mostra que citou a lição. Mostre.

**Se falhar:**
1. Lição vaga ("ser mais cuidadoso") → a rodada de reflexão precisa exigir "quando… então…" com o dado concreto.
2. Lição aprovada e o agente continua errando → importação no `CLAUDE.md`, ou conflito com a base (a base ganha; corrija a base).
3. Lições demais, parecidas → curadoria: fundir, promover para a base, apagar.

**Armadilha conhecida:** no atendente, o ciclo de correção aconteceu à mão depois do testador: regra de comportamento foi para o prompt, buraco de informação para a base, falha de conferência para o código. A mesma triagem vale para cada lição: faça VOCÊ a triagem antes de mostrar ("isso é lição, regra ou cerca?") e proponha o destino certo; lição que na verdade é cerca não pode viver num texto.

**Quando pular:** nunca. Sem este passo o agente é fixo; com ele, vira funcionário que melhora.

---

## Passo 19 — Avisos: o agente chama o dono

**Por quê:** o dono não vai ficar olhando o painel — o agente precisa avisar quando terminou, quando travou e quando está esperando uma resposta, pelo canal que o dono já olha.

**O que você lê antes:** a missão, "Canal de avisos". Padrão de conteúdo (não pergunte): na hora = `com erro` e `aguardando pergunta`; diário = contagens e pendências, às 8h.

**Pergunta ao aluno (UMA, só se a missão tiver `[A PREENCHER]` no canal):** "Por onde você quer ser avisado quando o agente travar ou tiver uma pergunta: WhatsApp (qual número), e-mail (qual), ou só o painel?" Se for WhatsApp e não há módulo de envio, explique em uma frase que o envio exige uma porta (API do negócio ou número dedicado) e proponha e-mail ou painel enquanto isso.

**O que você executa:** avisos saem do LANÇADOR, não do agente (o agente nunca envia mensagem a ninguém): na hora, mensagem curta com entidade, motivo e link do painel; diário, resumo com contagens e pendências. Se o canal falhar, registra no log e não trava a fila. Agrupa por entidade e por janela de tempo. Não altere o `CLAUDE.md`.

**Teste (você roda; ele olha o celular/e-mail):** force uma falha (tire um arquivo da entrada de um caso e rode) → o aviso chega com o motivo; dispare o resumo à mão → chega com as contagens certas. Peça só: "chegou?".

**Se falhar:**
1. Não chega → credencial do canal no `.env`, ou destinatário não autorizado.
2. Em excesso → agrupar.
3. O agente mandou mensagem por conta própria → a ferramenta de envio está acessível ao agente; tem que ser só do lançador (cerca do passo 14).

**Armadilha prevista:** aviso que o dono ignora é aviso que não existe. Comece com POUCOS e só adicione quando ele pedir.

**Quando pular:** se o dono realmente olha o painel toda hora — mas avise: o dia em que ele não olhar é o dia em que a fila vai parar numa pergunta.

**Fechando a fase 3:** progresso atualizado, e abra `referencias/fase-4.md` — a blindagem final.
