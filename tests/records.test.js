import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { JSDOM } from 'jsdom';
import { mountWorkspace } from '../src/workspace/generated.js';

test('opens WhatsApp and deletes records without losing linked data or restoring a deleted client', async t => {
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://flowork.example/#crm'});
 const {window}=dom;
 window.scrollTo=()=>{};
 for(const key of ['window','document','FormData','AbortController','location','history'])globalThis[key]=key==='window'?window:window[key];
 t.after(()=>window.close());
 const date=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const lead={id:'lead',name:'Contato',client:'Cliente',clientId:'client',contact:'+55 (31) 98765-4321',stage:'Fechado',project:'project'};
 const project={id:'project',name:'Projeto',stage:'Onboarding',kind:'Identidade Visual',client:'Cliente',clientId:'client',folder:'folder',amount:80,date,paymentDue:date};
 const expense={id:'expense',name:'Pró-labore',ledger:'empresa',type:'out',category:'cat3',status:'Previsto',amount:40,date,series:'monthly',sequence:0};
 const workspace={
  profile:{name:'Teste'},tasks:[],events:[{id:'event',name:'Reunião',day:date,party:'lead:lead'}],
  crm:[lead],idv:[project],social:[],content:[],study:[],maps:[],templates:[],
  clients:[{id:'client',name:'Cliente',state:'Ativo',contact:'31 8765-4321',folder:'folder'}],
  folders:[{id:'folder',name:'Cliente',clientId:'client'}],docs:[{id:'doc',name:'Arquivo.pdf',kind:'Arquivo',folder:'folder',project:'project'}],
  finance:[expense,{...expense,id:'future',sequence:1},{...expense,id:'paid',sequence:2,status:'Realizado'},
    {id:'income',name:'Projeto',ledger:'empresa',type:'in',category:'cat1',sourceProject:'project',project:'project',status:'Previsto',amount:80,date}],
  categories:[]
 };
 const mount=data=>{
  const controller=new window.AbortController();
  const handle=mountWorkspace({signal:controller.signal,displayName:'Teste',file:async()=>null,
   sync:{enqueue(){return true}},openAccount(){},refreshStatus(){},startOperation(){return ()=>{}}},data);
  return {handle,close(){controller.abort();handle.clear()}};
 };
 let view=mount(workspace);
 t.after(()=>view.close());
 const snapshot=()=>view.handle.snapshot();
 const click=selector=>{const el=document.querySelector(selector);assert.ok(el,selector);el.click()};
 const submit=async()=>{click('#overlay [type=submit]');await delay(0)};
 const remove=async(key,id)=>{click('[data-act="record-delete|'+key+'|'+id+'"]');await submit()};

 assert.equal(document.querySelector('.crm-card a').href,'https://wa.me/5531987654321');
 click('[data-act="go|clients"]');
 assert.equal(document.querySelector('.client-card a.whatsapp-button').href,'https://wa.me/553187654321');
 click('[data-act="client-detail|client"]');
 click('[data-act="record-delete|clients|client"]');
 click('#overlay .dialog-actions [data-act="close"]');
 assert.equal(snapshot().clients.length,1);
 click('[data-act="client-detail|client"]');
 await remove('clients','client');
 const detached=snapshot();
 assert.equal(detached.clients.length,0);
 assert.equal(detached.crm[0].stage,'Fechado');
 assert.equal(detached.idv[0].clientId,'');
 assert.equal(detached.folders.length,1);
 view.close();
 view=mount(detached);
 assert.equal(snapshot().clients.length,0);

 click('[data-act="go|finance"]');
 click('[data-act="open|money|expense"]');
 click('[data-act="record-delete|finance|expense"]');
 document.querySelector('#overlay [name=future]').checked=true;
 await submit();
 assert.deepEqual(snapshot().finance.map(x=>x.id),['paid','income','salary-paid']);
 click('[data-act="open|money|income"]');
 await remove('finance','income');
 assert.equal(snapshot().idv[0].paymentRemoved,true);
 click('[data-act="go|idv"]');
 click('[data-act="open|idv|project"]');
 await submit();
 assert.equal(snapshot().clients.length,0);
 assert.equal(snapshot().finance.some(x=>x.sourceProject==='project'),false);
 click('[data-act="open|idv|project"]');
 await remove('idv','project');
 assert.equal(snapshot().docs[0].project,'');
 assert.equal(snapshot().crm[0].project,'');

 click('[data-act="go|files"]');
 click('[data-act="folder-open|folder"]');
 click('[data-act="open|doc|doc"]');
 await remove('docs','doc');
 assert.equal(snapshot().docs.length,0);
 click('[data-act="doc-trash"]');
 click('[data-act="doc-restore|doc"]');
 assert.equal(snapshot().docs[0].folder,'folder');
 click('[data-act="go|crm"]');
 click('[data-act="open|crm|lead"]');
 await remove('crm','lead');
 assert.equal(snapshot().crm.length,0);
 assert.equal(snapshot().events[0].party,'');
});
