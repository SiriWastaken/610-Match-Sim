import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { createInitialState, updateState } from '../games/rebuilt';
import { RobotInput } from '../simulator/simulation/simulationState';
import {
  ClientMessage,
  ClientMessageType,
  ServerMessageType,
} from '../simulator/networking/protocol';

const port = Number(process.env.SIM_SERVER_PORT ?? 8080);
const fixedDelta = 1 / 60;
const broadcastEveryTicks = 3;
const state = createInitialState();
const inputs = new Map<string, RobotInput>();
const assignments = new Map<WebSocket, string>();
const clients = new Set<WebSocket>();
let hostSocket: WebSocket | null = null;
let ticks = 0;

const httpServer = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ service: '610-match-sim', status: 'ok' }));
});

const webSocketServer = new WebSocketServer({ server: httpServer, path: '/ws' });

const defaultInput = (): RobotInput => ({
  driveX: 0,
  driveY: 0,
  thrust: 0,
  turn: 0,
  intake: true,
  outtake: false,
  mechanism: false,
});

const send = (socket: WebSocket, message: unknown) => {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
};

const sendError = (socket: WebSocket, message: string) => {
  send(socket, { type: ServerMessageType.ERROR, message });
};

const clampInput = (input: Partial<RobotInput>): RobotInput => ({
  driveX: clampNumber(input.driveX),
  driveY: clampNumber(input.driveY),
  thrust: clampNumber(input.thrust),
  turn: clampNumber(input.turn),
  intake: true,
  outtake: input.outtake === true,
  mechanism: input.mechanism === true,
  shoot: input.shoot === true,
  cornerPass: input.cornerPass === true,
  climb: input.climb === true,
  reset: input.reset === true,
});

const clampNumber = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(-1, Math.min(1, value));
};

const parseMessage = (value: unknown): ClientMessage | null => {
  if (!value || typeof value !== 'object') return null;
  const message = value as Record<string, unknown>;
  if (message.type === ClientMessageType.JOIN && typeof message.clientId === 'string') {
    return {
      type: ClientMessageType.JOIN,
      clientId: message.clientId.slice(0, 80),
      robotId: typeof message.robotId === 'string' ? message.robotId : undefined,
    };
  }
  if (message.type === ClientMessageType.INPUT && typeof message.robotId === 'string') {
    return {
      type: ClientMessageType.INPUT,
      clientId: typeof message.clientId === 'string' ? message.clientId.slice(0, 80) : '',
      robotId: message.robotId,
      input: clampInput((message.input ?? {}) as Partial<RobotInput>),
      timestamp: typeof message.timestamp === 'number' ? message.timestamp : 0,
    };
  }
  if (message.type === ClientMessageType.LOBBY_CLAIM && typeof message.robotId === 'string') {
    return {
      type: ClientMessageType.LOBBY_CLAIM,
      clientId: typeof message.clientId === 'string' ? message.clientId.slice(0, 80) : '',
      robotId: message.robotId,
      initials: typeof message.initials === 'string' ? message.initials.slice(0, 2).toUpperCase() : '--',
    };
  }
  if (message.type === ClientMessageType.LOBBY_READY && typeof message.robotId === 'string') {
    return {
      type: ClientMessageType.LOBBY_READY,
      clientId: typeof message.clientId === 'string' ? message.clientId.slice(0, 80) : '',
      robotId: message.robotId,
      ready: message.ready === true,
    };
  }
  if (message.type === ClientMessageType.START_MATCH) {
    return { type: ClientMessageType.START_MATCH, clientId: typeof message.clientId === 'string' ? message.clientId : '' };
  }
  if (message.type === ClientMessageType.RESET_MATCH) {
    return { type: ClientMessageType.RESET_MATCH, clientId: typeof message.clientId === 'string' ? message.clientId : '' };
  }
  if (message.type === ClientMessageType.LEAVE) {
    return { type: ClientMessageType.LEAVE, clientId: typeof message.clientId === 'string' ? message.clientId : '' };
  }
  return null;
};

const broadcastState = () => {
  const message = {
    type: ServerMessageType.STATE,
    matchId: 'rebuilt-practice-01',
    state,
  };
  clients.forEach((client) => send(client, message));
};

const releaseAssignment = (socket: WebSocket) => {
  const robotId = assignments.get(socket);
  if (!robotId) return;
  const slot = state.match.lobby.slots.find((candidate) => candidate.id === robotId);
  if (slot) {
    slot.claimedBy = null;
    slot.initials = '--';
    slot.ready = false;
  }
  inputs.delete(robotId);
  assignments.delete(socket);
};

webSocketServer.on('connection', (socket) => {
  clients.add(socket);
  if (!hostSocket || hostSocket.readyState !== WebSocket.OPEN) hostSocket = socket;
  send(socket, { type: ServerMessageType.STATE, matchId: 'rebuilt-practice-01', state });

  socket.on('message', (raw) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      sendError(socket, 'Message must be valid JSON');
      return;
    }

    const message = parseMessage(parsed);
    if (!message) {
      sendError(socket, 'Invalid simulator message');
      return;
    }

    if (message.type === ClientMessageType.JOIN) {
      const requested = message.robotId;
      const assigned = requested && state.robots.some((robot) => robot.id === requested) && ![...assignments.values()].includes(requested)
        ? requested
        : state.robots.find((robot) => ![...assignments.values()].includes(robot.id))?.id;
      if (!assigned) {
        send(socket, { type: ServerMessageType.JOIN_CONFIRMED, robotId: null, initialState: state });
        return;
      }
      assignments.set(socket, assigned);
      inputs.set(assigned, defaultInput());
      const slot = state.match.lobby.slots.find((candidate) => candidate.id === assigned);
      if (slot && !slot.claimedBy) {
        slot.claimedBy = message.clientId;
        slot.initials = message.clientId.slice(0, 2).toUpperCase();
      }
      send(socket, { type: ServerMessageType.JOIN_CONFIRMED, robotId: assigned, initialState: state });
      broadcastState();
      return;
    }

    if (message.type === ClientMessageType.LOBBY_CLAIM) {
      const slot = state.match.lobby.slots.find((candidate) => candidate.id === message.robotId);
      if (!slot || (slot.claimedBy && slot.claimedBy !== message.clientId)) {
        sendError(socket, 'That robot slot is already claimed');
        return;
      }
      const previousRobotId = assignments.get(socket);
      if (previousRobotId && previousRobotId !== slot.id) {
        const previousSlot = state.match.lobby.slots.find((candidate) => candidate.id === previousRobotId);
        if (previousSlot) {
          previousSlot.claimedBy = null;
          previousSlot.initials = '--';
          previousSlot.ready = false;
        }
        inputs.delete(previousRobotId);
      }
      slot.claimedBy = message.clientId;
      slot.initials = message.initials;
      assignments.set(socket, slot.id);
      broadcastState();
      return;
    }

    if (message.type === ClientMessageType.LOBBY_READY) {
      const assigned = assignments.get(socket);
      const slot = state.match.lobby.slots.find((candidate) => candidate.id === assigned && candidate.id === message.robotId && candidate.claimedBy === message.clientId);
      if (!slot) {
        sendError(socket, 'Robot is not assigned to this connection');
        return;
      }
      slot.ready = message.ready;
      broadcastState();
      return;
    }

    if (message.type === ClientMessageType.START_MATCH) {
      if (socket !== hostSocket) {
        sendError(socket, 'Only the host can start the match');
        return;
      }
      const claimed = state.match.lobby.slots.filter((slot) => slot.claimedBy);
      const assigned = assignments.get(socket);
      const ownSlot = state.match.lobby.slots.find((slot) => slot.id === assigned && slot.claimedBy === message.clientId);
      if (ownSlot) ownSlot.ready = true;
      if (claimed.length === 0 || claimed.some((slot) => !slot.ready)) {
        sendError(socket, 'Every claimed slot must be ready before the match starts');
        return;
      }
      state.match.started = true;
      state.isRunning = true;
      broadcastState();
      return;
    }

    if (message.type === ClientMessageType.RESET_MATCH) {
      if (!assignments.has(socket)) {
        sendError(socket, 'Only an assigned player can reset the match');
        return;
      }
      const freshState = createInitialState();
      const previousSlots = new Map(
        state.match.lobby.slots
          .filter((slot) => slot.claimedBy)
          .map((slot) => [slot.id, { claimedBy: slot.claimedBy, initials: slot.initials }]),
      );
      freshState.match.lobby.slots.forEach((slot) => {
        const previous = previousSlots.get(slot.id);
        if (previous) {
          slot.claimedBy = previous.claimedBy;
          slot.initials = previous.initials;
        }
      });
      Object.assign(state, freshState);
      assignments.forEach((_robotId, assignedSocket) => {
        const assignedRobot = assignments.get(assignedSocket);
        if (assignedRobot) inputs.set(assignedRobot, defaultInput());
      });
      broadcastState();
      return;
    }

    if (message.type === ClientMessageType.LEAVE) {
      releaseAssignment(socket);
      broadcastState();
      return;
    }

    if (message.type === ClientMessageType.INPUT) {
      const assigned = assignments.get(socket);
      if (!assigned || assigned !== message.robotId) {
        sendError(socket, 'Robot is not assigned to this connection');
        return;
      }
      inputs.set(assigned, message.input);
      return;
    }
  });

  socket.on('close', () => {
    releaseAssignment(socket);
    clients.delete(socket);
    if (hostSocket === socket) hostSocket = clients.values().next().value ?? null;
    broadcastState();
  });
});

setInterval(() => {
  if (!state.match.started) {
    if (ticks % broadcastEveryTicks === 0) broadcastState();
    ticks += 1;
    return;
  }
  const nextState = updateState(state, fixedDelta, inputs);
  state.matchTime = nextState.matchTime;
  state.isRunning = nextState.isRunning;
  state.robots = nextState.robots;
  state.gamePieces = nextState.gamePieces;
  state.match = nextState.match;
  ticks += 1;
  if (ticks % broadcastEveryTicks === 0) broadcastState();
}, fixedDelta * 1000);

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`610 match server listening on 0.0.0.0:${port}`);
  console.log(`WebSocket endpoint: ws://<host>:${port}/ws`);
});
