# Verificação: `/criar-escritorio` numa cópia limpa (13/10/2026)

Como foi: clone limpo do projeto numa pasta temporária, sem `data/config.json`,
com uma imagem em `data/marca/planta.png`. Um agente independente fez o papel
da pessoa (persona: Marina, dona da Clínica Aurora, estética em Curitiba) e
conversou com a skill por `claude -p` e `--resume`, uma resposta por rodada,
sem receber instruções minhas sobre o que a skill deveria fazer.

## Resultado

- 10 rodadas; a skill encerrou sozinha. Ordem das dez perguntas respeitada.
- Tudo gravado pelos scripts: `abertura.js aplicar` (3x), `abertura.js senha`,
  `plataformas.js criar`, `planta.js gerar data/salas.json`, `abertura.js exemplo manter`.
  Nenhum `data/*.json` escrito à mão.
- Ficou em `data/`: config.json (empresa, nome "Escritório da Clínica Aurora",
  dono, 5 setores propostos pela skill e aprovados, marca.planta), plataformas.json
  (Ophir api, Google Calendar agenda, OneDrive pasta, variáveis vazias), avisos.json
  (ntfy), admin.json (hash e sal), planta.json (7 salas, 16 mesas, válida), salas.json,
  abertura.log.
- Segredos: a senha mostrada uma vez não aparece em nenhum arquivo; nenhum
  valor de chave em lugar nenhum; a skill nunca pediu chave no chat.
- Lacunas ficaram em branco (meta, cor, logo); nenhuma invenção; nenhuma
  promessa de prazo. A skill avisou que a imagem era uma captura de tela, não
  uma planta, e propôs as salas mesmo assim após confirmação.
- O escritório subiu no fim com o nome da empresa.

Critérios 9, 10 (parcial: a segunda rodada não foi testada), 11 e 13 do
design atendidos.

## O que o teste mostrou e foi corrigido no mesmo dia

1. A cópia tinha o bug grave da pasta de dados (corrigido em d3a0534); a
   skill, ao ver o escritório não subir, **editou `server.js` por conta
   própria**. Regra nova no SKILL.md: a abertura nunca edita código; reporta
   o erro e para.
2. A senha veio na mesma mensagem da pergunta 6. Regra nova: a senha vem
   numa mensagem só e a pessoa responde "guardei" antes de seguir.
3. A pergunta 4 juntou planta, logo e cor. Agora são duas mensagens.
4. Uma rodada não confirmou "gravado". Regra nova: confirmar em uma linha.
5. `whatsapp.ativo` ficou ligado com "só ntfy" (o script ligava pelo número).
   Agora `ativo` é explícito; a referência manda gravar `false` nesse caso.
6. Tópico do ntfy com 4 dígitos. Agora `ntfy.gerar` cria slug + 8 hex.
7. O resumo diário das 9h não foi explicado. Entrou na pergunta 6.
8. O e-mail da conta do Claude apareceu no chat. A skill passa a dizer só
   "conectado"; a conta fica nos Ajustes.

Não mudou, por decisão de design: a skill sobe o escritório no fim sem
perguntar (a pessoa pediu "no fim ela sobe").
