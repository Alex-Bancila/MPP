# Marketplace

A full-stack marketplace web application where users can register, log in, post
listings, browse and filter items by category, favourite listings, and view a
statistics dashboard. Built as a semester project for the MPP course.

## Tech Stack

**Frontend**
- React 19 + TypeScript + Vite
- React Router v7
- React Hook Form + Zod validation
- Recharts for the statistics dashboard

**Backend** (`client/server/`)
- Fastify 5 + TypeScript
- GraphQL + REST routes
- Prisma ORM with PostgreSQL
- MongoDB (chat / activity data)
- JWT auth + GitHub OAuth, Helmet, cookies, WebSockets

> The backend lives under `client/server/` and shares the `client/` package.json,
> so all commands are run from the `client/` directory.

## Project Structure

```
.
├── client/             # React + Vite frontend and the Fastify backend
│   ├── src/            # React app
│   └── server/         # Fastify + Prisma + GraphQL backend
│       ├── src/
│       └── prisma/
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL and MongoDB

### Setup

```bash
cd client
npm install

# Frontend env (optional in dev — Vite proxies the API)
cp .env.example .env

# Backend env — fill in DATABASE_URL, MONGODB_URI, JWT_SECRET, etc.
cp server/.env.example server/.env

# Apply the Prisma schema and seed sample data
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### Running

```bash
# from client/
npm run server:dev   # backend  -> http://localhost:3001
npm run dev          # frontend -> http://localhost:5173
```

## Scripts

All scripts are run from the `client/` directory.

| Command                   | Description                          |
| ------------------------- | ------------------------------------ |
| `npm run dev`             | Start the Vite frontend dev server   |
| `npm run server:dev`      | Start the Fastify backend            |
| `npm run build`           | Type-check and build the frontend    |
| `npm run preview`         | Preview the production build         |
| `npm run typecheck`       | Type-check frontend and backend      |
| `npm run test`            | Run unit tests (Vitest)              |
| `npm run coverage`        | Run tests with coverage              |
| `npm run e2e`             | Run end-to-end tests (Playwright)    |
| `npm run prisma:migrate`  | Run a Prisma migration               |
| `npm run prisma:seed`     | Seed sample data                     |

## Environment Variables

See `client/.env.example` and `client/server/.env.example` for the full list.

| Variable        | Where            | Description                          |
| --------------- | ---------------- | ------------------------------------ |
| `DATABASE_URL`  | `server/.env`    | PostgreSQL connection string         |
| `MONGODB_URI`   | `server/.env`    | MongoDB connection string            |
| `JWT_SECRET`    | `server/.env`    | Secret for signing auth tokens       |
| `PORT`          | `server/.env`    | Backend port (default `3001`)        |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | `server/.env` | GitHub OAuth credentials |
| `VITE_API_BASE_URL` | `client/.env` | API base URL (optional in dev)      |

> `.env` files and TLS certificates are gitignored — use the `.env.example` files as templates.
