# Criar CRM: as perguntas antes de criar e a ideia do híbrido (14/10/2026)

Estado: **planejamento**, pedido pelo dono em 14/10/2026. Nada implementado.
Este documento é a base para o design e, depois, para a skill
`/criar-crm`, que faria as perguntas e gravaria as respostas pelos scripts.

## O pedido

Uma opção "Criar CRM" no escritório, usada quando a equipe de agentes já
está concluída e funcionando. O CRM usa as integrações que os agentes já
usam, serve a pessoas reais trabalhando nele, e mostra os agentes como
funcionários, cada um com seu cargo, como se fossem pessoas com acesso ao
sistema. Pessoas reais não podem quebrar nem interferir no funcionamento dos
agentes. Pré-requisito do dono: o escritório já funciona com o fluxo
completo.

## O princípio que faz o híbrido funcionar

**Uma entidade, um responsável por vez, e o bastão passa de forma explícita.**

Tudo que o escritório já tem para o agente de tarefa vale para o CRM:

- A **entidade** do agente (cliente, paciente, processo, pedido) é o registro
  do CRM. O CRM é o dono desse registro e do funil; os agentes param de
  guardar estado paralelo e passam a ler e escrever no CRM por uma ferramenta
  única (`tools/crm.js`), com token próprio e cargo próprio. O CRM entra para
  cada agente como uma plataforma do tipo `api` marcada em 🔌 Plataformas;
  sem o token, o agente não enxerga o CRM.
- **Assumir e devolver** (componente 10 da anatomia) vira o botão de
  reatribuir do CRM. Quando uma pessoa assume uma entidade, o agente cala
  nela e continua nas outras (`com o dono`, já existe em `rodar.js`). Quando
  devolve, o que a pessoa fez é decisão final; o agente nunca desfaz.
- **Proposta antes de real** continua: enquanto o agente está em modo
  proposta, o que ele faz aparece no CRM como "proposta pendente" na
  entidade, e a pessoa aprova ali mesmo. Dez aprovações seguidas liberam o
  real para aquele tipo de caso, como hoje.
- **Toda ação tem autor**, pessoa ou agente, no histórico da entidade. Agente
  nunca apaga (quarentena), nunca sobrescreve sem rastro. Pessoa pode editar
  tudo que o cargo dela permite, e o agente trata o que a pessoa escreveu como
  dado a processar, nunca como ordem.
- **O escritório continua sendo o RH e a TI.** O CRM mostra os agentes como
  funcionários (nome, cargo, foto do boneco, "online", "fora do ar", "em
  treinamento", lidos do escritório), com um link para o monitor. Mas
  contratar, demitir, treinar, dar plataforma e aprovar lições é no
  escritório. Ninguém muda um agente de dentro do CRM.
- **Uma fonte da verdade por dado.** Para cada integração (agenda, planilha,
  WhatsApp, e-mail, sistema externo) decide-se na abertura se o CRM é espelho
  (só lê) ou fonte (escreve). Dupla escrita é o que quebra: evitada por
  desenho, não por instrução.

Com isso, pessoa e agente não se atropelam porque nunca estão com a mesma
entidade ao mesmo tempo, e tudo que o agente faz continua passando pelas
mesmas cercas de hoje.

## Pré-conferência (não é pergunta; o criador roda antes de perguntar)

Se falhar, o "Criar CRM" para e diz o que falta:

1. Todo agente que vai entrar no CRM passou o PORTÃO (é funcionário, não
   treinamento). Agente em construção fica de fora até concluir.
2. As plataformas que os agentes usam têm as variáveis preenchidas.
3. O Claude Code está conectado e há senha de administrador.
4. Há pelo menos uma entidade real já tratada por agente (prova de que o
   fluxo roda), lida de `memoria/entidades/` dos agentes.

## As perguntas, na ordem

Uma por mensagem, como no `/criar-escritorio`. Entre parênteses, o que a
resposta decide.

1. **O que o CRM gerencia.** "Qual é a coisa central que o CRM acompanha:
   clientes, leads, pacientes, processos, pedidos? Como você chama uma e
   várias, e o que identifica cada uma sem confusão: telefone, CPF, número do
   processo?" (a entidade, o nome dela na tela, a chave de deduplicação)
2. **O caminho que ela percorre.** "Quais são as etapas, na ordem, do começo
   ao fim? Ex.: novo contato, qualificado, proposta enviada, fechado, perdido."
   (o funil; depois, por etapa, quem move)
3. **Os agentes que entram e o cargo de cada um.** O criador lista os agentes
   concluídos do escritório com o setor. "Quais entram no CRM? O cargo de
   cada um fica o setor dele, ou quer renomear? Ex.: Tati, Financeiro →
   'Faturamento'." (funcionários-agentes e cargos)
4. **Cargos para pessoas.** "Além dos cargos dos agentes, quais cargos de
   pessoas existem? Ex.: vendedor, recepção, gerente, financeiro, dono. Quem é
   o administrador do CRM?" (cargos humanos, administrador)
5. **O que cada cargo pode fazer.** Para cada cargo, pessoa ou agente: "vê
   todas as entidades ou só as suas? Edita? Muda de etapa? Exporta? Vê dados
   sensíveis?" Apagar ninguém apaga: arquiva. (permissões por cargo; a do
   agente vira a cerca da ferramenta dele)
6. **Quem é responsável em cada etapa.** "Em cada etapa, quem cuida por
   padrão: uma pessoa, um agente, ou o agente propõe e a pessoa aprova? E
   quando uma pessoa assume uma entidade, o agente para nela até ela devolver;
   está bom assim?" (a divisão de trabalho; é a regra do bastão)
7. **Por onde entram entidades novas.** "Como chegam: pelo WhatsApp do
   atendente, formulário do site, planilha, importação de uma base que já
   existe, cadastro à mão? Tem base para importar? De onde e em que formato?"
   (fontes de entrada e importação inicial)
8. **As integrações: espelho ou fonte.** O criador lista as plataformas
   cadastradas. "Para cada uma que o CRM vai usar: o CRM só lê dela, ou é ele
   que escreve? Ex.: agenda, o CRM cria o evento e a agenda só reflete; ou a
   agenda é a fonte e o CRM só mostra." (uma fonte da verdade por dado)
9. **A ficha.** "Quais campos a ficha precisa ter? Quais são obrigatórios? E
   quais são sensíveis, que os agentes veem mascarados e que nunca saem em
   aviso ou resumo?" (campos, obrigatórios, LGPD)
10. **Tarefas e lembretes.** "O CRM tem tarefas e follow-ups? Quem cria,
    pessoa, agente, ou agente propõe? Lembrete por onde: pelos avisos que o
    escritório já tem (ntfy ou WhatsApp)?" (tarefas, prazos, canal de aviso)
11. **O que precisa de aprovação humana.** "O que um agente faz sozinho e o
    que espera uma pessoa aprovar: mandar mensagem a cliente, mudar de etapa,
    registrar valor acima de X?" (aprovações e limites; vira modo proposta
    por tipo de ação)
12. **Onde roda e quem acessa.** "Nesta máquina, na mesma rede do escritório,
    ou hospedado? Pessoas acessam de fora? Login por senha; precisa de
    horário de acesso?" (hospedagem, acesso, tranca)
13. **Números e reunião.** "Que números o CRM deve mostrar ao gerente, e quais
    entram na reunião dos agentes para cobrar a meta que já está configurada?"
    (painel e integração com a reunião)
14. **Nome e marca.** "Como o CRM se chama? Reaproveita o logo e a cor do
    escritório?" (nome, marca)

Perguntas 1, 2, 3 e 6 são as que mais mudam o desenho; 9 e 11 são as de
segurança; o resto pode receber padrão e ser ajustado depois.

## O que seria criado (esboço, para o design)

- Uma pasta `crm/` como mais um sistema do escritório, com o mesmo contrato
  dos agentes: `server.js` com `/saude`, `/painel`, `/log`, porta registrada,
  `.env`, dados em `crm/data/` fora do git. Só Node, sem dependência, como o
  resto.
- Entidades, etapas, cargos, usuários (pessoas e agentes), histórico com
  autor, propostas pendentes, tarefas, importação.
- Para cada agente: uma plataforma `api` "CRM" marcada em 🔌 Plataformas com
  token e cargo próprios, e `tools/crm.js` gerada no agente (ler entidade,
  mover etapa, anotar, propor), sobre `tools/base.js`.
- Funcionários-agentes lidos do escritório: nome, cargo, boneco, estado.
- Skill `/criar-crm` na pasta do projeto, com as perguntas acima e os scripts
  que gravam.

## Em aberto, para o dono decidir antes do design

- Onde guardar os dados do CRM: arquivos JSON em `crm/data/` (zero
  dependência, igual ao escritório) ou um banco como o Supabase, que o
  atendente já usa (acesso de fora e várias pessoas ao mesmo tempo ficam mais
  fáceis). Recomendação: JSON local para começar, com a camada de dados
  isolada para trocar depois.
- Se o CRM substitui o estado em `memoria/entidades/` dos agentes ou só o
  espelha. Recomendação: substitui, para não haver duas verdades.
