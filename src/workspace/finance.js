const categories=(ledger,type)=>db.categories.filter(c=>c.ledger===ledger&&(!type||c.type===type));
const categoryName=id=>get('categories',id)?.name||'Sem categoria';
const isSalary=(x)=>x.ledger==='empresa'&&x.type==='out'&&x.category==='cat3';
function syncSalary(){
 db.finance=db.finance.filter(x=>!x.mirror);
 const source=db.finance.filter(isSalary);
 db.finance.push(...source.map(x=>({...x,id:'salary-'+x.id,ledger:'pessoal',type:'in',category:'cat6',name:x.name,client:'',mirror:x.id})));
}
const financePeriods=[['Dia','day'],['Mês','month'],['Ano','year'],...[15,30,45,60,90].map(n=>['Últimos '+n+' dias',String(n)]),['Intervalo personalizado','range'],['Todas as datas','all']];
const financeDate=x=>(x.status==='Realizado'?x.paidDate||x.date:x.date)||'';
const fullDate=d=>d?shortDate(d)+'/'+d.slice(0,4):'—';
function financeBounds({mode,date,from,to}){
 if(mode==='day')return [date,date];
 if(mode==='year')return [date.slice(0,4)+'-01-01',date.slice(0,4)+'-12-31'];
 if(mode==='range')return [from,to];
 if(mode==='all')return ['',''];
 if(mode!=='month')return [addDays(today,1-Number(mode)),today];
 const month=date.slice(0,7),[year,number]=month.split('-').map(Number);
 return [month+'-01',month+'-'+new Date(Date.UTC(year,number,0)).getUTCDate()];
}
function financeRows(all=false,ledger=state.ledger,filter=state.financeFilter,status=state.fstatus){
 const [from,to]=all?['','']:financeBounds(filter);
 return db.finance.filter(x=>x.ledger===ledger&&(all||((status==='Todos'||x.status===status)&&
  (!from||financeDate(x)>=from)&&(!to||financeDate(x)<=to)))).sort((a,b)=>financeDate(b).localeCompare(financeDate(a)));
}
function financePeriodLabel(filter){
 const [from,to]=financeBounds(filter);
 if(filter.mode==='all')return 'Todas as datas';
 if(filter.mode==='day')return fullDate(from);
 if(filter.mode==='month')return monthName(from.slice(0,7));
 if(filter.mode==='year')return from.slice(0,4);
 return fullDate(from)+' a '+fullDate(to);
}
function financePeriodControls(){
 const {mode,date,from,to}=state.financeFilter;
 const input=(label,key,value,type,extra='')=>field(label,key,value,type,'data-finance-filter="'+key+'" '+extra);
 let dates='';
 if(mode==='day')dates=input('Dia','date',date,'date','min="1000-01-01" max="9999-12-31" required');
 if(mode==='month')dates=input('Mês','date',date.slice(0,7),'month','min="1000-01" max="9999-12" required');
 if(mode==='year')dates=input('Ano','date',date.slice(0,4),'number','min="1000" max="9999" step="1" required');
 if(mode==='range')dates=input('De','from',from,'date','min="1000-01-01" max="9999-12-31" required')+
  input('Até','to',to,'date','min="1000-01-01" max="9999-12-31" required');
 return '<label class="input-wrap">Período<select class="field" data-finance-filter="mode">'+
  financePeriods.map(([label,value])=>option(label,value,mode)).join('')+'</select></label>'+dates+
  '<span class="small finance-range-label">'+esc(financePeriodLabel(state.financeFilter))+'</span>';
}
function changeFinanceFilter(input){
 const key=input.dataset.financeFilter, value=input.value, filter=state.financeFilter;
 if(key==='mode'){
  if(!financePeriods.some(([,mode])=>mode===value))return;
  filter.mode=value;
 }else{
  const pattern=key==='date'&&filter.mode==='year'?/^\d{4}$/:key==='date'&&filter.mode==='month'?/^\d{4}-(0[1-9]|1[0-2])$/:/^\d{4}-\d{2}-\d{2}$/;
  if(!input.checkValidity()||!pattern.test(value)){
   toast('Informe uma data válida.');render();main.querySelector('[data-finance-filter="'+key+'"]')?.focus();return;
  }
  if(key==='from'||key==='to'){
   filter[key]=value;
   if(filter.from>filter.to)filter[key==='from'?'to':'from']=value;
  }else{
   filter.date=filter.mode==='year'?value+'-01-01':filter.mode==='month'?value+'-01':value;
  }
 }
 render();
 main.querySelector('[data-finance-filter="'+key+'"]')?.focus();
}
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
 const buttons=exportsBtn()+button('Diagnóstico','assistant-example|diagnostico',{ic:'chart'})+button('Categorias','categories',{ic:'palette'})+newBtn('Lançamento','new-money');
 return heading('Financeiro','Movimentações, parcelas e categorias.',buttons)+
 '<div class="filterbar">'+menu(['Empresa','Pessoal'],state.ledger==='empresa'?'Empresa':'Pessoal','ledger')+menu(['Todos','Realizado','Previsto'],state.fstatus,'fstatus')+'</div>'+
 '<div class="filterbar finance-filters">'+financePeriodControls()+'</div>'+
 '<div class="summary-grid">'+[['Receitas',income],['Despesas',spend],['Saldo do período',income-spend]].map(([label,value])=>panel('<span class="stat-label">'+label+'</span><strong class="stat-value mono">'+brl(value)+'</strong>')).join('')+'</div>'+
 cashForecastPanel()+'<div class="finance-grid">'+donutPanel('Receitas por categoria',groupFinance(rows,'in'))+donutPanel('Despesas por categoria',groupFinance(rows,'out'))+'</div>'+
 renderTable(['Lançamento','Categoria','Data prevista','Baixa','Status','Valor'],rows.map(x=>{const cat=get('categories',x.category);return [rowButton(x.name,'money',x.id)+(x.mirror?' <span class="tag yellow">Pró-labore</span>':x.client?' <small class="small">'+esc(x.client)+'</small>':''),'<span class="inline" style="color:'+cleanColor(cat?.color)+'">'+icon(cat?.icon)+' '+esc(categoryName(x.category))+'</span>',fullDate(x.date),fullDate(x.paidDate),statusTag(x.status),'<span class="finance-amount '+(x.type==='in'?'positive':'')+'">'+(x.type==='in'?'+':'−')+brl(x.amount)+'</span>']}));
}
function moneyDialog(id=''){
 const x=get('finance',id)||{};
 if(x.mirror){modal('Salário vinculado','<p class="small">Este registro veio de uma despesa de Pró-labore. Edite o lançamento de origem para atualizar o salário.</p><div class="dialog-actions">'+button('Abrir lançamento de origem','money|'+x.mirror,{ic:'link'})+'</div>');return}
 const ledger=x.ledger||state.ledger,type=x.type||'out';
 const card='<div class="form-grid">'+field('Descrição','name',x.name,'text','required')+select('Tipo','type',[['Receita','in'],['Despesa','out']],type)+
 '<label class="input-wrap">Categoria<select class="field" name="category" required>'+categoryOptions(ledger,type,x.category)+'</select></label>'+inlineCategoryFields()+field('Valor '+(id?'(R$)':'total (R$)'),'amount',x.amount,'number','required min="0.01" step="0.01"')+
 field('Data prevista','date',x.date||today,'date','required')+select('Status','status',['Previsto','Realizado'],x.status||'Previsto')+field('Data de baixa','paidDate',x.paidDate,'date')+clientPicker(x)+select('Projeto','project',projectChoices(),x.project||'')+
 (id?(x.series?select('Aplicar a','scope',['Só este lançamento','Este e os próximos'],'Só este lançamento'):''):select('Frequência','frequency',['Único','Recorrente','Parcelado'],'Único')+'<div id="seriesFields" class="wide"></div>')+'</div>'+
 '<div id="salaryTip" class="callout'+(isSalary({...x,ledger,type})?'':' hide')+'">Essa despesa vai gerar uma receita de Salário na aba Pessoal.</div>';
 modal(x.id?'Editar lançamento':'Novo lançamento · '+(ledger==='empresa'?'Empresa':'Pessoal'),card+formEnd('Salvar',deleteButton('finance',x.id)+(x.id&&x.status!=='Realizado'?button(x.type==='in'?'Marcar como recebido':'Marcar como pago','paid-now|'+x.id,{ic:'check'}):'')),'money|'+(x.id||'')+'|'+ledger);
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
 if(freq==='Recorrente'){holder.innerHTML='<div class="form-grid">'+select('Intervalo','interval',['Semanal','Quinzenal','Mensal','Anual'],when)+field('Última data (opcional)','end',end,'date')+'</div><p class="small">Sem data final, são geradas as próximas 12 ocorrências.</p>';return}
 holder.innerHTML='<div class="form-grid">'+field('Quantidade de parcelas','count',n,'number','required min="2" max="36" step="1"')+select('Datas das parcelas','mode',['Mensal no mesmo dia','Escolher cada data'],mode)+(mode==='Escolher cada data'?Array.from({length:n},(_,i)=>field('Parcela '+(i+1),'customDate',dates[i]||addMonths(form.elements.date.value||today,i),'date','required')).join(''):'')+'</div>';
}
function addMonths(date,n){
 const [y,m,d]=date.split('-').map(Number);
 const dest=new Date(Date.UTC(y,m-1+n,1));const last=new Date(Date.UTC(dest.getUTCFullYear(),dest.getUTCMonth()+1,0)).getUTCDate();
 dest.setUTCDate(Math.min(d,last));return dest.toISOString().slice(0,10);
}
function addDays(date,n){const dt=new Date(date+'T00:00:00Z');dt.setUTCDate(dt.getUTCDate()+n);return dt.toISOString().slice(0,10)}
function moneyUpdate(id,ledger,fd){
 const old=get('finance',id), created=[];
 const name=clean(fd.get('name')),amount=Number(fd.get('amount')),date=fd.get('date'),type=old?.sourceProject?'in':fd.get('type'),status=fd.get('status');
 let cat=fd.get('category');
 if(cat==='new'){cat=inlineCategorySave(fd,ledger,type);if(!cat){toast('Informe um nome de categoria válido.');return}}
 if(!name||!Number.isFinite(amount)||amount<=0||!date||!categories(ledger,type).some(x=>x.id===cat)){toast('Preencha nome, valor, data e categoria.');return}
 const base={name,ledger,type,category:cat,amount,date,status,paidDate:status==='Realizado'?(fd.get('paidDate')||date):'',...savedClientFields(fd),project:old?.sourceProject||fd.get('project')||''};
 if(!base.clientId&&base.project){const p=findWork(base.project);if(p){base.client=p.client;base.clientId=p.clientId}}
 if(old){
  const apply=fd.get('scope')==='Este e os próximos'&&old.series;
  const delta=Math.round((new Date(date)-new Date(old.date))/86400000);
  const related=apply?db.finance.filter(x=>!x.mirror&&x.series===old.series&&x.id!==old.id&&x.sequence>old.sequence):[];
  related.forEach(x=>{const updatedDate=addDays(x.date,delta);Object.assign(x,{name,type,category:cat,amount,client:base.client,clientId:base.clientId,project:base.project,date:updatedDate})});
  Object.assign(old,base);
 }else{
  const freq=fd.get('frequency')||'Único';let dates=[date];
  if(freq==='Parcelado')dates=fd.get('mode')==='Escolher cada data'?fd.getAll('customDate'):Array.from({length:Number(fd.get('count'))},(_,i)=>addMonths(date,i));
  if(freq==='Recorrente'){
   const end=fd.get('end'),interval=fd.get('interval'), limit=end?240:12;
   if(end&&end<date){toast('O fim da recorrência deve ser igual ou posterior à primeira data.');return}
   const projectDate=i=>interval==='Semanal'?addDays(date,i*7):interval==='Quinzenal'?addDays(date,i*14):addMonths(date,i*(interval==='Anual'?12:1));
   if(end&&projectDate(limit)<=end){toast('Use até 240 ocorrências por série.');return}
   dates=Array.from({length:limit},(_,i)=>projectDate(i)).filter(d=>!end||d<=end);
  }
  if(!dates.length||dates.some(d=>!d)){toast('Confira as datas de cada parcela.');return}
  const series=dates.length>1?uid():'';const cents=Math.round(amount*100);
  if(freq==='Parcelado'&&cents<dates.length){toast('O valor total deve cobrir pelo menos um centavo por parcela.');return}
  dates.forEach((d,i)=>{const part=freq==='Parcelado'?(Math.floor(cents/dates.length)+(i<cents%dates.length?1:0))/100:amount;
   const future=dates.length>1&&i>0;created.push({...base,id:uid(),series,sequence:i,frequency:freq,date:d,amount:part,name:freq==='Parcelado'?name+' · '+(i+1)+'/'+dates.length:name,status:future?'Previsto':status,paidDate:future||status!=='Realizado'?'':(fd.get('paidDate')||d)});
  });
 }
 db.finance.push(...created);
 syncSalary();
 state.ledger=ledger;
 const savedDate=financeDate(old||created[0]);
 if(!financeRows().some(x=>x.id===(old||created[0]).id)){
  state.fstatus='Todos';
  const [from,to]=financeBounds(state.financeFilter);
  if((from&&savedDate<from)||(to&&savedDate>to))Object.assign(state.financeFilter,{mode:'month',date:savedDate});
 }
 finish('Lançamento salvo.');
 return old?[old]:created;
}
function categoryList(){
 modal('Categorias · '+(state.ledger==='empresa'?'Empresa':'Pessoal'),['in','out'].map(type=>'<h3>'+(type==='in'?'Receitas':'Despesas')+'</h3>'+categories(state.ledger,type).map(c=>'<div class="attachment-row" style="color:'+cleanColor(c.color)+'">'+icon(c.icon)+'<span>'+esc(c.name)+'</span>'+button('Editar','edit-cat|'+c.id,{ic:'pen'})+'</div>').join('')).join('')+'<div class="dialog-actions">'+newBtn('Nova categoria','edit-cat')+'</div>');
}
function categoryDialog(id=''){
 const c=get('categories',id)||{};
 const icons=categoryIcons;
 modal(c.id?'Editar categoria':'Nova categoria','<div class="form-grid">'+(c.id==='cat3'||c.id==='cat6'?'<div class="callout wide">'+esc(c.name)+' é uma categoria vinculada ao fluxo de pró-labore.</div>':'')+
 field('Nome','name',c.name,'text','required '+((c.id==='cat3'||c.id==='cat6')?'readonly':''))+select('Tipo','type',[['Receita','in'],['Despesa','out']],c.type)+field('Cor','color',c.color||'#a0b9f4','color')+select('Ícone','icon',icons,c.icon)+'</div>'+formEnd('Salvar'),'category|'+id);
}
