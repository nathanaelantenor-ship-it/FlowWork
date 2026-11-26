const encode=new TextEncoder();
const xml=esc;
function bytes(size){const a=new Uint8Array(size);return [a,new DataView(a.buffer)]}
const crcTable=Array.from({length:256},(_,i)=>{for(let n=0;n<8;n++)i=(i&1)?0xedb88320^(i>>>1):i>>>1;return i>>>0});
function crc32(array){let crc=0xffffffff;for(const byte of array)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0}
function zip(entries,mime='application/zip'){
 const local=[], central=[];let offset=0,centralSize=0;
 for(const [name,data] of entries){
  const filename=encode.encode(name), payload=typeof data==='string'?encode.encode(data):data, checksum=crc32(payload);
  const [a,h]=bytes(30),[b,j]=bytes(46);
  h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(12,33,true);h.setUint32(14,checksum,true);h.setUint32(18,payload.length,true);h.setUint32(22,payload.length,true);h.setUint16(26,filename.length,true);
  j.setUint32(0,0x02014b50,true);j.setUint16(4,20,true);j.setUint16(6,20,true);j.setUint16(8,0x0800,true);j.setUint16(14,33,true);j.setUint32(16,checksum,true);j.setUint32(20,payload.length,true);j.setUint32(24,payload.length,true);j.setUint16(28,filename.length,true);j.setUint32(42,offset,true);
  local.push(a,filename,payload);central.push(b,filename);offset+=a.length+filename.length+payload.length;centralSize+=b.length+filename.length;
 }
 const [end,e]=bytes(22);
 e.setUint32(0,0x06054b50,true);e.setUint16(8,entries.length,true);e.setUint16(10,entries.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);
 return new Blob([...local,...central,end],{type:mime});
}
function xlsx(sheets){
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main', rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships', base='http://schemas.openxmlformats.org/package/2006';
 const header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const entries=[
  ['[Content_Types].xml',header+'<Types xmlns="'+base+'/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>'],
  ['_rels/.rels',header+'<Relationships xmlns="'+base+'/relationships"><Relationship Id="rId1" Type="'+rel+'/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ['xl/workbook.xml',header+'<workbook xmlns="'+ns+'" xmlns:r="'+rel+'"><sheets>'+sheets.map(([title],i)=>'<sheet name="'+xml(title.replace(/[\[\]:*?\/\\]/g,' ').slice(0,31)||'Dados')+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>'],
  ['xl/_rels/workbook.xml.rels',header+'<Relationships xmlns="'+base+'/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="'+rel+'/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>']
 ];
 sheets.forEach(([,rows],i)=>entries.push(['xl/worksheets/sheet'+(i+1)+'.xml',header+'<worksheet xmlns="'+ns+'"><sheetData>'+rows.map((row,j)=>'<row r="'+(j+1)+'">'+row.map((cell,k)=>{
  const ref=String.fromCharCode(65+k)+(j+1);
  return typeof cell==='number'&&Number.isFinite(cell)?'<c r="'+ref+'"><v>'+cell+'</v></c>':'<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(String(cell??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,''))+'</t></is></c>';
 }).join('')+'</row>').join('')+'</sheetData></worksheet>']));
 return zip(entries,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function pdfText(s){
 const replace={'–':'-','—':'-','−':'-','“':'"','”':'"','’':"'",'‘':"'",'…':'...'};
 let result='';
 for(const c of String(s??'')){const use=replace[c]||c, value=use.charCodeAt(0);result+=value<32?' ':value>255?'?':value>126?'\\'+value.toString(8).padStart(3,'0'):use.replace(/[()\\]/g,'\\$&')}
 return result;
}
const pdfLine=(x,y,size,text,bold=false)=>'BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+x+' '+y+' Tm ('+pdfText(text)+') Tj ET\n';
function pdfDocument(pages){
 const objects=[null,null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'];
 const add=x=>{objects.push(typeof x==='string'?[x]:x);return objects.length};
 const kids=[];
 for(const p of pages){
  let image=0;
  if(p.image){const a=p.image;image=add(['<< /Type /XObject /Subtype /Image /Width '+a.width+' /Height '+a.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+a.data.length+' >>\nstream\n',a.data,'\nendstream'])}
  const stream=add('<< /Length '+encode.encode(p.content).length+' >>\nstream\n'+p.content+'endstream');
  kids.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+(p.width||595)+' '+(p.height||842)+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> '+(image?'/XObject << /Im '+image+' 0 R >>':'')+' >> /Contents '+stream+' 0 R >>'));
 }
 objects[0]=['<< /Type /Catalog /Pages 2 0 R >>'];objects[1]=['<< /Type /Pages /Kids ['+kids.map(id=>id+' 0 R').join(' ')+'] /Count '+kids.length+' >>'];objects[2]=[objects[2]];objects[3]=[objects[3]];
 const result=['%PDF-1.4\n'];const offsets=[0];let pos=encode.encode(result[0]).length;
 const push=part=>{result.push(part);pos+=(typeof part==='string'?encode.encode(part).length:part.length)};
 objects.forEach((parts,i)=>{offsets.push(pos);push((i+1)+' 0 obj\n');parts.forEach(push);push('\nendobj\n')});
 const start=pos;
 push('xref\n0 '+offsets.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(v=>String(v).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+start+'\n%%EOF\n');
 return new Blob(result,{type:'application/pdf'});
}
function report(title,sheets){
 const pages=[];
 let content='', y=0;
 function page(){
  if(content)pages.push({content});
  content='0.10 0.12 0.15 rg\n'+pdfLine(48,785,24,title,true)+pdfLine(48,764,10,'Flowork · Exportação do workspace')+'0.6 0.65 0.15 RG 48 749 m 547 749 l S\n';y=724;
 }
 const push=(line,bold=false,size=10)=>{
  const parts=String(line??'').split(/\r?\n/).flatMap(v=>v.match(/.{1,92}(?:\s|$)|.{1,92}/g)||['']);
  for(const text of parts){if(y<60)page();content+=pdfLine(48,y,size,text,bold);y-=size+5}
 };
 page();
 for(const [name,rows,bars] of sheets){
  if(y<160)page();push(name,true,14);
  if(rows.length<2)push('Nenhum registro neste recorte.');
  if(bars?.length){
   const max=Math.max(...bars.map(b=>b.value));
   for(const bar of bars){
    if(y<115)page();
    const [r,g,b]=bar.color.slice(1).match(/../g).map(n=>(parseInt(n,16)/255).toFixed(2));
    push(bar.category+' · '+brl(bar.value),true);
    const width=Math.round(bar.value/max*375);
    content+=r+' '+g+' '+b+' rg 48 '+(y+3)+' '+width+' 7 re f 0.10 0.12 0.15 rg\n';
    y-=13;
   }
  }else for(const row of rows.slice(1)){push(row[0],true);push(row.slice(1).map((x,i)=>rows[0]?.[i+1]+': '+(x??'')).join('  |  '));y-=10}
  y-=12;
 }
 pages.push({content});return pdfDocument(pages);
}
async function mapPdf(m){
 const canvas=document.createElement('canvas');canvas.width=1560;canvas.height=915;const ctx=canvas.getContext('2d');
 ctx.scale(1.5,1.5);ctx.fillStyle='#141b26';ctx.fillRect(0,0,1040,610);
 const edges=m.nodes.filter(n=>n.parent).map(n=>[n.parent,n.id]).concat(asList(m.edges));
 for(const [from,to] of edges){
  const a=nodeBy(m,from),b=nodeBy(m,to);if(!a||!b)continue;
  const forward=b.x>=a.x,x1=a.x+(forward?155:0),x2=b.x+(forward?0:155),y1=a.y+24,y2=b.y+24,off=Math.max(35,Math.abs(x2-x1)*.43)*(forward?1:-1);
  ctx.strokeStyle=cleanColor(b.color);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x1,y1);ctx.bezierCurveTo(x1+off,y1,x2-off,y2,x2,y2);ctx.stroke();
 }
 for(const n of m.nodes){
  const height=n.image?91:53, color=cleanColor(n.color);
  ctx.fillStyle=n.parent?'#26334a':color;ctx.strokeStyle=color;ctx.beginPath();ctx.roundRect(n.x,n.y,155,height,mapShape(n.shape));ctx.fill();ctx.stroke();
  ctx.fillStyle=n.parent?'#f4f6ff':'#182013';ctx.font='bold 12px sans-serif';ctx.fillText(n.title,n.x+8,n.y+17,139);ctx.font='10px sans-serif';ctx.fillText(n.text||'',n.x+8,n.y+33,139);
  if(n.image)try{const data=await fileStore('get',n.image);if(data){const img=await createImageBitmap(data);const ratio=Math.min(139/img.width,46/img.height);ctx.drawImage(img,n.x+8,n.y+40,img.width*ratio,img.height*ratio);img.close()}}catch{}
 }
 const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));
 return pdfDocument([{width:842,height:595,content:'0.09 0.12 0.18 rg\n'+pdfLine(40,555,24,m.name,true)+pdfLine(40,535,10,'Flowork · Mapa mental')+'q 762 0 0 447 40 61 cm /Im Do Q\n',image:{width:canvas.width,height:canvas.height,data:new Uint8Array(await jpeg.arrayBuffer())}}]);
}
function reportData(view,all=false){
 if(view==='home')return [['Prioridades',[['Tarefa','Área','Hora','Status'],...db.tasks.map(x=>[x.name,x.meta,x.time,x.done?'Concluída':'Pendente'])]],['Agenda',[['Compromisso','Data','Hora'],...db.events.filter(e=>all||e.day===state.day).map(x=>[x.name,x.day,x.time])]]];
 if(view==='files'){
  const docRows=activeDocRows(all), folders=db.folders.filter(f=>all||(f.parent||'')===state.folder||f.id===state.folder);
  return [['Pastas',[['Pasta','Cliente','Atualizado'],...folders.map(x=>[folderPath(x.id),get('clients',x.clientId)?.name,x.date])]],
   ['Arquivos',[['Nome','Pasta','Cliente','Tipo','Data','Conteúdo'],...docRows.map(x=>[x.name,folderPath(x.folder)||'Raiz de Documentos',x.client,x.kind,x.date,x.text||''])]]];
 }
 if(view==='clients'){
  const clients=db.clients.filter(c=>all||state.clientStatus==='Todos'||c.state===state.clientStatus);
  return [['Clientes',[['Cliente','Contato','Canal','Detalhes de contato','Status','Pasta','Entrada','Observações'],...clients.map(c=>[c.name,c.person,c.channel,c.contact,c.state,folderPath(c.folder),c.date,c.note])]],
   ['Projetos',[['Cliente','Projeto ou peça','Serviço','Etapa','Prazo'],...clients.flatMap(c=>clientProjects(c).map(([k,x])=>[c.name,x.name,navName(k),x.stage,x.date]))]]];
 }
 if(view==='content'&&(all||state.boardView.content==='Insights')){
  const published=insightRecords(all), until=all?'':state.insightTo, values=summarizePosts(published,until);
  const headings=metricFields.map(([,label])=>label);
  const metricsRow=values=>metricFields.map(([key])=>values[key]??'');
  const reports=[
   ['Indicadores',[['Indicador','Valor'],['Publicações',published.length],...metricFields.map(([key,label])=>[label,values[key]??''])]],
   ['Desempenho',[['Publicação','Formato','Publicado em',...headings],...published.map(x=>[x.name,formatName(x.kind),publishedOn(x),...metricsRow(latestMetrics(x,until))])]],
   ['Histórico',[['Publicação','Dia da atualização',...headings],...published.flatMap(x=>postHistory(x).filter(row=>!until||row.date<=until).map(row=>[x.name,row.date,...metricsRow(row)]))]]];
  const frequency=frequencyGroups(published,all);
  reports.push(['Frequência',[['Início da semana ou mês','Publicações'],...frequency.map(p=>[p.label,p.value])]]);
  if(all)reports.push(['Pautas',[['Conteúdo','Formato','Etapa','Data planejada','Publicado em','Notas','Referências'],...db.content.map(x=>[x.name,formatName(x.kind),x.stage,x.date,publishedOn(x),x.note,asList(x.refs).map(r=>r.url).join(' · ')])]]);
  return reports;
 }
 if(view==='finance')return (all?['empresa','pessoal']:[state.ledger]).flatMap(ledger=>{
  const rows=financeRows(all,ledger),[a,b]=financeTotals(rows),title=ledger==='empresa'?'Empresa':'Pessoal';
  return [[title,[['Lançamento','Categoria','Data prevista','Data de baixa','Status','Tipo','Valor (R$)','Frequência','Cliente ou projeto'],...rows.map(x=>[x.name,categoryName(x.category),x.date,x.paidDate,x.status,x.type==='in'?'Receita':'Despesa',x.amount,x.frequency,x.client])]],
   ['Resumo · '+title,[['Métrica','Valor (R$)'],['Receitas',a],['Despesas',b],['Saldo',a-b]]],
   ...['in','out'].map(k=>[(k==='in'?'Receitas':'Despesas')+' por categoria · '+title,[['Categoria','Valor (R$)'],...groupFinance(rows,k).map(x=>[x.category,x.value])],groupFinance(rows,k)])];
 });
 if(view==='maps'){
  const current=activeMap();
  if(!current||all)return [['Mapas',[['Mapa','Cliente','Modelo','Blocos'],...db.maps.map(x=>[x.name,x.client,x.template,x.nodes.length])]],['Blocos',[['Mapa','Título','Bloco pai','Texto','Imagem'],...db.maps.flatMap(m=>m.nodes.map(n=>[m.name,n.title,nodeBy(m,n.parent)?.title,n.text,n.image?'Sim':'Não']))]]];
  return [['Mapa',[['Título','Bloco pai','Texto','Cor','Forma','Imagem'],...current.nodes.map(n=>[n.title,nodeBy(current,n.parent)?.title,n.text,n.color,n.shape,n.image?'Sim':'Não'])]]];
 }
 let rows=all?db[view]:activeRows(view);
 if(!all&&view==='social'&&state.boardView.social==='Entrega')rows=rows.filter(x=>['Aprovado','Entregue'].includes(x.stage));
 if(!all&&view==='content'&&state.boardView.content==='Calendário')rows=rows.filter(x=>(publishedOn(x)||x.date)?.startsWith(state.contentMonth));
 const extra={crm:[['Origem','origin'],['Canal','kind'],['Valor (R$)','amount']],idv:[['Aprovação','approval']],social:[['Ciclo','cycle'],['Formato','kind'],['Legenda','caption'],['Versão','version'],['Referências','refLinks']],content:[['Formato','kind'],['Publicado em','published'],['Referências','refLinks']],study:[['Tema','kind'],['Etapas concluídas','steps']]}[view]||[];
 return [[navName(view),[['Nome','Cliente','Etapa','Data','Próxima ação ou notas',...extra.map(x=>x[0])],...rows.map(x=>[x.name,x.client,x.stage,x.date,x.note,...extra.map(([,k])=>k==='steps'?asList(x.done).length:k==='refLinks'?asList(x.refs).map(r=>r.url).join(' · '):k==='published'?publishedOn(x):x[k])])]]];
}
const cleanFilename=title=>title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'exportacao';
async function exportView(all,type){
 const title=navName(state.view)+(state.view==='finance'&&!all?' · '+(state.ledger==='empresa'?'Empresa':'Pessoal'):'');
 const sheets=reportData(state.view,all), name=cleanFilename(title);
 if(type==='xlsx')download(name+'.xlsx',xlsx(sheets));
 else if(state.view==='maps'&&!all&&activeMap()){const m=activeMap();download(cleanFilename(m.name)+'.pdf',await mapPdf(m))}
 else download(name+'.pdf',report(title,sheets));
 modalClose();toast('Exportação preparada.');
}
async function deliveryPackage(){
 const ready=activeSocial().filter(x=>['Aprovado','Entregue'].includes(x.stage)).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
 const entries=[['legendas.txt',ready.map(x=>[shortDate(x.date),x.name,x.caption||'Sem legenda.'].join('\n')).join('\n\n')]];
 for(const x of ready){
  const prefix=cleanFilename(x.name)+'/';
  if(x.cover){
   const blob=await fileStore('get',x.cover);
   if(blob)entries.push([prefix+'capa.'+(blob.type.split('/')[1]||'png'),new Uint8Array(await blob.arrayBuffer())]);
  }
  for(const d of db.docs.filter(d=>d.project===x.id&&d.shared)){
   const path=prefix+d.id.slice(0,6)+'-';
   if(d.kind==='Documento')entries.push([path+cleanFilename(d.name)+'.txt',d.text]);
   else{const blob=await fileStore('get',d.id);if(blob)entries.push([path+d.name.replace(/[\/\\]/g,'-'),new Uint8Array(await blob.arrayBuffer())]);}
  }
 }
 download(cleanFilename(state.client)+'-'+state.cycle+'.zip',zip(entries));toast('Pacote de entrega preparado.');
}
