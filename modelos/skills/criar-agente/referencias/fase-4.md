# Fase 4 — Blindagem (passos 20–23)

O agente funciona — agora a gente prova que ele aguenta cliente difícil, dá ao dono o poder de intervir, tranca a porta e fecha o último atalho. É a fase que separa "demo bonita" de "funcionário confiável".

Pausas humanas desta fase: só no testador (20) — aprovar o custo e aprovar as mudanças. O resto você constrói, prova por código e o dono olha.

---

## Passo 20 — O testador: 30 clientes difíceis e duas réguas

**Por quê:** ninguém descobre as falhas do agente trocando mensagem à mão — a gente solta 30 clientes chatos simulados em cima dele e mede onde ele mente, inventa ou promete o que não fez.

**O guia confere antes, por código:** conte os `[A PREENCHER]` na constituição (o juiz compara as respostas com ela — julgar contra base vazia não prova nada); se houver lacunas importantes (serviços, preços, horários), mostre a lista e peça para preencher antes — essa é a única pergunta extra deste passo. Consulte o saldo do OpenRouter pela API e estime o custo da rodada (30 conversas + juízes).

**Pausa humana 1 (d) — o custo:**
> Vou soltar 30 clientes difíceis em cima do agente, direto no sandbox (sem WhatsApp, sem gastar mensagem). Isso consome crédito do OpenRouter — estimo uns US$ [X], e você tem US$ [Y]. Pode rodar?

**O guia executa:**
> Testador automático: vários clientes difíceis simulados que conversam com o atendente como gente de verdade. O testador fala DIRETO com o agente, sem passar pelo WhatsApp. Gerar umas 30 conversas difíceis: gente que escreve tudo errado, que manda mensagem em pedaços, que pede desconto que não existe, que tenta enganar o atendente, que pergunta de serviço que não fazemos e que muda de assunto no meio. Comparar cada resposta com DUAS réguas: (1) a base de conhecimento — preço, serviço ou promessa fora dela é falha grave; (2) o que ele afirma ter FEITO — se disse que agendou, conferir se o evento EXISTE na agenda; se disse que remarcou, conferir se o novo existe e o velho sumiu; se disse que anotou, conferir a planilha. Afirmar que fez sem ter feito é a falha mais cara. Os clientes de teste usam identificações claramente falsas, e no final o testador APAGA tudo que criou na agenda, na planilha e no banco. Rodar tudo, NÃO consertar nada ainda, e produzir um relatório: quantas conversas, onde falhou, em qual régua, e a conversa inteira de cada falha.

**Depois do relatório, o ciclo (a parte que vale o passo):**
1. Mostre o relatório ao aluno, falha por falha, com as conversas inteiras — não só o número.
2. Proponha a lista de alterações, uma a uma, classificadas: regra de atendimento → seção "Nunca faça isso" do prompt (rascunho, porque o prompt é dele); informação que faltava → constituição (rascunho, porque é dado do negócio dele); falha de conferência → checagem no código (você faz).

**Pausa humana 2 (a) — as mudanças:**
> Estas são as mudanças que proponho, e o porquê de cada uma. Aprove, corte ou mude — as de prompt e constituição são suas.

3. Aplique as aprovadas e rode uma nova rodada, com mensagens e nomes DIFERENTES — rodada repetida decora, rodada nova prova.

**O guia testa e mostra:** a segunda rodada com MENOS falhas graves que a primeira, lado a lado. Confirme por código que a faxina deixou agenda, planilha e banco sem dados de teste; registre.

**Se falhar (o testador em si):**
1. Rodada parou no meio → crédito do OpenRouter acabou (aconteceu na construção original — adicionar crédito e continuar de onde parou).
2. Falhas "falsas" na régua 1 → a informação estava certa mas FALTAVA na constituição; completar a constituição também é conserto.
3. Dados de teste sobrando → apagar pelos identificadores falsos.

**Armadilhas reais:**
- **A régua 2 ("disse que fez ≠ fez") nasceu do erro mais caro visto em teste:** o agente afirmando agendamento sem evento na agenda. A construção original ganhou depois disso uma trava permanente no servidor que confere agendamento e preço ANTES de cada resposta sair — proponha essa trava na lista de mudanças: é a melhoria mais valiosa do projeto.
- **Testes sujam dados reais:** os clientes simulados criam eventos e linhas de verdade — por isso identificações claramente falsas + faxina no final, e nunca rodar testador em cima do número real do WhatsApp.
- Metade das falhas da primeira rodada da construção original era a constituição incompleta — o agente não tinha onde ler a resposta certa. Antes de culpar o agente, culpe o documento.

**Quando pular:** aluno sem paciência pode rodar 10 conversas em vez de 30 — mas pular o passo inteiro é entregar um funcionário que ninguém entrevistou. Se pular, avise: a primeira "entrevista" dele vai ser com cliente pagante.

---

## Passo 21 — Assumir o atendimento (o dono entra na conversa)

**Por quê:** sempre vai existir a conversa que precisa de gente — o dono assume pelo painel, o agente cala NAQUELA conversa, e quando devolver, o agente continua de onde o humano parou, sem fingir que nada aconteceu.

**O guia lê antes:** passo 16 fechado no progresso. Caminho oficial: lembre o aluno que enviar texto livre exige janela de 24h aberta.

**O guia executa:**
> Assumir o atendimento de um cliente específico pelo painel. Na conversa, um campo para o dono escrever e enviar a mensagem pelo mesmo WhatsApp — em vez de o agente elaborar a resposta, vai EXATAMENTE o que ele escrever. No momento em que ele envia, o agente PAUSA naquela conversa e não responde mais nada ali, mesmo que o cliente escreva — as outras conversas seguem normais. A trava é verificada no momento de RESPONDER (e de novo depois da espera do agrupador), não só na chegada. Um botão de devolver pro agente: quando ele voltar, as mensagens do dono ficam no MESMO histórico que ele lê, marcadas como enviadas por um humano da equipe, para continuar de onde a conversa parou: se o dono ofereceu um desconto ou remarcou um horário, o agente parte dali. Reiniciar e enviar ao Railway.

Registre no log como a conversa marca quem está no comando e como o agente enxerga as mensagens humanas. Insira no prompt (seção "Como agir"): mensagens marcadas como da equipe humana são compromissos assumidos — continuar dali, nunca desdizer, nunca revelar a troca de atendente. Mostre.

**O guia testa e mostra (em três atos, por código, numa conversa de teste):** (1) assuma pela API do painel e envie "a equipe te dá 10% hoje" → mostre a mensagem gravada como humana e enviada; (2) simule o cliente respondendo → mostre que o agente FICOU QUIETO (nenhuma resposta dele no banco — a prova de fogo); (3) devolva, simule nova mensagem do cliente → cole a resposta do agente LEVANDO EM CONTA o desconto. Apague o teste. Diga: "abra o painel e assuma uma conversa de verdade quando quiser sentir; não precisa me responder".

**Se falhar:**
1. **O agente continua respondendo depois de assumido** → a trava não está no momento de responder (ou não é rechecada depois do agrupador).
2. As mensagens do humano não aparecem para o agente → têm que estar no mesmo histórico, com a marcação.
3. O agente "desdiz" o humano → falta a linha no prompt (acima).

**Armadilha real (e é ótima de contar):** na construção original, o agente CONTINUOU respondendo depois de assumido — e a causa não era o código novo: eram **duas conversas com o construtor mexendo no MESMO servidor ao mesmo tempo**; uma desfazia o que a outra fazia. Regra desta skill: UMA mudança por vez, reinicie o servidor e teste antes de abrir outra frente.

**Quando pular:** não pule — é a rede de segurança humana. Sem ele, o dia em que o agente travar numa conversa delicada, o dono vai assistir sem poder fazer nada.

---

## Passo 22 — A tranca do painel

**Por quê:** o painel agora lê conversas de clientes e ESCREVE em nome do negócio — qualquer pessoa com o link faria tudo isso; uma senha com sessão fecha a porta.

**O guia demonstra o problema (proposital):** ANTES de trancar, chame por código um endereço interno do painel sem nenhum login e mostre o que volta: a lista de conversas inteira. Diga: "hoje, qualquer um com o link lê tudo isso e responde em seu nome." Deixe assustar: é o aluno entendendo o porquê.

**O guia gera a senha** (não pergunte — senha não passa pelo chat): crie uma senha forte, grave em `PAINEL_SENHA` no `.env` e envie ao Railway. Diga: "sua senha do painel está na linha `PAINEL_SENHA` do arquivo `.env`; abra o arquivo e guarde-a. Se quiser trocar, troque ali e me avise que eu atualizo a hospedagem."

**O guia executa:**
> Tela de login simples no painel: uma senha única guardada na variável de ambiente `PAINEL_SENHA`, sem cadastro e sem banco de usuários. Quem acerta ganha uma sessão que dura alguns dias; quem não tem sessão não vê NADA. A verificação fica no SERVIDOR, não na tela — qualquer pedido de ler conversa, enviar mensagem ou mexer em modelo é recusado sem sessão válida, mesmo chamando o endereço direto, por fora do navegador, rota a rota. O webhook do WhatsApp continua aberto (a Meta precisa dele). Reiniciar e enviar ao Railway.

**O guia testa e mostra (em dupla):** (1) por código: o mesmo endereço interno de antes, sem sessão → recusado; senha errada → recusado; senha certa → entra e a sessão persiste em chamadas seguintes; o webhook segue aberto. (2) Repita o teste de gente esperta em CADA rota do painel — se alguma responder sem login, a tranca está na tela, não no servidor: reprove e corrija. Diga: "abra o painel numa janela anônima e veja a tela de senha; não precisa me responder".

**Se falhar:**
1. Passa sem senha → `PAINEL_SENHA` não está no Railway (conferir lá, não só no `.env` local).
2. Pede senha a cada clique → a sessão não está durando; sessão de alguns dias.
3. A API responde sem login → a verificação ficou só na tela; exigir no servidor, rota a rota.

**Armadilha real:** a ordem dos fatos na construção original — o painel ganhou o poder de responder clientes ANTES de ganhar senha, e a tranca foi corrida logo em seguida com a justificativa exata: "quem tiver o link consegue fazer tudo isso". Este guia mantém a ordem real, mas NÃO deixe o aluno parar entre o 21 e o 22: são um par.

**Quando pular:** nunca. Painel que escreve sem senha não é pendência, é incidente esperando data.

---

## Passo 23 — Criar templates pelo painel (fechando o ciclo)

**Por quê:** criar template no painel da Meta é chato e cheio de regras não escritas — trazendo a criação para o painel do dono, com as regras já embutidas, o dono cria um lembrete novo em um minuto sem sair de casa.

**O guia lê antes:** caminho oficial no progresso; `WHATSAPP_WABA_ID` e token com permissão de gestão no `.env` (passo 17); tranca do 22 fechada (o painel vai ESCREVER na conta da Meta — jamais sem senha).

**O guia executa:**
> Criar modelos de mensagem direto pela aba Templates do painel, sem abrir o Gerenciador da Meta. Um formulário: nome, categoria (marketing, utilidade ou autenticação), texto com variáveis {{1}}, {{2}}…, um exemplo para cada variável e até dois botões de resposta rápida. Antes de enviar, VALIDAR as regras que fazem a Meta reprovar na certa: variável não pode começar nem terminar o texto; duas variáveis não podem ficar coladas; a numeração não pode ter buraco; toda variável precisa do seu exemplo; botão tem limite curto de texto; e o nome do modelo é minúsculo, sem espaço nem acento — normalizar automaticamente. Mostrar os erros em português, na hora, ainda no formulário — e validar DE NOVO no servidor, porque requisição não vem só de navegador bem-comportado. O modelo criado nasce "em análise" na Meta; a lista mostra esse status e, se a Meta rejeitar, o MOTIVO. Categoria autenticação usa o formato fixo exigido pela Meta, ignorando o texto livre. Reiniciar e enviar ao Railway.

**O guia testa e mostra:** crie pelo painel, por código, um modelo de teste (`teste_lembrete`, com {{1}} e um botão) → mostre a resposta da Meta e o status "em análise" na lista. Depois tente criar um modelo COMEÇANDO com variável → mostre o erro em português barrando, no formulário e no servidor. Diga: "abra o Gerenciador da Meta e veja o `teste_lembrete` em análise — as duas telas mostrando o mesmo modelo é a prova. Pode apagá-lo lá quando quiser, ou eu apago." Registre a criação no progresso.

**Se falhar:**
1. Erro da Meta ao criar → token sem a permissão de gestão (regerar marcando as permissões de WhatsApp) ou WABA ID errado.
2. Criou mas não aparece na lista → a lista está em cache; recarregar/aguardar o próximo ciclo.
3. A Meta trocou a categoria sozinha (marketing↔utilidade) → ela faz isso; mostre ao aluno o aviso, não é bug.

**Armadilha real:** este passo foi deliberadamente deixado por ÚLTIMO na construção original — na aula ficou dito: "o difícil é configurar a API dos templates; com tudo configurado, implementar isso depois é extremamente simples". E as regras de validação do formulário são EXATAMENTE as rejeições colecionadas no passo 17 — o projeto aprendeu com as broncas da Meta e transformou cada uma em aviso automático. É o padrão a ensinar: erro que aconteceu vira checagem que impede a repetição.

**Quando pular:** caminho WAHA → não se aplica. Caminho oficial com pouco template → adiável sem culpa; o Gerenciador da Meta continua existindo.

---

## 🏁 Fim da jornada

Com o passo 23 verde, o aluno tem: um agente que atende texto, áudio e imagem no WhatsApp; agenda, remarca e cancela de verdade; registra todo cliente; entende cliques; agrupa mensagens; foi testado por 30 clientes difíceis; tem painel trancado com funil, templates e intervenção humana. Atualize o progresso com um `## CONCLUÍDO em [data]`, parabenize de verdade — e deixe três sementes: (1) a constituição é um documento VIVO: preço mudou, promoção nova → editar o arquivo, sem tocar em código; (2) o testador pode rodar de novo a cada mudança grande — é o exame periódico do funcionário digital; (3) a seção "Feito em seu nome" do progresso é o diário do projeto — tudo que foi construído, testado e criado nas contas dele está ali, para ele voltar quando quiser.
