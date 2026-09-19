import { FieldState, Vector2 } from '../../simulator/simulation/simulationState';
import { Rect } from '../../simulator/physics/collision';

export const FIELD_WIDTH = 16.54;
export const FIELD_HEIGHT = 8.07;
export const CENTER_X = FIELD_WIDTH / 2;
export const CENTER_Y = FIELD_HEIGHT / 2;
export const HUB_LINE_X = 4.03;
export const NEUTRAL_ZONE_DEPTH = 7.19;

export type Alliance = 'red' | 'blue';

export interface AllianceFieldData {
  alliance: Alliance;
  wallX: number;
  inward: 1 | -1;
  hub: Rect & { center: Vector2; openingAcross: number };
  bumps: Rect[];
  trenches: Rect[];
  depot: Rect;
  tower: Rect & { rungs: 3 };
  outposts: { chute: Rect; corral: Rect }[];
  startingLineX: number;
}

export interface FieldGeometry {
  width: number;
  height: number;
  centerLineX: number;
  neutralZone: Rect;
  alliances: Record<Alliance, AllianceFieldData>;
}

const allianceData = (alliance: Alliance): AllianceFieldData => {
  const wallX = alliance === 'red' ? 0 : FIELD_WIDTH;
  const inward = alliance === 'red' ? 1 : -1;
  const hubCenterX = wallX + inward * HUB_LINE_X;
  const hub: AllianceFieldData['hub'] = {
    x: hubCenterX - 0.595,
    y: CENTER_Y - 0.595,
    width: 1.19,
    height: 1.19,
    center: { x: hubCenterX, y: CENTER_Y },
    openingAcross: 1.06,
  };
  const bumpX = hubCenterX - inward * 0.564 - 0.564;
  const trenchX = hubCenterX - inward * 1.13 - 0.597;
  const bumpYs = [0.9, FIELD_HEIGHT - 0.9 - 1.854];
  const trenchYs = [0.05, FIELD_HEIGHT - 0.05 - 1.668];
  return {
    alliance,
    wallX,
    inward,
    hub,
    bumps: bumpYs.map((y) => ({ x: bumpX, y, width: 1.128, height: 1.854 })),
    trenches: trenchYs.map((y) => ({ x: trenchX, y, width: 1.194, height: 1.668 })),
    depot: {
      x: alliance === 'red' ? 0 : FIELD_WIDTH - 1.07,
      y: CENTER_Y - 0.343,
      width: 1.07,
      height: 0.686,
    },
    tower: {
      x: alliance === 'red' ? 0 : FIELD_WIDTH - 1.143,
      y: CENTER_Y - 0.6255,
      width: 1.143,
      height: 1.251,
      rungs: 3,
    },
    outposts: [
      {
        chute: { x: alliance === 'red' ? 0 : FIELD_WIDTH - 0.5, y: 0.25, width: 0.5, height: 0.8 },
        corral: { x: alliance === 'red' ? 0 : FIELD_WIDTH - 0.5, y: FIELD_HEIGHT - 1.05, width: 0.5, height: 0.8 },
      },
    ],
    startingLineX: hubCenterX,
  };
};

export const fieldGeometry: FieldGeometry = {
  width: FIELD_WIDTH,
  height: FIELD_HEIGHT,
  centerLineX: CENTER_X,
  neutralZone: {
    x: CENTER_X - NEUTRAL_ZONE_DEPTH / 2,
    y: 0,
    width: NEUTRAL_ZONE_DEPTH,
    height: FIELD_HEIGHT,
  },
  alliances: {
    red: allianceData('red'),
    blue: allianceData('blue'),
  },
};

export const solidFieldObstacles: Rect[] = (['red', 'blue'] as const).flatMap((alliance) => {
  const data = fieldGeometry.alliances[alliance];
  return [data.hub, ...data.bumps, ...data.trenches, data.tower];
});

export const getFieldRect = (): Rect => ({
  x: 0,
  y: 0,
  width: FIELD_WIDTH,
  height: FIELD_HEIGHT,
});

export const getFieldState = (): FieldState => ({
  left: 0,
  right: FIELD_WIDTH,
  top: 0,
  bottom: FIELD_HEIGHT,
});

export const isWithinField = (
  position: Vector2,
  robotWidth: number,
  robotLength: number,
): boolean => (
  position.x >= robotWidth / 2 &&
  position.x <= FIELD_WIDTH - robotWidth / 2 &&
  position.y >= robotLength / 2 &&
  position.y <= FIELD_HEIGHT - robotLength / 2
);

export const getFieldCenter = (): Vector2 => ({ x: CENTER_X, y: CENTER_Y });

export const getAllianceStartPosition = (alliance: Alliance): Vector2 => ({
  x: fieldGeometry.alliances[alliance].wallX + fieldGeometry.alliances[alliance].inward * 1.2,
  y: CENTER_Y,
});

export const getScoringZone = (alliance: Alliance): Rect => fieldGeometry.alliances[alliance].hub;

/** Solid 2D footprints used by robot and FUEL collision handling. */
export const getSolidFieldObstacles = (): Rect[] => (
  solidFieldObstacles
);
