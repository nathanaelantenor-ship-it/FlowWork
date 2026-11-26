import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { JSDOM } from 'jsdom';

const waitFor = async condition => {
  for(let i=0;i<150;i++){
    if (condition()) return;
    await delay(15);
  }
  throw new Error('A interface não chegou ao estado esperado.');
};

test('login → termos → registro → logout → relogin, com duas contas', async t => {
  // A deterministic Auth/API double; the integration of permissions and writes is exercised separately in PostgreSQL.
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const dom=new JSDOM(html,{url:'https://flowork.example/'});
  const {window}=dom;
  window.scrollTo=()=>{};
  // jsdom models the dialog element, but leaves the browser top-layer methods unimplemented.
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  for(const key of ['window','document','FormData','AbortController','CSS','location','history'])globalThis[key]=key==='window'?window:window[key];
  t.after(()=>window.close());
  const { startApplication }=await import('../src/auth/application.js');
  const byId=new Map(),ack=new Map();
  let actualSession;
  const makeSession = email => {
    const id=email.startsWith('a@')?'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa':'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    return {access_token:id,user:{id,email,user_metadata:{name:email.startsWith('a@')?'Ana':'Bruno'}}};
  };
  const asResult=data=>({data,error:null});
  const version='2026-11-26.1';
  const api={
    auth:{
      onAuthStateChange(){},
      getSession:async()=>asResult({session:actualSession}),
      getUser:async()=>asResult({user:actualSession?.user}),
      signInWithPassword:async ({email})=>asResult({session:actualSession=makeSession(email)}),
      signOut:async()=>{actualSession=null;return asResult(null)}
    },
    storage:{from:()=>({})},
    from(table){
      const result=()=>{
        const id=actualSession.user.id;
        if(table==='flowork_legal_versions')return {terms_version:version,privacy_version:version};
        if(table==='flowork_legal_acceptances')return ack.has(id)?[{terms_version:version,privacy_version:version}]:[];
        if(table==='flowork_workspaces')return byId.get(id)||null;
        return [];
      };
      const chain={select:()=>chain,eq:()=>chain,order:async()=>asResult(result()),single:async()=>asResult(result()),maybeSingle:async()=>asResult(result()),
        then:(resolve,reject)=>Promise.resolve(asResult(result())).then(resolve,reject)};
      return chain;
    },
    rpc(name,values){
      const id=actualSession.user.id;
      if(name==='flowork_accept_terms'){ack.set(id,true);return Promise.resolve(asResult(null))}
      if(name==='flowork_save_workspace'){
        const now=byId.get(id)?.revision||0;
        assert.equal(now,values.expected_revision);
        const revision=now+1;
        byId.set(id,{data:structuredClone(values.next_data),schema_version:1,revision});
        return {abortSignal:()=>({single:async()=>asResult({revision})})};
      }
    }
  };
  const q=(sel)=>document.querySelector(sel);
  const act=(sel)=>q(sel).click();
  const field=(sel,value)=>{q(sel).value=value;};
  const signIn=async(email)=>{
    await waitFor(()=>q('[data-auth-form="login"]'));
    field('[name="email"]',email);field('[name="password"]','senha-teste-2026');
    act('button[type="submit"]');
  };
  const acknowledge=async()=>{
    await waitFor(()=>q('[data-auth-form="legal"]'));
    q('[name="terms"]').checked=q('[name="privacy"]').checked=true;
    act('button[type="submit"]');
    await waitFor(()=>!q('#workspace-root').hidden && q('[data-act="go|files"]'));
  };
  const logout=async()=>{
    act('#topbar [title="Minha conta"]');act('[data-account="logout"]');
    await waitFor(()=>q('[data-auth-form="login"]')&&q('#workspace-root').hidden);
  };

  startApplication(api);
  await signIn('a@example.test');
  await acknowledge();
  act('[data-act="go|files"]');
  act('[data-act="new-doc"]');
  field('#overlay [name="name"]','Briefing confidencial');
  field('#overlay [name="text"]','Registro de Ana');
  act('#overlay [type="submit"]');
  await waitFor(()=>document.getElementById('main').textContent.includes('Briefing confidencial'));
  await logout();
  assert.equal([...byId.values()][0].data.docs[0].name,'Briefing confidencial');
  assert.equal(q('main').textContent,'');
  await signIn('b@example.test');
  await acknowledge();
  act('[data-act="go|files"]');
  assert.doesNotMatch(q('main').textContent,/Briefing confidencial/);
  await logout();
  await signIn('a@example.test');
  await waitFor(()=>q('[data-act="go|files"]'));
  act('[data-act="go|files"]');
  assert.match(q('main').textContent,/Briefing confidencial/);
});
