# Bongo Planet Philharmonic composition library layouts

**Current library:** the 16 October 2026 expansion adds seven full-length arrangements and replaces thumbnail cards with horizontal rows. There are now 32 local entries, with a separate Original Mario Paint songs collection. See [Library-Arrangements.md](Library-Arrangements.md). The source-preservation and spatial-layout record below describes the original 25 entries and remains applicable to those entries.

The Library view includes every current Favorites menu entry and all three original Mario Paint demos: **25 entries**, containing **3,204 separate note events**. The live inventory was checked against `src/core/examples.ts` on 16 October 2026.

| Collection | Entries |
| --- | ---: |
| Favorites - Simple | 7 |
| Favorites - Chords, including the two pop excerpts | 12 |
| favorites - with loops | 3 |
| Mario Paint — Original demos | 3 |

Take On Me — Spark Build deliberately appears twice in the original Favorites menu. Both slots remain, sharing the same music and spatial arrangement. The library therefore contains 24 distinct arrangements. Existing cover excerpts remain excerpts, and generator favorites retain their captured repeating passages; this work does not expand them into complete commercial songs or reproduce every future response of a generator network.

Every arrangement now has an authored sphere layout in `philharmonic/src/library.ts`, with a concrete `layoutName` available to Library cards. Small bands use open diamonds, offset trios, a horizontal row, a square, or a rising diagonal. Larger bands use staggered rows, separate voice and rhythm arcs, paired family columns, or nested rings. The one-performer Mario Paint demo remains a front-center solo. Different songs with the same band size use different junction sets, except the deliberate duplicate menu slot.

Related sound families occupy consecutive layout slots, with pitched families before percussion and higher-register copies before lower-register copies. The original performer array, stable performer IDs and family numbers remain unchanged. Every performer uses its own junction on the starting visible hemisphere. The narrowest pair separation is above 20 degrees on the actual mesh; this is a geometric readability check, not a physical surround-listening result.

All notes, their IDs, ordered attacks, pitches, exact onsets, durations, velocities, master volume and source loop intent remain intact. Bands of sixteen performers or fewer retain every original performer and every note assignment. Only the two 39-performer Airy Loops inputs undergo the previously specified, recorded sixteen-performer conversion from Composer PRD section 10. Duplicate sound types remain supported throughout.

Source music and provenance remain in `song-studio/library.json` and `song-studio/library-provenance.json`. No main-game catalog, source composition, native demo record or public Site is changed by these layouts. Focused tests verify live Favorites membership, every source event, native score hashes, performer limits, distinct layouts, front-facing spacing and the deliberate duplicate.
