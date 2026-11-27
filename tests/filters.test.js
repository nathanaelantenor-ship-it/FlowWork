import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { mountWorkspace } from '../src/workspace/generated.js';

test('combina filtros de mídia social e usa a data de baixa no Financeiro',async t=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const {window}=new JSDOM(html,{url:'https://flowork.example/#social'});
 for(const key of ['window','document','FormData','AbortController','location','history'])globalThis[key]=key==='window'?window:window[key];
 window.scrollTo=()=>{};
 const controller=new AbortController();
 t.after(()=>{controller.abort();window.close()});
 const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const delta=n=>new Date(Date.parse(today+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
 const makeEntry=(id,date,values={})=>({id,name:id,date,ledger:'empresa',amount:10,category:'cat4',type:'out',status:'Previsto',...values});
 const workspace={
  profile:{name:'Teste'},tasks:[],events:[],goals:[],crm:[],idv:[],content:[],study:[],docs:[],maps:[],templates:[],folders:[],categories:[],
  clients:[{id:'acme',name:'Acme'},{id:'orla',name:'Orla'}],
  social:[
   {id:'a',name:'Acme atual',client:'Acme',cycle:today.slice(0,7),date:today,stage:'Pauta'},
   {id:'b',name:'Orla de outro ciclo',client:'Orla',cycle:delta(-45).slice(0,7),stage:'Produção'},
   {id:'c',name:'Orla entregue',client:'Orla',cycle:today.slice(0,7),date:today,stage:'Entregue'}
  ],
  finance:[
   makeEntry('baixa',delta(-80),{status:'Realizado',paidDate:today}),
   makeEntry('quinze',delta(-14)),makeEntry('mais-antigo',delta(-15)),
   makeEntry('futuro',delta(1)),makeEntry('pessoal',today,{ledger:'pessoal'}),
   makeEntry('fevereiro','2024-02-29'),makeEntry('marco','2024-03-01')
  ]
 };
 const handle=mountWorkspace({
  signal:controller.signal,displayName:'Teste',file:async()=>null,
  sync:{enqueue(){assert.fail('Filtros não devem salvar dados')}},openAccount(){},refreshStatus(){},startOperation(){return ()=>{}}
 },workspace);
 const click=act=>{const e=document.querySelector('[data-act="'+act+'"]');assert.ok(e,act);e.click()};
 const change=(selector,value)=>{
  const e=document.querySelector(selector);assert.ok(e,selector);
  if(typeof value==='boolean')e.checked=value;
  else e.value=value;
  e.dispatchEvent(new window.Event('change',{bubbles:true}));
 };
 const social=()=>Array.from(document.querySelectorAll('[data-board=social][data-card]'),e=>e.dataset.card).sort();
 assert.deepEqual(social(),['a','b','c']);
 change('[data-change=client]','Orla');
 assert.deepEqual(social(),['b','c']);
 change('[data-change=allSocialCycles]',false);
 assert.deepEqual(social(),['c']);
 change('[data-change=client]','');
 assert.deepEqual(social(),['a','c']);
 change('[data-change=allSocialCycles]',true);
 assert.deepEqual(social(),['a','b','c']);
 change('[data-change=socialPending]',true);
 assert.deepEqual(social(),['a','b']);
 click('sub|Calendário');
 assert.match(document.querySelector('.cal-grid').textContent,/Acme atual · Acme/);
 assert.doesNotMatch(document.querySelector('.cal-grid').textContent,/outro ciclo|Orla entregue/);
 click('sub|Entrega');
 assert.ok(document.querySelector('[data-act="open|social|c"]'));
 assert.equal(document.querySelector('[data-act=package]'),null);
 change('[data-change=client]','Orla');
 change('[data-change=allSocialCycles]',false);
 assert.ok(document.querySelector('[data-act=package]'));

 click('go|finance');
 const filter=(key,value)=>change('[data-finance-filter='+key+']',value);
 const finance=()=>Array.from(document.querySelectorAll('tbody [data-act^="open|money|"]'),e=>e.dataset.act.split('|')[2]);
 filter('mode','day');
 assert.deepEqual(finance(),['baixa']);
 filter('mode','15');
 assert.deepEqual(finance(),['baixa','quinze']);
 filter('mode','30');
 assert.deepEqual(finance(),['baixa','quinze','mais-antigo']);
 for(const mode of ['45','60','90']){
  filter('mode',mode);
  assert.ok(finance().includes('mais-antigo'));
  assert.ok(!finance().includes('futuro'));
 }
 filter('mode','year');filter('date','2024');
 assert.deepEqual(finance(),['marco','fevereiro']);
 filter('mode','month');filter('date','2024-02');
 assert.deepEqual(finance(),['fevereiro']);
 filter('mode','range');filter('from','2024-02-29');filter('to','2024-03-01');
 assert.deepEqual(finance(),['marco','fevereiro']);
 filter('mode','all');click('ledger|Pessoal');
 assert.deepEqual(finance(),['pessoal']);
 assert.equal(handle.snapshot().social.length,3);
});
