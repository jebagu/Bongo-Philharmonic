import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadMarioPaintInstrument, loadMarioPaintManifest, packUrl, playMarioPaintNote, type LoadedMarioPaintNote } from './audio';
import { disposeMarioPaintModel } from './models';
import type { MarioPaintInstrument, MarioPaintManifest } from './types';
import './style.css';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const base = new URL('./', location.href);
let manifest: MarioPaintManifest, selected: MarioPaintInstrument;
let selectedPosition = 2, context: AudioContext | undefined;
let epoch = 0, modelEpoch = 0;
const notesCache = new Map<string, Promise<LoadedMarioPaintNote[]>>();
const active = new Set<AudioBufferSourceNode>(), timers = new Set<ReturnType<typeof setTimeout>>();
const status = (message: string, error = false) => { element('status').textContent = message; document.body.dataset.error = String(error); };
const fail = (error: unknown) => status(error instanceof Error ? error.message : String(error), true);

const stage = element('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.append(renderer.domElement);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x737f60, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.5); keyLight.position.set(2, 4, 5); scene.add(keyLight);
const rim = new THREE.DirectionalLight(0xd8e3bb, 1.2); rim.position.set(-3, 1, -2); scene.add(rim);
const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 10);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0.023); controls.enableDamping = true; controls.enablePan = false;
controls.minDistance = 0.18; controls.maxDistance = 0.65;
controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed = 1;
element('spin').setAttribute('aria-pressed', String(controls.autoRotate));
function threeQuarter() { camera.position.set(0.18, 0.065, 0.32); controls.update(); }
threeQuarter();
let model: THREE.Group | undefined;
const observer = new ResizeObserver(() => {
  const width = stage.clientWidth, height = stage.clientHeight;
  renderer.setSize(width, height, false); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
});
observer.observe(stage);
renderer.setAnimationLoop(() => { if (!document.hidden) { controls.update(); renderer.render(scene, camera); } });
controls.addEventListener('start', () => { controls.autoRotate = false; element('spin').setAttribute('aria-pressed', 'false'); element('front').setAttribute('aria-pressed', 'false'); });
element('front').addEventListener('click', () => { controls.autoRotate = false; camera.position.set(0, 0, 0.39); controls.update(); element('front').setAttribute('aria-pressed', 'true'); element('spin').setAttribute('aria-pressed', 'false'); });
element('spin').addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  if (controls.autoRotate) threeQuarter();
  element('spin').setAttribute('aria-pressed', String(controls.autoRotate)); element('front').setAttribute('aria-pressed', 'false');
});

function stop(): void {
  epoch++;
  for (const source of active) { try { source.stop(); } catch { /* An ended source is already silent. */ } }
  active.clear();
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  document.querySelectorAll('.playing').forEach(node => node.classList.remove('playing'));
  status('Stopped.');
}
async function enableAudio(): Promise<AudioContext> {
  context ??= new AudioContext();
  await context.resume();
  return context;
}
function notes(audio: AudioContext, instrument: MarioPaintInstrument): Promise<LoadedMarioPaintNote[]> {
  let result = notesCache.get(instrument.id);
  if (!result) {
    result = loadMarioPaintInstrument(audio, manifest, instrument.id, base).catch(error => { notesCache.delete(instrument.id); throw error; });
    notesCache.set(instrument.id, result);
  }
  return result;
}
function scheduleTimer(callback: () => void, delay: number): void {
  const timer = setTimeout(() => { timers.delete(timer); callback(); }, Math.max(0, delay)); timers.add(timer);
}
function sound(audio: AudioContext, loaded: LoadedMarioPaintNote[], position: number, when: number): void {
  const source = playMarioPaintNote(audio, loaded, position, { when, gain: Number(element<HTMLInputElement>('volume').value) });
  active.add(source);
  source.addEventListener('ended', () => active.delete(source));
  const button = document.querySelector(`[data-position="${position}"]`);
  scheduleTimer(() => button?.classList.add('playing'), (when - audio.currentTime) * 1000);
  scheduleTimer(() => button?.classList.remove('playing'), (when - audio.currentTime + 0.2) * 1000);
}
function updateDownload(): void {
  element<HTMLAnchorElement>('download-wav').href = packUrl(base, selected.notes[selectedPosition - 1].wav);
  document.querySelectorAll<HTMLButtonElement>('[data-position]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.position) === selectedPosition)));
}
async function select(instrument: MarioPaintInstrument): Promise<void> {
  stop(); selected = instrument;
  const token = ++modelEpoch;
  document.querySelectorAll<HTMLButtonElement>('.instrument').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.instrument === instrument.id)));
  element('instrument-index').textContent = `VOICE ${String(instrument.composerIndex + 1).padStart(2, '0')} / 15`;
  element('instrument-name').textContent = instrument.name;
  element('timbre').textContent = instrument.timbre;
  element('voxel-count').textContent = instrument.voxelCount.toLocaleString();
  const sprite = element<HTMLImageElement>('sprite'); sprite.src = packUrl(base, instrument.sprite); sprite.alt = `Original Mario Paint ${instrument.name} sprite`;
  element<HTMLAnchorElement>('download-glb').href = packUrl(base, instrument.model);
  element<HTMLAnchorElement>('download-vox').href = packUrl(base, instrument.magicaVoxel);
  updateDownload();
  status('Choose a note to hear this instrument.');
  if (model) { scene.remove(model); disposeMarioPaintModel(model); model = undefined; }
  const gltf = await new GLTFLoader().loadAsync(packUrl(base, instrument.model));
  if (token !== modelEpoch) { disposeMarioPaintModel(gltf.scene); return; }
  model = gltf.scene; scene.add(model); stage.dataset.loaded = instrument.id;
}

element('stop').addEventListener('click', stop);
element('play-scale').addEventListener('click', () => {
  stop(); const token = epoch, instrument = selected;
  void (async () => {
    const audio = await enableAudio(); status(`Loading ${instrument.name}…`);
    const loaded = await notes(audio, instrument);
    if (token !== epoch) return;
    const start = audio.currentTime + 0.035;
    loaded.forEach((_, index) => sound(audio, loaded, index + 1, start + index * 0.26));
    status(`Playing all 13 ${instrument.name} notes.`);
    scheduleTimer(() => status('All 13 notes played.'), 13 * 260 + 500);
  })().catch(fail);
});
element('validate-audio').addEventListener('click', () => {
  const button = element<HTMLButtonElement>('validate-audio'); button.disabled = true;
  void (async () => {
    const audio = await enableAudio(); let count = 0;
    for (const instrument of manifest.instruments) {
      count += (await notes(audio, instrument)).length;
      element('validation').textContent = `Decoded ${count} / 218 WAVs…`;
    }
    for (const sample of manifest.samples) {
      const response = await fetch(packUrl(base, sample.wav));
      if (!response.ok) throw Error(`Source sample ${sample.index} failed (${response.status}).`);
      await audio.decodeAudioData(await response.arrayBuffer()); count++;
    }
    element('validation').textContent = `All ${count} WAVs decoded successfully: 195 notes + 23 source samples.`;
  })().catch(error => { element('validation').textContent = `Audio check failed: ${String(error)}`; fail(error); }).finally(() => { button.disabled = false; });
});

async function start(): Promise<void> {
  manifest = await loadMarioPaintManifest(base);
  for (const instrument of manifest.instruments) {
    const button = document.createElement('button'); button.className = 'instrument'; button.dataset.instrument = instrument.id;
    button.setAttribute('aria-label', `Select ${instrument.name}`); button.setAttribute('aria-pressed', 'false');
    const image = document.createElement('img'); image.src = packUrl(base, instrument.sprite); image.alt = '';
    const label = document.createElement('span'); label.textContent = instrument.name;
    button.append(image, label); button.addEventListener('click', () => { void select(instrument).catch(fail); });
    element('instruments').append(button);
  }
  manifest.staffLabels.forEach((label, index) => {
    const button = document.createElement('button'); button.className = 'key'; button.dataset.position = String(index + 1);
    button.setAttribute('aria-label', `Play ${label}`); button.setAttribute('aria-pressed', 'false');
    const name = document.createElement('span'); name.textContent = label;
    const position = document.createElement('small'); position.textContent = String(index + 1).padStart(2, '0');
    button.append(name, position);
    button.addEventListener('click', () => {
      stop(); selectedPosition = index + 1; updateDownload(); const token = epoch, instrument = selected;
      void (async () => {
        const audio = await enableAudio(), loaded = await notes(audio, instrument);
        if (token !== epoch) return;
        sound(audio, loaded, selectedPosition, audio.currentTime + 0.015);
        status(`${instrument.name} · ${label}${instrument.id === 'boat' ? ` · ${index < 6 ? 'drum' : 'cymbal'} source` : ''}`);
      })().catch(fail);
    });
    element('keys').append(button);
  });
  for (const sample of manifest.samples) {
    const button = document.createElement('button'); button.className = 'source'; button.dataset.role = sample.role;
    button.textContent = sample.index.toString(16).toUpperCase().padStart(2, '0');
    button.setAttribute('aria-label', `Play ${sample.role} source ${button.textContent}`);
    button.addEventListener('click', () => {
      stop(); const token = epoch;
      void (async () => {
        const audio = await enableAudio(), response = await fetch(packUrl(base, sample.wav));
        if (!response.ok) throw Error(`Could not load source ${sample.index}.`);
        const buffer = await audio.decodeAudioData(await response.arrayBuffer());
        if (token !== epoch) return;
        const source = playMarioPaintNote(audio, [{ buffer, duration: buffer.duration, sample: { channels: [], sampleRate: buffer.sampleRate } }], 1, { gain: Number(element<HTMLInputElement>('volume').value) });
        active.add(source); button.classList.add('playing');
        source.addEventListener('ended', () => { active.delete(source); button.classList.remove('playing'); });
        status(`Raw source ${button.textContent} · reference rate, no instrument envelope.`);
      })().catch(fail);
    });
    element('sources').append(button);
  }
  await select(manifest.instruments[0]);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
window.addEventListener('pagehide', event => {
  stop();
  if (event.persisted) return; // Back/forward-cache restores the live viewer.
  renderer.setAnimationLoop(null); observer.disconnect(); controls.dispose();
  if (model) disposeMarioPaintModel(model);
  renderer.dispose(); void context?.close();
});
void start().catch(fail);
