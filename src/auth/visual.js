export const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
export const fwMark = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" aria-hidden="true"><path d="M4.5 17.5c3.5 0 3.5-5.5 7-5.5h8M4.5 12c3.5 0 3.5-5.5 7-5.5h8M12.5 17.5h7"/></svg>';
const google = '<svg class="oauth-logo" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.1l6.6 5.1c3.9-3.6 6.1-8.8 6.1-14.9Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.6l-6.6-5.1a12.3 12.3 0 0 1-18.2-6.5l-6.8 5.3A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.7 27.8a12 12 0 0 1 0-7.6l-6.8-5.3a20 20 0 0 0 0 18.2l6.8-5.3Z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9A19.2 19.2 0 0 0 24 4 20 20 0 0 0 5.9 14.9l6.8 5.3A11.9 11.9 0 0 1 24 11.9Z"/></svg>';
const icon = (path, css = '') => '<svg class="'+css+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+path+'"/></svg>';
const eye = icon('M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z');
const open = icon('M13 5h6v6m0-6-7 7M10 5H5v14h14v-5');
const close = '<button class="access-close" type="button" data-close-dialog aria-label="Fechar">'+icon('m6 6 12 12M18 6 6 18')+'</button>';
const legalLink = name => '<a href="/?legal='+name+'" data-legal="'+name+'">'+(name==='terms'?'Termos de uso':'Política de privacidade')+'</a>';
const passwordField = (label, name, autocomplete) =>
  '<div class="access-field"><label for="access-'+name+'">'+label+'</label><span class="password-wrap"><input type="password" id="access-'+name+'" name="'+name+'" autocomplete="'+autocomplete+'" required maxlength="128"'+
  (autocomplete==='new-password'?' minlength="12"':'')+'><button type="button" data-password="'+name+'" aria-label="Mostrar senha" aria-pressed="false">'+eye+'</button></span></div>';
const emailField = '<label class="access-field"><span>E-mail</span><input type="email" name="email" autocomplete="email" placeholder="voce@exemplo.com" required maxlength="254"></label>';
const legalFooter = '<div class="access-foot">'+legalLink('terms')+'<i></i>'+legalLink('privacy')+'</div>';
const form = (kind, fields, text, disabled = false) => '<form class="access-form" data-auth-form="'+kind+'">'+fields+
  '<button type="submit" class="access-submit"'+(disabled?' disabled':'')+'>'+text+'</button></form>';
const modeLink = (mode, label) => '<button type="button" class="access-text" data-auth-mode="'+mode+'">'+label+'</button>';
const alert = message => '<p class="access-message" role="status" aria-live="polite"'+(message?'':' hidden')+'>'+escape(message)+'</p>';

function artwork() {
  return '<div class="auth-brand-panel"><a class="auth-brand" href="/" aria-label="Flowork"><span>'+fwMark+'</span><b>Flowork</b></a>'+
    '<div class="auth-brand-copy"><h1>Seu trabalho,<br>em um só lugar<span>.</span></h1><p>Clientes, projetos e conteúdo no mesmo espaço.</p></div>'+
    '<div class="auth-orbit" aria-hidden="true"><div class="auth-ring a"></div><div class="auth-ring b"></div><div class="auth-ring c"></div><div class="auth-ring d"></div>'+
    '<span class="orbit-node one">'+icon('M4 5h16v14H4zM10 5v14M4 11h6')+'</span>'+
    '<span class="orbit-node two">'+icon('M4 18h16M7 15v-4m5 4V6m5 9v-7')+'</span>'+
    '<span class="orbit-node three">'+icon('M5 7h5l2 2h7v10H5zM5 7V5h6l2 2h6v2')+'</span>'+
    '<span class="orbit-core">'+fwMark+'</span></div></div>';
}

export function renderAccess(mode, { ready = true, message = '' } = {}) {
  let title, description, content;
  if (mode === 'login' || mode === 'signup') {
    const signup = mode === 'signup';
    title = signup ? 'Crie sua conta' : 'Entre no Flowork';
    description = signup ? 'Configure seu espaço de trabalho.' : 'Acesse seu espaço de trabalho.';
    const tabs = '<nav class="access-tabs" aria-label="Acesso">'+[['login','Entrar'],['signup','Criar conta']].map(([value,label]) =>
      '<button type="button" data-auth-mode="'+value+'" aria-pressed="'+(mode===value)+'">'+label+'</button>').join('')+'</nav>';
    const oauth = ready ? '<a class="google-button" href="/?flow=google" target="_blank" rel="noopener noreferrer">'+google+'<span>Continuar com Google</span>'+open+'</a>' :
      '<button class="google-button" type="button" disabled>'+google+'<span>Continuar com Google</span>'+open+'</button>';
    const fields = (signup ? '<label class="access-field"><span>Nome</span><input type="text" name="name" autocomplete="name" maxlength="100" required></label>' : '') +
      emailField + passwordField('Senha','password',signup?'new-password':'current-password') +
      (signup ? '<p class="access-hint">Use pelo menos 12 caracteres.</p>' : '<div class="forgot-row">'+modeLink('forgot','Esqueci a senha')+'</div>');
    content = tabs + oauth + '<div class="access-divider"><span>ou com e-mail</span></div>' +
      form(mode, fields, signup ? 'Criar conta' : 'Entrar', !ready) + legalFooter;
  } else if (mode === 'forgot') {
    title = 'Recuperar senha';
    description = 'Informe o e-mail da conta para receber o link de recuperação.';
    content = form(mode,emailField,'Enviar link',!ready)+modeLink('login','Voltar para entrar')+legalFooter;
  } else if (mode === 'confirm') {
    title = 'Confirme seu e-mail';
    description = 'Confirme o cadastro para ativar seu acesso ao Flowork.';
    content = form(mode,'','Confirmar e-mail',!ready)+modeLink('login','Voltar para entrar')+legalFooter;
  } else if (mode === 'recovery') {
    title = 'Redefina sua senha';
    description = 'Use pelo menos 12 caracteres para sua nova senha.';
    content = form(mode,passwordField('Nova senha','password','new-password')+passwordField('Repita a nova senha','confirmation','new-password'),'Salvar nova senha',!ready)+modeLink('login','Voltar para entrar')+legalFooter;
  } else if (mode === 'legal') {
    title = 'Termos e privacidade';
    description = 'Leia como usamos os dados da autenticação e do seu espaço.';
    content = '<div class="policy-links">'+legalLink('terms')+legalLink('privacy')+'</div>'+
      form(mode,'<label class="access-check"><input type="checkbox" name="terms" required> <span>Li e aceito os Termos de uso.</span></label>'+
        '<label class="access-check"><input type="checkbox" name="privacy" required> <span>Li a Política de privacidade e estou ciente do tratamento de dados descrito.</span></label>',
      'Continuar para o Flowork')+modeLink('logout','Sair da conta');
  } else if (mode === 'blocked') {
    title = 'Não foi possível abrir seu espaço';
    description = 'Tente carregar novamente para acessar os dados da sua conta.';
    content = '<button class="access-submit" type="button" data-auth-mode="retry">Tentar novamente</button>'+modeLink('logout','Sair da conta')+legalFooter;
  } else {
    title = mode==='google'?'Conectando ao Google':'Carregando seu espaço';
    description = mode==='google'?'Você será redirecionado para escolher sua conta.':'Estamos verificando seu acesso.';
    content = '<div class="auth-progress" role="status" aria-label="'+title+'"></div>'+legalFooter;
  }
  return '<div class="access-layout">'+artwork()+'<div class="access-content"><div class="access-card">'+
    '<h2 id="access-title">'+title+'</h2><p class="access-description">'+description+'</p>'+
    alert(message||(!ready?'O acesso estará disponível após a configuração do ambiente.':''))+content+'</div></div></div>';
}

export const requestKinds = [
  ['information','Informações sobre o tratamento'], ['access','Acesso aos dados'], ['correction','Correção de dados'],
  ['portability','Portabilidade'], ['deletion','Exclusão ou encerramento da conta'], ['objection','Oposição ou revisão do tratamento']
];
const requestStates = { received:'Recebida', processing:'Em análise', resolved:'Concluída' };
export function renderAccount(user, status, requests = [], email = '') {
  const rows = requests.map(r => '<li><b>'+escape(requestKinds.find(([k]) => k===r.kind)?.[1] || r.kind)+'</b><small>'+
    escape(requestStates[r.state]||r.state)+' · '+escape(new Date(r.created_at).toLocaleDateString('pt-BR'))+' · '+escape(r.id)+'</small></li>').join('');
  return '<header class="access-dialog-head"><h2 id="account-title">Minha conta</h2>'+close+'</header><p class="account-email">'+escape(user.email)+'</p>'+
    '<div class="account-sync"><b>Salvamento</b><span data-account-sync>'+escape(status)+'</span></div>'+
    '<div class="account-actions"><button type="button" class="access-secondary" data-account="sync">Sincronizar agora</button>'+
    '<button type="button" class="access-secondary" data-account="export">Baixar meus dados (.zip)</button></div>'+
    '<form class="account-request account-backup" data-account-form="verify-backup"><label class="access-field"><span>Verificar cópia de segurança do Flowork</span><input type="file" name="backup" accept=".zip,application/zip" required></label><button type="submit" class="access-secondary">Verificar ZIP</button></form>'+
    '<div class="account-conflict" data-account-conflict hidden><p>Há uma versão mais recente na nuvem. Baixe sua cópia antes de atualizar esta guia.</p>'+
    '<button type="button" class="access-secondary" data-account="backup">Baixar minhas alterações (.json)</button> '+
    '<button type="button" class="access-secondary" data-account="reload">Abrir versão da nuvem</button></div>'+
    '<section class="account-privacy"><h3>Solicitações de privacidade</h3>'+
    '<form class="account-request" data-account-form="privacy"><label class="access-field"><span>Tipo de solicitação</span><select name="kind" required>'+
    requestKinds.map(([key,name])=>'<option value="'+key+'">'+name+'</option>').join('')+
    '</select></label><button type="submit" class="access-secondary">Registrar</button></form>'+
    '<p class="account-note">Para complementar um pedido, contate '+(email?'<a href="mailto:'+escape(email)+'">'+escape(email)+'</a>':'o responsável pelo Flowork')+' e informe o protocolo.</p>'+
    (rows?'<ul class="account-requests">'+rows+'</ul>':'')+'</section>'+
    '<p class="account-alert" data-account-message role="status" aria-live="polite"></p><footer class="account-foot">'+legalLink('privacy')+
    '<button type="button" class="access-exit" data-account="logout">Sair da conta</button></footer>';
}

export function legalDialog(document, version, content) {
  const title = document==='terms'?'Termos de uso':'Política de privacidade';
  return '<header class="access-dialog-head"><div><h2 id="legal-title">'+title+'</h2><p>Versão '+escape(version)+'</p></div>'+close+'</header>'+
    '<div class="legal-body">'+content+'</div>';
}
