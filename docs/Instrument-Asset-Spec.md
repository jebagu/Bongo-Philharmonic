# Instrument and asset-set specification

**Version 1 · 16 October 2026 · Bongo Planet and Bongo Philharmonic**

This is the delivery contract for commissioning, generating or integrating a new instrument set. Give this document and the [delivery manifest template](templates/instrument-set/manifest.example.json) to the person or agent making the assets. Requirements below apply to **new deliveries**; existing banks retain their documented formats and behavior.

This specification defines assets, not a new import feature. Neither app currently loads arbitrary instrument packs. The template is handoff metadata, not an application save file or an implemented runtime manifest. Adding a set still requires explicit catalog, model, audio and validation work in each target app. See [application boundaries](Applications.md).

## 1. The brief to give an asset creator

> Create a coordinated set of musical toy characters for Bongo Planet / Bongo Philharmonic. For each instrument, deliver a stable ID and name, one self-contained glTF 2.0 `.glb` model, one transparent 512 × 512 PNG icon and editable source files. Deliver dry, clean, signed 16-bit PCM `.wav` recordings at 48,000 Hz, normally mono. For a pitched instrument, start with one accurately tuned C4 recording (MIDI 60, 261.625565 Hz); the player transposes it. For an unpitched percussion instrument, deliver two distinct takes of the same articulation, A and B. Include natural decays, explicit pitch/playback metadata, measured file properties, provenance and asset licenses. Models use X right, Y up and +Z outward from the planet, with their origin at the mounting plane. Read the detailed dimensions, budgets and checklist below. Deliver assets and metadata; runtime integration is a separate step.

Specify the set's intended name, instrument roster, visual direction and target app(s) alongside that brief. The default is compact sampled instruments with a static model and application-driven hit feedback. Additional articulations, sample layers, rigs or special playback need an explicit scope extension.

| Default new-delivery requirement | Specification |
| --- | --- |
| Audio file | RIFF/WAVE `.wav`, uncompressed signed 16-bit little-endian PCM |
| Sample rate | 48,000 Hz for newly recorded/generated runtime audio |
| Channels | Mono preferred; stereo allowed when musically useful and mono-compatible; no surround |
| Pitched sample count | **1 root recording per instrument**, at C4 / MIDI 60; one velocity layer |
| Unpitched percussion sample count | **2 recordings per instrument**, same articulation, alternating A/B; one velocity layer |
| Model | **1 `.glb` per instrument**, glTF 2.0, all dependencies embedded |
| Palette / score icon | **1 transparent 512 × 512 PNG per instrument** |
| Metadata and sources | Delivery manifest, measurements/checksums, rights records and editable audio/model sources |

For example, a set of five pitched instruments and five drums needs **15 runtime WAVs, 10 GLBs and 10 PNGs**. The number of instrument types in a set is a roster decision. Philharmonic's sixteen-performer limit counts placed instances, including duplicates; it is not a requirement for sixteen types or sixteen files.

## 2. What constitutes an instrument

An **instrument type** is one identifiable playable sound with a matching visual identity and declared playback behavior. It consists of:

1. **Identity:** stable machine ID, display name, set membership, short sound description and category.
2. **Sound:** sample files and a complete mapping from a requested note/hit to a sample, playback rate, level and ending behavior.
3. **Appearance:** a planet-mounted 3D model and a matching readable 2D icon.
4. **Capabilities:** pitched/unpitched, supported register, gate/natural-tail behavior, and any expressly supported alternation.
5. **Provenance:** authorship, source, license, transformations and reproducible delivery records.

A **placed instance** uses that type's immutable assets but owns its own application identity, location and musical events. Several instances may share decoded audio and geometry; each sounding note remains an independent voice. A chord needs multiple voices, not extra GLBs or recordings of every chord. A silent generator, a landmark, the planet, a theme and a spark effect are not instruments.

An **asset set** is a named, versioned collection of these types with a coherent sound/visual direction. A set does not supply its own transport, scheduler, save system, planet or theme. Philharmonic currently uses one asset set per composition; mixed sets are outside its current contract.

## 3. Audio delivery

### File format, sample rate and channels

- Runtime files must use the PCM WAV format in the default table. MP3, AAC, Ogg, FLAC, SF2 and plug-in presets do not substitute for runtime WAVs under this delivery contract.
- Keep original lossless masters; 24-bit or floating-point WAV masters are welcome in `source/`, alongside the prepared 16-bit runtime files. Dither when reducing bit depth. Do not upsample a lower-rate source merely to label it 48 kHz: retain the native source, disclose its rate and document the approved runtime conversion or native-rate exception.
- Existing 44.1 kHz and native 32 kHz banks remain valid. A WAV's sample rate describes samples per second; it does **not** identify the musical root note.
- Mono is the compact default. Stereo must be centered, with consistent channel order, no baked positional panning and no severe cancellation when summed to mono. Both channels must have equal frame counts. Do not include a silent second channel just to make a mono sample stereo.
- Record file rate, bit depth, channels, frame count and duration. At runtime preserve the **decoded buffer's actual rate**; Web Audio decoding can resample to the context rate. Do not attach the original file rate to resampled PCM. See the [Web Audio decoding specification](https://webaudio.github.io/web-audio-api/#dom-baseaudiocontext-decodeaudiodata).

### How many samples and which pitches

| Playback profile | Required recordings | Mapping and present support |
| --- | --- | --- |
| `pitched-root` — default melodic profile | One C4 recording per type | Transpose from MIDI 60. This matches the existing Bongo-style sample path after catalog integration. |
| `unpitched-round-robin` — default drum profile | Two takes, A/B, of one articulation per type | Play at rate 1, alternate deterministically, retain natural tails. Matches current Bongo percussion behavior after integration. |
| `prepared-note-map` — optional fidelity/native profile | One finished WAV per explicitly mapped pitch; for full chromatic coverage use `highestMidi - lowestMidi + 1` WAVs per type | Each WAV carries its own completed envelope/tuning. Requires a set-specific adapter; arbitrary maps are not implemented. The current Mario adapter is one fixed example. |
| Multisampled roots, velocity layers, extra articulations or continuous loops | Only the recordings and mapping agreed for that extension | Not part of the v1 default. Requires loader, selection, DSP, UI and test work before use. |

For a root sample, use **12-tone equal temperament, A4 = 440 Hz**, with `rootMidi: 60`, `rootHz: 261.6255653005986` and zero tuning correction after preparation. Use MIDI numbers as the authoritative pitch identifiers because octave naming varies across software. The playback-rate relationship is `2 ** ((targetMidi - rootMidi) / 12)`. Doubling the rate raises pitch one octave and halves the recording's duration; this path does not preserve duration or formants.

New pitched-root instruments must sound usable through at least **MIDI 48–72 inclusive (C3–C5)**, auditioned chromatically. Declare a wider useful range when warranted. This is a minimum asset-quality audition range, not a new file-validation limit: the original game accepts octaves 2–6, and Philharmonic accepts MIDI 0–127. Integration must explicitly assess the target app's wider register and disclose timbral/length limits; never silently fold existing notes into the audition range.

An alternative root is possible only with explicit per-instrument mapping work or an approved offline retune to C4. Current Bongo playback assumes a shared C4 root and does not read arbitrary tuning metadata. If a sound has no stable fundamental, classify it as unpitched rather than inventing a tuning measurement. Pitched percussion, such as a tuned mallet, belongs in a pitched profile; classification follows playback behavior, not its name or shape.

Prepared-note maps must list every delivered MIDI key, take order, and the exact policy for unmapped notes: reject explicitly or transpose a declared nearest sample with deterministic tie-breaking. A range alone does not define a sparse map. A chromatic C3–C5 map has **25** files per type, not thirteen. These are optional new adapter requirements, not behavior the current generic path already provides.

### Recording preparation and levels

- One isolated note/hit per WAV, at a consistent medium playing intensity. A/B files are distinct performances of the same sound at matched levels, not different pitches, velocities or open/closed articulations. Do not manufacture B by duplicating A's bytes.
- Keep the sound dry: no added reverb, delay, tempo synchronization, stereo placement or mastering limiter. If processing defines the instrument's timbre, identify that processing and deliver the source where available.
- Remove DC offset, unrelated noise and accidental silence. Aim for no more than **2 ms of avoidable leading silence**, without cutting a breath, bow onset or transient. Record the measured onset and trimming method; do not invent a runtime offset the player does not support.
- Preserve the natural decay; use short, click-free boundary fades where needed without softening attacks. No abrupt truncation of audible tails. If a sustained tone is rendered to a finite one-shot, disclose the chosen duration and prepared ending.
- Keep sample peaks at or below **−1 dBFS**; around −3 dBFS is a starting preparation target. Match perceived levels across the set by auditioning, keeping A/B levels close. Do not independently normalize every file to full scale or force a shared LUFS target onto short drum hits. Record peak and RMS plus any preparation gain. Apply needed gain offline for the default profile; the handoff manifest is not a runtime gain control.
- Target roughly **2–4 seconds** for melodic samples and **0.1–2 seconds** for percussion when natural decay permits. The v1 delivery ceiling is **8 seconds per runtime WAV**; document an integration exception before supplying longer ringing/sustained sounds. Never shorten an audible tail just to pass a size target.

### Endings, polyphony and unsupported features

The default pitched-root profile is **gated, non-looping sample playback**: it ends at the earlier of the requested gate or the transposed sample boundary, with the app's existing short gate fades. A long note cannot sustain beyond the recording. Default unpitched percussion plays its full natural tail at rate 1, independent of note-length/pitch metadata. Cancellation still uses the app's release behavior.

Prepared notes already contain their envelopes. Do not apply a second instrument attack/decay or pretend that changing a note box stretches their sustain. Source-loop metadata is archival unless a deliberately implemented adapter actually uses it. The current Bongo synth does not loop samples; first-release Philharmonic prepared notes play to their natural boundary. Velocity currently scales amplitude; it does not select a recorded velocity layer. There are no default choke groups, release-trigger samples, pedal states or pitch-preserving time stretching.

All profiles must allow independent overlapping notes, including repeated notes and simultaneous chords. Sharing buffers must not make one performer cancel another. Integration must use real transposed sample lifetimes and the longest alternate where ownership requires it; do not use a short nominal note box to budget ringing tails. Philharmonic currently budgets **64 sounding voices**, separately from sixteen performers, and checks actual tails across score loops.

## 4. 3D model delivery

Deliver a self-contained **glTF 2.0 binary `.glb`** per type. Embed all mesh buffers and any images; a `.glb` extension alone does not guarantee that dependencies are embedded. Use core metallic/roughness materials and no required extensions, Draco/Meshopt compression, custom shader code or external URLs in the default profile. Geometry colors and simple materials are preferred over image textures. The [Khronos glTF specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html) defines the container and material format; the following mounting and size rules are project decisions.

| Property | New-delivery requirement |
| --- | --- |
| Local axes | Right-handed: X right, Y up in the character's portrait, +Z outward from the planet |
| Origin / mounting | `(0, 0, 0)` at the center of the mounting plane; model extends into positive Z; never recenter to the bounding-box center on import |
| Units | Bongo Planet scene units, relative to a planet radius of approximately 1; these toy dimensions are not a physical meter-scale instrument |
| Default dimensions | Aim for 0.14–0.16 units across the larger of X/Y. All visible geometry must fit `x,y = −0.09…+0.09`, `z = 0…0.12` at scale 1. Exceptions need explicit placement review. |
| Transforms | Root translation/rotation zero and scale `(1,1,1)`; bake authoring-axis conversion and sizing into exported content; no negative scale |
| Geometry | Triangles, valid normals, no accidental duplicates, hidden interior faces removed where practical; no required rig, morph targets or animation clips |
| Complexity | Target ≤5,000 triangles; delivery ceiling 10,000; ≤4 rendered primitives/draw calls and ≤4 materials per instrument at its rest pose |
| Payload | ≤1 MiB per GLB; embedded textures, if needed, no larger than 512 × 512 each; larger assets need a recorded exception |
| Scene contents | One identifiable instrument root; no cameras, lights, backgrounds, floor, placement dot, selection halo or baked shadow plane |
| Editable source | `.blend`, `.vox`, lossless voxel JSON or deterministic procedural source, including necessary linked resources and export instructions |

The application rotates local +Z to the junction's outward normal and places the mounting origin at roughly radius 1.035. Y is local portrait-up, not global world-up everywhere on the sphere. The original game's stack spacing is 0.19 units; new geometry must remain understandable in stacks and neighboring placements. Check actual placements and animation, since dimensions alone do not guarantee clearance. Existing taller toys are legacy assets, not a reason to silently enlarge a new set.

Use a coherent silhouette, palette and finish across the set. A character must remain identifiable at small palette/score sizes and under Blue Marble, Nebula and Fireflies lighting. For new Bongo-style characters, provide a named `Body` and a separate `Eyes` group when eyes are part of the art; declare tintable material names. Adapters may expose those parts to theme/reaction controls. Fixed-color voxel sets may declare `tintableMaterials: []` and have baked eyes; do not promise independent eye/tint controls for them. These names are an integration convention, not a generic model loader API already implemented.

A static model is enough. The app supplies selection, hit glow/bounce and reduced-motion handling. An artist-authored animation or an emissive material must never schedule audio. Repeated instances may share geometry but need isolated mutable reaction/material state and safe disposal.

## 5. Icons and editable material

- Deliver one `icons/<instrument-id>.png`, **512 × 512 RGBA**, transparent background, sRGB colors, with all visible content inside the central 80% of the canvas. No labels or baked background/shadow card.
- The icon must depict the same character, color family and recognizable silhouette as its model. It may use a distinct portrait pose if that improves readability. Inspect at **24, 32 and 48 CSS pixels**; do not rely on fine text or thin details.
- Pixel-art sets may supply an additional native-resolution transparent sprite and declare nearest-neighbor scaling. Existing Mario 16 × 16 sprites are a native exception, not a requirement to repaint or upscale them.
- Retain editable model/source audio plus the export/preparation steps. Do not include gigabytes of diagnostic captures, duplicate builds or unrelated research in an ordinary delivery.

## 6. Package and metadata

Deliver one directory or ZIP with this structure. Paths are relative to its root; use lowercase kebab-case IDs/filenames, no spaces, absolute paths, `..`, remote resources or secrets.

```text
<set-id>/
  manifest.json
  README.md
  audio/<instrument-id>-c4.wav          # pitched-root
  audio/<drum-id>-a.wav                 # unpitched take A
  audio/<drum-id>-b.wav                 # unpitched take B
  models/<instrument-id>.glb
  icons/<instrument-id>.png
  source/                              # editable masters + export instructions
  licenses/                            # license texts and attribution
  validation.json                      # measurements + individually recorded checks
  checksums.json                       # relative path, bytes, SHA-256 for payload
```

Start from [manifest.example.json](templates/instrument-set/manifest.example.json), replace its example roster, and remove `exampleOnly` for a real delivery. It intentionally contains no asset binaries and cannot be imported into either app. Its `format: "bongo-planet-asset-set-delivery"` distinguishes this handoff contract from the Mario pack's existing specialized manifest and either app's composition files.

The manifest must state:

- **Set:** format/spec version, stable set ID, display name, asset version, intended apps, author, license and local-only/redistributable status.
- **Each type:** stable ID, display name, sound description, playback profile, measured/declared root, useful MIDI range (or `null` for unpitched), pitch mapping, take order, ending behavior, model/icon/source paths and tintable parts.
- **Each sample in `validation.json`:** file format/rate/bit depth/channels/frames/duration, peak/RMS, measured onset, preparation gain, tuning result or explicit unpitched status. Record native/prepared-map tuning honestly when staff labels are not measured concert pitches.
- **Each model/icon in `validation.json`:** bounds, root transform, triangle/primitive/material counts, texture dimensions, embedded-dependency check, payload size and icon dimensions/alpha.
- **Provenance:** per-file origin/creator/license records, source version or URL where applicable, preparation/export steps and applicable attribution. Mixed licenses must remain attributable per asset.

Set IDs must be unique in the project; type IDs must be unique within their set. The pair `(setId, instrumentTypeId)` identifies a type across sets; cache keys must retain both when collisions are possible. These IDs identify sounds, not editable display names. Do not reuse an existing ID for a materially different sound or silently reinterpret old saves. Declare version changes; incompatible sonic/remapping changes require an explicit compatibility decision. New defaults apply prospectively and do not authorize retuning or re-rendering existing banks.

Target **≤10 MiB of runtime payload per set** and **≤32 MiB of unique decoded float32 audio**, excluding editable masters. These are initial delivery budgets, not measured device guarantees. Report `sum(frames × channels × 4)` at the tested decoded rate, and report actual memory separately when decoders/worklets retain multiple copies. Reusing a sample for sixteen performers must not fetch/decode sixteen duplicate banks. Larger sets need documented loading/memory/performance work before integration.

## 7. Existing banks: compatibility examples, not new defaults

Verified from the current WAV headers and source on 16 October 2026:

| Bank | Runtime recordings | Present behavior |
| --- | --- | --- |
| Bongo melodic | Five WAVs; 44,100 Hz, 16-bit, stereo; one per type | Shared C4 reference, rate transposition, gate/natural-boundary ending. Existing source tuning is approximate; do not claim new ±5-cent qualification. |
| Bongo percussion | Ten WAVs; 48,000 Hz, 16-bit, mono; two per type | Natural-pitch, natural-tail deterministic A/B playback. |
| Local Mario Paint | 195 prepared-note WAVs = 15 types × 13 native staff positions; 32,000 Hz, 16-bit, mono | Own completed tuning/gates/envelopes. Philharmonic uses the nearest native labeled note for additional pitches; ties retain the earlier/lower entry. Staff labels are not a guarantee of measured concert pitch for every voice. |

Mario additionally retains sixteen active raw source WAVs and seven auxiliary WAVs. **A new set does not need 195 files or raw console samples.** Its specialized extraction/native adapter contract does not define a general-purpose sampler. Never infer C4 from the 32 kHz raw source rate. The existing original voxel models/sprites remain selected; this spec does not authorize replacement art, re-extraction or restoration of deleted assets.

## 8. Acceptance and integration checklist

An asset delivery is reviewable when every required file and measurement is present. It becomes an integrated set only after the relevant app checks pass. Record each item as `passed`, `failed`, `blocked` or `not-run`, with date, target app, method and evidence. A compile or WAV-header check does not establish human listening or device acceptance.

- [ ] **Completeness:** every roster entry has model, icon, required WAV count, editable sources, metadata and attribution; IDs/paths are unique, local and complete; payload checksums match. GLBs validate against glTF 2.0 with no errors and have no missing/external dependencies.
- [ ] **Audio measurements:** PCM format, sizes, rates, channel/frame consistency, peak ceiling, no clipping/DC/clicks and onset preparation are checked. New pitched roots have a stable region within **±5 cents of C4**; any intentional inharmonic/native exception is recorded rather than given a false pass. All A/B takes are distinct, matched and fully retained.
- [ ] **Listening:** audition each new pitched sound chromatically through C3–C5, its declared extremes, and the actual target app's wider register where used. Check short/long gates, natural ending, repeated notes, chords, A/B transitions and a full-set mix. Record truncation, tuning and level problems before acceptance.
- [ ] **Visuals:** verify axes/origin/bounds at scale 1, outward mounting at poles/equator/back, neighboring placements and original-game stacks where applicable. Check silhouette/icon correspondence at small sizes, theme lighting, selection/reaction and reduced motion. Record desktop/mobile and target-browser results separately.
- [ ] **Integration:** add deliberate type/set registrations, capability-aware note mapping, visuals, sample loading and validation in each intended app. The original fixed `Instrument` union and Philharmonic's fixed `AssetSetId`/catalog do not expand just because files exist. Keep app states, save keys and portable schemas separate.
- [ ] **Playback ownership and budgets:** test overlapping notes, duplicate performers, same-onset chords, real tails across loops, deletion/cancellation, stop/pause/seek and load failure. Retain current voice/work bounds without silently dropping or stealing notes. Measure actual runtime memory/loading and dense playback; record any budget exceptions.
- [ ] **Documentation:** update the relevant catalog/capability docs and acceptance record. For changes to original-game instruments/behavior, update `Creation-Guide.md` / `Rules.md`, regenerate `Agent-Guide.md` with `npm run docs:agents` and run `tests/composition-file.test.ts`. Each independent application qualifies its own integration; copying an asset does not qualify it in the other application.
- [ ] **Publication boundary:** establish rights for **audio, meshes, textures and icons independently** before copying assets into a public payload. Use `local-only` while rights are unresolved. Check both GitHub and Site inclusion/exclusion rules when integrating local assets. Asset acceptance alone authorizes no deployment.

## 9. Independent application integration

Bongo Planet and Bongo Philharmonic are separate projects and separate Git repositories. Each owns a copy of this specification, its asset files and all runtime adapters. There is no shared live directory, source import, package, Git submodule or deployment. See the local [instrument integration map](Instrument-Integration.md) and [application boundaries](Applications.md).

Keep the v1 asset-delivery format identifier, pitch conventions, units, mounting coordinates and file requirements compatible between projects. Deliver an asset once, then deliberately copy and integrate it into either project. Each records its own version, provenance and acceptance. Changes in one repository never automatically update the other. A future incompatible contract needs an explicit spec-version decision.

The current app identifiers for new delivery metadata are `bongo-planet` and `bongo-philharmonic`. Historical `bongo-planet-philharmonic` metadata still refers to Philharmonic; retain it in historical provenance. Asset metadata never changes application save formats or storage keys.
