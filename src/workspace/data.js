const listen=(target,event,handler)=>target.addEventListener(event,handler,{signal:services.signal});
const icoPaths={
 logo:'M4.5 17.5c3.5 0 3.5-5.5 7-5.5h8 M4.5 12c3.5 0 3.5-5.5 7-5.5h8 M12.5 17.5h7', users:'M9 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 9 11z M3 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2 M16 5a3 3 0 0 1 0 6 M21 20v-2a4 4 0 0 0-3-3.9', home:'M3 10.5 12 3l9 7.5V21H3z M9 21v-7h6v7',
 columns:'M3 4h18v16H3z M9 4v16 M15 4v16', pen:'m4 20 4-1 11-11-3-3L5 16z M13 7l4 4 M19 5l1-1', layers:'m12 3 9 5-9 5-9-5z M3 12l9 5 9-5 M3 16l9 5 9-5', play:'M4 5h16v14H4z M10 8l6 4-6 4z', book:'M3 5c4-2 6-1 9 1v15c-3-2-5-3-9-1z M21 5c-4-2-6-1-9 1v15c3-2 5-3 9-1z',
 folder:'M3 7h7l2 2h9v10H3z M3 7V5h7l2 2h8v2', map:'M12 6v6 M5 18v-5h14v5 M12 13v5 M9 3h6v4H9z M2 18h6v4H2z M9 18h6v4H9z M16 18h6v4h-6z',
 wallet:'M20 8V5H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h16v-4 M3 8h18v7h-6a3 3 0 1 1 0-6h6 M16 12h.1',
 chevron:'m9 6 6 6-6 6', prev:'m15 6-6 6 6 6', down:'m6 9 6 6 6-6', search:'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5l4.5 4.5', bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9 M10 21h4',
 plus:'M12 5v14 M5 12h14', minus:'M5 12h14', calendar:'M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4', download:'M12 3v12 m-4-4 4 4 4-4 M4 16v4h16v-4',
 target:'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z M12 7a5 5 0 1 0 5 5 5 5 0 0 0-5-5z M12 12h.1', check:'m5 12 5 5L20 7', chart:'M4 4v16h16 M8 16l4-5 3 2 5-6', external:'M13 4h7v7 M20 4l-9 9 M9 5H4v15h15v-5',
 clock:'M12 3a9 9 0 1 0 9 9 9 9 0 0 0-9-9z M12 7v5l3 2', x:'m6 6 12 12 M18 6 6 18', menu:'M4 6h16 M4 12h16 M4 18h16',
 file:'M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6 M9 16h6', upload:'M12 16V4m-4 4 4-4 4 4 M4 16v4h16v-4', image:'M3 5h18v14H3z M6 16l4-4 3 3 2-2 3 3 M9 9h.1', dot:'M12 12h.1', more:'M5 12h.1 M12 12h.1 M19 12h.1', link:'m10 14 4-4 M8 16l-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0 M16 8l1-1a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0',
 brief:'M3 7h18v13H3z M8 7V4h8v3 M3 12h18 M10 12v2h4v-2', list:'M8 6h12 M8 12h12 M8 18h12 M4 6h.1 M4 12h.1 M4 18h.1', eye:'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z M12 9a3 3 0 1 0 3 3 3 3 0 0 0-3-3z',
 repeat:'M4 10V6h14m-3-3 3 3-3 3 M20 14v4H6m3-3-3 3 3 3', copy:'M8 8h12v12H8z M16 4H4v12', trash:'M4 6h16 M7 6l1 14h8l1-14 M9 6V4h6v2', flag:'M5 21V4 M5 5h12l-3 4 3 4H5', palette:'M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 1-4c-.4-.4-.2-1.6 1-1.6h2.5A2.5 2.5 0 0 0 21 13v-1a9 9 0 0 0-9-9z M7 11h.1 M10 7h.1 M15 7h.1 M18 11h.1', position:'M4 8V4h4 M16 4h4v4 M20 16v4h-4 M8 20H4v-4 M9 12h6 M12 9v6'
};
const icon=(name)=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(icoPaths[name]||icoPaths.dot)+'"></path></svg>';
const nav=[
 ['home','home','Hoje'],['crm','columns','Comercial'],['clients','users','Clientes'],['idv','pen','Identidade Visual'],['social','layers','Mídias Sociais'],['content','play','Meu Conteúdo'],
 ['study','book','Estudos'],['files','folder','Documentos'],['maps','map','Mapas Mentais'],['finance','wallet','Financeiro']
];
const navName=k=>nav.find(x=>x[0]===k)?.[2]||'Hoje';
const definitions={
 crm:{labels:['Novo lead','Em contato','Conversa iniciada','Reunião marcada','Proposta enviada','Fechado','Perdido'],noun:'lead',note:'Prospecção, reuniões e propostas.'},
 idv:{labels:['Onboarding','Pesquisa e estratégia','Conceito visual','Design e testes','Apresentação','Ajustes','Entrega'],noun:'projeto',note:'Projetos de marca do briefing à entrega.'},
 social:{labels:['Pauta','Produção','Aprovação','Ajustes','Aprovado','Entregue'],noun:'peça',note:'Calendários, aprovações e entregas por cliente.'},
 content:{labels:['Ideia','Pauta','Roteiro','Produção','Revisão','Agendado','Publicado'],noun:'conteúdo',note:'Planejamento e produção para o seu perfil.'},
 study:{labels:['Planejado','Em andamento','Concluído'],noun:'estudo',note:'Trilhas, sessões e aplicação no portfólio.'}
};
const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const clone=x=>JSON.parse(JSON.stringify(x));
const starter={
  tasks:[],events:[],crm:[],idv:[],social:[],content:[],study:[],docs:[],finance:[],maps:[],clients:[],folders:[],
  categories:[
 {id:'cat1',ledger:'empresa',type:'in',name:'Identidade Visual',color:'#edff45',icon:'pen'},
 {id:'cat2',ledger:'empresa',type:'in',name:'Mídias Sociais',color:'#90aef0',icon:'layers'},
 {id:'cat3',ledger:'empresa',type:'out',name:'Pró-labore',color:'#edff45',icon:'wallet'},
 {id:'cat4',ledger:'empresa',type:'out',name:'Ferramentas',color:'#a4b8ec',icon:'brief'},
 {id:'cat5',ledger:'empresa',type:'out',name:'Operação',color:'#d495a3',icon:'folder'},
 {id:'cat6',ledger:'pessoal',type:'in',name:'Salário',color:'#edff45',icon:'wallet'},
 {id:'cat7',ledger:'pessoal',type:'out',name:'Moradia',color:'#a5b6ef',icon:'home'},
 {id:'cat8',ledger:'pessoal',type:'out',name:'Alimentação',color:'#e5a6a2',icon:'brief'},
 {id:'cat9',ledger:'pessoal',type:'in',name:'Outras receitas',color:'#a1b5e6',icon:'plus'}],
  templates:[{name:'Estratégia de marca',branches:['Contexto','Público','Concorrência','Posicionamento','Conceito']},
 {name:'Exploração visual',branches:['Conceitos','Símbolos','Cores','Tipografia','Referências']},
 {name:'Planejamento de conteúdo',branches:['Pilares','Ideias','Formatos','Ganchos','CTAs']},
 {name:'Diagnóstico comercial',branches:['Negócio','Necessidades','Oportunidades','Próximos passos']},
 {name:'Trilha de estudos',branches:['Objetivo','Tópicos','Referências','Exercícios']},
 {name:'Brainstorm livre',branches:['Primeira ideia']}
 ]};
const db=savedWorkspace?clone(savedWorkspace):{
 ...clone(starter),profile:{name:services.displayName,role:'Workspace pessoal'}
};
const state={view:'home',boardView:{idv:'Kanban',social:'Kanban',content:'Kanban',study:'Trilhas',crm:'Kanban'},day:today,ledger:'empresa',period:today.slice(0,7),fstatus:'Todos',client:db.social[0]?.client||'',cycle:today.slice(0,7),map:'',mapZoom:1,folder:'',clientStatus:'Todos',insightFrom:'',insightTo:'',insightFormat:'',rankMetric:'leads',trendMetric:'views',contentMonth:today.slice(0,7),kindFilter:'Todas',crmFilter:'',mobile:false};
const get=(k,id)=>db[k]?.find(x=>x.id===id);
const uid=()=>crypto.randomUUID();
const clean=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const shortDate=v=>v?String(v).slice(0,10).split('-').slice(1).reverse().join('/'):'—';
const monthName=v=>new Date(v+'-02T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const idFor=(name)=>clean(name).split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');
const asList=x=>Array.isArray(x)?x:[];
const cleanColor=(v,alt='#a0b9f4')=>/^#[0-9a-f]{6}$/i.test(v||'')?v:alt;
const mapShape=s=>s==='square'?3:s==='pill'?24:11;
const statusTag=s=>'<span class="tag'+(/aprovad|entregue|fechado|concluído|realizado|^ativo$/i.test(s)?' yellow':/ajuste|perdido/i.test(s)?' pink':'')+'">'+esc(s)+'</span>';
const button=(text,action,options={})=>'<button type="button" class="'+(options.cls||'btn')+'" data-act="'+esc(action)+'" '+(options.title?'title="'+esc(options.title)+'" aria-label="'+esc(options.title)+'" ':'')+(options.extra||'')+'>'+(options.ic?icon(options.ic):'')+esc(text)+'</button>';
const ib=(ic,title,action)=>button('',action,{cls:'icon-btn',ic,title});
const option=(label,value=label,selected)=>'<option value="'+esc(value)+'"'+(value===selected?' selected':'')+'>'+esc(label)+'</option>';
const field=(label,name,value='',type='text',extra='')=>'<label class="input-wrap">'+esc(label)+'<input class="field" name="'+esc(name)+'" type="'+type+'" value="'+esc(value)+'" '+extra+'></label>';
const select=(label,name,options,value)=>'<label class="input-wrap">'+esc(label)+'<select class="field" name="'+esc(name)+'">'+options.map(x=>Array.isArray(x)?option(x[0],x[1],value):option(x,x,value)).join('')+'</select></label>';
const area=(label,name,value='')=>'<label class="input-wrap wide">'+esc(label)+'<textarea class="field" name="'+esc(name)+'">'+esc(value)+'</textarea></label>';
const wrap=html=>'<div class="view">'+html+'</div>';
const empty=(text,cls='')=>'<div class="empty '+cls+'">'+esc(text)+'</div>';
const menu=(items,active,action)=>'<div class="switcher">'+items.map(item=>button(item,action+'|'+item,{cls:'chip'+(item===active?' active':'')})).join('')+'</div>';
const heading=(name,note,actions='')=>'<div class="page-heading"><div><h1>'+esc(name)+'</h1>'+(note?'<p>'+esc(note)+'</p>':'')+'</div><div class="heading-actions">'+actions+'</div></div>';
const exportsBtn=()=>button('Exportar','export',{ic:'download',cls:'btn ghost'});
const newBtn=(label,action)=>button(label,action,{ic:'plus',cls:'btn primary'});
const panelTitle=(title,act='')=>'<div class="panel-head"><h2>'+esc(title)+'</h2>'+act+'</div>';
const panel=(html,extra='')=>'<section class="panel '+extra+'">'+html+'</section>';
const renderTable=(headers,rows)=>'<div class="panel table-panel">'+(rows.length?'<table class="table"><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table>':empty('Nenhum registro neste recorte.','empty-panel'))+'</div>';
