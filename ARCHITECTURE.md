# Music Core — Architecture

Music Core is a full-stack **music-gear marketplace**: users list instruments/gear for
sale, browse and search listings, review sellers, favourite items, chat in real time,
and (for admins) moderate the platform. This document explains how the codebase is
structured, how the pieces talk to each other, and how it runs in the cloud.

For the click-by-click deployment steps see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## 1. Tech stack at a glance

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 (TypeScript), React Router 7 |
| State | Custom store: React Context + `useReducer` (offline-first, no Redux) |
| Backend | Fastify 5 (TypeScript, run with `tsx`) |
| API styles | GraphQL (queries/mutations) + REST (auth/admin) + WebSocket (real-time) |
| Relational DB | PostgreSQL via Prisma ORM |
| Document DB | MongoDB (chat conversations & messages) |
| Auth | JWT access tokens + rotating refresh tokens; password / magic-link / GitHub OAuth |
| Email | nodemailer over SMTP (reset & magic-link tokens) |
| Tests | Vitest + Testing Library (62 tests) |
| Hosting | Render (static frontend + web backend), Neon (Postgres), MongoDB Atlas, Brevo (SMTP) |

> Note on layout: the whole project lives under `client/`. The backend is a sub-folder
> (`client/server`) that **shares the frontend's `package.json`** — so one `npm install`
> covers both, and scripts are prefixed (`server:dev`, `server:start`, `prisma:*`).

---

## 2. Repository layout

```
MPP/                          ← git repo root
├─ render.yaml                ← optional Render blueprint (both services)
├─ DEPLOYMENT.md              ← cloud deployment walkthrough
├─ ARCHITECTURE.md            ← this file
└─ client/                    ← the application (one npm package)
   ├─ package.json            ← deps + scripts for BOTH client and server
   ├─ vite.config.ts          ← dev server + proxy + Vitest config
   ├─ src/                    ← FRONTEND
   │  ├─ main.tsx             ← React entry
   │  ├─ app/
   │  │  ├─ router.tsx        ← route table + route guards
   │  │  ├─ providers.tsx     ← app-wide providers
   │  │  └─ store/            ← the custom state store (reducer, actions, selectors, sync queue)
   │  ├─ features/            ← feature modules (auth, listings, reviews, favourites,
   │  │                          messaging, profile, stats, activity, sync)
   │  ├─ pages/               ← one component per route
   │  ├─ shared/              ← components, types, constants, utils, seed data
   │  └─ styles/
   └─ server/                 ← BACKEND
      ├─ src/
      │  ├─ index.ts          ← process entry (listen on PORT/HOST)
      │  ├─ app.ts            ← buildApp(): registers plugins, services, routes
      │  ├─ routes/           ← HTTP/GraphQL/WS endpoints
      │  ├─ services/         ← business logic (auth, listings, reviews, chat, audit…)
      │  ├─ storage/          ← in-memory stores (memoryStore, tokenStore)
      │  ├─ db/               ← Prisma client, Mongo client, mappers, snapshot sync
      │  ├─ transport/        ← serverHub (WebSocket broadcast bus)
      │  └─ lib/              ← mailer (SMTP), http helpers
      └─ prisma/              ← schema, migrations, seed scripts
```

---

## 3. Frontend architecture

### 3.1 Rendering & routing
`main.tsx` mounts the app inside `providers.tsx` (which includes the store provider).
`app/router.tsx` is a `createBrowserRouter` table. Routes are wrapped with **layouts**
(`LandingLayout`, `AuthLayout`, `AppLayout`) and, where needed, **route guards**:

- `ProtectedRoute` → redirects to `/login` if not authenticated (used for `/listings/new`,
  `/favourites`, `/messages`, listing edit).
- `AdminRoute` → redirects non-admins away from `/admin`.

### 3.2 State: a custom offline-first store
Instead of Redux, the app uses **React Context + `useReducer`** in
`app/store/AppStoreProvider`. The store holds one `AppState` (users, listings, reviews,
favourites, conversations, messages, `currentUserId`, and a `sync` block) and is the
single source of truth for the UI. Components read it via `useAppSelector` and trigger
changes via `dispatch(action)`.

What makes it interesting is **offline-first synchronisation**:

- **Optimistic updates**: a mutation action (e.g. `listing/create`) is applied to local
  state immediately so the UI feels instant.
- **Replay to server**: mutations are also sent to the backend (`replayQueuedMutation`).
  If the network/server is down, the mutation is pushed onto an in-memory **queue**
  (`queueRef`) and the sync mode flips to `offline`.
- **Reconnect & flush**: when the browser comes back online (or the server becomes
  healthy again), the queue is replayed in order and the local state re-synced.
- **Live updates**: a **WebSocket** receives server broadcasts (full snapshots or
  incremental patches) and merges them in, coalescing bursts into one re-render per
  animation frame so a flood of updates can't freeze the UI.

`features/sync/serverClient.ts` is the single networking module: it builds the API base
URL, attaches the JWT, performs **silent token refresh on 401** (retry once), exposes all
GraphQL/REST calls, and derives the WebSocket URL.

### 3.3 Feature modules
Each folder under `features/` owns one domain (its hooks, schemas, helpers). For example
`features/auth` holds `useAuth` (login/register/logout, `hasPermission`, `isAdmin`) and
the Zod validation schemas. Pages compose these features.

---

## 4. Backend architecture

### 4.1 Composition root — `app.ts`
`buildApp()` is where everything is wired:

1. Registers Fastify plugins: **helmet** (security headers), **cors**, **cookie**,
   **jwt** (`@fastify/jwt`), **websocket**.
2. Creates the in-memory **MemoryStore**, the **TokenStore**, the **ServerHub**
   (broadcast bus) and the **Mailer**.
3. `syncStoreFromDb()` loads users/listings/reviews/etc. from Postgres into the
   MemoryStore at startup.
4. Builds the **services** (`createServices`) and registers all **routes**.

`index.ts` just calls `buildApp()` and listens on `PORT`/`HOST`. In the cloud the
platform terminates TLS, so `USE_HTTPS=false` and the app speaks plain HTTP internally.

### 4.2 Layered design
```
routes/  →  services/  →  storage/ + db/
(HTTP)      (logic)       (state + persistence)
```
- **routes/** — thin handlers that validate input, check auth/permissions, and call a
  service. They cover three transports:
  - **GraphQL** (`routes/graphql.ts`) — the main data API (queries + mutations), using
    `graphql-js` with a rootValue resolver map.
  - **REST** (`routes/auth.ts`, `routes/admin.ts`, `health.ts`, …) — auth flows, admin
    actions, health checks.
  - **WebSocket** (`routes/ws.ts`) — clients subscribe; the server pushes updates.
- **services/** — the business logic (`authService`, `listingsService`, `reviewsService`,
  `favouritesService`, `chatService`, `rolesService`, `usersService`, `auditService`,
  `statsService`).
- **storage/** — `memoryStore` (the live in-memory snapshot the API reads/writes for
  speed) and `tokenStore` (refresh tokens, one-time tokens, 2FA challenges).
- **db/** — `prisma.ts` (Postgres client + env loading), `mongo.ts`/`mongoChat.ts`
  (MongoDB), `mappers.ts` (DB row → domain object), `snapshot.ts` (DB → MemoryStore).

### 4.3 Why an in-memory store + a database?
Reads are served from the **MemoryStore** (fast, no round-trip), while **writes are
persisted to Postgres/MongoDB** and then reflected in the store. The `ServerHub`
broadcasts every change over WebSocket so all connected clients stay in sync. On restart,
`syncStoreFromDb` rebuilds the store from the database, so nothing is lost.

---

## 5. Data layer

### 5.1 PostgreSQL (Prisma)
The relational core: `users`, `roles`, `permissions`, `rolePermissions` (role ↔
permission join), `listings`, `reviews`, `favourites`, `auditLog`, `adminAccessRequests`,
and suspicious-activity records. Schema + migrations live in `server/prisma/`. The seed
script populates roles/permissions and demo data.

- Roles: **`role_admin`** and **`role_user`**, each with a permission set. A user's
  `roleId` determines their permissions.
- Migrations are applied in the cloud with `npm run prisma:deploy` (`prisma migrate deploy`).

### 5.2 MongoDB (chat)
Real-time chat (`conversations`, `messages`) is stored in MongoDB — a natural fit for the
append-heavy, schema-light messaging data. Accessed via `db/mongo.ts` (`MONGODB_URI`).

`/health` reports both `postgres` and `mongo` connectivity.

---

## 6. Authentication & authorization

### 6.1 Three login methods
1. **Password** — `POST /auth/login` (bcrypt-style hash verify), optional **2FA** pass-key
   challenge.
2. **Magic link** — `POST /auth/magic/request` emails a one-time token (10 min);
   `/auth/magic/verify` exchanges it for a session. The email link `/login?magic=<token>`
   auto-verifies in the UI.
3. **GitHub OAuth** — `GET /auth/github` redirects to GitHub with a CSRF **`state`** token;
   `GET /auth/github/callback` verifies the state, exchanges the code, then redirects to
   the frontend `/auth/callback` with tokens.

### 6.2 Tokens & sessions
- **Access token**: JWT, 2-hour expiry, carries `{ sub, username, role, permissions[] }`.
- **Refresh token**: 7-day, **rotated** on every use (old one revoked) — stored in the
  TokenStore.
- **One-time tokens**: `reset` (15 min), `magic` (10 min), `oauth_state` (5 min).
- The client silently refreshes the access token on a 401 and retries the request once.

### 6.3 Authorization
- **Role-based**: `admin` vs `user`, each mapped to a permission array (e.g.
  `listing:create`, `review:create`, `admin:read`, `user:ban`). The UI gates buttons/links
  with `hasPermission()` / `isAdmin`; the server enforces the same on every mutation.
- **Ownership enforcement**: mutating a listing/review/favourite requires
  `caller === owner || admin`; you can't review your own listing. Enforced server-side in
  both REST and GraphQL resolvers (the client checks are convenience only).

### 6.4 Email delivery
`lib/mailer.ts` builds an SMTP transport from `SMTP_*` env vars (provider-agnostic — Brevo,
Gmail, etc.). Reset/magic tokens are emailed with both a clickable link and the raw token.
If SMTP isn't configured (local dev), it falls back to logging the email to the console.

---

## 7. Real-time sync flow (example)

Creating a listing, end to end:

```
User clicks "Publish"
  → dispatch(listing/create)                     [optimistic: UI updates instantly]
  → serverClient → GraphQL createListing mutation
       → graphql route: auth + permission + ownership checks
       → listingsService: write to Postgres, update MemoryStore
       → ServerHub.broadcast(patch)
  → every connected client's WebSocket receives the patch
       → store merges it (rAF-coalesced) → all UIs show the new listing
If offline: the mutation is queued and replayed on reconnect.
```

---

## 8. Local development

```powershell
cd client
npm install
# Terminal 1 — backend (reads server/.env, self-signed HTTPS on :3001)
npm run server:dev
# Terminal 2 — frontend (Vite on :5173, proxies /graphql /auth /ws → backend)
npm run dev
```

In dev, Vite's proxy (`vite.config.ts`) forwards `/graphql`, `/auth`, `/admin`, `/health`
and `/ws` to `https://127.0.0.1:3001` (trusting the self-signed cert), so the browser only
talks to one origin. Useful scripts: `npm test`, `npm run typecheck`,
`npm run prisma:generate|migrate|seed`.

---

## 9. Cloud deployment

The app is deployed as **two services on different domains**, both fronted by automatic
**Let's Encrypt** TLS, on entirely free tiers (no personal server, no paid product):

```
 Browser ─HTTPS─► Frontend  (Render Static Site)  ── built React bundle
    │                 │ VITE_API_BASE_URL points at the backend
    │   HTTPS / WSS   ▼
    └──────────────► Backend  (Render Web Service)  ── Fastify, USE_HTTPS=false (TLS at edge)
                         ├─► PostgreSQL  (Neon)
                         ├─► MongoDB     (Atlas M0)
                         └─► Email       (Brevo SMTP)
```

Key deployment facts:

- **Frontend** (Render Static Site): `npm run build` → static `dist/` on a CDN. The API
  base URL is **baked in at build time** via `VITE_API_BASE_URL`; a `/* → /index.html`
  rewrite makes client-side routing work.
- **Backend** (Render Web Service): build runs `prisma generate` + `prisma migrate deploy`;
  start runs `npm run server:start`. TLS is terminated by Render, so the app runs HTTP
  internally (`USE_HTTPS=false`).
- **Cross-domain wiring**: because the frontend and backend are on different hosts, the
  client derives both the API calls and the **WebSocket (`wss://`)** URL from
  `VITE_API_BASE_URL`, and the "Continue with GitHub" button targets the backend. `APP_URL`
  (on the backend) is the frontend URL, used for email links and the OAuth redirect.
- **No cold start**: Render's free backend sleeps after ~15 min idle, so a free uptime
  monitor (UptimeRobot / cron-job.org) pings `/health` every ~10 min to keep it awake 24/7.
- **Secrets**: all credentials live in the Render dashboard env vars; `.env` files are
  git-ignored and never deployed.

Full step-by-step instructions, env-var tables, seeding, GitHub OAuth setup, and
troubleshooting are in **[DEPLOYMENT.md](./DEPLOYMENT.md)**.
