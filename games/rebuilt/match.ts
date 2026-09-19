import { MatchPhase, MatchState } from '../../simulator/simulation/simulationState';

export const MATCH_DURATION = 160;

const phases: { name: MatchPhase; duration: number }[] = [
  { name: 'AUTO', duration: 20 },
  { name: 'TRANSITION', duration: 10 },
  { name: 'SHIFT 1', duration: 25 },
  { name: 'SHIFT 2', duration: 25 },
  { name: 'SHIFT 3', duration: 25 },
  { name: 'SHIFT 4', duration: 25 },
  { name: 'END GAME', duration: 30 },
];

export const createMatchState = (): MatchState => ({
  started: false,
  lobby: {
    slots: ['R1', 'R2', 'R3', 'B1', 'B2', 'B3'].map((id) => ({ id: id as 'R1' | 'R2' | 'R3' | 'B1' | 'B2' | 'B3', claimedBy: null, initials: '--', ready: false })),
    totalFuel: 600,
    redHumanPlayer: true,
    blueHumanPlayer: true,
  },
  phase: 'AUTO',
  phaseSecondsRemaining: 20,
  phaseProgress: 0,
  redScore: 0,
  blueScore: 0,
  redAutoFuel: 0,
  blueAutoFuel: 0,
  redHubActive: true,
  blueHubActive: true,
  redRp: 0,
  blueRp: 0,
});

export const advanceMatchState = (match: MatchState, elapsed: number): MatchState => {
  if (!match.started) return match;
  if (elapsed >= MATCH_DURATION) {
    return { ...match, phase: 'COMPLETE', phaseSecondsRemaining: 0, phaseProgress: 1, redHubActive: false, blueHubActive: false };
  }
  let cursor = 0;
  for (const phase of phases) {
    if (elapsed < cursor + phase.duration) {
      const elapsedInPhase = elapsed - cursor;
      const active = phase.name === 'AUTO' || phase.name === 'TRANSITION' || phase.name === 'END GAME';
      const shiftNumber = phase.name.startsWith('SHIFT') ? Number(phase.name.slice(-1)) : 0;
      const inactiveRed = match.redAutoFuel > match.blueAutoFuel ? shiftNumber % 2 === 1 : shiftNumber % 2 === 0;
      return {
        ...match,
        phase: phase.name,
        phaseSecondsRemaining: phase.duration - elapsedInPhase,
        phaseProgress: elapsedInPhase / phase.duration,
        redHubActive: active || !inactiveRed,
        blueHubActive: active || inactiveRed,
      };
    }
    cursor += phase.duration;
  }
  return match;
};