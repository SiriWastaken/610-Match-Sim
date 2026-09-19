'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { render } from '@/simulator/rendering/renderer';
import { createInitialState, updateState } from '@/games/rebuilt';
import { RobotInput, SimulationState } from '@/simulator/simulation/simulationState';
import { ServerMessageType } from '@/simulator/networking/protocol';

const emptyInput: RobotInput = {
  thrust: 0,
  turn: 0,
  intake: false,
  outtake: false,
  mechanism: false,
  shoot: false,
  cornerPass: false,
  climb: false,
  reset: false,
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldImageRef = useRef<HTMLImageElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const clientId = useId();
  const [state, setState] = useState<SimulationState>(createInitialState);
  const [input, setInput] = useState(emptyInput);
  const [connected, setConnected] = useState(false);
  const [authoritative, setAuthoritative] = useState(false);
  const [robotId, setRobotId] = useState('R1');

  useEffect(() => {
    const host = window.location.hostname;
    const serverUrl = process.env.NEXT_PUBLIC_SIM_SERVER_URL ?? `ws://${host}:8080/ws`;
    const socket = new WebSocket(serverUrl);
    socketRef.current = socket;
    socket.onopen = () => {
      setConnected(true);
      socket.send(JSON.stringify({
        type: 'join',
        clientId,
        robotId: 'R1',
      }));
    };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as { type: string; state?: SimulationState };
        if (message.type === ServerMessageType.STATE && message.state) {
          setAuthoritative(true);
          setState(message.state);
        }
        if (message.type === ServerMessageType.JOIN_CONFIRMED) setAuthoritative(true);
      } catch {
        setAuthoritative(false);
      }
    };
    socket.onclose = () => {
      setConnected(false);
      setAuthoritative(false);
    };
    socket.onerror = () => setConnected(false);
    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [clientId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN || !authoritative) return;
    socket.send(JSON.stringify({
      type: 'input',
      clientId,
      robotId,
      input,
      timestamp: Date.now(),
    }));
  }, [input, authoritative, clientId, robotId]);

  useEffect(() => {
    const pressed = new Set<string>();
    const keyMap: Record<string, string> = {
      KeyW: 'forward',
      KeyS: 'reverse',
      KeyA: 'left',
      KeyD: 'right',
      ArrowUp: 'forward',
      ArrowDown: 'reverse',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      KeyI: 'intake',
      ShiftLeft: 'outtake',
      ShiftRight: 'outtake',
      Space: 'shoot',
      KeyV: 'cornerPass',
      KeyJ: 'left',
      KeyL: 'right',
      KeyC: 'climb',
      Enter: 'reset',
    };
    const updateInput = () => setInput({
      ...emptyInput,
      thrust: pressed.has('forward') ? 1 : pressed.has('reverse') ? -1 : 0,
      turn: pressed.has('left') ? -1 : pressed.has('right') ? 1 : 0,
      intake: pressed.has('intake'),
      outtake: pressed.has('outtake'),
      mechanism: pressed.has('mechanism'),
      shoot: pressed.has('shoot'),
      cornerPass: pressed.has('cornerPass'),
      climb: pressed.has('climb'),
      reset: pressed.has('reset'),
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (!keyMap[event.code]) return;
      event.preventDefault();
      pressed.add(keyMap[event.code]);
      updateInput();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!keyMap[event.code]) return;
      pressed.delete(keyMap[event.code]);
      updateInput();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!authoritative) {
        setState((current) => updateState(current, dt, new Map([[robotId, input]])));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [input, authoritative, robotId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    render(context, state, { width: canvas.width, height: canvas.height }, fieldImageRef.current ?? undefined);
  }, [state]);

  const minutes = Math.floor(state.matchTime / 60);
  const seconds = Math.floor(state.matchTime % 60).toString().padStart(2, '0');

  const sendLobby = (message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(message));
  };

  if (!state.match.started) {
    return (
      <main className="simulator-shell">
        <header className="simulator-header">
          <div><p className="eyebrow">TEAM 610 / 2026</p><h1>REBUILT / match lab</h1></div>
          <div className="status"><span className={connected ? 'live' : undefined} /> {connected ? 'Lobby connected' : 'Connecting'}</div>
        </header>
        <section className="lobby-panel">
          <div className="lobby-heading"><div><p className="eyebrow">PRACTICE SESSION</p><h2>Choose your station</h2></div><span>FUEL {state.match.lobby.totalFuel}</span></div>
          <div className="lobby-grid">
            {state.match.lobby.slots.map((slot) => (
              <button className={`lobby-slot ${slot.id.startsWith('R') ? 'red-slot' : 'blue-slot'} ${slot.id === robotId ? 'selected-slot' : ''}`} key={slot.id} onClick={() => { setRobotId(slot.id); sendLobby({ type: 'lobbyClaim', clientId, robotId: slot.id, initials: clientId.slice(-2).toUpperCase() }); }}>
                <strong>{slot.id}</strong><span>{slot.claimedBy ? slot.initials : 'OPEN'}</span><small>{slot.ready ? 'READY' : slot.claimedBy ? 'CLAIMED' : 'AVAILABLE'}</small>
              </button>
            ))}
          </div>
          <div className="lobby-actions">
            <div className="lobby-stat"><span>ROBOT CLASS</span><b>STANDARD FRC</b></div>
            <div className="lobby-stat"><span>DRIVE / ROTATION</span><b>4.0 m/s / 2.0 rad/s</b></div>
            <div className="lobby-stat"><span>CAPACITY / HEIGHT</span><b>1 FUEL / TRENCH READY</b></div>
            <button className="lobby-ready" onClick={() => sendLobby({ type: 'lobbyReady', clientId, robotId, ready: true })}>READY UP</button>
            <button className="lobby-start" onClick={() => sendLobby({ type: 'startMatch', clientId })}>START MATCH</button>
          </div>
        </section>
        <footer className="simulator-footer"><span>6 ROBOT SLOTS / LATE JOINERS SPECTATE</span><span>SERVER AUTHORITATIVE</span></footer>
      </main>
    );
  }

  return (
    <main className="simulator-shell">
      <header className="simulator-header">
        <div>
          <p className="eyebrow">TEAM 610 / 2026</p>
          <h1>REBUILT / match lab</h1>
        </div>
        <div className="status"><span className={connected ? 'live' : undefined} /> {connected ? 'Server linked' : 'Local preview'}</div>
      </header>
      <section className="match-layout">
        <aside className="match-console">
          <div className="timer-block">
            <span className="console-label">MATCH CLOCK</span>
            <strong>{minutes}:{seconds}</strong>
            <span className="phase">{state.match.phase}</span>
            <div className="phase-progress"><i style={{ width: `${state.match.phaseProgress * 100}%` }} /></div>
            <span className="phase-seconds">{state.match.phaseSecondsRemaining.toFixed(1)}s in phase</span>
          </div>
          <div className="score-row"><span className="red-mark" />RED <b>{state.match.redScore}</b><em>{state.match.redHubActive ? 'ACTIVE' : 'INACTIVE'}</em></div>
          <div className="score-row"><span className="blue-mark" />BLUE <b>{state.match.blueScore}</b><em>{state.match.blueHubActive ? 'ACTIVE' : 'INACTIVE'}</em></div>
          <div className="console-rule" />
          <div className="readout"><span>CONTROL</span><b>R1 / 610</b></div>
          <div className="readout"><span>PHASE LEFT</span><b>{state.match.phaseSecondsRemaining.toFixed(1)}s</b></div>
          <div className="readout"><span>LINK</span><b>{connected ? 'AUTHORITY' : 'LOCAL ONLY'}</b></div>
        </aside>
        <section className="simulator-stage" aria-label="REBUILT field preview">
          <div className="stage-topline"><span>FIELD / WORLD SPACE</span><span>16.54m x 8.07m</span></div>
          <img className="field-image-preload" src="/FieldImage.png" alt="" ref={fieldImageRef} onLoad={() => setState((current) => ({ ...current }))} />
          <canvas ref={canvasRef} width={1200} height={820} />
        </section>
      </section>
      <section className="controls-panel" aria-label="Keyboard controls">
        <div className="control-group"><span>DRIVE</span><div className="keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div></div>
        <div className="control-group"><span>ROTATE</span><div className="keys"><kbd>←</kbd><kbd>→</kbd></div></div>
        <div className="control-group"><span>INTAKE</span><kbd>I</kbd></div>
        <div className="control-group"><span>SHOOT</span><kbd>SPACE</kbd></div>
        <div className="control-group"><span>CORNER PASS</span><kbd>V</kbd></div>
        <div className="control-group"><span>OUTTAKE</span><kbd>SHIFT</kbd></div>
        <div className="control-group"><span>CLIMB</span><kbd>C</kbd></div>
        <div className="control-group"><span>RESET</span><kbd>ENTER</kbd></div>
      </section>
      <footer className="simulator-footer">
        <span>REBUILT / PRACTICE MATCH 01</span>
        <span>AUTHORITATIVE NETWORKING: NOT CONNECTED</span>
      </footer>
    </main>
  );
}
