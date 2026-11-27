const assistantRoot=document.getElementById('assistant-root');
const assistant={open:false,entries:[],draft:null,pending:null,busy:false};
const chatExamples={
 receita:'Adicione uma receita mensal de R$ 850 de manutenção, todo dia 10.',
 projeto:'Crie um projeto de Identidade Visual para Ateliê Orla no valor de R$ 2.500, com entrega em 30 dias.',
 diagnostico:'Faça um diagnóstico financeiro da empresa neste mês.'
};
function renderAssistant(focus=false){
 if(!assistantRoot)return;
 const history=assistant.entries.map(e=>'<div class="fw-chat-message '+(e.role==='user'?'fw-chat-user':'')+'"><span>'+ (e.role==='user'?'Você':'Flowork')+'</span><p>'+esc(e.text)+'</p>'+(e.action?button(e.action.label,e.action.command,{cls:'btn',ic:'external'}):'')+'</div>').join('');
 assistantRoot.innerHTML=(assistant.open?'<section class="fw-chat-panel" aria-label="Assistente Flowork"><header><span class="fw-chat-mark">'+icon('target')+'</span><div><b>Assistente Flowork</b><small>Comandos · processamento no navegador</small></div>'+ib('list','Histórico do assistente','assistant-history')+ib('x','Fechar assistente','assistant-toggle')+'</header><div class="fw-chat-log" role="log" aria-live="polite">'+
 (history||'<div class="fw-chat-intro"><p>O que você quer fazer?</p><div class="fw-chat-prompts">'+button('Registrar receita','assistant-sample|receita',{ic:'wallet'})+button('Criar projeto','assistant-sample|projeto',{ic:'brief'})+button('Analisar meu financeiro','assistant-example|diagnostico',{ic:'chart'})+'</div></div>')+'</div><form data-assistant-form><label for="fw-chat-input" class="fw-chat-sr">Instrução para o assistente</label><input id="fw-chat-input" name="query" placeholder="Ex.: receita mensal de R$ 850 de manutenção" maxlength="450" autocomplete="off" required><button type="submit" class="btn primary" '+(assistant.busy?'disabled':'')+'>Enviar</button></form></section>':'')+
 '<button type="button" class="fw-chat-fab" data-act="assistant-toggle" aria-label="'+(assistant.open?'Ocultar assistente':'Abrir assistente Flowork')+'" aria-expanded="'+assistant.open+'">'+icon(assistant.open?'x':'target')+(assistant.open?'':'<span>Assistente</span>')+'</button>';
 const log=assistantRoot.querySelector('.fw-chat-log');if(log)log.scrollTop=log.scrollHeight;
 if(focus)assistantRoot.querySelector('#fw-chat-input')?.focus({preventScroll:true});
}
function assistantToggle(){
 assistant.open=!assistant.open;
 renderAssistant(assistant.open);
 if(!assistant.open)assistantRoot.querySelector('.fw-chat-fab')?.focus({preventScroll:true});
}
function assistantSample(id){
 const input=assistantRoot.querySelector('#fw-chat-input');
 if(input){input.value=chatExamples[id]||'';input.focus();input.select()}
}
function chatReply(text,action){
 assistant.entries.push({role:'assistant',text,action});
}
const simpleText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const parseMoney=(raw,unit)=>{
 const decimal=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'): /^\d{1,3}(?:\.\d{3})+$/.test(raw)?raw.replace(/\./g,''):raw;
 const amount=Number(decimal)*(unit&&/^mil$/i.test(unit)?1000:1);
 return Number.isFinite(amount)&&amount>0&&amount<=1000000000?Math.round(amount*100)/100:null;
};
const cashPattern=/(?:r\$\s*|\bvalor(?: total)?(?: de| e| é)?\s*|\b(?:custa|custara|custará)\s*)(\d+(?:[.,]\d+)*)(?:\s*(mil)\b)?|\b(\d+(?:[.,]\d+)*)(?:\s*(mil)\b)?\s*(?:reais|brl)\b/gi;
function chatAmounts(text){
 return [...text.matchAll(cashPattern)].map(m=>parseMoney(m[1]||m[3],m[2]||m[4])).filter(Boolean);
}
function localDate(year,month,day){
 const found=new Date(Date.UTC(year,month-1,day));
 return found.getUTCFullYear()===year&&found.getUTCMonth()===month-1&&found.getUTCDate()===day?found.toISOString().slice(0,10):'';
}
function chatDates(text){
 const t=simpleText(text), [y,m]=today.split('-').map(Number), dates=[];
 const picks=t.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4})(?!\d))?|\bem\s+(\d{1,3})\s+dias?\b|\b(hoje|amanha)\b/g);
 for(const match of picks){
  const [,isoY,isoM,isoD,d,mo,yr,offset,relative]=match;
  let date=isoY?localDate(+isoY,+isoM,+isoD):d?localDate(yr?(yr.length===2?2000+Number(yr):Number(yr)):y,+mo,+d):offset?addDays(today,+offset):relative==='amanha'?addDays(today,1):today;
  if(d&&!yr&&date&&date<today)date=localDate(y+1,+mo,+d);
  if(date)dates.push(date);
 }
 const dayMatch=t.match(/\b(?:todo dia|dia)\s+(\d{1,2})(?![\d/])/);
 if(!dates.length&&dayMatch&&+dayMatch[1]>0&&+dayMatch[1]<=31){
  const days=+dayMatch[1];
  for(let shift=0;shift<13;shift++){
   const ym=addMonths(today.slice(0,7)+'-01',shift), [yy,mm]=ym.split('-').map(Number);
   const date=localDate(yy,mm,days);
   if(date>=today){dates.push(date);break}
  }
 }
 return dates;
}
function chatClient(text){
 const words=' '+simpleText(text).replace(/[^a-z0-9]+/g,' ')+' ';
 const matches=db.clients.filter(c=>words.includes(' '+simpleText(c.name).replace(/[^a-z0-9]+/g,' ').trim()+' ')).sort((a,b)=>b.name.length-a.name.length);
 return matches.length===1?matches[0]:matches.length>1?null:undefined;
}
function chatCategory(d,text){
 const available=categories(d.ledger,d.flow);
 const combined=simpleText(text);
 return available.filter(c=>simpleText(c.name).length>3&&combined.includes(simpleText(c.name))).sort((a,b)=>b.name.length-a.name.length)[0]||
 available.find(c=>c.name===(d.flow==='out'?'Outras despesas':d.ledger==='pessoal'?'Outras receitas':'Pagamento de cliente'))||available[0];
}
function chatDescription(text,d){
 const labeled=text.match(/(?:descri[cç][aã]o|nome)\s*[:=]\s*([^;\n]+)/i);
 if(labeled)return clean(labeled[1]).slice(0,90);
 const quoted=text.match(/["“]([^"”]{2,90})["”]/);
 if(quoted)return clean(quoted[1]);
 if(d.kind==='project')return '';
 const stripped=text.replace(cashPattern,' ').replace(/\b((?:receita|despesa)(?:(?: mensal| anual| semanal| quinzenal| recorrente))? de) \d+(?:[.,]\d+)*(?: mil)?(?![\d.,\/-])/i,'$1 ').replace(/\b(?:adicion[ae]r?|registre|registrar|inclua|crie|quero|uma?|nova?|receita|despesa|recorrente|mensal|anual|quinzenal|semanal|no valor|valor|para a empresa|empresa|pessoal|de|do|da|com)\b/gi,' ').replace(/(?:todo dia|a partir|come[cç]a|vence|at[eé]|em (?=\d)|hoje|amanh[ãa]).*$/i,'').replace(/\b\d{1,4}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/g,' ').replace(/[,.$;:+\-]+/g,' ').trim().replace(/\s{2,}/g,' ');
 return /[a-zà-ÿ]{2}/i.test(stripped)?stripped[0].toUpperCase()+stripped.slice(1,90):'';
}
function chatDraft(text,kind,previous){
 const t=simpleText(text), dates=chatDates(text), amounts=chatAmounts(text);
 const draft=previous||{kind,source:'',ledger:state.view==='finance'?state.ledger:'empresa',flow:'in',frequency:'Único'};
 draft.source=(draft.source+' '+text).slice(-1400);
 if(/\bpessoal\b|\bminhas contas\b/.test(t))draft.ledger='pessoal';
 if(/\bempresa\b|\bempresarial\b/.test(t))draft.ledger='empresa';
 if(/\bdespesa\b/.test(t))draft.flow='out';
 if(/\breceita\b/.test(t))draft.flow='in';
 const plain=kind==='money'&&t.match(/\b(?:receita|despesa)(?:(?: mensal| anual| semanal| quinzenal| recorrente))? de (\d+(?:[.,]\d+)*)(?: (mil))?(?![\d.,\/-])/);
 if(!amounts.length&&plain)amounts.push(parseMoney(plain[1],plain[2]));
 if(amounts.length===1&&amounts[0])draft.amount=amounts[0];
 else if(amounts.length>1)delete draft.amount;
 else if(previous?.missing==='amount'&&/^\s*\d+(?:[.,]\d+)*(?:\s*mil)?[.!]?\s*$/i.test(text)){
  const match=text.match(/(\d+(?:[.,]\d+)*)(?:\s*(mil))?/i);draft.amount=parseMoney(match[1],match[2]);
 }
 const client=chatClient(text);
 if(client)draft.client=client.id;
 else if(client===null)delete draft.client;
 if(kind==='project'){
  const known=workBoards().filter(k=>t.includes(simpleText(navName(k))));
  const named=known.length===1?known[0]:known.length>1?'':(/\b(?:idv|rebranding|redesign|logotipo)\b/.test(t)?'idv':'');
  if(named)draft.board=named;
  if(/\bredesign\b/.test(t))draft.variant='Redesign';
  if(/\brebranding\b/.test(t))draft.variant='Rebranding';
  if(dates.length){
   if(/\brecebimento|\bpagamento|\bvence/.test(t)&&dates.length===1&&draft.date)draft.paymentDue=dates[0];
   else{draft.date=dates[0];if(dates.length>1)draft.paymentDue=dates[1]}
  }
  const description=chatDescription(text,draft);
  if(description)draft.name=description;
 }else{
  const interval=[['quinzenal','Quinzenal'],['semanal','Semanal'],['anual','Anual'],['mensal','Mensal']].find(([v])=>t.includes(v))?.[1];
  if(interval||/recorren|todo dia|todo mes|cada mes/.test(t)){draft.frequency='Recorrente';draft.interval=interval||draft.interval||'Mensal'}
  if(dates.length){
   if(draft.date&&dates.length===1&&/\bate\b|termina|ultima/.test(t))draft.end=dates[0];
   else{draft.date=dates[0];if(dates.length>1&&draft.frequency==='Recorrente')draft.end=dates[1]}
  }
  if(!previous||previous.missing==='name'){const description=chatDescription(text,draft);if(description)draft.name=description}
 }
 return draft;
}
function monthFromChat(text){
 const norm=simpleText(text), iso=norm.match(/\b(20\d{2})-(0[1-9]|1[0-2])\b/);
 if(iso)return iso[0];
 if(/mes passado|mes anterior/.test(norm))return addMonths(today,-1).slice(0,7);
 const month=['janeiro','fevereiro','marco','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'].findIndex(m=>new RegExp('\\b'+m+'\\b').test(norm));
 if(month!==-1)return (norm.match(/\b20\d{2}\b/)?.[0]||today.slice(0,4))+'-'+String(month+1).padStart(2,'0');
 return /\b(neste|este|atual) mes\b|\bmes atual\b/.test(norm)?today.slice(0,7):'';
}
function runFinancialReview(text){
 const words=simpleText(text);
 const ledger=words.includes('pessoal')?'pessoal':words.includes('empresa')?'empresa':state.ledger;
 const requestedMonth=monthFromChat(text);
 const filter=!requestedMonth&&state.view==='finance'?state.financeFilter:{mode:'month',date:requestedMonth?requestedMonth+'-01':today};
 const rows=financeRows(false,ledger,filter,'Todos');
 const paid=rows.filter(x=>x.status==='Realizado'), expected=rows.filter(x=>x.status==='Previsto');
 const [income,expense]=financeTotals(paid),[due,owed]=financeTotals(expected),balance=Math.round((income-expense)*100)/100,projected=balance+due-owed;
 const summary='Caixa '+(ledger==='pessoal'?'pessoal':'da empresa')+' · '+financePeriodLabel(filter)+'. ';
 const command=['assistant-finance',ledger,filter.date,'',filter.mode,filter.from,filter.to].join('|');
 if(!rows.length){chatReply(summary+'Ainda não há lançamentos neste recorte.',{label:'Abrir Financeiro',command});return}
 const top=groupFinance(paid,'out').slice(0,3);
 let comparison='';
 if(filter.mode==='month'){
  const date=addMonths(filter.date,-1);
  const before=financeRows(false,ledger,{mode:'month',date},'Realizado');
  const change=Math.round((expense-financeTotals(before)[1])*100)/100;
  if(before.length&&change)comparison='\nEm comparação com '+monthName(date.slice(0,7))+', as despesas '+(change>0?'subiram ':'caíram ')+brl(Math.abs(change))+'.';
 }
 const late=expected.filter(x=>x.date<today),[lateIncome,lateExpense]=financeTotals(late);
 const overdue=late.length?'\nPrevistos com data vencida: '+brl(lateIncome)+' a receber e '+brl(lateExpense)+' a pagar.':'';

 const tips=balance<0?'Há um déficit de '+brl(-balance)+'. Revise gastos que possam ser adiados ou reduzidos e confira datas das entradas previstas.':projected<0?'As previsões indicam um déficit de '+brl(-projected)+'. Confira vencimentos e se as receitas previstas ainda devem entrar.':'O saldo realizado do período está '+(balance>0?'positivo.':'zerado.')+' Confira as previsões antes de assumir novas despesas.';
 chatReply(summary+'Entradas realizadas: '+brl(income)+'. Saídas realizadas: '+brl(expense)+'. Saldo do período: '+brl(balance)+'.\nPrevistos: '+brl(due)+' a receber e '+brl(owed)+' a pagar. Projeção: '+brl(projected)+'.'+(top.length?'\nMaiores categorias de despesa: '+top.map(x=>x.category+' ('+brl(x.value)+')').join(', ')+'.':'')+comparison+overdue+'\n'+tips,{label:'Revisar no Financeiro',command});
}
function chatMissing(d){
 const checks=d.kind==='project'?
 [['client','Qual cliente já cadastrado você quer vincular?'],['board','Qual serviço? Opções ativas: '+workBoards().map(navName).join(', ')+'.'],['amount','Qual é o valor do projeto em reais?'],['date','Qual é o prazo de entrega? Use DD/MM/AAAA ou “em 10 dias”.']]:
 [['amount','Qual é o valor em reais, por ocorrência?'],['name','Qual descrição devo usar no lançamento?'],['date','Qual é a primeira data? Você também pode dizer “todo dia 10”.']];
 const found=checks.find(([key])=>!d[key]);
 if(found){d.missing=found[0];chatReply(found[1]);return true}
 return false;
}
function makeChatForm(values){
 const fd=new FormData();for(const [k,v] of Object.entries(values))if(v!==undefined&&v!==null)fd.set(k,String(v));return fd;
}
function chatFinance(ledger,date,id='',mode='month',from='',to=''){
 state.ledger=ledger;
 Object.assign(state.financeFilter,{mode,date:date.length===7?date+'-01':date},mode==='range'?{from,to}:{});
 state.fstatus='Todos';go('finance');
 if(id){assistant.open=false;renderAssistant();moneyDialog(id)}
}
function chatOpenProject(k,id){
 state.projectType='Todos';state.projectPick=id;go('projects');
 assistant.open=false;renderAssistant();cardDialog(k,id);
}
async function runChatCommand(d){
 if(d.kind==='money'){
  if(d.end&&d.end<d.date){delete d.end;d.missing='date';assistant.draft=d;chatReply('A data de encerramento precisa ser igual ou posterior à primeira ocorrência. Informe as datas novamente.');return}
  const cat=chatCategory(d,d.source);
  const fd=makeChatForm({name:d.name,amount:d.amount,date:d.date,type:d.flow,category:cat?.id,status:'Previsto',clientId:d.client,frequency:d.frequency,interval:d.interval,end:d.end});
  const rows=moneyUpdate('',d.ledger,fd);
  if(!rows?.length){chatReply('Não foi possível salvar. Confira as datas, a categoria e o valor.');return}
  const x=rows[0];
  recordAssistantAction('finance',rows,x.name);
  chatFinance(d.ledger,x.date);
  chatReply((d.flow==='in'?'Receita':'Despesa')+' prevista salva em '+(d.ledger==='pessoal'?'Pessoal':'Empresa')+': '+x.name+', '+brl(x.amount)+(d.frequency==='Recorrente'?' por ocorrência · '+(d.interval||'Mensal').toLowerCase()+' · '+rows.length+' ocorrências':'')+'. Primeira data: '+shortDate(x.date)+'/'+x.date.slice(0,4)+'. Categoria: '+categoryName(x.category)+'.',{label:'Revisar lançamento',command:'assistant-finance|'+d.ledger+'|'+x.date.slice(0,7)+'|'+x.id});
 }else{
  const c=get('clients',d.client), k=d.board;
  if(!c||!workBoards().includes(k)){chatReply('Confira se o cliente e o serviço ainda estão disponíveis.');return}
  const fd=makeChatForm({name:d.name||navName(k)+' · '+c.name,clientId:c.id,client:c.name,stage:definitions[k].labels[0],date:d.date,amount:d.amount,paymentDue:d.paymentDue||d.date,kind:k==='idv'?(d.variant||'Identidade Visual'):k==='social'||editorialBoard(k)?'Post estático':navName(k),cycle:d.date.slice(0,7)});
  const x=await addOrEditCard(k,'',fd,null);
  if(!x){chatReply('Não consegui salvar o projeto. Confira os dados.');return}
  recordAssistantAction(k,[x],x.name);
  state.projectType='Todos';state.projectPick=x.id;go('projects');
  chatReply('Projeto criado para '+c.name+': '+x.name+', '+brl(x.amount)+' e entrega em '+shortDate(x.date)+'/'+x.date.slice(0,4)+'. '+(d.paymentDue?'Recebimento previsto em '+shortDate(d.paymentDue)+'/'+d.paymentDue.slice(0,4)+'.':'Usei o prazo de entrega como data prevista de recebimento; você pode ajustar no projeto.')+(k==='social'||editorialBoard(k)?' Usei Post estático como formato inicial.':''),{label:'Revisar projeto',command:'assistant-project|'+k+'|'+x.id});
 }
 assistant.draft=null;
}
async function assistantSend(raw){
 const text=clean(raw).slice(0,450);if(!text||assistant.busy)return;
 const operation=services.startOperation();if(!operation)return;
 assistant.busy=true;assistant.entries.push({role:'user',text});renderAssistant();
 try{
  const t=simpleText(text);
  if(/^(cancelar|cancela|esquece|parar)[.!]?$/.test(t)){assistant.draft=null;assistant.pending=null;chatReply('Pedido cancelado.');return}
  if(assistant.pending){chatReply('Use Confirmar série ou digite “cancelar” antes de iniciar outro pedido.');return}
  if(/^(como|o que|o que acontece|qual|quais)\b/.test(t)&&!/\b(saldo|analise|gastei|recebi|negativo)\b/.test(t)||/(?:r\$ *-|\bvalor(?: de)? *-\d|[-−]\s*\d+(?:[.,]\d+)*\s*reais)/.test(t)||/\b(nao|nunca)\s+(?:crie|criar|adicione|adicionar|registre|registrar|cadastre|cadastrar|lance|lancar|inclua)\b|\b(exclua|delete|apague|remova|transfira)\b|\b(simule|exemplo|hipotetico|teste sem)\b/.test(t)){chatReply('Nenhum registro foi alterado. Posso criar receitas, despesas e projetos quando você pedir explicitamente.');return}
  if(/\b(diagnostico|analise|analisar|saldo|negativo|gastei|recebi|maiores gastos|como esta)\b/.test(t)&&!/\b(adicione|crie|registre|cadastre|lance)\b/.test(t)){runFinancialReview(text);return}
  if(/\bparcelad|\bparcelas\b/.test(t)){chatReply('Para parcelas, use Novo lançamento no Financeiro e informe o número e as datas.');return}
  const asks=/\b(adici\w+|cri\w+|registr\w+|cadastr\w+|lanc\w+|inclu\w+|coloc\w+|quero)\b/.test(t);
  const scope=/\bprojeto\b/.test(t)?'project':/\b(receita|despesa)\b/.test(t)?'money':'';
  if(!assistant.draft&&(!asks||!scope)){chatReply('Posso registrar receita ou despesa, abrir um projeto para cliente cadastrado ou analisar os lançamentos de um mês. Experimente “Adicione uma receita de R$ 300 de manutenção para hoje”.');return}
  const previous=asks&&scope?null:assistant.draft;
  const d=chatDraft(text,previous?.kind||scope,previous);
  assistant.draft=d;
  if(chatMissing(d))return;
  if(d.kind==='money'&&d.frequency==='Recorrente'){
   assistant.pending=d;
   chatReply('Confira antes de criar a série: '+d.name+' · '+brl(d.amount)+' por ocorrência · '+(d.interval||'Mensal').toLowerCase()+' · primeira data '+shortDate(d.date)+'/'+d.date.slice(0,4)+(d.end?' · até '+shortDate(d.end)+'/'+d.end.slice(0,4):' · 12 ocorrências')+'.',{label:'Confirmar série',command:'assistant-confirm'});
   return;
  }
  await runChatCommand(d);
 }catch(error){console.error(error);chatReply('Houve um erro ao processar o pedido. Confira os registros antes de tentar novamente.')}
 finally{assistant.busy=false;operation();if(!services.signal.aborted)renderAssistant(true)}
}
async function confirmAssistantSeries(){
 const d=assistant.pending;
 if(!d||assistant.busy)return;
 const operation=services.startOperation();
 if(!operation)return;
 assistant.pending=null;
 assistant.busy=true;
 try{await runChatCommand(d)}
 catch{chatReply('A série não foi concluída. Confira os lançamentos no Financeiro.')}
 finally{assistant.busy=false;operation();renderAssistant(true)}
}
if(assistantRoot)listen(assistantRoot,'submit',ev=>{
 if(!ev.target.matches('[data-assistant-form]'))return;
 ev.preventDefault();assistantSend(ev.target.elements.query.value);
});
