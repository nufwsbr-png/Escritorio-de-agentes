---
name: criar-escritorio
description: Abre (ou refaz) o Escritório de Agentes para um negócio. Desde 16/10/2026 a abertura acontece NA TELA (http://localhost:4321/abertura, uma pergunta só, "Entendi assim", o Estúdio e a senha); esta skill sobe o escritório, abre o link e acompanha. Use SEMPRE que a pessoa disser que quer criar, abrir, montar, configurar ou refazer o escritório, "criar escritório", "escritório do cliente X", ou quando não existir data/config.json. Também quando ela mandar a planta do escritório ou da clínica (imagem ou PDF) para redesenhar as salas, ou quiser mudar algo da abertura pelo chat.
---

# Criar o escritório

Você está na pasta do **Escritório de Agentes**, o produto. A abertura de um
escritório é feita **na tela**, não no chat (decisão do dono em 16/10/2026:
"as 10 perguntas devem virar uma só; depois delas vem o link de escolhas").
Esta skill é o atalho: sobe o escritório, abre o link e fica por perto para
ajudar. Você nunca escreve `config.json`, `plataformas.json`, `planta.json`,
`avisos.json` ou `admin.json` à mão.

## O caminho normal: a abertura na tela

1. `node abertura.js atual` → se `aberto` for `true`, o escritório já foi
   aberto: diga para quem (empresa) e que refazer pela tela troca empresa,
   dono, setores, planta e visual, e mantém agentes, conexões e senha; para
   refazer é preciso entrar como administrador na tela (🔐 Admin).
2. `node abertura.js claude` → se não estiver `conectado`, avise em uma
   frase: a abertura funciona assim mesmo (a tela entende por
   palavras-chave), mas os agentes precisam do Claude Code; o login é
   `claude auth login`.
3. Suba o escritório, solto (não bloqueie o chat): no Windows,
   `cmd /c start "" "INICIAR ESCRITORIO.cmd"`; em outro sistema, `npm start &`.
   Aguarde `http://localhost:<porta>/api/admin` responder (a porta vem de
   `atual.porta`; 4321 por padrão).
4. Abra `http://localhost:<porta>/abertura` no navegador (no Windows,
   `cmd /c start "" "http://localhost:<porta>/abertura"`) e diga, em três
   linhas, o que a pessoa vai ver: uma caixa de texto para contar do negócio
   (nome, o que faz, dono, sistemas que usa; sem chaves), a tela "Entendi
   assim" para corrigir, o Estúdio para escolher planta, cores e a roupa dos
   agentes, e a senha do administrador, mostrada uma única vez.
5. Fique disponível. Se a pessoa colar a descrição aqui no chat em vez de na
   tela, não grave nada: peça para colar na tela, ou, se ela preferir o
   chat, rode `node abertura.js interpretar <arquivo.txt>` com o texto dela
   salvo num arquivo temporário, mostre o que saiu ("Entendi assim: …") e,
   com o ok, `node abertura.js montar <escolhas.json>` com
   `{ empresa, oQueFaz, dono, ramo, setores, conexoes, marca: { cor }, estilo }`
   (os valores possíveis de `estilo` estão em `abertura.ESTILO_OPCOES`). O
   `montar` devolve a senha uma vez: mostre com "guarde agora" e nunca repita.

## Quando a pessoa manda a planta (imagem ou PDF)

A tela guarda o arquivo em `data/marca/` mas não lê salas. Ler é com você:
siga `referencias/planta.md` (proponha a lista de salas, confirme,
`node planta.js gerar salas.json`). Cada sala pode levar `setores: [nomes]`,
que é onde a mesa dos agentes daquele setor fica. Toda planta tem que ter uma
sala de `descanso`: é onde ficam os agentes desligados.

## Regras que não se quebram

- **Chave é segredo.** Nenhuma chave de API, token ou senha entra no chat.
  As conexões nascem com variáveis vazias; os valores entram pelo botão
  🔌 Conexões, como administrador. Se a pessoa colar uma chave aqui, não a
  use e diga onde colar.
- **Só pelos scripts e pela tela.** `abertura.js`, `plataformas.js`,
  `planta.js` e as rotas `/api/abertura/*`. Nunca edite `data/*.json`,
  `modelos/`, os agentes nem código do projeto. Se o escritório não subir
  por erro no código, pare, mostre a mensagem e diga que o administrador
  precisa corrigir e atualizar (`git pull`).
- **A senha do administrador** aparece uma vez (na tela, ou no `montar`).
  Nunca repita, nunca grave em arquivo de texto. Para trocar: 🔐 Admin, ou
  `node abertura.js senha`.
- **Lacuna fica em branco**, nunca inventada. Setor, conexão ou meta que a
  pessoa não citou ficam de fora: dá para acrescentar depois.
- **Depois da abertura**, mostre o que vem: colar as chaves em 🔌 Conexões
  (`node plataformas.js testar` diz quais ainda não conectaram), contratar o
  primeiro agente na aba Contratar, avisos em 🔔 Avisos e reunião em
  ⚙️ Ajustes. Para refazer qualquer parte: `/abertura` como administrador,
  ou esta skill de novo.
