/**
 * REBUILT 2026 FRC Game Module
 * 
 * This module contains all REBUILT-specific game behavior as required by TASK.md.
 * The simulator core depends on an abstract interface, and this module implements
 * that interface for the REBUILT game.
 */

import { 
  SimulationState, 
  RobotState, 
  GamePieceState, 
  FieldState, 
  RobotInput 
} from '../../simulator/simulation/simulationState';
import { updateRobotPhysics } from '../../simulator/simulation/simulationTick';
import { createRobotState, team610RobotDefinition, allianceRobotDefinition } from '../../simulator/robotClasses';
import { FIELD_HEIGHT, FIELD_WIDTH, CENTER_X, CENTER_Y, fieldGeometry, getFieldState } from './field';
import { createFuelStaging, FUEL_RADIUS, resolveFuelPhysics } from './fuel';
import { advanceMatchState, createMatchState } from './match';

// REBUILT field dimensions (from 2026 FRC game manual)
// Field is approximately 13.41m x 9.14m (44' x 30')
// Using meters as the internal unit system
export { FIELD_HEIGHT, FIELD_WIDTH } from './field';

// Game piece (cone/cone) dimensions
export const GAME_PIECE_RADIUS = 0.15; // ~6 inches cone base radius
export const GAME_PIECE_HEIGHT = 0.3;

// Robot dimensions for Team 610
// Typical FRC robot size ~ 28" x 36" (0.711m x 0.914m)
export const ROBOT_WIDTH = 0.711;
export const ROBOT_LENGTH = 0.914;

// Scoring positions (approximate from game manual)
export const HIGH_GOAL_POSITION = {
  x: FIELD_WIDTH - 1,
  y: 1,
};

export const LOW_GOAL_POSITION = {
  x: 1,
  y: FIELD_HEIGHT - 1,
};

/**
 * Interface that the simulator core expects from a game implementation.
 * 
 * The simulator core calls these methods to get game-specific behavior
 * without knowing about REBUILT details.
 */
export interface FRCGameInterface {
  /** Get the field boundaries */
  getFieldBounds(): FieldState;

  /** Get robot statistics for a given robot ID */
  getRobotStats(robotId: string): RobotStats;

  /** Create initial simulation state for a new match */
  createInitialState(): SimulationState;

  /** Update simulation state by one tick */
  updateState(state: SimulationState, dt: number, inputs: Map<string, RobotInput>): SimulationState;

  /** Get which robot (if any) is carrying a game piece */
  getPieceCarrier(pieceId: string): string | null;

  /** Check if a scoring action is valid */
  isValidScore(state: SimulationState, robotId: string, pieceId: string): boolean;
}

/** Robot physical statistics */
export interface RobotStats {
  mass: number;
  width: number;
  length: number;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  friction: number;
  turnRate: number;
}

/** REBUILT-specific robot stats */
export const REBUILT_ROBOT_STATS: RobotStats = {
  mass: 150,  // kg
  width: ROBOT_WIDTH,
  length: ROBOT_LENGTH,
  maxSpeed: 4.0,  // m/s
  acceleration: 3.0,  // m/s²
  braking: 5.0,  // m/s² (deceleration rate)
  friction: 0.02,
  turnRate: 2.0,  // radians per second
};

/**
 * Get field bounds for REBUILT game.
 * Uses meters as the internal unit system.
 */
export const getFieldBounds = (): FieldState => ({
  ...getFieldState(),
});

/**
 * Get robot statistics for REBUILT.
 * All REBUILT robots have the same base stats but can be modified.
 */
export const getRobotStats = (robotId: string): RobotStats => {
  // In a full implementation, different robots could have different stats
  // based on their configuration/team number
  return { ...REBUILT_ROBOT_STATS };
};

/**
 * Create initial simulation state for a REBUILT match.
 * Sets up robots, game pieces, and initial positions.
 */
export const createInitialState = (): SimulationState => ({
  matchTime: 0,
  isRunning: false,
  robots: [
    ...(['R1', 'R2', 'R3'] as const).map((id, index) => createRobotState(
      { ...team610RobotDefinition, id, team: '610' },
      { x: 1.4, y: 1.8 + index * 2.2 },
    )),
    ...(['B1', 'B2', 'B3'] as const).map((id, index) => createRobotState(
      { ...allianceRobotDefinition, id, team: 'alliance' },
      { x: FIELD_WIDTH - 1.4, y: 1.8 + index * 2.2 },
    )),
  ],
  gamePieces: createFuelStaging(600),
  field: getFieldBounds(),
  match: createMatchState(),
});

/**
 * Update the REBUILT simulation state by one tick.
 * Handles physics, game piece interaction, scoring, etc.
 */
export const updateState = (
  state: SimulationState,
  dt: number,
  inputs: Map<string, RobotInput>
): SimulationState => {
  if (!state.match.started) return state;
  // Update physics for all robots
  const newRobots = state.robots.map(robot => {
    const input = inputs.get(robot.id) || { thrust: 0, turn: 0, intake: false, outtake: false, mechanism: false };
    return updateRobotPhysics(robot, input, getRobotStats(robot.id), dt, state.field);
  });

  resolveRobotCollisions(newRobots);

  const newGamePieces: GamePieceState[] = state.gamePieces.map((piece): GamePieceState => {
    if (piece.state === 'flying' && piece.target && piece.flightSecondsRemaining !== undefined) {
      const remaining = piece.flightSecondsRemaining - dt;
      if (remaining > 0) {
        return {
          ...piece,
          flightSecondsRemaining: remaining,
          position: {
            x: piece.position.x + piece.velocity.x * dt,
            y: piece.position.y + piece.velocity.y * dt,
          },
        };
      }
      return {
        ...piece,
        state: 'scored',
        source: 'hub',
        recycleSecondsRemaining: 1.5,
        position: piece.target,
        target: undefined,
        flightSecondsRemaining: undefined,
      };
    }
    if (piece.state === 'scored' && piece.recycleSecondsRemaining !== undefined) {
      const remaining = piece.recycleSecondsRemaining - dt;
      if (remaining > 0) return { ...piece, recycleSecondsRemaining: remaining };
      return recycleFromHub(piece);
    }
    if (piece.state === 'carried' && piece.carrier) {
      const carrier = newRobots.find((robot) => robot.id === piece.carrier);
      if (carrier) {
        return {
          ...piece,
          position: {
            x: carrier.position.x + Math.cos(carrier.heading) * 0.65,
            y: carrier.position.y + Math.sin(carrier.heading) * 0.65,
          },
          velocity: carrier.velocity,
        };
      }
    }
    return piece;
  });
  const simulatedGamePieces = resolveFuelPhysics(newGamePieces, state.field, newRobots, dt);
  const match = advanceMatchState(state.match, state.matchTime + dt);

  for (const robot of newRobots) {
    const input = inputs.get(robot.id) || defaultInput;
    if (input.shoot) {
      const carried = simulatedGamePieces.find((piece) => piece.carrier === robot.id);
      if (carried) {
        const alliance = robot.team === '610' ? 'red' : 'blue';
        const hub = fieldGeometry.alliances[alliance].hub.center;
        const dx = hub.x - robot.position.x;
        const dy = hub.y - robot.position.y;
        const distance = Math.hypot(dx, dy);
        const speed = 8;
        carried.state = 'flying';
        carried.source = 'robot';
        carried.carrier = null;
        carried.target = hub;
        carried.flightSecondsRemaining = distance / speed;
        carried.position = { ...robot.position };
        carried.velocity = { x: (dx / Math.max(distance, 0.001)) * speed, y: (dy / Math.max(distance, 0.001)) * speed };
        robot.carriedCount = Math.max(0, robot.carriedCount - 1);
        if (alliance === 'red' && match.redHubActive) match.redScore += 1;
        if (alliance === 'blue' && match.blueHubActive) match.blueScore += 1;
      }
    }
    if (input.outtake) {
      for (const piece of simulatedGamePieces) {
        if (piece.carrier !== robot.id) continue;
        piece.state = 'free';
        piece.carrier = null;
        piece.velocity = {
          x: Math.cos(robot.heading) * 2.2 + robot.velocity.x,
          y: Math.sin(robot.heading) * 2.2 + robot.velocity.y,
        };
        robot.carriedCount = Math.max(0, robot.carriedCount - 1);
      }
    }
    if (!input.intake || robot.carriedCount >= robot.capacity) continue;
    const forward = { x: Math.cos(robot.heading), y: Math.sin(robot.heading) };
    const target = simulatedGamePieces.find((piece) => {
      if (piece.state !== 'free') return false;
      const dx = piece.position.x - robot.position.x;
      const dy = piece.position.y - robot.position.y;
      return dx * forward.x + dy * forward.y > 0.1 && Math.hypot(dx, dy) < 0.85;
    });
    if (target) {
      target.state = 'carried';
      target.carrier = robot.id;
      robot.carriedCount += 1;
    }
  }

  return {
    ...state,
    robots: newRobots,
    gamePieces: simulatedGamePieces,
    matchTime: state.matchTime + dt,
    match,
  };
};

const defaultInput: RobotInput = {
  thrust: 0,
  turn: 0,
  intake: false,
  outtake: false,
  mechanism: false,
};

const recycleFromHub = (piece: GamePieceState): GamePieceState => {
  const alliance = piece.source === 'hub' && piece.position.x < CENTER_X ? 'red' : 'blue';
  const hub = fieldGeometry.alliances[alliance].hub;
  const exitX = alliance === 'red' ? hub.x + hub.width + 0.06 : hub.x - 0.06;
  const phase = Number(piece.id.replace(/\D/g, '') || 1);
  const angle = ((phase * 37) % 90 - 45) * (Math.PI / 180);
  return {
    ...piece,
    state: 'free',
    source: 'hub',
    carrier: null,
    recycleSecondsRemaining: undefined,
    position: { x: exitX, y: hub.center.y + Math.sin(angle) * 0.42 },
    velocity: { x: Math.cos(angle) * (alliance === 'red' ? 1 : -1) * 1.2, y: Math.sin(angle) * 1.2 },
  };
};

const resolveRobotCollisions = (robots: RobotState[]) => {
  for (let firstIndex = 0; firstIndex < robots.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < robots.length; secondIndex += 1) {
      const first = robots[firstIndex];
      const second = robots[secondIndex];
      const dx = second.position.x - first.position.x;
      const dy = second.position.y - first.position.y;
      const distance = Math.hypot(dx, dy) || 0.001;
      const firstStats = getRobotStats(first.id);
      const secondStats = getRobotStats(second.id);
      const minimumDistance = Math.max(firstStats.width, firstStats.length, secondStats.width, secondStats.length) * 0.72;
      if (distance >= minimumDistance) continue;
      const normalX = dx / distance;
      const normalY = dy / distance;
      const correction = (minimumDistance - distance) / 2;
      first.position.x -= normalX * correction;
      first.position.y -= normalY * correction;
      second.position.x += normalX * correction;
      second.position.y += normalY * correction;
      const closingSpeed = (second.velocity.x - first.velocity.x) * normalX +
        (second.velocity.y - first.velocity.y) * normalY;
      if (closingSpeed < 0) {
        first.velocity.x += normalX * closingSpeed * 0.5;
        first.velocity.y += normalY * closingSpeed * 0.5;
        second.velocity.x -= normalX * closingSpeed * 0.5;
        second.velocity.y -= normalY * closingSpeed * 0.5;
      }
    }
  }
};

/**
 * Get which robot is carrying a game piece.
 */
export const getPieceCarrier = (pieceId: string): string | null => {
  // Look through robots to find which one carries this piece
  // This is simplified - real implementation would check piece carrier state
  return null;
};

/**
 * Check if a scoring action is valid for REBUILT.
 * Implements the scoring rules from the 2026 FRC game manual.
 */
export const isValidScore = (
  state: SimulationState,
  robotId: string,
  pieceId: string
): boolean => {
  const piece = state.gamePieces.find((candidate) => candidate.id === pieceId);
  return piece?.carrier === robotId && piece.state === 'carried';
};