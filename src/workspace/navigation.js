const defaultNavAreas=[
 {id:'start',name:'Início',caption:false,modules:['home']},
 {id:'work',name:'Operação',caption:true,modules:['crm','clients','projects']},
 {id:'services',name:'Serviços',caption:true,modules:['idv','social','services']},
 {id:'content',name:'Conteúdo',caption:true,modules:['content']},
 {id:'organization',name:'Organização',caption:true,modules:['tasks','agenda','goals','study','files','maps','finance']},
 {id:'preferences',name:'Preferências',caption:false,modules:['settings']}
];

function navigationAreas(){
 const stored=db.preferences.navAreas;
 const defaults=clone(defaultNavAreas);
 defaults.find(x=>x.id==='services').modules.splice(2,0,...workBoards().slice(2));
 if(!Array.isArray(stored))return defaults;
 const assigned=new Set(), areaIds=new Set(), result=[];
 const valid=new Set(nav.map(([id])=>id));
 for(const area of stored){
  if(!area||typeof area.id!=='string'||areaIds.has(area.id)||!clean(area.name))continue;
  areaIds.add(area.id);
  const modules=asList(area.modules).filter(id=>{
   if(!db.preferences.serviceNavMigrated&&['idv','social'].includes(id))return false;
   if(!valid.has(id)||assigned.has(id))return false;
   assigned.add(id);
   return true;
  });
  result.push({id:area.id,name:clean(area.name),caption:area.caption!==false,modules});
 }
 for(const area of defaults){
  const missing=area.modules.filter(id=>!assigned.has(id));
  if(!missing.length)continue;
  const existing=result.find(x=>x.id===area.id);
  if(existing)existing.modules.push(...missing);
  else if(area.id==='services'){const index=result.findIndex(x=>x.modules.includes('content'));result.splice(index<0?result.length:index,0,{...area,modules:missing});}
  else result.push({...area,modules:missing});
 }
 return result;
}

let navEditing=false;
let navDrag=null;
let suppressNavMoveClick=0;
const navHandle='<span class="nav-grip" aria-hidden="true"></span>';

function renderSidebar(){
 const top=sidebar.scrollTop, listTop=sidebar.querySelector('nav')?.scrollTop||0;
 const sections=navigationAreas().map(area=>{
  if(!navEditing&&!area.modules.length&&!area.caption)return '';
  const name=area.caption||navEditing?'<span class="nav-caption">'+esc(area.name)+'</span>':'';
  const rename=navEditing?ib('pen','Editar área '+area.name,'nav-area|'+area.id):'';
  const modules=area.modules.map(id=>{
   const [,ic,label]=nav.find(x=>x[0]===id);
   const active=state.view===id;
   const open='<button type="button" class="nav-btn'+(active?' active':'')+'" data-act="go|'+esc(id)+'" '+(active?'aria-current="page"':'')+'><span class="nav-icon">'+icon(ic)+'</span>'+esc(label)+'</button>';
   if(!navEditing)return open;
   return '<div class="nav-sort-row" data-nav-module="'+esc(id)+'"><span class="nav-sort-name">'+icon(ic)+esc(label)+'</span><button type="button" class="nav-move-handle" data-nav-handle="'+esc(id)+'" aria-label="'+esc('Mover '+label)+'" title="'+esc('Arraste ou clique para mover '+label)+'">'+navHandle+'</button></div>';
  }).join('');
  return '<section class="nav-group" data-nav-group="'+esc(area.id)+'" aria-label="'+esc(area.name)+'">'+
   (name?'<div class="nav-area-title">'+name+rename+'</div>':'')+modules+
   (navEditing&&!modules?'<p class="nav-drop-empty">Solte um módulo aqui</p>':'')+'</section>';
 }).join('');
 const controls=navEditing
  ? '<div class="nav-customize-bar"><p>Arraste pela alça ou clique nela para mover.</p><div>'+button('Nova área','nav-area',{ic:'plus'})+button('Concluir','nav-customize',{ic:'check',cls:'btn primary'})+'</div></div>'
  : '<div class="nav-customize-bar">'+button('Personalizar menu','nav-customize',{ic:'position',cls:'btn ghost'})+'</div>';
 sidebar.classList.toggle('nav-is-editing',navEditing);
 sidebar.innerHTML='<button type="button" class="brand" data-act="go|home"><span class="brand-mark">'+icon('logo')+'</span><span><b>Flowork</b></span></button>'+(navEditing?controls:'')+
 '<nav aria-label="Módulos">'+sections+'</nav>'+(!navEditing?controls:'')+'<button type="button" class="profile" data-act="go|settings" title="Configurações">'+avatar({...db.profile,name:profileName()})+'<span><b>'+esc(profileName())+'</b><small>'+esc(profileMeta())+'</small></span>'+icon('more')+'</button>';
 sidebar.scrollTop=top;
 if(navEditing)sidebar.querySelector('nav').scrollTop=listTop;
 hydrateImages(sidebar);
}

function toggleNavEditing(){
 navEditing=!navEditing;
 if(navEditing){
  state.mobile=true;
  sidebar.classList.add('mobile-open');
  sidebar.scrollTop=0;
 }
 renderSidebar();
 sidebar.querySelector('[data-act="'+(navEditing?'nav-area':'nav-customize')+'"]')?.focus({preventScroll:true});
}
function areaDialog(id=''){
 const areas=navigationAreas(), current=areas.find(x=>x.id===id);
 const positions=areas.filter(x=>x.id!==id).map(x=>['Antes de '+x.name,x.id]);
 const next=areas[areas.indexOf(current)+1];
 const pos=current?next?.id||'':'';
 modal(current?'Editar área':'Nova área','<div class="form-grid">'+field('Nome da área','name',current?.name,'text','required maxlength="40"')+
  select('Posição da área','before',[...positions,['No final do menu','']],pos)+'</div>'+formEnd(current?'Salvar área':'Criar área'),'nav-area|'+id);
}
function saveNavArea(id,fd){
 const name=clean(fd.get('name')), areas=navigationAreas();
 if(!name||name.length>40)return;
 if(areas.some(x=>x.id!==id&&normalizedName(x.name)===normalizedName(name))){toast('Já existe uma área com esse nome.');return}
 const index=areas.findIndex(x=>x.id===id);
 const area=index>=0?areas.splice(index,1)[0]:{id:uid(),caption:true,modules:[]};
 const before=areas.findIndex(x=>x.id===fd.get('before'));
 area.name=name;area.caption=true;
 areas.splice(before<0?areas.length:before,0,area);
 db.preferences.navAreas=areas;
 modalClose(false);
 renderSidebar();
 persist();
 sidebar.querySelectorAll('[data-nav-group]').forEach(node=>{
  if(node.dataset.navGroup===area.id){
   node.querySelector('button')?.focus({preventScroll:true});
   node.scrollIntoView?.({block:'nearest'});
  }
 });
 toast(index>=0?'Área atualizada.':'Área criada. Arraste um módulo para ela.');
}
function moveNavModule(id,areaId,before=''){
 const areas=navigationAreas();
 const from=areas.find(x=>x.modules.includes(id)),to=areas.find(x=>x.id===areaId);
 if(!from||!to||before===id)return false;
 const previous=JSON.stringify(areas);
 from.modules.splice(from.modules.indexOf(id),1);
 const beforeIndex=to.modules.indexOf(before);
 to.modules.splice(beforeIndex<0?to.modules.length:beforeIndex,0,id);
 if(JSON.stringify(areas)===previous)return false;
 db.preferences.navAreas=areas;
 renderSidebar();
 persist();
 sidebar.querySelectorAll('[data-nav-handle]').forEach(handle=>{
  if(handle.dataset.navHandle===id)handle.focus({preventScroll:true});
 });
 toast(navName(id)+' movido para '+to.name+'.');
 return true;
}
const navPositions=(area,id)=>area.modules.filter(x=>x!==id).map(x=>['Antes de '+navName(x),x]).concat([['No final da área','']]);
function navMoveDialog(id){
 const areas=navigationAreas(), from=areas.find(x=>x.modules.includes(id));
 if(!from)return;
 const before=from.modules[from.modules.indexOf(id)+1]||'';
 modal('Mover '+navName(id),'<div class="form-grid">'+select('Área de destino','navAreaChoice',areas.map(x=>[x.name,x.id]),from.id)+
  select('Posição do módulo','before',navPositions(from,id),before)+'</div>'+formEnd('Mover'),'nav-move|'+id);
}
listen(overlay,'change',event=>{
 const choice=event.target;
 if(choice.name!=='navAreaChoice')return;
 const form=choice.closest('form'),id=form.dataset.form.split('|')[1];
 const area=navigationAreas().find(x=>x.id===choice.value);
 if(area)form.elements.before.innerHTML=navPositions(area,id).map(([label,value])=>option(label,value,'')).join('');
});

listen(sidebar,'pointerdown',event=>{
 const handle=event.target.closest('[data-nav-handle]');
 if(!navEditing||!handle||event.button!==0||navDrag)return;
 navDrag={id:handle.dataset.navHandle,pointer:event.pointerId,handle,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY};
});
function navDropTarget(drag){
 drag.mark?.classList.remove('nav-drop-before','nav-drop-after','nav-drop-group');
 drag.mark=null;drag.area='';drag.before='';
 const hit=document.elementFromPoint(drag.x,drag.y);
 const group=hit?.closest('[data-nav-group]');
 if(!group)return;
 const row=hit.closest('[data-nav-module]');
 drag.area=group.dataset.navGroup;
 drag.mark=row||group;
 if(!row){group.classList.add('nav-drop-group');return}
 const rect=row.getBoundingClientRect();
 const before=drag.y<rect.top+rect.height/2;
 const sibling=row.nextElementSibling;
 drag.before=before?row.dataset.navModule:sibling?.dataset.navModule||'';
 row.classList.add(before?'nav-drop-before':'nav-drop-after');
}
function scrollNavDuringDrag(){
 const drag=navDrag;
 if(!drag?.ghost)return;
 const list=sidebar.querySelector('nav');
 const rect=list.getBoundingClientRect();
 if(drag.x>=rect.left&&drag.x<=rect.right&&drag.y>=rect.top&&drag.y<=rect.bottom){
  const edge=43;
  const delta=drag.y<rect.top+edge?-13:drag.y>rect.bottom-edge?13:0;
  if(delta){list.scrollTop+=delta;navDropTarget(drag)}
 }
 drag.frame=requestAnimationFrame(scrollNavDuringDrag);
}
listen(window,'pointermove',event=>{
 const drag=navDrag;
 if(!drag||event.pointerId!==drag.pointer)return;
 drag.x=event.clientX;drag.y=event.clientY;
 if(!drag.ghost){
  if(Math.hypot(drag.x-drag.startX,drag.y-drag.startY)<6)return;
  drag.ghost=document.createElement('span');
  drag.ghost.className='nav-drag-preview';
  drag.ghost.textContent=navName(drag.id);
  document.body.append(drag.ghost);
  drag.handle.closest('.nav-sort-row').classList.add('nav-drag-origin');
  drag.handle.setPointerCapture?.(event.pointerId);
  scrollNavDuringDrag();
 }
 drag.ghost.style.transform='translate('+(drag.x+12)+'px,'+(drag.y+9)+'px)';
 navDropTarget(drag);
});
function finishNavDrag(event){
 const drag=navDrag;
 if(!drag||event&&event.pointerId!==drag.pointer)return;
 navDrag=null;
 if(!drag.ghost)return;
 cancelAnimationFrame(drag.frame);
 drag.ghost.remove();
 drag.mark?.classList.remove('nav-drop-before','nav-drop-after','nav-drop-group');
 drag.handle.closest('.nav-sort-row')?.classList.remove('nav-drag-origin');
 suppressNavMoveClick=Date.now()+350;
 if(event?.type==='pointerup'&&drag.area)moveNavModule(drag.id,drag.area,drag.before);
}
listen(window,'pointerup',finishNavDrag);
listen(window,'pointercancel',finishNavDrag);
listen(window,'blur',()=>finishNavDrag());
listen(sidebar,'click',event=>{
 const handle=event.target.closest('[data-nav-handle]');
 if(handle&&Date.now()>=suppressNavMoveClick)navMoveDialog(handle.dataset.navHandle);
});
services.signal.addEventListener('abort',()=>finishNavDrag(),{once:true});
