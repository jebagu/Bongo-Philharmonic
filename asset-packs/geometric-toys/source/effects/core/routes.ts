import type { Generator } from './contracts';
import { angle, topology } from './geometry';

export type RoutePlan = { vertices: number[]; distances: number[]; length: number };
const cache = new Map<string, RoutePlan[]>();
export const seamDistance = (a: number, b: number) => Math.hypot(...topology.vertices[a].map((v, i) => v - topology.vertices[b][i]));

/** Routes depend on geometry and reach, never on the number or positions of instruments. */
export function generatorRoutes(source: number, reach: number): RoutePlan[] {
  const key = `${source}:${reach}`;
  const saved = cache.get(key);
  if (saved) return saved;
  const allowed = topology.vertices.map(p => angle(topology.vertices[source], p) <= reach * Math.PI / 180 + 1e-9);
  const costs = allowed.map(() => Infinity), parents = allowed.map(() => -1), done = allowed.map(() => false);
  costs[source] = 0;
  for (let n = 0; n < costs.length; n++) {
    let current = -1;
    for (let i = 0; i < costs.length; i++) if (allowed[i] && !done[i] && (current < 0 || costs[i] < costs[current] - 1e-12)) current = i;
    if (current < 0 || !Number.isFinite(costs[current])) break;
    done[current] = true;
    for (const neighbor of topology.neighbors[current]) if (allowed[neighbor] && !done[neighbor]) {
      const next = costs[current] + seamDistance(current, neighbor);
      if (next < costs[neighbor] - 1e-12) { costs[neighbor] = next; parents[neighbor] = current; }
    }
  }
  const children = allowed.map(() => [] as number[]);
  parents.forEach((parent, vertex) => { if (parent >= 0) children[parent].push(vertex); });
  const plans = children[source].map(first => {
    const vertices = [source];
    let lastNew = 0;
    // Walk each outgoing sector with one persistent particle. A junction changes
    // its direction rather than splitting it. Backtracking joins the next branch.
    function walk(vertex: number, previous: number) {
      vertices.push(vertex); lastNew = vertices.length - 1;
      const p = topology.vertices[vertex], incoming = p.map((v, i) => v - topology.vertices[previous][i]);
      const score = (next: number) => incoming.reduce((sum, v, i) => sum + v * (topology.vertices[next][i] - p[i]), 0) / seamDistance(vertex, next);
      const order = [...children[vertex]].sort((a, b) => score(b) - score(a) || a - b);
      for (const next of order) { walk(next, vertex); vertices.push(vertex); }
    }
    walk(first, source);
    vertices.splice(lastNew + 1); // End at the final new vertex; no empty return to the generator.
    const distances = [0];
    for (let i = 1; i < vertices.length; i++) distances.push(distances[i - 1] + seamDistance(vertices[i - 1], vertices[i]));
    return { vertices, distances, length: distances.at(-1)! };
  });
  if (cache.size >= 256) cache.delete(cache.keys().next().value!);
  cache.set(key, plans);
  return plans;
}

/** Authored song paths keep the same constant-speed, node-to-node journey. */
export function routesForGenerator(generator: Generator): RoutePlan[] {
  if (!generator.path) return generatorRoutes(generator.vertex, generator.reach);
  const vertices = [...generator.path], distances = [0];
  for (let i=1;i<vertices.length;i++) distances.push(distances[i-1]+seamDistance(vertices[i-1],vertices[i]));
  return [{vertices,distances,length:distances.at(-1)!}];
}
