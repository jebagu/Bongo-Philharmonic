import { defineConfig } from 'vite';
import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/BongoPlanet/composer/',
  publicDir: 'public',
  build: { outDir: 'dist' },
  plugins: [{ name: 'owned-local-assets', closeBundle() {
    for (const [from, to] of [
      ['asset-packs/mario-paint/sprites', 'asset-packs/mario-paint/sprites'],
      ['asset-packs/mario-paint/models', 'asset-packs/mario-paint/models'],
      ['asset-packs/mario-paint/voxels', 'asset-packs/mario-paint/voxels'],
      ['asset-packs/mario-paint/audio/notes', 'asset-packs/mario-paint/audio/notes'],
      ['asset-packs/mario-paint/manifest.json', 'asset-packs/mario-paint/manifest.json'],
      ['assets/landmarks', 'assets/landmarks'],
    ]) {
      const destination = resolve('dist', to);
      mkdirSync(resolve(destination, '..'), { recursive: true });
      cpSync(from, destination, { recursive: true });
    }
  }}],
  server: { host: '127.0.0.1', port: 5417, strictPort: true },
  preview: { host: '127.0.0.1', port: 5417, strictPort: true },
});
