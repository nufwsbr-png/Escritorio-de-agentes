# Fase 0 — Preparar o terreno (passos 1–2)

Nada de código ainda. Esta fase existe porque a burocracia mais lenta do projeto inteiro (a verificação da Meta) precisa começar AGORA para não travar o aluno lá no passo 15.

---

## Passo 1 — Iniciar a verificação da empresa na Meta

**Por quê (diga em uma frase):** a Meta leva de 2 a 5 dias úteis para verificar uma empresa, então a gente aperta esse botão hoje e deixa a análise correr sozinha enquanto constrói o resto.

**Antes, pergunte:**
- Ele tem conta no Facebook ou Instagram? (precisa de uma conta pessoal para criar o portfólio empresarial)
- A empresa dele tem CNPJ e documentos (cartão CNPJ, comprovante de endereço)? A Meta pede documentos onde o nome da empresa apareça igualzinho.
- Ele pretende usar a API oficial do WhatsApp ou já sabe que quer a não oficial? (Se ainda não sabe, faça o passo mesmo assim — é de graça e abre as duas portas.)

**Não há pedido pra colar — é clique a clique (guie assim):**
1. Abra `business.facebook.com` e entre com sua conta.
2. Se ainda não existe, crie um portfólio empresarial com o nome da empresa.
3. Menu **Configurações** → **Central de Segurança** → **Verificação da empresa** → **Iniciar verificação**.
4. Preencha os dados e envie os documentos que a tela pedir.
5. Me conta o que apareceu na tela no final.

**Teste que prova que funcionou:** a tela de verificação mostra o status **"Em análise"**. É isso — não precisa esperar aprovar para seguir ao passo 2.

**Se falhar, causas prováveis na ordem:**
1. Não existe portfólio empresarial ainda — criar antes, o botão de verificação só aparece dentro de um portfólio.
2. Documento com nome/endereço diferente do cadastro — o nome no documento tem que bater letra por letra com o que foi digitado.
3. Conta pessoal muito nova ou restrita — usar uma conta do Facebook com histórico.

**Armadilha real da construção original:** essa foi literalmente a PRIMEIRA coisa feita no projeto, antes de qualquer linha de código — porque quem deixa pra depois chega no passo do WhatsApp e descobre que precisa esperar até 5 dias úteis parado.

**Quando pular:** se o aluno tem certeza de que vai usar só a API não oficial (WAHA) e nunca vai querer templates nem o caminho oficial. Avise: pular aqui fecha a porta da API oficial lá no passo 14 até a verificação sair — e ela é a parte mais lenta do projeto.

---

## Passo 2 — Criar as contas e ter as ferramentas na mão

**Por quê:** o projeto inteiro roda em cima de três contas — o editor com IA (onde eu vivo), o OpenRouter (que dá acesso a todos os modelos de IA com uma chave só) e o Supabase (o banco gratuito onde vai morar a memória do agente).

**Antes, pergunte o que ele já tem.** O checklist:

1. **Antigravity com a extensão do Claude Code** (ou o Claude Code sozinho) — instalado e logado. Se ele está falando com você, isso já está de pé; só confirme.
2. **OpenRouter** (`openrouter.ai`): criar conta e colocar um crédito inicial (US$ 5–10 bastam para toda a fase 1). Por quê OpenRouter e não uma conta em cada IA: uma única chave dá acesso a Claude, GPT, Gemini e todos os outros, sem ficar pondo dinheiro em cada plataforma — perfeito para testar qual modelo serve melhor pro agente.
3. **Supabase** (`supabase.com`): criar conta gratuita. Só a conta — o projeto a gente cria no passo 6.

**Teste que prova:** ele consegue entrar nos três sites logado. No OpenRouter, a página de créditos mostra saldo maior que zero.

**Se falhar:**
1. OpenRouter sem crédito — os modelos não respondem com saldo zero; é a causa nº 1 de "não funciona" nos passos 5 a 12.
2. Confusão entre conta da OpenAI e OpenRouter — são coisas diferentes; o site certo é `openrouter.ai`.

**Armadilha real:** no meio da construção original, uma rodada de testes parou no meio por falta de crédito no OpenRouter — o agente simplesmente para de responder, sem erro claro. Se um dia o agente "morrer" do nada, saldo é a primeira coisa a olhar.

**Quando pular:** não pula. Sem essas três contas nenhum passo seguinte funciona.

**Fechando a fase 0:** atualize o progresso, comemore ("a parte chata já era") e abra o passo 3 lendo `referencias/fase-1.md`.
