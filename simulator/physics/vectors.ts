/**
 * 2D Vector operations for the simulator.
 * Used by physics, collision, and rendering systems.
 *
 * Coordinate system: x increases to the right, y increases downward
 * (standard canvas/screen coordinates).
 */
export type Vector2 = { x: number; y: number };

export const zeroVector: Vector2 = { x: 0, y: 0 };

export const add = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

export const subtract = (a: Vector2, b: Vector2): Vector2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

export const scale = (v: Vector2, s: number): Vector2 => ({
  x: v.x * s,
  y: v.y * s,
});

export const magnitude = (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y);

export const normalize = (v: Vector2): Vector2 => {
  const mag = magnitude(v);
  if (mag === 0) return zeroVector;
  return { x: v.x / mag, y: v.y / mag };
};

export const dot = (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y;

export const distance = (a: Vector2, b: Vector2): number => magnitude(subtract(a, b));