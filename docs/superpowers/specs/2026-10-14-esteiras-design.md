# Esteiras: agentes passando o trabalho entre si (design, 14/10/2026)

## O pedido do dono

"Criar agentes que conversam entre si e possam seguir fluxos e esteiras,
como se fosse em um escritório de verdade; exemplo: escritório de advocacia,
que vai passando as tarefas." Tem que funcionar no escritório, **sem
depender do CRM**. Decisão (14/10/2026): aprovação humana numa etapa é
**pela tela do escritório**, com aviso no celular dizendo que há algo
esperando.

## O que existe e o que falta

| Peça | Hoje | Falta |
|---|---|---|
| Recados `<mensagem para="id">` | chegam quando o agente é chamado pelo escritório (conversa, reunião, testador) | chegar também nas rodadas autônomas do lançador |
| Gatilho `POST /gatilho` no servidor do agente | existe, com `GATILHO_CHAVE` | alguém que o chame: o escritório |
| Estado da entidade (`memoria/entidades/`): nova, em andamento, aguardando aprovação, pronta, com erro, aguardando pergunta | existe em cada agente | o "pronta" de um virar o "nova" do próximo |

A esteira é a peça que liga as três. Nada muda na anatomia do agente: ele
continua tratando **uma entidade por rodada**, acordado por gatilho,
relatando `FEITO:` e `PERGUNTA:`.

## Conceitos

- **Esteira:** uma lista ordenada de etapas. Ex.: "Processo novo":
  fechamento de pasta → petição inicial → protocolo e honorários.
- **Etapa:** um agente responsável, o que ele entrega, e como a entidade
  passa adiante: sozinha quando o agente marca `pronta`, ou depois de uma
  pessoa aprovar na tela.
- **Entidade:** a coisa que anda na esteira ("processo da cliente 1"). Tem
  uma **pasta compartilhada** dentro de uma plataforma do tipo `pasta` que
  todos os agentes da esteira têm marcada. Cada agente lê o que o anterior
  deixou e grava a sua entrega em subpasta própria (`<entidade>/<etapa>/`).
  Nenhum agente edita a entrega do outro; corrige por recado.
- **Bastão:** quem passa é o escritório, nunca o agente. O agente só diz
  "pronta". O escritório chama o gatilho do próximo e deixa o recado.

## Como funciona

1. **Entrada.** Uma entidade entra na esteira por: botão na tela ("nova
   entidade"), API `POST /api/esteiras/:id/entrar`, pasta vigiada (subpasta
   nova na pasta compartilhada), ou o próprio primeiro agente (ex.: o
   atendente do WhatsApp fecha um contrato e chama a API). Nasce na etapa 1
   com status `andando`; o escritório chama o gatilho do agente 1.
2. **Vigília.** O escritório, que já vigia `/saude` dos agentes, passa a ler
   `GET /entidades` de cada agente da esteira (rota nova no servidor do
   agente, protegida pela mesma `GATILHO_CHAVE`) a cada 20 segundos.
3. **Passagem.** Quando a entidade da etapa N está `pronta` no agente N:
   - etapa sem aprovação → status `andando` na etapa N+1; gatilho do agente
     N+1 com a entidade; recado de N para N+1 ("a pasta da cliente 1 está em
     `<pasta>/<entidade>/fechamento/`; segue para você");
   - etapa com aprovação → status `aguardando aprovação`; aviso no celular
     ("tem uma petição esperando você"); na tela, botões **Aprovar** e
     **Devolver com observação**. Devolver manda a observação como recado ao
     agente N e o acorda de novo na mesma entidade (`--corrigir` já vira
     lição proposta).
4. **Paradas.** `aguardando pergunta` ou `com erro` no agente N param a
   entidade naquela etapa, não a esteira inteira. A pessoa responde pelo
   painel do agente, como hoje; o escritório vê o estado mudar e segue.
5. **Fim.** Depois da última etapa, `concluída`, com a linha do tempo
   completa (quem fez o quê, quando, com aprovação de quem).
6. **Recados nas rodadas.** O lançador (`rodar.js`), antes de rodar, busca
   `GET /api/agentes/<id>/mensagens?entregar=1` no escritório e coloca os
   recados pendentes no prompt da rodada ("RECADOS DE COLEGAS"). Com isso um
   agente pode dizer ao outro "faltou o CPF na pasta" e o outro vê na
   próxima rodada. O id do agente vem de `agente.json` (`id`, gravado pelo
   escritório ao contratar) ou da variável `AGENTE_ID` que o escritório
   passa ao subir o servidor.
7. **Na tela.** Painel **🧵 Esteiras**: uma coluna por etapa, um cartão por
   entidade, com status, há quanto tempo está ali, e os botões de aprovação.
   No isométrico, na passagem o boneco anda até a mesa do colega e entrega
   (a animação dos recados já existe).

## Onde fica cada coisa

| Coisa | Lugar | Quem escreve |
|---|---|---|
| Definição das esteiras | `data/esteiras.json` | a skill `/criar-esteira` (perguntas simples) ou a tela |
| Estado de cada entidade na esteira | `data/esteiras/<esteira>/<entidade>.json` | o servidor (`esteiras.js`) |
| Orquestração: vigília, passagem, aprovação, avisos | `esteiras.js` (módulo do servidor) | o construtor |
| Rotas | `GET /api/esteiras`, `POST /api/esteiras` (admin), `POST /api/esteiras/:id/entrar`, `POST /api/esteiras/:id/:entidade/aprovar\|devolver` (quem a etapa define), `GET /api/agentes/:id/mensagens?entregar=1` | o servidor |
| No agente: `GET /entidades` com `GATILHO_CHAVE`; `id` em `agente.json`; recados no prompt | `modelos/agente/tarefa/server.js`, `rodar.js`, `agentes.js` (contratar grava `id` e gera `GATILHO_CHAVE`) | o construtor; espelhado em `exemplo-agente/` |
| Tela | `js/esteiras.js`, botão 🧵 no topo, `css/style.css` | o construtor |

## Formato de `data/esteiras.json`

```json
{ "esteiras": [ {
  "id": "processo-novo", "nome": "Processo novo",
  "entidade": { "singular": "processo", "plural": "processos" },
  "pasta": "drive-clientes",
  "etapas": [
    { "id": "fechamento", "nome": "Fechamento de pasta", "agente": "tati", "entrega": "pasta do cliente organizada", "aprovacao": "nenhuma" },
    { "id": "peticao", "nome": "Petição inicial", "agente": "leo", "entrega": "petição em rascunho", "aprovacao": "pessoa", "aprovador": "Dra. Ana" },
    { "id": "protocolo", "nome": "Protocolo e honorários", "agente": "bia", "entrega": "guia e cobrança", "aprovacao": "nenhuma" }
  ] } ] }
```

## As perguntas da skill `/criar-esteira` (simples, com proposta pronta)

1. "Qual trabalho passa de mão em mão? Ex.: um processo novo, um pedido, um
   paciente novo." (nome da esteira e da coisa que anda)
2. "Pelo que vi, a ordem seria: Tati organiza a pasta → Léo escreve a
   petição → Bia protocola e cobra. Está certa? Falta alguém?" (as etapas; o
   escritório propõe pelos setores e pelas tarefas dos agentes)
3. "Em qual desses passos uma pessoa precisa aprovar antes de seguir? Quem?"
   (aprovação por etapa, pela tela)
4. "Em que pasta ficam os arquivos de cada processo? Uso a pasta *Drive de
   clientes* que os três já usam." (a pasta compartilhada; precisa estar
   marcada para todos)
5. "Como um processo novo entra: eu te dou um botão na tela; quer também que
   entre sozinho quando aparecer uma pasta nova lá?" (entrada)

## Cercas

- O agente nunca passa o bastão nem chama outro agente; só o escritório, por
  gatilho. Agente não tem a `GATILHO_CHAVE` dos colegas.
- Aprovar e devolver só pelo escritório, por quem a etapa define (cliente
  pode aprovar; criar e editar esteira é administrador).
- Pasta compartilhada é plataforma marcada para cada agente da esteira; sem
  a marca, o agente não enxerga a pasta (garantia por credencial, como hoje).
- Recado é dado a processar, não ordem: a regra da anatomia continua. O
  prompt do lançador diz isso ao apresentar os recados.
- Uma entidade por vez por agente; o escritório não dispara gatilho para um
  agente com rodada em andamento (fila com ordem de chegada).

## Critérios de aceite

1. Esteira de 3 etapas com agentes de teste (servidores falsos que marcam
   `pronta` após o gatilho): a entidade anda do começo ao fim sozinha, com
   recados entregues e linha do tempo gravada.
2. Etapa com aprovação para e só segue depois do `aprovar`; `devolver` acorda
   o agente anterior com a observação no prompt.
3. `aguardando pergunta` numa entidade não trava outra entidade na mesma
   esteira.
4. `rodar.js` inclui recados pendentes no prompt e eles ficam marcados como
   entregues.
5. Nada de chave no chat, no log ou na tela; `GATILHO_CHAVE` só no `.env`.
6. `npm test` com unidade (máquina de estados), API e fumaça (painel 🧵).
