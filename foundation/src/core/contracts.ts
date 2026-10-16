import { topology } from './geometry';
import { z } from 'zod';
import { INSTRUMENTS, INSTRUMENT_IDS, type Instrument } from './instruments';
export const TOPOLOGY = 'icosa-3v-v1' as const;
export const LIMITS = {vertices:92,stack:4,generators:8,voices:64,bpmMin:40,bpmMax:180,pending:5376,routes:256,routeSteps:182,eventsPerSecond:2016,history:100,gatedEdges:256,gatedArrivals:2016,gatedQuantum:64,eventBacklog:2048} as const;
const num=(min:number,max:number)=>z.number().finite().min(min).max(max);
const labelPattern = new RegExp(`^(Generator|${INSTRUMENTS.map(i => i.name).join('|')}) [1-9][0-9]{0,5}$`);
const common={label:z.string().regex(labelPattern).optional(),id:z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),vertex:z.number().int().min(0).max(91)};
export const generatorSchema=z.object({...common,kind:z.literal('generator'),period:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(6),z.literal(8)]),phase:num(0,0.999999),reach:num(0,180),enabled:z.boolean(),travel:num(0.25,0.75).optional(),path:z.array(z.number().int().min(0).max(91)).min(2).max(182).optional()}).strict();
export const GATED_GENERATOR_PERIODS = [1,2,3,4,6,8,12,16,24,32] as const;
export const noteSchema=z.object({...common,kind:z.literal('note'),degree:z.number().int().min(0).max(6),octave:z.number().int().min(2).max(6),timbre:z.enum(['sine','triangle']),instrument:z.enum(INSTRUMENT_IDS).optional(),duration:num(0.05,8),level:num(0,1)}).strict();
export const beatSchema=z.object({...common,kind:z.literal('beat'),sound:z.enum(['kick','hat','snare']),decay:num(0.03,4),level:num(0,1)}).strict();
export const pieceSchema=z.discriminatedUnion('kind',[generatorSchema,noteSchema,beatSchema]);
export const settingsSchema=z.object({bpm:num(40,180),key:z.number().int().min(0).max(11),scale:z.enum(['major','minor','pentatonic']),travel:num(0.25,0.75),quantization:z.union([z.literal(0),z.literal(0.125),z.literal(0.25)]),volume:num(0,1),propagation:z.enum(['routes','radial']).optional()}).strict();
export const travelLimitSchema=z.union([z.number().int().positive().max(Number.MAX_SAFE_INTEGER),z.literal('infinite')]);
export type TravelLimit=z.infer<typeof travelLimitSchema>;
const gatedGeneratorSchema=generatorSchema.extend({period:z.union(GATED_GENERATOR_PERIODS.map(value=>z.literal(value))),travel:travelLimitSchema}).strict();
const gatedPieceSchema=z.discriminatedUnion('kind',[gatedGeneratorSchema,noteSchema,beatSchema]);
const wiringSchema=z.array(z.object({vertex:z.number().int().min(0).max(91),exits:z.array(z.number().int().min(0).max(91)).max(6)}).strict()).max(92);
const legacySceneSchema=z.object({version:z.literal(1),topology:z.literal(TOPOLOGY),settings:settingsSchema,pieces:z.array(pieceSchema).max(92)}).strict();
export const gatedSceneSchema=z.object({version:z.literal(2),topology:z.literal(TOPOLOGY),settings:settingsSchema.extend({propagation:z.literal('gated')}),pieces:z.array(gatedPieceSchema).max(92),wiring:wiringSchema}).strict();
export const sceneSchema=z.discriminatedUnion('version',[legacySceneSchema,gatedSceneSchema]).superRefine((s,ctx)=>{
 const ids=new Set<string>();
 for(const p of s.pieces){if(p.kind==='generator'&&p.path){if(p.path[0]!==p.vertex)ctx.addIssue({code:'custom',message:'Song path must start at its generator'});for(let i=1;i<p.path.length;i++)if(!topology.neighbors[p.path[i-1]].includes(p.path[i]))ctx.addIssue({code:'custom',message:'Song path must follow neighboring vertices'});}if(ids.has(p.id))ctx.addIssue({code:'custom',message:'Duplicate piece ID'});ids.add(p.id);}
 for(const vertex of new Set(s.pieces.map(p=>p.vertex))){const stack=s.pieces.filter(p=>p.vertex===vertex);if(stack.length>LIMITS.stack)ctx.addIssue({code:'custom',message:`At most ${LIMITS.stack} instruments can share a junction`});if(stack.length>1&&stack.some(p=>p.kind==='generator'))ctx.addIssue({code:'custom',message:'Generators need their own junction'});}
 if(s.pieces.filter(p=>p.kind==='generator').length>8)ctx.addIssue({code:'custom',message:'At most 8 generators are supported'});
 if(s.version===2){for(const p of s.pieces)if(p.kind==='generator'&&p.path)ctx.addIssue({code:'custom',message:'Gated sources cannot bypass switches with a song path'});const vertices=new Set<number>();for(const record of s.wiring){if(vertices.has(record.vertex))ctx.addIssue({code:'custom',message:'Duplicate wiring junction'});vertices.add(record.vertex);if(new Set(record.exits).size!==record.exits.length)ctx.addIssue({code:'custom',message:'Duplicate directed exit'});for(const exit of record.exits)if(!topology.neighbors[record.vertex].includes(exit))ctx.addIssue({code:'custom',message:'Gate must follow a neighboring strut'});}}
});
export type Piece=z.infer<typeof pieceSchema>|z.infer<typeof gatedPieceSchema>;
export type Wiring=z.infer<typeof wiringSchema>;
// A common editing shape keeps existing musical fields available to legacy clients.
// validateScene is the authority for the two distinct on-disk contracts.
export type Scene={version:1|2;topology:typeof TOPOLOGY;settings:Omit<z.infer<typeof settingsSchema>,'propagation'>&{propagation?:'radial'|'routes'|'gated'};pieces:Piece[];wiring?:Wiring};
export type Generator=Extract<Piece,{kind:'generator'}>;
export type SoundPiece=Exclude<Piece,Generator>;
export type Vec3=[number,number,number];
export type Sound={kind:'note';frequency:number;timbre:'sine'|'triangle';instrument?:Instrument;duration:number;level:number}|{kind:'beat';sound:'kick'|'hat'|'snare';duration:number;level:number};
export interface Trigger {session:string;sequence:number;id:string;generatorId:string;nodeId:string;emission:number;beat:number;onset:number;angle:number;sound:Sound;position:Vec3;routeId?:string;routeStep?:number}
export interface RoutePulse {id:string;session:string;generatorId:string;emission:number;beat:number;vertices:number[];arrivals:number[];speed:number}
/** Gated passage times follow the shared beat grid; speed is derived per edge for display only. */
export interface GatedEdge {id:string;parentId?:string;session:string;generatorId:string;emissionId:string;emission:number;beat:number;from:number;to:number;departure:number;arrival:number;speed:number;hops:number;limit:TravelLimit;order:number;triggerId?:string}
export type EngineEvent={type:'trigger';trigger:Trigger}|{type:'onset';trigger:Trigger}|{type:'cancel';ids:string[];nodeIds:string[];generatorIds?:string[];reason:string}|{type:'reset';session:string;reason:string}|{type:'emission';generatorId:string;time:number;periodSeconds:number;reach:number;sourceVertex?:number}|{type:'route';route:RoutePulse}|{type:'route-stop';ids:string[];reason:string}|{type:'edge';edge:GatedEdge}|{type:'arrival';id:string;vertex:number;time:number;hops:number;generatorId:string;emissionId:string;parentId?:string}|{type:'edge-stop';ids:string[];time:number;reason:string;vertex?:number}|{type:'edit-accepted';revision:number;time:number;sequence:number};
export const defaults:Scene['settings']={bpm:120,key:0,scale:'major',travel:0.75,quantization:0.25,volume:0.65};
export const emptyLegacyScene=():Scene=>({version:1,topology:TOPOLOGY,settings:{...defaults},pieces:[]});
export const emptyScene=():Scene=>({version:2,topology:TOPOLOGY,settings:{...defaults,propagation:'gated'},pieces:[],wiring:[]});
export function newPiece<K extends Piece['kind']>(kind:K,vertex:number,id:string):Extract<Piece,{kind:K}>;
export function newPiece(kind:Piece['kind'],vertex:number,id:string):Piece {
 if(kind==='generator')return {id,vertex,kind,period:4,phase:0,reach:90,enabled:true};
 if(kind==='note')return {id,vertex,kind,degree:0,octave:4,timbre:'sine',duration:0.6,level:0.65};
 return {id,vertex,kind,sound:'kick',decay:0.25,level:0.7};
}
export function validateScene(input:unknown):Scene{return sceneSchema.parse(input);}
/** Piece array order is the stable bottom-to-top order of each instrument stack. */
export function piecesAt(scene:Scene,vertex:number,excludeId?:string):Piece[]{return scene.pieces.filter(p=>p.vertex===vertex&&p.id!==excludeId);}
export function canPlacePiece(scene:Scene,kind:Piece['kind'],vertex:number,id?:string|null):boolean{
 if(!Number.isInteger(vertex)||vertex<0||vertex>=LIMITS.vertices)return false;
 const stack=piecesAt(scene,vertex,id??undefined);
 return (id!==undefined&&id!==null||scene.pieces.length<LIMITS.vertices)&&stack.length<LIMITS.stack&&!stack.some(p=>p.kind==='generator')&&(kind!=='generator'||stack.length===0);
}
export function changeScene(scene:Scene,change:(s:Scene)=>void):Scene{const next=structuredClone(scene);change(next);return validateScene(next);}
export function movePiece(scene:Scene,id:string,vertex:number):Scene{return changeScene(scene,s=>{const p=s.pieces.find(p=>p.id===id);if(!p)throw Error('Piece not found');if(p.vertex===vertex)return;if(p.kind==='generator')delete p.path;const stacking=s.pieces.some(q=>q.vertex===vertex);p.vertex=vertex;if(stacking){s.pieces=s.pieces.filter(q=>q.id!==id);s.pieces.push(p);}});}
export function exitsAt(scene:Scene,vertex:number):number[]{return [...(scene.wiring?.find(w=>w.vertex===vertex)?.exits??[])].sort((a,b)=>a-b);}
export function setExits(scene:Scene,vertex:number,exits:number[]):Scene{return changeScene(scene,s=>{if(s.version!==2)throw Error('Make a gated copy before editing switches');const record=s.wiring!.find(w=>w.vertex===vertex);if(record)record.exits=[...exits].sort((a,b)=>a-b);else s.wiring!.push({vertex,exits:[...exits].sort((a,b)=>a-b)});s.wiring!.sort((a,b)=>a.vertex-b.vertex);});}
export function toggleGate(scene:Scene,vertex:number,exit:number):Scene{const exits=exitsAt(scene,vertex);return setExits(scene,vertex,exits.includes(exit)?exits.filter(v=>v!==exit):[...exits,exit]);}
export function placePiece(scene:Scene,piece:Piece):Scene{
 const placed=changeScene(scene,s=>{const next=structuredClone(piece);if(s.version===2&&next.kind==='generator'){next.travel=8;delete next.path;}s.pieces.push(next);});
 return placed.version===2&&piece.kind==='generator'?setExits(placed,piece.vertex,topology.neighbors[piece.vertex]):placed;
}
