---
name: criar-escritorio
description: Abre (ou refaz) o Escritório de Agentes para um negócio, fazendo as dez perguntas da abertura no chat, uma por mensagem, e gravando tudo pelos scripts do projeto (abertura.js, plataformas.js, planta.js). Use SEMPRE que a pessoa disser que quer criar, abrir, montar, configurar ou refazer o escritório, "criar escritório", "escritório do cliente X", ou quando não existir data/config.json. Também quando ela quiser mudar algo da abertura (setores, plataformas, planta, avisos, reunião, senha) ou mandar a planta do escritório ou da clínica para redesenhar as salas.
---

# Criar o escritório

Você está na pasta do **Escritório de Agentes**, o produto. Esta skill faz a
**abertura** de um escritório para um negócio: o seu ou o de um cliente. São
dez perguntas, uma por mensagem, e cada resposta é gravada por um script do
projeto. Você nunca escreve `config.json`, `plataformas.json`, `avisos.json`
ou `admin.json` à mão.

Quem está do outro lado pode ser o administrador (quem entrega escritórios)
ou o dono do negócio. O tom é o mesmo: direto, sem jargão, uma pergunta por
vez.

## Antes de perguntar, leia

1. `node abertura.js atual` → o que já está configurado, sem segredos. Se
   `aberto` for `true`, este escritório já foi aberto: diga o que existe
   (empresa, setores, plataformas, salas, avisos, reunião) e pergunte **o que
   muda**. Faça só as perguntas do que a pessoa quer mudar. Rodar de novo
   nunca apaga o que não foi pedido.
2. `node abertura.js claude` → se o Claude Code está conectado nesta máquina
   (é a conferência da pergunta 8; faça cedo, porque sem ele nada funciona).
3. `node plataformas.js tipos` e `node planta.js tipos` quando chegar nessas
   perguntas.

## As dez perguntas, nesta ordem

O texto de cada pergunta, o que ler antes, o que gravar e por qual script
estão em `referencias/perguntas.md`. Leia o arquivo ao começar. Em resumo:

| # | Pergunta | Grava por |
|---|---|---|
| 1 | O negócio: nome da empresa, o que faz em uma frase, nome do dono | `node abertura.js aplicar` |
| 2 | Os setores (você sugere pelo ramo; a pessoa marca e completa) | `node abertura.js aplicar` |
| 3 | As plataformas: nome, tipo e endereço de cada sistema. **Chave nunca no chat** | `node plataformas.js criar` |
| 4 | A marca e a planta: logo, cor, e a planta do escritório ou da clínica. **Planta redesenha as salas** (`referencias/planta.md`) | `node abertura.js aplicar`, `node planta.js gerar` |
| 5 | A tranca: você **gera** a senha do administrador e mostra UMA vez | `node abertura.js senha` |
| 6 | Os avisos: celular do dono e do administrador (ntfy ou WhatsApp) | `node abertura.js aplicar` |
| 7 | A reunião: automática? dias, hora, meta | `node abertura.js aplicar` |
| 8 | A conta do Claude Code: conferência, não pergunta | `node abertura.js claude` |
| 9 | O primeiro agente: "qual trabalho dói mais hoje?" | `POST /api/contratar` (escritório no ar) |
| 10 | O exemplo: manter ou demitir | `node abertura.js exemplo` |

Pode agrupar as respostas 1, 2, 6 e 7 num único `respostas.json` e aplicar de
uma vez no fim de cada bloco; mas **pergunte** uma coisa por mensagem.

## Regras que não se quebram

- **Uma pergunta por mensagem.** Diga em que passo está ("3 de 10: as
  plataformas"), pergunte, espere. As conferências (8) podem vir na mesma
  mensagem da pergunta seguinte; **a senha (5) vem numa mensagem só**, sem
  nenhuma pergunta junto, para não passar batida.
- **Confirme o que gravou** antes da próxima pergunta: "gravado: config.json
  (empresa, dono)". Uma linha.
- **Nunca edite código do projeto.** Se um script falhar ou o escritório não
  subir por erro no código (`server.js`, `abertura.js`, qualquer `.js`), pare,
  mostre a mensagem de erro e diga que o administrador precisa corrigir e
  atualizar o escritório (`git pull`). A abertura não tem mandato para mexer
  em fonte; ela só grava em `data/`.
- **Chave é segredo.** Nenhuma chave de API, token ou chave do CallMeBot entra
  no chat. Para plataformas: crie as entradas com valores vazios e diga onde
  colar (botão 🔌 Plataformas do escritório, como administrador). Para o
  WhatsApp dos avisos: o número entra; a chave é colada em 🔔 Avisos.
- **Só pelos scripts.** `abertura.js`, `plataformas.js`, `planta.js`. Eles
  validam, gravam em `data/` e registram em `data/abertura.log`.
- **A senha do administrador** é gerada por `node abertura.js senha`, mostrada
  uma vez com "guarde agora", e nunca repetida. Se a pessoa quiser a dela,
  aceite só com 6 caracteres ou mais e grave com `aplicar` (`senhaAdmin`).
- **Lacuna fica em branco**, nunca inventada. Setor, plataforma e meta que a
  pessoa não souber ficam de fora: dá para voltar depois.
- **Não prometa prazo.** Prometa que no fim o escritório sobe com o nome da
  empresa e tudo gravado.
- **Nunca edite `data/*.json` à mão**, nem `modelos/`, nem os agentes.

## No fim

1. Suba o escritório, solto (não bloqueie o chat): no Windows,
   `cmd /c start "" "INICIAR ESCRITORIO.cmd"`; em outro sistema,
   `npm start &`. Aguarde `http://localhost:<porta>/api/admin` responder.
2. Se houve pergunta 9, contrate o primeiro agente por
   `POST http://localhost:<porta>/api/contratar` com `{ nome, setor, negocio,
   porta, plataformas }`, usando a sessão de administrador
   (`POST /api/admin/entrar` com a senha gerada, cookie `esc_admin`). Se o
   escritório não subir, deixe o pedido anotado em `data/abertura.log` e diga
   como contratar pela aba Contratar.
3. Abra `http://localhost:<porta>` no navegador e resuma o que gravou: nomes
   de arquivos e de variáveis, nunca valores. Lembre: "para refazer qualquer
   parte, abra esta pasta no Claude Code e digite /criar-escritorio".
