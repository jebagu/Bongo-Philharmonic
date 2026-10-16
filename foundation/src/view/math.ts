import type { Vec3 } from '../core/contracts';
import { cross, normalize, surfacePoint } from '../core/geometry';

/** Composition axes are right, forward, up. Camera transforms never enter here. */
export function toRenderPoint([x, y, z]: Vec3, radius = 1): Vec3 {
  return [x * radius, z * radius, -y * radius];
}

/** Unit surface geometry by default; display callers supply any visual lift. */
export function surfaceArc(a: Vec3, b: Vec3, segments = 48, radius = 1): Vec3[] {
  return Array.from({ length: segments + 1 }, (_, i) => toRenderPoint(surfacePoint(a, b, i / segments), radius));
}

/** A deterministic small circle at angular distance theta from a source. */
export function wavefront(source: Vec3, theta: number, segments = 96, radius = 1.024): Vec3[] {
  const u = normalize(cross(source, Math.abs(source[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0]));
  const v = cross(source, u);
  return Array.from({ length: segments + 1 }, (_, i) => {
    const phi = (i / segments) * Math.PI * 2;
    const p = source.map((s, k) => s * Math.cos(theta) + (u[k] * Math.cos(phi) + v[k] * Math.sin(phi)) * Math.sin(theta)) as Vec3;
    return toRenderPoint(p, radius);
  });
}
