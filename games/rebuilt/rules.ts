/**
 * REBUILT 2026 FRC Game Rules
 * 
 * Implements the rules from the 2026 FRC game manual for the REBUILT game.
 * 
 * Key rules for REBUILT (2026):
 * - Robots score cones and cubes in goals
 * - High goals and low goals have different scoring values
 * - Autonomous period scoring
 * - Alliance-specific zones
 * - No penalties in v1 (explicitly out of scope per TASK.md)
 */

import { 
  SimulationState, 
  RobotState, 
  GamePieceState, 
  FieldState 
} from '../../simulator/simulation/simulationState';
import { Vector2, distance } from '../../simulator/physics/vectors';
import { getPieceCarrier, isValidScore, FIELD_WIDTH, FIELD_HEIGHT } from './index';

// REBUILT scoring zones
export enum ScoringZone {
  LOW_GOAL = 'lowGoal',
  HIGH_GOAL = 'highGoal',
  NEUTRAL_ZONE = 'neutralZone',
}

/** Scoring result from an attempt */
export interface ScoringResult {
  success: boolean;
  zone: ScoringZone | null;
  points: number;
  reason?: string;
}

/**
 * Calculate scoring for a robot attempting to score a game piece.
 * 
 * @param state Current simulation state
 * @param robotId ID of the robot attempting to score
 * @param pieceId ID of the game piece being scored
 * @returns Scoring result with points and validity
 */
export const calculateScore = (
  state: SimulationState,
  robotId: string,
  pieceId: string
): ScoringResult => {
  // Check if the piece is being carried by this robot
  const carrier = getPieceCarrier(pieceId);
  if (carrier !== robotId) {
    return {
      success: false,
      zone: null,
      points: 0,
      reason: 'Robot does not possess the game piece',
    };
  }

  // Get robot position
  const robot = state.robots.find(r => r.id === robotId);
  if (!robot) {
    return {
      success: false,
      zone: null,
      points: 0,
      reason: 'Robot not found in state',
    };
  }

  // Check proximity to goals (simplified)
  const piece = state.gamePieces.find(p => p.id === pieceId);
  if (!piece) {
    return {
      success: false,
      zone: null,
      points: 0,
      reason: 'Game piece not found',
    };
  }

  // Determine scoring zone based on robot position
  const distToLowGoal = distance(
    robot.position,
    { x: 1, y: 27.8 } // Approximate low goal position
  );

  const distToHighGoal = distance(
    robot.position,
    { x: 12.41, y: 1 } // Approximate high goal position
  );

  // Simple zone determination - in full implementation would check
  // exact position relative to goal structures
  let zone: ScoringZone = ScoringZone.NEUTRAL_ZONE;
  let points = 0;

  // If close to low goal (near bottom of field)
  if (robot.position.y > 25) {
    zone = ScoringZone.LOW_GOAL;
    points = 2; // Low goal worth 2 points
  }
  // If close to high goal (near top of field)
  else if (robot.position.y < 5) {
    zone = ScoringZone.HIGH_GOAL;
    points = 3; // High goal worth 3 points
  }

  // In v1, we don't implement complex penalty logic
  // Just check if the basic position is valid
  const valid = isValidScore(state, robotId, pieceId);

  return {
    success: valid,
    zone,
    points,
    reason: valid ? undefined : 'Position not valid for scoring',
  };
};

/**
 * Check if a robot is within a scoring zone of a goal.
 * 
 * @param robotPos Robot position in world coordinates
 * @param goalPos Goal position in world coordinates
 * @param threshold Distance threshold in meters
 * @returns True if robot is within scoring range
 */
export const isInScoringZone = (
  robotPos: Vector2,
  goalPos: Vector2,
  threshold: number = 1.0
): boolean => {
  const distance = Math.sqrt(
    Math.pow(robotPos.x - goalPos.x, 2) + 
    Math.pow(robotPos.y - goalPos.y, 2)
  );
  return distance < threshold;
};

/**
 * Get the alliance color/side for a robot.
 * In REBUILT, there are two alliances: Red and Blue.
 * This determines which side of the field a robot is on.
 */
export const getAlliance = (robotId: string, state: SimulationState): 'red' | 'blue' => {
  // Simple determination based on robot position
  // Red alliance typically starts on one side, Blue on the other
  const robot = state.robots.find(r => r.id === robotId);
  if (!robot) return 'red'; // default
  
  // If robot is on left side of field, it's Red alliance
  // If robot is on right side, it's Blue alliance
  return robot.position.x < FIELD_WIDTH / 2 ? 'red' : 'blue';
};

/**
 * Get the nearest scoring goal for a robot based on alliance.
 * 
 * @param robotId ID of the robot
 * @param state Current simulation state
 * @returns Goal position vector nearest to the robot
 */
export const getNearestGoal = (
  robotId: string,
  state: SimulationState
): { x: number; y: number } => {
  const robot = state.robots.find(r => r.id === robotId);
  if (!robot) return { x: FIELD_WIDTH / 2, y: FIELD_HEIGHT / 2 };
  
  const alliance = getAlliance(robotId, state);
  
  // Return the appropriate goal based on alliance
  if (alliance === 'red') {
    // Red alliance scores in low goal at bottom-left and high goal at top-left
    return { x: 1, y: 27.8 }; // Low goal
  } else {
    // Blue alliance scores in low goal at bottom-right and high goal at top-right
    return { x: 12.41, y: 1 }; // High goal
  }
};