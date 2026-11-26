# Arquitetura, segurança e privacidade

## Persistência

- A sessão é provisionada pelo Supabase Auth. O UID autenticado determina o dono dos dados. O e-mail é identificação e contato, não chave do workspace. O app confirma a identidade com o Supabase antes de montar a interface.
- O piloto usa um documento JSONB por conta, com esquema, revisão e identificador de mutação. Essa unidade mantém consistentes alterações que atravessam módulos, como fechar um negócio e criar a pasta do cliente. Os arquivos ficam no Storage, fora do JSONB. O banco limita registros a 4 MiB por workspace e o bucket limita cada arquivo a 25 MiB.
- Uma gravação serializada exige a revisão anterior. Repetir o mesmo identificador com o mesmo conteúdo é seguro em caso de resposta perdida. Outra alteração na mesma revisão gera conflito e preserva o conteúdo já gravado. A interface acompanha revisões na nuvem, permite copiar mudanças locais e evita uma saída voluntária com mudanças pendentes.
- Encerrar a sessão remove o acesso e limpa o workspace da interface e da memória ativa. Não executa exclusão no banco. O navegador retém a sessão do SDK no armazenamento local até sair e o verificador PKCE por guia. O app não usa o armazenamento do navegador como cópia persistente dos dados do workspace. Se a janela for fechada à força antes de o servidor confirmar a gravação, as alterações pendentes podem ser perdidas.
- Vários dispositivos e contas são suportados pela mesma infraestrutura. Cada workspace é individual. Aprovação do cliente é uma prévia dentro da conta, como no beta. Compartilhamento, empresas multiusuário e permissões de equipe exigem modelo de membros e papéis antes de expor dados de um cliente a outro.
- O modelo de snapshot serve ao piloto. Para grandes bases, consultas transversais ou colaboração simultânea, planeje migrações incrementais para entidades relacionais, cotas e trilha de auditoria. A convenção de arquivos permite identificar objetos órfãos quando um upload é cancelado ou seu registro é removido. Defina uma rotina administrativa de limpeza e retenção antes de operar em escala.

## Controles implementados

- Row Level Security na leitura; funções de gravação derivam o dono de `auth.uid()`, fixam o `search_path`, validam versão legal e não aceitam um dono enviado pelo navegador. Sem alteração direta de registros para `anon` e `authenticated`.
- Bucket privado com prefixo do UID, verificação do dono e tamanho máximo. O navegador recebe apenas a chave pública. Imagens locais são exibidas como blobs. Arquivos genéricos são tratados como download. Links aceitam HTTP(S) e as prévias incorporadas suportadas são isoladas em iframe.
- OAuth Google por PKCE com verificador isolado por guia, destino de autorização validado e limpeza do código de retorno. O app pede apenas OpenID, e-mail e perfil básico e não usa tokens do Google para acessar serviços externos.
- Emails de confirmação e recuperação usam tokens de uso único. O link entra na página por fragmento e a verificação exige interação, para evitar que o pré-carregamento de links pelo e-mail consuma o token. A sessão temporária de recuperação não é compartilhada com a sessão principal. Depois de redefinir, o app pede novo login e solicita revogação das sessões de refresh.
- CSP sem script inline, proibição de framing externo do app, proteção de referenciador e restrições de recursos do navegador. A migração e esses controles são uma revisão inicial, não uma certificação.
- Antes da operação pública, valide cabeçalhos no domínio real, configure rate limits e proteção antibot apropriada, revise políticas de sessão, vazamento de senhas, logs, recuperação de incidente, retenção e backup. Defina um teste de restauração. Os objetos do Storage precisam ser incluídos na estratégia de backup, além do banco.

## Atendimento de privacidade

- Os termos aceitos e a ciência do aviso são registrados por versão com data do banco. A autorização OAuth ocorre na tela do Google. Uso essencial do workspace, permissões do Google e consentimento opcional para finalidades futuras são decisões distintas.
- Os usuários podem exportar os dados e arquivos referenciados no workspace, visualizar protocolos e registrar solicitações. O pedido de exclusão é registrado para análise humana. Ainda não existe painel administrativo, envio automático de avisos ao responsável ou exclusão imediata.
- Antes do piloto, atribua a monitorização dos protocolos em `public.flowork_privacy_requests` a um operador com acesso restrito. Use o e-mail público para validar pedidos, registrar o atendimento, orientar o titular e responder conforme a LGPD. Ao aprovar exclusão, avalie retenções justificadas, remova objetos via Storage e só então aplique a remoção de conta via ferramenta administrativa. A remoção da conta exclui registros vinculados por chave estrangeira. Documente o tratamento de cópias de segurança e a prestação de contas.
- Confirme as transferências internacionais, os suboperadores e os contratos dos prestadores instalados. Valide o aviso com os dados da operação real, sobretudo antes de convidar usuários externos ou comercializar o serviço.
