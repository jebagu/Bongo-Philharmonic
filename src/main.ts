import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './style.css';
import { addEvent, addPerformer, createComposition, History, locationLabel, movePerformer, performerLabel, removeEvents, removePerformer, renameLocation, STORAGE_KEY, updateEvent, validateComposition, type AssetSetId, type Composition, type Performer, type ScoreEvent } from './model';
import { getInstrument, getInstruments } from './catalog';
import { LIBRARY } from './library';
import { ComposerSphere } from './sphere';
import { ComposerScore, pitchName, pitchStep } from './score';
import { ScoreTransport } from './audio';
import { topology } from '../foundation/src/core/geometry';
import { migrateComposerStorage, readPhilharmonicStorage } from './storage';

type View = 'placement'|'composer'|'performance'|'library';
const $ = <T extends HTMLElement>(selector:string) => document.querySelector<T>(selector)!;
const el = <K extends keyof HTMLElementTagNameMap>(tag:K, className='', content?:string):HTMLElementTagNameMap[K] => {
  const node=document.createElement(tag);node.className=className;if(content!==undefined)node.textContent=content;return node;
};
const button = (text:string, action:()=>void, className='', label?:string) => {
  const node=el('button',className,text);node.type='button';node.onclick=action;if(label)node.setAttribute('aria-label',label);return node;
};
const option = (value:string,text:string) => {const node=el('option','',text);node.value=value;return node;};
const field = (label:string,input:HTMLElement) => {const node=el('label','field');node.append(el('span','',label),input);return node;};
const input = (type:string,value:string,label:string) => {const node=el('input');node.type=type;node.value=value;node.setAttribute('aria-label',label);return node;};
const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
const newId=()=>`event_${crypto.randomUUID()}`;
const RECOVERY_KEY=`${STORAGE_KEY}-recovery`;
const SAVED_KEY=`${STORAGE_KEY}-saved`;
const UI_KEY=`${STORAGE_KEY}-presentation`;
let initial=createComposition(), startupMessage='';
try {migrateComposerStorage(localStorage);}catch{/* Readable drafts can still open when migration writes fail. */}
try {const raw=readPhilharmonicStorage(localStorage);if(raw){initial=validateComposition(JSON.parse(raw));startupMessage='Draft restored · paused';}}
catch {startupMessage='Saved draft could not be opened. The stored copy has been kept.';}
const history=new History(initial);
let composition=history.current;
let view:View='placement', previousEditor:'placement'|'composer'='placement';
let scoreZoom=1,slowRotate=false,libraryFilter:'all'|AssetSetId='all';
let selectedPerformer:string|null=null, brushId:string|null=null, selectedEvents:string[]=[];
let placementType:string|null=null, erase=false, pageStart=0, loop=composition.loopEnabled??true, loading=false;
let brushByFamily:Record<string,string>={};
let pendingReturn:{type:string,brush:string|null,events:string[],page:number,x:number,y:number,newIds:string[]}|null=null;
let familyMenu:string|null=null;
let editorViewport={page:0,x:0,y:0};
try {const presentation=JSON.parse(readPhilharmonicStorage(localStorage,'-presentation')||'null');if(presentation?.view==='composer')view='composer';}
catch {/* A broken presentation preference never prevents opening the score. */}

const root=$<HTMLDivElement>('#philharmonic-app');
root.innerHTML=`
  <header class="app-header"><div class="brand">Bongo <span class="brand-subtitle">Philharmonic</span></div><nav class="view-nav" aria-label="Workspace"><button data-view="placement">Placement</button><button data-view="composer">Composer</button><button data-view="performance">Performance</button><button data-view="library">Library</button></nav><input id="composition-title" aria-label="Composition title" maxlength="180"><div class="header-actions"><button id="more-open" aria-label="More options">•••</button></div></header>
  <div class="performance-bar panel"><div class="brand">Bongo <span class="brand-subtitle">Philharmonic</span></div><div id="performance-transport-slot"></div></div>
  <main class="workspace">
    <aside class="placement-panel panel"><div class="section-heading"><h1>Instruments</h1><span class="band-count">0 / 16</span></div><label class="set-field">Sound set<select id="asset-set"><option value="bongo">Bongo Planet</option><option value="mario">Mario Paint</option></select></label><div id="placement-palette" class="placement-palette"></div><div id="placement-intent" class="intent-tray" hidden></div><div id="performer-tray" class="performer-tray"></div></aside>
    <section class="sphere-stage" aria-label="Instrument Placement"><div id="sphere-host"></div><div class="sphere-controls"><button id="reset-camera">Reset view</button><button id="slow-rotate" aria-pressed="false">Slow rotate</button></div><div id="sphere-hint" class="sphere-hint"></div></section>
    <section class="composer-tools panel"><div class="composer-tool-top"><div><h1>Composer</h1><div id="current-stamp" class="current-stamp"></div></div><span class="band-count">0 / 16</span></div><div id="family-row" class="family-row" aria-label="Instrument pictures"></div><div id="family-menu" class="family-menu" hidden></div></section>
    <section class="score-section panel"><div class="score-heading"><div class="score-tools"><button id="stamp-tool" aria-pressed="true">Stamp</button><button id="erase-tool" aria-pressed="false">Erase</button><label>Grid<select id="edit-grid"><option value="1">¼ note</option><option value="2">⅛ note</option><option value="4">¹⁄₁₆ note</option><option value="8">¹⁄₃₂ note</option><option value="3">Triplets</option></select></label><div class="score-zoom" aria-label="Score zoom"><button id="zoom-out" aria-label="Zoom out score">−</button><output id="zoom-value">100%</output><button id="zoom-in" aria-label="Zoom in score">+</button></div></div><div class="score-pages"><button id="page-back" aria-label="Previous passage">←</button><span id="page-label"></span><button id="page-next" aria-label="Next passage">→</button></div><output id="pitch-feedback" aria-live="off"></output></div><div id="note-toolbar" class="note-toolbar" hidden></div><div id="score-scroll" class="score-scroll"><div id="score-host"></div></div></section>
    <section id="composition-library" class="library-page panel" aria-label="Composition library"><div class="library-heading"><div><h1>Composition library</h1><p id="library-count"></p></div><div id="library-filters" class="library-filters" aria-label="Library sound sets"></div></div><div id="library-collection"></div></section>
    <footer class="transport panel"><button id="play" class="primary" aria-label="Play">▶ Play</button><button id="stop" aria-label="Stop and rewind">■ Stop</button><button id="loop" aria-pressed="true">↻ Loop</button><output id="position">1 : 1</output><label class="tempo-field">BPM<input id="tempo" type="number" min="20" max="400" step="any" aria-label="Tempo BPM"></label><label class="volume-field">Volume<input id="master-volume" type="range" min="0" max="1" step="0.01" aria-label="Master volume"></label><div class="history-tools"><button id="undo" aria-label="Undo">↶</button><button id="redo" aria-label="Redo">↷</button></div><button id="exit-performance">Exit Performance</button></footer>
  </main><div id="notice" role="status" aria-live="polite"></div><input id="import-file" type="file" accept="application/json,.json" hidden>
  <dialog id="app-dialog"><div class="dialog-heading"><h2 id="dialog-title"></h2><button id="dialog-close" aria-label="Close dialog">×</button></div><div id="dialog-body"></div></dialog>`;

const transport=new ScoreTransport(snapshot=>updateTransport(snapshot));
transport.onError=(message:unknown)=>{loading=false;notice(errorText(message));updateTransport();};
const sphere=new ComposerSphere($('#sphere-host'),{
  onJunction:junction=>{
    if(view!=='placement'||!placementType)return;
    const type=placementType;
    try {
      const next=addPerformer(composition,type,junction);
      const performer=next.performers[next.performers.length-1];
      edit(()=>next);
      placementType=null;selectedPerformer=brushId=performer.id;brushByFamily[type]=performer.id;
      pendingReturn?.newIds.push(performer.id);render();
      notice(`${performerLabel(composition,performer)} placed`);
    }catch(e){notice(errorText(e));}
  },
  onSelect:id=>{
    if(view!=='placement')return;
    selectedPerformer=id;brushId=id;
    const performer=composition.performers.find(p=>p.id===id);
    if(performer)brushByFamily[performer.instrumentTypeId]=id;
    render();
  },
  onMove:(id,junction)=>{if(view==='placement')edit(c=>movePerformer(c,id,junction));},
  onCancel:()=>cancelPlacement(),
});
const score=new ComposerScore($('#score-host'),{
  stamp:(pitch,beat)=>stamp(pitch,beat),
  select:(ids,extend)=>{
    if(erase){edit(c=>removeEvents(c,ids));selectedEvents=[];}
    else selectedEvents=extend?[...new Set([...selectedEvents,...ids])]:ids;
    renderNoteToolbar();renderScore();
  },
  move:(id,pitch,beat)=>edit(c=>updateEvent(c,id,{pitch,startBeat:beat})),
  hover:text=>{$('#pitch-feedback').textContent=text;},
});
transport.setLoop(loop);
transport.onAttack=attacks=>{
  const simultaneous=new Map<number,Set<string>>();
  for(const attack of attacks){const ids=simultaneous.get(attack.audioTime)||new Set<string>();ids.add(attack.performerId);simultaneous.set(attack.audioTime,ids);}
  for(const [time,ids] of simultaneous)sphere.react([...ids],transport.toPerformanceTime(time));
};

function notice(message:string) {$('#notice').textContent=message;}
function performer(id:string|null) {return composition.performers.find(p=>p.id===id);}
function targetLabel(p:Performer) {return `${locationLabel(composition,p.junctionId)} · ${performerLabel(composition,p)}`;}
function persist() {
  try {localStorage.setItem(STORAGE_KEY,JSON.stringify(composition));return true;}
  catch {notice('Draft could not be saved. Export JSON to keep a copy.');return false;}
}
function reconcile() {
  if(!performer(brushId))brushId=null;
  if(!performer(selectedPerformer))selectedPerformer=null;
  for(const [type,id] of Object.entries(brushByFamily))if(!performer(id))delete brushByFamily[type];
  selectedEvents=selectedEvents.filter(id=>composition.events.some(e=>e.id===id));
  pageStart=Math.min(pageStart,Math.max(0,Math.floor((composition.lengthBeats-.001)/16)*16));
  if(placementType&&!getInstruments(composition.assetSetId).some(i=>i.id===placementType))placementType=null;
  if(familyMenu&&!getInstruments(composition.assetSetId).some(i=>i.id===familyMenu))familyMenu=null;
}
function edit(operation:(current:Composition)=>Composition, musical=true) {
  try {
    const next=validateComposition(operation(composition));
    if(JSON.stringify(next)===JSON.stringify(composition))return;
    const wasPlaying=transport.snapshot().playing;
    if(musical){transport.pause();loading=false;}
    composition=history.commit(next);reconcile();persist();render();
    if(musical&&wasPlaying)notice('Paused to edit');
  }catch(e){notice(errorText(e));}
}
function replace(next:Composition,message:string) {
  try {
    const validated=validateComposition(next);
    const recovery=JSON.stringify(composition);
    localStorage.setItem(RECOVERY_KEY,recovery);
    transport.stop();loading=false;
    composition=history.commit(validated);
    loop=composition.loopEnabled??true;transport.setLoop(loop);$('#loop').setAttribute('aria-pressed',String(loop));
    selectedPerformer=brushId=null;selectedEvents=[];brushByFamily={};pendingReturn=null;placementType=null;familyMenu=null;pageStart=0;
    view=composition.performers.length?'composer':'placement';
    if(composition.performers.length){selectedPerformer=brushId=composition.performers[0].id;brushByFamily[composition.performers[0].instrumentTypeId]=brushId;}
    persist();render();closeDialog();notice(message+' · previous draft recoverable');
  }catch(e){notice(errorText(e));}
}
function switchView(next:View) {
  const oldView=view;
  if(oldView==='placement'||oldView==='composer')previousEditor=oldView;
  if(next==='library'&&(oldView==='placement'||oldView==='composer'))editorViewport={page:pageStart,x:$('#score-scroll').scrollLeft,y:$('#score-scroll').scrollTop};
  if(next==='performance'){
    if(oldView==='placement'||oldView==='composer')editorViewport={page:pageStart,x:$('#score-scroll').scrollLeft,y:$('#score-scroll').scrollTop};
    familyMenu=null;
    notice('');
  } else if(view==='performance'){
    if(next==='placement'||next==='composer')previousEditor=next;pageStart=editorViewport.page;
  }
  if(next==='composer'&&view==='placement'&&pendingReturn){returnToComposer();return;}
  view=next;
  if(next==='composer'&&oldView==='placement'&&performer(selectedPerformer)){brushId=selectedPerformer;brushByFamily[performer(brushId)!.instrumentTypeId]=brushId!;}
  try{localStorage.setItem(UI_KEY,JSON.stringify({view:next==='performance'?previousEditor:next}));}catch{/* draft has independent error feedback */}
  render();
  if(oldView==='performance'){$('#score-scroll').scrollLeft=editorViewport.x;$('#score-scroll').scrollTop=editorViewport.y;}
}
function armPlacement(type:string,fromComposer=false) {
  familyMenu=null;
  if(fromComposer)pendingReturn={type,brush:brushId,events:[...selectedEvents],page:pageStart,x:$('#score-scroll').scrollLeft,y:$('#score-scroll').scrollTop,newIds:[]};
  placementType=type;view='placement';render();
  notice(composition.performers.length===16?'Band full — 16 / 16. Remove a performer before placing another.':`Choose an empty junction for ${getInstrument(composition.assetSetId,type).name}`);
}
function cancelPlacement(){placementType=null;render();}
function returnToComposer() {
  const viewport=pendingReturn?{x:pendingReturn.x,y:pendingReturn.y}:null;
  if(pendingReturn) {
    const pending=pendingReturn;
    const selected=performer(selectedPerformer);
    const requested=selected&&selected.instrumentTypeId===pending.type&&pending.newIds.includes(selected.id)?selected:
      [...pending.newIds].reverse().map(id=>performer(id)).find(p=>p?.instrumentTypeId===pending.type);
    brushId=requested?.id||(performer(pending.brush)?pending.brush:null);
    if(requested)brushByFamily[pending.type]=requested.id;
    selectedEvents=pending.events.filter(id=>composition.events.some(e=>e.id===id));pageStart=pending.page;
  }
  pendingReturn=null;placementType=null;view='composer';erase=false;render();
  if(viewport){$('#score-scroll').scrollLeft=viewport.x;$('#score-scroll').scrollTop=viewport.y;}
}
function chooseFamily(type:string) {
  erase=false;
  const members=composition.performers.filter(p=>p.instrumentTypeId===type);
  if(!members.length){armPlacement(type,true);return;}
  if(members.length===1){selectedPerformer=brushId=members[0].id;brushByFamily[type]=brushId;familyMenu=null;}
  else familyMenu=familyMenu===type?null:type;
  erase=false;render();
}
function stamp(pitch:number,beat:number) {
  if(view!=='composer')return;
  const p=performer(brushId);
  if(!p){notice('Place an instrument before writing its notes.');return;}
  if(getInstrument(composition.assetSetId,p.instrumentTypeId).percussion)pitch=60;
  edit(c=>addEvent(c,{performerId:p.id,pitch,startBeat:beat,durationBeats:1/c.editSubdivision,velocity:.8}));
}
function renderPalette() {
  const palette=$('#placement-palette');palette.replaceChildren();
  const families=$('#family-row');families.replaceChildren();
  for(const info of getInstruments(composition.assetSetId)) {
    const tile=button(info.name,()=>armPlacement(info.id),'instrument-tile');
    const image=el('img');image.src=info.portrait;image.alt='';image.draggable=false;
    tile.prepend(image);tile.setAttribute('aria-pressed',String(placementType===info.id));tile.setAttribute('aria-label',`Place ${info.name}`);
    tile.draggable=true;tile.addEventListener('dragstart',e=>{placementType=info.id;e.dataTransfer?.setData('text/plain',info.id);renderIntent();sphere.update(composition,{performance:false,selectedId:selectedPerformer,placementType});});
    palette.append(tile);
    const members=composition.performers.filter(p=>p.instrumentTypeId===info.id);
    const active=performer(brushId)?.instrumentTypeId===info.id;
    const stampButton=button('',()=>chooseFamily(info.id),`family-tile${members.length?'':' unplaced'}`,members.length?`${info.name}, ${members.length} placed`:`Place ${info.name}`);
    const picture=el('img');picture.src=info.portrait;picture.alt='';picture.draggable=false;
    stampButton.append(picture,el('span','family-name',info.name));
    stampButton.setAttribute('aria-pressed',String(active));
    stampButton.append(el('span','family-count',members.length?String(members.length):'+'));
    stampButton.draggable=members.length>0;
    stampButton.addEventListener('dragstart',e=>{
      if(members.length>1&&!performer(brushByFamily[info.id])){e.preventDefault();familyMenu=info.id;renderFamilyMenu();notice('Choose a performer before dragging its stamp.');return;}
      const id=members.find(p=>p.id===brushByFamily[info.id])?.id||members[0]?.id;
      if(id){brushId=id;brushByFamily[info.id]=id;}e.dataTransfer?.setData('text/plain',id||'');
    });
    families.append(stampButton);
  }
  renderFamilyMenu();
}
function renderFamilyMenu() {
  const menu=$('#family-menu');menu.replaceChildren();menu.hidden=!familyMenu;
  if(!familyMenu)return;
  menu.setAttribute('role','group');menu.setAttribute('aria-label',`${getInstrument(composition.assetSetId,familyMenu).name} performers`);
  for(const p of composition.performers.filter(p=>p.instrumentTypeId===familyMenu)) {
    const duplicates=composition.performers.filter(other=>locationLabel(composition,other.junctionId)===locationLabel(composition,p.junctionId)).length>1;
    const pick=button(`${targetLabel(p)}${duplicates?` · J${p.junctionId+1}`:''}`,()=>{brushId=p.id;selectedPerformer=p.id;brushByFamily[p.instrumentTypeId]=p.id;familyMenu=null;erase=false;render();},'instance-choice');
    pick.setAttribute('aria-pressed',String(brushByFamily[p.instrumentTypeId]===p.id));menu.append(pick);
  }
  const type=familyMenu;
  menu.append(button(`+ Place another ${getInstrument(composition.assetSetId,type).name}…`,()=>armPlacement(type,true),'instance-choice add-copy'));
}
function renderIntent() {
  const tray=$('#placement-intent');tray.replaceChildren();tray.hidden=!placementType&&!pendingReturn;
  if(placementType) {
    tray.append(el('strong','',composition.performers.length===16?'Band full — 16 / 16':`Place ${getInstrument(composition.assetSetId,placementType).name}`));
    tray.append(el('p','',composition.performers.length===16?'Remove a performer to make room.':'Tap an empty junction.'));
    const numeric=input('number','1','Placement junction');numeric.min='1';numeric.max='92';
    const row=el('div','numeric-placement');row.append(field('Junction',numeric),button('Place',()=>{
      const junction=Number(numeric.value)-1;
      if(!placementType)return;
      try{const next=addPerformer(composition,placementType,junction);const p=next.performers[next.performers.length-1];edit(()=>next);placementType=null;selectedPerformer=brushId=p.id;brushByFamily[p.instrumentTypeId]=p.id;pendingReturn?.newIds.push(p.id);render();}
      catch(e){notice(errorText(e));}
    }));tray.append(row,button('Cancel placement',()=>cancelPlacement(),'quiet'));
  }
  if(pendingReturn&&!placementType)tray.append(el('p','','Choose the Composer tab to continue.'));
}
function renderPerformer() {
  const tray=$('#performer-tray');tray.replaceChildren();
  const p=performer(selectedPerformer);
  if(!p){tray.append(el('p','empty-selection','Choose an instrument, then an empty junction.'));return;}
  const heading=el('div','selected-heading');
  const portrait=el('img');portrait.src=getInstrument(composition.assetSetId,p.instrumentTypeId).portrait;portrait.alt='';
  const text=el('div');text.append(el('span','eyebrow','Selected instrument'),el('h2','',performerLabel(composition,p)));
  heading.append(portrait,text);tray.append(heading);
  const name=input('text',composition.locationNames[String(p.junctionId)]||'','Location name');name.placeholder=`Junction ${p.junctionId+1}`;
  name.addEventListener('change',()=>edit(c=>renameLocation(c,p.junctionId,name.value),false));
  const move=input('number',String(p.junctionId+1),'Move to junction');move.min='1';move.max='92';
  const occupied=composition.performers.filter(other=>other.id!==p.id).map(other=>other.junctionId+1);
  move.title=`Occupied junctions: ${occupied.join(', ')||'none'}`;
  const moveRow=el('div','numeric-placement');moveRow.append(field('Junction',move),button('Move',()=>edit(c=>movePerformer(c,p.id,Number(move.value)-1))));
  const actions=el('div','item-actions');actions.append(button('Duplicate',()=>armPlacement(p.instrumentTypeId)),button('Remove',()=>requestRemove(p),'danger'));
  tray.append(field('Location name',name),moveRow,actions);
}
function renderNoteToolbar() {
  const bar=$('#note-toolbar');bar.replaceChildren();
  const selected=selectedEvents.map(id=>composition.events.find(e=>e.id===id)).filter((e):e is ScoreEvent=>!!e);
  bar.hidden=!selected.length||view==='performance';
  if(!selected.length||view==='performance')return;
  const note=selected[0],p=performer(note.performerId)!;
  bar.setAttribute('aria-label','Selected note controls');
  if(selected.length>1)bar.append(el('span','selected-count',`${selected.length} notes`));
  const pitch=input('text',pitchName(note.pitch),'Note pitch');
  pitch.addEventListener('change',()=>{
    const match=/^([a-g])([#b]?)(-?\d)$/i.exec(pitch.value.trim().replace('♯','#').replace('♭','b'));
    if(!match){notice('Use a pitch such as C4, F♯4 or B♭3.');return;}
    const midi=(Number(match[3])+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[match[1].toUpperCase()]!)+(match[2]==='#'?1:match[2].toLowerCase()==='b'?-1:0);
    edit(c=>updateEvent(c,note.id,{pitch:midi}));
  });
  bar.append(field('Pitch',pitch));
  if(composition.assetSetId==='bongo'&&!getInstrument(composition.assetSetId,p.instrumentTypeId).percussion){
    const duration=input('number',String(note.durationBeats),'Note duration beats');duration.min='.015625';duration.step='any';
    duration.onchange=()=>edit(c=>updateEvent(c,note.id,{durationBeats:Number(duration.value)}));bar.append(field('Beats',duration));
  }
  const velocity=input('range',String(note.velocity),'Note volume');velocity.min='0';velocity.max='1';velocity.step='.01';
  velocity.onchange=()=>edit(c=>updateEvent(c,note.id,{velocity:Number(velocity.value)}));
  const assignment=el('select');assignment.setAttribute('aria-label','Note performer');
  for(const candidate of composition.performers)assignment.append(option(candidate.id,targetLabel(candidate)));
  assignment.value=p.id;assignment.onchange=()=>edit(c=>{
    const changed=selected.map(e=>({...e,performerId:assignment.value}));
    rejectAccidentalDuplicates(c.events.filter(e=>!selectedEvents.includes(e.id)),changed,selected);
    return validateComposition({...c,events:c.events.map(e=>changed.find(n=>n.id===e.id)||e)});
  });bar.append(field('Performer',assignment));
  bar.append(field('Note volume',velocity));
  const overlaps=composition.events.filter(e=>pitchStep(e.pitch)===pitchStep(note.pitch)&&e.startBeat===note.startBeat);
  if(overlaps.length>1){const picker=el('select');picker.setAttribute('aria-label','Overlapping notes');for(const e of overlaps)picker.append(option(e.id,`${targetLabel(performer(e.performerId)!)} · ${pitchName(e.pitch)}`));picker.value=note.id;picker.onchange=()=>{selectedEvents=[picker.value];renderNoteToolbar();renderScore();};bar.append(field(`${overlaps.length} overlapping notes`,picker));}
  bar.append(button('Show on sphere',()=>{selectedPerformer=p.id;view='placement';render();sphere.reveal(p.id);}),button('Erase',()=>{edit(c=>removeEvents(c,selectedEvents));selectedEvents=[];render();},'danger'),button('×',()=>{selectedEvents=[];renderNoteToolbar();renderScore();},'quiet','Deselect notes'));
}
function renderScore(){score.set(composition,{performance:view==='performance',selectedIds:selectedEvents,brushId,erase,pageStart,zoom:scoreZoom});}
function render() {
  root.dataset.view=view;root.dataset.theme=composition.appearance;
  const transportElement=$('.transport'),transportParent=view==='performance'?$('#performance-transport-slot'):$('.workspace');
  if(transportElement.parentElement!==transportParent)transportParent.append(transportElement);
  document.documentElement.style.colorScheme='light';
  $('#composition-title').setAttribute('value',composition.title);$<HTMLInputElement>('#composition-title').value=composition.title;
  for(const node of document.querySelectorAll<HTMLButtonElement>('.view-nav button'))node.setAttribute('aria-pressed',String(node.dataset.view===view));
  for(const count of document.querySelectorAll('.band-count'))count.textContent=`${composition.performers.length} / 16`;
  $<HTMLSelectElement>('#asset-set').value=composition.assetSetId;
  $<HTMLInputElement>('#tempo').value=String(composition.tempo);$<HTMLInputElement>('#master-volume').value=String(composition.masterVolume);
  $<HTMLSelectElement>('#edit-grid').value=String(composition.editSubdivision);
  $('#stamp-tool').setAttribute('aria-pressed',String(!erase));$('#erase-tool').setAttribute('aria-pressed',String(erase));
  $('#loop').setAttribute('aria-pressed',String(loop));
  $('#slow-rotate').setAttribute('aria-pressed',String(slowRotate));
  $('#zoom-value').textContent=`${Math.round(scoreZoom*100)}%`;
  $<HTMLButtonElement>('#zoom-out').disabled=scoreZoom<=.65;$<HTMLButtonElement>('#zoom-in').disabled=scoreZoom>=1.75;
  $<HTMLButtonElement>('#undo').disabled=!history.canUndo;$<HTMLButtonElement>('#redo').disabled=!history.canRedo;
  const p=performer(brushId);const stamp=$('#current-stamp');stamp.replaceChildren();
  if(p){stamp.append(el('span','',targetLabel(p)));stamp.append(button('⌄',()=>{familyMenu=familyMenu===p.instrumentTypeId?null:p.instrumentTypeId;renderFamilyMenu();},'stamp-details','Choose performer or place another'));}
  else stamp.append(el('span','','Choose a placed instrument to stamp'));
  $('#sphere-hint').textContent=view==='performance'?'':placementType?`Place ${getInstrument(composition.assetSetId,placementType).name} · choose an empty junction`:'Drag the background to turn the planet';
  renderPalette();renderIntent();renderPerformer();renderNoteToolbar();
  if(view==='library')renderLibrary();
  sphere.update(composition,{performance:view==='performance',selectedId:selectedPerformer,placementType:view==='placement'?placementType:null});
  renderScore();updateTransport();
}
function updateTransport(snapshot=transport.snapshot()) {
  $('#play').textContent=loading?'Loading…':snapshot.playing?'Ⅱ Pause':'▶ Play';
  $('#play').setAttribute('aria-label',snapshot.playing?'Pause':'Play');
  $<HTMLButtonElement>('#play').disabled=loading;
  const beatsPerBar=composition.meter[0]*4/composition.meter[1];
  $('#position').textContent=`${Math.floor(snapshot.position/beatsPerBar)+1} : ${Math.floor(snapshot.position%beatsPerBar)+1}`;
  if(view==='performance'){
    const span=beatsPerBar*(matchMedia('(max-width:600px)').matches?1:2);
    const nextPage=Math.floor(snapshot.position/span)*span;
    if(nextPage!==pageStart){pageStart=nextPage;renderScore();}
  }
  score.updatePosition(snapshot.position,snapshot.playing);
  const span=view==='performance'?score.span:16;
  $('#page-label').textContent=`Beats ${pageStart+1}–${Math.min(composition.lengthBeats,pageStart+span)}`;
  $<HTMLButtonElement>('#page-back').disabled=pageStart<=0;$<HTMLButtonElement>('#page-next').disabled=pageStart+span>=composition.lengthBeats;
}
function openDialog(title:string) {$('#dialog-title').textContent=title;const body=$('#dialog-body');body.replaceChildren();if(!$<HTMLDialogElement>('#app-dialog').open)$<HTMLDialogElement>('#app-dialog').showModal();return body;}
function closeDialog() {$<HTMLDialogElement>('#app-dialog').close();}
function requestRemove(p:Performer) {
  const affected=composition.events.filter(e=>e.performerId===p.id).length;
  if(!affected){edit(c=>removePerformer(c,p.id,'notes'));return;}
  const body=openDialog(`Remove ${performerLabel(composition,p)}?`);
  body.append(el('p','',`${affected} notes belong to this performer.`));
  const alternatives=composition.performers.filter(other=>other.id!==p.id&&other.instrumentTypeId===p.instrumentTypeId);
  if(alternatives.length){const select=el('select');select.setAttribute('aria-label','Reassign notes to');select.append(option('','Choose a performer…'));for(const other of alternatives)select.append(option(other.id,targetLabel(other)));const reassign=button('Reassign notes and remove',()=>{if(!select.value){notice('Choose the performer that should keep these notes.');return;}edit(c=>removePerformer(c,p.id,{reassignTo:select.value}));closeDialog();});body.append(select,reassign);}
  body.append(button(`Remove performer and ${affected} notes`,()=>{edit(c=>removePerformer(c,p.id,'notes'));closeDialog();},'danger'),button('Cancel',closeDialog));
}
function renderLibrary() {
  const collection=$('#library-collection');collection.replaceChildren();
  const entries=LIBRARY.filter(entry=>libraryFilter==='all'||entry.assetSetId===libraryFilter);
  $('#library-count').textContent=`${LIBRARY.length} compositions · all Favorites and Mario Paint demos`;
  const filters=$('#library-filters');filters.replaceChildren();
  for(const [id,label] of [['all','All'],['bongo','Bongo Planet'],['mario','Mario Paint']] as const){const choice=button(label,()=>{libraryFilter=id;renderLibrary();});choice.setAttribute('aria-pressed',String(libraryFilter===id));filters.append(choice);}
  let group='',grid=el('div');
  for(const entry of entries){
    if(group!==entry.group){group=entry.group;collection.append(el('h2','library-group',group));grid=el('div','library-grid');collection.append(grid);}
    const card=button('',()=>replace(entry.composition,`Opened ${entry.title}`),'composition-card');card.dataset.libraryId=entry.id;
    const preview=el('div','composition-preview');
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','-115 -104 230 208');svg.setAttribute('aria-hidden','true');
    const shape=(tag:string,attrs:Record<string,string|number>)=>{const node=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,String(v));return node;};
    svg.append(shape('circle',{cx:0,cy:0,r:87,fill:'#6069e2',stroke:'#9da6ef','stroke-width':1}));
    for(const [a,b] of topology.edges){const p=topology.vertices[a],q=topology.vertices[b];if(p[1]>.12||q[1]>.12)continue;svg.append(shape('line',{x1:p[0]*87,y1:-p[2]*87,x2:q[0]*87,y2:-q[2]*87,stroke:'#c6cdff','stroke-opacity':.35,'stroke-width':.7}));}
    for(const p of entry.composition.performers){const point=topology.vertices[p.junctionId],image=getInstrument(entry.assetSetId,p.instrumentTypeId).portrait;svg.append(shape('image',{href:image,x:point[0]*87-13,y:-point[2]*87-13,width:26,height:26}));}
    preview.append(svg);
    const info=el('div','composition-card-info');info.append(el('span','composition-set',entry.assetSetId==='mario'?'Mario Paint':'Bongo Planet'),el('h3','',entry.title),el('p','',`${entry.composition.performers.length} ${entry.composition.performers.length===1?'instrument':'instruments'} · ${entry.composition.events.length} notes`));
    const footer=el('div','composition-card-footer');footer.append(el('span','',entry.layoutName),el('span','','Open →'));
    card.append(preview,info,footer);grid.append(card);
  }
}
function download() {
  const blob=new Blob([JSON.stringify(composition,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const anchor=el('a');anchor.href=url;anchor.download=`${composition.title.replace(/[^\p{L}\p{N}_-]+/gu,'-')||'Untitled'}-Philharmonic.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('JSON exported');
}
function duplicateSelection() {
  const notes=composition.events.filter(e=>selectedEvents.includes(e.id));
  if(!notes.length){notice('Select a note first. Shift-click selects more.');return;}
  const start=Math.min(...notes.map(e=>e.startBeat)),end=Math.max(...notes.map(e=>e.startBeat+e.durationBeats));
  const offset=Math.max(1/composition.editSubdivision,end-start);
  edit(c=>{
    const events=notes.map(e=>({...e,id:newId(),startBeat:e.startBeat+offset}));
    rejectAccidentalDuplicates(c.events,events,notes);
    const length=Math.max(c.lengthBeats,...events.map(e=>e.startBeat+e.durationBeats));
    return validateComposition({...c,lengthBeats:length,loopRange:[c.loopRange[0],c.loopRange[1]===c.lengthBeats?length:c.loopRange[1]],events:[...c.events,...events]});
  });
}
function rejectAccidentalDuplicates(existing:ScoreEvent[],changed:ScoreEvent[],original:ScoreEvent[]=changed) {
  const same=(a:ScoreEvent,b:ScoreEvent)=>a.performerId===b.performerId&&a.pitch===b.pitch&&Math.abs(a.startBeat-b.startBeat)<1e-9;
  for(let i=0;i<changed.length;i++)if(existing.some(e=>same(e,changed[i]))||changed.slice(0,i).some((e,j)=>same(e,changed[i])&&!same(original[j],original[i])))throw Error('This edit would duplicate a note already at that pitch and time.');
}
function inspectNotes(offset=0) {
  const body=openDialog('Inspect notes');
  const ordered=composition.events.map((event,index)=>({event,index})).sort((a,b)=>a.event.startBeat-b.event.startBeat||a.index-b.index);
  const controls=el('div','two-fields');
  const previous=button('← Previous 100',()=>inspectNotes(offset-100));previous.disabled=offset===0;
  const next=button('Next 100 →',()=>inspectNotes(offset+100));next.disabled=offset+100>=ordered.length;
  controls.append(previous,next);body.append(el('p','',`${ordered.length} notes · ${ordered.length?offset+1:0}–${Math.min(offset+100,ordered.length)}`),controls);
  for(const {event} of ordered.slice(offset,offset+100))body.append(button(`${pitchName(event.pitch)} · beat ${Number(event.startBeat.toFixed(6))} · ${targetLabel(performer(event.performerId)!)}`,()=>{
    selectedEvents=[event.id];view='composer';pageStart=Math.floor(event.startBeat/16)*16;closeDialog();render();
  },'instance-choice'));
}
function openMore() {
  const body=openDialog('More');
  const fileActions=el('div','more-actions');
  fileActions.append(button('Save locally',()=>{try{localStorage.setItem(SAVED_KEY,JSON.stringify(composition));persist();notice('Composition saved locally');closeDialog();}catch{notice('Local save failed. Export JSON to keep a copy.');}}),button('Load local save',()=>{try{const raw=readPhilharmonicStorage(localStorage,'-saved');if(!raw)throw Error('No local save yet.');replace(validateComposition(JSON.parse(raw)),'Local save loaded');}catch(e){notice(errorText(e));}}),button('Export JSON',download),button('Import JSON',()=>$('#import-file').click()),button('Recover previous draft',()=>{try{const raw=readPhilharmonicStorage(localStorage,'-recovery');if(!raw)throw Error('No replaced draft to recover yet.');replace(validateComposition(JSON.parse(raw)),'Previous draft recovered');}catch(e){notice(errorText(e));}}));
  body.append(el('h3','','Files'),fileActions);
  const title=input('text',composition.title,'Composition title in More');title.maxLength=180;title.onchange=()=>edit(c=>({...c,title:title.value}),false);
  body.append(field('Title',title));
  const theme=el('select');theme.setAttribute('aria-label','Theme');for(const [id,name] of [['original','Blue Marble'],['nebula-space','Nebula'],['firefly-garden','Fireflies']])theme.append(option(id,name));theme.value=composition.appearance;theme.onchange=()=>edit(c=>({...c,appearance:theme.value}),false);body.append(field('Theme',theme));
  const meter=el('select');meter.setAttribute('aria-label','Meter');for(const value of ['4/4','3/4','6/8','5/4','7/8'])meter.append(option(value,value));meter.value=composition.meter.join('/');meter.onchange=()=>edit(c=>({...c,meter:meter.value.split('/').map(Number) as [number,number]}));body.append(field('Meter',meter));
  const tools=el('div','more-actions');tools.append(button('Duplicate selected notes',duplicateSelection),button('Inspect notes…',()=>inspectNotes()),button('Extend four bars',()=>{const n=composition.meter[0]*16/composition.meter[1];edit(c=>({...c,lengthBeats:c.lengthBeats+n,loopRange:[c.loopRange[0],c.loopRange[1]===c.lengthBeats?c.lengthBeats+n:c.loopRange[1]]}));}),button('Score ending / erase range…',openEnding),button('Clear score',()=>{edit(c=>({...c,events:[]}));selectedEvents=[];closeDialog();}),button('New composition',()=>replace(createComposition(composition.assetSetId),'New composition')));body.append(el('h3','','Score'),tools);
  const loopStart=input('number',String(composition.loopRange[0]),'Loop start beat');loopStart.min='0';loopStart.step='any';
  const loopEnd=input('number',String(composition.loopRange[1]),'Loop end beat');loopEnd.min='0';loopEnd.step='any';
  const loopFields=el('div','two-fields');loopFields.append(field('Loop start (beat 0)',loopStart),field('Loop end',loopEnd));body.append(loopFields,button('Set loop range',()=>edit(c=>({...c,loopRange:[Number(loopStart.value),Number(loopEnd.value)]}))));
  body.append(el('p','local-save-hint','Draft autosaves on this browser after edits. Loads and New retain a recovery copy.'));
}
function openEnding() {
  const body=openDialog('Score ending / erase range');
  const length=input('number',String(composition.lengthBeats),'Score length beats');length.min='.25';length.max='32768';length.step='any';
  const shorten=button('Set ending',()=>{
    const value=Number(length.value),removed=composition.events.filter(e=>e.startBeat>=value).length;
    if(removed&&shorten.dataset.confirm!==length.value){shorten.textContent=`Set ending and remove ${removed} notes`;shorten.dataset.confirm=length.value;return;}
    edit(c=>({...c,lengthBeats:value,loopRange:[Math.min(c.loopRange[0],Math.max(0,value-.25)),Math.min(value,c.loopRange[1])],events:c.events.filter(e=>e.startBeat<value)}));closeDialog();
  });body.append(field('Length in quarter-note beats',length),shorten);
  const from=input('number',String(pageStart),'Erase from beat'),to=input('number',String(pageStart+16),'Erase to beat');from.step=to.step='any';
  body.append(el('h3','','Erase range'),field('From beat (0-based)',from),field('To beat (exclusive)',to),button('Erase range',()=>{const a=Number(from.value),b=Number(to.value);if(!(a>=0&&b>a)){notice('Choose a positive range inside the score.');return;}const ids=composition.events.filter(e=>e.startBeat>=a&&e.startBeat<b).map(e=>e.id);edit(c=>removeEvents(c,ids));notice(`${ids.length} notes erased · Undo restores them`);closeDialog();}));
}

for(const node of document.querySelectorAll<HTMLButtonElement>('.view-nav button'))node.onclick=()=>switchView(node.dataset.view as View);
$('#exit-performance').onclick=()=>switchView(previousEditor);
$('#reset-camera').onclick=()=>sphere.resetCamera();
$('#slow-rotate').onclick=()=>{slowRotate=!slowRotate;sphere.setSlowRotate(slowRotate);$('#slow-rotate').setAttribute('aria-pressed',String(slowRotate));};
$('#more-open').onclick=openMore;$('#dialog-close').onclick=closeDialog;
$<HTMLDialogElement>('#app-dialog').addEventListener('click',e=>{if(e.target===$('#app-dialog'))closeDialog();});
$<HTMLInputElement>('#composition-title').onchange=()=>edit(c=>({...c,title:$<HTMLInputElement>('#composition-title').value}),false);
$<HTMLSelectElement>('#asset-set').onchange=()=>{
  const set=$<HTMLSelectElement>('#asset-set').value as AssetSetId;
  replace(createComposition(set),`${set==='mario'?'Mario Paint':'Bongo Planet'} composition opened`);
};
$('#stamp-tool').onclick=()=>{erase=false;render();};$('#erase-tool').onclick=()=>{erase=true;render();};
$<HTMLSelectElement>('#edit-grid').onchange=()=>edit(c=>({...c,editSubdivision:Number($<HTMLSelectElement>('#edit-grid').value)}),false);
function changeZoom(delta:number){scoreZoom=Math.round(Math.max(.65,Math.min(1.75,scoreZoom+delta))*100)/100;$('#zoom-value').textContent=`${Math.round(scoreZoom*100)}%`;$<HTMLButtonElement>('#zoom-out').disabled=scoreZoom<=.65;$<HTMLButtonElement>('#zoom-in').disabled=scoreZoom>=1.75;renderScore();}
$('#zoom-out').onclick=()=>changeZoom(-.25);$('#zoom-in').onclick=()=>changeZoom(.25);
$('#page-back').onclick=()=>{pageStart=Math.max(0,pageStart-16);renderScore();updateTransport();};$('#page-next').onclick=()=>{pageStart+=16;renderScore();updateTransport();};
$('#play').onclick=async()=>{
  if(transport.snapshot().playing){transport.pause();return;}
  loading=true;updateTransport();
  try{await transport.play(composition);notice('');}catch(e){notice(errorText(e));}finally{loading=false;updateTransport();}
};
$('#stop').onclick=()=>{transport.stop();loading=false;updateTransport();};
$('#loop').onclick=()=>{const next=!loop;edit(c=>({...c,loopEnabled:next}));loop=next;transport.setLoop(loop);$('#loop').setAttribute('aria-pressed',String(loop));};
$<HTMLInputElement>('#tempo').onchange=()=>edit(c=>({...c,tempo:Number($<HTMLInputElement>('#tempo').value)}));
$<HTMLInputElement>('#master-volume').oninput=()=>transport.setVolume(Number($<HTMLInputElement>('#master-volume').value));
$<HTMLInputElement>('#master-volume').onchange=()=>edit(c=>({...c,masterVolume:Number($<HTMLInputElement>('#master-volume').value)}),false);
function travelHistory(redo=false) {
  transport.pause();loading=false;
  const oldId=composition.id;composition=redo?history.redo():history.undo();
  if(oldId!==composition.id){familyMenu=null;pendingReturn=null;placementType=null;selectedEvents=[];selectedPerformer=brushId=null;brushByFamily={};}
  loop=composition.loopEnabled??true;transport.setLoop(loop);$('#loop').setAttribute('aria-pressed',String(loop));
  reconcile();persist();render();notice(redo?'Redone':'Undone');
}
$('#undo').onclick=()=>travelHistory();$('#redo').onclick=()=>travelHistory(true);
$<HTMLInputElement>('#import-file').onchange=async()=>{
  const file=$<HTMLInputElement>('#import-file').files?.[0];if(!file)return;
  try{if(file.size>12*1024*1024)throw Error('This file is too large. The score limit is 32,768 events.');const next=validateComposition(JSON.parse(await file.text()));replace(next,'JSON imported');}
  catch(e){notice(`Import failed: ${errorText(e)}`);}finally{$<HTMLInputElement>('#import-file').value='';}
};
document.addEventListener('keydown',e=>{
  if($<HTMLDialogElement>('#app-dialog').open)return;
  const target=e.target as HTMLElement;
  if(target.closest('input,select,textarea'))return;
  if(e.key==='Escape'){
    if(view==='performance')switchView(previousEditor);
    else if(familyMenu){familyMenu=null;renderFamilyMenu();}
    else cancelPlacement();return;
  }
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(view!=='performance')travelHistory(e.shiftKey);return;}
  if(e.key===' '&&!target.closest('button,[role=button],a')){e.preventDefault();$('#play').click();return;}
  if(view!=='composer'||!selectedEvents.length)return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();edit(c=>removeEvents(c,selectedEvents));selectedEvents=[];render();return;}
  if(e.key.startsWith('Arrow')){
    e.preventDefault();edit(c=>{
      const changed=c.events.filter(n=>selectedEvents.includes(n.id)).map(n=>({...n,...(e.key==='ArrowLeft'?{startBeat:Math.max(0,n.startBeat-1/c.editSubdivision)}:e.key==='ArrowRight'?{startBeat:Math.min(c.lengthBeats-1/c.editSubdivision,n.startBeat+1/c.editSubdivision)}:e.key==='ArrowUp'?{pitch:Math.min(127,n.pitch+1)}:{pitch:Math.max(0,n.pitch-1)})}));
      rejectAccidentalDuplicates(c.events.filter(n=>!selectedEvents.includes(n.id)),changed,c.events.filter(n=>selectedEvents.includes(n.id)));
      return validateComposition({...c,events:c.events.map(n=>changed.find(p=>p.id===n.id)||n)});
    });
  }
});
window.addEventListener('resize',()=>{renderScore();});
window.addEventListener('beforeunload',()=>transport.dispose());
render();if(startupMessage)notice(startupMessage);
// Visual feedback reads the audio clock; it never dispatches a sounding event.
function animateTransport(){updateTransport();requestAnimationFrame(animateTransport);}
requestAnimationFrame(animateTransport);
// Read-only presentation diagnostics for local acceptance; mutation stays in the UI/model.
Object.defineProperty(window,'__bongoPhilharmonic',{value:{get composition(){return structuredClone(composition);},get view(){return view;},get brushId(){return brushId;},get selectedEvents(){return [...selectedEvents];},get transport(){return transport.snapshot();},sphere},configurable:true});
