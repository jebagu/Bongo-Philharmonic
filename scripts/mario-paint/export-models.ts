import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createMarioPaintModel, disposeMarioPaintModel } from '../../src/asset-packs/mario-paint/models';
import type { MarioPaintManifest } from '../../src/asset-packs/mario-paint/types';

class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) { void blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob: Blob) { void blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
}
Object.defineProperty(globalThis, 'FileReader', { value: NodeFileReader, configurable: true });
const root = new URL('../../asset-packs/mario-paint/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8')) as MarioPaintManifest;
const exporter = new GLTFExporter();
const models: { id: string; bytes: number; sha256: string; triangles: number }[] = [];
for (const instrument of manifest.instruments) {
  const sprite = JSON.parse(await readFile(new URL(instrument.voxelJson, root), 'utf8'));
  const model = createMarioPaintModel(sprite);
  const bytes = Buffer.from(await exporter.parseAsync(model, { binary: true }) as ArrayBuffer);
  await writeFile(new URL(instrument.model, root), bytes);
  const geometry = (model.children[0] as import('three').Mesh).geometry;
  models.push({ id: instrument.id, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), triangles: geometry.index!.count / 3 });
  disposeMarioPaintModel(model);
}
await mkdir(new URL('source/', root), { recursive: true });
for (const file of ['types.ts', 'models.ts', 'audio.ts', 'index.ts']) {
  await copyFile(new URL(`../../src/asset-packs/mario-paint/${file}`, import.meta.url), new URL(`source/${file}`, root));
}
await writeFile(new URL('models/validation.json', root), JSON.stringify({ models }, null, 2) + '\n');
console.log(`Exported ${models.length} GLBs (${models.reduce((sum, item) => sum + item.bytes, 0).toLocaleString()} bytes), with portable TypeScript adapters.`);
