const serviceTemplates={
 web:{name:'Web Design',icon:'columns',note:'Da arquitetura do site à publicação.',stages:['Briefing','Estrutura','Wireframe','Design','Desenvolvimento','Homologação','Publicação'],steps:['Escopo aprovado','Estrutura e páginas definidas','Design aprovado','Testes concluídos','Site publicado']},
 socialmedia:{name:'Social Media',icon:'layers',note:'Planeje conteúdo de clientes, acompanhe a publicação e registre resultados.',stages:['Ideia','Pauta','Produção','Revisão','Agendado','Publicado'],steps:['Pauta alinhada','Peça pronta','Aprovação recebida','Publicação confirmada'],editorial:true},
 audiovisual:{name:'Audiovisual',icon:'play',note:'Pré-produção, captação e entrega de campanhas.',stages:['Briefing','Pré-produção','Captação','Pós-produção','Aprovação','Entrega'],steps:['Roteiro aprovado','Cronograma de gravação','Captação concluída','Arquivos finais entregues']},
 video:{name:'Edição de Vídeo',icon:'play',note:'Organize cortes, aprovação e versões finais.',stages:['Briefing','Seleção de material','Montagem','Finalização','Ajustes','Entrega'],steps:['Arquivos recebidos','Primeiro corte aprovado','Áudio e cor finalizados','Versões exportadas']},
 copy:{name:'Copywriting',icon:'pen',note:'Pesquisa, redação e aprovação de textos.',stages:['Briefing','Pesquisa','Redação','Revisão','Aprovação','Entrega'],steps:['Tom de voz definido','Rascunho revisado','Versão final aprovada']},
 traffic:{name:'Gestão de Tráfego',icon:'target',note:'Estruture campanhas e registre resultados nos Insights.',stages:['Diagnóstico','Planejamento','Configuração','Em veiculação','Otimização','Relatório'],steps:['Meta e orçamento definidos','Rastreamento validado','Criativos conferidos','Relatório entregue'],campaign:true},
 photo:{name:'Fotografia',icon:'image',note:'Planeje ensaios, seleções e entregas.',stages:['Briefing','Pré-produção','Ensaio','Seleção','Tratamento','Entrega'],steps:['Referências aprovadas','Ensaio concluído','Seleção aprovada','Galeria entregue']},
 seo:{name:'SEO',icon:'chart',note:'Acompanhe auditorias e otimizações orgânicas.',stages:['Auditoria','Pesquisa','Planejamento','Implementação','Monitoramento','Relatório'],steps:['Auditoria pronta','Palavras-chave priorizadas','Mudanças aplicadas','Relatório entregue']},
 email:{name:'E-mail Marketing',icon:'file',note:'Organize campanhas, sequências e resultados.',stages:['Briefing','Segmentação','Produção','Revisão','Agendado','Publicado'],steps:['Público definido','Links testados','Campanha aprovada','Envio confirmado'],editorial:true}
};
db.serviceSettings ||= {};
const serviceId=key=>'svc-'+key;
const servicePreset=k=>k?.startsWith('svc-')&&Object.hasOwn(serviceTemplates,k.slice(4))?serviceTemplates[k.slice(4)]:null;
const serviceBoard=k=>Boolean(servicePreset(k)&&Array.isArray(db.serviceSettings[k]?.stages)&&Array.isArray(db.serviceSettings[k]?.steps));
const editorialBoard=k=>Boolean(serviceBoard(k)&&servicePreset(k).editorial);
const insightBoard=k=>Boolean(serviceBoard(k)&&(servicePreset(k).editorial||servicePreset(k).campaign));
const workBoards=()=>['idv','social',...nav.map(([id])=>id).filter(serviceBoard)];
const findWork=id=>workBoards().map(k=>get(k,id)).find(Boolean);
const workMetricFields=k=>servicePreset(k)?.campaign?[['impressions','Impressões'],['clicks','Cliques'],['leads','Leads'],['sales','Conversões']]:metricFields;
function registerService(k){
 const p=servicePreset(k), config=db.serviceSettings[k];if(!p||!config||!Array.isArray(config.stages)||!Array.isArray(config.steps))return;
 db[k] ||= [];
 if(!nav.some(row=>row[0]===k))nav.push([k,p.icon,p.name]);
 definitions[k]={labels:config.stages,noun:p.editorial?'conteúdo':p.campaign?'campanha':'projeto',note:config.note||p.note};
 checklists[k]=config.steps;
 state.boardView[k] ||= 'Kanban';
}
function serviceMenu(){
 const active=Object.entries(serviceTemplates).filter(([key])=>serviceBoard(serviceId(key)));
 return heading('Serviços','Escolha um modelo para adicionar um serviço ao seu menu.',exportsBtn()+newBtn('Adicionar serviço','service-add'))+
 '<div class="svc-list">'+[['idv','pen','Identidade Visual','Projetos de marca'],['social','layers','Mídias Sociais','Peças e entregas para clientes'],...active.map(([key,p])=>[serviceId(key),p.icon,p.name,p.note])].map(([id,ic,name,note])=>
 '<article class="svc-row"><span class="svc-icon">'+icon(ic)+'</span><button type="button" class="fw-flat" data-act="go|'+esc(id)+'"><strong>'+esc(name)+'</strong><small>'+esc(note)+'</small></button>'+(serviceBoard(id)?ib('pen','Personalizar '+name,'service-config|'+id):'')+button('Abrir','go|'+id,{cls:'btn ghost'})+'</article>').join('')+'</div>';
}
function serviceAdd(){
 modal('Adicionar serviço','<div class="svc-picker">'+Object.entries(serviceTemplates).map(([key,p])=>{
  const installed=serviceBoard(serviceId(key));
  return '<button type="button" class="svc-choice" data-act="service-config|'+serviceId(key)+'"><span class="svc-icon">'+icon(p.icon)+'</span><span><strong>'+esc(p.name)+'</strong><small>'+esc(p.note)+'</small></span><span class="svc-choice-state">'+(installed?'Configurar':'Escolher')+'</span></button>';
 }).join('')+'</div>');
}
function serviceConfig(k){
 const p=servicePreset(k);if(!p)return;
 const previous=db.serviceSettings[k], x=previous||p;
 modal((previous?'Personalizar ':'Adicionar ')+p.name,'<div class="form-grid">'+area('Descrição', 'note', x.note)+area('Etapas · uma por linha','stages',x.stages.join('\n'))+area('Checklist inicial · um item por linha','steps',x.steps.join('\n'))+'</div>'+formEnd(previous?'Salvar':'Adicionar serviço'),'service-config|'+k,true);
}
function saveService(k,fd){
 const p=servicePreset(k);if(!p)return;
 const list=key=>[...new Set(String(fd.get(key)||'').split('\n').map(clean).filter(Boolean))];
 const stages=list('stages'),steps=list('steps');
 if(stages.length<2||stages.length>12||steps.length>20||[...stages,...steps].some(x=>x.length>65||x.includes('|'))){toast('Use de 2 a 12 etapas e até 20 itens de checklist, com até 65 caracteres por linha e sem barra vertical.');return}
 const previous=db.serviceSettings[k];
 const existing=asList(db[k]);
 for(const item of existing){
  const oldStage=previous?.stages.indexOf(item.stage)??0;
  if(!stages.includes(item.stage))item.stage=stages[Math.min(Math.max(0,oldStage),stages.length-1)];
  const checked=new Set(asList(item.done).map(i=>previous?.steps[i]));
  item.done=steps.flatMap((label,i)=>checked.has(label)?[i]:[]);
 }
 db.serviceSettings[k]={stages,steps,note:clean(fd.get('note')).slice(0,200)};
 registerService(k);
 if(Array.isArray(db.preferences.navAreas))db.preferences.navAreas=navigationAreas();
 go(k);
 if(persist())toast(previous?'Serviço atualizado.':p.name+' adicionado ao menu de Serviços.');
}
function serviceInsights(k){
 const metrics=workMetricFields(k);
 const rows=activeRows(k).filter(x=>postHistory(x,k).length);
 const values=Object.fromEntries(metrics.map(([key])=>[key,rows.reduce((total,x)=>total+(latestMetrics(x,'',k)[key]||0),0)]));
 return panel(panelTitle('Indicadores do serviço')+metricTiles(values,metrics)+
 (rows.length?renderTable(['Registro', 'Cliente', ...metrics.map(([,label])=>label)],rows.map(x=>[rowButton(x.name,k,x.id),esc(x.client),...metrics.map(([key])=>fmtCount(latestMetrics(x,'',k)[key]))])):empty('Abra um registro do serviço e adicione as métricas na aba Insights.')));
}
