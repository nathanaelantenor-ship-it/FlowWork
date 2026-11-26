const fileStore=services.file;
const download=(filename,blob)=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
const fileBytes=n=>n>1024*1024?(n/(1024*1024)).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB';
function renderDocs(){
 const here=get('folders',state.folder), children=db.folders.filter(f=>(f.parent||'')===state.folder), rows=activeDocRows();
 const trail='<nav class="folder-trail" aria-label="Local da pasta">'+button('Documentos','folder-open|',{cls:'btn ghost',ic:'folder'})+
 folderTrail(state.folder).map(f=>icon('chevron')+button(f.name,'folder-open|'+f.id,{cls:'btn ghost'})).join('')+'</nav>';
 const controls=exportsBtn()+button('Enviar arquivo','upload',{ic:'upload'})+button('Documento','new-doc',{ic:'file'})+newBtn('Nova pasta','folder-edit');
 const columns=['Nome','Cliente','Tipo','Atualizado'];
 return heading(here?here.name:'Documentos',here?'':'Pastas, arquivos e documentos de trabalho.',controls)+trail+
 (children.length?'<div class="folder-grid">'+children.map(folderCard).join('')+'</div>':'')+
 '<div class="doc-table paper"><div class="panel-head"><h2>Arquivos nesta pasta</h2>'+menu(['Todas','Documentos','Arquivos'],state.kindFilter,'doc-filter')+'</div>'+
 (rows.length?renderTable(columns,rows.map(d=>['<span class="inline">'+icon(d.kind==='Documento'?'file':'folder')+rowButton(d.name,'doc',d.id)+'</span>',esc(d.client||'—'),esc(d.kind)+(d.bytes?' · '+fileBytes(d.bytes):''),shortDate(d.date)])):empty('Adicione um documento ou envie um arquivo para este local.','empty-panel'))+'</div>';
}
function attachmentList(docs){
 return docs.map(d=>'<div class="attachment-row">'+icon(d.kind==='Documento'?'file':'folder')+'<span>'+esc(d.name)+'</span>'+button(d.kind==='Documento'?'Abrir':'Baixar',d.kind==='Documento'?'doc|'+d.id:'file-download|'+d.id,{ic:d.kind==='Documento'?'file':'download'})+'</div>').join('');
}
const sharingInput=(shared=false)=>'<label class="share-check wide"><input type="checkbox" name="shared" '+(shared?'checked':'')+'> Disponível na entrega e na visão do cliente</label>';
const projectChoices=()=>[['Sem vínculo',''],...workBoards().flatMap(k=>db[k].map(x=>[[x.client,x.name].filter(Boolean).join(' · '),x.id]))];
function docDialog(ident='',project='',client=''){
 const d=get('docs',ident)||{}, file=d.id&&d.kind!=='Documento';
 const currentFolder=defaultFolder(project,client);
 const currentClient=client||get('clients',get('folders',currentFolder)?.clientId)?.name||'';
 const folder=select('Pasta','folder',folderChoices(),d.folder??currentFolder);
 const controls=file?button('Baixar arquivo','file-download|'+ident,{ic:'download'}):d.id?button('Baixar PDF','doc-pdf|'+d.id,{ic:'download'}):'';
 modal(d.name||'Novo documento',(file&&/^image\/(png|jpeg|webp|gif|avif)$/.test(d.mime||'')?localImage(d.id,d.name,'approval-cover'):'')+
 '<div class="form-grid">'+field('Título','name',d.name,'text','required')+field('Cliente','client',d.client??currentClient)+
 select('Projeto ou peça','project',projectChoices(),d.project||project)+folder+(file?'':area('Conteúdo','text',d.text))+sharingInput(d.shared)+'</div>'+
 formEnd(file?'Salvar arquivo':'Salvar documento',controls),'doc|'+ident,true);
}
function uploadDialog(project='',client=''){
 const where=defaultFolder(project,client);
 const folder=get('folders',where),currentClient=client||get('clients',folder?.clientId)?.name||'';
 modal('Enviar arquivos','<div class="form-grid">'+field('Cliente','client',currentClient)+select('Projeto ou peça','project',projectChoices(),project||folder?.project)+
 select('Pasta','folder',folderChoices(),where)+'<label class="input-wrap wide">Arquivos<input type="file" class="field" name="upload" multiple required></label>'+sharingInput()+'</div>'+formEnd('Enviar'),'upload',true);
}
async function uploadFiles(fd){
 const client=clean(fd.get('client')),project=fd.get('project'), folder=fd.get('folder'), files=fd.getAll('upload').filter(x=>x.size||x.name);
 const items=[];
 try{
  for(const file of files){const id=uid();await fileStore('put',id,file);items.push({id,name:file.name,client,project,folder,shared:fd.has('shared'),kind:'Arquivo',date:today,bytes:file.size,mime:file.type})}
  db.docs.push(...items);finish(items.length===1?'Arquivo enviado.':items.length+' arquivos enviados.');
 }catch{toast('Não foi possível guardar o arquivo neste navegador.');}
}
async function fileDownload(id){
 const d=get('docs',id);if(!d)return;
 try{const file=await fileStore('get',id);if(file)download(d.name,file);else toast('O arquivo não está neste navegador.')}catch{toast('Falha ao abrir o arquivo.')}
}
const activeMap=()=>get('maps',state.map);
function renderMaps(){
 const map=activeMap();
 if(!map){
  return heading('Mapas Mentais','Crie, conecte e organize ideias por projeto.',exportsBtn()+newBtn('Novo mapa','new-map'))+
  '<h2 class="section-title" style="margin:8px 0 12px">Seus mapas</h2><div class="tile-grid">'+(db.maps.map(m=>'<button type="button" class="tile map-option" data-act="open-map|'+m.id+'"><span class="tile-icon">'+icon('map')+'</span><h3>'+esc(m.name)+'</h3><p>'+esc(m.client||'Sem cliente')+' · '+m.nodes.length+' blocos</p></button>').join('')||empty('Crie seu primeiro mapa.'))+'</div><h2 class="section-title" style="margin:25px 0 12px">Modelos</h2><div class="tile-grid">'+db.templates.map((t,i)=>'<button type="button" class="tile" data-act="new-map|'+i+'"><span class="tile-icon">'+icon('layers')+'</span><h3>'+esc(t.name)+'</h3><p>'+esc(t.branches.join(' · '))+'</p></button>').join('')+'</div>';
 }
 const z=state.mapZoom;
 return heading(map.name,(map.client?map.client+' · ':'')+map.nodes.length+' blocos conectáveis',button('Meus mapas','map-list',{ic:'list'})+exportsBtn())+
 '<div class="map-shell"><div class="map-toolbar">'+newBtn('Bloco','new-node')+button('Conectar','connect-map',{ic:'link'})+button('Editar mapa','map-settings',{ic:'pen'})+button('Duplicar','map-copy',{ic:'copy'})+button('Salvar modelo','map-template',{ic:'layers'})+
 '<span class="spacer"></span>'+ib('minus','Diminuir zoom','map-zoom|-0.1')+'<span class="small">'+Math.round(z*100)+'%</span>'+ib('plus','Aumentar zoom','map-zoom|0.1')+ib('position','Restaurar zoom','map-zoom|reset')+'</div>'+
 '<div class="map-viewport" id="mapViewport" tabindex="0" aria-label="Área de trabalho do mapa"><div class="map-size" style="width:'+Math.round(1040*z)+'px;height:'+Math.round(610*z)+'px"><div class="map-world" style="transform:scale('+z+')"><svg class="map-links" viewBox="0 0 1040 610"></svg>'+
 map.nodes.map(n=>'<button type="button" class="map-node'+(!n.parent?' root':'')+'" data-node="'+esc(n.id)+'" data-act="node|'+esc(n.id)+'" style="left:'+Number(n.x)+'px;top:'+Number(n.y)+'px;--node:'+cleanColor(n.color)+';border-radius:'+mapShape(n.shape)+'px"><span>'+esc(n.title)+'</span>'+(n.image?'<img alt="Referência visual" data-img="'+esc(n.image)+'" hidden>':'')+(n.text?'<small>'+esc(n.text)+'</small>':'')+'</button>').join('')+
 '</div></div></div></div><p class="small">Clique para editar · Arraste para mover · Shift + arraste move o ramo inteiro</p>';
}
async function fillMapImages(){
 for(const image of main.querySelectorAll('[data-img]')){
  try{const blob=await fileStore('get',image.dataset.img);if(blob&&image.isConnected){const src=URL.createObjectURL(blob);image.addEventListener('load',()=>URL.revokeObjectURL(src),{once:true});image.src=src;image.hidden=false}}
  catch{}
 }
}
const nodeBy=(map,id)=>map?.nodes.find(n=>n.id===id);
function drawMapLinks(){
 const map=activeMap(), target=main.querySelector('.map-links');if(!map||!target)return;
 const edges=map.nodes.filter(n=>n.parent).map(n=>[n.parent,n.id]).concat(asList(map.edges));
 target.innerHTML=edges.map(([parent,id])=>{const a=nodeBy(map,parent),b=nodeBy(map,id);if(!a||!b)return '';
  const forward=b.x>=a.x,x1=a.x+(forward?155:0),x2=b.x+(forward?0:155),y1=a.y+24,y2=b.y+24,offset=Math.max(35,Math.abs(x2-x1)*.43);
  return '<path d="M'+x1+' '+y1+' C'+(x1+(forward?offset:-offset))+' '+y1+' '+(x2+(forward?-offset:offset))+' '+y2+' '+x2+' '+y2+'" fill="none" stroke="'+cleanColor(b.color)+'" stroke-opacity=".62" stroke-width="1.4"/>';
 }).join('');
}
function mapSettings(){
 const m=activeMap();
 modal('Editar mapa mental','<div class="form-grid">'+field('Título','name',m.name,'text','required')+clientPicker(m)+select('Projeto','project',projectChoices(),m.project)+'</div>'+formEnd(),'map-settings');
}
function newMapDialog(template='',project=''){
 const selected=db.templates[Number(template)], p=findWork(project);
 modal('Novo mapa mental','<div class="form-grid">'+field('Título','name',template!==''?selected?.name:'','text','required')+clientPicker(p||{})+select('Projeto','project',projectChoices(),project)+select('Modelo','template',[['Em branco',''],...db.templates.map((t,i)=>[t.name,String(i)])],template)+'</div>'+formEnd('Criar mapa'),'new-map');
}
function saveNewMap(fd){
 const name=clean(fd.get('name'));if(!name)return;
 const template=fd.get('template')!==''?db.templates[Number(fd.get('template'))]:null;
 const branchColors=['#a0b9f4','#c2aef2','#e6a3b8','#b4c7ed','#b2c491'];
 const center={id:uid(),parent:'',title:name,text:'',color:'#edff45',shape:'round',x:395,y:214};
 const nodes=[center];
 if(template?.nodes?.length){nodes.splice(0,1,...clone(template.nodes));const root=nodes.find(n=>!n.parent);if(root)root.title=name}
 else if(template){const layout=[[114,95],[121,348],[690,72],[707,225],[690,375]];template.branches.forEach((x,i)=>{const coord=layout[i]||[100+((i%5)*173),460+Math.floor(i/5)*55];nodes.push({id:uid(),parent:center.id,title:x,text:'',color:branchColors[i%5],shape:'round',x:coord[0],y:coord[1]})})}
 const m={id:uid(),name,...savedClientFields(fd),project:fd.get('project'),template:template?.name||'',nodes,edges:clone(template?.edges||[])};
 db.maps.push(m);state.map=m.id;state.mapZoom=1;go('maps');if(persist())toast('Mapa criado.');
}
function nodeDialog(id=''){
 const m=activeMap(),n=nodeBy(m,id)||{};
 const reachable=new Set(descendants(m,id).map(x=>x.id));
 const imagelist=db.docs.filter(x=>x.mime?.startsWith('image/')).map(x=>[x.name,x.id]);
 if(n.image&&!imagelist.some(x=>x[1]===n.image))imagelist.push(['Imagem atual',n.image]);
 const choices=[['Nenhum (bloco independente)',''],...m.nodes.filter(x=>x.id!==id&&!reachable.has(x.id)).map(x=>[x.title,x.id])];
 modal(n.title||'Novo bloco','<div class="form-grid">'+field('Título','title',n.title,'text','required')+field('Cor','color',n.color||'#a0b9f4','color')+area('Texto','text',n.text)+
 select('Forma','shape',[['Arredondada','round'],['Retangular','square'],['Pílula','pill']],n.shape||'round')+select('Conectar ao bloco','parent',choices,n.parent??m.nodes[0]?.id??'')+
 select('Imagem do acervo','image',[['Sem imagem',''],...imagelist],n.image||'')+imageInput('Nova imagem','imageUpload')+'</div>'+
 formEnd('Salvar bloco',id&&n.parent?button('Excluir','delete-node|'+id,{ic:'trash',cls:'btn danger'}):''),'node|'+id);
}
function descendants(map,id){
 if(!id)return [];
 const children=[], visited=new Set([id]);
 function scan(parent){for(const n of map.nodes){if(n.parent===parent&&!visited.has(n.id)){visited.add(n.id);children.push(n);scan(n.id)}}}
 scan(id);return children;
}
async function updateNode(id,fd){
 const m=activeMap(),old=nodeBy(m,id);let image=fd.get('image')||'';
 const title=clean(fd.get('title')),file=fd.get('imageUpload');
 if(!title)return;
 if(file?.size){if(!file.type.startsWith('image/')){toast('Escolha um arquivo de imagem.');return}try{image=await storeImage(file)}catch{toast('Não foi possível guardar a imagem.');return}}
 const parent=fd.get('parent'),p=nodeBy(m,parent),x={id:id||uid(),title,text:clean(fd.get('text')),color:cleanColor(fd.get('color')),shape:fd.get('shape'),parent,image,x:old?.x??Math.min(860,(p?.x??250)+177),y:old?.y??Math.min(505,(p?.y??180)+70)};
 if(old)Object.assign(old,x);else m.nodes.push(x);finish('Bloco salvo.');
}
function restoreMapScroll(left,top){const v=document.getElementById('mapViewport');if(v){v.scrollLeft=left;v.scrollTop=top}}
function connectDialog(){
 const m=activeMap();if(m.nodes.length<2){toast('Adicione pelo menos dois blocos.');return}
 const nodes=m.nodes.map(n=>[n.title,n.id]);
 modal('Conectar dois blocos','<div class="form-grid">'+select('De','from',nodes,nodes[0][1])+select('Para','to',nodes,nodes[1][1])+'</div>'+formEnd('Conectar'),'connect');
}
let mapDrag=null,suppressMapClick=0;
listen(main,'pointerdown',ev=>{
 const dom=ev.target.closest('[data-node]');if(!dom||ev.button!==0)return;
 const m=activeMap(),n=nodeBy(m,dom.dataset.node);if(!n)return;
 const nodes=[n].concat(ev.shiftKey?descendants(m,n.id):[]);
 mapDrag={elements:nodes.map(x=>({n:x,dom:main.querySelector('[data-node="'+esc(x.id)+'"]'),x:x.x,y:x.y})),pointer:ev.pointerId,sx:ev.clientX,sy:ev.clientY,started:false};
});
listen(window,'pointermove',ev=>{
 if(!mapDrag||ev.pointerId!==mapDrag.pointer)return;
 let dx=(ev.clientX-mapDrag.sx)/state.mapZoom,dy=(ev.clientY-mapDrag.sy)/state.mapZoom;
 if(!mapDrag.started&&Math.abs(dx)+Math.abs(dy)<5)return;
 mapDrag.started=true;
 const starts=mapDrag.elements;dx=Math.max(-Math.min(...starts.map(e=>e.x)),Math.min(885-Math.max(...starts.map(e=>e.x)),dx));dy=Math.max(-Math.min(...starts.map(e=>e.y)),Math.min(550-Math.max(...starts.map(e=>e.y)),dy));
 for(const e of starts){e.n.x=Math.round(e.x+dx);e.n.y=Math.round(e.y+dy);e.dom.style.left=e.n.x+'px';e.dom.style.top=e.n.y+'px'}
 drawMapLinks();
});
function endMapDrag(ev){if(!mapDrag||ev.pointerId!==mapDrag.pointer)return;if(mapDrag.started){suppressMapClick=Date.now()+250;persist()}mapDrag=null}
listen(window,'pointerup',endMapDrag);listen(window,'pointercancel',endMapDrag);
