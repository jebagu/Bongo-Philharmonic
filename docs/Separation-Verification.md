# Bongo Philharmonic separation verification

16 October 2026. Independent project prepared from the current working tree.

- Own dependencies installed with `npm ci` from its own lockfile.
- `npm test`: 7 files, 94 tests passed, including standalone import/ownership boundaries.
- `npm run build`: TypeScript and production bundle passed.
- Browser verification uses an isolated staging server at `http://127.0.0.1:5617/BongoPlanet/composer/`; this is a test override, not a new permanent address. All **14 Chrome browser tests passed**, including library loading, sixteen native performers, editing/undo, import/export/recovery, playback controls and the 390px layout.
- The existing permanent Composer address remains in configuration pending the user’s local-URL choice. The original application still occupies port 5417. Independent simultaneous development requires the pending port decision.
- No shared node_modules, source symlinks, workspace packages, Git submodules, external relative imports or original spark engine. All required source/assets are owned copies.
- The copied v1 instrument specification and delivery manifest define compatibility; asset acceptance and application saves remain separate.
- This build has not been deployed. Human listening, Safari, physical-device and venue qualification have not been repeated. Five landmark downloads remain pending as before.
- Adding the separate folder as a Codex sidebar project requires the app’s Add project control. The available project tools do not expose that action, and computer control of Codex is prohibited.

The original source has not yet been removed from Bongo Planet: final cutover is pending the permanent-URL choice so the established Composer address and existing browser saves are not broken.
