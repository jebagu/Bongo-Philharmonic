import type { Composition, ScoreEvent } from './model';
import { getInstrument } from './catalog';
import { getMarioNoteOffset, getMarioPlayheadFrame } from './marioPlayhead';

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
  navigate: () => void;
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
  private staff = svgEl('g', { class: 'score-staff' });
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
  private lastPlaying = false;
  private cameraX: number | null = null;
  private viewportWidth = 1000;
  private renderBeats = 16;
  private exitStarted: number | null = null;
  private playheadOnsets: number[] = [];
  private noteReactions: { element: SVGGElement; beat: number; pixelScale: number; offset: number }[] = [];
  constructor(private host: HTMLElement, private callbacks: ScoreCallbacks) {
    host.replaceChildren(this.svg);
    host.closest('.score-scroll')?.addEventListener('scroll',()=>this.scrollScore());
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
    const cameraBeat=this.cameraX===null?null:this.cameraX/this.beatWidth;
    if(this.composition?.id!==composition.id||this.options?.performance!==options.performance||this.options?.pageStart!==options.pageStart)this.resetFollow();
    const anchor=scroll&&this.options&&!this.options.performance&&!options.performance&&oldZoom!==zoom
      ? {x:scroll.scrollLeft+scroll.clientWidth/2,y:scroll.scrollTop+scroll.clientHeight/2,beatWidth:this.beatWidth,row:this.row,top:this.top}
      : null;
    if(this.options&&(this.composition!==composition||this.options.performance!==options.performance||this.options.pageStart!==options.pageStart||oldZoom!==zoom||this.options.erase!==options.erase))this.cancelGesture();
    if (this.composition?.events !== composition.events) this.playheadOnsets = [...new Set(composition.events.map(event => event.startBeat))].sort((a,b) => a-b);
    this.composition = composition;
    this.options = {...options,zoom};
    this.left=options.performance?66:92;
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
    this.viewportWidth = Math.max(1,hostWidth(this.host)-4);
    this.width = Math.max(minimumWidth, this.viewportWidth);
    this.beatWidth = options.performance ? (this.width-this.left-35)/this.pageBeats : 112*zoom;
    if(cameraBeat!==null&&this.cameraX!==null)this.cameraX=cameraBeat*this.beatWidth;
    if (!options.performance) this.width = this.viewportWidth;
    this.viewportWidth=Math.min(this.viewportWidth,this.width);
    // A full-song scrollbar surrounds a bounded, sticky SVG render window.
    // Long compositions stay editable without rendering every note at once.
    this.host.style.width=options.performance?'100%':`${Math.max(this.width,this.left+composition.lengthBeats*this.beatWidth+40)}px`;
    this.svg.style.position=options.performance?'static':'sticky';
    this.svg.style.left='0px';
    this.percussionY = options.performance ? this.compactPitchedHeight() + 18 : this.top+(this.topStep-this.bottomStep)*this.row+45;
    const hasDrums = composition.performers.some(p=>getInstrument(composition.assetSetId,p.instrumentTypeId)?.percussion);
    this.height = options.performance ? Math.max(125,this.percussionY+(hasDrums ? 36:4)) : this.percussionY+55;
    this.svg.setAttribute('width',String(this.width));
    this.svg.setAttribute('height',String(this.height));
    this.svg.setAttribute('viewBox',`0 0 ${this.width} ${this.height}`);
    for(const [name,value]of Object.entries({'beat-width':this.beatWidth,'row-height':this.row,'score-left':this.left,'score-top':this.top,'top-step':this.topStep,'page-start':options.pageStart,'zoom':zoom}))this.svg.setAttribute(`data-${name}`,String(value));
    this.svg.classList.toggle('readonly', options.performance);
    this.svg.classList.toggle('erasing',!options.performance&&options.erase);
    this.svg.style.cursor=options.performance?'default':options.erase?eraserCursor:'crosshair';
    this.svg.setAttribute('role',options.performance?'img':'application');
    this.svg.tabIndex=options.performance?-1:0;
    this.render(hasDrums);
    this.updatePosition(this.lastPosition,this.lastPlaying);
    if(scroll&&!options.performance&&!anchor)scroll.scrollLeft=this.cameraX??options.pageStart*this.beatWidth;
    if(anchor&&scroll){
      scroll.scrollLeft=this.left+(anchor.x-this.left)*this.beatWidth/anchor.beatWidth-scroll.clientWidth/2;
      scroll.scrollTop=this.top+(anchor.y-anchor.top)*this.row/anchor.row-scroll.clientHeight/2;
      this.scrollScore(false);
    }
    if(focused&&!options.performance)for(const group of this.svg.querySelectorAll<SVGGElement>('[data-event-ids]'))if(group.dataset.eventIds!.split(',').includes(focused)){group.focus({preventScroll:true});break;}
  }
  get span() { return this.pageBeats; }
  get startBeat() { return this.options?.pageStart??0; }
  get following() { return this.cameraX!==null; }
  get visibleBeats(): [number,number] {
    if(!this.composition)return [1,this.pageBeats];
    if(this.cameraX===null)return [this.startBeat+1,Math.min(this.composition.lengthBeats,this.startBeat+this.pageBeats)];
    return [Math.max(0,Math.floor((this.cameraX-this.left)/this.beatWidth))+1,
      Math.min(this.composition.lengthBeats,Math.ceil((this.cameraX+this.viewportWidth-this.left)/this.beatWidth))];
  }
  resetFollow() { this.cameraX=null;this.exitStarted=null; }
  private scrollScore(pause=true) {
    if(!this.options||this.options.performance)return;
    const scroll=this.host.closest<HTMLElement>('.score-scroll');if(!scroll)return;
    const x=scroll.scrollLeft;
    if(Math.abs(x-(this.cameraX??this.startBeat*this.beatWidth))<1)return;
    if(pause)this.callbacks.navigate();
    this.cancelGesture();this.cameraX=x;
    const start=Math.floor(x/this.beatWidth/this.pageBeats)*this.pageBeats;
    if(this.options.pageStart!==start||this.renderBeats===this.pageBeats){this.options.pageStart=start;this.render();}
    this.updatePosition(this.lastPosition,false);
  }
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
  private render(hasDrums = this.composition.performers.some(p=>getInstrument(this.composition.assetSetId,p.instrumentTypeId)?.percussion)) {
    const comp = this.composition, opt = this.options;
    this.noteReactions = [];
    const frag = document.createDocumentFragment();
    // Keep only a small window in the SVG. Rebase it before the moving viewBox
    // reaches its edge, retaining the same screen coordinates across rebases.
    this.renderBeats=this.pageBeats+Math.ceil(this.width/this.beatWidth)+1;
    const xEnd = this.left+this.renderBeats*this.beatWidth;
    this.staff=svgEl('g',{class:'score-staff'});frag.append(this.staff);
    const line = (x1:number,y1:number,x2:number,y2:number,cls:string) =>
      (cls.includes('staff-line')||cls==='pitch-guide'?this.staff:frag).append(svgEl('line',{x1,y1,x2,y2,class:cls}));
    if (opt.performance) {
      for(const pitch of [64,67,71,74,77]) line(this.left,this.yFor(pitch),xEnd,this.yFor(pitch),'staff-line');
      this.staff.append(svgEl('text',{x:15,y:95,class:'clef'},'𝄞'));
      if(this.compactPitchedHeight()>160) {
        for(const pitch of [43,47,50,53,57]) line(this.left,this.yFor(pitch),xEnd,this.yFor(pitch),'staff-line');
        this.staff.append(svgEl('text',{x:17,y:171,class:'clef'},'𝄢'));
      }
    } else {
      for(let step=this.bottomStep;step<=this.topStep;step++) {
        const pitch=pitchAt(step), y=this.yFor(pitch);
        const mainLine=[64,67,71,74,77,43,47,50,53,57].includes(pitch);
        line(this.left,y,xEnd,y,mainLine?'staff-line':'pitch-guide');
        if(pitch%12===0) this.staff.append(svgEl('text',{x:61,y:y+4,'text-anchor':'end',class:'pitch-label'},pitchName(pitch)));
      }
      this.staff.append(svgEl('text',{x:7,y:this.yFor(71)+14,class:'clef'},'𝄞'));
      if(this.bottomStep<=stepOf(48))this.staff.append(svgEl('text',{x:7,y:this.yFor(50)+14,class:'clef'},'𝄢'));
    }
    if (hasDrums) {
      line(this.left,this.percussionY,xEnd,this.percussionY,'staff-line percussion-line');
      this.staff.append(svgEl('text',{x:8,y:this.percussionY+4,class:'pitch-label'},'Drums'));
    }
    const beatUnit=4/comp.meter[1], bar=comp.meter[0]*beatUnit;
    const grid = opt.performance ? 1/comp.editSubdivision : 1/comp.editSubdivision;
    const gridCount = Math.ceil(this.renderBeats/grid);
    for(let i=0;i<=gridCount;i++) {
      const beat=opt.pageStart+i*grid, x=this.left+i*grid*this.beatWidth;
      if(beat>comp.lengthBeats+1e-8)break;
      const isBar=Math.abs(beat/bar-Math.round(beat/bar))<1e-7;
      line(x,19,x,this.height-13,isBar?'bar-line':'time-guide');
      if(isBar)frag.append(svgEl('text',{x:x+5,y:15,class:'measure-label'},String(Math.floor(beat/bar)+1)));
    }
    const visible=comp.events.filter(e=>e.startBeat>=opt.pageStart-1e-8&&e.startBeat<opt.pageStart+this.renderBeats-1e-8);
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
      const size=opt.performance?25:32*this.zoom;
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
      this.noteReactions.push({ element: group, beat: event.startBeat, pixelScale: size/16, offset: 0 });
      frag.append(group);
    }
    if(groups.size>maxPictures)frag.append(svgEl('text',{x:this.left+10,y:this.height-3,class:'pitch-label'},`${visible.length} notes in this passage. Use More → Inspect notes to choose any note.`));
    this.playhead=svgEl('g',{class:'score-playhead','aria-hidden':'true'});
    this.playhead.append(svgEl('line',{x1:0,x2:0,y1:18,y2:this.height-12}));
    const mario=getMarioPlayheadFrame(this.lastPosition,false,true);
    this.playhead.append(svgEl('image',{href:mario.href,x:-mario.width/2,y:22,width:mario.width,height:mario.height,class:'mario-runner'}));
    frag.append(this.playhead);
    this.svg.replaceChildren(frag);
  }
  updatePosition(beat: number,playing=false) {
    const wasPlaying=this.lastPlaying;
    this.lastPosition=beat;
    this.lastPlaying=playing;
    if(!this.options)return;
    const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
    if(playing){
      this.exitStarted=null;
      if(this.cameraX===null)this.cancelGesture();
      const end=this.composition.loopEnabled!==false?this.composition.loopRange[1]:this.composition.lengthBeats;
      const scroll=this.host.closest<HTMLElement>('.score-scroll');
      const scrollLimit=!this.options.performance&&scroll?scroll.scrollWidth-scroll.clientWidth:Infinity;
      this.cameraX=Math.max(0,Math.min(this.left+beat*this.beatWidth-this.viewportWidth/2,
        Math.max(0,this.left+end*this.beatWidth+40-this.viewportWidth),scrollLimit));
      const start=Math.floor(this.cameraX/this.beatWidth/this.pageBeats)*this.pageBeats;
      if(this.options.pageStart!==start||this.renderBeats===this.pageBeats){
        this.options.pageStart=start;this.render();
      }
      if(scroll){
        const desired=this.options.performance?0:this.cameraX;
        if(Math.abs(scroll.scrollLeft-desired)>1)scroll.scrollLeft=desired;
      }
    }else if(wasPlaying&&beat>=this.composition.lengthBeats&&!reduced){
      this.exitStarted=performance.now();
    }
    if(beat<this.composition.lengthBeats||playing||reduced)this.exitStarted=null;
    const scale=this.options.performance ? .75 : this.options.zoom??1;
    const exitSeconds=this.exitStarted===null?0:(performance.now()-this.exitStarted)/1000;
    const visualBeat=beat+exitSeconds*240*2*scale/this.beatWidth;
    const camera=(this.cameraX??this.options.pageStart*this.beatWidth)-this.options.pageStart*this.beatWidth;
    this.svg.setAttribute('viewBox',`${camera} 0 ${this.width} ${this.height}`);
    this.staff.setAttribute('transform',`translate(${camera},0)`);
    this.svg.setAttribute('data-page-start',String(this.options.pageStart));
    this.svg.setAttribute('data-camera-x',String(this.cameraX??this.options.pageStart*this.beatWidth));
    this.svg.setAttribute('data-position',String(beat));
    this.svg.setAttribute('data-following',String(this.following));
    const x=this.left+(visualBeat-this.options.pageStart)*this.beatWidth;
    this.playhead.style.display=x<camera-40||x>camera+(this.following?this.viewportWidth:this.width)+40?'none':'';
    this.playhead.setAttribute('transform',`translate(${x},0)`);
    const mario=this.playhead.querySelector('image')!;
    for (const note of this.noteReactions) {
      const offset=getMarioNoteOffset((beat-note.beat)*this.beatWidth,note.pixelScale,playing,reduced);
      if(offset===note.offset)continue;
      if(offset)note.element.setAttribute('transform',`translate(0,${offset})`);
      else note.element.removeAttribute('transform');
      note.offset=offset;
    }
    let low=0,high=this.playheadOnsets.length;
    while(low<high){const middle=(low+high)>>>1;if(this.playheadOnsets[middle]<=beat+1e-9)low=middle+1;else high=middle;}
    const frame=getMarioPlayheadFrame(beat+exitSeconds*this.composition.tempo/60,playing||this.exitStarted!==null,reduced,{beatWidth:this.beatWidth,pixelScale:2*scale,tempo:this.composition.tempo,targetBeat:this.exitStarted===null?this.playheadOnsets[low]:undefined,previousBeat:this.playheadOnsets[low-1]??0});
    mario.setAttribute('href',frame.href);
    mario.setAttribute('width',String(frame.width));
    mario.setAttribute('height',String(frame.height));
    mario.setAttribute('x',String(-frame.width/2));
    mario.setAttribute('y',String((this.options.performance?28:40*scale)+frame.offsetY));
    mario.setAttribute('data-pose',frame.pose);
    mario.setAttribute('data-hop-distance',String(frame.hopDistance));
    mario.setAttribute('data-hop-target',frame.targetBeat===undefined?'':String(frame.targetBeat));
  }
  private coordinates(clientX:number,clientY:number) {
    const rect=this.svg.getBoundingClientRect();
    const x=(clientX-rect.left)*this.width/rect.width+this.svg.viewBox.baseVal.x,y=(clientY-rect.top)*this.height/rect.height;
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
    const x=(clientX-rect.left)*this.width/rect.width+this.svg.viewBox.baseVal.x,y=(clientY-rect.top)*this.height/rect.height;
    return x>=this.left-18&&x<=this.left+this.renderBeats*this.beatWidth+18&&y>=this.top-22&&y<this.height-15;
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
    preview.append(svgEl('line',{x1:this.left,y1:y,x2:this.left+this.renderBeats*this.beatWidth,y2:y,stroke:color,'stroke-width':1.5,'stroke-dasharray':'4 5',opacity:.45}));
    const source=[...this.svg.querySelectorAll<SVGGElement>('[data-event-ids]')].find(group=>group.dataset.eventIds!.split(',').includes(drag.id));
    if(source){
      source.classList.add('drag-source');source.style.opacity='.3';source.style.cursor='grabbing';
      const picture=source.cloneNode(true)as SVGGElement;
      for(const attribute of ['data-event-id','data-event-ids','tabindex','role','aria-label'])picture.removeAttribute(attribute);
      picture.classList.remove('drag-source');picture.style.opacity=target.valid?'1':'.55';
      picture.setAttribute('transform',`translate(${(target.beat-drag.beat)*this.beatWidth},${y-this.yFor(drag.pitch,drag.percussion)})`);
      const hit=picture.querySelector('.note-hit');
      hit?.setAttribute('style',`fill:none;fill-opacity:0;stroke:${color};stroke-width:3`);
      preview.append(picture);
    }
    const label=target.valid?`${drag.percussion?'Drums':pitchName(target.pitch)} · beat ${Number(target.beat.toFixed(3))}`:'Release on the score to move';
    const camera=this.svg.viewBox.baseVal.x;
    const labelWidth=target.valid?130:190,labelX=Math.min(camera+this.width-labelWidth-5,Math.max(camera+this.left,x+22)),labelY=Math.max(26,y-25);
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
      // Commit selection on release so a drag keeps its original note identity.
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
