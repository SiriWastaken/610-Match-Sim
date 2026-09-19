/**
 * Simulation tick - advances the physics and game state by one timestep.
 * 
 * This is the core simulation loop that the server runs at a fixed timestep.
 * It is kept separate from rendering and networking.
 */

import { Vector2, RobotState, GamePieceState, SimulationState, RobotInput, FieldState } from './simulationState';
import { RobotStats, defaultRobotStats } from '../stats';

/**
 * Apply physics to a robot for one timestep.
 * 
 * @param robot Current robot state
 * @param input Control inputs from -1 to 1
 * @param stats Robot physical statistics
 * @param dt Time delta in seconds
 * @param field Boundaries of the field
 * @returns Updated robot state
 */
export const updateRobotPhysics = (
  robot: RobotState,
  input: RobotInput,
  stats: RobotStats,
  dt: number,
  field: FieldState
): RobotState => {
  const { position, velocity, heading, angularVelocity } = robot;

  // Apply turning
  const angularAcceleration = input.turn * stats.turnRate;
  const newAngularVelocity = angularVelocity + angularAcceleration * dt;
  const newHeading = heading + newAngularVelocity * dt;

  // Calculate forward direction based on heading
  // 0 radians = right, PI/2 = down (canvas coordinates)
  const cosH = Math.cos(newHeading);
  const sinH = Math.sin(newHeading);

  // Apply thrust (acceleration)
  const thrustForce = input.thrust * stats.acceleration;
  const accelerationVector = {
    x: cosH * thrustForce,
    y: sinH * thrustForce,
  };

  // Apply friction/damping
  const friction = input.thrust === 0 ? stats.braking : stats.friction;
  const velocityAfterFriction = {
    x: velocity.x * Math.max(0, 1 - friction * dt),
    y: velocity.y * Math.max(0, 1 - friction * dt),
  };

  // Add acceleration
  const newVelocity = {
    x: velocityAfterFriction.x + accelerationVector.x * dt,
    y: velocityAfterFriction.y + accelerationVector.y * dt,
  };

  // Apply speed limit
  const speed = Math.sqrt(newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y);
  const maxSpeed = stats.maxSpeed;
  const clampedSpeed = speed > maxSpeed ? (maxSpeed / speed) : 1;
  const finalVelocity = {
    x: newVelocity.x * clampedSpeed,
    y: newVelocity.y * clampedSpeed,
  };

  // Update position
  const newPosition = {
    x: position.x + finalVelocity.x * dt,
    y: position.y + finalVelocity.y * dt,
  };

  // Keep robot within field boundaries
  const clampedPosition = clampToField(newPosition, stats, field);

  return {
    ...robot,
    position: clampedPosition,
    velocity: finalVelocity,
    heading: newHeading,
    angularVelocity: newAngularVelocity,
  };
};

/**
 * Clamp a robot position to stay within field boundaries,
 * considering robot dimensions.
 */
const clampToField = (
  position: Vector2,
  stats: RobotStats,
  field: FieldState
): Vector2 => {
  const { width: robotWidth, length: robotLength } = stats;
  const halfWidth = robotWidth / 2;
  const halfLength = robotLength / 2;

  const left = field.left + halfWidth;
  const right = field.right - halfWidth;
  const top = field.top + halfLength;
  const bottom = field.bottom - halfLength;

  let x = position.x;
  let y = position.y;

  // Clamp x
  if (x - halfWidth < field.left) x = field.left + halfWidth;
  if (x + halfWidth > field.right) x = field.right - halfWidth;

  // Clamp y
  if (y - halfLength < field.top) y = field.top + halfLength;
  if (y + halfLength > field.bottom) y = field.bottom - halfLength;

  return { x, y };
};

/**
 * Advance the simulation state by one tick.
 * 
 * @param state Current simulation state
 * @param dt Time delta in seconds (fixed timestep, e.g., 1/60)
 * @returns Updated simulation state
 */
export const simulationTick = (
  state: SimulationState,
  dt: number,
  robots: { [key: string]: RobotStats }
): SimulationState => {
  const newRobots: RobotState[] = [];
  const newGamePieces: GamePieceState[] = [...state.gamePieces];

  // Update each robot
  state.robots.forEach(robot => {
    const input = robot.controlledBy === 'human' ? { thrust: 0, turn: 0, intake: false, outtake: false, mechanism: false } : { thrust: 0, turn: 0, intake: false, outtake: false, mechanism: false };
    
    // Find the first non-zero input for AI-controlled robots
    // In a real implementation, this would come from the network/input system
    
    const stats = robots[robot.id] || robotStatsDefault;
    const newRobot = updateRobotPhysics(robot, input, stats, dt, state.field);
    newRobots.push(newRobot);
  });

  // Update game pieces (simple physics - gravity, friction, etc.)
  // Game piece logic will be implemented in the REBUILT game module

  return {
    ...state,
    robots: newRobots,
    matchTime: state.matchTime + dt,
  };
};

/** Default robot stats for when specific stats aren't provided */
const robotStatsDefault = defaultRobotStats;