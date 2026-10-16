# Bongo Planet
## Game concept & design brief

**Design brief · Draft 0.4 · 14 October 2026**

**Project name:** Bongo Planet. Use this exact name and follow the historical-name rule in `AGENTS.md`.

**Current musical rule:** one adjacent hop takes one sixteenth note on a shared grid, independent of geometric distance. This supersedes the original distance-based proposal for gated playback. Read the [creation guide](Creation-Guide.md) for chords and rhythmic alignment and [Rules.md](Rules.md) for the executable contract; version-one saved compositions retain their historical behavior.

**Build a living musical constellation on a sphere—and then step inside it.**

Bongo Planet is a playful music game inspired by NodeBeat. The player builds an evolving composition by placing generators and instruments on the vertices of a geodesic sphere. Generators send rhythmic sparks along enabled struts. Connected sound nodes answer with melody and percussion. Moving a node changes its encounters with the sparks, reshaping the music as the player watches it happen.

The sphere floats in three-dimensional space. It can be turned, explored, and played from every side. On a laptop, the composition is heard through a mono preview. In the Sonic Sphere concert hall, those same sound nodes become sources positioned around the audience. The virtual instrument becomes a room-sized musical world.

The first version is a web experience built with **Three.js**, backed by a separate musical engine. Later versions develop the visual spectacle and bring the instrument to **iOS**. This brief is the starting point for a **Game Design Document (GDD)**; its gameplay rules are proposals for Bongo Planet.

## 1. The first minute

The page opens directly onto an **empty geodesic sphere**: a delicate triangular framework with visible vertices, no placed game nodes, and no sound. A small palette sits beside it.

1. Drag a **Generator** from the palette onto a vertex. It snaps into place and begins visibly pulsing.
2. Drag a **Note** onto a neighboring vertex. Keep the generator's outgoing gate enabled; the next spark reaches the note and produces a tone.
3. Wire another hop to a second note. It answers one sixteenth note later, making a short phrase.
4. Add a **Beat** to introduce percussion.
5. Move a node to another vertex. The pattern changes. Rotate the view to discover and populate the other side.

The first deliberate interaction enables browser audio. If activation is blocked, show a small “Enable sound” control. The empty sphere remains immediately available. This accommodates the browser's audio activation policy. [Web Audio guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)

The recurring play loop is **place → listen → move → discover → keep or change**. The first version is an open musical sandbox, with the reward coming from finding a pattern worth listening to.

## 2. The pieces

NodeBeat's official terminology is **Generators** and **Notes**. Its documented core is a proximity network in which distance affects note sequencing. Bongo Planet adapts the pulse-and-response idea to a spherical network; its current gated timing follows musical hop counts. [NodeBeat](https://www.nodebeat.com/?lang=en)

| Piece | Role | Main controls |
| --- | --- | --- |
| **Generator** | A silent clock that sends repeating sparks along enabled struts. | Spark interval, whole-hop travel or Infinite, emit new sparks. |
| **Note** | Produces a pitched sound when a pulse reaches it. | Scale degree, octave, timbre, duration, level. |
| **Beat** | Produces a percussion sound when triggered. | Kick/hat/snare or other sound, decay, level. |

A structural vertex is a **placement slot**; a game node is a **piece occupying that slot**. Start with one piece per vertex. An occupied destination is visibly unavailable, and an invalid drop returns the piece to its previous position.

Instruments can respond to more than one generator, allowing overlapping phrases and interlocking rhythms. Directed gates control the routes independently of instrument placement. Gate wiring stays on the struts when instruments move.

## 3. The sauce: geometry becomes music

**One hop is one musical step.** Each adjacent crossing takes one sixteenth note: 0.25 quarter-note beats, or 125 ms at 120 BPM. Empty junctions and revisits count too. Strut length has no effect on musical delay. Longer routes take more steps, and a circuit can outlast its generator interval.

**Equal-hop branches make chords.** Notes reached after the same number of hops from a simultaneous launch sound together, even when their routes cover different physical distances. A chain makes a phrase; an extra empty junction inserts a step. Multiple coincident arrivals retain their separate voices.

**Pitch belongs to the note.** Global key and scale constrain the pitch palette. Moving a note changes its encounters and spatial position while preserving its selected pitch. Generator emissions and all active circuits share one beat grid; tempo changes take effect together at the next whole beat. Harmonic choices and note lengths remain deliberate composition decisions.

**Position places the sound.** The sounding Note or Beat supplies the source position. Moving it around the sphere also moves its sound around the concert hall. Turning the camera changes the view; the composition stays fixed in its own coordinate system.

**The network wraps around the sphere.** Sparks can cross the far side and pass around the poles by following enabled adjacent struts. Their visual speed varies with edge length so every visible arrival matches its musical timestamp.

For predictable editing, the engine commits one edge at a time and reads the gates at each arrival. Moving a node reconciles the pending destination sound; deleting it cancels its pending triggers. Audio timing drives the display, so a dropped animation frame does not change the music. See the [creation guide](Creation-Guide.md) for practical examples and the contract agents must preserve.

## 4. Playing the sphere

Drag a placed piece to move it between vertices. Drag empty space to orbit the camera; use the wheel or pinch to zoom. Highlight the intended destination and preview its connections before committing a move. Make the rear hemisphere visually quieter so foreground placement stays readable; rotating the sphere exposes hidden vertices.

Selecting a node opens a compact inspector. Keep **Play/Pause**, **tempo**, **key/scale**, **volume**, **Undo**, **Clear**, and **Save/Load** easy to reach. Show venue-output connection status when that output is enabled. Clearing the scene restores the empty starting sphere. Pointer and touch actions must clearly distinguish moving a piece from moving the camera.

After manual placement works well, add optional **wander**: pieces move between neighboring vertices, with smooth travel along the edges. Players can freeze movement to preserve a pattern while the music keeps playing. Movement, muting, and transport pause remain separate controls.

## 5. Motion and visual character

The first build should already feel alive: a dark stage, a restrained luminous mesh, distinct node shapes, and clear depth. Every musical event has an observable cause and response.

| Moment | Animation |
| --- | --- |
| **Placement** | The destination lights up; the piece settles onto its vertex with a small, quick bounce. |
| **Generator fires** | A bright ring expands as a wavefront over the sphere's surface. |
| **Pulse travels** | Sparks follow the enabled struts with audio-timed arrivals, showing which pieces will respond. |
| **Note or beat sounds** | The receiving piece brightens and swells at the audible onset, then fades with its envelope. |
| **Piece moves** | A highlighted destination and short trail make the relocation easy to follow. Sustained sounds follow the source's interpolated position. |
| **Pattern grows** | Interleaving pulses and flashes reveal the composition's structure across both hemispheres. |

Later visual passes can add richer materials, restrained bloom, longer trails, reactive mesh lighting, and an inside-the-sphere performance view. Effects should preserve node legibility and timing feedback. A reduced-motion mode keeps the musical information through simple highlights.

## 6. Two outputs, one composition

### Mono preview

The browser synthesizes and mixes all voices into one mono output. It provides a complete musical preview through ordinary speakers or headphones. Level management keeps dense arrangements usable. The mono mix lets the player hear the composition; spatial placement is demonstrated by the visual model and the venue output.

### Sonic Sphere output

The likely protocol recalled as “XYZ MIDI” is **Open Sound Control (OSC)**. Use **ADM-OSC**, a live-production convention for transmitting audio-object positions. It defines `/adm/obj/{id}/xyz` with three normalized coordinates. MIDI can carry note instructions separately; MIDI Show Control concerns theatrical cues. [OSC](https://opensoundcontrol.stanford.edu/), [ADM-OSC specification](https://immersive-audio-live.github.io/ADM-OSC/), [MIDI Show Control](https://midi.org/midi-show-control)

The venue output needs **both musical events and position metadata**. ADM-OSC carries placement information; the receiving synth and spatial renderer must also produce the individual sounds. A combined mono signal loses their independent positions.

Proposed first route:

**Web engine → WebSocket bridge on the venue computer → per-object sound synthesis + OSC-controlled spatial renderer → speaker system.**

The bridge converts browser messages into the venue's supported control messages. Browser-to-WebSocket and host-to-UDP transport are a documented OSC integration pattern. [osc.js transport documentation](https://github.com/colinbdclark/osc.js)

Keep stable object IDs and timestamps so each trigger, voice, and position update refers to the same sound node. Define a common right/forward/up coordinate system, then map it to Three.js and the venue. Store venue orientation, scale, speaker coordinates, channel assignments, renderer protocol, and subwoofer routing in a separate output profile.

### First venue: Château du Feÿ, KA8

The target called “Faye” appears to be **Château du Feÿ**. Its historical technical description confirms **30 speakers in six rows of five, plus one powered subwoofer**, with Reaper in the playback chain. This supports the remembered **30.1** configuration. Treat it as the documented rig, with the current installation to be checked before integration. [Official KA8 account](https://www.sonic-sphere.com/spheres/ka8-fey)

DomeForge already contains a **full-sphere 3V KA8 preset**, with a fitted diameter of approximately **7.17 m**. Its geodesic generator gives a standard 3V shell **92 vertices**. These are model values: the structural preset supplies the starting geometry, while the physical speaker layout requires its own data. [KA8 preset](/Users/jeremyguillory/Documents/vibecode-projects/codex/domeforge/src/data/presets.ts:108), [Geodesic counts](/Users/jeremyguillory/Documents/vibecode-projects/codex/domeforge/src/geometry/geodesic.ts:11)

The game therefore has many placement vertices and a separate 30-speaker rendering destination. The KA8 account describes speakers mounted on struts; game pieces do not have to coincide with physical speakers. The spatial renderer distributes sources across the measured layout.

## 7. Engine and platform boundaries

Build a **platform-independent model and musical rule layer**, initially in TypeScript. It owns sphere topology, vertex occupancy, node properties, generator relationships, transport, and timestamped sound events.

Keep the following adapters around that engine:

- **Three.js:** scene rendering, picking, camera, and animation.
- **Web Audio:** local synthesis and mono preview.
- **Venue output:** event delivery, OSC encoding, and connection status.
- **Storage and input:** saved scenes, undoable edits, mouse, and touch.

Use an audio clock for scheduling and an explicit timestamp conversion at the venue boundary. Save topology/preset identity, node vertex IDs, musical settings, and schema version. Venue connection details belong to the local output profile rather than the shared composition.

For iOS, preserve the scene format, event contracts, and musical behavior tests. Choose the shared runtime or native implementation when that phase begins. Engine/runtime sharing and the native presentation layer remain explicit iOS architecture decisions.

## 8. Build in stages

| Stage | Deliverable | Completion test |
| --- | --- | --- |
| **1. Playable proof of concept** | Empty 3V sphere; Generator/Note/Beat palette; vertex snapping; orbit/zoom; automatic connections; mono sound; basic animations; save/load; bridge delivering musical events and XYZ data to a test receiver. | An unfamiliar player makes a recognizable pattern within a minute; the receiver shows matching sound IDs and positions. |
| **2. Feÿ integration** | Venue synthesis; spatial renderer connection; calibrated 30.1 output profile; synchronized sound and position control. | A known node sounds from the expected direction, and relocating it produces the corresponding change in the hall. |
| **3. Visual development** | Better materials, shaders, trails, reactive lighting, optional wandering, inside view, and performance presentation. | The sphere looks increasingly compelling while pieces and musical causality remain clear. |
| **4. iOS** | Touch-first interface, native audio/lifecycle handling, saved-scene compatibility, and appropriate venue connectivity. | The same saved scene retains its musical rules and can be comfortably played on a touch device. |

For current gated playback, verify that equal-hop branches form a chord despite unequal strut lengths, extra hops create distinct onsets, generators and existing circuits remain aligned through tempo changes, camera movement preserves the composition, deleting nodes leaves no stray triggers, and falling frame rate preserves musical timing.

## 9. Decisions to settle through the prototype

The current defaults are an empty 3V sphere, manual placement, one piece per vertex, shared tempo, constrained melodic pitches, directed gates and equal sixteenth-note hops. Explore useful rhythms through routing, empty steps, branches, generator intervals and note lengths. Geometric distance determines appearance and spatial position; it does not determine gated timing.

Before venue playback, confirm the current Feÿ speaker coordinates and channel map, the available synth/spatial renderer and its supported OSC grammar, and acceptable latency between interaction, sound, and animation. OSC control output can be demonstrated with a receiver before these are known; successful spatial playback requires the full sound path.

The supplied [NodeBeat research archive](./NodeBeat-Research.zip), particularly `NodeBeat-Research/Dossier.md`, informed the source/receiver distinction, animation feedback, and engine separation. Bongo Planet's spherical rules and palette are original design proposals.
