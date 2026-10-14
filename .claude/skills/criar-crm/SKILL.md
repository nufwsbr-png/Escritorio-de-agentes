---
name: criar-crm
description: Cria (ou ajusta) o CRM do Escritório de Agentes quando a equipe de agentes já funciona. Chama o Cuki BOT antes (vermelho trava), faz as perguntas simples com proposta pronta (o que acompanhar, os passos, quem trabalha, quem cuida de cada passo, quem manda, o que o agente faz sozinho, por onde chegam os novos, agenda e planilha, dados sensíveis, avisos, acesso, onde ficam as fichas) e grava por `node crm/criar.js aplicar`. Use quando a pessoa disser "criar CRM", "quero um CRM", "cadastro de clientes", "funil", "pipeline com pessoas", "as pessoas vão usar junto com os agentes", ou quiser mudar algo do CRM.
---

# Criar o CRM

O CRM é mais um sistema do escritório: a **ficha** de cada cliente (ou
paciente, processo…), o passo em que ela está e quem cuida dela agora.
Pessoas entram com login e cargo; os agentes entram como funcionários, com
token e cargo. Uma ficha, um responsável por vez, bastão explícito. Você
nunca escreve `crm/config.json`, `crm/.env`, `data/sistemas.json` nem
`data/plataformas.json` à mão: só `node crm/criar.js` e `node plataformas.js`.

Design: `docs/superpowers/specs/2026-10-14-crm-design.md` e as perguntas em
`docs/superpowers/specs/2026-10-14-criar-crm-perguntas.md`.

## 1. Antes de perguntar: o Cuki BOT confere

Com o escritório no ar (`npm start` em outro terminal, ou já aberto):

1. `node crm/criar.js atual` → se `criado` for `true`, o CRM já existe:
   mostre o que está (entidade, etapas, pessoas, agentes, autonomia, acesso,
   onde ficam as fichas) e pergunte **o que muda**. Faça só as perguntas do
   que a pessoa quer mudar; `aplicar` de novo mantém tokens e senhas.
2. `node cuki.js medir` → o laudo por código. Leia `geral` e `texto`.
   - **vermelho**: o Criar CRM não começa. Mostre o semáforo e a lista "o
     que fazer antes" em palavras simples e pare. Diga que, resolvido isso,
     é só chamar `/criar-crm` de novo.
   - **amarelo**: segue, avisando em uma frase o que está amarelo.
3. `node crm/criar.js propostas` → o que o Cuki BOT propõe para cada
   pergunta: entidade e chave, etapas (das esteiras, quando existem),
   agentes aptos com cargo, atendentes, integrações, celular dos avisos,
   bancos cadastrados, porta livre. É daqui que saem as propostas abaixo.

## 2. As perguntas, uma por mensagem, sempre com a proposta pronta

Linguagem do dia a dia: nada de "entidade", "funil", "permissão",
"integração". A pessoa responde "sim", escolhe uma opção ou corrige em uma
frase. Nunca peça para ela inventar estrutura.

O essencial (sem isto o CRM não existe):

1. **O que a gente acompanha.** "Pelo que vi, seus agentes cuidam de
   *{singular}*. O CRM vai acompanhar {plural}, certo? E para não cadastrar
   a mesma pessoa duas vezes, uso o *{chave}*. Pode ser?" → `entidade`
   (chave: telefone, cpf, email ou numero).
2. **O caminho de cada um.** "Um {singular} passa por estes passos:
   *{etapas}*, e pode ser *perdido* em qualquer um. Está certo ou falta
   algum passo?" → `etapas` (nome de cada um) e `perdido`.
3. **Quem trabalha no CRM.** "Vou colocar estes agentes como funcionários:
   *{agentes com cargo}*. E pessoas de verdade: quem são, e o que cada uma
   faz? Basta nome e função, ex.: Ana, vendedora." → `agentes` (id e
   cargo) e `pessoas` (nome e função). Agente amarelo pode entrar, avisando
   que só produz quando ficar verde.
4. **Quem cuida de cada passo.** "Para cada passo: *{etapa → quem}*. Está
   bom assim?" → `responsavel` de cada etapa: o id do agente, ou
   `pessoa:Nome`. Marque `aprovacao: true` no passo em que uma pessoa
   precisa olhar antes de seguir (recomende os que falam com o cliente ou
   envolvem dinheiro).
5. **Quem manda.** "Quem é o chefe do CRM, que vê tudo e aprova o que os
   agentes propõem?" → `chefe` (um nome; se não estiver na lista de pessoas,
   entra nela).
6. **O que o agente faz sozinho.** "(a) tudo passa por uma pessoa antes;
   (b) só mensagem para cliente, dinheiro e os passos marcados passam por
   uma pessoa; (c) o agente faz sozinho o que já faz hoje no escritório."
   Recomende (b). → `autonomia`.

Os ajustes (todos têm padrão; "depois" vale):

7. **Por onde chegam os novos.** "Novos {plural} entram pelo WhatsApp do
   *{atendente}* e por cadastro à mão. Tem alguma planilha ou lista antiga
   para eu trazer para dentro?" → `entrada` (whatsapp: ids; manual;
   importar: caminho do CSV ou vazio; a importação em si é na tela do CRM).
8. **Agenda e planilha.** "Quando alguém marcar um horário no CRM, eu peço
   ao agente que tem a agenda para criar o evento. E a planilha continua
   sendo atualizada pelo agente, e o CRM só lê. Pode ser?" → `integracoes`
   (`agenda` e `planilha`: fonte, espelho ou nao).
9. **Dados que só o chefe vê.** "Tem algum dado que o resto da equipe e os
   agentes não devem ver inteiro, tipo CPF ou valor do contrato?" →
   `sensiveis` (lista de nomes de campo).
10. **Avisos.** "Quando um agente precisar de alguém ou um {singular} ficar
    parado muitos dias, aviso pelo mesmo celular dos avisos do escritório
    (*{celular}*). Pode ser?" → `avisos` (`escritorio` ou outro número).
11. **Acesso.** "As pessoas vão usar o CRM só neste computador, na rede do
    escritório, ou também de casa e do celular?" → `acesso` (aqui, rede,
    fora). "fora" pede um túnel com HTTPS depois; diga isso em uma linha.
12. **Onde ficam as fichas.** "As fichas podem ficar aqui neste computador
    (simples, para 'só aqui' e 'rede') ou no Supabase, na nuvem (melhor
    para acesso de fora). Proposta: *{local ou supabase}*." Se Supabase:
    "Cadastre o Supabase em 🔌 Plataformas, tipo *banco* (endereço e chave
    de serviço; a chave não passa por aqui), e me diga o nome." →
    `fichas` ({ onde: local } ou { onde: supabase, plataforma: id }). Os
    bancos já cadastrados vêm em `propostas.bancos`.

## 3. Grave

Monte `respostas.json` (numa pasta temporária ou em `crm/respostas.json`,
que está fora do git):

```json
{ "entidade": { "singular": "paciente", "plural": "pacientes", "chave": "telefone" },
  "etapas": [ { "nome": "Novo contato", "responsavel": "lia", "aprovacao": false },
              { "nome": "Avaliação marcada", "responsavel": "pessoa:Ana", "aprovacao": false },
              { "nome": "Em tratamento", "responsavel": "pessoa:Ana", "aprovacao": true },
              { "nome": "Concluído", "responsavel": "pessoa:chefe", "aprovacao": false } ],
  "perdido": true,
  "pessoas": [ { "nome": "Ana", "funcao": "recepção" } ],
  "agentes": [ { "id": "lia", "cargo": "Prospecção" } ],
  "chefe": "Dra. Carla", "autonomia": "b",
  "entrada": { "whatsapp": ["lia"], "manual": true, "importar": "" },
  "integracoes": { "agenda": "fonte", "planilha": "nao" },
  "sensiveis": ["cpf"], "avisos": "escritorio", "acesso": "rede",
  "fichas": { "onde": "local" } }
```

`node crm/criar.js aplicar respostas.json`. Ele grava `crm/config.json`,
gera os segredos em `crm/.env`, registra o sistema **crm** no escritório,
cria a plataforma **crm** com um token por agente e marca os agentes, e cria
pessoas e cargos. Se voltar `erros`, corrija a resposta correspondente e
rode de novo. Confirme em duas linhas o que foi gravado e diga:

"Ligue o CRM no escritório (ele aparece como sistema) e abra
http://localhost:{porta}. A senha do chefe aparece uma vez na primeira
abertura da tela."

## Regras

- Nenhuma senha, token ou chave no chat. A senha do chefe é mostrada pela
  tela do CRM, não por você. A chave do Supabase vai por 🔌 Plataformas.
- Nunca edite `crm/config.json`, `data/*.json` nem o código do projeto à
  mão.
- Lacuna fica com o padrão; não invente pessoa, etapa ou campo que a pessoa
  não citou.
- Não prometa prazo nem funcionalidade que o design não tem.
