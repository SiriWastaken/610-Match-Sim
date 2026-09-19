import { GamePieceState, RobotState, SimulationState } from '../simulation/simulationState';
import { createFieldCamera, FieldCamera } from './camera';
import { fieldGeometry, getFieldState } from '../../games/rebuilt/field';
import { getRobotStats } from '../../games/rebuilt';

export const render = (
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  canvasSize: { width: number; height: number },
  fieldImage?: HTMLImageElement,
): void => {
  ctx.fillStyle = '#0c1210';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
  const camera = createFieldCamera(getFieldState(), canvasSize, 12);
  drawField(ctx, camera, fieldImage);
  drawBalls(ctx, camera, state.gamePieces);
  drawRobots(ctx, camera, state.robots);
  drawOverlay(ctx, state, canvasSize);
};

const drawField = (
  ctx: CanvasRenderingContext2D,
  camera: FieldCamera,
  fieldImage?: HTMLImageElement,
) => {
  const field = getFieldState();
  const topLeft = camera.toScreen({ x: field.left, y: field.bottom });
  const width = (field.right - field.left) * camera.scale;
  const height = (field.bottom - field.top) * camera.scale;
  if (fieldImage?.complete && fieldImage.naturalWidth > 0) {
    const imageAspect = fieldImage.naturalWidth / fieldImage.naturalHeight;
    const fieldAspect = width / height;
    const imageWidth = imageAspect > fieldAspect ? width : height * imageAspect;
    const imageHeight = imageAspect > fieldAspect ? width / imageAspect : height;
    ctx.drawImage(
      fieldImage,
      topLeft.x + (width - imageWidth) / 2,
      topLeft.y + (height - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
  } else {
    ctx.fillStyle = '#686868';
    ctx.fillRect(topLeft.x, topLeft.y, width, height);
    drawFallbackStructures(ctx, camera);
  }
  ctx.strokeStyle = '#202522';
  ctx.lineWidth = Math.max(1, 0.025 * camera.scale);
  ctx.strokeRect(topLeft.x, topLeft.y, width, height);
  const center = camera.toScreen({ x: fieldGeometry.centerLineX, y: 0 });
  ctx.beginPath();
  ctx.moveTo(center.x, topLeft.y);
  ctx.lineTo(center.x, topLeft.y + height);
  ctx.stroke();
};

const drawFallbackStructures = (ctx: CanvasRenderingContext2D, camera: FieldCamera) => {
  const drawRect = (rect: { x: number; y: number; width: number; height: number }, fill: string) => {
    const topLeft = camera.toScreen({ x: rect.x, y: rect.y + rect.height });
    ctx.fillStyle = fill;
    ctx.fillRect(topLeft.x, topLeft.y, rect.width * camera.scale, rect.height * camera.scale);
  };
  const red = fieldGeometry.alliances.red;
  const blue = fieldGeometry.alliances.blue;
  drawRect(red.hub, '#ed575b');
  drawRect(blue.hub, '#4c8fe8');
  red.bumps.forEach((bump) => drawRect(bump, '#ef575b'));
  blue.bumps.forEach((bump) => drawRect(bump, '#4c8fe8'));
  red.trenches.forEach((trench) => drawRect(trench, '#9a9a9a'));
  blue.trenches.forEach((trench) => drawRect(trench, '#9a9a9a'));
  drawRect(red.tower, '#464646');
  drawRect(blue.tower, '#464646');
  drawRect(red.depot, '#4a4a4a');
  drawRect(blue.depot, '#4a4a4a');
  ctx.fillStyle = 'rgba(245, 215, 65, 0.12)';
  const neutral = camera.toScreen({ x: fieldGeometry.neutralZone.x, y: fieldGeometry.neutralZone.height });
  ctx.fillRect(neutral.x, neutral.y, fieldGeometry.neutralZone.width * camera.scale, fieldGeometry.neutralZone.height * camera.scale);
};

const drawBalls = (ctx: CanvasRenderingContext2D, camera: FieldCamera, pieces: GamePieceState[]) => {
  for (const piece of pieces) {
    const point = camera.toScreen(piece.position);
    ctx.fillStyle = piece.state === 'carried' ? '#fff3a0' : '#ffe52f';
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(1.2, piece.radius * camera.scale), 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawRobots = (ctx: CanvasRenderingContext2D, camera: FieldCamera, robots: RobotState[]) => {
  for (const robot of robots) {
    const stats = getRobotStats(robot.id);
    const point = camera.toScreen(robot.position);
    const width = stats.width * camera.scale;
    const length = stats.length * camera.scale;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(-robot.heading);
    ctx.fillStyle = robot.team === '610' ? '#ed575b' : '#4c8fe8';
    ctx.strokeStyle = '#151b18';
    ctx.lineWidth = Math.max(1, camera.scale * 0.025);
    ctx.fillRect(-width / 2, -length / 2, width, length);
    ctx.strokeRect(-width / 2, -length / 2, width, length);
    ctx.fillStyle = '#20f0ad';
    ctx.beginPath();
    ctx.moveTo(width / 2 + 0.09 * camera.scale, 0);
    ctx.lineTo(width / 2 - 0.02 * camera.scale, -0.08 * camera.scale);
    ctx.lineTo(width / 2 - 0.02 * camera.scale, 0.08 * camera.scale);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#121715';
    ctx.font = `${Math.max(9, 0.16 * camera.scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${robot.team} ${robot.carriedCount}/${robot.capacity}`, 0, -length / 2 - 5);
    ctx.restore();
  }
};

const drawOverlay = (
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  canvasSize: { width: number; height: number },
) => {
  ctx.fillStyle = 'rgba(10, 16, 14, 0.8)';
  ctx.fillRect(12, 12, 190, 34);
  ctx.fillStyle = '#dfe9df';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FUEL ${state.gamePieces.length}`, 24, 34);
  ctx.textAlign = 'right';
  ctx.fillText('16.54m x 8.07m', canvasSize.width - 18, 28);
};
