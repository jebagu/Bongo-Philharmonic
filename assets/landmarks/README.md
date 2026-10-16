# Mario pole landmarks

The user selected gallery entries **02, 08, 10, 11 and 12** on 16 October 2026, then clarified that **the existing North Pole and all five selected landmarks form one six-option startup pool in Bongo Philharmonic**. Each has equal probability. Choose once at startup, independently of the sound pack, and retain that choice across sound-pack, composition, view and theme changes. No marker selection is saved in a score. The separate original Bongo Planet application remains outside this local Philharmonic change.

Runtime files belong here and the independent build copies them under `assets/landmarks/`. Keep creator attribution and source licenses with the files. No public redistribution is authorized.

Expected files:

| Gallery | Model | Runtime file |
| --- | --- | --- |
| 02 | Checkpoint flag — kingston.shamily; credits Nintendo and SAB64 | `02-checkpoint-flag.glb` |
| 08 | Super Star — Yanez Designs | `08-super-star.glb` |
| 10 | Super Mushroom — Ludus101 | `10-super-mushroom.glb` |
| 11 | Question Block — Yanez Designs | `11-question-block.glb` |
| 12 | Warp pipe — Unlostly | `12-warp-pipe.glb` |

Acquisition status: **pending Sketchfab sign-in**. Both official download endpoints returned HTTP 401, and the site's Download control opened a login prompt. No original model archives have yet been downloaded. Do not describe the models as integrated or visually qualified while these files are missing.

`src/landmark.ts` contains the prepared selector and loader: measured model bounds, uniform scaling and bottom-center mounting fit individual width/height/depth limits. Its fallback retains the original marker until the selected file has loaded successfully. **The component is not yet wired into `sphere.ts`**, to avoid requesting missing files in the working application. Wire it after acquiring and checking all five files.

Preparation checks for the latest clarification are recorded by `tests/landmark.test.ts`: the six-option pool, equal choice intervals, the original marker requiring no download, immediate selection without sound-set input, proportional bounds, failed loads and disposal during an outstanding load. These checks do not verify the missing original assets or their appearance in the application.
