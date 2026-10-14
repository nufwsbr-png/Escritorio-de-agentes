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

## Cuki BOT: a IA analista que confere antes de perguntar

Decisão do dono (14/10/2026): a conferência não é uma lista de checagens
escondida no criador; é uma **IA analista** do escritório, chamada
**Cuki BOT**, que roda para verificar a saúde do fluxo, dos agentes e a
aptidão para o CRM, e entrega um **laudo** em linguagem simples. Ela pode
ser chamada a qualquer hora pelo botão 🩺 Cuki BOT (exame periódico do
escritório) e é chamada obrigatoriamente no começo do Criar CRM.

Regra da anatomia que vale aqui: **código para o garantido, modelo para o
interpretado.** O Cuki BOT mede por código e explica pelo modelo.

O que ele mede (código, sem Claude):

| Área | O que confere | Verde | Amarelo | Vermelho |
|---|---|---|---|---|
| Agentes | passou o PORTÃO, está ligado, `/saude` responde, última rodada sem erro, perguntas ao dono pendentes, lições propostas acumuladas | tudo ok | em treinamento ou com pergunta parada há mais de 2 dias | fora do ar, falha de verificação ou erro na última rodada |
| Plataformas | variáveis preenchidas, pasta existe, API responde a um `GET` simples, MCP conecta | tudo preenchido e respondendo | preenchida mas sem teste possível | vazia ou sem resposta |
| Fluxo | entidades tratadas nos últimos 30 dias, por agente; proporção aprovado/rejeitado; quanto tempo em proposta | há entidades reais e aprovações | só amostras | nenhuma entidade real |
| Base | Claude Code conectado, senha de administrador, avisos configurados, escritório aberto (`config.json`) | tudo | falta avisos | sem Claude ou sem senha |
| Aptidão para o CRM | agentes aptos (verde), entidade de cada um (lida do progresso), plataformas usáveis, sugestão de etapas e cargos | 1+ agente apto e 1+ plataforma | agentes aptos sem plataforma | nenhum agente apto |

O que ele escreve (uma rodada do Claude Code, só leitura, com as medidas
acima como entrada): o **laudo**, em `data/cuki/<data>.md`, com um semáforo
por área, "o que fazer antes" em frases curtas e, se verde, as **sugestões**
que viram o rascunho das respostas do CRM: a entidade, as etapas, os cargos
dos agentes, as integrações e quem cuida de cada etapa. Nenhum valor de
variável no laudo, só nomes.

Se alguma área está vermelha, o Criar CRM não começa: mostra o laudo e o que
fazer. Amarelo começa, com o aviso no laudo. Cuki BOT pode ganhar um boneco
na recepção do escritório isométrico, para a pessoa saber quem é.

## As perguntas, simples e com resposta pronta para confirmar

Decisão do dono (14/10/2026): as perguntas anteriores estavam difíceis para
quem não é técnico. Regra nova: **toda pergunta vem com uma proposta do Cuki
BOT e a pessoa responde "sim", escolhe uma opção ou corrige em uma frase.**
Nada de pedir que a pessoa invente estrutura. Linguagem do dia a dia, sem
"entidade", "funil", "permissão", "integração".

Parte 1, o essencial (seis perguntas; sem elas o CRM não existe):

1. **O que a gente acompanha.** "Pelo que vi, seus agentes cuidam de
   *clientes*. O CRM vai acompanhar clientes, certo? E para não cadastrar a
   mesma pessoa duas vezes, uso o telefone. Pode ser?" (sim / "é paciente" /
   "use o CPF")
2. **O caminho de cada um.** "Um cliente passa por estes passos: *novo →
   conversando → proposta enviada → fechado*, e pode ser *perdido* em
   qualquer um. Está certo ou falta algum passo?" (sim / acrescenta ou tira)
3. **Quem trabalha no CRM.** "Vou colocar estes agentes como funcionários:
   *Tati (Financeiro)*, *Léo (Prospecção)*. E pessoas de verdade: quem são, e
   o que cada uma faz? Basta nome e função, ex.: Ana, vendedora." (lista
   curta; o Cuki BOT transforma função em cargo)
4. **Quem cuida de cada passo.** "Para cada passo, me diga quem cuida: *novo*
   → Léo (agente); *conversando* → Ana; *proposta* → Tati prepara e Ana
   aprova; *fechado* → Ana. Está bom assim?" (sim / troca um nome)
5. **Quem manda.** "Quem é o chefe do CRM, que vê tudo e aprova o que os
   agentes propõem?" (um nome)
6. **O que o agente faz sozinho.** Três opções: "(a) tudo passa por uma
   pessoa antes; (b) só mensagem para cliente e dinheiro passam por uma
   pessoa; (c) o agente faz sozinho o que já faz hoje no escritório."
   Recomendado: (b). (a / b / c)

Parte 2, ajustes (cinco perguntas; todas têm padrão e podem ser respondidas
"depois"):

7. **Por onde chegam os novos.** "Novos clientes vão entrar pelo WhatsApp do
   *Léo* e por cadastro à mão. Tem alguma planilha ou lista antiga para eu
   trazer para dentro?" (não / "sim, esta planilha")
8. **Agenda e planilha.** "Quando alguém marcar um horário no CRM, eu crio o
   evento na sua agenda do Google. E a planilha *Controle* continua sendo
   atualizada pela *Tati*. Pode ser?" (sim / não)
9. **Dados que só o chefe vê.** "Tem algum dado que o resto da equipe e os
   agentes não devem ver inteiro, tipo CPF ou valor do contrato?" (não /
   lista)
10. **Avisos.** "Quando um agente precisar de alguém ou um cliente ficar
    parado muitos dias, eu aviso pelo mesmo celular dos avisos do escritório.
    Pode ser?" (sim / outro número)
11. **Acesso de fora.** "As pessoas vão usar o CRM só aqui no escritório, ou
    também de casa e do celular?" (só aqui / de fora também; define
    hospedagem e tranca)

Fica de fora da abertura, com padrão: campos da ficha (nome, telefone,
e-mail, origem, observações, mais os que os agentes já usam), tarefas e
lembretes (ligados, criados por pessoa ou propostos por agente), números do
painel (os da reunião já configurada), nome e logo (reaproveita a marca do
escritório). Tudo editável depois em ⚙️ Ajustes do CRM.

Como o Cuki BOT acha as propostas: a entidade e as etapas vêm do progresso e
da constituição dos agentes ("Entidade: cliente", seções de regras), dos
nomes das pastas em `saidas/` e das etapas que já aparecem nos estados das
entidades; os cargos vêm dos setores do escritório; as integrações vêm das
plataformas marcadas para cada agente; o celular dos avisos vem de
`avisos.json`. Quando não encontra, propõe o padrão do ramo (clínica,
advocacia, loja) lido de `config.json` e pergunta.

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

## Decidido pelo dono em 14/10/2026

- **Onde ficam as fichas** (arquivos locais na pasta do CRM ou Supabase na
  nuvem): não se decide agora; **vira uma pergunta do Criar CRM**, com
  proposta do Cuki BOT (local se "só aqui", nuvem se "de fora também").
- **Quem guarda a ficha do cliente quando o CRM existe: o CRM, sozinho (A).**
  O agente deixa de guardar estado em `memoria/entidades/` e passa a ler e
  escrever na ficha do CRM por `tools/crm.js`. Uma verdade só.
