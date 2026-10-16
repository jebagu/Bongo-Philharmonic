# Bongo Philharmonic — 16-instrument composer

**Product requirements, persona walkthroughs and adversarial review · Revision 2 · 16 October 2026**

**Separation decision, 16 October 2026:** this tool is **Bongo Philharmonic**, a completely separate project and local Git repository. Its owned app source is `src/`, tests `tests/`, copied helpers `foundation/`, and entry `index.html`. The independent website plan and local-server configuration in [Applications.md](Applications.md) supersede all earlier shared-tree/hosting instructions. Musical requirements remain revision 2.

This is the build authority for the new composing experience. It replaces [the earlier three-view PRD](Three-View-Music-PRD.md) and the discarded two-view application. The user has authorized a fresh agent in this same project to build this revision after the handoff. No additional kickoff approval is needed. Publication is not authorized.

## 1. Product contract

Create a small band, write its music, then watch it perform. The player manages **at most 16 persistent instruments**. Each instrument is polyphonic: one guitar can play a melody, a chord, or overlapping notes without creating more guitars.

| Decision | Required behavior |
| --- | --- |
| Band size | Hard maximum **16 instrument instances in the entire composition**, across all sound types; **multiple performers of the same type are fully supported** |
| Sphere topology | Keep the 92 existing candidate junctions; 92 is the number of possible places, not the band capacity |
| Placement simplification | **One instrument per occupied junction in this new mode.** No stack/layer UI. Chords use simultaneous score events on one performer |
| Musical model | Small polyphonic band; intentional additional performers; ordinary vertically stacked notes for chords |
| Views | Instrument Placement, Composer, Performance; one composition and transport shared across them |
| Asset sets | Bongo Planet or Mario Paint; one selected set per composition; the surrounding visual style stays Bongo Planet for both |
| Visual style | The current Bongo Planet toy interface, fonts, panels, colors, sphere, lighting and approved themes |
| New local entry | **http://127.0.0.1:5417/BongoPlanet/composer/** on its own pinned strict port |
| Separation | Independent entry and saves. **No link, button, banner, mode toggle or clickable brand that switches to/from the original generator game** |
| Future hosting | Independent future website; no deployment or cross-links authorized |
| Scope | Build the complete local experience and verify it. Do not rewrite the original game, restore shelved features or publish native assets |

The 16-instance cap and the three-view/bank/style/separate-URL decisions come from the user. One instrument per junction is the simplifying design choice adopted here from the small-band proposal: it removes layer selection and ambiguous same-location copies while preserving the existing game's sphere manipulation. This applies only to the new mode; the original game's four-layer behavior remains unchanged.

**The cap counts performers, not sound types.** Sixteen Marios is a valid band, as is a mix of several guitars, several pianos and percussion. Duplicates are first-class instruments, not an advanced exception or a one-per-type rule.

**A band limit is not a musical voice limit.** A guitar playing C4, E4 and G4 uses one visible instrument and three sounding voices. Do not expose synthesizer resource terminology as a required concept in the normal UI.

### Explicit exclusions

No generator tools, spark routes, gate editing, hidden ensembles, drum-kit bundles, chord-object system, automatic chord brush, compulsory musical roles, track/mixer sidebar or automatic instrument creation from the score. No 16-slot checklist to fill. No retro gray bevels, bitmap control font, pseudo-console frame, poetic panel headings or explanatory slogans.

The old application is disposable. Approved assets, verified source music and underlying canonical Bongo Planet components may be reused, but its page layout, state management, save format, timer scheduler and automatic-placement behavior are not the architecture for this build.

## 2. Review method and user personas

The following are **simulated design walkthroughs**, not interviews, observed usability results or evidence that the unbuilt UI already works. Two sequential passes were performed: first user-oriented task walkthroughs, then an antagonistic critique. Their resolutions are incorporated into the requirements below.

### Persona A — Maya, a curious music maker

Maya uses a laptop trackpad. She recognizes instrument pictures, wants a short loop, and does not want to learn a DAW, a mixer or a graph editor. She can explore pitches by listening and reading a hover/selection pitch label.

| Step | Maya's action | Required response / understanding |
| --- | --- | --- |
| 1 | Opens the new URL | An empty Bongo-styled sphere in Placement, with a compact sound palette and `0 / 16` band count; no tour or setup modal |
| 2 | Chooses Guitar, then taps an empty junction | One Guitar 1 appears. Placement tool exits after this successful placement; the new performer is selected |
| 3 | Clicks Composer | The large staff replaces the sphere. Guitar 1 is already the current stamp; no second instrument choice is required |
| 4 | Stamps C4, E4 and G4 in the same column | Three score pictures appear on one timing line. Band count stays one. Pitch/time previews make the positions understandable |
| 5 | Presses Play | One guitar plays the three notes together. The playhead/Mario follows audio time |
| 6 | Enters Performance | The editing tools disappear; she sees the same guitar perform above the compact following score |
| 7 | Exits Performance to add a new sound | She returns to the same editor context and musical position; an unplaced sound is an actionable route into Placement |

**Finding:** the old “place, switch, choose the instrument again” flow wastes an action. A newly placed performer should carry into Composer as the active brush. Chords require three ordinary stamps, never three guitar objects. One placed performer is sufficient; there is no “finish the band” gate.

### Persona B — Leo, arranging two spatial parts

Leo knows the original Bongo Planet. He wants the same sound to perform a melody on the left and a harmony elsewhere.

1. He selects Mario 1 and uses **Duplicate**. A ghost asks for a new empty destination; duplication creates one new performer only after the destination is valid. It copies the sound, not Mario 1's score events.
2. He names the two fixed locations “Lagoon” and “Moon Garden.” Location naming is optional and is not another naming system for the performers.
3. In Composer, tapping Mario with two copies opens a short instance menu showing `Lagoon · Mario 1` and `Moon Garden · Mario 2`.
4. He chooses Mario 2 and writes a phrase. The existing Mario 1 phrase stays assigned to Mario 1. Switching families and returning retains his last explicitly selected Mario.
5. Moving Mario 2 later changes where that phrase performs, without changing its pitches or rhythm. The location nickname stays attached to its original junction.

**Finding:** duplicate performers are useful for deliberate spatial orchestration, not for obtaining another pitch. Picker selection must never silently reassign existing notes or reset to the first copy. Stable performer IDs and location names have different ownership.

### Persona C — Sam, returning on a small touch screen

Sam reopens a saved draft at 390 CSS pixels wide, adds one note, watches Performance, then loads a different piece.

- The draft restores paused. Important controls have touch targets; editing is not hover-only.
- The family row and score scroll inside their own regions; the page does not overflow sideways.
- One contextual note toolbar appears after a note is selected, not a permanent inspector crowding the staff.
- Performance has a touch-accessible exit and playback controls; no invisible keyboard-only escape is required.
- The old draft is saved/recoverable before loading another composition. A library load changes the composition's set and band together, never silently revoices it.

**Finding:** menus need bounded height and keyboard/touch navigation. Performance should simplify the controls, not make them undiscoverable. Replacing a composition needs recovery, not repeated modal warnings.

## 3. Antagonistic critique and resolutions

The reviewer in this pass assumes the interface will be misunderstood and attempts to break the proposed rules.

| Attack | Failure in a weaker design | Resolution adopted in this PRD |
| --- | --- | --- |
| “You said 16, but Airy Loops has 39.” | Copying the old performer list makes presets violate the cap | Preserve all existing performers/duplicates when a preset is within sixteen. Only over-cap source arrangements need explicit, minimal same-type consolidation into a new <=16-performer arrangement; retain every event and useful duplicate performers. See §10 |
| “I drew a chord and used three band slots.” | Pitch is still stored on a sphere object | Pitch belongs to score events. Add/edit three pitches on the same performer without adding objects |
| “That gray instrument is broken.” | A truly disabled tile cannot start placement | Muted tiles remain actionable and say/place-icon “Place Mario”; they route to the requested tool |
| “I came here to compose and now I'm lost on another screen.” | No preserved intent or return destination | A pending placement request carries the type and score context; clear Return to Composer; no automatic bounce after a drop |
| “I clicked once and accidentally made five guitars.” | A persistent placement tool keeps adding duplicates | One deliberate placement gesture creates one performer and exits the placement tool. Duplicate is explicit |
| “My 17th instrument replaced the melody.” | Capacity handling deletes or revoices existing work | Reject the placement atomically, keep band/music intact and explain `Band full — 16 / 16`. No implicit replacement |
| “You renamed the place but my dropdown still points elsewhere.” | Nicknames are used as identities, or move with the wrong object | Junction names are display metadata; notes reference stable performer IDs. Re-derive picker availability after edits/history |
| “This looks like the discarded Windows-style mockup.” | Reusing the old HTML/CSS recreates the rejected product | Match the actual main-game style sources and reference image. Mario artwork changes the assets, not the UI theme |
| “Performance is just another cramped editor.” | Palette, inspector and edit handles remain visible | A dedicated presentation layout, read-only compact score, no placement targets or editing controls |
| “Separate URL, but the brand sends me back to the old game.” | A seemingly harmless link violates the product boundary | Brand is plain text. No cross-experience navigation in either application; only the three new-app views switch internally |
| “Your compact staff hides the bass or changes its octave.” | Fitting everything changes the represented music | Explicit compact register notation and percussion handling, with full pitch unchanged; verify against wide-range Favorites |
| “The music stopped when I changed views.” | Navigation recreates the scheduler | One transport survives view changes; only a real music/placement edit pauses the initial release |
| “The PRD says production ready because unit tests passed.” | Build/startup checks are mistaken for listening or measured timing | Record model, browser, listening and timing evidence separately. No production/device/venue qualification by implication |

**Design conclusion:** keep the visible model small and literal: place up to 16 performers, choose one, write its notes. Complexity belongs in the score, not in persistent sphere objects or hidden grouping systems.

## 4. Visual system and application shell

### Sources of truth

Use [panel.css](../src/panel.css), [toy-style.css](../src/toy-style.css), the current appearance/theme modules and the live main Bongo Planet appearance as the styling reference. `src/style.css` is only an earlier base layer; copying it alone produces the wrong final UI.

![Approved Bongo Planet visual language](screenshots/blue-marble.jpg)

This saved reference includes generator-game elements. Copy the visual language, not its generators, sparks or route arrows. Preserve rounded cream panels, navy text, soft toy portraits, blue primary actions, DM Sans/Manrope typography, a large faceted sphere, depth and approved lighting. Preserve Blue Marble, Nebula and Fireflies as the existing approved choices; do not invent another theme.

Take Mario Paint's **composing interaction**: picture palette, prominent staff, time columns, pitch height, aligned stacked pictures, erasing and Mario playhead. Do not take its console frame or gray beveled control skin. The [original UI reference](../song-studio/Mario-Paint-UI-Reference.md) is useful for hierarchy and musical behavior, not for reinstating the rejected skin.

### Shell

One compact shell contains plain-text **Bongo Philharmonic**, a three-view control (**Placement / Composer / Performance**), the composition title and a small **Library / More** area. Performance can collapse this shell into restrained playback/exit controls. There is no global game-mode banner and no link to the original app, old experiment or fork. A help/document link is not an excuse to add an application switcher.

Use one primary working surface per view. Avoid permanent explanatory cards. File, appearance and less-used score commands live in More; current-item controls appear only when relevant. Functional empty-state guidance is allowed, such as “Notes in the same column play together.” Omit decorative prose.

```text
PLACEMENT                         COMPOSER
[small palette / selected item]   [family pictures / current performer]
[large sphere]                   [large editable score + Mario]
[Compose / contextual return]    [compact transport and edit tools]

PERFORMANCE
[large sphere with performing instruments]
[compact read-only staff + Mario]
[restrained playback / exit]
```

On narrow screens, use internal palette/score scrolling and a single contextual tray; do not shrink everything into unreadable targets. Performance keeps the sphere primary and allows a compact score of roughly 120–220 CSS pixels depending on register/percussion. Verify actual legibility rather than treating these dimensions as a mockup to copy blindly.

## 5. Band and naming model

| Entity | Owns | Does not own |
| --- | --- | --- |
| Instrument type | Character/model and sound mapping in an asset set | A particular melody or sphere location |
| Performer | Stable instance ID, type, family number, one junction | A fixed pitch |
| Junction | Fixed sphere position and optional nickname | The identity of the performer currently standing there |
| Score event | Performer reference, pitch, onset, duration, note volume | A new spatial object |
| Audio voice | One audible attack/tail and cancellation identity | A permanent band slot |

A composition contains 0–16 performers, each at a distinct one of the existing 92 junctions. A chord may use one performer; two deliberate guitars may play independent parts. No hidden one-per-pitch objects or voice-to-model cloning.

Generated family numbers remain stable and are not reassigned to surviving performers after moves/deletion/history. Use the next unused monotonic number in that composition for new copies. Save references by ID, never by a displayed number or nickname.

**Location name:** optional plain Unicode text, up to 40 grapheme clusters, trimmed at the ends and rendered safely as text. Empty clears it. Duplicate names are permitted; include junction number as secondary menu information where needed. Unnamed places display `Junction 23`. A nickname stays at the junction when a performer moves away. Do not add a second mandatory performer-naming form.

Show a relevant nickname/number on selection or hover; avoid 92 permanent labels. Performance hides editing labels. In Composer, only copies of the same family need small performer-number badges on their note pictures; show the full current target next to the selected stamp and in selected-note context.

## 6. Instrument Placement flow

### Starting and adding

A new blank session opens in Placement with the Bongo Planet set selected, empty sphere, palette, and `0 / 16`. The asset set can be chosen before placing. No mandatory tour, full-band wizard or auto-generated starter band.

- Choosing/dragging a palette type starts one explicit placement intent. Clicking an empty destination commits one performer; a valid drag release is equivalent. After a successful placement, exit the placement tool and select the new performer.
- The palette remains available for deliberately placing another type/copy. A selected performer's **Duplicate** is an explicit shortcut into placing another performer of the same type.
- Duplicate copies the sound/type, not score events, location name or old ID. Nothing is added until a valid destination is committed.
- Clicking an existing body selects it; dragging its body moves that exact performer. Empty-space dragging rotates the camera. Separate these pointer intents with a drag threshold and correct cancellation cleanup.
- An occupied destination rejects a new placement/move; no stacking, swapping or replacement occurs implicitly.
- At 16, show `16 / 16` and a clear full-band state. Preserve selectable/auditionable existing instruments. Adding/duplicating cannot commit until capacity is free. A 17th attempt cannot mutate the band, score or history.
- A failed/cancelled gesture preserves the model and pending placement request. Escape/cancel exits the tool; hover alone does not modify anything.

The selected-item tray contains performer/type, Location name, a precise numeric junction fallback/keyboard move option, Duplicate and Remove. Show contextual occupancy/capacity; omit fixed-pitch controls and all generator/routing settings. Camera reset/slow rotation may reuse the canonical Bongo behavior; camera changes never move instruments in composition coordinates.

### Returning to Composer

The newly placed performer becomes the active score brush on entering Composer. Merely selecting Composer does not finalize or lock the band.

A Composer request to place a missing/additional type creates a pending intent containing type, prior brush, selected events, editor viewport and return view. Open Placement already armed for that type. After placement, stay there and show **Return to Composer**; do not automatically bounce after the first drop. Return restores context, chooses the requested new performer and inserts no score event. If several new copies were placed, use the selected matching new copy, otherwise the most recently placed matching copy.

Returning without placing restores the previous valid brush or leaves no active brush. Loading/replacing a composition cancels old pending intents. Undo/Redo/deletion must revalidate the brush and return target against the actual band. At full capacity, explain the limit in Placement without secretly deleting or reassigning music.

### Removing

An unused performer can be removed in an undoable action. For one with events, show the number of affected notes and explicit choices: reassign them to a chosen performer of the same type, remove the performer and its notes, or cancel. Never silently choose the first copy. Apply removal/reassignment atomically; Undo restores the complete band/score/name state.

A sound change/replacement system is not needed in the first release. Normal removal plus deliberate placement is preferable to a hidden automatic revoicing shortcut.

## 7. Composer flow

### Family row and exact performer selection

Show one picture per type in the selected set, not one tile per copy. The current-stamp area always identifies the active performer/location.

| Family state | Action |
| --- | --- |
| No performer placed | Muted picture with add affordance; accessible label `Place Mario`; tapping opens the placement bridge. It is not a disabled HTML button |
| Exactly one performer | One click selects that performer as the brush. A chevron/details action can reveal its location and `Place another…` |
| Two or more performers | Click opens an instance menu, remembering the last valid explicit choice; no reset to copy 1 |
| Current instance removed | Clear the invalid brush; do not silently retarget later stamps |

For multiple Marios, list `Lagoon · Mario 1`, `Moon Garden · Mario 2`, then `+ Place another Mario…`. Add junction number only to resolve duplicate/unnamed location labels; no layer numbers exist in this version. Bound menu height and support scrolling, focus, Escape and keyboard selection. Sixteen possible copies do not justify a separate permanent management panel.

Choosing the brush affects **future stamps only**. Selected notes have an explicit **Performer** reassignment field; a palette click must not rewrite them.

### Notes and ordinary chords

A valid placed performer is required before stamping. Composer never creates one. Horizontal position is onset; height is pitch. New edits snap to the chosen grid; imported events retain their original fractional timing. Pictures are centered on timing guides, including any additional guides required for imported fractional onsets.

A C-major guitar chord is three Guitar 1 pictures at C4/E4/G4 in the same column. There is no chord sphere object, chord picker, chord-specific instrument or compulsory chord group. Each picture remains an ordinary editable event. The band counter stays one.

- Click/tap or drag a current stamp to add an event. Show readable pitch/time feedback; optionally audition on a deliberate paused-state interaction, with no saved preview event.
- Drag a placed event to change time/pitch, retaining its performer. Arrow keys provide precise movement; semitone changes can expose accidentals. Imported register is never silently folded/transposed.
- Click a note for a single contextual toolbar: pitch, supported duration, note volume, performer reassignment and Erase. No permanent inspector.
- Same-performer/same-pitch/same-onset accidental editor duplicates are rejected; legitimate source unisons from distinct accepted events remain representable.
- Overlapping pictures must remain individually selectable using a small count/cycle/list in selected-note context, not by offsetting their time/pitch into false positions.
- Erasing events leaves the band. Clear score leaves the band and names. New composition is a distinct recoverable operation.
- Provide Undo/Redo, score extension/ending and ordinary copy/duplicate selection commands through compact tools/More. Range erasure/shortening is undoable and explains removed notes. No hidden quantization on load.

A blank score defaults to 4/4, a short four-bar loop and a sixteenth-note edit grid. In that grid each column is a quarter of a quarter-note beat. Native Mario scores have their own original column/beat relationship; importing them must not redefine their rhythm. Tempo supports **20–400 BPM**, preserving fractional imported values because some native demos exceed 180 BPM. Meter grouping and edit subdivision are distinct fields.

Maya's first-note path is choose type → place → Composer → stamp, with the new performer already armed. The UI should not add another compulsory setup/target dialog to that path.

### Cross-view selection

A selected note exposes its performer/location and **Show on sphere**. This selects and reveals the correct performer in Placement. Returning from Placement keeps the score viewport. Selecting a performer can highlight its score events, while retaining the rest of the score; no implicit filter, mute or solo.

## 8. Performance flow

Performance is a third layout, not Placement with a miniature editor attached.

- Sphere/instruments dominate above a compact, read-only score with Mario below.
- Hide palette, family menus, editing inspector, note tools, selection outlines, target ghosts, junction labels and file/appearance controls. No note or instrument drag can edit the composition here.
- Camera orbit/zoom may remain; that gesture must not select/move instruments.
- Keep restrained Play/Pause, Stop, Loop and **Exit Performance** controls. Exit restores the prior editor; Escape works on desktop, and touch has an accessible visible/revealable exit. Controls cannot vanish while focused or trap keyboard navigation.
- Entering/exiting preserves playback or paused state and exact musical position. There is no automatic start, rewind or new audio context on a view change.
- Follow two bars on desktop, one on narrow screens where needed, preserving legible spacing. During playback in both Composer and Performance, Mario approaches the middle and the notes scroll continuously beneath him. Keep him visible through passage changes and loop wraps. Near the actual end, stop scrolling and let him finish the passage; a non-looping completion runs him off the right edge. Pause holds the view, Stop rewinds it, and manual passage navigation pauses for editing. This amends the earlier page-at-boundaries behavior at the user's request on 16 October 2026.
- Mario hops between displayed timing columns in time, including rests. In reduced motion, use a steady position/highlight instead of hopping. Sound never waits for an animation frame.
- A chord produces one performer's coherent reaction, optionally with a brief note flourish. Temporary effects never become selectable band objects or count toward the cap.

**Compact notation:** native-range music uses one pitched staff. Wide Bongo arrangements can use a bass staff plus treble staff and explicit `8va/8vb` or higher octave marks where necessary. These abbreviations change display position only and must visibly disclose the actual register; full Composer retains actual pitch/ledger positions. Keep unpitched Bongo percussion in a compact distinct band. Both staves/percussion share the same time columns. Do not silently omit voices, change audible pitch, or reduce icons below legibility to force a single-staff picture.

Empty music remains valid and quiet, with working playback/exit controls. Do not add onboarding cards inside Performance.

## 9. Asset sets, appearance and persistence

Use the current ten Bongo Planet instrument types and all fifteen native Mario Paint types. Mario uses only the **first original extruded voxel set** in `asset-packs/mario-paint/voxels/` / original models and matching sprites/audio. Rejected refinements/upscalers are deleted reference history, not available alternatives to recreate.

Asset selection does not change the shell/theme. Native pixel pictures can remain crisp inside the Bongo interface. Use approved Bongo appearance/theming consistently across all three views and both sets; do not write the original game's appearance key.

One asset set belongs to each composition. Before the first placement, changing set is safe. After there is work, changing set means opening/creating a separate composition with recovery of the previous draft, not swapping IDs in place. Loading a preset selects its set automatically. Mixed banks, automatic revoicing and sample substitution are not first-release features.

Use a new versioned score format and storage namespace, `bongo-planet-philharmonic-v1`. Save stable performer IDs, type IDs, family numbers, junction names, events, tempo/meter/grid/loop, volume and appearance. View/camera/selection are separate presentation state. Imports validate completely before replacement and load paused. No obligation to import old experimental save formats; original main-game composition files are not the new score format.

Autosave the working draft after committed edits. Before New/Load/preset replacement, retain the replaced draft as a recovery snapshot; in-session Undo must restore replacement as a whole. Provide Save/Load and JSON Import/Export in More with clear local-save feedback. A failed save/import leaves the open work intact. Do not add account, cloud-sharing or publication flows.

## 10. Music library under the 16-instrument cap

Keep the existing requested source library: three original Mario Paint demos and every current Bongo Favorites menu entry. The current inventory is 3 native + 22 Bongo entries (21 distinct Bongo arrangements). Re-inventory the live source catalog before generating the next library.

**There is no one-per-sound-type restriction.** Preserve every source performer, including duplicate types, when the source band already has sixteen or fewer. The old Airy Loops conversions exceed the new cap: 39 performers across nine types. Only those over-cap source arrangements need consolidation into a newly authored band.

For the current preset inputs, use this deterministic editorial conversion:

1. A source with <=16 performers retains all of them and their event assignments. It may receive the previously requested new spatial layout, but not gratuitous type merging.
2. For a source with >16, retain one original performer per used type, choosing the one with the most events (stable source ID breaks ties). Fill the remaining band places up to sixteen with additional original performers ranked by event count, again with stable ties. This deliberately retains duplicate performers; it does not turn the whole library into one of each sound.
3. Reassign events only from omitted performers to a retained performer of the **same type**. Prefer the closest median register for pitched sounds; for percussion choose the least-loaded retained performer of that type, with stable tie-breaking. Record the old-to-new performer map and arrangement rationale in provenance.
4. Retain every separate event ID/attack, pitch, onset, duration, note level, stable event ordering, original master volume and sample/percussion behavior. Preserve simultaneous unisons even if assignments now converge. Do not remove events to meet the cap.
5. Give performers spaced, distinct junctions and a readable new sphere layout. A preset loads its complete band+score paused, satisfying the placement prerequisite; interactive Composer stamping still cannot auto-place.

The first preset-conversion test should exercise a band with repeated types. A custom composition containing sixteen instances of one type must validate normally. New-format user imports with >16 performers fail atomically; they are never silently consolidated. The special source-library conversion is an explicitly authored preset arrangement, not a hidden runtime restriction or import behavior.

This is an intentional new spatial arrangement with the same source music. Preserve the original source/provenance data as input. Do not alter the main game's fixtures or catalogs. External compositions in the **new** format with more than sixteen performers must instead fail validation atomically; do not silently merge a user's deliberate spatial arrangement on import.

The [source music record](../song-studio/Library.md), [data](../song-studio/library.json) and [provenance](../song-studio/library-provenance.json) document native demos and finite repeating captures of Bongo Favorites. These are inputs, not an architecture mandate. Preserve fractional arrivals and native timing. Do not claim a finite capture preserves every future generator-routing behavior or turns a cover excerpt into a full song.

## 11. Data, state and audio requirements

Maintain one authoritative composition, one shared transport and independent view state. A proposed ownership structure is:

```text
Composition: schemaVersion, id, assetSetId, appearance
Band:
  performers[]: id, instrumentTypeId, junctionId, familyNumber
  locationNames: junctionId -> nickname
Score:
  tempo, meter, editSubdivision, lengthBeats, loopRange, masterVolume
  events[]: id, performerId, pitch, startBeat, durationBeats, velocity

UI:
  view, previousEditor, currentBrushByFamily, selectedEvents, selectedLocation
  placementIntent, pendingComposerReturn, scoreViewport, cameraState
Transport:
  playing/paused/stopped, position, audio-time anchor, revision/cancellation epoch
```

Required invariants:

- 0–16 unique performer IDs; distinct valid junctions; valid types for the composition's asset set; unique event IDs; every event references a currently placed performer.
- Pitch belongs to the event; moving a performer or renaming a location does not rewrite music. One event triggers one performer, never everyone at a junction/type.
- View changes do not import/regenerate state, make new IDs or restart transport. Brush/selection/placement intent are separate concepts.
- Deletion/reassignment/history/import are atomic across band and score. Invalid/cancelled operations do not add history entries or half-update data.
- Canonical time is quarter-note beats with documented precision. Preserve imported fractional positions; derive scheduled times from an anchor, not cumulative loop-time addition. Grid snapping applies to edits only.
- New score files use an explicit validator and namespace, not undocumented additions to the main game's strict scene schema.

Use the existing audio-thread architecture/voice rendering where suitable, with a dedicated score driver and cancellation identities. The old experiment's main-thread timer is not the required implementation. Musical events drive timestamped sphere/staff/Mario feedback; rendering never triggers the music. Keep local mixing consistent with the current game; new spatial panning/venue integration is outside this build.

Initial sounding-voice ceiling: **64**, separate from sixteen performers. Preflight real ringing tails over loop boundaries, including actual A/B percussion order. A testable initial event-file limit is **32,768**; bound editor rendering and audio work as well. Exceeding a budget must give a recoverable reason, release audio safely where necessary and leave written data intact. Do not silently steal/drop/deduplicate notes to make library songs start. Measure the score driver's work budget; a generator-engine benchmark does not qualify the new driver.

Native prepared Mario notes already contain their gates, tuning, instrument levels and envelopes. First-release native duration is natural/sample-controlled; hide unsupported sustain/stretch controls. Bongo melodic gates and percussion natural tails follow their actual sample capabilities. Raw sample rate does not establish a C4 root. Share immutable samples where useful, not performer/voice ownership.

For the initial local release, a real score or band-placement edit pauses before committing and retains musical position; provide a concise “Paused to edit” indication on that transition. Renaming locations, choosing tools, camera movement and switching views do not pause. Stop rewinds; Pause resumes without replaying elapsed attacks. Live musical editing can be a later explicit feature. Audition while already playing should not introduce unintended extra attacks; ordinary selection can stay silent.

## 12. State transitions and recovery

| Trigger | View/state result | Music/data result |
| --- | --- | --- |
| New blank composition | Placement, no armed tool, chosen/default asset set | Empty band/score, paused; prior work recoverable |
| Place performer | Placement selects new performer, clears one-shot tool | One new ID; no score events |
| Composer after placement | Composer carries selected performer as brush | No score mutation; view change preserves transport |
| Choose absent family | Placement armed, pending return saved | No automatic performer/note |
| Successful return | Composer context restored, valid new copy armed | No inserted event |
| Cancel request | Prior valid brush/context restored | No hidden placement |
| Duplicate | Placement ghost until valid empty destination | New performer only on commit; no copied notes |
| Sixteenth performer exists | Full-band state, existing selection still works | Seventeenth placement rejected atomically |
| Rename location | Same view, display names refresh | Same note references and audio timing |
| Remove referenced performer | Explicit reassignment/removal transaction or cancel | No dangling events; Undo restores all |
| Enter/exit Performance | Presentation changes; prior editor remembered | Same transport position/state, no musical edit |
| Load/preset/import | Requested composition and its asset set; safe editor view | Validate first; paused; previous composition recoverable; pending intents cleared |
| Audio interrupted | Clear paused state; deliberate Play required | Pending intent/voices cancelled safely; written score retained |

## 13. Acceptance scenarios

These are requirements for the builder to verify, not assertions that the next version already passes.

| ID | Scenario | Required observation |
| --- | --- | --- |
| AC01 | Open the new URL | Correct Bongo style, separate entry, empty Placement or recovered draft paused; no original-game switch/link |
| AC02 | Complete Maya's first chord | One guitar, three ordinary simultaneous events; no duplicate performers or mandatory second picker |
| AC03 | Tap an unplaced Composer family | Actionable muted tile opens the correct placement tool and preserves score context |
| AC04 | Complete/cancel placement bridge | Return chooses the valid new performer without adding a note; cancel makes no hidden object |
| AC05 | Deliberately create Mario 2 | New ID at a new location; no old events reassigned/copied; picker choice persists |
| AC06 | Move/rename with existing notes | Performer identity and every pitch/time retained; names stay with junctions |
| AC07 | Fill exactly sixteen instruments, including sixteen of one type | Repeated types validate and remain selectable; counter reads 16/16; seventeenth placement, duplicate and over-cap import fail atomically |
| AC08 | Attempt occupied/cancelled drop | No stack, swap, new ID, lost old location or history entry |
| AC09 | Remove a referenced performer | Count and explicit choices appear; cancel and Undo preserve/restore all references |
| AC10 | Switch all three views during playback/paused | Position and state preserved; no duplicate scheduler or music reload |
| AC11 | Inspect Performance interactions | Sphere+compact staff/Mario only; camera works; edits cannot occur; exit works on touch/keyboard |
| AC12 | Play chords, rests and loops | Sound, sphere and score agree; Mario lands on columns; tails and passage wrap are correct |
| AC13 | Load every source library entry | Correct bank; <=16 performers; no dropped or retimed source events; new sphere layout |
| AC14 | Test both Airy Loops versions | Over-cap sources become <=16 performers with duplicate types retained; respectively 166/304 events and original type sounds retained in current inputs |
| AC15 | Verify native/demo assets | All native types use original first-set sprites/models/sounds; no rejected alternative assets or retro shell |
| AC16 | Test wide-range/percussion score | Compact notation discloses octave/register and unpitched hits; audible music is unchanged |
| AC17 | Edit overlapped notes and change family brush | Every event selectable; brush changes future stamps only; per-note reassignment is explicit |
| AC18 | Save, reload, export/import, New/Load and history | IDs, names, bank, music and look retained; replacement recoverable; malformed data leaves open work intact |
| AC19 | Test desktop and 390px/touch/keyboard/reduced-motion | No horizontal document overflow, inaccessible menus/controls or focus trap; internal scrolling and legible targets |
| AC20 | Exceed file/audio limits or interrupt loading | Clear reason, safely cancelled sound/intent, no late catch-up burst, automatic restart or written-data loss |
| AC21 | Check original app and publishing boundary | Original entry/saves/catalogs/fork/public Site remain intact; ordinary publication excludes local native/composer content |

Record automated model/state/audio tests, browser interactions, human listening and measured acoustic/visual timing separately. Passing tests/build/startup checks does not establish Safari, physical-device or venue qualification. Do not list unperformed acceptance as passed.

## 14. Build handoff and delivery

The user explicitly requested a **fresh agent, same saved project, Ultra reasoning**, after this PRD. Start local implementation from this document; do not ask again whether to build. No new worktree or fork was requested.

Independent entry/source layout: `index.html`, `src/`, `tests/`, `foundation/` and `vite.config.ts`. Run `npm run build` in this repository. No command depends on Bongo Planet or its development server. Local-only native assets remain excluded from ordinary publication; a local build is not a publishable package.

Use this repository’s independently copied fonts, appearance models, topology, toy meshes and native asset adapters. Preserve its visual and musical behavior. Implement the performer/event state model without importing any sibling app or spark scheduler.

Build in this order:

1. Domain/state validator, 16-cap transitions and capped library conversion; test note/performer ownership and recovery.
2. Bongo-styled shell/Placement, one-shot placement, deliberate duplicates and named locations.
3. Composer, current performer, placement bridge and stacked ordinary-note chords.
4. Shared score audio/transport and genuine synchronized Mario feedback.
5. Dedicated Performance and responsive/accessibility behavior.
6. Source-library integration, save/import/export, regression checks, browser QA and documented results.

Keep evidence compact. The working tree contains unrelated ongoing/historical changes; inspect scoped files and do not revert other work or restore deleted bulk. Do not create a new public Site, push historical Git branches, revive chatbot control/speed experiments, or work in the separate Super Bongo Planet fork.

### Reference map

| Reference | Role |
| --- | --- |
| [Root AGENTS](../AGENTS.md) | Project boundaries, local service contract and superseded history |
| [Canonical interface](../src/main.ts), [panel styles](../src/panel.css), [toy styles](../src/toy-style.css) | Bongo Planet appearance and placement conventions; no cross-link/UI changes to main |
| [Sphere view](../src/view/SphereView.ts), [appearance](../src/view/art/appearance.ts), [toys](../src/view/art/toys.ts) | Geometry, camera, appearance and asset primitives |
| [Rules](../Rules.md), [Creation guide](../Creation-Guide.md), [audio adapter](../src/audio/AudioAdapter.ts) | Existing musical/DSP contracts to preserve; score driver is separate from propagation |
| [Native asset guide](../asset-packs/mario-paint/README.md), [manifest](../asset-packs/mario-paint/manifest.json) | First approved sprite/voxel/audio mappings and capabilities |
| [Mario Paint UI reference](../song-studio/Mario-Paint-UI-Reference.md) | Musical interaction/layout hierarchy; not the rejected skin |
| [Library source record](../song-studio/Library.md), [source data](../song-studio/library.json), [provenance](../song-studio/library-provenance.json) | Music input for the new <=16-performer arrangements |

Delivery: a running, reviewable experience at **http://127.0.0.1:5417/BongoPlanet/composer/**; a separate successful build; passing appropriate tests; actual browser checks for the principal flows; and a candid acceptance record. Do not report the old experiment's screenshots/tests as proof of the new build.
