# As dez perguntas da abertura

Para cada uma: o que ler antes · o texto da pergunta · o que gravar · como.
`atual` é o resultado de `node abertura.js atual`. Quando o escritório já
foi aberto, mostre o valor atual dentro da pergunta ("hoje está X; mantém?").

## 1 de 10 — O negócio

**Leia antes:** `atual.empresa`, `atual.dono`, `atual.oQueFaz`.

**Pergunte:** "Vamos abrir o escritório. Primeiro, o negócio: qual é o nome
da empresa, o que ela faz em uma frase, e como se chama a pessoa dona?"

**Grave:** `{ "empresa", "oQueFaz", "dono" }` → `node abertura.js aplicar respostas.json`.
O script monta `nome` = "Escritório da <empresa>" e o subtítulo.

## 2 de 10 — Os setores

**Leia antes:** `atual.setores`. Pelo ramo que a pessoa descreveu, monte uma
sugestão de 4 a 6 setores (ex.: clínica → Recepção, Agendamento, Faturamento,
Marketing; escritório de advocacia → Atendimento, Fechamento de pasta,
Petições, Financeiro, Prospecção; loja → Vendas, Estoque, Atendimento,
Conteúdo). Cada setor vira uma opção na aba Contratar, para agentes de tarefa.

**Pergunte:** "Esses são os setores que eu sugiro para <empresa>: [lista].
Quais ficam? Quer tirar ou acrescentar algum?" (uma pergunta; a pessoa
responde em texto livre e você interpreta.)

**Grave:** `{ "setores": [{ "nome", "emoji", "desc" }] }` → `node abertura.js aplicar`.
Emoji e descrição curta são seus; o nome é o da pessoa. Lista vazia = os
padrões do escritório.

## 3 de 10 — As plataformas

**Leia antes:** `atual.plataformas` e `node plataformas.js tipos`.

**Pergunte:** "Quais sistemas a empresa usa no dia a dia? Pode listar do seu
jeito: CRM, planilha, agenda, pasta no OneDrive ou Drive, WhatsApp, e-mail,
site, sistema interno. Se souber o endereço de cada um, melhor."

**Grave:** para cada sistema, `{ "nome", "tipo", "url" }` numa lista →
`node plataformas.js criar lista.json`. Escolha o tipo pelo que a pessoa
disse (`api` para CRM e sistemas com integração; `planilha`; `agenda`;
`pasta`; `whatsapp`; `email`; `banco`; `navegador` para sistema sem API que se
usa pela tela; `link` para site ou referência). As variáveis nascem vazias.

**Diga depois:** "Cadastrei <n> plataformas. As chaves e caminhos entram pela
tela, como administrador: botão 🔌 Plataformas. Nunca me mande chave aqui."
Se a pessoa colar uma chave no chat, não a use: peça para colar na tela e
diga que a conversa não guarda segredo.

## 4 de 10 — A marca e a planta

**Leia antes:** `atual.marca`; liste `data/marca/`.

**Pergunte (uma coisa só):** "Agora a marca e a planta, as duas opcionais.
Tem a planta do escritório ou da clínica (imagem ou PDF)? Coloque em
`data/marca/` e me diga o nome do arquivo, ou 'pular'." Se já houver um
arquivo em `data/marca/`, pergunte se é a planta. Só depois, em outra
mensagem: "E o logo? Nome do arquivo em `data/marca/`, ou 'pular'. Se quiser,
a cor principal (#RRGGBB)."

**Se a imagem não for uma planta** (foto, captura de tela, documento), diga
isso com clareza e pergunte se quer mesmo usar; não finja ler salas.

**Grave:** `{ "marca": { "logo", "planta", "cor" } }` → `node abertura.js aplicar`
(o script confere que os arquivos existem).

**Se veio planta:** siga `referencias/planta.md` agora: leia a imagem,
proponha as salas, confirme, `node planta.js gerar salas.json`. Só então
passe à pergunta 5.

## 5 de 10 — A tranca

**Leia antes:** `atual.temSenhaAdmin`. Se já tem senha e a pessoa não pediu
para trocar, pule.

**Diga (não é pergunta, e é uma mensagem SÓ, sem a pergunta 6 junto):**
"Agora a tranca. O escritório tem dois perfis: o cliente opera (liga,
desliga, conversa, lê) e o administrador constrói (contrata, aprova, edita).
Vou gerar uma senha forte de administrador." Rode `node abertura.js senha` e
mostre: "Senha do administrador: <senha>. Guarde agora: ela não aparece de
novo. Para trocar, 🔐 Admin na tela. Me diga 'guardei' para seguir." Só
depois do 'guardei' vem a pergunta 6. Se a pessoa preferir a própria senha,
grave com `aplicar` (`senhaAdmin`, 6+).

## 6 de 10 — Os avisos

**Leia antes:** `atual.avisos`.

**Pergunte:** "Por onde o escritório avisa quando um sistema cai, uma
reunião termina ou um agente precisa de você? Pelo app gratuito ntfy (eu
crio o tópico; você instala o app e assina) ou pelo seu WhatsApp (CallMeBot,
você cola a chave na tela depois). Qual o número do dono e, se for outro, o
do administrador? Também sai um resumo às 9h todo dia; quer?"

**Grave:** `{ "avisos": { "ntfy": { "gerar": true }, "whatsapp": { "fone", "ativo": false, "extras": [{ "fone" }] }, "resumo": { "ativo": true } } }`
→ `node abertura.js aplicar`. `ntfy.gerar` faz o script criar um tópico
imprevisível (slug da empresa + 8 caracteres aleatórios); diga o tópico no
fim, para a pessoa assinar no app. `whatsapp.ativo` só `true` se a pessoa
escolheu WhatsApp; com "só ntfy", grave o número com `ativo: false`. A chave
do CallMeBot **não** passa por aqui: diga "cole em 🔔 Avisos".

## 7 de 10 — A reunião

**Leia antes:** `atual.reuniao`.

**Pergunte:** "A reunião dos agentes: cada um conta um número real, uma
melhoria e o que precisa de outro. Quer que ela aconteça sozinha? Em que dias
e hora? E qual é a meta do negócio que ela deve cobrar (o que medir, o número
alvo, a unidade e até quando)?" Avise em uma frase: cada fala gasta a cota do
Claude Code; por isso o padrão é desligada.

**Grave:** `{ "reuniao": { "automatica", "dias": [1,5], "hora", "meta": { "descricao", "alvo", "unidade", "ate" } } }`
→ `node abertura.js aplicar`. Dias: 0 domingo … 6 sábado.

## 8 de 10 — A conta do Claude Code

**Não é pergunta.** Rode `node abertura.js claude`. Se `conectado`: "O Claude
Code está conectado nesta máquina. Tudo que pensa aqui, Conversar,
Construir, reunião, testador e as rodadas dos agentes de tarefa, gasta a cota
dessa conta." (Não repita o e-mail da conta no chat: ele aparece em ⚙️
Ajustes para quem precisar.) Se não: "Precisa conectar: num terminal, `claude auth login`,
no mesmo usuário do Windows que vai abrir o escritório. Sem isso o escritório
sobe, mas os agentes não pensam." Siga.

## 9 de 10 — O primeiro agente

**Leia antes:** os setores e as plataformas gravados.

**Pergunte:** "Qual trabalho dói mais hoje na empresa? Me conte em uma frase.
Eu contrato o primeiro agente com o setor e as plataformas certas, e a
construção começa na tela, um componente por vez. Ou diga 'depois'."

**Grave:** com o escritório no ar, `POST /api/contratar` com
`{ nome, setor (id do setor ou 'atendimento' se for atender clientes no
WhatsApp), negocio, porta (4401 em diante, livre), plataformas: [ids] }`,
autenticado como administrador. Nome do agente: sugira um nome de pessoa
curto. Sem escritório no ar, anote em `data/abertura.log` e diga para usar a
aba Contratar.

## 10 de 10 — O exemplo

**Leia antes:** `atual.exemplo`.

**Pergunte:** "Todo escritório vem com um agente de exemplo, para a pessoa
clicar e entender o fluxo. Mantém o exemplo por enquanto, ou já tiro?"

**Grave:** `node abertura.js exemplo manter` ou `demitir`.

## Fechando

Suba o escritório, abra no navegador e resuma: empresa, setores, plataformas
(nomes), marca, salas (se planta), avisos (tópico e números), reunião,
agente contratado, exemplo. Nenhum valor de chave, nenhuma senha de novo.
