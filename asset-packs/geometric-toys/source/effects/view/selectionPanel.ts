import { type Piece, type Scene } from '../core/contracts';
import { topology } from '../core/geometry';
import { INSTRUMENTS, isPercussion } from '../core/instruments';
import { soundFor } from '../core/engine';

export function fieldValue(key: string, value: number): string {
  if(key==='travel')return `${value} ${value===1?'hop':'hops'}`;
  if (key === 'phase' || key === 'level') return `${Math.round(value * 100)}%`;
  if (key === 'reach') return `${value}°`;
  return `${Number(value.toFixed(2))} s`;
}

function range(label: string, key: string, value: number, min: number, max: number, step: number) {
  return `<label class="control-field"><span class="field-heading"><span>${label}</span><output data-field-output="${key}">${fieldValue(key,value)}</output></span><input aria-label="${label}" data-field="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
}
function choice(label: string, key: string, value: string | number, options: {value:string|number;label:string}[], wide=false) {
  return `<label class="control-field ${wide?'full-field':''}"><span class="field-heading">${label}</span><select aria-label="${label}" data-field="${key}">${options.map(option=>`<option value="${option.value}" ${option.value===value?'selected':''}>${option.label}</option>`).join('')}</select></label>`;
}

export function selectedControls(piece: Piece, settings: Scene['settings']): string {
  if (piece.kind==='generator') return `<div class="node-controls">
    ${choice('Spark interval','period',piece.period,[1,2,3,4,6,8].map(value=>({value,label:`${value} ${value===1?'beat':'beats'}`})))}
    ${settings.propagation==='gated'?`<label class="control-field"><span>Spark travel</span><input aria-label="Spark travel" data-field="travel" type="number" min="1" step="1" max="9007199254740991" value="${piece.travel==='infinite'?'':piece.travel??8}" ${piece.travel==='infinite'?'disabled':''}></label><label class="control-field"><input aria-label="Infinite travel" data-infinite type="checkbox" ${piece.travel==='infinite'?'checked':''}> Infinite</label>`:`<div class="full-field">Legacy ${settings.propagation==='routes'?(piece.path?'saved song path':'automatic branches'):'radial pulses'}</div>`}
    <label class="full-field source-enable"><input type="checkbox" aria-label="Emit new sparks" data-field="enabled" ${piece.enabled?'checked':''}> Emit new sparks</label>
    ${settings.propagation==='gated'?'':`<div class="routing-field full-field"><span>Spark route</span><strong>${settings.propagation==='routes'?(piece.path?'Saved song path':'Automatic branches'):'Radial pulses'}</strong>${piece.path?'<button id="wander">Use automatic routes</button>':''}</div>`}
  </div>`;
  if (piece.kind!=='note') return '';
  if (isPercussion(piece.instrument)) return `<div class="node-controls">
    ${choice('Instrument','instrument',piece.instrument!,INSTRUMENTS.map(i=>({value:i.id,label:i.name})),true)}
    <p class="full-field percussion-hint">One hit at its natural pitch. Each spark plays the whole sound.</p>
    ${range('Level','level',piece.level,0,1,0.01)}
  </div>`;
  const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const notes=[0,1,2,3,4,5,6].map(degree=>{
    const sound=soundFor({...piece,degree},settings);
    const midi=sound.kind==='note'?Math.round(69+12*Math.log2(sound.frequency/440)):60;
    return {value:degree,label:names[midi%12]};
  });
  return `<div class="node-controls">
    ${choice('Instrument','instrument',piece.instrument??'piano',INSTRUMENTS.map(i=>({value:i.id,label:i.name})),true)}
    ${choice('Note','degree',piece.degree,notes)}
    ${choice('Octave','octave',piece.octave,[2,3,4,5,6].map(value=>({value,label:String(value)})))}
    ${range('Note length','duration',piece.duration,0.05,8,0.05)}
    ${range('Level','level',piece.level,0,1,0.01)}
  </div>`;
}
export function selectionNavigation(scene:Scene,vertex:number|null):string{
 const selector=`<label class="junction-picker">Select a junction<select id="junction-picker" aria-label="Select a junction"><option value="">Choose on the planet</option>${topology.vertices.map((_,v)=>`<option value="${v}" ${v===vertex?'selected':''}>Junction ${v+1}${scene.pieces.find(p=>p.vertex===v)?.label?` · ${scene.pieces.find(p=>p.vertex===v)!.label}`:''}</option>`).join('')}</select></label>`;
 return selector;
}
