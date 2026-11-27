const createOptions=[
 ['Meta','target','goal-edit'],['Tarefa','check','new-task'],['Compromisso','calendar','new-event'],['Lead','columns','new|crm'],['Cliente','users','client-edit'],['Pasta','folder','folder-edit'],['Projeto de IDV','pen','new|idv'],['Peça de mídias sociais','layers','new|social'],['Ciclo de mídias sociais','repeat','new-cycle'],['Conteúdo próprio','play','new|content'],['Estudo','book','new|study'],['Documento','file','new-doc'],['Arquivo','upload','upload'],['Mapa mental','map','new-map'],['Lançamento','wallet','new-money']
];
function searchResults(term){
 const items=nav.map(([id,ic,title])=>[title,'Módulo','go|'+id]).concat(
  ...Object.keys(definitions).map(k=>db[k].map(x=>[x.name,navName(k)+(x.client?' · '+x.client:''),'open|'+k+'|'+x.id])),
  db.docs.map(x=>[x.name,'Documentos','doc|'+x.id]),db.folders.map(x=>[x.name,'Pastas','folder-open|'+x.id]),db.clients.map(x=>[x.name,'Clientes','client-detail|'+x.id]),db.maps.map(x=>[x.name,'Mapas Mentais','open-map|'+x.id])
 );
 const norm=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const hits=items.filter(x=>norm(x[0]+' '+x[1]).includes(norm(term))).slice(0,12);
 const target=document.getElementById('searchResults');
 if(target)target.innerHTML=hits.map(([name,section,act])=>'<button type="button" data-act="'+esc(act)+'">'+esc(name)+'<small>'+esc(section)+'</small></button>').join('')||empty('Nenhum resultado.');
}
function openSearch(){modal('Buscar no Flowork','<input type="search" class="field" id="searchBox" placeholder="Nome, cliente ou área" aria-label="Busca no workspace" autocomplete="off" autofocus><div class="search-list" id="searchResults"></div>');searchResults('')}
const actionHandlers={
 account:()=>services.openAccount(),
 go:go,
 'nav-customize':toggleNavEditing,
 'nav-area':areaDialog,
 'follow-up':followUpDialog,
 'assistant-history':assistantHistoryDialog,
 'assistant-undo-confirm':undoAssistantDialog,
 'assistant-undo':undoAssistantAction,
 'assistant-confirm':confirmAssistantSeries,
 'assistant-toggle':assistantToggle,
 'assistant-example':id=>{assistant.open=true;assistantSend(id==='diagnostico'&&state.view==='finance'?'Faça um diagnóstico financeiro da '+(state.ledger==='empresa'?'empresa':'conta pessoal')+' no período selecionado.':chatExamples[id])},
 'assistant-sample':assistantSample,
 'assistant-finance':chatFinance,
 'assistant-project':chatOpenProject,
 'service-add':serviceAdd,
 'service-config':serviceConfig,
 close:()=>modalClose(),
 mobile:()=>{state.mobile=!state.mobile;sidebar.classList.toggle('mobile-open',state.mobile)},
 create:()=>modal('Criar no Flowork','<div class="grid-menu">'+createOptions.map(([text,ic,act])=>button(text,act,{cls:'btn',ic})).join('')+'</div>'),
 search:openSearch,
 notices:reminderDialog,
 'wall':appearanceDialog,
 'project-create':chooseProject,
 'project-filter':v=>{state.projectType=v;render()},
 'project-pick':(k,id)=>{state.projectPick=id;render()},
 'project-jump':(k,id)=>{state.projectType='Todos';state.projectPick=id;go('projects')},
 'agenda-month':n=>{state.day=addMonths(state.day,Number(n));render()},
 'goal-edit':goalDialog,
 'goal-open':goalOpen,
 'goal-item':goalItem,
 'goal-contribution':goalContribution,
 'goal-toggle':(id,i)=>{const g=get('goals',id), item=g?.items.find(x=>x.id===i);if(item){item.done=!item.done;render();persist();goalOpen(id)}},
 'set-theme':v=>{prefs().theme=({'Claro':'light','Escuro':'dark','Padrão do dispositivo':'system'})[v]||'system';render();persist()},
 'workspace-logout':()=>services.logout?.(),
 'paid-now':id=>{const entry=get('finance',id);if(entry&&!entry.mirror){entry.status='Realizado';entry.paidDate=today;syncSalary();finish(entry.type==='in'?'Recebimento confirmado.':'Pagamento confirmado.')}},
 day:d=>{state.day=d;render()},
 week:d=>{state.day=addDays(state.day,Number(d));render()},
 task:id=>{const t=get('tasks',id);if(t){t.done=!t.done;render();persist();checkReminders()}},
 'all-tasks':()=>modal('Tarefas de hoje','<div class="search-list">'+db.tasks.map(t=>'<button type="button" data-act="open|task|'+esc(t.id)+'">'+esc(t.name)+'<small>'+esc((t.done?'Concluída':'Pendente')+(t.time?' · '+t.time:''))+'</small></button>').join('')+'</div><div class="dialog-actions">'+newBtn('Nova tarefa','new-task')+'</div>'),
 'new-task':()=>taskDialog(),
 'new-event':()=>eventDialog(),
 new:(k,stage)=>cardDialog(k,'',stage),
 open:(k,id)=>k==='money'?moneyDialog(id):k==='doc'?docDialog(id):openCard(k,id),
 sub:s=>{state.boardView[state.view]=s;render()},
 'crm-filter':list=>{state.crmFilter=list||'';if(state.view!=='crm')go('crm');else render()},
 'new-cycle':cycleDialog,
 package:deliveryPackage,
 'client-view':clientPreview,
 review:review,
 'client-status':v=>{state.clientStatus=v;render()},
 'client-detail':clientDetail,
 'client-edit':clientDialog,
 profile:profileDialog,
 'folder-open':(id='')=>{if(!id||get('folders',id)){state.folder=id;state.kindFilter='Todas';go('files')}},
 'folder-edit':folderDialog,
 'content-tab':contentTab,
 'post-insights':openPostInsights,
 'metric-edit':metricEditor,
 'insight-reset':()=>{state.insightFrom='';state.insightTo='';state.insightFormat='';render()},
 'reference-add':()=>{
  const list=overlay.querySelector('[data-ref-rows]');if(list){list.insertAdjacentHTML('beforeend',referenceRow());list.lastElementChild.querySelector('[name="refUrl"]').focus()}
 },
 'reference-preview':(trigger)=>openReferenceMedia(trigger),
 'reference-remove':(trigger)=>trigger.closest('.ref-row')?.remove(),
 'doc-filter':v=>{state.kindFilter=v;render()},
 upload:(project,client)=>uploadDialog(project,client?decodeURIComponent(client):''),
 doc:docDialog,
 'new-doc':(project,client)=>docDialog('',project,client?decodeURIComponent(client):''),
 'file-download':fileDownload,
 'doc-pdf':id=>{const d=get('docs',id);if(d)download(cleanFilename(d.name)+'.pdf',report(d.name,[['Documento',[['Título','Cliente','Conteúdo'],[d.name,d.client,d.text]]]]))},
 ledger:x=>{state.ledger=x==='Empresa'?'empresa':'pessoal';render()},
 fstatus:x=>{state.fstatus=x;render()},
 'new-money':()=>moneyDialog(),
 money:moneyDialog,
 'record-delete':confirmRemoval,
 'doc-trash':documentTrash,
 'doc-restore':restoreDocument,
 categories:categoryList,
 'edit-cat':categoryDialog,
 'new-map':newMapDialog,
 'open-map':id=>{if(get('maps',id)){state.map=id;state.mapZoom=1;go('maps')}},
 'map-settings':mapSettings,
 'map-list':()=>{state.map='';go('maps')},
 node:id=>{if(Date.now()>=suppressMapClick)nodeDialog(id)},
 'new-node':()=>nodeDialog(),
 'delete-node':id=>{const m=activeMap(),n=nodeBy(m,id);if(n){m.nodes.forEach(x=>{if(x.parent===id)x.parent=n.parent});m.nodes=m.nodes.filter(x=>x.id!==id);m.edges=asList(m.edges).filter(e=>!e.includes(id));finish('Bloco excluído.')}},
 'map-zoom':delta=>{const v=document.getElementById('mapViewport'),l=v?.scrollLeft||0,t=v?.scrollTop||0;const old=state.mapZoom;state.mapZoom=delta==='reset'?1:Math.max(.5,Math.min(1.6,Number((old+Number(delta)).toFixed(1))));render();restoreMapScroll(l*state.mapZoom/old,t*state.mapZoom/old)},
 'map-copy':()=>{const m=activeMap(),copy={...clone(m),id:uid(),name:m.name+' · Cópia'};db.maps.push(copy);state.map=copy.id;finish('Mapa duplicado.')},
 'map-template':()=>modal('Salvar como modelo','<div class="form-grid">'+field('Nome do modelo','name',activeMap().name,'text','required')+'</div>'+formEnd('Salvar modelo'),'map-template'),
 'connect-map':connectDialog,
 export:()=>modal('Exportar '+navName(state.view),'<div class="form-grid">'+select('Recorte','scope',['Visão atual','Área inteira'],'Visão atual')+'</div><div class="dialog-actions"><button type="submit" class="btn" name="exportType" value="pdf">'+icon('download')+' Baixar PDF</button><button type="submit" class="btn primary" name="exportType" value="xlsx">'+icon('download')+' Baixar Excel</button></div>','export')
};
listen(document,'click',ev=>{
 if(ev.target.classList.contains('scrim')){modalClose();return}
 const trigger=ev.target.closest('[data-act]');if(!trigger)return;
 if(trigger.closest('[data-card]')&&Date.now()<suppressBoardClick)return;
 const [key,...args]=trigger.dataset.act.split('|');
 if(['reference-preview','reference-remove'].includes(key)){actionHandlers[key](trigger);return}
 try{
  const openingFrom=overlay.firstChild?null:trigger.closest(
   '.board-card,.client-card,.folder-card,.tile,.map-node,.fw-goal-card,.fw-task,.fw-event,.fw-follow-item,.rank-item,.svc-row,.table tbody tr,.attachment-row,.cal-cell .event'
  );
  const consume=actionHandlers[key]?.(...args);
  consume?.catch?.(()=>toast('Não foi possível concluir esta ação.'));
  if(openingFrom&&overlay.firstChild&&main.contains(openingFrom)){
   dialogSource=openingFrom;
   dialogSource.classList.add('is-open');
  }
 }catch(error){console.error(error);toast('Não foi possível concluir esta ação.')}
});
listen(document,'keydown',ev=>{
 if(ev.key==='Escape'){if(overlay.firstChild)modalClose();else if(assistant.open)assistantToggle();else if(navDrag)finishNavDrag();else if(navEditing)toggleNavEditing();else if(state.mobile)actionHandlers.mobile();return}
 if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='k'){ev.preventDefault();openSearch()}
 if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('.board-card[role="button"],.board-card-open')){ev.preventDefault();ev.target.click()}
 if(ev.key==='Tab'&&overlay.firstChild){
  const focusable=[...overlay.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]')];
  const first=focusable[0],last=focusable.at(-1);
  if(first&&last&&ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus()}
  else if(first&&last&&!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus()}
 }
});
listen(document,'input',ev=>{
 if(ev.target.id==='searchBox')searchResults(ev.target.value);
 else if(['refUrl','refTitle'].includes(ev.target.name)){const row=ev.target.closest('.ref-row');if(row)refreshReferenceRow(row,true)}
});
listen(document,'change',ev=>{
 const input=ev.target, prop=input.dataset.change;
 if(prop==='client'||prop==='allSocialCycles'||prop==='socialPending'){
  if(prop==='client')state.client=input.value;
  else state[prop]=input.checked;
  render();
  main.querySelector('[data-change="'+prop+'"]')?.focus();
  return;
 }
 if(input.dataset.financeFilter){changeFinanceFilter(input);return}
 if(input.name==='clientId'){const fields=input.closest('form')?.querySelector('.new-client-fields');if(fields){fields.classList.toggle('hide',input.value!=='new');fields.querySelector('[name=newClient]').required=input.value==='new'} }
 if(input.matches('input[type=file]')) showImageControls(input);
 if(prop&&(input.value||['insightFrom','insightTo','insightFormat'].includes(prop))){
  if(prop==='insightFrom'&&state.insightTo&&input.value>state.insightTo)state.insightTo='';
  if(prop==='insightTo'&&state.insightFrom&&input.value&&input.value<state.insightFrom)state.insightFrom='';
  state[prop]=input.value;render();return;
 }
 if(input.dataset.trendFor){
  state.trendMetric=input.value;
  const pane=input.closest('[data-pane="metrics"]');pane.innerHTML=postInsights(get(input.dataset.trendBoard||'content',input.dataset.trendFor),input.dataset.trendBoard||'content');return;
 }
 if(input.name==='kind'&&input.closest('.format-select')){
  const details=input.closest('details');details.querySelector('#formatCurrent').textContent=input.value;details.open=false;details.querySelector('summary')?.focus();return;
 }
 if(['coverInput','refImages'].includes(input.name)){previewSelectedImages(input);return}
 if(input.name==='refThumb'){refreshReferenceRow(input.closest('.ref-row'),true);return}
 const form=input.closest('form[data-form^="money|"]');if(!form)return;
 if(input.name==='type'){
  const ledger=form.dataset.form.split('|')[2];
  form.elements.category.innerHTML=categoryOptions(ledger,input.value);
 }
 if(input.name==='category'||input.name==='type'){document.getElementById('salaryTip').classList.toggle('hide',form.elements.category.value!=='cat3');updateInlineCategory(form);}
 if(['frequency','mode','count'].includes(input.name))recurrenceFields(form,input.name!=='frequency');
});
let boardDrag=null,suppressBoardClick=0;
listen(main,'pointerdown',ev=>{
 const card=ev.target.closest('[data-card]');if(!card||ev.button!==0||ev.target.closest('a[href]'))return;
 const r=card.getBoundingClientRect();
 boardDrag={card,id:card.dataset.card,k:card.dataset.board,pointer:ev.pointerId,x:ev.clientX,y:ev.clientY,left:r.left,top:r.top,width:r.width,ghost:null,over:null};
});
listen(window,'pointermove',ev=>{
 const drag=boardDrag;if(!drag||ev.pointerId!==drag.pointer)return;
 const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;
 if(!drag.ghost){
  if(Math.abs(dx)+Math.abs(dy)<8)return;
  drag.ghost=drag.card.cloneNode(true);drag.ghost.classList.add('card-ghost');
  drag.ghost.removeAttribute('tabindex');drag.ghost.setAttribute('aria-hidden','true');
  Object.assign(drag.ghost.style,{width:drag.width+'px',left:drag.left+'px',top:drag.top+'px'});
  document.body.append(drag.ghost);drag.card.classList.add('card-moving');
  drag.card.setPointerCapture?.(ev.pointerId);
 }
 drag.ghost.style.transform='translate('+dx+'px,'+dy+'px) rotate(2deg)';
 const lane=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-lane]');
 const target=lane?.dataset.board===drag.k?lane:null;
 if(target!==drag.over){drag.over?.classList.remove('over');drag.over=target;target?.classList.add('over')}
 const container=main.querySelector('.board-wrap');
 const r=container?.getBoundingClientRect();
 if(r&&ev.clientY>=r.top&&ev.clientY<=r.bottom){if(ev.clientX>r.right-30&&ev.clientX<=r.right)container.scrollLeft+=17;if(ev.clientX<r.left+30&&ev.clientX>=r.left)container.scrollLeft-=17}
});
function endBoardDrag(ev){
 const drag=boardDrag;if(!drag||ev.pointerId!==drag.pointer)return;
 boardDrag=null;if(!drag.ghost)return;
 suppressBoardClick=Date.now()+350;
 drag.ghost.remove();drag.card.classList.remove('card-moving');drag.over?.classList.remove('over');
 if(ev.type==='pointercancel'||!drag.over)return;
 const row=get(drag.k,drag.id);
 if(!row||row.stage===drag.over.dataset.lane)return;
 const left=main.querySelector('.board-wrap')?.scrollLeft||0;
 row.stage=drag.over.dataset.lane;
 if((drag.k==='content'||editorialBoard(drag.k))&&row.stage==='Publicado'&&!row.publishedDate)row.publishedDate=today;
 const isClose=drag.k==='crm'&&row.stage==='Fechado';
 if(isClose){row.clientDetached=false;row.closedOn ||= today}
 if(drag.k==='crm')createProject(row);render();
 const wrap=main.querySelector('.board-wrap');if(wrap)wrap.scrollLeft=left;
 if(persist())toast(isClose?'Negócio fechado. Ficha e pasta do cliente prontas.':'Movido para '+row.stage+'.');
}
listen(window,'pointerup',endBoardDrag);listen(window,'pointercancel',endBoardDrag);
listen(document,'submit',async ev=>{
 const form=ev.target.closest('form[data-form]');if(!form)return;ev.preventDefault();
 const [type,a,b]=form.dataset.form.split('|');
 const fd=new FormData(form,ev.submitter);
 const operation=services.startOperation();
 if(!operation)return;
 const disable=[...form.querySelectorAll('button[type="submit"]')];disable.forEach(x=>x.disabled=true);
 try{
  await applyImageEdits(form,fd);
  if(type==='follow-up')saveFollowUp(a,fd);
  if(type==='service-config')saveService(a,fd);
  if(type==='nav-area')saveNavArea(a,fd);
  if(type==='nav-move'){modalClose(false);if(!moveNavModule(a,fd.get('navAreaChoice'),fd.get('before')))sidebar.querySelector('[data-nav-handle="'+a+'"]')?.focus()}
  if(type==='wall')await saveWall(a,fd);
  if(type==='goal'||type==='goal-item'||type==='goal-contribution')handleGoal(type,a,b,fd);
  if(type==='prefs'){prefs().reminders=fd.get('reminders')==='on';prefs().reminderDays=Number(fd.get('reminderDays'));finish('Preferências salvas.');checkReminders()}
  if(type==='card')await addOrEditCard(a,b,fd,form);
  if(type==='metrics')saveMetrics(a,fd,b||'content');
  if(type==='folder')saveFolder(a,fd);
  if(type==='client')await saveClient(a,fd);
  if(type==='profile')await saveProfile(fd);
  if(type==='task'||type==='event'){
   const key=type==='task'?'tasks':'events',existing=get(key,a),fields=Object.fromEntries(fd),name=clean(fields.name);
   if(!name)return;
   if(type==='task')Object.assign(fields,savedClientFields(fd));
   if(type==='event'&&fields.meeting&&!safeURL(fields.meeting)){toast('Informe um link válido para a reunião.');return}
   if(type==='event'&&fields.end&&fields.end<=fields.time){toast('O término precisa ser posterior ao início.');return}
   if(existing)Object.assign(existing,fields,{name});else db[key].push({id:uid(),...fields,name});
   if(type==='event')state.day=fields.day;
   go(type==='task'?'tasks':'agenda');if(persist())toast(type==='task'?'Tarefa salva.':'Compromisso salvo.');window.setTimeout(checkReminders,3700);
  }
  if(type==='cycle'){if(state.view!=='social')state.view='social';createCycle(fd)}
  if(type==='review'){
   const x=get('social',a);const status=fd.get('review');if(x&&status){x.stage=status;x.feedback=clean(fd.get('feedback'));x.reviewVersion=x.version||1;if(status==='Aprovado')x.done=[...new Set([...asList(x.done),3])];finish(status==='Aprovado'?'Versão aprovada.':'Ajustes solicitados.')}
  }
  if(type==='money')moneyUpdate(a,b,fd);
  if(type==='record-delete')executeRemoval(a,b,fd);
  if(type==='category'){
   const old=get('categories',a),name=clean(fd.get('name')),special=a==='cat3'||a==='cat6';
   const next={id:a||uid(),ledger:state.ledger,type:(special||db.finance.some(x=>x.category===a))&&old?old.type:fd.get('type'),name:special?old.name:name,color:cleanColor(fd.get('color')),icon:fd.get('icon')};
   if(!name)return;
   if(db.categories.some(c=>c.ledger===next.ledger&&c.type===next.type&&c.name.toLowerCase()===next.name.toLowerCase()&&c.id!==next.id)){toast('Já existe uma categoria com esse nome.');return}
   if(old)Object.assign(old,next);else db.categories.push(next);finish('Categoria salva.');
  }
  if(type==='doc'){
   const d=get('docs',a), name=clean(fd.get('name'));if(!name)return;
   const fields={name,client:clean(fd.get('client')),project:fd.get('project'),folder:fd.get('folder'),shared:fd.has('shared'),date:today,kind:d?.kind||'Documento'};
   if(fields.kind==='Documento')fields.text=fd.get('text');
   if(d)Object.assign(d,fields);else db.docs.push({id:uid(),...fields});finish('Documento salvo.');
  }
  if(type==='upload')await uploadFiles(fd);
  if(type==='new-map')saveNewMap(fd);
  if(type==='node')await updateNode(a,fd);
  if(type==='map-settings'){
   const m=activeMap(),name=clean(fd.get('name'));if(!name)return;
   Object.assign(m,{name,...savedClientFields(fd),project:fd.get('project')});finish('Mapa atualizado.');
  }
  if(type==='map-template'){
   const m=activeMap(),name=clean(fd.get('name'));if(!name)return;
   db.templates.push({name,nodes:clone(m.nodes),edges:clone(m.edges),branches:m.nodes.filter(n=>n.parent).map(n=>n.title)});finish('Modelo salvo.');
  }
  if(type==='connect'){
   const m=activeMap(),from=fd.get('from'),to=fd.get('to');
   if(from===to){toast('Selecione dois blocos diferentes.');return}
   if(nodeBy(m,to)?.parent===from||nodeBy(m,from)?.parent===to||m.edges.some(([a,b])=>from===a&&to===b||to===a&&from===b)){toast('Esses blocos já estão conectados.');return}
   m.edges.push([from,to]);finish('Conexão criada.');
  }
  if(type==='export')await exportView(fd.get('scope')==='Área inteira',fd.get('exportType'));
 }catch(error){console.error(error);toast('Não foi possível concluir esta ação.')}
 finally{disable.forEach(x=>x.disabled=false);operation();}
});
for(const k of Object.keys(db.serviceSettings))registerService(k);
if(!db.preferences.serviceNavMigrated){db.preferences.navAreas=navigationAreas();db.preferences.serviceNavMigrated=true}
initializeCategories();
syncSalary();
initializeFlowork();
const entryView=location.hash.slice(1);
if(nav.some(([k])=>k===entryView))state.view=entryView;
render();
const alertTimer=window.setInterval(checkReminders,60000);
listen(window,'focus',checkReminders);
services.signal.addEventListener('abort',()=>window.clearInterval(alertTimer),{once:true});
window.setTimeout(()=>{if(!services.signal.aborted)checkReminders()},1800);
const workspaceHandle={
  snapshot:()=>clone(db),
  archive:makeWorkspaceArchive,
  readBackup:readWorkspaceBackup,
  clear(){
    clearTimeout(toastTimer);
    document.querySelectorAll('.card-ghost').forEach(card=>card.remove());
    modalClose(false);
    for(const element of [assistantRoot,sidebar,topbar,main,document.getElementById('toast')].filter(Boolean))element.replaceChildren();
  }
};
