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

  // Turn toward the commanded angular velocity, including braking when released.
  const targetAngularVelocity = Math.max(-stats.turnRate, Math.min(stats.turnRate, input.turn * stats.turnRate));
  const angularAcceleration = stats.turnRate * 4;
  const angularDelta = targetAngularVelocity - angularVelocity;
  const newAngularVelocity = angularVelocity + Math.max(-angularAcceleration * dt, Math.min(angularAcceleration * dt, angularDelta));
  const newHeading = heading + newAngularVelocity * dt;

  const driveX = input.driveX ?? 0;
  const driveY = input.driveY ?? input.thrust;
  const cosH = Math.cos(newHeading);
  const sinH = Math.sin(newHeading);

  // Convert local swerve axes into world acceleration.
  const forwardForce = driveY * stats.acceleration;
  const strafeForce = driveX * stats.acceleration;
  const accelerationVector = {
    x: cosH * forwardForce - sinH * strafeForce,
    y: sinH * forwardForce + cosH * strafeForce,
  };

  // Apply friction/damping
  const friction = driveX === 0 && driveY === 0 ? stats.braking : stats.friction;
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

  // Keep the rotated robot footprint within the field and stop motion into a wall.
  const { position: clampedPosition, hitX, hitY } = clampToField(newPosition, stats, field, newHeading);
  if (hitX) finalVelocity.x = 0;
  if (hitY) finalVelocity.y = 0;

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
  field: FieldState,
  heading: number,
): { position: Vector2; hitX: boolean; hitY: boolean } => {
  const { width: robotWidth, length: robotLength } = stats;
  const cosHeading = Math.abs(Math.cos(heading));
  const sinHeading = Math.abs(Math.sin(heading));
  const halfWidth = (cosHeading * robotWidth + sinHeading * robotLength) / 2;
  const halfLength = (sinHeading * robotWidth + cosHeading * robotLength) / 2;

  const x = Math.max(field.left + halfWidth, Math.min(field.right - halfWidth, position.x));
  const y = Math.max(field.top + halfLength, Math.min(field.bottom - halfLength, position.y));

  return {
    position: { x, y },
    hitX: x !== position.x,
    hitY: y !== position.y,
  };
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
    const input = { driveX: 0, driveY: 0, thrust: 0, turn: 0, intake: true, outtake: false, mechanism: false };
    
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