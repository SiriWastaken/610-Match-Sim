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

export const defaultRobotStats: RobotStats = {
  mass: 150,
  width: 0.711,
  length: 0.915,
  maxSpeed: 4,
  acceleration: 3,
  braking: 5,
  friction: 0.02,
  turnRate: 2,
};