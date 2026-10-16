# Bongo Planet — creation guide

For humans and agents composing **version-two gated scenes**, including Switch Chain, Switch Fork and Infinite Circuit. [Rules.md](Rules.md) is the executable contract.

## Compose with an AI agent

Open **Write music with AI** in its own section below Settings to visit the dedicated introduction and AI guide at **/BongoPlanet/ai-music/**. It opens in a new tab so your current composition stays open. Describe the music and visual look, and copy the prompt into your agent. The prompt includes this guide, the exact JSON schema, a complete starter file, current instruments and visual options, and all valid neighboring vertex IDs. Save the agent's complete raw JSON as `Bongo-Planet.json`, choose **Import** below Tempo in the planet, then press **Play**. Imports start paused.

The canonical file reference and FAQ are [Agent-Guide.md](Agent-Guide.md), generated from the same sources as the app's AI guide page. Files use an outer `format: "bongo-planet-composition"`, `version: 1`, with a musical `scene` and a complete visual `appearance`. Use `scene.version: 2` and `appearance.version: 1`. **Save / Load** keep both in this browser; **Export / Import** transfer both in one JSON file. **Look files** in Edit look transfer appearance alone. Scene Undo/Redo restores music; appearance changes keep their separate automatic browser save.

## Choose a look with contrast

Off gates use **Whisper half pixel**: a faint 0.5-pixel outline at 25% opacity. The outline stays thin as you zoom or resize; the flat glyph naturally foreshortens toward the planet's edge. On gates keep their full-opacity orange fill. Saved outline and fill colors remain supported; `switches.stroke` multiplies the default half-pixel width.

Edit look offers a dark planet palette, retaining Planet blue and Ink alongside darker warm, purple, green and charcoal options. Instruments keep their bright palette so pieces, gates and sparks stand out. The backdrops are Midnight, Ember dusk, Deep forest, Plum night and Star field; all are dark. The default sky is Midnight. Existing backdrop IDs remain valid in saved files. Use the current planet palette and sky base colors in [Agent-Guide.md](Agent-Guide.md) when composing a look.

## View the globe

A floating red-and-white **North Pole** model with an **N** sign marks the globe's fixed north axis. It stays above the same pole as you orbit or tilt the view, so you can recognize which way is up. The starting view includes room for the marker.

The top-right **Reset view** button restores the starting orientation and zoom and stops slow rotation. **Slow rotate** toggles a gentle spin around the current view's vertical axis, preserving any tilt you chose by dragging. One full turn takes two minutes. Rotation pauses during camera, piece and gate gestures and resumes when you release. It works while music is paused. These view controls leave the music and saved look unchanged; camera state is not saved in composition files.

## The shared musical grid

**One strut crossing takes one sixteenth note, regardless of geometric length.** A beat means a quarter note: four hops make one beat; sixteen make a four-beat bar. Empty junctions and return trips consume steps too.

| Journey at 120 BPM | Arrival after emission |
| --- | --- |
| 1 hop | 125 ms |
| 2 hops | 250 ms |
| 3 hops | 375 ms |
| 4 hops | 500 ms / 1 beat |

At fixed tempo, hop duration is `15 / BPM` seconds. Sparks cross longer struts faster so visible arrival matches sound. Camera position and frame rate cannot alter timing.

**Spark interval** sets emission frequency in beats. **Spark travel** limits each branch's hops; it does not change hop duration. Infinite removes that limit. Switching off **Emit new sparks** leaves existing sparks traveling; Pause stops them. Repeated Infinite emissions can accumulate until a capacity limit pauses playback.

## Add percussion

The instrument picker includes **High bongo (`bongo-high`), Low bongo (`bongo-low`), Kick (`kick`), Snare (`snare`), and Hi-hat (`hi-hat`)** alongside the five melodic instruments. The hi-hat is closed. Every spark arrival plays one recorded hit at its natural pitch and lets its tail finish; repeated arrivals can overlap. Two takes alternate for each percussion sound. Level controls loudness. Key, scale, degree, octave and note length do not retune, stretch or shorten these one-shots. Saved percussion pieces still use `kind: "note"` and retain valid degree/octave/timbre/duration metadata for file compatibility.

All percussion heads face outward from the planet, with eyes on the outward face. The left-panel portraits retain their upright presentation; portable models use the planet orientation.

## Make a chord

Split a spark into branches and put different pitches the **same number of hops from the split**. They sound together despite different physical distances. In default C major, try C, E and G in one octave: the first, third and fifth scale degrees.

In **Switch Fork**, one instrument answers on step one; two answer together on step two. An extra empty junction delays a branch by one step. Enable return exits deliberately: revisits play again. Simultaneous sparks remain separate voices, so identical notes can get louder.

## Keep several generators aligned

Generators share transport beat zero and the same grid. Intervals of 1, 2 and 4 beats give regular layers. Intervals of 3 and 4 beats realign every 12 beats when start offsets match. Added or enabled generators join their next eligible future boundary.

Three-hop and four-hop **circuits** launched together return together every 12 steps, or 3 beats. Circuit length and generator interval are independent. Use empty junctions for spaces, revisits for repeated notes, and equal-hop branches for chords.

Tempo edits affect all active circuits and future emissions together at the next whole beat. Note length controls melodic sustain in seconds, independently of spacing; percussion uses its natural one-shot decay. Key, scale and chosen pitches determine melodic harmony; a common rhythm alone does not guarantee consonance.

## Contract for agents

- Use `version: 2`, `settings.propagation: "gated"`, adjacent vertex IDs and directed `wiring`. Gates belong to junctions independently of pieces.
- `HOP_BEATS = 0.25` in `src/core/gated.ts` is authoritative. `Engine` supplies anchored beat-to-time deadlines. Geometry, interval and travel budget must never determine gated delays; `GatedEdge.speed` is a display diagnostic.
- Generator `period` is in beats; saved `phase` is a fraction of that period. Its effective offset is `round(phase * period / 0.25) * 0.25`, wrapped modulo `period`; halfway values round upward. Preserve the saved metadata. Phase zero aligns downbeats; other offsets stay on the shared grid.
- Commit one edge ahead. Whole-beat tempo changes align with hop boundaries. Rendering consumes audio timestamps. Never separately snap sounds or deduplicate simultaneous arrivals.
- Keep this guide, [Rules.md](Rules.md), the [design brief](Game-Design-Brief.md) and [spark-gates plan](Spark-Gates-Work-Package.md) consistent. Regenerate [Agent-Guide.md](Agent-Guide.md) with `npm run docs:agents` whenever behavior, instruments, settings or looks change; its generator also supplies the app's prompt and FAQ. Run the musical-grid and spark-gates tests, including browser checks, after timing changes.
