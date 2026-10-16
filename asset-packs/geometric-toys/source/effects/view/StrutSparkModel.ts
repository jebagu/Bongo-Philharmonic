import type { EngineEvent, Scene, Trigger, Vec3, RoutePulse, GatedEdge } from '../core/contracts';
import { LIMITS } from '../core/contracts';
import { rerouteStrut, sampleRoute, strutRoute, routeThrough, type StrutRoute, type Surface } from './strutRoutes';

type Packet = { trigger: Trigger; path: StrutRoute; start: number; vertex: number };
type Flash = { time: number; decay: number; triggerId?: string };
export type Spark = { point: Vec3; tail: Vec3[]; generatorId: string; group: string; routeId?: string };
export const MAX_VISIBLE_SPARKS = 128;
const emissionKey = (generator: string, time: number) => `${generator}:${time}`;
const progress = (packet: Packet, time: number) => (time - packet.start) / (packet.trigger.onset - packet.start);

/** Visual state only. Arrival times are supplied by the audio engine, never recomputed. */
export class StrutSparkModel {
  private packets = new Map<string, Packet>();
  private sources = new Map<string, { vertex: number; time: number }>();
  private flashes = new Map<string, Flash[]>();
  private journeys = new Map<string, { route: RoutePulse; path: StrutRoute }>();
  private edges = new Map<string,{edge:GatedEdge;path:StrutRoute;stop?:number}>();
  private endedSessions = new Set<string>();
  private currentSession:string|null=null;
  private surface: Surface = 'curved';
  private recentHits: { routeId: string; nodeId: string; onset: number; step: number }[] = [];

  setSurface(surface: Surface) {
    if (this.surface === surface) return;
    this.surface = surface;
    for (const journey of this.journeys.values()) journey.path = routeThrough(journey.route.vertices, surface);
    // Radial-mode packets may already have been rerouted partway through an edge.
    // Preserve their current geometric path until the next emission.
  }

  event(event: EngineEvent, scene: Scene) {
    if (event.type === 'reset') { if(this.currentSession)this.endedSessions.add(this.currentSession);this.endedSessions.add(event.session);if(this.endedSessions.size>32)this.endedSessions.delete(this.endedSessions.values().next().value!);this.clear();return; }
    if(event.type==='edge'){
      if(this.endedSessions.has(event.edge.session))return;
      this.currentSession=event.edge.session;
      if(this.edges.size>=LIMITS.eventBacklog&&!this.edges.has(`${event.edge.id}:${event.edge.order}`))throw Error('Spark edge stream stalled');
      this.edges.set(`${event.edge.id}:${event.edge.order}`,{edge:event.edge,path:routeThrough([event.edge.from,event.edge.to],'seams')});return;
    }
    if(event.type==='edge-stop'){for(const entry of this.edges.values())if(event.ids.includes(entry.edge.id)&&entry.edge.departure<=event.time)entry.stop=event.time;return;}
    if(event.type==='arrival'||event.type==='edit-accepted')return;
    if (event.type === 'route') {
      if(this.endedSessions.has(event.route.session))return;
      if (this.journeys.size < LIMITS.routes && !this.journeys.has(event.route.id)) this.journeys.set(event.route.id, { route: event.route, path: routeThrough(event.route.vertices, this.surface) });
      return;
    }
    if (event.type === 'route-stop') { for (const id of event.ids) this.journeys.delete(id); return; }
    if (event.type === 'cancel') {
      for (const [id, packet] of this.packets) if (event.ids.includes(id) || event.nodeIds.includes(packet.trigger.nodeId) || event.nodeIds.includes(packet.trigger.generatorId)) this.packets.delete(id);
      for (const [id, flashes] of this.flashes) {
        if (event.nodeIds.includes(id)) this.flashes.delete(id);
        else this.flashes.set(id, flashes.filter(flash => !flash.triggerId || !event.ids.includes(flash.triggerId)));
      }
      return;
    }
    if (event.type === 'emission') {
      const generator = scene.pieces.find(p => p.id === event.generatorId && p.kind === 'generator');
      if (!generator) return;
      this.sources.set(emissionKey(event.generatorId, event.time), { vertex: event.sourceVertex ?? generator.vertex, time: event.time });
      this.flash(event.generatorId, { time: event.time, decay: 0.18 });
      return;
    }
    if(event.type!=='trigger'&&event.type!=='onset')return;
    const trigger = event.trigger;
    if(this.endedSessions.has(trigger.session))return;
    const target = scene.pieces.find(p => p.id === trigger.nodeId && p.kind !== 'generator');
    if (!target) return;
    if (event.type === 'onset') {
      this.flash(trigger.nodeId, { time: trigger.onset, decay: Math.max(0.2, Math.min(0.8, trigger.sound.duration * 0.3)), triggerId: trigger.id });
      if (trigger.routeId) {
        this.recentHits.push({ routeId: trigger.routeId, nodeId: trigger.nodeId, onset: trigger.onset, step: trigger.routeStep! });
        if (this.recentHits.length > 8) this.recentHits.shift();
      }
      return;
    }
    if (trigger.routeId) return; // A route's successive sounds never manufacture particles.
    if (this.packets.has(trigger.id) || trigger.onset <= trigger.emission || this.packets.size >= LIMITS.pending) return;
    const source = this.sources.get(emissionKey(trigger.generatorId, trigger.emission))?.vertex
      ?? scene.pieces.find(p => p.id === trigger.generatorId && p.kind === 'generator')?.vertex;
    if (source === undefined) return;
    this.packets.set(trigger.id, { trigger, path: strutRoute(source, target.vertex, this.surface), start: trigger.emission, vertex: target.vertex });
  }

  setScene(scene: Scene, time: number) {
    for (const [id, journey] of this.journeys) if (!scene.pieces.some(p => p.id === journey.route.generatorId && p.kind === 'generator')) this.journeys.delete(id);
    for (const [id, packet] of this.packets) {
      const generator = scene.pieces.find(p => p.id === packet.trigger.generatorId && p.kind === 'generator');
      const target = scene.pieces.find(p => p.id === packet.trigger.nodeId && p.kind !== 'generator');
      if (!generator || !target) { this.packets.delete(id); continue; }
      if (target.vertex !== packet.vertex && time < packet.trigger.onset) {
        packet.path = rerouteStrut(packet.path, progress(packet, time), target.vertex);
        packet.start = Math.max(time, packet.start);
        packet.vertex = target.vertex;
      }
    }
    for (const id of this.flashes.keys()) if (!scene.pieces.some(p => p.id === id)) this.flashes.delete(id);
  }

  frame(time: number, limit = MAX_VISIBLE_SPARKS) {
    const sparks: Spark[] = [], occupied = new Set<string>(), flashes = new Map<string, number>();
    let merged = 0;
    const heads: { id: string; generatorId: string; from: number; to: number; speed: number; time: number }[] = [];
    let activeEdges=0;
    for(const [key,entry] of this.edges){const {edge,path,stop}=entry;if(time>=Math.min(edge.arrival,stop??Infinity)){this.edges.delete(key);continue;}if(time<edge.departure)continue;activeEdges++;const sample=sampleRoute(path,(time-edge.departure)/(edge.arrival-edge.departure));if(heads.length<6)heads.push({id:edge.id,generatorId:edge.generatorId,from:edge.from,to:edge.to,speed:edge.speed,time});if(sparks.length<limit)sparks.push({point:sample.point,tail:this.tail(path,sample),generatorId:edge.generatorId,group:edge.emissionId,routeId:edge.id});}
    for (const [id, journey] of this.journeys) {
      const route = journey.route, end = route.arrivals.at(-1)!;
      if (time >= end) { this.journeys.delete(id); continue; }
      if (time < route.emission) continue;
      let lo = 0, hi = route.arrivals.length - 2;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (route.arrivals[mid + 1] < time) lo = mid + 1; else hi = mid; }
      const step = lo, segments = this.surface === 'seams' ? 1 : 8;
      const fraction = (time - route.arrivals[step]) / (route.arrivals[step + 1] - route.arrivals[step]);
      const fromDistance = journey.path.distances[step * segments], toDistance = journey.path.distances[(step + 1) * segments];
      const distance = fromDistance + (toDistance - fromDistance) * fraction;
      const sample = sampleRoute(journey.path, distance / journey.path.length);
      const edge = journey.path.edges[sample.segment];
      if (heads.length < 6) heads.push({ id, generatorId: route.generatorId, from: edge[0], to: edge[1], speed: route.speed, time });
      if (sparks.length >= limit) continue;
      const tail = this.tail(journey.path, sample);
      sparks.push({ point: sample.point, tail, generatorId: route.generatorId, group: id, routeId: id });
    }
    for (const [id, packet] of this.packets) {
      if (time >= packet.trigger.onset) { this.packets.delete(id); continue; }
      if (time < packet.start) continue;
      const fraction = progress(packet, time), sample = sampleRoute(packet.path, fraction);
      const edge = packet.path.edges[sample.segment];
      const group = emissionKey(packet.trigger.generatorId, packet.trigger.emission);
      // Combine only coincident sparks from the same emission moving in the same direction.
      const key = `${group}:${edge?.join(':')}:${sample.point.map(v => v.toFixed(6)).join(':')}`;
      if (occupied.has(key)) { merged++; continue; }
      occupied.add(key);
      if (sparks.length >= limit) continue;
      const tail = this.tail(packet.path, sample);
      sparks.push({ point: sample.point, tail, generatorId: packet.trigger.generatorId, group });
    }
    for (const [id, entries] of this.flashes) {
      const live = entries.filter(flash => time - flash.time < flash.decay * 6);
      if (!live.length) { this.flashes.delete(id); continue; }
      this.flashes.set(id, live);
      for (const flash of live) if (time >= flash.time) flashes.set(id, Math.max(flashes.get(id) ?? 0, Math.exp(-(time - flash.time) / flash.decay)));
    }
    for (const [key, source] of this.sources) if (time > source.time + 0.25) this.sources.delete(key);
    return { sparks, flashes, pending: this.packets.size + this.journeys.size+activeEdges, merged, heads, journeys: this.journeys.size+activeEdges, logical:activeEdges,hidden:Math.max(0,activeEdges-limit),recentHits: [...this.recentHits] };
  }

  clear() { this.packets.clear(); this.journeys.clear();this.edges.clear();this.sources.clear(); this.flashes.clear(); this.recentHits = []; }
  private tail(path: StrutRoute, sample: ReturnType<typeof sampleRoute>): Vec3[] {
    const from = Math.max(0, sample.distance - 0.10);
    const tail = [sampleRoute(path, path.length ? from / path.length : 0).point];
    for (let i = Math.max(1, sample.segment - 4); i <= sample.segment; i++) if (path.distances[i] > from) tail.push(path.points[i]);
    tail.push(sample.point);
    return tail;
  }
  private flash(id: string, value: Flash) {
    const entries = this.flashes.get(id) ?? [];
    if (value.triggerId && entries.some(flash => flash.triggerId === value.triggerId)) return;
    entries.push(value);
    this.flashes.set(id, entries);
  }
}
