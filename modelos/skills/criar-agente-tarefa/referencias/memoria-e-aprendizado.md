# Memória e aprendizado

Para VOCÊ (o guia) explicar ao aluno no passo 11 e no 18, e conferir o que o construtor propõe. A pergunta que todo aluno faz: "se cada rodada nasce sem memória, ele não fica pesado carregando tudo toda vez?". Não — porque ele não carrega tudo. Carrega o recorte.

## A imagem para o aluno

Um funcionário novo chegando de manhã não relê o arquivo inteiro da empresa. Ele lê o manual (curto), a ficha do caso que vai tratar (uma página) e o caderno de "erros que não repetimos" (uma folha). Se precisar de algo antigo, vai ao arquivo e busca. O agente funciona igual.

## As camadas

| Camada | Onde vive | Entra em toda rodada? | Tamanho típico | Quem escreve |
|---|---|---|---|---|
| Identidade | `CLAUDE.md` | sim (automático) | 1–2 mil tokens | o dono (passo 6) |
| Missão | `missao.md` (importada pelo `CLAUDE.md`) | sim | até 1 mil | o dono (passo 1) |
| Lições | `memoria/licoes.md` (importada) | sim | até 1 mil — por isso é curada | o dono aprova; o agente só propõe (passo 18) |
| Estado da entidade | `memoria/entidades/[id].md` | só o da entidade da vez | 200–500 | o lançador, após pós-verificação (passo 11) |
| Resumo das execuções | `memoria/execucoes.*` | só as últimas 5, uma linha cada | 200 | o lançador |
| Base de conhecimento | `skills/base-conhecimento/` | NÃO — sob demanda | qualquer | o dono (passos 8 e 23) |
| Histórico completo | `memoria/execucoes.*`, `saidas/` | NÃO — por `consultar_memoria` | cresce para sempre | o lançador |

Soma do que entra sempre: menos de 2% da janela do modelo. O que pesa de verdade é a ENTRADA da tarefa (um PDF de 80 páginas), e isso os leitores do passo 9 controlam (resumo por seção; completo fica para consulta).

## Três mecanismos que ajudam (e o que cada um NÃO faz)

- **Cache de prompt.** A parte fixa (identidade, missão, lições) é idêntica entre rodadas e o modelo a reaproveita: mais barato e mais rápido. Não muda o que foi carregado — só o custo.
- **Retomada de sessão.** Continua uma rodada pausada (pergunta ao dono). Não serve para "lembrar" entre entidades diferentes — para isso existe o estado por entidade.
- **Memória automática do Claude Code.** Ele mantém anotações próprias e carrega sob demanda. É genérica; para agente de produção, a memória estruturada acima funciona melhor porque o dono controla o que entra e consegue auditar.

## Regras das lições (passo 18)

1. **O agente nunca escreve em `licoes.md`.** Ele propõe em `licoes-propostas.md`; o dono aprova no painel.
2. **Formato fixo, uma linha:** `- Quando [situação concreta], então [regra]. (origem: [entidade], [data])`. Sem origem, não entra.
3. **Triagem antes de aprovar:** é jeito de agir (lição), fato do negócio (vai para a base) ou proibição que precisa valer sempre (vai para cerca no código)? Lição que na verdade é cerca não pode viver num texto.
4. **Curadoria quando passar de ~40 linhas:** fundir parecidas, promover para a base as que valem para toda entidade, apagar as que a base já cobre. Lições são o rascunho das regras; a base é o livro.
5. **Pergunta repetida é regra faltando:** se o agente faz a mesma pergunta ao dono três vezes (passo 17), a resposta vira lição ou regra da base, não mais pergunta.

## O que torna tudo isso leve na prática

A divisão que vale para o projeto inteiro, herdada do atendente de WhatsApp: **código para o garantido, modelo para o interpretado.** Estado, fila, pós-verificação e cercas são código. Decidir onde vai um arquivo com nome estranho, ou como redigir um fato, é o modelo. O modelo só recebe o recorte da rodada; o código guarda o resto. O agente que "lembra de tudo" não é o que carrega tudo — é o que sabe onde buscar.
