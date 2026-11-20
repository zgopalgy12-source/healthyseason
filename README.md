# Healthy Season

Aplicação web de nutrição em português, com Next.js, TypeScript, Tailwind CSS e Supabase.

## Instalação local

1. Instale o Node.js 22 LTS ou superior.
2. Clone o repositório e abra a sua pasta no terminal.
3. Execute `npm ci`.
4. No PowerShell, execute `Copy-Item .env.example .env.local`.
5. Abra `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` com o Project URL e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a chave pública (publishable key) do projeto Supabase. Para usar a análise por foto e as sugestões, configure também as variáveis da fase (d) indicadas abaixo. O Git ignora `.env.local`.
6. Execute `npm run dev` e abra [localhost:3000](http://localhost:3000).
7. Para verificar a compilação de produção, execute `npm run build`. Para a servir, execute `npm run start`.

## Configurar a fase (a) no Supabase

1. No painel do Supabase, abra **SQL Editor → New query**.
2. Copie todo o ficheiro [supabase/fase-1-base.sql](supabase/fase-1-base.sql), cole-o no editor e carregue em **Run**. Este ficheiro cria a tabela `profiles`, ativa RLS e concede acesso explícito aos utilizadores autenticados.
3. Em **Authentication → URL Configuration**, defina **Site URL** como `http://localhost:3000` durante o teste local. Em **Redirect URLs**, adicione `http://localhost:3000/auth/callback`.
4. Em **Authentication → Sign In / Providers**, confirme que **Email** está ativo. Com a confirmação de email ativa e o modelo padrão, abra o link recebido no mesmo navegador em que fez o registo.
5. Para testar o Google, crie um OAuth Client ID do tipo **Web application** na Google Cloud Console. No campo **Authorized redirect URIs**, coloque a Callback URL indicada pelo fornecedor Google no Supabase, normalmente `https://<project-ref>.supabase.co/auth/v1/callback`. Ative **Google** no Supabase e guarde o Client ID e o Client Secret nesse painel. Se a app OAuth estiver em modo de teste, adicione o email à lista de utilizadores de teste.

## Deploy na Vercel Hobby

1. Importe `zgopalgy12-source/healthyseason` em **Add New → Project**. Selecione o preset **Next.js** e mantenha a raiz do repositório como diretório do projeto.
2. Adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em **Environment Variables**, incluindo o ambiente Production.
3. Carregue em **Deploy**.
4. No Supabase, atualize **Site URL** para o endereço HTTPS publicado. Adicione também o URL publicado com `/auth/callback` no fim em **Redirect URLs**. Mantenha a URL local se continuar a desenvolver no computador.

## Testar a fase (a)

1. Abra a landing num telemóvel e verifique que **Começar agora** leva ao registo.
2. Numa janela anónima, tente abrir `/perfil` e `/criar-plano`. Deve ver o login.
3. Crie uma conta, confirme o email no mesmo navegador e verifique que chega a **Criar o meu plano**. O formulário do plano chega na fase (b).
4. Abra o perfil, altere o nome, guarde e recarregue a página para confirmar que a alteração ficou guardada.
5. Termine a sessão e volte a entrar com email. Teste **Continuar com Google** numa janela anónima depois de configurar o fornecedor.

## Configurar a fase (b) no Supabase

Depois de aplicar o SQL da fase (a), copie todo o ficheiro [supabase/fase-2-plano.sql](supabase/fase-2-plano.sql) para **SQL Editor → New query**, no mesmo projeto Supabase. Carregue em **Run**. A migração cria o perfil nutricional, as metas diárias e o diário alimentar, com RLS e permissões explícitas.

## Testar a fase (b)

1. Entre com uma conta que ainda não tenha plano. Deve abrir **Criar o meu plano**. Avance e volte atrás para confirmar que os dados são mantidos. Teste também uma idade inferior a 18 anos e um peso objetivo incoerente.
2. Para um teste de referência, escolha masculino, 30 anos, 175 cm, 75 kg, objetivo de 75 kg, manter peso e atividade moderada. O resumo deve mostrar **2 633 kcal**, **165 g de proteína**, **296 g de hidratos** e **88 g de gordura** por dia.
3. Carregue em **Começar**. Em **Hoje**, adicione um alimento ao almoço, introduzindo os valores da porção. Confirme que as calorias e os macros aumentam e que o registo se mantém depois de recarregar.
4. Abra **Perfil → Hoje** através da navegação inferior. Termine a sessão e entre novamente. A conta com plano deve abrir em **Hoje**. Numa janela anónima, abrir diretamente /hoje deve encaminhar para o login.
5. Com uma segunda conta, confirme que o plano e o diário da primeira conta não aparecem.

A app estima o gasto em repouso pela [equação de Mifflin–St Jeor](https://pubmed.ncbi.nlm.nih.gov/2305711/), aplica o fator de atividade e ajusta a estimativa em −300, 0 ou +300 kcal, conforme o objetivo. Distribui a energia por proteína (25%), hidratos (45%) e gordura (30%). A criação é limitada a adultos e a estimativas de pelo menos 1 200 kcal para o cálculo feminino ou 1 500 kcal para o masculino. O diário usa o fuso horário do navegador, com Lisboa como referência inicial.

## Configurar a fase (c) no Supabase

Depois das fases (a) e (b), abre **SQL Editor → New query** no mesmo projeto Supabase. Copia o ficheiro inteiro [supabase/fase-3-scanner-trial.sql](supabase/fase-3-scanner-trial.sql), cola-o e carrega em **Run**. As contas que já existiam e foram criadas no dia da migração recebem sete dias a partir da aplicação do SQL, considerando a data de Lisboa. As restantes contam sete dias desde a criação da conta. Voltar a executar a migração preserva os prazos já gravados.

## Testar a fase (c)

1. Abre **Hoje** e **Perfil** com uma conta em teste. Ambos devem mostrar os dias que faltam.
2. Abre **Scanner** e pesquisa manualmente **3017620422003**. Deves ver Nutella e os dados disponíveis no Open Food Facts. Escolhe **50 g** e **Almoço**, carrega em **Adicionar ao diário** e confirma o registo e os totais em **Hoje**.
3. Pesquisa **9982746183952**, que devolveu produto não encontrado durante a validação. Confirma a mensagem de produto não encontrado. Pesquisa mais de cinco vezes com o teste ativo e verifica que o scanner continua disponível.
4. No telemóvel, abre o endereço **HTTPS** da app na Vercel no Safari ou Chrome. Entra, abre **Scanner → Abrir câmara**, permite o acesso e aponta ao código de barras de uma embalagem. Testa também recusar a permissão e pesquisar digitando o código. O endereço HTTP com o IP do computador na rede local não dá acesso à câmara. A exceção para `localhost` aplica-se ao dispositivo onde a app está a correr.
5. Para simular o fim do teste, usa uma conta de teste. No Supabase, abre **Table Editor → account_trials**, identifica a linha pelo **User UID** de **Authentication → Users**, copia o valor original de `trial_ends_at` e muda-o para uma data passada. Recarrega **Scanner** e **Foto**, confirma que aparece **O teu teste grátis terminou** e envia o email. Verifica a linha em **Table Editor → waitlist** e repõe o prazo original da conta de teste. Confirma também que **Hoje** continua a aceitar alimentos manuais.

O scanner atribui os dados e as imagens ao [Open Food Facts](https://world.openfoodfacts.org/). Alguns produtos não têm marca, imagem, porção ou todos os valores nutricionais. Quando os valores necessários estão incompletos, podes usar o rótulo para adicionar manualmente em **Hoje**. O acesso à análise de refeições por foto já tem a proteção do teste. A análise está disponível a partir da fase (d).

## Configurar a fase (d) no Supabase

Depois das fases anteriores, abre **SQL Editor → New query**, copia todo o ficheiro [supabase/fase-4-foto-plano.sql](supabase/fase-4-foto-plano.sql) e carrega em **Run**. A migração acrescenta o registo das análises de foto, o armazenamento dos planos e a proteção técnica dos pedidos de IA.

## Configurar a OpenAI

Adiciona estas três variáveis ao `.env.local` e à Vercel em **Settings → Environment Variables**, incluindo o ambiente **Production**.

| Variável | Valor |
| --- | --- |
| `AI_PROVIDER` | `openai` |
| `AI_MODEL` | [`gpt-6.1-terra`](https://developers.openai.com/api/docs/models/gpt-6.1-terra) ou outro modelo OpenAI com visão e Structured Outputs |
| `AI_API_KEY` | Chave do teu projeto na OpenAI |

Reinicia o servidor local ou volta a fazer **Deploy** na Vercel após configurar as variáveis. A chave fica no servidor. O projeto ignora `.env.local`. O adaptador implementado está em `lib/ai-provider.ts` e usa a [Responses API da OpenAI](https://developers.openai.com/api/reference/resources/responses/methods/create).

O projeto da OpenAI precisa de saldo para responder. Se a API devolver `credit_balance_exhausted`, usa um projeto com saldo ou repõe o crédito antes de testar. [Erros da API OpenAI](https://developers.openai.com/api/docs/guides/error-codes).

A foto é convertida para JPEG no navegador, com até 1 280 px no lado maior. O servidor valida o formato e o limite de 4 MB, tira os metadados ao voltar a codificar e envia a imagem à OpenAI. A app guarda em `scans` só o estado e os resultados da análise. O pedido à OpenAI usa `store: false`, sujeito aos [controlos de retenção de dados do fornecedor](https://developers.openai.com/api/docs/guides/your-data).

A proteção técnica reserva cada pedido de IA na base de dados antes de o enviar, com um bloqueio por conta e funcionalidade. Usa uma janela móvel de uma hora, com até 20 análises de foto e 12 pedidos de plano por utilizador. Pedidos simultâneos e tentativas enviadas à IA mesmo que falhem entram nessa contagem. Isto não muda o prazo do teste grátis. A interface pede para tentar mais tarde quando a proteção técnica é acionada.

## Testar a fase (d)

1. Com uma conta de teste ativa e um plano nutricional criado, entra em **Foto**. Carrega uma imagem da galeria. Confirma a pré-visualização, analisa e verifica a lista de alimentos. Tenta também uma imagem sem comida.
2. Muda a porção de um alimento de 100 g para 200 g, se aplicável, e confirma que as calorias e os macros duplicam. Edita um valor, adiciona e remove alimentos, escolhe uma refeição e guarda. Em **Hoje**, confirma os alimentos e os totais.
3. No telemóvel, abre o endereço HTTPS da Vercel no Safari ou Chrome. Em **Foto**, toca em **Tirar foto**, tira uma fotografia da refeição e confirma. Testa também **Escolher imagem**.
4. Em **Hoje → Plano de refeições**, toca em **Sugerir plano de hoje**. Confirma as quatro refeições e compara os totais com as metas. Guarda o plano, recarrega e confirma que se mantém. Toca em **Adicionar ao diário** numa refeição e confirma o registo em **Hoje**. Repetir a mesma adição não duplica o registo.
5. Para simular a expiração numa conta de teste, copia o prazo atual em **Supabase → Table Editor → account_trials**, altera `trial_ends_at` para uma data passada e recarrega **Foto** e **Plano de refeições**. Confirma que aparece **O teu teste grátis terminou**, que o formulário da lista de espera funciona e que o diário manual em **Hoje** continua disponível. Repõe o prazo original no fim.
