# Fase 2 — As mãos (passos 7–9)

O agente deixa de só conversar e passa a FAZER o trabalho do passo 1. A regra de ouro herdada: **código para o garantido, IA para o interpretado**. O que precisa ser verdade (gravou? existe? bateu com a regra?) é código em `tools/`; o que precisa ser entendido (o que o dono quis, o que o texto diz) é o modelo.

---

## Passo 7 — A ferramenta principal

**Por quê:** aqui o agente ganha mãos: a ação que define o trabalho dele, feita por código que o modelo chama.

**Antes, pergunte:** qual é a UMA ação que, se só ela funcionar, já vale? (ler a planilha e devolver os leads novos; consultar o CRM; gerar um texto num arquivo; conferir uma pasta). Confirme as conexões do `.env` que ela usa.

**Pedido pronto pra colar:**
> Crie em `tools/` a ferramenta `[NOME_DA_ACAO]`: [O QUE ELA FAZ, com entrada e saída]. Use as conexões do `.env`. Regras: [REGRAS DO DONO, ex.: nunca apagar, nunca enviar para cliente, só ler linhas com status X]. Registre cada execução em `log.txt` com data e resultado. Ligue a ferramenta ao agente (function calling) com o nome EXATO. Eu adiciono a linha dela no prompt — NÃO altere `prompt-agente.md`.

Depois, adicione você na seção **Ferramentas** do prompt uma linha com o nome exato e uma frase.

**Teste que prova:** no chat, pedir a ação → ela acontece de verdade na fonte (abrir a planilha/CRM/pasta e VER), e aparece em `/log`.

**Se falhar:**
1. Nome da ferramenta no prompt diferente do código.
2. Conexão do `.env` vazia ou errada (o erro cita 401, 403 ou "not found").
3. Servidor não reiniciado depois da ferramenta nova.

**Armadilha herdada:** o agente "confirmou" uma ação QUE NÃO ACONTECEU, com convicção. Nunca confie no "feito" — confie no efeito visível na fonte.

**Quando pular:** não pula — sem ferramenta não há agente, há chat.

---

## Passo 8 — Memória de trabalho

**Por quê:** um agente sem memória refaz o que já fez e esquece o que decidiu; a memória guarda o que foi tratado e o que ele aprendeu.

**Antes:** nada novo. Explique que existem duas memórias: `memoria.md` (o que ele aprende; o escritório alimenta a cada conversa e reunião) e o registro de tarefas (o que ele já tratou), que nasce agora.

**Pedido pronto pra colar:**
> Crie um registro local de tarefas tratadas (arquivo JSON ou SQLite dentro da pasta, sem serviço externo): o que foi tratado, quando, resultado. Antes de agir, a ferramenta consulta o registro para não repetir. Leia `memoria.md` no começo de cada tarefa e considere o que está lá. Não altere o prompt nem a constituição.

**Teste que prova:** rodar a mesma ação duas vezes → a segunda reconhece que já foi feita e não repete.

**Se falhar:**
1. O registro grava mas não é consultado antes de agir.
2. Chave de identificação do item mal escolhida (dois itens diferentes parecem iguais).

**Quando pular:** se o agente só responde perguntas e não executa nada repetível. Avise: sem isso, rotina (passo 9) vira retrabalho.

---

## Passo 9 — Rotina e aviso

**Por quê:** agente que só trabalha quando alguém pede não tira trabalho de ninguém; a rotina faz ele agir sozinho na hora combinada e avisar o dono do que fez.

**Antes, pergunte:** em que horário e dias ele deve rodar sozinho? O que o dono quer receber no celular (contagem, nunca dado pessoal)?

**Pedido pronto pra colar:**
> Adicione uma rotina interna ao servidor: nos dias [DIAS] às [HORA], executar a ferramenta principal sobre o que estiver pendente, respeitando o registro de tarefas. Ao terminar, mandar um aviso ao escritório com `POST http://localhost:4321/api/avisar` `{ "titulo": "[NOME DO AGENTE]", "texto": "[contagem do que fez]" }`. Só contagem e resumo no aviso. Registre tudo em `log.txt`.

**Teste que prova:** marcar a rotina para daqui a dois minutos → ela roda, o log mostra, o aviso chega no celular (se os avisos do escritório estiverem ligados).

**Se falhar:**
1. Escritório desligado na hora — o aviso falha mas a tarefa roda; confira o log.
2. Fuso ou formato de hora errado.

**Quando pular:** agente só sob demanda → pule e anote no progresso.

**Fechando a fase 2:** atualize o progresso e abra `referencias/fase-3.md`.
