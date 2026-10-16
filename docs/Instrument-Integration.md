# Bongo Philharmonic instrument integration

The local [v1 instrument specification](Instrument-Asset-Spec.md) is compatible with Bongo Planet's copy. Asset files are independently owned here.

| Local code | Responsibility |
| --- | --- |
| `src/catalog.ts`, `src/model.ts` | Set/type registration, performers, notes and score validation |
| `src/audio.ts`, `src/audio-score.ts` | Score playback, sample mapping and voice budgets |
| `foundation/src/audio/samples.ts` | Independently copied Bongo sample loader |
| `foundation/src/view/art/toys.ts` | Independently copied procedural toy geometry |
| `foundation/src/asset-packs/mario-paint/` | Local native-note adapter |
| `asset-packs/mario-paint/` | Local-only original sprites, voxels, models, samples and provenance |

Run `npm run build`, `npm test` and relevant `npm run test:web` checks for an integration. No arbitrary-pack importer is implemented. Models/audio/icons remain independently subject to their recorded rights. No publication is authorized by the repository separation.
