/**
 * Simulator Controls Interface
 * 
 * Defines the controls interface/types used by the simulator.
 * Controls should be game-independent wherever possible.
 * 
 * Game-specific controls are exposed through the REBUILT robot/game implementation.
 * 
 * This system is designed to support:
 * - keyboard
 * - controller/gamepad
 * - AI/autonomous control
 * - potentially recorded/replayed inputs
 * 
 * without rewriting the simulator.
 */

import { RobotInput } from './simulation/simulationState';

/**
 * Generic control inputs for a robot.
 * Values range from -1 to 1.
 * 
 * Note: REBUILT-specific control mappings are handled in the game module.
 */
export interface GenericRobotInput {
  driveX: number;
  driveY: number;
  /** Forward/backward thrust (-1 to 1)
   *  -1 = full reverse, 0 = stopped, 1 = full forward */
  thrust: number;
  
  /** Turning rate (-1 to 1, negative = left turn)
   *  -1 = full left, 0 = straight, 1 = full right */
  turn: number;
  
  /** Intake action (true/false)
   *  Activates the robot's intake mechanism */
  intake: boolean;
  
  /** Outtake action (true/false)
   *  Activates the robot's outtake/mechanism */
  outtake: boolean;
  
  /** Mechanism activation (true/false)
   *  Activates other robot mechanisms (e.g., climber, manipulator) */
  mechanism: boolean;
  shoot: boolean;
  cornerPass: boolean;
  climb: boolean;
  reset: boolean;
}

/**
 * Map generic input to RobotInput (simulator core format).
 * 
 * This allows the simulator core to use generic inputs while
 * the game module provides the mapping to REBUILT-specific behaviors.
 */
export const mapGenericInput = (generic: GenericRobotInput): RobotInput => ({
  driveX: generic.driveX,
  driveY: generic.driveY,
  thrust: generic.thrust,
  turn: generic.turn,
  intake: generic.intake,
  outtake: generic.outtake,
  mechanism: generic.mechanism,
  shoot: generic.shoot,
  cornerPass: generic.cornerPass,
  climb: generic.climb,
  reset: generic.reset,
});

/**
 * Keyboard mapping for generic controls.
 * 
 * Key mappings:
 * - W/S or Arrow Up/Down: Thrust (forward/backward)
 * - A/D or Arrow Left/Right: Turn (left/right)
 - Space: Intake
 - Shift: Outtake
 - C: Mechanism
 * 
 * These mappings can be customized per client/player.
 */
export const keyboardMapping: Record<string, keyof GenericRobotInput> = {
  // Thrust (forward)
  'KeyW': 'driveY',
  'ArrowUp': 'driveY',
  
  // Thrust (backward) 
  'KeyS': 'driveY',
  'ArrowDown': 'driveY',
  
  // Turn (left)
  'KeyA': 'driveX',
  'ArrowLeft': 'turn',
  
  // Turn (right)
  'KeyD': 'driveX',
  'ArrowRight': 'turn',
  
  // Intake
  'Space': 'shoot',
  
  // Outtake
  'ShiftLeft': 'outtake',
  'ShiftRight': 'outtake',
  
  // Mechanism
  'KeyV': 'cornerPass',
  'KeyJ': 'turn',
  'KeyL': 'turn',
  'KeyC': 'climb',
  'Enter': 'reset',
};

/**
 * Process a keydown event and return generic input.
 * 
 * @param event The keyboard event
 * @returns GenericRobotInput with the appropriate values
 */
export const processKeyDown = (event: KeyboardEvent): Partial<GenericRobotInput> => {
  const input: Partial<GenericRobotInput> = {
    driveX: 0,
    driveY: 0,
    thrust: 0,
    turn: 0,
    intake: false,
    outtake: false,
    mechanism: false,
  };
  
  const keyMapping = keyboardMapping[event.code];
  if (!keyMapping) return input;
  
  // Handle dual-purpose keys (thrust can be forward or backward)
  if (keyMapping === 'driveY') {
    input.driveY = event.code === 'KeyW' || event.code === 'ArrowUp' ? 1 : -1;
  } else if (keyMapping === 'driveX') {
    input.driveX = event.code === 'KeyD' ? 1 : -1;
  } else if (keyMapping === 'turn') {
    const isLeft = event.code === 'KeyJ' || event.code === 'ArrowLeft';
    input.turn = isLeft ? -1 : 1;
  } else if (keyMapping === 'outtake') {
    input.outtake = true;
  } else if (keyMapping === 'shoot') {
    input.shoot = true;
  } else if (keyMapping === 'cornerPass') {
    input.cornerPass = true;
  } else if (keyMapping === 'climb') {
    input.climb = true;
  } else if (keyMapping === 'reset') {
    input.reset = true;
  }
  
  return input;
};

/**
 * Process a keyup event and return generic input.
 * 
 * @param event The keyboard event
 * @returns GenericRobotInput with appropriate values (usually zeros for released key)
 */
export const processKeyUp = (event: KeyboardEvent): Partial<GenericRobotInput> => {
  const keyMapping = keyboardMapping[event.code];
  
  if (!keyMapping) return {};
  
  const input: Partial<GenericRobotInput> = {
    driveX: 0,
    driveY: 0,
    thrust: 0,
    turn: 0,
    intake: false,
    outtake: false,
    mechanism: false,
  };
  
  // If the released key was controlling thrust or turn, zero it out
  if (keyMapping === 'driveX' || keyMapping === 'driveY' || keyMapping === 'turn') {
    // Check if the other direction key is still pressed
    // This is simplified - a full implementation would track key state
    input.thrust = 0;
    input.turn = 0;
  }
  
  return input;
};