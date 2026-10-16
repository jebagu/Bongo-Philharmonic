import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw Error(`Project files must be owned copies: ${file}`);
    return entry.isDirectory() ? files(file) : [file];
  });
}
it('owns every relative source dependency inside this independent project', () => {
  const unresolved: string[] = [];
  for (const file of [...files(resolve(root, 'src')), ...files(resolve(root, 'foundation'))]) {
    if (!file.endsWith('.ts')) continue;
    const source = readFileSync(file, 'utf8');
    const patterns = [
      /\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g,
      /\bimport\s*\(\s*['"]([^'"]+)['"]/g,
    ];
    for (const pattern of patterns) for (const [, specifier] of source.matchAll(pattern)) {
      if (!specifier.startsWith('.')) continue;
      const target = resolve(dirname(file), specifier.split('?')[0]);
      const actual = [target, `${target}.ts`, `${target}.json`, resolve(target, 'index.ts')]
        .find(candidate => existsSync(candidate) && lstatSync(candidate).isFile());
      if (!actual || relative(root, realpathSync(actual)).startsWith('..'))
        unresolved.push(`${relative(root, file)} → ${specifier}`);
    }
  }
  expect(unresolved).toEqual([]);
});
it('has no workspace, linked package, submodule or original-game engine dependency', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  expect(manifest.workspaces).toBeUndefined();
  expect(existsSync(resolve(root, '.gitmodules'))).toBe(false);
  for (const value of Object.values({ ...manifest.dependencies, ...manifest.devDependencies }))
    expect(String(value)).not.toMatch(/^(?:file:|link:|workspace:)/);
  expect(files(resolve(root, 'foundation')).some(file => /\/(?:engine|gated|processor|liveConnection|aiControl)\.ts$/.test(file))).toBe(false);
});
