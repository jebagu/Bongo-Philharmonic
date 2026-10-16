import {emptyScene,newPiece,validateScene,type Scene} from './contracts';
export function gatedExample(kind:'chain'|'fork'|'loop'):Scene{
 const scene=emptyScene();scene.pieces=[{...newPiece('generator',44,'gate-source'),travel:kind==='loop'?'infinite':kind==='fork'?2:3,period:8,label:'Generator 1'},...[46,47,45].map((vertex,i)=>({...newPiece('note',vertex,`gate-note-${i}`),instrument:('piano' as const),degree:[0,2,4][i],duration:.3,label:`Piano ${i+1}`}))];
 scene.wiring=(kind==='chain'?[[44,[46]],[46,[47]],[47,[45]],[45,[]]]:kind==='fork'?[[44,[47]],[47,[45,46]],[45,[]],[46,[]]]:[[44,[46]],[46,[47]],[47,[44]]]).map(([vertex,exits])=>({vertex:vertex as number,exits:exits as number[]}));
 return validateScene(scene);
}
