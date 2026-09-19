export type RobotId = string;

export type GamePieceId = string;

export interface Vector2 {
  x: number;
  y: number;
}

/** Basic robot state in the simulation */
export interface RobotState {
  id: RobotId;
  /** Position in world coordinates */
  position: Vector2;
  /** Velocity in world coordinates */
  velocity: Vector2;
  /** Heading in radians (0 = right, PI/2 = down/forward on canvas) */
  heading: number;
  /** Angular velocity in radians per second */
  angularVelocity: number;
  /** Robot team color/name */
  team: string;
  /** Maximum number of game pieces this robot can carry. */
  capacity: number;
  /** Current number of carried pieces. */
  carriedCount: number;
  /** Whether the robot is controlled by a human player or AI */
  controlledBy: 'human' | 'ai';
}

/** Game piece state in the simulation */
export interface GamePieceState {
  id: GamePieceId;
  position: Vector2;
  velocity: Vector2;
  /** Collision radius in world units. */
  radius: number;
  /** Which robot currently possesses this piece, if any */
  carrier: RobotId | null;
  /** Current state: 'free', 'carried', 'scored' */
  state: 'free' | 'carried' | 'scored' | 'held' | 'flying';
  source?: 'neutral' | 'depot' | 'outpost' | 'robot' | 'hub';
  flightSecondsRemaining?: number;
  recycleSecondsRemaining?: number;
  target?: Vector2;
}

/** Complete simulation state snapshot */
export interface SimulationState {
  /** Match timer in seconds */
  matchTime: number;
  /** Whether the match is running */
  isRunning: boolean;
  /** All robots in the simulation */
  robots: RobotState[];
  /** All game pieces in the simulation */
  gamePieces: GamePieceState[];
  /** Field state / boundaries */
  field: FieldState;
  match: MatchState;
}

export type MatchPhase = 'AUTO' | 'TRANSITION' | 'SHIFT 1' | 'SHIFT 2' | 'SHIFT 3' | 'SHIFT 4' | 'END GAME' | 'COMPLETE';

export interface MatchState {
  started: boolean;
  lobby: LobbyState;
  phase: MatchPhase;
  phaseSecondsRemaining: number;
  phaseProgress: number;
  redScore: number;
  blueScore: number;
  redAutoFuel: number;
  blueAutoFuel: number;
  redHubActive: boolean;
  blueHubActive: boolean;
  redRp: number;
  blueRp: number;
}

export interface LobbySlot {
  id: 'R1' | 'R2' | 'R3' | 'B1' | 'B2' | 'B3';
  claimedBy: string | null;
  initials: string;
  ready: boolean;
}

export interface LobbyState {
  slots: LobbySlot[];
  totalFuel: 504 | 600;
  redHumanPlayer: boolean;
  blueHumanPlayer: boolean;
}

/** Field state containing boundary and structure info */
export interface FieldState {
  /** Left boundary (x coordinate) */
  left: number;
  /** Right boundary (x coordinate) */
  right: number;
  /** Top boundary (y coordinate) */
  top: number;
  /** Bottom boundary (y coordinate) */
  bottom: number;
}

/** Input state sent from client to server */
export interface RobotInput {
  /** Forward/backward thrust (-1 to 1) */
  thrust: number;
  /** Turning rate (-1 to 1, negative = left) */
  turn: number;
  /** Intake action (true/false) */
  intake: boolean;
  /** Outtake action (true/false) */
  outtake: boolean;
  /** Mechanism activation (true/false) */
  mechanism: boolean;
  shoot?: boolean;
  cornerPass?: boolean;
  climb?: boolean;
  reset?: boolean;
}