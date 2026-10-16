# A abertura na tela: uma pergunta, o Estúdio e os bonecos novos (16/10/2026)

## O que o dono decidiu

- "As 10 perguntas devem virar uma só. Depois delas devem vir aquele link de
  escolhas para o escritório." Aprovou a proposta de uma pergunta em texto
  livre com uma linha de confirmação antes de gravar, e o 2D por último.
- "Vamos colocar todas essas escolhas e perguntas em uma interface amigável
  com meu ID Visual" (`C:\Users\Computador08\Desktop\ID Visual`). "O usuário
  que for criar seu escritório deve ter uma experiência com uma UI amigável e
  fácil de entender."
- "Eu não gostei dos modelos dos personagens de agentes. Gostaria que você
  criasse variações para que eu possa escolher, totalmente diferente dos
  modelos atuais."

## O que muda de verdade

A abertura sai do chat do Claude Code e vira uma tela do próprio escritório,
`/abertura`, com a marca NuFws (quem faz o produto). O escritório sem
`data/config.json` abre direto nela. A skill `/criar-escritorio` continua
existindo só como atalho: sobe o escritório e abre o link.

O que hoje são dez passos vira:

1. **Boas-vindas.** Uma frase do que vai acontecer e quanto tempo leva. Se o
   Claude Code não estiver conectado nesta máquina, a tela diz aqui como
   resolver (`claude auth login`) e deixa seguir mesmo assim: a interpretação
   da resposta então é por palavras-chave, mais pobre, e a pessoa corrige.
2. **Uma pergunta.** "Me conte do seu negócio: o nome, o que ele faz, quem é
   o dono, e os sistemas que vocês usam no dia a dia (CRM, planilha, agenda,
   WhatsApp, pasta, e-mail)." Uma caixa de texto grande. Ao lado, opcionais:
   logo (arquivo), cor da marca (seletor), planta do escritório (arquivo).
3. **"Entendi assim."** O servidor manda o texto ao Claude Code sem
   ferramentas (o mesmo jeito do Cuki BOT) e recebe JSON: empresa, o que faz,
   dono, ramo (um da biblioteca de plantas), setores sugeridos pelo ramo,
   conexões com tipo. A tela mostra tudo em campos e fichas editáveis: a
   pessoa corrige ali, tira ou acrescenta. Nada é gravado ainda.
4. **O Estúdio.** Os passos de hoje (estilo, planta, tamanho, paleta,
   bonecos, mobília, movimento, tema, placas), com as três plantas do ramo e
   os setores da resposta distribuídos nas salas. A cor da marca entra na
   paleta "Da marca". O 2D aparece como prévia; o motor 2D vem por último.
5. **A senha do administrador.** Gerada e mostrada uma vez, com "copiei"
   obrigatório para seguir.
6. **Montar.** Grava, pelos módulos que já existem: `abertura.aplicar`
   (config com empresa, dono, setores, marca, `estilo`), `plataformas.criarLista`
   (conexões com variáveis vazias), `planta.gerar` (as salas da planta
   escolhida, com os setores de cada uma), a senha. O escritório recarrega com
   a marca do cliente, as faixas "N conexões precisam de você" e "nenhum
   agente ainda: contrate o primeiro".

O que sai da abertura e fica com padrão, ajustável na tela: avisos (🔔
Avisos; nascem desligados), reunião (⚙️ Ajustes; nasce manual), o agente de
exemplo (fica; demite-se em Ajustes), o primeiro agente (aba Contratar).

## A interpretação da resposta

`abertura.interpretar(texto)` devolve `{ empresa, oQueFaz, dono, ramo,
setores: [{nome, emoji, desc}], conexoes: [{nome, tipo, url}] }`.

- Com o Claude Code conectado: `claude -p` sem ferramentas, modelo sonnet,
  pedindo só JSON. Papel: extrair o que a pessoa disse, nunca inventar; ramo
  escolhido entre os da biblioteca; setores sugeridos pelo ramo (4 a 6, com
  emoji e descrição curta); conexões só as citadas, com o tipo entre os de
  `plataformas.TIPOS`.
- Sem o Claude: palavras-chave (advocacia, clínica, loja…; CRM, planilha,
  agenda, WhatsApp, Drive, e-mail) e o nome da empresa pela primeira frase.
  A tela avisa que entendeu pouco e pede para conferir.
- Nenhuma chave entra aqui: a caixa de texto avisa, e um valor que pareça
  chave (token=, chave:, sequência longa) é recusado com a mensagem "cole
  depois em 🔌 Conexões".

## A biblioteca de plantas por ramo

`plantas/<ramo>.json`: advocacia, clinica, loja, agencia, imobiliaria,
contabilidade, generico. Cada ramo tem três variações (compacta, padrão,
ampla) de salas `{ nome, tipo, tamanho, papeis: [palavras] }`. Os setores da
resposta caem na sala cujos `papeis` batem (atendimento → "Atendimento",
petições → "Petições"…); o que não bate vai para a sala de operação geral.
Toda variação tem uma **sala de descanso** (tipo `descanso`, sem arcade e sem
neon: sofás, mesa de café, planta), onde ficam os agentes desligados. O
`planta.gerar` recebe as salas da variação escolhida e grava `data/planta.json`
com `setores` por sala; `garanteEstacao` passa a dar mesa na sala do setor.

## Os bonecos

Seis famílias novas, nada parecidas com o boneco de hoje, num quadro em
`/estudio/bonecos` para o dono escolher: Traço (só linhas, como o símbolo da
marca), Blocos (formas chapadas), Miniatura (boneco de vinil, cabeça grande),
Crachá (silhueta com crachá e inicial), Núcleo (uma cápsula de luz, não
humana) e Esboço (desenho a lápis com aquarela). A escolhida entra em
`avatar.js` como família, com o mesmo contrato (`draw`, `makeLook`, `headTop`),
e vira o padrão do Estúdio; o boneco de hoje fica como "Clássico" até o dono
mandar tirar.

## A marca na tela da abertura

Fundo noite (#05080E, #0A1424, #0E1522), ciano #5FE0FB como ação, violeta e
magenta só no degradê de destaque, Outfit nos títulos e DM Sans no texto,
botões em pílula, cartões de 18px, etiqueta em caixa alta com o risco ciano.
O símbolo das três setas no canto. Depois de Montar, o escritório usa a marca
do cliente, como hoje.

## Sub-etapas, ordem e verificação

5g-1 quadro de bonecos (feito em 16/10, aguarda a escolha) → 5g-2 a abertura
na tela com o Estúdio ligado e a biblioteca de plantas (3 dias) → 5g-3 a
família escolhida no motor (1 dia) → 5g-4 faixa "contrate o primeiro",
Ajustes › Estúdio, avisos e reunião na tela (meio dia).

Verificação: a fumaça abre a abertura num escritório vazio, responde a
pergunta, confere o "Entendi assim" (sem Claude, por palavras-chave), percorre
o Estúdio, monta e vê o escritório com a marca; uma abertura real com o
Claude conectado, fotografada, antes de dar por pronta.
