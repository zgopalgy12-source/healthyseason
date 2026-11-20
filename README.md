# Healthy Season

Aplicação web de nutrição em português, com Next.js, TypeScript, Tailwind CSS e Supabase.

## Instalação local

1. Instale o Node.js 22 LTS ou superior.
2. Clone o repositório e abra a sua pasta no terminal.
3. Execute `npm ci`.
4. No PowerShell, execute `Copy-Item .env.example .env.local`.
5. Abra `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` com o Project URL e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a chave pública (publishable key) do projeto Supabase. Deixe `AI_API_KEY` vazia nesta fase. O Git ignora `.env.local`.
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

O scanner atribui os dados e as imagens ao [Open Food Facts](https://world.openfoodfacts.org/). Alguns produtos não têm marca, imagem, porção ou todos os valores nutricionais. Quando os valores necessários estão incompletos, podes usar o rótulo para adicionar manualmente em **Hoje**. O acesso à análise de refeições por foto já tem a proteção do teste. A análise será implementada na fase (d).
