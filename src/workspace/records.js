const removalLabels={
 clients:'cliente', finance:'lançamento', docs:'arquivo ou documento', folders:'pasta',
 tasks:'tarefa', events:'compromisso', goals:'meta', maps:'mapa mental'
};
const removalDetails={
 crm:'Reuniões, projetos e cadastro do cliente são preservados. O histórico de follow-ups deste lead será excluído.',
 clients:'Projetos, lançamentos, documentos e pastas são preservados. Os vínculos com o cadastro do cliente serão removidos.',
 docs:'O item sairá de Documentos e poderá ser restaurado pela Lixeira.',
 folders:'Arquivos e subpastas serão movidos para a pasta acima.',
 goals:'Os itens e aportes desta meta também serão excluídos.',
 project:'Documentos, tarefas, pastas e lançamentos financeiros são preservados sem o vínculo com este projeto.'
};
function deleteButton(key,id){
 return id?button('Excluir','record-delete|'+key+'|'+id,{ic:'trash',cls:'btn danger'}):'';
}
function futureOccurrences(item){
 return item.series?db.finance.filter(x=>!x.mirror&&!x.sourceProject&&x.series===item.series&&x.sequence>item.sequence&&x.status==='Previsto'):[];
}
function confirmRemoval(key,id){
 const label=Object.hasOwn(removalLabels,key)?removalLabels[key]:Object.hasOwn(definitions,key)?definitions[key].noun:'';
 const row=label&&get(key,id);
 if(!row||row.mirror)return;
 let details=removalDetails[key]||(workBoards().includes(key)?removalDetails.project:'');
 let scope='';
 if(key==='finance'){
  const future=futureOccurrences(row);
  const linked=row.sourceProject&&findWork(row.sourceProject);
  details=linked?'O projeto será preservado. Altere o valor ou a data de recebimento no projeto para gerar outro lançamento.':'';
  if([row,...future].some(isSalary))details+=' Receitas de salário espelhadas serão removidas junto com os respectivos lançamentos de pró-labore.';
  if(future.length)scope='<label class="share-check"><input type="checkbox" name="future"> Excluir também as '+future.length+' próximas ocorrências previstas desta série</label>';
 }
 const title=key==='docs'?(row.kind==='Documento'?'Excluir documento':'Excluir arquivo'):'Excluir '+label;
 const action=key==='docs'?'Mover para a lixeira':'Confirmar exclusão';
 modal(title,'<p class="record-delete-name">'+esc(row.name)+'</p>'+
  (details?'<p>'+esc(details.trim())+'</p>':'')+scope+
  '<div class="dialog-actions">'+button('Cancelar','close',{cls:'btn ghost'})+
  '<button type="submit" class="btn danger">'+icon('trash')+esc(action)+'</button></div>',
  'record-delete|'+key+'|'+id);
}
function detachProject(id){
 for(const x of [...db.tasks,...db.docs,...asList(db.trashedDocs),...db.maps,...db.crm,...db.folders,...db.finance]){
  if(x.project===id)x.project='';
 }
 for(const x of db.finance)if(x.sourceProject===id){x.sourceProject='';x.projectType=''}
}
function detachClient(client){
 for(const lead of db.crm){
  const match=lead.clientId===client.id||(!lead.clientId&&normalizedName(lead.client||lead.name)===normalizedName(client.name));
  if(!match)continue;
  if(lead.stage==='Fechado')lead.clientDetached=true;
  lead.clientId='';
 }
 for(const x of workBoards().flatMap(k=>db[k])){
  const match=x.clientId===client.id||(!x.clientId&&normalizedName(x.client)===normalizedName(client.name));
  if(match){x.clientId='';x.clientDetached=true}
 }
 for(const x of [...db.tasks,...db.maps,...db.finance,...db.folders]){
  if(x.clientId===client.id)x.clientId='';
 }
 for(const event of db.events)if(event.party==='client:'+client.id)event.party='';
}
function moveFolderContents(folder){
 const parent=get('folders',folder.parent)?.id||'';
 const names=new Set(db.folders.filter(f=>(f.parent||'')===parent&&f.id!==folder.id).map(f=>normalizedName(f.name)));
 for(const child of db.folders.filter(f=>f.parent===folder.id&&f.id!==folder.id)){
  const base=child.name;
  let number=2;
  while(names.has(normalizedName(child.name)))child.name=base+' '+number++;
  names.add(normalizedName(child.name));
  child.parent=parent===child.id?'':parent;
 }
 for(const row of [...db.docs,...asList(db.trashedDocs),...workBoards().flatMap(k=>db[k])]){
  if(row.folder===folder.id)row.folder=parent;
 }
 for(const client of db.clients)if(client.folder===folder.id)client.folder='';
 if(state.folder===folder.id)state.folder=parent;
}
function executeRemoval(key,id,fd){
 if(!Object.hasOwn(removalLabels,key)&&!Object.hasOwn(definitions,key))return;
 const row=get(key,id);
 if(!row||row.mirror)return;
 const ids=new Set([id]);
 if(key==='crm'){
  db.followUps=db.followUps.filter(x=>x.lead!==id);
  for(const event of db.events)if(event.party==='lead:'+id)event.party='';
 }else if(key==='clients')detachClient(row);
 else if(key==='finance'){
  if(fd.has('future'))futureOccurrences(row).forEach(x=>ids.add(x.id));
  const project=row.sourceProject&&findWork(row.sourceProject);
  if(project)project.paymentRemoved=true;
 }else if(key==='docs'){
  (db.trashedDocs ||= []).push(row);
 }else if(key==='folders')moveFolderContents(row);
 else if(key==='maps'&&state.map===id)state.map='';
 else if(workBoards().includes(key))detachProject(id);

 db[key]=db[key].filter(x=>!ids.has(x.id));
 if(key==='finance'||workBoards().includes(key))syncSalary();
 finish(key==='docs'?'Item movido para a Lixeira.':'Exclusão concluída.');
}
function documentTrash(){
 const trashed=asList(db.trashedDocs);
 modal('Lixeira de documentos',trashed.map(d=>'<div class="attachment-row">'+icon('file')+
  '<span>'+esc(d.name)+'</span>'+button('Restaurar','doc-restore|'+d.id,{ic:'repeat'})+'</div>').join('')||
  empty('A lixeira está vazia.'));
}
function restoreDocument(id){
 const row=get('trashedDocs',id);
 if(!row||get('docs',id))return;
 row.folder=get('folders',row.folder)?.id||'';
 if(row.project&&!findWork(row.project))row.project='';
 db.docs.push(row);
 db.trashedDocs=db.trashedDocs.filter(x=>x.id!==id);
 finish('Item restaurado.');
 if(db.trashedDocs.length)documentTrash();
}
