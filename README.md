# Sketch Room

Real-time multiplayer drawing and guessing game built with React, Socket.IO,
Express, and TypeScript.

## Live deployment

**Live URL:** [](https://web3task-assignment-1.onrender.com/).

The application currently runs locally with the frontend on
`http://localhost:5173` and the backend on `http://localhost:5000`.

## Setup

### Prerequisites

- Node.js
- Yarn

### 1. Install dependencies

```bash
cd backend
yarn install

cd ../frontend
yarn install
```

### 2. Configure environment variables

Copy the example files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend environment:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
```

Frontend environment:

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
VITE_FONT_URL=https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap
```

`VITE_API_URL` is used for HTTP API requests. `VITE_SOCKET_URL` is the
Socket.IO server origin; the room namespace is appended automatically.

### 3. Start the backend

In one terminal:

```bash
cd backend
yarn dev
```

The backend starts on `http://localhost:5000`.

### 4. Start the frontend

In another terminal:

```bash
cd frontend
yarn dev
```

Open `http://localhost:5173` in a browser.

### Production builds

Build the backend:

```bash
cd backend
yarn build
yarn start
```

Build the frontend:

```bash
cd frontend
yarn build
yarn preview
```

## Useful endpoints

- `GET /api/wordlist` - returns the categorized word list.
- `GET /api/rooms/public` - returns public rooms that are waiting and not full.

## Architecture overview

### Frontend

- `frontend/src/main.tsx` creates the React application, configures routing,
  and initializes the Socket.IO room provider.
- `frontend/src/pages/Home.tsx` creates rooms, joins rooms, and lists public
  rooms through the HTTP API.
- `frontend/src/pages/Room.tsx` renders the active game room, chat, player
  queue, turn timer, word-selection dialogs, and final scorecard.
- `frontend/src/store/room.store.ts` stores the current room and its
  server-controlled game state using Jotai.
- `frontend/src/components/DrawingCanvas.tsx` renders the canvas and emits
  normalized drawing actions through Socket.IO.

### WebSocket integration

The backend exposes a Socket.IO `/room` namespace. Each connecting client
receives a generated user ID and joins a private user room. Game events are
validated on the server and then broadcast to the relevant room participants.

Important events include:

- `create_room` and `join_room` establish a room and synchronize `roomData`.
- `start_game` starts the first turn.
- `select_word` lets each subsequent drawer choose a word.
- `game_started` and `game_turn_started` synchronize the current drawer,
  round, and server timestamps.
- `draw` relays normalized canvas actions to the other participants.
- `send_chat` relays guesses and awards points for correct guesses.
- `game_turn_end` completes a turn and advances to the next member or round.
- `game_finished` broadcasts the final game state and scoreboard.

The server is authoritative for drawer assignment, round progression,
timestamps, word selection, and scoring. Clients update their local room atom
from server events rather than deciding game state independently.

### Canvas synchronization

Canvas pointer coordinates are normalized to the range `0..1` before they are
sent through Socket.IO. Other clients convert those coordinates back to their
current canvas dimensions and replay the drawing action.

The canvas is interactive only for the current drawer. When the round or
drawer changes, the frontend changes the canvas turn key and clears the local
canvas so each turn starts with a blank drawing surface.

### Game logic

1. A host creates a room with its configuration.
2. Players join while the room is in the `waiting` state.
3. The host starts the first turn by selecting a word.
4. The current drawer draws while other players submit guesses in chat.
5. A correct guess awards one point per player per turn.
6. When the timer ends, the current drawer emits `game_turn_end`.
7. The backend advances to the next member. That member selects a new word,
   which starts the next timer.
8. After all configured rounds, the backend marks the game `finished` and
   broadcasts the final scoreboard.
