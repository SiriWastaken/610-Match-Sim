import { FieldState, Vector2 } from '../simulation/simulationState';

export interface FieldCamera {
  scale: number;
  offsetX: number;
  offsetY: number;
  toScreen(world: Vector2): Vector2;
  sizeToScreen(size: Vector2): Vector2;
}

export const createFieldCamera = (
  field: FieldState,
  canvas: { width: number; height: number },
  padding = 0,
): FieldCamera => {
  const scale = Math.min(
    (canvas.width - padding * 2) / (field.right - field.left),
    (canvas.height - padding * 2) / (field.bottom - field.top),
  );
  const fieldWidth = (field.right - field.left) * scale;
  const fieldHeight = (field.bottom - field.top) * scale;
  const offsetX = (canvas.width - fieldWidth) / 2;
  const offsetY = (canvas.height - fieldHeight) / 2;
  return {
    scale,
    offsetX,
    offsetY,
    toScreen: (world) => ({
      x: offsetX + (world.x - field.left) * scale,
      y: offsetY + (field.bottom - world.y) * scale,
    }),
    sizeToScreen: (size) => ({ x: size.x * scale, y: size.y * scale }),
  };
};
