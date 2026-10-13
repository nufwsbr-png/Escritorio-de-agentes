# Progresso do agente Exemplo (agente de tarefa)
Setor: Agente de demonstração · Negócio: Escritório de Agentes
Tarefa em uma frase: ler o pedido de um cliente em texto e produzir um resumo padronizado para a equipe
Entidade (a unidade de trabalho): um pedido, na pasta `amostras/caso-NN/` ou numa pasta de cliente
Módulos de ferramenta escolhidos: arquivos
Modo atual do gatilho: ensaio · aprovações seguidas: 0

Cada linha é um componente da ANATOMIA.md, com teste no fim. Marque `[x]` só com o teste provado.

- [x] 1. Missão — OBJETIVO de `prompt-agente.md` e seções 2, 3 e 5 da constituição preenchidos (este agente é a demonstração; o dono aqui é quem instala o escritório)
- [x] 2. Conexões — módulo `arquivos`, sem credencial; escopo interno (`amostras/`, `saidas/`), nada fora desta pasta
- [x] 3. Amostras — `amostras/caso-01/` com `entrada/pedido.txt` e `esperado.md`
- [x] 4. Bancada — `node rodar.js amostras/caso-01` em ensaio produz o plano em `saidas/amostras-caso-01/plano.md`
- [x] 5. Identidade — o plano fala como o Exemplo e cita a missão
- [x] 6. Constituição — o plano segue as cinco seções da seção 6 e marca `[conferir]` no que o pedido não traz
- [x] 7. Leitores de entrada — não se aplica: a entrada é texto puro (voltar aqui se um dia chegar PDF ou áudio)
- [x] 8. Ferramentas com cerca — `tools/arquivos.js` (listar, ler, mover, escrever) com modo, escopo, quarentena e sem sobrescrever
- [x] 9. Memória — estado por entidade em `memoria/entidades/`, registro em `memoria/execucoes.log`; caso `pronta` não é refeito
- [x] 10. PORTÃO — o caso-01 bate com o `esperado.md` nas duas réguas (demonstração; agentes contratados precisam de 5 a 10 casos)
- [x] 11. Gatilho e fila — manual: o botão do painel e `POST /gatilho` com `GATILHO_CHAVE`; uma entidade por vez
- [x] 12. Cercas — `cercas.json` passado pelo lançador, `LIMITE_MINUTOS`, `LIMITE_RODADAS_DIA`, dois interruptores do real; instrução plantada é tratada como dado (seção 7 da constituição)
- [x] 13. Primeiras entidades em PROPOSTA — o painel aprova ou rejeita; 10 aprovações seguidas liberam o real
- [x] 14. Painel — fila, entidades, rodadas, perguntas com retomada, assumir e devolver, lições, constituição editável
- [x] 15. Avisos — o lançador avisa o escritório em `com erro` e `aguardando pergunta`
- [x] 16. Testador — pelo botão 🧪 Testar do monitor do escritório (gera casos a partir de `amostras/`)
- [x] 17. Tranca e entrega — `PAINEL_SENHA` vazio de propósito neste exemplo (roda só em 127.0.0.1, dentro do escritório); defina-a em qualquer agente real

## Anotações
- Este é o agente que vem com todo escritório novo. Serve de molde: a pasta tem a anatomia padrão que os agentes contratados recebem.
- Para ver a construção do zero, contrate um agente novo na aba Contratar.

## Registro do que foi executado
- 13/10/2026 — pasta criada pelo escritório na anatomia padrão; caso-01 rodado em ensaio como demonstração.

## CONCLUÍDO em 13/10/2026
