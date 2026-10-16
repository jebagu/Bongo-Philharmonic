import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function ownedPath(directory, name) {
  assert.equal(typeof name, 'string', 'Resource paths must be strings.');
  assert(name && !isAbsolute(name), `Invalid resource path: ${name}`);
  const absolute = resolve(directory, name);
  const inside = relative(directory, absolute);
  assert(inside && inside !== '..' && !inside.startsWith('../'), `Escaping resource path: ${name}`);
  let current = directory;
  for (const part of inside.split('/')) {
    current = resolve(current, part);
    assert(!lstatSync(current).isSymbolicLink(), `Linked resource: ${name}`);
  }
  return absolute;
}

function inventory(directory, name, excluded) {
  const base = ownedPath(directory, name);
  return readdirSync(base, { withFileTypes: true }).flatMap(entry => {
    const child = `${name}/${entry.name}`;
    if (excluded.includes(entry.name)) return [];
    assert(!entry.isSymbolicLink(), `Linked resource: ${child}`);
    return entry.isDirectory() ? inventory(directory, child, excluded) : [child];
  }).sort();
}

function verify(directory) {
  directory = realpathSync(directory);
  const current = JSON.parse(readFileSync(ownedPath(directory, 'docs/resource-versions/current.json')));
  assert.match(current.version, /^\d+\.\d+\.\d+$/);
  const lockPath = `docs/resource-versions/${current.version}.json`;
  const lockBytes = readFileSync(ownedPath(directory, lockPath));
  assert.equal(sha256(lockBytes), current.manifestSha256, 'Changed version record.');
  const lock = JSON.parse(lockBytes);
  assert.equal(lock.format, 'bongo-independent-resource-baseline');
  assert.equal(lock.schemaVersion, 1);
  assert.equal(lock.version, current.version);
  const project = JSON.parse(readFileSync(ownedPath(directory, 'package.json'))).name;
  assert(lock.projects.includes(project), `Unknown project: ${project}`);
  const counts = { files: 0, bytes: 0 };
  const ids = new Set();
  for (const resource of lock.resources) {
    assert(!ids.has(resource.id), `Duplicate resource: ${resource.id}`);
    ids.add(resource.id);
    assert.match(resource.version, /^\d+\.\d+\.\d+$/);
    const paths = new Set();
    const canonical = [];
    for (const file of resource.files) {
      const name = file.paths[project];
      assert(!paths.has(name), `Duplicate resource file: ${name}`);
      paths.add(name);
      const bytes = readFileSync(ownedPath(directory, name));
      assert.equal(bytes.length, file.bytes, `Changed size: ${name}`);
      assert.equal(sha256(bytes), file.sha256, `Changed content: ${name}`);
      canonical.push({ path: file.id, bytes: file.bytes, sha256: file.sha256 });
      counts.files++;
      counts.bytes += bytes.length;
    }
    assert.equal(resource.contentSha256, sha256(JSON.stringify(canonical)), `Changed resource inventory: ${resource.id}`);
    for (const tree of resource.trees ?? []) {
      const prefix = tree.paths[project];
      const actual = inventory(directory, prefix, tree.excludeNames ?? []);
      const expected = [...paths].filter(name => name.startsWith(`${prefix}/`)).sort();
      assert.deepEqual(actual, expected, `Added or missing unversioned files: ${prefix}`);
    }
  }
  assert.equal(lock.contentSha256, sha256(JSON.stringify(lock.resources.map(({ id, version, contentSha256 }) => ({ id, version, contentSha256 })))), 'Changed baseline fingerprint.');
  return { project, version: lock.version, contentSha256: lock.contentSha256, resources: lock.resources.length, ...counts, lockSha256: sha256(lockBytes) };
}

const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--peer'), 'Usage: node scripts/verify-resource-versions.mjs [--peer /absolute/project/path]');
const local = verify(root);
if (args.length) {
  assert(existsSync(args[1]), `Peer project not found: ${args[1]}`);
  const peer = verify(resolve(args[1]));
  assert.notEqual(local.project, peer.project, 'Peer must be the other project.');
  assert.equal(local.lockSha256, peer.lockSha256, 'The projects have different baseline records.');
  console.log(JSON.stringify({ verified: true, local, peer, identicalBaseline: true }, null, 2));
} else {
  console.log(JSON.stringify({ verified: true, ...local }, null, 2));
}
