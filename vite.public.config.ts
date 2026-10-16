import { defineConfig } from 'vite';
import { cpSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const marioManifest = JSON.parse(readFileSync('asset-packs/mario-paint/manifest.json', 'utf8'));
const marioFiles: string[] = ['manifest.json', ...marioManifest.instruments.flatMap((instrument: { sprite: string; model: string; notes: { wav: string }[] }) =>
  [instrument.sprite, instrument.model, ...instrument.notes.map(note => note.wav)])];
const playhead = JSON.parse(readFileSync('src/assets/mario-paint-playhead.json', 'utf8'));
const playheadModules = new Set(['src/assets/mario-paint-playhead.json',
  ...playhead.frames.map((frame: { file: string }) => `src/assets/${frame.file}`)].map(file => resolve(file)));
export default defineConfig({
  base: '/', publicDir: 'public',
  build: { outDir: 'dist-public', sourcemap: false, assetsInlineLimit: 0 },
  plugins: [{ name: 'public-asset-boundary', enforce: 'pre',
    generateBundle() {
      for (const id of this.getModuleIds()) {
        if ((/\/src\/assets\/mario-paint/.test(id) && !playheadModules.has(id.split('?')[0])) || (id.startsWith(`${resolve('asset-packs/mario-paint')}/`) && id !== resolve('asset-packs/mario-paint/manifest.json')))
          throw Error(`Local-only asset module entered the public build: ${id}`);
      }
    },
    closeBundle() {
      cpSync('docs/licenses', 'dist-public/licenses', { recursive: true });
      // Publish only the original instruments' runtime assets, never the whole local pack.
      for (const file of marioFiles) {
        const source = resolve('asset-packs/mario-paint', file), destination = resolve('dist-public/asset-packs/mario-paint', file);
        if (!source.startsWith(`${resolve('asset-packs/mario-paint')}/`) || !destination.startsWith(`${resolve('dist-public/asset-packs/mario-paint')}/`)) throw Error('Invalid Mario runtime asset path.');
        mkdirSync(dirname(destination), { recursive: true });
        cpSync(source, destination);
      }
    },
  }],
  preview: { host: '127.0.0.1', port: 5717, strictPort: true },
});
