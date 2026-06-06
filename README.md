# Live AI Chat Bot

A mini AI support agent for a live chat widget

**Live demo:** https://liveaichatbot.vercel.app

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| LLM | Anthropic Claude (claude-sonnet-4-20250514) |
| Validation | Zod |
| Session | UUID + localStorage |

---

## Running Locally

### Prerequisites

- Node.js v18+
- PostgreSQL running locally (or a connection string to a hosted instance)
- A gpogle gemini API key

---

### 1. Clone the repo

```bash
git clone https://github.com/Nakul443/live-AI-chat-bot.git
cd live-AI-chat-bot
```

---

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/spurchat"
GEMINI_API_KEY="..."
PORT=3000
```

Run database migrations and seed:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Start the backend:

```bash
npm run dev
```

The backend will be available at `http://localhost:3000`.

---

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:3000
```

Start the frontend:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## API Reference

### `POST /chat/message`

Send a message and receive an AI reply.

**Request body:**
```json
{
  "message": "What is your return policy?",
  "sessionId": "optional-uuid-string"
}
```

**Response:**
```json
{
  "reply": "We offer a 30-day return policy on all items...",
  "sessionId": "uuid-string"
}
```

**Error response (LLM failure, validation error, etc.):**
```json
{
  "error": "A friendly error message"
}
```

---

### `GET /chat/history/:sessionId`

Fetch past messages for a session (used on page reload to restore conversation history).

**Response:**
```json
{
  "messages": [
    { "id": "...", "sender": "user", "text": "Hello", "timestamp": "..." },
    { "id": "...", "sender": "ai", "text": "Hi! How can I help?", "timestamp": "..." }
  ]
}
```

---

## Architecture Overview

```
live-AI-chat-bot/
├── backend/
│   ├── src/
│   │   ├── routes/        # Express route handlers (chat.ts)
│   │   ├── services/      # Business logic
│   │   │   ├── llm.ts     # LLM integration — generateReply()
│   │   │   └── chat.ts    # Conversation persistence logic
│   │   ├── db/            # Prisma client instance
│   │   ├── middleware/     # Error handler, request validation
│   │   └── index.ts       # App entry point
│   ├── prisma/
│   │   └── schema.prisma  # Data model
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/    # ChatWindow, MessageBubble, InputBar, Sidebar
    │   ├── hooks/         # useChatSession — session & message state
    │   ├── api/           # Typed fetch wrappers for backend endpoints
    │   └── App.tsx
    └── .env.example
```

### Key design decisions

**Session management via localStorage** — A `sessionId` (UUID) is generated on first load and persisted in `localStorage`. On reload, the frontend fetches conversation history from the backend using this ID, restoring the full chat. No auth required.

**LLM encapsulation** — All Claude API calls live in `services/llm.ts` behind a single `generateReply(history, userMessage)` function. This keeps routes clean and makes swapping providers trivial.

**Layered backend** — Routes only handle HTTP concerns (parsing, responding). Services handle logic (calling the LLM, saving messages). The Prisma client is a separate singleton. This separation makes it easy to plug in new channels (WhatsApp, Instagram) without touching the core logic.

**Zod validation** — All incoming request bodies are validated with Zod schemas before reaching any service layer, so the backend never crashes on malformed input.

**`express-async-errors`** — Async errors are caught automatically and forwarded to the global error handler, which returns a clean JSON error response rather than crashing.

---

## LLM Notes

**Provider:** Anthropic Claude (`claude-sonnet-4-20250514`)

**Prompting approach:**

The system prompt combines two things:
1. A role definition: "You are a helpful support agent for Nova Store, a small e-commerce store. Answer clearly and concisely."
2. Hardcoded store knowledge (shipping policy, return policy, support hours) injected directly into the system prompt.

The last N messages of conversation history are included in every request so replies are contextual. A cap of 20 messages is applied to control token usage.

**Error handling:**
- API key errors, rate limits, and timeouts are caught and return a user-friendly message ("Sorry, I'm having trouble connecting right now. Please try again in a moment.") rather than a raw stack trace.

---

## Store Knowledge (Seeded into System Prompt)

The AI agent knows about **Nova Store**, a fictional e-commerce shop:

- **Shipping:** Free standard shipping (5–7 days) on orders over $50. Express (2–3 days) available for $9.99. International shipping to 30+ countries.
- **Returns:** 30-day return window. Items must be unused and in original packaging. Refunds processed within 5–7 business days.
- **Support hours:** Monday–Friday, 9 AM – 6 PM EST. Response within 24 hours on weekdays.

---

## Trade-offs & "If I Had More Time…"

**What I prioritised:**
- Clean separation of concerns (routes / services / db)
- Graceful error handling at every layer
- Correct conversation history on reload
- Input validation and sensible edge case handling

**What I'd add with more time:**
- **Redis caching** for recent conversation history to avoid repeated DB reads on every message
- **Streaming responses** — Claude supports streaming; the UI would feel much snappier with token-by-token rendering
- **Rate limiting** per session to prevent abuse
- **A typing indicator** that accurately reflects when the LLM call is in flight (currently there's a loading state but no animated indicator)
- **Conversation list** in the sidebar — the sidebar UI exists but only shows the current session; with more time I'd persist and list multiple past conversations
- **Docker Compose** for one-command local setup (backend + PostgreSQL)
- **Tests** — at minimum, unit tests for the LLM service and integration tests for the `/chat/message` endpoint

**Known limitations:**
- No auth — anyone with a `sessionId` can fetch that session's history. Fine for a demo; not for production.
- Max token cap is a rough heuristic (last 20 messages). A proper implementation would count tokens and truncate accordingly.