# Vi-Slides Lite

A real-time classroom engagement platform. Teachers run live sessions; students join, ask questions, and send engagement signals. AI automatically classifies and answers simple questions.

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18 + Vite + TypeScript            |
| Backend  | Express 5 + Node.js + TypeScript        |
| Database | PostgreSQL + Drizzle ORM                |
| Realtime | Socket.io                               |
| Auth     | JWT (stored in localStorage)            |
| AI       | OpenAI GPT-4o-mini                      |

## Project Structure

```
vi-slides-lite/
├── client/                 # React frontend (Vite dev server on port 3000)
│   ├── src/
│   │   ├── components/ui/  # Shadcn/ui components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # API client, auth utils, helpers
│   │   └── pages/          # Route pages (teacher/*, student/*)
│   ├── index.html
│   ├── vite.config.ts      # Dev server + proxy config
│   └── package.json
│
├── server/                 # Express backend (port 5000)
│   ├── config/             # Database connection
│   ├── middleware/         # JWT auth middleware
│   ├── models/             # Drizzle ORM table schemas
│   ├── routes/             # REST API route handlers
│   ├── services/           # AI service (OpenAI)
│   ├── socket/             # Socket.io server setup
│   ├── server.ts           # Entry point
│   └── package.json
│
├── .env.example            # Environment variable template
├── .env                    # Your secrets (never commit this)
└── package.json            # Root scripts
```

## Getting Started

### Prerequisites

- **Node.js** v18+ — https://nodejs.org
- **PostgreSQL** — https://postgresql.org (or use Supabase, Neon, Railway, etc.)
- **OpenAI API key** — https://platform.openai.com (optional — app works without it)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd vi-slides-lite

# Install dependencies for both client and server
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/vi_slides
JWT_SECRET=your-long-random-secret-here
OPENAI_API_KEY=sk-...           # optional
```

### 3. Set up the database

```bash
npm run db:push
```

This creates all the tables in your PostgreSQL database.

### 4. Start the app

```bash
npm run dev
```

This runs both the server (port 5000) and client (port 3000) together.

Open **http://localhost:3000** in your browser.

---

## How It Works

1. **Register** as a teacher or student
2. **Teacher**: Create a session → share the 6-digit code
3. **Student**: Enter the code to join → raise hand, send pulse, ask questions
4. **Teacher dashboard**: See all questions, engagement stats, participant list
5. **AI**: Simple factual questions are auto-answered; complex ones go to the teacher

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/sessions` | Create session (teacher) |
| GET | `/api/sessions/my` | List my sessions |
| POST | `/api/sessions/join` | Join session (student) |
| GET | `/api/sessions/:id` | Get session details |
| POST | `/api/sessions/:id/start` | Start session |
| POST | `/api/sessions/:id/pause` | Pause/resume session |
| POST | `/api/sessions/:id/end` | End session |
| GET | `/api/sessions/:id/participants` | List participants |
| GET | `/api/sessions/:id/questions` | List questions |
| POST | `/api/sessions/:id/questions` | Submit question |
| POST | `/api/sessions/:id/questions/:qid/answer` | Answer question |
| POST | `/api/sessions/:id/engagement` | Send engagement signal |
| GET | `/api/sessions/:id/engagement/summary` | Get engagement summary |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join-session` | Client → Server | Subscribe to session room |
| `session:update` | Server → Client | Session status changed |
| `questions:new` | Server → Client | New/updated question |
| `engagement:update` | Server → Client | Pulse counts updated |
| `hand:update` | Server → Client | Hand raised/lowered |

## Deployment

### Server
```bash
cd server
npm run build   # compiles TypeScript to dist/
npm start       # runs dist/server.js
```

### Client
```bash
cd client
npm run build   # builds to dist/
# serve dist/ with nginx, Apache, or any static host
```

Set `CLIENT_URL` in production `.env` to your actual frontend URL.
