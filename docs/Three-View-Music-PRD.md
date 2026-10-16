# Bongo Planet — Composer, Instrument Placement and Performance

> **Superseded by [the 16-instrument Composer PRD](Composer-PRD.md), revision 2, 16 October 2026.** The latest user decision fixes a global 16-instrument cap, polyphonic performers, deliberate duplication, ordinary stacked-note chords, and a separate `/BongoPlanet/composer/` entry with no original-game switch. This earlier document is historical, not the current build authority.

**Concept, product requirements and critique · 16 October 2026**

**Audience:** the agent building the next version. **Status:** product handoff; implementation has not started under this document. The user's explicit decisions are distinguished from recommended implementation defaults below.

## 1. Product direction and authority

Build one musical composition with three views:

1. **Composer:** write music with Mario Paint's picture-stamp staff interaction.
2. **Instrument Placement:** arrange the performers on the sphere using Bongo Planet's existing placement experience, without generators.
3. **Performance:** watch the sphere's instruments perform above a compact, following musical staff with Mario. Editing controls disappear.

The intended workflow is **place the band → compose its notes → watch the performance**. Players may revisit placement whenever they need another performer or want to rearrange the stage.

The musical distinction is fundamental: **an instrument is a persistent performer in space; a note is an event that performer plays at a particular time and pitch.** Many events can belong to the same performer, including changing pitches and chords.

### Explicit user decisions

- Three views, with the responsibilities above. The previous two-view model is superseded.
- Composer takes its interaction and musical organization from Mario Paint.
- All views use **Bongo Planet's visual style**. The experiment's gray beveled desktop/window styling is rejected.
- Instrument Placement resembles the existing Bongo Planet experience, with no generators.
- Performance combines the sphere above and a compact staff with Mario below; all editing UI goes away.
- An instrument must be placed on the sphere before it becomes available for writing notes in Composer.
- Unplaced instrument choices can look grayed out; tapping one takes the player into placement for that instrument.
- Sphere locations can have nicknames as well as their existing numbers.
- Choosing an instrument family in Composer opens a choice of its placed instances/locations: “Which Mario?”
- Support two asset sets: **Bongo Planet** and **Mario Paint**.
- The previous implementation is disposable. Build the next version from this product model rather than incrementally polishing that experiment.
- The approved Mario Paint 3D assets are the **first original extruded voxel set**. Rejected/upscaled/refined alternatives must not be restored.

### What is carried forward

Carry forward the learned requirements, approved source assets, real musical source data and the canonical Bongo Planet appearance/placement behavior. The experiment's HTML, CSS, two-view assembly, save format and automatic performer creation are not architectural commitments. There is no requirement to preserve its implementation or its browser saves.

This handoff does not authorize an immediate application rewrite, deletion of files, deployment, or changes to the original generator game. A later build should remain isolated at the existing experimental route, **http://127.0.0.1:5417/BongoPlanet/song-studio/**, on strict port 5417, unless the user requests another permanent route. Keep the public Site, original game saves and separate Super Bongo Planet fork outside that work.

## 2. Vocabulary and ownership

Use **instrument** in controls and **band** for the collection. “Friend” remains an informal description of a character, not a second model type. Do not call a persistent sphere object a musical note in this version.

| Term | Meaning | Example |
| --- | --- | --- |
| Asset set | A compatible family of artwork, models and sounds | Bongo Planet; Mario Paint |
| Instrument type | A sound/character available in that set | Piano; Mario; Star |
| Instrument instance / performer | One deliberately placed instrument, with a stable identity | Mario 1 |
| Junction / location | One of the sphere's 92 placement positions | Junction 23 |
| Location nickname | A player-assigned name attached to that junction | Moon Garden |
| Score event / note | A timed, pitched instruction for one performer | Mario 1 plays C4 on beat 3 |
| Audio voice | One currently sounding attack/tail | A ringing C4 from Mario 1 |

A location can hold up to four instrument instances. Several instances at one location do not become one instrument. One instance can own hundreds of score events and can sound several pitches simultaneously. Neither the four-place stack limit nor the number of placed instances is an audio-polyphony limit.

**Recommended naming interpretation:** nicknames belong to the fixed junction, matching the user's request to name sphere nodes. Moving Mario 1 from Moon Garden to Lagoon leaves both location names in place. Its existing notes still refer to Mario 1 and now perform at Lagoon. This interpretation should be visible in the location editor: label the field **Location name**, not “Name,” and label the action **Move instrument**.

Give instances stable generated family labels such as Mario 1 and Mario 2. The minimum version does not need another free-text naming system for individual instruments. A later request could add that independently.

## 3. Visual and spatial design

### Bongo Planet is the visual source

Use the canonical toy interface in `src/panel.css`, `src/toy-style.css` and the current appearance/theme code. `src/style.css` is an earlier base layer; reading it alone gives the wrong final appearance. The current cascade and main game are authoritative.

Preserve the rounded cream panels, navy text, soft toy portraits, blue primary actions, readable DM Sans/Manrope typography, faceted sphere, depth, character lighting and approved theme presentation. Reuse existing component conventions and appearance values where practical. The Mario asset set changes the instrument artwork and sound, not the surrounding interface theme.

![Bongo Planet visual reference](screenshots/blue-marble.jpg)

This saved main-game screenshot illustrates the visual language. Its generators, arrows and sparks are not part of the new placement mode. Blue Marble, Nebula and Fireflies remain the approved existing theme choices; creating another visual theme is outside this brief.

### What to take from Mario Paint

Take its instrument-picture palette, prominent staff, height-to-pitch mapping, horizontal timing columns, picture stamps on those columns, simultaneous notes in a column, direct erasing, straightforward transport and musical playhead character. Its hierarchy is useful; its gray/pink/mint beveled frame, bitmap control typography and console-era button chrome are not the next version's style specification.

The [existing reconstruction reference](../song-studio/Mario-Paint-UI-Reference.md) is evidence about the original editor, not authority to reproduce the rejected experiment's skin. Composer is a full working surface; Performance's staff is a compact presentation of that same music, not another full editor.

### View layouts

```text
COMPOSER                       INSTRUMENT PLACEMENT
┌─────────────────────────┐    ┌───────────┬─────────────────┐
│ Instrument families     │    │ Bongo     │                 │
│ and current performer   │    │ instrument│ Rotatable sphere│
├─────────────────────────┤    │ palette   │                 │
│                         │    │           │ Placed performers│
│ Large editable staff    │    │ Selection │ and named places │
│ with Mario playhead     │    │ / location│                 │
│                         │    │ controls  │                 │
├─────────────────────────┤    └───────────┴─────────────────┘
│ Transport / edit tools  │       Compose / contextual return
└─────────────────────────┘

PERFORMANCE
┌───────────────────────────────────────────────────────────┐
│                                                           │
│                  Sphere and performing instruments        │
│                  No palette, inspector or edit handles    │
│                                                           │
├───────────────────────────────────────────────────────────┤
│ Mario → compact, following musical staff                   │
└───────────────────────────────────────────────────────────┘
       Small playback/exit controls; no editing toolbar
```

These are hierarchy diagrams, not approved pixel dimensions. Keep view navigation compact within existing control areas. Use **Composer**, **Placement** and **Performance** as clear labels; avoid reinstating the old Spark Jam/Song Studio banner or adding explanatory slogans.

## 4. First use and the placement bridge

### New composition

1. Choose Bongo Planet or Mario Paint assets. Default to Bongo Planet for a new blank composition; loading a preset selects its correct set.
2. Open **Instrument Placement** on the empty sphere. Show the instrument palette without a Generator option. A short functional hint may say “Place instruments, then compose.”
3. Place one or more instruments using the normal Bongo Planet gestures. Duplicate types are allowed. Choosing a nickname is optional.
4. Select **Composer**. Its family row shows which sounds have placed performers. The player can begin with one instrument; a “complete band” is never a prerequisite.
5. Select a family, choose its placed performer, then stamp notes on the staff.
6. Enter **Performance** to see the instruments play the written score.

Opening Composer before placement is allowed. It shows an empty staff and placement-aware family choices. The interface explains how to proceed rather than presenting a blocked page.

### Tapping an unplaced family in Composer

The “grayed out” choice is **muted but actionable**, not a disabled HTML button. Give it an add marker and accessible text such as “Mario — not placed. Place an instrument.” Do not rely on gray alone.

1. Tap Mario when no Mario instance is placed.
2. Save a pending placement request: requested type, return view, score viewport, current selection and previous active brush. Pause transport only if an actual editing operation requires it; navigation itself is not a stop command.
3. Open Placement with the Mario tool already selected. Do not make the player select Mario again.
4. Keep the player in Placement after a valid drop so they can arrange more instruments. Show a clear **Return to Composer** action once the requested placement exists; its label can include the placed instance/location.
5. On return, restore the score's scroll/zoom/cursor context and arm the newly placed Mario as the active stamp. Do not insert a score event automatically.
6. If the player cancels or returns without placing, restore the previous brush or leave it unarmed. Keep the score unchanged. Never create a hidden/default instance to satisfy the request.

The same bridge handles **Place another Mario…** from an already available family's instance menu. On successful return, the new copy becomes the brush for future notes; old Mario notes stay assigned to their original instances.

A failed full-stack drop keeps the placement tool and pending request active. Do not return the player to Composer with an invalid target. Replacing the composition or loading a preset cancels the old pending request. After Undo/Redo or deletion, derive available brushes from the actual band again; never return with an instance that no longer exists.

## 5. Instrument Placement requirements

Placement reuses Bongo Planet's sphere, toy sizing, rotation/zoom, Reset view, stack presentation, layer selection and pointer ownership conventions. It excludes generators, gate painting, route arrows, spark controls and generator-specific inspectors. Sphere seams/junctions remain useful placement guides without implying a musical routing network.

- Palette drag or click-plus-destination creates one deliberate instance with a stable ID.
- Dragging a placed instance moves that instance. Empty-sphere dragging rotates the camera. Hover/cancel/invalid drops do not move or create anything.
- Keep the existing limits: **92 instances total, at most four per junction**. Select an exact layer when a stack contains several instances.
- Selecting a junction opens its **Location name** field and occupancy context. Empty locations can be named too. The nickname is saved with the composition.
- A moved instrument retains its ID and family number. Reordering or deleting another layer never renumbers surviving performers.
- Moving instruments changes their spatial performance location, not their score pitches, rhythms or assignments.
- Clicking a performer can audition its sound through an explicit preview action. Audition is not an inserted note, generator or saved event.
- “Compose” is a view transition. It does not finalize, lock or duplicate the band.

**Nickname defaults:** allow ordinary Unicode text up to 40 grapheme clusters, trim surrounding whitespace, and render as text. Empty input removes the nickname. Duplicate location names are allowed, but the instance menu must disambiguate them with junction numbers. Avoid putting labels on every junction at once: show relevant names for hover, selection and targeted placement. Numeric IDs remain available as a fallback and for accessibility.

**Deletion policy:** unused instances can be removed with Undo. If an instance has score events, show their count and offer an explicit transaction: reassign to a selected instance of the same type, or remove that instance and its events. Cancel leaves everything unchanged. Do not silently reassign to the first matching performer. Removing the final instance of a family makes that family muted/actionable again in Composer. A simple accidental deletion should never leave dangling events or inaudible notes.

## 6. Composer requirements

### Placement-aware family row

Show one family tile per instrument type in the selected asset set. This is a family palette, not one ever-growing tile row containing every placed copy.

| State | Tile and action |
| --- | --- |
| No placed instance | Muted picture with add affordance; opens Placement with that type selected |
| One placed instance | Available picture; instance popover identifies its location and can preselect the sole performer |
| Several placed instances | Available picture with count; popover lists each exact performer and location |
| Active brush | Show character and selected location beside/under the current-stamp preview |
| Previously selected instance removed | Clear that brush; require a valid selection rather than silently switching copies |

Example menu after tapping Mario:

```text
Mario
✓ Moon Garden · Mario 1
  Lagoon · Mario 2
  Moon Garden · Mario 3       Junction 23, layer 2
  + Place another Mario…
```

A menu option refers to an **instrument instance**, not merely a junction: two Marios can occupy the same location. Location nickname plus stable family number is the primary label. Include junction number/layer as secondary information when needed to disambiguate; unnamed locations display “Junction 23.” The layer number is presentation context, never the stored reference.

Instance menus must scroll and support keyboard selection/type-ahead when a family has many copies; their height must not push the score off-screen. Remember the last explicitly chosen instance per family while it remains placed. Re-selecting Mario must not reset Mario 2 to Mario 1. With a sole instance, preselection avoids forcing a pointless additional selection; the popover still reveals where that performer lives.

### Writing and editing

- The family/current-instance selection is a **brush for future notes**. Changing it does not rewrite selected or existing events.
- Stamping requires a currently placed instance. Composer must not auto-place instruments or assign one by nearest vertex, pitch or camera orientation.
- Horizontal position selects time; vertical position selects pitch. Note images are centered on the timing guides. Multiple events can share an onset.
- Dragging a note changes its time/pitch while retaining its performer. A different pitch does not create a new sphere object or retune all events of that performer.
- Selected-note controls provide explicit performer reassignment, pitch/accidentals where applicable, velocity and supported duration. Reassignment preserves timing/pitch unless the player separately edits them.
- Selecting a note exposes its performer/location and provides a concise **Show on sphere** action. Selecting an instance in Placement can return to Composer with that instance's notes highlighted. Keep the full musical context visible; highlighting is not an automatic filter or solo.
- Erasing one event leaves its performer in the band. Clearing the score leaves the band and location names intact. “New composition” resets band, names and score through a separate, recoverable action.
- Support click/tap placement, drag, keyboard editing, Undo/Redo and save/load/import/export. Destructive range edits such as shortening an ending must be undoable and explain any removed events.
- If simultaneous events share the same pitch and screen position, provide a small count/selection-cycle or list so every voice remains selectable. Do not offset stamps into false timing or pitch positions to expose hidden copies.

The default new score is 4/4 with a sixteenth-note edit grid and a short loop. The grid is an editing aid; preserve source timing when loading material. Native Mario Paint scores may use a different column/beat relationship. Do not claim that importing a song quantizes it unless the user deliberately invokes quantization.

### Playback and Mario

Composer can play the same score while showing its full editor. Mario and the playhead share the score coordinate transform and audio-supplied musical position. Mario lands on successive displayed timing columns in time, including rests as requested in the earlier concept. The renderer never determines musical onsets.

Provide Play/Pause, Stop/rewind, Loop and tempo in a compact control group using Bongo Planet controls. Support a 20–400 BPM range and retain fractional tempo on import: the native Mario demos include tempi above the main game's 180 BPM ceiling. An imported native column is one quarter-note beat; that must not be relabeled a sixteenth merely because new scores use a finer edit grid. Keep scroll/navigation tools distinct from transport. Do not carry over the experiment's tray skin simply because its functions were useful.

## 7. Performance requirements

Performance is a dedicated presentation view. A small score preview inside Placement does not satisfy this requirement.

- The sphere and its persistent performers dominate the upper area.
- A compact musical staff sits along the bottom, using the same instrument pictures and Mario playback indicator.
- The staff is read-only: no note handles, drag targets, eraser, duration controls, palette, instance menu, location editor, selection inspector or file controls.
- Hide junction numbers, placement targets, stack ghosts and edit highlights by default. Instrument reaction at an audible onset remains visible. Camera orbit/zoom may remain available without moving instruments.
- Notes on the staff and reactions on the sphere reflect the same score event and audio time. Simultaneous voices stay simultaneous. No generator, spark path or travel delay is inserted.
- Show a short following passage: initially two bars on desktop and one on narrow screens, adjusted only where note spacing demands it. Advance the visible passage predictably at a musical boundary; Mario's landing and note alignment stay correct after scrolling/wrapping.
- Use restrained Play/Pause, Stop, Loop and Exit Performance controls. Keep them unobtrusive; they may reveal on pointer/tap/focus, but cannot disappear while focused or trap keyboard users. Tempo and music editing belong in Composer.
- Entering Performance preserves current playback/paused state and position. It does not implicitly start, rewind or mute the score. Returning to the previous editor preserves musical time and editor context.
- Escape exits Performance on desktop; a visible/revealable exit works on touch. Full-screen browser mode is optional, never required.
- Empty scores remain valid and quiet. Performance is still escapable; it must not strand the player in an unexplained disabled screen.

**Pitch-range rule:** the compact view must not silently transpose, octave-fold or omit voices to fit. Start with one staff for the native Mario range. For wider Bongo arrangements, use an explicitly labeled additional staff and/or conventional octave notation rather than squeezing pictures below legibility. When additional staves are used, they share the same time columns. Keep percussion distinct from pitched placement. The exact compact treatment needs visual verification against a wide-range Favorites arrangement; musical data and audible pitch must remain unchanged throughout.

## 8. Asset sets and existing music

| Set | Required content | Integration rule |
| --- | --- | --- |
| Bongo Planet | Guitar, Glass, Kalimba, Piano, Marimba; High bongo, Low bongo, Kick, Snare, Hi-hat; current models/portraits/samples | Use the canonical existing toy appearance and sample metadata |
| Mario Paint | All 15 original music-tool pictures, corresponding first-set extruded models, prepared native notes and original Mario playhead poses | Use the original mappings; asset selection does not apply a retro UI theme |

**Recommended first-release default:** one selected asset set per composition, consistent with the experiment's two libraries. Loading a composition/preset selects its set. Creating a composition in the other set preserves the previous draft; no switch silently deletes a band or substitutes sound IDs. Mixed-set arrangements and automatic revoicing are outside the first version unless the user requests them. This bank restriction is a recommendation, not an explicit prohibition from the user; the builder should identify any planned deviation before treating it as settled product behavior.

Preserve the previously requested music library as reusable input: all three native Mario Paint demos and every current Bongo Favorites menu entry. Existing conversion data contains 22 Bongo menu entries representing 21 distinct arrangements, because one arrangement appears in two groups. Re-inventory the current menu at implementation time. A preset loads its complete band, named/default locations and notes together, satisfying placement-first without forcing the user to reconstruct it manually.

The [library record](../song-studio/Library.md) and source/provenance files document exact native scores and verified repeating Bongo passages. Carry the musical data as input or regenerate it; do not inherit the old application architecture. Preserve original pitch, fractional timing, levels and tails. Describe Bongo captures as finite repeating passages, not as a transfer of generator routing or every future generative possibility. Existing cover excerpts do not become full songs.

Use `asset-packs/mario-paint/{sprites,voxels,models,audio/notes}` and its manifest for original assets. Read its [integration guide](../asset-packs/mario-paint/README.md). Rejected alternatives are not a fallback. Keep Nintendo-derived assets local; this PRD does not authorize public redistribution or a Site deployment.

## 9. Music logic and implementation contracts

### One composition, three projections

Maintain one authoritative composition and one transport. Views are projections of that data, not three copies of a song. Changing view must not reimport music, regenerate placements, create new instrument IDs or restart the audio engine.

An illustrative ownership structure follows; names are proposals, not a commitment to the discarded experiment's schema:

```text
Composition
  schemaVersion, compositionId, assetSetId, appearance
  Band
    instances[]: instanceId, instrumentTypeId, vertexId, stableFamilyNumber
    locationNames: vertexId -> optional nickname
  Score
    tempo, timeSignature, lengthBeats, editSubdivision, loopRange
    events[]: eventId, instanceId, startBeat, pitch, durationBeats, velocity

Editor state (separate from musical data)
  activeView, activeBrushInstanceId, selectedEventIds, selectedLocation
  rememberedBrushByFamily, pendingPlacementRequest
  scoreViewport, cameraState, previousEditor

Transport
  playing/paused/stopped, audio-time anchor, musical position, revision
```

Use IDs for saved references, audio ownership and selection. Display names, node nicknames and stack indexes are never keys. The type registry owns both sound and visual asset mappings. An event owns pitch; an instance owns its location. Rendering state is not a source of music data.

### Required invariants

1. Every event references an existing, deliberately placed instance with a valid type in its composition's asset set.
2. Moving an instrument instance or renaming a location does not change event identity, pitch, duration or onset. Location naming changes display only; moving an instance changes that instance's location.
3. Deleting/reassigning a referenced instance is one atomic, undoable transaction across band and score.
4. Imported names/labels are plain text, length-limited and safe to render; duplicate/invalid IDs and missing references fail before replacing the open composition.
5. Musical time is explicit quarter-note beats, independent of geometry. Preserve imported fractional positions; grid snapping applies to new edits, not to loading. Derive absolute onset times from an anchor rather than accumulating floating-point loop durations.
6. Playback has one active clock and one driver. A new score scheduler never secretly enables the generator engine.
7. Imports and presets load paused. View changes preserve transport; audition and rendering cannot start transport.
8. Appearance and camera changes do not change musical tuning/rhythm. Local browser playback preserves the existing mix behavior; new spatial panning/venue output is a separate scope decision.

The current production strict scene schemas enforce generated labels and pitch-bearing pieces; they do not already support location nicknames or this performer/event model. Do not insert new fields into strict production files and call them backward compatible. Give the next score document its own explicit versioned validator and storage namespace, with a deliberate future integration boundary.

### Voices, samples and bounded work

Keep a 64-sounding-voice ceiling as the initial engineering target, with 92 placed instances and four per junction. Distinguish total events, simultaneous attacks and still-ringing tails. A possible initial event-file ceiling is 32,768; select a tested editor/rendering budget rather than letting imported scores allocate unbounded DOM or scheduler work.

A performer is a polyphonic source identity, not one oscillator. Three chord notes may play from one Mario at one onset while using one physical slot and three voices. Multiple performers at the same junction remain independently referenced; an event for one does not trigger the whole stack.

Budget tails across loop boundaries and actual alternating percussion takes. Validate difficult imported arrangements before Play; show a usable reason if capacity is exceeded. Do not silently erase, deduplicate, normalize or steal written attacks just to get an imported song to start. A sustained tail can continue through a loop boundary; Pause/Stop must release/cancel owned audio predictably.

Mario's prepared samples include native tuning, gate and envelope. A native picture stamp is a one-shot with its natural behavior; a drawn longer duration does not magically create a sustained sound. For the first version, label native duration as natural/sample-controlled and omit unsupported stretch/sustain controls. Bongo melodic gating and drum one-shot behavior follow their actual sample capabilities. Raw sample rate is not evidence of a C4 root, and native Mario staff labels do not guarantee all sound types have identical concert-pitch tuning.

Production sequencing should use the existing audio-thread architecture with a dedicated score driver and revision/cancellation ownership. The experiment's main-thread lookahead scheduler is not required or sufficient as production qualification. Bound work per audio quantum and measure it for the new driver; the old gated engine's measured decision limit is not automatically a sequencer benchmark. Audio timestamps drive staff/Mario/sphere reactions.

**Recommended initial editing policy:** entering another view does not pause. A musical or band-placement edit pauses before applying the new revision and retains position, with visible feedback. Renaming locations, selecting tools or changing camera do not pause. Stop rewinds; Pause resumes without replaying elapsed attacks. Live note insertion/retargeting can follow later under an explicit revision contract; do not promise it accidentally through an apparently live UI.

## 10. Critique: workflow

| Failure scenario | Why it matters | Recommended resolution and tradeoff |
| --- | --- | --- |
| A new user must arrange every instrument before hearing anything | Setup becomes homework and composition cannot drive discovery | One placed instrument is sufficient. Composer remains reachable, and muted types bridge directly into placement. More navigation is accepted in exchange for deliberate spatial ownership. |
| Tapping a gray tile appears to do nothing | Gray usually means disabled | Keep it focusable/actionable with an add affordance and a placement label; never a disabled control. |
| Placement opens with no memory of why | The user must choose the sound again and loses the current phrase | Carry the requested type and editor context; provide an explicit return with the new instance armed. |
| The first drop instantly sends the user back | The player cannot build or arrange the rest of the band | Stay in Placement and offer Return to Composer after a valid requested placement. |
| A composer click silently creates a sphere object | It undermines the new band-first rule and hides the spatial choice | Only Placement creates instances during interactive authoring; complete presets/imports restore their saved band atomically. Composer has a clear route to placement. This deliberately removes the old experiment's fastest auto-placement shortcut. |
| A view switch starts/rewinds the song | The three views feel like different documents | Share composition and transport; keep explicit Play/Stop semantics. |

**Judgment:** the placement-first concept is coherent if it remains a flexible loop, not a mandatory wizard. The placement bridge is essential to keeping musical experimentation quick.

## 11. Critique: usability

| Failure scenario | Why it matters | Recommended resolution and tradeoff |
| --- | --- | --- |
| “Mario at Moon Garden” names a location with two Marios | The menu does not identify which physical object will play | List exact instances with stable family numbers; use junction/layer as secondary context. Slightly longer labels buy unambiguous control. |
| A nickname follows an instrument sometimes and a junction at other times | Moving something changes the meaning of names unpredictably | Make Location name fixed to the junction; performer identity stays separate. Explain the distinction through field labels and move behavior. |
| Every vertex has a permanent name/number badge | Labels obscure the sphere and performers | Reveal relevant locations on interaction; hide editing labels in Performance. |
| A family menu opens for every successive note | Repeated navigation interrupts musical phrasing | Choose a performer once, retain that brush, then stamp many notes. Preserve the last choice for each family. |
| Switching a palette family rewrites selected notes | A basic tool choice makes unintended musical edits | Brush choice and explicit event reassignment are separate actions. |
| Performance retains the palette/inspector/miniature editing controls | It remains a cramped editor rather than a performance | Give Performance its own composition and hide editing surfaces entirely. Retain only restrained transport/exit and camera interaction. |
| Compact notation makes low/high voices or stacked events disappear | The displayed music misrepresents the performance | Use legible labeled staves/octave notation, an overlap-selection strategy in Composer, and a predictable current passage in Performance. |

**Judgment:** nicknames improve the spatial relationship, but nicknames alone are insufficient identifiers. The best picker combines an instrument picture, a location name and a stable instance number without covering the score with all three on every note.

## 12. Critique: music logic

| Failure scenario | Musical consequence | Required resolution |
| --- | --- | --- |
| Every new pitch creates another performer | A simple melody exhausts physical places and confuses instrument with note | Pitch belongs to the event. One performer can play its full supported range. |
| Four instruments at one junction are treated as four allowed notes | Placement constraints become an arbitrary harmony limit | Keep spatial capacity and voice budget separate; chords can come from one performer. |
| An event triggers its whole junction stack | Chords and dynamics multiply accidentally | Trigger the referenced instance only. |
| Moving a performer changes note times | Spatial arrangement unexpectedly rewrites rhythm | Score timing is independent of geometry; no spark travel participates. |
| Two identical sounds at different places are globally merged | Spatial orchestration and intentional unisons disappear | Preserve instance/event ownership and accepted attacks; share immutable sample data only. |
| Native one-shot pictures receive generic sustained-note controls | The UI promises an audible behavior the samples cannot supply | Expose actual natural/gated capabilities per type. Preserve native envelopes/tuning. |
| Import snaps timing or forces a narrow pitch range | Existing Favorites sound different without consent | Retain imported events; provide optional deliberate quantization/transposition separately. |
| The staff/Mario clock drives sound | Visual stalls become timing errors | Use audio time as authority and render the same events from timestamps. |

**Judgment:** the new concept cleanly separates composition from orchestration in space. Its main musical risk is promising generic DAW behavior for native one-shot assets; capability-aware controls prevent that mismatch.

## 13. Build acceptance criteria

The next agent should demonstrate these scenarios against the implemented UI and retain individual results. Existing experiment tests/screenshots are historical evidence, not acceptance of this version.

| ID | Scenario | Observable result |
| --- | --- | --- |
| A01 | Open a new composition | Placement opens on an empty Bongo-styled sphere, selected asset set is clear, and no generator/gate controls are present |
| A02 | Open Composer with no band | All unplaced family tiles are muted but keyboard/touch actionable; the staff remains available |
| A03 | Tap an unplaced Mario, place it, return | Placement is already armed for Mario; return restores editor context and selects that instance; no score note was inserted |
| A04 | Cancel the same flow without placing | Band/score are unchanged and no invalid brush remains active |
| A05 | Put two Marios at two named junctions | Mario's menu identifies each instance and nickname; chosen copy is retained while stamping a phrase |
| A06 | Put two Marios at the same junction or use duplicate nicknames | Each remains distinguishable through stable family label and secondary junction/layer context |
| A07 | Write several pitches and a chord for one Mario | One physical performer owns all events; each written voice sounds independently |
| A08 | Move that Mario and rename a location | Existing event references/times/pitches remain intact; menu/location display updates correctly |
| A09 | Attempt a fifth instance at a full junction | Drop is rejected, prior arrangement is preserved, and pending placement can continue |
| A10 | Remove a performer with notes | Reassignment or removal is explicit and atomic; Cancel and Undo preserve/restore references |
| A11 | Re-select a family or switch views repeatedly | Active instance is not reset to the first copy; no score, audio session or band is duplicated |
| A12 | Enter/exit Performance during playback and while paused | Sphere plus compact staff/Mario replaces editing UI; playback state/time and prior editor context survive |
| A13 | Try to drag an instrument/note in Performance | Camera interaction works where allowed; musical/spatial edits do not occur |
| A14 | Play chords, rests, loop boundaries and horizontally scrolled passages | Sound, sphere reaction, note columns and Mario are synchronized; tails and landing remain correct |
| A15 | Load the three native demos and every current Favorites entry | Correct asset set and deliberately placed band load paused; original source music is retained within documented capture scope |
| A16 | Save, reload, export/import and Undo/Redo | Instance IDs, location nicknames, score references, asset set and appearance survive; malformed import leaves the open work untouched |
| A17 | Test narrow viewport, keyboard, touch and reduced motion | No page overflow or keyboard trap; gray choices are operable; menus are readable; reduced motion preserves musical information |
| A18 | Compare all three views to the main Bongo Planet look | Fonts, panels, buttons, colors, toy lighting and theme continuity match the approved style; rejected beveled skin is absent |
| A19 | Test a wide-range/dense Favorites score and both sets' percussion | Every voice remains identifiable; compact notation represents register honestly; supported duration behavior matches audio |
| A20 | Exceed a documented musical/file budget or interrupt audio | A clear recoverable state appears; no hidden event deletion, burst of late notes, orphan voice or automatic restart occurs |

Automated schema/state/audio tests, live-browser interaction, human musical listening and measured audiovisual/audio-output timing are separate evidence. Unit/build success does not establish physical-device, Safari or venue acceptance.

## 14. Handoff checklist and scope

### Implementation sequence

1. Establish the new score document, stable performer references and location-name ownership, independent of the discarded application.
2. Reuse the approved Bongo Planet appearance and placement experience; remove generator/routing affordances from this mode.
3. Implement the band-first Composer picker and pending-placement/return flow before polishing note tools.
4. Build the large Composer staff and explicit event editing/reassignment.
5. Add Performance as its own presentation view, sharing the same score and transport.
6. Integrate both approved asset sets and the verified music inputs, then validate full lifecycle and difficult musical cases.

### Recommended defaults versus remaining product choices

The explicit user decisions in section 1 are fixed. The following defaults make this handoff buildable without inventing unrelated features: nickname attached to junction; exact performer referenced by notes; actionable muted family tiles; explicit return after placement; one asset set per composition; shared transport; pause-before-musical-edit for the initial build; no new spatial-panning behavior. If the next agent proposes changing one, explain the user-facing consequence rather than silently adopting a different model.

Remaining refinements include the precise compact wide-register notation, optional individual-performer free-text names, mixed-set songs, and live editing while playback continues. They do not justify changing the three-view structure, the placement prerequisite or the Bongo Planet visual language. This document does not require those additional features for the first version.

### Source map

| Source | Use it for |
| --- | --- |
| [Root instructions](../AGENTS.md) | Original/fork boundaries, stable local URL, approved themes and publication scope |
| [Main interface](../src/main.ts), [panel styles](../src/panel.css), [toy styles](../src/toy-style.css) | Actual Bongo Planet visual/interaction conventions |
| [Appearance model](../src/view/art/appearance.ts), [toy geometry](../src/view/art/toys.ts), [main view](../src/view/SphereView.ts) | Approved appearance, assets and spatial manipulation; reuse carefully without generator side effects |
| [Creation guide](../Creation-Guide.md), [Rules](../Rules.md) | Existing music/output contracts; do not transfer generator semantics into score playback |
| [Mario Paint UI reference](../song-studio/Mario-Paint-UI-Reference.md) | Original composing hierarchy and interaction, not rejected UI skin |
| [Original asset guide](../asset-packs/mario-paint/README.md), [manifest](../asset-packs/mario-paint/manifest.json) | First-set models, sprites, note/sample mappings and native sound capabilities |
| [Song source record](../song-studio/Library.md), [score inputs](../song-studio/library.json), [provenance](../song-studio/library-provenance.json) | Exact demos and finite Favorites passages; reusable data, not a mandated application architecture |

Deliver the next implementation at the isolated experimental URL with evidence for the three-view workflow. Keep this document as the product authority until the user changes the direction; the old experiment and its concept file cannot override it.
