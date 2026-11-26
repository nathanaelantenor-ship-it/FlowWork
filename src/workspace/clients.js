const clientColors=['#b0bde4','#dcac93','#b2bd91','#c9aedb','#e0cc83','#a1b9c2'];
const normalizedName=name=>clean(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
const findClient=name=>db.clients.find(c=>normalizedName(c.name)===normalizedName(name));
const statusOptions=['Em onboarding','Ativo','Pausado','Concluído'];
const clientProjects=c=>['idv','social'].flatMap(k=>db[k].filter(x=>x.clientId===c.id||(!x.clientId&&normalizedName(x.client)===normalizedName(c.name))).map(x=>[k,x]));
const profileName=()=>db.profile?.name||'Nathan Cardoso';
const profileMeta=()=>db.profile?.role||'Workspace pessoal';
const avatar=(item,cls='avatar')=>'<span class="'+cls+'" style="--avatar-tint:'+cleanColor(item.color,'#dce3ed')+'">'+esc(idFor(item.name)||'FW')+localImage(item.photo,'')+'</span>';
function ensureClientFolder(client){
 let f=get('folders',client.folder)||db.folders.find(x=>x.clientId===client.id&&!x.parent)||db.folders.find(x=>!x.clientId&&!x.parent&&normalizedName(x.name)===normalizedName(client.name));
 if(!f){f={id:uid(),parent:'',name:client.name,clientId:client.id,color:client.color,date:today};db.folders.push(f)}
 else if(!f.clientId)f.clientId=client.id;
 client.folder=f.id;
 return f;
}
function ensureClientOnClose(lead){
 if(lead.stage!=='Fechado')return null;
 const name=clean(lead.client||lead.name);
 if(!name)return null;
 let c=get('clients',lead.clientId)||findClient(name);
 if(!c){
  c={id:uid(),name,person:lead.name,contact:lead.contact||'',channel:lead.kind||'',state:lead.project?'Ativo':'Em onboarding',note:'',color:clientColors[db.clients.length%clientColors.length],date:lead.closedOn||lead.date||today};
  db.clients.push(c);
 }
 const folder=ensureClientFolder(c);
 lead.clientId=c.id;
 lead.closedOn=lead.closedOn||lead.date||today;
 if(lead.project){
  const p=get('idv',lead.project)||get('social',lead.project);
  if(p){p.clientId=c.id;p.folder=p.folder||folder.id}
 }
 return c;
}
function initializeFlowork(){
 if(!Array.isArray(db.clients))db.clients=[];
 if(!Array.isArray(db.folders))db.folders=[];
 if(!db.profile)db.profile={name:'Nathan Cardoso',role:'Workspace pessoal'};
 for(const lead of db.crm)ensureClientOnClose(lead);
 for(const d of db.docs){
  if(d.folder===undefined)d.folder=findClient(d.client)?.folder||'';
 }
}
function renderClients(){
 const active=db.clients.filter(c=>c.state==='Ativo').length;
 const onboard=db.clients.filter(c=>c.state==='Em onboarding').length;
 const rows=db.clients.filter(c=>state.clientStatus==='Todos'||c.state===state.clientStatus);
 const cards=rows.map(c=>{
  const projects=clientProjects(c);
  const types=[...new Set(projects.map(([k])=>navName(k)).concat(db.crm.filter(l=>l.clientId===c.id&&l.stage==='Fechado').map(x=>x.service||'Identidade Visual')))];
  return '<article class="client-card" style="--client-tone:'+cleanColor(c.color)+'">'+
   '<button type="button" class="client-identity" data-act="client-detail|'+esc(c.id)+'">'+avatar(c,'avatar client-avatar')+'<span><strong>'+esc(c.name)+'</strong><small>'+esc(c.person||'Contato a definir')+'</small></span>'+icon('chevron')+'</button>'+
   '<div class="client-services">'+(types.length?types.map(x=>'<span>'+esc(x)+'</span>').join(''):'<span>Serviço a definir</span>')+'</div>'+
   '<div class="client-card-foot">'+statusTag(c.state)+button('Pasta','folder-open|'+c.folder,{ic:'folder',cls:'btn ghost'})+'</div></article>';
 }).join('');
 return heading('Clientes','Contatos, serviços e arquivos do cliente.',exportsBtn()+newBtn('Cliente','client-edit'))+
 '<div class="client-overview">'+[['Clientes cadastrados',db.clients.length,'brief'],['Em atendimento',active,'check'],['Em onboarding',onboard,'flag']].map(([label,n,ic])=>'<div>'+icon(ic)+'<span>'+label+'</span><b>'+n+'</b></div>').join('')+'</div>'+
 '<div class="filterbar">'+menu(['Todos',...statusOptions],state.clientStatus,'client-status')+'</div>'+
 '<div class="client-grid">'+(cards||empty('Nenhum cliente neste recorte.'))+'</div>';
}
function clientDetail(id){
 const c=get('clients',id);if(!c)return;
 const projects=clientProjects(c),leads=db.crm.filter(l=>l.clientId===c.id);
 modal(c.name,'<div class="client-dialog-top">'+avatar(c,'avatar client-avatar')+'<div>'+statusTag(c.state)+'<h3>'+esc(c.person||'Contato a definir')+'</h3><p class="small">'+esc([c.channel,c.contact].filter(Boolean).join(' · ')||'Contato pendente')+'</p></div>'+ib('pen','Editar cliente','client-edit|'+c.id)+'</div>'+
 (c.note?'<p class="editor-text">'+esc(c.note)+'</p>':'')+
 '<div class="resource-head"><h3>Documentos</h3>'+button('Abrir pasta','folder-open|'+c.folder,{ic:'folder'})+'</div>'+
 '<h3>Projetos e peças</h3><div class="search-list">'+(projects.length?projects.map(([k,x])=>'<button type="button" data-act="open|'+k+'|'+x.id+'">'+esc(x.name)+'<small>'+esc(navName(k)+' · '+x.stage)+'</small></button>').join(''):empty('O projeto aparece após registrar contrato e entrada no Comercial.'))+'</div>'+
 (leads.length?'<h3>Negócios no Comercial</h3><div class="search-list">'+leads.map(x=>'<button type="button" data-act="open|crm|'+esc(x.id)+'">'+esc(x.name)+'<small>'+esc(x.stage)+' · '+brl(x.amount)+'</small></button>').join('')+'</div>':'')+
 formEndNoSubmit(),'',true);
}
function clientDialog(id=''){
 const c=get('clients',id)||{};
 modal(c.id?'Editar cliente':'Novo cliente','<div class="form-grid">'+
 '<div class="client-dialog-top wide">'+avatar(c,'avatar client-avatar')+imageInput('Foto ou logo','photo')+(c.photo?'<label class="share-check"><input type="checkbox" name="removePhoto"> Remover foto</label>':'')+'</div>'+
 field('Empresa ou cliente','name',c.name,'text','required')+field('Pessoa de contato','person',c.person)+
 field('Contato','contact',c.contact)+select('Canal','channel',['WhatsApp','Instagram','Threads','LinkedIn','E-mail','Outro'],c.channel)+
 select('Status','state',statusOptions,c.state||'Em onboarding')+field('Cor do card','color',c.color||clientColors[db.clients.length%clientColors.length],'color')+
 area('Observações','note',c.note)+'</div>'+formEnd('Salvar cliente'),'client|'+id,true);
}
async function saveClient(id,fd){
 const old=get('clients',id),name=clean(fd.get('name'));
 if(!name)return;
 const duplicate=findClient(name);if(duplicate&&duplicate.id!==id){toast('Já existe um cliente com esse nome.');return}
 const c={...old,id:id||uid(),name,person:clean(fd.get('person')),contact:clean(fd.get('contact')),channel:fd.get('channel'),state:fd.get('state'),color:cleanColor(fd.get('color')),note:clean(fd.get('note')),date:old?.date||today};
 try{const photo=await storeImage(fd.get('photo'));c.photo=photo||(!fd.has('removePhoto')?old?.photo:'')}catch(error){toast(error.message);return}
 const f=ensureClientFolder(c);if(!old||normalizedName(f.name)===normalizedName(old.name))f.name=name;
 f.color=c.color;
 if(old)Object.assign(old,c);else db.clients.push(c);
 finish('Cliente salvo.');clientDetail(c.id);
}
function profileDialog(){
 const p=db.profile;
 modal('Personalizar perfil','<div class="form-grid"><div class="client-dialog-top wide">'+avatar(p,'avatar client-avatar')+imageInput('Foto de perfil','photo')+(p.photo?'<label class="share-check"><input type="checkbox" name="removePhoto"> Remover foto</label>':'')+'</div>'+
 field('Nome de exibição','name',p.name,'text','required')+field('Descrição','role',p.role)+'</div>'+formEnd('Salvar perfil'),'profile');
}
async function saveProfile(fd){
 const name=clean(fd.get('name'));if(!name)return;
 try{
  const photo=await storeImage(fd.get('photo'));
  db.profile={name,role:clean(fd.get('role')),photo:photo||(!fd.has('removePhoto')?db.profile.photo:'')};
  finish('Perfil atualizado.');
 }catch(error){toast(error.message)}
}

function folderTrail(id){
 const trail=[], seen=new Set();
 for(let f=get('folders',id);f&&!seen.has(f.id);f=get('folders',f.parent)){
  trail.unshift(f);seen.add(f.id);
 }
 return trail;
}
const folderPath=id=>folderTrail(id).map(f=>f.name).join(' / ');
const folderClients=()=>[['Sem cliente',''],...db.clients.map(c=>[c.name,c.id])];
const folderChoices=(exclude='')=>[['Raiz de Documentos',''],...db.folders.filter(f=>!exclude||!folderTrail(f.id).some(x=>x.id===exclude)).map(f=>[folderPath(f.id),f.id])];
const folderColor=f=>cleanColor(f.color,'#acbeda');
const folderGlyph=f=>'<span class="folder-glyph" style="--folder-color:'+folderColor(f)+'" aria-hidden="true"><i></i><i></i><i></i></span>';
function folderDialog(id=''){
 const f=get('folders',id)||{};
 const client=f.clientId||get('folders',state.folder)?.clientId||'';
 modal(f.id?'Editar pasta':'Nova pasta','<div class="form-grid">'+
 field('Nome da pasta','name',f.name,'text','required')+field('Cor da pasta','color',f.color||'#adbedb','color')+
 select('Local','parent',folderChoices(id),f.parent??state.folder)+select('Cliente','clientId',folderClients(),client)+select('Projeto ou peça','project',projectChoices(),f.project||'')+
 '</div>'+formEnd('Salvar pasta'),'folder|'+id);
}
function saveFolder(id,fd){
 const current=get('folders',id),name=clean(fd.get('name')),parent=fd.get('parent');
 if(!name)return;
 if(parent&&(!get('folders',parent)||folderTrail(parent).some(x=>x.id===id))){toast('Escolha uma pasta de destino válida.');return}
 if(db.folders.some(x=>x.id!==id&&(x.parent||'')===parent&&normalizedName(x.name)===normalizedName(name))){toast('Já existe uma pasta com esse nome neste local.');return}
 const f={id:id||uid(),name,parent,clientId:fd.get('clientId'),project:fd.get('project'),color:cleanColor(fd.get('color')),date:today};
 if(current)Object.assign(current,f);else db.folders.push(f);
 finish('Pasta salva.');
}
function defaultFolder(project,client){
 const record=get('idv',project)||get('social',project);
 return record?.folder||findClient(client||record?.client)?.folder||state.folder||'';
}
function activeDocRows(all=false){
 return db.docs.filter(d=>all||((d.folder||'')===state.folder&&(state.kindFilter==='Todas'||(state.kindFilter==='Documentos'?d.kind==='Documento':d.kind!=='Documento'))));
}
function folderCard(f){
 const documents=db.docs.filter(d=>d.folder===f.id).length,folders=db.folders.filter(d=>d.parent===f.id).length;
 const stats=[documents+' '+(documents===1?'arquivo':'arquivos')];
 if(folders)stats.push(folders+' '+(folders===1?'subpasta':'subpastas'));
 return '<article class="folder-card"><button class="folder-open" type="button" data-act="folder-open|'+esc(f.id)+'">'+folderGlyph(f)+'<strong>'+esc(f.name)+'</strong><small>'+stats.join(' · ')+'</small></button>'+
 ib('more','Editar pasta '+f.name,'folder-edit|'+f.id)+'</article>';
}
