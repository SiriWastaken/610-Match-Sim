/**
 * Simulator Robot Definitions and Classes
 * 
 * Contains interfaces/types defining simulated robots as required by TASK.md section 8.
 * 
 * A robot definition must contain at minimum:
 * - teamName
 * - Robot statistics defined through simulator/stats.ts
 * 
 * The architecture allows robots to differ in:
 * - dimensions
 * - mass
 * - acceleration
 * - maximum velocity
 * - turning behavior
 * - drivetrain type
 * - traction
 * - braking
 * - intake characteristics
 * - scoring mechanisms
 * - mechanism speeds
 * - mechanism limits
 * - game-piece capacity
 * - other strategically relevant properties
 * 
 * Do not hard-code Team 610's robot directly into the global physics engine.
 */

import { Vector2, RobotState } from './simulation/simulationState';
import { RobotStats } from './stats';

/** 
 * Robot configuration/definition.
 * This describes the physical properties of a robot type.
 * Multiple robots of the same type can share a definition.
 */
export interface RobotDefinition {
  /** Unique robot ID */
  id: string;
  /** Team name/number */
  team: string;
  /** Physical dimensions */
  stats: RobotStats;
  /** Starting position on the field */
  startingPosition: Vector2;
  /** Starting heading (radians) */
  startingHeading: number;
  /** Whether this robot is player-controlled by default */
  controllable: boolean;
  /** Robot color for rendering */
  color: string;
}

/** 
 * Create a robot state from a definition and initial position.
 * 
 * @param definition Robot definition
 * @param initialPosition Override starting position (optional)
 * @returns Initial robot state
 */
export const createRobotState = (
  definition: RobotDefinition,
  initialPosition?: Vector2
): RobotState => ({
  id: definition.id,
  position: initialPosition || definition.startingPosition,
  velocity: { x: 0, y: 0 },
  heading: definition.startingHeading || 0,
  angularVelocity: 0,
  team: definition.team,
  capacity: 600,
  preloadLimit: 8,
  carriedCount: 0,
  controlledBy: 'human', // Will be overridden by network input
});

/** 
 * Team 610 robot definition for REBUILT.
 * Uses standard FRC robot dimensions.
 */
export const team610RobotDefinition: RobotDefinition = {
  id: '610-primary',
  team: '610',
  stats: {
    mass: 150,
    width: 0.711,   // ~28 inches
    length: 0.915,  // ~36 inches
    maxSpeed: 4.0,
    acceleration: 3.0,
    braking: 5.0,
    friction: 0.02,
    turnRate: 2.0,
    drivetrainSpeedFtPerSec: 13.1234,
    shootDriveSpeedPercent: 50,
  },
  startingPosition: { x: 2, y: 5 }, // Left side of field
  startingHeading: Math.PI / 2, // Facing downward (into field)
  controllable: true,
  color: '#FF0000', // Red team color
};

/** 
 * Alliance robot definition (mirror of team 610 on the other side).
 */
export const allianceRobotDefinition: RobotDefinition = {
  id: '610-alliance',
  team: 'alliance',
  stats: {
    mass: 150,
    width: 0.711,
    length: 0.915,
    maxSpeed: 4.0,
    acceleration: 3.0,
    braking: 5.0,
    friction: 0.02,
    turnRate: 2.0,
    drivetrainSpeedFtPerSec: 13.1234,
    shootDriveSpeedPercent: 50,
  },
  startingPosition: { x: 11.41, y: 5 }, // Right side of field
  startingHeading: -Math.PI / 2, // Facing upward (into field)
  controllable: true,
  color: '#0000FF', // Blue team color
};

/**
 * Get robot definition by ID.
 * In a full implementation, this would look up from a registry.
 */
export const getRobotDefinition = (robotId: string): RobotDefinition | undefined => {
  if (robotId === '610-primary') return team610RobotDefinition;
  if (robotId === '610-alliance') return allianceRobotDefinition;
  return undefined;
};