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
