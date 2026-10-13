# tools/ — as mãos do agente

Aqui fica o código de cada ação que o agente executa: ler a planilha, consultar
o CRM, gravar um arquivo, conferir uma pasta. Uma ação por arquivo, com o nome
EXATO que aparece na seção "Ferramentas" de `prompt-agente.md`.

Regra de ouro: **código para o garantido, IA para o interpretado.** O que
precisa ser verdade (gravou? existe? bateu com a regra?) é código aqui; o que
precisa ser entendido (o que o dono quis, o que o texto diz) é o modelo.

Toda execução registra uma linha em `log.txt` com data e resultado.
