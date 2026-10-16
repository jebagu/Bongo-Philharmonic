# Composition library — 16 October 2026

The local library now contains **32 entries**: seven new full-length arrangements, the 22 retained Favorites slots, and all three original Mario Paint demo scores. The Library uses full-width horizontal rows under collection headings, with descriptions, instrument pictures, duration, bar count and sound set. The sound-set filters update both the rows and the visible count. Original sketches remain available under their existing Favorites headings; native demos have their own **Original Mario Paint songs** heading.

## New full-length scores

| Composition | Duration | Bars | Band | Sections |
| --- | ---: | ---: | --- | ---: |
| Pachelbel’s Canon | 4:24 | 88 | 8 Bongo performers | 7 |
| Final Fantasy — Prelude | 3:26 | 96 | 6 Bongo performers | 7 |
| Take On Me | 3:05 | 128 | 10 Mario performers | 11 |
| Avril 14th | 2:57 | 56 | 6 Bongo performers | 7 |
| Dancing Queen | 4:10 | 104 | 11 Mario performers | 9 |
| Eine kleine Nachtmusik | 3:53 | 128 | 7 Bongo performers | 9 |
| Swan Lake | 4:00 | 72 | 8 Bongo performers | 6 |

These are newly authored instrumental arrangements based on the named pieces, with new developmental material and orchestration. They are not complete transcriptions of the original recordings, complete classical works, or seven unrelated original melodies. The scores contain **16,115 written note events**, approximately **25 minutes 54 seconds** of finite music, and have looping disabled on load.

Canon uses a sixteen-bar subject with successive voices entering one ground-bass cycle apart; a gentle Bongo ensemble carries it into a suspended coda. Prelude has wide arpeggios, a lyrical countermelody, a minor episode and a written descent. Avril 14th keeps the piano foreground, with restrained guitar, glass and music-box answers. Nachtmusik has contrasting subjects, a development, recapitulation and final cadence. Swan Lake has a glass melody, rippling accompaniment, a chromatic storm and a quiet ending.

Take On Me uses Game Boy, Mario, Swan, Heart, Flower, Star, Mushroom, Boat, Pig and Yoshi. Dancing Queen uses Mario, Heart, Swan, Airplane, Flower, Star, Mushroom, Boat, Pig, Cat and Game Boy. Their verse/chorus forms include breaks, contrasting bridges, changing orchestration and composed endings. Each arrangement uses a single existing sound set, preserving the current version-one file format. Across the library, both sets remain available.

`src/compositions.ts` expands the written parts deterministically into ordinary editable `Composition` events. There is no random generator, live routing dependency or new save format. Attacks, levels, articulation and phrase shapes are authored; original note recordings keep their existing playback behavior, including the natural one-shot tails of Mario instruments. Section metadata belongs to the Library entry. A section picker in Composer and Performance prepares the selected score, seeks to that section and leaves playback paused. JSON export continues to preserve the entire editable score.

## Preserved sources

The original **3,204 source events** remain unchanged in the owned source library, alongside the existing source/provenance records. Tests retain the Mario score-byte hashes, exact native tempi and loop intent, original Favorites assignments and the deliberate duplicated Favorites slot. `SOURCE_ENTRIES` separates those preserved arrangements from the seven new scores; inventory validation still checks the original menu independently.

The user subsequently requested publication of this expanded library on 16 October 2026. The public build now includes all 32 entries: all seven new arrangements, 22 retained Favorites and the three original Mario Paint songs. Both sound-set filters are available publicly. The independently audited asset allowlist and separate publishing checkout still apply; this adds score data without adding other asset packs or landmarks.

## Verification

The score checks validate contiguous section coverage, real music throughout the timeline, variation beyond one copied passage, used performers, unique attacks, finite endings, the sixteen-performer cap, and the complete schedules against actual WAV tail lengths and the 64-voice ceiling. Browser checks exercise row grouping and filters, phone width, all 32 loads with recovery, and each new score from its opening, middle and final section. These are structural and runtime checks; musical taste remains a listening judgment.
