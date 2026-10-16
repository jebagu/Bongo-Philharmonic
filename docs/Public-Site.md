# Bongo Philharmonic public Site

Authorized by the user on 16 October 2026 as a separate **public** ChatGPT Site.

- Site ID: `appgprj_6ad23b8ada4081918bf45b0ad02007c9`.
- Public URL: https://bongo-philharmonic.jebagu.chatgpt.site — deployment succeeded on 16 October 2026.
- Publishing checkout: `sites/bongo-philharmonic/`; preserve `.openai/hosting.json` and its own source history. The development repository remains local and independent.
- `npm run build:public` creates and audits `dist-public/`. It has ten Bongo portraits, fifteen Bongo recordings, all fifteen original Mario Paint instruments (fifteen sprites, fifteen GLBs and 195 prepared notes), independently copied toy geometry/themes, the original bouncing Mario Paint playhead, and all 32 library entries, including seven new full-length arrangements and all three original Mario Paint songs.
- On 16 October 2026 the user explicitly requested restoration of the missing Mario instruments to the live Site. The sound-set selector, palette, placement, original models, native audio and Mario score imports/restoration are included. Runtime assets are copied individually from the original manifest and checked byte-for-byte against this project's originals. No asset license is inferred from that authorization; provenance and the separate sound/art/model rights notice remain in the payload.
- The expanded score library was explicitly approved for publication on 16 October 2026. Only the three retained playhead poses, original hop table and original note-reaction table are allowed for the playhead and note animation. ROMs, raw sources, editable voxels, landmarks and alternate/upscaled variants stay out of the publishing checkout.
- `npm run prepare:site` copies only the audited public payload. Never copy the entire local Git tree or `dist/` to this Site.
- First-release checks are recorded below. Current restoration checks and deployment details are recorded in the restoration section; historical acceptance does not substitute for fresh verification.
- Existing Bongo Planet Sites, audiences, source checkouts and databases remain separate.

Use the Sites source helper with this checkout to push/package the exact source commit, then save and deploy that version. The audience is explicitly public by user request.

## Audio startup repair — 16 October 2026

Play could show “Audio clock interrupted” before the first note: the worklet treated a clock gap over 100 ms during its silent startup window as an interruption of active playback. Startup now restarts its 250 ms stability window after such a gap. Interruptions after playback begins still pause, clear voices and require deliberate Play; Stop still cancels pending startup.

- Verification: all 98 unit tests passed, including four new worklet regressions. Three of those regressions failed against the original code. Both development and audited public builds passed; all 497 resource files still match baseline 1.0.0.
- Browser verification: the 13 existing public checks passed, followed by two new cold-start checks with three first-press starts each for Bongo and Mario Paint. Both new checks also passed against the deployed Site (six fresh starts). The user's saved Toy Ensemble also advanced in the existing Chrome tab with no interruption notice; it was left paused in Performance with Fireflies and Slow rotate restored. This verifies browser behavior, not an acoustic or physical-device qualification.
- Published version: **7**, existing public audience retained.
- Site source commit: `dc7529dfad2cecb85ccefdb6645cb89af57d40d9`.
- Saved version: `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_acef72dce72c819188962d1ad4bcd19a`.
- Deployment: `appgdep_6ad248b04c948191828d64fb109cd417`, succeeded.
- Evidence: `evidence/audio-startup/investigation.json`, `evidence/audio-startup/live-browser-results.json` and the two screenshots alongside them.

## First public deployment

- Audience: **public**, access-policy revision 2.
- Saved version: `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_65fdea959c74819196b83e7ab1da2da6`.
- Deployment: `appgdep_6ad23d97502c8191ac9846a9005fb9c0`, succeeded.
- Published Site source commit: `c593d3c0bf4c2b036a62e6862c3e88a5a0fa93b6`.
- Payload: 78 public files, 5,263,142 bytes; ten portraits and fifteen WAVs; no local-only native assets.
- Separate Codex project: `744ab29e-ed14-44d0-bf45-572f060f96e9`, default sidebar label `bongo-philharmonic`. Opened with the CLI bundled in the installed desktop app.

Anonymous hosted Chrome verification also passed all 3 public-browser tests against the actual deployed URL, including playback, files, loaded pictures and the 390px layout.

## Mario instrument restoration — 16 October 2026

- Authorized scope: restore all fifteen original Mario instruments to this same public Site, including sprites, original voxel GLBs, 195 prepared WAV notes and manifest. Keep the Bongo library and public playhead unchanged.
- Audited runtime payload: 305 files, 10,758,565 bytes; 25 portraits, 210 recordings and 226 Mario runtime assets (manifest included).
- The release was built from an isolated snapshot of the prior release plus the Mario restoration, preserving concurrent unfinished FAQ edits in the development workspace without publishing them.
- Checks: public build/payload audit, all 94 unit tests in the release snapshot, four local Chrome browser tests and four anonymous hosted Chrome browser tests passed. These cover both sound sets, all fifteen loaded original models, all 195 decoded Mario notes, playback through all thirteen staff positions, Mario file import/persistent reload, invalid-file atomicity and 390px Performance layout. Human listening, Safari and physical-device qualification were not repeated.
- Saved version: `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_ac3a26e192c881918555fd13f8e9f727` (version 2).
- Deployment: `appgdep_6ad241fc2f448191a49ed053ef4efc3a`, succeeded; public audience retained.
- Published source commit: `7f47ed0f6e684e4b6ba5e54167b6da18a911e9ae`.
- Evidence: `evidence/mario-restoration-deployment.json`, `evidence/mario-restoration-release.json` and `evidence/mario-restoration-live-public-browser-results.json`.
- Rights audit: original icons and sounds are Nintendo-derived; GLBs extrude the original pixels with vertex colors and no external textures. No redistribution license has been established. Preserve `docs/licenses/Mario-Paint-Assets.md` and manifest provenance.

## Mario playhead restoration — 16 October 2026

The user requested restoration of the original jumping Mario in Composer. The public build had replaced `src/marioPlayhead.ts` with a Bongo portrait and a generic sine bounce. That substitution is removed; both builds now use the existing native walk/jump poses, original hop curve, score subdivision and audio clock. Paused and reduced-motion playback keep Mario still. Both sound sets retain Mario as the playhead.

The payload audit requires all three original PNGs and verifies their bytes against the retained provenance hashes. The public browser regression checks both sound sets, native image dimensions, jumping, pause, reduced motion and the 390px Composer layout.

- Verified public build: 311 files, 11,480,994 bytes, all three original playhead poses; 83 unit tests and all seven local public-browser checks passed. Resource baseline 1.0.0 still verifies across all 497 files.
- Live regression: passed for both sound sets, jumping, pause, reduced motion and mobile. The test warms the sound bank through Play/Stop first; cold-start hosted headless checks encountered the existing audio-clock interruption notice before resuming. The transport was not changed for this fix.
- Published source: `4fe52f063f63fde64a8ae72b13c82254d95eba8c`.
- Saved version 4: `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_ee8bd93036848191b0ab82fba0e58321`.
- Deployment `appgdep_6ad24347d5d4819197d934eabf7f7174` succeeded on 16 October 2026 at the existing public URL, with its public audience unchanged.

### Native animation correction

### Native note reaction and transparent pictures — public version 9

The original note reaction was verified in `CODE_00FC23` / `DATA_00FC73` at the same retained disassembly revision. Each note in the struck column translates down by the exact 32-sample table (0–7 native pixels), then returns as Mario passes. The reaction follows horizontal travel and scales with the displayed note picture, including zoom and Performance; the staff and stored pitches stay fixed. Pause, rewind and reduced motion clear the displacement.

The gray duration tails are removed from the score pictures; note durations remain intact in saved music and the inspector. All note hit targets and drag-preview pictures have transparent fills, including selected and current-performer states. Selection outlines, click targets and both editing crosshair guides remain.

Checks: 101 development unit tests, typechecking/public-payload audit and the 497-file resource check passed. Both Bongo and Mario browser checks passed locally and against the public Site, covering chord timing, full return, unchanged artwork dimensions, transparent PNG corners and selection/drag fills, retained crosshairs, pause/reduced motion, preserved score events and phone layout. The existing native-hop browser check also passed locally. This release preserves public version 8's other runtime assets and library.

Public version 9: source `6f621ddb281d1b0928fa948f55dbd791a22b14b5`, version `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_3114242bfe248191b596bf7a789faeef`, successful deployment `appgdep_6ad24f97fbb88191b94bf94954aac6f6`. Evidence: `evidence/mario-note-reaction-deployment.json`, `evidence/mario-note-reaction-live-browser.json` and the `evidence/note-reaction-*` screenshots.

### Native hop implementation

The user rejected the fixed-beat bounce and requested the original animation and travel distance. The movement was checked against `CODE_00F6AC` / `DATA_00F7B4` in the retained Mario Paint disassembly. Mario now jumps into occupied note columns, holds the original `0x014D` pose throughout the arc, and walks through empty space. The 32 source-pixel hop and 17-pixel rise scale with the 16×24 sprite: 64×34 display pixels at the editor's 2× size. Closely spaced authored notes proportionally shorten the arc so it lands exactly on the next onset. Chords share one landing; changing the editing grid does not change existing note landings. Zoom and Performance scale the sprite and arc together, with headroom to retain the complete sprite. Paused and reduced-motion behavior remain still.

Original source: https://github.com/Yoshifanatic1/Mario-Paint-Disassembly/blob/730df333bd4110da7965e0ad063c1c5dcf894a73/MPAINT/Routine_Macros_MPAINT.asm . The web transport starts at beat zero and does not reproduce the console's introductory run-in.

The isolated release baseline was rebuilt and matched public version 7 byte-for-byte, apart from the updated rights/provenance paragraph, before applying the animation changes. Existing library, background and audio-startup updates were retained. The release passes 95 snapshot unit tests and the native-distance/landing and both-sound-set browser checks. The current development tree also passed 99 unit tests, typechecking and the 497-file resource check during implementation.

- Public version **8**, source `8eaf7dbdf7fbd70f38b118e8f9d8544ec9cae137`.
- Saved version `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_4ecf21d14cf88191887101cf1cfd5965`.
- Deployment `appgdep_6ad24c2a999c8191830a4c3b38b5d527` succeeded at the existing public URL on 16 October 2026.
- Both animation browser checks also passed against the published URL, covering native distances, note landings, both sound sets, pause, reduced motion and mobile. Evidence: `evidence/mario-native-animation-deployment.json` and `evidence/mario-native-animation-live-browser.json`.

## FAQ guide — 16 October 2026

The top navigation now includes FAQ: an illustrated Placement → Composer → Performance walkthrough, an explanation of the band, junctions and score, a reminder that editing can move back and forth, and answers about notes, the Library, saving and sharing. Three actual 1280 × 850 screenshots live in `public/guide/` and can be opened at full size. Opening the guide preserves the composition, editor position and pending performer selection.

- FAQ browser checks cover score preservation, placement return, keyboard-operated answers, loaded screenshots, workflow links and 1440px, 390px and 320px layouts.
- Published public version: **3**.
- Site source commit: `c18b9118cdde4b1948404425931bba1848f703dd`.
- Deployment: `appgdep_6ad242e6795081918e66c277db400bc6`, succeeded.

## Performance visual styles — 16 October 2026

Performance's top bar now has a Visual style selector for Blue Marble, Nebula and Fireflies, using the existing composition appearance setting and the same options as More → Theme. The selector saves with the composition, follows restored drafts and menu changes, and changes appearance without a musical edit. On narrow screens, the selector and playback controls occupy two rows within the top bar.

This change is included in public version **3**, source commit `c18b9118cdde4b1948404425931bba1848f703dd`, deployment `appgdep_6ad242e6795081918e66c277db400bc6` (confirmed succeeded). No additional publication was needed after that shared publishing checkout deployed the selector.

The public build/payload audit, 83 unit tests, 497-file resource verification and two existing Performance browser checks passed. Separate local and anonymous hosted browser checks confirmed all three rendered styles, unchanged music, continued playback, saved selection after reload, menu synchronization and layouts from 1440px down to 319px. Screenshots were collected while paused after headless screenshot capture interrupted Chrome's audio clock during an initial hosted run. Evidence is in `evidence/performance-styles/`; human listening and physical-device testing were not repeated.

## Background particles and Performance camera controls — 16 October 2026

Blue Marble now draws 180 small stars; Fireflies draws 72 drifting golden lights with soft halos. These are procedural particles owned by Philharmonic. Nebula keeps its existing scenery, rendered with a separate fixed camera and lights so globe rotation and zoom cannot change its placement, scale or shading. The existing atmosphere rim stays with the globe. The copied resource baseline remains unchanged.

Reset view and Slow rotate now appear beside the style selector in Performance, using the same controls as Placement. Slow rotate works during Performance, pauses during a drag and respects reduced motion. The buttons return to the sphere when exiting Performance. Both rows of the compact top bar fit at 319px.

- Published version: **5**, public audience retained.
- Source commit: `6f1bcb4b03f96c93e2b31fad59663fe67d0d87f8`.
- Deployment: `appgdep_6ad245cc27e48191b972c132b2ac3311`, succeeded.
- Verification: public build/payload audit, 91 unit tests, resource verification, two existing Performance checks and all 11 public browser checks passed across runs. The intensive Mario audio test encountered an audio-clock interruption in the full run and passed in isolation; no audio transport code changed.
- Both new background/camera regressions also passed against the deployed Site. They check visible particle pixels, identical Nebula sky pixels after rotation and zoom, camera reset, slow rotation, reduced motion and narrow layouts. Evidence and release IDs are in `evidence/performance-backgrounds/`.

## Song files and agent composition guide — 16 October 2026

The header now exposes Files with Save locally, Load local save, Export JSON, Import JSON and Recover previous draft. The existing More actions remain available and share the same handlers. Local save is one browser checkpoint; draft, saved and recovery storage IDs and version-one composition schema are unchanged.

The FAQ explains autosaves, checkpoints, recovery, portable JSON backups and importing a paused score. It includes the full file format, both sound sets' exact instrument IDs, timing/pitch examples, constraints, sample behavior and playback limits. Visitors can copy or download a self-contained agent prompt (including the public URL), download the format reference and download the complete two-bar First Light example. The prompt is visible and selectable when clipboard permission is denied. Canonical content is in src/songGuide.ts; the literal example in the prompt is imported and prepared for audio in the unit test.

- Public version **6**; source commit f27dbc60ff72cee4096ad325656a1b608533e5d2.
- Saved version: appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_39da410c34848191af62bb276b451b44.
- Deployment appgdep_6ad246873344819197efd890a8909482 succeeded; existing public audience and URL retained.
- Build/payload audit passed: 311 files, 11,521,816 bytes. All 94 unit tests, the 497-file resource baseline and all 12 local public-browser checks passed. The latest already-published Performance background changes are retained.
- Browser coverage includes example download/import/playback, saved checkpoint restore, exact JSON export, reload, invalid-file atomicity, recovery, prompt/format download contents, clipboard copy and denied-permission fallback, plus 1440/1024/768/390/320px layouts and the 320px Files dialog. An earlier run lost its shared preview server mid-suite; the complete final run started a fresh preview and passed without retries.

Anonymous hosted verification passed all four FAQ/file-workflow browser checks on the published URL. This includes importing and playing the downloaded example, checkpoint save/load, export contents, invalid-import preservation, reload/recovery, exact prompt and format downloads, clipboard behavior and the narrow Files dialog. Hosted headless Chrome displayed the existing first-start audio-clock interruption; the test followed its visible Play-to-resume instruction once and verified the advancing playback clock. No transport behavior changed for this feature. Evidence: evidence/song-files-release.json, evidence/song-files-local-browser-results.json and evidence/song-files-live-browser-results.json.

## Expanded composition library — 16 October 2026

The requested horizontal library and all 32 entries are public: seven new full-length arrangements, the 22 retained Favorites slots and all three original Mario Paint songs. Both sound-set filters and section navigation are available. The musical-score allowlist was expanded explicitly for this publication; other asset restrictions remain in force.

- Public version **7**, confirmed succeeded at the existing public URL.
- Published source: `dc7529dfad2cecb85ccefdb6645cb89af57d40d9`, including library commit `439ab177b04a37780d7a19cc1390d4493761f4d4` and the concurrent cold-start audio fix.
- Saved version: `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_acef72dce72c819188962d1ad4bcd19a`.
- Deployment: `appgdep_6ad248b04c948191828d64fb109cd417`; public audience retained.
- Audited payload: 311 files, 11,571,502 bytes.
- Live verification covered all 32 exact scores, playback/section seeking for all seven new arrangements, cold first-press playback, native assets, files, FAQ and mobile views. Fifteen hosted checks passed across the main run and the corrected playhead assertion rerun. Current workspace typecheck, 99 unit tests and the 497-file resource check passed.
- Evidence: `evidence/library-public-deployment.json` and `evidence/philharmonic/public-library-rows.png`.

## Continuous score following — public version 10

At the user's request, Composer and Performance now follow the original Mario Paint scrolling pattern: Mario moves toward the middle, then the notes move continuously beneath him. The score keeps a bounded render window and rebases without shifting his screen position. Near the playback end it stops panning so he can finish the remaining passage; non-looping completion runs him off the right edge only after the song ends. Loop wraps return the camera to the loop's start. Clefs and pitch guides stay fixed, while the existing native hop and note-dip tables retain their audio-clock timing.

Pause holds the camera. Stop rewinds the score view. Manual passage navigation pauses playback, and section seeking clears the previous follow position. Editing, drag previews and zoom account for the panned viewBox, preserving exact event timing and pitch. Score data, audio scheduling, existing assets and the public audience are unchanged.

The release starts with public version 9 and includes only these scrolling changes; concurrent local Performance layout work remains in the development tree. Typechecking, 101 development unit tests, the 497-file resource check, public payload audit and nine targeted local browser checks passed. The browser checks cover both views, desktop/390px layouts, passage rebases, real song completion, loop wraps, pause, editing after a pan and retained native hop/note reactions. Evidence: `evidence/score-follow-local-browser.json`, `evidence/score-follow-deployment.json` and `evidence/score-follow-*.png`.

Public version 10 uses source `04d0bb9d0a43221b919c7feacacd418eb2949d60`, saved version `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_4e681cf9da8c8191b993b2bd1b68c779` and successful deployment `appgdep_6ad254d8cce48191bd28a1f1cd1f9e13`.

During hosted verification, the concurrent layout update published version 11 (`3a34aabca8e0ff14cf2c78536f08a243b2e62f98`) on top of version 10 and retained score following. The four desktop/mobile song-ending checks and Performance loop/pause check passed on the live site. Composer loop/pause/editing passed on rerun after correcting the test to choose a note position inside the visible viewport when paused near the loop end. All six hosted follow cases passed across these runs. Evidence: `evidence/score-follow-live-browser-main.json`, `evidence/score-follow-live-browser-editing.json` and `evidence/score-follow-inherited-live-deployment.json`.


## Shared workspace layout — 16 October 2026

Published the common header, fixed full-width bottom playback controls, shorter Composer instrument strip and adjustable Performance score. Visual style and camera controls occupy the same sphere corner in Placement and Performance. The separately requested continuous score scrolling is retained in both views.

- Public version **11**, audience remains public.
- Source: `3a34aabca8e0ff14cf2c78536f08a243b2e62f98`.
- Saved version: `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_1c383aaed8e081919849d62cd08ed0a8`.
- Deployment: `appgdep_6ad254ffaba88191b8166471e15b19ad`, succeeded.
- Audited public payload: 311 files, 11,630,246 bytes. Build and 101 unit tests passed. Three combined local checks and the same three hosted checks passed: control positions across all five tabs at desktop and phone widths; divider drag/cancel/keyboard/persistence; uninterrupted playback across tabs.
- Evidence: `evidence/ui-layout-update-2026-10-16/public-deployment.json`, `live-browser-results.json` and `live-performance.jpg` alongside it.


## Fixed Composer toolbar and 150% default — public version 12

Published the user's requested Composer simplification: separate clef and pitch-label lanes, larger note pictures, 150% initial zoom, the Instruments heading, and one permanent toolbar. Individual note volume, performer assignment, the duplicate erase action, explanatory same-column text, section chooser, passage arrows and beat-range label are removed. The bottom scrollbar now reaches the complete composition using a bounded render window. Automatic score following, the original Mario animation, legacy velocities and saved-file compatibility are retained.

- Public version: **12**, existing public audience and URL retained.
- Source: `481d6a7598c4d8bcfdd6ef0ddc38a1c66c9e0275`.
- Saved version: `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_6c5d7228370881918d531e6b47b39a1b`.
- Deployment: `appgdep_6ad274fb64b481918918253b6a01b5db`, succeeded.
- Audited runtime payload: 311 files, 11,631,862 bytes. Only the allowlisted public build entered the publishing checkout.
- Prepublication verification: the prior 101 unit tests, 497 resource checks, 33 browser cases across the full run and correction rerun, three native-animation cases, and two additional desktop/phone checks against the exact public build passed.
- Evidence: `evidence/composer-toolbar-deployment.json`, `evidence/composer-toolbar-verification.json` and `evidence/composer-toolbar-live-browser.json`.

Both anonymous hosted Composer checks passed at 1440px and 390px: initial/reloaded 150% zoom, fixed toolbar geometry, removed controls, late-note editing and unchanged velocities, final-note reachability, bounded rendering and clef/label/picture clearance.
