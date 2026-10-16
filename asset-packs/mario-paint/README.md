# Mario Paint instrument library for Bongo Planet

Local preview: **http://127.0.0.1:5417/BongoPlanet/asset-packs/mario-paint/**.

The original sprite voxels are the selected version. Upscaled alternatives and comparison assets were deleted at the user's request on 16 October 2026.

All 15 original music-tool sprites are extruded from their exact transparent 16 × 16 pixels. All 195 native staff notes are rendered from the supplied ROM's own SPC700 composer driver. The pack also includes the full music-tool sample bank: 16 sources used by the instruments and seven auxiliary sources.

## Files

| Path | Contents |
| --- | --- |
| `models/*.glb` | 15 glTF 2.0 models with vertex colors, one mesh per instrument, internal faces removed |
| `voxels/*.vox` | 15 editable MagicaVoxel files, four voxels deep |
| `voxels/*.json` | Lossless voxel coordinates, original palette and Bongo Planet mounting metadata |
| `sprites/*.png` | 15 original transparent 16 × 16 instrument sprites |
| `audio/notes/` | 195 mono PCM WAVs, signed 16 bit, 32 kHz, every instrument at every original staff position |
| `audio/sources/` | 16 decoded sources used by the instruments, without voice envelopes or tuning |
| `audio/auxiliary/` | Seven additional bank entries; short/silent entries are intentionally preserved |
| `raw/*.brr` | 23 byte-exact compressed source samples, with hashes and native loops in the manifest |
| `source/` | Portable TypeScript model and audio adapters; runtime dependency: `three` |
| `manifest.json` | Stable IDs, icon/sound mapping, pitch, native envelope/tuning bytes, loop bounds and provenance |
| `checksums.json` | Byte counts and SHA-256 hashes for the reusable payload |
| `validation.json` | Asset checks and comparison with the previous verified extraction |

`Bongo-Planet-Mario-Paint.zip` contains the reusable payload and this guide. Its contents exclude the ROM and temporary ARAM image. The browser viewer is part of this checkout; the ZIP is an asset pack rather than a standalone website.

## The 15 instruments

| ID | Sprite | Sound | Source sample |
| --- | --- | --- | --- |
| `mario` | Mario | Mallet / xylophone | `0D` |
| `mushroom` | Mushroom | Tom / drum | `01` |
| `yoshi` | Yoshi | Yoshi voice | `0F` |
| `star` | Star | Music box | `04` |
| `flower` | Flower | Trumpet | `0C` |
| `game-boy` | Game Boy | Pulse wave | `08` |
| `dog` | Dog | Bark | `03` |
| `cat` | Cat | Meow | `02` |
| `pig` | Pig | Oink | `07` |
| `swan` | Swan | Orchestra hit | `09` |
| `baby` | Baby | Baby voice | `0E` |
| `airplane` | Airplane | Bowed strings | `06` |
| `boat` | Boat | Drum / cymbal split | `00` / `10` |
| `car` | Car | Organ | `05` |
| `heart` | Heart | Bass pluck | `0A` |

Timbre names describe the sound; sprite IDs identify it unambiguously. Boat positions 1–6 use source `00`; positions 7–13 use source `10`.

## Model integration

The GLBs load directly with Three.js `GLTFLoader`. They use Bongo Planet's toy coordinates: **X right, Y up, +Z outward from the planet**. The origin is centered on the 16 × 16 sprite canvas at its mounting plane. Each pixel is `0.009` units wide, with a `0.005` unit lift; the four-pixel extrusion occupies `z = 0.005…0.041`. Models have a maximum canvas width/height of `0.144`, fitting the existing `0.19` stack spacing. Keep scale `(1,1,1)` when placing them alongside the current toys.

```ts
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltf = await new GLTFLoader().loadAsync(
  '/BongoPlanet/asset-packs/mario-paint/models/00-mario.glb'
);
const model = gltf.scene;
// normal is the junction's normalized position in Bongo Planet render axes.
model.position.copy(normal).multiplyScalar(1.035);
model.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
scene.add(model);
```

For editable procedural geometry, import `createMarioPaintModel` from `source/index.ts` (or `src/asset-packs/mario-paint/index.ts` inside this checkout) and pass a `voxels/*.json` object. `disposeMarioPaintModel` releases its geometry and materials. MagicaVoxel uses Z up, so its file axes are X right, Y extrusion depth, Z up; the JSON and GLB retain Bongo Planet's axes.

## Audio integration

```ts
import {
  loadMarioPaintManifest, loadMarioPaintInstrument, playMarioPaintNote
} from './source/index';

const base = new URL('/BongoPlanet/asset-packs/mario-paint/', location.origin);
const manifest = await loadMarioPaintManifest(base);
// Resume AudioContext from a deliberate user click before auditioning.
await context.resume();
const mario = await loadMarioPaintInstrument(context, manifest, 'mario', base);
const source = playMarioPaintNote(context, mario, 2, { gain: 0.65 });
// Position 2 is the original C4 staff slot. source.stop() cancels auditioning.
// mario[1].sample has { channels: Float32Array[], sampleRate: number }.
```

The `sample` object is structurally compatible with Bongo Planet's `InstrumentSample` and can be sent through its current sample-bank/worklet data path. It reports the decoder's actual sample rate if the AudioContext resamples the original WAV. `loadMarioPaintBank` loads all 15 × 13 notes. Staff positions are **1-based**; their labels are B3, C4, D4, E4, F4, G4, A4, B4, C5, D5, E5, F5, G5.

These are native staff labels, **not a promise that every voice has that concert-pitch root**. The finished WAVs preserve each instrument's original pitch table, gate and envelope. Play them at `playbackRate = 1`; adding another envelope changes the attack/tail. Optional `semitones` in `playMarioPaintNote` explicitly transposes a finished note and also changes its length. Raw sources need the manifest's native pitch/envelope/loop settings, and must not be treated as C4 just because their reference rate is 32 kHz.

This library does not add its IDs to production `Instrument`, the main palette or composition validators. Production integration requires that deliberate catalog/schema/appearance/guide change and the existing audio-worklet timing and voice-ownership checks. The standalone player is an audition tool. Its Web Audio scheduling does not qualify production timing, venue playback or device support.

## Rebuild

The input ROM is read only. Requires Python with Pillow, `clang++`, Node and the project's existing development dependencies.

```sh
python3 scripts/mario-paint/extract.py '/absolute/path/to/the/supplied.sfc'
npx tsx scripts/mario-paint/export-models.ts
python3 scripts/mario-paint/package.py
```

The extractor accepts the verified Joystick modification 1.0 ROM, optionally with a 512-byte copier header. It checks SHA-256 and seven native table fingerprints before extraction. Its temporary ARAM and compiled renderer are deleted automatically. No deleted research pages, source recordings or diagnostic bulk are restored.

Source ROM SHA-256: `ef1b5c47d7c76de43492d9745def235fa24e01b9b6f5c636584b7ae639563ff2`.

Offsets and behavior follow the [pinned Mario Paint disassembly](https://github.com/Yoshifanatic1/Mario-Paint-Disassembly/tree/730df333bd4110da7965e0ad063c1c5dcf894a73). The isolated renderer uses the retained Game_Music_Emu fast SPC DSP code, with its source provenance and LGPL notice in `scripts/mario-paint/spc-dsp/`. It preserves native gates and folds the original stereo channels to mono without normalization. Echo is disabled. Fast DSP approximates interpolation/timing; these files are isolated digital renders, not full-console or analog recordings.

## Rights and scope

The artwork and recordings are Nintendo-derived. No redistribution license has been established; the disassembly/tool code license does not license Nintendo's assets. This is a local, user-requested pack. It is outside `public/`, the main production build and the public Site snapshot. Publishing these assets is a separate decision.
