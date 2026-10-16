import { type Scene,type Piece,type Generator,type Sound,type Trigger,type EngineEvent,type RoutePulse,type GatedEdge,LIMITS,emptyScene,validateScene } from './contracts';
import { angle,topology } from './geometry';
import { routesForGenerator } from './routes';
import { GatedPropagation,HOP_BEATS } from './gated';
import { isPercussion, percussionDuration, INSTRUMENT_ROOT_HZ } from './instruments';
export function delayBeats(theta:number,period:number,fraction:number,grid:number):number {
 const raw=fraction*period*theta/Math.PI;if(!grid)return raw;
 return Math.min(Math.floor(raw/grid+0.5+1e-10)*grid,(Math.ceil(period/grid)-1)*grid);
}
export function soundFor(p:Exclude<Piece,Generator>,s:Scene['settings']):Sound {
 if(p.kind==='beat')return {kind:'beat',sound:p.sound,duration:p.decay,level:p.level};
 const scale=s.scale==='major'?[0,2,4,5,7,9,11]:s.scale==='minor'?[0,2,3,5,7,8,10]:[0,2,4,7,9];
 const midi=12*(p.octave+1)+s.key+scale[p.degree%scale.length]+12*Math.floor(p.degree/scale.length);
 return {kind:'note',frequency:isPercussion(p.instrument)?INSTRUMENT_ROOT_HZ:440*2**((midi-69)/12),timbre:p.timbre,...(p.instrument?{instrument:p.instrument}:{}),duration:percussionDuration(p.instrument)??p.duration,level:p.level};
}
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x));
let nextSession=0;
export class Engine {
 scene:Scene=emptyScene();running=false;beat=0;session=`s${++nextSession}`;sequence=0;lateDrops=0;
 private time=0;private bpm=120;private started=false;private next=new Map<string,number>();private pending:Trigger[]=[];private events:EngineEvent[]=[];private tempo:{beat:number;bpm:number}|null=null;
 private routes=new Map<string,RoutePulse>();private routeSequence=0;private routeHits=0;
 private gated=new GatedPropagation();private revision=0;private acceptanceSequence=0;
 // An anchor avoids adding rounded edge durations over long Infinite circuits.
 private gridAnchor={beat:0,time:0};
 private sounded:Trigger[]=[];
 private clockQuantum=128/48000;private decisionQuantum=-1;private quantumDecisions=0;
 get pendingCount(){return this.pending.length;}
 get now(){return this.time;}
 constructor(scene:Scene=emptyScene()){this.scene=validateScene(clone(scene));this.bpm=scene.settings.bpm;}
 private join(g:Generator,includeCurrent=false){const rawOffset=g.phase*g.period;const offset=this.scene.version===2?(Math.round(rawOffset/HOP_BEATS)*HOP_BEATS)%g.period:rawOffset;const k=Math.ceil((this.beat-offset+(includeCurrent?-1e-9:1e-9))/g.period);this.next.set(g.id,Math.max(0,k)*g.period+offset);}
 private gridTime(beat:number){return this.gridAnchor.time+(beat-this.gridAnchor.beat)*60/this.bpm;}
 play(now:number){if(!Number.isFinite(now)||now<this.time-1e-8)throw Error('Clock must be finite and monotonic');if(this.running)return;this.session=`s${++nextSession}`;this.sequence=0;this.gated.reset();this.time=now;this.gridAnchor={beat:this.beat,time:now};this.running=true;for(const p of this.scene.pieces)if(p.kind==='generator'&&p.enabled)this.join(p,!this.started&&this.beat===0);this.started=true;}
 pause(now:number,reason='pause'){this.advance(now);this.running=false;this.cancel(()=>true,[],reason);this.routes.clear();this.gated.clear();this.sounded=[];this.events.push({type:'reset',session:this.session,reason});this.next.clear();}
 replace(scene:Scene,now:number,reason='load'){scene=validateScene(scene);this.pause(now,reason);this.session=`s${++nextSession}`;this.sequence=0;this.routeSequence=0;this.routeHits=0;this.gated.reset();this.started=false;this.beat=0;this.tempo=null;this.scene=clone(scene);this.bpm=scene.settings.bpm;this.time=now;this.events.push({type:'reset',session:this.session,reason});}
 update(scene:Scene,now:number){scene=validateScene(scene);if(this.scene.version===2)this.advanceGated(now,false);else this.advance(now);const old=this.scene;const removed=old.pieces.filter(p=>!scene.pieces.some(q=>q.id===p.id&&q.kind===p.kind));
  const removedIds=removed.map(p=>p.id);this.cancel(t=>removedIds.includes(t.nodeId)||removedIds.includes(t.generatorId),removed.filter(p=>p.kind!=='generator').map(p=>p.id),'delete');
  const owned=this.sounded.filter(t=>removedIds.includes(t.generatorId)).map(t=>t.id);if(owned.length)this.events.push({type:'cancel',ids:owned,nodeIds:[],reason:'delete source voices'});
  const removedSources=removed.filter(p=>p.kind==='generator').map(p=>p.id);if(removedSources.length)this.events.push({type:'cancel',ids:[],nodeIds:[],generatorIds:removedSources,reason:'delete source ownership'});
  const ended=this.gated.removeSources(removedIds);if(ended.length)this.events.push({type:'edge-stop',ids:ended,time:now,reason:'delete generator'});
  const stopped=[...this.routes.values()].filter(route=>removedIds.includes(route.generatorId)).map(route=>route.id);
  for(const id of stopped)this.routes.delete(id);
  if(stopped.length)this.events.push({type:'route-stop',ids:stopped,reason:'delete generator'});
  const modeChanged=(old.settings.propagation??'radial')!==(scene.settings.propagation??'radial');
  if(modeChanged){this.cancel(()=>true,[],'pulse behavior changed');this.routes.clear();this.gated.clear();this.sounded=[];this.events.push({type:'reset',session:this.session,reason:'pulse behavior changed'});this.session=`s${++nextSession}`;this.sequence=0;}
  this.scene=clone(scene);if(scene.settings.bpm!==old.settings.bpm){if(this.running)this.tempo={beat:Math.floor(this.beat+1e-9)+1,bpm:scene.settings.bpm};else {this.bpm=scene.settings.bpm;this.tempo=null;}}
  if(modeChanged&&scene.version===2)this.gridAnchor={beat:this.beat,time:now};
  if(!modeChanged&&scene.settings.propagation==='routes')for(const piece of scene.pieces)if(piece.kind!=='generator'){
   const previous=old.pieces.find(p=>p.id===piece.id&&p.kind===piece.kind);
   if(!previous||previous.vertex!==piece.vertex){
    this.cancel(t=>t.routeId!==undefined&&t.nodeId===piece.id,[],'moved off route visit');
    for(const route of this.routes.values())if(!this.scheduleVisits(route,piece,now))break;
   }
  }
  for(const p of old.pieces)if(p.kind==='generator'&&!scene.pieces.some(q=>q.id===p.id&&q.kind==='generator'&&q.enabled))this.next.delete(p.id);
  for(const p of scene.pieces)if(p.kind==='generator'&&p.enabled){const prev=old.pieces.find(q=>q.id===p.id);if(!prev||prev.kind!=='generator'||!prev.enabled||prev.period!==p.period||prev.phase!==p.phase||(modeChanged&&scene.version===2)){if(this.running)this.join(p);}}
  if(scene.version===2){for(const edge of this.gated.edges.values())this.reconcileEdge(edge,now);this.events.push({type:'edit-accepted',revision:++this.revision,time:now,sequence:++this.acceptanceSequence});}
 }
 private cancel(predicate:(t:Trigger)=>boolean,nodeIds:string[],reason:string){const ids=this.pending.filter(predicate).map(t=>t.id);this.pending=this.pending.filter(t=>!predicate(t));if(ids.length||nodeIds.length)this.events.push({type:'cancel',ids,nodeIds,reason});}
 advance(now:number,quantumSeconds=this.clockQuantum){if(!Number.isFinite(now)||now<this.time-1e-8)throw Error('Clock must be finite and monotonic');if(!Number.isFinite(quantumSeconds)||quantumSeconds<=0)throw Error('Invalid audio quantum');if(quantumSeconds!==this.clockQuantum){this.clockQuantum=quantumSeconds;this.decisionQuantum=-1;this.quantumDecisions=0;}if(!this.running){this.time=now;return;}
  if(this.scene.version===2){this.advanceGated(now);return;}
  if(now-this.time>0.1){this.running=false;this.lateDrops+=this.pending.length;this.pending=[];this.routes.clear();this.next.clear();this.events.push({type:'reset',session:this.session,reason:'interrupted clock'});this.time=now;return;}
  while(this.running){let boundary=Infinity;for(const b of this.next.values())boundary=Math.min(boundary,b);if(this.tempo)boundary=Math.min(boundary,this.tempo.beat);
   const seconds=(boundary-this.beat)*60/this.bpm;if(this.time+seconds>now+1e-9||!Number.isFinite(seconds))break;
   this.time+=Math.max(0,seconds);this.beat=boundary;
   if(this.tempo&&Math.abs(this.tempo.beat-boundary)<1e-8){this.bpm=this.tempo.bpm;this.tempo=null;}
   for(const g of this.scene.pieces)if(g.kind==='generator'&&g.enabled&&Math.abs((this.next.get(g.id)??Infinity)-boundary)<1e-8){this.emit(g,this.time);if(!this.running)break;this.next.set(g.id,boundary+g.period);}
  }
  if(!this.running){this.time=now;return;}this.beat+=(now-this.time)*this.bpm/60;this.time=now;
  const due=this.pending.filter(t=>t.onset<=now+1e-9).sort((a,b)=>a.onset-b.onset||a.sequence-b.sequence);this.pending=this.pending.filter(t=>t.onset>now+1e-9);
  for(const t of due){if(now-t.onset>0.02+1e-9){this.lateDrops++;this.events.push({type:'cancel',ids:[t.id],nodeIds:[],reason:'late onset dropped'});continue;}const p=this.scene.pieces.find(p=>p.id===t.nodeId);if(p){if(t.routeId){const route=this.routes.get(t.routeId);if(!route||route.vertices[t.routeStep!]!==p.vertex){this.events.push({type:'cancel',ids:[t.id],nodeIds:[],reason:'piece left route'});continue;}this.routeHits++;}this.events.push({type:'onset',trigger:{...t,position:[...topology.vertices[p.vertex]]}});}}
  for(const [id,route] of this.routes)if(now>=route.arrivals.at(-1)!+0.02)this.routes.delete(id);
 }
 private emit(g:Generator,time:number){const periodSeconds=g.period*60/this.bpm;this.events.push({type:'emission',generatorId:g.id,time,periodSeconds,reach:g.reach,sourceVertex:g.vertex});
  if(this.scene.settings.propagation==='routes'){this.emitRoutes(g,time,periodSeconds);return;}
  for(const p of this.scene.pieces)if(p.kind!=='generator'){const theta=angle(topology.vertices[g.vertex],topology.vertices[p.vertex]);if(theta>g.reach*Math.PI/180+1e-9)continue;
   const sequence=++this.sequence,t:Trigger={session:this.session,sequence,id:`${this.session}-${sequence}`,generatorId:g.id,nodeId:p.id,emission:time,beat:this.beat,onset:time+delayBeats(theta,g.period,typeof g.travel==='number'?g.travel:this.scene.settings.travel,this.scene.settings.quantization)*60/this.bpm,angle:theta,sound:soundFor(p,this.scene.settings),position:[...topology.vertices[p.vertex]]};
   if(this.pending.length>=LIMITS.pending){this.capacityStop('pending limit exceeded');return;}
   this.pending.push(t);this.events.push({type:'trigger',trigger:t});
  }
 }
 private emitRoutes(generator:Generator,time:number,periodSeconds:number){
  const plans=routesForGenerator(generator);
  const longest=Math.max(0,...plans.map(plan=>plan.length));
  if(!longest)return;
  const speed=longest/(periodSeconds*(typeof generator.travel==='number'?generator.travel:this.scene.settings.travel));
  for(const plan of plans){
   if(this.routes.size>=LIMITS.routes){this.capacityStop('route limit exceeded');return;}
   const route:RoutePulse={id:`${this.session}-r${++this.routeSequence}`,session:this.session,generatorId:generator.id,emission:time,beat:this.beat,vertices:[...plan.vertices],arrivals:plan.distances.map(distance=>time+distance/speed),speed};
   this.routes.set(route.id,route);this.events.push({type:'route',route});
   for(const piece of this.scene.pieces)if(piece.kind!=='generator'&&!this.scheduleVisits(route,piece,time-1e-9))return;
  }
 }
 private scheduleVisits(route:RoutePulse,piece:Exclude<Piece,Generator>,after:number):boolean{
  for(let step=1;step<route.vertices.length;step++)if(route.vertices[step]===piece.vertex&&route.arrivals[step]>after+1e-10){
   if(this.pending.length>=LIMITS.pending){this.capacityStop('pending limit exceeded');return false;}
   const sequence=++this.sequence;
   const trigger:Trigger={session:this.session,sequence,id:`${this.session}-${sequence}`,generatorId:route.generatorId,nodeId:piece.id,emission:route.emission,beat:route.beat,onset:route.arrivals[step],angle:angle(topology.vertices[route.vertices[0]],topology.vertices[piece.vertex]),sound:soundFor(piece,this.scene.settings),position:[...topology.vertices[piece.vertex]],routeId:route.id,routeStep:step};
   this.pending.push(trigger);this.events.push({type:'trigger',trigger});
  }
  return true;
 }
 private capacityStop(reason:string){this.running=false;this.pending=[];this.routes.clear();this.gated.clear();this.sounded=[];this.next.clear();this.events.push({type:'reset',session:this.session,reason});}
 private advanceGated(now:number,inclusive=true){
  if(!Number.isFinite(now)||now<this.time-1e-8)throw Error('Clock must be finite and monotonic');
  if(!this.running){this.time=now;return;}
  if(now-this.time>0.1+1e-9){this.capacityStop('interrupted clock');this.time=now;return;}
  try{while(this.running){
   let boundary=Infinity;for(const b of this.next.values())boundary=Math.min(boundary,b);if(this.tempo)boundary=Math.min(boundary,this.tempo.beat);
   const clockTime=this.gridTime(boundary),edge=this.gated.next();
   const due=Math.min(clockTime,edge?.arrival??Infinity);
   if(!Number.isFinite(due)||due>now+1e-10||(!inclusive&&due>=now-1e-10))break;
   // Count actual audio-quantum windows, independent of how a test or caller
   // partitions advances. A coarse valid advance may span several windows.
   const quantum=Math.floor(due/this.clockQuantum+1e-8);if(quantum!==this.decisionQuantum){this.decisionQuantum=quantum;this.quantumDecisions=0;}
   if(++this.quantumDecisions>LIMITS.gatedQuantum)throw Error('gated quantum work limit exceeded');
   this.beat=this.gridAnchor.beat+(due-this.gridAnchor.time)*this.bpm/60;this.time=due;
   // Master boundaries precede arrivals at equal times; each source uses stable ID order.
   if(clockTime<=due+1e-10){
    this.beat=boundary;if(this.tempo&&Math.abs(this.tempo.beat-boundary)<1e-8){this.bpm=this.tempo.bpm;this.tempo=null;this.gridAnchor={beat:boundary,time:due};}
    const generators=this.scene.pieces.filter((p):p is Generator=>p.kind==='generator'&&p.enabled).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
    for(const g of generators)if(Math.abs((this.next.get(g.id)??Infinity)-boundary)<1e-8){
     const children=this.gated.launch(this.scene,g,this.session,due,this.beat,this.gridTime(this.beat+HOP_BEATS));
     this.events.push({type:'emission',generatorId:g.id,time:due,periodSeconds:g.period*60/this.bpm,reach:g.reach,sourceVertex:g.vertex});
     this.commitEdges(children);this.next.set(g.id,boundary+g.period);
    }
   }else if(edge){
    this.beat=edge.beat+(edge.hops+1)*HOP_BEATS;
    this.gated.arrive(edge);
    const trigger=this.pending.find(t=>t.id===edge.triggerId);
    this.pending=this.pending.filter(t=>t.id!==edge.triggerId);
    if(trigger){this.events.push({type:'onset',trigger});this.sounded=this.sounded.filter(t=>t.onset+t.sound.duration>due);this.sounded.push(trigger);if(this.sounded.length>LIMITS.voices)this.sounded.shift();this.routeHits++;}
    this.events.push({type:'arrival',id:edge.id,vertex:edge.to,time:due,hops:edge.hops+1,generatorId:edge.generatorId,emissionId:edge.emissionId,parentId:edge.parentId});
    const {children,reason}=this.gated.continue(this.scene,edge,this.gridTime(this.beat+HOP_BEATS));
    if(reason)this.events.push({type:'edge-stop',ids:[edge.id],time:due,reason,vertex:edge.to});
    this.commitEdges(children);
   }
   if(this.events.length>LIMITS.eventBacklog)throw Error('gated event backlog exceeded');
  }}catch(error){this.capacityStop(error instanceof Error?error.message:String(error));}
  if(this.running)this.beat=this.gridAnchor.beat+(now-this.gridAnchor.time)*this.bpm/60;this.time=now;
 }
 private commitEdges(edges:GatedEdge[]){
  // Prospective split capacity is checked before any child is inserted.
  const sounds=edges.filter(e=>this.scene.pieces.some(p=>p.vertex===e.to&&p.kind!=='generator')).length;
  if(this.pending.length+sounds>LIMITS.pending)throw Error('pending limit exceeded');
  for(const edge of edges){this.reconcileEdge(edge,edge.departure);this.events.push({type:'edge',edge:{...edge}});}
 }
 private reconcileEdge(edge:GatedEdge,now:number){
  if(edge.arrival<now-1e-10)return;
  const occupant=this.scene.pieces.find(p=>p.vertex===edge.to&&p.kind!=='generator');
  const existing=this.pending.find(t=>t.id===edge.triggerId);
  if(existing&&occupant?.id===existing.nodeId)return; // Preserve already committed parameters.
  if(existing)this.cancel(t=>t.id===existing.id,[],'destination occupant changed');
  edge.triggerId=undefined;
  if(!occupant||occupant.kind==='generator')return;
  if(this.pending.length>=LIMITS.pending){this.capacityStop('pending limit exceeded');return;}
  const sequence=++this.sequence;
  const trigger:Trigger={session:this.session,sequence,id:`${this.session}-${sequence}`,generatorId:edge.generatorId,nodeId:occupant.id,emission:edge.emission,beat:edge.beat,onset:edge.arrival,angle:angle(topology.vertices[edge.from],topology.vertices[edge.to]),sound:soundFor(occupant,this.scene.settings),position:[...topology.vertices[edge.to]],routeId:edge.id,routeStep:edge.hops+1};
  edge.triggerId=trigger.id;this.pending.push(trigger);this.events.push({type:'trigger',trigger});
 }
 drain():EngineEvent[]{const events=this.events;this.events=[];return events;}
 snapshot(){return {running:this.running,beat:this.beat,time:this.time,session:this.session,pending:this.pendingCount,sequence:this.sequence,lateDrops:this.lateDrops,routeJourneys:this.routes.size,routeHits:this.routeHits,gatedEdges:this.gated.edges.size,gatedArrivals:this.gated.completed,arrivalWindow:this.gated.arrivalWindow,eventBacklog:this.events.length,editRevision:this.revision,effectiveTime:this.time};}
}
