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
  'KeyW': 'thrust',
  'ArrowUp': 'thrust',
  
  // Thrust (backward) 
  'KeyS': 'thrust',
  'ArrowDown': 'thrust',
  
  // Turn (left)
  'KeyA': 'turn',
  'ArrowLeft': 'turn',
  
  // Turn (right)
  'KeyD': 'turn',
  'ArrowRight': 'turn',
  
  // Intake
  'Space': 'intake',
  
  // Outtake
  'ShiftLeft': 'outtake',
  'ShiftRight': 'outtake',
  
  // Mechanism
  'KeyV': 'mechanism',
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
    thrust: 0,
    turn: 0,
    intake: false,
    outtake: false,
    mechanism: false,
  };
  
  const keyMapping = keyboardMapping[event.code];
  if (!keyMapping) return input;
  
  // Handle dual-purpose keys (thrust can be forward or backward)
  if (keyMapping === 'thrust') {
    // Check if it's forward or backward based on the specific key
    const isForward = event.code === 'KeyW' || event.code === 'ArrowUp';
    // In a real implementation, we'd need to track state to allow
    // both forward and backward simultaneously, but for simplicity:
    input.thrust = isForward ? 1 : -1;
  } else if (keyMapping === 'turn') {
    const isLeft = event.code === 'KeyA' || event.code === 'ArrowLeft';
    input.turn = isLeft ? -1 : 1;
  } else if (keyMapping === 'intake') {
    input.intake = true;
  } else if (keyMapping === 'outtake') {
    input.outtake = true;
  } else if (keyMapping === 'mechanism') {
    input.mechanism = true;
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
    thrust: 0,
    turn: 0,
    intake: false,
    outtake: false,
    mechanism: false,
  };
  
  // If the released key was controlling thrust or turn, zero it out
  if (keyMapping === 'thrust' || keyMapping === 'turn') {
    // Check if the other direction key is still pressed
    // This is simplified - a full implementation would track key state
    input.thrust = 0;
    input.turn = 0;
  }
  
  return input;
};