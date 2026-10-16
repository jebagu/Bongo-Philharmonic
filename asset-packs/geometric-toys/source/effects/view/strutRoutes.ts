import type { Vec3 } from '../core/contracts';
import { angle, topology } from '../core/geometry';
import { surfaceArc } from './math';

export const STRUT_RADIUS = 1.002;
export const STRUT_SEGMENTS = 8;
export const SEAM_RADIUS = 0.99;
export type Surface = 'seams' | 'curved';
type Edge = readonly [number, number];
export type StrutRoute = { points: Vec3[]; edges: Edge[]; distances: number[]; length: number; surface: Surface };
const cache = new Map<string, StrutRoute>();
const distance = (a: Vec3, b: Vec3) => Math.hypot(...a.map((v, i) => v - b[i]));

/** The same sampled chords used by the stationary strut mesh, in render coordinates. */
export function strutPoints(a: number, b: number, surface: Surface = 'curved'): Vec3[] {
  if (surface === 'seams') return [a, b].map(vertex => surfaceArc(topology.vertices[vertex], topology.vertices[vertex], 1, SEAM_RADIUS)[0]);
  const points = surfaceArc(topology.vertices[Math.min(a, b)], topology.vertices[Math.max(a, b)], STRUT_SEGMENTS, STRUT_RADIUS);
  return a < b ? points : points.reverse();
}

export function shortestStrutPath(source: number, target: number): number[] {
  const costs = topology.vertices.map(() => Infinity), previous = costs.map(() => -1), visited = costs.map(() => false);
  costs[source] = 0;
  for (let n = 0; n < costs.length; n++) {
    let current = -1;
    for (let i = 0; i < costs.length; i++) if (!visited[i] && (current < 0 || costs[i] < costs[current] - 1e-12)) current = i;
    if (current === target) break;
    visited[current] = true;
    for (const neighbor of topology.neighbors[current]) {
      const cost = costs[current] + angle(topology.vertices[current], topology.vertices[neighbor]);
      if (cost < costs[neighbor] - 1e-12) { costs[neighbor] = cost; previous[neighbor] = current; }
    }
  }
  const path = [target];
  while (path[0] !== source) path.unshift(previous[path[0]]);
  return path;
}

function route(points: Vec3[], edges: Edge[], surface: Surface): StrutRoute {
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + distance(points[i - 1], points[i]));
  return { points, edges, distances, length: distances.at(-1)!, surface };
}

export function strutRoute(source: number, target: number, surface: Surface = 'curved'): StrutRoute {
  const key = `${surface}:${source}:${target}`;
  const saved = cache.get(key);
  if (saved) return saved;
  const result = routeThrough(shortestStrutPath(source, target), surface);
  cache.set(key, result);
  return result;
}

/** Both journey particles and selected-route previews use the exact visible network. */
export function routeThrough(vertices: number[], surface: Surface): StrutRoute {
  const points: Vec3[] = [], edges: Edge[] = [];
  for (let i = 1; i < vertices.length; i++) {
    const a = vertices[i - 1], b = vertices[i], samples = strutPoints(a, b, surface);
    points.push(...(points.length ? samples.slice(1) : samples));
    edges.push(...Array.from({ length: samples.length - 1 }, () => [a, b] as const));
  }
  if (!points.length) points.push(surfaceArc(topology.vertices[vertices[0]], topology.vertices[vertices[0]], 1, surface === 'seams' ? SEAM_RADIUS : STRUT_RADIUS)[0]);
  return route(points, edges, surface);
}

export function sampleRoute(path: StrutRoute, fraction: number) {
  const d = Math.max(0, Math.min(1, fraction)) * path.length;
  let lo = 0, hi = path.edges.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (path.distances[mid + 1] < d) lo = mid + 1; else hi = mid; }
  const segment = lo, a = path.points[segment], b = path.points[segment + 1] ?? a;
  const span = (path.distances[segment + 1] ?? 0) - path.distances[segment];
  const t = span > 0 ? (d - path.distances[segment]) / span : 0;
  return { point: a.map((v, i) => v + (b[i] - v) * t) as Vec3, segment, distance: d };
}

/** Leave the current edge through its cheaper endpoint; never jump off the struts. */
export function rerouteStrut(path: StrutRoute, fraction: number, target: number): StrutRoute {
  const sample = sampleRoute(path, fraction), edge = path.edges[sample.segment];
  if (!edge) {
    const source = topology.vertices.findIndex((_, vertex) => distance(strutRoute(vertex, vertex, path.surface).points[0], sample.point) < 1e-8);
    return strutRoute(source, target, path.surface);
  }
  let start = sample.segment, end = sample.segment;
  while (start > 0 && path.edges[start - 1][0] === edge[0] && path.edges[start - 1][1] === edge[1]) start--;
  while (end + 1 < path.edges.length && path.edges[end + 1][0] === edge[0] && path.edges[end + 1][1] === edge[1]) end++;
  const choices = [
    { points: [sample.point, ...path.points.slice(sample.segment + 1, end + 2)], endpoint: edge[1], edge },
    { points: [sample.point, ...path.points.slice(start, sample.segment + 1).reverse()], endpoint: edge[0], edge: [edge[1], edge[0]] as const },
  ].map(choice => {
    const remaining = strutRoute(choice.endpoint, target, path.surface);
    return route([...choice.points, ...remaining.points.slice(1)], [...choice.points.slice(1).map(() => choice.edge), ...remaining.edges], path.surface);
  });
  return choices[0].length <= choices[1].length ? choices[0] : choices[1];
}
