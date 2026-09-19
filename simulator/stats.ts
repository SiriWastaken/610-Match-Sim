export interface RobotStats {
  mass: number;
  width: number;
  length: number;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  friction: number;
  turnRate: number;
  drivetrainSpeedFtPerSec: number;
  shootDriveSpeedPercent: number;
}

export const FEET_TO_METERS = 0.3048;

export const feetPerSecondToMetersPerSecond = (feetPerSecond: number): number => (
  feetPerSecond * FEET_TO_METERS
);

export const defaultRobotStats: RobotStats = {
  mass: 150,
  width: 0.711,
  length: 0.915,
  maxSpeed: feetPerSecondToMetersPerSecond(13.1234),
  acceleration: 3,
  braking: 5,
  friction: 0.02,
  turnRate: 2,
  drivetrainSpeedFtPerSec: 13.1234,
  shootDriveSpeedPercent: 50,
};