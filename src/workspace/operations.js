db.assistantHistory ||= [];
db.followUps ||= [];
const localDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'');
const cents=value=>Math.round((Number(value)||0)*100);

function followUpQueue(){
 return db.crm.filter(lead=>lead.date&&lead.date<=today&&!['Fechado','Perdido'].includes(lead.stage))
  .sort(byDate);
}
function whatsappLink(contact){
 const target=safeURL(contact);
 if(target&&['wa.me','api.whatsapp.com','web.whatsapp.com'].includes(target.host)){
  target.protocol='https:';
  return target.href;
 }
 const raw=clean(contact);
 if(!/^\+?[0-9 ().-]{10,21}$/.test(raw))return '';
 const digits=raw.replace(/\D/g,'');
 if(digits.length<10||digits.length>15)return '';
 return 'https://wa.me/'+(!raw.startsWith('+')&&digits.length<=11?'55':'')+digits;
}
function whatsappButton(contact,name,compact=false){
 const url=whatsappLink(contact);
 if(!url)return '';
 const label=esc('Chamar '+name+' no WhatsApp');
 return '<a class="'+(compact?'icon-btn':'btn')+' whatsapp-button" href="'+esc(url)+'" rel="noopener noreferrer" target="_blank" aria-label="'+label+'" title="'+label+'">'+
 icon('whatsapp')+(compact?'':'WhatsApp')+'</a>';
}
function followUpPanel(){
 const rows=followUpQueue();
 return panel(panelTitle('Follow-ups para hoje',button('Abrir Comercial','go|crm'))+
 (rows.length?rows.slice(0,6).map(lead=>{
  const last=db.followUps.findLast(x=>x.lead===lead.id);
  return '<article class="fw-follow-item"><div><b>'+esc(lead.client||lead.name)+'</b><small>'+esc(lead.note||lead.stage)+'</small><small>'+
   (last?'Último contato '+shortDate(last.date)+' · ':'')+ (lead.date<today?'Atrasado desde ':'Retorno em ')+shortDate(lead.date)+'</small></div>'+
   whatsappButton(lead.contact,lead.name)+
   button('Registrar contato','follow-up|'+lead.id,{ic:'check'})+'</article>';
 }).join(''):empty('Nenhum retorno pendente hoje.')),'fw-follow');
}
function followUpDialog(id){
 const lead=get('crm',id);
 if(!lead)return;
 modal('Registrar contato · '+(lead.client||lead.name),'<div class="form-grid">'+area('O que ficou combinado','summary')+
  field('Próximo retorno','nextDate',addDays(today,2),'date','required min="'+today+'"')+field('Próxima ação','nextAction',lead.note,'text','required')+'</div>'+
  formEnd('Registrar'),'follow-up|'+id);
}
function saveFollowUp(id,fd){
 const lead=get('crm',id),date=fd.get('nextDate'),action=clean(fd.get('nextAction'));
 if(!lead||!localDay(date)||date<today||!action){toast('Informe a próxima data e a ação.');return}
 const summary=clean(fd.get('summary')).slice(0,1200);
 db.followUps.push({lead:id,date:today,summary});
 lead.history=[lead.history,today.split('-').reverse().join('/')+' · Contato registrado'+(summary?' · '+summary:'')].filter(Boolean).join('\n');
 lead.date=date;
 lead.note=action.slice(0,500);
 finish('Contato registrado. Próximo retorno em '+shortDate(date)+'.');
}
function cashForecast(ledger){
 const last=addDays(today,29), month=today.slice(0,7);
 const realized=db.finance.filter(x=>x.ledger===ledger&&x.status==='Realizado'&&(x.paidDate||x.date)?.slice(0,7)===month&&(x.paidDate||x.date)<=today);
 const [income,expense]=financeTotals(realized);
 const byDay=new Map();
 for(const x of db.finance){
  if(x.ledger!==ledger||x.status!=='Previsto'||!localDay(x.date)||x.date>last)continue;
  const day=x.date<today?today:x.date;
  const items=byDay.get(day)||[];
  items.push(x);byDay.set(day,items);
 }
 let balance=cents(income)-cents(expense);
 const initial=balance;
 const timeline=Array.from({length:30},(_,i)=>{
  const date=addDays(today,i), entries=byDay.get(date)||[];
  const [receivable,payable]=financeTotals(entries);
  balance+=cents(receivable)-cents(payable);
  return {date,entries,receivable,payable,balance};
 });
 return {initial,timeline};
}
function cashForecastPanel(){
 const {initial,timeline}=cashForecast(state.ledger);
 const important=timeline.filter(x=>x.entries.length);
 const negative=timeline.find(x=>x.balance<0);
 if(!important.length)return panel(panelTitle('Caixa · próximos 30 dias')+empty('Nenhum lançamento previsto nos próximos 30 dias.'),'fw-cash-forecast');
 const max=Math.max(1,...timeline.map(x=>Math.abs(x.balance)));
 return panel(panelTitle('Caixa · próximos 30 dias')+
  '<p class="small">Base: saldo realizado do mês até hoje ('+brl(initial/100)+'). Lançamentos vencidos entram na projeção de hoje.</p>'+
  (negative?'<p class="fw-deficit">Primeiro saldo diário negativo em '+shortDate(negative.date)+' · '+brl(negative.balance/100)+'</p>':'')+
  '<div class="fw-forecast-bar" aria-hidden="true">'+timeline.map(x=>'<i class="'+(x.balance<0?'negative':'')+'" style="--height:'+Math.max(3,100*Math.abs(x.balance)/max)+'%" title="'+shortDate(x.date)+' · '+brl(x.balance/100)+'"></i>').join('')+'</div>'+
  '<div class="fw-forecast-days">'+important.map((x,i)=>'<details'+(i===0?' class="fw-forecast-next"':'')+'><summary><b>'+shortDate(x.date)+'</b><span>+'+brl(x.receivable)+' · −'+brl(x.payable)+'</span><strong>'+brl(x.balance/100)+'</strong></summary>'+
   x.entries.map(entry=>'<div>'+button(entry.name,'money|'+entry.id,{cls:'text-button'})+'<small>'+shortDate(entry.date)+' · '+(entry.type==='out'?'−':'+')+brl(entry.amount)+'</small></div>').join('')+'</details>').join('')+'</div>','fw-cash-forecast');
}

function orderedJSON(value){
 if(Array.isArray(value))return value.map(orderedJSON);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,orderedJSON(value[k])]));
 return value;
}
function actionRecord({kind,rows}){
 return {kind,ids:rows.map(x=>x.id),originals:rows.map(x=>JSON.stringify(orderedJSON(x)))};
}
function recordAssistantAction(kind,rows,name){
 db.assistantHistory.push({id:uid(),name,date:new Date().toISOString(),...actionRecord({kind,rows}),payments:kind==='finance'?[]:db.finance.filter(x=>rows.some(p=>p.id===x.sourceProject)).map(x=>JSON.stringify(orderedJSON(x)))});
 db.assistantHistory=db.assistantHistory.slice(-20);
 persist();
}
function assistantHistoryDialog(){
 const rows=db.assistantHistory.slice().reverse();
 modal('Histórico do assistente',rows.length?rows.map(x=>'<div class="fw-follow-item"><div><b>'+esc(x.name)+'</b><small>'+esc(new Date(x.date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))+' · '+(x.undone?'Desfeito':x.ids.length+' registro(s)')+'</small></div>'+
 (x.undone?'':button('Desfazer','assistant-undo-confirm|'+x.id,{ic:'repeat'}))+'</div>').join(''):empty('Nenhuma ação salva pelo assistente.') );
}
function undoAssistantDialog(id){
 const entry=get('assistantHistory',id);
 if(!entry||entry.undone)return;
 modal('Desfazer ação do assistente','<p>Remover os registros que o assistente criou em <strong>'+esc(entry.name)+'</strong>?</p><div class="dialog-actions">'+button('Voltar','assistant-history')+newBtn('Desfazer ação','assistant-undo|'+id)+'</div>');
}
function undoAssistantAction(id){
 const entry=get('assistantHistory',id);
 if(!entry||entry.undone||!['finance',...workBoards()].includes(entry.kind))return;
 const rows=entry.ids.map(record=>get(entry.kind,record));
 const unchanged=rows.every((row,i)=>row&&JSON.stringify(orderedJSON(row))===entry.originals[i]);
 const target=new Set(entry.ids);
 const payment=entry.kind==='finance'?[]:db.finance.filter(x=>target.has(x.sourceProject));
 const links=entry.kind!=='finance'&&(
  [...db.tasks,...db.docs,...db.maps,...db.crm,...db.folders].some(x=>target.has(x.project)) ||
  db.finance.some(x=>target.has(x.project)&&!target.has(x.sourceProject)) ||
  payment.some(x=>x.status==='Realizado'||!entry.payments?.includes(JSON.stringify(orderedJSON(x)))) ||
  payment.length!==(entry.payments?.length||0)
 );
 if(!unchanged||links){toast('Esta ação já foi editada ou vinculada a outro registro. Revise os dados na área de origem.');return}
 db[entry.kind]=db[entry.kind].filter(x=>!target.has(x.id));
 if(payment.length){const ids=new Set(payment.map(x=>x.id));db.finance=db.finance.filter(x=>!ids.has(x.id))}
 if(entry.kind==='finance')syncSalary();
 entry.undone=new Date().toISOString();
 finish('Ação desfeita.');
 assistantHistoryDialog();
}

function workspaceAssets(snapshot){
 const files=new Map();
 const add=(id,name)=>{if(id&&!files.has(id))files.set(id,name)};
 for(const d of [...snapshot.docs,...asList(snapshot.trashedDocs)])if(d.kind==='Arquivo')add(d.id,d.name);
 for(const x of [snapshot.profile,...snapshot.clients])add(x.photo,'foto');
 add(snapshot.preferences?.homePhoto,'capa-da-home');add(snapshot.preferences?.agendaPhoto,'capa-da-agenda');
 const boards=['idv','social','content',...Object.keys(snapshot.serviceSettings||{}).filter(k=>/^svc-[a-z]+$/.test(k))];
 for(const x of boards.flatMap(k=>asList(snapshot[k]))){
  add(x.cover,'capa');
  for(const img of asList(x.refImages))add(img.id,img.name);
  for(const ref of asList(x.refs))add(ref.image,'miniatura');
 }
 for(const x of [...snapshot.maps,...snapshot.templates])for(const n of asList(x.nodes))add(n.image,'referencia-do-mapa');
 return files;
}
async function makeWorkspaceArchive(account,acceptances,requests){
 const snapshot=clone(db), files=workspaceAssets(snapshot);
 const entries=[['conta.json',JSON.stringify({account,acceptances,requests},null,2)],['workspace.json',JSON.stringify(snapshot,null,2)]];
 const attachments=[];
 for(const [id,name] of files){
  const file=await fileStore('get',id);
  if(!file)throw Error('Arquivo da conta indisponível.');
  const safe=String(name||'arquivo').replace(/[^a-zA-Z0-9._-]/g,'-').slice(0,90);
  const filename='arquivos/'+id+'-'+safe;
  const data=new Uint8Array(await file.arrayBuffer());
  entries.push([filename,data]);
  attachments.push({id,path:filename,type:file.type,size:data.length});
 }
 entries.push(['manifesto.json',JSON.stringify({format:1,attachments})]);
 return zip(entries);
}
async function readWorkspaceBackup(file){
 if(!file?.size||file.size>256*1024*1024)throw Error('Selecione um ZIP do Flowork de até 256 MB.');
 const data=new Uint8Array(await file.arrayBuffer()), headers=new DataView(data.buffer), u16=i=>headers.getUint16(i,true),u32=i=>headers.getUint32(i,true);
 const end=data.length-22;
 if(end<0||u32(end)!==0x06054b50||u16(end+20)!==0||u16(end+4)||u16(end+6))throw Error('Formato de backup inválido.');
 const central=u32(end+16), count=u16(end+10);
 if(central+u32(end+12)!==end||u16(end+8)!==count)throw Error('Índice do backup inválido.');
 const decode=new TextDecoder('utf-8',{fatal:true});
 const entries=new Map();
 let offset=0;
 while(offset<central){
  if(offset+30>central||u32(offset)!==0x04034b50||u16(offset+6)!==0x0800||u16(offset+8)!==0)throw Error('Use um ZIP exportado diretamente pelo Flowork.');
  const length=u16(offset+26),size=u32(offset+18),start=offset+30+length+u16(offset+28),next=start+size;
  if(next>central||u32(offset+22)!==size)throw Error('Um arquivo do backup está incompleto.');
  const path=decode.decode(data.subarray(offset+30,offset+30+length));
  const payload=data.subarray(start,next);
  if(entries.has(path)||crc32(payload)!==u32(offset+14))throw Error('Um arquivo do backup falhou na verificação de integridade.');
  entries.set(path,payload);
  offset=next;
 }
 if(entries.size!==count||!entries.has('workspace.json')||!entries.has('conta.json'))throw Error('Backup incompleto.');
 const parse=key=>JSON.parse(decode.decode(entries.get(key)));
 const workspace=parse('workspace.json'), identity=parse('conta.json');
 const lists=['tasks','events','crm','idv','social','content','study','docs','finance','categories','maps','templates','clients','folders'];
 if(!workspace?.profile||lists.some(k=>!Array.isArray(workspace[k])))throw Error('Formato dos registros inválido.');
 const manifest=entries.has('manifesto.json')?parse('manifesto.json'):null;
 const attachments=new Map();
 for(const [id] of workspaceAssets(workspace)){
  const metadata=manifest?.attachments?.find(x=>x.id===id);
  if(manifest&&!metadata)throw Error('O manifesto está incompleto.');
  const path=metadata?.path||[...entries.keys()].find(name=>name.startsWith('arquivos/'+id+'-'));
  const payload=entries.get(path);
  if(!payload||metadata&&metadata.size!==payload.length)throw Error('Ao menos um anexo está ausente ou incompleto.');
  const ext=path?.split('.').at(-1)?.toLowerCase();
  const mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',avif:'image/avif',pdf:'application/pdf'}[ext];
  attachments.set(id,new Blob([payload],{type:metadata?.type||mime||'application/octet-stream'}));
 }
 return {workspace,identity,attachments};
}
