/**
 * Geometry utilities for the simulator.
 * Includes angle calculations, sector checks, and other spatial operations.
 */

import { Vector2 } from './vectors';

/**
 * Return the angle (in radians) from point a to point b.
 * Angle is measured from the positive x-axis, clockwise.
 */
export const angleOf = (a: Vector2, b: Vector2): number => {
  return Math.atan2(b.y - a.y, b.x - a.x);
};

/**
 * Return the angle of a velocity vector.
 * Returns the direction a robot is moving.
 */
export const velocityAngle = (v: { x: number; y: number }): number => {
  return Math.atan2(v.y, v.x);
};

/**
 * Clamp an angle to the range [-PI, PI].
 */
export const clampAngle = (angle: number): number => {
  let result = angle;
  while (result > Math.PI) result -= 2 * Math.PI;
  while (result < -Math.PI) result += 2 * Math.PI;
  return result;
};

/**
 * Normalize a direction vector to point from a to b.
 */
export const directionTo = (a: { x: number; y: number }, b: { x: number; y: number }): Vector2 => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x: 1, y: 0 };
  return { x: dx / dist, y: dy / dist };
};