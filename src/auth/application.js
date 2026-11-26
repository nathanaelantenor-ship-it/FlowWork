import { accountSnapshot, accountStorage, createRecoveryBackend, privacyRequests } from './backend.js';
import { config, legalVersions } from './config.js';
import { privacy, terms } from './privacy.js';
import { legalDialog, renderAccess, renderAccount, requestKinds } from './visual.js';
import { createWorkspaceSync } from '../workspace/sync.js';

const browser = window;
const access = document.getElementById('access');
const workspaceRoot = document.getElementById('workspace-root');
const accountDialog = document.getElementById('account-dialog');
const legalModal = document.getElementById('legal-dialog');
const route = new URL(browser.location.href);
let token = new URLSearchParams(route.hash.slice(1)).get('token') || '';
const returnHere = browser.location.origin + '/';
const statusLabels = {
  pending:'Alterações pendentes', saving:'Salvando…', saved:'Salvo na nuvem',
  error:'Falha ao salvar', conflict:'Conflito de versões'
};

function securityMessage(error, mode) {
  if (error.code === 'email_not_confirmed') return 'Confirme seu e-mail para entrar. Confira a caixa de entrada e o spam.';
  if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit' || error.status === 429)
    return 'Aguarde alguns minutos antes de tentar novamente.';
  if (error.code === 'weak_password' || error.name === 'AuthWeakPasswordError')
    return 'Escolha uma senha mais resistente. Use uma frase longa e evite senhas conhecidas ou reutilizadas.';
  if (mode === 'login' && (error.code === 'invalid_credentials' || error.status === 400))
    return 'E-mail ou senha inválidos.';
  if (mode === 'recovery' || mode === 'confirm') return 'O link é inválido, expirou ou já foi usado. Solicite um novo.';
  return 'Não foi possível concluir agora. Verifique a conexão e tente novamente.';
}

function attachDownload(name, blob) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function startApplication(client) {
  let mode = 'login', current, sync, workspace, mountAbort, epoch = 0, locked = false, authBusy = false, accountBusy = false, reservedFlow = '';
  let syncState = 'saved', operations = new Set(), requestRows = [];

  function show(next, message = '') {
    mode = next;
    access.hidden = false;
    access.innerHTML = renderAccess(next, { ready: Boolean(client), message });
    document.title = next === 'login' || next === 'signup' ? 'Flowork — Acesso' : 'Flowork';
  }
  function showLegal(which) {
    if (which !== 'terms' && which !== 'privacy') return;
    legalModal.innerHTML = legalDialog(which, legalVersions[which], which === 'terms' ? terms : privacy);
    if (!legalModal.open) legalModal.showModal();
  }
  function message(value) {
    const notice = access.querySelector('.access-message');
    if (notice) { notice.textContent = value; notice.hidden = !value; }
  }
  function accountMessage(value) {
    const node = accountDialog.querySelector('[data-account-message]');
    if (node) node.textContent = value;
  }
  function refreshStatus() {
    for (const item of document.querySelectorAll('[data-sync-state],[data-account-sync]')) {
      item.textContent = statusLabels[syncState];
      item.dataset.level = syncState;
    }
    const problem = accountDialog.querySelector('[data-account-conflict]');
    if (problem) problem.hidden = syncState !== 'conflict';
  }
  function resetWorkspace() {
    mountAbort?.abort();
    sync?.close();
    workspace?.clear();
    for (const element of workspaceRoot.querySelectorAll('#sidebar,#topbar,#main')) element.replaceChildren();
    workspaceRoot.hidden = true;
    if (accountDialog.open) accountDialog.close();
    accountDialog.replaceChildren();
    operations = new Set();
    workspace = sync = mountAbort = undefined;
    requestRows = [];
    locked = false;
  }
  function beginOperation() {
    if (locked || !mountAbort || mountAbort.signal.aborted) return null;
    const group = operations;
    let resolve;
    const done = new Promise(finish => { resolve = finish; });
    group.add(done);
    return () => { group.delete(done); resolve(); };
  }
  function openAccount() {
    if (!current || !workspace) return;
    accountDialog.innerHTML = renderAccount(current.user, statusLabels[syncState], requestRows, config.privacyEmail);
    if (!accountDialog.open) accountDialog.showModal();
    refreshStatus();
    const owner = current.user.id;
    void privacyRequests(client).then(rows => {
      if (current?.user.id !== owner) return;
      requestRows = rows;
      if (!accountBusy && accountDialog.open) {
        const existing = accountDialog.querySelector('.account-requests');
        const updated = document.createElement('template');
        updated.innerHTML = renderAccount(current.user, statusLabels[syncState], rows, config.privacyEmail);
        const list = updated.content.querySelector('.account-requests');
        if (list && existing) existing.replaceWith(list);
        if (list && !existing) accountDialog.querySelector('.account-privacy').append(list);
      }
    }).catch(() => accountMessage('Não foi possível carregar as solicitações.'));
  }
  async function loadWorkspace() {
    if (!current?.snapshot || workspace) return;
    const { user, snapshot } = current, attempt = epoch;
    if (snapshot.workspace && (snapshot.workspace.schema_version !== 1 || !Number.isSafeInteger(Number(snapshot.workspace.revision)))) {
      show('blocked', 'O formato do workspace requer uma atualização do aplicativo.');
      return;
    }
    const { mountWorkspace } = await import('../workspace/generated.js');
    if (attempt !== epoch) return;
    mountAbort = new AbortController();
    operations = new Set();
    syncState = 'saved';
    const store = accountStorage(client, user.id, mountAbort.signal);
    sync = createWorkspaceSync({
      revision: Number(snapshot.workspace?.revision || 0),
      write: store.write,
      onState: state => { syncState = state; refreshStatus(); }
    });
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Flowork';
    access.hidden = true;
    workspaceRoot.hidden = false;
    document.title = 'Flowork — Área de trabalho';
    workspace = mountWorkspace({
      displayName: typeof name === 'string' ? name.slice(0, 100) : 'Flowork',
      file: store.file, sync, signal: mountAbort.signal,
      openAccount, logout, refreshStatus, startOperation: beginOperation
    }, snapshot.workspace?.data);
  }

  async function activate(session, force = false) {
    if (!session) {
      const interrupted = sync?.dirty;
      ++epoch;
      resetWorkspace();
      current = undefined;
      show('login', interrupted ? 'A sessão foi encerrada em outra guia. Alterações ainda não sincronizadas podem ter sido perdidas.' : '');
      return;
    }
    if (current?.user.id === session.user.id && !force) return;
    const attempt = ++epoch;
    resetWorkspace();
    current = undefined;
    show('loading');
    try {
      const verified = await client.auth.getUser(session.access_token);
      if (attempt !== epoch) return;
      if (verified.error || !verified.data?.user || verified.data.user.id !== session.user.id)
        throw verified.error || new Error('invalid_account');
      current = { user: verified.data.user };
      const snapshot = await accountSnapshot(client, current.user.id);
      if (attempt !== epoch) return;
      current.snapshot = snapshot;
      if (snapshot.version.terms_version !== legalVersions.terms || snapshot.version.privacy_version !== legalVersions.privacy) {
        show('blocked', 'Uma versão atualizada dos Termos ou da Política de privacidade está sendo preparada.');
        return;
      }
      const acknowledged = snapshot.acceptances.some(item =>
        item.terms_version === legalVersions.terms && item.privacy_version === legalVersions.privacy);
      if (acknowledged) await loadWorkspace();
      else show('legal');
    } catch {
      if (attempt === epoch) {
        resetWorkspace();
        show('blocked');
      }
    }
  }

  async function syncChanges() {
    await Promise.allSettled([...operations]);
    return sync ? sync.flush() : true;
  }
  async function logout() {
    if (!client || locked) return;
    locked = true;
    if (!(await syncChanges())) {
      accountMessage(syncState === 'conflict' ? 'Baixe suas alterações e abra a versão da nuvem antes de sair.' : 'Ainda há alterações pendentes. Tente sincronizar antes de sair.');
      locked = false;
      return;
    }
    const result = await client.auth.signOut({ scope: 'local' });
    if (result.error) {
      accountMessage('Não foi possível encerrar a sessão. Tente novamente.');
      message('Não foi possível encerrar a sessão. Tente novamente.');
      locked = false;
      return;
    }
    await activate(null);
  }
  async function startGoogle() {
    reservedFlow = 'google';
    show('google');
    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google', options: { scopes:'openid email profile', skipBrowserRedirect: true,
          redirectTo: returnHere+'?flow=oauth-callback', queryParams: { prompt: 'select_account' } }
      });
      if (error || !data?.url) throw error || new Error('missing_provider_url');
      const destination = new URL(data.url);
      if (destination.origin !== new URL(config.url).origin || destination.pathname !== '/auth/v1/authorize')
        throw new Error('unexpected_provider_url');
      browser.location.assign(destination.href);
    } catch {
      reservedFlow = '';
      show('login', 'Não foi possível iniciar o login com Google. Tente novamente.');
    }
  }

  async function initialRoute() {
    const flow = route.searchParams.get('flow') || '';
    const legal = route.searchParams.get('legal');
    if (flow || route.searchParams.has('code') || token) browser.history.replaceState(null, '', '/');
    if (!client) {
      show('login');
      showLegal(legal);
      return;
    }
    if (flow === 'google') return startGoogle();
    if (flow === 'oauth-callback') {
      reservedFlow = 'google-callback';
      show('loading');
      try {
        const code = route.searchParams.get('code');
        if (!code || route.searchParams.has('error') || new URLSearchParams(route.hash.slice(1)).has('error')) throw new Error('oauth_cancelled');
        const response = await client.auth.exchangeCodeForSession(code);
        if (response.error || !response.data.session) throw response.error || new Error('missing_session');
        reservedFlow = '';
        await activate(response.data.session);
      } catch {
        reservedFlow = '';
        show('login','A conexão com Google foi cancelada ou expirou. Abra uma nova tentativa.');
      }
      return;
    }
    if (flow === 'confirm' || flow === 'recovery') {
      reservedFlow = flow;
      show(flow, token ? '' : 'Link incompleto. Solicite um novo pelo Flowork.');
      return;
    }
    if (legal) {
      show('login');
      showLegal(legal);
      return;
    }
    const result = await client.auth.getSession();
    if (result.error && result.error.name !== 'AuthSessionMissingError') {
      show('blocked');
      return;
    }
    await activate(result.data?.session);
  }

  if (client) client.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || reservedFlow || authBusy || route.searchParams.has('legal')) return;
    // The auth client holds its lock while emitting these events.
    setTimeout(() => { if (!authBusy && !reservedFlow) void activate(session); }, 0);
  });

  document.addEventListener('click', async event => {
    const button = event.target.closest('button,a');
    if (!button) return;
    const link = button.dataset.legal;
    if (link) { event.preventDefault(); showLegal(link); return; }
    if (button.hasAttribute('data-close-dialog')) { button.closest('dialog')?.close(); return; }
    if (button.dataset.password) {
      const input = button.closest('form').elements[button.dataset.password];
      input.type = input.type === 'password' ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(input.type === 'text'));
      button.setAttribute('aria-label', input.type === 'text' ? 'Ocultar senha' : 'Mostrar senha');
      return;
    }
    const next = button.dataset.authMode;
    if (next && !authBusy) {
      if (next === 'logout') { await logout(); return; }
      if (next === 'retry' && client) {
        const { data, error } = await client.auth.getSession();
        if (error) show('blocked');
        else await activate(data?.session, true);
        return;
      }
      if (recoveryClient) { await recoveryClient.auth.signOut({scope:'local'}).catch(()=>{}); recoveryClient = undefined; }
      reservedFlow = '';token = '';show(next);
      return;
    }
    const action = button.dataset.account;
    if (!action || accountBusy || !current || !workspace) return;
    const jobWorkspace = workspace, ownerAtStart = current.user.id;
    accountBusy = true;
    button.disabled = true;
    try {
      if (action === 'logout') await logout();
      if (action === 'sync') accountMessage(await syncChanges() ? 'Alterações salvas.' : 'A sincronização continua pendente.');
      if (action === 'backup' || action === 'reload') {
        await Promise.allSettled([...operations]);
        if (workspace !== jobWorkspace || current?.user.id !== ownerAtStart) return;
        attachDownload('flowork-alteracoes.json', new Blob([JSON.stringify(jobWorkspace.snapshot(),null,2)],{type:'application/json'}));
        if (action === 'reload') {
          const { data } = await client.auth.getSession();
          await activate(data?.session,true);
        } else accountMessage('Cópia preparada.');
      }
      if (action === 'export') {
        await Promise.allSettled([...operations]);
        if(workspace!==jobWorkspace||current?.user.id!==ownerAtStart)return;
        const account = { id:current.user.id, email:current.user.email, created_at:current.user.created_at };
        const blob = await jobWorkspace.archive(account, current.snapshot.acceptances, await privacyRequests(client));
        if (workspace === jobWorkspace) { attachDownload('flowork-meus-dados.zip',blob); accountMessage('Exportação preparada.'); }
      }
    } catch { accountMessage('Não foi possível concluir a ação. Tente novamente.'); }
    finally { button.disabled = false; accountBusy = false; }
  });

  document.addEventListener('submit', async event => {
    const form = event.target;
    if (form.dataset.accountForm === 'verify-backup') {
      event.preventDefault();
      if (accountBusy || !current || !workspace) return;
      const job=workspace, submit=event.submitter;
      accountBusy=true;
      if(submit)submit.disabled=true;
      accountMessage('Verificando o arquivo neste navegador…');
      try {
        const verified=await job.readBackup(new FormData(form).get('backup'));
        if(workspace!==job)return;
        if(verified.identity.account?.id!==current.user.id){accountMessage('Esta cópia pertence a outra conta.');return}
        accountMessage('Cópia íntegra. Registros e '+verified.attachments.size+' anexo(s) conferidos. Seus dados atuais foram preservados.');
      } catch {
        if(workspace===job)accountMessage('Não foi possível verificar a cópia. Confira se o ZIP é uma exportação completa do Flowork.');
      } finally {accountBusy=false;if(submit)submit.disabled=false}
      return;
    }
    if (form.dataset.accountForm === 'privacy') {
      event.preventDefault();
      if (accountBusy || !current) return;
      accountBusy = true;
      const submit = event.submitter, who = current.user.id;
      if (submit) submit.disabled = true;
      try {
        const kind = new FormData(form).get('kind');
        if (!requestKinds.some(([key]) => key===kind)) return;
        const result = await client.rpc('flowork_request_privacy',{request_kind:kind});
        if (result.error) throw result.error;
        const rows = await privacyRequests(client);
        if (current?.user.id !== who) return;
        requestRows = rows;
        openAccount();
        accountMessage('Solicitação registrada. Protocolo: '+result.data);
      } catch { accountMessage('Não foi possível confirmar o pedido. Tente novamente ou use o e-mail de privacidade.'); }
      finally { accountBusy = false; if (submit) submit.disabled = false; }
      return;
    }
    const stage = form.dataset.authForm;
    if (!stage) return;
    event.preventDefault();
    if (!client || authBusy) return;
    authBusy = true;
    const submit = event.submitter;
    if (submit) submit.disabled = true;
    const fields = new FormData(form);
    const email = String(fields.get('email') || '').trim().toLowerCase();
    const password = String(fields.get('password') || '');
    try {
      if ((stage === 'signup' || stage === 'recovery') && (password.length < 12 || new TextEncoder().encode(password).length > 72)) {
        message('Use no mínimo 12 caracteres e uma senha de até 72 bytes.');return;
      }
      if (stage === 'login') {
        const result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        await activate(result.data.session, true);
      }
      if (stage === 'signup') {
        const name = String(fields.get('name') || '').trim();
        if (!name) { message('Informe seu nome.'); return; }
        const result = await client.auth.signUp({ email, password, options:{ data:{full_name:name}, emailRedirectTo:returnHere+'?flow=confirm' } });
        if (result.error) throw result.error;
        if (result.data.session) {
          await client.auth.signOut({ scope:'local' });
          show('login','O cadastro com e-mail está indisponível até a confirmação de endereço ser ativada.');
          return;
        }
        show('login','Confira seu e-mail para confirmar o cadastro, caso você tenha solicitado uma nova conta.');
      }
      if (stage === 'forgot') {
        const result = await client.auth.resetPasswordForEmail(email,{redirectTo:returnHere+'?flow=recovery'});
        if (result.error && ![400,404].includes(result.error.status)) throw result.error;
        show('login','Se houver uma conta elegível para esse e-mail, você receberá o link de recuperação.');
      }
      if (stage === 'confirm') {
        const verified = await client.auth.verifyOtp({type:'email',token_hash:token});
        if (verified.error) throw verified.error;
        token = '';
        reservedFlow = '';
        await activate(verified.data.session, true);
      }
      if (stage === 'recovery') {
        if (fields.get('confirmation') !== password) { message('As senhas precisam ser iguais.'); return; }
        recoveryClient ||= createRecoveryBackend();
        if (token) {
          const verified = await recoveryClient.auth.verifyOtp({type:'recovery',token_hash:token});
          if (verified.error) throw verified.error;
          token = '';
        }
        const result = await recoveryClient.auth.updateUser({password});
        if (result.error) throw result.error;
        await recoveryClient.auth.signOut({scope:'global'});
        recoveryClient = undefined;
        reservedFlow = '';
        show('login','Senha atualizada. Entre com a nova senha.');
      }
      if (stage === 'legal' && current && fields.has('terms') && fields.has('privacy')) {
        const result = await client.rpc('flowork_accept_terms',{accepted_terms:legalVersions.terms,read_privacy:legalVersions.privacy});
        if (result.error) throw result.error;
        const session = await client.auth.getSession();
        await activate(session.data.session,true);
      }
    } catch (error) {
      message(securityMessage(error,stage));
    } finally {
      authBusy = false;
      if (submit) submit.disabled = false;
    }
  });
  let recoveryClient;
  browser.addEventListener('online',() => { if (sync?.dirty) void sync.flush(); });
  browser.addEventListener('beforeunload',event => {
    if (sync?.dirty || operations.size) { event.preventDefault(); event.returnValue = ''; }
  });
  show('loading');
  void initialRoute().catch(() => show('blocked'));
}
