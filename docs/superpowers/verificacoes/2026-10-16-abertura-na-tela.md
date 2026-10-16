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
