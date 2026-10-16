# Resource versions

Bongo Planet and Bongo Philharmonic share a recorded **1.0.0 resource baseline**, established on 16 October 2026. The applications own independent copies. Nothing synchronizes automatically, and neither application needs the other folder to build or run.

The identical [version record](resource-versions/1.0.0.json) identifies 11 resource groups and 497 file mappings. Every group has its own version and content fingerprint; every file has a byte count, SHA-256 and a path in each project. [current.json](resource-versions/current.json) identifies the active record and its checksum. These resource versions are separate from native manifest/schema versions, application releases and save formats.

| Resource group | Version | Philharmonic location |
| --- | --- | --- |
| Bongo sounds and portraits | 1.0.0 | `public/audio/`, ten portraits in `public/art/geometric-toys/` |
| Bongo exported models and complete download bundle | 1.0.0 | `asset-packs/geometric-toys/` |
| Procedural models, rendering, themes and sample helpers | 1.0.0 | `foundation/` |
| First original Mario Paint instrument pack and archive | 1.0.0 | `asset-packs/mario-paint/` |
| Mario extractor, DSP source/notices, export, packaging and viewer | 1.0.0 | `scripts/mario-paint/`, `src/asset-packs/mario-paint/` |
| Pop Icons, Neon Cinema and Electro Club: 48 auditions | 1.0.0 | `instrument-candidates/` |
| Sound-set design mockup | 1.0.0 | `sound-set-mockup/` |
| Twelve landmark references | 1.0.0 | `mario-landmarks/` |
| Five inactive landmark selections | 1.0.0 | `asset-packs/mario-landmarks/` |
| Source score library and Favorites inventories | 1.0.0 | `assets/library/`, `foundation/assets/` |
| Instrument delivery specification and template | 1.0.0 | `docs/Instrument-Asset-Spec.md`, `docs/templates/instrument-set/` |

The Bongo export bundle retains its original examples and source snapshots as reference material, outside the application module graph. Its documentation describes Planet's original export workflow. The current procedural sources used by Philharmonic are independently owned in `foundation/`. Mario rebuilding uses the copied tools and a separately supplied compatible ROM; no ROM was transferred or extractor run. Both existing ZIP archives were copied, not regenerated.

The landmark collection contains selection, source, creator, license and download-status records only. Its five originals remain `pending-authentication`; there are no downloaded models. The collection remains inactive and outside all application builds. Copying the references does not activate markers or the experimental sound banks.

## Verify either copy

From either project folder:

```sh
npm run resources:verify
```

To compare both independent projects explicitly:

```sh
# From Bongo Philharmonic:
node scripts/verify-resource-versions.mjs --peer ../ripple

# From Bongo Planet:
node scripts/verify-resource-versions.mjs --peer ../bongo-philharmonic
```

The check reads only: it verifies every declared file, detects additions/removals in complete resource directories, rejects symlinks and escaping paths, checks group/baseline fingerprints and compares the exact version records when a peer is supplied. The peer check never copies or rewrites files. A local-only verification never accesses the sibling project.

## Local previews

These use each project's existing server and base path; no permanent address or port changed. The existing port-5417 ownership/cutover question remains separate, so the two independent dev servers cannot bind that port simultaneously.

| Preview | Bongo Planet | Bongo Philharmonic |
| --- | --- | --- |
| Mario asset browser | http://127.0.0.1:5417/BongoPlanet/asset-packs/mario-paint/ | http://127.0.0.1:5417/BongoPlanet/composer/asset-packs/mario-paint/ |
| 48 sound auditions | http://127.0.0.1:5417/BongoPlanet/instrument-candidates/ | http://127.0.0.1:5417/BongoPlanet/composer/instrument-candidates/ |
| Sound-set mockup | http://127.0.0.1:5417/BongoPlanet/sound-set-mockup/ | http://127.0.0.1:5417/BongoPlanet/composer/sound-set-mockup/ |
| Landmark gallery | http://127.0.0.1:5417/BongoPlanet/mario-landmarks/ | http://127.0.0.1:5417/BongoPlanet/composer/mario-landmarks/ |

The mockup's `project-resources.ts` contains only project-owned import and asset-path wiring. Its shared preview source is identical; each wiring file points to its own project's helpers. Project-specific `AGENTS.md` instructions and this wiring are intentionally outside the shared resource fingerprints. Shortlists use separate `bongo-planet-…` and `bongo-philharmonic-…` browser keys even when both applications use the same local origin. Neither preview accesses application saves. Copied historical screenshots and validation reports retain their original dates; they do not claim new browser or listening acceptance. The audition verifier accepts `BONGO_RESOURCE_BASE_URL` for an explicit test URL.

These are local support pages, outside production build inputs. Bongo export extras stay outside Philharmonic's `public/`; the existing public build/payload allowlist remains the publishing authority. No support resource was deployed or added to a public publishing checkout. Existing provenance and rights records continue to apply.

## Updating resources

Keep each released version record immutable. Edit and qualify one project's own resource copy, then explicitly transfer the approved files to the other project. Preserve the stable IDs, rights and source provenance. Record a new version and new checksums for every changed group, create a new baseline record under `docs/resource-versions/`, and update `current.json` in each project only after its contents match that baseline. Unchanged groups retain their versions.

Use a patch version for corrections that preserve the asset contract, a minor version for compatible additions, and a major version for changes to identity, axes/mounting, pitch mapping or other incompatible playback/delivery behavior. Verify locally and with `--peer` before saying the projects match. Until the second project adopts a new release, report the two versions separately. Do not change native manifest/schema versions or save IDs merely to match these resource versions.
