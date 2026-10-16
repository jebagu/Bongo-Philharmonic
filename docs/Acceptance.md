# Bongo Planet Philharmonic — local acceptance record

**16 October 2026.** New Composer implementation against `docs/Composer-PRD.md` revision 2. These results concern this build, not historical experiment evidence.

The tool was subsequently named **Bongo Planet Philharmonic** and moved into `philharmonic/`. Earlier command names and `evidence/composer/` paths below are retained as the original execution record; see the naming follow-up at the end for new checks.

## Verified execution

- `npm test`: **60 files, 941 tests passed**. This includes 46 Composer model/library tests and 24 score-audio tests. The suite's Chrome bridge test required an allowed browser launch; its sandbox-only launch attempt failed before testing and passed on the complete rerun.
- `npm run build`: passed for the original game. Its output contains neither the Composer entry nor native Mario assets.
- `npx playwright test tests/interface-browser.spec.ts --reporter=list`: **5 original-game interface regressions passed**, including portraits, themes, appearance files, camera preferences and unavailable storage.
- `npm run build:composer`: passed, including the full TypeScript check. The bundle includes its dedicated worklet and original required local assets. Vite reports the existing large-chunk advisory; no build errors.
- `npx playwright test --config playwright.composer.config.ts`: **10 tests passed**, in actual installed Chrome. Covers chords, placement return/cancel, duplicate instances, names/moves/removal/history, sixteen Marios, over-cap imports, every library entry, files/recovery, overlapping source unisons, accidental dragging, Performance history guards, 390px touch/reduced motion and dense-score inspection.
- Sphere-specific actual Chrome checks also exercised body/palette dragging, occupied and off-canvas drops, keyboard/touch placement, camera-only Performance, all fifteen original native models and all three themes.
- Real Chrome audio checks decoded all 195 native notes and started every library entry. The largest library preflight occupancy was **61 voices** and **29 attacks per audio quantum**. A deliberate 64-voice test remained within the ceiling.
- Two dense 32-beat loops preserved **666 / 666 expected attacks** through 100ms and 250ms main-thread stalls. At 44.1kHz, 8,273 measured 128-sample worklet quanta used 471ms cumulative render time; the maximum was 2ms using a coarse 1ms wall clock. The quantum duration was 2.902ms. These are software execution measurements, not acoustic-onset latency measurements.

The server is the permanent strict **http://127.0.0.1:5417/BongoPlanet/composer/** entry. The final browser run reused the root-owned server after an earlier worker-owned process ended. No alternative port was substituted.

## PRD scenario coverage

| Scenario | Result and evidence |
| --- | --- |
| AC01 | Chrome desktop/reference and 390px inspection: separate entry, Bongo panels/fonts/toys, empty or paused recovered draft, no app-switch link. |
| AC02 | Browser first chord: one guitar, three simultaneous C4/E4/G4 events; model and audio tests verify independent polyphonic attacks. |
| AC03–04 | Browser missing Glass family, correct armed placement, cancel/return and successful return; context/brush retained, no inserted note. |
| AC05 | Deliberate duplicates have unique IDs/family numbers and no copied/reassigned score; model supports sixteen same-type performers; UI tested with duplicate guitars and sixteen Marios. |
| AC06 | Browser move/name flow preserves event ownership, pitch/time and fixed-junction nickname. |
| AC07 | Model and browser: sixteen repeated types accepted; seventeenth placement/import rejected without changes. |
| AC08 | Model + actual sphere gestures: occupied/cancelled drops preserve the band and old location; one-shot tool verified. |
| AC09 | Browser affected-note count, explicit removal/cancel, complete Undo; model tests same-type reassignment transaction. |
| AC10 | Browser view changes preserve playing/paused position and selected brush; one transport instance. |
| AC11 | Browser Performance hides editing controls; score taps and Undo/Redo cannot edit; camera-only sphere gestures; visible touch exit and Escape. |
| AC12 | Digital driver tests cover chords/rests, anchored loops, tails, pause/resume and completed-piece replay. Staff/Mario read the output clock; sphere receives mapped attack timestamps, grouping only simultaneous chords. Human listening and acoustic synchronization remain unperformed. |
| AC13–14 | All 25 library entries load paused; exact event equality and live fixture hashes verified. Airy conversions retain 16 original performers, duplicate types and 166/304 events. |
| AC15 | Original first-set 15 models and all 195 prepared notes loaded in Chrome; native shell remains Bongo styled. |
| AC16 | Wide-pitch library data preserved; compact bass/treble/percussion layout and actual-register octave labels implemented. Automated 3/4 mobile passage check and visual inspection completed; no human notation study. |
| AC17 | Browser coincident-note chooser, keyboard selection/drag, source-unison batch moves/copies; all events remain inspectable through the paged list when SVG pictures reach the rendering budget. |
| AC18 | Model and browser save/reload/export/import/New/Load/Undo/recovery tests preserve IDs, bank, events, loop and appearance; malformed imports leave the open piece intact. |
| AC19 | Actual Chrome desktop and emulated 390px touch/reduced-motion checks; bounded internal scrolling and focusable menus/controls. Physical touch devices, Safari and screen-reader testing not performed. |
| AC20 | Model rejects >32,768 events; decoded-tail preflight rejects >64 voices; driver/worklet tests cover bounded work, invalid/backward/forward clocks, processor failures, stale epochs and cancelled sample loading. Written data retained; restart requires Play. |
| AC21 | Original build and full existing suite pass. New source/saves/entry are isolated; ordinary build excludes Composer/native assets. Source/publication preparers now exclude local Composer/native/Song Studio paths and unsupported generated snapshot commands. Preparers and deployments were not run. No Site identity/audience or fork was changed. |

## Retained evidence

- `evidence/composer/browser-results.json` — ten integrated Chrome tests.
- `evidence/composer/first-chord.png`, `performance-390.png` — current screenshots inspected after the passing run.
- `evidence/composer/audio-browser-results.json` — decoded sample, preset, voice-budget and pause checks.
- `evidence/composer/audio-stress-results.json` — dense two-cycle attack conservation and measured worklet work.

## Limits

This is a local release. No publication was attempted. Human listening, measured speaker/acoustic onset or visual latency, Safari, physical devices and venue output have not been qualified. The score driver intentionally pauses before musical edits and rejects a score whose real sample tails exceed the voice/work budget; it does not silently drop notes. Finite source captures do not preserve unbounded future generator behavior.

## Naming and separation follow-up — 16 October 2026

- Full visible identity, HTML title, accessible sphere descriptions and export filenames now identify **Bongo Planet Philharmonic**. **Bongo Planet** remains the original spark game. Source, docs and tests live together in `philharmonic/`; `composer/index.html` preserves the established local URL.
- `npm run typecheck`, `npm run build` and `npm run build:philharmonic`: passed. Separate outputs are `dist/` and `dist-philharmonic/`. The original output contains neither the Philharmonic entry/runtime nor native Mario assets. Both builds retain Vite's large-chunk advisory.
- `npm run test:philharmonic`: **6 files / 83 tests passed**, including save migration and direct module dependency boundaries.
- `npm test -- --maxWorkers=2`: **63 files / 954 tests passed**. The default sandbox run had one pre-existing receiver-timing failure; an unrestricted run concurrent with browser work had one pre-existing five-second analysis-test timeout. The complete two-worker rerun passed without changing those tests.
- `npm run test:web:philharmonic`: **14 tests passed** in installed Chrome outside the sandbox (the sandbox aborted before Chrome startup). Includes legacy-save copying without loss, independent original-game startup on the same origin, rejection of original-game files as scores, full product title, Philharmonic export names, all existing editor flows and the 390px Performance layout. New results and screenshots: `evidence/philharmonic/`. Desktop and mobile screenshots were visually inspected.
- `npx playwright test tests/interface-browser.spec.ts --reporter=list`: **5 original-game interface regressions passed**, covering camera/portrait layouts, production themes, music-and-look files and unavailable storage.
- Publication exclusion functions and built-file inventories were checked without running either publication preparer. Local-only Philharmonic paths/configs/output and native assets remain excluded; original source remains included. No Site, publishing checkout, audience, database, Git history or fork was modified by this work.
- Shared-domain release requirements and current ownership are documented in `docs/Applications.md`. The local URL remains `http://127.0.0.1:5417/BongoPlanet/composer/`; the future `/philharmonic/` route is a plan, not a deployed result.
