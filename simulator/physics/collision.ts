/**
 * Collision geometry for the simulator.
 * Defines shapes and collision detection between them.
 */

export type Rect = {
  x: number; // position of top-left corner
  y: number;
  width: number;
  height: number;
};

export type Circle = {
  x: number;
  y: number;
  radius: number;
};

/**
 * Axis-Aligned Bounding Box collision.
 * Returns true if the two rectangles overlap.
 */
export const aabbCollide = (a: Rect, b: Rect): boolean => {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
};

/**
 * Check if a point is inside a rectangle.
 */
export const pointInRect = (px: number, py: number, rect: Rect): boolean => {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
};

/**
 * Check if a circle collides with a rectangle.
 * Simple distance-based check.
 */
export const circleRectCollide = (circle: Circle, rect: Rect): boolean => {
  // Find the closest point on the rectangle to the circle's center
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

  // Calculate the distance between the circle's center and that point
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < circle.radius;
};