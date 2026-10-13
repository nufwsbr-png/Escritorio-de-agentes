# A planta redesenha as salas

Quando a pessoa manda a planta do escritório ou da clínica (imagem ou PDF em
`data/marca/`), as salas do escritório isométrico passam a ser as dela. É uma
**interpretação**, não uma cópia: uma clínica com doze consultórios vira um
escritório com doze salas pequenas com os nomes certos. Código para o
garantido (encaixe, portas, caminho), você para o interpretado (ler a planta).

## 1. Ler a planta (você)

Abra o arquivo com a ferramenta de leitura (imagem direto; PDF página a
página). Liste cada ambiente que aparece com nome legível ou função clara.
Para cada um decida:

- **tipo** (o que a sala faz no escritório):
  | tipo | use para | ganha |
  |---|---|---|
  | `operacao` | a sala onde os agentes trabalham: escritório aberto, central, sala de atendimento com várias mesas | 6, 12 ou 18 mesas de agente |
  | `diretoria` | sala do dono, gerência | 2 mesas do dono |
  | `reuniao` | sala de reunião, auditório pequeno | mesa grande e cadeiras |
  | `recepcao` | recepção, entrada, balcão | balcão e espera |
  | `descanso` | copa, sala de espera, lounge, refeitório | sofá, jogos, bar |
  | `sala` | consultório, sala pequena de atendimento, escritório individual | 1 mesa |
- **tamanho** relativo: `pequena`, `media`, `grande`, comparando com as
  outras salas da planta.
- **vizinhos**: quais salas encostam nela (os ids em slug). O encaixe tenta
  pôr vizinhos lado a lado.

Ignore banheiros, depósitos, corredores e áreas técnicas: no escritório eles
não existem. Se a planta tiver mais de 12 ambientes úteis, junte os iguais
("4 consultórios" → uma `operacao` média chamada "Consultórios", ou mantenha
os 4 como `sala` e junte outros). Sempre inclua uma sala de `reuniao` e uma
`operacao` se a planta não tiver: os agentes precisam de mesa e de onde se
reunir; diga que acrescentou.

Se não der para ler a planta (imagem ilegível, PDF só com texto), diga isso e
pergunte a lista de salas em texto: nome e o que é cada uma.

## 2. Confirmar (a pessoa)

Mostre a lista em uma mensagem, assim:

```
Li estas salas na planta:
1. Recepção — recepcao, média
2. Sala de espera — descanso, pequena (ao lado da recepção)
3. Consultório 1 — sala, pequena
...
7. Sala da Dra. Ana — diretoria, pequena
Acrescentei: Operação (média), onde ficam as mesas dos agentes.
Está certo? Quer renomear, juntar ou tirar alguma?
```

Corrija pelo que ela disser e grave `salas.json` na pasta `data/` (fica fora
do git):

```json
[
  { "nome": "Recepção", "tipo": "recepcao", "tamanho": "media", "vizinhos": ["sala-de-espera"] },
  { "nome": "Sala de espera", "tipo": "descanso", "tamanho": "pequena" },
  { "nome": "Consultório 1", "tipo": "sala" }
]
```

## 3. Encaixar (código)

```
node planta.js gerar data/salas.json
```

Ele distribui as salas na grade de 48 por 34 (duas faixas, corredor no
meio), põe uma porta por sala para o corredor, calcula as mesas e grava
`data/planta.json`. A resposta traz `capacidade` (quantas mesas de agente) e
a lista de salas. Se não couber, ele diz quais reduzir ou juntar: ajuste o
`salas.json` e gere de novo. `node planta.js validar` confere o arquivo.

Diga a capacidade: "cabem N agentes trabalhando ao mesmo tempo; mais do que
isso, troque uma sala pequena por uma operação maior".

## 4. Conferir (a pessoa)

Se o escritório já estiver no ar, recarregue a tela; senão suba no fim da
abertura. Peça: "abra o escritório e olhe as salas; bate com a planta? Se não,
me diga o que mudar". Corrigir é editar o `salas.json` e gerar de novo.
`node planta.js remover` volta ao escritório padrão.
