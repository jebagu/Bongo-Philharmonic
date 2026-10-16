# Bongo Philharmonic public Site

Authorized by the user on 16 October 2026 as a separate **public** ChatGPT Site.

- Site ID: `appgprj_6ad23b8ada4081918bf45b0ad02007c9`.
- Public URL: https://bongo-philharmonic.jebagu.chatgpt.site — deployment succeeded on 16 October 2026.
- Publishing checkout: `sites/bongo-philharmonic/`; preserve `.openai/hosting.json` and its own source history. The development repository remains local and independent.
- `npm run build:public` creates and audits `dist-public/`. It has ten Bongo portraits, fifteen Bongo recordings, independently copied toy geometry/themes, a Bongo playhead, and 22 Bongo library arrangements.
- The public module-resolution boundary excludes native manifests, sprites, audio, models, demos and playhead material. Local builds retain the original native pack and its own motion. Public imports of a local-only sound set fail before replacing the current composition.
- `npm run prepare:site` copies only the audited public payload. Never copy the entire local Git tree or `dist/` to this Site.
- Checks: 94 unit tests, public build/payload audit and 3 Chrome public-browser tests passed, including loaded pictures, audio, chords/files, local-only import rejection and a 390px Performance view. Human listening, Safari and physical-device/venue qualification were not repeated.
- Existing Bongo Planet Sites, audiences, source checkouts and databases remain separate.

Use the Sites source helper with this checkout to push/package the exact source commit, then save and deploy that version. The audience is explicitly public by user request.

## First public deployment

- Audience: **public**, access-policy revision 2.
- Saved version: `appgprj_6ad23b8ada4081918bf45b0ad02007c9~appgver_65fdea959c74819196b83e7ab1da2da6`.
- Deployment: `appgdep_6ad23d97502c8191ac9846a9005fb9c0`, succeeded.
- Published Site source commit: `c593d3c0bf4c2b036a62e6862c3e88a5a0fa93b6`.
- Payload: 78 public files, 5,263,142 bytes; ten portraits and fifteen WAVs; no local-only native assets.
- Separate Codex project: `744ab29e-ed14-44d0-bf45-572f060f96e9`, default sidebar label `bongo-philharmonic`. Opened with the CLI bundled in the installed desktop app.

Anonymous hosted Chrome verification also passed all 3 public-browser tests against the actual deployed URL, including playback, files, loaded pictures and the 390px layout.
