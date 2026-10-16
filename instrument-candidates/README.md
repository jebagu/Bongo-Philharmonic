# Bongo Planet — instrument candidates

Local audition: **http://127.0.0.1:5417/BongoPlanet/instrument-candidates/**

Three separate banks of sixteen sounds, with individual note/phrase/chord auditions, a sequential tour and an original four-bar group groove. The optional common backing beat is separate from the sixteen bank voices. Every bank voice appears over each cycle; mute controls let you compare blends. Saved hearts and the downloadable shortlist belong only to this page.

## Sound-design boundary

These are original procedural studies inspired by recognizable eighties timbres, not clips of hit records, licensed factory presets, exact patch reconstructions, or qualified analog hardware emulations. Chorus and envelopes are part of the studies. Orchestra hit, flute, drums and keyboard voices are synthesized; six voice slots use five source files, with two different edits of the EllenMentor recording. The displayed miniature wave marks are decorative; the large deck display is an actual output oscilloscope.

The two vocal textures have approximate transposition, not validated concert-pitch root or formant preservation. The sampled speech is fixed-duration, and the group demos are timbre comparisons rather than finished arrangements. No instrument or application preset has been promoted.

## Pop Icons

Big brass. Glassy keys. Rubber bass. A greatest-hits palette of unmistakable eighties character.

| # | Candidate | Role | Listening reference |
| --- | --- | --- | --- |
| 1 | Stadium Brass | chord | Van Halen · Jump |
| 2 | Final Fanfare | lead | Europe · The Final Countdown |
| 3 | Pencil Pluck | arp | a-ha · Take On Me |
| 4 | Beverly Lead | lead | Harold Faltermeyer · Axel F |
| 5 | Sweet Pulse | bass | Eurythmics · Sweet Dreams |
| 6 | Monday Rubber | bass | New Order · Blue Monday |
| 7 | Digital Slap | bass | Kenny Loggins · Danger Zone |
| 8 | Glass Ballad | keys | The DX-style eighties ballad piano |
| 9 | Chorus Clouds | pad | The classic JUNO-style chorus pad |
| 10 | Prayer Sparkle | arp | Duran Duran · Save a Prayer |
| 11 | Orchestra Flash | fx | Yes · Owner of a Lonely Heart |
| 12 | Breath Flute | lead | Peter Gabriel · Sledgehammer, opening |
| 13 | Floating Ahh | voice | Art of Noise-era sampled-voice character |
| 14 | Initializing | voice | Cough-E · Robot Voice Pack |
| 15 | Electro Boom | kick | Planet Rock-era TR-808 character |
| 16 | Gated Thunder | snare | The eighties gated-reverb snare |

## Neon Cinema

Slow brass swells, glassy digital textures and voices from somewhere beyond the city.

| # | Candidate | Role | Listening reference |
| --- | --- | --- | --- |
| 1 | Replicant Brass | pad | Vangelis · Blade Runner |
| 2 | Finish-Line Piano | keys | Vangelis · Chariots of Fire |
| 3 | Rain Harmonica | lead | Vangelis · Blade Runner Blues |
| 4 | Future Pulse | bass | Brad Fiedel · The Terminator |
| 5 | Night Drive | bass | John Carpenter · Escape from New York |
| 6 | Miami Glide | lead | Jan Hammer · Crockett’s Theme |
| 7 | Velvet Strings | pad | Tears for Fears-era layered synth-pop |
| 8 | Hill Cello | keys | Kate Bush · Running Up That Hill |
| 9 | Crystal Fantasia | keys | The late-eighties D-50 digital-pad aesthetic |
| 10 | Midnight Bells | keys | DX-style tubular-bell keyboards |
| 11 | Glass Waves | arp | PPG-era digital new wave |
| 12 | Laser Comet | fx | Eighties sci-fi effects and electronic percussion |
| 13 | Hexagon Tom | perc | Simmons-style eighties fills |
| 14 | Reverse Air | perc | Eighties reverse-reverb transitions |
| 15 | Dream Choir | voice | EllenMentor · layered female voice, slowed and filtered |
| 16 | Ready, Dreamer | voice | Kenney · Female / ready |

## Electro Club

Acid, warehouse bass and metallic percussion. Built for a tight groove and a very small dance floor.

| # | Candidate | Role | Listening reference |
| --- | --- | --- | --- |
| 1 | Acid Circuit | bass | The TB-303 acid-house sound |
| 2 | One-Oh-One | bass | The SH-101-style electro bass |
| 3 | Late-Night FM | bass | The TX81Z / Lately Bass family |
| 4 | Detroit Swarm | bass | Kevin Saunderson-era Detroit bass, 1988 |
| 5 | Warehouse Stab | chord | Inner City-era late-eighties house |
| 6 | Chrome Sync | lead | The hard-sync lead of eighties electro-pop |
| 7 | Wire Pluck | arp | Digital sequencer and industrial-pop textures |
| 8 | Digital Wood | keys | Eighties FM marimba and log-drum patches |
| 9 | Warehouse Kick | kick | TR-909-style house and techno kick |
| 10 | Machine Snare | snare | TR-909-style snare |
| 11 | Handclap Stack | clap | Classic analog drum-machine claps |
| 12 | Closed Chrome | hat | Classic electronic closed hi-hat |
| 13 | Open Chrome | openhat | Classic electronic open hi-hat |
| 14 | Electric Cowbell | perc | TR-808-style cowbell |
| 15 | Yeah! | voice | DJ N.D.5 / leonschi13 · Yeah (Vocal) |
| 16 | Let’s Go | voice | Kenney · Male / go |

## Sources and rights

The external audio files are published as CC0 by their linked authors. `sources.json` records source pages, direct downloads, transformations, SHA-256 hashes and exact asset sizes. Freesound assets are high-quality MP3 previews, not original WAV masters. Kenney’s original license text is retained. No audio is fetched from a third-party server during playback.

- [EllenMentor — ooh-aha.wav](https://freesound.org/people/ellenmentor/sounds/419161/), CC0-1.0. Freesound high-quality MP3 preview. Original layered female vocal; two separate excerpts and treatments. Original recording not concert-pitch calibrated.
- [Cough-E — Robot Voice Pack](https://opengameart.org/content/robot-voice-pack), CC0-1.0. Author states: I waive all of my rights to these sound files. Used as a fixed spoken phrase.
- [Kenney — Voiceover Pack](https://kenney.nl/assets/voiceover-pack), CC0-1.0. Original pack License.txt retained. Speech transposed and optionally echoed at runtime.
- [DJ N.D.5 / leonschi13 — Yeah (Vocal)](https://freesound.org/people/leonschi13/sounds/129360/), CC0-1.0. Freesound high-quality MP3 preview. Used as a fixed spoken shout.

## Local operation and verification

Reuse the root `npm run dev` server, strictly on port 5417. This buildless entry uses native ES modules and Web Audio, with three locally served fonts from existing root dependencies. No dependencies were added. A static server can serve the directory and assets; absent custom fonts fall back to system fonts.

Run `node instrument-candidates/verify.mjs` for Chromium desktop/mobile control checks, all 48 audition buttons, groove participation for all 16 voices in each bank, signal/headroom checks on actual offline-rendered audio graphs, and asynchronous start/stop checks. The script uses the installed Google Chrome executable; it writes `validation.json` and two screenshots. Machine validation does not establish subjective listening quality or Safari/device audio acceptance.

Audio stops on bank change, Escape, explicit Stop, page hiding and page departure. Lazy audio startup is generation-guarded so an earlier request cannot start after Stop or a bank change. Drum voices and speech ignore chord mode; they remain single hits/phrases.

The directory is excluded from public-GitHub snapshot preparation and from public-site source copying. Neither production build imports this page. No build, publishing preparer or deployment is required to audition it.

## Acceptance result · 16 October 2026

The local Chrome run passed all 48 individual audition controls, all 16 voices participating in each of the three live group grooves, phrase/chord audition controls, shortlist persistence, filtering, mute/reset controls, Escape/bank-change cancellation, and cancellation during lazy sample loading. All 48 individual audio graphs and three group mixes rendered finite audible signals with headroom and settled tails. Layout checks passed at 390, 768 and 1440 pixels with no horizontal overflow; the browser reported no errors. Exact signal metrics are in `validation.json`. The in-app browser also visibly entered group playback and returned to stopped state. Subjective listening quality remains for user audition.
