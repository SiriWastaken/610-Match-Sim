# 610 Match Sim

TypeScript and Next.js match simulator for FRC Team 610. The browser renders the match, while the WebSocket server owns robot movement, game pieces, and match state.

## Local development

```bash
npm install
npm run server
```

In a second terminal:

```bash
npm run dev
```

Open `http://localhost:3000`. The browser connects to `ws://localhost:8080/ws` by default. Copy `.env.example` to `.env.local` to override the endpoint.

## Public deployment

Run the Next app and the simulator server as separate long-running processes. The simulator server binds to `0.0.0.0` and accepts the port from `SIM_SERVER_PORT`:

```bash
npm run build
npm run start
npm run server
```

Expose the server through a public TLS reverse proxy at `/ws` and set:

```bash
NEXT_PUBLIC_SIM_SERVER_URL=wss://sim.example.com/ws
```

The WebSocket server is authoritative. Clients send validated input messages; the server runs a fixed 60 Hz tick and broadcasts state snapshots. Disconnecting a client releases its robot without stopping the match.

## Checks

```bash
npx tsc --noEmit
npm run lint
npm run build
```
