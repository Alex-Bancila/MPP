# Music Core

Music Core is a React + TypeScript frontend with a matching GraphQL backend for a peer-to-peer marketplace focused on music gear and media. The project is implemented to match the assignment constraints and visual specification provided in the repository root.

## Tech stack

- React 19 + TypeScript + Vite
- React Router for page routing
- React Hook Form + Zod for validation
- In-memory state with Context + Reducer (RAM only)
- Recharts for statistics and visual analytics
- Vitest + Testing Library for unit/component tests
- Playwright for end-to-end scenarios
- Node.js + Fastify + GraphQL + Zod for the backend API
- PostgreSQL persistence via Prisma
- Docker Compose dev/test databases

## Features implemented

- Authentication: register, login, logout
- Presentation landing page with branding and tagline
- Master/detail listings flow
  - paginated master table
  - card view alternative
  - category filtering and keyword search
  - create/read/update/delete listing operations
- Ownership checks for edit/delete operations
- Private listing-tied messaging
- Favourites and profile pages
- Statistics page (`/stats`) with Browse/Statistics tabs, charts, rankings, generator controls
- Gold: category table and charts side by side on `/stats`, updating together on CRUD
- Cookie-based activity and preference tracking
- Responsive behavior for desktop/laptop/tablet breakpoints
- Animated transitions and polished dark-theme UI system
- Bazinga feature: Gear DNA radar card and match score

## Project structure

- `src/app` app providers, router, store
- `src/features` feature modules (auth, listings, messaging, stats, etc.)
- `src/pages` route pages
- `src/shared` reusable UI, types, constants, utilities, seed data
- `src/styles` design tokens and global styles
- `e2e` Playwright scenarios

## Start from zero

Run from `client/`:

1. `cp .env.example .env` (optional; dev proxy works without it)
2. `cp server/.env.example server/.env`
3. `docker compose up -d`
4. `npm install`
5. `npm run prisma:migrate`
6. `npm run prisma:seed`
7. If Postgres permission errors appear: `npx tsx server/prisma/grant-perms.ts`
8. `npm run server:dev` — API at http://localhost:3001
9. `npm run dev` — UI at http://localhost:5173

The Vite dev server proxies `/graphql`, `/auth`, `/health`, and **`/ws`** to the API. The UI calls **`GET /health`** until Postgres is up, then connects the WebSocket (reduces `ws proxy ECONNABORTED` while the API is still starting).

For live chat from **another device on Wi‑Fi**, open the app as `http://<laptop-LAN-IP>:5173` on both machines. The WebSocket uses the **same origin** as that page (e.g. `ws://192.168.1.5:5173/ws` → proxy → API), so you only need the same firewall rule that already lets the phone load the UI — **not** a separate inbound rule for port 3001.

If you prefer a direct socket to the API (port 3001), set `VITE_WS_DIRECT=true` in `.env` and allow **TCP 3001** inbound on the laptop.

**Still no live updates?** Some public or guest Wi‑Fi networks use **AP/client isolation** (devices cannot talk to each other). Try another network or a phone hotspot. Also use the laptop’s **Wi‑Fi** IP (often `192.168.x.x`), not a VPN-only or random tunnel address, unless the phone uses that same VPN.

Set `VITE_API_BASE_URL` only if you run the UI without the proxy. Override the socket with `VITE_WS_URL` if needed (see `.env.example`).

## Commands

Run from `client/`:

- `npm run dev` start local development server
- `npm run lint` run ESLint
- `npm run typecheck` run TypeScript checks
- `npm run test` run Vitest in watch mode
- `npm run test:run` run Vitest once
- `npm run coverage` run tests with coverage report and thresholds
- `npm run build` create production build
- `npm run e2e` run Playwright end-to-end tests
- `npm run server:dev` start the backend API
- `npm run server:test` run backend tests
- `npm run server:typecheck` typecheck the backend only
- `npm run prisma:generate` generate the Prisma client
- `npm run prisma:migrate` apply Prisma migrations
- `npm run prisma:seed` seed the database from `initialAppState`
- `npm run prisma:seed:test` seed the test database from `initialAppState`
- `docker compose up -d postgres postgres_test` start local dev/test databases

## REST API (Assignment 2 bronze)

- Postman collection: `docs/rest-api.postman_collection.json`
- HTTP file (VS Code REST Client): `docs/rest-api.http`
- Demo checklist: `docs/assignment2-demo-checklist.md`
- Backend notes: `docs/assignment2-backend.md`

## Cookie monitoring

The app stores user activity/preferences in one browser cookie:

- Cookie name: `music-core.activity`
- Data tracked: preferred category/view, listing search text, recently viewed listings, last visited route, and last active timestamp
- Lifetime: 30 days (`SameSite=Strict`, `path=/`)

How to inspect it in browser:

1. Open the app in your browser and interact with listings/stats (search/filter/navigation).
2. Open DevTools (`F12` or `Ctrl+Shift+I`).
3. Go to **Application** (Chrome/Edge) or **Storage** (Firefox).
4. Open **Cookies** and select your local app origin (usually `http://localhost:5173`).
5. Click `music-core.activity` to inspect/update value fields.

Tip: the profile page includes a **Reset Preferences Cookie** button to clear and reset tracked cookie data.

## Test coverage scope

Coverage thresholds are enforced for assignment-critical logic:

- `src/app/store/reducers.ts`
- `src/app/store/selectors.ts`
- `src/features/auth/authSchema.ts`
- `src/features/listings/listingSchema.ts`

This reflects the mandatory requirement to thoroughly test important CRUD and validation behavior.

## Assignment mapping

- Bronze: presentation + master/detail + full CRUD + validation + unit test coverage
- Silver: statistics views + Playwright E2E (auth, CRUD, cookies, stats sync, generator, offline) + activity cookies + server Faker generator UI
- Gold: full page flow, responsive UI, animations, Gear DNA, GraphQL/infinite scroll/reviews, synchronized table + charts on `/stats`

## Backend

The backend lives in `client/server/` (not the deprecated root `server/` folder) and uses:

- Fastify routes separated from business logic
- Zod validation for params, queries, and bodies
- Prisma-backed PostgreSQL persistence
- server-side pagination for listing endpoints
- GraphQL as the only public API

See `docs/assignment2-backend.md` for the stack benchmark and implementation rationale.
