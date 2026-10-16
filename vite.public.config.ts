import { defineConfig } from 'vite';
import { cpSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
const replacements = new Map([
  ['src/catalog.ts', 'src/public/catalog.ts'],
  ['src/marioPlayhead.ts', 'src/public/playhead.ts'],
  ['assets/library/library.json', 'src/public/library.json'],
  ['assets/library/library-provenance.json', 'src/public/library-provenance.json'],
  ['asset-packs/mario-paint/manifest.json', 'src/public/nativeManifest.json'],
  ['foundation/src/asset-packs/mario-paint/audio.ts', 'src/public/nativeAudio.ts'],
].map(([from, to]) => [resolve(from), resolve(to)]));
export default defineConfig({
  base: '/', publicDir: 'public',
  build: { outDir: 'dist-public', sourcemap: false, assetsInlineLimit: 0 },
  plugins: [{ name: 'public-asset-boundary', enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !source.startsWith('.')) return;
      const target = resolve(dirname(importer.split('?')[0]), source.split('?')[0]);
      return replacements.get(extname(target) ? target : `${target}.ts`);
    },
    generateBundle() {
      for (const id of this.getModuleIds()) {
        if (/\/src\/assets\/mario-paint|\/asset-packs\/mario-paint\//.test(id))
          throw Error(`Local-only asset module entered the public build: ${id}`);
      }
    },
    closeBundle() { cpSync('docs/licenses', 'dist-public/licenses', { recursive: true }); },
  }],
  preview: { host: '127.0.0.1', port: 5717, strictPort: true },
});
