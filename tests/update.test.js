import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { JSDOM } from 'jsdom';

test('workspace anterior mantém seus registros e recupera um ZIP com anexo em ambiente separado', async t=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{url:'https://flowork.example/'});
 const {window}=dom;
 window.scrollTo=()=>{};
 for(const key of ['window','document','FormData','AbortController','location','history'])globalThis[key]=key==='window'?window:window[key];
 t.after(()=>window.close());
 const {mountWorkspace}=await import('../src/workspace/generated.js');
 const date=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const asset='d82a2431-17f7-4de2-a1d4-5903b953c893';
 const old={
  profile:{name:'Ana',role:'Design'},tasks:[],events:[],study:[],idv:[],social:[],content:[],maps:[],templates:[],
  crm:[{id:'lead1',name:'Júlia',client:'Estúdio existente',stage:'Em contato',date,contact:'31999999999',note:'Apresentar orçamento'}],
  clients:[{id:'client1',name:'Cliente antigo',state:'Ativo',folder:'folder1'}],
  docs:[{id:asset,name:'Amostra.txt',kind:'Arquivo',folder:'folder1'}],
  folders:[{id:'folder1',name:'Cliente antigo',clientId:'client1',parent:''}],
  finance:[{id:'old-money',name:'Despesa antiga',amount:60,type:'out',ledger:'empresa',date,status:'Realizado',category:'cat3'}],
  categories:[{id:'cat3',name:'Ferramentas antigas',ledger:'empresa',type:'out'}]
 };
 const file=new Blob(['anexo verdadeiro de teste'],{type:'text/plain'});
 let saved;
 const mount=(workspace,files)=>{
  const controller=new window.AbortController();
  const handle=mountWorkspace({
   signal:controller.signal,displayName:'Ana',file:async(action,id)=>{assert.equal(action,'get');assert.ok(files.has(id));return files.get(id)},
   sync:{enqueue(data){saved=structuredClone(data);return true}},
   openAccount(){},refreshStatus(){},startOperation(){return ()=>{}}
  },workspace);
  return {handle,close(){controller.abort();handle.clear()}};
 };
 const first=mount(old,new Map([[asset,file]]));
 assert.equal(saved,undefined);
 for(const key of ['docs','clients','folders','crm'])assert.deepEqual(first.handle.snapshot()[key],old[key]);
 assert.deepEqual(first.handle.snapshot().finance.find(x=>x.id==='old-money'),old.finance[0]);
 const archive=await first.handle.archive({id:'account-a'},[],[]);
 const recovered=await first.handle.readBackup(archive);
 assert.deepEqual(recovered.workspace,first.handle.snapshot());
 assert.equal(recovered.attachments.get(asset).type,'text/plain');
 assert.equal(await recovered.attachments.get(asset).text(),await file.text());
 const corrupt=new Uint8Array(await archive.arrayBuffer());
 const needle=Buffer.from(await file.arrayBuffer());
 const offset=Buffer.from(corrupt).indexOf(needle);
 assert.ok(offset>=0);corrupt[offset]^=1;
 await assert.rejects(first.handle.readBackup(new Blob([corrupt])),/integridade/);
 first.close();
 const separate=mount(recovered.workspace,recovered.attachments);
 t.after(separate.close);
 assert.deepEqual(separate.handle.snapshot().docs,old.docs);

 const click=selector=>{const el=document.querySelector(selector);assert.ok(el,selector);el.click()};
 click('[data-act="follow-up|lead1"]');
 document.querySelector('#overlay [name=summary]').value='Falei com Júlia.';
 document.querySelector('#overlay [type=submit]').click();
 await delay(0);
 assert.match(separate.handle.snapshot().crm[0].history,/Falei com Júlia/);
 assert.notEqual(separate.handle.snapshot().crm[0].date,date);
 click('[data-act="go|finance"]');
 assert.match(document.getElementById('main').textContent,/Caixa · próximos 30 dias/);
 click('.fw-chat-fab');
 const input=document.querySelector('#fw-chat-input');
 input.value='Adicione uma receita mensal de R$ 850 de manutenção, todo dia 10.';
 input.form.requestSubmit();
 await delay(0);
 assert.equal(separate.handle.snapshot().finance.filter(x=>x.amount===850).length,0);
 click('[data-act="assistant-confirm"]');
 await delay(0);
 const withSeries=separate.handle.snapshot();
 assert.equal(withSeries.finance.filter(x=>x.amount===850).length,12);
 assert.equal(withSeries.assistantHistory.length,1);
 const action=withSeries.assistantHistory[0].id;
 click('[data-act="assistant-history"]');
 click('[data-act="assistant-undo-confirm|'+action+'"]');
 click('[data-act="assistant-undo|'+action+'"]');
 assert.equal(separate.handle.snapshot().finance.filter(x=>x.amount===850).length,0);
 assert.deepEqual(separate.handle.snapshot().finance.find(x=>x.id==='old-money'),old.finance[0]);
 assert.deepEqual(separate.handle.snapshot().docs,old.docs);
});
