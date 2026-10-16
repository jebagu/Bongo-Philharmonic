import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/manrope/latin-800.css';
import './style.css';
import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { topology, toRenderPoint, createFacetedPlanet, createToy, DEFAULT_APPEARANCE, NorthPole, INSTRUMENTS, generatorPortrait, type Instrument } from './project-resources';
import manifest from '../asset-packs/mario-paint/manifest.json';

type SetId = 'bongo' | 'mario';
type Voice = { id: string; name: string; set: SetId; portrait: string; wav: string; model?: string };
type Placed = { voice: Voice; junction: number; group: THREE.Group; attack: number };
const base = import.meta.env.BASE_URL;
const pack = `${base}asset-packs/mario-paint/`;
const bongo: Voice[] = INSTRUMENTS.map(i => ({ id: i.id, name: i.name, set: 'bongo', portrait: `${base}art/geometric-toys/${i.id}-portrait.png`, wav: base + i.samples[0] }));
const mario: Voice[] = manifest.instruments.map(i => ({ id: i.id, name: i.name, set: 'mario', portrait: pack + i.sprite, wav: pack + i.notes[1].wav, model: pack + i.model }));
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `
  <main>
    <aside class="palette" aria-label="Instrument controls">
      <h1>Bongo Planet</h1>
      <section class="instruments"><h2>Instruments</h2>
        <label class="set-label" for="sound-set">Sound set</label>
        <select id="sound-set"><option value="bongo">Bongo Planet</option><option value="mario" selected>Mario Paint</option></select>
        <button id="generator" class="generator"><img src="${generatorPortrait}" alt=""><span>Generator</span><small>Available in both sets</small></button>
        <div class="palette-caption"><span id="palette-label">Mario Paint</span><span id="voice-count">15 instruments</span></div>
        <div id="pieces" class="pieces" aria-label="Instrument palette"></div>
        <p class="palette-help">Choose an instrument to hear it.<br>Click a dot on the planet to place it.</p>
      </section>
      <button id="play" class="primary">Play preview</button>
      <section class="selected"><img id="selected-image" alt=""><div><span class="eyebrow">Ready to place</span><h2 id="selected-name">Mario</h2><p id="selected-sound">Mallet / xylophone</p></div><button id="audition" aria-label="Hear selected instrument">Hear</button></section>
      <section class="mix"><h2>Mix</h2><label for="volume">Volume <output id="volume-value">45%</output></label><input id="volume" type="range" min="0" max="1" step="0.01" value="0.45"></section>
      <p class="set-explanation">Switching sets changes the palette.<br>Pieces on your planet keep their sounds.</p>
    </aside>
    <section class="stage" aria-label="Sound set placement preview">
      <div class="view-controls"><button id="reset">Reset view</button><button id="rotate" aria-pressed="false">Slow rotate</button></div>
      <div id="sphere"></div>
      <div class="concept-note"><span>Sound set concept</span><p>Original toys. A pixel orchestra. One planet.</p></div>
      <p id="status" role="status" aria-live="polite">Try switching between Bongo Planet and Mario Paint.</p>
    </section>
  </main>`;

let activeSet: SetId = 'mario';
let brush: Voice | null = mario[0];
let generatorBrush = false;
let selectedVoice = mario[0];
let audio: AudioContext | undefined;
let volume = .45;
const buffers = new Map<string, Promise<AudioBuffer>>();
const sources = new Set<AudioBufferSourceNode>();
const tell = (message: string) => { $('status').textContent = message; };
async function getBuffer(voice: Voice) {
  audio ??= new AudioContext();
  let promise = buffers.get(voice.wav);
  if (!promise) {
    promise = fetch(voice.wav).then(async response => {
      if (!response.ok) throw Error(`Could not load ${voice.name}.`);
      return audio!.decodeAudioData(await response.arrayBuffer());
    }).catch(error => { buffers.delete(voice.wav); throw error; });
    buffers.set(voice.wav, promise);
  }
  return promise;
}
async function hear(voice: Voice, when?: number, pitch = 0) {
  audio ??= new AudioContext();
  await audio.resume();
  const buffer = await getBuffer(voice);
  const source = audio.createBufferSource(), gain = audio.createGain();
  source.buffer = buffer;
  source.playbackRate.value = 2 ** (pitch / 12);
  gain.gain.value = volume * .65;
  source.connect(gain).connect(audio.destination);
  sources.add(source);
  source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); };
  source.start(Math.max(when ?? audio.currentTime, audio.currentTime));
}
function renderPalette() {
  const voices = activeSet === 'mario' ? mario : bongo;
  $('palette-label').textContent = activeSet === 'mario' ? 'Mario Paint' : 'Bongo Planet';
  $('voice-count').textContent = `${voices.length} instruments`;
  $('pieces').replaceChildren(...voices.map(voice => {
    const button = document.createElement('button');
    button.className = `piece ${voice.set}`;
    button.setAttribute('aria-label', `Choose ${voice.name}`);
    button.setAttribute('aria-pressed', String(!generatorBrush && brush === voice));
    const img = document.createElement('img'); img.src = voice.portrait; img.alt = '';
    const name = document.createElement('span'); name.textContent = voice.name;
    button.append(img, name);
    button.onclick = () => {
      selectedVoice = brush = voice; generatorBrush = false;
      renderPalette(); renderSelection();
      void hear(voice).catch(error => tell(error.message));
      tell(`${voice.name} selected. Click a dot to place it.`);
    };
    return button;
  }));
  $('generator').setAttribute('aria-pressed', String(generatorBrush));
}
function renderSelection() {
  const image = $<HTMLImageElement>('selected-image');
  image.src = generatorBrush ? `${generatorPortrait}` : selectedVoice.portrait;
  image.className = !generatorBrush && selectedVoice.set === 'mario' ? 'pixel' : '';
  $('selected-name').textContent = generatorBrush ? 'Generator' : selectedVoice.name;
  const native = manifest.instruments.find(i => i.id === selectedVoice.id);
  $('selected-sound').textContent = generatorBrush ? 'Starts the sparks' : native?.timbre ?? 'Bongo Planet';
  $<HTMLButtonElement>('audition').disabled = generatorBrush;
}
$<HTMLSelectElement>('sound-set').onchange = event => {
  activeSet = (event.target as HTMLSelectElement).value as SetId;
  selectedVoice = brush = (activeSet === 'mario' ? mario : bongo)[0]; generatorBrush = false;
  renderPalette(); renderSelection();
  tell(`${activeSet === 'mario' ? 'Mario Paint' : 'Bongo Planet'} palette. Your placed pieces are unchanged.`);
};
$('generator').onclick = () => { generatorBrush = true; brush = null; renderPalette(); renderSelection(); tell('Generator selected. Click an empty dot to place it.'); };
$('audition').onclick = () => void hear(selectedVoice).catch(error => tell(error.message));
$<HTMLInputElement>('volume').oninput = event => { volume = Number((event.target as HTMLInputElement).value); $('volume-value').textContent = `${Math.round(volume * 100)}%`; };

const world = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, .1, 30);
const initialCamera = new THREE.Vector3(2.5, 1.6, 4.4);
camera.position.copy(initialCamera);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0, 0);
renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const host = $('sphere'); host.append(renderer.domElement);
renderer.domElement.tabIndex = 0;
renderer.domElement.setAttribute('aria-label', 'Interactive preview planet. Drag to orbit; click a junction to place the chosen instrument.');
const controls = new TrackballControls(camera, renderer.domElement);
controls.noPan = true; controls.staticMoving = true; controls.rotateSpeed = 1.7; controls.minDistance = 3.2; controls.maxDistance = 8;
const key = new THREE.DirectionalLight('#fff1da', 3); key.position.set(-2, 3, 4); key.castShadow = true;
const fill = new THREE.DirectionalLight('#c4b5ff', .8); fill.position.set(3, -1, 2);
world.add(new THREE.AmbientLight('#ffffff', 1.3), key, fill);
const point = (vertex: number, radius = 1) => new THREE.Vector3(...toRenderPoint(topology.vertices[vertex], radius));
const planet = createFacetedPlanet(topology.vertices.map((_, i) => point(i)), topology.faces, '#5262e9');
world.add(planet, new NorthPole());
const edgePositions = topology.edges.flatMap(([a,b]) => [...point(a, .994).toArray(), ...point(b, .994).toArray()]);
const rails = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3)), new THREE.LineBasicMaterial({ color: '#c3b8ff', transparent: true, opacity: .34 }));
world.add(rails);
const slots: THREE.Mesh[] = [];
const dotGeometry = new THREE.SphereGeometry(.012, 8, 6);
const dotMaterial = new THREE.MeshBasicMaterial({ color: '#fff0c7' });
topology.vertices.forEach((_, id) => { const dot = new THREE.Mesh(dotGeometry, dotMaterial); dot.position.copy(point(id, 1.002)); dot.userData.junction = id; world.add(dot); slots.push(dot); });
// A sparse existing route provides game context without introducing another editor.
topology.edges.filter((_, index) => index % 14 === 0).forEach(([a,b]) => {
  const midpoint = point(a).add(point(b)).normalize().multiplyScalar(1.009);
  const direction = point(b).sub(point(a)).normalize();
  world.add(new THREE.ArrowHelper(direction, midpoint, .057, '#ffd35b', .022, .021));
});
const placed: Placed[] = [];
const loader = new GLTFLoader();
const templates = new Map<string, Promise<THREE.Group>>();
const used = new Set<number>();
const pending = new Set<number>();
async function place(voice: Voice | null, junction: number) {
  if (used.has(junction) || pending.has(junction)) { tell('Choose another dot for this preview.'); return; }
  pending.add(junction);
  try {
    let group: THREE.Group;
    if (voice?.model) {
      let template = templates.get(voice.id);
      if (!template) { template = loader.loadAsync(voice.model).then(gltf => gltf.scene); templates.set(voice.id, template); }
      group = (await template).clone(true);
    } else {
      const toy = createToy(voice ? 'note' : 'generator', DEFAULT_APPEARANCE, voice?.id as Instrument | undefined);
      toy.halo.visible = false; group = toy.group;
    }
    group.position.copy(point(junction, 1.015));
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1), point(junction));
    group.traverse(object => { if (object instanceof THREE.Mesh) object.castShadow = true; });
    group.scale.setScalar(1.2);
    world.add(group); used.add(junction);
    if (voice) placed.push({ voice, junction, group, attack: -100 });
  } finally { pending.delete(junction); }
}
const front = topology.vertices.map((_, i) => i).filter(i => point(i).dot(initialCamera.clone().normalize()) > .2 && point(i).y < .85)
  .sort((a,b) => point(b).dot(initialCamera)-point(a).dot(initialCamera));
const spaced: number[] = [];
for (const id of front) if (spaced.every(other => point(other).distanceTo(point(id)) > .35)) spaced.push(id);
const demoVoices = [mario[0], mario[2], mario[3], bongo[3], mario[5], mario[6], mario[14], bongo[0], mario[1], bongo[2], mario[4], mario[7]];
void Promise.all(demoVoices.map((voice, index) => place(voice, spaced[index]))).catch(error => tell(`Could not load a model: ${error.message}`));
void place(null, spaced[demoVoices.length]).catch(error => tell(error.message));
const raycaster = new THREE.Raycaster();
let down = { x: 0, y: 0 };
renderer.domElement.onpointerdown = event => { down = {x:event.clientX, y:event.clientY}; };
renderer.domElement.onpointerup = event => {
  if (Math.hypot(event.clientX-down.x, event.clientY-down.y) > 5) return;
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1, -(event.clientY-rect.top)/rect.height*2+1), camera);
  const hit = raycaster.intersectObject(planet)[0];
  if (!hit) return;
  const junction = topology.vertices.map((_,id)=>id).sort((a,b)=>point(a).distanceToSquared(hit.point)-point(b).distanceToSquared(hit.point))[0];
  if (used.has(junction)) {
    const existing = placed.find(p => p.junction === junction);
    if (existing) { selectedVoice = brush = existing.voice; generatorBrush = false; renderPalette(); renderSelection(); existing.attack=performance.now(); void hear(existing.voice).catch(error=>tell(error.message)); tell(`${existing.voice.name} · ${existing.voice.set==='mario'?'Mario Paint':'Bongo Planet'}`); }
    return;
  }
  if (!brush && !generatorBrush) { tell('Choose an instrument from the palette first.'); return; }
  const label = generatorBrush ? 'Generator' : brush!.name;
  void place(brush,junction).then(()=>tell(`${label} placed. Switch sets to add something different.`)).catch(error=>tell(error.message));
};
let rotating = false;
$('rotate').onclick = () => { rotating=!rotating; $('rotate').setAttribute('aria-pressed', String(rotating)); };
$('reset').onclick = () => { controls.reset(); camera.position.copy(initialCamera); camera.lookAt(0,0,0); rotating=false; $('rotate').setAttribute('aria-pressed','false'); };
new ResizeObserver(() => { const {width,height}=host.getBoundingClientRect(); renderer.setSize(width,height); camera.aspect=width/height; camera.updateProjectionMatrix(); controls.handleResize(); }).observe(host);
let lastFrame = 0;
renderer.setAnimationLoop(time => {
  if (rotating) camera.position.applyAxisAngle(new THREE.Vector3(0,1,0), Math.min((time-lastFrame)/1000,.05)*.11);
  lastFrame=time; controls.update();
  for (const piece of placed) { const age=(performance.now()-piece.attack)/1000; piece.group.scale.setScalar(1.2+(age>=0&&age<.3?Math.sin(age/.3*Math.PI)*.22:0)); }
  renderer.render(world,camera);
});
let playing = false, preparing = false, generation = 0, timer: ReturnType<typeof setTimeout> | undefined;
function stop() { generation++; playing=false; preparing=false; clearTimeout(timer); for(const source of sources)source.stop(); $('play').textContent='Play preview'; $('play').setAttribute('aria-pressed','false'); }
$('play').onclick = async () => {
  if(playing || preparing) { stop(); return; }
  const token=++generation;
  preparing=true; $('play').textContent='Loading preview…';
  try {
    audio ??=new AudioContext(); await audio.resume();
    await Promise.all(placed.map(piece=>getBuffer(piece.voice)));
    if(token!==generation)return;
    preparing=false; playing=true; $('play').textContent='Pause preview'; $('play').setAttribute('aria-pressed','true');
    let step=0;
    const tick=()=>{if(!playing||token!==generation)return; const piece=placed[step%placed.length]; if(piece){piece.attack=performance.now(); void hear(piece.voice,undefined,0).catch(error=>{stop();tell(error.message);});} step++;timer=setTimeout(tick,250);};
    tick(); tell('Playing a simple sound preview. Switch sets to browse while it plays.');
  } catch(error) { stop(); tell(error instanceof Error?error.message:'Could not start audio.'); }
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
renderPalette(); renderSelection();
