# TASK.md — Team 610 FRC Match Simulator

## 1. Objective

Build a **2D, realistic, multiplayer FRC match simulator for Team 610**, inspired by the architecture and functionality of the Team 4414 simulator:

https://sim.team4414.com/

The application must run entirely in **TypeScript + Next.js**.

The simulator is intended primarily for **FRC strategy analysis**, not as an arcade game. Robot movement, acceleration, braking, turning, collisions, game-piece interaction, and other physical behavior should therefore be plausible and deterministic enough to produce useful strategic results.

The architecture must be **strongly modular** so that the same simulator engine can later support different FRC games without rewriting the physics engine, networking system, rendering system, or general UI.

For initial development, implement the **2026 FRC game REBUILT**.

---

# 2. Critical Design Principle

The most important architectural requirement is:

> **The simulator engine must not be coupled to REBUILT.**

The project should have a reusable simulator core and a game-specific implementation.

Conceptually:

```text
Simulator Core
├── Physics
├── Collision
├── Simulation loop
├── Rendering
├── Input
├── Networking
├── Match state
└── Robot framework

Game Implementation
└── games/
    └── rebuilt/
        ├── game rules
        ├── field
        ├── game pieces
        ├── scoring
        ├── robot interactions
        ├── autonomous/game phases
        └── REBUILT-specific physics
```

If another FRC game were added later, it should be possible to create:

```text
games/
├── rebuilt/
├── anotherGame/
└── futureGame/
```

without modifying the fundamental physics engine or multiplayer architecture.

---

# 3. Required Technology

Use:

* **TypeScript**
* **Next.js**
* React
* WebSocket-based realtime networking
* `fieldMap.png` for the field background
* HTML Canvas or another appropriate 2D rendering method
* No unnecessary framework or dependency additions

Do not introduce a large game engine unless absolutely necessary.

The implementation should remain understandable to a student/team maintaining the project.

---

# 4. Existing Reference Material

The repository/project has been provided with reference material containing:

1. A dissection/analysis of the TIDE/4414 simulator sources
2. The frontend HTML from the reference simulator
3. The official FRC 2026 game manual
4. Other provided reference material where applicable

**Read and understand these materials before implementing the simulator.**

Use them to understand:

* simulator architecture
* physics approach
* controls
* networking
* game-state representation
* rendering
* field geometry
* robot behavior
* game-piece behavior
* scoring
* match flow
* relevant REBUILT rules

Do **not** blindly copy the reference implementation.

The goal is to build a clean Team 610 implementation that is **inspired by the reference architecture**, while remaining modular and maintainable.

The official FRC game manual is authoritative for REBUILT game rules.

If a rule is unclear, do not invent one. Prefer the official manual or clearly isolate the uncertain behavior so it can be corrected later.

---

# 5. Project Architecture

Prefer a structure approximately like:

```text
src/
├── app/
│   └── simulator/
│       └── page.tsx
│
├── simulator/
│   ├── physics/
│   │   ├── physics.ts
│   │   ├── collision.ts
│   │   ├── vectors.ts
│   │   └── geometry.ts
│   │
│   ├── simulation/
│   │   ├── simulation.ts
│   │   ├── simulationState.ts
│   │   └── simulationTick.ts
│   │
│   ├── networking/
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── protocol.ts
│   │
│   ├── rendering/
│   │   ├── renderer.ts
│   │   └── camera.ts
│   │
│   ├── controls.ts
│   ├── robotClasses.ts
│   └── stats.ts
│
├── games/
│   └── rebuilt/
│       ├── index.ts
│       ├── rules.ts
│       ├── field.ts
│       ├── gameState.ts
│       ├── gamePieces.ts
│       ├── scoring.ts
│       ├── physics.ts
│       └── ...
│
└── assets/
    └── fieldMap.png
```

This is an architectural guideline, not a requirement to create every file listed above.

**Do not create files simply to satisfy the diagram.**

If two closely related concepts can cleanly live in one file, keep them together.

The code should be as small as reasonably possible.

---

# 6. Game Module Architecture

The previous idea of a single:

```text
FRC_GAME_NAME.ts
```

file is intentionally replaced.

Each game gets its own directory:

```text
games/
└── rebuilt/
```

The game module should expose a consistent interface that the simulator core can consume.

For example, conceptually:

```ts
interface FRCGame {
    field: Field;
    rules: GameRules;
    gamePieces: GamePieceDefinition[];
    createInitialState(): GameState;
    update(state: GameState, dt: number): void;
}
```

Do not blindly use this exact interface if a better design emerges.

The important requirement is that the **simulator core depends on an abstract game interface**, not on REBUILT-specific code.

---

# 7. Controls

Create:

```text
simulator/controls.ts
```

This should define the controls interface/types used by the simulator.

Controls should be game-independent wherever possible.

Examples of generic controls may include:

* forward/backward drive
* turning
* strafe, if the robot drivetrain supports it
* intake
* outtake
* mechanism activation
* mechanism positioning
* other robot actions

Do not hard-code REBUILT-specific control logic into the global controls system.

Game-specific controls should be exposed through the REBUILT robot/game implementation.

The controls system should make it possible to later support:

* keyboard
* controller/gamepad
* AI/autonomous control
* potentially recorded/replayed inputs

without rewriting the simulator.

---

# 8. Robot Definitions

Create:

```text
simulator/robotClasses.ts
```

This should contain the interfaces/types defining simulated robots.

A robot definition must contain at minimum:

```ts
teamName
```

and robot statistics defined through:

```text
simulator/stats.ts
```

The exact interfaces should be designed sensibly.

The architecture should allow robots to differ in:

* dimensions
* mass
* acceleration
* maximum velocity
* turning behavior
* drivetrain type
* traction
* braking
* intake characteristics
* scoring mechanisms
* mechanism speeds
* mechanism limits
* game-piece capacity
* other strategically relevant properties

Do not hard-code Team 610's robot directly into the global physics engine.

---

# 9. Stats

Create:

```text
simulator/stats.ts
```

Robot statistics should be represented as structured data rather than scattered constants.

For example, conceptually:

```ts
interface RobotStats {
    mass: number;
    width: number;
    length: number;
    maxSpeed: number;
    acceleration: number;
    braking: number;
    ...
}
```

The actual statistics should be chosen based on reasonable FRC robot behavior and the available reference material.

Do not pretend that an unknown real-world specification is known.

Where an exact value is unavailable, use a clearly named tunable approximation.

Keep these values easy to modify.

---

# 10. Physics Requirements

The simulator must use **physics-based movement**, not arcade movement.

Do not simply implement:

```ts
x += speed;
y += speed;
```

with instantaneous direction changes.

The simulation should account for at least:

* position
* velocity
* acceleration
* heading
* angular velocity
* acceleration limits
* braking/deceleration
* turning
* robot dimensions
* collision geometry
* field boundaries
* object interactions

Robots should have inertia.

For example:

* a robot accelerating should take time to reach maximum velocity
* a robot braking should not stop instantly
* turning should affect heading and movement
* collisions should produce physically plausible responses
* game pieces should not teleport between positions
* robots should not pass through field structures

The simulation does **not** need to be a perfect real-world rigid-body simulator.

The target is:

> **Simple enough to maintain, sophisticated enough to be useful for FRC strategy.**

Avoid building an unnecessarily complicated general-purpose physics engine.

---

# 11. Determinism

The simulation should be deterministic wherever practical.

Given:

```text
same initial state
+
same robot configuration
+
same input sequence
+
same timestep
```

the simulator should produce the same result.

Avoid physics that depend on:

* browser frame rate
* rendering timing
* random values without a controlled seed
* client-side simulation differences

This is especially important for multiplayer synchronization and future replay functionality.

---

# 12. Fixed Simulation Tick

Separate simulation time from rendering time.

The physics simulation should run at a consistent timestep rather than directly depending on the browser's rendering FPS.

Conceptually:

```text
Input
  ↓
Simulation Tick
  ↓
Physics
  ↓
Game Rules
  ↓
Authoritative State
  ↓
Renderer
```

Rendering may occur at a different frequency from the simulation.

Use interpolation on the client if necessary to make movement visually smooth.

---

# 13. Multiplayer / WebSocket Architecture

The simulator must support realtime multiplayer.

Use a **WebSocket-based server**.

The server should be authoritative for simulation state.

Conceptually:

```text
Player A
   │
   │ inputs
   ▼
WebSocket Server
   │
   ├── Simulation
   │
   ├── Physics
   │
   ├── Game Rules
   │
   └── Match State
   │
   ├───────────────┐
   ▼               ▼
Player A         Player B
```

If Player B moves their robot:

1. Player B sends input to the server.
2. The server applies that input to the authoritative simulation.
3. The server updates the robot's state.
4. The server broadcasts the updated state.
5. Player A sees Player B move.

Do **not** make every client independently authoritative.

The server must be the source of truth for:

* robot positions
* robot velocities
* robot headings
* game-piece positions
* scoring
* match timer
* game state
* possession
* collisions
* other authoritative simulation state

---

# 14. Networking Efficiency

Do not send unnecessary data.

Inputs should generally be small messages such as:

```text
robot ID
input state
timestamp/sequence number
```

The server should maintain the actual simulation state.

Broadcast state updates efficiently.

The protocol should be explicitly typed in:

```text
networking/protocol.ts
```

Avoid passing arbitrary untyped JSON throughout the application.

---

# 15. Multiplayer Sessions

The initial implementation should support the concept of a match/session.

A session should be able to contain:

* one match
* multiple connected clients
* robots assigned to clients
* authoritative match state

The architecture should allow additional players to join later without rewriting the simulator.

Do not build accounts, matchmaking, persistence, ranking systems, or other unrelated infrastructure unless required by the existing project.

---

# 16. Connection Handling

Handle:

* connection
* disconnection
* reconnection where practical
* invalid messages
* clients joining an existing match
* clients leaving a match

A disconnected client must not cause the entire simulation to fail.

The server should continue simulating remaining robots.

---

# 17. REBUILT Implementation

Create:

```text
games/rebuilt/
```

This directory contains **all REBUILT-specific game behavior**.

This includes:

* field geometry
* game pieces
* scoring
* robot interactions
* field structures
* game-specific physics
* scoring zones
* possession rules
* match phases
* mechanisms
* game-state transitions
* other rules required for simulation

Do not put REBUILT-specific constants into the generic simulator core.

---

# 18. REBUILT Game Manual

Use the provided official 2026 FRC game manual as the authoritative source for game behavior.

Implement the rules necessary for an accurate match simulation.

However:

## Penalties are explicitly OUT OF SCOPE for v1.

Do not spend significant implementation effort on:

* foul scoring
* technical fouls
* penalty assignment
* referee decisions
* penalty escalation

The simulator should instead focus on physical gameplay and normal scoring.

---

# 19. Field

Use:

```text
assets/fieldMap.png
```

as the visual field map.

The field image is a rendering asset, not the physics model itself.

The simulator should have a separate representation of:

* field dimensions
* boundaries
* scoring areas
* obstacles
* structures
* relevant collision geometry
* game-piece locations
* other physically relevant regions

Do not rely on image pixels to perform physics calculations.

The image should simply provide the visual representation.

Where possible, field coordinates should correspond to real FRC dimensions.

Use a consistent world coordinate system.

For example:

```text
meters
```

or

```text
millimeters
```

Internally, choose one unit system and use it consistently.

Do not mix pixels with physical units in the physics engine.

---

# 20. Coordinate System

Define one authoritative coordinate system.

The simulation should have a clear relationship between:

```text
world coordinates
        ↓
field coordinates
        ↓
screen/canvas pixels
```

Keep the conversion in the rendering/camera layer.

Physics should never need to know the browser's pixel dimensions.

---

# 21. Game Pieces

REBUILT game pieces should be represented as actual simulation entities.

They should have appropriate:

* position
* velocity
* dimensions
* collision behavior
* possession state
* interaction rules

Do not represent game pieces as simply "a number in a robot's inventory" if their physical location matters.

A game piece should be able to:

* exist on the field
* move
* collide
* be collected
* be carried
* be released
* interact with scoring structures

as required by the game rules.

---

# 22. Robot/Game-Piece Interaction

Robot interactions should use the physics/game systems rather than arbitrary teleportation.

For example, an intake should have a defined interaction region.

When a game piece enters a valid intake region under the correct conditions, the game logic can transition the piece into the robot's possession.

The interaction should respect:

* robot position
* robot orientation
* mechanism state
* game-piece position
* relevant game rules

Avoid magic conditions such as:

```ts
if (distance < 100) instantlyScore();
```

unless that is genuinely the correct abstraction for the mechanic.

---

# 23. Collisions

Implement collision handling for strategically relevant objects.

At minimum, consider:

* robot ↔ robot
* robot ↔ field boundary
* robot ↔ field structure
* robot ↔ game piece
* game piece ↔ field structure

The collision model does not need to be perfect rigid-body physics.

It does need to prevent obviously impossible behavior.

Examples:

* robots should not pass through one another
* robots should not pass through walls
* game pieces should not pass through solid field structures
* robots should remain within the field

---

# 24. Rendering

The visual design should be:

* dark green
* slate grey
* clean
* technical
* understated

Avoid excessive gradients, glowing effects, or arcade-style visual effects.

The field should be the primary visual element.

The UI should make it easy to see:

* match timer
* robot positions
* robot identities/team names
* game pieces
* score
* relevant robot status
* connection state

The simulator should prioritize **information density and readability** over decoration.

---

# 25. Robot Rendering

Robots should visually communicate:

* team identity
* robot orientation
* approximate dimensions
* current mechanism state where useful

Team names should be visible or easily inspectable.

The renderer should derive robot dimensions from robot stats rather than hard-coding the displayed size.

---

# 26. Controls UI

Provide an intuitive control interface.

Keyboard controls should be supported initially.

Structure the input system so that another input device can later be added without rewriting the simulator.

The UI should clearly show available controls.

Avoid building an unnecessarily complicated control configuration system for v1.

---

# 27. Simulation State

Separate state into sensible categories.

Conceptually:

```text
SimulationState
├── MatchState
├── Robots
├── GamePieces
├── FieldState
└── GameState
```

Avoid putting everything into one enormous object with unrelated properties.

At the same time, do not create dozens of tiny abstractions purely for theoretical cleanliness.

Prefer simple, strongly typed structures.

---

# 28. Client Architecture

The browser should primarily be responsible for:

* rendering
* user input
* interpolation
* UI
* displaying authoritative state

The client should not independently decide:

* scoring
* collisions
* final robot positions
* game-piece ownership
* match outcome

Those decisions belong to the authoritative simulation.

---

# 29. Server Architecture

The server should:

1. accept WebSocket connections
2. create/join simulation sessions
3. receive typed inputs
4. update the simulation at a fixed timestep
5. execute physics
6. execute game logic
7. update authoritative state
8. broadcast state updates

Keep the server implementation as small as practical.

Do not introduce a database unless a later requirement actually needs persistent data.

---

# 30. Error Handling

The simulator should fail gracefully.

Handle:

* malformed WebSocket messages
* invalid robot IDs
* invalid input values
* disconnected clients
* impossible game-state transitions

Do not allow arbitrary client data to directly mutate authoritative state.

Validate network input.

---

# 31. Code Quality Requirements

This project should prioritize:

### Simple code

Prefer:

```ts
function updateRobot(...)
```

over a massive hierarchy of abstract classes.

### Strong typing

Avoid:

```ts
any
```

unless there is a genuine reason.

### Minimal duplication

Shared physics should exist once.

### Minimal abstraction

Do not create interfaces/classes/factories simply because they "look architectural."

Create abstractions where they make the simulator:

* more reusable
* easier to understand
* easier to test
* easier to replace

### Comments

Comment **why**, not what.

Good:

```ts
// Use a fixed timestep so physics does not depend on render FPS.
```

Bad:

```ts
// Add velocity to position.
```

---

# 32. Testing

The simulator must have tests for important deterministic behavior.

At minimum, test:

* robot acceleration
* braking
* turning
* field boundaries
* robot collision behavior
* game-piece interaction
* scoring
* match timer/state transitions
* serialization/deserialization of network messages
* deterministic simulation behavior

Tests should be focused and understandable.

Do not create an enormous testing framework.

---

# 33. Development Order

Implement in approximately this order:

## Phase 1 — Architecture

* establish simulator/game separation
* establish TypeScript interfaces
* establish simulation state
* establish coordinate system

## Phase 2 — Physics

* vectors
* robot movement
* acceleration
* braking
* turning
* collision geometry
* field boundaries

## Phase 3 — Rendering

* field map
* coordinate conversion
* robot rendering
* game-piece rendering
* camera/viewport

## Phase 4 — REBUILT

* field geometry
* game pieces
* scoring
* mechanisms
* game rules
* match phases

## Phase 5 — Controls

* keyboard input
* control abstraction
* robot assignment

## Phase 6 — Multiplayer

* WebSocket server
* sessions
* authoritative simulation
* input messages
* state broadcasting
* connection handling

## Phase 7 — Polish

* UI
* status indicators
* match timer
* debugging tools
* testing
* performance improvements

Do not attempt to implement the entire application in one enormous component.

---

# 34. Debugging / Development Tools

Where useful, include simple developer-only visualization tools for:

* robot collision bounds
* velocity vectors
* acceleration vectors
* interaction zones
* field collision geometry
* game-piece collision bounds

These should be easy to enable/disable.

They are particularly important because this simulator is intended for strategy work.

---

# 35. Performance

The simulator should be capable of smoothly simulating a full FRC match.

Avoid:

* unnecessary React state updates every physics tick
* recreating large object graphs every frame
* excessive DOM elements for physical objects
* unnecessary network traffic
* expensive calculations that can be cached

The simulation engine should be separated from React rendering as much as reasonably possible.

---

# 36. Important Architectural Constraint

Do **not** make the simulator depend on React.

The physics/simulation code should be usable without rendering it.

Conceptually:

```text
React / Next.js
      │
      ▼
Renderer
      │
      ▼
Simulation
      │
      ├── Physics
      ├── Game
      └── State
```

This makes the simulator easier to:

* test
* run on the server
* replay
* record
* analyze
* reuse for future FRC games

---

# 37. Future Compatibility

Do not implement future features now, but avoid architecture that makes these impossible later:

* autonomous simulation
* replaying matches
* recording inputs
* AI-controlled robots
* strategy analysis
* trajectory visualization
* multiple robot configurations
* additional FRC games
* match playback
* simulation statistics

The current implementation should remain focused on the core simulator.

---

# 38. Explicit Non-Goals

Do **not** build these unless specifically required later:

* user authentication
* accounts
* matchmaking
* rankings
* persistent match history
* social features
* chat
* database infrastructure
* AI/ML
* advanced autonomous generation
* referee/penalty simulation
* a general-purpose commercial game engine
* unnecessarily complex physics
* unnecessary UI animations

The goal is a **strategy simulator**, not a complete online game platform.

---

# 39. Acceptance Criteria

The implementation is considered successful when all of the following are true:

### Architecture

* [ ] The project is TypeScript + Next.js.
* [ ] Physics is independent of REBUILT.
* [ ] Multiplayer networking is independent of REBUILT.
* [ ] Rendering is independent of REBUILT where practical.
* [ ] REBUILT exists under `games/rebuilt/`.
* [ ] A future game could be added without rewriting the simulator core.

### Physics

* [ ] Robots have acceleration.
* [ ] Robots have braking/deceleration.
* [ ] Robots have meaningful turning behavior.
* [ ] Robots have physical dimensions.
* [ ] Robots collide with relevant objects.
* [ ] Robots cannot leave the field.
* [ ] Movement does not depend directly on rendering FPS.
* [ ] Simulation is deterministic given identical inputs/state.

### REBUILT

* [ ] The field corresponds to the official 2026 game.
* [ ] `fieldMap.png` is used for visual field rendering.
* [ ] Relevant field geometry is represented separately from the image.
* [ ] Relevant game pieces are simulated.
* [ ] Normal scoring is implemented according to the official manual.
* [ ] Relevant robot/game-piece interactions are implemented.
* [ ] Penalties are intentionally excluded from v1.

### Robots

* [ ] `robotClasses.ts` defines reusable robot types/interfaces.
* [ ] Robots contain `teamName`.
* [ ] Robot stats are represented through `stats.ts`.
* [ ] Different robots can have different physical/statistical properties.

### Networking

* [ ] A WebSocket server exists.
* [ ] The server is authoritative.
* [ ] Clients send inputs rather than authoritative positions.
* [ ] Other players' robot movement is reflected in realtime.
* [ ] Invalid network input is rejected safely.
* [ ] Disconnecting a client does not crash the match.

### UI

* [ ] The field is clearly visible.
* [ ] Robots are easy to identify.
* [ ] The match timer is visible.
* [ ] Relevant game state is visible.
* [ ] The interface uses dark green and slate grey as its primary visual language.
* [ ] The interface prioritizes strategy information over visual effects.

### Code

* [ ] No unnecessary abstractions.
* [ ] No unnecessary dependencies.
* [ ] No unexplained magic numbers where configuration would be clearer.
* [ ] Important physics/game logic is tested.
* [ ] Code is understandable to another Team 610 student/mentor.
* [ ] Comments explain non-obvious decisions rather than obvious code.

---

# 40. Final Implementation Rule

When making implementation decisions, prioritize in this order:

1. **Correctness**
2. **Official FRC rules**
3. **Realistic and useful physics**
4. **Modularity**
5. **Determinism**
6. **Multiplayer correctness**
7. **Maintainability**
8. **Performance**
9. **Visual polish**

Do not sacrifice simulator correctness for visual polish.

Do not sacrifice maintainability for theoretical abstraction.

Do not sacrifice modularity by hard-coding REBUILT into the simulator core.

The final result should feel like:

> **A lightweight, technically credible FRC simulation engine with REBUILT plugged into it, rather than a REBUILT game that happens to contain some reusable code.**
