# Fase 4 — Blindagem (passos 20–23)

O agente funciona — agora a gente prova que ele aguenta cliente difícil, dá ao dono o poder de intervir, tranca a porta e fecha o último atalho. É a fase que separa "demo bonita" de "funcionário confiável".

---

## Passo 20 — O testador: 30 clientes difíceis e duas réguas

**Por quê:** ninguém descobre as falhas do agente trocando mensagem à mão — a gente solta 30 clientes chatos simulados em cima dele e mede onde ele mente, inventa ou promete o que não fez.

**Antes, confirme:** constituição PREENCHIDA de verdade (o juiz compara as respostas com ela — julgar contra base vazia não prova nada) e crédito no OpenRouter (os testes consomem: 30 conversas + juízes; avise ANTES).

**Pedido pronto pra colar:**
> Quero um testador automático para o meu atendente: vários clientes difíceis simulados que conversam com ele como gente de verdade, para achar as falhas sem eu ficar trocando mensagem à mão. O testador fala DIRETO com o agente, sem passar pelo WhatsApp — não quero gastar mensagem paga nem números reais. Gere umas 30 conversas difíceis: gente que escreve tudo errado, que manda mensagem em pedaços, que pede desconto que não existe, que tenta enganar o atendente, que pergunta de serviço que não fazemos e que muda de assunto no meio. Compare cada resposta com DUAS réguas: (1) a base de conhecimento — preço, serviço ou promessa fora dela é falha grave; (2) o que ele afirma ter FEITO — se disse que agendou, confira se o evento EXISTE na agenda; se disse que remarcou, confira se o novo existe e o velho sumiu; se disse que anotou, confira a planilha. Afirmar que fez sem ter feito é a falha mais cara: o cliente aparece num horário que não existe. Os clientes de teste devem usar identificações claramente falsas, e no final o testador APAGA tudo que criou na agenda, na planilha e no banco. Rode tudo, NÃO conserte nada ainda, e me entregue um relatório: quantas conversas, onde falhou, em qual régua, e a conversa inteira de cada falha.

**Depois do relatório, o ciclo (a parte que vale o passo):**
1. Leia o relatório COM o aluno, falha por falha.
2. Pedido seguinte: "Com base nesses erros, o que devemos alterar para ele responder certo? **Me explique as alterações ANTES de modificar qualquer arquivo.**"
3. Aprove as mudanças uma a uma com o aluno (regra de prompt vai pro "Nunca faça isso"; buraco de informação vai pra constituição; falha de conferência vira checagem no código).
4. "Corrija e rode uma nova rodada, com mensagens e nomes DIFERENTES" — rodada repetida decora, rodada nova prova.

**Teste que prova:** a segunda rodada com MENOS falhas graves que a primeira — e o aluno leu as conversas que falharam (não só o número).

**Se falhar (o testador em si):**
1. Rodada parou no meio → crédito do OpenRouter acabou (aconteceu na construção original — adicionou crédito e continuou de onde parou).
2. Falhas "falsas" na régua 1 → a informação estava certa mas FALTAVA na constituição; completar a constituição também é conserto.
3. Dados de teste sobrando na agenda/planilha → a faxina do testador falhou; peça para apagar pelos identificadores falsos.

**Armadilhas reais:**
- **A régua 2 ("disse que fez ≠ fez") nasceu do erro mais caro visto em teste:** o agente afirmando agendamento sem evento na agenda. A construção original ganhou depois disso uma trava permanente no servidor que confere agendamento e preço ANTES de cada resposta sair — se o construtor sugerir essa trava, aceite: é a melhoria mais valiosa do projeto.
- **Testes sujam dados reais:** os clientes simulados criam eventos e linhas de verdade — por isso identificações claramente falsas + faxina no final, e nunca rodar testador em cima do número real do WhatsApp.
- Metade das falhas da primeira rodada da construção original era a constituição incompleta — o agente não tinha onde ler a resposta certa. Antes de culpar o agente, culpe o documento.

**Quando pular:** aluno sem paciência pode rodar 10 conversas em vez de 30 — mas pular o passo inteiro é entregar um funcionário que ninguém entrevistou. Se pular, avise: a primeira "entrevista" dele vai ser com cliente pagante.

---

## Passo 21 — Assumir o atendimento (o dono entra na conversa)

**Por quê:** sempre vai existir a conversa que precisa de gente — o dono assume pelo painel, o agente cala NAQUELA conversa, e quando devolver, o agente continua de onde o humano parou, sem fingir que nada aconteceu.

**Antes:** painel do passo 16 funcionando; caminho oficial precisa da janela de 24h aberta para enviar texto livre (lembre o aluno).

**Pedido pronto pra colar:**
> Quero poder assumir o atendimento de um cliente específico pelo painel. Na conversa, um campo para eu escrever e enviar a mensagem pelo mesmo WhatsApp — em vez de o agente elaborar a resposta, vai EXATAMENTE o que eu escrever. No momento em que eu envio, o agente PAUSA naquela conversa e não responde mais nada ali, mesmo que o cliente escreva — as outras conversas seguem normais. E um botão de devolver pro agente: quando ele voltar, não pode agir como se nada tivesse acontecido — as minhas mensagens ficam no MESMO histórico que ele lê, marcadas como enviadas por um humano da equipe, para ele continuar de onde a conversa parou: se eu ofereci um desconto ou remarquei um horário, ele parte dali. ANTES de implementar, me explique duas coisas: como você vai marcar quem está no comando de cada conversa, e como o agente vai enxergar as minhas mensagens quando voltar.

Depois, adicione no prompt (seção "Como agir"): mensagens marcadas como da equipe humana são compromissos assumidos — continuar dali, nunca desdizer, nunca revelar a troca de atendente.

**Teste que prova (em três atos):** (1) assumir e mandar uma mensagem → chega no WhatsApp do cliente exatamente como escrita; (2) o cliente responde → o agente FICA QUIETO (a prova de fogo); (3) devolver → na próxima mensagem do cliente, o agente responde LEVANDO EM CONTA o que o humano combinou.

**Se falhar:**
1. **O agente continua respondendo depois de assumido** → a trava tem que ser verificada no momento de RESPONDER (e de novo depois do agrupador esperar os 5 segundos), não só na chegada.
2. As mensagens do humano não aparecem para o agente → têm que estar no mesmo histórico, com a marcação.
3. O agente "desdiz" o humano → falta a linha no prompt (acima).

**Armadilha real (e é ótima de contar):** na construção original, o agente CONTINUOU respondendo depois de assumido — e a causa não era o código novo: eram **duas conversas com o construtor mexendo no MESMO servidor ao mesmo tempo**; uma desfazia o que a outra fazia. Regra desta skill em diante: UMA mudança por vez, uma conversa de construção por vez, reinicie o servidor e teste antes de abrir outra frente.

**Quando pular:** não pule — é a rede de segurança humana. Sem ele, o dia em que o agente travar numa conversa delicada, o dono vai assistir sem poder fazer nada.

---

## Passo 22 — A tranca do painel

**Por quê:** o painel agora lê conversas de clientes e ESCREVE em nome do negócio — qualquer pessoa com o link faria tudo isso; uma senha com sessão fecha a porta.

**Antes, pergunte:** a senha que o dono quer (forte, e que não seja a de outra coisa). Você a coloca no `.env` e nas variáveis do Railway como `PAINEL_SENHA` — nunca no chat, nunca no progresso.

**Pedido pronto pra colar:**
> O painel está num link aberto — e ele mostra conversas e responde em nome do negócio; quem tiver o link faz tudo isso. Coloque uma tela de login simples: uma senha única guardada na variável de ambiente `PAINEL_SENHA`, sem cadastro e sem banco de usuários. Quem acerta ganha uma sessão que dura alguns dias; quem não tem sessão não vê NADA. E o mais importante: a verificação fica no SERVIDOR, não na tela — qualquer pedido de ler conversa, enviar mensagem ou mexer em modelo é recusado sem sessão válida, mesmo chamando o endereço direto, por fora do navegador. O webhook do WhatsApp continua aberto (a Meta precisa dele). ANTES de implementar, me mostre onde exatamente essa verificação vai ficar, e me diga o que acontece HOJE se alguém chamar esses endereços direto.

A resposta à segunda pergunta costuma assustar ("hoje, qualquer um lê tudo") — deixe assustar: é o aluno entendendo o porquê.

**Teste que prova (em dupla):** (1) janela anônima do navegador → o painel exige senha; senha errada barra, certa entra e PERMANECE entre visitas; (2) o teste de gente esperta: chamar um endereço interno do painel direto na barra do navegador, sem logar → recusado. Se entrar, a tranca está na tela, não no servidor — reprove.

**Se falhar:**
1. Passa sem senha → a variável `PAINEL_SENHA` não está no Railway (conferir lá, não só no `.env` local).
2. Pede senha a cada clique → a sessão não está durando; peça sessão de alguns dias.
3. A API responde sem login → a verificação ficou só na tela; exigir no servidor, rota a rota.

**Armadilha real:** a ordem dos fatos na construção original — o painel ganhou o poder de responder clientes ANTES de ganhar senha, e a tranca foi corrida logo em seguida com a justificativa exata: "quem tiver o link consegue fazer tudo isso". Este guia mantém a ordem real, mas NÃO deixe o aluno parar entre o 21 e o 22: são um par.

**Quando pular:** nunca. Painel que escreve sem senha não é pendência, é incidente esperando data.

---

## Passo 23 — Criar templates pelo painel (fechando o ciclo)

**Por quê:** criar template no painel da Meta é chato e cheio de regras não escritas — trazendo a criação para o painel do dono, com as regras já embutidas, o dono cria um lembrete novo em um minuto sem sair de casa.

**Antes:** caminho oficial + WABA ID configurado (passo 17) + tranca do 22 (o painel vai ESCREVER na conta da Meta — jamais sem senha). Token com permissão de gestão do WhatsApp.

**Pedido pronto pra colar:**
> Quero criar modelos de mensagem direto pela aba Templates do painel, sem abrir o Gerenciador da Meta. Um formulário: nome, categoria (marketing, utilidade ou autenticação), texto com variáveis {{1}}, {{2}}…, um exemplo para cada variável e até dois botões de resposta rápida. Antes de enviar, VALIDE as regras que fazem a Meta reprovar na certa: variável não pode começar nem terminar o texto; duas variáveis não podem ficar coladas; a numeração não pode ter buraco; toda variável precisa do seu exemplo; botão tem limite curto de texto; e o nome do modelo é minúsculo, sem espaço nem acento — normalize automaticamente. Mostre os erros em português, na hora, ainda no formulário — e valide DE NOVO no servidor, porque requisição não vem só de navegador bem-comportado. O modelo criado nasce "em análise" na Meta; a lista deve mostrar esse status e, se a Meta rejeitar, o MOTIVO. Categoria autenticação usa o formato fixo exigido pela Meta, ignorando o texto livre.

**Teste que prova:** criar pelo painel um modelo de teste (ex.: lembrete com {{1}} e um botão) → aparece "em análise" na aba E no Gerenciador da Meta (mandar o aluno abrir e conferir — as duas telas mostrando o mesmo modelo é a prova). Bônus: tentar criar um modelo COMEÇANDO com variável → o formulário barra em português antes de enviar.

**Se falhar:**
1. Erro da Meta ao criar → token sem a permissão de gestão (regerar marcando as permissões de WhatsApp) ou WABA ID errado.
2. Criou mas não aparece na lista → a lista está em cache; recarregar/aguardar o próximo ciclo.
3. A Meta trocou a categoria sozinha (marketing↔utilidade) → ela faz isso; mostre ao aluno o aviso, não é bug.

**Armadilha real:** este passo foi deliberadamente deixado por ÚLTIMO na construção original — na aula ficou dito: "o difícil é configurar a API dos templates; com tudo configurado, implementar isso depois é extremamente simples". E as regras de validação do formulário são EXATAMENTE as rejeições colecionadas no passo 17 — o projeto aprendeu com as broncas da Meta e transformou cada uma em aviso automático. É o padrão a ensinar: erro que aconteceu vira checagem que impede a repetição.

**Quando pular:** caminho WAHA → não se aplica. Caminho oficial com pouco template → adiável sem culpa; o Gerenciador da Meta continua existindo.

---

## 🏁 Fim da jornada

Com o passo 23 verde, o aluno tem: um agente que atende texto, áudio e imagem no WhatsApp; agenda, remarca e cancela de verdade; registra todo cliente; entende cliques; agrupa mensagens; foi testado por 30 clientes difíceis; tem painel trancado com funil, templates e intervenção humana. Atualize o progresso com um `## CONCLUÍDO em [data]`, parabenize de verdade — e deixe duas sementes: (1) a constituição é um documento VIVO: preço mudou, promoção nova → editar o arquivo, sem tocar em código; (2) o testador pode rodar de novo a cada mudança grande — é o exame periódico do funcionário digital.
