import { emptyScene, setExits, validateScene, type Scene } from './contracts';
import { angle, topology } from './geometry';
import { routesForGenerator, seamDistance } from './routes';

/** Weighted adjacent shortest paths; ties visit lower vertex IDs first. */
export function shortestPath(source:number,target:number):number[]{
  const cost=topology.vertices.map(()=>Infinity),parent=cost.map(()=>-1),done=new Set<number>();cost[source]=0;
  while(done.size<92){let v=-1;for(let i=0;i<92;i++)if(!done.has(i)&&(v<0||cost[i]<cost[v]-1e-12))v=i;if(v<0||!Number.isFinite(cost[v]))break;if(v===target)break;done.add(v);for(const n of topology.neighbors[v]){const next=cost[v]+seamDistance(v,n);if(next<cost[n]-1e-12){cost[n]=next;parent[n]=v;}}}
  const path=[target];while(path[0]!==source){const p=parent[path[0]];if(p<0)throw Error('No adjacent path');path.unshift(p);}return path;
}
export function makeGatedCopy(input:Scene):Scene{
  const legacy=validateScene(input);if(legacy.version===2)return structuredClone(legacy);
  let copy:Scene={...emptyScene(),settings:{...legacy.settings,propagation:'gated'},pieces:legacy.pieces.map(piece=>piece.kind==='generator'?{...piece,travel:8,path:undefined}:{...piece})};
  const exits=new Map<number,Set<number>>();
  for(const generator of legacy.pieces)if(generator.kind==='generator'){
    const walks=legacy.settings.propagation==='routes'?routesForGenerator(generator).map(p=>p.vertices):legacy.pieces.filter(p=>p.kind!=='generator'&&angle(topology.vertices[generator.vertex],topology.vertices[p.vertex])<=generator.reach*Math.PI/180+1e-9).map(p=>shortestPath(generator.vertex,p.vertex));
    for(const walk of walks)for(let i=1;i<walk.length;i++){const set=exits.get(walk[i-1])??new Set<number>();set.add(walk[i]);exits.set(walk[i-1],set);}
  }
  for(const [vertex,list] of exits)copy=setExits(copy,vertex,[...list]);
  return validateScene(copy);
}
export function conversionPreview(scene:Scene){const copy=makeGatedCopy(scene);const splitters=copy.wiring!.filter(w=>w.exits.length>1).length;return {copy,splitters,message:`Pieces stay in place. Travel starts at 8 hops. ${splitters} junction${splitters===1?'':'s'} will split sparks. This changes the phrase; your saved original stays available.`};}
