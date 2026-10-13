---
name: base-conhecimento
description: Tudo sobre como [NOME DO NEGÓCIO] faz [A TAREFA] — regras, estrutura e nomes, critérios de pronto, modelos de saída e exceções. Consulte sempre que uma decisão depender de regra do negócio. Se a regra não estiver aqui, não invente: registre "regra não encontrada" e siga pela opção mais segura.
---

# Base de conhecimento — [NOME DO AGENTE]

<!-- GUIA: copie este arquivo para skills/base-conhecimento/SKILL.md no projeto do
     aluno e preencha COM ELE no passo 8, seção por seção, UMA pergunta por vez.
     NUNCA invente uma regra. O que o aluno não souber agora fica como
     [A PREENCHER]. Modelos de documento vão em skills/base-conhecimento/modelos/
     e a seção 4 aponta para eles. Apague estes comentários do arquivo final.
     O cabeçalho acima (name/description) é o que faz o Claude Code carregar esta
     skill sob demanda — mantenha-o. -->

## 1. Como a tarefa é feita hoje (o passo a passo humano)

<!-- GUIA: pergunte "se um estagiário fosse fazer isso à mão, o que ele faria,
     na ordem?". Uma linha por passo. É a seção que o agente mais consulta. -->

1. [ex.: abrir a conversa do cliente e ver o que ele mandou]
2. [ex.: identificar cada arquivo: RG, CNH, CTPS, holerite, contrato, áudio da entrevista, foto sem relação]
3. [ex.: salvar cada um na subpasta certa com o nome padrão]
4. [A PREENCHER]

## 2. Organização e nomes

<!-- GUIA: é a seção que vira estrutura de pasta e nome de arquivo. Exija o
     padrão exato — o agente segue à risca. -->

**Estrutura de pastas por entidade:**
```
[ex.:
Clientes\[Nome do Cliente]\
  Contratos\
  Documentos\
  Áudios\
  Não juntar\]
```

**Padrão de nome de arquivo:** `[ex.: [Tipo] - [Nome do Cliente] - [AAAA-MM].[ext]]`

| O que é | Vai em | Nome fica |
|---|---|---|
| [ex.: RG, CNH] | [Documentos] | [ex.: `RG - Maria Silva.pdf`] |
| [ex.: holerite] | [Documentos] | [ex.: `Holerite - Maria Silva - 2026-03.jpg`] |
| [ex.: contrato assinado] | [Contratos] | [A PREENCHER] |
| [ex.: foto sem relação, meme, print de conversa] | [Não juntar] | [nome original] |

## 3. Critérios de qualidade (o que torna um caso pronto, e o que reprova)

- **Pronto quando:** [copiar/estender o "Pronto quando" da missão com detalhes]
- **Reprova se:** [ex.: arquivo solto na raiz / nome fora do padrão / documento de outro cliente na pasta / seção obrigatória faltando na minuta / documento citado que não existe]

## 4. Modelos de saída

<!-- GUIA: para cada modelo, o arquivo em modelos/ e, para CADA campo, de onde ele
     sai na entrada. Campo sem origem vira colchete na saída final. -->

**[ex.: Minuta de petição inicial trabalhista]** — arquivo `modelos/[peticao-inicial.docx]`

| Campo / seção do modelo | De onde sai | Se não houver |
|---|---|---|
| [ex.: Qualificação do reclamante] | [RG/CNH + CTPS em `entrada-lida/`] | [perguntar ao dono] |
| [ex.: Período do contrato] | [CTPS ou contrato] | [marcar "conferir" e seguir] |
| [ex.: Pedidos] | [regras da seção 5 + fatos da entrevista] | [A PREENCHER] |

## 5. Exceções conhecidas ("quando acontece X, faz Y")

<!-- GUIA: tudo que o gabarito do passo 3 revelou. É daqui que saem as lições
     promovidas no passo 18. -->

- Quando [ex.: o cliente manda o mesmo documento duas vezes], então [ex.: manter o mais legível, o outro vai para `Não juntar`].
- Quando [ex.: a foto do documento está ilegível], então [ex.: salvar em Documentos com sufixo `(ilegível)` e marcar o caso para o dono pedir de novo].
- Quando [A PREENCHER], então [A PREENCHER].

## 6. Quando falta informação

[ex.: perguntar ao dono pelo painel, UMA pergunta objetiva, e encerrar a rodada / marcar a entidade "para revisão" e seguir com o resto]

## 7. Perguntas que o agente costuma ter (e as respostas)

<!-- GUIA: alimentada pelo passo 17 — pergunta repetida ao dono vira resposta aqui. -->

- **[ex.: Documento do cônjuge vai na pasta do cliente?]** [ex.: Sim, em Documentos, com o nome do cônjuge no arquivo.]
- **[A PREENCHER]?** [A PREENCHER]
