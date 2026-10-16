# Bongo Philharmonic

Play the public Site: **[Bongo Philharmonic](https://bongo-philharmonic.jebagu.chatgpt.site)**. The public release includes both the Bongo instrument set and all fifteen original Mario Paint instruments. Asset provenance and rights notices are preserved.

Place a band, compose its music, and watch it perform. **Bongo Philharmonic** is a separate tool from **Bongo Planet**, the original spark game.

Permanent local URL: **http://127.0.0.1:5417/BongoPlanet/composer/**. Run `npm ci` and `npm run dev` from this project's folder. This app has its own source, Git history, dependencies and local server. See [application boundaries](docs/Applications.md).

## Playing

1. In **Placement**, choose a sound and tap an empty junction. You can also drag a sound onto the sphere, or enter a junction number in the placement tray. Each successful placement exits the tool.
2. Open **Composer**. The newly placed instrument is ready to draw. Choose **Draw** and click the staff to add notes. Composer starts at 150% zoom; the bottom scrollbar reaches the whole score. Each performer can play multiple pitches and overlapping notes.
3. Enter **Performance** for the sphere above a following read-only score. Choose the Composer tab to return to the editor and its previous passage. Playback continues between views.

You can place sixteen performers total, including sixteen of the same type. Select a performer and use **Duplicate** to deliberately add another copy. Duplication copies its sound, without copying notes. One performer occupies each junction.

Location names belong to the fixed junctions. Moving a performer carries its music to the destination and leaves the old location name in place. Composer family menus identify the exact performer used for future notes. Selecting a note highlights its instrument in the palette.

## Editing and files

- Click a note to enable pitch, supported length and **Show on sphere** in the fixed toolbar. Selecting notes never expands a second row. **Draw** and **Erase** are the two editing tools; individual note volume is not exposed. Repeated clicks or the overlap chooser select coincident source notes individually. Shift-click selects multiple notes. Arrow keys move selected notes by a semitone or one edit-grid column; Delete erases them. Enter selects a keyboard-focused note.
- A real musical or placement edit pauses playback at the current position. Names, camera movement, tools and view changes preserve playback.
- Unplaced Composer pictures remain actionable: choose one to open Placement, then choose the **Composer** tab. Returning inserts no note. Cancelling and returning restores the previous valid brush.
- **Files** opens Save locally, Load local save, Import JSON, Export JSON and recovery. **More** also keeps those actions, plus theme, meter, loop range, score ending, range erase, note duplication and New. **Inspect notes** provides a bounded, paged list of every event, including notes in exceptionally dense imports.
- Drafts autosave in this browser under `bongo-planet-philharmonic-v1`. Valid older `bongo-planet-composer-v1` draft, saved, recovery and presentation records are copied when the new key is absent; originals remain intact. Loads and New retain the previous draft for **Recover previous draft**; Undo also restores a replacement during the session. Saves load paused. Export JSON for a portable copy; filenames end in `-Philharmonic.json`. Original spark-game composition files use a separate schema and cannot be loaded as scores.
- **FAQ → Let your agent write the music** contains a copyable/downloadable prompt, the complete version-one JSON format and a playable example download. The prompt includes all instrument IDs, schema constraints, timing and playback limits; its literal example is tested through import and playback. `src/songGuide.ts` is the canonical guide and example; `src/model.ts` remains the save validator.
- Space controls playback when the score/background has focus. Escape exits Performance, closes an instance menu or cancels the placement tool. Focused buttons keep their normal Space/Enter activation.

## Assets and library

Use the shared [instrument and asset-set specification](docs/Instrument-Asset-Spec.md) and [delivery manifest template](docs/templates/instrument-set/manifest.example.json) when creating a new set. Asset delivery and application integration are separate steps; the template is not a score or runtime import format.

Both Bongo Planet's ten types and the fifteen original Mario Paint types are available. Changing sets opens a separate composition with recovery of the previous draft. The surrounding interface and approved themes stay the same.

The library contains 32 entries: seven full-length arrangements, 22 retained Favorites and three original Mario Paint demo scores. Only the two over-cap Airy Loops inputs are consolidated from 39 to 16 performers; duplicate types and all 166/304 source attacks are retained. The other source bands retain all performers. `src/library.ts` records the mapping and provenance. Source captures are finite arrangements, not every future behavior of the original generators.

Mario uses the original first-set models/sprites and native prepared notes. Native notes retain their natural sample envelopes; accidentals and out-of-range edits explicitly transpose the nearest finished native note. The public Site includes the explicitly approved original runtime assets and playhead poses. No redistribution license has been established; see [the rights notice](docs/licenses/Mario-Paint-Assets.md). ROMs, raw samples, extraction tools and editable source assets stay outside the public Site.

## Build and verification

```sh
npm run build
npm test
npm run test:web
```

The bundle is `dist/`; `npm run preview` serves it on the same strict port after stopping this project’s development server. Each command runs independently of Bongo Planet. `foundation/` holds owned copies of the original rendering, geometry and sample helpers; changes here do not alter Planet.

See [historical acceptance](docs/Acceptance.md) for the current evidence and limits. The public Site is deployed separately through its audited publishing checkout; see [Public-Site.md](docs/Public-Site.md). Browser verification does not establish human listening, acoustic, Safari or physical-device qualification.

See [Separation-Verification.md](docs/Separation-Verification.md) for the independent build checks.

## Versioned supporting resources

The independent Bongo Planet / Philharmonic resource baseline is **1.0.0**: 11 groups, 497 file mappings, with per-file SHA-256 checks. See [Resource-Versions.md](docs/Resource-Versions.md) for the copied tools, audition banks, galleries, archives, local preview URLs and manual update rules. Run `npm run resources:verify` to check this project without accessing its sibling.

## Source checkpoint

The `v. 1` checkpoint is backed up in the private [Bongo-Philharmonic GitHub repository](https://github.com/jebagu/Bongo-Philharmonic). This source backup is separate from the public Site and the Bongo Planet repository. Generated builds, dependencies, deployment bundles and browser saves stay local.
