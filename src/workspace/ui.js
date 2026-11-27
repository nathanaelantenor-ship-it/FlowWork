const sidebar=document.getElementById('sidebar');
const topbar=document.getElementById('topbar');
const main=document.getElementById('main');
const overlay=document.getElementById('overlay');
let toastTimer, dialogReturn=null, dialogSource=null;
function persist(){return !services.signal.aborted&&services.sync.enqueue(db)}
function toast(text){const el=document.getElementById('toast');el.innerHTML='<div class="toast">'+esc(text)+'</div>';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.replaceChildren(),3500)}
function go(view){
 if(!nav.some(x=>x[0]===view))return;
 state.view=view;state.mobile=false;if(location.hash.slice(1)!==view)history.replaceState(null,'','#'+view);
 modalClose(false);render();window.scrollTo(0,0);main.focus({preventScroll:true});
}
function modal(title,html,form='',drawer=false){
 if(!overlay.firstChild){dialogReturn=document.activeElement;document.body.style.overflow='hidden'}
 overlay.innerHTML='<div class="scrim"><section class="dialog'+(drawer?' drawer':'')+'" role="dialog" aria-modal="true" aria-labelledby="dialogTitle"><div class="dialog-header"><h2 id="dialogTitle">'+esc(title)+'</h2>'+ib('x','Fechar','close')+'</div>'+(form?'<form data-form="'+esc(form)+'">'+html+'</form>':html)+'</section></div>';
 hydrateImages(overlay);
 (overlay.querySelector('[autofocus]')||overlay.querySelector('.field')||overlay.querySelector('button'))?.focus({preventScroll:true});
}
function modalClose(restore=true){
 overlay.replaceChildren();
 dialogSource?.classList.remove('is-open');
 dialogSource=null;
 document.body.style.overflow='';
 if(restore&&dialogReturn?.isConnected)dialogReturn.focus();
 dialogReturn=null;
}
const formEnd=(label='Salvar',secondary='')=>'<div class="dialog-actions">'+secondary+button('Cancelar','close',{cls:'btn ghost'})+'<button class="btn primary" type="submit">'+esc(label)+'</button></div>';
function render(){
 if(services.signal.aborted)return;
 document.documentElement.dataset.flowTheme=db.preferences.theme||'system';
 sidebar.classList.toggle('mobile-open',state.mobile);
 renderSidebar();
 topbar.innerHTML='<div class="crumb">'+button('','mobile',{cls:'icon-btn mobile-toggle',ic:'menu',title:'Abrir menu'})+'<span>Área de trabalho</span>'+icon('chevron')+'<b>'+navName(state.view)+'</b></div><div class="top-actions"><button type="button" class="btn ghost search-btn" data-act="search" aria-label="Buscar">'+icon('search')+'<span>Buscar</span><kbd class="key">Ctrl K</kbd></button>'+'<button type="button" class="btn sync-pill" data-act="account" data-sync-state></button>'+ib('bell','Pendências','notices')+newBtn('Criar','create')+ib('users','Minha conta','account')+'</div>';
 const views={home:renderNewHome,clients:renderClients,finance:renderFinance,files:renderDocs,maps:renderMaps,projects:renderProjects,tasks:renderTasks,agenda:renderAgenda,goals:renderGoals,settings:renderSettings,services:serviceMenu};
 main.dataset.module=state.view;
 main.innerHTML=wrap((views[state.view]||(()=>renderBoardPage(state.view)))());
 services.refreshStatus();hydrateImages(main);
 renderAssistant();
 if(state.view==='maps'&&state.map){drawMapLinks();fillMapImages()}
}
function progress(k,p){return Math.round(Math.min(1,asList(p.done).length/Math.max(1,(checklists[k]||[]).length))*100)}
const socialCycleOnly=()=>!state.allSocialCycles||state.boardView.social==='Calendário';
const socialClientDelivery=()=>Boolean(state.client&&!state.allSocialCycles);
function activeSocial(){
 return db.social.filter(x=>(!state.client||x.client===state.client)&&
  (!socialCycleOnly()||(x.cycle||x.date?.slice(0,7))===state.cycle)&&
  (state.boardView.social==='Entrega'||!state.socialPending||x.stage!=='Entregue'));
}
function socialFilters(view){
 const clients=[...new Set(db.social.map(x=>x.client).concat(db.clients.map(x=>x.name),state.client))]
  .filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));
 return '<label class="input-wrap">Cliente<select class="field" data-change="client">'+
  option('Todos os clientes','',state.client)+clients.map(x=>option(x,x,state.client)).join('')+'</select></label>'+
  (view==='Calendário'||!state.allSocialCycles?'<label class="input-wrap">Ciclo<input class="field" type="month" aria-label="Ciclo de mídias sociais" data-change="cycle" value="'+esc(state.cycle)+'"></label>':'')+
  (view!=='Calendário'?'<label class="share-check"><input type="checkbox" data-change="allSocialCycles" '+(state.allSocialCycles?'checked':'')+'> Todos os ciclos</label>':'')+
  (view!=='Entrega'?'<label class="share-check"><input type="checkbox" data-change="socialPending" '+(state.socialPending?'checked':'')+'> Só em aberto</label>':'')+
  button('Novo ciclo','new-cycle',{ic:'repeat'})+(state.client&&socialCycleOnly()?button('Visão do cliente','client-view',{ic:'eye',cls:'btn ghost'}):'');
}
const activeRows=k=>k==='social'?activeSocial():k==='crm'&&state.crmFilter?db.crm.filter(x=>state.crmFilter.split(',').includes(x.stage)):db[k];
const rowButton=(title,k,id)=>button(title,'open|'+k+'|'+id,{cls:'text-button'});
function renderBoardPage(k){
 const config=definitions[k], view=state.boardView[k];
 const available=insightBoard(k)?['Kanban','Calendário','Insights']:k==='social'?['Kanban','Calendário','Entrega']:k==='content'?['Kanban','Calendário','Insights']:k==='study'?['Trilhas','Kanban']:['Kanban','Lista'];
 const filters=k==='social'?socialFilters(view):k==='crm'&&state.crmFilter?button('Limpar filtro','crm-filter|',{ic:'x'}):(k==='content'||serviceBoard(k))&&view==='Calendário'?'<label>Mês <input class="field" type="month" data-change="contentMonth" value="'+esc(state.contentMonth)+'"></label>':'';
 const rows=activeRows(k);
 let body;
 if(view==='Kanban')body=board(k,rows);
 if(view==='Lista')body=renderTable(k==='crm'?['Lead','Negócio','Etapa','Origem','Próxima ação','Valor']:['Projeto','Etapa','Prazo','Versão'],rows.map(x=>k==='crm'?['<span class="inline">'+rowButton(x.name,k,x.id)+whatsappButton(x.contact,x.name,true)+'</span>',esc(x.client),statusTag(x.stage),esc(x.origin),shortDate(x.date),brl(x.amount)]:[rowButton(x.name,k,x.id),statusTag(x.stage),shortDate(x.date),esc(x.approval||'Pendente')]));
 if(view==='Calendário')body=calendar(k,rows,k==='social'?state.cycle:state.contentMonth);
 if(view==='Insights')body=serviceBoard(k)?serviceInsights(k):renderInsights();
 if(view==='Entrega')body=delivery(rows);
 if(view==='Trilhas')body='<div class="tile-grid">'+rows.map(x=>'<button type="button" class="tile" data-act="open|study|'+esc(x.id)+'"><span class="tile-icon">'+icon('book')+'</span>'+statusTag(x.stage)+'<h3>'+esc(x.name)+'</h3><p>'+esc(x.note)+'</p><span class="meter"><i style="width:'+progress('study',x)+'%"></i></span><p>Meta até '+shortDate(x.date)+'</p></button>').join('')+'</div>';
 return heading(navName(k),config.note,exportsBtn()+(serviceBoard(k)?button('Personalizar','service-config|'+k,{ic:'pen'}):'')+newBtn('Adicionar '+config.noun,'new|'+k))+'<div class="filterbar">'+menu(available,view,'sub')+filters+'</div>'+body;
}
function board(k,rows){
 return '<div class="board-wrap"><div class="board">'+definitions[k].labels.map(stage=>{
  const cards=rows.filter(x=>x.stage===stage);
  return '<section class="lane" data-lane="'+esc(stage)+'" data-board="'+k+'"><div class="lane-title">'+esc(stage)+'<span class="count-pill">'+cards.length+'</span><button type="button" data-act="new|'+k+'|'+esc(stage)+'" aria-label="Adicionar em '+esc(stage)+'">'+icon('plus')+'</button></div>'+
   (cards.length?cards.map(x=>boardCard(k,x)).join(''):empty('Sem cards'))+'</section>';
 }).join('')+'</div></div>';
}
function boardCard(k,x){
 const open=' tabindex="0" role="button" data-act="open|'+k+'|'+esc(x.id)+'"';
 const data=' data-card="'+esc(x.id)+'" data-board="'+k+'"';
 const cover=x.cover?localImage(x.cover,'','board-cover'):'';
 if(k==='content')return '<div class="board-card content-card"'+open+data+'>'+cover+'<strong>'+esc(x.name)+'</strong></div>';
 const content=cover+
  statusTag(x.kind&&x.formatDetail?x.kind+' · '+x.formatDetail:x.kind||x.stage)+'<strong>'+esc(x.name)+'</strong>'+
  (k==='social'&&!state.client?'<small>'+esc(x.client||'Sem cliente')+'</small>':'')+'<p>'+esc(k==='crm'?x.client:x.note||x.client||'')+'</p>'+
  '<div class="card-foot"><span>'+shortDate(editorialBoard(k)?publishedOn(x)||x.date:x.date)+'</span><span>'+esc(k==='crm'?brl(x.amount):k==='social'?'v'+(x.version||1):'')+'</span></div>';
 if(k!=='crm')return '<div class="board-card"'+open+data+'>'+content+'</div>';
 return '<article class="board-card crm-card"'+data+'><div class="board-card-open"'+open+'>'+content+'</div>'+
  whatsappButton(x.contact,x.name,true)+'</article>';
}
function calendar(k,rows,month){
 const [year,m]=month.split('-').map(Number), offset=(new Date(year,m-1,1).getDay()+6)%7, days=new Date(year,m,0).getDate();
 return '<div class="board-wrap"><h2 class="section-title" style="margin-bottom:10px;text-transform:capitalize">'+esc(monthName(month))+'</h2><div class="cal-grid">'+['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(x=>'<strong>'+x+'</strong>').join('')+Array.from({length:offset},()=>'<div></div>').join('')+Array.from({length:days},(_,i)=>{const date=month+'-'+String(i+1).padStart(2,'0');return '<div class="cal-cell'+(date===today?' today':'')+'">'+(i+1)+rows.filter(x=>(k==='content'||editorialBoard(k)?publishedOn(x)||x.date:x.date)===date).map(x=>button(k==='social'&&!state.client&&x.client?x.name+' · '+x.client:x.name,'open|'+k+'|'+x.id,{cls:'event'})).join('')+'</div>'}).join('')+'</div></div>';
}
function delivery(rows){
 const ready=rows.filter(x=>['Aprovado','Entregue'].includes(x.stage)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
 return panel(panelTitle('Peças prontas · '+(state.client||'Todos os clientes'),ready.length&&socialClientDelivery()?button('Baixar pacote','package',{ic:'download'}):'')+
  (ready.length&&!socialClientDelivery()?'<p class="small">Selecione um cliente e um ciclo para baixar o pacote de entrega.</p>':'')+
  (ready.length?renderTable(['Publicação','Peça','Cliente','Legenda','Status'],ready.map(x=>[shortDate(x.date),rowButton(x.name,'social',x.id),esc(x.client||'—'),esc(x.caption||'—'),statusTag(x.stage)])):empty('Quando uma peça for aprovada, ela aparece aqui.','empty-panel')));
}
const checklists={
 idv:['Briefing e materiais','Pesquisa de mercado e público','Relatório estratégico aprovado','Conceito, símbolo, paleta e tipografia','Apresentação e ajustes aprovados','Manual e arquivos finais'],
 social:['Pauta aprovada','Texto e legenda','Peça em revisão','Aprovação do cliente','Arquivos entregues'],
 content:['Pauta e gancho','Roteiro ou texto','Produção','Revisão e publicação'],
 study:['Sessão agendada','Aulas concluídas','Exercício aplicado'],
 crm:[]
};
function cardDialog(k,id='',initial=''){
 const x=get(k,id)||{};
 const crm=k==='crm', social=k==='social', idv=k==='idv', content=k==='content';
 const stages=definitions[k].labels;
 const custom=serviceBoard(k), editableMetrics=content||insightBoard(k), editorial=editorialBoard(k), projectWork=idv||social||custom;
 const booked=db.finance.find(f=>f.sourceProject===x.id&&f.status==='Realizado');
 let fields=field(crm?'Nome do lead':social?'Título da peça':(idv||custom)&&!editorial?'Nome do projeto':'Título','name',x.name,'text','required');
 if(crm)fields+=field('Negócio','client',x.client,'text','required');
 if(projectWork)fields+=clientPicker(x,social?state.client:'',true);
 if(content||social||editorial)fields+=formatPicker(x.kind);
 if(k==='study')fields+=field('Ferramenta ou tema','kind',x.kind);
 fields+=select('Etapa','stage',stages,x.stage||initial||stages[0])+field(crm?'Data da próxima ação':content?'Data planejada':'Data de entrega','date',x.date??today,'date',projectWork?'required':'');
 if(projectWork)fields+=field(editorial?'Valor (R$, opcional)':'Valor do projeto (R$)','amount',x.amount,'number',(booked?'readonly ':editorial||x.id&&!x.paymentDue?'':'required ')+'min="0.01" step="0.01"')+field(editorial?'Recebimento (se houver cobrança)':'Data prevista de recebimento','paymentDue',x.paymentDue,'date',booked?'readonly':editorial||x.id&&!x.paymentDue?'':'required');
 if(booked)fields+='<div class="callout wide">Recebimento já confirmado. Abra o Financeiro para consultar ou corrigir a baixa.</div>';
 if(projectWork&&x.paymentRemoved)fields+='<div class="callout wide">Lançamento financeiro excluído. Altere o valor ou a data de recebimento para lançar novamente.</div>';
 if(crm)fields+=select('Canal','kind',['WhatsApp','Instagram','Threads','LinkedIn','E-mail','Outro'],x.kind)+select('Origem','origin',['Prospecção','Conteúdo','Indicação','Outro'],x.origin)+field('Valor da proposta (R$)','amount',x.amount,'number','min="0" step="0.01"')+field('Contato','contact',x.contact)+select('Serviço','service',workBoards().map(navName),x.service)+'<div class="checklist"><label><input type="checkbox" name="signed" '+(x.signed?'checked':'')+'> Contrato assinado</label><label><input type="checkbox" name="paid" '+(x.paid?'checked':'')+'> Entrada recebida</label></div>';
 if(idv)fields+=select('Tipo de projeto','kind',[...new Set(['Identidade Visual','Redesign','Rebranding',x.kind].filter(Boolean))],x.kind||'Identidade Visual')+select('Aprovação','approval',['Estratégia em revisão','Estratégia aprovada','Identidade apresentada','Identidade aprovada'],x.approval);
 if(social)fields+=field('Ciclo','cycle',x.cycle||state.cycle,'month')+field('Versão','version',x.version||1,'number','min="1" step="1"')+field('Detalhe do formato','formatDetail',x.formatDetail||(x.kind?.includes(' · ')?x.kind.split(' · ').slice(1).join(' · '):''))+area('Legenda','caption',x.caption);
 if(editableMetrics)fields+=field(editorial||content?'Data da publicação':'Início da campanha','publishedDate',publishedOn(x),'date')+field('CTA','cta',x.cta);
 fields+=area(crm?'Próxima ação':'Observações','note',x.note);
 if(crm)fields+=area('Histórico de conversas','history',x.history);
 let detail='';
 if(checklists[k].length)detail+='<h3>Checklist</h3><div class="checklist">'+checklists[k].map((label,i)=>'<label><input type="checkbox" name="step" value="'+i+'" '+(asList(x.done).includes(i)?'checked':'')+'> '+label+'</label>').join('')+'</div>';
 if(x.id&&projectWork)detail+='<h3>Documentos e arquivos</h3>'+attachmentList(db.docs.filter(d=>d.project===id))+button('Anexar arquivo','upload|'+id+'|'+encodeURIComponent(x.client),{ic:'upload'})+' '+button('Novo documento','new-doc|'+id+'|'+encodeURIComponent(x.client),{ic:'file'});
 if(idv&&x.id){const maps=db.maps.filter(m=>m.project===id);detail+='<h3>Mapas mentais</h3>'+maps.map(m=>button(m.name,'open-map|'+m.id,{ic:'map'})).join(' ')+' '+button('Vincular novo mapa','new-map||'+id,{ic:'plus'});}
 if(social&&x.feedback)detail+='<h3>Feedback do cliente</h3><p class="small">'+esc(x.feedback)+'</p>';
 if(crm&&x.clientId)detail+='<div class="resource-head"><h3>Cliente vinculado</h3>'+button('Ver cliente','client-detail|'+x.clientId,{ic:'users'})+'</div>';
 if(crm&&x.project)detail+='<p class="callout">Projeto vinculado a este lead.</p>';
 if(crm&&x.id&&!x.project&&!x.clientDetached)detail+='<p class="small">Fechar cria a ficha e a pasta do cliente. Contrato e entrada confirmados iniciam o projeto.</p>';
 const controls=social&&x.id&&['Aprovação','Ajustes','Aprovado'].includes(x.stage)?button('Abrir aprovação','review|'+id,{ic:'eye'}):'';
 const body=content||projectWork?contentEditor(x,fields,detail,editableMetrics,k):'<div class="form-grid">'+fields+'</div>'+detail;
 modal(x.name||'Adicionar '+definitions[k].noun,body+formEnd('Salvar',deleteButton(k,id)+
  (crm&&id?whatsappButton(x.contact,x.name):'')+controls),'card|'+k+'|'+id,true);
}
function createProject(lead){
 if(lead.stage!=='Fechado')return;
 const c=ensureClientOnClose(lead);
 if(lead.project||!c||!lead.signed||!lead.paid)return;
 const projectId=uid(), target=workBoards().find(k=>navName(k)===lead.service)||'idv', isSocial=target==='social', folderName=navName(target);
 const folder={id:uid(),parent:c.folder,name:folderName,clientId:c.id,project:projectId,color:c.color,date:today};
 let sequence=2;
 while(db.folders.some(f=>f.parent===folder.parent&&f.name===folder.name))folder.name=folderName+' '+sequence++;
 db.folders.push(folder);
 const x={id:projectId,name:c.name,client:c.name,clientId:c.id,folder:folder.id,date:lead.date||today,note:'Enviar boas-vindas, briefing e cronograma.',done:[]};
 if(isSocial){x.name='Onboarding e primeira pauta';x.stage='Pauta';x.kind='Planejamento';x.cycle=state.cycle;db.social.push(x)}
 else{x.stage=definitions[target].labels[0];x.kind=editorialBoard(target)?'Post estático':navName(target);db[target].push(x)}
 lead.project=x.id;
 if(c.state==='Em onboarding')c.state='Ativo';
}
async function addOrEditCard(k,id,fd,form){
 const previous=get(k,id),next={...previous,id:id||uid()};
 const textFields=['name','client','kind','stage','date','origin','contact','service','approval','cycle','caption','cta','publishedDate','note','history','formatDetail','paymentDue'];
 for(const field of textFields)if(fd.has(field))next[field]=clean(fd.get(field));
 for(const field of ['amount','version'])if(fd.has(field))next[field]=Number(fd.get(field)||0);
 if(!next.name)return;
 if(k==='idv'||k==='social'||serviceBoard(k)){const choice=fd.get('clientId');if(choice==='new'&&!clean(fd.get('newClient'))||choice&&!['new','legacy'].includes(choice)&&!get('clients',choice)||!choice&&!next.client){contentTab('details');toast('Selecione um cliente ou informe o nome do novo cliente.');return} if((fd.get('amount')||next.paymentDue||previous?.paymentDue)&&(!next.paymentDue||!Number.isFinite(next.amount)||next.amount<=0)){contentTab('details');toast('Informe o valor e a data prevista de recebimento.');return}}
 if((k==='content'||k==='social'||editorialBoard(k))&&!next.kind){
  contentTab('details');overlay.querySelector('.format-select')?.setAttribute('open','');toast('Selecione o formato da peça.');return;
 }
 if((k==='content'||insightBoard(k))&&previous&&!Array.isArray(next.metrics))next.metrics=postHistory(previous,k);
 if((k==='content'||editorialBoard(k))&&next.stage==='Publicado'&&!next.publishedDate){contentTab('details');toast('Informe a data da publicação.');return}
 if((k==='content'||insightBoard(k))&&next.publishedDate&&postHistory(next,k).some(x=>x.date<next.publishedDate)){contentTab('details');toast('A publicação precisa ser anterior à primeira atualização de métricas.');return}
 if(form&&(['content','social','idv'].includes(k)||serviceBoard(k))){
  try{await saveResources(next,form,fd)}catch(error){contentTab('references');toast(error.message);return}
 }
 if(k==='crm'){
  next.signed=fd.has('signed');next.paid=fd.has('paid');
  if(next.stage==='Fechado'&&previous?.stage!=='Fechado')next.clientDetached=false;
  if(next.stage==='Fechado'&&!next.closedOn)next.closedOn=today;
  createProject(next)
 }else next.done=fd.getAll('step').map(Number);
 if(k==='social'||k==='idv'||serviceBoard(k)){
  linkProjectClient(next,previous,fd,k);
  if(next.paymentRemoved&&(next.amount!==previous?.amount||next.paymentDue!==previous?.paymentDue))next.paymentRemoved=false;
  syncProjectPayment(k,next);
 }
 if(previous)Object.assign(previous,next);else db[k].push(next);
 if(k==='social'&&state.client){state.client=next.client;if(!state.allSocialCycles)state.cycle=next.cycle||state.cycle}
 finish('Registro salvo.');
 return previous||next;
}
function openCard(k,id){
 if(k==='task'){const item=get('tasks',id);if(item)taskDialog(item);return}
 if(k==='event'){const item=get('events',id);if(item)eventDialogNext(id);return}
 if(definitions[k]&&get(k,id))cardDialog(k,id);
}
function taskDialog(x={}){modal(x.id?'Editar tarefa':'Nova tarefa','<div class="form-grid">'+field('Tarefa','name',x.name,'text','required')+field('Data','date',x.date||today,'date','required')+field('Horário','time',x.time,'time')+select('Projeto','project',projectChoices(),x.project||'')+clientPicker(x)+field('Contexto','meta',x.meta)+'</div>'+formEnd('Salvar',deleteButton('tasks',x.id)),'task|'+(x.id||''))}
function eventDialog(x={}){modal(x.id?'Editar compromisso':'Novo compromisso','<div class="form-grid">'+field('Compromisso','name',x.name,'text','required')+field('Data','day',x.day||state.day,'date','required')+field('Início','time',x.time||'09:00','time','required')+field('Término','end',x.end,'time')+field('Link do Meet ou da reunião','meeting',x.meeting,'url')+select('Vincular a','party',meetingChoices(),x.party||'')+area('Pauta','note',x.note)+'</div>'+formEnd('Salvar',deleteButton('events',x.id)),'event|'+(x.id||''))}
function cycleDialog(){modal('Novo ciclo de mídias sociais','<div class="form-grid">'+clientPicker({},state.client,true)+field('Mês','cycle',state.cycle,'month','required')+field('Quantidade de peças','count',6,'number','required min="1" max="30" step="1"')+select('Estrutura','structure',['Cards numerados','Reaproveitar nomes e formatos do último ciclo'],'Cards numerados')+'</div>'+formEnd('Criar ciclo'),'cycle')}
function createCycle(fd){
 const cycle=fd.get('cycle'), count=Number(fd.get('count'));
 const choice=fd.get('clientId'), label=choice==='new'?clean(fd.get('newClient')):get('clients',choice)?.name||clean(fd.get('client'));
 if(!label||!cycle||!Number.isInteger(count)||count<1||count>30){toast('Confira cliente, mês e quantidade de peças.');return}
 const client=label;
 if(db.social.some(x=>x.client===client&&x.cycle===cycle)){toast('Já existe um ciclo desse cliente neste mês.');return}
 const pastMonth=db.social.filter(x=>x.client===client&&x.kind!=='Planejamento'&&x.cycle<cycle).map(x=>x.cycle).sort().at(-1);
 const past=fd.get('structure')==='Cards numerados'?[]:db.social.filter(x=>x.client===client&&x.cycle===pastMonth&&x.kind!=='Planejamento');
 const selection={id:uid(),client,amount:0};linkProjectClient(selection,null,fd,'social');
 for(let i=0;i<count;i++)db.social.push({id:i===0?selection.id:uid(),name:past[i]?.name||'Peça '+String(i+1).padStart(2,'0'),cyclePiece:true,client,clientId:selection.clientId,folder:selection.folder,cycle,stage:'Pauta',kind:past[i]?.kind||'A definir',date:'',note:'Definir a pauta e o formato.',done:[]});
 state.cycle=cycle;if(state.client)state.client=client;finish('Ciclo criado com '+count+' peças.');
}
function clientPreview(){
 if(!state.client||!socialCycleOnly())return;
 const pieces=db.social.filter(x=>x.client===state.client&&(x.cycle||x.date?.slice(0,7))===state.cycle&&['Aprovação','Aprovado','Entregue','Ajustes'].includes(x.stage));
 modal('Visão do cliente · '+state.client,'<p class="small">Prévia local do ciclo de '+esc(monthName(state.cycle))+'.</p><div class="search-list">'+(pieces.map(x=>'<button data-act="review|'+esc(x.id)+'">'+esc(x.name)+'<small>'+esc(x.stage)+' · v'+(x.version||1)+'</small></button>').join('')||empty('Ainda não há peças compartilhadas neste ciclo.'))+'</div>'+formEndNoSubmit());
}
const formEndNoSubmit=()=>'<div class="dialog-actions">'+button('Fechar','close',{cls:'btn ghost'})+'</div>';
function review(id){
 const x=get('social',id);if(!x)return;
 const readonly=x.stage==='Entregue';
 const demo=x.cover?localImage(x.cover,'Capa da peça','approval-cover'):x.id==='s2'?'<div class="social-preview" aria-label="Prévia conceitual da peça"><small>CASA ORLA</small><b>5 formas de<br>renovar sua sala.</b><i></i></div>':'';
 modal('Aprovação · v'+(x.version||1),'<h3>'+esc(x.name)+'</h3>'+demo+'<p class="editor-text small">'+esc(x.caption||'Sem legenda cadastrada.')+'</p>'+attachmentList(db.docs.filter(d=>d.project===id&&d.shared))+(readonly?'<p class="callout">Peça entregue.</p>':'<div class="form-grid">'+area('Comentário para esta versão','feedback',x.feedback)+'</div><div class="dialog-actions"><button class="btn" type="submit" name="review" value="Ajustes">Solicitar ajustes</button><button class="btn primary" type="submit" name="review" value="Aprovado">Aprovar versão</button></div>'),'review|'+id,true);
}
function finish(message){if(services.signal.aborted)return;modalClose(false);render();if(persist())toast(message)}
