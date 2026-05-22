# Assignment 2 Backend

## Strategy (shared with Assignment 3)

Music-core uses **one backend** (`client/server`) with **PostgreSQL + Prisma** for persistence and an in-memory mirror for WebSocket sync. Assignment 2 is demonstrated with **REST + GraphQL** on the same domain services—not a separate RAM-only server. That stack carries forward into Assignment 3 (migrations, CRUD tests, roles, Mongo chat, logging) without rewrites.

**In scope for Assignment 2 (stable for later assignments):**

- REST route modules with Zod validation and separated services
- GraphQL as the primary client API (Gold)
- Prisma-backed CRUD, pagination, filters, statistics
- Faker generator (start/stop) via GraphQL and REST
- Backend unit/integration tests for CRUD and validation
- Benchmark justification below

**Deferred to Assignment 3 (do not block Assignment 2 on these):**

- Cross-VM client vs server (not localhost)
- 3NF write-up, stored procedures/triggers, bronze DB-only test matrix
- Silver: roles/permissions DB + full login matrix expansion
- Silver: Mongo chat as deliverable (already present; polish for A3)
- Gold: audit log tables + suspicious-user detection UI

## Benchmark Criteria

- TypeScript fit
- Validation support
- Testability
- Community maturity
- Persistence path (Prisma + PostgreSQL for A3)
- Boilerplate and maintenance cost

## Stack Comparison

| Stack | TS fit | Validation | Testability | Boilerplate | Fit |
| --- | ---: | ---: | ---: | ---: | --- |
| Fastify + TypeScript + Zod + Prisma | 5/5 | 5/5 | 5/5 | 4/5 | Best |
| Express + TypeScript + Zod | 5/5 | 4/5 | 4/5 | 3/5 | Good |
| NestJS + TypeScript | 5/5 | 5/5 | 5/5 | 2/5 | Heavy |
| Django REST Framework | 2/5 | 5/5 | 5/5 | 4/5 | Strong but off-stack |
| Spring Boot | 2/5 | 5/5 | 5/5 | 2/5 | Strong but heavy |

## Choice

Fastify was selected because it keeps the API lightweight, works naturally with TypeScript, and supports a clean separation between routes, services, validation, and Prisma-backed PostgreSQL storage. Zod gives predictable server-side validation without database-specific coupling.

## Implemented Backend Scope

### REST (Bronze)

| Area | Endpoints |
| --- | --- |
| Listings | `GET/POST /listings`, `GET/PATCH/DELETE /listings/:listingId` |
| Reviews | `GET/POST /listings/:listingId/reviews`, `PATCH/DELETE /reviews/:reviewId` |
| Favourites | `GET/POST /favourites`, `DELETE /favourites/:listingId` |
| Statistics | `GET /stats/summary`, `/stats/categories`, `/stats/sellers`, `/stats/favourites`, `/stats/reviews` |
| Generator | `POST /admin/generate/start`, `POST /admin/generate/stop` |
| Auth | `POST /auth/login`, `POST /auth/register` (see `routes/auth.ts`) |
| Health | `GET /health` |

REST mutations update the in-memory sync store and broadcast on the WebSocket hub, same as GraphQL.

### GraphQL (Gold)

- Queries: listings (pagination/filters), favourites, reviews, statistics, sync state, health
- Mutations: listings, favourites, reviews, generator, chat
- See `client/server/src/routes/graphql.ts`

### Client

- React app uses **GraphQL** for normal UI flows (`serverClient.ts`)
- REST is available for tooling, benchmarks, and Assignment 2 bronze demonstration

## Testing

From `client/`:

```bash
npm run prisma:seed:test   # refresh test DB from initialAppState
npm run server:test        # Vitest: GraphQL + REST HTTP + services
```

- `server/src/routes/__tests__/restHttpRoutes.test.ts` — REST HTTP CRUD, validation, stats, generator
- Other `*Routes.test.ts` files — GraphQL equivalents for the same behaviours
- Service-layer tests cover Prisma CRUD against the test database

## REST tooling & demo

- Postman: import [`docs/rest-api.postman_collection.json`](rest-api.postman_collection.json) (variable `baseUrl`, default `http://localhost:3001`)
- VS Code / curl: [`docs/rest-api.http`](rest-api.http)
- Demo script: [`docs/assignment2-demo-checklist.md`](assignment2-demo-checklist.md)

The React client polls `GET /health` until Postgres is ready before opening the WebSocket (fewer Vite proxy errors while `server:dev` is still starting).

## Notes

- Data lives in PostgreSQL and is mirrored into the in-memory store for sync state on startup (`syncStoreFromDb`).
- Validation happens on the server for params, query strings, and bodies.
- Routes are separated from business logic in `src/services/`.
- Dev: API on port `3001`, Vite proxy forwards `/graphql`, `/auth`, `/health`, `/ws` from port `5173`.
