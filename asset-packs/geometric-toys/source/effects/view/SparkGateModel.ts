import { exitsAt,type Scene } from '../core/contracts';
import { topology } from '../core/geometry';
import { strutPoints } from './strutRoutes';
import { makeGatedCopy } from '../core/gatedConversion';
export type GateMark={id:string;vertex:number;exit:number;on:boolean;selected:boolean;point:[number,number,number];from:[number,number,number];to:[number,number,number]};
export function gateMarks(scene:Scene,selected:number|null):GateMark[]{
 const routing=scene.version===2?scene:makeGatedCopy(scene);
 return topology.vertices.flatMap((_,vertex)=>topology.neighbors[vertex].map(exit=>{const [from,to]=strutPoints(vertex,exit,'seams'),normal=from.map((v,i)=>v+to[i]),length=Math.hypot(...normal);return {id:`${vertex}>${exit}`,vertex,exit,on:exitsAt(routing,vertex).includes(exit),selected:vertex===selected,point:from.map((v,i)=>v*.75+to[i]*.25+normal[i]/length*.012) as [number,number,number],from,to};}));
}
export function gateFacesCamera(mark:GateMark,direction:readonly number[]):boolean {
 const normal=mark.from.map((v,i)=>v+mark.to[i]);
 return normal.reduce((sum,n,i)=>sum+n*direction[i],0)/Math.hypot(...normal)>.08;
}
export type ProjectedGate={id:string;vertex:number;exit:number;on:boolean;x:number;y:number;visible:boolean;selected:boolean};
export function pickGate(gates:ProjectedGate[],x:number,y:number,touch=false):ProjectedGate|null{
 const eligible=gates.filter(g=>g.visible).map(g=>({...g,d:Math.hypot(x-g.x,y-g.y)})).sort((a,b)=>a.d-b.d||a.vertex-b.vertex||a.exit-b.exit);
 return eligible[0]?.d<=(touch?22:12)?eligible[0]:null;
}
