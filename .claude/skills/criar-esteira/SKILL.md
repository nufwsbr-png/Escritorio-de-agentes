---
name: criar-esteira
description: Cria (ou refaz) uma esteira do Escritório de Agentes, em que o trabalho passa de agente em agente na ordem, como num escritório de verdade (ex.: fechamento de pasta → petição → protocolo). Faz cinco perguntas simples, com proposta pronta, e grava por `node esteiras.js criar`. Use quando a pessoa disser "esteira", "fluxo", "passar de um agente para outro", "pipeline", "um faz e passa para o outro", ou quiser que agentes trabalhem em sequência.
---

# Criar uma esteira

Uma esteira é uma lista de etapas em ordem. Cada etapa tem um agente de
tarefa responsável, o que ele entrega e se uma pessoa aprova antes de
seguir. A coisa que anda na esteira é a entidade (um processo, um pedido, um
paciente). Quem passa o bastão é o escritório: lê quando a etapa fica
pronta, acorda o próximo agente e deixa o recado. **Aprovação é pela tela
do escritório** (🧵 Esteiras), com aviso no celular.

Design: `docs/superpowers/specs/2026-10-14-esteiras-design.md`.

## Antes de perguntar, leia

1. `node esteiras.js agentes` → os agentes de tarefa, com setor, a tarefa em
   uma frase e as plataformas de cada um. Só eles entram em etapas. Agente em
   construção pode entrar, mas avise que ele só vai produzir quando passar o
   portão.
2. `node esteiras.js listar` → as esteiras que já existem. Se a pessoa quer
   mudar uma, mostre o que está e pergunte só o que muda (`criar` com o mesmo
   nome substitui).
3. `node plataformas.js listar` → as plataformas do tipo `pasta`, candidatas
   a pasta compartilhada.

## As cinco perguntas, uma por mensagem, sempre com proposta pronta

Linguagem do dia a dia; nada de "entidade", "pipeline", "orquestração". A
pessoa responde "sim", escolhe ou corrige em uma frase.

1. **O que passa de mão em mão.** "Qual trabalho passa de um agente para o
   outro? Pelo que vi dos seus agentes, parece ser *um processo novo*. É
   isso? Como você chama um e vários?" (nome da esteira; singular e plural)
2. **A ordem.** "Pela tarefa de cada agente, a ordem seria: *Tati organiza a
   pasta → Léo escreve a petição → Bia protocola e cobra*. Está certa? Falta
   alguém ou sobra alguém?" (as etapas, com o nome do que cada um entrega;
   você propõe pela tarefa em uma frase e pelo setor de cada agente)
3. **Quem aprova.** "Em qual desses passos uma pessoa precisa olhar antes de
   seguir? Quem é essa pessoa?" (aprovação por etapa e o nome; recomende
   aprovação na etapa que fala com o cliente ou envolve dinheiro)
4. **A pasta.** "Onde ficam os arquivos de cada processo? Uso a pasta *Drive
   de clientes*, que os três já têm." Se algum agente da esteira não tem a
   pasta marcada, diga: "Marque a pasta para o Léo em 🔌 Conexões, senão
   ele não enxerga os arquivos." (a plataforma do tipo pasta)
5. **Como entra.** "Um processo novo entra pelo botão na tela 🧵 Esteiras.
   Quer que entre sozinho também quando aparecer uma pasta nova lá dentro?"
   (vigiarPasta)

## Grave

Monte `esteira.json`:

```json
{ "nome": "Processo novo", "entidade": { "singular": "processo", "plural": "processos" },
  "pasta": "drive-clientes", "vigiarPasta": false,
  "etapas": [
    { "nome": "Fechamento de pasta", "agente": "tati", "entrega": "pasta do cliente organizada", "aprovacao": "nenhuma" },
    { "nome": "Petição inicial", "agente": "leo", "entrega": "petição em rascunho", "aprovacao": "pessoa", "aprovador": "Dra. Ana" } ] }
```

`node esteiras.js criar esteira.json`. Confirme em uma linha: "gravado:
data/esteiras.json (Processo novo, 2 etapas)". Para pôr a primeira entidade:
`node esteiras.js entrar processo-novo "processo da cliente 1"` com o
escritório no ar, ou o botão ＋ na tela.

## Regras

- Nunca edite `data/esteiras.json` à mão nem o código do projeto; só
  `node esteiras.js`.
- Nenhuma chave no chat. A `GATILHO_CHAVE` de cada agente já existe no `.env`
  dele; você não precisa vê-la.
- Lacuna fica em branco: etapa sem entrega definida ganha só o nome.
- Não prometa prazo. Diga que a entidade anda sozinha e que o cartão espera
  na tela quando uma pessoa precisa aprovar.
