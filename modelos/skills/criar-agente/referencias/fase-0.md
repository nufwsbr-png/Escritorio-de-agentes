# Fase 0 — Preparar o terreno (passos 1–2)

Nada de código ainda. Esta fase existe porque a burocracia mais lenta do projeto inteiro (a verificação da Meta) precisa começar AGORA para não travar o aluno lá no passo 15. É a fase com mais pausas humanas da jornada — são sites em que só o dono entra. Compense agrupando: cada site é visitado UMA vez, pegando tudo que ele fornece.

---

## Passo 1 — Iniciar a verificação da empresa na Meta

**Por quê (diga em uma frase):** a Meta leva de 2 a 5 dias úteis para verificar uma empresa, então a gente aperta esse botão hoje e deixa a análise correr sozinha enquanto constrói o resto.

**O guia lê antes:** nome do negócio no progresso. Não pergunte se ele tem Facebook, se tem CNPJ, nem se vai usar a API oficial — o caminho se decide no passo 14; este passo é grátis e abre as duas portas, então o padrão é fazer.

**Pausa humana (b, c) — uma instrução só, uma resposta só:**
> Esse passo é o único que depende de uma análise da Meta, por isso é o primeiro. Tenha em mãos: sua conta pessoal do Facebook (a Meta exige uma pessoa por trás do portfólio), o cartão CNPJ e um comprovante de endereço da empresa, com o nome da empresa escrito IGUALZINHO nos dois.
> 1. Abra `business.facebook.com` e entre com sua conta pessoal.
> 2. Se ainda não existe, crie um portfólio empresarial com o nome da empresa.
> 3. Menu **Configurações** → **Central de Segurança** → **Verificação da empresa** → **Iniciar verificação**.
> 4. Preencha os dados e envie os documentos que a tela pedir.
> Quando a tela mostrar **"Em análise"**, me avise. Não precisa esperar aprovar.

**Teste que prova:** o aluno disse "Em análise". Registre a data no progresso.

**Se falhar, causas prováveis na ordem:**
1. Não existe portfólio empresarial ainda — criar antes, o botão de verificação só aparece dentro de um portfólio.
2. Documento com nome/endereço diferente do cadastro — o nome no documento tem que bater letra por letra com o que foi digitado.
3. Conta pessoal muito nova ou restrita — usar uma conta do Facebook com histórico.

Se ele descrever um problema, faça UMA pergunta dirigida pela lista acima — nunca "me conta tudo o que apareceu".

**Armadilha real da construção original:** essa foi literalmente a PRIMEIRA coisa feita no projeto, antes de qualquer linha de código — porque quem deixa pra depois chega no passo do WhatsApp e descobre que precisa esperar até 5 dias úteis parado.

**Quando pular:** só se o aluno disser, por conta própria, que vai usar apenas a API não oficial (WAHA) e nunca vai querer templates. Avise: pular aqui fecha a porta da API oficial lá no passo 14 até a verificação sair — e ela é a parte mais lenta do projeto.

---

## Passo 2 — Criar as contas e deixar as chaves no lugar certo

**Por quê:** o projeto inteiro roda em cima de duas contas — o OpenRouter (que dá acesso a todos os modelos de IA com uma chave só) e o Supabase (o banco gratuito onde vai morar a memória do agente) — e as senhas delas vão num arquivo que fica só no computador dele, nunca no chat.

**O guia detecta, não pergunta:** o editor com IA já está de pé (ele está falando com você). Conta no OpenRouter e no Supabase: você vai saber pela chave que chegar no `.env`.

**O guia executa ANTES de mandá-lo aos sites:** crie na raiz do projeto o arquivo `.env` com os campos vazios e comentados em português:

```
# Chave do OpenRouter (paga as respostas do agente)
OPENROUTER_API=""
# Supabase (a memória do agente)
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
SUPABASE_DB_PASSWORD=""
```

Crie também o `.gitignore` já contendo `.env` e `google-credentials.json` (explique em meia frase: é a lista do que nunca sai do computador dele). Explique o `.env` uma vez: "é o cofre; você cola os valores entre as aspas, salva com Ctrl+S, e eu leio de lá. Nunca cole chave aqui no chat."

**Pausa humana 1 (b, d) — OpenRouter, uma ida só:**
> Abra `openrouter.ai`, crie a conta e coloque um crédito inicial (US$ 5 a 10 bastam para toda a fase 1 — é o que paga cada resposta do agente). Depois: ícone do perfil → **Keys** → **Create Key** → nome "agente [negócio]" → copie a chave (ela só aparece uma vez) e cole no arquivo `.env` entre as aspas de `OPENROUTER_API`. Salve com Ctrl+S e me avise.

Por quê OpenRouter e não uma conta em cada IA: uma única chave dá acesso a Claude, GPT, Gemini e todos os outros, sem ficar pondo dinheiro em cada plataforma.

**Pausa humana 2 (b, c) — Supabase, uma ida só** (pode mandar as duas instruções em sequência; ele responde uma vez):
> Abra `supabase.com`, crie a conta gratuita e já crie o projeto: **New project** → nome "atendimento [negócio]" → senha forte do banco (guarde e cole em `SUPABASE_DB_PASSWORD` no `.env`) → região **South America (São Paulo)**. Se aparecerem opções de segurança, aceite o padrão mais fechado (tabelas não expostas, proteção de linha ligada). Quando o projeto terminar de criar: **Settings → API** → copie a **URL do projeto**, a chave **anon** e a chave **service_role** para os campos do `.env`. Salve com Ctrl+S e me avise.

**O guia testa e mostra:** leia o `.env`. Chame o endpoint de créditos do OpenRouter com a chave e mostre: "chave válida, saldo de US$ X". Conecte no Supabase com a URL e a service_role (ou com o MCP, se estiver conectado) e mostre: "projeto respondendo". Campo vazio, chave pela metade ou formato errado: detecte e peça UMA correção apontando o campo.

**Se falhar:**
1. OpenRouter sem crédito — os modelos não respondem com saldo zero; é a causa nº 1 de "não funciona" nos passos 5 a 12. A partir daqui, sempre que o agente "morrer" do nada, consulte o saldo pela API antes de qualquer outra coisa.
2. Confusão entre conta da OpenAI e OpenRouter — são coisas diferentes; o site certo é `openrouter.ai`.
3. Esqueceu o Ctrl+S — a causa nº 1 de "não funciona" em arquivo editado à mão.
4. Projeto do Supabase ainda "provisionando" — espera um minuto e tenta de novo.

**Armadilha real:** no meio da construção original, uma rodada de testes parou no meio por falta de crédito no OpenRouter — o agente simplesmente para de responder, sem erro claro. E a regra "não cola a chave no chat" veio de lá: chave colada em conversa fica gravada no histórico para sempre.

**Quando pular:** não pula. Sem essas contas nenhum passo seguinte funciona.

**Fechando a fase 0:** registre no progresso (nomes das variáveis criadas, nunca valores), comemore ("a parte chata já era — daqui em diante quem clica sou eu") e abra o passo 3 lendo `referencias/fase-1.md`.
