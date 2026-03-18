# Code Mafia 🕵️‍♂️💻

> **Sabotage or Survive** — A real-time multiplayer social deduction game where players collaborate to fix buggy code, while one hidden impostor tries to sabotage it.

---

## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18 + Vite                   |
| Styling    | Custom pixel CSS (Press Start 2P) |
| Backend    | Node.js + Express                 |
| Realtime   | Socket.IO                         |
| State      | Zustand (client)                  |
| Database   | Redis (with in-memory fallback)   |
| Deployment | Render/Railway + Vercel           |

---

## Project Structure

```
codemafia/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── screens/           # Full-page screens
│   │   │   ├── MenuScreen.jsx
│   │   │   ├── CreateScreen.jsx
│   │   │   ├── JoinScreen.jsx
│   │   │   ├── LobbyScreen.jsx
│   │   │   ├── VoteCategoryScreen.jsx
│   │   │   ├── AssigningScreen.jsx
│   │   │   ├── RoleRevealScreen.jsx
│   │   │   ├── GameScreen.jsx
│   │   │   └── GameOverScreen.jsx
│   │   ├── components/        # Reusable UI pieces
│   │   │   ├── TopBar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── CodeEditor.jsx
│   │   │   ├── Chat.jsx
│   │   │   └── EmergencyButton.jsx
│   │   ├── hooks/
│   │   │   └── useSocket.js   # All socket.io listeners
│   │   ├── store/
│   │   │   └── gameStore.js   # Zustand global state
│   │   ├── utils/
│   │   │   └── challenges.js  # Client-side challenge data
│   │   ├── socket.js          # Socket.IO singleton
│   │   ├── App.jsx            # Screen router
│   │   └── main.jsx
│   └── styles/
│       └── global.css
│
└── server/                    # Node.js backend
    ├── rooms/
    │   └── roomManager.js     # Room CRUD + Redis/in-memory
    ├── game/
    │   ├── engine.js          # Win conditions, vote tallying
    │   └── challenges.js      # 20 challenges across 5 categories
    ├── events/
    │   ├── lobbyEvents.js     # Lobby, category vote, roles, round timer
    │   ├── gameEvents.js      # Code sync, test runner, sabotage
    │   ├── voteEvents.js      # Emergency, player voting
    │   └── chatEvents.js      # Chat with rate limiting
    └── index.js               # Express + Socket.IO entry
```

---

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- Redis (optional — falls back to in-memory if unavailable)

### 1. Install dependencies

```bash
# From the root
npm install

# Install client deps
cd client && npm install && cd ..

# Install server deps
cd server && npm install && cd ..
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env
# Edit server/.env:
#   PORT=3001
#   REDIS_URL=redis://localhost:6379
#   CLIENT_URL=http://localhost:5173

# Client
cp client/.env.example client/.env
# Edit client/.env:
#   VITE_SERVER_URL=http://localhost:3001
```

### 3. Run both servers

```bash
# From root (runs both concurrently)
npm run dev

# Or separately:
cd server && npm run dev
cd client && npm run dev
```

### 4. Open the game

Open **3+ browser tabs** (or different browsers) to `http://localhost:5173`

- Tab 1: Create a game, copy the lobby code
- Tabs 2–3: Join with the same code
- Once all 3 players click READY → game begins

---

## Game Flow

```
Menu → Create/Join → Lobby → Vote Category (15s)
     → Assigning Roles → Role Reveal (4s)
     → Game Round 1-4 (60s each)
          → Emergency Meeting (any player, once per game)
          → Player Vote (30s)
          → Continue or Game Over
     → Game Over Screen
```

---

## How to Play

### Civilians 👥
- You see the code with 3 bugs marked with `# TODO`
- Click test cases to run them — they lock permanently when passed
- Fix all 3 tests before round 4 ends to win
- Call an Emergency Meeting if you suspect someone
- Vote out the impostor to win instantly

### Impostor 🔪
- You look identical to civilians
- You have a secret Sabotage Panel with 3 tasks
- Click a sabotage task to "complete" it — this appears as you editing code
- Complete all 3 sabotages by round 4 to win
- Survive all votes without being caught to win

### Win Conditions

| Condition                               | Winner    |
|-----------------------------------------|-----------|
| All 3 tests pass by end of round 4      | Civilians |
| Impostor voted out                      | Civilians |
| Round 4 ends with sabotages complete    | Impostor  |
| Civilians vote out wrong player + above | Impostor  |
| Impostor disconnects mid-game           | Civilians |

---

## Socket Events Reference

### Client → Server
| Event                  | Payload                      | Description                    |
|------------------------|------------------------------|--------------------------------|
| `create_room`          | `{ name }`                   | Create a new room              |
| `join_room`            | `{ name, code }`             | Join existing room             |
| `player_ready`         | —                            | Mark self ready                |
| `leave_room`           | —                            | Leave lobby                    |
| `cast_category_vote`   | `{ category }`               | Vote for a category            |
| `code_change`          | `{ lineIndex, content }`     | Sync code edit                 |
| `run_tests`            | —                            | Request test evaluation        |
| `sabotage_done`        | `{ index }`                  | Mark sabotage complete         |
| `call_emergency`       | —                            | Trigger emergency meeting      |
| `cast_player_vote`     | `{ targetId }`               | Vote to eliminate a player     |
| `skip_vote`            | —                            | Skip the vote                  |
| `send_message`         | `{ text }`                   | Send chat message              |

### Server → Client
| Event                  | Payload                                          | Description                    |
|------------------------|--------------------------------------------------|--------------------------------|
| `room_created`         | `{ room }`                                       | Room created successfully      |
| `room_joined`          | `{ room }`                                       | Joined room successfully       |
| `room_updated`         | `{ room }`                                       | Room state changed             |
| `player_joined`        | `{ room }`                                       | New player joined              |
| `player_left`          | `{ room, leftId }`                               | Player left                    |
| `vote_start`           | `{ categories, duration }`                       | Category vote begins           |
| `vote_tick`            | `{ seconds }`                                    | Timer tick                     |
| `vote_counts_updated`  | `{ counts }`                                     | Live vote counts               |
| `vote_end`             | `{ winner }`                                     | Winning category chosen        |
| `role_assigned`        | `{ role }`                                       | Private role assignment        |
| `game_start`           | `{ category, round }`                            | Game begins                    |
| `round_start`          | `{ round }`                                      | New round begins               |
| `round_tick`           | `{ seconds }`                                    | Round timer tick               |
| `code_change`          | `{ playerId, lineIndex, content }`               | Broadcast code edit            |
| `tests_updated`        | `{ testsPassed, total, results }`                | Test results updated           |
| `sabotage_confirmed`   | `{ sabotagesDone }`                              | Sabotage confirmed (impostor)  |
| `emergency_called`     | `{ calledBy, calledById }`                       | Emergency meeting triggered    |
| `voting_start`         | `{ players, duration }`                          | Player voting begins           |
| `vote_recorded`        | —                                                | Your vote was recorded         |
| `vote_result`          | `{ eliminated }`                                 | Vote result announced          |
| `message_received`     | `{ name, color, text }`                          | Chat message broadcast         |
| `game_over`            | `{ winner, reason, impostorId, impostorName }`   | Game ended                     |
| `game_abandoned`       | `{ message }`                                    | Game abandoned (too few players)|

---

## Deployment

### Backend (Render or Railway)

1. Push `server/` to a new repo or monorepo
2. Set environment variables:
   ```
   PORT=3001
   REDIS_URL=<your Redis Cloud URL>
   CLIENT_URL=https://your-vercel-app.vercel.app
   ```
3. Deploy — Render/Railway both support WebSockets natively

### Frontend (Vercel)

1. Set root directory to `client/`
2. Set environment variable:
   ```
   VITE_SERVER_URL=https://your-backend.onrender.com
   ```
3. Deploy

### Redis

Use [Redis Cloud](https://redis.com/try-free/) free tier (30MB) — sufficient for dozens of concurrent rooms.

---

## Security Notes

- The impostor's identity is **never sent** in any broadcast — only to their private socket
- Tests are evaluated **server-side** — clients cannot fake passing tests
- Every socket event validates room membership and game phase
- Emergency button is limited to **1 per player per game**, enforced server-side
- All chat messages and code changes are sanitized (HTML stripped, length limited)
- Rate limiting: max 1 chat message per second per player

---

## Stretch Goals (from TASKS.md)

- [ ] Spectator mode
- [ ] Player statistics (wins, impostor catch rate)
- [ ] Custom room settings (round duration, player count)
- [ ] More categories: DevOps, Databases, Mobile
- [ ] Mobile-responsive layout
- [ ] Animated vote result reveal (sus-meter)
- [ ] Admin panel to manage rooms
