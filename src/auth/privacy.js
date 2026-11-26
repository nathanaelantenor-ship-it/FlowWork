import { config } from './config.js';
import { escape } from './visual.js';

const operator = escape(config.operatorName || 'Identificação do responsável a configurar');
const email = config.privacyEmail
  ? '<a href="mailto:'+escape(config.privacyEmail)+'">'+escape(config.privacyEmail)+'</a>'
  : 'Canal de privacidade a configurar';

export const privacy = `
<h3>Quem cuida dos dados</h3>
<p>O responsável pelo Flowork é ${operator}. Canal de privacidade: ${email}.</p>
<h3>Quais dados usamos e para quê</h3>
<ul>
<li><strong>Conta e autenticação.</strong> Usamos nome, e-mail, identificador da conta e informações de sessão para criar seu acesso, recuperar a conta e manter seus dados vinculados a ela. O provedor de autenticação armazena a senha em formato de hash.</li>
<li><strong>Entrada com Google.</strong> O Google apresenta a autorização. O Flowork usa a identificação fornecida pelo Google, que pode incluir nome, e-mail e foto de perfil, para autenticar a conta. As permissões solicitadas se limitam a OpenID, e-mail e perfil básico.</li>
<li><strong>Dados do workspace.</strong> Guardamos os registros que você cria em clientes, projetos, conteúdo, estudos, documentos, mapas e financeiro, além dos arquivos que envia. Usamos esses dados para manter seu espaço disponível entre sessões e executar as funções que você aciona.</li>
<li><strong>Termos e direitos.</strong> Registramos versões e datas dos termos aceitos e avisos lidos, além do protocolo, tipo, data e situação dos pedidos de privacidade.</li>
</ul>
<h3>Bases legais</h3>
<p>O tratamento necessário para autenticar e disponibilizar o Flowork é feito para execução do serviço ou procedimentos preliminares solicitados pelo titular. Obrigações legais e exercício regular de direitos podem exigir retenção de registros específicos. A autorização exibida pelo Google vale para a conexão com a sua conta Google. A confirmação de leitura deste aviso registra ciência sobre o tratamento descrito.</p>
<h3>Operadores e compartilhamento</h3>
<p>Supabase fornece autenticação, banco de dados e armazenamento de arquivos. Vercel hospeda a aplicação. O envio de mensagens de autenticação usa o provedor de e-mail configurado para o Flowork. O Google participa quando você escolhe essa forma de entrada. Uma prévia externa que você abrir pode transmitir dados técnicos da conexão ao serviço do link.</p>
<p>Conforme a região contratada e a infraestrutura dos prestadores, pode haver tratamento internacional. Quando aplicável, a transferência deve observar a LGPD e os mecanismos de proteção exigidos pela ANPD. Você pode pedir informações específicas sobre os prestadores e as transferências pelo canal acima.</p>
<h3>Retenção, exclusão e segurança</h3>
<p>A sessão pode ser encerrada a qualquer momento. Encerrar a sessão preserva os registros vinculados à conta. Envie uma solicitação para encerramento da conta e análise da eliminação dos dados. Registros sujeitos a obrigação legal, exercício de direitos ou outra hipótese aplicável podem ser conservados conforme a finalidade remanescente. O canal de privacidade informa os prazos aplicáveis ao seu pedido e a cópias de segurança.</p>
<p>A área de trabalho tem controle de acesso por conta. Os arquivos ficam em armazenamento privado. O navegador guarda os dados necessários à sessão. Use “Sair da conta” em um dispositivo compartilhado.</p>
<h3>Seus direitos</h3>
<p>Você pode pedir confirmação e acesso, correção, informação sobre compartilhamento, portabilidade quando aplicável, anonimização, bloqueio ou eliminação nas hipóteses legais, oposição e revisão. Quando houver tratamento com base em consentimento, você poderá revogá-lo e solicitar a eliminação nos casos previstos na lei. Você também pode peticionar perante a ANPD.</p>
<p>Na área <strong>Minha conta</strong>, há um download dos registros e arquivos do workspace e um formulário para abrir pedidos de privacidade. Para dúvidas ou pedidos mesmo sem acesso à conta, use ${email}. O responsável pode verificar sua identidade antes de compartilhar dados ou efetivar pedidos.</p>
`;

export const terms = `
<h3>O serviço</h3>
<p>Flowork é um espaço de trabalho para organizar clientes, projetos, documentos, conteúdo e registros financeiros. A versão de testes permite usar os recursos disponíveis com uma conta individual.</p>
<h3>Conta e uso do workspace</h3>
<p>Proteja o acesso à conta e use dados aos quais você tem direito de acesso. Se cadastrar informações de clientes ou terceiros, garanta uma finalidade e uma base legal apropriadas para esse uso. Você mantém os direitos sobre os materiais que adiciona e autoriza o processamento técnico necessário à operação do workspace.</p>
<h3>Arquivos e dados</h3>
<p>Arquivos enviados e registros criados ficam vinculados à sua conta. A interface informa o estado do salvamento. Você pode exportar os dados em <strong>Minha conta</strong> enquanto tiver acesso ao workspace.</p>
<h3>Privacidade, suporte e encerramento</h3>
<p>A Política de privacidade descreve como os dados são tratados. Para suporte, solicitação de direitos ou encerramento de conta, entre em contato com ${operator} em ${email}.</p>
`;
