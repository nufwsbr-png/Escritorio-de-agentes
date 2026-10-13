# Catálogo de módulos de ferramenta

Cada módulo é um tipo de porta por onde o agente entra num sistema. O aluno escolhe os módulos no passo 2; os passos 9, 10, 12, 13 e 19 puxam só os escolhidos. Para cada módulo: quando usar, como conecta, o que vai no `.env`, o trecho que completa o bloco "O que você executa" dos passos 10 e 12, o teste, as armadilhas e a cerca obrigatória. O "trecho do pedido" de cada módulo é a especificação que VOCÊ implementa — não é texto para o aluno colar.

Regras válidas para TODOS os módulos (não repita — o passo 10 já as traz):
- Respeita os três modos: **ensaio** (só registra), **proposta** (escreve em `saidas/.../proposta/`), **real** (escreve no alvo).
- **Nunca apaga**: o que seria apagado vai para `quarentena/` com o caminho original anotado.
- Só opera dentro do escopo autorizado (pastas, contas, números, planilhas listados no `.env` ou na configuração) e recusa o resto.
- Devolve ao agente um resultado claro: feito / recusado / erro, e por quê.
- Entra na pós-verificação do lançador.

Ordem de preferência quando um sistema aceita mais de uma porta: **arquivo** > **API ou MCP** > **navegador**.

---

## `arquivos` — pastas locais, de rede e sincronizadas (OneDrive, Drive, Dropbox)

**Quando usar:** a entrada ou a saída é arquivo em pasta — a porta mais simples e previsível. OneDrive/Drive instalados no PC são pastas comuns para o agente.

**Como conecta:** caminho de pasta. Nada de API: o agente lê e escreve na pasta sincronizada e o serviço sobe sozinho.

**No `.env`:** `PASTA_ENTRADA`, `PASTA_SAIDA` (ou `PASTA_CLIENTES` etc.), uma variável por pasta autorizada. Só caminhos absolutos.

**Trecho do pedido:** "ferramentas de arquivo: listar, ler, copiar, mover e renomear, SOMENTE dentro das pastas do `.env`; criar subpastas conforme a estrutura da base; nunca sobrescrever — se o destino existe, renomeia com sufixo e registra".

**Teste:** mover um arquivo de amostra para a subpasta certa com o nome certo; tentar mover para fora da pasta autorizada → recusado; mover para destino que já existe → sufixo, não sobrescrita.

**Armadilhas conhecidas:**
- Windows esconde extensão: `documento.pdf.pdf` e `credenciais.json.json` já quebraram projetos. A ferramenta normaliza extensão dupla.
- OneDrive "arquivo sob demanda": o arquivo aparece na lista mas não está baixado; a leitura falha ou lê vazio. Peça para a ferramenta forçar o download antes de ler, ou configure a pasta como "sempre manter neste dispositivo".
- Pasta sincronizada por duas pessoas ao mesmo tempo gera cópias "conflito". A ferramenta trata `- conflito` como arquivo a conferir, nunca a apagar.
- Nome de pasta com acento e espaço: funciona, mas o padrão de nome da base precisa ser seguido à risca; a ferramenta valida contra a regra da base antes de criar.

**Cerca:** lista fechada de pastas; nenhuma operação acima delas (`..` proibido); sem apagar.

---

## `whatsapp-leitura` — ler conversas e baixar mídia

**Quando usar:** a entrada vem de conversas (um grupo, uma lista de clientes, um número de atendimento). Exemplo A da jornada.

**As portas, em ordem de preferência:**
1. **API já existente no negócio** (Evolution API, WAHA, API oficial da Meta, ou o próprio CRM que já guarda as conversas): o agente consulta mensagens e baixa mídia por API. Se o negócio já tem atendente ou CRM com WhatsApp, as conversas JÁ estão num banco — é a porta certa.
2. **WAHA dedicado, só leitura**, num número NOVO que participa do grupo/recebe os encaminhamentos. Mesmo aviso da skill irmã: é contra os termos do WhatsApp, pode ser banido sem aviso; número dedicado e descartável, nunca o da empresa.
3. **Navegador** (WhatsApp Web numa sessão logada, via módulo `navegador`): última opção; frágil e lenta; útil para volume pequeno, só leitura.

**No `.env`:** `WHATSAPP_API_URL`, `WHATSAPP_API_CHAVE`, `WHATSAPP_SESSAO`, e a lista fechada de origens autorizadas (`WHATSAPP_GRUPOS` ou `WHATSAPP_NUMEROS`).

**Trecho do pedido:** "ferramenta que lista as mensagens de [ORIGEM] desde a última leitura (guardar o ponto de leitura na memória), baixa cada mídia para `saidas/[entidade]/entrada/` com nome `[data-hora] [tipo] [legenda se houver].[ext]`, e devolve ao agente a lista com remetente, data, tipo, legenda e caminho; identifica a entidade pela regra [EX.: nome do grupo / número do contato / palavra-chave]".

**Teste:** mensagens novas de uma amostra → aparecem na lista com mídia baixada e nomeada; rodar de novo → nada duplicado (ponto de leitura funcionou).

**Armadilhas conhecidas:**
- Mídia expira: foto/áudio antigos não baixam mais pela API — o agente registra "mídia indisponível" e segue; não trava.
- Áudio e foto são metade das mensagens reais: o passo 9 (leitores) é obrigatório neste módulo.
- Quem é a entidade? Grupo com vários clientes misturados exige regra explícita de separação na base — senão o agente junta documentos de pessoas diferentes.
- Sessão WAHA esquecida é número virando robô sem você lembrar; uma sessão só, registrada no progresso.

**Cerca:** SÓ leitura — este módulo nunca envia mensagem. Lista fechada de grupos/números. Mídia baixada só para a pasta da entidade.

---

## `navegador` — sistemas web sem API (CRM antigo, portal, tribunal, intranet)

**Quando usar:** o sistema só existe como tela. Última opção: quebra quando a tela muda e é lento.

**Como conecta:** um navegador controlado por código (o construtor escolhe a biblioteca) com um perfil de navegador DEDICADO ao agente, já logado pelo dono uma vez; ou, para operação assistida, a extensão do Claude no Chrome do dono.

**No `.env`:** `NAVEGADOR_PERFIL` (pasta do perfil), `SISTEMA_URL`, e a lista de URLs autorizadas. Senha do sistema NÃO vai no `.env` se o perfil já está logado; se precisar login por código, `SISTEMA_USUARIO`/`SISTEMA_SENHA` e aviso de que esse acesso é um usuário só do agente.

**Trecho do pedido:** "ferramentas de navegador: abrir [URL], ler o conteúdo da tela como texto, preencher campos e clicar por descrição (não por posição), e tirar uma captura de tela ao fim de cada ação para o log; em ensaio e proposta ela navega e lê mas NUNCA clica em botão de salvar/enviar/confirmar — esses cliques só em modo real; só nas URLs autorizadas".

**Teste:** abrir a tela da amostra e ler um dado dela; em proposta, preencher sem salvar e a captura mostra o formulário preenchido; em real, salvar e o dado aparece no sistema.

**Armadilhas conhecidas:**
- Sessão expira; o agente "não encontra o campo" e na verdade está na tela de login. A ferramenta detecta tela de login e marca `com erro: sessão expirada` para o dono relogar.
- Pop-up/aviso que aparece só às vezes e bloqueia tudo. A ferramenta fecha avisos conhecidos e registra os desconhecidos com captura.
- Tela mudou (atualização do sistema): o teste do passo 20 deve ser rerodado após cada atualização do sistema alvo.
- Dois cliques no "salvar" = registro duplicado. Clicar uma vez e CONFERIR o resultado na tela antes de relatar "feito".

**Cerca:** lista de URLs; botões de salvar/enviar/pagar/excluir só em real, e "excluir" NUNCA (mapeie os botões proibidos pelo texto).

---

## `sistema-api` — CRM ou sistema com API ou MCP (Ophir, Astrea, Projuris, Pipedrive, planilha-sistema própria…)

**Quando usar:** o sistema oferece API ou já tem um servidor MCP. Porta oficial, estável, com permissão por usuário.

**Como conecta:** MCP configurado para a pasta do agente (preferível: o Claude Code chama direto) ou ferramenta em `tools/` chamando a API com a chave do `.env`.

**No `.env`:** `SISTEMA_API_URL`, `SISTEMA_API_TOKEN` (de um usuário só do agente, com o mínimo de permissão), e os IDs fixos (`SISTEMA_PIPELINE_ID`, `SISTEMA_PASTA_RAIZ_ID`…).

**Trecho do pedido:** "ferramentas para [LISTAR/LER] [ENTIDADES DO SISTEMA] e [CRIAR/ATUALIZAR/ANEXAR] [O QUE A MISSÃO EXIGE], uma ferramenta por operação, com descrição clara de quando usar cada uma; em proposta, gravar o que seria enviado sem enviar; em real, enviar e CONFERIR lendo de volta antes de relatar feito; se o MCP já existe, use-o e me diga quais ferramentas dele o agente vai poder usar — SÓ essas entram nas permissões".

**Teste:** ler uma entidade da amostra pela API; em proposta, ver o que seria gravado; em real, gravar e ler de volta igual.

**Armadilhas conhecidas:**
- MCP que expõe tudo (inclusive excluir): a permissão do Claude Code (passo 14) libera ferramenta por ferramenta; excluir fica negado.
- Token de usuário admin "só pra testar" vira token de produção. Criar o usuário do agente antes do passo 15.
- API com limite de chamadas: a ferramenta espera e tenta de novo; o agente não sabe disso, só recebe "feito" ou "erro".
- Campo obrigatório que a tela preenche sozinho e a API não: ler de volta revela o registro incompleto.

**Cerca:** permissões por ferramenta; nenhuma operação de exclusão; escopo por ID (só a pasta/pipeline do `.env`).

---

## `documentos-leitura` — PDF, imagem, áudio, Word viram texto

**Quando usar:** sempre que a entrada tiver qualquer formato além de texto. É a etapa fixa do passo 9 (do lançador, não do agente).

**Como conecta:** bibliotecas locais para PDF com texto e Word; OCR para PDF escaneado e imagem; transcrição para áudio. Se um modelo com visão/áudio for usado para imagem ou áudio, o construtor diz qual e o aluno sabe que isso tem custo e que a imagem sai da máquina.

**No `.env`:** chaves do serviço de OCR/transcrição se houver; senão nada.

**Trecho do pedido:** o do passo 9. Acrescente se precisar: "para imagem de documento (RG, CNH, holerite), extraia também os campos [LISTA] em formato tabela no fim do `.md`, marcados com a confiança (alta/média/baixa)".

**Teste:** o do passo 9; mais: foto de documento inclinada → campos extraídos com confiança "baixa" e marcados para conferir.

**Armadilhas conhecidas:** OCR errando nome e o arquivo sendo renomeado errado (nome de OCR é sugestão); PDF "com texto" que na verdade é imagem (sem OCR sai vazio); áudio de WhatsApp em formato que a biblioteca não lê (converter antes); documento de 200 páginas estourando o contexto (o leitor resume por seção e guarda o completo para `consultar_memoria`).

**Cerca:** o leitor só escreve em `entrada-lida/`; os originais são intocáveis.

---

## `documentos-geracao` — gerar Word, PDF e Markdown a partir de modelo

**Quando usar:** a saída é um documento (petição, relatório, contrato, laudo). Exemplo B da jornada.

**Como conecta:** modelo em `skills/base-conhecimento/modelos/` (de preferência `.docx` do próprio escritório, com os campos marcados `{{CAMPO}}`, ou Markdown com a estrutura); o agente escreve o conteúdo em Markdown estruturado; a ferramenta monta o documento final a partir do modelo.

**No `.env`:** `PASTA_MODELOS` se os modelos ficam fora do projeto; `PASTA_SAIDA_DOCUMENTOS`.

**Trecho do pedido:** "ferramenta `gerar_documento`: recebe o nome do modelo e o conteúdo por seção/campo, produz o `.docx` (e um `.pdf` se pedido) preservando a formatação do modelo (fontes, cabeçalho, numeração), salva em `saidas/[entidade]/` com o nome `[PADRÃO DA BASE]`, e devolve o caminho; recusa gerar se faltar seção obrigatória ou se sobrar campo `{{…}}` sem preencher — nesse caso devolve a lista do que falta para o agente perguntar (passo 17) ou marcar".

**Teste:** gerar a minuta do `caso-01` → abre no Word, com as seções do gabarito, sem colchete ou `{{}}` sobrando, formatação do modelo preservada; caso com dado faltando → a ferramenta recusa e lista o que falta.

**Armadilhas conhecidas:**
- Modelo com campo `[NOME]` sem dizer DE ONDE vem: colchete na minuta final. Cada campo do modelo tem origem na base.
- Agente "escreve bonito" fora do modelo: seção nova inventada. A ferramenta só aceita as seções do modelo; extra é erro.
- Citação de documento que não existe na entrada ("conforme doc. 12", e há 7). A pós-verificação confere que todo documento citado está em `entrada-lida/`.
- Documento gerado é minuta, não peça final: o nome do arquivo carrega `MINUTA` e a base diz quem revisa.

**Cerca:** só escreve em `saidas/`; nunca envia, protocola ou assina — isso é outro agente ou o humano.

---

## `planilhas` — Google Sheets ou Excel

**Quando usar:** a entrada ou a saída é linha de planilha (controle de clientes, fila de trabalho, registro).

**Como conecta:** Google Sheets por conta de serviço (o mesmo clique a clique da skill irmã, passo 11: ativar Sheets API, compartilhar a planilha com o `client_email` como Editor, ID da planilha no `.env`); Excel local como arquivo (módulo `arquivos`, com a biblioteca de leitura/escrita de `.xlsx`).

**No `.env`:** `GOOGLE_SHEETS_ID`, `GOOGLE_CREDENCIAIS_JSON` (conteúdo do arquivo, ou caminho local) e `PLANILHA_ABA`.

**Trecho do pedido:** "ferramentas `ler_linhas` (filtra por coluna) e `escrever_linha`/`atualizar_celula` por chave (a coluna [CHAVE] identifica a entidade — nunca por número de linha); em proposta, grava o que escreveria; em real, escreve e lê de volta; nunca apaga linha — marca na coluna `Status`; não altera cabeçalho nem fórmulas".

**Teste:** ler a linha da amostra; atualizar uma célula e ver mudar na frente do aluno; tentar escrever numa linha sem chave → recusado.

**Armadilhas conhecidas:** escrever por número de linha e a pessoa inserir uma linha no meio (tudo desloca); planilha com fórmula sobrescrita por valor; data gravada como texto; Sheets API é ativação SEPARADA da Calendar.

**Cerca:** uma planilha e aba só; sem apagar linha; cabeçalho e fórmulas intocáveis.

---

## `email` — ler e enviar e-mail

**Quando usar:** entrada chega por e-mail (anexos de clientes) ou aviso/relatório sai por e-mail.

**Como conecta:** conta de e-mail DEDICADA ao agente (nunca a do dono), via IMAP/SMTP ou API do provedor. Leitura filtrada por pasta/remetente.

**No `.env`:** `EMAIL_USUARIO`, `EMAIL_SENHA_APP` (senha de aplicativo, não a senha da conta), `EMAIL_PASTA`, `EMAIL_DESTINATARIOS_AUTORIZADOS`.

**Trecho do pedido:** "leitura: lista e-mails novos em [PASTA] desde o último ponto, baixa anexos para a pasta da entidade; envio (SÓ se a missão exige): apenas para a lista de destinatários do `.env`, com o texto montado por modelo da base, e em proposta grava o e-mail sem enviar".

**Teste:** e-mail de amostra com anexo → anexo baixado e nomeado; envio em proposta → arquivo `.eml` em `proposta/`, nada enviado; em real → chega no destinatário autorizado.

**Armadilhas conhecidas:** e-mail com instrução plantada no corpo (passo 14); anexo que é um `.zip` com dezenas de arquivos; "responder a todos" com cliente na cópia; conta do dono bloqueada por "atividade suspeita" quando o robô usa a conta pessoal.

**Cerca:** lista fechada de destinatários; sem encaminhar; sem apagar e-mail (marcar como lido/mover para pasta).

---

## `banco-de-dados` — SQLite local ou Supabase

**Quando usar:** quando a memória do passo 11 crescer além do que arquivos aguentam, ou quando a entrada/saída já é um banco (o CRM próprio do negócio).

**Como conecta:** SQLite é um arquivo na pasta do agente (padrão para memória); Supabase/Postgres por URL e chave (quando precisa ser acessado de várias máquinas ou pelo painel na rede).

**No `.env`:** `BANCO_URL`, `BANCO_CHAVE` (chave de serviço com permissão só nas tabelas do agente).

**Trecho do pedido:** "ferramentas de consulta e escrita só nas tabelas [LISTA], com uma operação por ferramenta; nenhuma ferramenta de SQL livre para o agente; apagar vira coluna `arquivado_em`".

**Teste:** o do passo 11 (rodar duas vezes, não repete), com o estado lido do banco.

**Armadilhas conhecidas:** SQL livre na mão do agente é a porta para "limpar a tabela"; chave de serviço do Supabase vazando pelo painel (o painel usa o servidor, nunca a chave no navegador); nome de coluna no banco diferente do que o código espera (aconteceu no atendente: conferir nomes reais).

**Cerca:** tabelas listadas; sem SQL livre; sem DELETE.

---

## `agenda` — Google Calendar

**Quando usar:** a tarefa consulta ou cria compromissos (lembrete de prazo, agendamento de perícia, bloqueio de agenda).

**Como conecta:** idêntico ao passo 10 da skill irmã `criar-agente`: projeto no Google Cloud, Calendar API, conta de serviço, agenda dedicada compartilhada com o `client_email`, ID da agenda no `.env`. Siga aquele clique a clique.

**No `.env`:** `GOOGLE_CALENDAR_ID`, `GOOGLE_CREDENCIAIS_JSON`.

**Trecho do pedido:** "ferramentas `ver_horarios`, `criar_evento`, `cancelar_evento` (só eventos criados pelo agente, identificados pela entidade) com as regras [EXPEDIENTE, ANTECEDÊNCIA]; conferir conflito imediatamente antes de gravar; nunca marcar no passado".

**Teste:** evento aparece na agenda do Google na frente do aluno; conflito recusado.

**Armadilhas conhecidas:** as cinco do passo 10 da skill irmã — agenda não compartilhada, `json.json`, ID errado, servidor sem reiniciar após credenciais, e o agente "confirmando" evento que não existe.

**Cerca:** uma agenda só; cancelar só o que o agente criou; sem apagar agenda.

---

## Como adicionar um módulo novo a este catálogo

Quando a tarefa do aluno precisar de um sistema que não está aqui, monte o módulo com ele ANTES do passo 10, nesta mesma estrutura: quando usar · como conecta (nas três portas, em ordem) · `.env` · trecho do pedido · teste · armadilhas · cerca. Salve em `referencias/modulos-extras/[nome].md` na skill e anote no progresso. Um módulo sem cerca escrita não entra no agente.
