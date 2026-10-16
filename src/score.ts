import type { Composition, ScoreEvent } from './model';
import { getInstrument } from './catalog';
import { getMarioPlayheadFrame } from './marioPlayhead';

export const pitchName = (pitch: number) => `${['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch % 12]}${Math.floor(pitch / 12) - 1}`;
const naturalClasses = [0,2,4,5,7,9,11];
const stepOf = (pitch: number) => Math.floor(pitch / 12) * 7 + [0,0,1,1,2,3,3,4,4,5,5,6][pitch % 12];
export const pitchStep=stepOf;
const pitchAt = (step: number) => Math.floor(step / 7) * 12 + naturalClasses[((step % 7) + 7) % 7];
const NS = 'http://www.w3.org/2000/svg';
const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string,string|number> = {}, content?: string) => {
  const el = document.createElementNS(NS, tag);
  for (const [k,v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (content !== undefined) el.textContent = content;
  return el;
};

interface ScoreOptions {
  performance: boolean;
  selectedIds: string[];
  brushId: string | null;
  erase: boolean;
  pageStart: number;
  /** Editor presentation only; note timing and pitches never change with zoom. */
  zoom?: number;
}
interface ScoreCallbacks {
  stamp: (pitch: number, beat: number) => void;
  select: (ids: string[], extend: boolean) => void;
  move: (id: string, pitch: number, beat: number) => void;
  hover: (text: string) => void;
}
interface NoteDrag {
  id: string;
  pointerId: number;
  x: number;
  y: number;
  pitch: number;
  beat: number;
  percussion: boolean;
  moved: boolean;
  cycleId: string;
  extend: boolean;
}
const eraserCursor = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="m3 17 11-12a3 3 0 0 1 4 0l7 6a3 3 0 0 1 0 4L14 26H9l-6-6a2 2 0 0 1 0-3Z" fill="#f5a8c4" stroke="#3d4d80" stroke-width="1.7"/><path d="m9 11 11 10-6 5H9l-6-6a2 2 0 0 1 0-3Z" fill="#fff9ee" stroke="#3d4d80" stroke-width="1.7"/><path d="M3 26h22" stroke="#3d4d80" stroke-width="1.5" stroke-linecap="round"/></svg>')}") 4 22, crosshair`;

/** Staff coordinates represent pitch and exact onset; collisions stay on that point. */
export class ComposerScore {
  private svg = svgEl('svg', { role: 'application', 'aria-label': 'Music score' });
  private playhead = svgEl('g', { class: 'score-playhead', 'aria-hidden': 'true' });
  private composition!: Composition;
  private options!: ScoreOptions;
  private left = 66;
  private topStep = stepOf(84);
  private bottomStep = stepOf(48);
  private row = 15;
  private beatWidth = 112;
  private top = 46;
  private percussionY = 400;
  private pageBeats = 16;
  private width = 1900;
  private height = 470;
  private drag: NoteDrag | null = null;
  private pendingStamp:{pointerId:number,x:number,y:number,pitch:number,beat:number}|null=null;
  private dragPreview: SVGGElement | null = null;
  private lastPosition = 0;
  constructor(private host: HTMLElement, private callbacks: ScoreCallbacks) {
    host.replaceChildren(this.svg);
    this.svg.tabIndex = 0;
    this.svg.addEventListener('pointerdown', e => this.pointerDown(e));
    this.svg.addEventListener('pointermove', e => this.pointerMove(e));
    this.svg.addEventListener('pointerup', e => this.pointerUp(e));
    this.svg.addEventListener('pointercancel', () => this.cancelGesture());
    this.svg.addEventListener('lostpointercapture', () => this.cancelGesture());
    this.svg.addEventListener('keydown', e=>{
      if(e.key==='Escape'&&(this.drag||this.pendingStamp)){e.preventDefault();e.stopPropagation();this.cancelGesture();return;}
      if(this.options.performance||(e.key!=='Enter'&&e.key!==' '))return;
      const group=this.eventGroup(e.target);if(!group)return;e.preventDefault();e.stopPropagation();
      const ids=group.dataset.eventIds!.split(','),previous=this.options.selectedIds.find(id=>ids.includes(id));
      this.callbacks.select([previous?ids[(ids.indexOf(previous)+1)%ids.length]:ids[0]],e.shiftKey);
    });
    this.svg.addEventListener('dragover', e => e.preventDefault());
    this.svg.addEventListener('drop', e => {
      if (this.options.performance || !this.options.brushId) return;
      e.preventDefault();
      if(!this.insideScore(e.clientX,e.clientY))return;
      const p = this.coordinates(e.clientX, e.clientY);
      this.callbacks.stamp(p.pitch, p.beat);
    });
  }
  set(composition: Composition, options: ScoreOptions) {
    const focused=this.eventGroup(document.activeElement)?.dataset.eventId;
    const zoom=Math.max(.65,Math.min(1.75,options.zoom??1));
    const scroll=this.host.closest<HTMLElement>('.score-scroll');
    const oldZoom=this.zoom;
    const anchor=scroll&&this.options&&!this.options.performance&&!options.performance&&oldZoom!==zoom
      ? {x:scroll.scrollLeft+scroll.clientWidth/2,y:scroll.scrollTop+scroll.clientHeight/2,beatWidth:this.beatWidth,row:this.row,top:this.top}
      : null;
    if(this.options&&(this.composition!==composition||this.options.performance!==options.performance||this.options.pageStart!==options.pageStart||oldZoom!==zoom||this.options.erase!==options.erase))this.cancelGesture();
    this.composition = composition;
    this.options = {...options,zoom};
    this.pageBeats = options.performance ? composition.meter[0]*4/composition.meter[1]*(matchMedia('(max-width:600px)').matches ? 1 : 2) : 16;
    const pitched = composition.events.filter(e => {
      const p = composition.performers.find(p => p.id === e.performerId);
      return p && !getInstrument(composition.assetSetId,p.instrumentTypeId)?.percussion;
    });
    this.topStep = stepOf(Math.max(84, ...pitched.map(e=>e.pitch)));
    this.bottomStep = stepOf(Math.min(48, ...pitched.map(e=>e.pitch)));
    this.row = options.performance ? 5 : 15*zoom;
    this.top = options.performance ? 26 : 88;
    const minimumWidth = options.performance ? 300 : 1000;
    this.width = Math.max(minimumWidth, hostWidth(this.host) - 4);
    this.beatWidth = options.performance ? (this.width-this.left-35)/this.pageBeats : 112*zoom;
    if (!options.performance) this.width = this.left + this.pageBeats * this.beatWidth + 40;
    this.percussionY = options.performance ? this.compactPitchedHeight() + 18 : this.top+(this.topStep-this.bottomStep)*this.row+45;
    const hasDrums = composition.performers.some(p=>getInstrument(composition.assetSetId,p.instrumentTypeId)?.percussion);
    this.height = options.performance ? Math.max(125,this.percussionY+(hasDrums ? 36:4)) : this.percussionY+55;
    this.svg.setAttribute('width',String(this.width));
    this.svg.setAttribute('height',String(this.height));
    this.svg.setAttribute('viewBox',`0 0 ${this.width} ${this.height}`);
    for(const [name,value]of Object.entries({'beat-width':this.beatWidth,'row-height':this.row,'score-top':this.top,'top-step':this.topStep,'page-start':options.pageStart,'zoom':zoom}))this.svg.setAttribute(`data-${name}`,String(value));
    this.svg.classList.toggle('readonly', options.performance);
    this.svg.classList.toggle('erasing',!options.performance&&options.erase);
    this.svg.style.cursor=options.performance?'default':options.erase?eraserCursor:'crosshair';
    this.svg.setAttribute('role',options.performance?'img':'application');
    this.svg.tabIndex=options.performance?-1:0;
    this.render(hasDrums);
    this.updatePosition(this.lastPosition);
    if(anchor&&scroll){
      scroll.scrollLeft=this.left+(anchor.x-this.left)*this.beatWidth/anchor.beatWidth-scroll.clientWidth/2;
      scroll.scrollTop=this.top+(anchor.y-anchor.top)*this.row/anchor.row-scroll.clientHeight/2;
    }
    if(focused&&!options.performance)for(const group of this.svg.querySelectorAll<SVGGElement>('[data-event-ids]'))if(group.dataset.eventIds!.split(',').includes(focused)){group.focus({preventScroll:true});break;}
  }
  get span() { return this.pageBeats; }
  get zoom() {return this.options?.zoom??1;}
  private compactPitchedHeight() {
    const pitches = this.composition.events.filter(e => {
      const p=this.composition.performers.find(p=>p.id===e.performerId);
      return p&&!getInstrument(this.composition.assetSetId,p.instrumentTypeId)?.percussion;
    }).map(e=>e.pitch);
    return pitches.some(p=>p<59) ? 202 : 130;
  }
  private yFor(pitch: number, percussion = false) {
    if (percussion) return this.percussionY;
    if (!this.options.performance) return this.top+(this.topStep-stepOf(pitch))*this.row;
    // Two compact staves. Out-of-staff register is explicitly printed on each stamp.
    const bass = pitch < 59;
    let shown = pitch;
    if (bass) while (shown < 36) shown += 12;
    else while (shown > 81) shown -= 12;
    return bass ? 139+(stepOf(55)-stepOf(shown))*5 : 60+(stepOf(77)-stepOf(shown))*5;
  }
  private render(hasDrums: boolean) {
    const comp = this.composition, opt = this.options;
    const frag = document.createDocumentFragment();
    const xEnd = this.left+this.pageBeats*this.beatWidth;
    const line = (x1:number,y1:number,x2:number,y2:number,cls:string) => frag.append(svgEl('line',{x1,y1,x2,y2,class:cls}));
    if (opt.performance) {
      for(const pitch of [64,67,71,74,77]) line(this.left,this.yFor(pitch),xEnd,this.yFor(pitch),'staff-line');
      frag.append(svgEl('text',{x:15,y:95,class:'clef'},'𝄞'));
      if(this.compactPitchedHeight()>160) {
        for(const pitch of [43,47,50,53,57]) line(this.left,this.yFor(pitch),xEnd,this.yFor(pitch),'staff-line');
        frag.append(svgEl('text',{x:17,y:171,class:'clef'},'𝄢'));
      }
    } else {
      for(let step=this.bottomStep;step<=this.topStep;step++) {
        const pitch=pitchAt(step), y=this.yFor(pitch);
        const mainLine=[64,67,71,74,77,43,47,50,53,57].includes(pitch);
        line(this.left,y,xEnd,y,mainLine?'staff-line':'pitch-guide');
        if(pitch%12===0) frag.append(svgEl('text',{x:14,y:y+4,class:'pitch-label'},pitchName(pitch)));
      }
      frag.append(svgEl('text',{x:18,y:this.yFor(71)+14,class:'clef'},'𝄞'));
      if(this.bottomStep<=stepOf(48))frag.append(svgEl('text',{x:18,y:this.yFor(50)+14,class:'clef'},'𝄢'));
    }
    if (hasDrums) {
      line(this.left,this.percussionY,xEnd,this.percussionY,'staff-line percussion-line');
      frag.append(svgEl('text',{x:8,y:this.percussionY+4,class:'pitch-label'},'Drums'));
    }
    const beatUnit=4/comp.meter[1], bar=comp.meter[0]*beatUnit;
    const grid = opt.performance ? 1/comp.editSubdivision : 1/comp.editSubdivision;
    const gridCount = Math.ceil(this.pageBeats/grid);
    for(let i=0;i<=gridCount;i++) {
      const beat=opt.pageStart+i*grid, x=this.left+i*grid*this.beatWidth;
      if(beat>comp.lengthBeats+1e-8)break;
      const isBar=Math.abs(beat/bar-Math.round(beat/bar))<1e-7;
      line(x,19,x,this.height-13,isBar?'bar-line':'time-guide');
      if(isBar)frag.append(svgEl('text',{x:x+5,y:15,class:'measure-label'},String(Math.floor(beat/bar)+1)));
    }
    const visible=comp.events.filter(e=>e.startBeat>=opt.pageStart-1e-8&&e.startBeat<opt.pageStart+this.pageBeats-1e-8);
    // Bound SVG work. All events remain in the score; dense passages show an actionable count.
    const maxPictures=1600;
    const groups = new Map<string,ScoreEvent[]>();
    for(const e of visible) {
      const p=comp.performers.find(p=>p.id===e.performerId);
      if(!p)continue;
      const percussion=getInstrument(comp.assetSetId,p.instrumentTypeId)?.percussion??false;
      const key=`${e.startBeat}:${percussion?'drum':this.yFor(e.pitch)}`;
      const group=groups.get(key)||[];group.push(e);groups.set(key,group);
    }
    let count=0;
    const orderedGroups=[...groups.values()].sort((a,b)=>Number(b.some(e=>opt.selectedIds.includes(e.id)))-Number(a.some(e=>opt.selectedIds.includes(e.id))));
    for(const events of orderedGroups) {
      if(count++>=maxPictures)break;
      const selected=events.find(e=>opt.selectedIds.includes(e.id));
      const event=selected||events[events.length-1];
      const performer=comp.performers.find(p=>p.id===event.performerId)!;
      const info=getInstrument(comp.assetSetId,performer.instrumentTypeId)!;
      const x=this.left+(event.startBeat-opt.pageStart)*this.beatWidth;
      const y=this.yFor(event.pitch,info.percussion);
      // Extra exact-time guide for off-grid imported notes. No load-time quantization.
      if(Math.abs(event.startBeat*comp.editSubdivision-Math.round(event.startBeat*comp.editSubdivision))>1e-6)
        line(x,21,x,this.height-15,'fractional-guide');
      const group=svgEl('g',{'data-event-id':event.id,'data-event-ids':events.map(e=>e.id).join(','),class:`score-note${selected?' selected':''}${opt.brushId===performer.id?' current-performer':''}`,role:opt.performance?'img':'button',tabindex:opt.performance?-1:0,'aria-label':`${info.name} ${performer.familyNumber}, ${pitchName(event.pitch)}, beat ${Number(event.startBeat.toFixed(5))}${events.length>1?`, ${events.length} overlapping notes`:''}`});
      group.style.cursor=opt.performance?'default':opt.erase?'inherit':'grab';
      // Touches beginning on an existing note move that note. Empty staff remains scrollable.
      group.style.touchAction='none';
      group.append(svgEl('title',{},events.map(event=>`${pitchName(event.pitch)} · beat ${event.startBeat} · ${event.durationBeats} beats`).join('; ')));
      const size=opt.performance?25:29*Math.max(.85,Math.min(1.25,this.zoom));
      if(!opt.performance) group.append(svgEl('line',{x1:x,y1:y+size/2+2,x2:x+Math.max(3,event.durationBeats*this.beatWidth-3),y2:y+size/2+2,class:'duration-line'}));
      group.append(svgEl('rect',{x:x-size/2-2,y:y-size/2-2,width:size+4,height:size+4,rx:7,class:'note-hit'}));
      group.append(svgEl('image',{href:info.portrait,x:x-size/2,y:y-size/2,width:size,height:size,'pointer-events':'none'}));
      const copies=comp.performers.filter(p=>p.instrumentTypeId===performer.instrumentTypeId).length;
      if(copies>1) group.append(svgEl('text',{x:x+10,y:y+14,class:'number-badge'},String(performer.familyNumber)));
      if(events.length>1) group.append(svgEl('text',{x:x-17,y:y-11,class:'overlap-badge'},`×${events.length}`));
      if(opt.performance&&(event.pitch<36||event.pitch>81)){
        const high=event.pitch>81,octaves=Math.ceil((high?event.pitch-81:36-event.pitch)/12);
        const mark=octaves===1?(high?'8va':'8vb'):`${7*octaves+1}${high?'ma':'mb'}`;
        group.append(svgEl('text',{x,y:y+24,'text-anchor':'middle',class:'register-label'},`${mark} ${pitchName(event.pitch)}`));
      }
      if(!naturalClasses.includes(event.pitch%12))group.append(svgEl('text',{x:x-23,y:y+4,class:'accidental'},'♯'));
      frag.append(group);
    }
    if(groups.size>maxPictures)frag.append(svgEl('text',{x:this.left+10,y:this.height-3,class:'pitch-label'},`${visible.length} notes in this passage. Use More → Inspect notes to choose any note.`));
    if(comp.events.length===0&&!opt.performance)frag.append(svgEl('text',{x:this.left+40,y:75,class:'score-empty'},'Notes in the same column play together.'));
    this.playhead=svgEl('g',{class:'score-playhead','aria-hidden':'true'});
    this.playhead.append(svgEl('line',{x1:0,x2:0,y1:18,y2:this.height-12}));
    const mario=getMarioPlayheadFrame(this.lastPosition,false,true,comp.editSubdivision);
    this.playhead.append(svgEl('image',{href:mario.href,x:-mario.width/2,y:22,width:mario.width,height:mario.height,class:'mario-runner'}));
    frag.append(this.playhead);
    this.svg.replaceChildren(frag);
  }
  updatePosition(beat: number,playing=false) {
    this.lastPosition=beat;
    if(!this.options)return;
    const x=this.left+(beat-this.options.pageStart)*this.beatWidth;
    this.playhead.style.display=beat<this.options.pageStart||beat>this.options.pageStart+this.pageBeats?'none':'';
    this.playhead.setAttribute('transform',`translate(${x},0)`);
    const mario=this.playhead.querySelector('image')!;
    const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
    const frame=getMarioPlayheadFrame(beat,playing,reduced,this.composition.editSubdivision);
    const scale=this.options.performance ? .75 : 1;
    const column=beat*this.composition.editSubdivision;
    const offset=playing&&!reduced?(Math.floor(column)/this.composition.editSubdivision-beat)*this.beatWidth:0;
    mario.setAttribute('href',frame.href);
    mario.setAttribute('width',String(frame.width*scale));
    mario.setAttribute('height',String(frame.height*scale));
    mario.setAttribute('x',String(offset-frame.width*scale/2));
    mario.setAttribute('y',String((this.options.performance?16:22)+frame.offsetY*scale));
    mario.setAttribute('data-pose',frame.pose);
  }
  private coordinates(clientX:number,clientY:number) {
    const rect=this.svg.getBoundingClientRect();
    const x=(clientX-rect.left)*this.width/rect.width,y=(clientY-rect.top)*this.height/rect.height;
    const snap=1/this.composition.editSubdivision;
    const beat=Math.max(0,Math.min(this.composition.lengthBeats-snap,Math.round(((x-this.left)/this.beatWidth+this.options.pageStart)/snap)*snap));
    const step=this.topStep-Math.round((y-this.top)/this.row);
    return {pitch:Math.max(0,Math.min(127,pitchAt(step))),beat};
  }
  private eventGroup(target: EventTarget|null) { return target instanceof Element?target.closest<SVGGElement>('[data-event-id]'):null; }
  private insideScore(clientX:number,clientY:number) {
    const rect=this.svg.getBoundingClientRect();
    const scroll=this.host.closest<HTMLElement>('.score-scroll')?.getBoundingClientRect();
    const within=(r:DOMRect)=>clientX>=r.left&&clientX<=r.right&&clientY>=r.top&&clientY<=r.bottom;
    if(!within(rect)||(scroll&&!within(scroll)))return false;
    const x=(clientX-rect.left)*this.width/rect.width,y=(clientY-rect.top)*this.height/rect.height;
    return x>=this.left-18&&x<=this.left+this.pageBeats*this.beatWidth+18&&y>=this.top-22&&y<this.height-15;
  }
  private cancelGesture() {
    const pointerId=this.drag?.pointerId;
    this.drag=null;this.pendingStamp=null;
    this.dragPreview?.remove();this.dragPreview=null;
    this.svg.classList.remove('dragging');
    this.svg.style.cursor=this.options?.performance?'default':this.options?.erase?eraserCursor:'crosshair';
    for(const source of this.svg.querySelectorAll<SVGGElement>('.drag-source')){
      source.classList.remove('drag-source');source.style.opacity='';source.style.cursor='grab';
    }
    if(pointerId!==undefined&&this.svg.hasPointerCapture(pointerId))this.svg.releasePointerCapture(pointerId);
  }
  private dragTarget(e:PointerEvent) {
    const drag=this.drag!;
    const rect=this.svg.getBoundingClientRect();
    const dx=(e.clientX-drag.x)*this.width/rect.width/this.beatWidth;
    const dy=(e.clientY-drag.y)*this.height/rect.height/this.row;
    const snap=1/this.composition.editSubdivision;
    const beat=Math.max(0,Math.min(this.composition.lengthBeats-snap,Math.round((drag.beat+dx)/snap)*snap));
    const step=stepOf(drag.pitch)-Math.round(dy),accidental=drag.pitch-pitchAt(stepOf(drag.pitch));
    const pitch=drag.percussion?drag.pitch:Math.max(0,Math.min(127,pitchAt(step)+accidental));
    return {pitch,beat,valid:this.insideScore(e.clientX,e.clientY)};
  }
  private showDrag(e:PointerEvent) {
    const drag=this.drag!,target=this.dragTarget(e);
    this.dragPreview?.remove();
    const preview=svgEl('g',{class:'score-drag-preview','pointer-events':'none','aria-hidden':'true','data-pitch':target.pitch,'data-beat':target.beat,'data-valid':String(target.valid)});
    const x=this.left+(target.beat-this.options.pageStart)*this.beatWidth,y=this.yFor(target.pitch,drag.percussion);
    const color=target.valid?'#526bec':'#b96379';
    preview.append(svgEl('line',{x1:x,y1:this.top-15,x2:x,y2:this.height-15,stroke:color,'stroke-width':2,'stroke-dasharray':'4 5',opacity:.7}));
    preview.append(svgEl('line',{x1:this.left,y1:y,x2:this.left+this.pageBeats*this.beatWidth,y2:y,stroke:color,'stroke-width':1.5,'stroke-dasharray':'4 5',opacity:.45}));
    const source=[...this.svg.querySelectorAll<SVGGElement>('[data-event-ids]')].find(group=>group.dataset.eventIds!.split(',').includes(drag.id));
    if(source){
      source.classList.add('drag-source');source.style.opacity='.3';source.style.cursor='grabbing';
      const picture=source.cloneNode(true)as SVGGElement;
      for(const attribute of ['data-event-id','data-event-ids','tabindex','role','aria-label'])picture.removeAttribute(attribute);
      picture.classList.remove('drag-source');picture.style.opacity=target.valid?'1':'.55';
      picture.setAttribute('transform',`translate(${(target.beat-drag.beat)*this.beatWidth},${y-this.yFor(drag.pitch,drag.percussion)})`);
      const hit=picture.querySelector('.note-hit');
      hit?.setAttribute('style',`fill:#e0e7ff;fill-opacity:1;stroke:${color};stroke-width:3`);
      preview.append(picture);
    }
    const label=target.valid?`${drag.percussion?'Drums':pitchName(target.pitch)} · beat ${Number(target.beat.toFixed(3))}`:'Release on the score to move';
    const labelWidth=target.valid?130:190,labelX=Math.min(this.width-labelWidth-5,Math.max(this.left,x+22)),labelY=Math.max(26,y-25);
    preview.append(svgEl('rect',{x:labelX,y:labelY-18,width:labelWidth,height:27,rx:8,fill:target.valid?'#526bec':'#9f5268'}));
    preview.append(svgEl('text',{x:labelX+9,y:labelY,fill:'#fff','font-family':'DM Sans,sans-serif','font-size':11,'font-weight':600},label));
    this.dragPreview=preview;this.svg.append(preview);
    this.svg.classList.add('dragging');this.svg.style.cursor='grabbing';
    this.callbacks.hover(target.valid?label:'Move cancelled outside score');
  }
  private pointerDown(e: PointerEvent) {
    if(this.options.performance||!e.isPrimary||e.button!==0)return;
    this.cancelGesture();
    const group=this.eventGroup(e.target);
    if(group) {
      e.preventDefault();
      this.svg.focus({preventScroll:true});
      const ids=group.dataset.eventIds!.split(',');
      const previous=this.options.selectedIds.find(id=>ids.includes(id));
      const id=previous??ids[0],cycleId=previous?ids[(ids.indexOf(previous)+1)%ids.length]:id;
      if(this.options.erase){this.callbacks.select([id],false);return;}
      const event=this.composition.events.find(event=>event.id===id);
      if(!event)return;
      const performer=this.composition.performers.find(p=>p.id===event.performerId)!;
      this.drag={id,pointerId:e.pointerId,x:e.clientX,y:e.clientY,pitch:event.pitch,beat:event.startBeat,percussion:getInstrument(this.composition.assetSetId,performer.instrumentTypeId)?.percussion??false,moved:false,cycleId,extend:e.shiftKey};
      this.svg.setPointerCapture(e.pointerId);
      // Selecting can reveal the note toolbar and change the staff viewport. Defer it
      // until release so the note cannot jump away from the initial pointer grab.
    } else if(this.options.brushId&&!this.options.erase&&this.insideScore(e.clientX,e.clientY)) {
      const p=this.coordinates(e.clientX,e.clientY);
      this.pendingStamp={pointerId:e.pointerId,x:e.clientX,y:e.clientY,...p};
    }
  }
  private pointerMove(e: PointerEvent) {
    if(this.options.performance)return;
    const p=this.coordinates(e.clientX,e.clientY);
    this.callbacks.hover(`${pitchName(p.pitch)} · beat ${Number(p.beat.toFixed(3))}`);
    if(this.pendingStamp?.pointerId===e.pointerId&&Math.hypot(e.clientX-this.pendingStamp.x,e.clientY-this.pendingStamp.y)>6)this.pendingStamp=null;
    if(this.drag?.pointerId===e.pointerId){
      if(Math.hypot(e.clientX-this.drag.x,e.clientY-this.drag.y)>5)this.drag.moved=true;
      if(this.drag.moved){e.preventDefault();this.showDrag(e);}
    }
  }
  private pointerUp(e: PointerEvent) {
    if(this.options.performance)return;
    if(this.pendingStamp?.pointerId===e.pointerId){
      const p=this.pendingStamp;this.pendingStamp=null;
      if(Math.hypot(e.clientX-p.x,e.clientY-p.y)<=6&&this.insideScore(e.clientX,e.clientY))this.callbacks.stamp(p.pitch,p.beat);
    }
    if(this.drag?.pointerId!==e.pointerId)return;
    const drag=this.drag,target=this.dragTarget(e);
    this.cancelGesture();
    if(drag.moved){
      if(target.valid){
        if(target.pitch!==drag.pitch||target.beat!==drag.beat)this.callbacks.move(drag.id,target.pitch,target.beat);
        this.callbacks.select([drag.id],drag.extend);
      }
    }else this.callbacks.select([drag.cycleId],drag.extend);
  }
}
function hostWidth(host: HTMLElement) { return (host.parentElement?.clientWidth||host.clientWidth||1000)-20; }
