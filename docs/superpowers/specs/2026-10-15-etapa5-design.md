# Etapa 5: o escritório montado pelo nicho, leve, com o trabalho real à vista

## Contexto

O dono olhou um escritório entregue (Furtado, advocacia) e viu que ele nasce
como um "escritório de games": sala de jogos com arcades e neon GAME ZONE,
bonecos que nunca param, paleta fixa, nada decidido pelo ramo do cliente. A
tela pesa no localhost. O clique no agente mostra uma "situação" manual
(Trabalhando, Descanso) que não tem relação com o que o agente está fazendo.
Plataformas não dizem se estão conectadas. Pastas do computador não têm
seletor nem permissão clara. Não há bot que procure falhas no escritório
depois de criado. E a pessoa nunca escolhe o estilo antes de montar.

O que o código faz hoje (levantado em 15/10/2026, com arquivo:linha):

| Ponto | Hoje |
|---|---|
| Salas | 5 fixas em `js/world.js:24-63`: diretoria, serviço, **Jogos & Descanso** (3 arcades, sinuca, pebolim, neon GAME ZONE em `js/furniture.js:98-140`), reunião, corredor. A planta do cliente (`planta.js`) troca as salas, mas toda sala `descanso` ganha o neon GAME ZONE (`furniture.js:256`). |
| Setor → sala | **Não existe.** O setor só muda a cor do boneco (`js/roster.js:60-70`). A sala vem da "situação" do agente (`js/app.js:126-142`); a mesa é a primeira livre em ordem de id (`app.js:379-393`). O campo `dept` é gravado e nunca lido. |
| Movimento | `requestAnimationFrame` sem limite (`app.js:452-530`), tela inteira redesenhada por quadro, sem `visibilitychange`. Bonecos em descanso trocam de lugar a cada 11 a 27 s (`app.js:278`); mesmo parados respiram e balançam (`avatar.js:74-80`, "nunca fica totalmente parado"). Não há modo parado nem econômico. |
| Tema | Cor do cliente só pinta os painéis HTML (`app.js:1632-1647`). A cena tem ~134 cores fixas em `furniture.js`, mais `world.js` e `avatar.js`. Nenhum estilo, paleta ou tamanho configurável. |
| Clique no agente | Abre a **ficha do boneco** (`app.js:798-893`): situação manual, horário, "sortear aparência". O monitor (`app.js:1220-1335`) mostra luz "no ar/desligado" (só um TCP na porta, `server.js:464`), botões e o painel do agente num iframe. **O escritório não lê `/saude` nem `/entidades` para o monitor**; só as esteiras leem `/entidades`. |
| O agente expõe | `GET /entidades` (`modelos/agente/tarefa/server.js:156-161`) com status por entidade: nova, em andamento, aguardando pergunta, aguardando aprovação, pronta, com erro, com o dono. Estado em `memoria/entidades/*.json`. Não há "fila" como status; a fila real é das esteiras (`esteiras.js:27`). |
| Pastas | Plataforma tipo `pasta` → `PASTAS_AUTORIZADAS` no `.env` → cerca de `tools/base.js:24-30`. Caminho digitado num campo de senha (`js/plataformas.js:75-76`). **Sem seletor.** Nas rodadas a pasta não entra como `--add-dir` (só no Ensinar, `server.js:725`). |
| Plataformas conectadas | **Sem botão Testar, sem estado na tela** (`js/plataformas.js:28-64` mostra só nomes). O único teste é o do Cuki BOT no laudo (`cuki.js:92-115`: GET sem token, 401 conta como "responde"; planilha/agenda/banco/whatsapp/email "sem teste automático"), e o cartão da tela fica sem texto (`cuki.js:244`). Ninguém avisa "você ainda não conectou X". |
| Bots de teste | `testes/fumaca.js` confere elementos e erros de JS; a foto só é gravada com `FUMACA_FOTO` e nunca é analisada. `testador.js` testa agentes, não o escritório. |
| Escolha de estilo | Não existe. A abertura pergunta só a cor `#RRGGBB` (`referencias/perguntas.md:60-61`). |

Achado extra: no molde do agente, o primeiro `POST /acao` (`tarefa/server.js:168`) pega todo POST e exige `x-chave`, o que parece deixar o `/acao` do painel do dono (`:190`) inalcançável. Confirmar e corrigir dentro da 5c.

## O que entendi do pedido, em uma linha cada

1. O escritório tem que nascer do **nicho**: as salas, os setores em cada sala, o visual. Sem sala de jogos por padrão. Minimalista. Decidido **antes** de montar.
2. Bonecos **parados** por padrão; a tela **leve**.
3. Clique no agente = **o que ele está fazendo agora**; o sistema dele = **tudo que um chefe quer ver**: tarefas, fila, esperando resposta, esperando aprovação, erros, últimas rodadas.
4. **Pastas do computador** com seletor e permissão por agente.
5. **Plataformas** com estado visível (conectada, sem chave, falhou), teste, e aviso durante a abertura e a contratação.
6. **Bots de teste** do escritório depois de criado (visual e funcionamento).
7. **Estúdio de escolhas** antes de montar: estilo (isométrico atual ou 2D como nas fotos), 3 plantas pelo nicho, 3 tamanhos, 3 paletas, 3 famílias de avatar, num link para a pessoa escolher. Primeiro um exemplo para o dono aprovar o formato.

## Soluções propostas (sub-etapas, com ok do dono entre elas)

### 5a. Estúdio: a pessoa escolhe antes de montar (começa pelo exemplo)

- **Primeiro entregável: o link de exemplo** `http://localhost:4321/estudio`, com dados fictícios (advocacia), só para o dono aprovar o formato. Página estática em `estudio/` servida pelo escritório; sem gravar nada.
- Formato: uma trilha de cartões, um passo por vez, com **prévia real** desenhada pelo próprio motor (não imagem): 1 Estilo (isométrico | 2D de cima, como as fotos) → 2 Planta pelo nicho (3 opções: compacta, padrão, ampla; salas nomeadas pelos setores do ramo) → 3 Tamanho das salas e densidade de mesas (3) → 4 Paleta (3: sóbria, clara, marca) → 5 Avatares (3 famílias: realista sóbrio, cartum, pictograma) → 6 Resumo e "Montar".
- Recomendações a mais, para o dono decidir se entram: **mobília** (minimalista | aconchegante | corporativo), **movimento** (parado | calmo | vivo), **claro/escuro**, **letreiro** (nome na parede ou só na placa), **rótulos das salas** (setor | nome livre).
- Depois do ok: a skill `/criar-escritorio` ganha a pergunta "Estúdio" entre a 4 (marca) e a 5 (senha): abre o link com as 3 variações **geradas das respostas já dadas** (ramo, setores, plantas) e espera a escolha; `abertura.js aplicar` grava `estilo` em `data/config.json` (`{motor, planta, tamanho, paleta, avatares, mobilia, movimento}`). Quem já tem escritório abre o Estúdio por ⚙️ Ajustes e troca.
- Escopo do 2D: um **renderizador alternativo** (`js/render-2d.js`) sobre o mesmo `WORLD`, `FURN` e `ROSTER`: salas em grade vista de cima, mesas e bonecos como nas fotos, balões e placas. O isométrico continua. É a parte mais cara da etapa (estimo 2 a 3 dias só dele).

### 5b. Planta pelo nicho, setor → sala, sem sala de jogos

- **Biblioteca de plantas por ramo** em `plantas/<ramo>.json` (advocacia, clínica, loja, agência, imobiliária, contabilidade, genérico): salas, tipo, tamanho, e **quais setores moram em cada sala**. A skill propõe pela pergunta 1 e a pessoa ajusta; o Estúdio mostra as 3 variações.
- Padrão sem sala de descanso. `descanso` vira opcional e, se existir, é **sala de espera/copa**, sem arcade nem neon (`furniture.js:256` e `layoutPadrao`).
- Setor → sala de verdade: `garanteEstacao` passa a dar mesa na sala do setor (`dept`), com fallback na sala de serviço. Placa da sala = nome dado na planta.
- Mobília minimalista por padrão (mesa, cadeira, monitor, uma planta por sala), com as outras variações do Estúdio.

### 5c. Leve e parado; o boneco mostra o trabalho real

- **Movimento "parado" por padrão**: boneco na mesa, sem passeio, sem troca de lugar em descanso, respiração desligada. Anda só por evento real: recado, reunião, mudança de estado. Modos "calmo" (respiração e café raros) e "vivo" (o de hoje) no Estúdio.
- **Desenho sob demanda**: redesenha só quando algo mudou (câmera, estado, animação ativa); teto de 20 fps quando anima; zero quando a aba está escondida (`visibilitychange`). Piso, brilhos e rótulos também respeitam o enquadramento. Meta: CPU perto de zero com a tela parada. Medir com o contador que já existe (`app.js:519-527`).
- **Estado real do agente**: o escritório passa a ler `GET /saude` e `GET /entidades` (com `GATILHO_CHAVE`, que ele já lê do `.env`) a cada 10 s e expõe em `/api/sistemas` um bloco `trabalho`: `{agora, fila, esperandoVoce, esperandoAprovacao, comErro, prontasHoje, ultimaRodada}`. A "situação" do boneco **deriva disso**: trabalhando (em andamento), esperando você (pergunta ou aprovação, balão amarelo), ocioso (nada na fila), fora do ar. A situação manual sai da ficha (fica só "fora do ar" como ordem).
- **Clique no boneco**: o popup passa a ser o estado real: "Agora: rodando a entidade X há 2 min", "3 na fila · 1 esperando sua resposta · 2 esperando aprovação", última rodada, botão "Abrir o sistema".
- **Monitor**: ganha a aba **Trabalho** (primeira): fila, perguntas pendentes com responder, aprovações com aprovar/devolver, erros, rodadas do dia com duração e resultado, o que ele produziu (`saidas/`), lições propostas. Tudo lido do agente pelas rotas que já existem (`/entidades`, `/acao` do painel). Ficha do agente (constituição), Memória, Recados, Propostas e Plataformas continuam.
- Corrigir o `/acao` duplicado no molde (ver achado extra) e espelhar em `exemplo-agente/`.

### 5d. Pastas do computador

- **📁 Pastas** como cadastro próprio no escritório (continua sendo plataforma tipo `pasta` por baixo, para não quebrar o `.env`): nome, caminho escolhido num **navegador de pastas na tela** (o servidor lista o disco, só localhost), permissão **ler** ou **ler e escrever**, e teste (existe, dá para escrever).
- Permissão por agente na contratação e no 🔌 do monitor; o `.env` ganha `PASTAS_AUTORIZADAS` e `PASTAS_ESCRITA`; `tools/base.js` respeita escrita só nas de escrita; a rodada passa as pastas como `--add-dir` (como o Ensinar já faz).
- No monitor, aba Trabalho mostra as pastas do agente e os arquivos que ele gravou nelas na última rodada.

### 5e. Plataformas: conectada ou não, e aviso

- **Teste por tipo** em `plataformas.js` (`testar(id)`): api (GET com o token no cabeçalho; 2xx conectada, 401/403 chave errada, sem resposta falhou), pasta (existe e escrevível), banco Supabase (`/rest/v1/` com apikey), whatsapp WAHA (`/api/sessions`), mcp (sobe o comando e lista as ferramentas), planilha/agenda Google (chamada mínima se houver credencial; senão "precisa conectar"), email (login SMTP/IMAP), link/navegador (GET). Resultado gravado em `data/plataformas.json` (`estado`, `motivo`, `testadoEm`), nunca o valor.
- **Tela**: 🟢 conectada · 🟡 sem chave · 🔴 falhou (motivo, hora) em cada plataforma, botão **Testar** e **Testar todas**; faixa no topo "2 plataformas sem conexão" para o administrador; no contratar, 🔴 ao lado da plataforma sem chave; no monitor, as do agente com estado.
- **Abertura**: a skill termina com a lista "conectar agora" (as que ficaram sem chave) e o link do 🔌. O Cuki BOT passa a usar o mesmo `testar` e o cartão da tela mostra o motivo.

### 5f. Inspetor: bots que procuram falhas no escritório

- **🔍 Inspetor** (botão do administrador e `node inspetor.js`): sobe o Chrome sem janela contra o escritório **real** (só leitura), abre cada tela (escritório, monitor de cada agente, Plataformas, Esteiras, Cuki, CRM se houver) em 3 larguras, e junta: erros de JS e de rede, rotas que respondem erro, **fotos analisadas pelo Claude com visão** (texto cortado, sobreposição, contraste, rótulo errado, sala vazia), links quebrados, plataformas sem conexão, agentes fora do ar. Laudo em `data/inspecoes/<data>.md` com semáforo, igual ao do Cuki; avisa pelo canal de avisos.
- Roda sob demanda, no fim da abertura, e depois de cada "Atualizar o escritório".

## Decididas pelo dono (15/10/2026)

- Estúdio em **trilha, um passo por vez** (3 cartões com prévia desenhada pelo motor, Voltar/Avançar, resumo e Montar).
- Entram como passos extras: **mobília** (minimalista | aconchegante | corporativo), **movimento** (parado | calmo | vivo), **claro ou escuro**, **rótulos das salas** (setor | nome livre).
- O **2D entra por último**, como opção de estilo; até lá o Estúdio mostra o 2D como prévia estática.
- Depois do exemplo aprovado, começar por **5c** (leve + estado real do agente).

## Ordem e custo

5a exemplo (meio dia; primeiro entregável, para o dono aprovar o formato) → 5c (2 dias) → 5e (1 dia) → 5b (1 a 2 dias) → 5a completo na skill (1 dia) → 5d (1 dia) → 5f (1 dia) → 2D (3 dias). Entre cada uma: `npm test`, verificação real, relato em `verificacoes/`, linha no plano mestre, ok do dono. Tudo registrado no plano mestre como etapa 5 no primeiro commit.

## Verificação

- Cada sub-etapa: testes de unidade/API novos; a fumaça ganha cenários (Estúdio, aba Trabalho, Pastas, estado das plataformas, Inspetor); foto da tela conferida.
- Leveza: medir fps e tempo de desenho antes e depois com o contador existente, tela parada e com reunião.
- Estado real: subir um agente copiado, disparar rodadas e conferir que popup e aba Trabalho batem com `/entidades`.
- No fim: refazer um escritório de advocacia do zero pelo `/criar-escritorio` com o Estúdio, e rodar o Inspetor.
