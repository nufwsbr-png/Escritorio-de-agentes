# Verificação: 5g-2, a abertura na tela (16/10/2026)

Como foi: um escritório de teste vazio (só o registro do exemplo, sem
`config.json`), com o Claude Code desligado para a interpretação
(`ESCRITORIO_ABERTURA_SEM_CLAUDE=1`, ou seja, por palavras-chave). O Chrome
sem janela abriu a raiz, foi levado para `/abertura`, respondeu a pergunta
como a Furtado Advocacia, conferiu o "Entendi assim", percorreu o Estúdio,
montou e abriu o escritório. Cada etapa fotografada e conferida. Depois os
testes automáticos inteiros.

## O que ficou provado

- **Sem configuração, a raiz leva para a abertura.** `/` → 302 `/abertura`;
  `/?tela=1` abre a tela mesmo assim (a fumaça e quem quiser ver o exemplo).
- **Boas-vindas** com a marca NuFws (Outfit e DM Sans, fundo noite, ciano
  como ação, o símbolo das três setas), a linha do Claude Code (conectado,
  sem login ou não encontrado, com o que fazer) e o aviso quando o
  escritório já foi aberto (refazer exige administrador).
- **Uma pergunta só.** A caixa de texto com o exemplo escrito dentro; logo,
  cor e planta opcionais ao lado (o logo vai para `data/marca/` pela rota
  `/api/abertura/marca`, até 4 MB; a planta fica guardada para o Claude Code
  ler pela skill). Texto curto é recusado; texto com cara de chave também.
- **"Entendi assim"** por palavras-chave acertou: empresa "Furtado
  Advocacia", dono "Dr. Anderson Furtado", ramo advocacia, cinco setores do
  ramo, cinco conexões com o tipo certo (WhatsApp, Planilha Google, Agenda
  Google, OneDrive, PJe). Tudo editável: fichas de setor com ✕ e "＋ setor",
  conexões com nome, tipo e ✕, "usar os sugeridos do ramo". Quando entende
  por palavras-chave, avisa para conferir com atenção.
- **O Estúdio dentro da abertura**: a trilha de 10 passos com as três
  plantas da advocacia (os setores da pessoa nas salas; a sala de descanso
  em todas), a paleta "da marca" com a cor escolhida, a roupa dos agentes
  em pixel art (sugerida executivo para advocacia), mobília, movimento,
  tema, placas e o resumo com "Montar o escritório" ligado.
- **Montar grava tudo de uma vez**: `config.json` com empresa, dono,
  setores, marca, `ramo` e `estilo`; `planta.json` da variação escolhida com
  `setores` por sala; `plataformas.json` com as cinco conexões e variáveis
  vazias; `admin.json` com o hash da senha. A senha aparece uma vez, com
  "Copiar" e a caixa "guardei" que libera "Abrir o escritório". Quem montou
  já entra como administrador (cookie na resposta).
- **A tela abre com o escritório montado**: "Escritório da Furtado
  Advocacia", as 7 salas da planta padrão (atendimento e captação, pastas e
  petições, financeiro, diretoria, reunião, recepção, sala de descanso), o
  dono "Dr. Anderson Furtado" na diretoria, 32 mesas.
- **Refazer exige administrador**: com o escritório aberto, `/api/abertura/montar`
  sem sessão devolve 403; com a sessão de quem montou, grava e não devolve
  a senha de novo. O estado (`/api/abertura/estado`) é livre e não leva o
  e-mail da conta do Claude sem administrador.
- **O exemplo do Estúdio** (`/estudio`) continua, agora com as plantas da
  biblioteca e os bonecos em pixel art.
- Nenhum erro de JavaScript em nenhuma etapa.

## O que entrou junto (a antiga 5b)

- `plantas/<ramo>.json`: sete ramos, três variações cada, todas cabendo na
  grade do `planta.js` com os setores sugeridos distribuídos (21 variações
  provadas no teste de unidade). Sala de descanso obrigatória.
- `planta.js` guarda `setores` por sala; a tela dá a mesa do agente na sala
  do setor dele (`garanteEstacao`), com a primeira livre como reserva.
- A sala de descanso da planta ficou sem arcade, sinuca, puff e neon:
  sofás, copa e plantas.

## 5g-3 e 5g-4, no mesmo dia

- **O boneco em pixel art entrou na cena** (`avatar.js` desenha com
  `boneco-pixel.js`; a roupa vem de `estilo.roupa`; cabelo, pele, óculos,
  barba e cor continuam da aparência de cada agente). Fotos de perto: o
  dono de terno na mesa da diretoria, os agentes nas mesas, os retratos na
  lista da equipe. O desenho antigo ficou só como reserva (`drawClassico`).
- **Setor vira sala de verdade**: num escritório com a planta da advocacia,
  Tati (financeiro) ganhou mesa na sala Financeiro e Léo (petições) em
  Pastas e petições, sem ninguém escolher.
- **A faixa no topo** passou a ter dois estados: sem configuração, "ainda
  não foi aberto" com o link `/abertura`; aberto e sem agente contratado,
  "Nenhum agente ainda. Contrate o primeiro na aba Contratar", com o link
  que abre o Contratar. Some quando o primeiro agente de trilha existe.
- **⚙️ Ajustes** ganhou o botão "🎨 Estúdio · refazer a abertura", que abre
  `/abertura` (administrador). Avisos e reunião continuam em 🔔 Avisos e
  nos Ajustes, com padrão.

## 5g-5 e 5g-6, à tarde: o acabamento que o dono pediu olhando a tela

- **A cena**: as divisórias de vidro que subiam até o teto (as "paredes" no
  zoom) saíram; entre salas fica só o parapeito. Os objetos (LED das mesas,
  plantas, painéis) animam sempre a 12 fps, mesmo no movimento "parado", que
  passou a ser só dos bonecos (1,3 ms por quadro medidos). O boneco sentado
  fica com o quadril no assento, de costas mostra cabelo e pescoço, e o
  encosto das cadeiras desceu para os ombros. Fotos de perto antes e depois
  (mesa de costas, mesa vazia, mesa do dono).
- **Abertura**: a linha "Claude Code conectado" some quando está tudo certo.
- **Textos das caixas** um pouco maiores.
- **As variações de telas** em `/estudio/telas.html`: seis quadros, fotografados
  um a um, sem erro de JS; o dono escolheu **Compacto**.
- **O tema Compacto na tela**: fotografados a tela com o rótulo "Conexões"
  aparecendo em baixo do ícone ao passar o mouse, o monitor do exemplo com a
  barra de 46 px e a caixa de Conexões. Fontes conferidas por
  `getComputedStyle` (DM Sans), topo com 46 px, 12 ícones em traço na barra.
  A fumaça ganhou a checagem do tema (ícones nas duas barras, `data-rotulo`,
  Admin com a palavra).

## 5g-7 e 5g-8: a cadeira, a barra maior, as duas páginas de escolha, os Blocos

- **A cadeira das mesas**: a tentativa em pixel art foi recusada pelo dono
  ("ficou horrível; eu queria apenas que corrigisse a sobreposição"). A de
  voxel voltou, desenhada sozinha num quadro para enxergar o defeito (as
  fatias do encosto e dos braços pintadas fora de ordem, desmontadas), e
  reescrita com peças inteiras de trás para a frente. Fotos de perto (zoom
  4): Bia sentada de costas (o encosto na frente, até os ombros, a cabeça
  livre), a mesa vazia com a cadeira inteira, a dona de frente na diretoria.
- **Os bonecos em Blocos** na cena: fotografados de costas na mesa, de
  frente na diretoria, nos cartões da equipe e na tela inteira; sólidos, sem
  contorno. Nenhum erro de JS.
- **A barra do topo** com 54 px e os contadores com a palavra.
- **As páginas de escolha** fotografadas quadro a quadro, sem erro de JS:
  três painéis do agente e quatro famílias de boneco na cena.

## 5g-9: o painel do agente em abas

- O exemplo do repositório subiu numa porta livre (4477; o 4401 é o exemplo
  do escritório real do dono e não foi tocado) e o painel novo foi
  fotografado: abre em "Agora" quando não há pendência, as sete abas com os
  números, a coluna da direita com "Rodar um caso", Confiança e A ficha; o
  clique troca a aba e grava o `#` na URL; recarregando em `#regras` volta
  em Regras, com a constituição no editor. Nenhum erro de JS. O exemplo
  continua espelhando o molde (`diff` vazio).

## O que fica

- A interpretação por palavras-chave pega o "o que faz" da primeira frase;
  com o Claude Code conectado a leitura é do modelo (provada na linha de
  comando, abaixo). A planta mandada pela tela é guardada, não lida.
- A abertura real completa, com o Claude conectado e fotografada, entra na
  verificação final da etapa 5.

## Testes que cobrem

- `testes/unidade/ramos.test.js`: biblioteca, 21 variações na grade,
  detectar o ramo, distribuir setores.
- `testes/unidade/abertura-tela.test.js`: interpretar por palavras-chave
  (empresa, dono, ramo, conexões; recusa de chave e de texto curto),
  montar (config, estilo saneado, planta com setores, conexões sem
  duplicar, senha uma vez), salvarMarca.
- `testes/api/abertura.api.test.js`: raiz → `/abertura`, estado, interpretar,
  montar com cookie, refazer só com administrador, `/config.js` e
  `/api/setores` com o negócio.
- `testes/fumaca.js`: cenário 1 por `/?tela=1`; cenário 4 com o motor do
  Estúdio; cenário 5, a abertura de ponta a ponta até a tela com o nome da
  clínica, as 8 salas e o administrador logado.
- `npm test`: 82 testes, conferidor ok, fumaça ok.

## A leitura pelo Claude Code, de verdade (linha de comando)

`node abertura.js interpretar descricao.txt` com o Claude conectado, para
"Clínica Vida Leve, nutrição e estética em Florianópolis, dona Dra. Paula
Mendes, WhatsApp, Google Agenda, planilha do Google, pasta do Google Drive;
agentes para agendamento e confirmação, pós-consulta, faturamento e
conteúdo nas redes": origem `claude`, empresa e dona certas, "o que faz" em
uma frase limpa, ramo clínica, os quatro setores pedidos com os nomes da
pessoa mais dois sugeridos (Atendimento, Prontuários), as quatro conexões
com o tipo certo, roupa sugerida jaleco. Nenhum sistema inventado.

## 5g-5, o acabamento da tarde (fotos de perto)

Como foi: um escritório de teste com a planta genérica, seis agentes
contratados pela tela, o Chrome sem janela fotografando a mesma mesa a 2,6x
e 3,6x antes e depois de cada mudança.

- **Paredes no zoom**: antes, as divisórias entre salas tinham um vidro fumê
  do parapeito até o teto que, de perto, parecia uma caixa alta dentro da
  sala (com as linhas de contorno). Depois: só o parapeito baixo; as salas
  ficam abertas. As paredes externas altas, com as placas, continuam.
- **Objetos animam**: o contador passou de "parado · a tela só redesenha
  quando algo muda" para "parado · bonecos quietos, objetos animam · desenho
  1,3 ms". A 12 quadros por segundo com 1,3 ms de desenho, a tela gasta perto
  de 2% de um núcleo; a aba escondida continua sem desenhar; câmera e boneco
  andando sobem para 24.
- **Sentado na cadeira**: antes, o boneco afundava (os pés no chão, o quadril
  abaixo do assento) e, de costas, o encosto escondia a cabeça inteira: na
  mesa do EXEMPLO só se via a etiqueta. Depois: o quadril no assento, o
  encosto na altura dos ombros, a cabeça e os ombros aparecendo acima dele;
  de costas (mesas viradas para a parede) o boneco mostra o cabelo e o
  pescoço, não o rosto. Na mesa da diretoria (de frente), o dono entre os
  dois monitores, como antes.
- **Textos maiores** nas caixas: a dica de 12,5 para 13,5 px, o título da
  caixa de 18 para 20 px, a descrição de 13 para 14 px, os itens de Conexões
  de 13 para 14 px.
- **A linha do Claude Code** na boas-vindas some quando está tudo certo; os
  avisos de "sem login" e "não encontrado" ficam.
- **O quadro de telas** (`/estudio/telas.html`): seis variações, todas com a
  barra do escritório completa (10 botões), a barra do monitor (13), a caixa
  de Conexões e as peças; nenhum erro de JavaScript; as barras cabem em
  1.680 px sem espremer a marca nem o nome do agente; "Escolher este" marca
  o quadro e mostra a linha para dizer no chat.
- `npm test` inteiro depois de tudo (a fumaça confere o contador "parado",
  a linha do Claude escondida quando conectado e as páginas do Estúdio).
