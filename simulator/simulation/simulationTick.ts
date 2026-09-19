/**
 * Simulation tick - advances the physics and game state by one timestep.
 * 
 * This is the core simulation loop that the server runs at a fixed timestep.
 * It is kept separate from rendering and networking.
 */

import { Vector2, RobotState, SimulationState, RobotInput, FieldState } from './simulationState';
import { RobotStats, defaultRobotStats, feetPerSecondToMetersPerSecond } from '../stats';

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
  const driveMagnitude = Math.hypot(driveX, driveY);
  const driveScale = driveMagnitude > 1 ? 1 / driveMagnitude : 1;
  const cosH = Math.cos(newHeading);
  const sinH = Math.sin(newHeading);

  // Swerve drive targets a chassis velocity while acceleration and braking limit
  // how quickly the robot can reach that target.
  const shootSpeedPercent = Math.max(0, Math.min(100, stats.shootDriveSpeedPercent));
  const configuredMaxSpeed = stats.drivetrainSpeedFtPerSec > 0
    ? feetPerSecondToMetersPerSecond(stats.drivetrainSpeedFtPerSec)
    : stats.maxSpeed;
  const driveSpeed = input.shoot
    ? configuredMaxSpeed * shootSpeedPercent / 100
    : configuredMaxSpeed;
  const targetForwardVelocity = driveY * driveScale * driveSpeed;
  const targetStrafeVelocity = driveX * driveScale * driveSpeed;
  const targetVelocity = {
    x: cosH * targetForwardVelocity - sinH * targetStrafeVelocity,
    y: sinH * targetForwardVelocity + cosH * targetStrafeVelocity,
  };
  const hasDriveInput = driveMagnitude > 0.001;
  const finalVelocity = approachVector(
    velocity,
    targetVelocity,
    (hasDriveInput ? stats.acceleration : stats.braking) * dt,
  );

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

const approachVector = (current: Vector2, target: Vector2, maxDelta: number): Vector2 => {
  const deltaX = target.x - current.x;
  const deltaY = target.y - current.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance <= maxDelta || distance === 0) return { ...target };
  const scale = maxDelta / distance;
  return {
    x: current.x + deltaX * scale,
    y: current.y + deltaY * scale,
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