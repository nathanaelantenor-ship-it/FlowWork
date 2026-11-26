const contentFormats=[['Reels','play'],['Carrossel','layers'],['Post estático','image'],['Story','mobile']];
function formatName(value){
 if(/^reel/i.test(value||''))return 'Reels';
 if(/^carrossel/i.test(value||''))return 'Carrossel';
 if(/^(estático|post de frase|post estático)/i.test(value||''))return 'Post estático';
 if(/^stor/i.test(value||''))return 'Story';
 return value||'';
}
function formatPicker(value){
 const current=formatName(value);const choices=contentFormats.slice();
 if(current&&!choices.some(([name])=>name===current))choices.unshift([current,'file']);
 return '<div class="input-wrap format-wrap"><span id="formatLabel">Formato</span><details class="format-select"><summary class="field" aria-labelledby="formatLabel formatCurrent"><span id="formatCurrent">'+esc(current||'Selecione um formato')+'</span>'+icon('down')+'</summary><div class="format-scroll" role="group" aria-label="Formatos disponíveis">'+choices.map(([name,ic])=>'<label>'+icon(ic)+'<span>'+esc(name)+'</span><input type="radio" name="kind" value="'+esc(name)+'" '+(name===current?'checked':'')+'></label>').join('')+'</div></details></div>';
}
const imageInput=(label,name,multiple=false)=>'<label class="input-wrap">'+esc(label)+'<input class="field" name="'+name+'" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif"'+(multiple?' multiple':'')+'></label>';
const localImage=(id,alt='',cls='')=>id?'<img class="'+esc(cls)+'" alt="'+esc(alt)+'" data-local-img="'+esc(id)+'" draggable="false" hidden>':'';
async function hydrateImages(root){
 for(const img of root.querySelectorAll('img[data-local-img]')){
  const id=img.dataset.localImg;
  if(img.dataset.loaded===id)continue;
  img.dataset.loaded=id;
  try{
   const file=await fileStore('get',id);if(!file||!img.isConnected||img.dataset.localImg!==id)continue;
   const src=URL.createObjectURL(file);
   img.addEventListener('load',()=>URL.revokeObjectURL(src),{once:true});
   img.addEventListener('error',()=>URL.revokeObjectURL(src),{once:true});
   img.src=src;img.hidden=false;img.classList.add('loaded');
  }catch{}
 }
}
async function storeImage(file){
 if(!file?.size)return '';
 if(!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(file.type))throw Error('Escolha uma imagem PNG, JPG, WebP, GIF ou AVIF.');
 if(file.size>20*1024*1024)throw Error('Use imagens de até 20 MB.');
 const id=uid();await fileStore('put',id,file);return id;
}
const safeURL=value=>{
 try{const url=new URL(clean(value));return /^(https?):$/.test(url.protocol)&&!url.username&&!url.password?url:null}catch{return null}
};
function referenceInfo(value){
 const url=safeURL(value);if(!url)return null;
 const domain=url.hostname.toLowerCase().replace(/^www\./,'');
 const parts=url.pathname.split('/').filter(Boolean);
 if(domain==='instagram.com'&&['p','reel','tv'].includes(parts[0])&&/^[\w-]+$/.test(parts[1]||''))return {url,domain,label:'Instagram',icon:'image',embed:'https://www.instagram.com/'+parts[0]+'/'+parts[1]+'/embed/'};
 const fromVideo=domain==='youtu.be'?parts[0]:['shorts','embed','live'].includes(parts[0])?parts[1]:url.searchParams.get('v');
 if(['youtu.be','youtube.com','m.youtube.com'].includes(domain)&&/^[\w-]{11}$/.test(fromVideo||''))return {url,domain,label:'YouTube',icon:'play',embed:'https://www.youtube-nocookie.com/embed/'+fromVideo};
 if(/\.(png|webp|jpe?g|gif|avif)$/i.test(url.pathname))return {url,domain,label:'Imagem',icon:'image',direct:'image'};
 if(/\.(mp4|webm|ogv)$/i.test(url.pathname))return {url,domain,label:'Vídeo',icon:'play',direct:'video'};
 return {url,domain,label:domain,icon:'link'};
}
function referencePreview(ref={},inEditor=true){
 const info=referenceInfo(ref.url);
 if(!info)return inEditor?'<div class="small ref-placeholder">A prévia aparece quando você inserir um link válido.</div>':'';
 const title=ref.title||info.label;
 return '<div class="reference-preview">'+(ref.image?localImage(ref.image,'Miniatura de '+title,'link-thumbnail'):'<span class="link-icon">'+icon(info.icon)+'</span>')+
 '<div class="link-meta"><strong>'+esc(title)+'</strong><small>'+esc(info.domain)+'</small></div>'+
 (info.embed||info.direct?button('Ver conteúdo','reference-preview',{ic:'eye',cls:'btn',extra:'data-reference-url="'+esc(info.url.href)+'" aria-expanded="false"'}):'')+
 '<a class="icon-btn" href="'+esc(info.url.href)+'" rel="noopener noreferrer" target="_blank" aria-label="Abrir '+esc(title)+' em nova guia" title="Abrir em nova guia">'+icon('external')+'</a></div><div class="preview-slot"></div>';
}
function referenceRow(ref={}){
 return '<div class="ref-row" data-ref-existing="'+esc(ref.image||'')+'"><div class="form-grid">'+
 field('Título da referência','refTitle',ref.title)+field('Link de referência','refUrl',ref.url,'text','inputmode="url"')+
 imageInput('Miniatura opcional','refThumb')+'<div class="ref-remove">'+ib('trash','Remover link de referência','reference-remove')+'</div></div>'+
 '<div class="reference-output">'+referencePreview(ref)+'</div></div>';
}
function resourceFields(x,k){
 const gallery=asList(x.refImages).map(image=>'<label class="gallery-item">'+localImage(image.id,image.name)+'<span>'+esc(image.name)+'</span><span class="gallery-remove"><input type="checkbox" name="removeRef" value="'+esc(image.id)+'"> Remover</span></label>').join('');
 return '<section class="resource-sec"><div class="resource-cover">'+(x.cover?localImage(x.cover,'Capa atual'):'<span class="resource-icon">'+icon('image')+'</span>')+'<div><h3>'+ (k==='idv'?'Capa do projeto':k==='social'?'Capa da peça':'Capa do conteúdo')+'</h3>'+imageInput(x.cover?'Substituir capa':'Adicionar capa','coverInput')+(x.cover?'<label class="share-check"><input type="checkbox" name="removeCover"> Remover capa</label>':'')+'</div></div>'+
 '<h3>Imagens de referência</h3>'+imageInput('Enviar imagens de referência','refImages',true)+'<div class="reference-gallery" data-pending-images hidden></div>'+(gallery?'<div class="reference-gallery">'+gallery+'</div>':'')+
 '<div class="resource-head"><h3>Links de referência</h3>'+button('Adicionar link','reference-add',{ic:'plus'})+'</div>'+
 '<div data-ref-rows>'+asList(x.refs).map(referenceRow).join('')+'</div></section>';
}
async function saveResources(x,form,fd){
 const cover=await storeImage(fd.get('coverInput'));
 if(cover)x.cover=cover;else if(fd.has('removeCover'))x.cover='';
 const removed=new Set(fd.getAll('removeRef'));
 x.refImages=asList(x.refImages).filter(i=>!removed.has(i.id));
 for(const file of fd.getAll('refImages')){
  const id=await storeImage(file);if(id)x.refImages.push({id,name:file.name});
 }
 x.refs=[];
 const titles=fd.getAll('refTitle'), urls=fd.getAll('refUrl'), thumbs=fd.getAll('refThumb'), rows=form.querySelectorAll('.ref-row');
 for(let i=0;i<urls.length;i++){
  if(!clean(urls[i]))continue;
  const url=safeURL(urls[i]);if(!url)throw Error('Use um link de referência começando com http:// ou https://.');
  const image=await storeImage(thumbs[i])||rows[i].dataset.refExisting;
  x.refs.push({title:clean(titles[i]),url:url.href,image});
 }
}
function refreshReferenceRow(row,withFile=false){
 const url=row.querySelector('[name="refUrl"]').value,title=row.querySelector('[name="refTitle"]').value;
 row.querySelector('.reference-output').innerHTML=referencePreview({url,title,image:row.dataset.refExisting});
 hydrateImages(row);
 if(withFile){
  const file=row.querySelector('[name="refThumb"]').files[0];
  const preview=row.querySelector('.reference-preview');
  if(file&&preview){
   const thumbnail=document.createElement('img'), src=URL.createObjectURL(file);
   thumbnail.className='link-thumbnail';thumbnail.alt='Prévia da miniatura';
   thumbnail.onload=thumbnail.onerror=()=>URL.revokeObjectURL(src);thumbnail.src=src;
   preview.firstElementChild.replaceWith(thumbnail);
  }
 }
}
function openReferenceMedia(button){
 const card=button.closest('.reference-preview'), slot=card.nextElementSibling;
 if(slot.childElementCount){slot.replaceChildren();button.setAttribute('aria-expanded','false');return}
 const info=referenceInfo(button.dataset.referenceUrl);
 if(!info)return;
 const media=document.createElement(info.direct==='image'?'img':info.direct==='video'?'video':'iframe');
 if(info.embed){media.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');media.title='Prévia de '+info.label;media.loading='lazy';media.allow='encrypted-media; picture-in-picture';media.allowFullscreen=true;media.referrerPolicy='strict-origin-when-cross-origin';media.src=info.embed}
 else if(info.direct==='image'){media.alt=card.querySelector('strong').textContent;media.referrerPolicy='no-referrer';media.src=info.url.href}
 else {media.controls=true;media.preload='metadata';media.src=info.url.href}
 const fallback=document.createElement('small');fallback.textContent='Se a mídia não carregar, use o ícone ao lado do link para abrir a página original.';
 slot.append(media,fallback);button.setAttribute('aria-expanded','true');
}
function contentTab(name){
 for(const el of overlay.querySelectorAll('[data-pane]'))el.hidden=el.dataset.pane!==name;
 for(const el of overlay.querySelectorAll('[data-content-tab]')){
  const active=el.dataset.contentTab===name;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));
 }
}
function contentEditor(x,body,sections,content,k){
 const tabs=[['details','Detalhes','pen'],['references','Referências','image']];
 if(content)tabs.push(['metrics','Insights','chart']);
 return '<div class="switcher editor-tabs">'+tabs.map(([k,label,ic],i)=>button(label,'content-tab|'+k,{cls:'chip'+(i===0?' active':''),ic,extra:'data-content-tab="'+k+'" aria-pressed="'+(i===0)+'"'})).join('')+'</div>'+
 '<div data-pane="details"><div class="form-grid">'+body+'</div>'+sections+'</div><div data-pane="references" hidden>' +resourceFields(x,k)+'</div>'+
 (content?'<div data-pane="metrics" hidden>'+postInsights(x,k)+'</div>':'');
}

const metricFields=[['views','Visualizações'],['reach','Alcance'],['likes','Curtidas'],['followers','Novos seguidores'],['shares','Compartilhamentos'],['saves','Salvamentos'],['leads','Leads']];
const metricLabel=key=>metricFields.find(([x])=>x===key)?.[1]||'Leads';
const fmtCount=n=>n===undefined||n===null?'—':n.toLocaleString('pt-BR');
function publishedOn(x){return x.publishedDate||(x.stage==='Publicado'?x.date:'')||''}
function postHistory(x,k='content'){
 if(Array.isArray(x.metrics))return x.metrics.slice().sort((a,b)=>a.date.localeCompare(b.date));
 const on=publishedOn(x);
 const values=Object.fromEntries(workMetricFields(k).filter(([key])=>Number.isFinite(x[key])).map(([key])=>[key,x[key]]));
 return on&&Object.keys(values).length?[{date:on,...values}]:[];
}
function latestMetrics(x,until='',k='content'){
 const history=postHistory(x,k).filter(row=>!until||row.date<=until);
 return Object.fromEntries(workMetricFields(k).flatMap(([key])=>{
  const value=history.findLast(row=>Number.isFinite(row[key]));
  return value?[[key,value[key]]]:[];
 }));
}
function metricEditor(id,date='',k='content'){
 const x=get(k,id);if(!x)return;
 const existing=postHistory(x,k).find(s=>s.date===date), published=publishedOn(x);
 if(!published){toast('Informe a data da publicação nos detalhes do conteúdo.');return}
 modal(existing?'Editar métricas':'Registrar métricas','<p class="small">'+esc(x.name)+' · informe os contadores acumulados na data da atualização.</p><div class="form-grid">'+
 field('Data da atualização','date',existing?.date||(today>published?today:published),'date','required min="'+esc(published)+'" '+(date?'readonly':''))+
 workMetricFields(k).map(([key,label])=>field(label,key,existing?.[key]??'','number','min="0" step="1"')).join('')+
 '</div>'+formEnd('Salvar métricas',button('Voltar ao conteúdo','post-insights|'+id+'|'+k,{ic:'prev',cls:'btn ghost'})),'metrics|'+id+'|'+k,true);
}
function saveMetrics(id,fd,k='content'){
 const x=get(k,id);if(!x)return;
 const date=fd.get('date'), published=publishedOn(x), history=postHistory(x,k);
 if(!published||!date||date<published){toast('Use uma data igual ou posterior à publicação.');return}
 const found=history.find(row=>row.date===date);
 const update={date};
 for(const [key] of workMetricFields(k)){
  const value=fd.get(key);
  if(value===''){if(Number.isFinite(found?.[key]))update[key]=found[key];continue}
  const count=Number(value);if(!Number.isSafeInteger(count)||count<0){toast('Use números inteiros positivos ou zero.');return}
  update[key]=count;
 }
 if(Object.keys(update).length===1){toast('Preencha pelo menos uma métrica.');return}
 x.metrics=history.filter(row=>row.date!==date).concat(update).sort((a,b)=>a.date.localeCompare(b.date));
 finish('Métricas atualizadas.');openPostInsights(id,k);
}
function openPostInsights(id,k='content'){cardDialog(k,id);contentTab('metrics')}
function metricTiles(values,fields=metricFields){
 return '<div class="metric-tiles">'+fields.map(([key,label])=>'<div class="metric-tile"><span>'+label+'</span><b>'+fmtCount(values[key])+'</b></div>').join('')+'</div>';
}
function seriesChart(points,caption,asFrequency=false){
 if(!points.length)return empty('Ainda não há dados para este período.');
 const max=Math.max(1,...points.map(p=>p.value));
 if(asFrequency)return '<div class="freq-chart" aria-label="'+esc(caption)+'">'+points.map(p=>'<div class="freq-col" title="'+esc(p.label)+' · '+p.value+' publicações"><b>'+p.value+'</b><i style="--fill:'+Math.max(2,p.value/max*100)+'%"></i><small>'+esc(p.label)+'</small></div>').join('')+'</div>';
 const W=560,H=107,pad=20,x=i=>pad+i*(W-pad*2)/Math.max(1,points.length-1),y=value=>H-pad-(H-2*pad)*value/max;
 const coordinates=points.map((p,i)=>[x(i),y(p.value)]);
 const path=coordinates.map(([x,y])=>x.toFixed(1)+','+y.toFixed(1)).join(' ');
 return '<div class="metric-trend"><svg viewBox="0 0 '+W+' '+H+'" aria-label="'+esc(caption)+'" role="img"><path d="M'+pad+' '+(H-pad)+'H'+(W-pad)+' M'+pad+' '+Math.round(H/2)+'H'+(W-pad)+'" class="trend-grid"/><polyline points="'+path+'"/>'+coordinates.map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="4"><title>'+esc(points[i].label)+': '+fmtCount(points[i].value)+'</title></circle>').join('')+'</svg><div class="trend-labels">'+points.map(p=>'<span title="'+fmtCount(p.value)+'">'+esc(p.label)+'</span>').join('')+'</div></div>';
}
function postInsights(x,k='content'){
 if(!x.id)return empty('Salve o conteúdo com a data da publicação para registrar métricas.');
 const fields=workMetricFields(k), pub=publishedOn(x),history=postHistory(x,k),values=latestMetrics(x,'',k);
 const selected=fields.some(([key])=>key===state.trendMetric)?state.trendMetric:fields[0][0], common=history.filter(p=>Number.isFinite(p[selected]));
 return '<div class="resource-head"><div><h3>Desempenho da publicação</h3><p class="small">'+(pub?'Publicado em '+esc(shortDate(pub)+ '/'+pub.slice(0,4)):'Preencha a data da publicação em Detalhes.')+'</p></div>'+(pub?newBtn('Registrar métricas','metric-edit|'+x.id+'||'+k):'')+'</div>'+
 metricTiles(values,fields)+
 (history.length?'<div class="insight-chart panel"><div class="panel-head"><h2>Evolução</h2><select class="field" data-trend-for="'+esc(x.id)+'" data-trend-board="'+esc(k)+'" aria-label="Métrica da evolução">'+fields.map(([key,label])=>option(label,key,selected)).join('')+'</select></div>'+seriesChart(common.map(row=>({label:shortDate(row.date),value:row[selected]})),fields.find(([key])=>key===selected)[1])+'</div>'+
 '<h3>Histórico de atualizações</h3>'+renderTable(['Atualização',...fields.map(([,label])=>label)],history.slice().reverse().map(row=>[button(shortDate(row.date)+'/'+row.date.slice(0,4),'metric-edit|'+x.id+'|'+row.date+'|'+k,{cls:'text-button'}),...fields.map(([key])=>fmtCount(row[key]))])):empty('Nenhuma atualização registrada ainda.'));
}
function insightRecords(all=false){
 const {insightFrom:from,insightTo:to,insightFormat:format}=state;
 return db.content.filter(x=>{
  const date=publishedOn(x);
  return date&&(all||((!from||date>=from)&&(!to||date<=to)&&(!format||formatName(x.kind)===format)));
 });
}
function summarizePosts(posts,until){
 return Object.fromEntries(metricFields.map(([key])=>{
  const observed=posts.map(x=>latestMetrics(x,until)[key]).filter(Number.isFinite);
  return [key,observed.length?observed.reduce((a,b)=>a+b,0):null];
 }));
}
function weekStart(date){
 const day=new Date(date+'T12:00:00Z').getUTCDay();
 return addDays(date,-((day+6)%7));
}
function frequencyGroups(posts,all=false){
 const dates=posts.map(publishedOn).sort(), from=all?'':state.insightFrom, to=all?'':state.insightTo;
 if(!dates.length&&!from&&!to)return [];
 const start=from||dates[0]||to,end=to||dates.at(-1)||from;
 const weeks=Math.floor((new Date(weekStart(end))-new Date(weekStart(start)))/604800000)+1;
 if(weeks<1)return [];
 if(weeks>16){
  const points={};for(const day of dates){const month=day.slice(0,7);points[month]=(points[month]||0)+1;}
  return Object.entries(points).map(([label,value])=>({label:label.slice(5)+'/'+label.slice(2,4),value}));
 }
 return Array.from({length:weeks},(_,i)=>{
  const monday=addDays(weekStart(start),i*7);return {label:shortDate(monday),value:dates.filter(date=>weekStart(date)===monday).length};
 });
}
function renderInsights(){
 const rows=insightRecords(), values=summarizePosts(rows,state.insightTo), buckets=frequencyGroups(rows);
 const key=state.rankMetric, until=state.insightTo;
 const ranked=rows.map(x=>({x,values:latestMetrics(x,until)})).sort((a,b)=>(b.values[key]??-1)-(a.values[key]??-1)||(b.values.followers??-1)-(a.values.followers??-1)||publishedOn(b.x).localeCompare(publishedOn(a.x)));
 const label=state.insightFrom||state.insightTo?'Publicações no período selecionado.':'Todas as publicações registradas.';
 return '<div class="insight-filters filterbar"><label>Publicações a partir de <input class="field" type="date" aria-label="Início do período" value="'+esc(state.insightFrom)+'" data-change="insightFrom"></label>'+
 '<label>Até <input class="field" type="date" aria-label="Fim do período" value="'+esc(state.insightTo)+'" data-change="insightTo"></label>'+
 '<label>Formato <select class="field" data-change="insightFormat" aria-label="Filtrar por formato">'+option('Todos os formatos','',state.insightFormat)+contentFormats.map(([name])=>option(name,name,state.insightFormat)).join('')+'</select></label>'+
 (state.insightFrom||state.insightTo||state.insightFormat?button('Limpar filtros','insight-reset',{ic:'x',cls:'btn ghost'}):'')+'</div>'+
 panel(panelTitle('Desempenho geral','<span class="small">'+esc(label)+'</span>')+metricTiles(values),'metric-overview')+
 '<div class="insight-grid">'+
 panel(panelTitle('Frequência de publicação','<span class="small">'+(buckets.length>0?'A partir do período exibido':'')+'</span>')+'<strong class="frequency-count">'+rows.length+'</strong> <span class="small">publicações</span>'+seriesChart(buckets,'Frequência de publicação',true),'insight-frequency')+
 panel(panelTitle('Conteúdos com mais retorno','<select class="field" aria-label="Ordenar conteúdos por" data-change="rankMetric">'+metricFields.map(([key,label])=>option(label,key,state.rankMetric)).join('')+'</select>')+
 '<div class="insight-rank">'+(ranked.length?ranked.map(({x,values},i)=>'<button type="button" class="rank-item" data-act="post-insights|'+esc(x.id)+'"><span class="rank-index">'+String(i+1).padStart(2,'0')+'</span>'+localImage(x.cover,'','rank-cover')+'<span><b>'+esc(x.name)+'</b><small>'+esc(formatName(x.kind)||'Sem formato')+' · '+shortDate(publishedOn(x))+'</small></span><strong>'+fmtCount(values[key])+'</strong>'+icon('chevron')+'</button>').join(''):empty('Nenhuma publicação neste recorte.'))+'</div>','paper performance-rank')+'</div>'+
 '<p class="small insight-foot">Os totais usam a última medição de cada indicador por publicação'+(until?' até '+shortDate(until):'')+'.</p>';
}

function previewSelectedImages(input){
 const files=Array.from(input.files||[]);
 const showImage=(file,cls='')=>{
  const img=document.createElement('img'),url=URL.createObjectURL(file);
  img.className=cls;img.alt=file.name;img.onload=img.onerror=()=>URL.revokeObjectURL(url);img.src=url;
  return img;
 };
 if(input.name==='coverInput'){
  const container=input.closest('.resource-cover');
  container.querySelector('.pending-cover')?.remove();container.classList.toggle('has-pending-cover',Boolean(files.length));
  if(files[0])container.prepend(showImage(files[0],'pending-cover'));
 }else{
  const gallery=input.closest('.resource-sec').querySelector('[data-pending-images]');
  gallery.replaceChildren(...files.map(file=>{
   const item=document.createElement('div');item.className='gallery-item';item.append(showImage(file),file.name);return item;
  }));
  gallery.hidden=!files.length;
 }
}
