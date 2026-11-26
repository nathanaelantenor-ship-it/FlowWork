const categories=(ledger,type)=>db.categories.filter(c=>c.ledger===ledger&&(!type||c.type===type));
const categoryName=id=>get('categories',id)?.name||'Sem categoria';
const isSalary=(x)=>x.ledger==='empresa'&&x.type==='out'&&x.category==='cat3';
function syncSalary(){
 db.finance=db.finance.filter(x=>!x.mirror);
 const source=db.finance.filter(isSalary);
 db.finance.push(...source.map(x=>({...x,id:'salary-'+x.id,ledger:'pessoal',type:'in',category:'cat6',name:x.name,client:'',mirror:x.id})));
}
function financeRows(all=false,ledger=state.ledger){return db.finance.filter(x=>x.ledger===ledger&&(all||((!state.period||(x.status==='Realizado'?(x.paidDate||x.date):x.date)?.startsWith(state.period))&&(state.fstatus==='Todos'||x.status===state.fstatus)))).sort((a,b)=>(b.date||'').localeCompare(a.date||''))}
function financeTotals(rows){const sum=type=>rows.filter(x=>x.type===type).reduce((a,b)=>a+b.amount,0);return [sum('in'),sum('out')]}
function groupFinance(rows,type){
 const grouped={};rows.filter(x=>x.type===type).forEach(x=>grouped[x.category]=(grouped[x.category]||0)+x.amount);
 return Object.entries(grouped).sort((a,b)=>b[1]-a[1]).map(([id,value])=>({category:categoryName(id),color:cleanColor(get('categories',id)?.color),value}));
}
function donutPanel(title,list){
 let pos=0;const total=list.reduce((a,x)=>a+x.value,0);
 const segments=list.map(x=>{const start=pos;pos+=100*x.value/total;return x.color+' '+start+'% '+pos+'%'}).join(',');
 return panel(panelTitle(title)+'<div class="donut-wrap"><div class="donut" aria-hidden="true" style="background:'+(segments?'conic-gradient('+segments+')':'#394759')+'"></div><div class="legend">'+(list.map(x=>'<div><span><i style="background:'+x.color+'"></i>'+esc(x.category)+'</span><b>'+brl(x.value)+'</b></div>').join('')||empty('Sem movimentos.'))+'</div></div>');
}
function renderFinance(){
 const rows=financeRows(),[income,spend]=financeTotals(rows);
 const buttons=exportsBtn()+button('Categorias','categories',{ic:'palette'})+newBtn('Lançamento','new-money');
 return heading('Financeiro','Movimentações, parcelas e categorias.',buttons)+
 '<div class="filterbar">'+menu(['Empresa','Pessoal'],state.ledger==='empresa'?'Empresa':'Pessoal','ledger')+'<label>Período <input class="field" type="month" aria-label="Período financeiro" data-change="period" value="'+esc(state.period)+'"></label>'+menu(['Todos','Realizado','Previsto'],state.fstatus,'fstatus')+'</div>'+
 '<div class="summary-grid">'+[['Receitas',income],['Despesas',spend],['Saldo do período',income-spend]].map(([label,value])=>panel('<span class="stat-label">'+label+'</span><strong class="stat-value mono">'+brl(value)+'</strong>')).join('')+'</div>'+
 '<div class="finance-grid">'+donutPanel('Receitas por categoria',groupFinance(rows,'in'))+donutPanel('Despesas por categoria',groupFinance(rows,'out'))+'</div>'+
 renderTable(['Lançamento','Categoria','Data prevista','Baixa','Status','Valor'],rows.map(x=>{const cat=get('categories',x.category);return [rowButton(x.name,'money',x.id)+(x.mirror?' <span class="tag yellow">Pró-labore</span>':''),'<span class="inline" style="color:'+cleanColor(cat?.color)+'">'+icon(cat?.icon)+' '+esc(categoryName(x.category))+'</span>',shortDate(x.date),shortDate(x.paidDate),statusTag(x.status),'<span class="finance-amount '+(x.type==='in'?'positive':'')+'">'+(x.type==='in'?'+':'−')+brl(x.amount)+'</span>']}));
}
function moneyDialog(id=''){
 const x=get('finance',id)||{};
 if(x.mirror){modal('Salário vinculado','<p class="small">Este registro veio de uma despesa de Pró-labore. Edite o lançamento de origem para atualizar o salário.</p><div class="dialog-actions">'+button('Abrir lançamento de origem','money|'+x.mirror,{ic:'link'})+'</div>');return}
 const ledger=x.ledger||state.ledger,type=x.type||'out';
 const card='<div class="form-grid">'+field('Descrição','name',x.name,'text','required')+select('Tipo','type',[['Receita','in'],['Despesa','out']],type)+
 select('Categoria','category',[['Selecione uma categoria',''],...categories(ledger,type).map(c=>[c.name,c.id])],x.category||'')+field('Valor '+(id?'(R$)':'total (R$)'),'amount',x.amount,'number','required min="0.01" step="0.01"')+
 field('Data prevista','date',x.date||today,'date','required')+select('Status','status',['Previsto','Realizado'],x.status||'Previsto')+field('Data de baixa','paidDate',x.paidDate,'date')+(ledger==='empresa'?field('Cliente ou projeto','client',x.client):'')+
 (id?(x.series?select('Aplicar a','scope',['Só este lançamento','Este e os próximos'],'Só este lançamento'):''):select('Frequência','frequency',['Único','Recorrente','Parcelado'],'Único')+'<div id="seriesFields" class="wide"></div>')+'</div>'+
 '<div id="salaryTip" class="callout'+(isSalary({...x,ledger,type})?'':' hide')+'">Essa despesa vai gerar uma receita de Salário na aba Pessoal.</div>';
 modal(x.id?'Editar lançamento':'Novo lançamento · '+(ledger==='empresa'?'Empresa':'Pessoal'),card+formEnd('Salvar',x.id?button('Excluir','money-delete|'+x.id,{ic:'trash',cls:'btn danger'}):''),'money|'+(x.id||'')+'|'+ledger);
}
function recurrenceFields(form,preserve=false){
 const holder=form.querySelector('#seriesFields');if(!holder)return;
 const freq=form.elements.frequency.value;
 if(freq==='Único'){holder.innerHTML='';return}
 const n=preserve?Math.max(2,Math.min(36,Number(form.elements.count?.value)||2)):2;
 const mode=preserve?form.elements.mode?.value:'Mensal no mesmo dia';
 const when=preserve?form.elements.interval?.value:'Mensal';
 const end=preserve?form.elements.end?.value:'';
 const dates=Array.from(form.querySelectorAll('[name="customDate"]'),x=>x.value);
 if(freq==='Recorrente'){holder.innerHTML='<div class="form-grid">'+select('Intervalo','interval',['Semanal','Quinzenal','Mensal','Anual'],when)+field('Última data (opcional)','end',end,'date')+'</div><p class="small">Para testar no beta, uma série sem data final gera as próximas 12 ocorrências.</p>';return}
 holder.innerHTML='<div class="form-grid">'+field('Quantidade de parcelas','count',n,'number','required min="2" max="36" step="1"')+select('Datas das parcelas','mode',['Mensal no mesmo dia','Escolher cada data'],mode)+(mode==='Escolher cada data'?Array.from({length:n},(_,i)=>field('Parcela '+(i+1),'customDate',dates[i]||addMonths(form.elements.date.value||today,i),'date','required')).join(''):'')+'</div>';
}
function addMonths(date,n){
 const [y,m,d]=date.split('-').map(Number);
 const dest=new Date(Date.UTC(y,m-1+n,1));const last=new Date(Date.UTC(dest.getUTCFullYear(),dest.getUTCMonth()+1,0)).getUTCDate();
 dest.setUTCDate(Math.min(d,last));return dest.toISOString().slice(0,10);
}
function addDays(date,n){const dt=new Date(date+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()+n);return dt.toISOString().slice(0,10)}
function moneyUpdate(id,ledger,fd){
 const old=get('finance',id);
 const name=clean(fd.get('name')),amount=Number(fd.get('amount')),date=fd.get('date'),type=fd.get('type'),cat=fd.get('category'),status=fd.get('status');
 if(!name||!Number.isFinite(amount)||amount<=0||!date||!categories(ledger,type).some(x=>x.id===cat)){toast('Preencha nome, valor, data e categoria.');return}
 const base={name,ledger,type,category:cat,amount,date,status,paidDate:status==='Realizado'?(fd.get('paidDate')||date):'',client:clean(fd.get('client'))};
 if(old){
  const apply=fd.get('scope')==='Este e os próximos'&&old.series;
  const delta=Math.round((new Date(date)-new Date(old.date))/86400000);
  const related=apply?db.finance.filter(x=>!x.mirror&&x.series===old.series&&x.id!==old.id&&x.sequence>old.sequence):[];
  related.forEach(x=>{const updatedDate=addDays(x.date,delta);Object.assign(x,{name,type,category:cat,amount,client:base.client,date:updatedDate})});
  Object.assign(old,base);
 }else{
  const freq=fd.get('frequency')||'Único';let dates=[date];
  if(freq==='Parcelado')dates=fd.get('mode')==='Escolher cada data'?fd.getAll('customDate'):Array.from({length:Number(fd.get('count'))},(_,i)=>addMonths(date,i));
  if(freq==='Recorrente'){
   const end=fd.get('end'),interval=fd.get('interval'), limit=end?240:12;
   if(end&&end<date){toast('O fim da recorrência deve ser igual ou posterior à primeira data.');return}
   const projectDate=i=>interval==='Semanal'?addDays(date,i*7):interval==='Quinzenal'?addDays(date,i*14):addMonths(date,i*(interval==='Anual'?12:1));
   if(end&&projectDate(limit)<=end){toast('Neste beta, use até 240 ocorrências por série.');return}
   dates=Array.from({length:limit},(_,i)=>projectDate(i)).filter(d=>!end||d<=end);
  }
  if(!dates.length||dates.some(d=>!d)){toast('Confira as datas de cada parcela.');return}
  const series=dates.length>1?uid():'';const cents=Math.round(amount*100);
  if(freq==='Parcelado'&&cents<dates.length){toast('O valor total deve cobrir pelo menos um centavo por parcela.');return}
  dates.forEach((d,i)=>{const part=freq==='Parcelado'?(Math.floor(cents/dates.length)+(i<cents%dates.length?1:0))/100:amount;
   const future=dates.length>1&&i>0;db.finance.push({...base,id:uid(),series,sequence:i,frequency:freq,date:d,amount:part,name:freq==='Parcelado'?name+' · '+(i+1)+'/'+dates.length:name,status:future?'Previsto':status,paidDate:future||status!=='Realizado'?'':(fd.get('paidDate')||d)});
  });
 }
 syncSalary();state.ledger=ledger;state.period=(fd.get('paidDate')&&status==='Realizado'?fd.get('paidDate'):fd.get('mode')==='Escolher cada data'?fd.getAll('customDate')[0]||date:date).slice(0,7);state.fstatus='Todos';finish('Lançamento salvo.');
}
function categoryList(){
 modal('Categorias · '+(state.ledger==='empresa'?'Empresa':'Pessoal'),['in','out'].map(type=>'<h3>'+(type==='in'?'Receitas':'Despesas')+'</h3>'+categories(state.ledger,type).map(c=>'<div class="attachment-row" style="color:'+cleanColor(c.color)+'">'+icon(c.icon)+'<span>'+esc(c.name)+'</span>'+button('Editar','edit-cat|'+c.id,{ic:'pen'})+'</div>').join('')).join('')+'<div class="dialog-actions">'+newBtn('Nova categoria','edit-cat')+'</div>');
}
function categoryDialog(id=''){
 const c=get('categories',id)||{};
 const icons=[['Financeiro','wallet'],['Casa','home'],['Trabalho','brief'],['Pastas','folder'],['Design','pen'],['Conteúdo','layers'],['Estudos','book'],['Calendário','calendar'],['Receita','plus'],['Meta','target']];
 modal(c.id?'Editar categoria':'Nova categoria','<div class="form-grid">'+(c.id==='cat3'||c.id==='cat6'?'<div class="callout wide">'+esc(c.name)+' é uma categoria vinculada ao fluxo de pró-labore.</div>':'')+
 field('Nome','name',c.name,'text','required '+((c.id==='cat3'||c.id==='cat6')?'readonly':''))+select('Tipo','type',[['Receita','in'],['Despesa','out']],c.type)+field('Cor','color',c.color||'#a0b9f4','color')+select('Ícone','icon',icons,c.icon)+'</div>'+formEnd('Salvar'),'category|'+id);
}
