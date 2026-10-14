# tools/ — as mãos do agente, com a cerca dentro

Aqui fica o código de cada ação que o agente executa: mover um arquivo,
gravar uma linha na planilha, criar um evento, consultar o CRM. Uma ação por
arquivo, com o nome EXATO que aparece na seção "Ferramentas" de
`prompt-agente.md`. O agente chama assim: `node tools/<nome>.js <argumentos>`,
e a ferramenta responde uma linha de JSON.

Regra de ouro: **código para o garantido, IA para o interpretado.** O que
precisa ser verdade (gravou? existe? bateu com a regra?) é código aqui; o que
precisa ser entendido (o que o dono quis, o que o texto diz) é o modelo.

Toda ferramenta usa `base.js` e obedece a cinco regras:

1. **Respeita o modo da rodada** (`base.modo()`): em ensaio não executa,
   registra o que faria; em proposta escreve em `saidas/<entidade>/proposta/`;
   em real escreve no alvo.
2. **Só opera dentro do escopo** do `.env` (`base.dentroDoEscopo`): pastas,
   planilhas, agendas, URLs e tabelas listadas lá. Fora disso, recusa.
3. **Nunca apaga, nunca sobrescreve** (`base.quarentena`, `base.semSobrescrever`).
4. **Devolve resultado claro** (`base.resultado('feito' | 'recusado' | 'erro', detalhe)`).
5. **Registra uma linha no log** (`base.registrar`).

`crm.js` fala com o CRM do escritório (a ficha do cliente): só com a
plataforma `crm` permitida; o CRM pode transformar o pedido em proposta para
uma pessoa decidir, e recusa quando a ficha está com uma pessoa.

`arquivos.js` é a primeira ferramenta, pronta: listar, ler, mover e escrever
dentro das pastas autorizadas. Copie o padrão dela para as próximas. O
catálogo de módulos (WhatsApp, navegador, sistema com API, documentos,
planilhas, e-mail, banco, agenda) está na skill de referência, em
`.claude/skills/criar-agente-tarefa/referencias/modulos.md`.
