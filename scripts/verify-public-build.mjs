import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve('dist-public');
const files = [];
const marioRoot = 'asset-packs/mario-paint/';
const manifest = JSON.parse(fs.readFileSync(`${marioRoot}manifest.json`, 'utf8'));
const playhead = JSON.parse(fs.readFileSync('src/assets/mario-paint-playhead.json', 'utf8'));
const marioFiles = new Set(['manifest.json', ...manifest.instruments.flatMap(instrument =>
  [instrument.sprite, instrument.model, ...instrument.notes.map(note => note.wav)])].map(file => `${marioRoot}${file}`));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw Error(`Linked public asset: ${file}`);
    if (entry.isDirectory()) walk(file);
    else {
      const name = path.relative(root, file), bytes = fs.readFileSync(file);
      const marioRuntime = marioFiles.has(name);
      const poseName = /^assets\/(mario-paint-(?:walk-a|walk-b|jump))-[\w-]+\.png$/.exec(name)?.[1];
      const pose = playhead.frames.find(frame => frame.file === `${poseName}.png`);
      if (/landmarks|\.map$|(?:^|\/)\.git|\.(?:sfc|smc|brr|vox)$/.test(name) || (/mario|asset-packs/i.test(name) && !marioRuntime && !pose && name !== 'licenses/Mario-Paint-Assets.md')) throw Error(`Local-only file in public payload: ${name}`);
      if (marioRuntime && hash(bytes) !== hash(fs.readFileSync(name))) throw Error(`Changed original Mario runtime asset: ${name}`);
      if (pose && (hash(bytes) !== pose.sha256 || hash(bytes) !== hash(fs.readFileSync(`src/assets/${pose.file}`)))) throw Error(`Changed original Mario playhead pose: ${name}`);
      if (/\.(?:js|html)$/.test(name) && /\/Users\/|\/BongoPlanet\//.test(bytes.toString())) throw Error(`Local source path in public payload: ${name}`);
      files.push({ path: name, bytes: bytes.length, sha256: hash(bytes) });
    }
  }
}
walk(root);
const instruments = ['guitar','glass','kalimba','piano','marimba','bongo-high','bongo-low','kick','snare','hi-hat'];
for (const id of instruments) {
  if (!files.some(file => file.path === `art/geometric-toys/${id}-portrait.png`)) throw Error(`Missing portrait: ${id}`);
}
for (const required of marioFiles) {
  if (!files.some(file => file.path === required)) throw Error(`Missing original Mario runtime asset: ${required}`);
}
for (const frame of playhead.frames) {
  if (files.filter(file => file.path.startsWith(`assets/${frame.file.slice(0, -4)}-`) && file.sha256 === frame.sha256).length !== 1) throw Error(`Missing original Mario playhead pose: ${frame.file}`);
}
if (manifest.instruments.length !== 15 || manifest.instruments.some(instrument => instrument.notes.length !== 13)) throw Error('Expected all fifteen original Mario instruments and their thirteen staff positions.');
if (files.filter(file => file.path.endsWith('.wav')).length !== 210) throw Error('Expected fifteen Bongo recordings and 195 prepared Mario notes.');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!html.includes('<title>Bongo Philharmonic</title>')) throw Error('Incorrect public title.');
for (const [, name] of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
  if (!fs.existsSync(path.join(root, name.slice(1)))) throw Error(`Missing HTML asset: ${name}`);
}
fs.mkdirSync('evidence', { recursive: true });
const receipt = { name: 'Bongo Philharmonic', profile: 'public-bongo-and-mario', files, bytes: files.reduce((sum, item) => sum + item.bytes, 0) };
fs.writeFileSync('evidence/public-release.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ verified: true, files: files.length, bytes: receipt.bytes, portraits: 25, samples: 210, marioRuntimeAssets: marioFiles.size, marioPlayheadPoses: playhead.frames.length }));
