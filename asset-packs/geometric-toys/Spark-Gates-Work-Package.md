# Bongo Planet — spark gates work package

**Version 0.3 · 14 October 2026 · Status: implemented candidate; automated qualification recorded, human acceptance open**

Build selectable, adjustable switch indicators on the planet's struts and a musical engine that actually follows their state. Replace the generator's percentage-based Spark travel control with a positive integer number of node-to-node hops or **Infinite**.

This follow-up to [Work-Package.md](./Work-Package.md) records the gate-routing implementation and acceptance plan. Gated playback is present in the current source. The [creation guide](Creation-Guide.md) explains its chords, shared musical grid and rhythmic alignment; [Rules.md](Rules.md) is the current executable contract. The timing rules below incorporate the authorized equal-hop change. Other original UI defaults and acceptance requirements remain historical plan material and do not imply acceptance. [design/Route-Journeys.md](./design/Route-Journeys.md) describes legacy version-one playback. Work stays in the original Bongo Planet checkout; the independent fork has its own instructions and services.

Permanent browser URL: **http://127.0.0.1:5417/BongoPlanet/**. Preserve strict port 5417, the application base path, and bridge port 5418. Check the port before starting a server during implementation.

## Current authorized changes and evidence

The kickoff checkpoint is `396c820`. Implementation and test artifacts are in [the final review](evidence/spark-gates/review.md) and [the individual acceptance checklist](evidence/spark-gates/Acceptance-Checklist.md). Later direct user requests in this shared checkout supersede these original plan details:

- Every directed gate is a permanent flat mark, clickable without selecting an instrument. Five gate glyphs are available: Arrow, Chevron, Triangle, Bolt and Comet. The original dimensional Ink/Toy/Glow switch designs below are historical.
- Sparks have three appearance choices: Ember, White ball and Lightning. Edit look is a persistent left-panel tray; it keeps the globe interactive.
- Placing a generator turns **all outgoing arrows at its node On**, including previously authored Off arrows, in the same Undo operation. Moving a generator preserves both junctions' wiring.
- A first gate edit in a legacy composition creates the gated copy and applies that toggle as one history operation, paused at beat zero. Undo restores the original paused. The earlier dedicated copy button and outgoing-gate inspector/bulk controls have been replaced by direct canvas editing and keyboard gate navigation.
- Every current gated hop takes one sixteenth note. Equal-hop forks form simultaneous arrivals; all active circuits follow the master tempo at whole-beat changes. Geometric-distance timing remains only in version-one compatibility playback.
- Save/export now bundles the independently validated musical scene and appearance in a `bongo-planet-composition` envelope, following the later AI-music/file-format request. Bare version-one/version-two scenes remain importable. Look changes still do not change routing or musical history.

Superseded acceptance cases are explicitly identified in the checklist; they are not counted as passing their original requirements. Actual listening, unfamiliar-player and Safari review remain separate from automated results.

## Intended result

Outgoing connections show permanent flat gate symbols embedded in the struts. Click a gate to enable or disable that exit, including at an empty junction. An arriving spark plays the instrument and then continues, branches, or ends according to the gates. No separate routing tab is introduced.

The same saved routing works with five gate glyphs and three spark styles, adjustable through Edit look. Changing appearance never changes routing, transport, notes, or sound.

Each generator exposes **Spark interval** and **Spark travel**. Travel offers a positive whole-number value and an Infinite option. A finite limit counts every completed strut hop, including empty junctions and revisits. The limit is a maximum: a spark can end sooner at a junction with no enabled exits.

The user's confirmed ownership rule is **“Stay on the struts.”** Moving or deleting an instrument leaves the switches and wiring at their existing junctions. Moving a generator likewise does not carry or overwrite wiring.

## Requirements and implementation defaults

The following requirements come from the conversation:

| ID | Required behavior |
| --- | --- |
| SG-01 | Switch indicators live on the struts and can be clicked On or Off. |
| SG-02 | All gates remain visible and editable on the sphere, independently of instrument selection. |
| SG-03 | Flat directional glyphs use outline/filled state cues and a contiguous arrow contour. |
| SG-04 | Deliver five selectable gate glyphs and three selectable spark styles in the live look tray. |
| SG-05 | Switch state controls the musical backend, including stopping, continuing, and branching sparks. |
| SG-06 | Generator travel is a positive integer number of node-to-node hops or Infinite, replacing the percentage control. |
| SG-07 | Switches stay attached to the struts when instruments move. |
| SG-08 | Each adjacent hop takes one sixteenth note, independent of geometric length. Emissions and all active circuits share a master grid and whole-beat tempo changes. |

The detailed rules below are explicit implementation defaults. They resolve questions needed for a deterministic build. If a default changes during implementation, update this package and its independent fixture expectations before accepting the affected step.

## Routing contract

### Directed exits at every junction

A routing node is a structural vertex of the sphere, whether or not an instrument occupies it. Store wiring by stable vertex IDs and directed neighbor pairs, independently of instrument IDs.

- A gate near vertex A on strut A–B controls **departure from A toward B**. B's gate on the same strut controls B toward A independently.
- Off blocks departure in that direction. It does not prevent a spark arriving at A from playing A's instrument.
- A spark may arrive along any strut. At arrival it may depart only through the currently enabled outgoing gates at that junction.
- Honor every enabled exit. If the gate back toward the incoming neighbor is On, the spark can bounce back. Do not silently suppress that exit.
- A disabled exit never receives a child spark. There is no fallback shortest path, automatic detour, or prewritten song route that bypasses an Off gate in gated playback.
- The finite travel budget can stop a spark even when exits are On. The UI should distinguish a completed travel limit from a blocked exit in the local arrival feedback.

Gate state is **On / Off**. The current flat glyph is filled when On and outlined when Off. The original contact-dot/hinged-arm notation has been superseded by the later flat-arrow request.

### Arrival, sound, and branching

Handle each arrival once, in this order:

1. Complete the current edge and increment the spark's hop count.
2. Play the sound occupying that vertex at the committed arrival time. Empty vertices and generators are silent.
3. Check the travel budget. If exhausted, end the spark there after the sound.
4. Read the outgoing gate state effective at this arrival.
5. Depart through the enabled exits, or end if there are none.

| Enabled exits with budget remaining | Result |
| --- | --- |
| Zero | The instrument plays on arrival; the spark ends. |
| One | The same spark identity continues along that strut. |
| Several | End the incoming branch and create one child branch per enabled exit, retaining its generator/emission provenance and recording the parent spark ID. |
| All | Send one child along every neighboring strut, including the return strut if enabled. |

Children inherit the parent's used hops, remaining budget, and musical grid. Every child crosses its next strut in one sixteenth note, even when those struts have different lengths. Splitting never gives them a fresh hop budget. Sort exits by stable neighbor ID when assigning child IDs so identical input yields identical results.

Distinct arriving sparks remain distinct musical arrivals, including simultaneous arrivals from the same emission. Revisited instruments play again. Do not deduplicate sounds just because their time, pitch, vertex, or generator matches. Rendering may combine coincident heads if it reports the combined count and preserves every musical event.

Passing a generator does not trigger another generator emission. Its own clock remains independent; an arriving spark uses that junction's outgoing gates and stays attributed to its original source generator.

### Travel limit and timing

| Topic | Rule |
| --- | --- |
| Meaning of N | A maximum of N completed strut hops per branch from the source. The source starts at hop zero. Empty vertices and revisits count. |
| Travel 1 | Reach adjacent vertices, play any instruments there, and end without a second hop. |
| Travel 3 | Reach at most three successive vertices after the source. Play the third arrival, then stop. |
| Input | Accept positive safe integers and a tagged Infinite value. Reject zero, negatives, decimals, unsafe integers, numeric NaN/Infinity, and malformed tags. Do not restrict finite limits to the sphere's 92 vertices; revisits are valid. |
| New generator default | 8 hops. This is a build default, not a conversion from an old percentage. |
| Infinite | No hop-count cutoff or automatic lifetime fade. A spark may circulate until wiring stops it, its source is deleted, transport is reset, or the documented capacity policy stops playback. |
| Hop timing | Each adjacent crossing takes 0.25 quarter-note beats, one sixteenth note. At constant tempo, duration is `15 / BPM` seconds: 125 ms at 120 BPM. Empty vertices and revisits count equally. |
| Branch timing | Equal-hop branches from the same departure arrive together. Geometric speed varies per edge so arrival matches the grid; speed is a display diagnostic, never a timing input. |
| Emission grid | All generators share transport beat zero. Snap each saved `phase * period` to the nearest 0.25-beat offset, rounding midpoint ties upward and wrapping modulo period. Added/enabled/edited generators join their next eligible strictly future boundary. Preserve saved phase metadata. |
| Separation of controls | Interval controls when new pulses are emitted. Travel controls their maximum hops. Neither changes the one-step hop duration. |
| Tempo | Apply BPM changes at the next integer beat. Every active circuit and subsequent emission uses the new BPM from that boundary; the crossing ending there keeps its committed arrival. Anchor conversion to the master beat so Infinite circuits cannot accumulate rounding drift. |
| Quantization | Sounds occur at the grid-aligned vertex passage times. Legacy radial quantization metadata does not move gated sounds away from those arrivals or change the fixed sixteenth-note hop grid. |

Use the existing straight painted-seam geometry for display and spatial positions. Geometric length, camera, instrument placement, styling and render FPS never determine gated hop duration. A circuit can last longer than its generator interval; later pulses may overlap earlier ones. The [creation guide](Creation-Guide.md) gives practical chord and loop examples.

### Factory wiring and first use

An unconfigured junction has all exits Off. This keeps an unwired planet quiet and makes each enabled connection explicit.

Placing a new generator turns all outgoing gates at its vertex On, including a previously authored record. Include this initialization in the same undoable placement operation. Placing, moving, or changing a sound instrument never changes wiring. Moving a generator never initializes or resets destination gates.

Consequently, a newly placed generator can launch to its immediate neighbors; continuation requires wiring those junctions. Make the launch preview show the actual enabled exits. Supply a prepared connected example so the full musical behavior is immediately reviewable without wiring the sphere from scratch.

An empty junction can be a silent guide, splitter, or sink. Its gates can be edited directly without selecting it. While a placement tool is active, empty-slot clicks retain their placement meaning; a gate click owns its own gesture. Do not merge placement, piece selection, routing selection, and explicit movement intent.

## Live editing and lifecycle

The audio-clock engine is the single authority for routing and sound. View code displays engine decisions; it never decides arrivals or spawns musical branches.

| Action | Required result |
| --- | --- |
| Toggle a gate | Apply the edit at the effective audio time when the worklet accepts the command. Subsequent uncommitted departures use the new gate state, including sparks already emitted. |
| Gate edit during an edge | The spark completes its already committed edge at its existing time. Do not reverse it mid-strut or teleport it. Its next departure uses the gate state at that next junction. |
| Edit travel limit | New emissions adopt the new limit. Existing branches retain the budget captured by their emission. |
| Move/add an instrument | Keep wiring and in-flight edges fixed. Reconcile pending sound for the affected destination vertices so the actual occupant at arrival plays. Do not redirect or manufacture a spark. |
| Change sound parameters | Sound parameters already committed for an in-flight arrival stay committed. Later edge departures use the current sound settings. |
| Delete an instrument | Cancel its pending sounds and release its voices. Preserve its vertex's wiring and unrelated sparks. |
| Move a generator | Future pulses launch at the new vertex using that vertex's wiring. Existing pulses retain their launch provenance and existing edges. |
| Delete a generator | End every descendant branch from that source, cancel its pending sounds, and release its owned voices. Do not stop another source's branches. |
| Disable a generator | Stop future emissions. Already emitted sparks continue, including Infinite sparks. Pause is the way to stop all ongoing playback. |
| Pause/clear/load/interruption | Clear propagation and pending sounds; release voices within the existing 100 ms rule; clear visual heads and branch feedback; never replay missed arrivals on resume. |
| Undo/redo | Restore wiring and travel through the normal scene-edit path. Do not resurrect canceled spark IDs or sounds. Clear/load restoration keeps its existing paused-session behavior. |
| Appearance change | Update appearance immediately without generating an engine edit, restarting transport, or altering any spark budget. |

Give gate edits an acknowledged effective time/revision in diagnostic data. Order equal-time commands and decisions by their acknowledged acceptance/processing sequence: a command accepted before an unprocessed arrival applies to that departure. A command accepted after an arrival was processed cannot undo it, even if clock quantization gives both records the same timestamp. Never change samples already rendered.

Schedule each in-flight edge's destination sound ahead at its known arrival time, using the current destination occupant. Reconcile that pending sound on occupancy changes before arrival, with explicit cancellation/new IDs. This preserves advance notice for the synth and local bridge. Do not wait for a main-thread collision callback to request sound or remote playback.

## Streaming backend and bounds

The current backend creates complete automatic walks and all their visits at emission. Gated propagation needs a bounded stream of next-edge decisions. Infinite travel must not be represented by a huge or endlessly growing route array.

Retain for each active branch: session, source generator and emission identity/beat, spark/parent identity, current edge endpoints, grid-derived departure/arrival times, derived display speed, travel budget/used hops, and its pending sound identity if any. Keep only necessary active state and a bounded recent-history buffer. IDs and parent references must have bounded size; do not retain an entire ancestral chain or append an ever-growing path to an ID.

- Process generator boundaries and spark arrivals in one chronological audio-clock queue. Simultaneous events have stable sequence ordering. An advance over several due arrivals must produce the same timeline as fine-grained advances.
- Commit only active edges and the necessary upcoming sound events. At an arrival, inspect its exits and commit the next edges. Do not expand all future branching paths.
- Reject invalid or non-adjacent gates in the model. Validate scene changes before replacing live state.
- Keep current limits of 64 voices, 5,376 pending sounds, and 128 rendered spark heads. Establish a separate gated limit of **256 active propagation edges**, a bounded queue, and an enforced **2,016 vertex arrivals per audio-clock second**. Legacy route limits keep their existing meaning.
- Check prospective branching against capacity before creating children. If a logical limit would be exceeded, pause playback with a specific reason, cancel pending work, release voices, and reset both renderer and output. Never silently omit an enabled branch or truncate Infinite to a finite distance.
- Bound work per audio quantum and event/telemetry retention as well as resident object counts. Document the measured audio-worklet budget and any adjustment to these initial limits before accepting dense playback.
- The drawing cap can limit visible heads without affecting the engine. Show logical/visible counts and hidden-head counts in diagnostics. A render limit must never become a routing limit.

Infinite circuits plus repeated emissions can accumulate sparks. That is real musical state, not a memory leak; reaching the declared capacity must follow the visible pause policy. For sustained Infinite-loop qualification, emit a controlled number of sparks and disable future emissions before the resource limit. Separately test repeated-emission saturation and deliberate maximum branching.

**Measured adjustment:** equal-hop timing synchronizes arrivals, so the work limit is **64 decisions per actual audio quantum**, including master-boundary decisions. The initial 128-decision limit allowed a 96-edge trace whose maximum CPU time was 2.924 ms against a 2.902 ms quantum. The final 64-edge trace measured 1.592 ms maximum CPU time, with 768 arrivals/second and no late events or telemetry loss. Both traces are retained in `evidence/spark-gates/step-03/`. Logical edge/arrival caps remain separate upper bounds; a synchronized population can hit the work limit earlier. This is a reference-machine measurement, not a guarantee for every device or every branching layout.

New events must let the view recover each current edge and its timing, branch creation, arrival, and termination, including an effective stop time. Main-thread telemetry arriving early or late must not invent another route. Render on the audible clock, and mark canceled sessions so delayed events cannot reappear. Any reliable-stream overflow must be an explicit failure, not silent loss.

Reuse ordinary sound trigger/cancel/reset events for the output adapter. Preserve its trigger-sequence/ID contract and existing wire grammar. Internal routing metadata must not accidentally enter the strict bridge packet schema. A local receiver test proves control delivery; actual Feÿ playback remains a separate acceptance gate.

## Original visual plan — superseded

The following Ink/Toy/Glow table and dialog controls describe the original implementation plan and retained early evidence. The current authorized flat gate glyphs, spark styles and persistent look tray are specified above and in `README.md`; these historical controls are not current requirements.

All three styles represent the same two contact dots and hinged arm. **On is a joined contact; Off is a lifted arm with a visible gap.** An embedded directional tip points away from the owning junction. Shape must carry state even with color and glow removed.

| Style | Treatment | Character |
| --- | --- | --- |
| **Ink** — initial default | Thick charcoal outlines, ivory strokes, rounded but slightly uneven terminals, shallow raised strokes, and a restrained yellow conducting accent. Use deterministic, fixed stroke irregularity. | A handwritten circuit drawing turned into a tiny object. |
| **Toy** | Rounded enamel contact beads, a chunky hinged rod, soft dark outlines, and small shadows. Use the planet's existing cream, yellow, mint, and coral palette. | A small, friendly mechanical switch belonging to the geometric instruments. |
| **Glow** | Slim dimensional light tubes and glowing contact beads with a dark supporting outline. The lifted arm and gap remain readable without bloom. | A luminous circuit mark that responds locally as a spark passes. |

Keep one structural connection per neighboring vertex pair. Indicators are local marks on that connection; they must not add a second curved track or route line. Sparks continue along the exact existing seam. Place the gate near its owner, initially around one quarter of the way along the strut. Opposite-end controls must not overlap at normal settings.

Add a compact **Spark switches** section to the existing Edit look dialog:

| Setting | Initial range/behavior |
| --- | --- |
| Style | Ink / Toy / Glow, with a small actual-render preview of each. |
| Size | 0.7–1.6 times the measured default, clamped so opposite-end indicators remain distinct. |
| Stroke | 0.65–1.6 times the default stroke/rod thickness. Each style implements the setting. |
| On color / Off color | Existing swatches plus validated color values; retain geometric On/Off cues. |
| Glow | 0–1; zero must leave every style readable. |
| Animation | Enable/disable the short switching and passage response. Reduced motion overrides animation. |
| Reset switches look | Restore these visual defaults without touching gate state, instruments, or playback. |

Persist these settings with appearance, independently of composition and scene Undo. Extend look import/export and default missing fields in older appearance files safely. Preserve the existing visual controls and avoid resetting unrelated colors when switching styles. Reuse/dispose materials and geometry; changing styles repeatedly must not grow renderer resources.

Selection brings the owning junction's five or six gates forward visually. Other wiring may retain subtle state marks; it must not produce a forest of overlapping click targets. Keep the rear hemisphere quieter and occluded gates unpickable through the planet. If a selected exit is hidden on the far side, the keyboard-accessible exit list remains usable.

## Interaction and accessibility

- Click or tap a visible gate to toggle it once, committing on release. Capture the gesture so it cannot also place, move, delete, or select a different instrument.
- Dragging beyond the click threshold, pointer cancellation, Escape, focus loss, and competing-pointer cancellation leave the gate state unchanged. Empty-space drags keep their camera-rotation meaning.
- Keep hit targets usable even when the drawn symbol is small: aim for 24 CSS pixels on desktop and 44 CSS pixels in touch layouts for exposed selected gates. Resolve overlapping hit regions with nearest-visible-object picking; do not enlarge invisible targets across another strut.
- With the sphere focused, arrow keys select an exposed gate and Space/Enter toggles it. Keyboard navigation replaces the original outgoing inspector and bulk rows under the later direct-edit request.
- Gate state updates immediately in the view; acknowledge its effective engine revision in diagnostics. Preserve visible feedback if the audio engine is locked, interrupted, or paused.
- Keep Play, the existing palette, musical settings, trash, history, save/load, and continuous camera rotation working. Routing selection must not revive implicit instrument relocation.

## Composition and compatibility

Introduce an explicit **version-two gated composition** rather than changing the meaning of a version-one file silently. Keep the current build's interpretation of version-one radial scenes, automatic journeys, and saved song paths, including its existing instrument migration.

| Data | Required representation |
| --- | --- |
| Playback mode | Version two identifies gated propagation explicitly; version-one radial/route interpretation remains a separate compatibility path. |
| Wiring | A bounded collection of per-vertex outgoing-neighbor lists. A missing record means all Off; an explicit empty list is authored all-Off wiring. Maximum 92 junction records and 540 directed neighbor entries. |
| Generator travel | A positive safe integer or the literal tag `infinite`. Never serialize JavaScript Infinity, null-as-Infinity, or a rounded percentage. |
| Generator/music data | Stable piece IDs, vertices, labels, instruments and musical settings. Preserve saved interval/phase/enable values; interpret gated phase on the shared grid as specified above. |
| Transient state | Exclude active sparks, queues, camera state, output endpoints, and audio-clock timestamps from composition. Load starts paused at beat zero. |
| Appearance | Appearance has its own strict schema and browser preset. The portable composition envelope may bundle it beside the musical scene; it never alters gate state or time. |

Validate unique junction records and neighbor entries, valid vertices, actual adjacency, correct tags, and all existing occupancy/ID limits. Reject a bad file atomically while keeping the current composition and previous good save. Gate editing, source initialization, bulk edits, and travel changes participate in scene history.

Fresh and cleared compositions use the gated format. Existing version-one compositions keep their existing musical mode on load and export. The ordinary generator inspector must not reintroduce a percentage-based travel slider. A legacy scene shows its route identity; a first gate click deliberately creates the gated copy and performs that toggle as one paused history operation.

Making that copy is a deliberate musical change: preserve pieces and their IDs; initialize generator limits to 8; start paused; retain the original file/save until the user chooses Save. For an existing journey/song scene, seed directed wiring from its route walks. For a radial scene, seed deterministic adjacent shortest paths from each generator to its currently eligible target vertices. Specify tie-breaking and the seeded records in the conversion fixtures. A union of these paths can introduce branching at shared junctions, so show that consequence in the conversion preview. Do not claim equivalent playback or infer an exact hop limit from angular reach or cycle percentage. Treat conversion as one history operation whose Undo returns to the prior legacy composition paused.

Audit the current built-in examples and public fixtures through F14 before adding new ones. Preserve their legacy playback; add gated examples separately and choose new fixture IDs only after checking for collisions. Legacy routes are compatibility data, not a way to bypass new gates.

## Source map

These pointers were checked against the working checkout on 14 October 2026. Recheck them at implementation kickoff; the checkout already contains unrelated local changes that must be preserved.

| Responsibility | Current files and required integration |
| --- | --- |
| Contracts/validation | `src/core/contracts.ts`: currently strict version one; generators have reach, optional travel and optional path. Add the gated schema, pure wiring edits, limit validation, and explicit compatibility handling. |
| Geometry | `src/core/geometry.ts`, `src/core/routes.ts`: reuse deterministic adjacency and seam distances. Current automatic routes are complete walks based on reach; do not use them as the gated decision authority. |
| Engine | `src/core/engine.ts`: currently plans complete routes/visits at emission. Add a focused gated propagation module and integrate chronological arrivals, budgets, live gates, and cancellation. Keep Three.js/DOM/Web Audio out of the core. |
| Worklet/audio | `src/audio/processor.ts`, `protocol.ts`, `AudioAdapter.ts`, `synth.ts`: propagate new event/status fields, schedule actual samples at arrival, acknowledge edit revisions, and surface capacity reasons. Preserve the reliable event channel and clock handling. |
| View/input | `src/view/SphereView.ts`: gate placement, selection, occlusion, hit testing, gesture ownership, and effective-time feedback. Add a focused gate renderer/model instead of duplicating sphere geometry. |
| Spark presentation | `src/view/StrutSparkModel.ts`, `StrutSparkRenderer.ts`, `strutRoutes.ts`: support bounded edge events and branch identity; currently the model expects full route arrays. Handle every new event type before accessing trigger-only fields. |
| Inspector/integration | `src/view/selectionPanel.ts`, `src/main.ts`, `src/panel.css`: replace the percentage field, handle numeric/tagged input correctly, wire gate edits through scene history, and preserve persistent placement and explicit movement. |
| Appearance | `src/view/art/appearance.ts`, `controls.ts`, existing theme defaults/assets: add the three styles, settings, missing-field defaults, and preset validation. |
| Persistence/output | `src/core/history.ts`, `src/output/OutputAdapter.ts`, `protocol.ts`: atomic dual-version import, Undo/save round trips, and compatible future sound/cancel delivery. |
| Existing verification | `tests/route-journeys.test.ts`, `strut-sparks.test.ts`, `piece-panel.test.ts`, `appearance.test.ts`, `core.test.ts`, `engine.test.ts`, worklet/audio/output tests, and the existing browser suites. Extend focused tests and retain legacy expectations. |

Use a single integrating implementation sequence. This package does not require parallel workers or a generic routing plugin framework. Maintain one shared rule/data contract across the engine, view, and audio/output boundaries.

## Independent reference scenes

Define fixtures with labeled adjacent vertices and expected timelines before deriving expected results from the implementation. Use actual topology IDs obtained from the geometry; never invent IDs or call the routing algorithm to generate its own expected answers.

| Fixture | Independent expectation |
| --- | --- |
| **Chain** | G → A → B → C, with an instrument at each destination and all unrelated exits Off. Limits 1, 2, and 3 yield exactly A; A/B; and A/B/C. Empty vertices count in a second variant. |
| **Fork** | G → A, then A → B and A → C. At 120 BPM A sounds at 125 ms and B/C sound together at 250 ms despite unequal strut lengths. Each child inherits the source budget. |
| **Sink** | A plays on arrival with every A exit Off; no B/C arrival or sound follows. |
| **Return** | A's return gate to G is On. The spark returns on the same strut, spends another hop, and never creates a new clock emission by passage. |
| **Convergence** | Two branches reach the same instrument. Both musical arrivals retain distinct IDs/provenance; no accidental sound deduplication occurs. |
| **Finite loop** | A directed three-vertex loop with limit 7 produces seven edge completions, including revisits, then ends. |
| **Infinite loop** | The same loop with a controlled emitted population passes at least 10,000 hops without a hidden cutoff; disabling future emissions keeps existing sparks alive. An exit switched Off ends the appropriate next departure. |
| **Moving instrument** | Move an instrument between already wired vertices while a spark is traveling. Wiring remains identical; the occupant at the arrival vertex plays; its removal does not terminate the circuit. |
| **Two sources** | Overlapping generators share the same sixteenth-note grid while retaining separate emission identities, intervals, budgets, voices and cancellation ownership. A tempo edit changes all circuits together at the next whole beat. |
| **Overload/recovery** | Maximum branching/repeated Infinite emissions reach a declared logical limit, visibly pause, release resources, and recover after circuit simplification. No partial split is mistaken for valid playback. |

For timing, use the independent musical oracle `hop count * 15 / BPM` after emission at constant tempo. At 120 BPM, chain arrivals are 125/250/375 ms and equal-hop fork destinations form a chord. Include unequal-edge cases, phase snapping, sources joining mid-playback, tempo changes, and long Infinite circuits. Compare expected sample frames as well as event timestamps. Preserve the old song/route fixtures for version-one compatibility checks; their distance-based oracle applies only to those legacy modes.

## Milestones and ordered steps

| Milestone | Steps | Reviewable result | Pass gate |
| --- | --- | --- | --- |
| **G0 — routing contract proven** | 1–2 | Validated gated scenes and readable chain/fork/sink/budget timelines. | Contract and finite-route tests pass. |
| **G1 — musical propagation proven** | 3 | Real sample playback, live gate decisions, Infinite circuits, bounded state, and compatible local output. | Timing, lifecycle, capacity, and output checks pass. |
| **G2 — editable planet complete** | 4–6 | On-strut editing, all three adjustable styles, node-count/Infinite controls, and saved circuits. | Interaction, style parity, persistence, and browser checks pass. |
| **G3 — package verified** | 7 | Runnable build, prepared examples, source/evidence records, and complete review checklist. | Required automated and human checks pass; blocked/not-run checks remain open. |

Each step ends with automated tests and human-checkable evidence. Use IDs `SG-Sxx-Ayy` and `SG-Sxx-Hyy`; list every check separately in `evidence/spark-gates/Acceptance-Checklist.md`, initially **not run**. Expand grouped cases below into individually reported subcases, including each visual control, invalid-input category, lifecycle action, style, and browser. A passing subcase must not hide a failed or unrun one. Report **passed / failed / blocked / not run**. Screenshots, mocks, and engine logs do not replace listening, actual interaction, or human review.

### Step 1 — establish scene, gate, and timing contracts

**Depends on:** build authorization. **Produces:** versioned schemas, pure directed-gate operations, default/migration rules, independent fixtures, and the acceptance checklist.

Automated end checks:

- **A01:** Accept valid directed exits on every five- and six-neighbor vertex; reject duplicate/non-adjacent/out-of-range records and invalid travel limits atomically.
- **A02:** Verify hop zero/one/three, the Infinite tag, explicit all-Off records, factory source initialization, and appearance/composition separation.
- **A03:** Import/export current version-one scenes and saved song paths without changing their baseline musical interpretation; establish copy-conversion expectations separately.

Human end checks:

- **H01:** Read a labeled directed strut and chain/fork/sink table; confirm ownership, reverse travel, empty-junction counting, and the final arrival's sound are clear.

**Evidence and gate:** contract review, fixture diagrams/tables, and validation results. Pass only when expectations can be read independently of engine output.

### Step 2 — implement finite gated propagation

**Depends on:** Step 1. **Produces:** chronological edge scheduling, actual gate decisions, sound visits, branching provenance, and finite budgets.

Automated end checks:

- **A01:** Chain, sink, fork, reverse, convergence, and finite-loop timelines match the independent expected visits; Off exits receive no sparks. A generator at an all-Off junction emits no outbound sparks while retaining its normal clock boundaries.
- **A02:** Child budgets and the shared grid are inherited; travel edits do not change hop duration; unequal-edge branches form chords; source passage never creates a clock emission; distinct visits remain distinct sounds. Tempo changes keep old and new sparks aligned.
- **A03:** Fine and coarse clock advances yield the same valid timeline, including simultaneous source emissions/arrivals; sound ordering does not depend on frame rate or neighbor enumeration accident.

Human end checks:

- **H01:** Trace one spark through the event report and a split through its parent/children; count completed hops and identify why each branch ends.

**Evidence and gate:** expected-versus-actual traces with endpoints, sound IDs, budgets, times, and provenance. G0 passes when all finite rules pass.

### Step 3 — qualify live clocks, Infinite, and output

**Depends on:** Step 2. **Produces:** worklet integration, actual audio, bounded Infinite propagation, effective-time edits, lifecycle handling, and local receiver evidence.

Automated end checks:

- **A01:** Infinite-loop traversal exceeds 10,000 hops with bounded retained history; disabling future emissions retains existing branches; gate and source deletion stop the correct descendants.
- **A02:** Gate edits before/at/after a departure use the declared effective-time rule. In-flight edges keep their times; moved/added/deleted occupants reconcile pending sound without ghost hits.
- **A03:** Offline rendered sample onsets match predicted arrival sample frames within one frame for deterministic unsampled test voices; live audio follows the existing measured-latency test method.
- **A04:** Enforce edge/arrival/pending/voice bounds and overload recovery; no partial split, non-finite timing, growing route arrays, unbounded telemetry, or zero-time loop is permitted.
- **A05:** Pause/load/clear/interruption and delayed old-session events cannot resurrect sparks or sounds; source ownership remains correct with two generators.
- **A06:** Local receiver gets future sound events with stable trigger IDs, preceding positions, cancellation, and stop/reset. Gate-stream metadata does not break strict wire validation.

Human end checks:

- **H01:** Listen to chain, fork, sink, and a revisiting loop; each expected arrival has a corresponding sound and no destination-created particle.
- **H02:** Switch an exit during travel and verify that edit preserves the committed edge. In a separate action, pause an Infinite loop and verify Pause promptly cancels all in-flight activity.

**Evidence and gate:** clock/edit traces, offline PCM report, measured live capture, receiver trace, capacity report, and bounded-state samples. G1 remains open if live listening or the required receiver checks are unavailable.

### Step 4 — make gates editable on the sphere

**Depends on:** Step 3. **Produces:** one functioning Ink renderer, piece/empty-junction selection, directed gate picking, and inspector equivalents connected to the real backend.

Automated end checks:

- **A01:** Click each selected exit On/Off; both scene data and actual arrivals change. Zero/one/multiple exits produce sink/continuation/split behavior through the UI.
- **A02:** Move/delete instruments and move a generator; wiring stays at both source and destination vertices. Undo restores the intended scene without moving wiring accidentally.
- **A03:** Gate taps do not place/move/delete pieces; dragged/canceled gestures make no edit; persistent palette placement, explicit Move, trash, and orbit remain correct.
- **A04:** Rotate upside down and behind the sphere; hidden rear gates cannot be picked through it. Resize and narrow/touch layouts preserve selection and usable targets.
- **A05:** Keyboard/inspector controls produce the same gate edits as canvas clicks, including an empty junction and bulk All on / All off.

Human end checks:

- **H01:** Select an instrument, open two exits, close one, and hear the change; wire an empty junction; move the instrument and verify the wiring stays visible in place.
- **H02:** Complete the same edits with the inspector and touch emulation; distinguish emulated touch from a physical-device result.

**Evidence and gate:** front/rear/narrow screenshots, a short real interaction recording, resulting composition, and matching engine trace. A decorative switch without routing changes cannot pass.

### Step 5 — deliver all three adjustable styles

**Depends on:** Step 4. **Produces:** Ink, Toy, and Glow; shared look controls; appearance persistence; reduced-motion behavior; resource reuse.

Automated end checks:

- **A01:** All styles expose the same gate IDs/states and preserve an identical engine timeline during playback and style changes.
- **A02:** Size, stroke, both colors, glow, animation, and Reset each affect their stated appearance property without changing composition or resetting transport.
- **A03:** Look import/export/reload retains the settings; old appearance files get safe defaults; invalid files leave the current look intact.
- **A04:** Fifty style switches and setting/reset cycles leave stable geometry/material counts after disposal; zero glow and reduced motion retain clear static On/Off cues.

Human end checks:

- **H01:** Review the same selected circuit in all three styles, from front and oblique views; touching contacts, lifted contacts, direction, and click targets remain clear.
- **H02:** Adjust each style while listening. Review a grayscale/zero-glow comparison and reduced motion; confirm state is readable from shape.

**Evidence and gate:** actual-build comparison captures, per-setting demonstrations, resource counts, and appearance files. All three styles are required; a mockup or dropdown entry alone does not count.

### Step 6 — finish travel controls, history, and examples

**Depends on:** Steps 1–5. **Produces:** integer/Infinite generator controls, complete versioned storage/history, explicit legacy-copy workflow, and ready-to-play gated examples.

Automated end checks:

- **A01:** Set travel 1, 3, 8, a value greater than 92, and Infinite through the real inspector. Verify the backend budget and visible label; reject fractional/invalid values. No ordinary Spark travel field displays a percentage.
- **A02:** Scene save/load/export/import preserves directed wiring, limits, source/music IDs, and instrument settings; load is paused at beat zero with no saved transient sparks.
- **A03:** Gate clicks, bulk edits, source initialization, and numeric/Infinite changes Undo/Redo correctly. Coalesce one numeric gesture to one entry; conversion Undo returns to legacy mode paused.
- **A04:** Corrupt version-two files, unsupported versions, and simulated storage failure preserve the live scene/previous save. Legacy fixtures remain compatible and gated fixture IDs do not collide.

Human end checks:

- **H01:** Open a prepared chain and fork, adjust travel, save/export them, reload, and reproduce the expected phrase and switch states.
- **H02:** Load a current saved-song example, make a gated copy, inspect the intentional musical change, and Undo without losing the original.

**Evidence and gate:** exported files, round-trip/history records, screenshots of every travel state, and the example review script. G2 passes only when editing, styles, storage, and actual playback work together.

### Step 7 — regression, soak, and handoff

**Depends on:** Step 6. **Produces:** verified browser build, completed checklist, updated implementation docs, and an inspectable delivery.

Automated end checks:

- **A01:** Run production build/type checking, unit tests, and relevant browser/audio/output regressions. Record all failures and environment blocks rather than excluding them silently.
- **A02:** Compare gate fixture sound/event timelines at 60, 15, and 2 render FPS; under-cap scenes have unchanged logical routing and committed sample timing. Report any drawing-cap reduction separately.
- **A03:** Run a 30-minute finite circuit with all eight sources and a controlled-population Infinite loop. Record worklet time, active/pending state, retained history, renderer resources, and telemetry. Resource use should plateau for these fixtures.
- **A04:** Run deliberate branching and repeated-Infinite-emission saturation separately. Confirm the declared pause/recovery result, then simplify the circuit and resume without a backlog.

Human end checks:

- **H01:** Review editing, the three styles, travel 1/3/Infinite, saving, Pause, and arbitrary rotation in installed Chrome and Safari. Record browser-specific blocks separately.
- **H02:** A person unfamiliar with the new feature selects an instrument, changes an exit, recognizes a split/sink, and sets a three-hop limit using the provided short review task.

**Evidence and gate:** final review/checklist, environment, source revision or snapshot manifest, screenshots/interaction and live-audio captures, test reports, and remaining issues. G3 closes only when its required automated and human checks pass.

## Verification commands and evidence

During implementation, use the existing `npm run build`, `npm test`, and `npm run test:web` commands. Add focused gated-core/view/browser suites alongside the current tests, and run them at the corresponding step before broad regression. Use scoped browser runs/reporters so this feature's evidence does not overwrite prior evidence accidentally. A failed launch or unavailable browser is **blocked**, not passed.

Create `evidence/spark-gates/` with `Acceptance-Checklist.md`, a final `review.md`, and `step-01/` through `step-07/`. Each step's review records the date, source identifier, environment, commands, check IDs, expected/actual results, and artifact links. Keep diagnostic tables separate from ordinary product copy.

At handoff, update `Rules.md`, `README.md`, and `design/Route-Journeys.md` to describe the implemented gated behavior, legacy compatibility, three styles, travel semantics, and the truthful review status. Update the relevant asset/source package if it distributes these view/core files. Preserve source assets and the current saved examples.

## Completion boundary

The package is complete when real on-strut controls govern actual sound propagation; all three styles and adjustments work; finite/Infinite limits, branching, live editing, wiring ownership, history, storage, and legacy compatibility pass their specified checks; and the runnable browser result has been reviewed with its evidence.

This follow-up does not claim closure of the original package's venue, iOS/device, or other outstanding acceptance gates. The initial not-run records are retained; the current per-case results and remaining review tasks are in `evidence/spark-gates/`.
