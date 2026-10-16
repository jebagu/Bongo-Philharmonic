# Sound-set concept

Open **http://127.0.0.1:5417/BongoPlanet/sound-set-mockup/** with the root Vite development server (`npm run dev`).

The Sound set menu selects the placement palette, rather than replacing the sounds of an existing composition. This makes mixed Bongo Planet / Mario Paint arrangements understandable: each placed piece retains its own character and sound, and the Generator is available in both sets.

Try switching palettes, clicking a character to audition its real sample, clicking a sphere junction to place it, and using Play preview to hear the simple sequence. Drag the planet to orbit. Edits live in memory and reset on reload. This is a design mockup, not an integration into the production composition format or routing engine. Its one-piece-per-dot demo is not a proposed change to the original game's chord-stack rules.

The entry uses original game meshes and the approved original Mario Paint GLBs, sprites and prepared notes. It does not access browser saves. No root build inputs or publishing files were changed.

Verified on 16 October 2026: standalone TypeScript check; browser switching between 10 and 15 palette entries; decoded audio preview starting and stopping; instrument selection; successful new Yoshi placement; images loaded; no browser error logs; desktop at 1440 × 1000; compact layout at 390 × 844 without horizontal overflow. `preview-desktop.jpg` is the captured desktop view.
