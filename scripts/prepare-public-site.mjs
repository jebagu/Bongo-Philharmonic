import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkout = resolve(root, 'sites/bongo-philharmonic');
const manifestPath = resolve(checkout, '.openai/hosting.json');
if (!existsSync(manifestPath)) throw Error('Register/open the existing Philharmonic Site first.');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest.project_id !== 'appgprj_6ad23b8ada4081918bf45b0ad02007c9') throw Error('Unexpected Philharmonic Site identity.');
const receipt = JSON.parse(readFileSync(resolve(root, 'evidence/public-release.json'), 'utf8'));
const built = resolve(root, 'dist-public');
if (receipt.profile !== 'public-bongo-only' || !existsSync(resolve(built, 'index.html'))) throw Error('Build and verify the public release first.');
const output = resolve(checkout, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
// Only files in the checked public payload can enter the Site source checkout.
for (const file of receipt.files) {
  const source = resolve(built, file.path), destination = resolve(output, file.path);
  if (!source.startsWith(`${built}/`) || !destination.startsWith(`${output}/`)) throw Error('Invalid public file path.');
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination);
}
manifest.static = { directory: 'dist' };
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(resolve(checkout, 'README.md'), '# Bongo Philharmonic\n\nPublic static release of the independent band-and-score application.\n\nThis publishing checkout contains the verified Bongo-only runtime. The development repository, local-only native pack, source captures, browser saves and test fixtures are excluded.\n');
writeFileSync(resolve(checkout, 'public-release.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ checkout, project_id: manifest.project_id, files: receipt.files.length, bytes: receipt.bytes }));
