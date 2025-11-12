
import { Vector2, Line } from '../types';

export const vecAdd = (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x + v2.x, y: v1.y + v2.y });
export const vecSub = (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x - v2.x, y: v1.y - v2.y });
export const vecMult = (v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s });
export const vecDot = (v1: Vector2, v2: Vector2): number => v1.x * v2.x + v1.y * v2.y;
export const vecMag = (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y);
export const vecNormalize = (v: Vector2): Vector2 => {
  const m = vecMag(v);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
};

// Rotate vector by angle (radians)
export const vecRotate = (v: Vector2, angle: number): Vector2 => ({
  x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
  y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
});

// Check if two line segments intersect (p1-p2 and p3-p4)
export const getLineIntersection = (p1: Vector2, p2: Vector2, p3: Vector2, p4: Vector2): boolean => {
  const det = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (det === 0) return false;
  const lambda = ((p4.y - p3.y) * (p4.x - p1.x) + (p3.x - p4.x) * (p4.y - p1.y)) / det;
  const gamma = ((p1.y - p2.y) * (p4.x - p1.x) + (p2.x - p1.x) * (p4.y - p1.y)) / det;
  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
};

// Get detailed collision info for the closest wall
export const getWallCollision = (pos: Vector2, radius: number, walls: Line[]): { wall: Line, dist: number, normal: Vector2 } | null => {
  let best = null;

  for (const wall of walls) {
    const a = wall.p1;
    const b = wall.p2;
    
    const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    let t = 0;
    if (l2 !== 0) {
      t = ((pos.x - a.x) * (b.x - a.x) + (pos.y - a.y) * (b.y - a.y)) / l2;
      t = Math.max(0, Math.min(1, t));
    }
    
    const proj = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
    const diff = vecSub(pos, proj);
    const d = vecMag(diff);

    if (d < radius) {
       // Find deepest penetration (smallest d)
       if (!best || d < best.dist) {
           // Normal points from wall to car (push out direction)
           let normal = d > 0 ? vecNormalize(diff) : { x: 0, y: 0 };
           
           // Edge case: if center is exactly on the line (d=0)
           if (d === 0) {
               const wallDir = vecSub(b, a);
               // Perpendicular vector (-y, x)
               const perp = { x: -wallDir.y, y: wallDir.x };
               normal = vecNormalize(perp);
           }

           best = { wall, dist: d, normal };
       }
    }
  }
  return best;
};
