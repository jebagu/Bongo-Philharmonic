# Local interface refinement — 16 October 2026

This later user request supersedes the three-view shell and control placement in the original Composer PRD. The separate naming work moved the implementation into `philharmonic/` during the final checks; these changes were preserved in the moved files. The local URL remains **http://127.0.0.1:5417/BongoPlanet/composer/**.

## Implemented

- Placement has Reset view and Slow rotate. Redundant Compose/Return buttons were removed; the Composer tab completes a pending placement return while preserving selection and score context.
- Existing score notes have a visible snapped drag preview, pitch/time feedback, a faded source and clear grabbing cursor. The move commits on valid release; Escape, pointer cancellation and outside releases cancel. Performer, volume and accidental pitch ownership are preserved.
- Score zoom changes horizontal and vertical spacing around the current viewport, without changing music. Erase uses an eraser-shaped cursor.
- Pitch, supported beats, performer, note volume, Show on sphere and erase/deselect controls share one row. Narrow screens scroll this row internally. The redundant note-context heading is gone.
- The playhead uses original full-body Mario Paint walk/jump poses and the native hop table, synchronized to the shared audio clock. Source crops, coordinates and hashes are in `src/assets/mario-paint-playhead.json`; reduced-motion playback remains steady.
- Library is a fourth full-page tab with sound-set filters, grouped cards and previews of actual spatial layouts. It contains all 22 Favorites menu entries and all three Mario Paint demos. The 3,204 written events remain unchanged. See `Library-Layouts.md` for the authored arrangements.
- Performance keeps Play/Pause, Stop, Loop and Exit together at the top right. The sphere and read-only score retain the existing layout. Controls fit both 390px and the actual 319px in-app panel.

## Verification

- Complete suite before the concurrent source reorganization: 61 files / 947 tests passed, including new library-layout and original-Mario tests.
- Integrated Chrome suite after the source reorganization: 13 browser tests passed, including live snapped drag/deferred commit/Escape cancellation, zoom/music invariance, one-row tools, eraser cursor, all 25 library loads, full-body Mario poses, Placement camera controls, and Performance control bounds at 319px.
- Dedicated local build and full TypeScript check passed.
- The Library was also inspected in the user's in-app browser without replacing their composition. Screenshots from the Chrome run are in `evidence/philharmonic/`, including `library.png`, `performance-390.png` and `performance-top-controls.png`.

No publication or deployment was performed. Listening/acoustic and physical-device qualification remain separate from these UI checks.

## Shared layout and adjustable Performance score — later revision

This user-approved revision replaces the separate Performance header and the previous top-right transport layout described above.

- All five workspaces retain the same header, title, Files and More access. The full-width playback bar sits below the workspace, including below Placement's sidebar. Play/Pause, Stop and Loop keep their screen positions across tabs and playback states.
- Performance retains its globe and read-only score. A draggable divider adjusts their space, with bounds that keep both visible. Arrow keys, Home/End and Escape cancellation are supported. The split persists in the existing presentation preference; composition files and music are unchanged. Undo/Redo keep their footer slots and remain disabled in Performance.
- Visual style, Reset view and Slow rotate share the same corner of the globe in Placement and Performance. Normal workspace tabs replace the separate Exit Performance control; Escape still returns to the previous editor.
- Composer's instrument panel is approximately 55 pixels shorter at the inspected 1280-by-720 viewport. Selected-note controls retain the existing contextual row for this first layout pass.
- Narrow layouts use the same header and two-row playback bar in every workspace, retaining song title, tempo and master volume. Menu restructuring and a new note inspector remain outside this pass.
- The FAQ wording and Performance illustration reflect the shared frame.

Validation: build and typecheck passed; 101 unit tests passed; resource baseline 1.0.0 verified. The full 25-test browser suite passed, followed by four passing final checks covering fixed control positions at widths 1440, 1024, 768, 390 and 319; divider drag, cancellation, keyboard and persistence; and uninterrupted playback through all five tabs. Desktop and phone screenshots were inspected, and the divider was also dragged in the in-app preview. Current screenshots are in `evidence/ui-layout-update-2026-10-16/` and the browser screenshot outputs in `evidence/philharmonic/`.

This revision is available at the existing local development URL and was subsequently published as public version 11. Three hosted layout/playback checks passed against the deployed Site. See `evidence/ui-layout-update-2026-10-16/public-deployment.json`.

## Fixed Composer toolbar and larger score — later revision

This request supersedes the contextual note row and the prior 100% starting zoom.

- Composer opens at 150% on every fresh load. Session zoom controls remain available. Instrument pictures now scale with the score, reaching 48 pixels at the default, with matching drag previews and native note reactions.
- Clefs and C-register labels occupy separate horizontal lanes. A wider editor margin also keeps first-column pictures clear of the labels; Performance retains its compact margin.
- The instrument strip is headed **Instruments**. The repeated Composer/current-junction text is removed. Selecting a note highlights its instrument; choosing an instrument returns to drawing with no selected notes.
- One permanent toolbar contains Draw/Erase, grid, zoom, pitch, supported length, overlapping-note selection, Show on sphere and deselect. Inactive note controls remain in place and disabled. Note selection never adds a second row or moves the score; narrow screens scroll the toolbar horizontally.
- Erase is one editing tool: choose it, then click notes. Selected notes can also be removed with Delete/Backspace. The duplicate contextual erase and instrument-assignment controls are gone. Individual note-volume editing is removed; existing saved velocities and the version-one file format remain intact.
- The explanatory same-column sentence, section chooser, passage arrows and beat-range label are removed. The bottom scrollbar reaches the complete composition, using a bounded sticky SVG window. Manual horizontal navigation pauses playback; playback continues to follow automatically, holds on Pause and rewinds on Stop. Browser scroll limits are included in the camera bounds so reaching the end does not trigger an early pause.
- The FAQ names Draw and describes the fixed controls, Erase and bottom scrollbar.

The changes remain available locally at **http://127.0.0.1:5417/BongoPlanet/composer/** and were published as public version **12** at the user's subsequent request. Desktop and 390px evidence is in `evidence/composer-toolbar-1440.png` and `evidence/composer-toolbar-390.png`.

Validation for this revision: development and public builds pass; the public payload audit allows 311 files and retains all original runtime assets. All 101 unit tests and all 497 resource checks pass. All 33 applicable browser checks passed across the full run and the six-test correction rerun; three additional native hop/note-reaction checks passed against the local development app. Coverage includes desktop/390px toolbar stability, fresh-load zoom, clef/label/picture clearance, editing at beat 63.5, reaching the last note, imported velocity preservation, overlapping notes, duplicate-bandmate editing, all library arrangements, FAQ/files, both playback views, loop wraps and real song completion. The full run exposed a selection-state issue during bandmate duplication; synchronization now occurs only on explicit note selection, and its regression passes.
