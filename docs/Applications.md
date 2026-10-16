# Bongo Planet and Bongo Philharmonic

**Independent projects · 16 October 2026**

The user superseded the earlier shared-repository and shared-website plan. Bongo Planet and Bongo Philharmonic have separate project folders, separate local Git repositories, dependencies, builds, tests, state, releases and future websites.

| Project | Folder | Local URL |
| --- | --- | --- |
| Bongo Planet | `/Users/jeremyguillory/Documents/ChatGPT/ripple` | http://127.0.0.1:5417/BongoPlanet/ |
| Bongo Philharmonic | `/Users/jeremyguillory/Documents/ChatGPT/bongo-philharmonic` | http://127.0.0.1:5417/BongoPlanet/composer/ |

Every source and asset needed by Philharmonic is an owned copy in its repository. `foundation/` is its own baseline of copied rendering/geometry/audio helpers, with source hashes in [Separation-Provenance.json](Separation-Provenance.json). It is not a linked dependency. There are no workspaces, submodules, symlinked assets or sibling-folder imports. Bongo Planet retains its original Git history and public Site; Philharmonic has its own local development history and an independently published public Site. Its publishing checkout owns a separate Site source history.

Each project keeps a compatible copy of [Instrument-Asset-Spec.md](Instrument-Asset-Spec.md) and its delivery template. Copy assets deliberately between projects, preserving identity, mounting coordinates, tuning, versions, provenance and rights. Each project decides its catalog and qualifies its integration. Copying changes is an explicit operation, never an automatic shared update. No third shared project is required.

Philharmonic retains `bongo-planet-philharmonic-v1` and legacy Composer migration keys to preserve existing files and drafts. Branding is Bongo Philharmonic. Original-game music files and Philharmonic scores remain distinct. Browser-origin relocation requires the legacy local redirect handoff or explicit file export/import; original-game records must never be transferred.

The former combined source layout and same-domain `/philharmonic/` hosting plan are superseded. The historical Composer URL is a compatibility address only after a new permanent address is selected. No Site creation, public GitHub repository, publishing checkout, audience or deployment was changed.
