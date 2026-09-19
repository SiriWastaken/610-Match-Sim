import { FieldState, GamePieceState, RobotState } from '../../simulator/simulation/simulationState';
import { CENTER_X, CENTER_Y, fieldGeometry, FIELD_HEIGHT } from './field';

export const FUEL_DIAMETER = 0.15;
export const FUEL_RADIUS = FUEL_DIAMETER / 2;
export const FUEL_MASS = 0.215;
export const FUEL_FRICTION_DECELERATION = 4;
export const BALL_RESTITUTION = 0.4;
export const WALL_RESTITUTION = 0.3;
export const SPATIAL_CELL_SIZE = FUEL_DIAMETER * 2;

export const createFuelStaging = (total: 504 | 600 = 600, preloadedPerRobot = 0): GamePieceState[] => {
  const pieces: GamePieceState[] = [];
  const add = (index: number, position: { x: number; y: number }, state: GamePieceState['state'], source: GamePieceState['source']) => {
    pieces.push({
      id: `fuel-${index}`,
      position,
      velocity: { x: 0, y: 0 },
      radius: FUEL_RADIUS,
      carrier: null,
      state,
      source,
    });
  };
  let index = 1;
  for (const alliance of ['red', 'blue'] as const) {
    const field = fieldGeometry.alliances[alliance];
    for (let slot = 0; slot < 24; slot += 1) {
      add(index++, {
        x: field.depot.x + field.depot.width / 2 + Math.sin(slot * 13) * 0.18,
        y: field.depot.y + field.depot.height / 2 + Math.cos(slot * 7) * 0.13,
      }, 'free', 'depot');
    }
    for (let slot = 0; slot < 24; slot += 1) {
      add(index++, {
        x: field.outposts[0].chute.x + field.outposts[0].chute.width / 2,
        y: field.outposts[0].chute.y + 0.1 + slot * 0.025,
      }, 'held', 'outpost');
    }
  }
  const neutralCount = total - pieces.length - preloadedPerRobot * 2;
  for (let slot = 0; slot < neutralCount; slot += 1) {
    const column = slot % 30;
    const row = Math.floor(slot / 30);
    const rawX = CENTER_X - 2.615 + column * 0.18;
    const x = rawX < CENTER_X ? rawX - 0.025 : rawX + 0.025;
    add(index++, {
      x,
      y: CENTER_Y - Math.min(0.855, (Math.ceil(neutralCount / 30) - 1) * 0.045) + row * 0.09,
    }, 'free', 'neutral');
  }
  return pieces;
};

export type FuelState = GamePieceState & {
  kind: 'fuel';
  source: 'neutral' | 'depot' | 'outpost' | 'robot' | 'hub';
};

export class FuelSpatialHash {
  private readonly cells = new Map<string, FuelState[]>();

  clear() {
    this.cells.clear();
  }

  insert(fuel: FuelState) {
    const key = this.key(fuel.position.x, fuel.position.y);
    const bucket = this.cells.get(key);
    if (bucket) bucket.push(fuel);
    else this.cells.set(key, [fuel]);
  }

  nearby(fuel: FuelState): FuelState[] {
    const centerX = Math.floor(fuel.position.x / SPATIAL_CELL_SIZE);
    const centerY = Math.floor(fuel.position.y / SPATIAL_CELL_SIZE);
    const result: FuelState[] = [];
    for (let x = centerX - 1; x <= centerX + 1; x += 1) {
      for (let y = centerY - 1; y <= centerY + 1; y += 1) {
        result.push(...(this.cells.get(`${x}:${y}`) ?? []));
      }
    }
    return result;
  }

  private key(x: number, y: number) {
    return `${Math.floor(x / SPATIAL_CELL_SIZE)}:${Math.floor(y / SPATIAL_CELL_SIZE)}`;
  }
}

export const resolveFuelPhysics = (
  pieces: GamePieceState[],
  field: FieldState,
  robots: RobotState[],
  dt: number,
): GamePieceState[] => {
  const next = pieces.map((piece) => ({ ...piece, position: { ...piece.position }, velocity: { ...piece.velocity } }));
  for (const piece of next) {
    if (piece.state !== 'free') continue;
    const damping = Math.max(0, 1 - (FUEL_FRICTION_DECELERATION * dt) / Math.max(Math.hypot(piece.velocity.x, piece.velocity.y), 1));
    piece.velocity.x *= damping;
    piece.velocity.y *= damping;
    piece.position.x += piece.velocity.x * dt;
    piece.position.y += piece.velocity.y * dt;
    if (piece.position.x < field.left + piece.radius) {
      piece.position.x = field.left + piece.radius;
      piece.velocity.x = Math.abs(piece.velocity.x) * WALL_RESTITUTION;
    } else if (piece.position.x > field.right - piece.radius) {
      piece.position.x = field.right - piece.radius;
      piece.velocity.x = -Math.abs(piece.velocity.x) * WALL_RESTITUTION;
    }
    if (piece.position.y < field.top + piece.radius) {
      piece.position.y = field.top + piece.radius;
      piece.velocity.y = Math.abs(piece.velocity.y) * WALL_RESTITUTION;
    } else if (piece.position.y > field.bottom - piece.radius) {
      piece.position.y = field.bottom - piece.radius;
      piece.velocity.y = -Math.abs(piece.velocity.y) * WALL_RESTITUTION;
    }
    for (const robot of robots) pushFuelFromRobot(piece, robot);
  }

  const hash = new FuelSpatialHash();
  next.forEach((piece) => {
    if (piece.state === 'free') hash.insert(piece as FuelState);
  });
  const resolvedPairs = new Set<string>();
  for (const first of next) {
    if (first.state !== 'free') continue;
    for (const second of hash.nearby(first as FuelState)) {
      if (first.id === second.id || second.state !== 'free') continue;
      const pair = [first.id, second.id].sort().join('|');
      if (resolvedPairs.has(pair)) continue;
      resolvedPairs.add(pair);
      resolveBallPair(first, second);
    }
  }
  return next;
};

const resolveBallPair = (first: GamePieceState, second: GamePieceState) => {
  const dx = second.position.x - first.position.x;
  const dy = second.position.y - first.position.y;
  const distance = Math.hypot(dx, dy) || 0.001;
  const minimum = first.radius + second.radius;
  if (distance >= minimum) return;
  const nx = dx / distance;
  const ny = dy / distance;
  const correction = (minimum - distance) / 2;
  first.position.x -= nx * correction;
  first.position.y -= ny * correction;
  second.position.x += nx * correction;
  second.position.y += ny * correction;
  const relativeNormalVelocity = (second.velocity.x - first.velocity.x) * nx + (second.velocity.y - first.velocity.y) * ny;
  if (relativeNormalVelocity >= 0) return;
  const impulse = -(1 + BALL_RESTITUTION) * relativeNormalVelocity / 2;
  first.velocity.x -= impulse * nx;
  first.velocity.y -= impulse * ny;
  second.velocity.x += impulse * nx;
  second.velocity.y += impulse * ny;
};

const pushFuelFromRobot = (piece: GamePieceState, robot: RobotState) => {
  const dx = piece.position.x - robot.position.x;
  const dy = piece.position.y - robot.position.y;
  const distance = Math.hypot(dx, dy) || 0.001;
  const robotRadius = 0.46;
  const minimum = robotRadius + piece.radius;
  if (distance >= minimum) return;
  const nx = dx / distance;
  const ny = dy / distance;
  piece.position.x = robot.position.x + nx * minimum;
  piece.position.y = robot.position.y + ny * minimum;
  const intoRobot = piece.velocity.x * nx + piece.velocity.y * ny;
  if (intoRobot < 0) {
    piece.velocity.x -= nx * intoRobot;
    piece.velocity.y -= ny * intoRobot;
  }
};
