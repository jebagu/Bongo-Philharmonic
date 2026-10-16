import type { Vec3 } from './contracts';
export const dot=(a:Vec3,b:Vec3)=>a.reduce((s,x,i)=>s+x*b[i],0);
export const normalize=(a:Vec3):Vec3=>{const n=Math.hypot(...a);if(n<1e-12)throw Error('Zero vector');return a.map(x=>x/n) as Vec3;};
export const angle=(a:Vec3,b:Vec3)=>Math.acos(Math.max(-1,Math.min(1,dot(a,b))));
export const cross=(a:Vec3,b:Vec3):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export interface Topology{vertices:Vec3[];faces:[number,number,number][];edges:[number,number][];neighbors:number[][]}
export function makeTopology():Topology {
 const t=(1+Math.sqrt(5))/2;
 const ico:Vec3[]=[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].map(p=>normalize(p as Vec3));
 const base=[[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
 const vertices:Vec3[]=[],faces:[number,number,number][]=[],unique=new Map<string,number>();
 for(const [ai,bi,ci] of base){const grid=new Map<string,number>();
  for(let i=0;i<=3;i++)for(let j=0;j<=3-i;j++){const p=normalize(ico[ai].map((a,n)=>(a*(3-i-j)+ico[bi][n]*i+ico[ci][n]*j)/3) as Vec3);const key=p.map(x=>Math.round(x*1e9)).join(',');let id=unique.get(key);if(id===undefined){id=vertices.length;unique.set(key,id);vertices.push(p);}grid.set(`${i},${j}`,id);}
  const v=(i:number,j:number)=>grid.get(`${i},${j}`)!;
  for(let i=0;i<3;i++)for(let j=0;j<3-i;j++){faces.push([v(i,j),v(i+1,j),v(i,j+1)]);if(j<2-i)faces.push([v(i+1,j),v(i+1,j+1),v(i,j+1)]);}
 }
 const e=new Map<string,[number,number]>();for(const [a,b,c] of faces)for(const pair of [[a,b],[b,c],[c,a]]){pair.sort((x,y)=>x-y);e.set(pair.join(','),pair as [number,number]);}
 const edges=[...e.values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),neighbors=vertices.map(()=>[] as number[]);
 for(const [a,b] of edges){neighbors[a].push(b);neighbors[b].push(a);}neighbors.forEach(n=>n.sort((a,b)=>a-b));return {vertices,faces,edges,neighbors};
}
export const topology=makeTopology();
export function surfacePoint(a:Vec3,b:Vec3,t:number):Vec3 {
 if(t<=0)return [...a];if(t>=1)return [...b];const d=dot(a,b);
 if(d>0.999999)return normalize(a.map((x,i)=>x+(b[i]-x)*t) as Vec3);
 const tangent=normalize(d<-0.999999?cross(a,Math.abs(a[0])<0.8?[1,0,0]:[0,1,0]):b.map((x,i)=>x-d*a[i]) as Vec3);
 const theta=Math.acos(Math.max(-1,Math.min(1,d)));return normalize(a.map((x,i)=>x*Math.cos(theta*t)+tangent[i]*Math.sin(theta*t)) as Vec3);
}
