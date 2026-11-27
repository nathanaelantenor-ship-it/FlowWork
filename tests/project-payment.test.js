import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { JSDOM } from 'jsdom';
import { mountWorkspace } from '../src/workspace/generated.js';

test('permuta, projetos pessoais e estudos não geram recebimentos',async t=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const {window}=new JSDOM(html,{url:'https://flowork.example/#idv'});
 for(const key of ['window','document','FormData','AbortController','location','history'])globalThis[key]=key==='window'?window:window[key];
 window.scrollTo=()=>{};
 const controller=new AbortController();
 t.after(()=>{controller.abort();window.close()});
 const date=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const workspace={
  profile:{name:'Teste'},tasks:[],events:[],goals:[],crm:[],idv:[],content:[],study:[],docs:[],maps:[],templates:[],folders:[],categories:[],finance:[],
  clients:[{id:'acme',name:'Acme'}],
  social:[{id:'legacy',name:'Peça anterior',client:'Acme',clientId:'acme',stage:'Pauta',date,kind:'Reels',cyclePiece:true}]
 };
 const handle=mountWorkspace({
  signal:controller.signal,displayName:'Teste',file:async()=>null,sync:{enqueue(){return true}},
  openAccount(){},refreshStatus(){},startOperation(){return ()=>{}}
 },workspace);
 const snapshot=()=>handle.snapshot();
 const click=act=>{const e=document.querySelector('[data-act="'+act+'"]');assert.ok(e,act);e.click()};
 const form=()=>document.querySelector('#overlay form');
 const field=(name,value)=>{
  const input=form().elements[name];assert.ok(input,name);input.value=value;
  input.dispatchEvent(new window.Event('change',{bubbles:true}));
 };
 const save=async()=>{form().requestSubmit();await delay(0)};
 const openProject=id=>click('open|idv|'+id);

 for(const [mode,name,client] of [['barter','Permuta com Acme','acme'],['personal','Projeto autoral',''],['study','Exercício de design','']]){
  click('new|idv');
  assert.ok(form().elements.amount.required);
  field('name',name);
  field('paymentMode',mode);
  assert.ok(form().elements.amount.disabled);
  assert.ok(form().elements.paymentDue.closest('label').hidden);
  field('clientId',client);
  await save();
  const project=snapshot().idv.find(x=>x.name===name);
  assert.equal(project.paymentMode,mode);
  assert.equal(project.clientId,client);
  assert.equal(project.paymentDue,'');
  assert.equal(snapshot().finance.length,0);
 }

 const study=snapshot().idv.find(x=>x.paymentMode==='study');
 openProject(study.id);
 field('paymentMode','paid');
 field('clientId','acme');
 field('amount','100');
 field('paymentDue',date);
 await save();
 assert.equal(snapshot().finance[0].sourceProject,study.id);
 assert.equal(snapshot().finance[0].status,'Previsto');
 openProject(study.id);field('paymentMode','study');field('clientId','');await save();
 assert.equal(snapshot().finance.length,0);
 assert.equal(snapshot().idv.find(x=>x.id===study.id).clientId,'');

 openProject(study.id);
 field('paymentMode','paid');field('clientId','acme');field('amount','100');field('paymentDue',date);await save();
 const income=snapshot().finance[0];
 click('go|finance');
 click('open|money|'+income.id);
 click('paid-now|'+income.id);
 click('go|idv');openProject(study.id);
 assert.equal(form().elements.paymentMode,undefined);
 assert.ok(form().elements.amount.readOnly);
 await save();
 assert.equal(snapshot().finance[0].status,'Realizado');

 click('go|social');click('open|social|legacy');
 assert.equal(form().elements.paymentMode.value,'pending');
 await save();
 assert.equal(snapshot().social[0].id,'legacy');
 assert.equal(snapshot().finance.length,1);
 click('go|projects');
 assert.match(document.querySelector('#main').textContent,/Projeto pessoal/);
});
