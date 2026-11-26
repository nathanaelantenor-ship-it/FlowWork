const legacyClient='legacy';
function clientPicker(item={},fallback='',required=false){
 const name=item.client||fallback;
 const chosen=get('clients',item.clientId)||findClient(name);
 const choices=[[required?'Selecione um cliente':'Sem cliente',''],...db.clients.map(c=>[c.name,c.id])];
 if(name&&!chosen)choices.push([name+' · cadastro anterior',legacyClient]);
 if(required)choices.push(['+ Cadastrar novo cliente','new']);
 return select('Cliente','clientId',choices,chosen?.id||(name?legacyClient:''))+'<input type="hidden" name="client" value="'+esc(name)+'">'+
 (required?'<div class="new-client-fields wide hide">'+field('Nome do novo cliente','newClient')+field('Contato (opcional)','newClientContact')+'</div>':'');
}
function savedClientFields(fd){
 const c=get('clients',fd.get('clientId'));
 return c?{client:c.name,clientId:c.id}:fd.get('clientId')===legacyClient?{client:clean(fd.get('client')),clientId:''}:{client:'',clientId:''};
}
function linkProjectClient(next,previous,fd,k){
 const choice=fd.get('clientId');
 if(previous?.clientDetached&&choice===legacyClient)return;
 const name=choice==='new'?clean(fd.get('newClient')):clean(fd.get('client')||next.client);
 let c=get('clients',choice)||findClient(name);
 if(!c&&name){
  const lead=db.crm.find(l=>normalizedName(l.client||l.name)===normalizedName(name));
  if(lead){
   lead.stage='Fechado';
   lead.clientDetached=false;
   lead.service=navName(k);
   lead.project ||= next.id;
   c=ensureClientOnClose(lead);
  }else{
   const newLead={id:uid(),name,client:name,contact:clean(fd.get('newClientContact')),date:today,closedOn:today,stage:'Fechado',service:navName(k),project:next.id,amount:next.amount||0};
   db.crm.push(newLead);
   c=ensureClientOnClose(newLead);
  }
 }
 if(!c)return;
 const folder=ensureClientFolder(c);
 if(previous?.clientId!==c.id){next.folder=folder.id}
 next.clientId=c.id;next.client=c.name;next.clientDetached=false;next.folder ||= folder.id;
}
function syncProjectPayment(k,x){
 if(x.paymentRemoved||!x.paymentDue||!Number.isFinite(x.amount)||x.amount<=0)return;
 const old=db.finance.find(f=>f.sourceProject===x.id);
 if(old?.status==='Realizado'){
  Object.assign(old,{name:x.name,client:x.client,clientId:x.clientId});
  return;
 }
 const row={sourceProject:x.id,project:x.id,projectType:k,clientId:x.clientId,client:x.client,name:x.name,amount:x.amount,date:x.paymentDue,ledger:'empresa',type:'in',category:k==='idv'?'cat1':k==='social'?'cat2':(categories('empresa','in').find(c=>normalizedName(c.name)===normalizedName(navName(k)))||categories('empresa','in').find(c=>c.name==='Pagamento de cliente'))?.id||'cat1',status:'Previsto',paidDate:''};
 if(old)Object.assign(old,row);
 else db.finance.push({...row,id:uid()});
}
const projectRecords=()=>workBoards().flatMap(k=>db[k].filter(x=>!x.cyclePiece&&(!editorialBoard(k)||x.paymentDue)).map(x=>[k,x]));
const projectActive=(k,x)=>k==='idv'?x.stage!=='Entrega':k==='social'?x.stage!=='Entregue':x.stage!==definitions[k].labels.at(-1);
const byDate=(a,b)=>(a.date||'9999').localeCompare(b.date||'9999');
const activeProjectRecords=()=>projectRecords().filter(([k,x])=>projectActive(k,x)).sort(([,a],[,b])=>byDate(a,b));
const tabDate=date=>new Date(date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'});
const prefs=()=>db.preferences;
const wallThemes=[['Horizonte','horizon'],['Pista','track'],['Estúdio','studio'],['Foto personalizada','custom']];
function wall(id){const key=prefs()[id+'Theme']||(id==='agenda'?'track':'studio');return 'wall-'+(wallThemes.some(x=>x[1]===key)?key:'studio')}
function wallPhoto(scope){return wall(scope)==='wall-custom'?localImage(prefs()[scope+'Photo'],'','fw-wall-photo'):''}
function appearanceDialog(scope){
 modal(scope==='home'?'Personalizar Home':'Personalizar agenda','<div class="form-grid">'+select('Tema','theme',wallThemes,prefs()[scope+'Theme']||(scope==='agenda'?'track':'studio'))+imageInput('Foto personalizada','wallPhoto')+field('Posição horizontal da foto','wallX',prefs()[scope+'X']??50,'number','min="0" max="100"')+field('Posição vertical da foto','wallY',prefs()[scope+'Y']??50,'number','min="0" max="100"')+'</div>'+formEnd(),'wall|'+scope);
}
function wallPosition(scope){const n=key=>Math.max(0,Math.min(100,Number(prefs()[scope+key]??50)||0));return '--photo-x:'+n('X')+'%;--photo-y:'+n('Y')+'%'}
async function saveWall(scope,fd){
 if(!['home','agenda'].includes(scope))return;
 const id=await storeImage(fd.get('wallPhoto'));
 if(id)prefs()[scope+'Photo']=id;
 const nextTheme=id?'custom':fd.get('theme');
 if(nextTheme==='custom'&&!prefs()[scope+'Photo']){toast('Selecione uma foto personalizada.');return}
 prefs()[scope+'Theme']=nextTheme;
 prefs()[scope+'X']=fd.get('wallX');prefs()[scope+'Y']=fd.get('wallY');finish('Aparência atualizada.');
}
function dueItems(){
 const days=Number(prefs().reminderDays??1);
 const limit=addDays(today,days);
 return db.tasks.filter(x=>!x.done&&(!x.date||x.date<=limit)).map(x=>({key:'task:'+x.id+':'+(x.date||today)+':'+(x.time||''),date:x.date||today,time:x.time,name:x.name,kind:'Tarefa',act:'open|task|'+x.id}))
 .concat(activeProjectRecords().filter(([,x])=>x.date&&x.date<=limit).map(([k,x])=>({key:'project:'+x.id+':'+x.date,date:x.date,name:x.name,kind:'Entrega',act:'open|'+k+'|'+x.id})))
 .sort(byDate);
}
const shownAlerts=new Set();
function checkReminders(){
 if(prefs().reminders===false||overlay.firstChild)return;
 const pending=dueItems().filter(x=>!shownAlerts.has(x.key));
 if(!pending.length)return;
 pending.forEach(x=>shownAlerts.add(x.key));
 toast(pending.length===1?pending[0].kind+' · '+pending[0].name+' · '+shortDate(pending[0].date):pending.length+' tarefas ou entregas próximas. Veja os lembretes.');
}
function reminderDialog(){
 const rows=dueItems();
 modal('Lembretes','<div class="search-list">'+(rows.map(x=>'<button type="button" data-act="'+esc(x.act)+'">'+esc(x.name)+'<small>'+esc(x.kind+' · '+shortDate(x.date)+(x.time?' · '+x.time:''))+'</small></button>').join('')||empty('Nenhuma tarefa ou entrega próxima.'))+'</div>'+formEndNoSubmit());
}
function taskRow(x){
 const linked=findWork(x.project);
 return '<div class="fw-task"><button type="button" class="check'+(x.done?' done':'')+'" aria-label="'+(x.done?'Reabrir ':'Concluir ')+esc(x.name)+'" data-act="task|'+esc(x.id)+'">'+(x.done?icon('check'):'')+'</button>'+
 '<button type="button" class="fw-flat" data-act="open|task|'+esc(x.id)+'"><b>'+esc(x.name)+'</b><small>'+esc(x.client||linked?.name||x.meta||'Tarefa')+'</small></button><span class="fw-tag">'+(x.date===today?'Hoje':shortDate(x.date))+(x.time?' · '+esc(x.time):'')+'</span></div>';
}
function renderTasks(){
 const pending=db.tasks.filter(x=>!x.done).sort(byDate),done=db.tasks.filter(x=>x.done).sort(byDate);
 return heading('Tarefas','Pendências, revisões e follow-ups.',exportsBtn()+newBtn('Nova tarefa','new-task'))+
 '<div class="fw-columns">'+panel(panelTitle('Em aberto · '+pending.length)+(pending.map(taskRow).join('')||empty('Nenhuma tarefa pendente.')),'fw-paper')+
 panel(panelTitle('Concluídas · '+done.length)+(done.map(taskRow).join('')||empty('Nenhuma tarefa concluída.')))+'</div>';
}
function meetingChoices(){
 return [['Sem vínculo',''],...db.clients.map(c=>['Cliente · '+c.name,'client:'+c.id]),...db.crm.map(c=>['Lead · '+(c.client||c.name),'lead:'+c.id])];
}
function meetingParty(event){
 const [kind,id]=String(event.party||'').split(':');
 const record=get(kind==='client'?'clients':'crm',id);
 return record?(kind==='client'?'Cliente · ':'Lead · ')+(record.client||record.name):'';
}
function dayEvents(date){return db.events.filter(x=>x.day===date).sort((a,b)=>(a.time||'').localeCompare(b.time||''))}
function eventRow(x,showMeet=false){
 const meet=safeURL(x.meeting);
 return '<div class="fw-event"><time>'+esc(x.time||'—')+'</time><button class="fw-flat" type="button" data-act="open|event|'+esc(x.id)+'"><b>'+esc(x.name)+'</b><small>'+esc(meetingParty(x)|| (x.end?'Até '+x.end:'Compromisso'))+'</small></button>'+
 (showMeet&&meet?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(meet.href)+'">Abrir reunião</a>':'')+'</div>';
}
function eventDialogNext(id){
 const x=get('events',id);
 if(!x){eventDialog();return}
 eventDialog(x);
 const form=overlay.querySelector('form');
 const raw=(day,time)=>(day.replaceAll('-','')+'T'+(time||'09:00').replace(':','')+'00');
 const start=raw(x.day,x.time);
 const endMillis=new Date(x.day+'T'+(x.time||'09:00')+':00Z').getTime()+3600000;
 const endDefault=new Date(endMillis).toISOString().replace(/[-:]/g,'').slice(0,15);
 const details=[x.note,meetingParty(x),safeURL(x.meeting)?.href].filter(Boolean).join('\n');
 const query=new URLSearchParams({action:'TEMPLATE',text:x.name,dates:start+'/'+(x.end?raw(x.day,x.end):endDefault),ctz:'America/Sao_Paulo',details});
 form.querySelector('.dialog-actions').insertAdjacentHTML('afterbegin','<a class="btn" target="_blank" rel="noopener noreferrer" href="https://calendar.google.com/calendar/render?'+esc(query.toString())+'">Adicionar ao Google Calendar</a>');
}
function renderAgenda(){
 const month=state.day.slice(0,7), [year,m]=month.split('-').map(Number);
 const start=(new Date(year,m-1,1).getDay()+6)%7, days=new Date(year,m,0).getDate();
 const events=dayEvents(state.day);
 const cells=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(n=>'<span class="fw-weeklabel">'+n+'</span>').join('')+
 '<span></span>'.repeat(start)+Array.from({length:days},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0'),count=dayEvents(date).length;return '<button type="button" data-act="day|'+date+'" aria-pressed="'+(date===state.day)+'" aria-label="'+esc(tabDate(date)+(count?' · '+count+' compromisso(s)':''))+'" class="fw-day'+(date===today?' is-today':'')+'">'+(i+1)+(count?'<i></i>':'')+'</button>'}).join('');
 return '<section class="fw-wall agenda-hero '+wall('agenda')+'" style="'+wallPosition('agenda')+'">'+wallPhoto('agenda')+'<div class="fw-wall-copy"><p>'+esc(tabDate(today))+'</p><h1>Agenda pessoal</h1><p>'+db.events.filter(e=>e.day===today).length+' compromissos hoje</p></div><div class="fw-wall-actions">'+button('Personalizar','wall|agenda',{ic:'image'})+newBtn('Novo compromisso','new-event')+'</div></section>'+
 '<div class="fw-columns agenda-grid"><section class="panel fw-paper"><div class="panel-head"><h2>'+esc(monthName(month))+'</h2><div class="inline">'+ib('prev','Mês anterior','agenda-month|-1')+ib('chevron','Próximo mês','agenda-month|1')+'</div></div><div class="fw-calendar">'+cells+'</div></section>'+
 panel(panelTitle(tabDate(state.day),exportsBtn())+(events.map(x=>eventRow(x,true)).join('')||empty('Nenhum compromisso para este dia.')),'agenda-list')+'</div>';
}
function projectCard(k,x){
 const percent=progress(k,x);
 return '<button type="button" class="fw-project-row" data-act="project-pick|'+k+'|'+esc(x.id)+'" aria-pressed="'+(x.id===state.projectPick)+'"><span>'+avatar(get('clients',x.clientId)||{name:x.client})+'<span><b>'+esc(x.name)+'</b><small>'+esc(x.client||navName(k))+'</small></span></span><span class="fw-project-stage">'+esc(x.stage)+'<small>'+shortDate(x.date)+'</small></span><span class="meter"><i style="width:'+percent+'%"></i></span></button>';
}
function chooseProject(){
 modal('Novo projeto','<div class="grid-menu">'+workBoards().map(k=>button(navName(k),'new|'+k,{ic:nav.find(x=>x[0]===k)[1]})).join('')+'</div>');
}
function renderProjects(){
 const records=projectRecords().filter(([k,x])=>state.projectType==null||state.projectType==='Todos'||navName(k)===state.projectType).sort(([,a],[,b])=>byDate(a,b));
 const pick=records.find(([,x])=>x.id===state.projectPick)||records.find(([,x])=>x.cover)||records[0];
 state.projectPick=pick?.[1].id;
 const detail=pick?projectPreview(...pick):empty('Selecione um projeto.');
 return '<section class="fw-project-shell">'+heading('Projetos','Acompanhe os projetos de todos os serviços.',exportsBtn()+newBtn('Novo projeto','project-create'))+
 '<div class="fw-project-tabs">'+menu(['Todos',...workBoards().map(navName)],state.projectType||'Todos','project-filter')+'</div>'+
 '<div class="fw-project-grid"><section><div class="panel-head"><h2>Entregas e etapas</h2><span class="fw-tag">'+records.length+' projetos</span></div>'+ (records.map(([k,x])=>projectCard(k,x)).join('')||empty('Nenhum projeto neste recorte.'))+'</section>'+detail+'</div></section>';
}
function projectPreview(k,x){
 const percent=progress(k,x),files=db.docs.filter(d=>d.project===x.id), exact=asList(x.done).length;
 return '<aside class="fw-project-preview"><header><span>'+esc(navName(k))+'</span>'+ib('pen','Abrir projeto','open|'+k+'|'+x.id)+'</header>'+
 '<div class="fw-project-cover">'+(x.cover?localImage(x.cover,'Capa de '+x.name):'<span>'+icon(k==='idv'?'pen':'layers')+'</span>')+'</div><h2>'+esc(x.name)+'</h2><p>'+esc(x.client||'Sem cliente')+' · '+esc(x.kind||x.stage)+'</p>'+
 '<div class="fw-progress"><span>Checklist · '+exact+'/'+(checklists[k]?.length||0)+'</span><b>'+percent+'%</b><div class="meter"><i style="width:'+percent+'%"></i></div></div>'+
 '<div class="fw-project-files"><b>Arquivos do projeto</b>'+ (files.length?attachmentList(files.slice(0,4)):empty('Sem arquivos anexados.'))+'</div></aside>';
}
function financePulse(){
 const period=today.slice(0,7);
 const rows=db.finance.filter(x=>x.ledger==='empresa'&&x.status==='Realizado'&&(x.paidDate||x.date).startsWith(period));
 const [incoming,outgoing]=financeTotals(rows),max=Math.max(incoming,outgoing,1);
 return [['Entradas',incoming,'in'],['Saídas',outgoing,'out']].map(([name,amount,kind])=>'<div class="fw-cashline"><span>'+name+'</span><b>'+brl(amount)+'</b><div class="meter '+kind+'"><i style="width:'+Math.round(100*amount/max)+'%"></i></div></div>').join('');
}
function overviewProjectRows(records){return records.slice(0,6).map(([k,x])=>'<button type="button" class="fw-overview-project" data-act="project-jump|'+k+'|'+esc(x.id)+'"><span class="tile-icon">'+icon(k==='idv'?'pen':'layers')+'</span><span><b>'+esc(x.name)+'</b><small>'+esc([x.client,navName(k)].filter(Boolean).join(' · '))+'</small></span><span>'+esc(x.stage)+'<small>'+shortDate(x.date)+'</small></span></button>').join('')}
function renderNewHome(){
 const tasks=db.tasks.filter(x=>!x.done&&(!x.date||x.date<=today)).sort(byDate), events=dayEvents(today),projects=activeProjectRecords(), upcoming=db.finance.filter(x=>x.ledger==='empresa'&&x.type==='in'&&x.status==='Previsto').sort(byDate), reminders=dueItems(), latest=upcoming[0];
 const summary=[['brief',String(projects.length),'Projetos em andamento','projects'],['users',String(db.clients.length),'Clientes cadastrados','clients'],['check',String(tasks.length),'Tarefas de hoje','tasks']];
 const mainTasks=tasks.slice(0,4).map(taskRow).join('');
 return '<div class="fw-home-top"><section class="fw-wall home-hero '+wall('home')+'" style="'+wallPosition('home')+'">'+wallPhoto('home')+'<div class="fw-wall-copy"><p>'+esc(tabDate(today))+'</p><h1>Seu dia, '+esc(profileName().split(/\s+/)[0])+'.</h1></div><div class="fw-wall-actions">'+ib('image','Personalizar Home','wall|home')+'</div><div class="fw-stat-strip">'+summary.map(([ic,n,label,k])=>'<button type="button" data-act="go|'+k+'">'+icon(ic)+'<b>'+n+'</b><span>'+label+'</span></button>').join('')+'</div></section>'+
 panel(panelTitle('A receber',ib('wallet','Abrir financeiro','go|finance'))+'<strong class="fw-balance">'+brl(upcoming.reduce((s,x)=>s+x.amount,0))+'</strong>'+(latest?'<button type="button" class="fw-receivable" data-act="money|'+esc(latest.id)+'"><span>Próximo vencimento</span><b>'+esc(latest.name)+'</b><small>'+shortDate(latest.date)+' · '+brl(latest.amount)+'</small></button>':empty('Nenhum recebimento previsto.')),'fw-pulse')+'</div>'+
 '<section class="fw-home-work"><div class="fw-home-head"><h2>Prioridades de hoje</h2><div class="inline">'+button(reminders.length?'Lembretes · '+reminders.length:'Lembretes','notices',{ic:'bell'})+exportsBtn()+'</div></div><div class="fw-columns"><section><div class="panel-head"><h3>Tarefas</h3>'+ib('plus','Nova tarefa','new-task')+'</div>'+(mainTasks||empty('Nenhuma tarefa para hoje.'))+'</section><section class="fw-agenda-today"><div class="panel-head"><h3>Agenda</h3>'+button('Ver agenda','go|agenda',{ic:'calendar'})+'</div>'+(events.slice(0,4).map(x=>eventRow(x)).join('')||empty('Nenhuma reunião agendada.'))+'</section></div></section>'+
 '<div class="fw-home-bottom">'+panel(panelTitle('Projetos em andamento',button('Ver projetos','go|projects'))+(overviewProjectRows(projects)||empty('Nenhum projeto em andamento.')))+panel(panelTitle('Movimentação do mês')+financePulse()+(db.goals.length?'<div class="fw-home-goals"><div class="panel-head"><h3>Metas</h3>'+button('Ver metas','go|goals')+'</div>'+db.goals.slice(0,2).map(goalMini).join('')+'</div>':''))+'</div>'+followUpPanel();
}
const moneyCents=x=>Math.max(0,Math.round(Number(x||0)*100))/100;
const goalProgress=g=>moneyCents(asList(g.items).filter(i=>i.done).reduce((s,i)=>s+Number(i.amount),0)+asList(g.contributions).reduce((s,i)=>s+Number(i.amount),0));
const goalPercent=g=>Math.min(100,Math.round(100*goalProgress(g)/Math.max(.01,Number(g.target))));
function goalMini(g){const percent=goalPercent(g);return '<button type="button" class="fw-flat fw-goal-mini" data-act="goal-open|'+esc(g.id)+'"><span>'+esc(g.name)+'</span><b>'+percent+'%</b><span class="meter"><i style="width:'+percent+'%"></i></span></button>'}
function renderGoals(){
 return heading('Metas','Listas de compras, reservas e aportes acompanhados em barras.',exportsBtn()+newBtn('Nova meta','goal-edit'))+
 '<div class="tile-grid">'+(db.goals.map(g=>{const percent=goalPercent(g);return panel('<button class="fw-flat" data-act="goal-open|'+esc(g.id)+'"><small>'+esc(g.type)+'</small><h2>'+esc(g.name)+'</h2></button><div class="fw-progress"><span>'+brl(goalProgress(g))+' de '+brl(g.target)+'</span><b>'+percent+'%</b><div class="meter"><i style="width:'+percent+'%"></i></div></div>','fw-goal-card')}).join('')||empty('Nenhuma meta cadastrada.'))+'</div>';
}
function goalDialog(id=''){
 const g=get('goals',id)||{};
 modal(g.id?'Editar meta':'Nova meta','<div class="form-grid">'+field('Nome','name',g.name,'text','required')+select('Tipo','kind',['Compra por itens','Reserva financeira','Outra'],g.type)+field('Valor-alvo (R$)','target',g.target,'number','required min="0.01" step="0.01"')+area('Observações','note',g.note)+'</div>'+formEnd(),'goal|'+id);
}
function goalOpen(id){
 const g=get('goals',id);if(!g)return;
 const items=asList(g.items), percent=goalPercent(g);
 modal(g.name,'<div class="fw-progress"><span>'+brl(goalProgress(g))+' de '+brl(g.target)+'</span><b>'+percent+'%</b><div class="meter"><i style="width:'+percent+'%"></i></div></div>'+
 (g.note?'<p class="editor-text">'+esc(g.note)+'</p>':'')+
 '<div class="resource-head"><h3>Itens · '+brl(items.reduce((s,i)=>s+Number(i.amount),0))+'</h3>'+newBtn('Item','goal-item|'+id)+'</div>'+
 (items.map(i=>{const link=safeURL(i.link);return '<div class="fw-task"><button type="button" class="check'+(i.done?' done':'')+'" data-act="goal-toggle|'+esc(id)+'|'+esc(i.id)+'" aria-label="'+esc((i.done?'Reabrir ':'Concluir ')+i.name)+'">'+(i.done?icon('check'):'')+'</button><button type="button" class="fw-flat" data-act="goal-item|'+esc(id)+'|'+esc(i.id)+'"><b>'+esc(i.name)+'</b><small>'+brl(i.amount)+'</small></button>'+(link?'<a class="btn" target="_blank" rel="noopener noreferrer" href="'+esc(link.href)+'">Abrir link</a>':'')+'</div>'}).join('')||empty('Nenhum item cadastrado.'))+
 '<div class="resource-head"><h3>Aportes</h3>'+newBtn('Aporte','goal-contribution|'+id)+'</div>'+
 (asList(g.contributions).map(i=>'<div class="attachment-row">'+icon('wallet')+'<span>'+esc(i.name||'Aporte')+' · '+shortDate(i.date)+'</span><b>'+brl(i.amount)+'</b></div>').join('')||empty('Nenhum aporte registrado.'))+
 '<div class="dialog-actions">'+deleteButton('goals',id)+button('Editar meta','goal-edit|'+id,{ic:'pen'})+button('Fechar','close')+'</div>','',true);
}
function goalItem(id,itemId=''){
 const g=get('goals',id);if(!g)return;
 const item=g.items?.find(i=>i.id===itemId)||{};
 modal(itemId?'Editar item':'Adicionar item','<div class="form-grid">'+field('Item','name',item.name,'text','required')+field('Valor (R$)','amount',item.amount,'number','required min="0.01" step="0.01"')+field('Link','link',item.link,'url')+'</div>'+formEnd(),'goal-item|'+id+'|'+itemId);
}
function goalContribution(id){modal('Registrar aporte','<div class="form-grid">'+field('Descrição','name')+field('Valor (R$)','amount','','number','required min="0.01" step="0.01"')+field('Data','date',today,'date','required')+'</div>'+formEnd(),'goal-contribution|'+id)}
function handleGoal(type,a,b,fd){
 const g=get('goals',a);
 if(type==='goal'){
  const name=clean(fd.get('name')),target=moneyCents(fd.get('target'));if(!name||!target)return;
  const update={name,target,type:fd.get('kind'),note:clean(fd.get('note'))};
  if(g)Object.assign(g,update);else db.goals.push({id:uid(),items:[],contributions:[],...update});
  finish('Meta salva.');return;
 }
 if(!g)return;
 const amount=moneyCents(fd.get('amount'));if(!amount)return;
 if(type==='goal-item'){
  const name=clean(fd.get('name'));if(!name)return;
  const item=g.items.find(x=>x.id===b);
  const update={name,amount,link:safeURL(fd.get('link'))?.href||''};
  if(item)Object.assign(item,update);else g.items.push({id:uid(),done:false,...update});
 }else g.contributions.push({id:uid(),name:clean(fd.get('name')),amount,date:fd.get('date')});
 finish('Progresso atualizado.');goalOpen(a);
}
function renderSettings(){
 const p=db.profile;
 return heading('Configurações','Perfil, aparência e preferências da sua área de trabalho.',exportsBtn())+
 '<div class="fw-columns">'+panel(panelTitle('Perfil')+'<div class="client-dialog-top">'+avatar(p,'avatar client-avatar')+'<div><b>'+esc(p.name)+'</b><p>'+esc(p.role||'Workspace pessoal')+'</p></div>'+button('Editar perfil','profile',{ic:'pen'})+'</div>'+button('Minha conta','account',{ic:'users'})+' '+button('Sair da conta','workspace-logout',{ic:'x'}))+
 panel(panelTitle('Aparência')+menu(['Padrão do dispositivo','Claro','Escuro'],({light:'Claro',dark:'Escuro',system:'Padrão do dispositivo'})[prefs().theme||'system'],'set-theme')+button('Personalizar Home','wall|home',{ic:'image'})+' '+button('Personalizar agenda','wall|agenda',{ic:'image'}))+
 panel(panelTitle('Lembretes')+'<form data-form="prefs" class="form-grid">'+select('Avisos no Flowork','reminders',[['Ativados','on'],['Desativados','off']],prefs().reminders===false?'off':'on')+field('Antecedência (dias)','reminderDays',prefs().reminderDays??1,'number','required min="0" max="30"')+formEnd('Salvar preferências')+'</form>')+
 panel(panelTitle('Navegação')+button('Personalizar menu','nav-customize',{ic:'position'}))+
 panel(panelTitle('Agenda')+'<p>Abra um compromisso para adicioná-lo ao Google Calendar com data, horário e link da reunião.</p>'+button('Abrir agenda','go|agenda',{ic:'calendar'}))+'</div>';
}
