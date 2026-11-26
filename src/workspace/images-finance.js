const categoryPresets={
 empresa:{
 in:[['Pagamento de cliente','users'],['Consultoria','brief'],['Web design','layers'],['Fotografia','image'],['Produção audiovisual','play'],['Comissões','chart'],['Licenciamento','file'],['Venda de produtos','brief'],['Reembolso','repeat'],['Restituição de tributos','wallet'],['Bonificação','plus'],['Rendimentos','chart'],['Aporte de capital','wallet'],['Outras receitas','plus']],
 out:[['Adobe Creative Cloud','pen'],['ChatGPT','brief'],['Inteligência artificial','brief'],['Hospedagem e nuvem','layers'],['Domínios','link'],['Software e assinaturas','brief'],['Equipamentos','image'],['Internet e telefonia','link'],['Freelancers e fornecedores','users'],['Contabilidade','file'],['Impostos e taxas','wallet'],['Tráfego pago','chart'],['Impressão','pen'],['Banco de imagens e fontes','image'],['Capacitação','book'],['Aluguel e coworking','home'],['Transporte e viagens','calendar'],['Tarifas bancárias','wallet'],['Outras despesas','brief']]
 },
 pessoal:{
 in:[['Restituição do Imposto de Renda','file'],['Décimo terceiro','wallet'],['Bonificação','plus'],['Férias','calendar'],['Freelance','brief'],['Comissões','chart'],['Rendimentos de investimentos','chart'],['Reembolso','repeat'],['Venda de bens','brief'],['Aluguel recebido','home'],['Presentes','plus']],
 out:[['Aluguel e condomínio','home'],['Água, luz e gás','home'],['Internet e telefonia','link'],['Supermercado','brief'],['Delivery e restaurantes','brief'],['Transporte','calendar'],['Combustível','calendar'],['Saúde','target'],['Farmácia','plus'],['Academia','target'],['Educação','book'],['Assinaturas','repeat'],['Vestuário','brief'],['Lazer','play'],['Viagens','calendar'],['Pets','home'],['Equipamentos e setup','image'],['Impostos e taxas','wallet'],['Doações','plus'],['Outras despesas','brief']]
 }};
const categoryIcons=[['Financeiro','wallet'],['Casa','home'],['Trabalho','brief'],['Pasta','folder'],['Design','pen'],['Mídias','layers'],['Fotografia','image'],['Vídeo','play'],['Estudos','book'],['Agenda','calendar'],['Clientes','users'],['Receita','plus'],['Meta','target'],['Gráfico','chart'],['Documento','file'],['Recorrência','repeat'],['Link','link']];
function initializeCategories(){
 for(const [ledger,kinds] of Object.entries(categoryPresets)){
  for(const [type,entries] of Object.entries(kinds)){
   entries.forEach(([name,icon],i)=>{
    if(!db.categories.some(c=>c.id==='preset-'+ledger+'-'+type+'-'+i||c.ledger===ledger&&c.type===type&&normalizedName(c.name)===normalizedName(name)))db.categories.push({id:'preset-'+ledger+'-'+type+'-'+i,ledger,type,name,icon,color:clientColors[i%clientColors.length]});
   });
  }
 }
}
function categoryOptions(ledger,type,selected=''){
 return option('Selecione uma categoria','',selected)+option('+ Nova categoria','new',selected)+categories(ledger,type).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).map(x=>option(x.name,x.id,selected)).join('');
}
function inlineCategoryFields(){
 return '<div class="inline-category wide form-grid hide">'+field('Nome da categoria','categoryName')+field('Cor','categoryColor','#b0bde4','color')+select('Ícone','categoryIcon',categoryIcons,'wallet')+'</div>';
}
function updateInlineCategory(form){
 const create=form.elements.category.value==='new';
 const fields=form.querySelector('.inline-category');fields.classList.toggle('hide',!create);form.elements.categoryName.required=create;
}
function inlineCategorySave(fd,ledger,type){
 const name=clean(fd.get('categoryName'));if(!name)return '';
 const found=categories(ledger,type).find(x=>normalizedName(x.name)===normalizedName(name));if(found)return found.id;
 const id=uid();
 db.categories.push({id,ledger,type,name,color:cleanColor(fd.get('categoryColor')),icon:fd.get('categoryIcon')});
 return id;
}
const imageModels=new WeakMap();
const imageUploadNames=['photo','coverInput','refImages','refThumb','imageUpload','wallPhoto','upload'];
function showImageControls(input){
 if(!imageUploadNames.includes(input.name)||!input.files)return;
 const prior=imageModels.get(input)||[];
 for(const model of prior){model.view.remove();if(model.url)URL.revokeObjectURL(model.url)}
 const list=[];
 imageModels.set(input,list);
 for(const file of [...input.files].filter(f=>['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(f.type))){
  const view=document.createElement('details');
  view.className='fw-image-edit wide';
  view.innerHTML='<summary>Ajustar '+esc(file.name)+'</summary><div class="fw-image-tools"><canvas width="440" height="250" aria-label="Prévia de enquadramento"></canvas><div><label>Proporção <select class="field" data-ratio><option value="original">Original (imagem inteira)</option><option value="1">1:1</option><option value="1.777777778">16:9</option><option value="0.5625">9:16</option><option value="0.8">4:5</option></select></label><label>Zoom <input data-zoom type="range" min="1" max="3" step=".03" value="1"></label><label>Posição horizontal <input data-x type="range" min="0" max="100" value="50"></label><label>Posição vertical <input data-y type="range" min="0" max="100" value="50"></label></div></div>';
  input.closest('label')?.insertAdjacentElement('afterend',view);
  const url=URL.createObjectURL(file), img=new Image(), model={file,view,img,url};
  list.push(model);
  img.onload=()=>{URL.revokeObjectURL(url);model.url='';drawImageModel(model)};
  img.onerror=()=>{URL.revokeObjectURL(url);model.url=''};
  img.src=url;
  view.addEventListener('input',()=>drawImageModel(model),{signal:services.signal});
  const canvas=view.querySelector('canvas');
  let drag;
  canvas.addEventListener('pointerdown',event=>{
   const x=view.querySelector('[data-x]'),y=view.querySelector('[data-y]');
   drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,baseX:Number(x.value),baseY:Number(y.value),x,y};
   canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
   if(!drag||event.pointerId!==drag.id)return;
   const dimension=canvas.getBoundingClientRect();
   drag.x.value=Math.min(100,Math.max(0,drag.baseX-160*(event.clientX-drag.startX)/dimension.width));
   drag.y.value=Math.min(100,Math.max(0,drag.baseY-160*(event.clientY-drag.startY)/dimension.height));
   drawImageModel(model);
  });
  canvas.addEventListener('lostpointercapture',()=>{drag=null});

 }
}
function imageGeometry(model){
 const {img,view}=model,w=img.naturalWidth,h=img.naturalHeight;
 const raw=view.querySelector('[data-ratio]').value;
 const ratio=raw==='original'?w/h:Number(raw);
 const zoom=Number(view.querySelector('[data-zoom]').value);
 const sw=Math.min(w,h*ratio)/zoom,sh=sw/ratio;
 const x=(w-sw)*Number(view.querySelector('[data-x]').value)/100,y=(h-sh)*Number(view.querySelector('[data-y]').value)/100;
 return {x,y,sw,sh,edit:raw!=='original'||zoom>1};
}
function drawImageModel(model){
 if(!model.img.naturalWidth)return;
 const {x,y,sw,sh}=imageGeometry(model), canvas=model.view.querySelector('canvas'),ctx=canvas.getContext('2d');
 const scale=Math.min(canvas.width/sw,canvas.height/sh);
 ctx.fillStyle='#0f1218';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.drawImage(model.img,x,y,sw,sh,(canvas.width-sw*scale)/2,(canvas.height-sh*scale)/2,sw*scale,sh*scale);
}
async function applyImageEdits(form,fd){
 for(const input of form.querySelectorAll('input[type=file]')){
  const models=imageModels.get(input)||[];
  if(!models.length)continue;
  const edited=new Map();
  for(const model of models){
   if(!model.img.naturalWidth)continue;
   const {x,y,sw,sh,edit}=imageGeometry(model);
   if(!edit)continue;
   const dim=Math.min(1,1900/Math.max(sw,sh)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(sw*dim));canvas.height=Math.max(1,Math.round(sh*dim));
   canvas.getContext('2d').drawImage(model.img,x,y,sw,sh,0,0,canvas.width,canvas.height);
   const blob=await new Promise(done=>canvas.toBlob(done,'image/png'));
   if(!blob)throw Error('Não foi possível ajustar a imagem.');
   edited.set(model.file,new File([blob],model.file.name.replace(/\.[^.]+$/,'')+'.png',{type:'image/png'}));
  }
  if(edited.size){
   const files=fd.getAll(input.name);
   fd.delete(input.name);
   for(const file of files){const viaName=[...edited].find(([source])=>source.name===file.name&&source.lastModified===file.lastModified&&source.size===file.size);fd.append(input.name,edited.get(file)||viaName?.[1]||file)}
  }
 }
}
