# Bongo Planet — geometric toys asset package

Geometric Toys is the single Bongo Planet visual style. Rounded geometric characters have eyes and no feet or wind-up hardware. The faceted planet has one painted seam per shared triangular edge, with a persistent glowing spark playing instruments as it passes.

Read the included [creation guide](Creation-Guide.md) for chords, the shared musical grid and rhythmic alignment. Current gated scenes use one sixteenth note per adjacent crossing: 125 ms at 120 BPM, regardless of strut length. All generators and active circuits share the same tempo; the copied core sources implement this contract. The legacy constant-speed examples below retain their version-one timing until converted to gates.

## Use in the game

Open http://127.0.0.1:5417/BongoPlanet/. Edit look offers 12 color swatches for the planet and each instrument, four gradient skies, a star field, eyes, happy bounce, friend size, sunshine and spark glow. Changes save separately from the composition. Save look and Load look move appearance JSON between browsers. Reset look restores defaults. Older Original/curved/legacy presets migrate to the single toy appearance.

The palette contains Generator, Guitar, Glass, Kalimba, Piano, Marimba, High bongo, Low bongo, Kick, Snare and closed Hi-hat. Play, Volume and Tempo sit directly below the palette. Generators expose Spark interval and Spark travel; the route indicator identifies automatic branches or a saved song path. All controls live in the left panel. Your planet groups the pattern picker, Edit look, Undo/Redo and Save/Load/Import. The melodic instruments use the five Harmony Bloom recordings; percussion uses ten prepared CC0 recordings, alternating two takes per voice at natural pitch. The art download contains meshes and portraits, not the audio recordings.

Toy Ensemble demonstrates all five instruments. Twinkle Trail, Little Lamb, Row Your Boat and Morning Bells play short familiar song phrases. Song generators follow one connected seam path; every note is an editable character. Moving a song generator or choosing Use automatic routes returns it to automatic routing. The examples keep note order with constant-speed geometric timing, rather than reproducing a conventional score's exact rhythm.

## Files

- generator.glb, guitar.glb, glass.glb, kalimba.glb, piano.glb, marimba.glb, bongo-high.glb, bongo-low.glb, kick.glb, snare.glb, hi-hat.glb and planet.glb: portable editable meshes without external textures or Blender dependencies.
- Eleven *-portrait.png files: portraits rendered from the actual character meshes. Live portraits regenerate when character colors or eyes change.
- theme.json: initial editable appearance defaults.
- showcase.json: Toy Ensemble composition.
- examples/F11.json through F14.json: four portable legacy song scenes; F15/F16/F17: current chain, fork/chord and Infinite gate examples.
- Creation-Guide.md: human and agent composition guide and current musical timing contract.
- Agent-Guide.md, Rules.md, Game-Design-Brief.md and Spark-Gates-Work-Package.md: companion agent/file-format guide, project rules and design references.
- source/toys.ts, appearance.ts, swatches.ts, toy-style.css and panel.css: editable art, sky and UI definitions.
- source/effects: route geometry, particle timing and core sources.
- manifest.json: byte counts and SHA-256 checksums.

Earlier generic note/beat meshes and three raster reference illustrations remain in the archive as historical assets. They do not add sound choices to the live palette. The illustrations were made with Image Gen; current portraits use the editable Three.js meshes.

## Edit and rebuild

Edit assets/geometric-toys/theme.json for defaults, src/view/art/toys.ts for proportions, and src/view/art/swatches.ts for colors/skies. Existing saved looks take precedence until Reset look. Run npx tsx scripts/song-examples.ts for song scenes and npx tsx scripts/export-toy-assets.ts for GLBs, sources, theme, examples, manifest and ZIP. Vite copies the package into the build.

Legacy version-one automatic routes depend on generator geometry/reach, not instrument destinations. Every legacy route in an emission shares a constant speed. Current version-two gates instead use equal musical hop duration and varying visual speed. Moving or adding an instrument changes future encounters without redirecting the spark. Deleting a generator stops its journeys. At most 128 sparks are drawn with shared instanced geometry; active journey/edge state is capped at 256 and pending sounds at 5,376. Reduced motion suppresses travel/bounce while retaining local onset feedback. Companion packets retain optional instrument identity. No third-party character artwork or Blender MCP is used.

Selected characters have saved friendly labels (Guitar 1, Marimba 2, Generator 1). The selected-piece editor uses a two-column control grid, shows the generator's routing behavior, and contains the one trash button used for both clicking and dropping. No top-right action or bottom toolbar remains. On narrow screens the same panel scrolls above the globe, with no pinned bottom controls.
