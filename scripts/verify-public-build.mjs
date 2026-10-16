import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve('dist-public');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw Error(`Linked public asset: ${file}`);
    if (entry.isDirectory()) walk(file);
    else {
      const name = path.relative(root, file), bytes = fs.readFileSync(file);
      if (/mario|asset-packs|landmarks|\.map$|(?:^|\/)\.git/.test(name)) throw Error(`Local-only file in public payload: ${name}`);
      if (/\.(?:js|html)$/.test(name) && /\/Users\/|\/BongoPlanet\//.test(bytes.toString())) throw Error(`Local source path in public payload: ${name}`);
      files.push({ path: name, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    }
  }
}
walk(root);
const instruments = ['guitar','glass','kalimba','piano','marimba','bongo-high','bongo-low','kick','snare','hi-hat'];
for (const id of instruments) {
  if (!files.some(file => file.path === `art/geometric-toys/${id}-portrait.png`)) throw Error(`Missing portrait: ${id}`);
}
if (files.filter(file => file.path.endsWith('.wav')).length !== 15) throw Error('Expected exactly fifteen public Bongo sample recordings.');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!html.includes('<title>Bongo Philharmonic</title>')) throw Error('Incorrect public title.');
for (const [, name] of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
  if (!fs.existsSync(path.join(root, name.slice(1)))) throw Error(`Missing HTML asset: ${name}`);
}
fs.mkdirSync('evidence', { recursive: true });
const receipt = { name: 'Bongo Philharmonic', profile: 'public-bongo-only', files, bytes: files.reduce((sum, item) => sum + item.bytes, 0) };
fs.writeFileSync('evidence/public-release.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ verified: true, files: files.length, bytes: receipt.bytes, portraits: 10, samples: 15, nativeAssets: 0 }));
