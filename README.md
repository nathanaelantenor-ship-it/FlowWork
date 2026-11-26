# Flowork

Aplicativo web em português para administrar o workspace. Inclui login com Google, cadastro e login por e-mail, recuperação de senha, termos versionados e persistência privada por conta.

## Rodar localmente

Use Node.js 22.12 ou superior.

```sh
npm ci
npm test
npm run dev
```

Sem variáveis configuradas, a interface abre em modo de apresentação com autenticação desativada. Com Supabase configurado, pode criar contas e salvar dados reais. O HTML beta anterior e esta aplicação usam armazenamentos diferentes. A aplicação começa com um workspace vazio e modelos padrão por conta. Registros já preenchidos no HTML beta requerem uma migração separada.

## Configurar Supabase, Google e Vercel

1. **Supabase.** Crie um projeto separado para o piloto e execute a migração SQL na íntegra em um projeto novo. O SQL cria tabelas, regras de isolamento e o bucket privado. Conserve o arquivo de migração no repositório. Use a URL do projeto e a chave pública `sb_publishable_`. Para executar o teste contra Supabase hospedado, use um projeto de teste com contas e dados fictícios.
2. **E-mail.** Ative o provedor Email e **Confirm email** em Auth. Deixe login anônimo desativado. Configure SMTP próprio e confirme os limites do provedor. Configure no Supabase os templates de confirmação e recuperação de `supabase/templates/` e desative o rastreamento de links do SMTP. Substitua também o conteúdo da notificação de alteração de senha se habilitada. Configure a regra de senha de no mínimo 12 caracteres no servidor. Ative senha vazada, limites de Auth e alertas conforme o plano e as políticas do piloto. 
3. **Google.** Em Google Auth Platform, configure a marca Flowork, o e-mail de suporte e os endereços públicos de privacidade e termos. Para piloto, adicione os testadores à configuração de público quando aplicável. Crie uma credencial OAuth do tipo Web e configure o URI de redirecionamento que o Supabase mostra em **Auth → Providers → Google**. Em um projeto gerenciado, normalmente é `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Configure **Client ID** e **Client Secret** no Supabase. Os escopos do app são `openid email profile`. A página inicial abre uma nova guia para o Google e o retorno conclui a sessão por PKCE.
4. **GitHub e Vercel.** Importe este repositório na Vercel. O `vercel.json` define o build, diretório final e cabeçalhos de segurança. Defina `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_FLOWORK_OPERATOR` e `VITE_FLOWORK_PRIVACY_EMAIL` para o ambiente adequado. A configuração é lida na etapa de build. Nunca use `service_role`, credenciais de banco ou o segredo do Google em variáveis `VITE_*`.
5. **URLs de Auth.** Coloque a URL HTTPS efetiva do piloto como **Site URL** no Supabase, sem barra final, para os links enviados por e-mail. Nas Redirect URLs, adicione as URLs exatas do mesmo host terminadas em `/?flow=oauth-callback`, `/?flow=confirm` e `/?flow=recovery`. Para testar em Vite local, acrescente os equivalentes em `http://localhost:5173` e coloque a Site URL no host do ambiente em que os convites e links devem funcionar. Para Google, inicie e confirme no mesmo host. Use um endereço estável para o piloto. A Política de privacidade abre em `/?legal=privacy` e os Termos em `/?legal=terms`.
6. **Privacidade.** Revise o aviso e os termos antes do piloto com terceiros. Identifique o controlador, valide base legal e retenção e defina regiões de hospedagem, responsáveis e rotina para os pedidos. Os textos de partida ficam em `src/auth/privacy.js`. Ao mudá-los, crie uma migração de versão e altere `src/auth/config.js` no mesmo lançamento. O usuário dá ciência do aviso, aceita os termos separadamente e o banco registra as versões e a data.

## Validar antes de convidar pessoas

- Com a conta A, entre com e-mail, confirme o e-mail, aceite os termos, crie um documento e anexe um arquivo. Veja **Salvo na nuvem**, saia e entre novamente. Abra o documento e baixe o arquivo, inclusive de outro navegador.
- Com a conta B, confira o workspace inicial vazio e tente acessar uma referência de arquivo da conta A. O arquivo e a linha do workspace pertencem à A.
- Faça a mesma rodada de acesso com **Continuar com Google**, confira a origem e os escopos no Google e teste cancelar e reiniciar. Rode a recuperação de senha pelos links do SMTP.
- Faça edições concorrentes em duas guias e confira que a versão atrasada mostra conflito e permite baixar uma cópia antes de abrir a versão da nuvem. Simule uma falha de rede antes de sair.
- Baixe os dados em **Minha conta** e registre uma solicitação de teste. Confirme o protocolo e o procedimento de atendimento do responsável.

Os testes automatizados executam a migração em PostgreSQL local via PGlite, testam regras de isolamento e concorrência e simulam o ciclo de login da interface. Para OAuth e SMTP, a validação com os provedores depende da configuração acima. Consulte [arquitetura, segurança e privacidade](docs/ARQUITETURA-E-SEGURANCA.md).


## Referências de configuração

- [Login com Google no Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-google)
- [URLs de redirecionamento do Supabase Auth](https://supabase.com/docs/guides/auth/redirect-urls)
- [Templates de e-mail no Supabase](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Direitos dos titulares na ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
